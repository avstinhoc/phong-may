// Hướng dẫn theo chức năng THỰC TẾ của IC3 GS6.
// Cập nhật tài liệu này khi thay đổi các nút và luồng thao tác ở giao diện.
export const helpTopics = [
  {
    id:"dashboard", title:"Tổng quan", roles:["admin","teacher","staff"],
    summary:"Xem nhanh số học sinh, máy tính, buổi dạy và hồ sơ cần duyệt.",
    steps:[
      "Chọn trường ở ô đầu thanh menu trái để xem đúng dữ liệu trường.",
      "Mở Tổng quan trong nhóm GIẢNG DẠY để xem số học sinh, máy, buổi học và hồ sơ chờ duyệt.",
      "Dùng phần Việc cần xử lý hoặc Bắt đầu nhanh để chuyển sang đăng ký học sinh, phòng máy, lịch dạy hoặc báo cáo.",
      "Nhấn biểu tượng Làm mới ở góc phải phía trên nếu vừa thêm/sửa thông tin mà chưa thấy cập nhật."
    ],keywords:["trang chủ","tổng quan","dashboard","làm mới","thống kê"]
  },
  {
    id:"attendance",title:"Lịch dạy giáo viên",roles:["admin","teacher","staff"],
    summary:"Tạo, sửa, xóa buổi học; xem tuần theo giờ thực tế từng trường; đọc ảnh, PDF, Excel, CSV, TXT hoặc chat Gemini để nhập lịch.",
    steps:[
      "Chọn đúng trường ở menu trái rồi mở Lịch dạy giáo viên.",
      "Chọn ngày bất kỳ để xem lịch 7 ngày; mỗi buổi hiện giờ bắt đầu, kết thúc, lớp và số tiết thực tế.",
      "Ở phần Tạo buổi học / chấm công, chọn lớp, ngày, giờ bắt đầu/kết thúc, giáo viên phụ trách, số tiết rồi lưu; danh sách buổi dạy có thao tác sửa hoặc xóa.",
      "Để nhập lịch từ file, mở Nhập lịch từ ảnh, file hoặc chat AI; chọn tệp và khoảng Từ ngày – Đến ngày; chọn Gemini, đồng ý xử lý và nhấn Đọc tệp.",
      "Có thể chat tự nhiên để yêu cầu lọc vài tiết hoặc chọn buổi dạy thay từ lịch giáo viên khác; Trợ lý IC3 AI có chế độ Sửa lịch: yêu cầu thêm/sửa buổi học, AI chuẩn bị bản nháp để giáo viên kiểm tra và bấm Xác nhận lưu lịch; không tự thay đổi dữ liệu.",
      "Kiểm tra từng dòng, trường/lớp, ngày và giờ học, chọn Lặp hằng tuần nếu cần rồi nhấn Xác nhận lưu lịch."
    ],notes:["Lịch của các trường có thể dùng những khung giờ khác nhau.","Lịch nhập từ AI có thể nhận sai; bắt buộc kiểm tra trước khi lưu.","Gemini cần GEMINI_API_KEY trên Vercel và có giới hạn số lượt sử dụng."],
    keywords:["thời khóa biểu","tkb","tạo lịch","sửa lịch","xóa lịch","giờ học","dạy thay","gemini","ảnh","pdf","excel","lịch dạy"]
  },
  {
    id:"rollcall",title:"Điểm danh học sinh",roles:["admin","teacher","staff"],
    summary:"Điểm danh theo lớp và từng buổi, mặc định có mặt, chọn Vắng / Đi trễ / Có phép.",
    steps:[
      "Mở Điểm danh học sinh trong nhóm GIẢNG DẠY. Phía trên vẫn có thời khóa biểu.",
      "Trong phần Điểm danh, chọn Lớp rồi chọn Buổi học theo ngày, giờ và số tiết.",
      "Danh sách chỉ gồm học sinh đã được duyệt thuộc lớp. Trạng thái mặc định là Có mặt.",
      "Bấm ô trạng thái để đổi nhanh Có mặt / Vắng hoặc dùng danh sách lựa chọn để đánh dấu Đi trễ / Có phép; nhập ghi chú nếu cần.",
      "Nhấn Lưu điểm danh lớp; kết quả được dùng chung với Danh sách học sinh. Có nút Tất cả có mặt để đặt lại toàn bộ trên giao diện trước khi lưu."
    ],keywords:["điểm danh","có mặt","vắng","đi trễ","có phép","buổi học","lưu điểm danh"]
  },
  {
    id:"students",title:"Đăng ký & duyệt",roles:["admin","teacher","staff"],
    summary:"Duyệt đăng ký học sinh, thêm học sinh thủ công, tìm kiếm và xuất danh sách.",
    steps:[
      "Mở Đăng ký & duyệt trong nhóm PHÒNG MÁY.",
      "Chỉ hiển thị đăng ký chờ duyệt của các lớp bạn tạo. Nếu bật tự duyệt trong Lớp & mã đăng ký, đăng ký hợp lệ tự thêm vào danh sách chính thức; tên trùng hoặc biệt danh không được duyệt.",
      "Nút Mở trang đăng ký dẫn đến chức năng liên quan đăng ký; quản lý mã và đường dẫn cụ thể tại Lớp & mã đăng ký.",
      "Nhấn Thêm học sinh nếu cần nhập tay: họ tên, lớp, mã học sinh (nếu có) rồi lưu.",
      "Danh sách được sắp xếp họ tên theo A–Z và đánh STT từ 1. Nút Dọn hồ sơ trùng ẩn các hồ sơ trùng khỏi danh sách đang học sau khi xác nhận, không xóa lịch sử điểm, lỗi hoặc điểm danh."
    ],notes:["Mã lớp không còn hiệu lực nếu đã bị Admin ngừng mã đăng ký."],
    keywords:["đăng ký","duyệt","từ chối","thêm học sinh","mã học sinh","hồ sơ chờ","form học sinh","register"]
  },
  {
    id:"roster",title:"Danh sách học sinh",roles:["admin","teacher","staff"],
    summary:"Xem hồ sơ, điểm danh theo buổi, kết quả kiểm tra, nhận xét; xuất Excel có logo.",
    steps:[
      "Mở Danh sách học sinh, chọn trường và lớp cần xem.",
      "Chọn thẻ Hồ sơ & điểm danh để theo dõi các buổi B1, B2...; ô trống nghĩa là có mặt, bấm ô để đánh dấu vắng và lưu.",
      "Có thể thêm, sửa hoặc xóa buổi học ở phần quản lý buổi của lớp nếu tài khoản được cấp quyền.",
      "Chuyển sang thẻ Điểm & nhận xét, chọn học sinh và nhập điểm QT, HK, TEST, mô phỏng, xếp loại hoặc nhận xét rồi lưu.",
      "Dùng nút Xuất Excel theo mẫu để lấy bảng đẹp; logo trường được thay tại Trường công tác."
    ],keywords:["danh sách","bảng điểm","qt1","qt2","hk1","test","nhận xét","b1","b2","xuất excel","hồ sơ"]
  },
  {
    id:"records",title:"Điểm, lỗi & thưởng",roles:["admin","teacher","staff"],
    summary:"Ghi điểm và vi phạm theo từng lớp; xem số lỗi trên máy, chờ xác nhận biên bản khi đủ 3 hoặc 4 lần.",
    steps:[
      "Mở Điểm, lỗi & thưởng.",
      "Chọn Lọc theo lớp và Lọc học sinh để thao tác đúng danh sách.",
      "Để ghi lỗi, chọn Lỗi / vi phạm và ghi Nhắc 1, 1 Lỗi hoặc nội dung tùy chọn, rồi nhấn Lưu ghi nhận.",
      "Chọn ngưỡng 3 hoặc 4 lần vi phạm ở ô Ngưỡng lập biên bản. Đủ số lần sẽ tạo biên bản nháp.",
      "Trong Biên bản vi phạm, giáo viên ghi ý kiến rồi chọn Xác nhận biên bản; có thể In biên bản để nộp trường.",
      "Sơ đồ Phòng máy của giáo viên và trang học sinh theo mã lớp sẽ hiện tổng số lỗi tại từng máy, không công khai nội dung biên bản."
    ],keywords:["điểm","thưởng","lỗi","vi phạm","ghi nhận","nội quy"]
  },
  {
    id:"evaluation",title:"Đánh giá học sinh",roles:["admin","teacher","staff"],
    summary:"Lọc theo lớp và học sinh, tổng hợp điểm, thưởng, vi phạm, chuyên cần và nhận xét.",
    steps:[
      "Mở Đánh giá học sinh; dùng bộ lọc lớp và tên học sinh.",
      "Chọn học sinh cần xem kết quả tự tổng hợp từ điểm, thưởng, vi phạm và điểm danh.",
      "Đọc đánh giá gợi ý, chỉnh nhận xét nếu phù hợp rồi lưu."
    ],notes:["Đánh giá tự động chỉ là hỗ trợ, giáo viên cần kiểm tra kết quả thực tế."],
    keywords:["đánh giá","nhận xét","xếp loại","chuyên cần","học sinh"]
  },
  {
    id:"computers",title:"Phòng máy",roles:["admin","teacher","staff"],
    summary:"Xem trạng thái từng PC, thêm máy, gán hoặc bỏ học sinh theo lớp, chỉnh số chỗ.",
    steps:[
      "Mở Phòng máy trong nhóm PHÒNG MÁY, chọn trường và lớp cần quản lý.",
      "Mỗi thẻ PC cho biết trạng thái Sẵn sàng / Đang sử dụng / Hỏng / Bảo trì và sức chứa.",
      "Nhấn Gán học sinh trên thẻ PC, chọn học sinh thuộc lớp và xác nhận; có thể bỏ gán khi đổi chỗ.",
      "Dùng phần thêm máy hoặc tạo dãy máy nếu trường có thêm PC.",
      "Nếu máy trục trặc, đổi trạng thái sang Hỏng hoặc Bảo trì để giáo viên và học sinh biết."
    ],keywords:["phòng máy","pc1","pc2","gán máy","đổi chỗ","hỏng","bảo trì","sức chứa","máy tính"]
  },
  {
    id:"cleaning",title:"Vệ sinh máy",roles:["admin","teacher","staff"],
    summary:"Giao việc vệ sinh cho học sinh ngồi máy, lọc theo lớp và theo dõi hoàn thành.",
    steps:[
      "Mở Vệ sinh máy trong nhóm PHÒNG MÁY.",
      "Chọn lớp trước. Chọn máy sẽ hiển thị học sinh của lớp đang được gán vào máy đó.",
      "Chọn ngày, trạng thái Đã hoàn thành / Chưa hoàn thành và ghi chú.",
      "Nhấn Lưu phân công. Học sinh có thể xem lịch vệ sinh ở trang lớp của mình.",
      "Theo dõi các mục trong Lịch sử vệ sinh để biết máy nào đã được dọn."
    ],keywords:["vệ sinh","dọn máy","phân công","trực nhật","lịch sử vệ sinh"]
  },
  {
    id:"schools",title:"Trường công tác",roles:["admin","teacher","staff"],
    summary:"Quản lý các trường được phân quyền: giáo viên có thể thêm, sửa, thay logo và xóa sau xác minh; trường có nhiều giáo viên cùng quản lý chỉ Admin được xóa.",
    steps:[
      "Mở Trường công tác trong nhóm QUẢN LÝ.",
      "Nhập tên ở phần Thêm trường để tạo trường mới; đổi trường hoạt động bằng hộp chọn đầu menu trái.",
      "Giáo viên có quyền tại trường có thể chọn Thay logo (PNG/JPG/WebP) hoặc Bỏ logo để đổi hình trên Excel/PDF.",
      "Giáo viên có quyền nhấn Sửa để đổi tên trường hoặc Xóa rồi nhập lại đúng tên trường. Nếu trường được chia sẻ cho nhiều giáo viên, cần Admin để xóa."
    ],notes:["Xóa trường có thể xóa toàn bộ lớp, lịch, học sinh, điểm danh và dữ liệu liên quan của trường. Phải kiểm tra kỹ trước khi xác nhận."],
    keywords:["trường công tác","thêm trường","xóa trường","sửa trường","logo","hình đại diện"]
  },
  {
    id:"settings",title:"Lớp & mã đăng ký",roles:["admin","teacher","staff"],
    summary:"Tạo lớp và mã đăng ký; sao chép liên kết; Admin ngừng hoặc khôi phục mã.",
    steps:[
      "Mở Lớp & mã đăng ký trong nhóm PHÒNG MÁY. Danh sách chỉ hiển thị lớp do chính tài khoản bạn tạo; nếu cần thêm trường thì chọn trường ở menu trái trước.",
      "Nhấn Sao chép mã hoặc Copy link để gửi cho học sinh. Mở đăng ký sẽ đến /register, Mở trang lớp đến /student.",
      "Nhập tên lớp, ví dụ 6.1. Website tự tạo mã ngắn kiểu IC3-DUYTAN-6.1 và tự thêm hậu tố nếu mã đã có.",
      "Có thể bật Tự động duyệt đăng ký hợp lệ theo từng lớp. Mã cũ vẫn được nhận diện; Admin có thể ngừng mã và khôi phục mà không xóa lịch hay dữ liệu học sinh.",
      "Bật Hiện mã đăng ký đã ngừng sử dụng rồi nhấn Khôi phục mã nếu muốn mở lại."
    ],keywords:["lớp","mã đăng ký","copy link","mở trang lớp","khôi phục","ngừng mã","xóa mã"]
  },
  {
    id:"finance",title:"Chấm công & tiền công",roles:["admin","teacher","staff"],
    summary:"Tổng hợp số tiết, giờ thực dạy, tiền công và mẫu riêng cho trung tâm / giáo viên.",
    steps:[
      "Mở Chấm công & tiền công trong nhóm QUẢN LÝ, chọn Trường tính công (có thể Tất cả trường), tháng báo cáo và giáo viên. Bộ chọn trường này độc lập với menu trái.",
      "Chọn một trường cụ thể trước khi chỉnh Đơn giá 1 giờ (VNĐ), rồi nhấn Lưu lương/giờ. Khi xem Tất cả trường, hệ thống cộng tiền theo mức giờ của từng trường. Admin có thể chọn giáo viên khác; giáo viên thường chỉ chọn chính mình.",
      "Kiểm tra tổng lượt lớp, số tiết, số giờ tính từ giờ bắt đầu/kết thúc và tổng tiền công.",
      "Chọn Xuất Excel trung tâm hoặc In/Lưu PDF để lấy bảng không có số tiền.",
      "Chọn Xuất Excel giáo viên hoặc In/Lưu PDF cho bản riêng có đơn giá, giờ, lương và sheet chi tiết."
    ],notes:["Không có học phí học sinh trong hệ thống.","Tính tiền dựa vào buổi học đã lưu; cần kiểm tra các buổi nghỉ/hủy trước khi nộp chấm công.","Không chia sẻ bản lương giáo viên cho người không có thẩm quyền."],
    keywords:["lương","tiền công","chấm công","giờ dạy","số tiết","excel trung tâm","bảng kê"]
  },
  {
    id:"reports",title:"Báo cáo",roles:["admin","teacher","staff"],
    summary:"Xuất PDF và Excel theo nhiều mẫu, có tên trường và logo.",
    steps:[
      "Mở Báo cáo trong nhóm QUẢN LÝ.",
      "Ở Trường báo cáo, chọn đúng trường dạy thực tế hoặc Tất cả trường. Bộ chọn này độc lập với trường ở menu trái. Sau đó chọn Bảng kê nộp trung tâm, Bảng kê riêng giáo viên, Kết quả học sinh, Điểm danh theo lớp, Danh sách học sinh, Danh sách máy tính, Điểm/lỗi/thưởng hoặc Vệ sinh máy.",
      "Chọn kỳ, giáo viên, lớp hay bài kiểm tra nếu mẫu có bộ lọc tương ứng.",
      "Kiểm tra bảng xem trước, nhấn Xuất Excel hoặc In/Lưu PDF.",
      "Nếu cần logo, chọn từng trường cụ thể ở Báo cáo rồi vào Trường công tác → Thay logo. Nếu đang dạy thay trường khác, dùng bộ lọc Trường báo cáo để tên trường trong báo cáo đúng thực tế."
    ],notes:["Bản gửi trung tâm không có lương; bản riêng giáo viên có số tiền.","Nếu báo cáo trống, kiểm tra trường và bộ lọc kỳ/lớp, cùng dữ liệu đã được lưu."],
    keywords:["báo cáo","pdf","excel","in","xuất","logo","hiệu trưởng","trung tâm"]
  },
  {
    id:"accounts",title:"Quản lý tài khoản",roles:["admin"],
    summary:"Chỉ Admin: duyệt giáo viên, chỉnh tên/vai trò, khóa hoặc xóa tài khoản.",
    steps:[
      "Đăng nhập bằng tài khoản Admin, mở Quản lý tài khoản trong nhóm QUẢN LÝ.",
      "Tìm giáo viên theo email hoặc tên; kiểm tra họ tên, vai trò và ô Cho phép sử dụng.",
      "Sửa họ tên, chọn vai trò thích hợp hoặc bỏ tích Cho phép sử dụng để khóa tài khoản; nhấn Lưu.",
      "Nút Xóa xóa tài khoản đăng nhập vĩnh viễn; nhập lại chính xác email để xác nhận. Không thể tự xóa tài khoản đang dùng hoặc tài khoản Admin.",
      "Nhấn Làm mới nếu vừa duyệt tài khoản khác mà chưa thấy trạng thái mới."
    ],notes:["Chỉ Admin truy cập được chức năng này.","Khóa khác với xóa: nên khóa nếu chỉ muốn tạm ngừng quyền.","Không cung cấp mật khẩu hoặc API key trong phần chat."],
    keywords:["admin","duyệt giáo viên","quyền","khóa","xóa tài khoản","sửa tài khoản","đăng ký giáo viên"]
  },
  {
    id:"ai",title:"Trợ lý IC3 AI",roles:["admin","teacher","staff"],
    summary:"Một khung trò chuyện chung: tự nhận biết hỏi đáp, sửa lịch, tạo/chỉnh ảnh và sửa tệp. Thao tác lưu cần xác nhận.",
    steps:[
      "Nhấn nút Hỏi AI ở góc dưới bên phải để mở Trợ lý IC3 AI.",
      "Trong Trò chuyện, chỉ cần nhập yêu cầu tự nhiên và gửi ảnh/Excel/PDF/Word/PowerPoint bằng kẹp giấy. AI tự chọn chức năng phù hợp và ảnh hiện ngay trong tin nhắn.",
      "Nhắn thêm/sửa lịch, đổi giờ, đổi lớp hoặc gửi ảnh thời khóa biểu. AI tự tạo bản nháp tối đa 12 buổi trong trường đang chọn.",
      "Xem và sửa lại ngày, lớp, giờ, số tiết trong bản nháp rồi nhấn Xác nhận lưu lịch. Trợ lý không tự ghi dữ liệu nếu bạn chưa xác nhận.",
      "Nhắn tạo/chỉnh ảnh để AI xử lý, có thể gửi ảnh mẫu hoặc chọn Sửa ảnh này. Tạo ảnh từ Google Gemini cần quota/Billing Google; lỗi từ Google không trừ lượt IC3.",
      "Gửi Excel, CSV, TXT, Word hoặc PDF và yêu cầu sửa. AI đề xuất ô Excel hoặc nội dung mới rồi cho tải tệp đã sửa; không sửa tệp gốc.",
      "Với Word/PDF hoặc PowerPoint, AI có thể đọc nội dung và xuất bản Word mới nhưng không bảo đảm giữ nguyên bố cục trang cũ.",
      "Admin có thể nhập yêu cầu đổi tên giáo viên. AI xác định tài khoản từ email/tên trong danh sách, hiển thị thông tin cũ/mới và chỉ đổi sau khi nhấn Xác nhận đổi tên.",
      "Chạm vào tên chức năng in đậm trong câu trả lời để mở đúng mục web; Hướng dẫn nhanh có sổ tay không tốn lượt AI."
    ],notes:["Các file và ảnh chỉ được gửi cho Gemini khi người dùng nhấn Gửi.","Tạo ảnh giới hạn 5 lượt/24 giờ và còn phụ thuộc hạn mức model Gemini.","Sửa lịch chỉ hỗ trợ thêm/sửa buổi học; thao tác xóa phải làm trực tiếp trong Lịch dạy giáo viên."],
    keywords:["ai","chat gpt","hỏi ai","chatbot","trợ lý","tạo ảnh","chỉnh ảnh","gửi file","gửi ảnh","sửa lịch","sửa tệp","sửa excel","sửa word","đổi tên giáo viên"]
  },
  {
    id:"login",title:"Đăng nhập & xác thực giáo viên",roles:["admin","teacher","staff"],
    summary:"Giáo viên đăng ký/xác thực email, Admin duyệt; cả giáo viên và Admin đều có chức năng Quên mật khẩu.",
    steps:[
      "Ở trang chủ khi chưa đăng nhập, chọn Đăng ký tài khoản giáo viên, nhập họ tên, email và mật khẩu.",
      "Kiểm tra Hộp thư đến, Quảng cáo và Thư rác, nhấn link xác thực và quay lại website đăng nhập.",
      "Nếu không có email hoặc bị lỗi 429, tránh bấm gửi liên tục; Admin kiểm tra SMTP ở Supabase hoặc dùng Gửi lại email xác nhận khi hết giới hạn.",
      "Nếu quên mật khẩu, ở Đăng nhập chọn Quên mật khẩu, nhập email; mở email đặt lại mật khẩu và nhập mật khẩu mới tối thiểu 8 ký tự.",
      "Đăng nhập, sau đó chờ Admin duyệt tại Quản lý tài khoản. Khi được duyệt, tài khoản mới truy cập chức năng giáo viên."
    ],keywords:["đăng nhập","đăng ký giáo viên","email","xác thực","quên mật khẩu","429","smtp"]
  },
  {
    id:"public",title:"Trang học sinh",roles:["admin","teacher","staff"],
    summary:"Link /register để đăng ký; /student để xem trạng thái PC, người ngồi máy và lịch vệ sinh.",
    steps:[
      "Tạo hoặc tìm mã lớp trong Lớp & mã đăng ký, dùng Mở đăng ký hoặc Copy link chia sẻ cho học sinh.",
      "Học sinh vào trang lớp rồi nhấn Đăng ký lớp: mã lớp đã điền sẵn và không sửa được. Nhập họ tên thật có dấu, giới tính và máy mong muốn; 21, pc 21, PC021 đều hiểu PC21.",
      "Nếu lớp bật Tự động duyệt thì hồ sơ hợp lệ sẽ được chấp nhận ngay, nếu không sẽ gửi đến giáo viên. Tên đùa bị cảnh báo, tên trùng không tạo hồ sơ thứ hai.",
      "Sau khi đăng ký, học sinh chọn Về trang chủ lớp của mình hoặc Thêm bạn tiếp theo để đăng ký bạn khác với mã lớp giữ nguyên. Trang /student hiển thị máy, chỗ ngồi, lịch vệ sinh.",
      "Muốn xem thông tin cá nhân như điểm và thưởng, học sinh cần nhập thêm mã cá nhân riêng do giáo viên cấp. Không chia sẻ mã cá nhân cho bạn khác."
    ],keywords:["học sinh","trang lớp","portal","đăng ký máy","mã cá nhân","xem điểm","thưởng","lịch vệ sinh"]
  }
];

export const helpPageTitles=Object.fromEntries(helpTopics.filter(t=>t.id!=="login"&&t.id!=="public"&&t.id!=="ai").map(t=>[t.id,t.title]));
export const helpQuestions=[
  {title:"Nhập thời khóa biểu bằng ảnh hoặc Excel",page:"attendance",question:"Cách nhập thời khóa biểu bằng ảnh, PDF hoặc Excel và lưu đúng ngày giờ?"},
  {title:"Điểm danh một lớp",page:"rollcall",question:"Hướng dẫn điểm danh học sinh theo buổi và lưu kết quả."},
  {title:"Gán học sinh vào PC",page:"computers",question:"Làm sao gán học sinh vào máy tính và đổi trạng thái máy?"},
  {title:"Xuất báo cáo Excel/PDF",page:"reports",question:"Hướng dẫn xuất Excel hoặc PDF đẹp để nộp trường, có logo."},
  {title:"Tạo lớp và gửi mã đăng ký",page:"settings",question:"Làm sao tạo mã lớp và gửi liên kết đăng ký cho học sinh?"},
  {title:"Chấm công và tính tiền giáo viên",page:"finance",question:"Cách nhập lương theo giờ và xuất chấm công cho giáo viên?"}
];
export const visibleHelpTopics=role=>helpTopics.filter(t=>t.roles.includes(role));
export const getHelpTopic=(id,role)=>visibleHelpTopics(role).find(t=>t.id===id);
