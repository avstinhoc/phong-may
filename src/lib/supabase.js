import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();
export let configurationError = "";
export let supabase = null;
try {
  if (!url || !key)
    throw new Error(
      "Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trên Vercel. Thêm biến rồi Redeploy.",
    );
  if (!/^https?:\/\//.test(url))
    throw new Error("Project URL phải là địa chỉ https của dự án Supabase.");
  let role = "";
  if (key.startsWith("eyJ")) {
    try {
      role = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      ).role;
    } catch {}
  }
  if (key.startsWith("sb_secret_") || role === "service_role")
    throw new Error(
      "Đang dùng khóa bí mật ở frontend. Hãy thu hồi khóa này và dùng publishable/anon key.",
    );
  supabase = createClient(url, key);
} catch (e) {
  configurationError = e.message;
}
export function authMessage(error) {
  const text = error?.message || String(error);
  if (/invalid login credentials/i.test(text))
    return "Email hoặc mật khẩu chưa đúng. Nếu chưa có tài khoản, hãy đăng ký trước.";
  if (/email not confirmed/i.test(text))
    return "Email chưa xác nhận. Mở email xác nhận hoặc bấm Gửi lại email xác nhận.";
  if (/fetch|network/i.test(text))
    return "Không kết nối được Supabase. Kiểm tra Project URL, mạng và trạng thái dự án.";
  if (/database error saving new user/i.test(text))
    return "Supabase không tạo được hồ sơ. Kiểm tra migration và Auth logs trong Dashboard.";
  if (/rate limit|too many/i.test(text))
    return "Đã gửi quá nhiều yêu cầu. Chờ một lúc rồi thử lại.";
  return text;
}
