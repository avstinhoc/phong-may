import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('154 waves selectable; replay, retreat, death and star awards are server-controlled',async()=>{
 const db=new PGlite();
 const sid='00000000-0000-0000-0000-000000000001',school='00000000-0000-0000-0000-000000000002';
 const init=[
  "create role anon;create role authenticated;",
  "create table students(id uuid primary key);insert into students values ('__SID__');",
  "create table student_records(student_id uuid,school_id uuid,record_type text,title text,points int,note text,record_date date);",
  "create view ic3_star_wallets as select student_id,school_id,sum(greatest(points,0)) earned,sum(points) available from student_records group by student_id,school_id;",
  "create function qlpm_student_desktop_whoami(t text) returns jsonb language sql as $$select case when t='valid' then jsonb_build_object('student_id','__SID__','school_id','__SCHOOL__') end$$;"
 ].join('\\n').replaceAll('__SID__',sid).replaceAll('__SCHOOL__',school);
 try{
  await db.exec(init);
  await db.exec(read('supabase/migrations/20261121210000_ic3_arcade.sql'));
  await db.exec([
   'alter table ic3_arcade_player add wave integer not null default 1,add wave_hp integer not null default 0,add settled_turn uuid,add settled_result jsonb;',
   'alter table ic3_arcade_questions add concept text,add media text,add media_title text;',
   'update ic3_arcade_questions set concept=id;',
   "create function ic3_pick(sid uuid,school uuid,stage int,p_excluded text[],practice boolean) returns jsonb language sql as $$select to_jsonb(q) from ic3_arcade_questions q where q.lesson=stage and not (q.concept=any(p_excluded)) order by q.id limit 1$$;",
   "insert into ic3_arcade_player(student_id,stage,cleared,wave,wave_hp) values('"+sid+"',3,2,4,0);"
  ].join('\n'));
  await db.exec(read('supabase/migrations/20261123020000_ic3_arcade_open_islands_cosmetics.sql'));
  const rpc=async(action,turn=null,choice=null,item=null)=>
    (await db.query('select ic3_arcade_turn($1,$2,$3,$4,$5) res',['valid',action,turn,choice,item])).rows[0].res;
  const solution=async prompt=>(await db.query('select solution from ic3_arcade_questions where prompt=$1',[prompt])).rows[0].solution;

  const initial=await rpc('status');
  assert.deepEqual(initial.map_progress['1'],[1,2,3,4,5,6,7]);
  assert.deepEqual(initial.map_progress['3'],[1,2,3]);

  let turn=await rpc('enter',null,null,2207);
  assert.equal(turn.stage,22);assert.equal(turn.wave,7);
  assert.equal(turn.in_battle,true);
  let result;
  for(let i=0;i<9;i++){
   result=await rpc('answer',turn.turn,await solution(turn.prompt));
   if(result.outcome==='victory')break;
   turn=await rpc('next');
  }
  assert.equal(result.outcome,'victory');
  assert.deepEqual(result.map_progress['22'],[7]);
  assert.equal(result.cleared,2);
  assert.equal(result.in_battle,false);
  
  await rpc('enter',null,null,2207);
  await db.query('update ic3_arcade_player set score=360 where student_id=$1',[sid]);
  const left=await rpc('leave');
  assert.equal(left.score,160);assert.equal(left.penalty,200);
  const leaveAgain=await rpc('leave');
  assert.equal(leaveAgain.score,160);assert.equal(leaveAgain.penalty,0);

  await rpc('enter',null,null,101);
  await db.query('update ic3_arcade_player set score=450 where student_id=$1',[sid]);
  const moved=await rpc('enter',null,null,203);
  assert.equal(moved.stage,2);assert.equal(moved.wave,3);
  assert.equal(moved.score,250);assert.equal(moved.penalty,200);
  const retry=await rpc('enter',null,null,203);
  assert.equal(retry.score,250);assert.equal(retry.penalty,0);
  assert.equal(retry.turn,moved.turn);

  await db.query("update ic3_arcade_player set hearts=1,deadline=now()-interval '1 minute',score=450 where student_id=$1",[sid]);
  const death=await rpc('answer',retry.turn);
  assert.equal(death.outcome,'defeat');assert.equal(death.score,0);
  assert.equal(death.in_battle,false);assert.equal(death.wave,3);
  assert.deepEqual(death.map_progress['22'],[7]);

  let a=await rpc('enter',null,null,105);
  await db.query('update ic3_arcade_player set score=390 where student_id=$1',[sid]);
  let award=await rpc('answer',a.turn,await solution(a.prompt));
  assert.equal(award.bonus,1);assert.equal(award.wallet.earned,1);
  await rpc('leave');
  a=await rpc('enter',null,null,105);
  await db.query('update ic3_arcade_player set score=390 where student_id=$1',[sid]);
  award=await rpc('answer',a.turn,await solution(a.prompt));
  assert.equal(award.bonus,0);assert.equal(award.wallet.earned,1);
  const awards=await db.query('select count(*)::integer n from ic3_arcade_score_awards');
  assert.equal(awards.rows[0].n,1);

  await assert.rejects(rpc('enter',null,null,2301));
  await assert.rejects(rpc('enter',null,null,1208));
  await assert.rejects(rpc('costume',null,null,32));
  const skin=await rpc('costume',null,null,31);
  assert.equal(skin.costume,31);assert.equal(skin.damage,160);
 }finally{await db.close()}
});
