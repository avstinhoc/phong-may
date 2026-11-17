# IC3 GS6 — Kích hoạt đăng nhập Google (không cần mua tên miền)

Code đã được bổ sung nút **Tiếp tục với Google** trong đăng nhập/đăng ký; mục **Cá nhân** có nút **Liên kết tài khoản Google**. Email/mật khẩu hiện tại vẫn hoạt động. Chưa thể đăng nhập Google thật **cho tới khi Admin hoàn tất cấu hình Google OAuth ở Supabase**, không cần sửa code hay thêm khóa Google vào Vercel.

## 1. Google Auth Platform (Google Cloud Console)

1. Truy cập https://console.cloud.google.com/auth/overview, chọn hoặc tạo project miễn phí, cấu hình **Branding** (IC3 GS6), **Audience** (External nếu dùng Gmail cá nhân) và **Data Access** theo hướng dẫn của Google. Chỉ cần OpenID, email và profile.
2. Trong **Clients → Create client → Web application**, đặt tên `IC3 GS6 - phong-may`.
3. **Authorized JavaScript origins**: `https://phong-may.vercel.app`
4. **Authorized redirect URIs**:
   `https://hzxfgwnwmpdqxkvnqyim.supabase.co/auth/v1/callback`
   Đây là callback của **Supabase Auth**, không phải `/auth/callback` của frontend.
5. Tạo Client ID và Client Secret; **giữ bí mật** Secret. Không gửi vào chat, không ghi vào repo hoặc Vercel frontend.
6. Nếu ứng dụng ở chế độ Testing, thêm email giáo viên muốn thử vào Test users, hoặc chuyển trạng thái Publishing phù hợp trước khi triển khai rộng.

## 2. Supabase Auth

- Mở https://supabase.com/dashboard/project/hzxfgwnwmpdqxkvnqyim/auth/providers
- Trong **Google**, bật Enable; nhập Client ID và Client Secret đã tạo; lưu lại.
- Mở https://supabase.com/dashboard/project/hzxfgwnwmpdqxkvnqyim/auth/url-configuration
  - Site URL: `https://phong-may.vercel.app`
  - Redirect URLs (giữ URL đang có, thêm nếu chưa tồn tại): `https://phong-may.vercel.app/auth/callback`
- Để dùng **Cá nhân → Liên kết tài khoản Google** khi đang đăng nhập email/mật khẩu, bật **Manual Identity Linking** trong cấu hình Authentication nếu dự án hỗ trợ.
- Không sửa Google Client Secret vào biến `VITE_*`: các biến này công khai trong trình duyệt.

## 3. Tài khoản cũ và phân quyền

- Đăng nhập email/mật khẩu **vẫn chạy như cũ**.
- Người đã có tài khoản: đăng nhập **bằng email/mật khẩu trước**, vào **Cá nhân → Liên kết tài khoản Google**, chọn đúng Google của mình. Sau khi thành công, Supabase Auth giữ nguyên User ID và dữ liệu.
- Với email Google đã xác thực trùng email tài khoản Supabase, Supabase thường tự liên kết. Với email khác, dùng liên kết thủ công khi đang đăng nhập.
- Người lần đầu đăng nhập bằng Google: trigger `public.handle_new_user` chỉ tạo `profiles.role='pending'`. **Không tự cấp Admin/teacher**.
- Admin vẫn duyệt ở menu **Quản lý tài khoản**. Chỉ Admin có quyền thay đổi `profiles.role` thông qua RPC của hệ thống.
- Không tự chuyển vai trò, thay email người dùng hoặc xóa tài khoản cũ.

## 4. Kiểm tra trước khi thông báo chính thức

1. Đăng nhập bằng tài khoản Google thử nghiệm chưa có trên hệ thống → hiện thông báo chờ Admin duyệt.
2. Admin duyệt `teacher` → đăng nhập lại với Google → vào trang giáo viên.
3. Một giáo viên hiện có đăng nhập email/mật khẩu → liên kết Google → đăng xuất → đăng nhập Google. Đối chiếu `profiles.id`, vai trò, lịch, học sinh trước/sau.
4. Tài khoản Admin cũ vẫn có quyền Admin; tài khoản giáo viên không truy cập quản lý tài khoản.
5. Quên mật khẩu và email/mật khẩu vẫn chạy độc lập, không bị thay đổi.

## Khi gặp lỗi

- **provider is not enabled**: bật Google trong Supabase và nhập Client ID/Secret.
- **redirect_uri_mismatch**: Google Authorized redirect URIs phải **đúng y hệt** callback của Supabase (bước 1.4).
- **redirect not allowed**: thêm callback frontend vào Supabase Redirect URLs.
- **access_denied / app not verified**: cấu hình Audience và Test users trên Google Auth Platform.
- **manual linking disabled**: bật Manual Identity Linking; nếu chưa hỗ trợ, đăng nhập bằng Google có email đã xác thực trùng email cũ, tránh tạo account mới.
- Để ngừng Google, tắt Google provider trong Supabase. Email/mật khẩu không bị ảnh hưởng.

## Tài liệu chính thức
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://supabase.com/docs/guides/auth/redirect-urls
