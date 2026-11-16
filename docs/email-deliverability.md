# IC3 GS6: Hướng dẫn cải thiện email xác thực vào Thư rác

Không có cách bảo đảm 100% email luôn vào Hộp thư đến bằng việc thay đổi code website.
Email xác thực và reset password đều sử dụng Supabase Auth SMTP đã cấu hình.

## Bước 1: Xác minh danh tính người gửi
1. Dùng một domain do trung tâm sở hữu thay cho Gmail cá nhân khi gửi email giao dịch.
2. Kết nối SMTP giao dịch như Resend, Postmark, Brevo.
3. Trong DNS domain, thêm SPF, DKIM, DMARC theo đúng hướng dẫn nhà cung cấp (không tự tạo giá trị, không tạo hai SPF).
4. Chờ nhà cung cấp xác nhận domain Verified.
5. Vào Supabase Authentication → Emails → SMTP settings; thay Sender email, Sender name, Host, Port, Username, Password bằng thông tin của SMTP giao dịch.
6. Thử gửi đến Gmail/Outlook; dùng Show original xem SPF: PASS, DKIM: PASS, DMARC: PASS.

## Bước 2: Mẫu email gọn tránh spam
Confirm signup: Subject: Xác nhận tài khoản IC3 GS6
Nội dung: Chào bạn, nhấn liên kết dưới đây để xác nhận email và hoàn tất đăng ký tài khoản giáo viên IC3 GS6.
HTML link: <a href="{{ .ConfirmationURL }}">Xác nhận email</a>
Đoạn cuối: Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email.

Reset password: Subject: Đặt lại mật khẩu IC3 GS6
Nội dung: Bạn vừa yêu cầu đặt lại mật khẩu tài khoản IC3 GS6.
HTML link: <a href="{{ .ConfirmationURL }}">Đặt lại mật khẩu</a>
Đoạn cuối: Nếu không yêu cầu, hãy bỏ qua email.

## Bước 3: Redirect URLs
Đảm bảo Authentication → URL Configuration chấp nhận các URL sau:
https://phong-may.vercel.app/auth/callback
https://phong-may.vercel.app/auth/callback?recovery=1

## Bước 4: Nếu email vẫn vào Spam
Kiểm tra Supabase Auth Logs, lỗi rate-limit, tên From, địa chỉ domain Verified, Reputation và bộ lọc người nhận.
Không gắn banner, logo/ảnh lớn hoặc quá nhiều link vào template email giao dịch.
Không chia sẻ SMTP Password, Gmail App Password, API key qua chat hoặc screenshots.

Tài liệu chính thức: https://supabase.com/docs/guides/auth/auth-smtp