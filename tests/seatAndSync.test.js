import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeClassNames} from '../src/lib/syncClassNames.js';
import {PGlite} from '@electric-sql/pglite';
test('selectors retain exact labels, exclude retired and include unbound active classes',()=>{
 assert.deepEqual(activeClassNames([{class_name:'6A1',archived_at:'yesterday'},{class_name:'6.2'}],['6A1','6.2','6/6']),['6/6','6.2'].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true})));
});
test('private seat request requires approval and repeated imports preserve identity',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema extensions;
 create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
 create function extensions.digest(text,text) returns bytea language sql as $$select sha256(convert_to($1,'UTF8'))$$;
 create function can_access_school(uuid) returns boolean language sql as $$select $1=auth.uid()$$;
 create function ic3_resolve_class_code(text) returns text language sql as $$select $1$$;
 create table schools(id uuid primary key,name text);
 create table classes(id uuid primary key,school_id uuid,class_name text,registration_code text,archived_at timestamptz);
 create table profiles(id uuid,is_active boolean,role text);
 create table students(id uuid primary key default gen_random_uuid(),school_id uuid,class_id uuid,class_name text,full_name text,school_name text,date_of_birth date,phone text,created_by uuid,status text);
 create table computers(id uuid primary key default gen_random_uuid(),school_id uuid,computer_code text,status text);
 create table computer_assignments(id uuid primary key default gen_random_uuid(),school_id uuid,computer_id uuid,student_id uuid,active boolean default true,released_at timestamptz);
 create table student_portal_tokens(student_id uuid,token_hash text);
 insert into schools select auth.uid(),'Trường';insert into classes select auth.uid(),auth.uid(),'6.2','CLASS',null;
 insert into profiles select auth.uid(),true,'teacher';
 insert into computers(school_id,computer_code,status) select auth.uid(),'PC2','available';`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261119060000_seat_requests.sql',import.meta.url),'utf8'));
 const add="select ic3_import_sheet_student(auth.uid(),'An Bình',null,null)";
 await db.exec(add);await assert.rejects(db.exec(add),/Tên đã xuất hiện/);
 await db.exec("insert into student_portal_tokens select id,encode(extensions.digest('ABCDEFGHJKLM','sha256'),'hex') from students");
 const request="select request_seat_change('CLASS','ABCDEFGHJKLM','PC2')";
 await assert.rejects(db.exec(request.replace('ABCDEFGHJKLM','INVALID')),/mã cá nhân/);
 await db.exec(request);await assert.rejects(db.exec(request),/chờ duyệt/);
 assert.equal((await db.query('select * from computer_assignments')).rows.length,0);
 await db.exec("select review_seat_change(id,false) from seat_change_requests");await db.exec(request);
 await db.exec("select review_seat_change(id,true) from seat_change_requests where status='pending'");
 assert.equal((await db.query('select * from computer_assignments where active')).rows.length,1);
 }finally{await db.close();}
});
