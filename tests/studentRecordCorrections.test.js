import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const sql=readFileSync(new URL('../supabase/migrations/20261120093000_student_record_corrections.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const management=readFileSync(new URL('../src/StudentRewardManagement.jsx',import.meta.url),'utf8');
const picker=readFileSync(new URL('../src/StudentPicker.jsx',import.meta.url),'utf8');
const correction=readFileSync(new URL('../src/RecordCorrectionEditor.jsx',import.meta.url),'utf8');

test('both desks share one searchable student picker and an editable individual history',()=>{
 assert.match(app,/<StudentPicker key={selectedClass}/);
 assert.match(management,/<StudentPicker key={selectedClass}/);
 assert.doesNotMatch(management,/Chọn học sinh…<\/option>/);
 assert.doesNotMatch(app,/aria-label="Lọc học sinh ghi nhận"/);
 assert.match(app,/editHistory\?filteredRecords:groupedHistory\(filteredRecords\)/);
 assert.match(management,/<RecordCorrectionEditor/);
 assert.match(app,/<RecordCorrectionEditor/);
 assert.match(correction,/ic3_correct_student_record/);
 assert.match(correction,/p_reason:form.reason.trim\(\)/);
 assert.match(picker,/role="combobox"/);
 assert.match(picker,/role="listbox"/);
 assert.match(picker,/onKeyDown=/);
 assert.match(management,/kind==='award'\?reward/);
 assert.match(app,/record_type==='reward'\?rewardAmount/);
});

test('audited corrections reassign reward and violations, rebuild drafts, prevent cross-school edits',async()=>{
 const db=new PGlite();
 const actor='00000000-0000-0000-0000-000000000001';
 const school='00000000-0000-0000-0000-000000000002';
 const otherSchool='00000000-0000-0000-0000-000000000003';
 const first='00000000-0000-0000-0000-000000000004';
 const second='00000000-0000-0000-0000-000000000005';
 const outsider='00000000-0000-0000-0000-000000000006';
 const reward='00000000-0000-0000-0000-000000000007';
 const violation='00000000-0000-0000-0000-000000000008';
 const correct=(id,student,type,title,points,reason='Chọn nhầm tên học sinh')=>
   db.query('select public.ic3_correct_student_record($1::uuid,$2::uuid,$3::text,$4::text,$5::numeric,$6::date,$7::text,$8::text) as success',
    [id,student,type,title,points,'2026-11-19','Ghi nhận đã đối soát',reason]);
 try{
  await db.exec([
   'create role anon',
   'create role authenticated',
   'create schema auth',
   'create table auth.users(id uuid primary key)',
   "create function auth.uid() returns uuid language sql stable as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$",
   'create table public.schools(id uuid primary key,violation_report_threshold int default 3)',
   'create table public.profiles(id uuid primary key,school_id uuid,is_active boolean,role text)',
   'create table public.students(id uuid primary key,school_id uuid,full_name text,status text)',
   'create table public.student_records(id uuid primary key,school_id uuid,student_id uuid,record_type text,title text,points numeric,note text,record_date date,star_event text,created_at timestamptz default now(),created_by uuid)',
   'create table public.student_incident_reports(id uuid default gen_random_uuid() primary key,school_id uuid,student_id uuid,milestone int,violation_count int,status text,unique(student_id,milestone))',
   "create function public.can_access_school(s uuid) returns boolean language sql stable as $$select exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active and p.school_id=s)$$",
   'grant usage on schema public to authenticated',
   'grant select,update,delete on public.student_records to authenticated'
  ].join(';\n')+';');
  await db.query('insert into auth.users values($1)',[actor]);
  await db.query('insert into public.schools(id) values ($1),($2)',[school,otherSchool]);
  await db.query('insert into public.profiles values($1,$2,true,$3)',[actor,school,'teacher']);
  for(const [id,schoolId,name] of [[first,school,'An'],[second,school,'Bình'],[outsider,otherSchool,'Khác']]){
    await db.query('insert into public.students values($1,$2,$3,$4)',[id,schoolId,name,'active']);
  }
  await db.query("insert into public.student_records(id,school_id,student_id,record_type,title,points,record_date) values($1,$2,$3,'reward','Khen thưởng',10,'2026-11-19')",[reward,school,first]);
  await db.query("insert into public.student_records(id,school_id,student_id,record_type,title,points,record_date) values($1,$2,$3,'reward','Khen thưởng',2,'2026-11-19')",['00000000-0000-0000-0000-000000000009',school,second]);
  await db.query("insert into public.student_records(id,school_id,student_id,record_type,title,points,record_date) values($1,$2,$3,'violation','Không làm bài',0,'2026-11-19')",[violation,school,first]);
  await db.exec(sql);
  const ok=await correct(reward,second,'reward','Khen thưởng đúng',5);
  assert.equal(ok.rows[0].success,true);
  const corrected=await db.query('select student_id,title,points from public.student_records where id=$1',[reward]);
  assert.equal(corrected.rows[0].student_id,second);
  assert.equal(Number(corrected.rows[0].points),5);
  const audit=await db.query('select previous_data,corrected_data,reason,corrected_by from public.student_record_corrections where record_id=$1',[reward]);
  assert.equal(audit.rows.length,1);
  assert.equal(audit.rows[0].corrected_by,actor);
  assert.equal(audit.rows[0].previous_data.student_id,first);
  assert.equal(audit.rows[0].corrected_data.student_id,second);
  assert.equal(audit.rows[0].reason,'Chọn nhầm tên học sinh');
  await assert.rejects(correct(reward,outsider,'reward','Sai trường',5),/không thuộc trường/i);
  await assert.rejects(correct(reward,second,'reward','Sai số sao',-1),/sao thưởng/i);
  await assert.rejects(correct(reward,second,'reward','Thiếu lý do',5,'a'),/lý do/i);
  assert.equal((await db.query('select count(*)::int as n from public.student_record_corrections')).rows[0].n,1);
  // The former 3-violation draft must disappear after the third violation moves.
  await db.query("insert into public.student_records(id,school_id,student_id,record_type,title,points,record_date) values (gen_random_uuid(),$1,$2,'violation','Nhắc 1',0,'2026-11-19'),(gen_random_uuid(),$1,$2,'violation','Nhắc 2',0,'2026-11-19')",[school,first]);
  await db.query("insert into public.student_incident_reports(school_id,student_id,milestone,violation_count,status) values($1,$2,1,3,'draft')",[school,first]);
  await correct(violation,second,'violation','Không làm bài',0);
  const draft=await db.query("select count(*)::int as n from public.student_incident_reports where status='draft'");
  assert.equal(draft.rows[0].n,0);
  const remaining=await db.query("select student_id,count(*)::int as n from public.student_records where record_type='violation' group by student_id");
  assert.deepEqual(remaining.rows.map(x=>[x.student_id,x.n]).sort(),[[first,2],[second,1]].sort());
  // Confirmed incident reports are protected.
  await db.query("insert into public.student_incident_reports(school_id,student_id,milestone,violation_count,status) values($1,$2,1,3,'confirmed')",[school,first]);
  await assert.rejects(correct(violation,first,'violation','Chuyển nhầm',0),/đã xác nhận/i);
  // Direct row edits are forbidden; teacher must use the auditing RPC.
  await db.exec('set role authenticated');
  await assert.rejects(db.query("update public.student_records set points=99 where id=$1",[reward]),/permission denied/i);
  await db.exec('reset role');
 }finally{await db.close();}
});
