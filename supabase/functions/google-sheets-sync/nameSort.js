// Google Sheets uses a hidden temporary sort key so full student rows move
// together (PC IDs, 70 attendance checkboxes, grades and formulas stay attached).
// Column C is HỌ & TÊN; the last Vietnamese word is the primary A–Z key.
const fold=value=>String(value||'').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d')
 .toLowerCase().replace(/\s+/g,' ').trim();
export const studentNameSortKey=(name,rowIndex=0)=>{
 const words=fold(name).split(' ').filter(Boolean);
 if(!words.length)return '~~~~~'+String(rowIndex).padStart(4,'0');
 return 'qlpm:'+words.at(-1)+'|'+words.slice(0,-1).join(' ')+'|'+String(rowIndex).padStart(4,'0');
};
export const studentSheetSortPlan=(rawStudentRows=[],firstRow=8,lastRow=70)=>{
 const rows=Array.from({length:lastRow-firstRow+1},(_,i)=>{
   const sheetRow=firstRow+i;
   const name=String((rawStudentRows[i]||[])[2]||'').normalize('NFC').replace(/\s+/g,' ').trim();
   return {sheetRow,name,key:studentNameSortKey(name,sheetRow)};
 });
 const filled=rows.filter(r=>r.name);
 const names=new Set();
 for(const row of filled){
   const normalized=fold(row.name);
   if(names.has(normalized))return {safe:false,reason:'Trùng họ tên trên Google Sheets, cần xác minh trước khi sắp xếp.',rows,keys:[],needsSort:false};
   names.add(normalized);
 }
 const sorted=[...rows].sort((a,b)=>a.key.localeCompare(b.key,'en'));
 const needsSort=sorted.some((r,i)=>r.sheetRow!==firstRow+i);
 return {safe:true,rows,keys:rows.map(x=>[x.key]),needsSort,sorted};
};
