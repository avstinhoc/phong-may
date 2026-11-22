import {createClient} from "npm:@supabase/supabase-js@2.119.0";
import webpush from "npm:web-push@3.6.7";

// This function is public at the gateway only because Student Web uses custom
// opaque sessions rather than Supabase Auth JWTs. Every action verifies identity.
// Dispatcher calls additionally require a secret stored in encrypted Vault.
const allowedHosts = [
 "phong-may.vercel.app",
 "phong-may-avstinhoc.vercel.app",
];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function allowedOrigin(origin:string){
 if(!origin)return true; // server-side webhook carries no Origin header
 try{
  const u=new URL(origin);
  return (u.protocol==="https:"&&(allowedHosts.includes(u.hostname)||
   /^phong-[a-z0-9-]+-avstinhoc\.vercel\.app$/.test(u.hostname)))||
   (u.protocol==="http:"&&/^(localhost|127\.0\.0\.1)$/.test(u.hostname));
 }catch{return false}
}
function cors(origin:string){
 return {"Access-Control-Allow-Origin":origin||"https://phong-may.vercel.app",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info,x-student-session,x-qlpm-push-dispatch",
  "Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin"};
}
const response=(status:number,body:Record<string,unknown>,origin:string)=>
 new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8",...cors(origin)}});
function safeEndpoint(endpoint:string){
 try{
  if(endpoint.length>2048||endpoint.length<20)return false;
  const url=new URL(endpoint);
  const host=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||url.port||url.hash)return false;
  return ["fcm.googleapis.com","fcmregistrations.googleapis.com","android.googleapis.com",
   "updates.push.services.mozilla.com","push.services.mozilla.com",
   "web.push.apple.com"].includes(host) ||
   host.endsWith(".push.apple.com")||host.endsWith(".notify.windows.com")||
   host.endsWith(".push.services.mozilla.com")||host.endsWith(".push.microsoft.com");
 }catch{return false}
}
const validKey=(key:unknown,min:number,max:number)=>typeof key==="string"&&
 key.length>=min&&key.length<=max&&/^[A-Za-z0-9_-]+$/.test(key);
type Identity={kind:"student"|"teacher",id:string,classId?:string,schoolId?:string};
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(!allowedOrigin(origin))return response(403,{error:"Nguồn truy cập không hợp lệ"},origin);
 if(req.method==="OPTIONS")return response(200,{},origin);
 if(req.method!=="POST")return response(405,{error:"Chỉ hỗ trợ POST"},origin);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return response(503,{error:"Máy chủ Push chưa cấu hình"},origin);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 let data:any=null;
 try{data=await req.json()}catch{return response(400,{error:"Yêu cầu không hợp lệ"},origin)}
 const action=String(data?.action||"");
 try{
  // Only service_role can call this RPC and read encrypted VAPID configuration.
  const {data:settings,error:settingsError}=await admin.rpc("qlpm_push_server_config");
  if(settingsError)throw new Error("push configuration unavailable");
  if(!settings?.public_key||!settings?.private_key||!settings?.dispatch_secret)
   return response(503,{error:"Web Push chưa được cấu hình đầy đủ trên máy chủ"},origin);
  if(action==="public_key")
   return response(200,{publicKey:settings.public_key},origin);

  if(action==="dispatch"){
   if(!data?.event_id||!uuid.test(data.event_id)||
     req.headers.get("x-qlpm-push-dispatch")!==settings.dispatch_secret)
     return response(403,{error:"Không được phép gửi thông báo"},origin);
   const now=new Date();
   const {data:event,error:claimError}=await admin.from("qlpm_push_events")
    .update({state:"processing",claimed_at:now.toISOString()})
    .eq("id",data.event_id).eq("state","pending").select("*").maybeSingle();
   if(claimError)return response(503,{error:"Không đọc được sự kiện"},origin);
   if(!event)return response(200,{ok:true,skipped:true},origin);
   let subs:any[]=[];
   if(event.event_type==="message_teacher"){
    const {data:list,error:e}=await admin.from("qlpm_push_subscriptions").select("*")
     .eq("owner_kind","teacher").eq("teacher_id",event.teacher_id).limit(100);
    if(e)throw e;
    subs=list||[];
   }else if(event.event_type==="message_student"){
    const {data:list,error:e}=await admin.from("qlpm_push_subscriptions").select("*")
     .eq("owner_kind","student").eq("student_id",event.student_id)
     .eq("class_id",event.class_id).limit(100);
    if(e)throw e;
    subs=list||[];
   }else{
    const {data:roster,error:rosterError}=await admin.from("students").select("id")
      .eq("class_id",event.class_id).eq("status","active").limit(400);
    if(rosterError)throw rosterError;
    const ids=(roster||[]).map((s:any)=>s.id);
    if(ids.length){
     const {data:list,error:e}=await admin.from("qlpm_push_subscriptions").select("*")
      .eq("owner_kind","student").eq("class_id",event.class_id)
      .in("student_id",ids).limit(600);
     if(e)throw e;
     subs=list||[];
    }
   }
   const teacher=event.event_type==="message_teacher";
   const message=teacher?"Có tin nhắn mới từ học sinh":
    event.event_type==="message_student"?"Giáo viên vừa nhắn tin cho em":
    event.event_type==="announcement"?"Giáo viên vừa đăng thông báo mới":
    "Giáo viên vừa giao bài tập mới";
   const payload=JSON.stringify({
    title:teacher?"QLPM Teacher":"QLPM Student",
    body:message, // intentionally generic: no names, messages or assignment titles
    url:teacher?"/?classroom=1":"/student-web?classroom=1",
    tag:teacher?"qlpm-teacher-chat":"qlpm-student-classroom"
   });
   webpush.setVapidDetails("https://phong-may.vercel.app",
    settings.public_key,settings.private_key);
   let successes=0,failures=0;
   for(let i=0;i<subs.length;i+=8){
    await Promise.all(subs.slice(i,i+8).map(async (s:any)=>{
     try{
      const r=await webpush.sendNotification({
       endpoint:s.endpoint,expirationTime:null,
       keys:{p256dh:s.p256dh,auth:s.auth_secret}
      },payload,{TTL:240,timeout:4800});
      if(r.statusCode===201||r.statusCode===202)successes++;
      else failures++;
     }catch(e){
      failures++;
      if([404,410].includes((e as any)?.statusCode)){
       await admin.from("qlpm_push_subscriptions").delete().eq("id",s.id);
      }
     }
    }));
   }
   await admin.from("qlpm_push_events").update({
    state:"delivered",delivered_at:new Date().toISOString(),attempts:(event.attempts||0)+1
   }).eq("id",event.id);
   // Cheap, opportunistic retention cleanup without a constantly running cron job.
   if(Math.random()<0.025)await admin.rpc("qlpm_push_prune_events");
   return response(200,{ok:true,attempted:subs.length,successes,failures},origin);
  }

  // Login via Supabase teacher JWT or verified custom student session.
  let identity:Identity|null=null;
  const studentToken=req.headers.get("x-student-session");
  if(studentToken){
   if(!/^[a-f0-9]{64}$/.test(studentToken))return response(401,{error:"Phiên học sinh không hợp lệ"},origin);
   const {data:who,error:e}=await admin.rpc("qlpm_student_desktop_whoami",{p_session_token:studentToken});
   if(e)return response(503,{error:"Không xác minh được phiên học sinh trên máy chủ"},origin);
   if(!who?.student_id)return response(401,{error:"Phiên học sinh đã hết hạn. Vui lòng đăng nhập lại"},origin);
   const {data:st}=await admin.from("students").select("id,status,class_id,school_id")
    .eq("id",who.student_id).maybeSingle();
   if(!st||st.status!=="active"||!st.class_id)
    return response(403,{error:"Học sinh chưa có lớp hợp lệ"},origin);
   identity={kind:"student",id:st.id,classId:st.class_id,schoolId:st.school_id};
  }else{
   const token=req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
   if(!token)return response(401,{error:"Cần đăng nhập để bật thông báo"},origin);
   const {data:{user},error:e}=await admin.auth.getUser(token);
   if(e||!user)return response(401,{error:"Phiên giáo viên đã hết hạn"},origin);
   const {data:profile}=await admin.from("profiles").select("role,is_active")
    .eq("id",user.id).maybeSingle();
   if(!profile||profile.is_active===false||
      !["teacher","admin","giaovien","giaovien","giáo viên"].includes(String(profile.role).toLowerCase()))
     return response(403,{error:"Tài khoản không có quyền giáo viên"},origin);
   identity={kind:"teacher",id:user.id};
  }

  const endpoint=String(data?.subscription?.endpoint||data?.endpoint||"");
  if(!safeEndpoint(endpoint))return response(400,{error:"Địa chỉ dịch vụ Push không hợp lệ"},origin);
  if(action==="unsubscribe"){
   const where=admin.from("qlpm_push_subscriptions").delete().eq("endpoint",endpoint);
   if(identity.kind==="student")await where.eq("owner_kind","student").eq("student_id",identity.id);
   else await where.eq("owner_kind","teacher").eq("teacher_id",identity.id);
   return response(200,{ok:true},origin);
  }
  if(action!=="subscribe")return response(400,{error:"Thao tác không hợp lệ"},origin);
  const p256dh=data?.subscription?.keys?.p256dh,auth=data?.subscription?.keys?.auth;
  if(!validKey(p256dh,60,180)||!validKey(auth,16,100))
   return response(400,{error:"Khóa đăng ký thông báo không hợp lệ"},origin);
  const record={
   endpoint,p256dh,auth_secret:auth,
   owner_kind:identity.kind,
   student_id:identity.kind==="student"?identity.id:null,
   teacher_id:identity.kind==="teacher"?identity.id:null,
   class_id:identity.kind==="student"?identity.classId:null,
   school_id:identity.kind==="student"?identity.schoolId:null,
   touched_at:new Date().toISOString()
  };
  const {error:insertError}=await admin.from("qlpm_push_subscriptions")
   .upsert(record,{onConflict:"endpoint"});
  if(insertError){
   console.error("push subscription save error",insertError.code);
   return response(503,{error:"Không lưu được thiết bị nhận thông báo"},origin);
  }
  return response(200,{ok:true},origin);
 }catch(e){
  console.error("QLPM push request error",(e as Error)?.message||"unknown");
  return response(503,{error:"Dịch vụ thông báo chưa sẵn sàng, vui lòng thử lại"},origin);
 }
});
