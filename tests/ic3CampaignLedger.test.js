import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const migration=readFileSync(new URL('../supabase/migrations/20261121210000_ic3_arcade.sql',import.meta.url),'utf8');
test('Server scores deadlines, milestones, retries, gear, death and redemption against one student wallet',async()=>{
 const db=new PGlite();
 const sid='00000000-0000-0000-0000-000000000001',school='00000000-0000-0000-0000-000000000002';
 try{
 await db.exec(`create role anon; create role authenticated;
 create table students(id uuid primary key); insert into students values('${sid}');
 create table student_records(student_id uuid,school_id uuid,record_type text,title text,points int,note text,record_date date);
 create view ic3_star_wallets as select student_id,school_id,sum(greatest(points,0)) earned,sum(points) available from student_records group by student_id,school_id;
 create function qlpm_student_desktop_whoami(t text) returns jsonb language sql as $$select case when t='valid' then jsonb_build_object('student_id','${sid}','school_id','${school}') end$$;`);
 await db.exec(migration);
 const rpc=async(action,turn=null,answer=null,item=null)=>(await db.query('select ic3_arcade_turn($1,$2,$3,$4,$5) res',['valid',action,turn,answer,item])).rows[0].res;
 await assert.rejects(db.query("select ic3_arcade_turn('expired')"));
 await assert.rejects(rpc('gear',null,null,2));
 for(const [threshold,bonus] of [[400,1],[800,1],[1600,2],[4200,2]]){
  await rpc('status');await db.query('update ic3_arcade_player set score=$1',[threshold-10]);const turn=await rpc('next');
  assert.equal((await rpc('next')).turn,turn.turn);
  const correct=(await db.query('select solution from ic3_arcade_questions where id=$1',[turn.question])).rows[0].solution;
  assert.equal((await rpc('answer',turn.turn,correct)).bonus,bonus);
  assert.equal((await rpc('answer',turn.turn,correct)).score,threshold);
 }
 assert.equal((await rpc('status')).wallet.earned,6);
 const gift=crypto.randomUUID();await rpc('redeem',gift);assert.equal((await rpc('redeem',gift)).wallet.available,4);
 const turn=await rpc('next');await db.exec("update ic3_arcade_player set hearts=1,deadline=now()-interval '1 minute'");
 assert.equal((await rpc('answer',turn.turn)).outcome,'defeat');
 const final=await rpc('status');assert.equal(final.score,0);assert.equal(final.wallet.earned,6);assert.equal(final.wallet.available,4);
 const bank=(await db.query('select count(*)::int n,count(distinct lesson)::int lessons from ic3_arcade_questions')).rows[0];assert.equal(bank.lessons,22);assert.ok(bank.n>=110);
 }finally{await db.close()}
});
