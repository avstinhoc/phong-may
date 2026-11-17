import test from 'node:test';import assert from 'node:assert/strict';
import {ownTeachingLessons,teachingLessonLabel} from '../src/lib/rollCallSelection.js';
test('teachers and admins only point-and-click their own teaching sessions',()=>{
 const rows=[{id:'one',teacher_id:'admin',created_by:'teacher'}, {id:'two',teacher_id:'teacher',created_by:'admin'},
  {id:'three',teacher_id:null,created_by:'admin'}, {id:'four',teacher_id:null,created_by:'teacher'}];
 assert.deepEqual(ownTeachingLessons(rows,'admin').map(s=>s.id),['one','three']);
 assert.deepEqual(ownTeachingLessons(rows,'teacher').map(s=>s.id),['two','four']);
});
test('lesson label always includes class, date and time',()=>{
 assert.equal(teachingLessonLabel({class_name:'6.5',session_date:'2026-11-17',start_time:'14:00:00',end_time:'14:45:00'}),'Lớp 6.5 · 17/11/2026 · 14:00–14:45');
});
