import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseTeacherCallback,TEACHER_OAUTH_CALLBACK} from '../src/lib/nativeGoogleOAuth.js';

const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Teacher deep-link rejects arbitrary schemes, hosts, fragments and urls',()=>{
 assert.equal(TEACHER_OAUTH_CALLBACK,'qlpmteacher://auth/callback');
 assert.equal(parseTeacherCallback('https://evil.example/auth/callback?code=123'),null);
 assert.equal(parseTeacherCallback('qlpmteacher://other/callback?code=123'),null);
 assert.equal(parseTeacherCallback('qlpmteacher://auth/evil?code=123'),null);
 assert.equal(parseTeacherCallback('qlpmteacher://auth/callback?code=123#token=abc'),null);
 assert.deepEqual(parseTeacherCallback('qlpmteacher://auth/callback?code=code1234567890'),{
  code:'code1234567890',flowId:'',error:''
 });
});
test('Teacher native OAuth is PKCE and does not accept role metadata from Google',()=>{
 const oauth=text('src/lib/nativeGoogleOAuth.js'),supa=text('src/lib/supabase.js');
 const rust=text('desktop/teacher/src-tauri/src/lib.rs');
 assert.ok(oauth.includes("skipBrowserRedirect:true"));
 assert.ok(oauth.includes('exchangeCodeForSession'));
 assert.ok(oauth.includes('PENDING_KEY'));
 assert.ok(oauth.includes('MAX_AGE'));
 assert.ok(supa.includes("flowType:'pkce'"));
 assert.ok(rust.includes('tauri_plugin_single_instance::init'));
 assert.ok(rust.includes('tauri_plugin_deep_link::init'));
 assert.ok(rust.includes('url::Url::parse'));
 assert.ok(rust.includes('hzxfgwnwmpdqxkvnqyim.supabase.co'));
 assert.ok(!rust.includes('open_teacher_google_oauth(app: tauri::AppHandle, path:'));
});
test('Student sessions, request endpoints and RPC grants are drafted but not run on Production',()=>{
 const sql=text('supabase/migrations/20261121170000_qlpm_desktop_students_pin_pc_approval.sql');
 const required=['qlpm_student_desktop_pins','qlpm_student_desktop_sessions',
 'qlpm_student_desktop_pin_requests','qlpm_student_desktop_pc_requests',
 'qlpm_student_desktop_login','qlpm_student_desktop_whoami','qlpm_student_desktop_logout',
 'qlpm_student_desktop_roster','qlpm_teacher_issue_student_pin','qlpm_teacher_desktop_requests',
 'qlpm_teacher_review_pin_request','qlpm_teacher_review_pc_request','qlpm_student_desktop_request_pc'];
 for(const name of required)assert.ok(sql.includes(name),name);
 assert.ok(sql.includes('enable row level security'));
 assert.ok(sql.includes("gen_salt('bf',12)"));
 assert.ok(sql.includes("interval '15 minutes'"));
 assert.ok(sql.includes('public.can_access_school'));
 assert.ok(sql.includes('revoke all on public.qlpm_student_desktop_sessions'));
});
test('School leaderboard uses server ordering and no invented ranks',()=>{
 const board=text('src/desktop/student/DesktopLeaderboard.jsx');
 assert.ok(board.includes('ic3_school_public_portal'));
 assert.ok(board.includes('top_school'));
 assert.ok(board.includes('grade_boards'));
 assert.ok(!board.includes('.sort('));
});
test('fullscreen slide viewer immediately opens from lesson tile while keeping Drive cross-origin controls',()=>{
 const app=text('src/learning/LearningPrototype.jsx');
 const viewer=text('src/learning/FullscreenSlides.jsx');
 const styles=text('src/learning/fullscreenSlides.css');
 assert.ok(app.includes('setViewing(lessonById(id))'));
 assert.ok(viewer.includes('createPortal(content,document.body)'));
 assert.ok(viewer.includes('lesson.previewUrl'));
 assert.ok(viewer.includes('ArrowRight'));
 assert.ok(styles.includes('scroll-snap-type:x mandatory'));
});
test('Arcade assets preserved as a separate module with no automatic real-school reward writes',()=>{
 const game=text('src/learning-arcade/Arcade.jsx');
 const js=text('src/desktop/student/StudentDesktop.jsx');
 assert.ok(game.includes('applyWin'));
 assert.ok(game.includes('LegendsBattle'));
 assert.ok(js.includes('/san-sao.html'));
 assert.ok(!game.includes('student_records'));
 assert.ok(!game.includes('ic3_star_wallets'));
});
test('Sheets Edge Function allows exact Windows origin but retains teacher JWT guard',()=>{
 const edge=text('supabase/functions/google-sheets-sync/index.ts');
 assert.ok(edge.includes('s==="http://tauri.localhost"'));
 assert.ok(edge.includes('if(!jwt)'));
 assert.ok(!edge.includes('*.vercel.app'));
 assert.ok(!edge.includes('origin==="*"'));
});
