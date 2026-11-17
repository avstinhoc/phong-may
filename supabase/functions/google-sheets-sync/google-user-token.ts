import {createClient} from "npm:@supabase/supabase-js@2.119.0";
// OAuth user token access: only Edge Function / service_role can read encrypted tokens.
// Returning null means this teacher has not connected OAuth yet.
const encode=new TextEncoder();
const readB64=(v:string)=>Uint8Array.from(atob(v),x=>x.charCodeAt(0));
export async function googleUserAccessToken(ownerId:string):Promise<string|null>{
 const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!secret)throw new Error("Supabase chưa có quyền đọc kết nối Google.");
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:record,error:dbError}=await admin.from("google_drive_connections")
   .select("refresh_token_ciphertext,refresh_token_iv").eq("owner_id",ownerId).maybeSingle();
 if(dbError)throw new Error("Không kiểm tra được tài khoản Google đã kết nối.");
 if(!record)return null;
 const keyValue=Deno.env.get("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY");
 const client=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
 const clientSecret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!keyValue||!client||!clientSecret)
  throw new Error("Thiếu Google OAuth Secrets trên Supabase. Hãy kiểm tra cấu hình bước 6.");
 let keyBytes:Uint8Array,refreshToken:string;
 try{
  keyBytes=readB64(keyValue);
  if(keyBytes.length!==32)throw Error("bad key");
  const key=await crypto.subtle.importKey("raw",keyBytes,"AES-GCM",false,["decrypt"]);
  const result=await crypto.subtle.decrypt({
   name:"AES-GCM",iv:readB64(record.refresh_token_iv),
   additionalData:encode.encode(ownerId)
  },key,readB64(record.refresh_token_ciphertext));
  refreshToken=new TextDecoder().decode(result);
 }catch{throw new Error("Không giải mã được quyền Google. Kiểm tra khóa OAuth trước khi kết nối lại.");}
 const result=await fetch("https://oauth2.googleapis.com/token",{
  method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({client_id:client,client_secret:clientSecret,
   refresh_token:refreshToken,grant_type:"refresh_token"})
 });
 const data=await result.json().catch(()=>({}));
 if(!result.ok||!data.access_token)
  throw new Error("Google đã hết hạn hoặc thu hồi quyền. Vào Danh sách học sinh để kết nối lại Google Drive.");
 return data.access_token;
}
