import test from 'node:test';
import assert from 'node:assert/strict';
import {schoolNameKey,groupSchoolNames,schoolsForWorkplace,sessionsForWorkplace} from '../src/lib/workplaceReports.js';
const schools=[
 {id:'a',name:'THCS Duy Tân'},
 {id:'b',name:'THCS DUY TAN'},
 {id:'c',name:' THCS Duy Tân '},
 {id:'d',name:'THCS Vũng Tàu'},
 {id:'e',name:'THCS Nguyễn Du'}
];
const links=[
 {workplace_id:'avs',school_id:'a'},
 {workplace_id:'avs',school_id:'b'},
 {workplace_id:'avs',school_id:'c'},
 {workplace_id:'avs',school_id:'d'},
 {workplace_id:'other',school_id:'e'}
];
test('schools with accent/case/space variants appear once but keep every ID',()=>{
 const groups=groupSchoolNames(schoolsForWorkplace('avs',schools,links));
 assert.equal(groups.length,2);
 assert.deepEqual(groups.find(g=>g.key===schoolNameKey('THCS Duy Tân')).ids,['a','b','c']);
 assert.equal(groups.find(g=>g.name==='THCS Vũng Tàu').ids.length,1);
});
test('grouping never changes or removes original independent school records',()=>{
 const snapshot=JSON.stringify(schools);
 groupSchoolNames(schools);assert.equal(JSON.stringify(schools),snapshot);
});
test('center report includes all linked duplicate IDs, excludes unrelated schools and teachers',()=>{
 const sessions=[
  {id:'1',school_id:'a',teacher_id:'t1',session_date:'2026-11-01'},
  {id:'2',school_id:'b',teacher_id:'t1',session_date:'2026-11-02'},
  {id:'3',school_id:'c',teacher_id:'t1',session_date:'2026-11-03'},
  {id:'4',school_id:'d',teacher_id:'t1',session_date:'2026-11-04'},
  {id:'5',school_id:'e',teacher_id:'t1',session_date:'2026-11-04'},
  {id:'6',school_id:'a',teacher_id:'t2',session_date:'2026-11-04'},
  {id:'7',school_id:'a',teacher_id:'t1',session_date:'2026-10-30'}
 ];
 const out=sessionsForWorkplace({workplaceId:'avs',links,sessions,teacherId:'t1',from:'2026-11-01',to:'2026-11-30',
  schoolById:Object.fromEntries(schools.map(s=>[s.id,s.name]))});
 assert.deepEqual(out.map(s=>s.id),['1','2','3','4']);
 assert.equal(out[0].school_name,'THCS Duy Tân');
 assert.equal(sessions.length,7);
});
test('workplace without linked schools produces no report rows',()=>{
 assert.deepEqual(sessionsForWorkplace({workplaceId:'empty',links,sessions:[{school_id:'a',teacher_id:'t1',session_date:'2026-11-01'}],teacherId:'t1',from:'2026-11-01',to:'2026-11-30'}),[]);
});
