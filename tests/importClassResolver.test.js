import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveImportClass} from '../src/lib/importClassResolver.js';

const classes=[
 {id:'a',class_name:'6.1'},
 {id:'b',class_name:'6.2'},
 {id:'c',class_name:'7A'}
];
test('recognizes Danh-sach-6.1.xlsx without a preselected class',()=>{
 const r=resolveImportClass(classes,{fileName:'Danh-sach-6.1.xlsx',question:'hãy nhập danh sách học sinh 6.1 từ file này'});
 assert.equal(r.classroom?.id,'a');
});
test('uses model-extracted class when the filename is generic',()=>{
 assert.equal(resolveImportClass(classes,{detectedClass:'Lớp 6.2',fileName:'danhsach.xlsx'}).classroom?.id,'b');
});
test('rejects mismatches, including file name versus extracted sheet class',()=>{
 const r=resolveImportClass(classes,{detectedClass:'6.2',fileName:'Danh-sach-6.1.xlsx'});
 assert.equal(r.classroom,null);
 assert.match(r.error,/chưa thống nhất/);
});
test('rejects unknown classes, ambiguous source or missing evidence',()=>{
 assert.equal(resolveImportClass(classes,{detectedClass:'9.1'}).classroom,null);
 assert.equal(resolveImportClass(classes,{fileName:'danh-sach.xlsx'}).classroom,null);
 assert.equal(resolveImportClass(classes,{question:'nhập danh sách lớp 6.1 và 6.2'}).classroom,null);
});
test('does not match 6.1 inside 6.10 or teacher-owned class in another school',()=>{
 assert.equal(resolveImportClass(classes,{fileName:'Danh-sach-6.10.xlsx'}).classroom,null);
 assert.equal(resolveImportClass([{id:'z',class_name:'8.1'}],{fileName:'Danh-sach-6.1.xlsx'}).classroom,null);
});
