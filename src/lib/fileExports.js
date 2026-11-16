import * as XLSX from 'xlsx';

const utf8=s=>new TextEncoder().encode(s);
const xmlEscape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function crc32(bytes){
 let crc=0xffffffff;
 for(const byte of bytes){
   crc^=byte;
   for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^0xffffffff)>>>0;
}
function packUint(chunks){
 const len=chunks.reduce((n,a)=>n+a.length,0),result=new Uint8Array(len);let pos=0;
 for(const part of chunks){result.set(part,pos);pos+=part.length;}
 return result;
}
const u16=(view,offset,val)=>view.setUint16(offset,val,true);
const u32=(view,offset,val)=>view.setUint32(offset,val>>>0,true);
export function packZip(entries){
 const local=[],central=[];let offset=0;
 for(const [name,text] of entries){
   const filename=utf8(name),bytes=utf8(text),crc=crc32(bytes);
   const h=new Uint8Array(30+filename.length),view=new DataView(h.buffer);
   u32(view,0,0x04034b50);u16(view,4,20);u16(view,8,0);
   u32(view,14,crc);u32(view,18,bytes.length);u32(view,22,bytes.length);
   u16(view,26,filename.length);h.set(filename,30);
   local.push(h,bytes);
   const ch=new Uint8Array(46+filename.length),v=new DataView(ch.buffer);
   u32(v,0,0x02014b50);u16(v,4,20);u16(v,6,20);
   u32(v,16,crc);u32(v,20,bytes.length);u32(v,24,bytes.length);
   u16(v,28,filename.length);u32(v,42,offset);ch.set(filename,46);
   central.push(ch);
   offset+=h.length+bytes.length;
 }
 const centralBytes=packUint(central),end=new Uint8Array(22),v=new DataView(end.buffer);
 u32(v,0,0x06054b50);u16(v,8,entries.length);u16(v,10,entries.length);
 u32(v,12,centralBytes.length);u32(v,16,offset);
 return packUint([...local,centralBytes,end]);
}
export function makeDocx(text){
 const lines=String(text||'').split(/\r?\n/).slice(0,1800);
 const paras=lines.map(line=>{
   if(!line.trim())return '<w:p/>';
   return '<w:p><w:pPr><w:spacing w:after="110"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">'+xmlEscape(line)+'</w:t></w:r></w:p>';
 }).join('');
 const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
 paras+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';
 return packZip([
  ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?>'+
   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
   '<Default Extension="xml" ContentType="application/xml"/>'+
   '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?>'+
   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml',doc]
 ]);
}
const safeName=s=>String(s||'tai-lieu').replace(/[\\/:*?"<>|]/g,'-').slice(0,90).replace(/\.[^.]+$/,'');
export async function buildEditedFile(result,sourceFile){
 if(!result)throw new Error('Không có nội dung để tải.');
 const base=safeName(result.name);
 const format=result.format;
 if(format==='xlsx'){
   if(!sourceFile)throw new Error('Không còn tệp Excel gốc. Hãy gửi lại để chỉnh sửa.');
   const raw=await sourceFile.arrayBuffer();
   const wb=XLSX.read(new Uint8Array(raw),{type:'array',cellStyles:true});
   let applied=0;
   for(const edit of result.edits||[]){
     if(!wb.SheetNames.includes(edit.sheet))continue;
     const address=String(edit.cell||'').toUpperCase();
     if(!/^[A-Z]{1,3}[1-9]\d{0,6}$/.test(address))continue;
     const ws=wb.Sheets[edit.sheet];
     const existing=ws[address]||{};
     const text=String(edit.value??'');
     const numeric=/^-?\d{1,11}(?:\.\d+)?$/.test(text);
     const next={...existing,t:numeric?'n':'s',v:numeric?Number(text):text};
     delete next.f;delete next.w;delete next.h;
     ws[address]=next;
     const cell=XLSX.utils.decode_cell(address);
     if(!ws['!ref'])ws['!ref']=address;
     else{
       const range=XLSX.utils.decode_range(ws['!ref']);
       range.s.c=Math.min(range.s.c,cell.c);range.s.r=Math.min(range.s.r,cell.r);
       range.e.c=Math.max(range.e.c,cell.c);range.e.r=Math.max(range.e.r,cell.r);
       ws['!ref']=XLSX.utils.encode_range(range);
     }
     applied++;
   }
   if(!applied)throw new Error('Không có ô hợp lệ để sửa. Hãy mô tả rõ tên sheet và ô cần thay đổi.');
   return {name:base+'-da-sua.xlsx',blob:new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array',cellStyles:true})],
     {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),applied};
 }
 if(!result.content?.trim())throw new Error('AI chưa xuất nội dung đã sửa.');
 if(format==='docx')return {name:base+'-da-sua.docx',blob:new Blob([makeDocx(result.content)],
   {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})};
 if(format==='csv')return {name:base+'-da-sua.csv',blob:new Blob(['\ufeff'+result.content],{type:'text/csv;charset=utf-8'})};
 return {name:base+'-da-sua.txt',blob:new Blob([result.content],{type:'text/plain;charset=utf-8'})};
}
