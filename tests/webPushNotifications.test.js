import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261123100000_qlpm_web_push.sql');

test('Web Push creates scoped events without exposing private subscriptions',async()=>{
 const db=new PGlite();
 const school='10000000-0000-4000-8000-000000000001';
 const classroom='10000000-0000-4000-8000-000000000002';
 const teacher='10000000-0000-4000-8000-000000000003';
 const student='10000000-0000-4000-8000-000000000004';
 try{
  await db.exec([
   'create role anon; create role authenticated; create role service_role;',
   'create schema vault; create table vault.decrypted_secrets(name text,decrypted_secret text);',
   'create schema net;',
   'create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer) returns bigint language sql as $$select 1::bigint$$;',
   'create table public.schools(id uuid primary key);',
   'create table public.profiles(id uuid primary key);',
   'create table public.classes(id uuid primary key,school_id uuid references public.schools(id));',
   'create table public.students(id uuid primary key,school_id uuid references public.schools(id),class_id uuid references public.classes(id),status text);',
   'create table public.qlpm_classroom_messages(id uuid primary key,student_id uuid,teacher_id uuid,class_id uuid,sender_kind text);',
   'create table public.qlpm_classroom_posts(id uuid primary key,school_id uuid,class_id uuid,kind text);'
  ].join('\n'));
  await db.exec(migration.replace('CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;',''));
  await db.query('insert into public.schools values ($1)',[school]);
  await db.query('insert into public.profiles values ($1)',[teacher]);
  await db.query('insert into public.classes values ($1,$2)',[classroom,school]);
  await db.query("insert into public.students values($1,$2,$3,'active')",[student,school,classroom]);
  const count=async()=>(await db.query('select count(*)::int as total from public.qlpm_push_events')).rows[0].total;
  const send=async(kind,ref)=>db.query(
   'insert into public.qlpm_classroom_messages values($1,$2,$3,$4,$5)',
    [ref,student,teacher,classroom,kind]);
  await send('student','10000000-0000-4000-8000-000000000005');
  assert.equal(await count(),0,'no subscription means no queued push');
  const sub=async(ownerKind,endpoint)=>db.query(
   'insert into public.qlpm_push_subscriptions(endpoint,p256dh,auth_secret,owner_kind,student_id,teacher_id,class_id,school_id) values($1,$2,$3,$4,$5,$6,$7,$8)',[
      endpoint,'A'.repeat(90),'B'.repeat(24),ownerKind,
      ownerKind==='student'?student:null,ownerKind==='teacher'?teacher:null,
      ownerKind==='student'?classroom:null,ownerKind==='student'?school:null
    ]);
  await sub('teacher','https://fcm.googleapis.com/fcm/send/teacher');
  await send('student','10000000-0000-4000-8000-000000000006');
  assert.equal(await count(),1);
  await sub('student','https://fcm.googleapis.com/fcm/send/student');
  await send('teacher','10000000-0000-4000-8000-000000000007');
  assert.equal(await count(),2);
  await db.query('insert into public.qlpm_classroom_posts values($1,$2,$3,$4)',
    ['10000000-0000-4000-8000-000000000008',school,classroom,'quiz']);
  await db.query('insert into public.qlpm_classroom_posts values($1,$2,$3,$4)',
    ['10000000-0000-4000-8000-000000000009',school,classroom,'announcement']);
  const types=(await db.query('select event_type from public.qlpm_push_events')).rows
     .map(x=>x.event_type).sort();
  assert.deepEqual(types,['announcement','assignment','message_student','message_teacher']);
  const roles=(await db.query(
   "select has_table_privilege('anon','public.qlpm_push_subscriptions','SELECT') as anon_read,"+
   " has_table_privilege('authenticated','public.qlpm_push_events','SELECT') as auth_read,"+
   " has_table_privilege('service_role','public.qlpm_push_events','SELECT,INSERT,UPDATE') as server_write,"+
   " (select relrowsecurity from pg_class where oid='public.qlpm_push_subscriptions'::regclass) as rls"
  )).rows[0];
  assert.deepEqual(roles,{anon_read:false,auth_read:false,server_write:true,rls:true});
 }finally{await db.close()}
});

test('Web Push requires opt-in, service-worker click routing and server-only webhook',()=>{
 const edge=read('supabase/functions/qlpm-push/index.ts');
 const hook=read('src/classroom/pushNotifications.js');
 const worker=read('public/qlpm-push-sw.js');
 const control=read('src/classroom/PushPermission.jsx');
 assert.match(hook,/Notification.requestPermission\(\)/);
 assert.match(hook,/userVisibleOnly:true/);
 assert.match(hook,/applicationServerKey:/);
 assert.match(hook,/x-student-session/);
 assert.match(worker,/addEventListener\('push'/);
 assert.match(worker,/showNotification/);
 assert.match(worker,/notificationclick/);
 assert.doesNotMatch(worker,/addEventListener\('fetch'/);
 assert.match(control,/onClick=\{toggle\}/);
 assert.match(edge,/admin\.auth\.getUser\(token\)/);
 assert.match(edge,/qlpm_student_desktop_whoami/);
 assert.match(edge,/req\.headers\.get\("x-qlpm-push-dispatch"\)!==settings\.dispatch_secret/);
 assert.match(edge,/webpush\.sendNotification/);
 assert.doesNotMatch(edge,/message\.body|event\.body|title:.*full_name/);
 assert.match(migration,/REVOKE ALL ON public\.qlpm_push_subscriptions, public\.qlpm_push_events FROM PUBLIC,anon,authenticated/);
 assert.match(migration,/vault\.decrypted_secrets/);
 assert.match(read('src/TeacherClassroom.jsx'),/PushPermission/);
 assert.match(read('src/student-web/StudentClassroom.jsx'),/PushPermission studentToken/);
});
