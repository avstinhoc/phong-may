import test from 'node:test';
import assert from 'node:assert/strict';
import {canReconcileMissingRows} from '../supabase/functions/google-sheets-sync/nameSort.js';
test('sheet removal requires a populated known roster without identity conflicts',()=>{
 const students=[{id:'a'},{id:'b'}], names=new Map([['an',[students[0]]],['bao',[students[1]]]]);
 const check=(visible,mapped={a:8,b:9})=>canReconcileMissingRows(visible,names,mapped,students);
 assert.ok(check(['an']));
 for(const rows of [[],['an','an'],['an','new']])assert.equal(check(rows),false);
 assert.equal(check(['an'],{stale:8}),false);
});
