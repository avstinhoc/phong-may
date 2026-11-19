import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';
import {shortCodePreview} from './lib/registration';

export function ClassSettings({refresh,profile,ping,schools=[],onChanged}){
 const [managedSchool,setManagedSchool]=useState('');
 const [ownedSchoolIds,setOwnedSchoolIds]=useState([]);
 const schoolChoices=useMemo(()=>{
   const matching=schools.filter(sc=>sc.id===profile.school_id||ownedSchoolIds.includes(sc.id));
   return matching.length?matching:schools.filter(sc=>sc.id===profile.school_id);
 },[schools,profile.school_id,ownedSchoolIds]);
 const activeSchool=(managedSchool&&schoolChoices.some(sc=>sc.id===managedSchool)?managedSchool:null)
   ||(schoolChoices.some(sc=>sc.id===profile.school_id)?profile.school_id:schoolChoices[0]?.id||'');
 const activeSchoolName=schools.find(sc=>sc.id===activeSchool)?.name||'';
 const [name,setName]=useState(''),[rows,setRows]=useState([]),[busy,setBusy]=useState(false);
 const [newAutoApprove,setNewAutoApprove]=useState(true);
 const [deleting,setDeleting]=useState(null),[confirm,setConfirm]=useState(''),[showArchived,setShowArchived]=useState(false);
 const [editingCode,setEditingCode]=useState(null),[updatedCode,setUpdatedCode]=useState('');
 const [loading,setLoading]=useState(false);
 const preview=shortCodePreview(activeSchoolName,name);
 const [sharedBoardRef,setSharedBoardRef]=useState({schoolId:'',code:''});
 const boardClass=rows.find(row=>row.school_id===activeSchool&&!row.archived_at&&row.registration_code);
 const boardCode=boardClass?.registration_code||(sharedBoardRef.schoolId===activeSchool?sharedBoardRef.code:'');
 const schoolBoardUrl=boardCode?'/school?code='+encodeURIComponent(boardCode):'';
 // Get an existing class code for this school even if a different teacher owns it.
 // The server checks teacher role and school membership before returning the code.
 useEffect(()=>{
   let alive=true;
   if(!activeSchool)return;
   supabase.rpc('ic3_my_school_board_code',{p_school_id:activeSchool}).then(({data,error})=>{
     if(alive&&!error)setSharedBoardRef({schoolId:activeSchool,code:data||''});
   });
   return()=>{alive=false;};
 },[activeSchool,refresh]);

 useEffect(()=>{
   let alive=true;
   supabase.from('classes').select('school_id').eq('created_by',profile.id).limit(1000)
     .then(({data,error})=>{
       if(!alive)return;
       if(error)ping('Chưa tải được lớp đã tạo: '+error.message);
       else setOwnedSchoolIds([...new Set((data||[]).map(x=>x.school_id).filter(Boolean))]);
     });
   return()=>{alive=false;};
 },[profile.id]);
 async function load(){
   if(!activeSchool){setRows([]);return;}
   setLoading(true);
   const {data,error}=await supabase.from('classes')
     .select('id,school_id,class_name,registration_code,archived_at,auto_approve,created_by')
     .eq('school_id',activeSchool).eq('created_by',profile.id).is('retired_at',null).order('class_name');
   setLoading(false);
   if(error)ping(error.message);else setRows(data||[]);
 }
 useEffect(()=>{load();},[activeSchool,profile.id,refresh]);
 async function create(e){
   e.preventDefault();
   if(busy||!activeSchool)return;
   setBusy(true);
   try{
     const {data,error}=await supabase.rpc('ic3_create_class',{
       p_school_id:activeSchool,p_class_name:name.trim(),p_auto_approve:newAutoApprove
     });
     if(error)throw error;
     // Save the Web class first; immediately create its matching tab via the Edge
     // Function only when an authenticated school workbook has auto-sync enabled.
     let status='Chưa có liên kết Google Sheets cho trường này.';
     try{
       const {data:link,error:linkError}=await supabase.from('school_sheet_links')
         .select('id,status,auto_sync').eq('school_id',activeSchool).maybeSingle();
       if(linkError)throw linkError;
       if(link?.id&&link.status==='verified'&&link.auto_sync){
         const {data:result,error:syncError}=await supabase.functions.invoke('google-sheets-sync',{
           body:{action:'auto_sync_class',link_id:link.id,class_name:data.class_name}
         });
         if(syncError){
           let details=syncError.message||'Lỗi tạo tab Google Sheets';
           if(syncError.context?.json){
             try{details=(await syncError.context.json())?.error||details;}catch{}
           }
           throw Error(details);
         }
         if(!result?.success||result.errors?.length)
           throw Error((result?.errors||[]).join('; ')||'Không tạo được tab lớp.');
         status='Đã tạo hoặc liên kết tab '+(result.createdTabs?.[0]||data.class_name.replaceAll('/','／'))+' trong Sheets.';
       }else if(link?.id&&!link.auto_sync){
         status='Sheets đang tắt tự đồng bộ; bật lại trong Danh sách học sinh.';
       }else if(link?.id){
         status='Liên kết Google Sheets chưa được xác minh.';
       }
     }catch(syncError){
       status='Lớp đã lưu nhưng tab Sheets chưa tạo: '+(syncError.message||String(syncError));
     }
     setOwnedSchoolIds(ids=>ids.includes(activeSchool)?ids:[...ids,activeSchool]);
     setName('');await load();onChanged?.();
     ping('Đã tạo lớp '+data.class_name+' · '+status);
   }catch(err){ping('Không thể tạo lớp: '+(err.message||String(err)));}
   finally{setBusy(false);}
 }
 async function toggleAuto(row,next){
   setBusy(true);
   const {error}=await supabase.rpc('ic3_set_auto_approve',{p_class_id:row.id,p_value:next});
   setBusy(false);
   if(error)ping(error.message);else{
     setRows(list=>list.map(item=>item.id===row.id?{...item,auto_approve:next}:item));
     ping(next?'Lớp '+row.class_name+' đã bật duyệt tự động':'Lớp '+row.class_name+' đã chuyển sang duyệt thủ công');
   }
 }
 async function saveCode(e){
  e.preventDefault();
  if(!editingCode||busy||!updatedCode.trim())return;
  setBusy(true);
  const {data,error}=await supabase.rpc('ic3_manage_class_registration',{
   p_class_id:editingCode.id,p_action:'edit',p_new_code:updatedCode.trim()
  });
  setBusy(false);
  if(error)ping(error.message);
  else{
   setEditingCode(null);setUpdatedCode('');
   await load();onChanged?.();
   ping('Đã sửa mã lớp '+data.class_name+' thành '+data.registration_code+'. Link đăng ký cũ ngừng hoạt động.');
  }
 }
 async function remove(e){
   e.preventDefault();
   if(!deleting||deleting.class_name!==confirm)return;
   setBusy(true);
   const {error}=deleting.restore ? await supabase.rpc('ic3_manage_class_registration',{p_class_id:deleting.id,p_confirmation:confirm,p_action:'restore'}) : await supabase.rpc('ic3_retire_class',{p_class_id:deleting.id,p_confirmation:confirm});
   setBusy(false);
   if(error)ping(error.message);
   else{
     setDeleting(null);setConfirm('');
     if(deleting.restore)ping('Đã kích hoạt lại mã lớp');
     else{
       const {data:link,error:lookup}=await supabase.from('school_sheet_links').select('id').eq('school_id',deleting.school_id).maybeSingle();
       const result=link?await supabase.functions.invoke('google-sheets-sync',{body:{action:'finish_class_deletion',link_id:link.id}}):null;
       ping(lookup||result?.error?'Đã đóng lớp. Sẽ thử lại phần Sheets khi đồng bộ.':result?.data?.messages?.join(' ')||'Đã đóng lớp và xử lý liên kết Sheets.');
     }
     await load();onChanged?.();
   }
 }
 function copy(value){
   navigator.clipboard?.writeText(value).then(()=>ping('Đã sao chép')).catch(()=>ping('Không thể sao chép'));
 }
 return <section className="class-management">
  <div className="section-head"><div><h2>Lớp & mã đăng ký</h2>
   <p>Chỉ hiển thị lớp do tài khoản bạn tạo. BXH toàn trường tổng hợp học sinh của mọi giáo viên có lớp thuộc cùng ID trường.</p></div>
   {schoolBoardUrl&&<div className="class-school-board-actions">
     <a className="btn primary" href={schoolBoardUrl} target="_blank" rel="noopener noreferrer">🏆 Mở BXH toàn trường</a>
     <button type="button" className="btn outline" onClick={()=>copy(window.location.origin+schoolBoardUrl)}>Sao chép link BXH</button>
   </div>}
  </div>
  <label className="management-school-select">Trường quản lý
    <select aria-label="Trường chứa lớp của tôi" value={activeSchool}
      onChange={e=>{setManagedSchool(e.target.value);setShowArchived(false);}}>
      {schoolChoices.map(sc=>{
        const duplicated=schoolChoices.filter(x=>x.name===sc.name).length>1;
        return <option value={sc.id} key={sc.id}>{sc.name}{duplicated?' · '+sc.id.slice(0,5).toUpperCase():''}</option>;
      })}
    </select>
  </label>
  <p className="muted">Mỗi trường chỉ có một BXH theo ID trường. Giáo viên khác chọn cùng bản ghi trường sẽ xuất hiện trên BXH chung; trường trùng tên nhưng ID khác không được tự gộp để bảo vệ dữ liệu. {!schoolBoardUrl&&'Nếu trường chưa có mã lớp, hãy tạo một lớp trước để bật link BXH chung.'}</p>
  <label className="field-inline"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Hiện mã đã ngừng sử dụng</label>
  <div className="panel table-panel"><div className="table-wrap"><table>
   <thead><tr><th>Lớp</th><th>Mã đăng ký</th><th>Duyệt tự động</th><th>Trang học sinh</th><th>Đăng ký</th><th>Thao tác</th></tr></thead>
   <tbody>{rows.filter(row=>showArchived||!row.archived_at).map(row=><tr key={row.id}>
    <td><b>{row.class_name}</b>{row.archived_at&&<small className="muted"> · Đã ngừng mã</small>}</td>
    <td><code>{row.registration_code}</code> <button className="mini-btn" onClick={()=>copy(row.registration_code)}>Sao chép</button></td>
    <td><label className="auto-approve-toggle" title="Chỉ duyệt tự động hồ sơ hợp lệ, tên không trùng">
      <input type="checkbox" checked={!!row.auto_approve} disabled={busy||!!row.archived_at}
        onChange={e=>toggleAuto(row,e.target.checked)}/>
      <span>{row.auto_approve?'Bật':'Tắt'}</span>
    </label></td>
    <td>{row.archived_at?'Đã vô hiệu hóa':<><a className="mini-btn" href={'/student?code='+encodeURIComponent(row.registration_code)} target="_blank" rel="noreferrer">Mở trang lớp</a> <button className="mini-btn" onClick={()=>copy(window.location.origin+'/student?code='+encodeURIComponent(row.registration_code))}>Copy link</button></>}</td>
    <td>{row.archived_at?'Đã đóng':<a className="mini-btn" href={'/register?code='+encodeURIComponent(row.registration_code)} target="_blank" rel="noreferrer">Mở đăng ký</a>}</td>
    <td><div className="class-code-actions">
      <button type="button" className="mini-btn" disabled={busy||!!row.archived_at}
        onClick={()=>{setEditingCode(row);setUpdatedCode(row.registration_code);}}>Sửa mã</button>
      <button type="button" className="mini-btn danger" disabled={busy}
        onClick={()=>{setDeleting(row);setConfirm('');}}>Xóa lớp</button>
      {row.archived_at&&<button className="mini-btn" onClick={()=>{setDeleting({...row,restore:true});setConfirm('');}}>Khôi phục mã</button>}
     </div></td>
   </tr>)}</tbody>
  </table>{!rows.length&&!loading&&<p className="muted" style={{padding:16}}>Bạn chưa tạo lớp ở trường này. Lớp do người khác tạo sẽ không hiển thị tại đây.</p>}
  {loading&&<p className="muted" style={{padding:16}}>Đang tải lớp...</p>}</div></div>
  <div className="panel" style={{marginTop:18}}>
   <h3>Tạo lớp và mã đăng ký mới</h3>
   <form className="form-stack" onSubmit={create}>
    <label>Tên lớp<input required maxLength={80} placeholder="Ví dụ: 6.1" value={name}
      onChange={e=>setName(e.target.value)}/></label>
    <label>Mã lớp dự kiến<input readOnly value={preview} placeholder="Nhập tên lớp để xem mã ngắn" aria-label="Mã lớp ngắn dự kiến"/></label>
    <small className="muted">Ví dụ: IC3-DUYTAN-6.1. Nếu đã có lớp dùng mã này ở trường cùng tên, hệ thống tự thêm hậu tố để không trùng.</small>
    <label className="auto-approve-toggle"><input type="checkbox" checked={newAutoApprove}
      onChange={e=>setNewAutoApprove(e.target.checked)}/> Tự động duyệt đăng ký hợp lệ cho lớp này</label>
    <small className="muted">Tên đáng ngờ hoặc trùng tên sẽ không được duyệt tự động. Bạn có thể thay đổi sau khi tạo lớp.</small>
    <button className="btn primary full" disabled={busy||!activeSchool||!name.trim()}>
      {busy?'Đang tạo…':'Tạo lớp'}</button>
   </form>
  </div>
  {editingCode&&<div className="modal-backdrop"><div className="modal">
    <div className="modal-head"><h3>Sửa mã đăng ký · Lớp {editingCode.class_name}</h3>
      <button type="button" className="btn outline" disabled={busy} onClick={()=>setEditingCode(null)}>Đóng</button></div>
    <form className="form-stack" onSubmit={saveCode}>
      <label>Mã đăng ký mới<input autoFocus required maxLength={64} autoComplete="off"
        value={updatedCode} onChange={e=>setUpdatedCode(e.target.value.toUpperCase().trim())}
        aria-label="Mã đăng ký mới"/></label>
      <small className="muted">Ví dụ: IC3-DUYTAN-6.1. Mã không được trùng lớp khác. Sau khi lưu, link đăng ký cũ sẽ ngừng hoạt động; học sinh, điểm và lịch học vẫn giữ nguyên.</small>
      <button className="btn primary" disabled={busy||!updatedCode.trim()||updatedCode===editingCode.registration_code}>
        {busy?'Đang lưu…':'Lưu mã mới'}</button>
    </form>
  </div></div>}
  {deleting&&<div className="modal-backdrop"><div className="modal">
    <div className="modal-head"><h3>{deleting.restore?'Khôi phục mã lớp':'Xóa lớp vĩnh viễn'}</h3>
      <button type="button" className="btn outline" onClick={()=>setDeleting(null)}>Đóng</button></div>
    <p className="muted">{deleting.restore?'Kích hoạt lại mã lớp.':'Lớp sẽ đóng vĩnh viễn và ngừng đồng bộ Sheets. Lịch sử học sinh, điểm và lịch dạy được giữ lại. Tab điểm danh đã liên kết riêng với lớp sẽ bị xóa khỏi Google Sheets.'} Nhập tên lớp để xác nhận.</p>
    <form className="form-stack" onSubmit={remove}>
      <label>Tên lớp: <b>{deleting.class_name}</b><input required autoComplete="off"
        value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      <button className="btn danger" disabled={busy||confirm!==deleting.class_name}>
        {busy?'Đang xử lý…':deleting.restore?'Khôi phục mã':'Xóa lớp vĩnh viễn'}</button>
    </form>
  </div></div>}
 </section>;
}
