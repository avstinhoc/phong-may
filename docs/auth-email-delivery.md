# Email xác thực IC3 GS6 — cấu hình Production

Hiện website dùng Supabase Auth để gửi các email **xác nhận đăng ký**, **gửi lại xác nhận**, **khôi phục mật khẩu**.
Mã frontend không thể ép Gmail đưa thư vào Inbox. Việc gửi thành công khác với việc được phát vào hộp thư chính.

## Tình trạng hiện tại (17/11/2026)

- Vercel Production chỉ có tên miền `phong-may.vercel.app` và `phong-may-avstinhoc.vercel.app`.
- Không tìm thấy biến SMTP/Resend liên quan trong Vercel; Supabase Auth SMTP được cấu hình riêng tại **Supabase Dashboard**.
- Ảnh người quản trị cung cấp cho thấy thư gửi từ tài khoản Gmail cá nhân và bị Gmail đánh dấu Spam.
- **Chưa có tên miền riêng được xác thực** để đặt SPF/DKIM/DMARC.

## Cách xử lý đúng (không thay đổi bảo mật)

1. Dùng tên miền do đơn vị sở hữu (ví dụ `your-domain.vn`, đây chỉ là ví dụ, không phải địa chỉ đã tồn tại).
2. Tạo nhà cung cấp email giao dịch, ưu tiên **Resend** hoặc **Brevo**.
3. Xác minh tên miền trên nhà cung cấp theo các bản ghi SPF/DKIM/DMARC họ cung cấp. Không dùng địa chỉ Gmail cá nhân làm `From:` của dịch vụ khác.
4. Trong **Supabase → Authentication → Email/SMTP Settings**, bật **Custom SMTP**, nhập host, port, user, SMTP password của nhà cung cấp, Sender Name `IC3 GS6`, From address `no-reply@<tên miền đã xác minh>`.
5. Giữ **Confirm email** bật. Không đặt `mailer_autoconfirm=true` nhằm né lỗi gửi mail.
6. Chỉnh nội dung email thành mẫu xác nhận đơn giản: “Xác nhận địa chỉ email của bạn để kích hoạt tài khoản IC3 GS6”, một nút xác nhận duy nhất; hạn chế hình, link dư.
7. Gửi thử cho hai tài khoản ở các nhà cung cấp khác nhau (ví dụ Gmail và Outlook). Kiểm tra **SPF=pass, DKIM=pass, DMARC=pass** trong phần headers và log giao thư tại nhà cung cấp.
8. Ghi nhận riêng kết quả *accepted*, *delivered* và *Inbox/Spam* — không coi việc được nhà cung cấp nhận là bảo đảm Inbox.

## Trường hợp dùng Resend

Resend hỗ trợ SMTP qua host `smtp.resend.com`, người dùng `resend` và API key làm mật khẩu SMTP.
Hãy dùng giá trị host/port mới nhất từ trang cài đặt SMTP của Resend; không commit API key hoặc mật khẩu vào GitHub.
Cấu hình **SMTP của Supabase Auth**, không phải chỉ thêm biến `RESEND_API_KEY` vào Vercel: chỉ thêm env của Vercel sẽ không chuyển luồng email xác thực Supabase.

## Tài liệu chính thức

- Supabase: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
- Resend: https://resend.com/blog/how-to-configure-supabase-to-send-emails-from-your-domain

**Quan trọng:** Không bật/tắt SMTP hoặc chuyển provider khi chưa xác minh quyền sở hữu tên miền, tài khoản gửi, SPF/DKIM và mẫu email thực. Đổi sai có thể làm người dùng không xác minh hoặc đặt lại mật khẩu được.
