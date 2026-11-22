import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261123041000_classroom_interaction.sql');
const extension=read('supabase/migrations/20261123052000_classroom_unread_private_files.sql');
const grants=read('supabase/migrations/20261123060000_classroom_attachment_service_role_grants.sql');
const teacher='00000000-0000-0000-0000-000000000101',school='00000000-0000-0000-0000-000000000201';
const cls='00000000-0000-0000-0000-000000000301',other='00000000-0000-0000-0000-000000000302';
const student='00000000-0000-0000-0000-000000000401';

test('private classroom: teacher assignment, student submission, grading and image message scopes',async()=>{
 const db=new PGlite();
 try{
  const init=[
   'create role anon;create role authenticated;create role service_role;',
   'create schema auth; create schema storage;',
   'create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);',
   "create function auth.uid() returns uuid language sql stable as $$select '"+teacher+"'::uuid$$;",
   'create table public.schools(id uuid primary key);',
   'create table public.profiles(id uuid primary key,full_name text);',
   'create table public.classes(id uuid primary key,school_id uuid,created_by uuid,class_name text,archived_at timestamptz,created_at timestamptz default now());',
   'create table public.students(id uuid primary key,school_id uuid,class_id uuid,full_name text,class_name text,status text);',
   "create function public.can_access_school(sid uuid) returns boolean language sql stable as $$select sid='"+school+"'::uuid$$;",
   'create function public.is_admin() returns boolean language sql stable as $$select false$$;',
   "create function public.qlpm_student_desktop_whoami(token text) returns jsonb language sql stable as $$select case when token='valid' then jsonb_build_object('student_id','"+student+"','school_id','"+school+"') end$$;",
   "insert into schools values('"+school+"');",
   "insert into profiles values('"+teacher+"','Giáo viên thực hành');",
   "insert into classes(id,school_id,created_by,class_name) values ('"+cls+"','"+school+"','"+teacher+"','6.2'),('"+other+"','"+school+"',null,'6.3');",
   "insert into students values('"+student+"','"+school+"','"+cls+"','Học sinh thử','6.2','active');"
  ].join('\n');
  await db.exec(init);
  await db.exec(sql);
  await db.exec(extension);
  await db.exec(grants);
  const roles=(await db.query(`select
   has_function_privilege('service_role','public.qlpm_student_desktop_whoami(text)','EXECUTE') whoami,
   has_table_privilege('service_role','public.students','SELECT') students,
   has_table_privilege('service_role','public.classes','SELECT') classes,
   has_table_privilege('service_role','public.qlpm_classroom_messages','SELECT,INSERT') messages,
   has_table_privilege('anon','public.qlpm_classroom_messages','SELECT') anonymous_direct_read`)).rows[0];
  assert.deepEqual(roles,{whoami:true,students:true,classes:true,messages:true,anonymous_direct_read:false});
  const ta=async(action,payload={},c=cls)=>(await db.query(
    'select public.qlpm_classroom_teacher_action($1,$2,$3,$4) as result',
    [school,c,action,JSON.stringify(payload)])).rows[0].result;
  const sa=async(action,payload={},token='valid')=>(await db.query(
    'select public.qlpm_classroom_student_action($1,$2,$3) as result',
    [token,action,JSON.stringify(payload)])).rows[0].result;
  const tf=async(c=cls)=>(await db.query(
    'select public.qlpm_classroom_teacher_feed($1,$2) as result',[school,c])).rows[0].result;
  const sf=async()=> (await db.query(
    'select public.qlpm_classroom_student_feed($1) as result',['valid'])).rows[0].result;
  const quiz=await ta('create_post',{kind:'quiz',title:'Máy tính',body:'Chọn câu đúng',
    questions:[{prompt:'CPU làm gì?',choices:['Tính toán','In giấy','Lưu mực','Phát sáng'],correct:0}]});
  assert.ok(quiz.id);
  let feed=await sf();
  assert.equal(feed.posts.length,1);
  assert.equal(JSON.stringify(feed).includes('answer_key'),false);
  assert.equal(feed.posts[0].questions[0].correct,undefined);
  await assert.rejects(sa('submit',{post_id:quiz.id,choices:[9]}));
  const submitted=await sa('submit',{post_id:quiz.id,choices:[0]});
  assert.equal(submitted.score,10);
  await assert.rejects(sa('submit',{post_id:quiz.id,choices:[0]}));
  const announcement=await ta('create_post',{kind:'announcement',title:'Thông báo',body:'Ôn bài'});
  await assert.rejects(sa('submit',{post_id:announcement.id,essay:'Không'}));
  const essay=await ta('create_post',{kind:'essay',title:'Tự luận',body:'Giải thích SSD'});
  assert.equal((await sa('submit',{post_id:essay.id,essay:'SSD lưu trữ dữ liệu'})).score,null);
  const sub=(await tf()).submissions.find(x=>x.post_id===essay.id);
  assert.equal(sub.answer.essay,'SSD lưu trữ dữ liệu');
  await ta('grade',{submission_id:sub.id,score:8.5,feedback:'Tốt'});
  feed=await sf();
  assert.equal(feed.posts.find(x=>x.id===essay.id).submission.score,8.5);
  const img='data:image/jpeg;base64,AA==';
  await sa('send_message',{body:'Em gửi ảnh ạ',image_data:img});
  assert.equal((await tf()).unread,1);
  assert.equal((await tf()).messages[0].image_data,img);
  // Two physically different 6.2 classes can belong to the same school/teacher.
  // The class with unread messages must appear first on initial page load.
  const duplicate='00000000-0000-0000-0000-000000000303';
  await db.query('insert into public.classes(id,school_id,created_by,class_name) values($1,$2,$3,$4)',
    [duplicate,school,teacher,'6.2']);
  const defaultFeed=await db.query('select public.qlpm_classroom_teacher_feed($1,NULL) as result',[school]);
  assert.equal(defaultFeed.rows[0].result.selected_class,cls);
  const active=defaultFeed.rows[0].result.classes;
  assert.equal(active[0].unread,1);
  assert.equal(active[0].students,1);
  assert.equal(active.filter(c=>c.name==='6.2').length,2);
  await ta('read_messages',{student_id:student});
  assert.equal((await tf()).unread,0);
  await ta('send_message',{student_id:student,body:'Cô nhận được'});
  assert.equal((await sf()).unread,1);
  await sa('read_messages');
  assert.equal((await sf()).unread,0);
  await assert.rejects(sa('send_message',{image_data:'https://bad.example/img'}));
  await assert.rejects(ta('create_post',{kind:'announcement',title:'Chặn',body:'Không'},other));
  await assert.rejects(sa('send_message',{body:'Không có phiên'},'invalid'));
  // Documents remain in a private Storage bucket and metadata rows only.
  const privateBucket=(await db.query("select public from storage.buckets where id='qlpm-classroom-private'")).rows[0];
  assert.equal(privateBucket.public,false);
  const path=cls+'/'+student+'/00000000-0000-4000-8000-000000000403.pdf';
  const saved=await db.query(
    'insert into public.qlpm_classroom_messages(school_id,class_id,student_id,teacher_id,sender_kind,file_path,file_name,file_type,file_size) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id',
    [school,cls,student,teacher,'student',path,'bai-tap.pdf','application/pdf',1024]
  );
  assert.ok(saved.rows[0].id);
  assert.equal((await tf()).messages.at(-1).file_name,'bai-tap.pdf');
  assert.equal((await sf()).messages.at(-1).file_size,1024);
  const tables=(await db.query("select relname,relrowsecurity from pg_class where relname like 'qlpm_classroom_%'")).rows;
  assert.equal(['qlpm_classroom_posts','qlpm_classroom_submissions','qlpm_classroom_messages'].every(
    name=>tables.find(t=>t.relname===name)?.relrowsecurity),true);
 }finally{await db.close()}
});
test('Student no longer has Bài giảng navigation; teacher menu and notifications are independent',()=>{
 const student=read('src/student-web/StudentWeb.jsx'),teacher=read('src/App.jsx');
 assert.match(student,/id:'classroom',title:'Lớp học tương tác'/);
 assert.doesNotMatch(student,/id:'lessons',title:'Bài giảng'/);
 assert.match(teacher,/page === "classroom"/);
 assert.match(teacher,/qlpm_classroom_teacher_unread/);
 assert.match(read('src/student-web/StudentClassroom.jsx'),/clipboardClassroomFile/);
 assert.match(read('src/student-web/StudentClassroom.jsx'),/classroomUpload/);
 assert.match(read('src/TeacherClassroom.jsx'),/classroom-other-threads/);
 assert.match(read('src/TeacherClassroom.jsx'),/create_post/);
 assert.match(sql,/REVOKE ALL ON public.qlpm_classroom_posts,public.qlpm_classroom_submissions,public.qlpm_classroom_messages/);
 assert.doesNotMatch(sql,/GRANT SELECT ON public.qlpm_classroom_/i);
});

test('classroom files: JWT/student-session authentication, private signatures and safe MIME types',()=>{
 const edge=read('supabase/functions/classroom-attachments/index.ts');
 const files=read('src/classroom/classroomAttachments.jsx');
 assert.match(edge,/admin\.auth\.getUser\(token\)/);
 assert.match(edge,/qlpm_student_desktop_whoami/);
 assert.match(edge,/m\.student_id===identity\.id/);
 assert.match(edge,/c\.created_by===identity\.id/);
 assert.match(edge,/createSignedUrl\(m\.file_path,180/);
 assert.match(edge,/from\(BUCKET\)/);
 assert.match(edge,/typeAllowed\(file,extension\)/);
 assert.match(edge,/file\.size>LIMIT/);
 assert.doesNotMatch(edge,/getPublicUrl\(/);
 assert.match(edge,/if\(e\)\{[\s\S]*?return respond\(503,\{error:/);
 assert.match(grants,/GRANT EXECUTE ON FUNCTION public\.qlpm_student_desktop_whoami\(text\)/);
 assert.doesNotMatch(grants,/TO (anon|authenticated)/);
 assert.match(files,/clipboardData/);
 assert.match(files,/onChange|classroomUpload/);
 assert.match(files,/\.pdf/);
 assert.match(extension,/VALUES\('qlpm-classroom-private','qlpm-classroom-private',false/);
});
