import {createClient} from "npm:@supabase/supabase-js@2.119.0";

// QLPM Google OAuth 2.0 (authorization code + PKCE), for teachers' personal My Drive.
// verify_jwt MUST be false because Google's GET callback has no Supabase JWT.
// All POST actions independently verify the Supabase user JWT and profile.
type AnyMap = Record<string,any>;
const HOME="https://phong-may.vercel.app";
const functionPath="/functions/v1/google-drive-oauth";
const clientScopes=[
 "https://www.googleapis.com/auth/drive.file",
 "https://www.googleapis.com/auth/spreadsheets",
 "openid","email"
].join(" ");
const headers=(origin:string)=>({
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
 "Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS",
 "Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type","Vary":"Origin"
});
const okOrigin=(s:string)=>s===HOME||s==="https://phong-may-avstinhoc.vercel.app"||
 /^http:\/\/(?:localhost|127\.0\.0\.1):\d{2,5}$/.test(s);
const error=(message:string,status=400)=>Object.assign(new Error(message),{status});
const json=(data:AnyMap,status:number,origin:string)=>new Response(JSON.stringify(data),{status,headers:headers(origin)});
const encoder=new TextEncoder();
const b64=(b:Uint8Array)=>btoa(String.fromCharCode(...b));
const fromB64=(s:string)=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
const base64url=(b:Uint8Array)=>b64(b).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const randomToken=(n:number)=>base64url(crypto.getRandomValues(new Uint8Array(n)));
async function hash(s:string){return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(s))));}
function env(name:string){
 const val=Deno.env.get(name);
 if(!val)throw error("Máy chủ chưa cấu hình "+name+" trong Supabase Edge Secrets.",503);
 return val;
}
function oauthSettings(){
 const client=env("GOOGLE_OAUTH_CLIENT_ID"),secret=env("GOOGLE_OAUTH_CLIENT_SECRET");
 const redirect=env("GOOGLE_OAUTH_REDIRECT_URI");
 const expected=env("SUPABASE_URL").replace(/\/+$/,"")+functionPath;
 if(redirect!==expected||!redirect.startsWith("https://"))
  throw error("GOOGLE_OAUTH_REDIRECT_URI phải đúng địa chỉ "+expected,503);
 return {client,secret,redirect};
}
async function aesKey(){
 let bytes:Uint8Array;
 try{bytes=fromB64(env("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"));}
 catch{throw error("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY phải là Base64 của đúng 32 byte.",503);}
 if(bytes.length!==32)throw error("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY phải giải mã được đúng 32 byte.",503);
 return crypto.subtle.importKey("raw",bytes,"AES-GCM",false,["encrypt","decrypt"]);
}
async function protect(raw:string,userId:string){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cypher=await crypto.subtle.encrypt(
  {name:"AES-GCM",iv,additionalData:encoder.encode(userId)},
  await aesKey(),encoder.encode(raw));
 return {refresh_token_ciphertext:b64(new Uint8Array(cypher)),refresh_token_iv:b64(iv)};
}
async function reveal(row:AnyMap,userId:string){
 try{
  const data=await crypto.subtle.decrypt(
   {name:"AES-GCM",iv:fromB64(row.refresh_token_iv),additionalData:encoder.encode(userId)},
   await aesKey(),fromB64(row.refresh_token_ciphertext));
  return new TextDecoder().decode(data);
 }catch{throw error("Không giải mã được quyền Google. Cần kiểm tra khóa mã hóa trước khi thay đổi.",503);}
}
function adminClient(){
 return createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{
  auth:{persistSession:false,autoRefreshToken:false}
 });
}
async function authorizeTeacher(req:Request){
 const jwt=req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
 if(!jwt)throw error("Vui lòng đăng nhập lại QLPM.",401);
 const client=createClient(env("SUPABASE_URL"),
  Deno.env.get("SUPABASE_ANON_KEY")||env("SUPABASE_PUBLISHABLE_KEY"),{
  global:{headers:{Authorization:"Bearer "+jwt}},
  auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error:authError}=await client.auth.getUser(jwt);
 if(authError||!data.user)throw error("Phiên đăng nhập QLPM không hợp lệ.",401);
 const id=data.user.id;
 const {data:profile,error:profileError}=await client.from("profiles")
  .select("role,is_active").eq("id",id).maybeSingle();
 if(profileError||!profile?.is_active||!["admin","teacher","staff"].includes(profile.role))
  throw error("Tài khoản chưa được cấp quyền giáo viên.",403);
 return id;
}
function landing(success:boolean){
 const title=success?"Đã kết nối Google Drive":"Không thể kết nối Google Drive";
 const note=success?"Bạn có thể quay lại QLPM để tạo Sheets cho trường.":"Đóng cửa sổ này và thử lại trong QLPM.";
 // No access/refresh token or OAuth authorization code appears in the page.
 const signal=JSON.stringify({type:"qlpm:google-drive",ok:success});
 const html="<!doctype html><html lang='vi'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"+
  "<title>"+title+"</title><body style='font-family:Arial,sans-serif;background:#f4fbfa;padding:36px;color:#153b40'>"+
  "<h2>"+title+"</h2><p>"+note+"</p><a href='"+HOME+"'>Quay lại Phưn QLPM</a>"+
  "<script>try{if(window.opener)window.opener.postMessage("+signal+","+JSON.stringify(HOME)+");window.close()}catch(e){}</script></body></html>";
 return new Response(html,{status:200,headers:{
  "Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store",
  "Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff",
  "Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
 }});
}
async function callback(req:Request){
 const incoming=new URL(req.url);
 const state=incoming.searchParams.get("state")||"";
 if(!/^[A-Za-z0-9_-]{30,100}$/.test(state))return landing(false);
 const store=adminClient();
 const digest=await hash(state);
 // Atomically claim a non-expired state. Replays and CSRF are rejected.
 const {data:pending,error:stateError}=await store.from("google_oauth_states")
   .update({consumed_at:new Date().toISOString()}).eq("state_hash",digest)
   .is("consumed_at",null).gt("expires_at",new Date().toISOString())
   .select("owner_id,code_verifier").maybeSingle();
 if(stateError||!pending||incoming.searchParams.get("error"))return landing(false);
 const code=incoming.searchParams.get("code");
 if(!code||code.length>4096)return landing(false);
 try{
  const auth=oauthSettings();
  const response=await fetch("https://oauth2.googleapis.com/token",{
   method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({
    code,client_id:auth.client,client_secret:auth.secret,
    redirect_uri:auth.redirect,grant_type:"authorization_code",
    code_verifier:pending.code_verifier
   })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.refresh_token||!data.access_token)
   return landing(false);
  const google=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{
   headers:{"Authorization":"Bearer "+data.access_token}
  }).catch(()=>null);
  const userInfo=google?.ok?await google.json().catch(()=>({})):{};
  const encrypted=await protect(data.refresh_token,pending.owner_id);
  const {error:dbError}=await store.from("google_drive_connections").upsert({
   owner_id:pending.owner_id,google_email:String(userInfo.email||"").slice(0,320),
   scopes:String(data.scope||clientScopes).slice(0,1024),
   ...encrypted,updated_at:new Date().toISOString()
  },{onConflict:"owner_id"});
  if(dbError)return landing(false);
  return landing(true);
 }catch{
  return landing(false);
 }
}
Deno.serve(async(req:Request)=>{
 const parsed=new URL(req.url);
 if(req.method==="GET")return callback(req);
 const origin=req.headers.get("Origin")||HOME;
 const allowed=okOrigin(origin);
 if(req.method==="OPTIONS")
  return new Response(allowed?null:"Origin không được phép.",{
   status:allowed?204:403,headers:headers(allowed?origin:HOME)
  });
 if(!allowed)return json({error:"Origin không được phép."},403,HOME);
 if(req.method!=="POST")return json({error:"Chỉ hỗ trợ POST."},405,origin);
 try{
  const ownerId=await authorizeTeacher(req);
  const {action}=await req.json().catch(()=>({}));
  const store=adminClient();
  if(action==="status"){
   const {data,error:dbError}=await store.from("google_drive_connections")
     .select("google_email,updated_at").eq("owner_id",ownerId).maybeSingle();
   if(dbError)throw error("Không kiểm tra được kết nối Google.",503);
   const configured=["GOOGLE_OAUTH_CLIENT_ID","GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REDIRECT_URI","GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"]
     .every(x=>!!Deno.env.get(x));
   return json({connected:!!data,configured,email:data?.google_email||null},200,origin);
  }
  if(action==="start"){
   const auth=oauthSettings();
   await aesKey();
   const state=randomToken(32),verifier=randomToken(64);
   const challenge=await hash(verifier);
   const {error:stateError}=await store.from("google_oauth_states").insert({
    state_hash:await hash(state),owner_id:ownerId,code_verifier:verifier,
    expires_at:new Date(Date.now()+10*60*1000).toISOString()
   });
   if(stateError)throw error("Không tạo được phiên kết nối Google.",503);
   const query=new URLSearchParams({
    client_id:auth.client,redirect_uri:auth.redirect,response_type:"code",
    scope:clientScopes,state,code_challenge:challenge,
    code_challenge_method:"S256",access_type:"offline",
    prompt:"consent select_account"
   });
   return json({authorization_url:"https://accounts.google.com/o/oauth2/v2/auth?"+query},200,origin);
  }
  if(action==="disconnect"){
   const {data}=await store.from("google_drive_connections")
     .select("refresh_token_ciphertext,refresh_token_iv").eq("owner_id",ownerId).maybeSingle();
   if(data){
    try{
     const token=await reveal(data,ownerId);
     await fetch("https://oauth2.googleapis.com/revoke",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({token})
     });
    }catch{/* Removing local access still takes precedence. */}
   }
   const {error:deleteError}=await store.from("google_drive_connections")
    .delete().eq("owner_id",ownerId);
   if(deleteError)throw error("Không thể ngắt liên kết Google.",500);
   return json({success:true},200,origin);
  }
  throw error("Tác vụ Google OAuth không hợp lệ.",400);
 }catch(e){
  return json({error:e instanceof Error?e.message:"Lỗi xác thực Google."},
   typeof(e as AnyMap)?.status==="number"?(e as AnyMap).status:500,origin);
 }
});
