import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {FIRE_TIERS,flameEffect} from '../src/lib/stars.js';

const get=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schema=get('../supabase/migrations/20261119235000_class_star_events.sql');
const streak=get('../supabase/migrations/20261119235500_pc_flame_streak_upgrade.sql');
const update=get('../supabase/migrations/20261119235900_flame_exact_tier_penalty.sql');
const app=get('../src/App.jsx');

test('teacher sees quick Mất trật tự (−2 sao), no Ngắt chuỗi option',()=>{
 assert.ok(app.includes('<option value="break">Mất trật tự (−2 sao)</option>'));
 assert.ok(app.includes('e.target.value==="break"?"Mất trật tự"'));
 assert.ok(!app.includes('<option value="break">Ngắt chuỗi'));
});

test('high-tier flame colors remain bold and grow gradually',()=>{
 const colors=FIRE_TIERS.filter(t=>t.min>=72);
 assert.equal(FIRE_TIERS.length,27);
 assert.equal(colors.length,14);
 for(const tier of colors){
  const fx=flameEffect({earned:tier.min,effect_score:tier.min,flame_state:'active'});
  assert.equal(fx.style['--flame-color'],tier.color);
  assert.equal(fx.style['--flame-core'],tier.core);
  // Deep, saturated outer palette: avoid formerly washed-out light blue/lilac.
  const channels=tier.color.slice(1).match(/.{2}/g).map(c=>parseInt(c,16));
  assert.ok(Math.min(...channels)<=22,'light outer color '+tier.color);
 }
 assert.equal(flameEffect({earned:72,effect_score:72,flame_state:'active'}).tier,14);
 assert.equal(flameEffect({earned:72,effect_score:68,flame_state:'active'}).tier,13);
});

test('each penalty or missed streak day decreases EXACTLY one fire tier; gifts do not',async()=>{
 const db=new PGlite();
 try{
  await db.exec([
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
  ].join(';\n')+';');
  await db.exec(schema);await db.exec(streak);await db.exec(update);
  const now=new Date().toISOString().slice(0,10);
  const add=(type,title,points,event=null)=>db.query(
   'insert into student_records(student_id,school_id,record_type,title,points,star_event,record_date) select auth.uid(),auth.uid(),$1,$2,$3,$4,$5',
   [type,title,points,event,now]);
  const wallet=async()=>(await db.query('select * from ic3_star_wallets')).rows[0];
  await add('reward','Khen thưởng',72);
  assert.equal((await wallet()).effect_score,72);
  await add('violation','Mất trật tự',-2);
  assert.equal((await wallet()).effect_score,68,'-2 penalty = 1 tier');
  await add('violation','Mất trật tự',-8);
  assert.equal((await wallet()).effect_score,64,'-8 penalty is still one further tier');
  await db.exec('select ic3_redeem_student_stars(auth.uid(),20)');
  assert.equal((await wallet()).effect_score,64,'gift spending does not change flame level');
  assert.equal((await wallet()).available,42);
  const f=async(a,p,d)=>(await db.query('select ic3_flame_effect_score($1,$2,$3) as score',[a,p,d])).rows[0].score;
  assert.equal(await f(72,0,1),72);
  assert.equal(await f(72,0,2),68,'one missed day drops one tier');
  assert.equal(await f(72,0,3),64,'next missed day drops another tier');
  assert.equal(await f(72,1,2),64,'penalty plus missed day drops two tiers');
  assert.equal(await f(150,1,0),135,'wide high-tier interval is still one tier');
  assert.equal(await f(20,1,0),0,'level one penalized goes below unlock threshold');
  await add('reward','Ngắt chuỗi sao',-2,'penalty');
  assert.equal((await wallet()).flame_state,'gray','legacy history stays recoverable');
 }finally{await db.close();}
});
