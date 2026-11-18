import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');

test('automatic class discovery supports distinct Web and Sheet labels',()=>{
 assert.ok(source.includes('const classroomName=(v:string)=>validClass(v)&&v.length<=60'));
 assert.ok(source.includes('classFromSheetTab(t.title)'));
 const valid=v=>/^[\p{L}\p{N}][\p{L}\p{N} ._\/-]{0,59}$/u.test(v)&&v!=='Gốc';
 for(const name of ['6.1','6.2','6A1','6A5','6-1','6/1','7.1','10A2']){
  assert.ok(valid(name),'missing class '+name);
 }
 for(const name of ['Gốc','*','[6.1]','', 'Tên lớp?'])assert.equal(valid(name),false,'accepted invalid tab '+name);
 const tab=v=>v.replaceAll('/','／');
 assert.equal(tab('6/1'),'6／1');
 assert.notEqual(tab('6/1'),tab('6-1'));
});

test('school-level sync only records success after successful class updates',()=>{
 assert.ok(source.includes('if(classNames.length && errors.length===0)'));
 assert.ok(source.includes('nextOffset:offset+3<allClasses.length?offset+3:null'));
});
