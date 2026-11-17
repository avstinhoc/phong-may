import React,{useEffect,useMemo,useRef,useState} from 'react';
import * as XLSX from 'xlsx';
import {MessageCircle,Send,X,BookOpen,ChevronDown,ArrowUpRight,RotateCcw,Paperclip,FileText,CalendarDays,CheckCircle2,Plus} from 'lucide-react';
import {supabase} from './lib/supabase';
import {helpQuestions,visibleHelpTopics,helpPageTitles} from './lib/helpKnowledge';
import {AIClassImportDraft} from './AIClassImportDraft';

const allowedExt=/\.(png|jpe?g|webp|pdf|xlsx?|csv|tsv|txt|docx|pptx)$/i;
const fileMime=file=>{
 const ext=file.name.split('.').at(-1).toLowerCase();
 return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'})[ext]||file.type;
};
const toBase64=file=>new Promise((resolve,reject)=>{
 const reader=new FileReader();
 reader.onload=()=>resolve(String(reader.result).split(',')[1]);
 reader.onerror=()=>reject(new Error('Không đọc được tệp. Bạn thử chọn lại nhé.'));
 reader.readAsDataURL(file);
});
async function prepareAttachment(file){
 if(!file)return null;
 if(file.size>2.5*1024*1024)throw new Error('Tệp vượt 2,5 MB. Hãy nén hoặc chia nhỏ tệp.');
 if(!allowedExt.test(file.name))throw new Error('Hỗ trợ JPG, PNG, WebP, PDF, Excel, DOCX, PPTX, CSV và TXT.');
 const ext=file.name.split('.').at(-1).toLowerCase();
 if(['txt','csv','tsv'].includes(ext))return {name:file.name,text:(await file.text()).slice(0,55000)};
 if(['xls','xlsx'].includes(ext)){
   const workbook=XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:'array'});
   return {name:file.name,text:workbook.SheetNames.slice(0,4).map(sheet=>
     'Sheet: '+sheet+'\n'+XLSX.utils.sheet_to_csv(workbook.Sheets[sheet],{blankrows:false})
   ).join('\n\n').slice(0,55000)};
 }
 return {name:file.name,mimeType:fileMime(file),base64:await toBase64(file)};
}
const normalize=s=>String(s||'').replace(/[đĐ]/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const aliases={
 attendance:['lich day giao vien','thoi khoa bieu','tao buoi hoc','sua buoi hoc','luu lich hoc','doc tep','nhap lich','them lich'],
 rollcall:['diem danh hoc sinh','diem danh','co mat','vang hoc'],
 roster:['danh sach hoc sinh','ho so hoc sinh'],
 students:['dang ky duyet','duyet hoc sinh','them hoc sinh','dang ky truc tuyen'],
 computers:['phong may','gan hoc sinh','gan may','may tinh','pc'],
 cleaning:['ve sinh may','lich ve sinh'],
 records:['diem loi thuong','diem thuong','ghi nhan vi pham'],
 evaluation:['danh gia hoc sinh'],
 schools:['truong cong tac','them truong','sua truong','xoa truong','thay logo'],
 settings:['lop ma dang ky','ma dang ky','tao lop','mo trang lop'],
 finance:['cham cong tien cong','cham cong','luong giao vien'],
 reports:['bao cao','xuat pdf','xuat excel','bang ke nop trung tam'],
 accounts:['quan ly tai khoan','duyet giao vien','khoa tai khoan'],
 dashboard:['tong quan']
};
function targetFor(label,topics,pageId){
 const key=normalize(label);
 if(!key)return null;
 const allowed=new Set(topics.map(t=>t.id));
 const byTitle=topics.find(t=>normalize(t.title)===key);
 if(byTitle)return byTitle.id;
 for(const [id,arr] of Object.entries(aliases))
   if(allowed.has(id)&&arr.some(a=>key===a||key.includes(a)))return id;
 if(allowed.has(pageId)&&key.length>5&&/^(luu|sua|them|xem|mo|nhap|chon|xoa)/.test(key))return pageId;
 return null;
}
function RichText({value,topics,pageId,onGo}){
 return <>{String(value||'').split(/(\*\*[^*\n]+\*\*)/g).map((chunk,i)=>{
  if(chunk.startsWith('**')&&chunk.endsWith('**')){
   const txt=chunk.slice(2,-2),target=targetFor(txt,topics,pageId);
   return target?<button key={i} type="button" className="help-rich-link" onClick={()=>onGo(target)} title={'Mở '+helpPageTitles[target]}><strong>{txt}</strong></button>:<strong key={i}>{txt}</strong>;
  }
  return <React.Fragment key={i}>{chunk}</React.Fragment>;
 })}</>;
}
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const isClock=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const mins=s=>Number(s.slice(0,2))*60+Number(s.slice(3,5));
const detectMode=(question,attached)=>{
 const q=normalize(question);
 if(/^(cach|huong dan|lam sao|cho toi biet|hoi|tai sao|vi sao)\b/.test(q))return 'chat';
 if(/(doi|sua|chinh sua|cap nhat|dat lai|thay).{0,18}ten.{0,14}(giao vien|tai khoan)/.test(q))return 'account';
 const importing=/(nhap|them|tao|cap nhat|doc|dua|lap|ghi|cham|xu ly)/.test(q);
 const scoreText=/(bang diem|nhap diem|cap nhat diem|them diem|cham diem|diem so|cot diem)/.test(q);
 const studentText=/(danh sach hoc sinh|danh sach hs|nhap hoc sinh|them hoc sinh|them ds hoc sinh|nhap danh sach|nhap ds hoc sinh)/.test(q);
 const filename=normalize(attached?.name);
 if(importing&&scoreText)return 'grades';
 if(importing&&studentText)return 'students';
 if(attached&&!q&&/(bang diem|diem so|scores)/.test(filename))return 'grades';
 if(attached&&!q&&/(danh sach|hoc sinh|students)/.test(filename))return 'students';
 const schedule=/(lich|thoi khoa bieu|tkb|tiet day|buoi hoc)/.test(q);
 const action=/(them|tao|sua|doi|chinh|nhap|doc|lap|xep|cap nhat|thay the|thay lich|ghi de|xoa lich cu|ap dung|dua len|thay moi|thay vao|day thay|tinh tu|bat dau tu|tu thu|dan vao|sao chep)/.test(q);
 if(schedule&&action)return 'schedule';
 if(attached&&schedule)return 'schedule';
 return 'chat';
};

export function HelpAssistant({profile,page,onNavigate,onSaved,scheduleTeacher=null}){
 const [open,setOpen]=useState(false),[tab,setTab]=useState('chat'),[mode,setMode]=useState('chat');
 const [text,setText]=useState(''),[file,setFile]=useState(null);
 const [imageUrl,setImageUrl]=useState('');
 const [messages,setMessages]=useState([]),[pending,setPending]=useState(false),[saving,setSaving]=useState(false);
 const [query,setQuery]=useState(''),[expanded,setExpanded]=useState(page||'dashboard');
 const [draft,setDraft]=useState(null),[classDraft,setClassDraft]=useState(null),[lightbox,setLightbox]=useState(null);
 const [showAllDraft,setShowAllDraft]=useState(false),[partialAck,setPartialAck]=useState(false);
 const previousScheduleFile=useRef(null);
 const fileInput=useRef(null),chatEnd=useRef(null),inputRef=useRef(null),urls=useRef(new Set());
 const topics=useMemo(()=>visibleHelpTopics(profile.role),[profile.role]);
 useEffect(()=>{
   if(!file||!/^image\//.test(fileMime(file))){setImageUrl('');return;}
   const url=URL.createObjectURL(file);setImageUrl(url);
   return()=>URL.revokeObjectURL(url);
 },[file]);
 useEffect(()=>()=>{for(const u of urls.current)URL.revokeObjectURL(u);urls.current.clear();},[]);
 const suggestions=useMemo(()=>{
   const current=helpQuestions.filter(x=>x.page===page);
   return [...current,...helpQuestions.filter(x=>x.page!==page)].slice(0,4);
 },[page]);
 const listed=useMemo(()=>{
   const q=normalize(query);
   return q?topics.filter(t=>normalize([t.title,t.summary,...t.keywords,...t.steps].join(' ')).includes(q)):topics;
 },[query,topics]);
 useEffect(()=>{if(open){inputRef.current?.focus();chatEnd.current?.scrollIntoView({block:'end',behavior:'smooth'});}},[open,tab,messages.length,pending,draft]);
 useEffect(()=>{
   if(!open)return;
   const onKey=e=>{if(e.key==='Escape'){if(lightbox)setLightbox(null);else setOpen(false);}};
   document.addEventListener('keydown',onKey);
   return()=>document.removeEventListener('keydown',onKey);
 },[open,lightbox]);
 function go(id){
   if(!topics.some(t=>t.id===id)||!helpPageTitles[id])return;
   onNavigate(id);setOpen(false);
 }
 function clearFile(){
   setFile(null);if(fileInput.current)fileInput.current.value='';
 }
 function newChat(){
   for(const u of urls.current)URL.revokeObjectURL(u);
   urls.current.clear();previousScheduleFile.current=null;setMessages([]);setDraft(null);setClassDraft(null);clearFile();setText('');setMode('chat');setLightbox(null);
 }
 const updateDraft=(i,key,value)=>setDraft(prev=>prev?{...prev,items:prev.items.map((r,j)=>i===j?{...r,[key]:value}:r)}:null);
 async function saveDraft(){
   if(!draft?.items?.length||saving)return;
   if(!profile.school_id||profile.school_id!==draft.schoolId){
     setMessages(m=>[...m,{role:'system',text:'Bạn đã đổi trường. Quay lại đúng trường của bản nháp rồi lưu.'}]);return;
   }
   if(draft.teacherId!==profile.id){
     setMessages(m=>[...m,{role:'system',text:'Chức năng chỉ cho phép sửa lịch của tài khoản đang đăng nhập.'}]);return;
   }
   if(draft.warnings?.length&&!partialAck){
     setMessages(m=>[...m,{role:'system',text:'Bản nháp có những ô chưa chắc chắn. Hãy kiểm tra và xác nhận đã rà soát cảnh báo trước khi lưu.'}]);return;
   }
   for(const row of draft.items){
     if(!String(row.class_name||'').trim()||!isDate(row.session_date)||
        !isClock(row.start_time)||!isClock(row.end_time)||
        mins(row.start_time)>=mins(row.end_time)||!Number.isInteger(Number(row.period_count))||
        Number(row.period_count)<1||Number(row.period_count)>20){
       setMessages(m=>[...m,{role:'system',text:'Bản nháp thiếu lớp, ngày, giờ hoặc số tiết. Chỉnh từng ô trước khi lưu.'}]);return;
     }
   }
   const overlaps=new Set();
   for(let i=0;i<draft.items.length;i++)for(let j=i+1;j<draft.items.length;j++){
     const a=draft.items[i],b=draft.items[j];
     if(a.session_date===b.session_date&&a.start_time<b.end_time&&a.end_time>b.start_time)
       overlaps.add(a.session_date+' '+a.start_time+' / '+b.start_time);
   }
   if(overlaps.size){
     setMessages(m=>[...m,{role:'system',text:'Bản nháp bị chồng giờ cùng ngày: '+[...overlaps].slice(0,4).join(', ')+'. Hãy sửa trước khi lưu.'}]);return;
   }
   const replacing=Boolean(draft.replaceScope);
   if(replacing&&(draft.items.some(x=>x.operation!=='create')||draft.warnings?.length)){
     setMessages(m=>[...m,{role:'system',text:'Không thể thay lịch cũ khi còn đề xuất sửa buổi riêng lẻ hoặc cảnh báo chưa rõ.'}]);return;
   }
   if(replacing){
     const ok=window.confirm('THAY THẾ TOÀN BỘ lịch dạy cá nhân tại '+draft.schoolName+
       ' từ '+draft.replaceScope.start+' đến '+draft.replaceScope.end+'?\n\n'+
       'Lịch cũ trong khoảng này và dữ liệu điểm danh của các buổi bị xóa sẽ MẤT VĨNH VIỄN. '+draft.items.length+' buổi mới sẽ được tạo.');
     if(!ok||window.prompt('Nhập THAY THẾ để xác nhận xóa lịch cũ và ghi lịch mới:')!=='THAY THẾ')return;
   }else if(!window.confirm('Lưu '+draft.items.length+' buổi dạy đã kiểm tra tại '+draft.schoolName+'?'))return;
   setSaving(true);
   let saved=0,deleted=0,failures=[];
   try{
     const items=draft.items.map(r=>({class_name:r.class_name.trim(),session_date:r.session_date,
       start_time:r.start_time,end_time:r.end_time,period_count:Number(r.period_count),
       school_name:draft.schoolName}));
     if(replacing){
       const {data,error}=await supabase.rpc('ic3_replace_own_timetable',{
         p_school_id:draft.schoolId,p_start_date:draft.replaceScope.start,
         p_end_date:draft.replaceScope.end,p_items:items});
       if(error)throw error;
       saved=data?.created||0;deleted=data?.deleted||0;
     }else if(draft.items.every(r=>r.operation==='create')){
       const {data,error}=await supabase.rpc('import_timetable',{items});
       if(error)throw error;
       saved=data?.created||0;
     }else{
       for(const row of draft.items){
         const payload={class_name:row.class_name.trim(),session_date:row.session_date,
           start_time:row.start_time,end_time:row.end_time,period_count:Number(row.period_count)};
         try{
           if(row.operation==='edit'){
             if(!row.target_id||!row.original)throw Error('Không xác định được lịch cần sửa.');
             const original=row.original;
             const {data,error}=await supabase.from('class_sessions').update(payload)
               .eq('id',row.target_id).eq('school_id',draft.schoolId)
               .eq('session_date',original.session_date).eq('start_time',original.start_time)
               .eq('end_time',original.end_time).eq('class_name',original.class_name).select('id');
             if(error)throw error;
             if(!data?.length)throw Error('Lịch gốc đã thay đổi hoặc không đủ quyền.');
           }else{
             const {error}=await supabase.from('class_sessions').insert({...payload,
               school_id:draft.schoolId,teacher_id:profile.id,
               teacher_name:profile.full_name||'',created_by:profile.id});
             if(error)throw error;
           }
           saved++;
         }catch(e){failures.push(row.class_name+' '+row.session_date+': '+e.message);}
       }
     }
     setMessages(m=>[...m,{role:'assistant',text:
       '**Đã lưu '+saved+' buổi học.** '+(deleted?'Đã thay thế '+deleted+' buổi cũ trong khoảng chọn. ':'')+
       (failures.length?'Có '+failures.length+' buổi chưa lưu.':'Lịch đã đồng bộ theo tài khoản của bạn.')}]);
     if(saved||deleted)onSaved?.();
     if(!failures.length)setDraft(null);
     else setDraft(prev=>prev?{...prev,items:prev.items.filter(r=>failures.some(f=>f.startsWith(r.class_name+' '+r.session_date+':')))}:null);
   }catch(e){
     setMessages(m=>[...m,{role:'system',text:'Không thể lưu lịch: '+(e?.message||'Vui lòng thử lại.')+' Dữ liệu cũ không bị thay thế nếu giao dịch thất bại.'}]);
   }finally{setSaving(false);}
 }
 async function ask(question){
   const message=String(question||'').trim();
   if((!message&&!file)||pending||saving)return;
   if(message.length>1300){setMessages(m=>[...m,{role:'system',text:'Câu hỏi vượt quá 1.300 ký tự. Bạn rút gọn giúp tui nha.'}]);return;}
   const attachedForIntent=file||previousScheduleFile.current;
   const actualMode=detectMode(message,attachedForIntent);
   if(actualMode==='account'&&profile.role!=='admin'){
     setMessages(m=>[...m,{role:'system',text:'Chỉ tài khoản Admin mới được đổi tên giáo viên. Bạn có thể hỏi AI cách gửi yêu cầu cho Admin.'}]);return;
   }
   if(actualMode==='file'&&!file){
     setMessages(m=>[...m,{role:'system',text:'Hãy đính kèm tệp cần sửa trước khi gửi.'}]);return;
   }
   if(['schedule','students','grades'].includes(actualMode)&&!profile.school_id){
     setMessages(m=>[...m,{role:'system',text:'Hãy chọn trường ở menu bên trái trước khi AI nhập dữ liệu.'}]);return;
   }
   if(actualMode==='image'&&file&&!/^image\/(jpeg|png|webp)$/.test(fileMime(file))){
     setMessages(m=>[...m,{role:'system',text:'Để chỉnh sửa hình ảnh, vui lòng chọn ảnh JPG, PNG hoặc WebP.'}]);return;
   }
   const reuseOld=actualMode==='schedule'&&!file&&previousScheduleFile.current&&
      /(nay|do|anh|tep|file|lich moi|vua gui|tuan nay|thay the)/.test(normalize(message));
   const attachedFile=file||(reuseOld?previousScheduleFile.current:null);
   // Keep the last user-provided file only in this chat so a later explicit
   // reference to "ảnh/lịch này" can be analyzed without asking to re-upload.
   if(file)previousScheduleFile.current=file;
   const userText=message||(actualMode==='schedule'
     ?'Đọc thời khóa biểu trong ảnh hoặc tệp này và tạo bản nháp lịch dạy đúng lớp, thứ, giờ.'
     :actualMode==='students'?'Đọc danh sách học sinh trong tệp, xác định lớp từ tên file và tạo bản nháp để tôi xác nhận.'
     :actualMode==='grades'?'Đọc bảng điểm trong tệp, xác định lớp và đối chiếu học sinh trước khi lập bản nháp.'
     :'Hãy đọc tệp đính kèm và hướng dẫn thao tác trong IC3 GS6.');
   const history=messages.filter(m=>['user','assistant'].includes(m.role)).slice(-8).map(m=>({role:m.role,text:m.text}));
   let img=null;
   if(attachedFile&&/^image\/(jpeg|png|webp)$/.test(fileMime(attachedFile))){
     img=URL.createObjectURL(attachedFile);urls.current.add(img);
   }
   setText('');
   setMessages(m=>[...m,{role:'user',text:userText,mode:actualMode,attachmentName:attachedFile?.name||null,attachmentImage:img}].slice(-30));
   setPending(true);
   try{
     const {data:{session}}=await supabase.auth.getSession();
     if(!session?.access_token)throw new Error('Phiên đăng nhập hết hạn. Hãy đăng nhập lại.');
     const attachment=await prepareAttachment(attachedFile);
     const isClassImport=['students','grades'].includes(actualMode);
     const endpoint=isClassImport?'/api/ai-import':actualMode==='chat'?'/api/help':'/api/help-actions';
     const body=isClassImport?
       {question:userText,kind:actualMode,schoolId:profile.school_id,attachment}:
       actualMode==='chat'?{question:userText,page,history,attachment}:
       {question:userText,mode:actualMode,schoolId:profile.school_id,
         teacherId:profile.id,attachment};
     const response=await fetch(endpoint,{
       method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
       body:JSON.stringify(body)
     });
     const result=await response.json().catch(()=>({error:'Máy chủ chưa trả về dữ liệu hợp lệ.'}));
     if(!response.ok)throw new Error(result.error||'Trợ lý chưa xử lý được yêu cầu.');
     const suggestedPage=topics.some(t=>t.id===result.page_id)&&helpPageTitles[result.page_id]?result.page_id:null;
     const image=result.image?.base64&&/^image\/(png|jpeg|webp)$/.test(result.image.mimeType||'')?
       'data:'+result.image.mimeType+';base64,'+result.image.base64:null;
     setMessages(m=>[...m,{role:'assistant',text:result.answer||'Đã xử lý yêu cầu.',page_id:suggestedPage,image,
       editedFile:result.editedFile||null,originalFile:actualMode==='file'?attachedFile:null,
       accountProposal:result.accountProposal||null}].slice(-30));
     if(isClassImport){
       if(result.classId&&Array.isArray(result.rows)&&result.rows.length){
         setClassDraft({
           kind:actualMode,classId:result.classId,className:result.className,
           schoolId:profile.school_id,schoolName:result.schoolName||profile.school_name,
           rows:result.rows,warnings:result.warnings||[],
           observed_count:result.observed_count||0
         });
       }else{
         setClassDraft(null);
       }
     }
     if(actualMode==='schedule'&&result.proposals?.length){
       setDraft({items:result.proposals,schoolId:profile.school_id,
         schoolName:result.proposals[0]?.school_name||profile.school_name,
         teacherId:result.teacher_id||profile.id,teacherName:result.teacher_name||profile.full_name,
         replaceScope:result.replace_scope||null,
         rangeStart:result.range_start||null,rangeEnd:result.range_end||null,
         warnings:result.warnings||[]});
       setShowAllDraft(false);setPartialAck(false);
     }
     if(result.warnings?.length)setMessages(m=>[...m,{role:'system',text:result.warnings.join('\n')}].slice(-30));
     clearFile();
   }catch(e){setMessages(m=>[...m,{role:'system',text:e?.message||'Không thể kết nối AI.'}].slice(-30));}
   finally{setPending(false);setMode('chat');}
 }
 async function applyAccountRename(msg,index){
   const r=msg.accountProposal;
   if(profile.role!=='admin'||!r?.id||pending||saving)return;
   if(!window.confirm('Xác nhận đổi tên giáo viên:\n'+r.email+'\n'+r.old_name+' → '+r.new_name+'?\n\nChỉ đổi họ tên, không thay quyền tài khoản.'))return;
   setSaving(true);
   try{
     const {data:current,error:readError}=await supabase.from('profiles')
       .select('id,email,full_name,role,is_active').eq('id',r.id).single();
     if(readError)throw readError;
     if(!current||current.email!==r.email||current.full_name!==r.old_name||current.role!==r.role||
       current.is_active!==r.is_active)throw Error('Tài khoản đã thay đổi. Hãy hỏi lại AI để tạo bản nháp mới.');
     const {error}=await supabase.rpc('admin_update_account',{
       target_id:r.id,new_role:current.role,active:current.is_active,display_name:r.new_name
     });
     if(error)throw error;
     setMessages(m=>m.map((entry,i)=>i===index?{...entry,accountProposal:null}:entry).concat([
       {role:'assistant',text:'**Đã đổi tên giáo viên** từ '+r.old_name+' thành '+r.new_name+'.'}
     ]).slice(-30));
     onSaved?.();
   }catch(e){setMessages(m=>[...m,{role:'system',text:'Không thể đổi tên: '+(e?.message||'Vui lòng thử lại.')}].slice(-30));}
   finally{setSaving(false);}
 }
 return <div className={'help-dock '+(open?'help-open':'')}>
   {!open&&<button className="help-launch" onClick={()=>setOpen(true)} aria-label="Mở Trợ lý IC3 AI" title="Hỏi IC3 AI"><MessageCircle size={21}/><span>Hỏi AI</span></button>}
   {open&&<section className="help-panel" role="dialog" aria-modal="false" aria-label="Trợ lý IC3 AI">
     <header className="help-header">
       <div className="help-avatar">AI</div>
       <div className="help-head-copy"><strong>Trợ lý IC3 AI</strong><span>Hỏi đáp · Thêm và sửa lịch dạy</span></div>
       <button className="help-icon-button" type="button" aria-label="Đóng trợ lý" title="Đóng" onClick={()=>setOpen(false)}><X size={19}/></button>
     </header>
     <div className="help-tabs" role="tablist" aria-label="Chế độ trợ lý">
       <button role="tab" aria-selected={tab==='chat'} className={tab==='chat'?'selected':''} onClick={()=>setTab('chat')}><MessageCircle size={15}/> Trò chuyện</button>
       <button role="tab" aria-selected={tab==='guide'} className={tab==='guide'?'selected':''} onClick={()=>setTab('guide')}><BookOpen size={15}/> Hướng dẫn nhanh</button>
     </div>
     {tab==='chat'?<>
       <div className="help-chat-scroll" role="log" aria-live="polite" aria-relevant="additions text">
         <div className="help-welcome"><strong>Chào bạn! Tui là Trợ lý IC3 AI 👋</strong>
           <p>Hỏi cách sử dụng IC3 GS6 hoặc nhờ AI thêm, chỉnh lịch dạy. Có thể gửi ảnh thời khóa biểu, PDF hoặc Excel để AI đọc. Bạn kiểm tra bản nháp trước khi lưu.</p>
           <span>Đang xem: {helpPageTitles[page]||'IC3 GS6'}</span>
         </div>
         {!messages.length&&<div className="help-suggestions">
           {suggestions.map(item=><button type="button" key={item.title} onClick={()=>ask(item.question)} disabled={pending}>{item.title}</button>)}
         </div>}
         {messages.map((msg,i)=><div key={i} className={'help-message '+(msg.role==='user'?'mine':msg.role==='system'?'error':'theirs')}>
           {msg.role==='assistant'&&<span className="help-speaker">Trợ lý IC3 AI</span>}
           {msg.attachmentImage&&<button type="button" className="help-image-button" onClick={()=>setLightbox(msg.attachmentImage)} title="Xem ảnh đã gửi">
             <img className="help-chat-image" src={msg.attachmentImage} alt="Ảnh đã gửi cho AI"/>
           </button>}
           {!msg.attachmentImage&&msg.attachmentName&&<div className="help-attachment-chip"><FileText size={14}/><span>{msg.attachmentName}</span></div>}
           <p><RichText value={msg.text} topics={topics} pageId={msg.page_id||page} onGo={go}/></p>
           {msg.accountProposal&&<div className="help-account-proposal">
             <strong>Kiểm tra trước khi đổi tên</strong>
             <span>Tài khoản: {msg.accountProposal.email}</span>
             <span>Tên hiện tại: {msg.accountProposal.old_name}</span>
             <span>Tên mới: <b>{msg.accountProposal.new_name}</b></span>
             <button type="button" disabled={pending||saving} onClick={()=>applyAccountRename(msg,i)}>
               <CheckCircle2 size={14}/> {saving?'Đang lưu…':'Xác nhận đổi tên'}
             </button>
           </div>}
           {msg.page_id&&<button className="help-go" type="button" onClick={()=>go(msg.page_id)}>Mở mục {helpPageTitles[msg.page_id]} <ArrowUpRight size={14}/></button>}
         </div>)}
         {draft?.items?.length>0&&<div className="help-schedule-card">
           <div className="help-schedule-header"><CalendarDays size={16}/><strong>Bản nháp lịch học</strong><span>{draft.items.length} buổi</span></div>
           <p className="help-schedule-context">Trường: <strong>{draft.schoolName}</strong> · Giáo viên: <strong>{draft.teacherName}</strong> · Từ <strong>{draft.rangeStart||draft.items[0]?.session_date}</strong> đến <strong>{draft.rangeEnd||draft.items.at(-1)?.session_date}</strong>.</p>
           {draft.replaceScope&&<p className="help-schedule-replace-warning">Thay lịch cũ trong khoảng {draft.replaceScope.start} đến {draft.replaceScope.end}. Chỉ khi bạn xác nhận, lịch cũ cùng dữ liệu điểm danh mới bị xóa.</p>}
           {!!draft.warnings?.length&&<div className="help-schedule-warning">
             <strong>AI chưa chắc chắn về {draft.warnings.length} điểm:</strong>
             <ul>{draft.warnings.slice(0,8).map((w,i)=><li key={i}>{w}</li>)}</ul>
             <label><input type="checkbox" checked={partialAck} onChange={e=>setPartialAck(e.target.checked)}/> Tôi đã đọc cảnh báo và chỉ muốn lưu các buổi xác định được.</label>
           </div>}
           {draft.items.length>12&&<button type="button" className="help-show-all" onClick={()=>setShowAllDraft(v=>!v)}>
             {showAllDraft?'Thu gọn bản nháp':'Xem đủ '+draft.items.length+' buổi để kiểm tra và sửa'}
           </button>}
           <div className="help-schedule-list">{(showAllDraft?draft.items:draft.items.slice(0,12)).map((r,i)=><div className="help-schedule-item" key={(r.target_id||'new')+'-'+i}>
             <div className="help-schedule-item-head"><b>{r.operation==='edit'?'Sửa buổi có sẵn':'Thêm buổi mới'}</b><button type="button" title="Bỏ buổi này" onClick={()=>setDraft(d=>({...d,items:d.items.filter((_,j)=>i!==j)}))}><X size={14}/></button></div>
             <div className="help-schedule-grid">
               <label className="wide">Lớp<input value={r.class_name} maxLength={120} onChange={e=>updateDraft(i,'class_name',e.target.value)}/></label>
               <label>Ngày<input type="date" value={r.session_date} onChange={e=>updateDraft(i,'session_date',e.target.value)}/></label>
               <label>Số tiết<input type="number" min="1" max="20" value={r.period_count} onChange={e=>updateDraft(i,'period_count',e.target.value)}/></label>
               <label>Bắt đầu<input type="time" value={r.start_time} onChange={e=>updateDraft(i,'start_time',e.target.value)}/></label>
               <label>Kết thúc<input type="time" value={r.end_time} onChange={e=>updateDraft(i,'end_time',e.target.value)}/></label>
             </div>
           </div>)}</div>
           <div className="help-schedule-actions"><button type="button" onClick={()=>setDraft(null)} disabled={saving}>Hủy</button>
             <button className="primary" type="button" onClick={saveDraft}
               disabled={saving||!draft.items.length||(!!draft.warnings?.length&&!partialAck)}>
               <CheckCircle2 size={14}/>{saving?'Đang lưu…':draft.replaceScope?'Xác nhận thay lịch cũ':'Xác nhận lưu lịch'}
             </button>
           </div>
         </div>}
         {classDraft?.rows?.length>0&&<AIClassImportDraft
           draft={classDraft} profile={profile}
           onChange={setClassDraft} onCancel={()=>setClassDraft(null)}
           onMessage={msg=>setMessages(m=>[...m,{role:'system',text:msg}].slice(-30))}
           onDone={result=>{
             setMessages(m=>[...m,{role:'assistant',
               text:'**Đã lưu dữ liệu lớp '+classDraft.className+'**: '+(result?.created||0)+' học sinh mới, '+(result?.updated||0)+' dòng điểm đã cập nhật, '+(result?.skipped||0)+' dòng bỏ qua.'+
                (result?.issues?.length?'\nLưu ý: '+result.issues.slice(0,8).join('; '):'')
             }].slice(-30));
             setClassDraft(null);onSaved?.();
           }}
         />}
         {pending&&<div className="help-message theirs"><span className="help-speaker">Trợ lý IC3 AI</span><p>Đang xử lý yêu cầu của bạn…</p></div>}
         <div ref={chatEnd}/>
       </div>
       {file&&<div className="help-file-preview">
         {imageUrl?<img src={imageUrl} alt="Ảnh đính kèm sắp gửi"/>:<FileText size={20}/>}
         <span title={file.name}>{file.name}</span>
         <button type="button" onClick={clearFile} aria-label="Bỏ tệp đính kèm"><X size={16}/></button>
       </div>}
       <form className="help-composer" onSubmit={e=>{e.preventDefault();ask(text);}}>
         <input ref={fileInput} type="file" style={{display:'none'}} accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.csv,.tsv,.txt,.docx,.pptx" onChange={e=>setFile(e.target.files?.[0]||null)}/>
         <button type="button" className="help-attach-button" onClick={()=>fileInput.current?.click()} disabled={pending} aria-label="Đính kèm ảnh hoặc file" title="Thêm ảnh hoặc file"><Paperclip size={19}/></button>
         <textarea ref={inputRef} rows={2} value={text} maxLength={1300} disabled={pending} aria-label="Nhập yêu cầu cho AI"
           placeholder="Nhờ AI nhập học sinh, điểm hoặc lịch dạy từ ảnh, Excel, PDF… (chỉ lưu sau khi xác nhận)"
           onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(text);}}}/>
         <button type="submit" disabled={pending||saving||(!text.trim()&&!file)} title="Gửi câu hỏi" aria-label="Gửi câu hỏi"><Send size={18}/></button>
       </form>
       <footer className="help-footer">
         <span>{file?'Tệp chỉ gửi cho Gemini khi bấm Gửi.': 'AI hỗ trợ hỏi đáp và lập lịch. Mọi thay đổi cần xác nhận trước khi lưu.'}</span>
         {!!messages.length&&<button type="button" onClick={newChat} disabled={pending||saving}><RotateCcw size={12}/> Chat mới</button>}
       </footer>
     </>:<>
       <div className="help-guide">
         <label className="help-search-label"><span className="sr-only">Tìm trong hướng dẫn</span>
           <input value={query} placeholder="Tìm theo chức năng…" onChange={e=>setQuery(e.target.value)}/></label>
         <div className="help-guide-items">{listed.map(topic=><article key={topic.id} className="help-topic">
           <button type="button" className="help-topic-trigger" aria-expanded={expanded===topic.id} onClick={()=>setExpanded(id=>id===topic.id?'':topic.id)}>
             <span>{topic.title}</span><ChevronDown size={16} className={expanded===topic.id?'rotated':''}/></button>
           {expanded===topic.id&&<div className="help-topic-content">
             <p><RichText value={topic.summary} topics={topics} pageId={topic.id} onGo={go}/></p>
             <ol>{topic.steps.map((line,i)=><li key={i}><RichText value={line} topics={topics} pageId={topic.id} onGo={go}/></li>)}</ol>
             {topic.notes?.map((note,i)=><p className="help-note" key={i}>{note}</p>)}
             {helpPageTitles[topic.id]&&<button type="button" className="help-go" onClick={()=>go(topic.id)}>Đến mục {topic.title}<ArrowUpRight size={14}/></button>}
           </div>}</article>)}
           {!listed.length&&<p className="help-no-results">Không tìm thấy hướng dẫn. Bạn có thể hỏi AI trực tiếp.</p>}
         </div>
       </div>
       <footer className="help-footer">Sổ tay có sẵn, không tốn lượt Gemini.</footer>
     </>}
   </section>}
   {lightbox&&<div className="help-image-lightbox" role="dialog" aria-label="Xem hình ảnh" onClick={()=>setLightbox(null)}>
     <button type="button" className="help-lightbox-close" aria-label="Đóng ảnh"><X size={23}/></button>
     <img src={lightbox} alt="Xem ảnh kích thước lớn" onClick={e=>e.stopPropagation()}/>
   </div>}
 </div>;
}
