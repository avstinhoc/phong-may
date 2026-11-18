# QLPM — tạo Google Sheets tự động trong một thư mục Drive

## Cấu trúc thật, đã xác minh

```text
QLPM/ (ID: 1d8ZiM9q2xyxKNZwTSD5mN77fpVma-Nti)
├── DS ĐIỂM DANH                                  ← Mẫu trống, ID 1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM
├── DS ĐIỂM DANH THCS DUY TÂN                      ← File hiện có: giữ nguyên
├── DS ĐIỂM DANH THCS VŨNG TÀU                     ← File hiện có: giữ nguyên
└── DS ĐIỂM DANH [TRƯỜNG MỚI]                     ← Tự tạo khi giáo viên bấm nút
```

Không tạo thư mục con cho từng trường. QLPM xác định quyền và danh sách theo **school_id** trong Supabase, không theo tên thư mục. Một trường chỉ có một `school_sheet_links`; giáo viên được phân quyền tại cùng trường dùng chung bảng tính đó.

## Tại sao có Apps Script?

Google xác nhận **Service Account không có quota lưu trữ và không thể sở hữu file mới** trong My Drive cá nhân. Việc cấp Editor thư mục đủ để cập nhật file, **không đủ để tự tạo file mới** bằng danh tính Service Account. QLPM sử dụng Apps Script chạy *Execute as me* bởi tài khoản Google có quyền sửa thư mục; Apps Script tạo bản sao ở Drive của chủ file. Service Account tiếp tục đọc/ghi bảng tính như trước, **không kích hoạt Google OAuth của từng giáo viên**.

## Thiết lập một lần bởi chủ Drive

1. Đảm bảo file mẫu **DS ĐIỂM DANH** trống dữ liệu học sinh và nằm trực tiếp trong thư mục QLPM. Link mẫu: https://docs.google.com/spreadsheets/d/1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM/edit
2. Đảm bảo thư mục QLPM đã cấp `Editor` cho `ic3-sheets-sync@qlpm-ic3.iam.gserviceaccount.com`. **Đổi quyền truy cập chung về Hạn chế**; tuyệt đối không để **Anyone → Editor**.
3. Đăng nhập Google bằng **chủ sở hữu thư mục QLPM**, mở https://script.google.com/home/projects/create, tạo project `QLPM Drive Copy`.
4. Copy **toàn bộ mã nguồn** [qlpm-drive-auto-copy.gs](../google-apps-script/qlpm-drive-auto-copy.gs) vào file `Code.gs`. Lưu.
5. Chọn hàm **setupQlpmCopy** → **Run**, chấp thuận quyền Google Drive. Mở **Execution log**, sao chép giá trị sau `QLPM_APPS_SCRIPT_SIGNING_KEY =` (giữ kín, không gửi vào chat/repo).
6. Chọn **Deploy → New deployment → Web app**. Thiết lập:
   - **Execute as:** Me.
   - **Who has access:** Anyone. Endpoint được bảo vệ bằng HMAC-SHA256 và hết hạn sau 5 phút; **không công khai quyền Drive**.
   - **Deploy**, sao chép URL kết thúc bằng `/exec`.
7. Trong [Supabase Edge Secrets](https://supabase.com/dashboard/project/hzxfgwnwmpdqxkvnqyim/settings/functions), thêm:
   - `QLPM_APPS_SCRIPT_WEB_APP_URL` = URL web app `/exec`.
   - `QLPM_APPS_SCRIPT_SIGNING_KEY` = khóa lấy ở bước 5.
   Không thêm các khóa này vào Vercel Frontend, JavaScript client hoặc GitHub.
8. Trên website QLPM, chọn **trường chưa có file**, mở **Danh sách học sinh → Liên kết Google Sheets**, bấm **Tạo file Google Sheets của trường**.

QLPM sẽ: xác thực giáo viên thuộc `school_id` → tìm file cùng tên ở QLPM → nếu chưa có, gửi yêu cầu có chữ ký đến Apps Script → tạo file mới từ mẫu trong QLPM → kiểm tra lại quyền Editor của Service Account và đúng thư mục → tạo liên kết trường (không ghi đè dữ liệu) → tự đồng bộ.

## Xử lý lỗi

- **QLPM_APPS_SCRIPT_WEB_APP_URL/KEY chưa cấu hình**: thiếu bước 6–7. Thực hiện một lần với tài khoản chủ Drive.
- **403/404 khi kiểm tra quyền Drive**: kiểm tra `Editor` Service Account tại QLPM, đảm bảo file mẫu nằm trong QLPM. Truy cập bằng kết nối ChatGPT khác với quyền Service Account.
- **Có nhiều file trùng tên**: QLPM chặn sao chép để tránh liên kết sai; xem lại các file trực tiếp trong QLPM.
- **Trường đã có file**: QLPM dùng lại link theo `school_id`; không sao chép và không xóa file cũ.
- **Tên file có sẵn, chưa có link trường**: QLPM xác minh quyền/tên/thư mục và gắn file hiện có, không tạo bản sao trùng.
- **Không có quyền mở Google Sheets trực tiếp**: giáo viên vẫn đồng bộ được qua QLPM; muốn chỉnh file trên Google Drive thì chủ Drive chia sẻ đúng file của trường cho giáo viên đó.
- **Apps Script trả về HTML**: kiểm tra đang dùng URL `/exec`, không phải `/dev`, và quyền truy cập của web app phù hợp. Sau khi sửa Apps Script, phải tạo **New version** của deployment.

**Bảo mật:** Chỉ cho chủ Drive và Admin truy cập Apps Script. Quyền truy cập web app `Anyone` không đồng nghĩa với quyền Google Drive `Anyone`; chỉ những yêu cầu có chữ ký HMAC hợp lệ mới được tạo file.
