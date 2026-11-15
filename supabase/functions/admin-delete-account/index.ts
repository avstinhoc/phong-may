import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const json = (status: number, payload: Record<string, unknown>, origin: string) =>
 new Response(JSON.stringify(payload), {
   status,
   headers: {
     "Content-Type": "application/json; charset=utf-8",
     "Cache-Control": "no-store",
     "Access-Control-Allow-Origin": origin,
     "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
     "Access-Control-Allow-Methods": "POST, OPTIONS",
     "Vary": "Origin",
   },
 });

Deno.serve(async (req: Request) => {
 const origin = req.headers.get("origin") ?? "";
 const safeOrigin =
   /^https:\/\/(?:phong-may|phong-may-avstinhoc|phong-[a-z0-9]+-avstinhoc)\.vercel\.app$/.test(origin) ||
   /^http:\/\/localhost:\d{2,5}$/.test(origin) ||
   /^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(origin) ||
   origin === "";
 const allowedOrigin = safeOrigin ? (origin || "https://phong-may.vercel.app") : "https://phong-may.vercel.app";
 if (req.method === "OPTIONS") return json(safeOrigin ? 200 : 403, {}, allowedOrigin);
 if (req.method !== "POST") return json(405, { error: "Chỉ hỗ trợ POST." }, allowedOrigin);
 if (!safeOrigin) return json(403, { error: "Nguồn yêu cầu không được phép." }, allowedOrigin);

 try {
   const serviceUrl = Deno.env.get("SUPABASE_URL");
   const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
   const callerKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
   if (!serviceUrl || !serviceKey || !callerKey)
     return json(503, { error: "Máy chủ chưa được cấu hình đầy đủ khóa Supabase." }, allowedOrigin);

   const accessToken = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
   if (!accessToken)
     return json(401, { error: "Vui lòng đăng nhập trước khi xóa tài khoản." }, allowedOrigin);

   // Separate the authenticated caller's RLS-scoped client from the privileged
   // Auth Admin client. Never use a secret API key as the REST Authorization
   // credential when checking a user's profile. This previously caused a
   // PostgREST 42501/403 and incorrectly reported active Admins as non-Admins.
   const caller = createClient(serviceUrl, callerKey, {
     global: { headers: { Authorization: "Bearer " + accessToken } },
     auth: { persistSession: false, autoRefreshToken: false },
   });
   const admin = createClient(serviceUrl, serviceKey, {
     auth: { persistSession: false, autoRefreshToken: false },
   });
   const { data: identity, error: identityError } = await caller.auth.getUser(accessToken);
   const actorId = identity?.user?.id;
   if (identityError || !actorId)
     return json(401, { error: "Phiên đăng nhập hết hạn. Hãy đăng nhập lại." }, allowedOrigin);

   // Reuse the very same database authorization function as admin_update_account.
   const { data: canManage, error: permissionError } = await caller.rpc("is_admin");
   if (permissionError) {
     console.error("admin-delete-account permission lookup failed", permissionError.code);
     return json(503, { error: "Không kiểm tra được quyền Admin trên Supabase. Vui lòng thử lại hoặc báo quản trị viên." }, allowedOrigin);
   }
   if (canManage !== true)
     return json(403, { error: "Tài khoản hiện tại chưa có quyền Admin đang hoạt động." }, allowedOrigin);

   const body = await req.json().catch(() => null);
   const targetId = typeof body?.target_id === "string" ? body.target_id.trim() : "";
   const confirmationEmail = typeof body?.confirmation_email === "string"
     ? body.confirmation_email.trim().toLowerCase() : "";
   if (!/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(targetId) || !confirmationEmail)
     return json(400, { error: "Thiếu tài khoản hoặc email xác nhận hợp lệ." }, allowedOrigin);
   if (targetId === actorId)
     return json(403, { error: "Không thể xóa chính tài khoản đang đăng nhập." }, allowedOrigin);

   const { data: target, error: targetError } = await caller.from("profiles")
     .select("id,email,role").eq("id", targetId).maybeSingle();
   if (targetError) {
     console.error("admin-delete-account target lookup failed", targetError.code);
     return json(503, { error: "Không thể đọc hồ sơ tài khoản. Hãy làm mới trang và thử lại." }, allowedOrigin);
   }
   if (!target)
     return json(404, { error: "Không tìm thấy tài khoản này. Hãy làm mới danh sách." }, allowedOrigin);
   if (target.role === "admin")
     return json(403, { error: "Không xóa trực tiếp tài khoản Admin. Hãy bàn giao quyền trước." }, allowedOrigin);
   if (String(target.email || "").trim().toLowerCase() !== confirmationEmail)
     return json(400, { error: "Email nhập lại chưa trùng với email tài khoản." }, allowedOrigin);

   const { data: authTarget, error: getAuthError } = await admin.auth.admin.getUserById(targetId);
   if (getAuthError || !authTarget?.user ||
     (authTarget.user.email || "").trim().toLowerCase() !== confirmationEmail)
     return json(409, { error: "Email trên hệ thống Auth không trùng. Hãy tải lại dữ liệu trước khi thử." }, allowedOrigin);

   // The BEFORE DELETE trigger on public.profiles nulls nullable history pointers
   // inside Auth's deletion transaction. Other dependent rows cascade normally.
   const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
   if (deleteError) {
     console.error("admin-delete-account Auth error", deleteError.message);
     return json(409, {
       error: "Chưa thể xóa tài khoản. Có thể tài khoản còn sở hữu tệp Storage hoặc bản ghi cần xử lý. Dữ liệu hiện tại chưa bị xóa.",
     }, allowedOrigin);
   }
   return json(200, { success: true, message: "Đã xóa tài khoản đăng nhập và giữ lại dữ liệu lớp học liên quan." }, allowedOrigin);
 } catch (error) {
   console.error("admin-delete-account failed", error);
   return json(500, { error: "Không thể xóa tài khoản do lỗi máy chủ. Vui lòng thử lại." }, allowedOrigin);
 }
});
