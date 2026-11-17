import test from 'node:test';
import assert from 'node:assert/strict';
import {filterCreatedSessions,sessionDateWindow,mondayOfSessionWeek,shiftSessionDay} from '../src/lib/sessionDateFilter.js';

const lessons=[
 {id:'a',session_date:'2026-11-16',start_time:'14:00',class_name:'6.3'},
 {id:'b',session_date:'2026-11-23',start_time:'14:00',class_name:'6.3'},
 {id:'c',session_date:'2026-11-17',start_time:'09:00',class_name:'6.1'},
 {id:'d',session_date:'2026-11-22',start_time:'15:00',class_name:'8.1'},
 {id:'e',session_date:'2026-11-15',start_time:'10:00',class_name:'7.1'},
 {id:'f',session_date:'2026-11-16',start_time:'08:00',class_name:'6.2'}
];
test('Monday–Sunday filter respects Sunday and following Monday',()=>{
 assert.deepEqual(sessionDateWindow('week','2026-11-18'),{start:'2026-11-16',end:'2026-11-22'});
 assert.deepEqual(filterCreatedSessions(lessons,'week','2026-11-18').map(x=>x.id),['d','c','f','a']);
 assert.deepEqual(filterCreatedSessions(lessons,'week','2026-11-23').map(x=>x.id),['b']);
});
test('single day filter includes all lessons at that day and none outside',()=>{
 assert.deepEqual(filterCreatedSessions(lessons,'day','2026-11-16').map(x=>x.id),['f','a']);
});
test('all mode preserves all data and sorts a copy, never mutating source',()=>{
 const snapshot=JSON.stringify(lessons);
 assert.equal(filterCreatedSessions(lessons,'all','').length,6);
 assert.equal(JSON.stringify(lessons),snapshot);
});
test('year boundaries, date navigation and invalid anchors are safe',()=>{
 assert.equal(mondayOfSessionWeek('2027-01-01'),'2026-12-28');
 assert.equal(shiftSessionDay('2026-12-30',7),'2027-01-06');
 assert.deepEqual(sessionDateWindow('week','2027-01-01'),{start:'2026-12-28',end:'2027-01-03'});
 assert.deepEqual(filterCreatedSessions(lessons,'day','invalid').length,6);
});
