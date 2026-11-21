import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const load=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../src/learning/quizCatalog.json',import.meta.url)));
test('practice and battle share exposure, keep answers private, and settle exactly one timed turn',async()=>{
 const db=new PGlite();
 const sid=crypto.randomUUID(),school=crypto.randomUUID();
 try{
 await db.exec(`create role anon;create role authenticated;
 create table students(id uuid primary key);insert into students values('${sid}');
 create table student_records(student_id uuid,school_id uuid,record_type text,title text,points int,note text,record_date date);
 create view ic3_star_wallets as select student_id,school_id,sum(greatest(points,0)) earned,sum(points) available from student_records group by student_id,school_id;
 create function qlpm_student_desktop_whoami(t text) returns jsonb language sql as $$select case when t='valid' then jsonb_build_object('student_id','${sid}','school_id','${school}') end$$;
 create function qlpm_student_web_whoami(t text) returns jsonb language sql as $$select public.qlpm_student_desktop_whoami(t)$$;
 create table student_web_practice_questions(id uuid,lesson int,school_id uuid,published bool,q text,choices text[],solution text,why text);`);
 for(const n of ['20261121210000_ic3_arcade.sql','20261122210000_ic3_arcade_three_waves.sql','20261122220000_ic3_arcade_seven_waves.sql','20261123010000_shared_quiz_turns.sql'])await db.exec(load(n));
 const one=async(sql,args)=>(await db.query(sql,args)).rows[0].res;
 const practice=(run,n,action,turn,choice=null)=>one("select ic3_practice_turn('valid',$1,$2,$3,$4,$5) res",[run,n,action,turn,choice]);
 const battle=(action,turn=null,choice=null)=>one("select ic3_arcade_turn('valid',$1,$2,$3) res",[action,turn,choice]);
 function checkTurn(q){
  assert.equal(new Set(q.choices).size,4);assert.ok(!q.solution&&!q.explanation&&!q.review&&!q.media_title&&!q.feedback);
  const duration=Date.parse(q.deadline)-Date.parse(q.server_now);
  assert.ok(duration>29000&&duration<=30000,duration);
 }
 for(let n=1;n<=22;n++){
  const run=crypto.randomUUID(),turn=crypto.randomUUID();const first=await practice(run,n,'next',turn);
  checkTurn(first);assert.deepEqual((await practice(run,n,'next',turn)).choices,first.choices);
  const correct=catalog.find(q=>q.prompt===first.prompt).solution;
  const graded=await practice(run,n,'answer',turn,correct);assert.equal(graded.solution,correct);assert.equal(graded.lesson,n);assert.ok(graded.correct);
  assert.deepEqual(await practice(run,n,'answer',turn,'again'),graded);
  await db.query('update ic3_arcade_player set stage=$1,seen=\'{}\'',[n]);
  const fight=await battle('next');checkTurn(fight);assert.notEqual(fight.prompt,first.prompt);
  assert.equal((await battle('status')).turn,fight.turn);
  const answer=catalog.find(q=>q.prompt===fight.prompt).solution;
  const res=await battle('answer',fight.turn,answer);assert.equal(res.review.solution,answer);assert.equal(res.review.lesson,n);
  assert.equal((await battle('answer',fight.turn,answer)).score,res.score);
 }
 // Exercise every map and wave against the real combat routine, including expiry.
 for(let n=1;n<=22;n++)for(let wave=1;wave<=7;wave++){
  await db.query("update ic3_arcade_player set stage=$1,wave=$2,hearts=3,seen='{}'",[n,wave]);
  const turn=await battle('next');checkTurn(turn);
  await db.exec("update ic3_arcade_player set deadline=now()-interval '1 second'");
  const expired=await battle('answer',turn.turn,catalog.find(q=>q.prompt===turn.prompt).solution);
  assert.equal(expired.hearts,2);assert.equal(expired.outcome,'wrong');
  assert.deepEqual(await battle('answer',turn.turn),expired);
 }
 // Published school material joins practice only. An explicitly equivalent
 // teacher rewrite and a punctuation-only duplicate do not enlarge the pool.
 const base=catalog.find(q=>q.lesson===8);
 const add=async(prompt,concept=null,scope=school)=>db.query(
  'insert into student_web_practice_questions values($1,8,$2,true,$3,$4,$5,$6,$7)',
  [crypto.randomUUID(),scope,prompt,base.choices,base.solution,'Giải thích của giáo viên.',concept]);
 await add(base.prompt.toUpperCase()+'!!!');await add('Một biến thể do giáo viên duyệt?',base.concept);
 await add('Câu hỏi của một trường khác?',null,crypto.randomUUID());
 const run=crypto.randomUUID(),seen=new Set();
 for(let i=0;i<=catalog.length;i++){
  const turn=crypto.randomUUID(),q=await practice(run,8,'next',turn);
  if(q.done)break;
  assert.ok(!seen.has(q.prompt));seen.add(q.prompt);
  await db.query("update ic3_practice_run set deadline=now()-interval '1 second' where run=$1",[run]);
  const correct=catalog.find(row=>row.prompt===q.prompt).solution;
  assert.equal((await practice(run,8,'answer',turn,correct)).correct,false);
 }
 assert.equal(seen.size,catalog.filter(q=>q.lesson===8).length);
 }finally{await db.close()}
});
