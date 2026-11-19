import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rewardSummaryRows,recentRewardActivity} from '../src/lib/rewardSummary.js';

const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const rewards=readFileSync(new URL('../src/StudentRewardManagement.jsx',import.meta.url),'utf8');

test('lab menu is ordered exactly as requested',()=>{
 const expected='["PHÒNG MÁY", ["computers", "students", "settings", "leaderboard", "cleaning"]]';
 assert.ok(app.includes(expected));
 assert.match(app,/\["students", "Đăng ký & duyệt", Users\]/);
 assert.match(app,/\["settings", "Lớp & mã đăng ký", Settings\]/);
});

test('no Top 5 rewards/redemption leaderboard remains in Records; new directory is last in rewards management',()=>{
 assert.doesNotMatch(app,/star-leaderboard-panel/);
 assert.doesNotMatch(app,/TOP 5 sao & đổi quà/);
 assert.doesNotMatch(app,/redeemOneStar/);
 assert.match(app,/incident-reports-panel/);
 assert.match(rewards,/Danh sách điểm thưởng & sao học sinh/);
 assert.match(rewards,/Lọc lớp trong danh sách điểm thưởng và sao/);
 assert.match(rewards,/recentRewardActivity/);
 assert.match(rewards,/selectBoardStudent\(row,'redeem'\)/);
 assert.match(rewards,/ic3_redeem_student_stars/);
 assert.ok(rewards.indexOf('Danh sách điểm thưởng & sao học sinh')>rewards.indexOf('Lịch sử học sinh'));
});

test('summary is per student, filters class/name, and does not use mistaken Top 5 ranking',()=>{
 const students=[
  {id:'a',full_name:'Nguyễn Khoa Đăng',class_name:'6.1',status:'active'},
  {id:'b',full_name:'Vũ Thanh Ngân',class_name:'6.1',status:'active'},
  {id:'c',full_name:'Trần Gia Huy',class_name:'6.2',status:'active'},
  {id:'d',full_name:'Nguyễn Hồng Vân',class_name:'6.1',status:'inactive'}
 ];
 const wallets=[
  {student_id:'a',available:2,earned:6},
  {student_id:'b',available:4,earned:6},
  {student_id:'c',available:0,earned:2}
 ];
 const records=[
  {id:'1',student_id:'a',record_type:'point',points:8.5,created_at:'2026-11-19T07:00:00Z'},
  {id:'2',student_id:'a',record_type:'point',points:9,created_at:'2026-11-19T08:00:00Z'},
  {id:'3',student_id:'a',record_type:'reward',points:5,created_at:'2026-11-19T09:00:00Z'},
  {id:'4',student_id:'a',record_type:'reward',points:-2,created_at:'2026-11-19T10:00:00Z'},
  {id:'5',student_id:'a',record_type:'reward',points:0,star_event:'recovery',created_at:'2026-11-19T11:00:00Z'},
  {id:'6',student_id:'b',record_type:'point',points:7.5,created_at:'2026-11-19T10:00:00Z'},
  {id:'7',student_id:'c',record_type:'point',points:10,created_at:'2026-11-19T10:00:00Z'},
  {id:'8',student_id:'d',record_type:'reward',points:100,created_at:'2026-11-19T09:00:00Z'}
 ];
 const summary=rewardSummaryRows(students,wallets,records,'6.1');
 assert.deepEqual(summary.map(s=>s.id),['a','b'],'alphabetical by last name, not by wallet/earned');
 assert.equal(summary[0].learningPoints,17.5);
 assert.equal(summary[0].awardEvents,1,'do not count gift redemption/recovery as a star award');
 assert.equal(summary[0].earned,6,'wallet is the source of star balance, not recomputed from recent events');
 assert.equal(summary[0].available,2);
 assert.equal(summary[1].learningPoints,7.5);
 assert.deepEqual(rewardSummaryRows(students,wallets,records,'6.2').map(s=>s.id),['c']);
 assert.deepEqual(rewardSummaryRows(students,wallets,records,'','ngan').map(s=>s.id),['b']);
 assert.equal(rewardSummaryRows(students,wallets,records).length,3);
 const activity=recentRewardActivity(students,records,'6.1');
 assert.deepEqual(activity.map(r=>r.id),['4','6','3','2','1']);
 assert.deepEqual(recentRewardActivity(students,records,'6.2').map(r=>r.id),['7']);
 assert.equal(activity.some(r=>r.star_event==='recovery'||r.student_id==='d'),false);
});
