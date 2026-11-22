import React,{useEffect,useState} from 'react';
import {UserRound,Monitor,LockKeyhole,ShieldCheck,LogOut,Camera,Save,RefreshCw} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './studentProfile.css';

const EMPTY={name:'',class_id:'',date_of_birth:'',gender:'',avatar_data:null};
async function tinyAvatar(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Hãy chọn ảnh JPG, PNG hoặc WebP.');
 if(file.size>5*1024*1024)throw Error('Ảnh cần nhỏ hơn 5 MB.');
 const src=URL.createObjectURL(file);
 try{
  const image=await new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(Error('Không đọc được ảnh đã chọn.'));
   img.src=src;
  });
  const c=document.createElement('canvas');c.width=144;c.height=144;
  const ctx=c.getContext('2d');if(!ctx)throw Error('Trình duyệt không thể xử lý ảnh.');
  const edge=Math.min(image.width,image.height);
  ctx.drawImage(image,(image.width-edge)/2,(image.height-edge)/2,edge,edge,0,0,144,144);
  const data=c.toDataURL('image/jpeg',0.68);
  if(data.length>35000)throw Error('Ảnh vượt dung lượng tối đa, vui lòng chọn ảnh khác.');
  return data;
 }finally{URL.revokeObjectURL(src);}
}

export default function StudentProfile({session,onRefresh,onLogout}){
 const [profile,setProfile]=useState(null),[draft,setDraft]=useState(EMPTY);
 const [pcCode,setPcCode]=useState(''),[oldPin,setOldPin]=useState(''),[newPin,setNewPin]=useState(''),[repeatPin,setRepeatPin]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){
  setLoading(true);setError('');
  try{
   const {data,error:err}=await supabase.rpc('qlpm_student_web_profile',{p_session_token:session.token});
   if(err)throw err;if(!data)throw Error('Phiên đăng nhập không còn hiệu lực.');
   setProfile(data);
   setDraft({name:data.name||'',class_id:data.class_id||'',date_of_birth:data.date_of_birth||'',
     gender:data.gender||'',avatar_data:data.avatar_data||null});
   await onRefresh?.();
  }catch(e){setError(e.message||'Không tải được hồ sơ học sinh.');}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[session.token]);
 async function submitProfile(e){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const {data,error:err}=await supabase.rpc('qlpm_student_web_submit_profile',{
    p_session_token:session.token,p_full_name:draft.name.trim(),p_class_id:draft.class_id,
    p_date_of_birth:draft.date_of_birth||null,p_gender:draft.gender,
    p_avatar_data:draft.avatar_data
   });
   if(err)throw err;if(!data?.ok)throw Error(data?.message||'Không gửi được hồ sơ.');
   setNotice(data.message);await load();
  }catch(e){setError(e.message||String(e));}finally{setBusy(false);}
 }
 async function uploadAvatar(e){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  setError('');
  try{const data=await tinyAvatar(file);setDraft(v=>({...v,avatar_data:data}));}
  catch(err){setError(err.message);}
 }
 async function requestPc(e){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const {data,error:err}=await supabase.rpc('qlpm_student_desktop_request_pc',{
    p_session_token:session.token,p_pc:pcCode.trim(),p_device_id:'web'
   });
   if(err)throw err;if(!data?.ok)throw Error(data?.message||'Không gửi được yêu cầu.');
   setNotice(data.message);setPcCode('');await onRefresh?.();
  }catch(e){setError(e.message||String(e));}finally{setBusy(false);}
 }
 async function changePin(e){
  e.preventDefault();setError('');setNotice('');
  if(!/^\d{6}$/.test(oldPin)||!/^\d{6}$/.test(newPin)||newPin!==repeatPin){
   setError('PIN hiện tại và PIN mới phải có 6 số; phần xác nhận phải trùng nhau.');return;
  }
  if(oldPin===newPin||/^(.)\1{5}$/.test(newPin)){
   setError('PIN mới cần khác PIN cũ và không được lặp lại một chữ số.');return;
  }
  setBusy(true);
  try{
   const {data,error:err}=await supabase.rpc('qlpm_student_web_change_pin',{
    p_session_token:session.token,p_old_pin:oldPin,p_new_pin:newPin
   });
   if(err)throw err;if(!data?.ok)throw Error(data?.message||'Không đổi được PIN.');
   setOldPin('');setNewPin('');setRepeatPin('');
   window.alert('Đổi PIN thành công! Em hãy đăng nhập lại bằng PIN mới.');
   await onLogout?.();
  }catch(e){setError(e.message||String(e));}finally{setBusy(false);}
 }
 const avatar=draft.avatar_data||null;
 return <section className="qlpm-student-profile">
  <header className="qlpm-profile-heading">
   <div className="qlpm-profile-avatar">{avatar?<img src={avatar} alt="Ảnh đại diện học sinh"/>:
    <span>{(profile?.name||session.name||'H').trim().charAt(0).toUpperCase()}</span>}</div>
   <div><small>HỒ SƠ HỌC SINH</small><h1>{profile?.name||session.name}</h1>
    <p>Lớp {profile?.class_name||session.class_name||'—'} · Cập nhật thông tin và quản lý tài khoản của em</p></div>
   <button className="qlpm-profile-refresh" type="button" onClick={load} disabled={busy||loading}><RefreshCw size={17}/> Làm mới</button>
  </header>
  {error&&<p role="alert" className="qlpm-profile-alert error">{error}</p>}
  {notice&&<p role="status" className="qlpm-profile-alert success">{notice}</p>}
  {loading&&!profile?<p>Đang tải hồ sơ học sinh…</p>:<div className="qlpm-profile-columns">
   <article className="qlpm-profile-panel">
    <h2><UserRound size={21}/> Thông tin cá nhân</h2>
    <p>Thông tin em gửi sẽ chuyển đến giáo viên để duyệt trước khi cập nhật chính thức.</p>
    {profile?.pending&&<div className="qlpm-profile-pending" role="status">
      <ShieldCheck size={18}/> Đã gửi yêu cầu cập nhật, đang chờ giáo viên duyệt từ {new Date(profile.pending.submitted_at).toLocaleString('vi-VN')}.
     </div>}
    <form onSubmit={submitProfile} className="qlpm-profile-form">
     <label className="qlpm-profile-photo-label">Ảnh đại diện (AVT)
      <span className="qlpm-profile-photo-actions"><span><Camera size={17}/> Chọn ảnh mới</span>
       <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={busy||!!profile?.pending}/></span>
     </label>
     <label>Họ và tên<input value={draft.name} required minLength={5} maxLength={90}
       disabled={busy||!!profile?.pending} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/></label>
     <label>Lớp<select value={draft.class_id} required disabled={busy||!!profile?.pending}
       onChange={e=>setDraft(v=>({...v,class_id:e.target.value}))}>
       {(profile?.classes||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}
      </select></label>
     <label>Ngày sinh<input type="date" value={draft.date_of_birth}
       max={new Date().toISOString().slice(0,10)} disabled={busy||!!profile?.pending}
       onChange={e=>setDraft(v=>({...v,date_of_birth:e.target.value}))}/></label>
     <label>Giới tính<select value={draft.gender} disabled={busy||!!profile?.pending}
       onChange={e=>setDraft(v=>({...v,gender:e.target.value}))}>
       <option value="">Chưa cập nhật</option><option value="Nam">Nam</option>
       <option value="Nữ">Nữ</option><option value="Khác">Khác</option>
      </select></label>
     <button type="submit" disabled={busy||loading||!!profile?.pending}><Save size={18}/> Gửi giáo viên duyệt thông tin</button>
    </form>
   </article>
   <div className="qlpm-profile-stack">
    <article className="qlpm-profile-panel">
     <h2><Monitor size={21}/> Máy đã kết nối</h2>
     <strong className="qlpm-profile-pc">{session.pc||profile?.pc||'Chưa liên kết'}</strong>
     <p>{session.pc?'Đã được giáo viên xác nhận.':session.pc_requested?'Đang chờ duyệt PC '+session.pc_requested:'Em có thể gửi yêu cầu ghép máy.'}</p>
     <form className="qlpm-profile-form" onSubmit={requestPc}>
      <label>Máy muốn chuyển đến<input value={pcCode} maxLength={16} placeholder="VD: PC22"
        onChange={e=>setPcCode(e.target.value)}/></label>
      <button type="submit" disabled={busy||!pcCode.trim()}>Gửi yêu cầu đổi máy (giáo viên duyệt)</button>
     </form>
    </article>
    <article className="qlpm-profile-panel">
     <h2><LockKeyhole size={21}/> Thay đổi mã PIN</h2>
     <p>Không cần giáo viên duyệt. Đổi thành công, mọi phiên đăng nhập cũ sẽ hết hiệu lực.</p>
     <form className="qlpm-profile-form" onSubmit={changePin}>
      <label>PIN hiện tại<input type="password" inputMode="numeric" autoComplete="off" required
        maxLength={6} value={oldPin} onChange={e=>setOldPin(e.target.value.replace(/\D/g,'').slice(0,6))}/></label>
      <label>PIN mới (6 số)<input type="password" inputMode="numeric" autoComplete="new-password" required
        maxLength={6} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,'').slice(0,6))}/></label>
      <label>Xác nhận PIN mới<input type="password" inputMode="numeric" autoComplete="new-password" required
        maxLength={6} value={repeatPin} onChange={e=>setRepeatPin(e.target.value.replace(/\D/g,'').slice(0,6))}/></label>
      <button type="submit" disabled={busy||oldPin.length!==6||newPin.length!==6||repeatPin.length!==6}>
       <LockKeyhole size={17}/> Đổi PIN ngay
      </button>
     </form>
    </article>
    <button className="qlpm-profile-logout" type="button" onClick={onLogout}><LogOut size={19}/> Đăng xuất khỏi tài khoản</button>
   </div>
  </div>}
 </section>;
}
