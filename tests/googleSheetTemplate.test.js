import test from 'node:test';
import assert from 'node:assert/strict';
import {SHEETS_TEMPLATE,SHEETS_SCORES,parseSheetUrl,validateSheetTabName,sheetAbsentFlag,
 mapLessonsInOrder,validateLessonMapping,normalizeSheetName} from '../src/lib/googleSheetTemplate.js';
test('only legitimate native Google Sheet URLs are accepted',()=>{
 const id='1O2A_f-SV5C3vkKDidDdgIxwIW96xOycs1qWSPYs1xkc';
 assert.equal(parseSheetUrl('https://docs.google.com/spreadsheets/d/'+id+'/edit?gid=310210369'),id);
 assert.throws(()=>parseSheetUrl('https://example.com/spreadsheets/d/'+id+'/edit'));
 assert.throws(()=>parseSheetUrl('javascript:alert(1)'));
});
test('template column mapping and 70-slot checkbox semantics',()=>{
 assert.equal(SHEETS_TEMPLATE.firstSessionCol,10);assert.equal(SHEETS_TEMPLATE.lastSessionCol,79);
 assert.equal(SHEETS_TEMPLATE.scoreStartCol,80);assert.equal(SHEETS_TEMPLATE.computedStartCol,99);
 assert.equal(SHEETS_SCORES.length,16);
 assert.equal(sheetAbsentFlag(false),false);assert.equal(sheetAbsentFlag('FALSE'),false);
 assert.equal(sheetAbsentFlag('TRUE'),true);
});
test('lesson B1..B70 mapping stays deterministic and detects collisions',()=>{
 const sessions=[{id:'a',session_date:'2026-11-17',start_time:'14:00'},
 {id:'b',session_date:'2026-11-16',start_time:'14:00'}];
 assert.deepEqual(mapLessonsInOrder(sessions),{b:1,a:2});
 assert.deepEqual(validateLessonMapping({b:'1',a:2},['a','b']),{b:1,a:2});
 assert.throws(()=>validateLessonMapping({b:1,a:1},['a','b']));
 assert.throws(()=>validateLessonMapping({b:71},['b']));
});
test('class tab names and Vietnamese names are normalized safely',()=>{
 assert.equal(validateSheetTabName('6.1'),'6.1');
 assert.equal(normalizeSheetName('  Nguyễn  Văn   A'),'nguyễn văn a');
 assert.throws(()=>validateSheetTabName('bad/name'));
});
