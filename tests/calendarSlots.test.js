import test from 'node:test';
import assert from 'node:assert/strict';
import {slotGroups} from '../src/lib/calendarSlots.js';

test('same weekly time slot aligns across days and absent second lesson remains blank',()=>{
 const lessons=[
   {session_date:'2026-11-16',start_time:'14:00',end_time:'14:45',class_name:'7.7'},
   {session_date:'2026-11-16',start_time:'15:50',end_time:'16:35',class_name:'7.5'},
   {session_date:'2026-11-17',start_time:'14:50',end_time:'15:35',class_name:'7.1'}
 ];
 const shifts=slotGroups(lessons);
 assert.equal(shifts[0].label,'SÁNG');
 assert.deepEqual(shifts[1].slots.filter(s=>s.time).map(s=>s.time),['14:00','14:50','15:50']);
 assert.ok(!lessons.some(s=>s.session_date==='2026-11-16'&&s.start_time==='14:50'));
});
test('gap is kept if an entire intermediate slot has no lessons',()=>{
 const shifts=slotGroups([{start_time:'14:00'},{start_time:'15:50'}]);
 assert.equal(shifts[1].slots.filter(s=>s.gap).length,1);
 assert.equal(shifts[1].slots[1].time,undefined);
});
test('morning and afternoon remain visible without lessons',()=>{
 const shifts=slotGroups([]);
 assert.deepEqual(shifts.map(x=>x.label),['SÁNG','CHIỀU']);
 assert.equal(shifts[0].slots[0].empty,true);
});
test('different real clock times remain distinct without forcing same period',()=>{
 const shifts=slotGroups([{start_time:'07:30'},{start_time:'07:40'},{start_time:'14:10'}]);
 assert.deepEqual(shifts[0].slots.filter(x=>x.time).map(x=>x.time),['07:30','07:40']);
 assert.deepEqual(shifts[1].slots.filter(x=>x.time).map(x=>x.time),['14:10']);
});
