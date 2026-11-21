# QLPM Student Web · triển khai bản thử nghiệm

Ngày 21/11/2026. Thay thế hướng phát triển ứng dụng Windows (Teacher.exe / Student.exe) bằng **Teacher web + Student web**. Nhánh `feature/qlpm-student-web-20261121` và PR #80.

## Các đường dẫn
- Giáo viên/Admin: `https://phong-may.vercel.app/` (không cần ứng dụng cài đặt).
- Học sinh: `/student-web` — mở trang là đăng nhập; không có chế độ học thử bỏ qua tài khoản.
- Đăng ký học sinh: `/student-web?mode=register&code=<MÃ_LỚP>`.
- BXH trường: iframe cùng nguồn `/school?code=<MÃ_LỚP>` dùng đúng BXH gốc và sắp xếp của máy chủ. Không tính sao hoặc tạo BXH song song.
- `/student` là cổng thông tin lớp cũ và vẫn hoạt động để giữ tương thích đường dẫn giáo viên đã phát.

## Học sinh
- Đăng ký: mã lớp, họ tên thật, tên đăng nhập tự chọn không trùng (4–24 ký tự thường [a-z0-9._], bắt đầu bằng chữ), PIN 6 chữ số (nhập lại), PC mong muốn tùy chọn.
- Hệ thống **luôn tạo yêu cầu chờ giáo viên duyệt**, bất kể cấu hình tự duyệt lớp. Chưa duyệt thì không đăng nhập, không xuất dữ liệu riêng.
- Đăng nhập: chỉ tên đăng nhập + PIN, sau đó xem bài giảng IC3, câu hỏi, trò chơi Săn Sao, BXH của trường và thông tin PC.
- Phiên là bearer token ngẫu nhiên (chỉ lưu hash trên máy chủ), tạm lưu ở `sessionStorage` từng tab; hết phiên phải đăng nhập lại. Không lưu PIN trên trình duyệt.
- PIN lưu dưới dạng bcrypt hash; 5 lần sai liên tiếp bị khóa 15 phút. Giáo viên **không thể xem mã PIN gốc**. Cần quy trình đặt lại sau xác minh danh tính (chưa mở trên UI Student Web).
- Trên web, PC là **yêu cầu liên kết để giáo viên duyệt**, không chứng minh được vị trí máy vật lý; không có khả năng điều khiển màn hình, chạy lệnh hay tự khởi động Windows.

## Giáo viên
- Menu "Đăng ký & duyệt" hiển thị tên đăng nhập và trạng thái PIN "Đã tạo (ẩn)" thay cột trạng thái; yêu cầu mới cũng hiện tài khoản.
- Việc duyệt được liên kết transaction với hồ sơ `students` hiện có bằng `qlpm_teacher_student_web_approve`, không tạo bảng học sinh hay bảng điểm độc lập.
- Dữ liệu điểm, sao, bảng xếp hạng, lớp, lịch và PC cũ giữ nguyên.

## Thay đổi backend (đã áp dụng 21/11/2026)
Migration Supabase `20261121132400_qlpm_student_web_credentials.sql` (tên `qlpm_student_web_credentials`). Các RPC:
- `qlpm_student_web_register`, `qlpm_student_web_login`, `qlpm_student_web_whoami` (student web).
- `qlpm_teacher_student_web_accounts`, `qlpm_teacher_student_web_approve` (giáo viên, kiểm quyền `can_access_school`).
- Cơ sở dữ liệu tiếp tục dùng RPC `qlpm_student_desktop_logout` và phiên server đã tồn tại để tránh xóa dữ liệu/phá trò chơi đang dùng.
- Credentials table bật RLS và khóa SELECT trực tiếp cả anon/authenticated. Không có RPC nào trả `pin_hash` hoặc PIN gốc.

## Bước kiểm thử trước khi lên Production
1. Dùng **lớp/máy thử**: đăng ký hợp lệ, tên đăng nhập trùng, PIN không hợp lệ, PIN nhập lại sai; đảm bảo chỉ đúng trường/lớp xuất hiện.
2. Giáo viên đúng chủ lớp duyệt; giáo viên trường khác không đọc/duyệt được. Kiểm tra hồ sơ hiện có không bị nhân đôi.
3. Học sinh đăng nhập, đóng/mở tab, khóa PIN 5 lần sai, đăng xuất, hết phiên, yêu cầu liên kết PC và chờ duyệt.
4. Bài giảng 22 bài, bài tập, game, sao/điểm; đảm bảo thưởng do máy chủ xác minh, không lấy điểm giả từ client.
5. Kiểm tra link BXH mỗi trường bằng mã lớp tương ứng; xét thứ tự khi cùng sao, lấy theo máy chủ.
6. Kiểm tra hiển thị và tốc độ trên Chrome/Edge Windows phòng máy, điện thoại; chạy kiểm thử tự động CI.
7. Rà soát chống dò PIN/bot qua rate limiting mạng/gateway (tài khoản đã có khóa 5 lần) và đăng ký hàng loạt trước khi phổ biến trong trường.

**Chưa hợp nhất PR #80 vào main / chưa cập nhật Production Vercel.** Chỉ dùng Preview để rà soát đến khi hoàn tất QA và bảo mật.
