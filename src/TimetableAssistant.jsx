import React,{useEffect,useMemo,useState} from 'react';
import * as XLSX from 'xlsx';
import {supabase} from './lib/supabase';
import {readLocalTimetable} from './lib/ocr';
import {validateRows} from './lib/timetable';
import {vnToday,mondayOf,addDays,planIntent} from './lib/weekPlanner';
import {Sparkles,FileUp,CalendarDays} from 'lucide-react';

const fmt=d=>d.toLocaleDateString('en-CA');
const startOfMonth=()=>mondayOf(vnToday());
const endOfMonth=()=>addDays(mondayOf(vnToday()),27);
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const mimeOf=file=>{
 if(/\.pdf$/i.test(file.name))return 'application/pdf';
 if(/\.jpe?g$/i.test(file.name))return 'image/jpeg';
 if(/\.png$/i.test(file.name))return 'image/png';
 if(/\.webp$/i.test(file.name))return 'image/webp';
 return file.type||'';
};
const textFile=file=>/\.(csv|tsv|txt)$/i.test(file.name)||['text/csv','text/plain'].includes(file.type);
const excelFile=file=>/\.(xls|xlsx)$/i.test(file.name);
const imageFile=file=>/^image\/(jpeg|png|webp)$/.test(mimeOf(file));
const binaryFile=file=>imageFile(file)||mimeOf(file)==='application/pdf';
const toBase64=file=>new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(',')[1]);fr.onerror=reject;fr.readAsDataURL(file);});
function firstMonday(s){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+6)%7);return fmt(d);}
function repeatRange(rows,start,end){
 const out=[];for(const r of validateRows(rows)){
  if(r.session_date<start||r.session_date>end)throw new Error('Có dòng nằm ngoài phạm vi ngày chọn. Hãy chỉnh lại.');
  let d=new Date(r.session_date+'T12:00:00Z');
  for(let i=0;i<18;i++){
   const date=d.toISOString().slice(0,10);
   if(date>end)break;
   if(date>=start)out.push({...r,session_date:date});
   d.setUTCDate(d.getUTCDate()+7);
  }
 }
 if(out.length>500)throw new Error('Vượt quá 500 buổi. Hãy thu hẹp khoảng ngày.');
 return validateRows(out);
}

export function TimetableImport({profile,reload,onImported,embedded=false,adminView=false,targetTeacherId=null,targetTeacherName=''}){
 const [file,setFile]=useState(null),[preview,setPreview]=useState('');
 const [startDate,setStartDate]=useState(startOfMonth);
 const [endDate,setEndDate]=useState(endOfMonth);
 const [rows,setRows]=useState([]),[warnings,setWarnings]=useState([]),[messages,setMessages]=useState([]);
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[repeat,setRepeat]=useState(false),[replaceOld,setReplaceOld]=useState(false);
 const [ocrMode,setOcrMode]=useState('gemini'),[localText,setLocalText]=useState('');
 const [notice,setNotice]=useState('Chọn tệp hoặc nhập yêu cầu cho AI. Lịch tạo ra chỉ được lưu sau khi bạn xác nhận.');
 const [noticeKind,setNoticeKind]=useState('info');
 const [closed,setClosed]=useState(!embedded);
 const count=useMemo(()=>{try{return repeat?repeatRange(rows,startDate,endDate).length:rows.length;}catch{return rows.length;}},[rows,startDate,endDate,repeat]);
 useEffect(()=>{
  if(!file||!imageFile(file)){setPreview('');return;}
  const u=URL.createObjectURL(file);setPreview(u);return()=>URL.revokeObjectURL(u);
 },[file]);
 function validateRange(){
  if(!validDate(startDate)||!validDate(endDate)||startDate>endDate||
   (Date.parse(endDate)-Date.parse(startDate))/86400000>120)
   throw new Error('Chọn từ ngày – đến ngày hợp lệ (tối đa 121 ngày). Không cần là thứ Hai.');
 }
 async function fromFile(){
  if(!file)throw new Error('Hãy chọn tệp trước.');
  const mime=mimeOf(file);
  if(!binaryFile(file)&&!textFile(file)&&!excelFile(file))
   throw new Error('Hỗ trợ ảnh JPG/PNG/WebP, PDF, Excel XLS/XLSX, CSV hoặc TXT.');
  if(file.size>2500000)throw new Error('Tệp vượt 2,5 MB. Hãy giảm dung lượng hoặc chia tệp nhỏ hơn.');
  if(binaryFile(file))return{attachment:{mimeType:mime,base64:await toBase64(file)}};
  if(textFile(file))return{fileText:(await file.text()).slice(0,57000)};
  const data=new Uint8Array(await file.arrayBuffer()),book=XLSX.read(data,{type:'array'});
  const chunks=book.SheetNames.slice(0,5).map(name=>'SHEET '+name+'\n'+XLSX.utils.sheet_to_csv(book.Sheets[name],{blankrows:false}));
  return{fileText:chunks.join('\n\n').slice(0,57000)};
 }
 async function callAI(action,instruction=''){
  validateRange();
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error('Phiên đăng nhập đã hết hạn.');
  const payload={action,startDate,endDate,schoolName:profile.school_name,
    instruction,rows,messages:messages.slice(-10),teacherName:adminView?(targetTeacherName||profile.full_name):profile.full_name};
  if(file)
    Object.assign(payload,await fromFile());
  const response=await fetch('/api/timetable',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(payload)});
  const result=await response.json().catch(()=>({error:'Máy chủ đọc lịch chưa phản hồi dữ liệu JSON.'}));
  if(!response.ok)throw new Error(result.error||'Không xử lý được lịch bằng Gemini.');
  return result;
 }
 function resultToDraft(result,verb){
  const proposed=Array.isArray(result.rows)?result.rows:[];
  const warnings=Array.isArray(result.warnings)?result.warnings:[];
  // Questions and clarification replies must not erase the teacher's existing draft.
  if(result.replace_draft===true && proposed.length>0){
    setRows(proposed);
    setRepeat(Boolean(result.repeat_weekly));
  }
  setWarnings(warnings);
  const answer=(result.reply||result.summary||'').trim() ||
    (proposed.length?verb+' · đã chuẩn bị '+proposed.length+' buổi để bạn kiểm tra.':'Chưa xác định được buổi cần chọn. Bạn có thể nói rõ ngày, lớp hoặc tiết.');
  setNotice(answer+(result.fallback_used?' Đã dùng model Gemini dự phòng.':''));setNoticeKind(warnings.length?'warning':'success');
  setMessages(msg=>[...msg,{role:'assistant',text:answer+(warnings.length?'\nLưu ý: '+warnings.join('; '):'')}].slice(-12));
 }
 async function read(){
  setBusy(true);setNotice('Đang đọc tệp và kiểm tra từng ô thời khóa biểu…');setNoticeKind('info');setWarnings([]);
  try{
   validateRange();
   if(!file)throw new Error('Chọn tệp thời khóa biểu trước.');
   if(ocrMode==='local'){
    if(!imageFile(file))throw new Error('Đọc trên máy chỉ hỗ trợ ảnh. PDF/Excel/CSV/TXT cần Gemini.');
    const result=await readLocalTimetable(file,firstMonday(startDate),profile.school_name,setNotice);
    const initial=result.rows.map(r=>{
      let date=r.session_date;
      for(let i=0;i<18&&date<startDate;i++){
        const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+7);
        date=d.toISOString().slice(0,10);
      }
      return {...r,session_date:date};
    }).filter(r=>r.session_date>=startDate&&r.session_date<=endDate);
    if(initial.length)setRows(initial);setWarnings(result.warnings||[]);setLocalText(result.text||'');
    setNotice('Đã nhận diện '+initial.length+' buổi. Kiểm tra và chỉnh sửa trước khi lưu.');setNoticeKind('success');
   }else{
    resultToDraft(await callAI('extract'),'Đọc tệp');
   }
  }catch(e){setNotice(e.message);setNoticeKind('error');}finally{setBusy(false);}
 }
 async function chat(e){
  e.preventDefault();if(!text.trim())return;
  const question=text.trim();setText('');setBusy(true);
  setMessages(msg=>[...msg,{role:'user',text:question}].slice(-12));
  try{
   const answer=await callAI('chat',question);
   resultToDraft(answer,'AI đã đề xuất');
   if(answer.replace_draft&&answer.rows?.length&&planIntent(question).replace)setReplaceOld(true);
  }catch(e){setMessages(msg=>[...msg,{role:'assistant',text:'Không xử lý được: '+e.message}].slice(-12));setNotice(e.message);setNoticeKind('error');}
  finally{setBusy(false);}
 }
 async function save(){
  setBusy(true);
  try{
   validateRange();
   const validated=repeat?repeatRange(rows,startDate,endDate):validateRows(rows);
   if(validated.some(r=>r.session_date<startDate||r.session_date>endDate))
    throw new Error('Có ngày không thuộc khoảng đã chọn.');
   if(validated.some(r=>r.school_name!==profile.school_name))
    throw new Error('Một số dòng mang tên trường khác. Hãy chuyển sang trường đó ở menu bên trái hoặc sửa tên trường trong bảng trước khi lưu.');
   if(adminView&&(!targetTeacherId||targetTeacherId==='unassigned'))
     throw new Error('Admin cần chọn đúng giáo viên trước khi nhập lịch.');
   if(replaceOld&&warnings.length)throw new Error('Ảnh/tệp có cảnh báo chưa đọc rõ. Không được xóa lịch cũ khi bản nháp còn thiếu ô.');
   if(replaceOld&&(!window.confirm('THAY THẾ TOÀN BỘ lịch của bạn tại '+profile.school_name+
      ' từ '+startDate+' đến '+endDate+'?\nĐiểm danh buổi cũ sẽ mất vĩnh viễn và lịch mới sẽ ghi vào.')||
      window.prompt('Nhập THAY THẾ để xác nhận:')!=='THAY THẾ'))return;
   const {data,error}=replaceOld?
     await supabase.rpc('ic3_replace_own_timetable',{p_school_id:profile.school_id,
       p_start_date:startDate,p_end_date:endDate,p_items:validated}):
     adminView?
     await supabase.rpc('ic3_admin_import_teacher_timetable',{
       p_school_id:profile.school_id,p_teacher_id:targetTeacherId,p_items:validated
     }):
     await supabase.rpc('import_timetable',{items:validated});
   if(error)throw error;
   if(!adminView)await onImported?.(validated[0].session_date,validated[0].school_name);
   setRows([]);setReplaceOld(false);
   setNotice((replaceOld?'Đã thay thế '+(data.deleted||0)+' buổi cũ. ':'')+
     'Đã lưu '+data.created+' buổi; bỏ qua '+data.skipped+' buổi trùng lịch.');
   setNoticeKind('success');reload();
  }catch(e){setNotice(e.message);setNoticeKind('error');}finally{setBusy(false);}
 }
 const change=(i,k,v)=>setRows(x=>x.map((r,j)=>i===j?{...r,[k]:v}:r));
 const add=()=>setRows(x=>[...x,{school_name:profile.school_name,class_name:'',session_date:startDate,start_time:'',end_time:'',period_count:1}]);
 return <section className={'timetable-assistant '+(embedded?'timetable-import-embedded':'panel')}>
  {!embedded&&<button type="button" className="timetable-toggle" onClick={()=>setClosed(c=>!c)} aria-expanded={!closed}>{closed?'▸':'▾'} Nhập lịch từ ảnh, file hoặc chat AI</button>}
  {(!closed||embedded)&&<>
   <div className="timetable-upload-intro">
     <div><strong>Nhập lịch từ tệp hoặc trò chuyện AI</strong>
      <p>Đọc ảnh, PDF, Excel, CSV hoặc TXT; xem bản nháp và kiểm tra giờ từng trường trước khi lưu.</p></div>
     <span>{adminView?'Giáo viên: '+targetTeacherName:'Lịch của bạn'}</span>
   </div>
   <p className="muted">Bước 1: Chọn ảnh/file và khoảng ngày (mặc định 4 tuần tính từ thứ Hai tuần này). Bước 2: Đọc và kiểm tra kỹ từng ô lịch. Bước 3: Chọn lưu thêm hay thay lịch cũ, rồi xác nhận.</p>
   <div className="import-controls">
    <label>Tệp thời khóa biểu<input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.xlsx,.xls,.csv,.tsv,.txt,image/*,application/pdf" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setWarnings([]);setLocalText('');}}/></label>
    <label>Từ ngày<input type="date" value={startDate} disabled={busy} onChange={e=>setStartDate(e.target.value)}/></label>
    <label>Đến ngày<input type="date" value={endDate} disabled={busy} min={startDate} onChange={e=>setEndDate(e.target.value)}/></label>
   </div>
   {preview&&<img className="import-image-preview" src={preview} alt="Ảnh thời khóa biểu đã chọn"/>}
   {file&&!preview&&<p className="muted">Tệp: <b>{file.name}</b> ({(file.size/1024).toFixed(0)} KB)</p>}
   <div className="import-action-row">
    <label>Đọc bằng<select disabled={busy} value={ocrMode} onChange={e=>setOcrMode(e.target.value)}><option value="gemini">Google Gemini (mặc định)</option><option value="local">Trên thiết bị (chỉ ảnh)</option></select></label>
    <button type="button" className="btn primary" disabled={busy||!file} onClick={read}>{busy?'Đang xử lý…':'Đọc tệp'}</button>
   </div>
   <p className="timetable-privacy-note">Khi bấm <b>Đọc tệp</b> hoặc <b>Gửi AI</b> ở chế độ Gemini, nội dung bạn chọn được gửi tới Google Gemini để phân tích; AI không tự lưu lịch.</p>
   <div className="timetable-chat">
    <h3>Trợ lý AI chỉnh lịch dạy</h3>
    <p className="muted">Bạn cứ nhập yêu cầu trực tiếp. AI có thể đọc lịch của giáo viên khác để chọn những buổi bạn dạy thay; không tự lưu lịch.</p>
    <div className="chat-history" aria-live="polite">{messages.length?messages.map((m,i)=><div key={i} className={'chat-bubble '+(m.role==='user'?'me':'ai')}><b>{m.role==='user'?'Bạn':'Gemini'}</b><p>{m.text}</p></div>):<p className="muted">Nhập yêu cầu hoặc tải tệp để AI hỗ trợ chỉnh lịch.</p>}</div>
    <form onSubmit={chat} className="chat-form"><textarea aria-label="Yêu cầu AI chỉnh lịch" rows={2} placeholder="Nhập yêu cầu cho AI…" value={text} onChange={e=>setText(e.target.value)} disabled={busy}/><button className="btn primary" type="submit" disabled={busy||!text.trim()}>Gửi AI</button></form>
   </div>
   <div className="notice-box" role="status" aria-live="polite">{notice}</div>
   {warnings.map((w,i)=><p className="muted" key={i}>{w}</p>)}
   {localText&&<details><summary>Xem văn bản OCR</summary><pre style={{whiteSpace:'pre-wrap'}}>{localText}</pre></details>}
   <div className="table-wrap"><table className="import-edit-table"><thead><tr><th>Trường</th><th>Lớp</th><th>Ngày</th><th>Giờ bắt đầu</th><th>Kết thúc</th><th>Số tiết</th><th></th></tr></thead>
    <tbody>{rows.map((r,i)=><tr key={i}>{[['school_name','text'],['class_name','text'],['session_date','date'],['start_time','time'],['end_time','time'],['period_count','number']].map(([name,type])=><td key={name}><input disabled={busy} type={type} value={r[name]??''} aria-label={name+' dòng '+(i+1)} min={type==='number'?1:undefined} onChange={e=>change(i,name,e.target.value)}/></td>)}
      <td><button className="mini-btn" disabled={busy} onClick={()=>setRows(x=>x.filter((_,j)=>i!==j))}>Bỏ</button></td>
     </tr>)}</tbody></table></div>
   <div className="import-footer">
    <button type="button" className="btn outline" onClick={add} disabled={busy||rows.length>=120}>Thêm buổi thủ công</button>
    {!!rows.length&&<><label className="field-inline"><input type="checkbox" checked={repeat} disabled={busy} onChange={e=>setRepeat(e.target.checked)}/> Lặp hằng tuần đến ngày kết thúc</label>
      <label className="field-inline"><input type="checkbox" checked={replaceOld} disabled={busy||adminView} onChange={e=>setReplaceOld(e.target.checked)}/> Thay lịch cũ trong khoảng ngày chọn (xóa lịch cũ)</label>
      <span className="muted">Dự kiến {count} buổi</span>
      <button className="btn primary" disabled={busy} onClick={save}>{replaceOld?'Xác nhận thay lịch cũ':'Xác nhận lưu lịch'}</button></>}
   </div>
  </>}
 </section>;
}
