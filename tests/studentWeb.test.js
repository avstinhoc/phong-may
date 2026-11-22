import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Student Web gets a dedicated lazy route, never needs Windows/Tauri',()=>{
 const main=read('src/main.jsx'),vercel=read('vercel.json'),auth=read('src/student-web/StudentOnboarding.jsx');
 assert.match(main,/studentPath=window\.location\.pathname===\"\/student-web\"/);
 assert.match(main,/React\.lazy/);
 assert.doesNotMatch(main,/import App from/);
 const student=read('src/student-web/StudentWeb.jsx');
 assert.match(student,/React\.lazy\(\(\)=>import\('\.\/StudentClassroom\.jsx'\)\)/);
 assert.doesNotMatch(student,/React\.lazy\(\(\)=>import\('\.\/Lessons\.jsx'\)\)/);
 assert.match(student,/Lớp học tương tác/);
 assert.ok(JSON.parse(vercel).rewrites.some(x=>x.source==='/student-web'));
 assert.match(auth,/qlpm_student_web_login/);
 assert.match(auth,/qlpm_student_web_register/);
 assert.match(auth,/Tên đăng nhập/);
 assert.match(auth,/Mã PIN tự tạo/);
 assert.doesNotMatch(auth,/roster\?\.students|onTrial/);
 assert.equal(existsSync(new URL('../desktop/teacher/src-tauri/tauri.conf.json',import.meta.url)),false);
 assert.equal(existsSync(new URL('../desktop/student/src-tauri/tauri.conf.json',import.meta.url)),false);
});
test('Teacher approval is linked atomically and never displays a raw PIN',()=>{
 const app=read('src/App.jsx');
 assert.match(app,/qlpm_teacher_student_web_approve/);
 assert.match(app,/qlpm_teacher_student_web_accounts/);
 assert.match(app,/<th>TÊN ĐĂNG NHẬP<\/th><th>MÃ PIN<\/th>/);
 assert.match(app,/Đã tạo \(ẩn\)/);
 assert.match(app,/qlpm_teacher_student_web_reset_pin/);
 assert.match(app,/Đặt lại PIN/);
 assert.match(app,/type="password"/);
 assert.doesNotMatch(app,/TeacherPcConsole|desktop_controls|Quản lý Student Desktop/);
});
test('Student Web SQL restricts credentials; reused school leaderboard is authoritative',()=>{
 const sql=read('supabase/migrations/20261121132400_qlpm_student_web_credentials.sql');
 const web=read('src/student-web/StudentWeb.jsx');
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/revoke all on public\.qlpm_student_web_credentials from public, anon, authenticated/i);
 assert.match(sql,/extensions\.crypt\(p_pin/);
 assert.match(sql,/failed_attempts/);
 assert.match(sql,/qlpm_teacher_student_web_approve/);
 assert.match(web,/StudentLeaderboard/);
 assert.doesNotMatch(web,/<iframe/);
 assert.doesNotMatch(web,/student-desktop-header/);
 assert.doesNotMatch(web,/DesktopLeaderboard/);
});
test('Student Web name lookup avoids PL/pgSQL full_name ambiguity',()=>{
 const fix=read('supabase/migrations/20261121133705_fix_qlpm_student_web_signup_full_name_ambiguous.sql');
 assert.match(fix,/v_full_name text:=/);
 assert.match(fix,/trim\(v_full_name\)/);
 assert.match(fix,/trim\(student_registrations\.full_name\)/);
 assert.doesNotMatch(fix,/trim\(full_name\)/);
});

test('Approved old-style registrations synchronize uniquely and teacher may securely reset PIN',()=>{
 const sql=read('supabase/migrations/20261121145000_student_web_approval_sync_and_pin_reset.sql');
 assert.match(sql,/after update of status on public\.student_registrations/);
 assert.match(sql,/candidates = 1/);
 assert.match(sql,/max\(s\.id::text\)::uuid/);
 assert.doesNotMatch(sql,/min\(s\.id\)/);
 assert.match(sql,/other\.student_id=target_id/);
 assert.match(sql,/qlpm_teacher_student_web_reset_pin/);
 assert.match(sql,/not public\.can_access_school/);
 assert.match(sql,/revoked_at=now\(\)/);
});

test('Student Web removes duplicate page shells and resolves school PC safely',()=>{
 const student=read('src/student-web/StudentWeb.jsx');
 const ranking=read('src/student-web/StudentLeaderboard.jsx');
 const sql=read('supabase/migrations/20261121230000_student_web_pc_resolution.sql');
 const teacher=read('src/StudentWebManagement.jsx');
 assert.match(student,/refreshStudent/);
 assert.match(student,/pc_requested/);
 assert.match(student,/StudentLeaderboard/);
 assert.doesNotMatch(student,/<iframe/);
 assert.match(ranking,/ic3_school_public_portal/);
 assert.match(sql,/computer_assignments/);
 assert.match(sql,/a\.active=true and a\.released_at is null/);
 assert.match(sql,/can_access_school/);
 assert.match(teacher,/Quản lý Student Web/);
 assert.match(teacher,/qlpm_teacher_student_web_devices/);
});
test('Practice expands source-backed questions and supports teacher-published visual assets',async()=>{
 const source=JSON.parse(read('src/learning/guidedLessons.json'));
 assert.equal(source.length,22);
 const practice=read('src/student-web/Practice.jsx');
 const sql=read('supabase/migrations/20261121231000_student_web_teacher_practice_questions.sql');
 assert.match(practice,/ic3_practice_turn/);
 assert.match(practice,/QuestionPhoto/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/published=true/);
});
