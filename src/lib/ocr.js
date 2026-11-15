// Reconstruct a weekday/time matrix using OCR word coordinates, never guessed times.
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const center = w => ({x:(w.bbox.x0+w.bbox.x1)/2,y:(w.bbox.y0+w.bbox.y1)/2});
function layout(data) {
 const words=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[]))).filter(w=>w.text?.trim());
 const days=[];const names={HAI:0,BA:1,TU:2,NAM:3,SAU:4,BAY:5,'2':0,'3':1,'4':2,'5':3,'6':4,'7':5};
 for(const w of words){
  const t=norm(w.text).replace(/[^A-Z0-9]/g,'');
  const joined=t.startsWith('THU')?t.slice(3):'';
  if(Object.hasOwn(names,joined)){days.push({index:names[joined],...center(w)});continue;}
  if(!Object.hasOwn(names,t))continue;
  const c=center(w), h=w.bbox.y1-w.bbox.y0;
  const thu=words.find(v=>norm(v.text).replace(/[^A-Z]/g,'')==='THU' && Math.abs(center(v).y-c.y)<h && v.bbox.x1<=w.bbox.x0+3 && w.bbox.x0-v.bbox.x1<h*4);
  if(thu)days.push({index:names[t],x:(thu.bbox.x0+w.bbox.x1)/2,y:c.y});
 }
 const unique=[...new Map(days.map(d=>[d.index,d])).values()].sort((a,b)=>a.x-b.x);
 return {words,unique};
}
export function parseTimetable(data,weekStart,schoolName) {
 const {words,unique}=layout(data);
 const warnings=['OCR có thể đọc nhầm tên lớp và giờ. Đối chiếu từng dòng với ảnh trước khi lưu.'];
 if(unique.length<2)return {rows:[],text:data.text||'',warnings:[...warnings,'Không xác định được các cột Thứ Hai, Thứ Ba… Hãy dùng ảnh rõ, chụp thẳng bảng; bạn vẫn có thể nhập theo văn bản đọc được.']};
 const gap=Math.min(...unique.slice(1).map((d,i)=>d.x-unique[i].x));
 const timeWords=words.map(w=>({...w,match:w.text.match(/^(\d{1,2})[:h.\-](\d{2})$/i)})).filter(w=>w.match && +w.match[1]<24 && +w.match[2]<60 && center(w).x<unique[0].x-gap/2 && center(w).y>unique[0].y);
 const lines=[];
 for(const w of timeWords){const pos=center(w);let line=lines.find(l=>Math.abs(l.y-pos.y)<Math.max(8,w.bbox.y1-w.bbox.y0));if(!line){line={y:pos.y,times:[]};lines.push(line);}line.times.push(w);}
 lines.sort((a,b)=>a.y-b.y);
 const rows=[];
 for(const line of lines){
  line.times.sort((a,b)=>center(a).x-center(b).x);
  if(line.times.length!==2)continue;
  const fmt=w=>`${w.match[1].padStart(2,'0')}:${w.match[2]}`;
  const start=fmt(line.times[0]),end=fmt(line.times[1]);if(end<=start)continue;
  const tolerance=Math.max(8,...line.times.map(w=>w.bbox.y1-w.bbox.y0));
  for(const day of unique){
   const cell=words.filter(w=>Math.abs(center(w).y-line.y)<tolerance && Math.abs(center(w).x-day.x)<gap*.45).sort((a,b)=>a.bbox.x0-b.bbox.x0);
   const name=cell.map(w=>w.text).join(' ').replace(/[|]/g,'').trim();
   if(!name || !/^\d{1,2}(?:[.\-A-Za-z]\s*\d{0,3}[A-Za-z]?|\d{0,2})$/.test(name))continue;
   const date=new Date(weekStart+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+day.index);
   if(/^\d+$/.test(name))warnings.push(`Tên lớp “${name}” có thể mất dấu chấm. Kiểm tra lại với ảnh.`);
   rows.push({school_name:schoolName,class_name:name,session_date:date.toISOString().slice(0,10),start_time:start,end_time:end,period_count:1});
  }
 }
 if(!rows.length)warnings.push('Chưa ghép được lớp với giờ học. Tham khảo văn bản OCR bên dưới và thêm dòng thủ công.');
 return {rows,text:data.text||'',warnings};
}
// Re-read individual cells without grid lines: small punctuation is easily lost in a whole-table pass.
export async function refineCells(data,worker,source,onProgress) {
 const {words,unique}=layout(data);if(unique.length<2)return data;
 const gap=Math.min(...unique.slice(1).map((d,i)=>d.x-unique[i].x));
 const candidates=words.filter(w=>center(w).x<unique[0].x-gap/2 && center(w).y>unique[0].y && /^[0-9:.,h-]{3,5}$/.test(w.text));
 const lines=[];
 for(const w of candidates){const c=center(w);let l=lines.find(l=>Math.abs(l.y-c.y)<Math.max(8,w.bbox.y1-w.bbox.y0));if(!l){l={y:c.y,words:[]};lines.push(l);}l.words.push(w);}
 const valid=lines.filter(l=>l.words.length===2).sort((a,b)=>a.y-b.y);if(!valid.length)return data;
 const refined=words.filter(w=>center(w).y<unique[0].y+20);
 await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789.:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-'});
 for(let i=0;i<valid.length;i++){
  const l=valid[i], near=Math.min(...valid.filter(v=>v!==l).map(v=>Math.abs(v.y-l.y)));
  const half=Number.isFinite(near)?near*.38:Math.max(...l.words.map(w=>w.bbox.y1-w.bbox.y0))*.65;
  l.words.sort((a,b)=>center(a).x-center(b).x);
  const columns=[...l.words.map(w=>({x:center(w).x,width:Math.max(60,w.bbox.x1-w.bbox.x0+24)})),...unique.map(d=>({x:d.x,width:gap*.75}))];
  for(const col of columns){
   const rectangle={left:Math.max(0,Math.round(col.x-col.width/2)),top:Math.max(0,Math.round(l.y-half)),width:Math.round(col.width),height:Math.max(16,Math.round(half*2))};
   const result=await worker.recognize(source,{rectangle},{text:true});const text=result.data.text.trim();
   if(text)refined.push({text,bbox:{x0:col.x-20,x1:col.x+20,y0:l.y-8,y1:l.y+8}});
  }
  onProgress?.(`Đang đọc từng ô ${i+1}/${valid.length}…`);
 }
 return {text:data.text,blocks:[{paragraphs:[{lines:[{words:refined}]}]}]};
}
export function cleanGrid(image) {
 const {width:w,height:h,data}=image, ink=new Uint8Array(w*h), remove=new Uint8Array(w*h);
 for(let i=0;i<ink.length;i++)ink[i]=(data[i*4]+data[i*4+1]+data[i*4+2])/3<170?1:0;
 for(let y=0;y<h;y++){let start=-1;for(let x=0;x<=w;x++){
  if(x<w&&ink[y*w+x]){if(start<0)start=x;}
  else if(start>=0){if(x-start>w*.15)for(let yy=Math.max(0,y-1);yy<Math.min(h,y+2);yy++)remove.fill(1,yy*w+start,yy*w+x);start=-1;}
 }}
 for(let x=0;x<w;x++){let start=-1;for(let y=0;y<=h;y++){
  if(y<h&&ink[y*w+x]){if(start<0)start=y;}
  else if(start>=0){if(y-start>h*.15)for(let yy=start;yy<y;yy++)for(let xx=Math.max(0,x-1);xx<Math.min(w,x+2);xx++)remove[yy*w+xx]=1;start=-1;}
 }}
 for(let i=0;i<ink.length;i++){const v=ink[i]&&!remove[i]?0:255;data[i*4]=data[i*4+1]=data[i*4+2]=v;data[i*4+3]=255;}
 return image;
}
export async function readLocalTimetable(file,week,school,onProgress) {
 const {createWorker}=await import('tesseract.js');
 const worker=await createWorker('eng',1,{logger:m=>onProgress?.(m.status==='recognizing text'?`Đang nhận diện ${Math.round(m.progress*100)}%…`:'Đang tải bộ đọc ảnh lần đầu…')});
 try {
  const bitmap=await createImageBitmap(file);
  const canvas=document.createElement('canvas');const scale=Math.min(3,2400/bitmap.width);
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const original=document.createElement('canvas');original.width=canvas.width;original.height=canvas.height;original.getContext('2d').drawImage(canvas,0,0);
  ctx.putImageData(cleanGrid(ctx.getImageData(0,0,canvas.width,canvas.height)),0,0);
  await worker.setParameters({tessedit_pageseg_mode:'11'});
  const {data}=await worker.recognize(canvas,{}, {blocks:true,text:true});
  const refined=await refineCells(data,worker,original,onProgress);
  return parseTimetable(refined,week,school);
 } finally {await worker.terminate();}
}
