import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const migration=readFileSync(new URL('../supabase/migrations/20261119033000_teacher_shared_school_board_link.sql',import.meta.url),'utf8');
const classSettings=readFileSync(new URL('../src/ClassSettings.jsx',import.meta.url),'utf8');

test('school members see school podium codes created by other teachers, not codes from other schools',async()=>{
 const db=new PGlite();
 try{
  await db.exec([
   'create role anon','create role authenticated','create schema auth',
   "create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$",
   'create table profiles(id uuid,school_id uuid,role text,is_active boolean)',
   'create table school_members(user_id uuid,school_id uuid)',
   'create table classes(id uuid,school_id uuid,created_by uuid,registration_code text,archived_at timestamptz,created_at timestamptz default now())',
   'grant usage on schema public to authenticated'
  ].join(';\n')+';');
  const me='00000000-0000-0000-0000-000000000001';
  const other='00000000-0000-0000-0000-000000000002';
  const schoolA='00000000-0000-0000-0000-000000000011';
  const schoolB='00000000-0000-0000-0000-000000000012';
  await db.query('insert into profiles values($1,$2,$3,$4)',[me,null,'teacher',true]);
  await db.query('insert into school_members values($1,$2)',[me,schoolA]);
  await db.query('insert into classes(id,school_id,created_by,registration_code) values($1,$2,$3,$4)',
   ['00000000-0000-0000-0000-000000000101',schoolA,other,'BOARD-SCHOOL-A']);
  await db.query('insert into classes(id,school_id,created_by,registration_code) values($1,$2,$3,$4)',
   ['00000000-0000-0000-0000-000000000102',schoolB,other,'BOARD-SCHOOL-B']);
  await db.exec(migration);
  await db.exec('set role authenticated');
  const get=async schoolId=>(await db.query('select ic3_my_school_board_code($1) as code',[schoolId])).rows[0].code;
  assert.equal(await get(schoolA),'BOARD-SCHOOL-A','teacher can open school leaderboard of colleague');
  assert.equal(await get(schoolB),null,'same-name or unrelated school never grants access');
  await db.exec('reset role');
  await db.exec('set role anon');
  await assert.rejects(db.query('select ic3_my_school_board_code($1)',[schoolA]),/permission denied/i);
  await db.exec('reset role');
  assert.ok(classSettings.includes("rpc('ic3_my_school_board_code'"));
  assert.ok(classSettings.includes('Mở BXH toàn trường'));
 }finally{await db.close();}
});
