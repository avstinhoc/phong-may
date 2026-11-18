import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {groupedHistory,fireStyle} from '../src/lib/stars.js';

test('history groups adjacent events only, fire starts at twenty',()=>{
 const row={student_id:'a',record_date:'2026-11-19',record_type:'reward',points:1};
 const rows=[row,row,{...row,points:-2},row,{...row,student_id:'b'}];
 assert.deepEqual(groupedHistory(rows).map(g=>g.points),[2,-2,1,1]);
 assert.equal(fireStyle(19),undefined);
 assert.ok(fireStyle(20));
});

test('database enforces redemption balance, break cost, three recoveries and new streak',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;
 create function ic3_class_stars(text) returns integer language sql as $$select 0$$;
 create table students(id uuid,school_id uuid,status text,class_id uuid,class_name text,full_name text);
 create table classes(id uuid,school_id uuid,class_name text,registration_code text,archived_at timestamptz);
 create table profiles(id uuid,is_active boolean,role text,school_id uuid);
 create table school_members(user_id uuid,school_id uuid);
 create table computers(id uuid,school_id uuid,computer_code text);
 create table computer_assignments(id uuid,computer_id uuid,student_id uuid,active boolean);
 create table student_records(student_id uuid,school_id uuid,record_type text,title text,points numeric,note text,record_date date,created_at timestamptz default now(),created_by uuid);
 insert into students select auth.uid(),auth.uid(),'active',auth.uid(),'6.3','An';
 insert into profiles select auth.uid(),true,'teacher',auth.uid();
 insert into classes select auth.uid(),auth.uid(),'6.3','CLASS',null;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261119235000_class_star_events.sql',import.meta.url),'utf8'));
 const add=(type,title,points,event=null)=>db.query('insert into student_records(student_id,school_id,record_type,title,points,star_event) select auth.uid(),auth.uid(),$1,$2,$3,$4',[type,title,points,event]);
 const wallet=async()=>(await db.query('select * from ic3_star_wallets')).rows[0];
 await add('reward','Khen thưởng',20);
 await db.exec('select ic3_redeem_student_stars(auth.uid(),20)');
 assert.equal((await wallet()).effect_score,20);
 await assert.rejects(db.exec('select ic3_redeem_student_stars(auth.uid(),1)'),/không đủ/i);
 for(let i=0;i<3;i++){
  await add('violation','Mất trật tự',-2);
  assert.equal((await wallet()).effect_score,0);
  await add('reward','Phục hồi',0,'recovery');
  assert.equal((await wallet()).available,-2*(i+1));
  assert.equal((await wallet()).effect_score,20);
 }
 await add('reward','Ngắt chuỗi',-2,'penalty');
 await assert.rejects(add('reward','Phục hồi',0,'recovery'),/phục hồi/);
 await assert.rejects(add('violation','Mất trật tự',-1),/ít nhất 2/);
 await add('reward','Khen thưởng',20);
 const [student]=(await db.query("select * from ic3_class_stars('CLASS')")).rows;
 assert.equal(student.effect_score,20);
 assert.equal(student.available,12);
 }finally{await db.close();}
});
