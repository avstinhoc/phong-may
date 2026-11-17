import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const declaration=source.match(/const classroomName=\(v:string\)=>(\/\^[^\n]*?\$\/)\.test\(v\)/);

test('real Edge Function class matcher accepts Vietnamese school class labels',()=>{
 assert.ok(declaration,'classroomName RegExp must be extractable from source');
 const expression=declaration[1];
 const pattern=new RegExp(expression.slice(1,-1));
 for(const valid of ['6.1','6.2','6.7','7.1','8.2','9.10','10.12'])assert.ok(pattern.test(valid),'missed class '+valid);
 for(const invalid of ['B1','6A','\u0036\\.1','6-1','7.','Sinh vien',''])assert.equal(pattern.test(invalid),false,'accepted '+invalid);
});

test('do not record school-level successful sync after failed class updates',()=>{
 assert.ok(source.includes('if(classNames.length && errors.length===0)'));
 assert.ok(source.includes('nextOffset:offset+3<allClasses.length?offset+3:null'));
});
