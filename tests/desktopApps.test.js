import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));
const teacher=json('desktop/teacher/src-tauri/tauri.conf.json');
const student=json('desktop/student/src-tauri/tauri.conf.json');

test('separate Windows installers have distinct identifiers, correct pages and no kiosk',()=>{
 assert.equal(teacher.identifier,'vn.qlpm.teacher');
 assert.equal(student.identifier,'vn.qlpm.student');
 assert.notEqual(teacher.productName,student.productName);
 assert.equal(teacher.app.windows[0].url,'index.html');
 assert.equal(student.app.windows[0].url,'student-desktop.html');
 for(const app of [teacher,student]){
  assert.equal(app.app.windows.length,1);
  assert.equal(app.app.windows[0].resizable,true);
  assert.equal(app.app.windows[0].fullscreen,false);
  assert.equal(app.build.frontendDist,'../../../dist');
  assert.equal(app.bundle.targets[0],'nsis');
  assert.ok(app.build.beforeBuildCommand.includes('--mode desktop'));
  assert.equal(app.app.windows[0].label,'main');
  assert.deepEqual(app.bundle.icon,['icons/32x32.png','icons/128x128.png','icons/icon.ico']);
 }
});

test('native Student starts with Windows once and respects later admin disable',()=>{
 const rust=read('desktop/student/src-tauri/src/lib.rs');
 const cargo=read('desktop/student/src-tauri/Cargo.toml');
 assert.match(cargo,/tauri-plugin-autostart\s*=\s*"=2\.7\.0"/);
 assert.ok(rust.includes('plugin(tauri_plugin_autostart::init'));
 assert.ok(rust.includes('autolaunch().enable()'));
 assert.ok(rust.includes('if !marker.exists()'));
 assert.ok(rust.includes('app_config_dir()'));
 assert.ok(rust.includes('autostart-choice-initialized'));
 assert.ok(!read('desktop/teacher/src-tauri/src/lib.rs').includes('autolaunch'));
});

test('Student desktop actually embeds lessons, quizzes and game screens, never fake-authenticates',()=>{
 const app=read('src/desktop/student/StudentDesktop.jsx');
 const html=read('student-desktop.html');
 const proto=read('src/learning/LearningPrototype.jsx');
 const vite=read('vite.config.js');
 assert.ok(html.includes('src/desktop/student/main.jsx'));
 assert.ok(vite.includes('studentDesktop:'));
 assert.ok(app.includes('initialExerciseTab'));
 for(const text of ['Bài giảng','Câu hỏi','Trò chơi','Trang chủ','Tài khoản học sinh','PIN 6 số'])
  assert.ok(app.includes(text),text);
 assert.ok(proto.includes("embedded=false"));
 assert.ok(proto.includes("initialExerciseTab='questions'"));
 assert.ok(proto.includes('!embedded&&<Header'));
 assert.ok(!app.includes('supabase.from('));
 assert.ok(!app.includes('supabase.rpc('));
 assert.ok(app.includes('chưa được kích hoạt'),'Not-yet-secure PIN must not appear functional');
});

test('desktop-only frontend env never bundles a service_role/secret API key',()=>{
 const desktopEnv=read('.env.desktop');
 assert.match(desktopEnv,/VITE_SUPABASE_URL=https:\/\/[a-z0-9-]+\.supabase\.co/);
 assert.match(desktopEnv,/VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_/);
 // Comments may explain why secret keys are forbidden. Only validate real VITE_ assignments.
 const variables=desktopEnv.split(/\r?\n/).filter(line=>/^VITE_[A-Z_]+=/.test(line));
 assert.ok(!variables.some(line=>/SERVICE_ROLE|SECRET|sb_secret_/.test(line)));
 assert.ok(variables.some(line=>line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_')));
 const cfgs=[json('desktop/teacher/src-tauri/capabilities/default.json'),json('desktop/student/src-tauri/capabilities/default.json')];
 for(const cfg of cfgs){
  assert.deepEqual(cfg.windows,['main']);
  assert.deepEqual(cfg.permissions,['core:default']);
 }
});

test('Windows teacher reuses real QLPM UI, but Google native WebView redirect is blocked until approved deep-link flow',()=>{
 const teacherHtml=read('index.html');
 const teacherMain=read('src/main.jsx');
 const oauth=read('src/lib/googleAuth.js');
 assert.ok(teacherHtml.includes('/src/main.jsx'));
 assert.ok(teacherMain.includes('App'));
 assert.ok(oauth.includes('window.__TAURI_INTERNALS__'));
 assert.ok(oauth.includes('Phiên web không tự chuyển vào ứng dụng'));
 const ci=read('.github/workflows/desktop-windows.yml');
 assert.ok(ci.includes('workflow_dispatch'));
 assert.ok(ci.includes('upload-artifact'));
 assert.ok(ci.includes('windows-latest'));
 assert.ok(ci.includes('QLPM-'));
});
