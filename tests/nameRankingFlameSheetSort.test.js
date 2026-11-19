import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {studentSheetSortPlan,studentRowMoves,matchedStudentBatches} from '../supabase/functions/google-sheets-sync/nameSort.js';

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
 const names=['Nguyễn Khoa Đăng','Vũ Thanh Ngân','Ngô Hoàng Tú Anh','Vũ Thanh Ngân','Trần Danh'];
 const grid=names.map((name,i)=>[i,i+1,name,'DOB',i%2===0,'grade'+i,'custom'+i]);
 const plan=studentSheetSortPlan(grid,8,12);
 const after=[...grid];
 for(const {moveDimension:{source,destinationIndex}} of studentRowMoves(plan,77)){
  assert.equal(source.sheetId,77);
  after.splice(destinationIndex-7,0,...after.splice(source.startIndex-7,1));
 }
 assert.deepEqual(after,[grid[2],grid[4],grid[0],grid[1],grid[3]]);
 assert.equal(studentSheetSortPlan(after,8,12).needsSort,false);
 assert.deepEqual(plan.sorted.map(r=>grid[r.sheetRow-8]),after);
});
test('40 matched pupils need one result read, 63 need two, ambiguous rows are excluded',()=>{
 const pairs=Array.from({length:63},(_,id)=>({student:{id}}));
 assert.equal(matchedStudentBatches(pairs.slice(0,40)).length,1);
 const batches=matchedStudentBatches([...pairs,pairs[0],{student:{id:99},ambiguous:true}]);
 assert.deepEqual(batches.map(x=>x.length),[60,3]);
 assert.deepEqual(batches.flat(),pairs.map(p=>p.student.id));
});

test('merged roster cells follow their students and header merges stay intact',async()=>{
 const {mergedRowMoves,verifiedCodeMatch}=await import('../supabase/functions/google-sheets-sync/nameSort.js');
 const plan=studentSheetSortPlan([[0,1,'Trần Nam'],[1,2,'Vũ An']],8,9);
 const range={sheetId:4,startRowIndex:7,endRowIndex:8,startColumnIndex:20,endColumnIndex:22};
 const header={...range,startRowIndex:1,endRowIndex:4};
 const batch=mergedRowMoves(plan,4,[header,range]);
 assert.deepEqual(batch.requests.map(x=>Object.keys(x)[0]),['unmergeCells','moveDimension','mergeCells']);
 assert.deepEqual(batch.requests[2].mergeCells.range,{...range,startRowIndex:8,endRowIndex:9});
 assert.ok(mergedRowMoves(plan,4,[{...range,endRowIndex:9}]).warning);
 const twins=[{id:1,student_code:'02'},{id:2,student_code:'03'}];
 assert.equal(verifiedCodeMatch('03',twins,true)?.id,2);
 assert.equal(verifiedCodeMatch('03',twins,false),null);
 assert.equal(verifiedCodeMatch('3',twins,true),null);
});
