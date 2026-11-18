import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
import {emailCallbackUrl} from './AuthCallback';
import {startGoogleAuth,hasGoogleIdentity,googleOAuthError} from './lib/googleAuth';

function resizeAvatar(file){
 return new Promise((resolve,reject)=>{
  if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>4*1024*1024){
   reject(Error('Chọn ảnh JPG, PNG hoặc WebP nhỏ hơn 4 MB.'));return;
  }
  const img=new Image();const url=URL.createObjectURL(file);
  img.onload=()=>{
   try{
    const c=document.createElement('canvas');c.width=180;c.height=180;
    const ctx=c.getContext('2d');
    const side=Math.min(img.naturalWidth,img.naturalHeight);
    ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,180,180);
    const result=c.toDataURL('image/jpeg',0.72);
    if(result.length>170000)throw Error('Ảnh đại diện còn quá lớn.');
    resolve(result);
   }catch(e){reject(e);}finally{URL.revokeObjectURL(url);}
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Không mở được ảnh này.'));};
  img.src=url;
 });
}

export function ProfileSettings({profile,refresh,email,reload,ping}){
 const [name,setName]=useState(profile.full_name||'');
 const [avatar,setAvatar]=useState(profile.avatar_data||null);
 const [editing,setEditing]=useState(false);
 const [busy,setBusy]=useState(false);
 const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[verify,setVerify]=useState('');
 const [changing,setChanging]=useState(false);
 const [identityProviders,setIdentityProviders]=useState(null);
 const [identityError,setIdentityError]=useState('');
 const [linkingGoogle,setLinkingGoogle]=useState(false);
 useEffect(()=>{
  let live=true;
  supabase.auth.getUserIdentities().then(({data,error})=>{
   if(!live)return;
   if(error){setIdentityError(error.message);setIdentityProviders([]);}
   else{setIdentityProviders(data?.identities||[]);setIdentityError('');}
  }).catch(err=>{
   if(live){setIdentityError(err.message||String(err));setIdentityProviders([]);}
  });
  return()=>{live=false;};
 },[profile.id,refresh]);
 async function linkGoogle(){
  if(linkingGoogle)return;
  setLinkingGoogle(true);setIdentityError('');
  try{
   const {data,error}=await supabase.auth.getUser();
   if(error)throw error;
   if(!data?.user||data.user.id!==profile.id)
    throw new Error('Phiên đăng nhập đã thay đổi. Đăng nhập lại bằng tài khoản hiện tại trước khi liên kết Google.');
   if(hasGoogleIdentity(identityProviders||[])){ping('Tài khoản đã liên kết Google.');return;}
   await startGoogleAuth(supabase.auth,emailCallbackUrl(),{linkExisting:true});
   // Supabase will redirect to the Google consent screen.
  }catch(err){
   const message=googleOAuthError(err);
   // Keep errors inline. A global green success toast is misleading here.
   setIdentityError(message);
  }finally{setLinkingGoogle(false);}
 }
 async function chooseFile(e){
  const f=e.target.files?.[0];e.target.value='';
  if(!f)return;
  try{setAvatar(await resizeAvatar(f));setEditing(true);}
  catch(err){ping(err.message);}
 }
 async function saveProfile(e){
  e.preventDefault();
  if(busy)return;
  setBusy(true);
  const {error}=await supabase.rpc('ic3_update_own_profile',{p_name:name.trim(),p_avatar_data:avatar});
  setBusy(false);
  if(error)ping(error.message);
  else{ping('Đã cập nhật hồ sơ cá nhân');setEditing(false);reload();}
 }
 async function updatePassword(e){
  e.preventDefault();if(changing)return;
  if(password.length<10)return ping('Mật khẩu mới cần ít nhất 10 ký tự.');
  if(password!==verify)return ping('Nhập lại mật khẩu mới chưa trùng khớp.');
  if(password===current)return ping('Mật khẩu mới cần khác mật khẩu cũ.');
  setChanging(true);
  const {error}=await supabase.auth.updateUser({password,current_password:current});
  setChanging(false);
  if(error)ping('Không đổi được mật khẩu: '+error.message);
  else{setCurrent('');setPassword('');setVerify('');ping('Đã đổi mật khẩu thành công.');}
 }
 return <div className="personal-page">
  <div className="personal-hero">
   <div className="personal-avatar-large">{avatar?<img src={avatar} alt="Ảnh đại diện giáo viên"/>:name.slice(0,1).toUpperCase()}</div>
   <div><h2>{profile.full_name}</h2><p>{email||profile.email||'Tài khoản giáo viên'}</p>
    <span className="personal-role">{profile.role==='admin'?'Quản trị viên':'Giáo viên'}</span></div>
  </div>
  <div className="personal-grid">
   <section className="panel">
    <h3>Thông tin cá nhân</h3>
    <p className="muted">Đổi ảnh đại diện và họ tên hiển thị. Ảnh được tối ưu kích thước trước khi lưu.</p>
    <form className="form-stack" onSubmit={saveProfile}>
     <label>Họ và tên<input required minLength={3} maxLength={100} value={name} onChange={e=>{setName(e.target.value);setEditing(true);}}/></label>
     <label>Ảnh đại diện<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile}/></label>
     <div className="actions"><button type="button" className="btn outline" onClick={()=>{setAvatar(null);setEditing(true);}}>Bỏ ảnh</button>
     <button className="btn primary" disabled={busy||!editing}>{busy?'Đang lưu…':'Lưu thông tin'}</button></div>
    </form>
   </section>
   <section className="panel personal-google-panel">
    <div className="personal-google-heading"><span className="google-g-mark" aria-hidden="true">G</span>
      <div><h3>Đăng nhập bằng Google</h3>
       <p className="muted">Liên kết với tài khoản đang dùng để giữ ID, quyền Admin/Giáo viên và dữ liệu hiện có.</p></div>
    </div>
    {identityProviders===null?<p className="muted">Đang kiểm tra liên kết Google…</p>:
      hasGoogleIdentity(identityProviders)?<div className="personal-google-linked">Google đã được liên kết với tài khoản này.</div>:
      <button type="button" className="btn outline" disabled={linkingGoogle||identityProviders===null}
        onClick={linkGoogle}>{linkingGoogle?'Đang chuyển tới Google…':'Liên kết tài khoản Google'}</button>}
    {identityError&&<div role="alert" className="notice-box personal-google-error">
      <strong>Chưa liên kết được Google:</strong> {identityError}
      <div className="personal-google-error-actions">
        <button type="button" className="mini-btn" onClick={()=>setIdentityError('')}>Thử lại sau khi bật</button>
        <a className="mini-btn" href="https://supabase.com/dashboard/project/hzxfgwnwmpdqxkvnqyim/auth/providers"
          target="_blank" rel="noreferrer">Mở cấu hình Supabase</a>
      </div>
      <small>Trong Authentication → Sign In / Providers → Supabase Auth, tìm và bật “Allow manual linking”/“Enable Manual Linking”. Google Provider phải được bật. Chỉ thao tác trên tài khoản Google bạn sở hữu.</small>
    </div>}
    <p className="muted personal-google-tip">Dùng đúng tài khoản Google mà bạn sở hữu. Không tạo tài khoản Admin mới hay thay đổi quyền truy cập khi liên kết. Nếu nút báo lỗi, Admin cần bật Google Provider và Manual Identity Linking trong Supabase.</p>
   </section>
   <section className="panel">
    <h3>Đổi mật khẩu</h3>
    <p className="muted">Nhập mật khẩu hiện tại để xác nhận. Mật khẩu không được lưu vào hồ sơ.</p>
    <form className="form-stack" onSubmit={updatePassword}>
     <label>Mật khẩu hiện tại<input autoComplete="current-password" type="password" required value={current} onChange={e=>setCurrent(e.target.value)}/></label>
     <label>Mật khẩu mới<input autoComplete="new-password" type="password" required minLength={10} value={password} onChange={e=>setPassword(e.target.value)}/></label>
     <label>Nhập lại mật khẩu mới<input autoComplete="new-password" type="password" required minLength={10} value={verify} onChange={e=>setVerify(e.target.value)}/></label>
     <button type="submit" className="btn primary" disabled={changing}>{changing?'Đang đổi…':'Cập nhật mật khẩu'}</button>
    </form>
   </section>
  </div>
 </div>;
}
