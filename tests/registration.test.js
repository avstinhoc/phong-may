import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeComputerCode,shortCodePreview,validFullName} from '../src/lib/registration.js';

test('many ways to type one computer map to the same canonical PC',()=>{
 for(const entered of ['21','pc21','pc 21','PC021','PC 021','pc 0021']){
   assert.equal(normalizeComputerCode(entered),'PC21',entered);
 }
 for(const entered of ['01','PC01','pc 1','1']){
   assert.equal(normalizeComputerCode(entered),'PC1',entered);
 }
});
test('invalid computer numbers are rejected and blank is optional',()=>{
 assert.equal(normalizeComputerCode(''), '');
 for(const entered of ['PC0','PC501','PC1A','PC-2','a','12345']){
   assert.equal(normalizeComputerCode(entered),null,entered);
 }
});
test('short classroom code is based on school name and class',()=>{
 assert.equal(shortCodePreview('THCS Duy Tân','6.1'),'IC3-DUYTAN-6.1');
 assert.equal(shortCodePreview('THCS Châu Thành','4.2'),'IC3-CHAUTHANH-4.2');
 assert.equal(shortCodePreview('Tiểu học Nguyễn Viết Xuân','5A1'),'IC3-NGUYENVIETXUAN-5A1');
});
test('full names must contain at least two words and real letters',()=>{
 assert.equal(validFullName('Nguyễn Văn An'),true);
 assert.equal(validFullName('Bùi Gia Hào'),true);
 assert.equal(validFullName('PC21'),false);
 assert.equal(validFullName('A'),false);
 assert.equal(validFullName('Nguyễn 123'),false);
});
