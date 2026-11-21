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
 assert.match(student,/React\.lazy\(\(\)=>import\('\.\/Lessons\.jsx'\)\)/);
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
 assert.match(web,/\/school\?code=/);
 assert.doesNotMatch(web,/DesktopLeaderboard/);
});
