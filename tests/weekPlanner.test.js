import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mondayOf,addDays,weekday,planIntent,expandWeekly} from '../src/lib/weekPlanner.js';
import {compareStudentName} from '../src/lib/students.js';

test('Vietnamese timetable replace prompt recognizes weekly image replacement',()=>{
 const intent=planIntent('thay thế lịch mới này lên thời khóa biểu, tính từ thứ 2 tuần này');
 assert.deepEqual(intent,{replace:true,weekly:true});
});
test('start of teaching week is Monday and date arithmetic crosses months',()=>{
 assert.equal(mondayOf('2026-11-18'),'2026-11-16');
 assert.equal(weekday('2026-11-16'),1);
 assert.equal(addDays('2026-11-30',1),'2026-12-01');
});
test('each photographed class cell maps to its original weekday and repeats without shifting blank periods',()=>{
 const rows=[
  {weekday:1,class_name:'6.3',start_time:'14:00',end_time:'14:45',period_count:1},
  {weekday:1,class_name:'6.6',start_time:'15:50',end_time:'16:35',period_count:1},
  {weekday:3,class_name:'7.2',start_time:'14:50',end_time:'15:35',period_count:1}
 ];
 const expanded=expandWeekly(rows,'2026-11-16','2026-12-13');
 assert.equal(expanded.length,12);
 assert.deepEqual(expanded.filter(r=>r.session_date==='2026-11-16').map(r=>r.start_time),['14:00','15:50']);
 assert.deepEqual(expanded.filter(r=>r.session_date==='2026-11-18').map(r=>r.class_name),['7.2']);
 assert.equal(expanded[0].session_date,'2026-11-16');
 assert.equal(expanded.at(-1).session_date,'2026-12-09');
});
test('compare Vietnamese pupil full names by final given name',()=>{
 const names=['Dương Gia Hào','Lê Huỳnh Gia Bảo','Đào Ngọc Huy Anh'];
 assert.deepEqual(names.sort(compareStudentName),['Đào Ngọc Huy Anh','Lê Huỳnh Gia Bảo','Dương Gia Hào']);
});
test('reject impossible weekday or overlong recurring draft',()=>{
 assert.throws(()=>expandWeekly([{weekday:8,class_name:'6.1'}],'2026-11-16','2026-11-23'),/Thiếu thứ/);
 assert.throws(()=>expandWeekly([{weekday:1,class_name:'6.1'}],'2026-11-16','2027-05-16'),/Khoảng ngày/);
});
