import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync(new URL('../api/student-evaluation.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/StudentEvaluation.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

test('AI student evaluation validates authentication, membership and real student ownership',()=>{
 assert.ok(api.includes('auth.getUser(jwt)'));
 assert.ok(api.includes('.eq(\'school_id\',schoolId).eq(\'user_id\',auth.user.id)'));
 assert.ok(api.includes('.eq(\'id\',studentId).eq(\'school_id\',schoolId)'));
 assert.ok(api.includes("consume_help_ai_quota"));
 assert.ok(api.includes('GEMINI_API_KEY'));
});
test('AI receives summary metrics, not student PII or free-text notes',()=>{
 assert.ok(api.includes('JSON.stringify(summary)'));
 assert.ok(api.includes('scores:scoreEntries'));
 assert.ok(!api.includes('student.full_name'));
 assert.ok(!api.includes('student.note'));
 assert.ok(api.includes("responseMimeType:'application/json'"));
 assert.ok(api.includes("source:'gemini-draft'"));
});
test('teacher reviews a draft before inserting student evaluations',()=>{
 assert.ok(ui.includes('AI đánh giá chi tiết'));
 assert.ok(ui.includes("fetch('/api/student-evaluation'"));
 assert.ok(ui.includes('setComment(result.comment)'));
 assert.ok(ui.includes("from('student_evaluations').insert"));
 assert.ok(ui.includes('history')||ui.includes('pastReviews'));
 assert.ok(app.includes('<StudentEvaluation profile={profile}'));
 assert.ok(!app.includes('<Evaluation profile={profile}'));
});
