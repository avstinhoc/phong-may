import test from 'node:test';import assert from 'node:assert/strict';
import {REFERENCE_SCORE_KEYS,REFERENCE_SESSIONS_PER_SHEET,partitionAttendanceSessions,
 referenceAttendanceColumnForSession,referenceAttendanceStatus,referenceColumnMap} from '../src/lib/attendanceReferenceLayout.js';
test('reference Google Sheet 8A6 keeps A:I information and exactly B1–B70 at J:CA',()=>{
 const map=referenceColumnMap();
 assert.equal(map.studentCode,1);assert.equal(map.order,2);assert.equal(map.name,3);
 assert.equal(referenceAttendanceColumnForSession(0),10);
 assert.equal(referenceAttendanceColumnForSession(69),79);
 assert.equal(map.firstScore,80);assert.equal(map.exam,98);assert.equal(map.absentRate,102);
 assert.equal(REFERENCE_SESSIONS_PER_SHEET,70);
 assert.equal(REFERENCE_SCORE_KEYS.length,16);
});
test('large classes export every session in chronological 70-slot chunks without dropping lessons',()=>{
 const rows=Array.from({length:151},(_,i)=>({id:'s'+i,session_date:'2026-11-'+String((i%30)+1).padStart(2,'0'),start_time:'14:00'}));
 const chunks=partitionAttendanceSessions(rows);
 assert.deepEqual(chunks.map(c=>c.length),[70,70,11]);
 assert.equal(new Set(chunks.flat().map(s=>s.id)).size,151);
 assert.deepEqual(rows.map(x=>x.id),Array.from({length:151},(_,i)=>'s'+i));
});
test('absent, excused and late symbols are kept distinct',()=>{
 assert.deepEqual(['present','absent','excused','late'].map(referenceAttendanceStatus),['','VẮNG','CÓ PHÉP','TRỄ']);
});
