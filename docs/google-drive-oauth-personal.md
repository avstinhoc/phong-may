# Phưn QLPM – Google OAuth 2.0 cho My Drive cá nhân (không mua Google Workspace)

## Vì sao có lỗi Service Account
Nút **Tạo Sheets cho trường này** trước đây gọi `google-sheets-sync/provision_school` bằng Service Account. Service Account không thể tự sở hữu tệp trong My Drive cá nhân, nên báo `GOOGLE_SHEETS_PARENT_FOLDER_ID`. Luồng mới dùng OAuth 2.0 của **từng giáo viên**, tạo file mới do chính tài khoản Google được kết nối sở hữu. Không thay tài khoản đăng nhập Supabase, không thay quyền Admin/Giáo viên.

## Bước 6 – nhập Secrets (chỉ trong Supabase Dashboard)
Tại https://supabase.com/dashboard/project/hzxfgwnwmpdqxkvnqyim/functions/secrets thêm **4 biến**:
- `GOOGLE_OAUTH_CLIENT_ID`: OAuth Client ID của ứng dụng Web trong Google Cloud.
- `GOOGLE_OAUTH_CLIENT_SECRET`: OAuth Client Secret của chính Client ID trên.
- `GOOGLE_OAUTH_REDIRECT_URI`: **chính xác** `https://hzxfgwnwmpdqxkvnqyim.supabase.co/functions/v1/google-drive-oauth`.
- `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`: Base64 mã hóa **32 byte ngẫu nhiên**, để mã hóa refresh token bằng AES-256-GCM. **Không** dùng mật khẩu đơn giản, email, API key hay Client Secret làm khóa mã hóa.

Windows PowerShell tạo khóa an toàn:
```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```
Sao chép kết quả **chỉ vào Supabase Secrets**, không gửi kết quả qua chat hoặc GitHub. Sau khi có token đã mã hóa, **không đổi khóa** tùy tiện nếu chưa lên kế hoạch kết nối lại.

## Google Cloud: bổ sung redirect URI – không xóa callback đăng nhập Google hiện tại
Vào Google Cloud Console → Google Auth Platform → Clients → chọn OAuth 2.0 Web application có Client ID/Secret tương ứng.
Thêm **Authorized redirect URI**:
`https://hzxfgwnwmpdqxkvnqyim.supabase.co/functions/v1/google-drive-oauth`
Đây là callback của **Google Drive OAuth**. Giữ nguyên callback đăng nhập Google cũ `https://hzxfgwnwmpdqxkvnqyim.supabase.co/auth/v1/callback` nếu đang dùng Supabase Google Sign-In.

Authorized JavaScript origins có thể giữ `https://phong-may.vercel.app`. Bật Google Drive API và Google Sheets API trên **cùng Google Cloud Project**.

Nếu OAuth consent screen ở trạng thái **Testing**, thêm địa chỉ Google của từng giáo viên thử nghiệm vào Audience → Test users. Với scope Sheets/Drive, refresh token của app External Testing thường hết hạn sau 7 ngày; khi đó giáo viên cần kết nối lại. Kiểm tra yêu cầu xác minh Google nếu mở app cho nhiều giáo viên ngoài nhóm test.

## Sau khi Vercel đã cập nhật bản OAuth
1. Vào `https://phong-may.vercel.app` → chọn THCS Vũng Tàu → **Danh sách học sinh → Liên kết Google Sheets**.
2. Ở khung **Google Drive cá nhân · OAuth 2.0**, nhấn **Kết nối Google Drive**, chọn tài khoản Google có quyền truy cập file mẫu của bạn và đồng ý cấp quyền.
3. Khi khung báo **Đã kết nối**, nhấn **Tạo Sheets cho trường này**.
4. Nếu Google Drive `files.copy` bị giới hạn `drive.file` đối với file cũ, máy chủ sẽ tạo Google Sheets mới và sao chép tab mẫu bằng Google Sheets API `spreadsheets.sheets.copyTo`. Cả hai cách chỉ ghi vào **file mới**, không sửa file mẫu.
5. Sau khi file mới được tạo và làm sạch tên/điểm/checkbox mẫu, QLPM liên kết đúng trường và có thể bổ sung lớp/điểm từ web khi mở danh sách.
6. Xem link file mới trong Google Sheets, kiểm tra tên trường, tab và logo trước khi dùng. Với fallback `copyTo`, một số hình nhúng, Apps Script gắn file, biểu đồ hoặc cấu hình ngoài ô có thể cần kiểm tra riêng.

### Quy tắc an toàn
- Mỗi giáo viên/trường dùng một file riêng; không tái sử dụng link của trường khác.
- OAuth state ngẫu nhiên, hết hạn sau 10 phút và chỉ dùng một lần; PKCE S256.
- Refresh token được mã hóa ở Supabase; frontend chỉ nhận trạng thái kết nối và email, không nhận token.
- Bảng `google_drive_connections` và `google_oauth_states` bật RLS, thu hồi quyền đọc của `anon` và `authenticated`; service-role máy chủ đọc/ghi.
- Google Drive API dùng quyền `drive.file`, không dùng quyền toàn bộ Drive bị hạn chế. Google Sheets API dùng quyền `spreadsheets` để đọc mẫu và ghép tab.
- Khóa OAuth và Client Secret nằm ở Supabase Secrets, không cần biến `VITE_*` trên Vercel.
- Ngắt kết nối không xóa file Google hay dữ liệu học sinh; chỉ thu hồi quyền của QLPM.
- OAuth chỉ tạo/đổi quyền Google Drive. **Không phải đăng nhập Supabase**; vẫn kiểm tra phiên người dùng và `profiles.role/is_active` trước mọi tác vụ.
- Giữ `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` tạm thời để các liên kết cũ vẫn có fallback đọc/ghi nếu tài khoản chưa dùng OAuth.

## Triển khai
- Edge `google-drive-oauth` với `verify_jwt=false` **chỉ vì callback GET từ Google không có Supabase JWT**. Các POST `start/status/disconnect` bắt buộc kiểm tra Supabase JWT thực và role.
- Edge `google-sheets-sync` vẫn `verify_jwt=true`; đọc token OAuth của chính owner trước, chỉ fallback Service Account nếu chưa có kết nối OAuth.
- Migrations: `supabase/migrations/20261118020000_google_drive_oauth.sql`.
- UI: `src/GoogleDriveOAuthCard.jsx`, `src/SheetsConnectionPanel.jsx`.

## Kiểm chứng bắt buộc
Chỉ coi việc tích hợp Google thành công khi tài khoản giáo viên hoàn thành OAuth, trình duyệt báo Connected, và tạo được **file mới có ID khác mẫu**, dữ liệu học sinh/điểm mẫu đã được làm sạch, tên trường/định dạng tab đúng. CI/Edge ACTIVE không chứng minh OAuth Client, Secrets và consent screen đã hoàn chỉnh.
