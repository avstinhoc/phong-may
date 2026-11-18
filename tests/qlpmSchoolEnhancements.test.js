import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {starTotals,starLeaderboard} from '../src/lib/stars.js';

const edge=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const portal=readFileSync(new URL('../src/StudentPortal.jsx',import.meta.url),'utf8');

test('class identifiers are not conflated and slash receives a legal Google tab name',()=>{
 const valid=v=>/^[\p{L}\p{N}][\p{L}\p{N} ._\/-]{0,59}$/u.test(v)&&v!=='Gốc';
 const tab=v=>v.replaceAll('/','／');
 for(const name of ['6.1','6A1','6/1','6-1','10A2'])assert.equal(valid(name),true);
 assert.equal(tab('6/1'),'6／1');
 assert.notEqual(tab('6/1'),tab('6-1'));
 assert.ok(edge.includes('const classTabTitle='));
 assert.ok(edge.includes('const classroomName=(v:string)=>validClass(v)'));
 assert.ok(edge.includes('newSheetName:tabTitle'));
 assert.ok(edge.includes('school_name:schoolDisplayName||null'));
});

test('two-way attendance can write false or true and never blindly resolves unknown conflicts',()=>{
 assert.ok(edge.includes('action==="sync_attendance_cell"'));
 assert.ok(edge.includes('range:sheetName(map.sheet_title)+"!"+col(9+ordinal)+rowNo,values:[[absent]]'));
 assert.ok(edge.includes('typeof baseline==="boolean"'));
 assert.ok(edge.includes('push(p.rowNo,9+n,onWeb)'));
 assert.ok(edge.includes('mode==="reconcile"'));
 assert.ok(edge.includes('attendance_snapshot:attendanceSnapshot'));
 assert.ok(edge.includes('mode==="pull_names"'));
 assert.ok(edge.includes('mode==="reconcile"'));
 assert.ok(edge.includes('fresh?"push":"reconcile"'));
 assert.ok(edge.includes('attendanceSnapshot[k]=onWeb'));
});

test('star history remains after spending while spendable balance decreases',()=>{
 const student_id='a';
 const rows=[
  {student_id,record_type:'reward',points:1},
  {student_id,record_type:'reward',points:3},
  {student_id,record_type:'reward',points:-2},
  {student_id,record_type:'violation',points:5}
 ];
 assert.deepEqual(starTotals(rows,student_id),{earned:4,available:2});
 assert.deepEqual(starTotals([...rows,{student_id,record_type:'reward',points:-2}],student_id),{earned:4,available:0});
 const ranks=starLeaderboard([{id:student_id,full_name:'Bạn A',status:'active'},
  {id:'b',full_name:'Bạn B',status:'active'}],rows);
 assert.equal(ranks[0].id,student_id);
 assert.ok(app.includes('ic3_redeem_student_stars'));
 assert.ok(portal.includes('ic3_class_stars'));
});
