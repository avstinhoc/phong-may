# IC3 GS6 – Liên kết trực tiếp Google Sheets theo trường (0đ, không dùng tên miền riêng)

## Phạm vi đã triển khai
- **Danh sách học sinh → Liên kết Google Sheets**: mỗi giáo viên chọn trường trước, dán link Sheets của trường đó. Liên kết và ánh xạ tab/tiết được lưu trong Supabase với RLS theo tài khoản & trường, Admin không đọc link giáo viên khác.
- Bản mẫu Duy Tân đã kiểm tra trực tiếp: workbook `1O2A_f-SV5C3vkKDidDdgIxwIW96xOycs1qWSPYs1xkc`, các tab `6.1`, `6.2`, 111 cột. A:I hồ sơ; J:CA checkbox B1–B70; CB:CQ 16 cột điểm; CR nhận xét, CS đạt chuẩn, CT kết quả thi; CU:CY chứa công thức tổng kết **không được ghi đè**.
- Đúng nghĩa checkbox gốc: **TRUE = vắng**, **FALSE = có mặt/không đánh dấu vắng**. Sheets không phân biệt trễ/có phép chỉ bằng checkbox; phần bổ sung này vẫn lưu được trong web, không giả định được trên Sheets.
- Hỗ trợ **gắn tab hiện có** hoặc **nhân bản tab mẫu**, tạo lớp trên web nếu chưa có; bản sao giữ nguyên định dạng, chỉ xóa nội dung học sinh/điểm/điểm danh của lớp mẫu.
- Hỗ trợ **xem trước → xác nhận → Nhập từ Sheets / Đẩy từ Web**. Khi trùng tên hoặc xung đột điểm, không ghi đè. Điểm danh chỉ đồng bộ khi giáo viên ghép `B1..B70` với từng buổi học trong web; không tự đoán theo ngày, vì hàng 7 trong mẫu dùng công thức TODAY.
- **Xuất Excel gốc** gọi Google Drive `files.export` với workbook hiện tại; cách này giữ bố cục và công thức giống Sheets tốt hơn cách vẽ lại. Excel không tái hiện được tất cả tính năng Google-native; định dạng/ảnh có thể khác một chút.
- Xuất Excel nhanh tự dựng của website vẫn giữ nguyên để dùng khi chưa cấu hình Google.

## Yêu cầu quan trọng: bật kết nối Google riêng tư (một lần)
Nút đã có trên web nhưng **đọc/ghi file riêng tư chưa chạy** cho tới khi chủ dự án tự cấu hình tài khoản dịch vụ và chia sẻ file. Không gửi khóa bí mật vào ChatGPT, GitHub hay Vercel frontend.

1. Vào [Google Cloud Console – APIs & Services](https://console.cloud.google.com/apis/library), chọn project đang dùng. Bật **Google Sheets API** và **Google Drive API**. Không cần mua tên miền.
2. Vào [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts), tạo một service account, ví dụ `ic3-sheets-sync`. Không cần gán quyền quản trị Google Cloud.
3. Vào Service Account → **Keys → Add Key → Create new key → JSON**. Đây là khóa bí mật: giữ trong máy, không gửi qua chat/email hoặc lưu trong repo. Nếu chính sách tổ chức khóa tạo private key, cần sử dụng cơ chế xác thực máy chủ khác thay vì mở quyền công khai file.
4. Vào [Supabase Edge Functions → Secrets](https://supabase.com/dashboard/project/hzxfgwnwmpdqxkvnqyim/functions/secrets), tạo biến **`GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON`**. Giá trị: **toàn bộ nội dung JSON** vừa tạo, chỉ nhập trực tiếp trên Dashboard. Không đặt `VITE_*`, không gửi qua chat.
5. Mở từng Google Sheets cần đồng bộ, **Share → thêm email service account** (`...@...iam.gserviceaccount.com`) với quyền **Editor**. Không bật Anyone with the link.
6. Truy cập website `phong-may.vercel.app` → **Danh sách học sinh → Liên kết Google Sheets**, chọn đúng trường, dán link, bấm **Lưu liên kết** → **Kiểm tra quyền & đọc tabs**.
7. Dùng **Gắn tab lớp** cho lớp 6.1/6.2. Với lớp khác, chọn **Nhân bản mẫu** tạo tab (không sửa tab nguồn), đồng thời tạo lớp trên website.
8. **Xem trước** báo số học sinh có trên Sheets/web, số học sinh cần nhập, trùng tên. Chỉ khi đã xem và xác nhận thì bấm **Nhập từ Sheets → Web** hoặc **Đẩy từ Web → Sheets**.
9. Vào **Ghép buổi học B1–B70** và chọn thứ tự các tiết đúng ngày/giờ. Chỉ các tiết ghép mới được trao đổi điểm danh vắng. Bấm **Lưu ghép tiết**.
10. Khi muốn xuất đúng bố cục mẫu, bấm **Xuất Excel gốc**. Bản này tải *trực tiếp* từ Google Sheets, gồm tất cả tab của file.

## Trung tâm / logo
Logo trung tâm được chọn trong ô **Logo trong file Excel** ở tính năng xuất nhanh của website.
- **Xuất Excel gốc**: tải nguyên workbook từ Google Drive, giữ logo gốc trong file.
- **Excel gốc + logo Trung tâm/Trường**: nếu workbook có ảnh top-left neo tại A1 (như mẫu đã kiểm tra), chỉ thay đúng file hình trong `xl/media` của XLSX mà không tái tạo hay sửa các XML dữ liệu, công thức, merge, kích thước hoặc định dạng. Các tab cùng dùng ảnh đó đều thay theo logo đã chọn.
- **Google Sheets trên web**: hình logo trong file Sheets trực tuyến **không được thay** bởi nút xuất Excel; muốn thay logo hiển thị trực tiếp trên Sheets, người dùng đổi hình trong Google Sheets.
- Nếu workbook không có ảnh logo ở A1, nút xuất sẽ trả lỗi rõ và không viết đè tệp hoặc Sheet gốc.

## Quy tắc chống mất dữ liệu
- Không bao giờ xóa lớp/học sinh/điểm hay Google Sheet chỉ vì ngắt liên kết.
- Chỉ gắn/nhân bản tab; không dùng chung file trường khác với URL riêng của trường đang chọn.
- Hồ sơ trùng tên: báo để giáo viên rà soát; không tự ghép học sinh dựa trên tên chung khi mơ hồ.
- Điểm trong web và Google có giá trị khác nhau: báo xung đột, không chọn ngầm một bên.
- Không tự động ghi đè ô công thức CU:CY hoặc tiêu đề; không xóa checkbox/hình khi kết nối.
- Quá 63 học sinh / một tab hoặc 70 buổi / một tab: báo hết chỗ, không cắt dữ liệu hoặc chèn cột làm méo mẫu.
- Lần đầu **xem trước và xác nhận** thủ công. Sau một lần đồng bộ thành công, giáo viên có thể bật **Tự đồng bộ khi mở Danh sách học sinh**. Khi bật, website chạy pull rồi push tối đa 10 tab đã gắn mỗi lần mở trang; thao tác không ghi đè ô đang có dữ liệu khác và không sửa công thức CU:CY. Không chạy ngầm 24/7; để cập nhật khi app đóng vẫn cần job được bảo vệ riêng.

## Về chi phí
Google Sheets API hiện có mức sử dụng tiêu chuẩn không tính phí bổ sung trong hạn mức; quota và chính sách có thể thay đổi, cần kiểm tra trang chính thức. Supabase/Vercel vẫn sử dụng gói hiện tại; không phải nâng gói.
- https://developers.google.com/workspace/sheets/api/limits
- https://developers.google.com/workspace/guides/create-credentials

## Kiểm tra kỹ thuật
- Supabase migration: `google_sheets_private_school_links`
- Edge Function: `google-sheets-sync` (JWT required)
- Giao diện: `src/SheetsConnectionPanel.jsx`
- Mapper + tests: `src/lib/googleSheetTemplate.js`, `tests/googleSheetTemplate.test.js`
- Thiếu cấu hình Service Account → API trả 503 hướng dẫn, **không báo giả đồng bộ thành công**.
- Trước khi kết luận E2E thành công, cần kiểm tra thực tế trên tài khoản giáo viên đã share file; Edge Function ACTIVE/build thành công chưa chứng minh quyền Google đã cấp.


## Cập nhật 18/11/2026 – tự động thay thao tác thủ công

### Tự tạo lớp và đồng bộ
Khi trang **Danh sách học sinh** được mở với liên kết đã xác minh và bật tự động:
- Edge Function `auto_sync_school` liệt kê các lớp thuộc trường hiện tại từ `classes`, `students` và `class_sessions`.
- Các tab có tên lớp như `6.1`, `6.2`, `8.2` được gắn tự động. Nếu thiếu, hệ thống tạo bản sao tab mẫu trong **cùng file của trường**, làm sạch học sinh/điểm/checkbox của bản sao **cùng một batch nguyên tử**, cập nhật tên trường/lớp, điền tiết và ngày tĩnh từ lịch web, rồi đồng bộ.
- Dữ liệu Google/website khác nhau vẫn báo xung đột, không ghi đè. Mỗi yêu cầu xử lý 3 lớp để hạn chế quá thời gian chạy miễn phí; web tiếp tục phân trang đến khi hết lớp.
- Tắt tự động bằng checkbox nếu không muốn dữ liệu tự được bổ sung khi mở trang. Khi xác minh link mới, mặc định `auto_sync=true`; **không đòi một lần đồng bộ thủ công trước**.

### Tạo Sheets riêng khi thêm trường
Trang **Trường công tác** và **Công ty/Trung tâm → Tạo trường** tự thử gọi `provision_school`. Nếu tài khoản dịch vụ có quyền ghi vào thư mục Shared Drive (`GOOGLE_SHEETS_PARENT_FOLDER_ID` trong Edge Secrets), Drive sẽ copy một file mẫu đã xác minh thuộc cùng giáo viên, làm sạch toàn bộ thông tin học sinh và giữ định dạng, rồi liên kết file mới với trường. Không dùng file/link của giáo viên khác.

**Google Drive cá nhân miễn phí không cấp quota tạo file cho Service Account**. Không thể tự copy workbook vào My Drive cá nhân chỉ với JSON service account. Trong trường hợp này, trường vẫn được tạo thành công; ứng dụng báo rõ lý do và hướng dẫn chủ file chọn **Tệp → Tạo bản sao** bằng Google Drive của họ, rồi dán URL vào mục Liên kết Google Sheets. Không ép người dùng mua Google Workspace.

### Ngày học cố định (Google Apps Script miễn phí)
Vì `TODAY()` thay đổi theo ngày, file hiện tại không thể giữ ngày dạy cũ chỉ bằng công thức. Trong mục **Liên kết Google Sheets → Ghi ngày học cố định**, bấm **Sao chép mã cố định ngày**, mở Google Sheets → **Tiện ích mở rộng → Apps Script**, dán và **Lưu**. Hàm `onEdit(e)` chạy tự động khi giáo viên nhập số tiết mới vào J6:CA6, ghi một `Date` tĩnh tại ô ngay dưới ở hàng 7. Khi điều chỉnh số tiết đã tồn tại, ngày cũ không bị đổi.

Mã lưu tại `docs/sheets-fixed-date-onedit.gs`. Chạy thủ công `kiemTraNgayCu` (tùy chọn) để bỏ công thức ngày động ở buổi trống và đánh dấu các buổi đã có tiết nhưng ngày cũ chưa được xác minh. Không chuyển giá trị TODAY hôm nay thành ngày lịch sử sai.

Google Apps Script simple trigger **không chạy khi ô được sửa qua API**. Vì vậy Edge Function tự ghi ngày tĩnh từ `class_sessions.session_date` vào tab mới do website tạo; với tab hiện có, cần Apps Script cho các lượt nhập thủ công trong Sheets.

### Bố cục
Cột H (LỚP) căn giữa từ H8:H1018 trên 7 tab có sẵn. Tab được xếp tăng tự nhiên (6.1...6.7,7.1,...8.7), không thay đổi dữ liệu hồ sơ/điểm danh trong ô.
