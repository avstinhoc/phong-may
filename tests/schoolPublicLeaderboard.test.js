import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {SCHOOL_TOP_LIMIT,schoolPodiumOrder,gradeFromClassName,gradeClassRows,schoolGradeLevels} from '../src/lib/schoolLeaderboard.js';

const migration=readFileSync(new URL('../supabase/migrations/20261119031000_school_public_leaderboards.sql',import.meta.url),'utf8');
const includeActive=readFileSync(new URL('../supabase/migrations/20261119032000_school_include_active_students.sql',import.meta.url),'utf8');
const gradeTopTen=readFileSync(new URL('../supabase/migrations/20261120090000_school_grade_top_ten.sql',import.meta.url),'utf8');
const dynamicGrades=readFileSync(new URL('../supabase/migrations/20261120144500_dynamic_primary_secondary_grade_boards.sql',import.meta.url),'utf8');
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
 assert.ok(school.includes('const rows=(items||[]).slice(0,10)'));
 assert.ok(school.includes('GradeLeaderboard grade={selectedGrade}'));
 // Homepage shows all 3 live grade leaderboards directly beneath school Top 5,
 // while retaining the dedicated grade pages and their class directory.
 const homeStart=school.indexOf('!selectedGrade&&<>');
 const schoolTop=school.indexOf('id="school-standings"',homeStart);
 const gradePanels=school.indexOf('className="school-three-grades"',homeStart);
 const gradeLaunchers=school.indexOf('className="school-grade-launchers"',homeStart);
 assert.ok(homeStart>=0&&schoolTop>homeStart&&gradePanels>schoolTop&&gradeLaunchers>gradePanels);
 assert.ok(school.includes('grades.map(grade=><GradeLeaderboard'));
 assert.deepEqual(schoolGradeLevels({grades:['5','1','9','6'],classes:[]}),['1','5','6','9']);
 assert.deepEqual(schoolGradeLevels({classes:[{class_name:'2.1'},{class_name:'3A2'},{class_name:'10A1'}]}),['2','3']);
 assert.ok(school.includes('Xem trang khối {grade} và danh sách lớp'));
 assert.ok(school.includes('gradeLink(grade,code)'));
 assert.ok(school.includes('grades.map(grade=><a'));
 assert.ok(vercel.rewrites.some(x=>x.source==='/school'));
 assert.ok(vercel.rewrites.some(x=>x.source==='/school/grade/:grade'));
 assert.ok(app.includes('window.location.pathname === "/school" ||'));
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
   ['209',schoolA,null,'6A5','Huy',15],
   ['208',schoolB,'105','6A1','Khác Trường',999]
  ];
  for(const [suffix,schoolId,clsId,clsName,name,stars] of pupils){
   await db.query('insert into students values($1,$2,$3,$4,$5,$6)',
    [id(suffix),schoolId,clsId?id(clsId):null,clsName,name,'active']);
   await db.query('insert into student_records values($1,$2,$3,$4)',
    [schoolId,id(suffix),'reward',stars]);
  }
  await db.exec(migration);
  await db.exec(includeActive);
  await db.exec(gradeTopTen);
  await db.exec(dynamicGrades);
  const get=async code=>(await db.query('select public.ic3_school_public_portal($1) as payload',[code])).rows[0].payload;
  const first=await get('CLASS6A1');
  assert.equal(first.school_name,'THCS Trùng Tên');
  assert.equal(first.class_count,4);
  assert.equal(first.student_count,8);
  assert.deepEqual(first.top_school.map(x=>x.name),['An','Bình','Chi','Dũng','Em']);
  assert.deepEqual(first.top_8.map(x=>x.name),['Chi','Dũng','Em']);
  assert.deepEqual(first.top_7.map(x=>x.name),['Bình','Hà']);
  assert.deepEqual(first.top_6.map(x=>x.name),['An','Giang','Huy']);
  assert.ok(!first.classes.some(x=>x.class_name==='6A5'),'Student without registered class can rank, but must not publish a nonexistent code');
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
  // Add enough pupils to prove the grade ranking genuinely reaches 10 while school stays Top 5.
  for(let i=0;i<9;i++){
    const pupilId=id(String(310+i));
    await db.query('insert into students values($1,$2,$3,$4,$5,$6)',[pupilId,schoolA,id('101'),'6A1','Bạn lớp 6 '+i,'active']);
    await db.query('insert into student_records values($1,$2,$3,$4)',[schoolA,pupilId,'reward',9-i]);
  }
  const expanded=await get('CLASS6A1');
  assert.equal(expanded.top_school.length,5,'The school podium must remain Top 5');
  assert.equal(expanded.top_6.length,10,'Grade 6 must return its first 10 students');
  assert.equal(expanded.top_6[0].name,'An');
  assert.ok(expanded.top_6.every(row=>row.class_name.startsWith('6')));
  assert.deepEqual(expanded.grade_boards['6'],expanded.top_6);
  // The same school may teach primary and secondary grades; their boards do not cross.
  await db.query('insert into classes(id,school_id,class_name,registration_code,created_by) values($1,$2,$3,$4,$5)',
    [id('107'),schoolA,'2.1','PRIMARY21',id('006')]);
  await db.query('insert into students values($1,$2,$3,$4,$5,$6)',
    [id('410'),schoolA,id('107'),'2.1','Học sinh tiểu học','active']);
  await db.query('insert into student_records values($1,$2,$3,$4)',
    [schoolA,id('410'),'reward',50]);
  const mixed=await get('PRIMARY21');
  assert.ok(mixed.grades.includes('2'));
  assert.ok(mixed.grades.includes('6'));
  assert.equal(mixed.grade_boards['2'][0].name,'Học sinh tiểu học');
  assert.ok(mixed.grade_boards['6'].every(item=>item.class_name.startsWith('6')));
  assert.equal((await get('OTHER6A1')).grade_boards['2'],undefined);

 }finally{await db.close();}
});
