import React,{useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from './lib/supabase';
import {parseSheetUrl,validateSheetTabName,mapLessonsInOrder,validateLessonMapping} from './lib/googleSheetTemplate';
import {replaceExistingTopLeftLogo} from './lib/replaceExcelLogo';
import {fixedDateScript} from './lib/sheetDateScript';

const suggestedSheet='https://docs.google.com/spreadsheets/d/1O2A_f-SV5C3vkKDidDdgIxwIW96xOycs1qWSPYs1xkc/edit';
const labelDate=v=>String(v||'').split('-').reverse().join('/');
const getMessage=async error=>{
 if(error?.context?.json){
  try{const d=await error.context.json();if(d?.error)return d.error;}catch{}
 }
 return error?.message||'Không thể kết nối Google Sheets.';
};
export function SheetsConnectionPanel({profile,classes=[],sessions=[],logoData=null,logoLabel='',rosterVersion=0,onSynced}){
 const [open,setOpen]=useState(false),[link,setLink]=useState(null),
  [url,setUrl]=useState(''),[tabs,setTabs]=useState([]),[bindings,setBindings]=useState([]),
  [busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),
  [selectedClass,setSelectedClass]=useState(''),[tabName,setTabName]=useState(''),
  [newClass,setNewClass]=useState(''),[templateTab,setTemplateTab]=useState('6.1'),
  [preview,setPreview]=useState(null),[mapping,setMapping]=useState({});
 const autoSyncedForRef=useRef('');
 const currentTab=bindings.find(x=>x.class_name===selectedClass);
 const classSessions=useMemo(()=>sessions.filter(x=>x.class_name===selectedClass)
  .sort((a,b)=>String(a.session_date).localeCompare(String(b.session_date))||
   String(a.start_time).localeCompare(String(b.start_time))),[sessions,selectedClass]);
 async function load(){
  if(!profile.school_id)return;
  const {data:linkData,error:linkError}=await supabase.from('school_sheet_links')
   .select('*').eq('owner_id',profile.id).eq('school_id',profile.school_id).maybeSingle();
  if(linkError)throw linkError;
  setLink(linkData);
  if(linkData){
   setUrl('https://docs.google.com/spreadsheets/d/'+linkData.spreadsheet_id+'/edit');
   const {data,error}=await supabase.from('school_sheet_tabs').select('*').eq('link_id',linkData.id).order('class_name');
   if(error)throw error;
   setBindings(data||[]);
   setSelectedClass(before=>data?.some(x=>x.class_name===before)?before:data?.[0]?.class_name||'');
  }else{
   setBindings([]);setSelectedClass('');setTabs([]);
   setUrl(profile.school_name?.toLocaleLowerCase('vi').includes('duy tân')?suggestedSheet:'');
  }
 }
 useEffect(()=>{let live=true;(async()=>{try{if(live)await load();}catch(e){if(live)setError(e.message);}})();
  return()=>{live=false;};
 },[profile.id,profile.school_id]);
 useEffect(()=>{setMapping(currentTab?.lesson_columns||{});setPreview(null);},[currentTab?.id,selectedClass]);

 useEffect(()=>{autoSyncedForRef.current='';},[profile.school_id]);
 useEffect(()=>{
  if(!link?.id||!link.auto_sync||link.status!=='verified')return;
  const key=link.id+':'+rosterVersion;
  if(autoSyncedForRef.current===key)return;
  autoSyncedForRef.current=key;
  let cancelled=false;
  (async()=>{
   setBusy('auto');setError('');setMessage('Đang tự đối chiếu lớp và dữ liệu học sinh với Google Sheets...');
   try{
    const data=await api({action:'auto_sync_school'});
    if(cancelled)return;
    const added=(data.report||[]).reduce((n,r)=>n+(r.addedStudents||0),0);
    const written=(data.report||[]).reduce((n,r)=>n+(r.cellsWritten||0),0);
    const issues=(data.errors||[]).length+(data.report||[]).reduce((n,r)=>n+(r.conflicts?.length||0),0);
    setMessage('Đã đối chiếu '+(data.classesChecked||0)+' lớp · '+(data.createdTabs?.length||0)+' tab mới · '+added+' học sinh mới · '+written+' ô cập nhật'+(issues?' · '+issues+' mục cần rà soát':'')+'.');
    if(issues)setError((data.errors||[]).slice(0,4).join(' | '));
    await load();
    if(added||data.createdTabs?.length){
      autoSyncedForRef.current=link.id+':'+(rosterVersion+1);
      onSynced?.();
    }
   }catch(e){if(!cancelled)setError('Tự đồng bộ: '+(e.message||String(e)));}
   finally{if(!cancelled)setBusy('');}
  })();
  return()=>{cancelled=true;};
 },[link?.id,link?.status,link?.auto_sync,profile.school_id,rosterVersion]);
 async function changeAuto(enabled){
  if(!link)return;
  const {error}=await supabase.from('school_sheet_links').update({auto_sync:enabled}).eq('id',link.id);
  if(error)throw error;
  autoSyncedForRef.current='';
  await load();
  setMessage(enabled?'Đã bật đồng bộ tự động khi vào Danh sách học sinh.':'Đã tắt đồng bộ tự động.');
 }
 async function provisionHere(){
  const {data,error:serverError}=await supabase.functions.invoke('google-sheets-sync',{
   body:{action:'provision_school',school_id:profile.school_id}
  });
  if(serverError)throw Error(await getMessage(serverError));
  if(data?.error)throw Error(data.error);
  await load();
  setMessage(data.alreadyLinked?'Trường này đã có file Sheets riêng.':'Đã tạo file Sheets riêng từ mẫu cho trường '+profile.school_name+'.');
 }
 const api=async(body)=>{
  if(!link?.id)throw Error('Chưa lưu link Google Sheets của trường.');
  const {data,error:callError}=await supabase.functions.invoke('google-sheets-sync',{body:{...body,link_id:link.id}});
  if(callError)throw Error(await getMessage(callError));
  if(data?.error)throw Error(data.error);
  return data;
 };
 async function run(key,callback){
  if(busy)return;
  setBusy(key);setError('');setMessage('');
  try{await callback();}catch(e){setError(e.message||String(e));}
  finally{setBusy('');}
 }
 async function saveLink(){
  const id=parseSheetUrl(url);
  if(link&&link.spreadsheet_id!==id)
   throw Error('Muốn đổi file Google Sheets, hãy ngắt liên kết cũ trước để tránh nhầm dữ liệu lớp. Thao tác này không xóa học sinh hoặc file Google.');
  const {error}=await supabase.from('school_sheet_links').upsert({
   school_id:profile.school_id,owner_id:profile.id,spreadsheet_id:id,
   template_tab:'6.1',status:'unverified',auto_sync:true
  },{onConflict:'owner_id,school_id'});
  if(error)throw error;
  await load();
  setMessage('Đã lưu đường dẫn. Bước tiếp theo: kiểm tra quyền Google Sheets.');
 }
 async function disconnect(){
  if(!link||!window.confirm('Ngắt liên kết Google Sheets khỏi trường này? File gốc và dữ liệu học sinh trên web đều không bị xóa. Các ánh xạ tab/tiết của liên kết này sẽ được gỡ bỏ.'))return;
  const {error}=await supabase.from('school_sheet_links').delete().eq('id',link.id);
  if(error)throw error;
  await load();setMessage('Đã ngắt liên kết. File Google Sheets gốc vẫn nguyên vẹn.');
 }
 async function inspect(){
  const d=await api({action:'inspect'});
  setTabs(d.tabs||[]);await load();
  setMessage('Google Sheets đã cấp quyền. Tìm thấy '+d.tabs.length+' tab trong file '+d.title+'.');
 }
 async function bind(){
  const title=validateSheetTabName(tabName);
  const res=await api({action:'bind',class_name:title,tab_title:title});
  await load();setSelectedClass(res.tab.class_name);
  setMessage('Đã gắn tab '+title+' và tạo lớp trên web nếu lớp chưa tồn tại.');
  onSynced?.();
 }
 async function clone(){
  const cl=validateSheetTabName(newClass);
  if(tabs.some(t=>t.title===cl))throw Error('Tab lớp này đã có. Hãy dùng Gắn tab có sẵn.');
  if(!window.confirm('Tạo bản sao tab '+templateTab+' thành '+cl+'? Tab mẫu sẽ giữ nguyên; bản sao làm trống tên, điểm và checkbox điểm danh.'))return;
  const d=await api({action:'clone',class_name:cl,source_tab:templateTab});
  await inspect();setSelectedClass(cl);setNewClass('');
  setMessage(d.info||'Đã nhân bản tab lớp mà không làm đổi tab mẫu.');
  onSynced?.();
 }
 async function previewNow(){
  const d=await api({action:'preview',class_name:selectedClass});
  setPreview(d);setMessage('Đã đọc bản xem trước. Chưa ghi dữ liệu.');
 }
 async function sync(mode){
  if(!preview)throw Error('Hãy bấm Xem trước trước khi đồng bộ.');
  const note=mode==='pull'?'NHẬP từ Google Sheets vào web':'ĐẨY từ web sang Google Sheets';
  if(!window.confirm(note+' cho lớp '+selectedClass+'?\nHệ thống chỉ bổ sung ô trống/điểm danh vắng đã ghép. Dữ liệu khác sẽ báo xung đột thay vì ghi đè.'))return;
  const d=await api({action:mode,class_name:selectedClass,confirm:true});
  setPreview(null);await load();onSynced?.();
  setMessage('Đã đồng bộ. '+(d.createdStudents?'Thêm '+d.createdStudents+' học sinh. ':'')+
   (d.counts?.cellsWritten?'Ghi '+d.counts.cellsWritten+' ô. ':'')+
   (d.conflicts?.length?'Có '+d.conflicts.length+' mục cần rà soát: '+d.conflicts.slice(0,4).join('; '):'Không phát hiện xung đột.'));
 }
 async function saveMapping(){
  const validated=validateLessonMapping(mapping,classSessions.map(x=>x.id));
  const d=await api({action:'save_lesson_map',class_name:selectedClass,lesson_columns:validated});
  await load();setMapping(validated);setPreview(null);
  setMessage('Đã ghép '+d.mapped+' buổi với các cột B trên Sheets.');
 }
 async function downloadOriginal(withLogo=false){
  const {data,error:e}=await supabase.functions.invoke('google-sheets-sync',{
    body:{action:'download',link_id:link.id}
  });
  if(e)throw Error(await getMessage(e));
  let blob=data instanceof Blob?data:new Blob([data],{
   type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  if(!blob.size)throw Error('Google Sheets chưa trả về file Excel.');
  if(withLogo)blob=await replaceExistingTopLeftLogo(blob,logoData);
  const objectUrl=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=objectUrl;
  a.download='DS_Diem_Danh_Google_Sheets_'+String(profile.school_name||'truong').replace(/[^\w.\-]/g,'_')+(withLogo?'_Logo':'')+'.xlsx';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),15000);
  setMessage(withLogo?
   'Đã thay logo '+(logoLabel||'đã chọn')+' tại ảnh A1 trong file Excel; ô và công thức giữ từ Sheets gốc.':
   'Đã tải bản Excel trực tiếp từ Google Sheets gốc, giữ bố cục của các tab.');
 }
 return <div className="sheets-link-wrapper">
  <button type="button" className={'sheets-link-toggle '+(open?'active':'')} onClick={()=>setOpen(x=>!x)}
    aria-expanded={open}>
    <span className="sheets-link-icon" aria-hidden="true">▦</span>
    <span><strong>Liên kết Google Sheets</strong><small>Giữ file mẫu gốc · Đồng bộ lớp, học sinh, điểm và điểm danh</small></span>
    <span className={'sheets-link-status '+(link?.status==='verified'?'verified':'')}>
      {link?.status==='verified'?'Đã cấp quyền':link?'Chưa xác thực':'Chưa liên kết'}</span>
    <span className="sheets-link-chevron" aria-hidden="true">{open?'⌃':'⌄'}</span>
  </button>
  {open&&<div className="sheets-link-content">
   {!profile.school_id?<p className="notice-box">Hãy chọn trường công tác ở menu trái trước khi liên kết.</p>:<>
    <p className="muted">Mỗi giáo viên liên kết một file Google Sheets riêng theo trường đang chọn. Giữ nguyên file và các tab có sẵn; việc đồng bộ chỉ ghi sau khi xem trước và xác nhận.</p>
    <div className="sheets-link-grid">
     <label>Đường dẫn Google Sheets của {profile.school_name}
      <input type="url" value={url} disabled={!!busy} onChange={e=>setUrl(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/..." aria-label="Dán link Google Sheets cho trường này"/>
     </label>
     <button className="btn primary" disabled={!!busy||!url.trim()} onClick={()=>run('save',saveLink)}>
      {busy==='save'?'Đang lưu…':'Lưu liên kết'}
     </button>
     {link&&<button className="btn outline" disabled={!!busy} onClick={()=>run('inspect',inspect)}>
       {busy==='inspect'?'Đang kiểm tra…':'Kiểm tra quyền & đọc tabs'}
      </button>}
    </div>
    {!link&&<div className="sheets-link-help">
      <strong>Chưa có Google Sheets cho trường này?</strong>
      <small>Bạn có thể thử tạo bản sao tự động từ mẫu của trường đã liên kết. Tài khoản dịch vụ cần quyền ghi vào Shared Drive; nếu đang dùng Google Drive cá nhân miễn phí, hãy tự chọn Tệp → Tạo bản sao trong file mẫu rồi dán link ở trên.</small>
      <button className="btn outline" disabled={!!busy} onClick={()=>run('provision',provisionHere)}>Tạo Sheets cho trường này</button>
    </div>}
    {link&&<div className="sheets-link-meta">
     <a href={'https://docs.google.com/spreadsheets/d/'+link.spreadsheet_id+'/edit'}
       target="_blank" rel="noreferrer">Mở file Google Sheets gốc</a>
     <small>{link.spreadsheet_title||'Chưa đọc được tên file'} · Cập nhật lần cuối: {link.last_synced_at?new Date(link.last_synced_at).toLocaleString('vi-VN'):'Chưa đồng bộ'}</small>
     <button className="mini-btn danger" disabled={!!busy} onClick={()=>run('disconnect',disconnect)}>Ngắt liên kết</button>
    </div>}
    {error&&<div className="sheets-link-error" role="alert"><strong>Chưa thực hiện được:</strong> {error}</div>}
    {message&&<div className="sheets-link-message" role="status">{message}</div>}
    {link&&<details className="sheets-fixed-date-guide">
      <summary>Ghi ngày học cố định trong Google Sheets (B1–B70)</summary>
      <p>File mẫu đang dùng <code>TODAY()</code> nên ngày cũ thay đổi mỗi ngày.
      Cài đoạn Apps Script miễn phí một lần cho file: <b>Tiện ích mở rộng → Apps Script</b> → dán mã → <b>Lưu</b>.
      Khi nhập số tiết màu cam vào một ô mới, ngày học sẽ được ghi cố định vào ô bên dưới.</p>
      <div className="sheets-link-actions">
       <button type="button" className="btn outline" onClick={()=>navigator.clipboard?.writeText(fixedDateScript)
         .then(()=>setMessage('Đã sao chép Apps Script. Mở Google Sheets → Tiện ích mở rộng → Apps Script → dán và Lưu.'))
         .catch(()=>setError('Không tự sao chép được; hãy chọn đoạn mã phía dưới và copy thủ công.'))}>Sao chép mã cố định ngày</button>
       <a className="btn outline" target="_blank" rel="noreferrer" href={'https://docs.google.com/spreadsheets/d/'+link.spreadsheet_id+'/edit'}>Mở Google Sheets</a>
      </div>
      <textarea readOnly className="sheets-script-code" value={fixedDateScript} aria-label="Mã Apps Script ghi ngày cố định" rows={9}/>
      <p><b>Ngày học cũ:</b> chọn hàm <code>kiemTraNgayCu</code> và chạy một lần để đánh dấu những ô đang dùng TODAY().
       Những ngày đã bị thay đổi cần đối chiếu lịch dạy để nhập lại ngày thật. Không tự chốt ngày hôm nay cho buổi đã dạy.</p>
    </details>}
    {link?.status==='verified'&&<div className="sheets-link-auto">
      <label><input type="checkbox" checked={!!link.auto_sync} disabled={!!busy}
         onChange={e=>run('auto-toggle',()=>changeAuto(e.target.checked))}/>
       Tự đồng bộ lớp, học sinh, điểm và điểm danh khi mở Danh sách học sinh</label>
      <small>Mặc định bật, không cần đồng bộ thủ công trước. Tự tạo tab còn thiếu và bổ sung ô trống; dữ liệu khác nhau được báo xung đột, không ghi đè. Không chạy ngầm 24/7.</small>
    </div>}
    {link&&<div className="sheets-link-help">
      <strong>Quyền Google:</strong> Để đồng bộ file riêng tư, Admin cấu hình Google Service Account trong Supabase Edge Secrets, rồi chia sẻ file Sheets cho email dịch vụ ở quyền Editor. Không chuyển Sheets sang công khai và không dán khóa JSON vào website.
      <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noreferrer">Mở Google Cloud Service Accounts</a>
    </div>}
    {tabs.length>0&&<div className="sheets-link-section">
     <h3>1. Gắn tab hoặc nhân bản lớp</h3>
     <p className="muted">Các tab trong file: {tabs.map(t=>t.title).join(', ')}. Mỗi tab tương ứng một lớp.</p>
     <div className="sheets-link-grid">
      <label>Gắn tab đã có
       <select value={tabName} onChange={e=>setTabName(e.target.value)}>
        <option value="">Chọn tab lớp</option>{tabs.filter(t=>/^[\p{L}\p{N} ._-]{1,60}$/u.test(t.title)).map(t=>
         <option key={t.gid} value={t.title}>{t.title}</option>)}
       </select>
      </label>
      <button className="btn outline" disabled={!tabName||!!busy} onClick={()=>run('bind',bind)}>Gắn tab lớp</button>
     </div>
     <div className="sheets-link-grid">
      <label>Tạo lớp mới bằng bản sao mẫu
       <input placeholder="Ví dụ: 6.3" value={newClass} onChange={e=>setNewClass(e.target.value)} maxLength={60}/>
      </label>
      <label>Nhân bản từ
       <select value={templateTab} onChange={e=>setTemplateTab(e.target.value)}>
        {tabs.map(t=><option key={t.gid} value={t.title}>{t.title}</option>)}
       </select>
      </label>
      <button className="btn outline" disabled={!newClass.trim()||!!busy} onClick={()=>run('clone',clone)}>Nhân bản mẫu</button>
     </div>
    </div>}
    {bindings.length>0&&<div className="sheets-link-section">
     <h3>2. Đồng bộ dữ liệu lớp</h3>
     <div className="sheets-link-grid">
      <label>Chọn lớp liên kết
       <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
        {bindings.map(t=><option key={t.id} value={t.class_name}>{t.class_name} → Tab {t.sheet_title}</option>)}
       </select>
      </label>
      <button className="btn outline" disabled={!selectedClass||!!busy} onClick={()=>run('preview',previewNow)}>
       {busy==='preview'?'Đang đọc…':'Xem trước thay đổi'}
      </button>
      <button className="btn outline" disabled={!!busy} onClick={()=>run('download',()=>downloadOriginal(false))}>Xuất Excel gốc</button>
      <button className="btn outline" disabled={!!busy||!logoData}
        onClick={()=>run('logo',()=>downloadOriginal(true))}
        title={!logoData?'Chọn logo trường/trung tâm trong mục bên dưới':'Chỉ thay ảnh tại A1, giữ XML của các ô'}>Excel gốc + logo {logoLabel||'đã chọn'}</button>
     </div>
     {preview&&<div className="sheets-preview">
      <strong>Bản nháp · Chưa ghi dữ liệu</strong>
      <div className="sheets-metrics">
       <span>{preview.counts?.sheetStudents||0} HS trên Sheets</span>
       <span>{preview.counts?.websiteStudents||0} HS trên web</span>
       <span>{preview.counts?.missingOnWeb||0} HS cần nhập</span>
       <span>{preview.counts?.ambiguous||0} tên cần kiểm tra</span>
      </div>
      <small>Đã ghép {preview.counts?.lessonsMapped||0} buổi học với cột B. Các buổi chưa ghép không tự đồng bộ điểm danh để tránh lệch tiết.</small>
      <div className="sheets-link-actions">
       <button className="btn primary" disabled={!!busy} onClick={()=>run('pull',()=>sync('pull'))}>Nhập từ Sheets → Web</button>
       <button className="btn outline" disabled={!!busy} onClick={()=>run('push',()=>sync('push'))}>Đẩy từ Web → Sheets</button>
      </div>
     </div>}
     {classSessions.length>0&&<details className="sheets-lesson-mapping">
      <summary>Ghép buổi học với B1–B70 ({Object.keys(currentTab?.lesson_columns||{}).length}/{classSessions.length})</summary>
      <p className="muted">Ghép đúng mỗi buổi với cột B trong file. Bấm Tự ghép theo thứ tự chỉ khi các buổi trên web trùng thứ tự trong Sheets.</p>
      <div className="sheets-link-actions">
       <button className="mini-btn" disabled={!!busy} onClick={()=>{
        if(window.confirm('Ghép lần lượt các buổi học từ cũ đến mới thành B1–B'+classSessions.length+'? Kiểm tra ngày/tiết trong Sheets trước khi lưu.'))
         setMapping(mapLessonsInOrder(classSessions));
       }}>Tự ghép theo thời gian</button>
       <button className="mini-btn" disabled={!!busy} onClick={()=>setMapping({})}>Bỏ chọn</button>
      </div>
      <div className="sheets-lesson-map-list">
       {classSessions.map(s=><div key={s.id} className="sheets-lesson-map-row">
        <span>Lớp {s.class_name} · {labelDate(s.session_date)} · {String(s.start_time).slice(0,5)} · {s.period_count} tiết</span>
        <select aria-label={'Cột B cho buổi '+labelDate(s.session_date)} value={mapping[s.id]||''}
          onChange={e=>setMapping(m=>({...m,[s.id]:e.target.value}))}>
          <option value="">Chưa ghép</option>{Array.from({length:70},(_,i)=><option key={i+1} value={i+1}>B{i+1}</option>)}
        </select>
       </div>)}
      </div>
      <button className="btn primary" disabled={!!busy} onClick={()=>run('map',saveMapping)}>Lưu ghép tiết</button>
     </details>}
    </div>}
    <p className="sheets-link-footnote">File Sheets gốc không bị xóa hoặc đổi định dạng. Dữ liệu xung đột được báo để giáo viên kiểm tra; điểm và học sinh không bị ghi đè tự động. Google Sheets riêng tư yêu cầu quyền chia sẻ một lần.</p>
   </>}
  </div>}
 </div>;
}
