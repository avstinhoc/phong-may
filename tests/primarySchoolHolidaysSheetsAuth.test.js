import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {taughtLessons,lessonsForHoliday,holidayShiftLabel} from '../src/lib/cancelledLessons.js';
const text=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const app=text('../src/App.jsx');
const edge=text('../supabase/functions/google-sheets-sync/index.ts');
const schema=text('../supabase/migrations/20261120145000_non_destructive_lesson_cancellations.sql');
const gradeSql=text('../supabase/migrations/20261120144500_dynamic_primary_secondary_grade_boards.sql');
const callback=text('../src/AuthCallback.jsx');
const sheetUi=text('../src/SheetsConnectionPanel.jsx');

test('holidays can be marked by one lesson, morning, afternoon or whole day',()=>{
 const lessons=[
  {id:'a',session_date:'2026-11-20',start_time:'07:30',is_cancelled:false},
  {id:'b',session_date:'2026-11-20',start_time:'14:00',is_cancelled:false},
  {id:'c',session_date:'2026-11-20',start_time:'16:00',is_cancelled:true},
  {id:'d',session_date:'2026-11-21',start_time:'07:30',is_cancelled:false}
 ];
 assert.deepEqual(lessonsForHoliday(lessons,'2026-11-20','morning').map(x=>x.id),['a']);
 assert.deepEqual(lessonsForHoliday(lessons,'2026-11-20','afternoon').map(x=>x.id),['b']);
 assert.deepEqual(lessonsForHoliday(lessons,'2026-11-20','all').map(x=>x.id),['a','b']);
 assert.deepEqual(taughtLessons(lessons).map(x=>x.id),['a','b','d']);
 assert.equal(holidayShiftLabel('morning'),'buổi sáng');
});

test('no destructive student or attendance changes are part of cancellations',()=>{
 assert.ok(schema.includes('add column if not exists is_cancelled boolean not null default false'));
 assert.ok(!schema.match(/delete\s+from\s+(?:public\.)?(?:students|attendance)/i));
 assert.ok(app.includes("update({is_cancelled:cancel,cancel_reason:"));
 assert.ok(!app.includes("update({status:'absent'"));
 assert.ok(edge.includes('lesson.is_cancelled'));
 assert.ok(edge.includes('taughtSessionIds'));
 assert.ok(text('../src/TeacherPayroll.jsx').includes('period_count,is_cancelled'));
 assert.ok(text('../src/lib/teacherReports.js').includes('!s.is_cancelled'));
 assert.ok(text('../src/StudentEvaluation.jsx').includes('!x.is_cancelled'));
});

test('existing Google Sheets link does not require QLPM folder, no public write, no auto-sync before preflight',()=>{
 assert.ok(edge.includes('const creating=action==="create_school_workbook"'));
 assert.ok(edge.includes('if(creating&&!file.parents?.includes(root!.folder_id))'));
 assert.ok(edge.includes('auto_sync:creating'));
 assert.ok(edge.includes('action==="validate_template"'));
 assert.ok(edge.includes('Number(grid.columnCount||0)<79'));
 assert.ok(edge.includes('Number(grid.columnCount)<98'));
 assert.ok(sheetUi.includes("if(enabled)await api({action:'validate_template'})"));
 assert.ok(sheetUi.includes('không cần chuyển vào thư mục QLPM'));
});

test('Google callback goes to dashboard without success click, but keeps recovery separate',()=>{
 assert.ok(callback.includes("if(google&&!recovery){"));
 assert.ok(callback.includes("window.location.replace('/')"));
 assert.ok(callback.includes('if(linking){'));
});

test('school rankings support 1–9 but preserve Top 5 school leaderboard',()=>{
 assert.ok(gradeSql.includes("'grade_boards'"));
 assert.ok(gradeSql.includes("'grades'"));
 assert.ok(gradeSql.includes('r.all_rank<=5'));
 assert.ok(gradeSql.includes('r.grade_rank<=10'));
 assert.ok(gradeSql.includes('where s.school_id=v_school_id'));
});
