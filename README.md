# IC3 GS6 – Computer Lab Management

Website quản lý phòng máy IC3 GS6, React + Vite + Supabase.

## Chức năng hiện có trong bản khởi đầu

- Đăng nhập email/mật khẩu và đăng ký tài khoản giáo viên (mặc định chờ cấp quyền).
- Dashboard thống kê.
- Quản lý hồ sơ học sinh, duyệt hồ sơ, tìm kiếm và xuất Excel.
- Quản lý máy tính: tạo nhanh PC1–PC40 hoặc số lượng lớn hơn; thêm máy riêng; sức chứa 1–2 học sinh.
- Gán học sinh vào máy.
- Tạo lịch học, ghi nhận giờ dạy, số tiết, đơn giá tiền học/tiết và tiền công/giờ.
- Ghi nhận điểm, thưởng, vi phạm.
- Nhật ký vệ sinh theo máy và học sinh.
- Nhận xét học sinh theo quy tắc từ điểm, thưởng, lỗi, chuyên cần; giáo viên lưu nhận xét.
- Tổng hợp học phí dự kiến và tiền công; xuất Excel.

## Yêu cầu

- Node.js 20+
- Tài khoản Supabase
- GitHub (lưu mã nguồn) và Vercel (host website) nếu muốn đưa lên Internet.

## Chạy thử

1. Tạo project tại https://supabase.com.
2. Mở SQL Editor trong Supabase, chạy toàn bộ `supabase/schema.sql`.
3. Vào Project Settings → API, lấy Project URL và anon/public key.
4. Sao chép `.env.example` thành `.env`, điền hai giá trị:
   ```
   VITE_SUPABASE_URL=https://....supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
5. Cài và chạy:
   ```
   npm install
   npm run dev
   ```
6. Đăng ký tài khoản giáo viên đầu tiên trong website.
7. Tạo trường trong SQL Editor:
   ```
   insert into public.schools(name) values ('Tên trường') returning id;
   ```
8. Gán tài khoản đầu tiên thành admin và gắn trường:
   ```
   update public.profiles
   set role='admin', school_id='UUID_TRUONG', school_name='Tên trường'
   where email='email_dang_ky';
   ```
9. Đăng xuất/đăng nhập lại.

## Đưa website lên Internet

- Đẩy source code lên GitHub.
- Tạo project mới trên Vercel, import repository.
- Thêm Environment Variables `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
- Deploy.
- Trong Supabase Authentication → URL Configuration, thêm domain Vercel vào Site URL và Redirect URLs.

## Những việc cần cấu hình trước khi dùng thật

Đây là bản nền có giao diện và các luồng quản lý chính, chưa phải hệ thống đã được triển khai/kiểm thử trên tài khoản Supabase của bạn. Cần cấu hình và kiểm thử dữ liệu trước khi dùng chính thức.

1. **Quy trình đăng ký học sinh:** đã có trang công khai `/register` để học sinh nhập mã lớp, họ tên, mã học sinh, số điện thoại và máy mong muốn; giáo viên xem hồ sơ chờ duyệt trong mục Học sinh. Sau khi duyệt, hồ sơ được đưa vào danh sách chính thức. Mã lớp phải được giáo viên tạo trước.
2. **Phân quyền quản trị:** tài khoản đầu tiên phải được gán `admin` thủ công bằng SQL. Không cấp quyền admin qua form đăng ký công khai.
3. **AI tạo sinh:** phần đánh giá hiện dùng quy tắc tự động, chưa gọi API mô hình AI. Muốn có AI viết nhận xét tự nhiên cần thêm backend/Edge Function và khóa API ở server, không đặt khóa bí mật trong frontend.
4. **Tính phí:** hiện tính học phí dự kiến theo số học sinh trong lớp × đơn giá/tiết × số tiết; tiền công theo giờ bắt đầu/kết thúc. Cần bổ sung quy tắc miễn giảm, buổi nghỉ, thanh toán và công nợ nếu đơn vị cần.
5. **Chấm công:** hiện có tạo buổi học và dữ liệu lịch; cần hoàn thiện giao diện điểm danh từng học sinh và check-in/check-out giáo viên theo quy trình thực tế.
6. **RLS:** rà soát lại chính sách bảo mật theo mô hình nhiều trường, nhất là phân quyền admin, giáo viên và học sinh. Không dùng dữ liệu thật trước khi kiểm thử các trường hợp truy cập chéo.

## Cấu trúc

- `src/App.jsx`: giao diện và luồng chức năng
- `src/style.css`: giao diện responsive
- `supabase/schema.sql`: cấu trúc dữ liệu và Row Level Security
- `.env.example`: cấu hình kết nối
