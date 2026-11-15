import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTimetable} from '../src/lib/ocr.js';
const word=(text,x,y)=>({text,bbox:{x0:x-10,x1:x+10,y0:y-5,y1:y+5}});
test('OCR maps weekday columns, ignores empty cells and preserves uncertain names for review',()=>{
 const words=[word('THUHAI',200,20),word('THUBA',300,20),word('14:00',40,60),word('14:45',100,60),word('6.3',200,60),word('63',300,60),word('15:00',40,100)];
 const result=parseTimetable({blocks:[{paragraphs:[{lines:[{words}]}]}]},'2026-11-16','School');
 assert.equal(result.rows.length,2);assert.equal(result.rows[0].session_date,'2026-11-16');assert.equal(result.rows[1].session_date,'2026-11-17');assert.equal(result.rows[1].class_name,'63');assert(result.warnings.some(w=>w.includes('mất dấu chấm')));
 assert.equal(parseTimetable({text:'random'},'2026-11-16','School').rows.length,0);
});

import {properName,comparePC,searchName} from '../src/lib/students.js';
test('Vietnamese student names and numeric PC ordering',()=>{assert.equal(properName('  nGUYỄN   thẢo NGUYÊN '),'Nguyễn Thảo Nguyên');assert.deepEqual(['PC10','PC2','PC1','PC40'].sort(comparePC),['PC1','PC2','PC10','PC40']);assert.equal(searchName('Đặng'),'dang');});
