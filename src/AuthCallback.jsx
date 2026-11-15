import React,{useEffect,useState} from 'react';
import {supabase,authMessage} from './lib/supabase';

export const emailCallbackUrl=()=>
  window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'
  ? window.location.origin+'/auth/callback'
  : 'https://phong-may.vercel.app/auth/callback';

export function AuthCallback(){
 const [status,setStatus]=useState('Đang kiểm tra liên kết xác thực…');
 const [ok,setOk]=useState(null);
 useEffect(()=>{
  let live=true;
  (async()=>{
    try{
      const query=new URLSearchParams(window.location.search);
      const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
      const e=query.get('error')||hash.get('error');
      if(e)throw new Error(query.get('error_description')||hash.get('error_description')||'Liên kết không còn hiệu lực');
      const code=query.get('code');
      if(code){
        const {error}=await supabase.auth.exchangeCodeForSession(code);
        if(error)throw error;
      }
      const {data,error}=await supabase.auth.getSession();
      if(error)throw error;
      if(!data.session)throw new Error('Chưa tìm được phiên đăng nhập sau xác thực. Email có thể đã được xác nhận, hãy thử đăng nhập bằng mật khẩu.');
      if(live){setOk(true);setStatus('Email đã được xác thực và đăng nhập thành công! Nếu là tài khoản giáo viên mới, Admin cần cấp quyền trước khi sử dụng.');}
    }catch(err){
      if(live){setOk(false);setStatus(authMessage(err));}
    }finally{
      // Auth fragments may contain live access/refresh tokens. Clear from browser address bar.
      window.history.replaceState({},document.title,window.location.pathname);
    }
  })();
  return()=>{live=false;};
 },[]);
 return <div className="auth-wrap"><div className="auth-card auth-callback-card">
    <div className="brand-mark large">IC3</div>
    <h1>{ok===null?'Đang xác thực…':ok?'Xác thực thành công':'Không thể hoàn tất đăng nhập'}</h1>
    <div role="status" aria-live="polite" className="notice-box">{status}</div>
    <a className="btn primary full" href="/">Về trang đăng nhập / quản lý</a>
    {!ok&&<p className="muted">Nếu email đã xác minh, hãy mở trang chính và đăng nhập. Không cần đăng ký tài khoản lần nữa.</p>}
   </div></div>;
}
