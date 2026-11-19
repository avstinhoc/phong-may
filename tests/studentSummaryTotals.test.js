import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const sql=readFileSync(new URL('../supabase/migrations/20261120094500_student_summary_totals.sql',import.meta.url),'utf8');
const manager=readFileSync(new URL('../src/StudentRewardManagement.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

test('profile edits the three summary cards, not just individual history rows',()=>{
 assert.match(manager,/✏️ Sửa 3 chỉ số/);
 assert.match(manager,/⭐ Sao hiện có/);
 assert.match(manager,/🏆 Tổng sao đã kiếm/);
 assert.match(manager,/⚠️ Lỗi biên bản/);
 assert.match(manager,/ic3_set_student_summary_totals/);
 assert.match(manager,/p_expected_available:oldAvailable/);
 assert.match(manager,/Lý do chỉnh sửa \(bắt buộc\)/);
 assert.match(manager,/ic3_student_stat_audit/);
 assert.match(app,/useRows\("ic3_student_violation_totals",profile,refresh\)/);
 assert.match(sql,/create or replace view public.ic3_star_wallets/);
 assert.match(sql,/from adjusted s/);
 assert.match(sql,/create or replace function public.get_class_violation_badges/);
 assert.match(sql,/create or replace function public.ic3_redeem_student_stars/);
});

test('audited offsets update effective wallet, violations, reports and future rewards without rewriting history',async()=>{
 const db=new PGlite();
 const actor='00000000-0000-0000-0000-000000000001',school='00000000-0000-0000-0000-000000000002';
 const student='00000000-0000-0000-0000-000000000003',stranger='00000000-0000-0000-0000-000000000004';
 const otherSchool='00000000-0000-0000-0000-000000000005';
 const change=(id,available,earned,violations,expected=[8,10,2],reason='Điều chỉnh do giáo viên nhập nhầm')=>
   db.query('select public.ic3_set_student_summary_totals($1::uuid,$2::integer,$3::integer,$4::integer,$5::integer,$6::integer,$7::integer,$8::text) as ok',
     [id,available,earned,violations,...expected,reason]);
 try{
  const schema=[
   'create role anon',
   'create role authenticated',
   'create schema auth',
   'create table auth.users(id uuid primary key)',
   "create function auth.uid() returns uuid language sql stable as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$",
   'create table public.schools(id uuid primary key,violation_report_threshold integer default 3)',
   'create table public.profiles(id uuid primary key,school_id uuid,is_active boolean,role text)',
   'create table public.school_members(user_id uuid,school_id uuid)',
   "create table public.students(id uuid primary key,school_id uuid,full_name text,status text,class_id uuid,class_name text)",
   'create table public.student_records(id uuid primary key default gen_random_uuid(),school_id uuid,student_id uuid,record_type text,title text,points numeric,note text,record_date date,star_event text,created_at timestamptz default now(),created_by uuid)',
   "create table public.student_incident_reports(id uuid primary key default gen_random_uuid(),school_id uuid,student_id uuid,milestone integer,violation_count integer,status text default 'draft',unique(student_id,milestone))",
   'create table public.student_record_corrections(id uuid primary key default gen_random_uuid(),school_id uuid,record_id uuid,previous_data jsonb,corrected_data jsonb,reason text,corrected_by uuid)',
   'create table public.classes(id uuid primary key default gen_random_uuid(),school_id uuid,class_name text,registration_code text,legacy_registration_codes text[],archived_at timestamptz)',
   'create table public.computers(id uuid primary key default gen_random_uuid(),school_id uuid,computer_code text)',
   'create table public.computer_assignments(id uuid primary key default gen_random_uuid(),computer_id uuid,student_id uuid,active boolean)',
   "create function public.can_access_school(s uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_active and p.school_id=s) $$",
   'create function public.ic3_flame_effect_score(earned integer,penalties integer,inactivity integer) returns integer language sql immutable as $$select greatest(0,earned-2*penalties-3*inactivity)$$',
   'grant usage on schema public to authenticated',
   'grant select on public.students,public.student_records to authenticated',
   'grant insert on public.student_records to authenticated'
  ];
  await db.exec(schema.join(';\n')+';');
  await db.query('insert into auth.users values($1)',[actor]);
  await db.query('insert into public.schools(id) values($1),($2)',[school,otherSchool]);
  await db.query("insert into public.profiles values($1,$2,true,'teacher')",[actor,school]);
  await db.query("insert into public.students values ($1,$2,'An','active',null,'6.1'),($3,$4,'Khác','active',null,'7.1')",[student,school,stranger,otherSchool]);
  await db.query("insert into public.student_records(school_id,student_id,record_type,title,points,record_date) values ($1,$2,'reward','Điểm thưởng',10,'2026-11-19'),($1,$2,'reward','Đã đổi quà',-2,'2026-11-19'),($1,$2,'violation','Nhắc 1',0,'2026-11-19'),($1,$2,'violation','Nhắc 2',0,'2026-11-19')",[school,student]);
  await db.exec(sql);
  await db.exec('create trigger after_student_violation_insert after insert on public.student_records for each row execute function public.after_student_violation_insert();');
  const initial=(await db.query('select earned,available from public.ic3_star_wallets where student_id=$1',[student])).rows[0];
  assert.deepEqual([initial.earned,initial.available],[10,8]);
  assert.equal((await db.query('select violations from public.ic3_student_violation_totals where student_id=$1',[student])).rows[0].violations,2);

  const changed=await change(student,6,15,4);
  assert.equal(changed.rows[0].ok,true);
  const corrected=(await db.query('select earned,available from public.ic3_star_wallets where student_id=$1',[student])).rows[0];
  assert.deepEqual([corrected.earned,corrected.available],[15,6]);
  assert.equal((await db.query('select violations from public.ic3_student_violation_totals where student_id=$1',[student])).rows[0].violations,4);
  assert.equal((await db.query("select count(*)::integer as n from public.student_incident_reports where status='draft'")).rows[0].n,1);
  assert.equal((await db.query('select count(*)::integer as n from public.student_records where student_id=$1',[student])).rows[0].n,4,'the original event history remains unchanged');
  const audit=(await db.query('select before_totals,after_totals,reason from public.ic3_student_stat_audit where student_id=$1',[student])).rows;
  assert.equal(audit.length,1);
  assert.equal(audit[0].before_totals.earned,10);
  assert.equal(audit[0].after_totals.earned,15);

  await assert.rejects(change(student,6,17,4),/tải lại/i,'stale teacher values cannot overwrite newer changes');
  await assert.rejects(change(stranger,6,15,4,[0,0,0]),/quyền/i,'cross-school writes are blocked');
  await assert.rejects(change(student,16,15,4,[6,15,4]),/không âm/i,'available cannot exceed earned');

  await db.query("insert into public.student_records(school_id,student_id,record_type,title,points,record_date) values($1,$2,'reward','Điểm thưởng',2,'2026-11-19')",[school,student]);
  const later=(await db.query('select earned,available from public.ic3_star_wallets where student_id=$1',[student])).rows[0];
  assert.deepEqual([later.earned,later.available],[17,8],'later awards accumulate on corrected totals');
  const redeem=(await db.query("select public.ic3_redeem_student_stars($1,4,'Quà') as remaining",[student])).rows[0];
  assert.equal(redeem.remaining,4,'redemptions use corrected available stars');
  assert.equal((await db.query('select available from public.ic3_star_wallets where student_id=$1',[student])).rows[0].available,4);

  await db.query("insert into public.student_records(school_id,student_id,record_type,title,points,record_date) values($1,$2,'violation','Nhắc 3',0,'2026-11-19'),($1,$2,'violation','Nhắc 4',0,'2026-11-19')",[school,student]);
  assert.equal((await db.query('select violations from public.ic3_student_violation_totals where student_id=$1',[student])).rows[0].violations,6);
  assert.equal((await db.query("select count(*)::integer as n from public.student_incident_reports where status='draft'")).rows[0].n,2);

  await db.query("update public.student_incident_reports set status='confirmed' where milestone=1");
  await assert.rejects(change(student,4,17,2,[4,17,6]),/biên bản đã xác nhận/i);
  assert.equal((await db.query('select count(*)::integer as n from public.ic3_student_stat_audit')).rows[0].n,1);
  assert.equal((await db.query("select has_table_privilege('authenticated','public.ic3_student_stat_offsets','UPDATE') as allowed")).rows[0].allowed,false);
 }finally{await db.close();}
});
