import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isFormalViolation,flameEffect} from '../src/lib/stars.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/App.jsx');
const school=read('../src/SchoolPortal.jsx');
const schoolStyle=read('../src/schoolPortal.css');
const management=read('../src/StudentRewardManagement.jsx');
const managerStyle=read('../src/StudentRewardManagement.css');
const teacherBoard=read('../src/TeacherSchoolLeaderboard.jsx');

test('sidebar has separate leaderboard and student-specific reward and violation manager',()=>{
 assert.match(app,/\["leaderboard", "Bảng xếp hạng", Trophy\]/);
 assert.match(app,/\["student_rewards", "Quản lý sao & vi phạm", Star\]/);
 assert.match(app,/\["GIẢNG DẠY", \[[^\]]*"student_rewards"/);
 assert.match(app,/\["PHÒNG MÁY", \[[^\]]*"leaderboard"/);
 assert.match(app,/page === "leaderboard" && <TeacherSchoolLeaderboard/);
 assert.match(app,/page === "student_rewards" && isTeacher && <StudentRewardManagement/);
 assert.match(teacherBoard,/ic3_my_school_board_code/);
 assert.match(teacherBoard,/profile\.school_id/);
 assert.match(teacherBoard,/<SchoolPortal embedded initialCode=/);
});

test('school cards have only one student portal action, no code, register or copy button',()=>{
 const start=school.indexOf('function GradeClassSection(');
 const end=school.indexOf('export function SchoolPortal(',start);
 const card=school.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(card,/Vào trang lớp/);
 assert.match(card,/school-class-open--solo/);
 assert.doesNotMatch(card,/Sao chép|class-code|Đăng ký vào lớp|registerLink|onCopy|<button/);
 assert.match(school,/\{initialCode='',embedded=false\}/);
 assert.match(school,/if\(!embedded\)window\.history\.replaceState/);
 assert.match(school,/<a className="school-nav-rank"/);
 assert.ok(school.includes("grades.map(grade=><a"));
 assert.ok(school.includes("className={'school-nav-grade'+grade}"));
 assert.match(schoolStyle,/\.school-public-nav \.school-nav-grade8\{/);
 assert.match(schoolStyle,/\.school-public-nav \.school-nav-grade7\{/);
 assert.match(schoolStyle,/\.school-public-nav \.school-nav-grade6\{/);
 assert.match(schoolStyle,/font-size:15px/);
});

test('student reward management reuses ledger, scopes by school id and never bypasses backend redemption rules',()=>{
 assert.match(management,/\.eq\('school_id',schoolId\)/);
 assert.match(management,/\.eq\('student_id',studentId\)/);
 assert.match(management,/from\('ic3_star_wallets'\)/);
 assert.match(management,/from\('student_records'\)\.insert\(record\)/);
 assert.match(management,/rpc\('ic3_redeem_student_stars'/);
 assert.match(management,/amount<2/);
 assert.match(management,/wallet\?\.can_restore/);
 assert.match(management,/star_event:'penalty'/);
 assert.match(management,/star_event:'recovery'/);
 assert.match(management,/record_type:kind==='point'\?'point':kind==='violation'\?'violation':'reward'/);
 assert.match(management,/Xem đầy đủ Điểm, lỗi & thưởng/);
 assert.match(managerStyle,/\.srm-history-scroller\{[^}]*overflow-y:auto/);
 assert.equal(isFormalViolation({record_type:'reward',star_event:'penalty',title:'Mất trật tự'}),false);
 assert.equal(isFormalViolation({record_type:'violation',title:'Không làm bài'}),true);
 assert.equal(flameEffect({earned:24,effect_score:24,flame_state:'active'}).tier,2);
});
