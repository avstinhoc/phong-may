import React,{useEffect,useState} from 'react';
import {supabase,authMessage} from './lib/supabase';
import {hasGoogleIdentity,googleOAuthError} from './lib/googleAuth';

export const emailCallbackUrl=()=>
  window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'
  ? window.location.origin+'/auth/callback'
  : 'https://phong-may.vercel.app/auth/callback';

export function AuthCallback(){
 const [status,setStatus]=useState('Đang kiểm tra liên kết…');
 const [ok,setOk]=useState(null);
 const [isRecovery,setRecovery]=useState(false);
 const [isGoogle,setGoogleFlow]=useState(false);
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false);
 const [done,setDone]=useState(false);
 useEffect(()=>{
  let live=true;
  const query=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
  // A recovery redirect is intentionally handled by this already allow-listed callback URL.
  const recovery=query.get('recovery')==='1'||query.get('type')==='recovery'||hash.get('type')==='recovery';
  const google=query.get('provider')==='google';
  if(google)setGoogleFlow(true);
  const linking=google&&query.get('linked')==='1';
  if(recovery)setRecovery(true);
  (async()=>{
    try{
      const e=query.get('error')||hash.get('error');
      if(e)throw new Error(google?googleOAuthError({message:query.get('error_description')||hash.get('error_description')||e}):query.get('error_description')||hash.get('error_description')||'Liên kết không còn hiệu lực.');
      const code=query.get('code');
      if(code){
        const {error}=await supabase.auth.exchangeCodeForSession(code);
        if(error)throw error;
      }
      const {data,error}=await supabase.auth.getSession();
      if(error)throw error;
      if(!data.session)throw new Error(google?'Không tìm được phiên đăng nhập Google. Vui lòng quay lại và thử lại.':'Không tìm được phiên xác thực. Nếu email đã xác nhận, hãy đăng nhập lại.');
      if(linking){
        const {data:identities,error:identityError}=await supabase.auth.getUserIdentities();
        if(identityError)throw identityError;
        if(!hasGoogleIdentity(identities?.identities))
          throw new Error('Google chưa được liên kết với tài khoản hiện tại. Hãy đăng nhập email/mật khẩu và liên kết lại trong Cá nhân.');
      }
      // Google OAuth has already established the Supabase session. Go straight
      // to the app; the existing profile/role gate handles newly pending users.
      // Password recovery and email verification retain their own UI.
      if(google&&!recovery){
        window.location.replace('/');
        return;
      }
      if(live){
        setOk(true);
        setStatus(recovery?'Liên kết hợp lệ. Nhập mật khẩu mới để hoàn tất.':
          linking?'Đã liên kết Google với tài khoản hiện tại. Quyền Admin/Giáo viên và dữ liệu được giữ nguyên.':
          google?'Google đã xác thực thành công. Tài khoản mới cần Admin duyệt; tài khoản cũ giữ nguyên quyền đã được cấp.':
          'Email đã xác thực thành công! Nếu là giáo viên mới, Admin cần cấp quyền sử dụng.');
      }
    }catch(err){if(live){setOk(false);setStatus(google?googleOAuthError(err):authMessage(err));}}
    finally{
      window.history.replaceState({},document.title,window.location.pathname);
    }
  })();
  return()=>{live=false;};
 },[]);
 async function updatePassword(e){
   e.preventDefault();
   if(password.length<8||password!==confirm){setStatus('Mật khẩu cần từ 8 ký tự và hai ô phải giống nhau.');return;}
   setBusy(true);
   try{
     const {error}=await supabase.auth.updateUser({password});
     if(error)throw error;
     // Sign out to ensure user signs in with the newly set password.
     await supabase.auth.signOut();
     setDone(true);setStatus('Đã đổi mật khẩu thành công. Hãy đăng nhập lại bằng mật khẩu mới.');
   }catch(err){setStatus(authMessage(err));}finally{setBusy(false);}
 }
 return <div className="auth-wrap"><div className="auth-card auth-callback-card">
   <div className="brand-mark large">IC3</div>
   <h1>{ok===null?'Đang xác thực…':done?'Đổi mật khẩu thành công':!ok?'Liên kết không hợp lệ':isRecovery?'Đặt mật khẩu mới':'Xác thực thành công'}</h1>
   <div role="status" aria-live="polite" className="notice-box">{status}</div>
   {ok&&isRecovery&&!done&&<form className="form-stack" onSubmit={updatePassword}>
     <label>Mật khẩu mới<input type="password" required autoComplete="new-password" minLength="8" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tối thiểu 8 ký tự"/></label>
     <label>Nhập lại mật khẩu mới<input type="password" required autoComplete="new-password" minLength="8" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu"/></label>
     <button className="btn primary full" disabled={busy||password.length<8||password!==confirm}>{busy?'Đang cập nhật…':'Lưu mật khẩu mới'}</button>
   </form>}
   <a className="btn outline full" href="/">{ok&&!isRecovery?'Vào IC3 GS6':'Về trang đăng nhập'}</a>
   {!ok&&<p className="muted">{isGoogle?
     'Nếu bạn không thể đăng nhập Google, hãy sử dụng email/mật khẩu hiện tại. Admin cần bật Google Provider trong Supabase và cấu hình đúng redirect.':
     <>Nếu liên kết đã hết hạn, quay lại trang đăng nhập và chọn <b>Quên mật khẩu</b> để lấy liên kết mới. Không cần đăng ký lại tài khoản.</>}</p>}
 </div></div>;
}
