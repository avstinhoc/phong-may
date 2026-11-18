import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {SCHOOL_TOP_LIMIT,schoolPodiumOrder,gradeFromClassName,gradeClassRows} from '../src/lib/schoolLeaderboard.js';

const migration=readFileSync(new URL('../supabase/migrations/20261119031000_school_public_leaderboards.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const school=readFileSync(new URL('../src/SchoolPortal.jsx',import.meta.url),'utf8');
const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

test('Top 5 winner is centered and grade links handle 6A1, 6/1, 6-1 and 6.1',()=>{
 assert.equal(SCHOOL_TOP_LIMIT,5);
 const six=[1,2,3,4,5,6].map(rank=>({rank}));
 assert.deepEqual(schoolPodiumOrder(six).map(x=>x.rank),[4,2,1,3,5]);
 for(const name of ['6A1','6.1','6/1','6-1'])assert.equal(gradeFromClassName(name),'6');
 assert.equal(gradeFromClassName('7A3'),'7');
 assert.equal(gradeFromClassName('8/5'),'8');
 assert.equal(gradeFromClassName('10A1'),null);
 assert.deepEqual(gradeClassRows([
  {class_name:'6.10',grade:'6'}, {class_name:'6.2',grade:'6'}, {class_name:'7A1',grade:'7'}
 ],'6').map(x=>x.class_name),['6.2','6.10']);
 assert.ok(app.includes('return <SchoolPortal />;'));
 assert.ok(app.includes('.slice(0,5)'));
 assert.ok(school.includes('schoolPodiumOrder(rows)'));
 for(const grade of ['8','6','7'])assert.ok(school.includes('GradeLeaderboard grade="'+grade+'"'));
 assert.ok(school.includes("['8','7','6'].map"));
 assert.ok(vercel.rewrites.some(x=>x.source==='/school'));
});

test('SQL school portal collects multiple teachers but isolates same-name schools and adds new class codes automatically',async()=>{
 const db=new PGlite();
 try{
  const schoolA='00000000-0000-0000-0000-000000000011';
  const schoolB='00000000-0000-0000-0000-000000000012';
  await db.exec([
   'create role anon',
   'create role authenticated',
   'create table schools(id uuid primary key,name text)',
   "create table classes(id uuid primary key,school_id uuid,class_name text,registration_code text,legacy_registration_codes text[] default '{}'::text[],archived_at timestamptz,created_by uuid)",
   'create table students(id uuid primary key,school_id uuid,class_id uuid,class_name text,full_name text,status text)',
   'create table student_records(school_id uuid,student_id uuid,record_type text,points numeric)',
   "create view ic3_star_wallets as select school_id,student_id,sum(greatest(points,0))::integer earned,sum(points)::integer available,sum(greatest(points,0))::integer effect_score,'active'::text flame_state from student_records where record_type='reward' group by school_id,student_id",
   'grant usage on schema public to anon'
  ].join(';\n')+';');
  await db.query('insert into schools values ($1,$2),($3,$4)',[schoolA,'THCS Trùng Tên',schoolB,'THCS Trùng Tên']);
  const cls=[
   ['101',schoolA,'6A1','CLASS6A1','001'],
   ['102',schoolA,'7/1','CLASS7-1','002'],
   ['103',schoolA,'8-1','CLASS8-1','003'],
   ['104',schoolA,'8/2','CLASS8-2','004'],
   ['105',schoolB,'6A1','OTHER6A1','005']
  ];
  const id=n=>'00000000-0000-0000-0000-000000000'+n;
  for(const [idSuffix,schoolId,name,code,teacher] of cls){
   await db.query('insert into classes(id,school_id,class_name,registration_code,created_by) values($1,$2,$3,$4,$5)',
     [id(idSuffix),schoolId,name,code,id(teacher)]);
  }
  const pupils=[
   ['201',schoolA,'101','6A1','An',110],
   ['202',schoolA,'102','7/1','Bình',90],
   ['203',schoolA,'103','8-1','Chi',88],
   ['204',schoolA,'104','8/2','Dũng',65],
   ['205',schoolA,'104','8/2','Em',55],
   ['206',schoolA,'101','6A1','Giang',30],
   ['207',schoolA,'102','7/1','Hà',10],
   ['208',schoolB,'105','6A1','Khác Trường',999]
  ];
  for(const [suffix,schoolId,clsId,clsName,name,stars] of pupils){
   await db.query('insert into students values($1,$2,$3,$4,$5,$6)',
    [id(suffix),schoolId,id(clsId),clsName,name,'active']);
   await db.query('insert into student_records values($1,$2,$3,$4)',
    [schoolId,id(suffix),'reward',stars]);
  }
  await db.exec(migration);
  const get=async code=>(await db.query('select public.ic3_school_public_portal($1) as payload',[code])).rows[0].payload;
  const first=await get('CLASS6A1');
  assert.equal(first.school_name,'THCS Trùng Tên');
  assert.equal(first.class_count,4);
  assert.equal(first.student_count,7);
  assert.deepEqual(first.top_school.map(x=>x.name),['An','Bình','Chi','Dũng','Em']);
  assert.deepEqual(first.top_8.map(x=>x.name),['Chi','Dũng','Em']);
  assert.deepEqual(first.top_7.map(x=>x.name),['Bình','Hà']);
  assert.deepEqual(first.top_6.map(x=>x.name),['An','Giang']);
  assert.equal(first.top_school.length,5);
  assert.ok(first.classes.some(x=>x.class_name==='7/1'&&x.registration_code==='CLASS7-1'));
  assert.ok(!first.top_school.some(x=>x.name==='Khác Trường'));
  assert.deepEqual((await get('CLASS8-1')).top_school,first.top_school);
  assert.equal(await get('BAD'),null);
  const unrelated=await get('OTHER6A1');
  assert.equal(unrelated.student_count,1);
  assert.equal(unrelated.top_school[0].name,'Khác Trường');
  assert.ok(!unrelated.classes.some(x=>x.registration_code==='CLASS6A1'));
  assert.ok(!JSON.stringify(first).includes('phone'));
  await db.query('insert into classes(id,school_id,class_name,registration_code,created_by) values($1,$2,$3,$4,$5)',
    [id('106'),schoolA,'6/3','NEWCLASS6-3',id('006')]);
  const updated=await get('CLASS6A1');
  assert.equal(updated.class_count,5);
  assert.ok(updated.classes.some(c=>c.class_name==='6/3'&&c.registration_code==='NEWCLASS6-3'));
  await db.exec('set role anon');
  assert.equal((await get('CLASS7-1')).top_school.length,5,'anon needs only valid class code');
  await db.exec('reset role');
 }finally{await db.close();}
});
