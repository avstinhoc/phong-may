import { createClient } from "npm:@supabase/supabase-js@2.119.0";

// Custom student sessions are NOT Supabase Auth JWTs. The platform must use
// verify_jwt=false, and every non-OPTIONS request is authenticated here.
// No public URLs, no Storage RLS policies, no broad service-role read endpoint.
const BUCKET = "qlpm-classroom-private";
const LIMIT = 8 * 1024 * 1024;
const FILES: Record<string,string> = {
 jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",
 pdf:"application/pdf",doc:"application/msword",
 docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 xls:"application/vnd.ms-excel",
 xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 ppt:"application/vnd.ms-powerpoint",
 pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",
 txt:"text/plain",csv:"text/csv"
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const imageMime=(value:string)=>/^image\/(jpeg|png|webp|gif)$/.test(value);
const safeName=(name:string)=>name.normalize("NFKC").replace(/[\x00-\x1F\x7F<>:"/\\|?*]/g,"_").trim().slice(0,175);
const originOk=(origin:string)=> !origin ||
  /^https:\/\/(?:phong-may|phong-may-avstinhoc|phong-[a-z0-9-]+-avstinhoc)\.vercel\.app$/.test(origin) ||
  /^http:\/\/(?:localhost|127\.0\.0\.1):\d{2,5}$/.test(origin);
const cors=(origin:string)=>({
 "Access-Control-Allow-Origin":origin||"https://phong-may.vercel.app",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-student-session,x-client-info",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Cache-Control":"no-store",
 "Vary":"Origin"
});
const respond=(status:number,value:Record<string,unknown>,origin:string)=>
 new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(origin)}});

async function typeAllowed(file:File,extension:string):Promise<boolean>{
 const bytes=new Uint8Array(await file.slice(0,512).arrayBuffer());
 const has=(...sig:number[])=>sig.every((b,i)=>bytes[i]===b);
 const type=FILES[extension];
 if(!type)return false;
 // File extensions and actual magic signatures must agree; reject spoofed
 // documents/executables, HTML/SVG and ZIP archives disguised as other files.
 if(extension==="jpg"||extension==="jpeg")return has(255,216,255);
 if(extension==="png")return has(137,80,78,71,13,10,26,10);
 if(extension==="gif")return has(71,73,70,56)&&(bytes[4]===55||bytes[4]===57);
 if(extension==="webp")return String.fromCharCode(...bytes.slice(0,4))==="RIFF" &&
  String.fromCharCode(...bytes.slice(8,12))==="WEBP";
 if(extension==="pdf")return has(37,80,68,70,45);
 if(["docx","xlsx","pptx"].includes(extension))return has(80,75,3,4);
 if(["doc","xls","ppt"].includes(extension))return has(208,207,17,224,161,177,26,225);
 if(["txt","csv"].includes(extension))return !bytes.includes(0) &&
  !new TextDecoder("utf-8",{fatal:false}).decode(bytes).trimStart().toLowerCase().startsWith("<!doctype html");
 return false;
}

type Participant={
 kind:"student"|"teacher";id:string;classId?:string;schoolId?:string;
};
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(!originOk(origin))return respond(403,{error:"Nguồn truy cập không hợp lệ"},origin);
 if(req.method==="OPTIONS")return respond(200,{},origin);
 if(req.method!=="POST")return respond(405,{error:"Chỉ hỗ trợ POST"},origin);
 const url=Deno.env.get("SUPABASE_URL");
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return respond(503,{error:"Dịch vụ lưu trữ chưa được cấu hình"},origin);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  let identity:Participant|null=null;
  const studentToken=req.headers.get("x-student-session");
  if(studentToken){
   if(studentToken.length>2048)return respond(401,{error:"Phiên học sinh không hợp lệ"},origin);
   const {data:who,error:e}=await admin.rpc("qlpm_student_desktop_whoami",{p_session_token:studentToken});
   if(e||!who?.student_id)return respond(401,{error:"Phiên học sinh đã hết hạn"},origin);
   const {data:student}=await admin.from("students").select("id,school_id,class_id,status")
     .eq("id",who.student_id).single();
   if(!student||student.status!=="active"||student.school_id!==who.school_id||!student.class_id)
    return respond(403,{error:"Học sinh không còn thuộc lớp học hợp lệ"},origin);
   identity={kind:"student",id:student.id,classId:student.class_id,schoolId:student.school_id};
  }else{
   const token=req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
   if(!token)return respond(401,{error:"Vui lòng đăng nhập trước khi gửi file"},origin);
   const {data:{user},error:e}=await admin.auth.getUser(token);
   if(e||!user)return respond(401,{error:"Phiên giáo viên đã hết hạn"},origin);
   identity={kind:"teacher",id:user.id};
  }
  const content=req.headers.get("content-type")||"";
  let action="",studentId="",body="",file:File|null=null,messageId="";
  if(content.includes("multipart/form-data")){
   const form=await req.formData();
   action=String(form.get("action")||"upload");
   studentId=String(form.get("student_id")||"");
   body=String(form.get("body")||"").trim();
   file=form.get("file") instanceof File ? form.get("file") as File : null;
  }else{
   const payload=await req.json().catch(()=>null);
   action=String(payload?.action||"");
   messageId=String(payload?.message_id||"");
  }
  if(action==="sign"){
   if(!UUID.test(messageId))return respond(400,{error:"Mã tệp không hợp lệ"},origin);
   const {data:m,error:e}=await admin.from("qlpm_classroom_messages")
    .select("id,student_id,school_id,class_id,teacher_id,file_name,file_path,file_type,file_size")
    .eq("id",messageId).maybeSingle();
   if(e||!m?.file_path)return respond(404,{error:"Không tìm thấy tệp"},origin);
   let permitted=false;
   if(identity.kind==="student")permitted=m.student_id===identity.id &&
     m.class_id===identity.classId && m.school_id===identity.schoolId;
   else{
    const {data:c}=await admin.from("classes").select("id,school_id,created_by").eq("id",m.class_id).single();
    permitted=!!c&&c.school_id===m.school_id&&c.created_by===identity.id;
   }
   if(!permitted)return respond(403,{error:"Bạn không có quyền xem tệp này"},origin);
   const options=imageMime(m.file_type)?undefined:{download:safeName(m.file_name)};
   const {data:signed,error:signError}=await admin.storage.from(BUCKET)
    .createSignedUrl(m.file_path,180,options);
   if(signError||!signed?.signedUrl)return respond(500,{error:"Không thể mở tệp đã lưu"},origin);
   return respond(200,{url:signed.signedUrl,file_name:m.file_name,
    file_type:m.file_type,file_size:m.file_size,expires_in:180},origin);
  }
  if(action!=="upload"||!file)return respond(400,{error:"Thiếu tệp đính kèm"},origin);
  if(file.size<1||file.size>LIMIT)return respond(413,{error:"Mỗi tệp phải nhỏ hơn 8 MB"},origin);
  const name=safeName(file.name||"file");
  const extension=name.split(".").at(-1)?.toLowerCase()||"";
  const mime=FILES[extension];
  if(!mime||!await typeAllowed(file,extension))
   return respond(415,{error:"Định dạng tệp không hỗ trợ hoặc nội dung không khớp. Hãy chọn ảnh, PDF, Word, Excel, PowerPoint, TXT hoặc CSV."},origin);
  if(body.length>1500)return respond(400,{error:"Tin nhắn tối đa 1500 ký tự"},origin);
  let targetStudent:any, classRecord:any;
  if(identity.kind==="student"){
   const {data:s}=await admin.from("students").select("id,school_id,class_id,status")
     .eq("id",identity.id).single();
   targetStudent=s;
  }else{
   if(!UUID.test(studentId))return respond(400,{error:"Chưa chọn học sinh nhận tệp"},origin);
   const {data:s}=await admin.from("students").select("id,school_id,class_id,status")
     .eq("id",studentId).single();
   targetStudent=s;
  }
  if(!targetStudent||targetStudent.status!=="active"||!targetStudent.class_id)
   return respond(403,{error:"Học sinh không thuộc lớp đang hoạt động"},origin);
  const {data:c}=await admin.from("classes").select("id,school_id,created_by")
   .eq("id",targetStudent.class_id).single();
  classRecord=c;
  if(!classRecord||classRecord.school_id!==targetStudent.school_id||!classRecord.created_by)
   return respond(403,{error:"Lớp chưa có giáo viên chủ nhiệm"},origin);
  if(identity.kind==="teacher"&&identity.id!==classRecord.created_by)
   return respond(403,{error:"Giáo viên không phụ trách lớp này"},origin);
  if(identity.kind==="student"&&(identity.classId!==classRecord.id||
   identity.schoolId!==classRecord.school_id))
   return respond(403,{error:"Lớp của học sinh đã thay đổi, vui lòng đăng nhập lại"},origin);

  // A minimal abuse guard on the backend. Files are stored in a private bucket.
  const since=new Date(Date.now()-60_000).toISOString();
  const {count}=await admin.from("qlpm_classroom_messages").select("id",{count:"exact",head:true})
   .eq("student_id",targetStudent.id).eq("sender_kind",identity.kind).gte("created_at",since);
  if((count||0)>(identity.kind==="student"?8:20))
   return respond(429,{error:"Bạn gửi tệp quá nhanh. Hãy thử lại sau."},origin);

  const objectPath=classRecord.id+"/"+targetStudent.id+"/"+crypto.randomUUID()+"."+extension;
  const {error:storeError}=await admin.storage.from(BUCKET)
   .upload(objectPath,file,{contentType:mime,upsert:false,cacheControl:"0"});
  if(storeError){console.error("classroom upload storage failure",storeError.message);
   return respond(500,{error:"Không lưu được tệp. Hãy thử lại."},origin);}
  const {data:created,error:insertError}=await admin.from("qlpm_classroom_messages").insert({
   school_id:classRecord.school_id,class_id:classRecord.id,student_id:targetStudent.id,
   teacher_id:classRecord.created_by,sender_kind:identity.kind,
   body,file_name:name,file_path:objectPath,file_type:mime,file_size:file.size
  }).select("id").single();
  if(insertError||!created){
   await admin.storage.from(BUCKET).remove([objectPath]);
   console.error("classroom message attachment metadata insert failed",insertError?.code);
   return respond(500,{error:"Không lưu được tin nhắn đính kèm"},origin);
  }
  return respond(200,{ok:true,message_id:created.id},origin);
 }catch(e){
  console.error("classroom-attachments unexpected error",(e as Error)?.message);
  return respond(500,{error:"Có lỗi khi xử lý tệp. Vui lòng thử lại."},origin);
 }
});
