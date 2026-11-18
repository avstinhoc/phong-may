import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const classSettings=readFileSync(new URL('../src/ClassSettings.jsx',import.meta.url),'utf8');
const sheetTabLabel=v=>{
 const s=String(v||'').trim().replaceAll('／','/');
 return /^\d{1,2}(?:[A-Za-z]\d{1,3}|[.\/-]\d{1,3})$/.test(s)?s:null;
};
test('common school class names are imported from Sheets without merging distinct classes',()=>{
 const input=['6A1','6A5','6-1','6.1','6／1','10A2'];
 assert.deepEqual(input.map(sheetTabLabel),['6A1','6A5','6-1','6.1','6/1','10A2']);
 assert.notEqual(sheetTabLabel('6-1'),sheetTabLabel('6／1'));
 assert.deepEqual(['Gốc','Báo cáo','Mẫu','6 lớp 1'].map(sheetTabLabel),[null,null,null,null]);
 assert.ok(edge.includes('classFromSheetTab(t.title)'));
 assert.ok(edge.includes('if(label)seen.add(label)'));
});
test('the Web class create action immediately calls a scoped, verified automatic tab sync',()=>{
 assert.ok(classSettings.includes("supabase.rpc('ic3_create_class'"));
 assert.ok(classSettings.includes("action:'auto_sync_class',link_id:link.id,class_name:data.class_name"));
 assert.ok(classSettings.includes("link.status==='verified'&&link.auto_sync"));
 assert.ok(edge.includes('if(action==="auto_sync_class")'));
 assert.ok(edge.includes('.eq("school_id",link.school_id).eq("class_name",className)'));
 assert.ok(edge.includes('syncSchool(db,link,token,ownerId,0,className)'));
 assert.ok(edge.includes('if(result.errors.length)throw fail('));
});
