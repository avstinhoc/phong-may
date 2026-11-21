import {isTeacherNative,startTeacherNativeGoogle} from './nativeGoogleOAuth.js';
// OAuth remains owned by Supabase Auth. Never accept roles from Google metadata.
export const GOOGLE_PROVIDER='google';
const CALLBACK_PATH='/auth/callback';

export function googleCallbackUrl(baseCallback,linkExisting=false){
  const url=new URL(baseCallback);
  const local=['localhost','127.0.0.1'].includes(url.hostname);
  if(!['https:','http:'].includes(url.protocol)||(!local&&url.protocol!=='https:')||
     url.pathname!==CALLBACK_PATH||url.username||url.password)
    throw new Error('Đường dẫn xác thực Google không hợp lệ.');
  url.search='';
  url.hash='';
  url.searchParams.set('provider','google');
  if(linkExisting)url.searchParams.set('linked','1');
  return url.toString();
}

export function googleOAuthError(error){
  const raw=String(error?.message||error||'');
  if(/provider.*(not enabled|not supported|disabled)|unsupported provider|external provider/i.test(raw))
    return 'Đăng nhập Google chưa được bật trong Supabase. Admin cần cấu hình Google OAuth Client ID/Secret tại Authentication → Providers → Google.';
  if(/manual.*link|identity linking.*disabled|not enabled.*link/i.test(raw))
    return 'Supabase chưa bật Manual Identity Linking. Admin cần bật chức năng này trong Authentication để liên kết Google với tài khoản cũ.';
  if(/redirect|callback|invalid.*url/i.test(raw))
    return 'Đường dẫn trở về chưa được cho phép. Admin hãy thêm https://phong-may.vercel.app/auth/callback vào Supabase Auth → URL Configuration.';
  if(/access_denied|consent.*denied|user.*cancel/i.test(raw))
    return 'Bạn đã hủy đăng nhập Google. Tài khoản email/mật khẩu vẫn hoạt động bình thường.';
  if(/network|fetch failed/i.test(raw))
    return 'Không kết nối được dịch vụ xác thực Google. Kiểm tra mạng và thử lại.';
  return raw||'Không thể bắt đầu đăng nhập Google. Vui lòng thử lại.';
}

export function hasGoogleIdentity(identities=[]){
  return Array.isArray(identities)&&identities.some(identity=>identity?.provider==='google');
}

export async function startGoogleAuth(auth,baseCallback,{linkExisting=false}={}){
  // WebView OAuth must not silently redirect a Windows desktop app into the website.
  // Until an approved external-browser + deep-link flow exists, retain email/password
  // in Teacher Desktop and keep Google OAuth available on the existing website.
  if(isTeacherNative())return startTeacherNativeGoogle(auth,{linkExisting});
  const redirectTo=googleCallbackUrl(baseCallback,linkExisting);
  const args={provider:GOOGLE_PROVIDER,options:{redirectTo}};
  const method=linkExisting?'linkIdentity':'signInWithOAuth';
  if(typeof auth?.[method]!=='function')throw Error('Phiên bản Supabase Auth chưa hỗ trợ '+method);
  const {data,error}=await auth[method](args);
  if(error)throw error;
  return data;
}
