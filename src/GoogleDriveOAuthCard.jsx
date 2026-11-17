import React,{useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from './lib/supabase';
import {ShieldCheck,Link2,Unlink,RefreshCw} from 'lucide-react';

const readable=async e=>{
 if(e?.context?.json){
  try{const value=await e.context.json();if(value?.error)return value.error;}catch{}
 }
 return e?.message||'Chưa kết nối được tài khoản Google.';
};
async function callOAuth(action){
 const {data,error}=await supabase.functions.invoke('google-drive-oauth',{body:{action}});
 if(error)throw Error(await readable(error));
 if(data?.error)throw Error(data.error);
 return data||{};
}
export function GoogleDriveOAuthCard({onConnected}){
 const [info,setInfo]=useState({connected:false,configured:false,email:null});
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const popupRef=useRef(null),handledRef=useRef(false);
 const getStatus=useCallback(async()=>{
  const value=await callOAuth('status');
  setInfo(value);
  return value;
 },[]);
 useEffect(()=>{
  let active=true;
  getStatus().catch(e=>{if(active)setError(e.message);});
  const onMessage=async e=>{
   const host=import.meta.env.VITE_SUPABASE_URL;
   if(!host||e.origin!==new URL(host).origin||
     e.data?.type!=='qlpm:google-drive'||(popupRef.current&&e.source!==popupRef.current))return;
   if(e.data.ok){
    handledRef.current=true;setError('');setMessage('Google Drive đã kết nối. Giờ có thể tạo file Sheets riêng cho trường.');
    try{await getStatus();onConnected?.();}catch(err){setError(err.message);}
   }else setError('Google chưa cấp quyền. Kiểm tra tài khoản Google, màn hình đồng ý và OAuth Test users.');
  };
  const onFocus=async()=>{
   // Google may isolate the popup opener; the status call is safe and token-free.
   try{
    const before=info.connected;
    const latest=await getStatus();
    if(!before&&latest.connected&&!handledRef.current){
      handledRef.current=true;
      setError('');setMessage('Đã kết nối Google Drive. Có thể tạo file Sheets ngay.');
      onConnected?.();
    }
   }catch{}
  };
  window.addEventListener('message',onMessage);
  window.addEventListener('focus',onFocus);
  return()=>{active=false;window.removeEventListener('message',onMessage);window.removeEventListener('focus',onFocus);};
 },[getStatus,info.connected,onConnected]);
 async function connect(){
  setError('');setMessage('');setLoading(true);handledRef.current=false;
  // Open synchronously on the click so the OAuth popup is not blocked.
  const popup=window.open('about:blank','qlpm-google-drive','width=570,height=720,noopener=false');
  popupRef.current=popup;
  if(popup)popup.document.body.innerHTML='<p style="font:16px Arial;padding:24px">Đang mở trang xác thực Google...</p>';
  try{
   const data=await callOAuth('start');
   if(!/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/.test(data.authorization_url||''))
    throw Error('Google chưa trả về đường dẫn xác thực hợp lệ.');
   if(popup&&!popup.closed)popup.location.assign(data.authorization_url);
   else window.location.assign(data.authorization_url);
  }catch(e){
   if(popup&&!popup.closed)popup.close();
   setError(e.message||String(e));
  }finally{setLoading(false);}
 }
 async function disconnect(){
  if(!window.confirm('Ngắt kết nối Google Drive của tài khoản này? Các file Sheets và học sinh sẽ không bị xóa.'))return;
  setLoading(true);setError('');setMessage('');
  try{
   await callOAuth('disconnect');setInfo({connected:false,configured:true,email:null});
   setMessage('Đã ngắt kết nối Google Drive. File Sheets vẫn được giữ nguyên.');
  }catch(e){setError(e.message);}finally{setLoading(false);}
 }
 async function refresh(){
  setLoading(true);setError('');
  try{await getStatus();}catch(e){setError(e.message);}finally{setLoading(false);}
 }
 return <section className="sheets-oauth-card">
  <div className="sheets-oauth-heading">
   <span className="sheets-oauth-icon"><ShieldCheck size={20}/></span>
   <div className="sheets-oauth-heading-text">
    <b>Google Drive cá nhân · OAuth 2.0</b>
    <small>Tạo Sheets trong My Drive của giáo viên, không cần Shared Drive hoặc trả phí</small>
   </div>
   <span className={'sheets-oauth-status '+(info.connected?'is-connected':'')}>
    {info.connected?'Đã kết nối':'Chưa kết nối'}
   </span>
  </div>
  <div className="sheets-oauth-body">
   {info.connected?<p>Đang sử dụng: <b>{info.email||'Tài khoản Google đã cấp quyền'}</b>. Mỗi giáo viên giữ liên kết riêng, không thay đổi quyền Admin/Giáo viên QLPM.</p>:
    <p>Đăng nhập tài khoản Google của bạn và đồng ý cấp quyền Sheets/Drive. QLPM sẽ sao chép file mẫu thành file mới khi bạn thêm trường.</p>}
   <div className="sheets-oauth-actions">
    <button type="button" className="btn primary" onClick={connect} disabled={loading}>
     <Link2 size={15}/> {info.connected?'Kết nối lại Google':'Kết nối Google Drive'}
    </button>
    <button type="button" className="btn outline" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Kiểm tra</button>
    {info.connected&&<button type="button" className="btn outline" onClick={disconnect} disabled={loading}><Unlink size={15}/> Ngắt kết nối</button>}
   </div>
   {!info.configured&&!info.connected&&<small className="sheets-oauth-warning">Nếu nút kết nối báo thiếu OAuth Secrets, quản trị viên cần hoàn tất bước 6 trong Supabase. Không gửi khóa mã hóa hoặc Client Secret qua chat.</small>}
   {error&&<p className="sheets-oauth-error" role="alert">{error}</p>}
   {message&&<p className="sheets-oauth-success" role="status">{message}</p>}
  </div>
 </section>;
}
