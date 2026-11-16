import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeScoreKey,validateExtractedRows,studentNameKey} from '../src/lib/aiClassImport.js';

test('AI student name normalization preserves distinction but finds duplicates ignoring accents',()=>{
 assert.equal(studentNameKey('  Nguyễn  Văn   An  '),'nguyen van an');
 const result=validateExtractedRows('students',[
  {full_name:'Nguyễn Văn An',gender:'Nam'},
  {full_name:'Nguyen Van An',gender:'Male'},
  {full_name:'Lê Thị Mai',gender:'Nữ',student_code:'05'}
 ]);
 assert.equal(result.rows.length,2);
 assert.equal(result.rows[1].gender,'Nữ');
 assert.ok(result.warnings.some(x=>x.includes('bị lặp')));
});

test('AI score keys are mapped to the exact existing grade schema',()=>{
 assert.equal(normalizeScoreKey('TEST1'),'TEST 1');
 assert.equal(normalizeScoreKey('Mô phỏng lần 3'),'Mô phỏng lần 3');
 assert.equal(normalizeScoreKey('mô phỏng lần3'),'Mô phỏng lần 3');
 assert.equal(normalizeScoreKey('QT2'),'QT2');
 assert.equal(normalizeScoreKey('Điểm Toán'),null);
});

test('scores reject hallucinated numbers or keys and keep valid 0 to 10',()=>{
 const {rows,warnings}=validateExtractedRows('grades',[
  {full_name:'Bùi Văn Bảo',scores:{QT1:9.5,'TEST1':10,HK1:12,QT2:-1,'unknown':'6','TEST 2':'8,25'}}
 ]);
 assert.equal(rows.length,1);
 assert.deepEqual(rows[0].scores,{QT1:9.5,'TEST 1':10,'TEST 2':8.25});
 assert.equal(warnings.length,3);
});

test('empty spreadsheet cells are not silently converted to zero',()=>{
 const result=validateExtractedRows('grades',[{
   full_name:'Nguyễn Văn Hoa',scores:{QT1:'',QT2:null,HK1:0,HK2:'0'}
 }]);
 assert.deepEqual(result.rows[0].scores,{HK1:0,HK2:0});
 assert.equal(result.warnings.length,2);
});

test('cannot import an empty draft, a huge unreviewed batch, or unknown action',()=>{
 assert.throws(()=>validateExtractedRows('students',[]),/chưa nhận diện/);
 assert.throws(()=>validateExtractedRows('students',Array.from({length:121},(_,i)=>({full_name:'Nguyễn '+i}))),/quá nhiều/);
 assert.throws(()=>validateExtractedRows('suspend',[]),/không hỗ trợ/);
});
