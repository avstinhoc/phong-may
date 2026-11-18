import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {flameEffect,FIRE_TIERS,fireStyle} from '../src/lib/stars.js';

const migration=readFileSync(new URL('../supabase/migrations/20261119235500_pc_flame_streak_upgrade.sql',import.meta.url),'utf8');
const previous=readFileSync(new URL('../supabase/migrations/20261119235000_class_star_events.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const portal=readFileSync(new URL('../src/StudentPortal.jsx',import.meta.url),'utf8');

test('fire unlocks at 20, has 9 colors and a gray cooldown',()=>{
 assert.equal(flameEffect({earned:19,effect_score:19,flame_state:'active'}).visible,false);
 assert.equal(flameEffect({earned:20,effect_score:20,flame_state:'active'}).tier,1);
 assert.equal(FIRE_TIERS.length,9);
 assert.equal(flameEffect({earned:100,effect_score:100,flame_state:'active'}).tier,6);
 assert.equal(flameEffect({earned:50,effect_score:44,flame_state:'cooling'}).state,'cooling');
 assert.equal(flameEffect({earned:50,effect_score:42,flame_state:'gray'}).style['--flame-color'],'#939da8');
 assert.equal(flameEffect({earned:50,effect_score:42,flame_state:'off'}).visible,false);
 assert.equal(fireStyle(19),undefined);
 assert.ok(fireStyle(30));
 assert.ok(app.includes('machineFlame?.className'));
 assert.ok(portal.includes('fireForMachine(c)'));
 assert.ok(portal.includes('portal-floating-actions'));
 assert.ok(portal.includes('portal-private-lookup'));
});

test('SQL enforces 2 stars to redeem, fire fades for disorder, gray break and 3 recovery chances',async()=>{
 const db=new PGlite();
 try{
  const setup=[
   'create role anon','create role authenticated','create schema auth',
   "create function auth.uid() returns uuid language sql as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$",
   'create function ic3_class_stars(text) returns integer language sql as $$select 0$$',
   'create table students(id uuid,school_id uuid,status text,class_id uuid,class_name text,full_name text)',
   'create table classes(id uuid,school_id uuid,class_name text,registration_code text,archived_at timestamptz)',
   'create table profiles(id uuid,is_active boolean,role text,school_id uuid)',
   'create table school_members(user_id uuid,school_id uuid)',
   'create table computers(id uuid,school_id uuid,computer_code text)',
   'create table computer_assignments(id uuid,computer_id uuid,student_id uuid,active boolean)',
   'create table student_records(student_id uuid,school_id uuid,record_type text,title text,points numeric,note text,record_date date,created_at timestamptz default now(),created_by uuid)',
   "insert into students select auth.uid(),auth.uid(),'active',auth.uid(),'6A1','An'",
   "insert into profiles select auth.uid(),true,'teacher',auth.uid()",
   "insert into classes select auth.uid(),auth.uid(),'6A1','CL-6A1',null"
  ].join(';\n')+';';
  await db.exec(setup);
  await db.exec(previous);
  await db.exec(migration);
  const now=new Date().toISOString().slice(0,10);
  const add=(type,title,points,event=null)=>
   db.query('insert into student_records(student_id,school_id,record_type,title,points,star_event,record_date) select auth.uid(),auth.uid(),$1,$2,$3,$4,$5',[type,title,points,event,now]);
  const wallet=async()=>(await db.query('select * from ic3_star_wallets')).rows[0];
  await add('reward','Khen thưởng',50);
  assert.equal((await wallet()).flame_state,'active');
  await assert.rejects(db.exec('select ic3_redeem_student_stars(auth.uid(),1)'),/ít nhất 2/i);
  await db.exec('select ic3_redeem_student_stars(auth.uid(),25)');
  assert.equal((await wallet()).effect_score,50,'redeeming gifts cannot remove flame levels');
  await add('violation','Mất trật tự',-2);
  assert.equal((await wallet()).effect_score,44,'penalty weakens the flame');
  await add('reward','Ngắt chuỗi sao',-2,'penalty');
  assert.equal((await wallet()).flame_state,'gray');
  assert.equal((await wallet()).can_restore,true);
  await add('reward','Phục hồi chuỗi sao',0,'recovery');
  assert.equal((await wallet()).flame_state,'active');
  assert.equal((await wallet()).available,21,'recovery cannot return lost stars');
  assert.equal((await wallet()).chances,2);
  const cls=await db.query("select * from ic3_class_flame_status('CL-6A1')");
  assert.equal(cls.rows.length,1);
 }finally{await db.close();}
});
