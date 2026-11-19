import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {studentSheetSortPlan} from '../supabase/functions/google-sheets-sync/nameSort.js';

const file=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');
const names=file('supabase/migrations/20261120101000_vietnamese_real_name_review.sql');
const rankings=file('supabase/migrations/20261120102000_rank_earliest_star_milestone.sql');
const flames=file('supabase/migrations/20261120103000_lesson_based_flame_18h_vn.sql');
const edge=file('supabase/functions/google-sheets-sync/index.ts');

test('real Vietnamese names pass and existing falsely flagged students are re-evaluated',async()=>{
 assert.doesNotMatch(names,/hoang tu\|/);
 assert.match(names,/name_review_status in \('reject','review'\)/);
 const db=new PGlite();
 try{
  await db.exec("create role authenticated;create role anon;create schema extensions;"+
    "create function extensions.unaccent(text) returns text language sql immutable as $$"+
    "select translate($1,'ôàúễọĩ','oaueoi') $$;");
  await db.exec(names.slice(0,names.indexOf('-- Re-evaluate ONLY existing')));
  for(const name of ['Ngô Hoàng Tú Anh','Nguyễn Trọng Nghĩa','Vũ Thanh Ngân']){
   const {rows}=await db.query('select public.ic3_name_review($1) as result',[name]);
   assert.notEqual(rows[0].result.decision,'reject',name);
  }
  assert.equal((await db.query("select public.ic3_name_review('Admin Hack Game') as review")).rows[0].review.decision,'reject');
 }finally{await db.close();}
});

test('earliest star milestone breaks ties, including audited star adjustments',async()=>{
 assert.match(rankings,/earned desc,reached_at asc nulls last,available desc/);
 assert.match(file('src/StudentPortal.jsx'),/Keep that server order/);
 const db=new PGlite();
 try{
  await db.exec("create role authenticated;create role anon;"+
    "create table student_records(id uuid primary key,student_id uuid,points numeric,record_type text,created_at timestamptz);"+
    "create table ic3_student_stat_audit(id uuid primary key,student_id uuid,before_totals jsonb,after_totals jsonb,changed_at timestamptz);");
  await db.exec(rankings.slice(rankings.indexOf('create or replace function public.ic3_earned_threshold_at'),
     rankings.indexOf('create or replace function public.ic3_school_public_portal')));
  const early='00000000-0000-0000-0000-000000000001';
  const late='00000000-0000-0000-0000-000000000002';
  await db.query("insert into student_records values (gen_random_uuid(),$1,3,'reward','2026-11-15T08:00:00Z'),"+
   "(gen_random_uuid(),$1,3,'reward','2026-11-17T08:00:00Z'),"+
   "(gen_random_uuid(),$2,6,'reward','2026-11-18T08:00:00Z')",[early,late]);
  const r=await db.query('select public.ic3_earned_threshold_at($1,6) as first,public.ic3_earned_threshold_at($2,6) as second',[early,late]);
  assert.ok(new Date(r.rows[0].first)<new Date(r.rows[0].second));
  await db.query("insert into ic3_student_stat_audit values (gen_random_uuid(),$1,$2::jsonb,$3::jsonb,'2026-11-19T08:00:00Z')",
   [early,JSON.stringify({earned:6}),JSON.stringify({earned:7})]);
  const after=await db.query('select public.ic3_earned_threshold_at($1,7) as reached',[early]);
  assert.equal(new Date(after.rows[0].reached).toISOString(),'2026-11-19T08:00:00.000Z');
 }finally{await db.close();}
});

test('teaching-day expiry happens at exactly 18:00 Vietnam time, not earlier',async()=>{
 assert.match(flames,/join public.class_sessions cs/);
 assert.match(flames,/count\(distinct cs.session_date\)/);
 assert.match(flames,/when inactivity_days>=1 then 'off'/);
 const db=new PGlite();
 try{
  await db.exec(flames.slice(flames.indexOf('create or replace function public.ic3_lesson_deadline_passed'),
    flames.indexOf('create or replace view public.ic3_star_wallets')));
  const query='select public.ic3_lesson_deadline_passed($1::date,$2::timestamptz) as due';
  assert.equal((await db.query(query,['2026-11-19','2026-11-19T10:59:59Z'])).rows[0].due,false);
  assert.equal((await db.query(query,['2026-11-19','2026-11-19T11:00:00Z'])).rows[0].due,true);
  assert.equal((await db.query(query,['2026-11-19','2026-11-20T02:00:00Z'])).rows[0].due,true);
 }finally{await db.close();}
});

test('Sheets sorts by final name while preserving the entire student row and mapping',()=>{
 const grid=['Nguyễn Khoa Đăng','Vũ Thanh Ngân','Ngô Hoàng Tú Anh'].map(name=>['id',2,name,'DOB',true,'grade']);
 const plan=studentSheetSortPlan(grid);
 assert.equal(plan.safe,true);
 assert.equal(plan.needsSort,true);
 assert.deepEqual(plan.sorted.filter(x=>x.name).map(x=>x.name),['Ngô Hoàng Tú Anh','Nguyễn Khoa Đăng','Vũ Thanh Ngân']);
 assert.equal(studentSheetSortPlan([grid[0],grid[0]]).safe,false);
 assert.match(edge,/sortRange:\{range:/);
 assert.match(edge,/startColumnIndex:0,endColumnIndex:104/);
 assert.match(edge,/student_rows:studentRows/);
 assert.match(edge,/B8:B70/);
 assert.match(edge,/sortStudentTab\(db,link,await getMap/);
});
