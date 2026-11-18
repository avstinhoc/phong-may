import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync(new URL('../api/student-evaluation.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/StudentEvaluation.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

test('retained evaluation API (not used by UI) still validates authentication and student ownership',()=>{
 assert.ok(api.includes('auth.getUser(jwt)'));
 assert.ok(api.includes('.eq(\'school_id\',schoolId).eq(\'user_id\',auth.user.id)'));
 assert.ok(api.includes('.eq(\'id\',studentId).eq(\'school_id\',schoolId)'));
});
test('retained evaluation API does not send student names or free-text notes to AI',()=>{
 assert.ok(api.includes('JSON.stringify(summary)'));
 assert.ok(api.includes('scores:scoreEntries'));
 assert.ok(!api.includes('student.full_name'));
 assert.ok(!api.includes('student.note'));
});
test('teacher reviews evidence-based draft, saves it and exports class reports without AI in UI',()=>{
 assert.ok(ui.includes('Gợi ý nhận xét khác'));
 assert.ok(!ui.includes('AI đánh giá chi tiết'));
 assert.ok(!ui.includes("fetch('/api/student-evaluation'"));
 assert.ok(ui.includes("from('student_evaluations').insert"));
 assert.ok(ui.includes('exportClassEvaluation'));
 assert.ok(ui.includes('history')||ui.includes('pastReviews'));
 assert.ok(app.includes('<StudentEvaluation profile={profile}'));
 assert.ok(!app.includes('<Evaluation profile={profile}'));
});
