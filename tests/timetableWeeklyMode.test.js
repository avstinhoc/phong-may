import test from 'node:test';
import assert from 'node:assert/strict';
import {inferWeeklyTimetable,compactWarnings} from '../src/lib/timetableWeeklyMode.js';
import {expandWeekly} from '../src/lib/weekPlanner.js';

test('weekday grid in photo is weekly even without explicit phrase',()=>{
 assert.equal(inferWeeklyTimetable({question:'hãy nhập lịch dạy này',attachment:{name:'Lich moi.jpg',mimeType:'image/jpeg'}}),true);
 assert.equal(inferWeeklyTimetable({question:'Đọc thời khóa biểu trường Duy Tân',attachment:{name:'img.png',mimeType:'image/png'}}),true);
});
test('one-off appointment and undated chat do not become weekly schedules',()=>{
 assert.equal(inferWeeklyTimetable({question:'Thêm một buổi ngày 2026-11-20',attachment:{name:'img.jpg',mimeType:'image/jpeg'}}),false);
 assert.equal(inferWeeklyTimetable({question:'Thêm lịch',attachment:null}),false);
});
test('14 weekday timetable cells produce 14 items per week, 56 across 4 weeks',()=>{
 const days=[1,1,1,2,2,2,3,3,4,4,4,5,5,5];
 const rows=days.map((weekday,i)=>({weekday,class_name:'6.'+((i%6)+1),start_time:'14:00',end_time:'14:45',period_count:1}));
 // For synthetic test, same weekday has different class, real source times remain distinct.
 const result=expandWeekly(rows,'2026-11-16','2026-12-13');
 assert.equal(result.filter(r=>r.session_date<='2026-11-22').length,14);
 assert.equal(result.length,56);
});
test('duplicate generic missing-day warnings are grouped into one explanation',()=>{
 assert.deepEqual(compactWarnings(['Thiếu ngày','Thiếu ngày','Lệch thứ']),['Thiếu ngày (lặp 2 ô)','Lệch thứ']);
});
