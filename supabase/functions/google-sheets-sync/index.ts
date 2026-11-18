import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { importPKCS8, SignJWT } from "npm:jose@5.10.0";

type Dict = Record<string, any>;
const ORIGIN="https://phong-may.vercel.app";
const SCORE_KEYS=["QT1","QT2","HK1","QT3","QT4","HK2",...Array.from({length:5},(_,i)=>"TEST "+(i+1)),...Array.from({length:5},(_,i)=>"Mô phỏng lần "+(i+1))];
const cache:{token:string;expires:number}={token:"",expires:0};
const cors=(origin:string)=>({
 "Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store","Access-Control-Allow-Origin":origin,
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type",
 "Vary":"Origin",
});
const respond=(status:number,body:Dict,origin:string)=>new Response(JSON.stringify(body),{status,headers:cors(origin)});
const fail=(message:string,code=400)=>Object.assign(new Error(message),{status:code});
const permitted=(s:string)=>s===ORIGIN||s==="https://phong-may-avstinhoc.vercel.app"||/^http:\/\/localhost:\d{2,5}$/.test(s)||/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(s);
const clean=(v:unknown)=>String(v??"").trim();
const normalize=(s:unknown)=>clean(s).normalize("NFC").replace(/\s+/g," ").toLocaleLowerCase("vi");
const sheetName=(s:string)=>"'"+s.replaceAll("'","''")+"'";
const a1=(title:string,range:string)=>encodeURIComponent(sheetName(title)+"!"+range);
const validClass=(v:string)=>/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,59}$/u.test(v)&&!/[\[\]*?/\\]/.test(v);
const asDate=(s:unknown)=>{
 // Google Sheets date formatted cells may return serial day numbers.
 if(typeof s==="number"&&Number.isFinite(s)&&s>20000&&s<100000){
  const timestamp=Date.UTC(1899,11,30)+Math.floor(s)*86400000;
  return new Date(timestamp).toISOString().slice(0,10);
 }
 const str=clean(s);
 if(/^\d{4}-\d{2}-\d{2}$/.test(str))return str;
 const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
 if(m)return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
 return null;
};
const api=async(url:string,token:string,options:RequestInit={})=>{
 const response=await fetch(url,{...options,headers:{Authorization:"Bearer "+token,...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})}});
 if(!response.ok){
  let error="";try{const e=await response.json();error=String(e?.error?.message||e?.error||"");}catch{}
  throw fail(response.status===403?"Tài khoản Google đang kết nối chưa có quyền với file Sheets này. Hãy dùng đúng Google Account hoặc chia sẻ file cho tài khoản đó.":
    response.status===404?"Google không tìm thấy file Sheets này hoặc chưa được chia sẻ.":
    "Google Sheets API: "+(error||response.status),response.status===429?429:502);
 }
 return response;
};
async function googleToken(){
 if(cache.token && Date.now()+120000<cache.expires)return cache.token;
 const raw=Deno.env.get("GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON");
 if(!raw)throw fail("Chưa cấu hình kết nối Google Sheets bảo mật. Admin cần tạo Service Account và thêm GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON vào Supabase Edge Secrets.",503);
 let credentials:Dict;
 try{credentials=JSON.parse(raw);}catch{throw fail("Google Service Account JSON trên máy chủ không hợp lệ.",503);}
 if(!/^[^@]+@[^@]+\.iam\.gserviceaccount\.com$/.test(credentials.client_email||"")||!credentials.private_key)
  throw fail("Google Service Account thiếu email hoặc khóa ký.",503);
 const privateKey=await importPKCS8(credentials.private_key,"RS256");
 const assertion=await new SignJWT({scope:"https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file"})
   .setProtectedHeader({alg:"RS256",typ:"JWT"})
   .setIssuer(credentials.client_email).setAudience("https://oauth2.googleapis.com/token")
   .setIssuedAt().setExpirationTime("50m").sign(privateKey);
 const r=await fetch("https://oauth2.googleapis.com/token",{
   method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})
 });
 if(!r.ok)throw fail("Google không cấp access token. Kiểm tra Google Cloud Service Account và bật Google Sheets API.",503);
 const data=await r.json();
 cache.token=data.access_token;cache.expires=Date.now()+Number(data.expires_in||3600)*1000;
 return cache.token;
}
const idSafe=(id:string)=>/^[A-Za-z0-9_-]{25,160}$/.test(id);
// Workbook security is scoped to the actual school UUID, not the teacher account.
// Different schools must not reuse the same sheet, even if the names match.
async function assertExclusiveWorkbook(url:string,link:Dict){
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret)throw fail("Thiếu cấu hình xác thực Google Sheets trên máy chủ.",503);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.from("school_sheet_links").select("id,school_id,created_at")
   .eq("spreadsheet_id",link.spreadsheet_id).eq("status","verified")
   .order("created_at",{ascending:true}).order("id",{ascending:true}).limit(1);
 if(error)throw fail("Không kiểm tra được quyền liên kết Google Sheets.",503);
 if(data?.length&&data[0].school_id!==link.school_id)throw fail(
   "File Google Sheets này đã được xác minh cho trường khác. Hãy dùng mẫu trống tạo bản sao mới cho trường này.",409);
}
const FOLDER_MIME="application/vnd.google-apps.folder";
const SHEET_MIME="application/vnd.google-apps.spreadsheet";
async function driveFileInfo(id:string,token:string){
 const fields="id,name,mimeType,parents,trashed,capabilities(canEdit,canAddChildren),permissions(type,role)";
 const response=await api("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id)+
  "?fields="+encodeURIComponent(fields)+"&supportsAllDrives=true",token);
 return await response.json();
}
function ensurePrivateRoot(info:Dict){
 // Permission metadata may be omitted by Drive when the caller cannot list ACLs.
 // When permissions are visible, reject public links before making new copies.
 if(Array.isArray(info.permissions)&&info.permissions.some((p:Dict)=>p.type==="anyone"))
  throw fail("Thư mục QLPM đang được chia sẻ công khai. Hãy đặt Quyền truy cập chung → Hạn chế trước khi tạo Sheets để bảo vệ dữ liệu học sinh.",409);
}
function ensureDriveFolder(info:Dict){
 if(info.mimeType!==FOLDER_MIME||info.trashed)throw fail("Liên kết không phải thư mục Google Drive hợp lệ.",400);
 if(info.capabilities?.canEdit!==true && info.capabilities?.canAddChildren!==true)
  throw fail("Service Account chưa có quyền Editor với thư mục. Chia sẻ thư mục cho ic3-sheets-sync@qlpm-ic3.iam.gserviceaccount.com ở quyền Người chỉnh sửa rồi thử lại.",403);
}
const QLPM_TEMPLATE_ID="1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM";
const QLPM_TEMPLATE_NAME="DS ĐIỂM DANH";
const QLPM_ROOT_ID="1d8ZiM9q2xyxKNZwTSD5mN77fpVma-Nti";
function schoolWorkbookTitle(name:string){
 const school=clean(name).normalize("NFC").replace(/\s+/g," ").toLocaleUpperCase("vi");
 if(!school||school.length>130)throw fail("Tên trường không hợp lệ.",400);
 return ("DS ĐIỂM DANH "+school).slice(0,110);
}
async function findSchoolFiles(rootId:string,title:string,token:string){
 const safeName=title.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
 const q="'"+rootId+"' in parents and name = '"+safeName+
   "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
 const query=new URLSearchParams({q,fields:"nextPageToken,files(id,name,mimeType,parents,capabilities(canEdit),trashed)",pageSize:"100"});
 const response=await api("https://www.googleapis.com/drive/v3/files?"+query,token);
 const data=await response.json();
 return data.files||[];
}
async function callOwnerCopyScript(schoolId:string,title:string,rootId:string){
 const endpoint=clean(Deno.env.get("QLPM_APPS_SCRIPT_WEB_APP_URL"));
 const key=clean(Deno.env.get("QLPM_APPS_SCRIPT_SIGNING_KEY"));
 if(!endpoint||!key)throw fail(
  "Chưa thiết lập Apps Script tạo Google Sheets tự động. Kiểm tra 2 Secrets trong Supabase Edge Functions.",503);
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(endpoint))
  throw fail("QLPM_APPS_SCRIPT_WEB_APP_URL chưa đúng dạng URL /exec của Google Apps Script.",503);
 // setupQlpmCopy() creates four 32-character UUID fragments, always 128 hex characters.
 // Catch copied labels, quotes, or a different secret early without disclosing key material.
 if(!/^[0-9a-f]{128}$/i.test(key))
  throw fail("QLPM_APPS_SCRIPT_SIGNING_KEY sai định dạng. Secret phải có đúng 128 ký tự 0–9/a–f, chỉ lấy phần SAU dấu = từ Execution log của setupQlpmCopy (không dán cả tên Secret).",503);
 const ts=Date.now(),nonce=crypto.randomUUID().replaceAll("-","");
 const messageParts=[ts,nonce,schoolId,title,rootId,QLPM_TEMPLATE_ID];
 const hashKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),
   {name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signatureFor=async(separator:string)=>{
  const message=messageParts.join(separator);
  const signed=new Uint8Array(await crypto.subtle.sign("HMAC",hashKey,new TextEncoder().encode(message)));
  return btoa(String.fromCharCode(...signed)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
 };
 const send=async(signature:string):Promise<Dict>=>{
  let response:Response;
  try{
   response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({action:"copy_school_template",school_id:schoolId,
     root_id:rootId,template_id:QLPM_TEMPLATE_ID,filename:title,ts,nonce,signature}),
    redirect:"follow",signal:AbortSignal.timeout(45000)});
  }catch{throw fail("Không kết nối được Google Apps Script. Kiểm tra URL /exec và quyền triển khai Web app.",502);}
  if(!response.ok)throw fail("Apps Script không phản hồi thành công: HTTP "+response.status,502);
  try{return await response.json();}catch{
   throw fail("Apps Script chưa trả về JSON. Kiểm tra URL /exec và phiên bản triển khai Web app.",502);
  }
 };
 // First try the current canonical HMAC message (fields separated by '|').
 // A previously deployed Apps Script can still use the legacy newline-separated
 // message even after the code in its editor was updated. Retry ONLY after a
 // signature rejection (which never creates a file), with the same signed fields.
 let result=await send(await signatureFor("|"));
 if(result?.ok!==true && clean(result?.error).includes("Chữ ký xác thực không hợp lệ")){
  result=await send(await signatureFor("\n"));
 }
 if(result?.ok!==true){
  const message=clean(result?.error||"Chưa tạo được bản sao.").slice(0,220);
  if(message.includes("Chữ ký xác thực không hợp lệ")){
   // Privacy-preserving diagnostic: truncated, domain-separated HMAC with a
   // public fixed message. This is NOT the key, the request signature, nor
   // a value that can authorize any operation. Keep it in server-side logs.
   const check=new Uint8Array(await crypto.subtle.sign(
     "HMAC",hashKey,new TextEncoder().encode("QLPM-KEY-CHECK-V1")));
   const fingerprint=btoa(String.fromCharCode(...check))
     .split("+").join("-").split("/").join("_").replace(/=+$/g,"").slice(0,16);
   console.warn("QLPM_KEY_FINGERPRINT_V1="+fingerprint+"; reason=apps_script_signature_rejected");
   throw fail("Apps Script không xác thực được yêu cầu. Mã máy chủ đã lưu dấu vân tay khóa để đối chiếu an toàn với Script Properties, không cần đổi khóa hoặc gửi khóa lên chat.",502);
  }
  throw fail("Apps Script: "+message,502);
 }
 if(!idSafe(clean(result.spreadsheet_id)))
  throw fail("Apps Script trả về mã Google Sheets không hợp lệ.",502);
 return result;
}
async function metadata(id:string,token:string){
 const url="https://sheets.googleapis.com/v4/spreadsheets/"+id+"?fields=spreadsheetId,properties(title),sheets(properties(sheetId,title,gridProperties))";
 return await (await api(url,token)).json();
}
async function readTab(id:string,title:string,token:string){
 const url="https://sheets.googleapis.com/v4/spreadsheets/"+id+"/values/"+a1(title,"A5:CT70")+"?valueRenderOption=UNFORMATTED_VALUE";
 const data=await (await api(url,token)).json();
 return data.values||[];
}
async function batchValues(id:string,values:Dict[],token:string){
 if(!values.length)return;
 const url="https://sheets.googleapis.com/v4/spreadsheets/"+id+"/values:batchUpdate";
 for(let i=0;i<values.length;i+=350){
  await api(url,token,{method:"POST",body:JSON.stringify({valueInputOption:"RAW",data:values.slice(i,i+350)})});
 }
}
const col=(number:number)=>{let s="";for(let n=number;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const statusAbsent=(v:unknown)=>v===true||clean(v).toUpperCase()==="TRUE";
const nonblank=(v:unknown)=>v!==undefined&&v!==null&&clean(v)!=="";
async function getMap(db:any,linkId:string,className:string){
 const {data,error}=await db.from("school_sheet_tabs").select("*")
   .eq("link_id",linkId).eq("class_name",className).maybeSingle();
 if(error)throw fail("Lỗi đọc liên kết lớp: "+error.message,500);
 return data;
}
async function studentsFromDB(db:any,schoolId:string,className:string){
 const {data,error}=await db.from("students").select("id,school_id,full_name,student_code,class_name,date_of_birth,phone,status")
   .eq("school_id",schoolId).eq("class_name",className).eq("status","active").limit(300);
 if(error)throw fail("Không đọc được danh sách học sinh.",500);
 return data||[];
}
async function sessionsFromDB(db:any,schoolId:string,className:string){
 const {data,error}=await db.from("class_sessions").select("id,school_id,class_name,session_date,start_time,period_count")
   .eq("school_id",schoolId).eq("class_name",className).order("session_date").order("start_time").limit(300);
 if(error)throw fail("Không đọc được các buổi học.",500);
 return data||[];
}
async function ensureClass(db:any,schoolId:string,className:string,ownerId:string,schoolName:string){
 let {data:existing,error}=await db.from("classes").select("id,school_id,class_name,created_by")
   .eq("school_id",schoolId).eq("class_name",className).limit(1);
 if(error)throw fail("Không kiểm tra được lớp trên web.",500);
 if(existing?.length)return existing[0].id;
 const slug=schoolName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[đĐ]/g,"D")
   .toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,25)||"TRUONG";
 const code=("IC3-"+slug+"-"+className).toUpperCase();
 let res=await db.from("classes").insert({school_id:schoolId,class_name:className,
    registration_code:code,created_by:ownerId}).select("id").single();
 if(res.error?.code==="23505"){
  res=await db.from("classes").insert({school_id:schoolId,class_name:className,
    registration_code:code+"-"+ownerId.slice(0,6),created_by:ownerId}).select("id").single();
 }
 if(res.error)throw fail("Không tạo được lớp trên web: "+res.error.message,409);
 return res.data.id;
}
async function upsertMapping(db:any,link:Dict,title:string,gid:number,ownerId:string,schoolName:string){
 if(!validClass(title))throw fail("Tên tab lớp không hợp lệ.");
 await ensureClass(db,link.school_id,title,ownerId,schoolName);
 const {data,error}=await db.from("school_sheet_tabs").upsert({
   link_id:link.id,class_name:title,sheet_title:title,sheet_gid:gid
 },{onConflict:"link_id,class_name"}).select("id,link_id,class_name,sheet_title,sheet_gid,lesson_columns,student_rows").single();
 if(error)throw fail("Không lưu được liên kết tab lớp: "+error.message,409);
 return data;
}
const scoreValues=(row:any[])=>Object.fromEntries(SCORE_KEYS.map((k,i)=>[k,row[79+i]]).filter(([,v])=>nonblank(v)));
function checkedSessionIds(row:any[],lessonMap:Dict){
 return Object.entries(lessonMap).filter(([,n])=>Number(n)>=1&&Number(n)<=70&&statusAbsent(row[8+Number(n)])).map(([id])=>id);
}
async function syncClass(db:any,link:Dict,map:Dict,token:string,actorId:string,mode:string){
 const rows=await readTab(link.spreadsheet_id,map.sheet_title,token);
 const heads=rows[0]||[];
 if(normalize(heads[2]).replace(/\*/g,"").trim()!=="họ & tên")
   throw fail("Mẫu tab không đúng: ô C5 cần tiêu đề HỌ & TÊN.");
 if(clean(heads[9]).toUpperCase()!=="B1"||clean(heads[78]).toUpperCase()!=="B70")
   throw fail("Mẫu thiếu dãy checkbox B1–B70 từ J5:CA5.");
 const students=await studentsFromDB(db,link.school_id,map.class_name);
 const byName=new Map<string,any[]>();
 for(const s of students){const k=normalize(s.full_name);byName.set(k,[...(byName.get(k)||[]),s]);}
 // Duplicate names on an unlinked sheet may represent different students.
 // Do not silently attach both rows to one website ID or create twins.
 const rowNameCount=new Map<string,number>();
 for(let r=8;r<=70;r++){
  const name=normalize((rows[r-5]||[])[2]);
  if(name)rowNameCount.set(name,(rowNameCount.get(name)||0)+1);
 }
 const pairs:Dict[]=[];const sheetNonempty=new Set<number>();
 for(let r=8;r<=70;r++){
  const a=rows[r-5]||[],name=clean(a[2]);
  if(!name)continue;
  sheetNonempty.add(r);
  const linked=Object.entries(map.student_rows||{}).find(([,rowNo])=>Number(rowNo)===r);
  const mappedStudent=linked?students.find(s=>s.id===linked[0]):null;
  const names=byName.get(normalize(name))||[];
  const renamedRow=Boolean(mappedStudent&&normalize(mappedStudent.full_name)!==normalize(name));
  const duplicatedOnSheet=(rowNameCount.get(normalize(name))||0)>1;
  const chosen=renamedRow?null:(mappedStudent||(names.length===1&&!duplicatedOnSheet?names[0]:null));
  pairs.push({rowNo:r,raw:a,name,student:chosen,
    ambiguous:renamedRow||(!mappedStudent&&duplicatedOnSheet)||(names.length>1&&!chosen),
    matchedId:chosen?.id||null,proposedScores:scoreValues(a)});
 }
 const counts={sheetStudents:pairs.length,websiteStudents:students.length,
   matched:pairs.filter(p=>p.matchedId).length,
   missingOnWeb:pairs.filter(p=>!p.matchedId&&!p.ambiguous).length,
   ambiguous:pairs.filter(p=>p.ambiguous).length,
   absentCheckboxes:pairs.reduce((n,p)=>n+checkedSessionIds(p.raw,map.lesson_columns||{}).length,0),
   lessonsMapped:Object.keys(map.lesson_columns||{}).length,
   availableBlankRows:63-sheetNonempty.size};
 if(mode==="preview")return {counts,tab:map.sheet_title,lessons:await sessionsFromDB(db,link.school_id,map.class_name)};
 const conflicts:string[]=[];
 const newRows:Dict[]=[];
 const newStudentRows={...(map.student_rows||{})};
 if(mode==="pull"){
  const klass=await db.from("classes").select("id").eq("school_id",link.school_id).eq("class_name",map.class_name).limit(1);
  const classId=klass.data?.[0]?.id||null;
  for(const p of pairs){
   if(p.ambiguous){conflicts.push("Tên trùng hoặc đã đổi ở dòng "+p.rowNo+": "+p.name+" (cần rà soát trước).");continue;}
   let s=p.student;
   if(!s){
    const dob=asDate(p.raw[3]);
    const {data:created,error}=await db.from("students").insert({
      school_id:link.school_id,class_id:classId,class_name:map.class_name,
      full_name:p.name,school_name:link.school_name||null,
      date_of_birth:dob,phone:nonblank(p.raw[4])?clean(p.raw[4]):null,
      created_by:actorId,status:"active"
    }).select("id,full_name").single();
    if(error){conflicts.push("Không nhập được "+p.name+": "+error.message);continue;}
    s=created;newRows.push({id:s.id,full_name:s.full_name});
   }
   newStudentRows[s.id]=p.rowNo;
   const {data:prior,error:priorError}=await db.from("student_results").select("id,scores,classification,comment,gender,standard_met,exam_result")
       .eq("student_id",s.id).maybeSingle();
   if(priorError){conflicts.push("Không đọc điểm của "+p.name);continue;}
   let patch:Dict={...(prior?.scores||{})};let changed=false;
   for(const [key,value] of Object.entries(p.proposedScores)){
    if(!nonblank(patch[key])){patch[key]=value;changed=true;}
    else if(String(patch[key])!==String(value))conflicts.push(p.name+" · điểm "+key+" khác giữa web/Sheets");
   }
   const classif=clean(p.raw[8]);
   const comment=clean(p.raw[95]);
   const up:Dict={school_id:link.school_id,student_id:s.id,
     scores:patch,gender:prior?.gender||"",
     classification:prior?.classification||classif||"",
     comment:prior?.comment||comment||"",
     standard_met:prior?.standard_met||false,
     exam_result:prior?.exam_result||clean(p.raw[97])||"",
     updated_at:new Date().toISOString()};
   if(changed||(!prior&&(classif||comment))){
    const {error:e}=await db.from("student_results").upsert(up,{onConflict:"student_id"});
    if(e)conflicts.push("Không lưu được điểm "+p.name+": "+e.message);
   }
   const ids=checkedSessionIds(p.raw,map.lesson_columns||{});
   for(const sessionId of ids){
    const {data:session}=await db.from("class_sessions").select("id").eq("id",sessionId)
      .eq("school_id",link.school_id).eq("class_name",map.class_name).maybeSingle();
    if(!session){conflicts.push("Buổi học không còn tồn tại: "+sessionId);continue;}
    const {data:prev}=await db.from("attendance").select("id,status").eq("school_id",link.school_id)
      .eq("student_id",s.id).eq("session_id",sessionId).maybeSingle();
    if(prev?.status==="absent")continue;
    if(prev){conflicts.push("Điểm danh đã có trạng thái khác: "+p.name);continue;}
    const {error:e}=await db.from("attendance").insert({
      school_id:link.school_id,student_id:s.id,session_id:sessionId,status:"absent"
    });
    if(e)conflicts.push("Không nhập được điểm danh "+p.name+": "+e.message);
   }
  }
 }
 if(mode==="push"){
  const changes:Dict[]=[];
  const used=new Set(pairs.map(p=>p.rowNo));
  const takenStudents=new Set<string>();
  const dataScores=await db.from("student_results").select("student_id,scores,classification,comment,standard_met,exam_result")
   .eq("school_id",link.school_id).in("student_id",students.map(s=>s.id).length?students.map(s=>s.id):["00000000-0000-0000-0000-000000000000"]);
  if(dataScores.error)throw fail("Không đọc được điểm để đồng bộ.",500);
  const scoreMap=new Map((dataScores.data||[]).map(x=>[x.student_id,x]));
  // Supabase PostgREST caps one response (often 1,000 records).
  // A 63-student class × 70 meetings can hold 4,410 attendance marks.
  // Page by primary key and never silently omit records beyond page one.
  const ids=students.map(s=>s.id);
  const marks:Dict[]=[];
  if(ids.length){
   for(let start=0;start<100000;start+=500){
    const {data:page,error:markError}=await db.from("attendance")
      .select("id,student_id,session_id,status")
      .eq("school_id",link.school_id).in("student_id",ids)
      .order("id").range(start,start+499);
    if(markError)throw fail("Không đọc đủ dữ liệu điểm danh để đồng bộ.",500);
    marks.push(...(page||[]));
    if((page||[]).length<500)break;
   }
  }
  const absByKey=new Map(marks.map(x=>[x.student_id+":"+x.session_id,x.status]));
  const push=(rowNo:number,column:number,value:any)=>changes.push({range:sheetName(map.sheet_title)+"!"+col(column)+rowNo,values:[[value]]});
  for(const student of students){
   const linkedRow=Number((map.student_rows||{})[student.id]);
   const conflictingLinkedRow=pairs.find(p=>p.rowNo===linkedRow&&p.matchedId!==student.id);
   const unnamedConflict=pairs.some(p=>p.ambiguous&&normalize(p.name)===normalize(student.full_name));
   if(conflictingLinkedRow||unnamedConflict){
    conflicts.push("Tên trùng/đổi trên Sheets, cần rà soát trước khi ghi "+student.full_name);
    continue;
   }
   let p=pairs.find(p=>p.matchedId===student.id&&!takenStudents.has(student.id));
   if(!p){
    const free=Array.from({length:63},(_,i)=>i+8).find(r=>!used.has(r));
    if(!free){conflicts.push("Sheet đầy 63 học sinh; không ghi "+student.full_name);continue;}
    used.add(free);
    p={rowNo:free,raw:[],student,name:student.full_name,matchedId:student.id,proposedScores:{}};
    push(free,3,student.full_name);
    if(student.date_of_birth)push(free,4,student.date_of_birth.split("-").reverse().join("/"));
    if(student.phone)push(free,5,student.phone);
    push(free,8,map.class_name);
   }else if(normalize(p.name)!==normalize(student.full_name)){
    conflicts.push("Không được ghi đè tên khác tại dòng "+p.rowNo);continue;
   }
   takenStudents.add(student.id);newStudentRows[student.id]=p.rowNo;
   const g=scoreMap.get(student.id)||{};
   if(nonblank(g.classification)&&!nonblank(p.raw[8]))push(p.rowNo,9,g.classification);
   if(nonblank(g.comment)&&!nonblank(p.raw[95]))push(p.rowNo,96,g.comment);
   for(let n=0;n<SCORE_KEYS.length;n++){
    const val=g.scores?.[SCORE_KEYS[n]],other=p.raw[79+n];
    if(!nonblank(val))continue;
    if(!nonblank(other))push(p.rowNo,80+n,val);
    else if(String(other)!==String(val))conflicts.push(student.full_name+" · xung đột "+SCORE_KEYS[n]);
   }
   for(const [sessionId,ordinal] of Object.entries(map.lesson_columns||{})){
    const n=Number(ordinal);
    if(!Number.isInteger(n)||n<1||n>70)continue;
    const status=absByKey.get(student.id+":"+sessionId),old=p.raw[8+n];
    if(["absent","excused"].includes(status)&&!statusAbsent(old))push(p.rowNo,9+n,true);
    if(statusAbsent(old)&&!["absent","excused"].includes(status))conflicts.push("Sheets đánh dấu vắng "+student.full_name+" ở B"+n);
   }
  }
  if(changes.length)await batchValues(link.spreadsheet_id,changes,token);
  counts.cellsWritten=changes.length;
 }
 if(mode!=="preview"){
  const {error}=await db.from("school_sheet_tabs").update({
    student_rows:newStudentRows,last_synced_at:new Date().toISOString()
  }).eq("id",map.id);
  if(error)conflicts.push("Chưa lưu được ánh xạ học sinh.");
  await db.from("school_sheet_links").update({last_synced_at:new Date().toISOString()}).eq("id",link.id);
 }
 return {counts,createdStudents:newRows.length,conflicts:conflicts.slice(0,40),tab:map.sheet_title};
}


const classroomName=(v:string)=>/^\d{1,2}\.\d{1,2}$/.test(v)&&v.length<=12;
const classCompare=(a:string,b:string)=>a.localeCompare(b,"vi",{numeric:true,sensitivity:"base"});
const serialDate=(iso:string)=>Math.round((Date.parse(iso+"T00:00:00Z")-Date.UTC(1899,11,30))/86400000);
async function sheetBatch(id:string,requests:Dict[],token:string){
 if(!requests.length)return;
 const response=await api("https://sheets.googleapis.com/v4/spreadsheets/"+id+":batchUpdate",
  token,{method:"POST",body:JSON.stringify({requests})});
 return await response.json();
}
function freshTabRequests(newId:number,title:string,schoolName:string):Dict[]{
 return [
  {repeatCell:{range:{sheetId:newId,startRowIndex:7,endRowIndex:70,startColumnIndex:0,endColumnIndex:9},cell:{},fields:"userEnteredValue"}},
  {repeatCell:{range:{sheetId:newId,startRowIndex:7,endRowIndex:70,startColumnIndex:79,endColumnIndex:98},cell:{},fields:"userEnteredValue"}},
  {repeatCell:{range:{sheetId:newId,startRowIndex:7,endRowIndex:70,startColumnIndex:9,endColumnIndex:79},
    cell:{userEnteredValue:{boolValue:false}},fields:"userEnteredValue"}},
  {repeatCell:{range:{sheetId:newId,startRowIndex:5,endRowIndex:7,startColumnIndex:9,endColumnIndex:79},cell:{},fields:"userEnteredValue"}},
  {updateCells:{start:{sheetId:newId,rowIndex:1,columnIndex:2},rows:[{values:[
    {userEnteredValue:{stringValue:schoolName}},
    {userEnteredValue:{stringValue:"Lớp: "+title}}
   ]}],fields:"userEnteredValue"}},
  {repeatCell:{range:{sheetId:newId,startRowIndex:7,startColumnIndex:7,endColumnIndex:8,endRowIndex:70},
    cell:{userEnteredFormat:{horizontalAlignment:"CENTER"}},fields:"userEnteredFormat.horizontalAlignment"}}
 ];
}
async function cleanClonedTab(id:string,newId:number,title:string,schoolName:string,token:string){
 await sheetBatch(id,freshTabRequests(newId,title,schoolName),token);
}
async function cloneClassTab(id:string,template:Dict,className:string,schoolName:string,token:string){
 // Atomic duplicate + clearing: a failed cleanup must not leave a visible tab
 // containing another classroom's pupil data.
 const newId=Math.floor(100000000+Math.random()*1900000000);
 await sheetBatch(id,[{duplicateSheet:{
   sourceSheetId:template.id,newSheetId:newId,newSheetName:className
 }},...freshTabRequests(newId,className,schoolName)],token);
 return newId;
}
async function writeScheduleFromWeb(db:any,link:Dict,map:Dict,token:string){
 const lessons=await sessionsFromDB(db,link.school_id,map.class_name);
 if(!lessons.length)return map;
 const assigned=Object.keys(map.lesson_columns||{}).length;
 if(assigned)return map;
 if(lessons.length>70)throw fail("Lớp "+map.class_name+" có hơn 70 buổi; không thể tự gán B1–B70.",409);
 const mapping:Dict={};
 const values:Dict[]=[];
 for(let index=0;index<lessons.length;index++){
  const l=lessons[index],colIndex=10+index;
  mapping[l.id]=index+1;
  values.push({range:sheetName(map.sheet_title)+"!"+col(colIndex)+"6",values:[[Number(l.period_count||1)]]});
  values.push({range:sheetName(map.sheet_title)+"!"+col(colIndex)+"7",values:[[serialDate(l.session_date)]]});
 }
 await batchValues(link.spreadsheet_id,values,token);
 const {error}=await db.from("school_sheet_tabs").update({lesson_columns:mapping}).eq("id",map.id);
 if(error)throw fail("Không lưu được ánh xạ tiết vừa tạo.",500);
 return {...map,lesson_columns:mapping};
}
async function syncSchool(db:any,link:Dict,token:string,ownerId:string,offset=0){
 const {data:school,error:schoolError}=await db.from("schools").select("id,name").eq("id",link.school_id).maybeSingle();
 if(schoolError||!school)throw fail("Không có quyền đọc trường.",403);
 const {data:classes,error:classErr}=await db.from("classes").select("class_name")
  .eq("school_id",link.school_id).limit(300);
 if(classErr)throw fail("Không đọc được danh sách lớp.",500);
 const seen=new Set<string>((classes||[]).map(x=>clean(x.class_name)).filter(classroomName));
 for(const table of ["students","class_sessions"]){
  const {data:rows,error}=await db.from(table).select("class_name").eq("school_id",link.school_id).limit(500);
  if(error)throw fail("Không đọc được lớp từ "+table,500);
  for(const row of rows||[])if(classroomName(clean(row.class_name)))seen.add(clean(row.class_name));
 }
 const allClasses=[...seen].sort(classCompare).slice(0,60);
 const classNames=allClasses.slice(offset,offset+3);
 const meta=await metadata(link.spreadsheet_id,token);
 const tabs=(meta.sheets||[]).map((x:Dict)=>({id:x.properties.sheetId,title:x.properties.title}));
 const created:string[]=[],linked:string[]=[],errors:string[]=[],report:Dict[]=[];
 for(const name of classNames){
  try{
   let sheet=tabs.find(t=>t.title===name);
   const existing=await getMap(db,link.id,name);
   let fresh=false;
   if(!sheet){
    const template=tabs.find(t=>t.title===link.template_tab)||tabs.find(t=>t.title==="Gốc")||tabs.find(t=>classroomName(t.title));
    if(!template){errors.push("Thiếu tab mẫu để tạo "+name);continue;}
    const id=await cloneClassTab(link.spreadsheet_id,template,name,school.name,token);
    sheet={id,title:name};tabs.push(sheet);fresh=true;created.push(name);
   }
   let map:Dict=existing||{};
   if(!existing||existing.sheet_gid!==sheet.id){
    map=await upsertMapping(db,link,name,sheet.id,ownerId,school.name);
    if(!fresh&& !existing)linked.push(name);
    if(fresh&&existing) {
      const {error}=await db.from("school_sheet_tabs").update({lesson_columns:{},student_rows:{}})
       .eq("id",map.id);
      if(error)throw fail("Không thể làm mới ánh xạ tab lớp "+name,500);
      map={...map,lesson_columns:{},student_rows:{}};
    }
   }
   if(fresh){
    map=await writeScheduleFromWeb(db,link,map,token);
   }
   // Existing data is preserved. No date-based automatic mapping on older tabs.
   const pulled=await syncClass(db,link,map,token,ownerId,"pull");
   const pushed=await syncClass(db,link,map,token,ownerId,"push");
   report.push({class_name:name,
     addedStudents:pulled.createdStudents||0,cellsWritten:pushed.counts?.cellsWritten||0,
     conflicts:[...(pulled.conflicts||[]),...(pushed.conflicts||[])].slice(0,8)});
   }catch(e){
  const reason=String((e as Error).message||e).slice(0,250);
  // Log only class and failure reason; never log student rows or secret credentials.
  console.warn("auto_sync_school class failed",name,(e as any)?.status||"error");
  errors.push(name+": "+reason);
 }
 }
 const ordered=[...tabs].sort((a,b)=>classCompare(a.title,b.title));
 await sheetBatch(link.spreadsheet_id,ordered.map((t,i)=>({updateSheetProperties:{
  properties:{sheetId:t.id,index:i},fields:"index"
 }})),token);
 // Do not claim a successful full sync when a class failed.
 if(classNames.length && errors.length===0){
  const {error:updateError}=await db.from("school_sheet_links")
   .update({last_synced_at:new Date().toISOString(),last_error:null}).eq("id",link.id);
  if(updateError)errors.push("Không thể cập nhật mốc đồng bộ: "+updateError.message);
 }
 return {createdTabs:created,linkedTabs:linked,classesChecked:classNames.length,totalClasses:allClasses.length,nextOffset:offset+3<allClasses.length?offset+3:null,report,errors:errors.slice(0,35)};
}

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||ORIGIN;
 const safe=permitted(origin);
 if(req.method==="OPTIONS")return new Response(safe?null:JSON.stringify({error:"Origin không hợp lệ."}),{status:safe?204:403,headers:cors(safe?origin:ORIGIN)});
 if(!safe)return respond(403,{error:"Origin không hợp lệ."},ORIGIN);
 if(req.method!=="POST")return respond(405,{error:"Chỉ hỗ trợ POST."},origin);
 try{
  const jwt=req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if(!jwt)throw fail("Cần đăng nhập giáo viên.",401);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if(!url||!key)throw fail("Supabase chưa cấu hình máy chủ.",503);
  const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+jwt}},
    auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:identErr}=await db.auth.getUser(jwt);
  if(identErr||!identity.user)throw fail("Phiên đăng nhập không hợp lệ.",401);
  const ownerId=identity.user.id;
  const {data:profile}=await db.from("profiles").select("id,role,is_active").eq("id",ownerId).maybeSingle();
  if(!profile?.is_active||!["admin","teacher","staff"].includes(profile.role))
    throw fail("Tài khoản chưa được cấp quyền giáo viên.",403);
  const payload=await req.json().catch(()=>null);
  if(!payload||typeof payload!=="object")throw fail("Yêu cầu không hợp lệ.");
  const action=clean(payload.action);
  if(action==="register_qlpm_root"){
   if(profile.role!=="admin")throw fail("Chỉ Admin được thiết lập thư mục Drive cha QLPM.",403);
   const rootId=clean(payload.folder_id);
   if(!/^[A-Za-z0-9_-]{20,160}$/.test(rootId))throw fail("Link thư mục cha Google Drive không hợp lệ.",400);
   const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
   if(!secret)throw fail("Máy chủ thiếu cấu hình quản lý thư mục.",503);
   const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:existingRoot,error:rootError}=await admin.from("qlpm_drive_root")
      .select("folder_id").eq("id",1).maybeSingle();
   if(rootError)throw fail("Không đọc được cấu hình thư mục cha.",503);
   if(existingRoot&&existingRoot.folder_id!==rootId){
    const {data:existingChild,error:childErr}=await admin.from("school_drive_folders")
       .select("school_id").limit(1);
    if(childErr)throw fail("Không kiểm tra được thư mục trường.",503);
    if(existingChild?.length)throw fail("Đã có thư mục trường. Không thể thay thư mục cha khi chưa chuyển toàn bộ thư mục trường.",409);
   }
   const token=await googleToken();
   const info=await driveFileInfo(rootId,token);
   ensureDriveFolder(info);
   ensurePrivateRoot(info);
   const {data:stored,error:storeErr}=await admin.from("qlpm_drive_root")
      .upsert({id:1,folder_id:rootId,folder_name:clean(info.name).slice(0,180),
       configured_by:ownerId,verified_at:new Date().toISOString()},{onConflict:"id"})
      .select("folder_id,folder_name,verified_at").single();
   if(storeErr)throw fail("Không lưu được thư mục cha: "+storeErr.message,409);
   return respond(200,{success:true,root:stored},origin);
  }
  if(action==="provision_school"){
   const schoolId=clean(payload.school_id);
   if(!/^[a-f0-9-]{36}$/i.test(schoolId))throw fail("Không có ID trường mới.",400);
   const {data:membership,error:memberError}=await db.from("school_members")
     .select("school_id").eq("school_id",schoolId).eq("user_id",ownerId).maybeSingle();
   if(memberError||!membership)throw fail("Chỉ tạo Sheets cho trường của tài khoản hiện tại.",403);
   const {data:school}=await db.from("schools").select("id,name").eq("id",schoolId).maybeSingle();
   if(!school)throw fail("Không tìm thấy trường.",404);
   const {data:existing}=await db.from("school_sheet_links").select("id,spreadsheet_id")
    .eq("school_id",schoolId).maybeSingle();
   if(existing)return respond(200,{success:true,alreadyLinked:true,spreadsheetId:existing.spreadsheet_id},origin);
   // A standalone service account cannot create teacher-owned files in personal My Drive.
    throw fail("Mở nút Tạo file Google Sheets của trường để sao chép mẫu trống vào Drive, cấp quyền Editor cho Service Account và gắn link bản sao. Không cần OAuth cho Sheets.",409);
  }
  if(action==="register_school_folder")
    throw fail("QLPM hiện dùng thư mục cha chứa file Sheets của tất cả trường. Không cần tạo thư mục con.",410);
  if(action==="create_school_workbook"||action==="link_school_workbook"){
    const schoolId=clean(payload.school_id);
    if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(schoolId))
      throw fail("Mã trường không hợp lệ.",400);
    const {data:school,error:schoolError}=await db.from("schools").select("id,name")
      .eq("id",schoolId).maybeSingle();
    if(schoolError||!school)throw fail("Không tìm thấy trường hoặc bạn không có quyền truy cập.",403);
    if(profile.role!=="admin"){
      const {data:membership,error:memberError}=await db.from("school_members")
        .select("school_id").eq("school_id",schoolId).eq("user_id",ownerId).maybeSingle();
      if(memberError||!membership)throw fail("Chỉ giáo viên thuộc trường mới được tạo bảng tính của trường.",403);
    }
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!serviceKey)throw fail("Thiếu khóa máy chủ để quản lý liên kết.",503);
    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:root,error:rootErr}=await admin.from("qlpm_drive_root")
       .select("folder_id,folder_name").eq("id",1).maybeSingle();
    if(rootErr)throw fail("Máy chủ không đọc được cấu hình thư mục QLPM. Hãy kiểm tra quyền service_role trên bảng qlpm_drive_root.",503);
    if(!root)throw fail("Chưa đăng ký thư mục QLPM dùng chung.",409);
    if(root.folder_id!==QLPM_ROOT_ID)
      throw fail("Thư mục QLPM không trùng với cấu hình đã xác minh. Hãy liên hệ Admin.",409);
    const token=await googleToken();
    const rootInfo=await driveFileInfo(root.folder_id,token);
    ensureDriveFolder(rootInfo);
    ensurePrivateRoot(rootInfo);
    const {data:already,error:existingError}=await admin.from("school_sheet_links")
      .select("id,spreadsheet_id").eq("school_id",schoolId).maybeSingle();
    if(existingError)throw fail("Không kiểm tra được liên kết Sheets hiện tại.",503);
    if(already){
      if(action==="link_school_workbook"&&clean(payload.spreadsheet_id)!==already.spreadsheet_id)
        throw fail("Trường đã có một file Sheets dùng chung, không được gắn file khác.",409);
      return respond(200,{success:true,alreadyLinked:true,spreadsheetId:already.spreadsheet_id,link_id:already.id},origin);
    }
    const title=schoolWorkbookTitle(school.name);
    const templateInfo=await driveFileInfo(QLPM_TEMPLATE_ID,token);
    if(templateInfo.mimeType!==SHEET_MIME||templateInfo.trashed||
      templateInfo.name!==QLPM_TEMPLATE_NAME||!templateInfo.parents?.includes(root.folder_id))
      throw fail("File mẫu DS ĐIỂM DANH chưa nằm đúng thư mục QLPM hoặc đã đổi tên.",409);
    let spreadsheetId="";
    let usedExisting=false;
    if(action==="link_school_workbook"){
      spreadsheetId=clean(payload.spreadsheet_id);
      if(!idSafe(spreadsheetId)||spreadsheetId===QLPM_TEMPLATE_ID)
        throw fail("Link Google Sheets không hợp lệ hoặc đang trỏ vào file mẫu.",400);
    }else{
      const duplicates=await findSchoolFiles(root.folder_id,title,token);
      if(duplicates.length>1)throw fail("Có nhiều file Sheets cùng tên "+title+" trong QLPM. Hãy xử lý file trùng trước.",409);
      if(duplicates.length){
        spreadsheetId=duplicates[0].id;
        usedExisting=true;
      }else{
        const copied=await callOwnerCopyScript(schoolId,title,root.folder_id);
        spreadsheetId=clean(copied.spreadsheet_id);
        usedExisting=!!copied.reused;
      }
    }
    if(spreadsheetId===QLPM_TEMPLATE_ID)throw fail("Không dùng file mẫu làm bảng điểm danh trường.",409);
    const file=await driveFileInfo(spreadsheetId,token);
    if(file.mimeType!==SHEET_MIME||file.trashed||
       !file.parents?.includes(root.folder_id)||file.capabilities?.canEdit!==true)
      throw fail("File Sheets phải nằm trực tiếp trong thư mục QLPM và Service Account có quyền Editor.",409);
    if(action==="create_school_workbook"&&file.name!==title)
      throw fail("Tên file bản sao không trùng tên trường. Kiểm tra Apps Script hoặc file trùng.",409);
    const {data:usedBy,error:usedErr}=await admin.from("school_sheet_links")
      .select("school_id").eq("spreadsheet_id",spreadsheetId).neq("school_id",schoolId).limit(1);
    if(usedErr)throw fail("Không kiểm tra được trùng file giữa các trường.",503);
    if(usedBy?.length)throw fail("File Sheets đã được liên kết cho một trường khác. Không được dùng chung giữa các trường.",409);
    const sheetMeta=await metadata(spreadsheetId,token);
    const detectedTemplate=(sheetMeta.sheets||[]).some((s:Dict)=>s.properties?.title==="Gốc")?
      "Gốc":(sheetMeta.sheets||[]).some((s:Dict)=>s.properties?.title==="6.1")?"6.1":
      (sheetMeta.sheets||[])[0]?.properties?.title||"Gốc";
    const {data:inserted,error:insertErr}=await admin.from("school_sheet_links")
      .insert({school_id:schoolId,owner_id:ownerId,spreadsheet_id:spreadsheetId,
        spreadsheet_title:clean(sheetMeta.properties?.title).slice(0,180),
        template_tab:detectedTemplate,status:"verified",auto_sync:true,
        last_checked_at:new Date().toISOString()})
      .select("id,spreadsheet_id").single();
    if(insertErr){
      if(insertErr.code==="23505")throw fail("Một đồng nghiệp vừa gắn Sheets cho trường. Hãy tải lại trang.",409);
      throw fail("Không lưu được link trường: "+insertErr.message,409);
    }
    return respond(200,{success:true,created:!usedExisting&&action==="create_school_workbook",
      reused:usedExisting,spreadsheetId,link_id:inserted.id,
      title:sheetMeta.properties?.title||title,
      url:"https://docs.google.com/spreadsheets/d/"+spreadsheetId+"/edit"},origin);
  }
  const linkId=clean(payload.link_id);
  if(!/^[a-f0-9-]{36}$/i.test(linkId))throw fail("Thiếu ID liên kết trường.");
  const {data:link,error:linkErr}=await db.from("school_sheet_links").select("*")
   .eq("id",linkId).maybeSingle();
  if(linkErr||!link)throw fail("Không có quyền quản lý liên kết này.",403);
  if(!idSafe(link.spreadsheet_id))throw fail("Mã Google Sheets không hợp lệ.");
  await assertExclusiveWorkbook(url,link);
  const token=await googleToken();
  // Existing workbooks remain usable as-is. New links are checked in the QLPM root at creation.
  // Never check retired per-school folder records in the new flat-folder model.
  if(action==="auto_sync_school"){
   const offset=Math.max(0,Math.min(60,Number(payload.offset)||0));
   const result=await syncSchool(db,link,token,ownerId,offset);
   return respond(200,{success:true,...result},origin);
  }
  if(action==="inspect"){
   const meta=await metadata(link.spreadsheet_id,token);
   const tabs=(meta.sheets||[]).map((s:Dict)=>({
     gid:s.properties.sheetId,title:s.properties.title,
     rows:s.properties.gridProperties?.rowCount||0,columns:s.properties.gridProperties?.columnCount||0
   }));
   await db.from("school_sheet_links").update({
      status:"verified",spreadsheet_title:meta.properties?.title||null,
      last_checked_at:new Date().toISOString(),last_error:null
   }).eq("id",link.id);
   return respond(200,{success:true,title:meta.properties?.title||"",tabs},origin);
  }
  if(action==="download"){
   const endpoint="https://www.googleapis.com/drive/v3/files/"+link.spreadsheet_id+
    "/export?mimeType="+encodeURIComponent("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
   const response=await api(endpoint,token);
   const bytes=await response.arrayBuffer();
   if(bytes.byteLength>8_000_000)throw fail("File quá lớn để tải qua chức năng này (8 MB).",413);
   return new Response(bytes,{status:200,headers:{
     "Access-Control-Allow-Origin":origin,"Vary":"Origin","Cache-Control":"no-store",
     // FunctionsClient automatically treats octet-stream as a Blob; sending an
     // XLSX MIME directly may be consumed as text by older functions clients.
     "Content-Type":"application/octet-stream",
     "Content-Disposition":"attachment; filename=IC3_Google_Sheets_goc.xlsx"
   }});
  }
  const className=clean(payload.class_name);
  if(!validClass(className))throw fail("Tên lớp không hợp lệ.");
  const meta=await metadata(link.spreadsheet_id,token);
  const tabs=(meta.sheets||[]).map((s:Dict)=>({id:s.properties.sheetId,title:s.properties.title}));
  if(action==="clone"){
   const source=clean(payload.source_tab||"6.1");
   const template=tabs.find((s:Dict)=>s.title===source);
   if(!template)throw fail("Không tìm thấy tab mẫu "+source+".");
   if(tabs.some((s:Dict)=>s.title===className))throw fail("Tab đã tồn tại; chọn Gắn tab có sẵn.",409);
   const newId=Math.floor(100000000+Math.random()*1900000000);
   const requests:Dict[]=[
    {duplicateSheet:{sourceSheetId:template.id,newSheetId:newId,newSheetName:className}},
    {repeatCell:{range:{sheetId:newId,startRowIndex:7,endRowIndex:70,startColumnIndex:2,endColumnIndex:9},
      cell:{},fields:"userEnteredValue"}},
    {repeatCell:{range:{sheetId:newId,startRowIndex:7,endRowIndex:70,startColumnIndex:79,endColumnIndex:98},
      cell:{},fields:"userEnteredValue"}},
    {repeatCell:{range:{sheetId:newId,startRowIndex:7,endRowIndex:70,startColumnIndex:9,endColumnIndex:79},
      cell:{userEnteredValue:{boolValue:false}},fields:"userEnteredValue"}},
    {repeatCell:{range:{sheetId:newId,startRowIndex:5,endRowIndex:6,startColumnIndex:9,endColumnIndex:79},
      cell:{},fields:"userEnteredValue"}},
    {updateCells:{start:{sheetId:newId,rowIndex:1,columnIndex:3},
      rows:[{values:[{userEnteredValue:{stringValue:"Lớp: "+className}}]}],fields:"userEnteredValue"}}
   ];
   await api("https://sheets.googleapis.com/v4/spreadsheets/"+link.spreadsheet_id+":batchUpdate",
    token,{method:"POST",body:JSON.stringify({requests})});
   const {data:school}=await db.from("schools").select("name").eq("id",link.school_id).maybeSingle();
   const mapped=await upsertMapping(db,link,className,newId,ownerId,school?.name||"");
   return respond(200,{success:true,tab:mapped,created:true,info:"Tab mới đã giữ định dạng và công thức mẫu; dữ liệu học sinh cũ đã được làm sạch."},origin);
  }
  if(action==="bind"){
   const existing=tabs.find((s:Dict)=>s.title===clean(payload.tab_title));
   if(!existing)throw fail("Tab không tồn tại trong file Google Sheets.");
   if(existing.title!==className)throw fail("Để tránh nhầm lớp, tên tab phải trùng tên lớp.");
   const {data:school}=await db.from("schools").select("name").eq("id",link.school_id).maybeSingle();
   const mapped=await upsertMapping(db,link,className,existing.id,ownerId,school?.name||"");
   return respond(200,{success:true,tab:mapped},origin);
  }
  const map=await getMap(db,link.id,className);
  if(!map)throw fail("Bạn chưa gắn tab cho lớp này. Hãy chọn tab có sẵn hoặc nhân bản mẫu.");
  if(!tabs.some((x:Dict)=>x.title===map.sheet_title && x.id===map.sheet_gid))
   throw fail("Tab đã đổi tên hoặc không còn tồn tại. Kiểm tra lại liên kết.");
  if(action==="save_lesson_map"){
   const lessons=await sessionsFromDB(db,link.school_id,className);
   const allowed=new Set(lessons.map(s=>s.id));
   const proposed=payload.lesson_columns;
   if(!proposed||typeof proposed!=="object"||Array.isArray(proposed))throw fail("Dữ liệu ghép tiết không hợp lệ.");
   const used=new Set<number>(),validated:Dict={};
   for(const [id,v] of Object.entries(proposed)){
    if(v===null||v===""||v===undefined)continue;
    const n=Number(v);
    if(!allowed.has(id)||!Number.isInteger(n)||n<1||n>70||used.has(n))
     throw fail("Mỗi buổi phải thuộc lớp và mỗi cột B chỉ được gắn một tiết.");
    used.add(n);validated[id]=n;
   }
   const {error}=await db.from("school_sheet_tabs").update({lesson_columns:validated}).eq("id",map.id);
   if(error)throw fail("Không lưu được ánh xạ buổi học.",409);
   return respond(200,{success:true,mapped:Object.keys(validated).length},origin);
  }
  if(["preview","pull","push"].includes(action)){
   if(action!=="preview"&&payload.confirm!==true)throw fail("Cần xem trước và xác nhận trước khi ghi dữ liệu.");
   const result=await syncClass(db,link,map,token,ownerId,action);
   return respond(200,{success:true,...result},origin);
  }
  throw fail("Thao tác không được hỗ trợ.");
 }catch(err){
  const e=err as Error & {status?:number};
  console.error("google-sheets-sync",e.message?.slice(0,280)||"unknown");
  return respond(e.status||500,{error:e.message||"Không thể liên kết Google Sheets."},origin);
 }
});
