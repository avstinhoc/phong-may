// Native Teacher OAuth: external browser + custom scheme PKCE code exchange.
// Never transfer website sessions to the Windows app. No student/staff role from client metadata.
export const TEACHER_OAUTH_CALLBACK='qlpmteacher://auth/callback';
const PENDING_KEY='qlpm.teacher.oauth.pending';
const MAX_AGE=10*60*1000;
export const isTeacherNative=()=>typeof window!=='undefined'&&Boolean(window.__TAURI_INTERNALS__);
export const parseTeacherCallback=value=>{
 try{
  const u=new URL(value);
  if(u.protocol!=='qlpmteacher:'||u.hostname!=='auth'||u.pathname!=='/callback'
    ||u.username||u.password||u.port||u.hash)return null;
  return {code:u.searchParams.get('code')||'',flowId:u.searchParams.get('sb_flow_id')||'',
    error:u.searchParams.get('error_description')||u.searchParams.get('error')||''};
 }catch{return null;}
};
const recentPending=()=>{
 try{return Date.now()-Number(localStorage.getItem(PENDING_KEY))<MAX_AGE;}catch{return false;}
};
export async function startTeacherNativeGoogle(auth,{linkExisting=false}={}){
 if(!isTeacherNative())throw Error('Native OAuth chỉ sử dụng trong QLPM Teacher Windows.');
 if(!window.__TAURI__?.core?.invoke||!window.__TAURI__?.deepLink)
  throw Error('Thiếu plugin đăng nhập Windows. Hãy cài bản Teacher mới nhất.');
 const method=linkExisting?'linkIdentity':'signInWithOAuth';
 if(typeof auth?.[method]!=='function')throw Error('Phiên bản xác thực chưa hỗ trợ Google.');
 const {data,error}=await auth[method]({
  provider:'google',
  options:{redirectTo:TEACHER_OAUTH_CALLBACK,skipBrowserRedirect:true}
 });
 if(error)throw error;
 if(!data?.url)throw Error('Không nhận được đường dẫn Google OAuth.');
 try{localStorage.setItem(PENDING_KEY,String(Date.now()));}catch{}
 try{await window.__TAURI__.core.invoke('open_teacher_google_oauth',{url:data.url});}
 catch(e){try{localStorage.removeItem(PENDING_KEY);}catch{};throw e;}
 return data;
}
export async function handleTeacherAuthCallback(value,auth){
 if(!isTeacherNative())return false;
 const payload=parseTeacherCallback(value);
 if(!payload||!recentPending())return false;
 if(payload.error) {
  try{localStorage.removeItem(PENDING_KEY);}catch{}
  window.dispatchEvent(new CustomEvent('qlpm-native-oauth-error',{detail:{message:payload.error}}));
  return false;
 }
 if(!/^[a-zA-Z0-9._\-]{10,512}$/.test(payload.code))return false;
 // Consume pending state before exchange: ignore duplicate/synthetic callbacks.
 try{localStorage.removeItem(PENDING_KEY);}catch{}
 try{
  const {error}=await auth.exchangeCodeForSession(
    payload.code,
    payload.flowId?{flowId:payload.flowId}:undefined
  );
  if(error)throw error;
  window.dispatchEvent(new CustomEvent('qlpm-native-oauth-success'));
  return true;
 }catch(e){
  window.dispatchEvent(new CustomEvent('qlpm-native-oauth-error',{
   detail:{message:'Không hoàn thành đăng nhập Google Windows: '+(e?.message||String(e))}
  }));
  return false;
 }
}
export async function installTeacherNativeAuthListener(auth){
 if(!isTeacherNative()||!auth||!window.__TAURI__?.deepLink)return()=>{};
 const api=window.__TAURI__.deepLink;
 const onUrls=urls=>{
  for(const link of Array.isArray(urls)?urls:[]){void handleTeacherAuthCallback(link,auth);}
 };
 const unlisten=await api.onOpenUrl(onUrls);
 // Windows may launch the app with a deep-link URL before the listener is ready.
 const initial=await api.getCurrent();
 if(initial)onUrls(initial);
 return typeof unlisten==='function'?unlisten:()=>{};
}
