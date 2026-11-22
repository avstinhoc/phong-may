import {supabase} from '../lib/supabase.js';

// No permission prompt until a real button click. Push works with a Service
// Worker even when the classroom tab is hidden or closed (browser dependent).
const SW='/qlpm-push-sw.js';
export function webPushSupported(){
 return typeof window!=='undefined'&&window.isSecureContext &&
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function base64ToArray(base64){
 const padded=base64.replace(/-/g,'+').replace(/_/g,'/');
 const decoded=atob(padded.padEnd(Math.ceil(padded.length/4)*4,'='));
 return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
async function callPush(body,studentToken){
 if(!supabase)throw Error('Chưa kết nối máy chủ QLPM.');
 const {data,error}=await supabase.functions.invoke('qlpm-push',{
  body,headers:studentToken?{'x-student-session':studentToken}:{}
 });
 if(error){
  let message=error.message||'Dịch vụ thông báo đang lỗi';
  try{const response=await error.context?.json();if(response?.error)message=response.error}catch{}
  throw Error(message);
 }
 if(data?.error)throw Error(data.error);
 return data;
}
export async function isWebPushSubscribed(studentToken=null){
 if(!webPushSupported()||Notification.permission!=='granted')return false;
 const registration=await navigator.serviceWorker.getRegistration('/');
 if(!registration)return false;
 const current=await registration.pushManager.getSubscription();
 if(!current)return false;
 try{
  const result=await callPush({action:'status',endpoint:current.endpoint},studentToken);
  return result?.enabled===true;
 }catch{return false}
}
export async function enableClassroomWebPush(studentToken=null){
 if(!webPushSupported())throw Error(
  'Trình duyệt chưa hỗ trợ Web Push. iPhone cần thêm QLPM vào Màn hình chính.');
 // Request permission directly from the user-click handler.
 if(Notification.permission!=='granted'){
  const result=await Notification.requestPermission();
  if(result!=='granted')throw Error('Bạn chưa cho phép thông báo. Hãy bật trong cài đặt trình duyệt.');
 }
 const data=await callPush({action:'public_key'},studentToken);
 if(!data?.publicKey)throw Error('Thiếu khóa đăng ký thông báo');
 const worker=await navigator.serviceWorker.register(SW,{scope:'/'});
 const reg=await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(sub){
  const old=sub.options?.applicationServerKey;
  const desired=base64ToArray(data.publicKey);
  const oldBytes=old?new Uint8Array(old):null;
  if(oldBytes&&!(oldBytes.length===desired.length&&oldBytes.every((x,i)=>x===desired[i]))){
   await sub.unsubscribe();sub=null;
  }
 }
 if(!sub){
  sub=await reg.pushManager.subscribe({
   userVisibleOnly:true,applicationServerKey:base64ToArray(data.publicKey)
  });
 }
 try{
  await callPush({action:'subscribe',subscription:sub.toJSON()},studentToken);
 }catch(err){
  // Browser subscription can be rebound on next attempt; don't silently
  // claim that this device has a working notification registration.
  throw err;
 }
 return {ok:true};
}
export async function disableClassroomWebPush(studentToken=null){
 if(!webPushSupported())return;
 const reg=await navigator.serviceWorker.getRegistration('/');
 const sub=await reg?.pushManager.getSubscription();
 if(!sub)return;
 // Drop server ownership first. If session expired, still revoke locally.
 try{await callPush({action:'unsubscribe',endpoint:sub.endpoint},studentToken)}catch{}
 await sub.unsubscribe();
}
