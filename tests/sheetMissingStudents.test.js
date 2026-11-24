import test from 'node:test';
import assert from 'node:assert/strict';
import {canReconcileMissingRows,uniqueArchivedStudentRow} from '../supabase/functions/google-sheets-sync/nameSort.js';
test('sheet removal requires a populated known roster without identity conflicts',()=>{
 const students=[{id:'a'},{id:'b'}], names=new Map([['an',[students[0]]],['bao',[students[1]]]]);
 const check=(visible,mapped={a:8,b:9})=>canReconcileMissingRows(visible,names,mapped,students);
 assert.ok(check(['an']));
 for(const rows of [[],['an','an'],['an','new']])assert.equal(check(rows),false);
 assert.equal(check(['an'],{stale:8}),false);
});

test('soft-deleted pupil can safely recover one unique Sheet row after sort loses ID mapping',()=>{
 const retired=[{id:'deleted',full_name:'Nguyễn Thiện Nhân'}];
 const active=[{id:'active-a',full_name:'Nguyễn Thiện Nhân A'},
               {id:'active-b',full_name:'Nguyễn Thiện Nhân B'}];
 const names=['Nguyễn Thiện Nhân A','Nguyễn Thiện Nhân B','Nguyễn Thiện Nhân'];
 assert.equal(uniqueArchivedStudentRow(retired[0],names,active,retired,{},8),10);
 assert.equal(uniqueArchivedStudentRow(retired[0],names,active,retired,{other:10},8),null);
 assert.equal(uniqueArchivedStudentRow(retired[0],names,active,retired,[].reduce((a,v)=>a,{}),8),10);
 assert.equal(uniqueArchivedStudentRow(retired[0],[...names,'Nguyễn Thiện Nhân'],active,retired,{},8),null);
 assert.equal(uniqueArchivedStudentRow(retired[0],names,[...active,{id:'peer',full_name:'Nguyễn Thiện Nhân'}],retired,{},8),null);
 assert.equal(uniqueArchivedStudentRow(retired[0],names,active,[...retired,{id:'other',full_name:'Nguyễn Thiện Nhân'}],{},8),null);
});
