import React,{useEffect,useState} from 'react';
import {Bell,BellOff,LoaderCircle} from 'lucide-react';
import {enableClassroomWebPush,disableClassroomWebPush,isWebPushSubscribed,webPushSupported}
 from './pushNotifications.js';
import './classroom.css';

// Student uses a short-lived QLPM session, Teacher uses Supabase Auth JWT.
// Never request permission until the user presses Enable.
export default function PushPermission({studentToken=null}){
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[status,setStatus]=useState('');
 const supported=webPushSupported();
 useEffect(()=>{
  let alive=true;
  if(supported){
   isWebPushSubscribed().then(value=>{if(alive)setEnabled(value)})
    .catch(()=>{});
  }
  return()=>{alive=false};
 },[studentToken,supported]);
 async function toggle(){
  setBusy(true);setError('');setStatus('');
  try{
   if(enabled){
    await disableClassroomWebPush(studentToken);
    setEnabled(false);setStatus('Đã tắt thông báo trên thiết bị này.');
   }else{
    await enableClassroomWebPush(studentToken);
    setEnabled(true);setStatus('Đã bật thông báo cho thiết bị này.');
   }
  }catch(e){setError(e.message||'Không thể cài đặt thông báo')}
  finally{setBusy(false)}
 }
 return <div className="classroom-push-area">
   <button type="button" className="classroom-push-button" onClick={toggle}
    disabled={!supported||busy} aria-pressed={enabled}
    title={supported?'Bật hoặc tắt thông báo hệ thống':'Thiết bị không hỗ trợ thông báo nền'}>
    {busy?<LoaderCircle size={17}/>:enabled?<BellOff size={17}/>:<Bell size={17}/>}
    {busy?'Đang thiết lập…':enabled?'Tắt thông báo':'Bật thông báo'}
   </button>
   {!supported&&<small>Trình duyệt này không hỗ trợ Web Push. iPhone: thêm web vào Màn hình chính.</small>}
   {error&&<small role="alert" className="classroom-push-error">{error}</small>}
   {status&&<small role="status" className="classroom-push-success">{status}</small>}
 </div>;
}
