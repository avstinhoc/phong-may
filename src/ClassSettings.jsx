import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
export function ClassSettings({profile,ping}){
 const [code,setCode]=useState('IC3-'+Math.random().toString(36).slice(2,10).toUpperCase());
 const [name,setName]=useState(''),[rows,setRows]=useState([]),[busy,setBusy]=useState(false);
 const [deleting,setDeleting]=useState(null),[confirm,setConfirm]=useState(''),[showArchived,setShowArchived]=useState(false);
 async function load(){
  const {data,error}=await supabase.from('classes').select('id,class_name,registration_code,archived_at').eq('school_id',profile.school_id).order('class_name');
  if(error)ping(error.message);else setRows(data||[]);
 }
 useEffect(()=>{load();},[profile.school_id]);
 async function create(e){
  e.preventDefault();setBusy(true);
  const {error}=await supabase.from('classes').insert({school_id:profile.school_id,class_name:name.trim(),registration_code:code.trim().toUpperCase(),created_by:profile.id});
  setBusy(false);if(error)ping(error.message);else{
   ping('Đã tạo lớp '+name);setName('');setCode('IC3-'+Math.random().toString(36).slice(2,10).toUpperCase());load();
  }
 }
 async function remove(e){
  e.preventDefault();if(!deleting||deleting.class_name!==confirm)return;
  setBusy(true);
  const {data,error}=await supabase.rpc('archive_class_registration',{p_class_id:deleting.id,p_confirmation:confirm,p_restore:!!deleting.archived_at});
  setBusy(false);if(error)ping(error.message);else{setDeleting(null);setConfirm('');ping(data.archived?`Đã ngừng mã lớp. Vẫn giữ ${data.students_preserved} học sinh, ${data.sessions_preserved} buổi dạy và ${data.registrations_preserved} hồ sơ đăng ký.`:'Đã kích hoạt lại mã đăng ký lớp');load();}
 }
 function copy(value){navigator.clipboard?.writeText(value).then(()=>ping('Đã sao chép')).catch(()=>ping('Không thể sao chép'));}
 return <section className="class-management">
  <div className="section-head"><div><h2>Lớp & mã đăng ký</h2><p>Xóa mã đăng ký không xóa học sinh, lịch dạy hay hồ sơ đã lưu. Có thể khôi phục mã khi cần.</p></div></div>
  <label className="field-inline"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)} /> Hiện mã đăng ký đã ngừng sử dụng</label>
  <div className="panel table-panel"><div className="table-wrap"><table>
   <thead><tr><th>Lớp</th><th>Mã đăng ký</th><th>Trang học sinh</th><th>Đăng ký</th><th>Thao tác</th></tr></thead>
   <tbody>{rows.filter(row=>showArchived||!row.archived_at).map(row=><tr key={row.id}>
    <td><b>{row.class_name}</b>{row.archived_at&&<small className="muted"> · Đã ngừng mã</small>}</td>
    <td><code>{row.registration_code}</code> <button className="mini-btn" onClick={()=>copy(row.registration_code)}>Sao chép</button></td>
    <td>{row.archived_at?'Đã vô hiệu hóa':<><a className="mini-btn" href={'/student?code='+encodeURIComponent(row.registration_code)} target="_blank" rel="noreferrer">Mở trang lớp</a> <button className="mini-btn" onClick={()=>copy(window.location.origin+'/student?code='+encodeURIComponent(row.registration_code))}>Copy link</button></>}</td>
    <td>{row.archived_at?'Đã đóng':<a className="mini-btn" href={'/register?code='+encodeURIComponent(row.registration_code)} target="_blank" rel="noreferrer">Mở đăng ký</a>}</td>
    <td>{profile.role==='admin'&&<button className="mini-btn danger" onClick={()=>{setDeleting(row);setConfirm('');}}>{row.archived_at?'Khôi phục mã':'Xóa mã lớp'}</button>}</td>
   </tr>)}</tbody>
  </table></div></div>
  <div className="panel" style={{marginTop:18}}>
   <h3>Tạo lớp và mã đăng ký mới</h3>
   <form className="form-stack" onSubmit={create}>
    <label>Tên lớp<input required maxLength={200} placeholder="Ví dụ: 6.1" value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Mã đăng ký<input required maxLength={120} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>
    <button className="btn primary full" disabled={busy}>{busy?'Đang tạo…':'Tạo lớp'}</button>
   </form>
   <p className="muted">Chỉ chia sẻ mã sau khi tạo thành công. Học phí học sinh không còn được tính trong hệ thống.</p>
  </div>
  {deleting&&<div className="modal-backdrop"><div className="modal">
   <div className="modal-head"><h3>{deleting.archived_at?'Khôi phục mã lớp':'Xác minh xóa mã đăng ký'}</h3><button type="button" className="btn outline" onClick={()=>setDeleting(null)}>Đóng</button></div>
   <p className="muted">Thao tác này có thể áp dụng cả khi lớp đã có học sinh. Mã sẽ ngừng hoạt động và ẩn khỏi danh sách đăng ký; dữ liệu học sinh, lịch dạy và hồ sơ cũ được giữ nguyên. Nhập đúng tên lớp để tiếp tục:</p>
   <form className="form-stack" onSubmit={remove}>
    <label>Tên lớp: <b>{deleting.class_name}</b><input required autoComplete="off" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
    <button className="btn danger" disabled={busy||confirm!==deleting.class_name}>{busy?'Đang xử lý…':deleting.archived_at?'Kích hoạt lại mã':'Xóa mã đăng ký'}</button>
   </form>
  </div></div>}
 </section>;
}
