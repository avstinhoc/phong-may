import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {uppercaseSchoolName} from '../src/lib/schoolNames.js';

const migration=readFileSync(new URL('../supabase/migrations/20261119041500_allow_same_named_schools_share_sheets_uppercase.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const management=readFileSync(new URL('../src/Management.jsx',import.meta.url),'utf8');
const workplace=readFileSync(new URL('../src/WorkplaceManager.jsx',import.meta.url),'utf8');

test('every school input supports Vietnamese uppercase; independent screens and server enforce it',()=>{
 assert.equal(uppercaseSchoolName(' thcs khương ninh '),'THCS KHƯƠNG NINH');
 assert.equal(uppercaseSchoolName('  Trường   THCS  Duy  Tân  '),'TRƯỜNG THCS DUY TÂN');
 assert.equal(uppercaseSchoolName('thcs khương',false),'THCS KHƯƠNG');
 assert.match(management,/setName\(uppercaseSchoolName\(e\.target\.value,false\)\)/);
 assert.match(management,/p_new_name:uppercaseSchoolName\(editing\.name\)/);
 assert.match(workplace,/setNewSchoolNames\(v=>\(\{\.\.\.v,\[unit\.id\]:uppercaseSchoolName\(e\.target\.value,false\)\}\)\)/);
 assert.match(edge,/await assertSameSchoolWorkbook\(admin,schoolId,\(usedBy\|\|\[\]\)/);
 assert.match(edge,/await assertSameSchoolWorkbook\(admin,link\.school_id,\(data\|\|\[\]\)/);
 assert.match(edge,/if\(!shared\.peers\.length\)/);
 assert.match(edge,/sharedClassWriteAllowed/);
});

test('same-school name duplicate profiles may share a file, different school may not; newly saved names uppercase',async()=>{
 const db=new PGlite();
 const alice='00000000-0000-0000-0000-000000000001';
 const bob='00000000-0000-0000-0000-000000000002';
 const school1='00000000-0000-0000-0000-000000000101';
 const school2='00000000-0000-0000-0000-000000000102';
 const school3='00000000-0000-0000-0000-000000000103';
 const sheet='1UJyuuiU2gg7wD-ONSa9xqv955u3Vf2K2yLz4tTvYflU';
 const template='1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM';
 try{
   await db.exec([
     'create schema auth',
     "create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid $$",
     "create function public.is_staff() returns boolean language sql as $$select true$$",
     "create function public.can_access_school(uuid) returns boolean language sql as $$select true$$",
     "create table public.schools(id uuid primary key default gen_random_uuid(),name text not null,created_at timestamptz default now())",
     'create table public.school_members(school_id uuid,user_id uuid)',
     'create table public.school_sheet_links(id uuid primary key default gen_random_uuid(),school_id uuid,owner_id uuid,spreadsheet_id text)',
     'create table public.students(school_id uuid,school_name text)',
     'create table public.profiles(school_id uuid,school_name text)'
   ].join(';\n')+';');
   await db.exec(migration);
   await db.exec('create trigger protect_shared_school_sheet_link before insert or update on public.school_sheet_links for each row execute function public.protect_shared_school_sheet_link()');
   const make=async(id,name)=>db.query('insert into public.schools(id,name) values($1,$2)',[id,name]);
   await make(school1,'THCS Khương Ninh');
   await make(school2,'  thcs  khương   ninh  ');
   await make(school3,'THCS Duy Tân');
   const {rows:all}=await db.query('select id,name from public.schools order by id');
   assert.deepEqual(all.map(x=>x.name),['THCS KHƯƠNG NINH','THCS KHƯƠNG NINH','THCS DUY TÂN']);
   const link=async(id,school,owner,book)=>db.query(
     'insert into public.school_sheet_links(id,school_id,owner_id,spreadsheet_id) values($1,$2,$3,$4)',
     [id,school,owner,book]);
   await link('00000000-0000-0000-0000-000000000201',school1,alice,sheet);
   await link('00000000-0000-0000-0000-000000000202',school2,bob,sheet);
   await assert.rejects(
     link('00000000-0000-0000-0000-000000000203',school3,bob,sheet),
     /khác tên|cùng trường/i);
   await assert.rejects(
     link('00000000-0000-0000-0000-000000000204',school3,bob,template),
     /file mẫu trống/i);
   await db.query('insert into public.school_members(school_id,user_id) values($1,$2)',[school1,alice]);
   const reused=(await db.query("select public.create_my_school('thcs khương ninh') as id")).rows[0].id;
   assert.equal(reused,school1);
   const created=(await db.query("select public.create_my_school('Trường   THCS Vũng Tàu') as id")).rows[0].id;
   assert.equal((await db.query('select name from public.schools where id=$1',[created])).rows[0].name,'TRƯỜNG THCS VŨNG TÀU');
   await db.query('insert into public.students(school_id,school_name) values($1,$2)',[school3,'THCS Duy Tân']);
   await db.query('insert into public.profiles(school_id,school_name) values($1,$2)',[school3,'THCS Duy Tân']);
   await db.query("select public.rename_my_school($1,'trường THCS duy tân')",[school3]);
   assert.equal((await db.query('select name from public.schools where id=$1',[school3])).rows[0].name,'TRƯỜNG THCS DUY TÂN');
   assert.equal((await db.query('select school_name from public.students where school_id=$1',[school3])).rows[0].school_name,'TRƯỜNG THCS DUY TÂN');
   assert.equal((await db.query('select school_name from public.profiles where school_id=$1',[school3])).rows[0].school_name,'TRƯỜNG THCS DUY TÂN');
   assert.equal((await db.query('select count(*)::int as total from public.school_sheet_links where spreadsheet_id=$1',[sheet])).rows[0].total,2);
 }finally{await db.close();}
});
