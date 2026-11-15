import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validateRows, repeatRows } from "../src/lib/timetable.js";
const a = "10000000-0000-0000-0000-000000000001",
  b = "10000000-0000-0000-0000-000000000002",
  admin = "10000000-0000-0000-0000-000000000003",
  pending = "10000000-0000-0000-0000-000000000004";
test("RLS, signup, multiple schools, admin and atomic import", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema public,auth to authenticated,anon;`,
  );
  const schema = await readFile(
    new URL("../supabase/schema.sql", import.meta.url),
    "utf8",
  );
  await db.exec(schema.replace("create extension if not exists pgcrypto;", ""));

  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261115_auth_roles_schools.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  await db.exec(await readFile(new URL("../supabase/migrations/20261115_table_access_pc_defaults.sql", import.meta.url),"utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20261115_registration_attendance.sql",import.meta.url),"utf8"));
  await db.exec(
    `insert into auth.users(id,email,raw_user_meta_data) values ('${a}','a@example.test','{"role":"admin","full_name":"A"}'),('${b}','b@example.test','{}'),('${admin}','admin@example.test','{}'),('${pending}','pending@example.test','{}');`,
  );
  assert.equal(
    (await db.query(`select role from profiles where id='${a}'`)).rows[0].role,
    "pending",
    "metadata cannot promote role",
  );
  await db.exec(
    `update profiles set role='teacher' where id in ('${a}','${b}'); update profiles set role='admin' where id='${admin}';`,
  );
  async function as(id) {
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
    );
  }
  await as(a);
  let sid = (await db.query("select create_my_school('Trường A') as id"))
    .rows[0].id;
  assert.equal(
    (await db.query("select create_my_school(' trường a ') as id")).rows[0].id,
    sid,
  );
  await db.query("select create_my_school('Trường B')");
  assert.equal((await db.query("select * from schools")).rows.length, 2);
  assert.equal((await db.query("select * from profiles")).rows.length, 1);
  await assert.rejects(
    db.query(`update profiles set role='admin' where id='${a}'`),
  );
  await assert.rejects(
    db.query(`select admin_update_account('${b}','admin',true,'B')`),
  );
  await as(b);
  assert.equal((await db.query("select * from schools")).rows.length, 0);
  await assert.rejects(
    db.query(
      `insert into students(school_id,full_name) values('${sid}','Intruder')`,
    ),
  );
  await assert.rejects(
    db.query(`insert into school_members values('${sid}','${b}')`),
  );
  let other = (await db.query("select create_my_school('Other') as id")).rows[0]
    .id;
  let cls = (
    await db.query(
      `insert into classes(school_id,class_name,registration_code) values('${other}','B','B') returning id`,
    )
  ).rows[0].id;
  await as(a);
  await assert.rejects(
    db.query(
      `insert into students(school_id,class_id,full_name) values('${sid}','${cls}','Cross FK')`,
    ),
  );
  const rows = [
    {
      school_name: "Imported",
      class_name: "6A",
      session_date: "2026-11-16",
      start_time: "07:00",
      end_time: "08:00",
      period_count: 1,
    },
  ];
  const imp = (rs) =>
    db.query("select import_timetable($1::jsonb) as result", [
      JSON.stringify(rs),
    ]);
  assert.equal((await imp(rows)).rows[0].result.created, 1);
  assert.equal((await imp(rows)).rows[0].result.skipped, 1);
  const before = (await db.query("select count(*)::int n from schools")).rows[0]
    .n;
  await assert.rejects(
    imp([
      { ...rows[0], school_name: "Rollback", session_date: "2026-11-17" },
      {
        ...rows[0],
        school_name: "Rollback",
        session_date: "2026-11-17",
        start_time: "07:30",
        end_time: "09:00",
      },
    ]),
  );
  assert.equal(
    (await db.query("select count(*)::int n from schools")).rows[0].n,
    before,
    "rollback schools and schedules",
  );
  assert.equal((await db.query(`select count(*)::int n from computers where school_id='${sid}'`)).rows[0].n,40);
  const ca=(await db.query(`insert into classes(school_id,class_name,registration_code) values('${sid}','6.1','PUBLIC61') returning id`)).rows[0].id;
  await db.exec("reset role;set role anon;");
  await db.query(`insert into student_registrations(registration_code,full_name,computer_code) values('PUBLIC61','Thảo Nguyên','PC1')`);
  await assert.rejects(db.query('select * from student_registrations'));
  await assert.rejects(db.query('truncate students'));
  await as(a);
  const reg=(await db.query(`select id from student_registrations where registration_code='PUBLIC61'`)).rows[0].id;
  const student=(await db.query(`select approve_registration('${reg}') id`)).rows[0].id;
  await assert.rejects(db.query(`select approve_registration('${reg}')`));
  const lesson=(await db.query(`insert into class_sessions(school_id,class_id,class_name,session_date,start_time,end_time,teacher_id) values('${sid}','${ca}','6.1','2026-11-16','14:00','14:45','${a}') returning id`)).rows[0].id;
  const marks=JSON.stringify([{student_id:student,status:'present',note:''}]);
  await db.query('select save_roll_call($1,$2::jsonb)',[lesson,marks]);
  await db.query('select save_roll_call($1,$2::jsonb)',[lesson,marks]);
  assert.equal((await db.query(`select count(*)::int n from attendance where session_id='${lesson}'`)).rows[0].n,1);
  await as(b);
  await assert.rejects(db.query('select save_roll_call($1,$2::jsonb)',[lesson,marks]));
  await as(a);
  for (let i = 0; i < 20; i++)
    await db.query("select consume_timetable_quota()");
  await assert.rejects(db.query("select consume_timetable_quota()"));
  await as(pending);
  await assert.rejects(db.query("select create_my_school('Forbidden')"));
  assert.equal((await db.query("select * from schools")).rows.length, 0);
  await as(admin);
  assert.equal((await db.query("select * from profiles")).rows.length, 4);
  await db.query(
    `select admin_update_account('${pending}','teacher',true,'Approved')`,
  );
  await assert.rejects(
    db.query(`select admin_update_account('${admin}','pending',false,'Self')`),
  );
  await db.query(
    `select admin_update_account('${a}','teacher',false,'Suspended')`,
  );
  await as(a);
  assert.equal((await db.query("select * from class_sessions")).rows.length, 0);
  await assert.rejects(imp(rows));
  await db.exec("reset role; set role anon;");
  await assert.rejects(db.query("select create_my_school('Anon')"));
  await assert.rejects(db.query("select * from class_sessions"));
  await db.close();
});
test("review validation, real dates, repeats and conflicting rows", () => {
  const row = {
    school_name: "A",
    class_name: "6A",
    session_date: "2026-12-28",
    start_time: "07:00",
    end_time: "08:00",
    period_count: 1,
  };
  assert.equal(repeatRows([row], 2)[1].session_date, "2027-01-04");
  assert.throws(() => validateRows([{ ...row, session_date: "2026-02-30" }]));
  assert.throws(() => validateRows([{ ...row, start_time: "25:00" }]));
  assert.throws(() => validateRows([{ ...row, end_time: "06:00" }]));
  assert.throws(() => validateRows([row, { ...row, school_name: "B" }]));
  assert.throws(() => repeatRows([row], 17));
});
