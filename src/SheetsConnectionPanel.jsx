import React,{useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from './lib/supabase';
import {parseSheetUrl,validateSheetTabName,mapLessonsInOrder,validateLessonMapping} from './lib/googleSheetTemplate';
import {replaceExistingTopLeftLogo} from './lib/replaceExcelLogo';
import {fixedDateScript} from './lib/sheetDateScript';
import {parseDriveFolderUrl} from './lib/driveSchoolFolders';

const labelDate=v=>String(v||'').split('-').reverse().join('/');
const validSchoolClass=value=>{
  const label=String(value||'').trim().replaceAll('／','/');
  if(!/^[\p{L}\p{N}][\p{L}\p{N} ._\/-]{0,59}$/u.test(label)||label==='Gốc')
    throw Error('Tên lớp không hợp lệ. Ví dụ: 6A1, 6.1, 6-1 hoặc 6/1.');
  return label;
};
const googleTabForClass=value=>String(value).replaceAll('/','／');
const SHEETS_EDITOR_EMAIL='ic3-sheets-sync@qlpm-ic3.iam.gserviceaccount.com';
const EMPTY_SCHOOL_TEMPLATE_ID='1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM';
// Suggested parent folder provided by the QLPM administrator. Never treat as verified until the Edge Function checks Editor access.
const SUGGESTED_QLPM_ROOT_URL='https://drive.google.com/drive/folders/1d8ZiM9q2xyxKNZwTSD5mN77fpVma-Nti';
const getMessage=async error=>{
 if(error?.context?.json){
  try{const d=await error.context.json();if(d?.error)return d.error;}catch{}
 }
 const msg=error?.message||'Không thể kết nối Google Sheets.';
 if(/failed to send a request to the edge function|failed to fetch|functionsfetcherror/i.test(msg))
   return 'Không gọi được dịch vụ Google Sheets. Nếu đang dùng QLPM Teacher Windows, máy chủ cần cho phép địa chỉ nội bộ Tauri (CORS). Kiểm tra kết nối mạng rồi cập nhật Edge Function; không cần di chuyển hay tạo lại file Google Sheets.';
 return msg;
};
export function SheetsConnectionPanel({profile,classes=[],sessions=[],logoData=null,logoLabel='',rosterVersion=0,refresh=0,syncRefresh=0,onSynced}){
 const [open,setOpen]=useState(false),[link,setLink]=useState(null),
  [url,setUrl]=useState(''),[tabs,setTabs]=useState([]),[bindings,setBindings]=useState([]),
  [busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),
  [selectedClass,setSelectedClass]=useState(''),[tabName,setTabName]=useState(''),
  [newClass,setNewClass]=useState(''),[templateTab,setTemplateTab]=useState('6.1'),
  [preview,setPreview]=useState(null),[mapping,setMapping]=useState({}),
  [rootFolder,setRootFolder]=useState(null),[rootUrl,setRootUrl]=useState('');
 const autoSyncedForRef=useRef('');
 const autoInspectedForRef=useRef('');
 const choices=classes;
 const currentTab=bindings.find(x=>x.class_name===selectedClass);
 const canManageLink=!link||link.owner_id===profile.id||profile.role==='admin';
 const suggestedTitle=('DS ĐIỂM DANH '+String(profile.school_name||'TRƯỜNG').toLocaleUpperCase('vi')).slice(0,110);

 const classSessions=useMemo(()=>sessions.filter(x=>x.class_name===selectedClass)
  .sort((a,b)=>String(a.session_date).localeCompare(String(b.session_date))||
   String(a.start_time).localeCompare(String(b.start_time))),[sessions,selectedClass]);
 async function load(){
  if(!profile.school_id)return;
  const {data:rootData,error:rootError}=await supabase.from('qlpm_drive_root')
    .select('*').eq('id',1).maybeSingle();
  if(rootError)throw rootError;
  setRootFolder(rootData||null);
  setRootUrl(rootData?'https://drive.google.com/drive/folders/'+rootData.folder_id:SUGGESTED_QLPM_ROOT_URL);
  const {data:linkData,error:linkError}=await supabase.from('school_sheet_links')
   .select('*').eq('school_id',profile.school_id).maybeSingle();
  if(linkError)throw linkError;
  setLink(linkData);
  if(linkData){
   setUrl('https://docs.google.com/spreadsheets/d/'+linkData.spreadsheet_id+'/edit');
   const {data,error}=await supabase.from('school_sheet_tabs').select('*').eq('link_id',linkData.id).order('class_name');
   if(error)throw error;
   const catalog=await supabase.from('classes').select('class_name,archived_at').eq('school_id',profile.school_id);
   if(catalog.error)throw catalog.error;
   const open=new Set(catalog.data.filter(c=>!c.archived_at).map(c=>c.class_name));
   const valid=(data||[]).filter(t=>open.has(t.class_name));
   setBindings(valid);

  }else{
   setBindings([]);setSelectedClass('');setTabs([]);
   setUrl('');
  }
 }
 useEffect(()=>{let live=true;(async()=>{try{if(live)await load();}catch(e){if(live)setError(e.message);}})();
  return()=>{live=false;};
 },[profile.id,profile.school_id,refresh]);
 const choicesKey=JSON.stringify(choices);
 useEffect(()=>{setSelectedClass(current=>choices.includes(current)?current:choices[0]||'');},[choicesKey]);
 useEffect(()=>{setMapping(currentTab?.lesson_columns||{});setPreview(null);},[currentTab?.id,selectedClass]);
 useEffect(()=>{
  if(!tabs.length||tabs.some(t=>t.title===templateTab))return;
  const chosen=tabs.find(t=>t.title==='Gốc')||tabs.find(t=>t.title==='6.1')||tabs[0];
  if(chosen?.title)setTemplateTab(chosen.title);
 },[tabs,templateTab]);

 useEffect(()=>{autoSyncedForRef.current='';autoInspectedForRef.current='';},[profile.school_id]);
 useEffect(()=>{
   if(!link?.id||link.status!=='unverified'||autoInspectedForRef.current===link.id)return;
   autoInspectedForRef.current=link.id;
   let cancelled=false;
   (async()=>{
     setBusy('inspect');setError('');setMessage('Đang kiểm tra quyền Google Sheets...');
     try{
       const {data,error:failed}=await supabase.functions.invoke('google-sheets-sync',{
         body:{action:'inspect',link_id:link.id}
       });
       if(failed)throw new Error(await getMessage(failed));
       if(data?.error)throw Error(data.error);
       if(cancelled)return;
       setTabs(data.tabs||[]);
       await load();
       setMessage('Đã xác minh Google Sheets. Hệ thống sẽ tự bổ sung lớp còn thiếu.');
     }catch(e){if(!cancelled)setError(e.message||String(e));}
     finally{if(!cancelled)setBusy('');}
   })();
   return()=>{cancelled=true;};
 },[link?.id,link?.status,profile.school_id]);
 useEffect(()=>{
  if(!link?.id||!link.auto_sync||link.status!=='verified')return;
  const key=[link.id,rosterVersion,syncRefresh].join(':');
  if(autoSyncedForRef.current===key)return;
  autoSyncedForRef.current=key;
  let cancelled=false;
  (async()=>{
   setBusy('auto');setError('');setMessage('Đang tự đối chiếu lớp và dữ liệu học sinh với Google Sheets...');
   try{
    let offset=0,checked=0,added=0,removed=0,written=0,created=0,issues=0,allErrors=[];
    // Small server batches keep the free-tier Edge Function within time limits.
    let total=0;
    while(!cancelled){
      setMessage(total?'Đã đối chiếu '+checked+'/'+total+' lớp · Đang xử lý lớp thứ '+(offset+1)+' đến '+Math.min(offset+3,total)+'.':'Đang đọc danh sách lớp và đồng bộ nhóm lớp đầu tiên…');
      const data=await api({action:'auto_sync_school',offset});
      if(cancelled)return;
      total=data.totalClasses||0;
      checked+=data.classesChecked||0;
      created+=(data.createdTabs||[]).length;
      added+=(data.report||[]).reduce((n,r)=>n+(r.addedStudents||0),0);
      removed+=(data.report||[]).reduce((n,r)=>n+(r.retiredOnWeb||0)+(r.retiredOnSheet||0),0);
      written+=(data.report||[]).reduce((n,r)=>n+(r.cellsWritten||0),0);
      issues+=(data.errors||[]).length+(data.report||[]).reduce((n,r)=>n+(r.conflicts?.length||0),0);
      allErrors.push(...(data.errors||[]),...(data.report||[]).flatMap(r=>(r.conflicts||[]).map(msg=>r.class_name+': '+msg)));
      setMessage('Đang đồng bộ '+checked+'/'+(data.totalClasses||checked)+' lớp · '+created+' tab mới...');
      if(data.nextOffset===null||data.nextOffset===undefined)break;
      if(data.nextOffset<=offset)throw Error('Tiến trình đồng bộ bị lặp, đã dừng để bảo vệ dữ liệu.');
      offset=data.nextOffset;
    }
    if(cancelled)return;
    setMessage('Đã đối chiếu '+checked+' lớp · '+created+' tab mới · '+added+' học sinh mới'+(removed?' · '+removed+' hồ sơ đã bỏ khỏi danh sách':'')+' · '+written+' ô cập nhật'+(issues?' · '+issues+' mục cần rà soát':'')+'.');
    if(issues)setError(allErrors.slice(0,4).join(' | ')||'Có '+issues+' khác biệt dữ liệu cần kiểm tra trước khi ghi đè.');
    await load();
    if(added||created||removed){
      autoSyncedForRef.current=[link.id,rosterVersion+1,syncRefresh].join(':');
      onSynced?.();
    }
   }catch(e){if(!cancelled)setError('Tự đồng bộ: '+(e.message||String(e)));}
   finally{if(!cancelled)setBusy('');}
  })();
  return()=>{cancelled=true;};
 },[link?.id,link?.status,link?.auto_sync,profile.school_id,rosterVersion,syncRefresh]);
 async function changeAuto(enabled){
  if(!link)return;
  if(enabled)await api({action:'validate_template'});
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
 async function callSchoolDrive(action,extra={}){
  const {data,error:callError}=await supabase.functions.invoke('google-sheets-sync',{
   body:{action,school_id:profile.school_id,...extra}
  });
  if(callError)throw Error(await getMessage(callError));
  if(data?.error)throw Error(data.error);
  return data;
 }
 async function saveRootFolder(){
  if(profile.role!=='admin')throw Error('Chỉ Admin được cấu hình thư mục cha dùng chung.');
  const folderId=parseDriveFolderUrl(rootUrl);
  const result=await callSchoolDrive('register_qlpm_root',{folder_id:folderId});
  await load();
  setMessage('Đã kiểm tra quyền Editor và lưu thư mục '+(result.root?.folder_name||'QLPM')+'. File mẫu và file của các trường cùng nằm trong thư mục này.');
 }
 async function createSchoolWorkbook(){
  if(link){
   setMessage('Trường đã có bảng tính chung.');return;
  }
  if(!rootFolder)throw Error('Admin chưa cấu hình thư mục QLPM dùng chung.');
  const result=await callSchoolDrive('create_school_workbook');
  await load();
  if(result.alreadyLinked){
   setMessage('Trường này đã có Google Sheets. Đã tải lại liên kết.');
  }else{
   setMessage((result.reused?'Đã phát hiện file trường có sẵn trong QLPM và liên kết.':
      'Đã tạo file mới từ mẫu DS ĐIỂM DANH, lưu trong thư mục QLPM và gắn link tự động.')+
      ' File: '+(result.title||suggestedTitle));
  }
  onSynced?.();
 }
 async function persistSchoolCopy(nextUrl){
  const id=parseSheetUrl(nextUrl);
  if(id===EMPTY_SCHOOL_TEMPLATE_ID)throw Error('Đây là file mẫu trống. Hãy chọn file điểm danh riêng của trường.');
  // Keep existing Sheets in their own Drive location; QLPM folder is only for newly created files.
  if(link){
   if(link.spreadsheet_id!==id)throw Error('Trường đã có Sheets dùng chung. Không thể tự gắn file thứ hai.');
   setMessage('File này đã được liên kết cho trường.');return;
  }
  const result=await callSchoolDrive('link_school_workbook',{spreadsheet_id:id});
  await load();
  setMessage(result.alreadyLinked?'Trường đã có liên kết.':
    'Đã liên kết file gốc tại vị trí hiện tại, không sao chép. Bật tự đồng bộ sau khi xác minh mẫu tương thích.');
 }
 async function saveLink(){
  if(!canManageLink)throw Error('Chỉ chủ liên kết hoặc Admin được thay đổi file của trường.');
  await persistSchoolCopy(url);
 }
 async function disconnect(){
  if(!link||!canManageLink)throw Error('Chỉ chủ liên kết hoặc Admin được ngắt file Sheets của trường.');
  if(!window.confirm('Ngắt Google Sheets chung của toàn trường? Dữ liệu trên Google và học sinh trên web vẫn nguyên, nhưng liên kết tab của cả trường sẽ được gỡ.'))return;
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
  const title=tabName.trim();
  const label=validSchoolClass(title);
  const res=await api({action:'bind',class_name:label,tab_title:title});
  await load();setSelectedClass(res.tab.class_name);
  setMessage('Đã gắn tab '+title+' và tạo lớp trên web nếu lớp chưa tồn tại.');
  onSynced?.();
 }
 async function clone(){
  const cl=validSchoolClass(newClass);
  if(tabs.some(t=>t.title===googleTabForClass(cl)))throw Error('Tab lớp này đã có. Hãy dùng Gắn tab có sẵn.');
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
    <span><strong>Liên kết Google Sheets</strong><small>Mỗi trường một bảng tính chung · Tạo từ mẫu trống</small></span>
    <span className={'sheets-link-status '+(link?.status==='verified'?'verified':'')}>
      {link?.status==='verified'?'Đã cấp quyền':link?'Chưa xác thực':'Chưa liên kết'}</span>
    <span className="sheets-link-chevron" aria-hidden="true">{open?'⌃':'⌄'}</span>
  </button>
  {open&&<div className="sheets-link-content">
   {!profile.school_id?<p className="notice-box">Hãy chọn trường công tác ở menu trái trước khi liên kết.</p>:<>

    <section className="sheets-folder-setup" hidden>
     <div className="sheets-folder-head">
      <strong>Thư mục Google Drive chung: QLPM</strong>
      <span className={'sheets-folder-status '+(rootFolder?'ready':'pending')}>
       {rootFolder?'✓ Đã lưu thư mục':'Chưa cấu hình'}</span>
     </div>
     {rootFolder?<p>Thư mục <b>{rootFolder.folder_name}</b> đã được lưu. File mẫu và file điểm danh các trường nằm trực tiếp bên trong.
       <a href={'https://drive.google.com/drive/folders/'+rootFolder.folder_id} target="_blank" rel="noopener noreferrer"> Mở thư mục QLPM</a>
      </p>:<p>Admin liên kết thư mục <b>QLPM</b> của bạn và đảm bảo Service Account có quyền Editor. Không cần tạo thêm thư mục trường.</p>}
     {profile.role==='admin'&&<details>
      <summary>Admin · Kiểm tra lại thư mục QLPM</summary>
      <div className="sheets-folder-fields">
       <label>Đường dẫn thư mục QLPM
        <input type="url" value={rootUrl} disabled={!!busy} onChange={e=>setRootUrl(e.target.value)}
         placeholder="https://drive.google.com/drive/folders/..." aria-label="Đường dẫn Drive QLPM"/>
       </label>
       <button type="button" className="btn outline" disabled={!!busy||!rootUrl.trim()}
        onClick={()=>run('root',saveRootFolder)}>{busy==='root'?'Đang kiểm tra…':'Kiểm tra & lưu QLPM'}</button>
      </div>
     </details>}
     <small>Đã chia sẻ Editor cho <code>{SHEETS_EDITOR_EMAIL}</code>. Chỉ cần quyền này ở thư mục QLPM; hãy để <b>Quyền truy cập chung: Hạn chế</b> để bảo vệ dữ liệu học sinh.</small>
    </section>
    <div className="sheets-link-grid">
     <label>Đường dẫn Google Sheets của {profile.school_name}
      <input type="url" value={url} disabled={!!busy||!!link||!canManageLink} onChange={e=>setUrl(e.target.value)}
       placeholder="Dán link Sheets có sẵn, không cần chuyển vào thư mục QLPM" aria-label="Đường dẫn Sheets của trường"/>
     </label>
     <button className="btn outline" disabled={!!busy||!url.trim()||!!link||!canManageLink}
      onClick={()=>run('save',saveLink)}>Lưu link có sẵn</button>
     {link&&<button className="btn outline" disabled={!!busy} onClick={()=>run('inspect',inspect)}>
       {busy==='inspect'?'Đang kiểm tra…':'Kiểm tra quyền & đọc tabs'}
     </button>}
    </div>
    {!link&&<p className="muted">Bạn có thể liên kết file Google Sheets đang dùng ở bất kỳ thư mục Drive nào, không cần tạo bản sao, không cần bật công khai. Để QLPM đọc và ghi, chỉ chia sẻ <b>riêng file</b> cho <code>{SHEETS_EDITOR_EMAIL}</code> với quyền Người chỉnh sửa. Không liên kết Sheets thì vẫn dùng QLPM bình thường.</p>}
    {!link&&<div className="sheets-copy-guide">
      <strong>Tạo file Google Sheets của trường</strong>
      <p><b>{suggestedTitle}</b> sẽ được tạo từ file mẫu <b>DS ĐIỂM DANH</b> trong thư mục QLPM. Nếu file đúng tên đã tồn tại, hệ thống sẽ dùng file đó thay vì sao chép lần nữa.</p>
      <div className="sheets-link-actions">
       <button type="button" className="btn primary" disabled={!!busy||!rootFolder}
        onClick={()=>run('create',createSchoolWorkbook)}>
        {busy==='create'?'Đang tạo và liên kết…':'Tạo file Google Sheets của trường'}</button>
      </div>
      <p className="muted">Sau khi tạo thành công: file tự lưu trong QLPM, tự đặt tên theo trường, tự gắn vào ô đường dẫn và bật đồng bộ cho trường. Đồng nghiệp có quyền trong cùng trường dùng chung liên kết.</p>
    </div>}
    {link&&!canManageLink&&<p className="sheets-link-footnote"><b>Đang dùng chung Google Sheets của trường.</b> Bạn có thể đồng bộ trên QLPM theo quyền trường; muốn mở và chỉnh sửa trực tiếp trong Google Sheets, nhờ chủ file chia sẻ thêm email Google của bạn ở quyền Editor.</p>}
        {link&&<div className="sheets-link-meta">
     <a href={'https://docs.google.com/spreadsheets/d/'+link.spreadsheet_id+'/edit'}
       target="_blank" rel="noreferrer">Mở file Google Sheets gốc</a>
     <small>{link.spreadsheet_title||'Chưa đọc được tên file'} · Dùng chung cho giáo viên tại {profile.school_name} · Cập nhật lần cuối: {link.last_synced_at?new Date(link.last_synced_at).toLocaleString('vi-VN'):'Chưa đồng bộ'}</small>
     {canManageLink&&<button className="mini-btn danger" disabled={!!busy} onClick={()=>run('disconnect',disconnect)}>Ngắt liên kết toàn trường</button>}
    </div>}
    {error&&<div className="sheets-link-error" role="alert"><strong>Chưa thực hiện được:</strong> {error}</div>}
    {error&&/hồ sơ trường cùng tên|đã xóa khỏi danh sách Web|xung đột dữ liệu/i.test(error)&&
     <details className="sheets-shared-conflict-guide" open>
      <summary>Vì sao danh sách học sinh không tự cập nhật sau khi xóa?</summary>
      <p><b>Hai hồ sơ trường có thể đang cùng kết nối một file Sheets nhưng lại lưu học sinh của lớp này riêng biệt.</b>
       Xóa học sinh ở một hồ sơ chỉ đánh dấu không hoạt động tại hồ sơ đó; dữ liệu ở hồ sơ kia và dòng cũ trên Sheets không tự biến mất.</p>
      <p>Để bảo vệ điểm danh, điểm và sao thưởng, hệ thống sẽ không tự khôi phục học sinh đã ẩn, xóa dòng chứa lịch sử hoặc ghi đè lớp trùng khi chưa xác minh được hồ sơ nào là nguồn chính.</p>
      <p><b>Cách xử lý:</b> Thống nhất một hồ sơ trường/lớp để hai giáo viên cùng sử dụng, đối chiếu danh sách học sinh của lớp bị báo trùng, rồi mới xác nhận xử lý những dòng không còn hoạt động trên Sheets. Không cần ngắt liên kết hay xóa file gốc.</p>
     </details>
    {message&&<div className="sheets-link-message" role="status">{message}</div>}
    {link&&<details className="sheets-fixed-date-guide" hidden>
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
      <label><input type="checkbox" checked={!!link.auto_sync} disabled={!!busy||!canManageLink}
         onChange={e=>run('auto-toggle',()=>changeAuto(e.target.checked))}/>
       Tự đồng bộ lớp, học sinh, điểm và điểm danh khi mở Danh sách học sinh</label>
      <small>Mặc định bật, không cần đồng bộ thủ công trước. Tự tạo tab còn thiếu và bổ sung ô trống; dữ liệu khác nhau được báo xung đột, không ghi đè. Không chạy ngầm 24/7.</small>
    </div>}

    {tabs.length>0&&<div className="sheets-link-section">
     <h3>1. Gắn tab hoặc nhân bản lớp</h3>
     <p className="muted">Các tab trong file: {tabs.map(t=>t.title).join(', ')}. Mỗi tab tương ứng một lớp.</p>
     <div className="sheets-link-grid">
      <label>Gắn tab đã có
       <select value={tabName} onChange={e=>setTabName(e.target.value)}>
        <option value="">Chọn tab lớp</option>{tabs.filter(t=>t.title!=='Gốc'&&/^[\p{L}\p{N} ._／-]{1,60}$/u.test(t.title)).map(t=>
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
    {choices.length>0&&<div className="sheets-link-section">
     <h3>2. Đồng bộ dữ liệu lớp</h3>
     <div className="sheets-link-grid">
      <label>Chọn lớp liên kết
       <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
        {choices.map(name=><option key={name} value={name}>{name} · {bindings.find(t=>t.class_name===name)?.sheet_title||'Chờ liên kết'}</option>)}
       </select>
      </label>
      <button className="btn outline" disabled={!currentTab||!!busy} onClick={()=>run('preview',previewNow)}>
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
