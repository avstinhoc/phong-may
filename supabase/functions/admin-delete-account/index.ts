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
   if (!serviceUrl || !serviceKey)
     return json(503, { error: "Máy chủ chưa được cấu hình quyền quản trị Auth." }, allowedOrigin);

   const accessToken = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
   if (!accessToken)
     return json(401, { error: "Vui lòng đăng nhập trước khi xóa tài khoản." }, allowedOrigin);

   const admin = createClient(serviceUrl, serviceKey, {
     auth: { persistSession: false, autoRefreshToken: false },
   });
   const { data: identity, error: identityError } = await admin.auth.getUser(accessToken);
   const actorId = identity?.user?.id;
   if (identityError || !actorId)
     return json(401, { error: "Phiên đăng nhập hết hạn. Hãy đăng nhập lại." }, allowedOrigin);

   const { data: actor, error: actorError } = await admin.from("profiles")
     .select("id,role,is_active").eq("id", actorId).maybeSingle();
   if (actorError || !actor?.is_active || actor.role !== "admin")
     return json(403, { error: "Chỉ quản trị viên đang hoạt động mới được xóa tài khoản." }, allowedOrigin);

   const body = await req.json().catch(() => null);
   const targetId = typeof body?.target_id === "string" ? body.target_id.trim() : "";
   const confirmationEmail = typeof body?.confirmation_email === "string"
     ? body.confirmation_email.trim().toLowerCase() : "";
   if (!/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(targetId) || !confirmationEmail)
     return json(400, { error: "Thiếu tài khoản hoặc email xác nhận hợp lệ." }, allowedOrigin);
   if (targetId === actorId)
     return json(403, { error: "Không thể xóa chính tài khoản đang đăng nhập." }, allowedOrigin);

   const { data: target, error: targetError } = await admin.from("profiles")
     .select("id,email,role").eq("id", targetId).maybeSingle();
   if (targetError || !target)
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
