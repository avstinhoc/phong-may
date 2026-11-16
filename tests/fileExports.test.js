import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {makeDocx,buildEditedFile} from '../src/lib/fileExports.js';

test('Word export emits a valid ZIP container with escaped Vietnamese text',()=>{
 const bytes=makeDocx('Trường THCS Duy Tân\nHọc sinh: A & B <C>');
 const data=Buffer.from(bytes);
 assert.equal(data.readUInt32LE(0),0x04034b50);
 assert.equal(data.readUInt32LE(data.length-22),0x06054b50);
 assert.ok(data.includes(Buffer.from('word/document.xml')));
 assert.ok(data.includes(Buffer.from('A &amp; B &lt;C&gt;')));
});
test('Excel patch edits one cell and keeps other sheets',async()=>{
 const wb=XLSX.utils.book_new();
 const one=XLSX.utils.aoa_to_sheet([['Lớp','Tên'],['6.1','Cũ']]);
 const two=XLSX.utils.aoa_to_sheet([['Giáo viên'],['Phương']]);
 XLSX.utils.book_append_sheet(wb,one,'Dữ liệu');
 XLSX.utils.book_append_sheet(wb,two,'Thông tin');
 const initial=XLSX.write(wb,{bookType:'xlsx',type:'array'});
 const result=await buildEditedFile({
   name:'Lop.xlsx',format:'xlsx',edits:[{sheet:'Dữ liệu',cell:'B2',value:'Mới'}]
 },{arrayBuffer:async()=>initial.buffer.slice(initial.byteOffset,initial.byteOffset+initial.byteLength)});
 const output=XLSX.read(new Uint8Array(await result.blob.arrayBuffer()),{type:'array'});
 assert.equal(output.Sheets['Dữ liệu'].B2.v,'Mới');
 assert.equal(output.Sheets['Thông tin'].A2.v,'Phương');
 assert.equal(result.applied,1);
});
test('CSV export includes UTF-8 BOM for Excel Vietnamese',async()=>{
 const exported=await buildEditedFile({name:'diem.csv',format:'csv',content:'Họ tên,Điểm\nAn,9'});
 assert.match(await exported.blob.text(),/^\ufeffHọ tên/);
});
