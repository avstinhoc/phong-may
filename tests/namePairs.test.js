import test from 'node:test';
import assert from 'node:assert/strict';
import {namePairs} from '../src/lib/namePairs.js';
test('review Vietnamese spelling variants within one class and respect suffixes',()=>{
 const base={school_id:'s',class_id:'c'};
 const rows=['Trần Ngọc Cảt Tiên','Trần Ngọc Cát Tiên','Trần Ngọc Cát Tiên 1','Trần Ngọc Cát Tiên A'].map((full_name,id)=>({...base,full_name,id}));
 assert.equal(namePairs([...rows,{...rows[0],class_id:'other'}]).length,1);
});
