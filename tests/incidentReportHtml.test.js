import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIncidentReportHtml} from '../src/lib/incidentReportHtml.js';

const fixture={
 student:{full_name:'Trần Minh An',class_name:'6.5'},
 schoolName:'THCS Vũng Tàu',teacherName:'Giáo viên Tin học',
 report:{status:'confirmed',violation_count:3,milestone:3,notes:'Đã trao đổi với học sinh.'},
 violations:[{record_date:'2026-11-16',title:'Quên đồ dùng',note:'Nhắc nhở lần 1'},
 {record_date:'2026-11-17',title:'Chưa chuẩn bị bài',note:'Nhắc nhở lần 2'}],
 date:'2026-11-17'
};
test('document combines Vietnamese national header, statement and school logs',()=>{
 const html=buildIncidentReportHtml(fixture);
 for(const text of ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM','BIÊN BẢN GHI NHẬN LỖI HỌC SINH',
 'Kính gửi','Hiệu trưởng','Giáo viên chủ nhiệm','Em tên là','Tường trình của học sinh',
 'Giáo viên giảng dạy','Trần Minh An','THCS Vũng Tàu','Quên đồ dùng','17/11/2026'])
   assert.ok(html.includes(text),text);
 assert.ok(html.includes('học sinh tự viết'));
 assert.ok(!html.includes('BẢN NHÁP'));
});
test('draft is prominently marked and empty student explanation is not fabricated',()=>{
 const html=buildIncidentReportHtml({student:{full_name:'Bạn A'},report:{status:'draft'}});
 assert.ok(html.includes('CHƯA ĐƯỢC GIÁO VIÊN XÁC NHẬN'));
 assert.ok(html.includes('học sinh tự viết'));
 assert.ok(!html.includes('Em nhận lỗi'));
});
test('all report and student fields are escaped before creating print HTML',()=>{
 const html=buildIncidentReportHtml({student:{full_name:'<script>alert(1)</script>',class_name:'6<5'},
   schoolName:'Trường & Trung tâm',report:{notes:'<img src=x onerror=alert(1)>'},
   violations:[{title:'x<script>',note:'<b>unsafe</b>'}]});
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('<img src=x'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('Trường &amp; Trung tâm'));
});
