# Quản lý học sinh & phòng máy — React, Supabase, Vercel

## Bản sửa đăng nhập và quản lý nhiều trường

- Hiển thị lỗi ngay trong trang đăng nhập/đăng ký, xử lý lỗi mạng, xác nhận email và gửi lại email.
- Tạo hồ sơ `profiles` bằng trigger sau đăng ký Auth, kể cả khi chưa xác nhận email; đồng bộ các tài khoản Auth đã có nhưng thiếu hồ sơ.
- Admin: xem danh sách tài khoản (50/trang), sửa tên, duyệt giáo viên, đổi vai trò, khóa/mở quyền sử dụng. Không tự hạ quyền/khóa chính mình.
- Giáo viên được duyệt: sử dụng các chức năng nghiệp vụ, tự tạo nhiều trường và chuyển trường ở thanh bên. Không đọc hoặc sửa tài khoản giáo viên khác, kể cả gọi API trực tiếp.
- Mỗi giáo viên quản lý các trường mình tạo; trường và dữ liệu cũ được bảo toàn, thành viên cũ được chuyển từ `profiles.school_id`. Admin xem toàn bộ trường. Hai giáo viên tạo tên trường giống nhau vẫn có không gian dữ liệu riêng.
- Nhập ảnh lịch: gửi ảnh qua API có xác thực; xem lại và sửa trường/lớp/ngày/giờ; chọn lặp 1–16 tuần; lưu trường, lớp và lịch trong một giao dịch. Bỏ qua buổi trùng hệt; lịch chồng giờ sẽ hủy toàn bộ đợt nhập.
- Có thể thêm dòng thủ công, không cần dịch vụ AI. Đơn giá lịch nhập là 0; dùng nút **Sửa** của buổi học để cập nhật.

## Chạy hoặc cập nhật

1. Node.js 22+, `npm ci`.
2. **Supabase đã có bảng:** chỉ chạy `supabase/migrations/20261115_auth_roles_schools.sql` trong SQL Editor.
   **Dự án trống:** chạy `supabase/schema.sql` một lần, rồi migration trên. Không chạy lại schema cũ sau migration vì sẽ thêm lại policy cũ.
3. Sao chép `.env.example` thành `.env.local`, điền URL dự án thật và publishable/anon key. Không dùng URL GitHub `/supabase`; đây chỉ là thư mục mã SQL.
4. `npm run dev` để chạy giao diện. API `/api/timetable` cần Vercel hoặc `vercel dev` với biến máy chủ tương ứng.
5. `npm test` kiểm tra phân quyền và nhập lịch trên PostgreSQL nhúng (PGlite), không dùng dữ liệu thật. `npm run build` tạo bản production.

## Vercel

Import repository, chọn Vite, Root Directory là thư mục chứa package.json. Build `npm run build`, Output `dist`; file `vercel.json` đã xử lý `/register` và API.

Thêm biến cho môi trường sử dụng (Production và Preview nếu cần):

| Biến | Giá trị |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL trong Supabase Settings / API |
| `VITE_SUPABASE_ANON_KEY` | Publishable hoặc legacy anon key của đúng project |
| `GEMINI_API_KEY` | Khóa Google AI Studio, chỉ ở server, cần cho đọc ảnh |
| `GEMINI_MODEL` | ID model có hỗ trợ ảnh và `generateContent` trong tài khoản AI Studio |

Có thể dùng `VITE_SUPABASE_PUBLISHABLE_KEY` thay `VITE_SUPABASE_ANON_KEY`. Nếu đặt cả hai, publishable key được ưu tiên.
Sau khi đổi biến `VITE_*`, **Redeploy**: Vite nhúng các giá trị này lúc build. Không đưa service_role hoặc Gemini API key vào biến bắt đầu bằng `VITE_`.

Trong Supabase Authentication / URL Configuration đặt Site URL là domain production và cho phép đúng URL callback của các domain dùng để đăng ký/xác nhận. Giữ xác nhận email; người dùng cần mở email trước khi đăng nhập. Kiểm tra Authentication / Users, không chỉ bảng `profiles`.

## Admin đầu tiên

Đăng ký bằng email của người quản trị, xác nhận email. Người có quyền SQL Editor chạy (thay email chính xác):

```sql
update public.profiles
set role = 'admin', is_active = true
where email = 'EMAIL_ADMIN_DA_DANG_KY';
```

Kiểm tra câu lệnh cập nhật đúng **1 dòng**, rồi đăng nhập lại. Không tự phong tài khoản đăng ký đầu tiên thành Admin. Các giáo viên tiếp theo do Admin duyệt tại **Quản lý tài khoản**.
Khóa tài khoản ở đây là khóa quyền truy cập dữ liệu ứng dụng, không xóa tài khoản Auth hay dữ liệu đã tạo. Không có chức năng xóa vĩnh viễn tài khoản.

## Dùng ảnh thời khóa biểu

1. Tạo trường đầu tiên, mở **Điểm danh & lịch → Nhập thời khóa biểu từ ảnh**.
2. Chọn JPG/PNG/WebP tối đa 3 MB và thứ Hai của tuần áp dụng.
3. Đồng ý gửi ảnh tới Google Gemini, bấm **Đọc ảnh**. Không lưu ảnh gốc vào database.
4. Kiểm tra từng dòng, sửa giờ nếu ảnh chỉ ghi số tiết, bỏ dòng của giáo viên khác. AI có thể đọc sai; kết quả chưa tự ghi vào database.
5. Chọn số tuần và **Xác nhận lưu trường, lớp và lịch**. Tối đa 500 buổi/lần, 20 yêu cầu đọc ảnh/tài khoản/ngày. Yêu cầu AI lỗi sau khi lấy hạn mức vẫn tính một lần.

Chưa cấu hình AI, hết hạn mức hoặc lỗi dịch vụ: website hiển thị nguyên nhân, vẫn nhập lịch bằng tay. Chưa có ảnh thật và khóa AI thì chưa thể kiểm chứng độ chính xác nhận diện thực tế.

## Chẩn đoán đăng nhập

- Không có request trong Network: xem lỗi console và cấu hình frontend.
- Request tới sai hostname: sửa Project URL và khóa cùng dự án, Redeploy.
- 401 / Invalid login credentials: email/mật khẩu chưa đúng hoặc chưa đăng ký.
- Email not confirmed: xác nhận email, kiểm tra thư rác hoặc gửi lại.
- Database error saving new user: xem Auth/Postgres logs và trigger `on_auth_user_created`.
- Auth có user nhưng thiếu profile: migration có câu đồng bộ, không cần tạo lại tài khoản.
- Chờ cấp quyền: Auth đã thành công; Admin cần duyệt. Không phải lỗi mật khẩu.

## Ghi chú kiểm thử và quyền

`tests/security.test.js` kiểm tra trigger không nhận vai trò từ metadata; RLS đọc/ghi; tự nâng quyền; trường chéo; tài khoản khóa/chờ; Admin; nhập lặp; rollback; giới hạn AI; ngày/giờ/lặp tuần. Các hàm RPC đặc quyền kiểm tra vai trò từ bảng profiles, không tin metadata/JWT role tự khai. Bảng hạn mức không cho trình duyệt truy cập trực tiếp; chỉ qua RPC. Supabase Advisor có thể nêu các RPC SECURITY DEFINER được cấp cho authenticated: đây là quyền có chủ đích, có kiểm tra trong hàm; không có quyền gọi các RPC quản trị từ anon.

### Cấp Admin theo email đã xác minh

Migration tùy chọn `supabase/migrations/20261115_verified_initial_admin.sql` hỗ trợ chuẩn bị một email Admin trước khi đăng ký. Chủ dự án chạy migration, sau đó thêm email chính xác vào bảng riêng (không đưa email cá nhân vào mã GitHub):

```sql
insert into private.initial_admin_claims(email)
values ('email-admin@example.com') on conflict(email) do nothing;
```

Khi người dùng đăng ký và xác nhận email, trigger sẽ cấp Admin một lần. Tài khoản chưa xác nhận không được cấp quyền; giáo viên không truy cập được danh sách này. Nếu tài khoản đã xác nhận trước khi chuẩn bị email, cấp quyền bằng SQL theo mục Admin đầu tiên. Kiểm thử cơ chế này: `tests/bootstrap.test.js`.
