import {inflateRawSync} from 'node:zlib';
const unescapeXml=text=>text.replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n)=>{
 const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);
 return v>0&&v<=0x10ffff?String.fromCodePoint(v):' ';
}).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
 .replace(/&quot;/g,'"').replace(/&apos;/g,"'");
export function officeText(base64,mime){
 const zip=Buffer.from(base64,'base64');
 if(zip.length<22||zip.length>2700000||zip.readUInt32LE(0)!==0x04034b50)
  throw new Error('Tệp Office không hợp lệ hoặc quá lớn.');
 let pos=0,out='',found=0;
 while(pos+46<=zip.length){
   if(zip.readUInt32LE(pos)!==0x02014b50){pos++;continue;}
   const method=zip.readUInt16LE(pos+10),compressed=zip.readUInt32LE(pos+20),rawSize=zip.readUInt32LE(pos+24);
   const nameLen=zip.readUInt16LE(pos+28),extraLen=zip.readUInt16LE(pos+30),commentLen=zip.readUInt16LE(pos+32);
   const local=zip.readUInt32LE(pos+42),name=zip.toString('utf8',pos+46,pos+46+nameLen);
   pos+=46+nameLen+extraLen+commentLen;
   const wanted=mime.includes('wordprocessingml')?/^word\/(document|header\d+|footer\d+)\.xml$/.test(name):
     /^ppt\/slides\/slide\d+\.xml$/.test(name);
   if(!wanted||rawSize>2000000||compressed>2600000||local+30>zip.length||zip.readUInt32LE(local)!==0x04034b50)continue;
   const offset=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28);
   if(offset+compressed>zip.length)continue;
   let xml;
   try{
     const bytes=zip.subarray(offset,offset+compressed);
     xml=method===8?inflateRawSync(bytes,{maxOutputLength:2000000}).toString('utf8'):method===0?bytes.toString('utf8'):'';
   }catch{continue;}
   out+=unescapeXml(xml.replace(/<\/(?:w:p|a:p|w:tr|a:tr)>/g,'\n')
     .replace(/<w:tab\s*\/>/g,'\t').replace(/<[^>]*>/g,' '))
     .replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim()+'\n';
   if(++found>=32||out.length>=55000)break;
 }
 if(!out.trim())throw new Error('Không trích xuất được chữ từ tài liệu này. Hãy dùng TXT hoặc PDF dễ đọc.');
 return out.slice(0,55000);
}
