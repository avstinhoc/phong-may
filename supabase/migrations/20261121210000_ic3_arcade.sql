-- The existing PIN session is the only source of student identity.
create table public.ic3_arcade_questions (
 id text primary key, lesson int not null, prompt text not null, choices text[] not null, solution text not null, explanation text not null
);
create table public.ic3_arcade_player (
 student_id uuid primary key references public.students(id) on delete cascade,
 stage int not null default 1, cleared int not null default 0, score int not null default 0,
 hearts int not null default 3, hp int not null default 1100, costume int not null default 0,
 gear int not null default 0, question text, turn uuid, deadline timestamptz, seen text[] not null default '{}'
);
alter table public.ic3_arcade_questions enable row level security;
alter table public.ic3_arcade_player enable row level security;
revoke all on public.ic3_arcade_questions,public.ic3_arcade_player from public,anon,authenticated;
insert into public.ic3_arcade_questions values ('1-1',1,'Máy mở nhiều ứng dụng cùng lúc thì chậm. Tài nguyên nào thường bị đầy trước khi em đóng bớt cửa sổ?',array['RAM','Cổng HDMI','Bàn phím'],'RAM','RAM giữ dữ liệu mà ứng dụng đang dùng.');
insert into public.ic3_arcade_questions values ('1-2',1,'Bài vẽ đã lưu vẫn còn sau khi tắt nguồn. Linh kiện nào có thể đang giữ tệp?',array['SSD','RAM','Quạt tản nhiệt'],'SSD','SSD giữ dữ liệu khi máy mất điện.');
insert into public.ic3_arcade_questions values ('1-3',1,'Khi em tính trung bình một cột điểm, bộ phận nào thực hiện lệnh tính?',array['CPU','Màn hình','Loa'],'CPU','CPU thực hiện các lệnh xử lý.');
insert into public.ic3_arcade_questions values ('2-1',2,'Muốn đưa giọng nói vào bản trình chiếu, em cần thiết bị nào?',array['Micrô','Loa','Máy chiếu'],'Micrô','Âm thanh đi từ người nói vào máy qua micrô.');
insert into public.ic3_arcade_questions values ('2-2',2,'Phòng học có TV hỗ trợ HDMI. Cáp nào truyền được cả hình và tiếng từ laptop?',array['HDMI','VGA','Cáp âm thanh 3,5 mm'],'HDMI','HDMI mang cả tín hiệu hình ảnh và âm thanh.');
insert into public.ic3_arcade_questions values ('2-3',2,'Thiết bị nào vừa hiển thị bản đồ vừa nhận vị trí em chạm?',array['Màn hình cảm ứng','Máy chiếu','Bàn rê'],'Màn hình cảm ứng','Màn hình xuất hình ảnh và cảm biến nhận thao tác.');
insert into public.ic3_arcade_questions values ('3-1',3,'Em cần bàn phím vật lý tích hợp và pin để gõ bài trên tàu. Chọn thiết bị nào?',array['Laptop','Máy bàn dạng tháp','Màn hình rời'],'Laptop','Laptop có pin và bàn phím trong cùng thiết bị.');
insert into public.ic3_arcade_questions values ('3-2',3,'Máy đặt cố định có linh kiện xử lý tích hợp sau màn hình. Đây là kiểu nào?',array['All-in-one','Máy chủ dạng tủ','Máy đọc sách'],'All-in-one','Kiểu all-in-one gộp màn hình và phần thân máy.');
insert into public.ic3_arcade_questions values ('3-3',3,'Em muốn vẽ trực tiếp lên một màn hình cảm ứng cầm tay cỡ quyển vở. Loại máy nào phù hợp nhất?',array['Máy tính bảng có hỗ trợ bút','Máy bàn dạng tháp','Máy bàn dùng màn hình thường'],'Máy tính bảng có hỗ trợ bút','Máy tính bảng có thể nhận nét vẽ ngay trên màn hình khi hỗ trợ bút.');
insert into public.ic3_arcade_questions values ('4-1',4,'Để định dạng đoạn văn và tạo mục lục báo cáo, em mở ứng dụng nào?',array['Trình soạn thảo văn bản','Trình phát nhạc','Trình quản lý thiết bị'],'Trình soạn thảo văn bản','Trình soạn thảo hỗ trợ cấu trúc và định dạng văn bản.');
insert into public.ic3_arcade_questions values ('4-2',4,'Cả nhóm phải nhìn thấy thay đổi của nhau ngay khi gõ. Cách nào phù hợp?',array['Dùng tài liệu trực tuyến có quyền chỉnh sửa','Gửi ảnh chụp màn hình','Mỗi bạn in một bản'],'Dùng tài liệu trực tuyến có quyền chỉnh sửa','Tài liệu dùng chung cho phép cộng tác trên cùng nội dung.');
insert into public.ic3_arcade_questions values ('4-3',4,'Danh sách vật tư thay đổi mỗi tuần. Nên dùng gì để tổng tiền tự tính lại?',array['Bảng tính có công thức','Ảnh chụp hóa đơn','Trình chiếu tĩnh'],'Bảng tính có công thức','Công thức bảng tính cập nhật khi dữ liệu đầu vào đổi.');
insert into public.ic3_arcade_questions values ('5-1',5,'Ứng dụng gửi việc in qua thành phần nào để dùng phần cứng?',array['Hệ điều hành và trình điều khiển','Hình nền','Dấu trang'],'Hệ điều hành và trình điều khiển','Hệ điều hành phối hợp với trình điều khiển để giao tiếp với máy in.');
insert into public.ic3_arcade_questions values ('5-2',5,'Ứng dụng chỉ hỗ trợ macOS. Trước khi cài lên laptop cần kiểm tra gì?',array['Hệ điều hành của laptop','Màu bàn phím','Số trang tài liệu'],'Hệ điều hành của laptop','Ứng dụng cần tương thích với hệ điều hành.');
insert into public.ic3_arcade_questions values ('5-3',5,'Trên Windows, tổ hợp nào giúp chuyển nhanh giữa các ứng dụng đang mở?',array['Alt + Tab','Ctrl + P','Ctrl + S'],'Alt + Tab','Alt + Tab chuyển cửa sổ đang hoạt động.');
insert into public.ic3_arcade_questions values ('6-1',6,'Em vẫn muốn giữ ứng dụng mở trên máy Windows dùng chung. Nên làm gì trước khi rời bàn?',array['Khóa máy bằng Windows + L','Chỉ tắt màn hình','Đổi hình nền'],'Khóa máy bằng Windows + L','Khóa phiên yêu cầu xác thực khi quay lại.');
insert into public.ic3_arcade_questions values ('6-2',6,'Để một học sinh làm bài thông thường, nên cấp loại tài khoản nào?',array['Người dùng tiêu chuẩn','Quản trị viên toàn hệ thống','Tài khoản dùng chung của giáo viên'],'Người dùng tiêu chuẩn','Quyền tiêu chuẩn đủ để học và hạn chế thay đổi hệ thống.');
insert into public.ic3_arcade_questions values ('6-3',6,'Hết tiết, bạn khác cần dùng máy bằng tài khoản riêng. Em chọn gì?',array['Đăng xuất','Ẩn cửa sổ','Tắt loa'],'Đăng xuất','Đăng xuất kết thúc phiên hiện tại.');
insert into public.ic3_arcade_questions values ('7-1',7,'Tên tệp nào dễ nhận ra lớp, nội dung và phiên bản nhất?',array['6A_BaoCaoNuoc_v02.docx','moi.docx','cuoicungthat.docx'],'6A_BaoCaoNuoc_v02.docx','Tên có quy ước giúp nhận diện và sắp xếp.');
insert into public.ic3_arcade_questions values ('7-2',7,'Bản sao nào còn dùng được nếu ổ trong laptop hỏng hoàn toàn?',array['Bản sao trên ổ ngoài đã tháo','Bản trong thư mục khác cùng ổ','Lối tắt trên Desktop'],'Bản sao trên ổ ngoài đã tháo','Bản sao độc lập vẫn còn khi thiết bị gốc hỏng.');
insert into public.ic3_arcade_questions values ('7-3',7,'Tài liệu đám mây đã tự lưu sau khi em xóa nhầm. Nên kiểm tra gì?',array['Lịch sử phiên bản','Tên máy tính','Độ phân giải màn hình'],'Lịch sử phiên bản','Lịch sử phiên bản có thể khôi phục nội dung trước chỉnh sửa.');
insert into public.ic3_arcade_questions values ('8-1',8,'Em cần số hóa một trang giấy để lưu trên máy. Chọn thiết bị nào?',array['Máy quét','Loa','Máy chiếu'],'Máy quét','Máy quét biến nội dung giấy thành dữ liệu số.');
insert into public.ic3_arcade_questions values ('8-2',8,'Nhận tệp dự án, em muốn thử sửa mà giữ bản ban đầu. Làm gì trước?',array['Tạo một bản sao có tên mới','Đổi hình nền','Xóa bản ban đầu'],'Tạo một bản sao có tên mới','Bản sao cho phép thử thay đổi mà vẫn giữ bản gốc.');
insert into public.ic3_arcade_questions values ('8-3',8,'Muốn trình chiếu lần lượt từng trang trước lớp, em dùng loại ứng dụng nào?',array['Trình tạo bài trình chiếu','Trình nén tệp','Trình phát âm thanh'],'Trình tạo bài trình chiếu','Trình chiếu tổ chức nội dung thành các slide.');
insert into public.ic3_arcade_questions values ('9-1',9,'Kết nối tai nghe gần laptop mà không cần Internet. Công nghệ nào phù hợp?',array['Bluetooth','GPS','HDMI'],'Bluetooth','Bluetooth kết nối thiết bị ở khoảng cách ngắn.');
insert into public.ic3_arcade_questions values ('9-2',9,'Máy có Wi-Fi yếu sau hai bức tường. Thử thay đổi nào trước?',array['Di chuyển gần điểm truy cập','Tăng âm lượng','Giảm độ sáng'],'Di chuyển gần điểm truy cập','Khoảng cách và vật cản ảnh hưởng tín hiệu vô tuyến.');
insert into public.ic3_arcade_questions values ('9-3',9,'Hai mạng có tên gần giống nhau. Trước khi đăng nhập, em nên làm gì?',array['Hỏi nhân viên tên mạng chính thức','Chọn mạng có chữ FREE','Gửi mật khẩu cho người lạ'],'Hỏi nhân viên tên mạng chính thức','Xác minh tên mạng giúp tránh kết nối nhầm.');
insert into public.ic3_arcade_questions values ('10-1',10,'Laptop đang bật chế độ máy bay và Wi-Fi bị tắt. Để vào mạng lớp, em kiểm tra gì đầu tiên?',array['Bật lại Wi-Fi và chọn đúng mạng','Thay máy in','Xóa bài đã lưu'],'Bật lại Wi-Fi và chọn đúng mạng','Cần kết nối vô tuyến tới mạng trước khi truy cập.');
insert into public.ic3_arcade_questions values ('10-2',10,'TV báo không có tín hiệu dù laptop đang chạy. Kiểm tra gì trước?',array['Cáp và nguồn vào HDMI trên TV','Mực máy in','Dung lượng thư rác'],'Cáp và nguồn vào HDMI trên TV','Nguồn vào cần trùng cổng đã cắm cáp.');
insert into public.ic3_arcade_questions values ('10-3',10,'Trước khi chỉnh sửa video nhóm có dung lượng lớn, nên làm gì?',array['Giữ bản nguồn ở nơi sao lưu riêng','Chỉ đổi tên lối tắt','Xóa toàn bộ cảnh quay'],'Giữ bản nguồn ở nơi sao lưu riêng','Bản nguồn giúp dựng lại nếu bản chỉnh sửa bị hỏng.');
insert into public.ic3_arcade_questions values ('11-1',11,'Muốn mở lại đúng trang tài liệu tuần sau, em dùng chức năng nào?',array['Thêm dấu trang','Tải lại trang','Đóng tab'],'Thêm dấu trang','Dấu trang lưu địa chỉ trang để truy cập sau.');
insert into public.ic3_arcade_questions values ('11-2',11,'Em vừa bấm một liên kết. Nút nào đưa tab về trang trước?',array['Quay lại','Trang chủ','Tải xuống'],'Quay lại','Nút quay lại đi một bước trong lịch sử tab.');
insert into public.ic3_arcade_questions values ('11-3',11,'Trang lớp đổi địa chỉ. Em cần cập nhật gì trong dấu trang?',array['URL đã lưu','Kích thước cửa sổ','Cỡ chữ trình duyệt'],'URL đã lưu','URL xác định đích đến của dấu trang.');
insert into public.ic3_arcade_questions values ('12-1',12,'Muốn tìm chính xác cụm “vòng tuần hoàn nước”, em đặt cụm từ trong gì?',array['Dấu ngoặc kép','Dấu ngoặc vuông','Hai dấu cộng'],'Dấu ngoặc kép','Ngoặc kép yêu cầu khớp cụm từ trong nhiều công cụ tìm kiếm.');
insert into public.ic3_arcade_questions values ('12-2',12,'Tìm “rùa” cho ra cả truyện tranh. Em muốn tài liệu về môi trường sống. Chọn truy vấn nào?',array['môi trường sống rùa biển Việt Nam','rùa đẹp','động vật'],'môi trường sống rùa biển Việt Nam','Từ khóa cụ thể thu hẹp phạm vi theo đối tượng và chủ đề.');
insert into public.ic3_arcade_questions values ('12-3',12,'Để chọn nguồn cho bài khoa học, dấu hiệu nào đáng kiểm tra nhất?',array['Tác giả, bằng chứng và ngày cập nhật','Trang có nhiều hiệu ứng','Tiêu đề viết hoa'],'Tác giả, bằng chứng và ngày cập nhật','Những chi tiết này giúp đánh giá độ tin cậy và tính cập nhật.');
insert into public.ic3_arcade_questions values ('13-1',13,'Dùng ảnh CC BY trong bài thuyết trình. Em cần làm gì?',array['Ghi công tác giả và dẫn giấy phép','Ghi tên mình làm tác giả','Xóa mọi thông tin nguồn'],'Ghi công tác giả và dẫn giấy phép','Điều kiện BY yêu cầu ghi công phù hợp.');
insert into public.ic3_arcade_questions values ('13-2',13,'Ảnh mang điều kiện NC. Trước khi dùng cho quảng cáo thương mại cần làm gì?',array['Xin quyền phù hợp hoặc chọn ảnh khác','Chỉ cần đổi màu ảnh','Chụp màn hình là đủ'],'Xin quyền phù hợp hoặc chọn ảnh khác','NC giới hạn sử dụng cho mục đích phi thương mại.');
insert into public.ic3_arcade_questions values ('13-3',13,'Ảnh mang điều kiện ND. Muốn phát hành bản ghép từ ảnh đó cần làm gì?',array['Xin phép hoặc dùng nguồn cho phép chỉnh sửa','Chỉ đổi phần mở rộng','Tự gắn giấy phép mới'],'Xin phép hoặc dùng nguồn cho phép chỉnh sửa','ND giới hạn chia sẻ bản chuyển thể.');
insert into public.ic3_arcade_questions values ('14-1',14,'Trước khi đăng ảnh thẻ, chi tiết nào dễ làm lộ danh tính?',array['Họ tên kèm mã học sinh','Màu nền trống','Một đường kẻ trang trí'],'Họ tên kèm mã học sinh','Các thông tin liên kết trực tiếp với một người.');
insert into public.ic3_arcade_questions values ('14-2',14,'Biệt danh nào tiết lộ ít thông tin cá nhân nhất?',array['MayXanh','HoTen_NgaySinh_DiaChi','SoDienThoaiCuaEm'],'MayXanh','Biệt danh không chứa dữ liệu định danh giảm mức tiết lộ.');
insert into public.ic3_arcade_questions values ('14-3',14,'Em gỡ một bài đăng nhưng bạn vẫn còn bản chụp. Điều này cho thấy gì?',array['Nội dung số có thể đã được sao chép','Gỡ bài xóa hết mọi bản','Ảnh chỉ tồn tại một phút'],'Nội dung số có thể đã được sao chép','Người khác có thể lưu bản sao trước khi bài được gỡ.');
insert into public.ic3_arcade_questions values ('15-1',15,'Bạn bị chế giễu trong nhóm lớp. Em nên làm gì?',array['Hỗ trợ bạn và báo người có trách nhiệm','Chia sẻ cho nhiều người xem','Thêm bình luận chế giễu'],'Hỗ trợ bạn và báo người có trách nhiệm','Hỗ trợ và báo cáo giúp hạn chế tổn hại.');
insert into public.ic3_arcade_questions values ('15-2',15,'Muốn đăng ảnh cận mặt bạn lên nhóm công khai, em nên làm gì?',array['Hỏi ý kiến bạn trước','Đăng rồi mới hỏi','Gắn tên tất cả mọi người'],'Hỏi ý kiến bạn trước','Cần tôn trọng quyền riêng tư và lựa chọn của người trong ảnh.');
insert into public.ic3_arcade_questions values ('15-3',15,'Hai nhóm bất đồng về kết quả. Phản hồi nào phù hợp?',array['Đưa ví dụ và hỏi về cách tính','Chê năng lực của bạn','Viết hoa để gây áp lực'],'Đưa ví dụ và hỏi về cách tính','Trao đổi về bằng chứng giúp giải quyết bất đồng.');
insert into public.ic3_arcade_questions values ('16-1',16,'Lớp muốn đăng từng bài dài theo tuần, có ngày và bình luận. Chọn hình thức nào?',array['Blog','Máy tính bỏ túi','Ứng dụng báo thức'],'Blog','Blog tổ chức bài viết theo thời gian.');
insert into public.ic3_arcade_questions values ('16-2',16,'Muốn thảo luận theo chủ đề và tìm lại từng luồng hỏi đáp. Nên chọn gì?',array['Diễn đàn','Cuộc gọi thoại tức thời','Đồng hồ đếm giờ'],'Diễn đàn','Diễn đàn lưu trao đổi theo luồng chủ đề.');
insert into public.ic3_arcade_questions values ('16-3',16,'Muốn nhận bài mới từ trang câu lạc bộ trong bảng tin. Em dùng chức năng nào?',array['Theo dõi trang','Chặn trang','Tắt thông báo toàn bộ'],'Theo dõi trang','Theo dõi tạo liên kết với cập nhật của trang.');
insert into public.ic3_arcade_questions values ('17-1',17,'Trước khi đăng nội dung lên diễn đàn của trường, nên đọc gì?',array['Chính sách sử dụng chấp nhận được','Giá máy chiếu','Lịch bảo trì bàn ghế'],'Chính sách sử dụng chấp nhận được','Chính sách nêu các hành vi được phép và trách nhiệm.');
insert into public.ic3_arcade_questions values ('17-2',17,'Gặp bài đăng vi phạm quy định nhóm. Em dùng cách nào?',array['Báo quản trị viên kèm vị trí bài','Đăng lại để phản đối','Chia sẻ sang nhóm khác'],'Báo quản trị viên kèm vị trí bài','Báo cáo giúp người quản trị xử lý tại nguồn.');
insert into public.ic3_arcade_questions values ('17-3',17,'Tài liệu chỉ dành cho thành viên lớp. Trước khi chia sẻ ra ngoài cần làm gì?',array['Kiểm tra quyền chia sẻ và xin phép','Tạo liên kết công khai ngay','Bỏ tên lớp là đủ'],'Kiểm tra quyền chia sẻ và xin phép','Phạm vi chia sẻ cần phù hợp chính sách và quyền của chủ sở hữu.');
insert into public.ic3_arcade_questions values ('18-1',18,'Cần xin hướng dẫn bài tập. Tiêu đề email nào rõ nhất?',array['Lớp 6A xin hướng dẫn bài tập số 3','Gấp!!!','Chào'],'Lớp 6A xin hướng dẫn bài tập số 3','Tiêu đề nêu lớp và mục đích giúp người nhận xử lý.');
insert into public.ic3_arcade_questions values ('18-2',18,'Khi chưa đến lượt phát biểu trong phòng ồn, em nên làm gì?',array['Tắt mic và bật lại khi nói','Mở loa to hơn','Liên tục ngắt lời'],'Tắt mic và bật lại khi nói','Tắt mic giảm tiếng nền cho cả lớp.');
insert into public.ic3_arcade_questions values ('18-3',18,'Em cần gửi cho nhiều phụ huynh mà giữ riêng địa chỉ email của họ. Chọn trường nào?',array['Bcc','Cc','Tiêu đề'],'Bcc','Bcc ẩn danh sách người nhận trong trường này với những người nhận khác.');
insert into public.ic3_arcade_questions values ('19-1',19,'Trình duyệt hỏi lưu mật khẩu trên máy thư viện. Em chọn gì?',array['Từ chối lưu và đăng xuất sau khi dùng','Lưu để lần sau tiện hơn','Ghi mật khẩu vào tên tệp'],'Từ chối lưu và đăng xuất sau khi dùng','Máy dùng chung có thể bị người khác truy cập.');
insert into public.ic3_arcade_questions values ('19-2',19,'Một dịch vụ báo mật khẩu đã lộ. Tài khoản khác dùng lại mật khẩu đó cần làm gì?',array['Đổi sang mật khẩu riêng cho từng nơi','Chỉ đổi ảnh đại diện','Giữ nguyên vì khác trang'],'Đổi sang mật khẩu riêng cho từng nơi','Dùng lại mật khẩu làm nhiều tài khoản cùng bị ảnh hưởng.');
insert into public.ic3_arcade_questions values ('19-3',19,'Người tự xưng hỗ trợ xin mã xác thực vừa gửi đến điện thoại. Em làm gì?',array['Giữ riêng mã và xác minh qua kênh chính thức','Đọc mã ngay','Đăng mã vào nhóm'],'Giữ riêng mã và xác minh qua kênh chính thức','Mã xác thực có thể cấp quyền truy cập tài khoản.');
insert into public.ic3_arcade_questions values ('20-1',20,'Email lạ thúc em mở tệp để nhận quà. Nên làm gì?',array['Giữ tệp đóng và báo giáo viên','Mở ngay khi còn hạn','Chuyển cho cả lớp thử'],'Giữ tệp đóng và báo giáo viên','Áp lực thời gian và tệp bất ngờ là dấu hiệu đáng ngờ.');
insert into public.ic3_arcade_questions values ('20-2',20,'Trang web yêu cầu cài công cụ lạ để quét máy. Em nên làm gì?',array['Đóng trang và nhờ người phụ trách kiểm tra','Cài ngay','Gửi thông tin tài khoản'],'Đóng trang và nhờ người phụ trách kiểm tra','Nên dùng công cụ bảo vệ đáng tin cậy của thiết bị.');
insert into public.ic3_arcade_questions values ('20-3',20,'Bạn gửi bản cài ứng dụng từ một trang lạ. Nơi nào phù hợp để lấy bản cài?',array['Trang chính thức hoặc kho ứng dụng tin cậy','Liên kết rút gọn bất kỳ','Bình luận ẩn danh'],'Trang chính thức hoặc kho ứng dụng tin cậy','Nguồn phân phối đáng tin cậy giảm nguy cơ nhận tệp giả.');
insert into public.ic3_arcade_questions values ('21-1',21,'Làm sao biết bản sao lưu bài nhóm thật sự dùng được?',array['Thử khôi phục vào thư mục riêng rồi mở tệp','Chỉ xem tên thư mục','Chỉ đổi biểu tượng'],'Thử khôi phục vào thư mục riêng rồi mở tệp','Thử khôi phục kiểm tra khả năng sử dụng bản sao.');
insert into public.ic3_arcade_questions values ('21-2',21,'Máy trường báo có bản vá qua công cụ chính thức. Em nên làm gì?',array['Báo người quản lý để lên lịch cập nhật','Tải bản vá từ bình luận lạ','Tắt mọi cập nhật'],'Báo người quản lý để lên lịch cập nhật','Bản vá chính thức giúp khắc phục các vấn đề đã biết.');
insert into public.ic3_arcade_questions values ('21-3',21,'Ứng dụng đèn pin yêu cầu đọc toàn bộ danh bạ. Em nên làm gì?',array['Từ chối quyền không cần thiết','Cho phép tất cả','Đăng danh bạ lên mạng'],'Từ chối quyền không cần thiết','Chỉ cấp quyền phù hợp với chức năng ứng dụng.');
insert into public.ic3_arcade_questions values ('22-1',22,'Một website nhớ sản phẩm sau khi em chuyển trang. Cơ chế nào có thể giúp nhận diện phiên?',array['Cookie phiên','Cáp VGA','Độ sáng màn hình'],'Cookie phiên','Cookie có thể chứa mã nhận diện để website nối các yêu cầu của cùng một phiên.');
insert into public.ic3_arcade_questions values ('22-2',22,'Hình chụp trên điện thoại có thể tiết lộ vị trí qua đâu?',array['Siêu dữ liệu vị trí trong tệp','Màu khung ảnh','Tên hãng máy chiếu'],'Siêu dữ liệu vị trí trong tệp','Một số ảnh lưu tọa độ khi chức năng gắn vị trí được bật.');
insert into public.ic3_arcade_questions values ('22-3',22,'Trang cho chọn cookie phân tích tùy chọn. Nếu muốn giảm theo dõi, em chọn gì?',array['Từ chối cookie tùy chọn và lưu lựa chọn','Đồng ý tất cả','Đăng công khai lịch sử duyệt'],'Từ chối cookie tùy chọn và lưu lựa chọn','Tùy chọn quyền riêng tư giúp giới hạn một số hình thức thu thập.');
insert into public.ic3_arcade_questions values ('1-4',1,'Muốn chạy thêm ứng dụng mà vẫn giữ tài liệu khi tắt máy, cặp nào lần lượt phục vụ hai nhu cầu?',array['RAM và SSD','CPU và loa','SSD và RAM'],'RAM và SSD','Cách xử lý phù hợp trong tình huống này là RAM và SSD.');
insert into public.ic3_arcade_questions values ('2-4',2,'Cần đưa cả hình lẫn tiếng của em vào cuộc họp. Với webcam không có mic, còn thiếu gì?',array['Micrô','Máy chiếu','Máy in'],'Micrô','Cách xử lý phù hợp trong tình huống này là Micrô.');
insert into public.ic3_arcade_questions values ('3-4',3,'Một bạn nói máy All-in-one nào cũng có pin mang đi học. Em kiểm tra gì trước khi tin?',array['Thông số nguồn điện và pin của mẫu máy','Số lượng cổng USB','Độ lớn phông chữ'],'Thông số nguồn điện và pin của mẫu máy','Cách xử lý phù hợp trong tình huống này là Thông số nguồn điện và pin của mẫu máy.');
insert into public.ic3_arcade_questions values ('4-4',4,'Bạn gửi một ảnh bảng điểm. Muốn tự tính trung bình khi sửa số, em cần bản nào?',array['Tệp bảng tính chứa dữ liệu trong các ô','Ảnh JPEG rõ hơn','Ảnh chụp màn hình mới'],'Tệp bảng tính chứa dữ liệu trong các ô','Cách xử lý phù hợp trong tình huống này là Tệp bảng tính chứa dữ liệu trong các ô.');
insert into public.ic3_arcade_questions values ('5-4',5,'Để kiểm tra ứng dụng nào đang dùng nhiều bộ nhớ trên Windows, em mở gì?',array['Task Manager','Paint','Character Map'],'Task Manager','Cách xử lý phù hợp trong tình huống này là Task Manager.');
insert into public.ic3_arcade_questions values ('6-4',6,'Giáo viên đang thuyết trình trên màn hình chung. Vì sao cần đóng phiên email cá nhân trước?',array['Để bảo vệ thư riêng tư','Để tăng số trang slide','Để đổi loại cổng kết nối'],'Để bảo vệ thư riêng tư','Cách xử lý phù hợp trong tình huống này là Để bảo vệ thư riêng tư.');
insert into public.ic3_arcade_questions values ('7-4',7,'Em muốn di chuyển tệp từ thư mục nháp sang thư mục nộp bằng bàn phím Windows. Dùng gì?',array['Ctrl + X rồi Ctrl + V','Ctrl + C rồi Ctrl + P','Ctrl + A rồi Ctrl + Z'],'Ctrl + X rồi Ctrl + V','Cách xử lý phù hợp trong tình huống này là Ctrl + X rồi Ctrl + V.');
insert into public.ic3_arcade_questions values ('8-4',8,'Phòng máy mất điện sau khi gõ một đoạn chưa lưu. Bộ phận nào mất dữ liệu tạm khi ngắt điện?',array['RAM','Ổ cứng ngoài đã tháo','Đĩa quang'],'RAM','Cách xử lý phù hợp trong tình huống này là RAM.');
insert into public.ic3_arcade_questions values ('9-4',9,'Laptop kết nối Wi-Fi nhưng tất cả máy trong lớp đều không vào Internet. Nên kiểm tra tiếp gì?',array['Đường truyền từ mạng lớp ra Internet','Bàn phím từng máy','Độ phân giải màn hình'],'Đường truyền từ mạng lớp ra Internet','Cách xử lý phù hợp trong tình huống này là Đường truyền từ mạng lớp ra Internet.');
insert into public.ic3_arcade_questions values ('10-4',10,'Đã kết nối tai nghe Bluetooth nhưng tiếng vẫn ra loa laptop. Kiểm tra gì?',array['Thiết bị đầu ra âm thanh đang chọn','Địa chỉ trang chủ','Thư mục tải xuống'],'Thiết bị đầu ra âm thanh đang chọn','Cách xử lý phù hợp trong tình huống này là Thiết bị đầu ra âm thanh đang chọn.');
insert into public.ic3_arcade_questions values ('11-4',11,'Trang web vừa cập nhật mà em vẫn thấy lịch cũ. Nút nào yêu cầu trình duyệt tải lại trang hiện tại?',array['Refresh','Back','Home'],'Refresh','Cách xử lý phù hợp trong tình huống này là Refresh.');
insert into public.ic3_arcade_questions values ('12-4',12,'Kết quả tìm kiếm dẫn đến bài viết từ mười năm trước. Với số liệu dân số, nên làm gì?',array['Tìm số liệu mới hơn từ nguồn đáng tin','Dùng số đầu tiên thấy','Chỉ nhìn độ dài bài'],'Tìm số liệu mới hơn từ nguồn đáng tin','Cách xử lý phù hợp trong tình huống này là Tìm số liệu mới hơn từ nguồn đáng tin.');
insert into public.ic3_arcade_questions values ('13-4',13,'Tác phẩm đã thuộc phạm vi công cộng. Điều nào mô tả đúng nhất?',array['Có thể sử dụng mà không cần xin phép bản quyền cho tác phẩm đó','Mọi tệp trên Internet đều như vậy','Chỉ tác giả được xem'],'Có thể sử dụng mà không cần xin phép bản quyền cho tác phẩm đó','Cách xử lý phù hợp trong tình huống này là Có thể sử dụng mà không cần xin phép bản quyền cho tác phẩm đó.');
insert into public.ic3_arcade_questions values ('14-4',14,'Ứng dụng học hỏi ngày sinh và địa chỉ nhà để hiển thị tên nhóm. Em nên kiểm tra gì?',array['Thông tin nào thật sự cần và ai được xem','Ứng dụng có nhiều biểu tượng không','Trang có nhạc hay không'],'Thông tin nào thật sự cần và ai được xem','Cách xử lý phù hợp trong tình huống này là Thông tin nào thật sự cần và ai được xem.');
insert into public.ic3_arcade_questions values ('15-4',15,'Bạn chuyển một tin chưa kiểm chứng vào nhóm. Phản hồi nào hợp lý?',array['Hỏi nguồn và kiểm tra trước khi chia sẻ','Chuyển tiếp vì nhiều người đã đọc','Xóa tên người gửi rồi đăng lại'],'Hỏi nguồn và kiểm tra trước khi chia sẻ','Cách xử lý phù hợp trong tình huống này là Hỏi nguồn và kiểm tra trước khi chia sẻ.');
insert into public.ic3_arcade_questions values ('16-4',16,'Muốn trao đổi riêng lịch hẹn với một bạn trên mạng xã hội. Chức năng nào phù hợp nhất?',array['Tin nhắn riêng','Bài đăng công khai','Bình luận trên trang trường'],'Tin nhắn riêng','Cách xử lý phù hợp trong tình huống này là Tin nhắn riêng.');
insert into public.ic3_arcade_questions values ('17-4',17,'Tài khoản nhóm có ba quản trị viên. Khi một bạn rời nhóm, việc nào nên làm?',array['Rà soát và thu hồi quyền quản trị của bạn đó','Đưa mật khẩu cho cả lớp','Ẩn danh sách thành viên'],'Rà soát và thu hồi quyền quản trị của bạn đó','Cách xử lý phù hợp trong tình huống này là Rà soát và thu hồi quyền quản trị của bạn đó.');
insert into public.ic3_arcade_questions values ('18-4',18,'Đang giải thích thao tác trong cuộc họp, em chỉ muốn người khác thấy một tài liệu. Chọn gì?',array['Chia sẻ cửa sổ tài liệu','Chia sẻ toàn bộ màn hình','Bật camera sau'],'Chia sẻ cửa sổ tài liệu','Cách xử lý phù hợp trong tình huống này là Chia sẻ cửa sổ tài liệu.');
insert into public.ic3_arcade_questions values ('19-4',19,'Bạn quên mật khẩu tài khoản học tập. Nên khôi phục bằng cách nào?',array['Dùng chức năng quên mật khẩu chính thức','Gửi mã OTP cho bạn thân','Đăng thông tin cá nhân công khai'],'Dùng chức năng quên mật khẩu chính thức','Cách xử lý phù hợp trong tình huống này là Dùng chức năng quên mật khẩu chính thức.');
insert into public.ic3_arcade_questions values ('20-4',20,'Tin nhắn giả danh giáo viên yêu cầu nộp tiền ngay. Cách xác minh phù hợp?',array['Liên hệ giáo viên qua kênh liên lạc đã biết','Trả lời bằng mã xác thực','Bấm vào mọi liên kết trong tin'],'Liên hệ giáo viên qua kênh liên lạc đã biết','Cách xử lý phù hợp trong tình huống này là Liên hệ giáo viên qua kênh liên lạc đã biết.');
insert into public.ic3_arcade_questions values ('21-4',21,'Thiết bị chứa bài làm sắp được mang đi sửa. Nên chuẩn bị gì?',array['Sao lưu dữ liệu cần thiết và bảo vệ tài khoản','Bỏ hết mật khẩu','Ghi mật khẩu trên nắp máy'],'Sao lưu dữ liệu cần thiết và bảo vệ tài khoản','Cách xử lý phù hợp trong tình huống này là Sao lưu dữ liệu cần thiết và bảo vệ tài khoản.');
insert into public.ic3_arcade_questions values ('22-4',22,'Ứng dụng bản đồ hỏi khi nào được dùng vị trí. Muốn chỉ dẫn đường trong lúc dùng, chọn gì?',array['Chỉ cho phép khi sử dụng ứng dụng','Luôn cho phép trong nền','Công khai lịch sử vị trí'],'Chỉ cho phép khi sử dụng ứng dụng','Cách xử lý phù hợp trong tình huống này là Chỉ cho phép khi sử dụng ứng dụng.');
insert into public.ic3_arcade_questions values ('l01-q01',1,'Bộ phận nào chủ yếu xử lý dữ liệu và thực thi lệnh trong máy tính?',array['CPU','Loa','Máy in','Webcam'],'CPU','CPU là bộ xử lý trung tâm, thực thi lệnh và xử lý dữ liệu.');
insert into public.ic3_arcade_questions values ('l01-q02',1,'Điều gì xảy ra với dữ liệu tạm trong RAM khi tắt nguồn máy tính?',array['Bị mất','Được giữ vĩnh viễn','Tự chuyển vào USB','Tự chuyển thành ROM'],'Bị mất','RAM là bộ nhớ khả biến; dữ liệu đang lưu tạm trong RAM sẽ mất khi ngắt nguồn.');
insert into public.ic3_arcade_questions values ('l01-q03',1,'Theo bài học, ROM là loại bộ nhớ nào?',array['Bộ nhớ chỉ đọc, không mất dữ liệu khi tắt máy','Bộ nhớ chỉ chứa âm thanh','Bộ nhớ tạm bị xóa khi tắt máy','Thiết bị nhập văn bản'],'Bộ nhớ chỉ đọc, không mất dữ liệu khi tắt máy','ROM là bộ nhớ chỉ đọc và không khả biến, khác với RAM.');
insert into public.ic3_arcade_questions values ('l01-q04',1,'Ổ SSD sử dụng công nghệ nào để lưu dữ liệu?',array['Bộ nhớ Flash','Đĩa từ quay','Băng giấy','Đầu kim in'],'Bộ nhớ Flash','SSD lưu dữ liệu trên các chip nhớ Flash, không dùng đĩa từ quay như HDD.');
insert into public.ic3_arcade_questions values ('l01-q05',1,'HDD truyền thống lưu dữ liệu chủ yếu bằng cách nào?',array['Dùng đĩa từ quay và đầu đọc/ghi','Dùng micro','Dùng tia máy chiếu','Dùng màn hình cảm ứng'],'Dùng đĩa từ quay và đầu đọc/ghi','Ổ HDD cơ học dùng đĩa từ quay và đầu đọc/ghi.');
insert into public.ic3_arcade_questions values ('l01-q06',1,'Thiết bị lưu trữ nào nhỏ gọn và thường kết nối máy tính qua cổng USB?',array['Ổ USB Flash','GPU','ROM trên bo mạch chủ','CPU'],'Ổ USB Flash','USB Flash Drive là thiết bị lưu trữ ngoài dùng bộ nhớ Flash và cổng USB.');
insert into public.ic3_arcade_questions values ('l01-q07',1,'Thiết bị nào dưới đây thường hoạt động yên tĩnh hơn do không có đĩa quay cơ học?',array['Ổ SSD','Ổ HDD cơ học','Quạt tản nhiệt','Máy in laser'],'Ổ SSD','SSD dùng chip Flash, không có bộ phận đĩa quay cơ học như HDD.');
insert into public.ic3_arcade_questions values ('l01-q08',1,'Các bộ phận bên trong thân máy thường kết nối với thành phần nào?',array['Bo mạch chủ (Mainboard)','Máy chiếu','Tai nghe','Máy in'],'Bo mạch chủ (Mainboard)','Bài học nêu các thiết bị bên trong kết nối với bo mạch chủ.');
insert into public.ic3_arcade_questions values ('l01-q09',1,'CPU và GPU thuộc nhóm thiết bị nào?',array['Thiết bị xử lý','Thiết bị in','Thiết bị phát âm','Thiết bị ngoại vi chỉ nhập'],'Thiết bị xử lý','CPU và GPU là ví dụ về các thiết bị xử lý.');
insert into public.ic3_arcade_questions values ('l01-q10',1,'Thiết bị nào dưới đây dùng để lưu trữ tệp lâu dài thay vì chỉ giữ dữ liệu tạm của chương trình?',array['SSD','RAM','CPU','GPU'],'SSD','Ổ SSD lưu giữ dữ liệu lâu dài; RAM chủ yếu là bộ nhớ làm việc tạm thời.');
insert into public.ic3_arcade_questions values ('l01-q11',1,'Thiết bị nào sau đây thường là thiết bị bên ngoài thân máy?',array['Bàn phím','Chip CPU trong máy','Khe RAM trên bo mạch','Chip ROM trên bo mạch'],'Bàn phím','Bàn phím thường đặt bên ngoài và kết nối với máy tính.');
insert into public.ic3_arcade_questions values ('l01-q12',1,'Muốn mang tệp sang máy tính khác mà không cần tháo linh kiện bên trong, nên chọn gì?',array['USB Flash Drive','CPU','RAM lắp trong máy','ROM trên bo mạch'],'USB Flash Drive','USB Flash Drive nhỏ gọn và dùng để lưu trữ, di chuyển dữ liệu giữa máy tính.');
insert into public.ic3_arcade_questions values ('l02-q01',2,'Thiết bị nào đưa văn bản vào máy tính bằng cách gõ?',array['Bàn phím','Màn hình','Loa','Máy chiếu'],'Bàn phím','Bàn phím là thiết bị nhập dùng để nhập ký tự vào máy tính.');
insert into public.ic3_arcade_questions values ('l02-q02',2,'Thiết bị nào thường dùng để in nội dung từ máy tính ra giấy?',array['Máy in','Webcam','Chuột','Máy quét'],'Máy in','Máy in (printer) là thiết bị xuất, đưa nội dung từ máy tính lên giấy.');
insert into public.ic3_arcade_questions values ('l02-q03',2,'Màn hình cảm ứng được xếp vào nhóm nào?',array['Vừa nhập vừa xuất','Chỉ nhập','Chỉ xuất','Chỉ lưu trữ'],'Vừa nhập vừa xuất','Màn hình cảm ứng hiển thị hình ảnh và nhận thao tác chạm.');
insert into public.ic3_arcade_questions values ('l02-q04',2,'Đầu nối Ethernet thường phục vụ việc gì?',array['Kết nối mạng','In ảnh không cần máy in','Tăng dung lượng RAM','Làm bộ nhớ ROM'],'Kết nối mạng','Cổng Ethernet dùng để kết nối máy tính với mạng.');
insert into public.ic3_arcade_questions values ('l02-q05',2,'Cổng HDMI thường dùng để kết nối thiết bị nào?',array['Máy chiếu hoặc màn hình','Bút mực','Ổ cắm điện dân dụng','Giấy in'],'Máy chiếu hoặc màn hình','HDMI là một giao tiếp hình ảnh, thường dùng nối màn hình hoặc máy chiếu.');
insert into public.ic3_arcade_questions values ('l03-q01',3,'Thiết bị nào có bàn phím vật lý tích hợp và dùng pin để mang theo?',array['Laptop','Máy tính để bàn không có pin','Máy chiếu','Máy in'],'Laptop','Laptop có thiết kế di động, bàn phím tích hợp và pin sạc.');
insert into public.ic3_arcade_questions values ('l03-q02',3,'Thiết bị nào thường sử dụng màn hình cảm ứng và bàn phím ảo?',array['Máy tính bảng (tablet)','Máy in laser','Màn hình máy tính rời','Máy quét'],'Máy tính bảng (tablet)','Tablet tích hợp màn hình cảm ứng, pin và bàn phím ảo.');
insert into public.ic3_arcade_questions values ('l03-q03',3,'Chromebook trong bài học sử dụng hệ điều hành gì?',array['ChromeOS','MS-DOS','watchOS','FreeDOS'],'ChromeOS','Chromebook là dòng máy tính xách tay sử dụng ChromeOS.');
insert into public.ic3_arcade_questions values ('l11-q01',11,'Nút Stop của trình duyệt dùng để làm gì?',array['Dừng tải trang web','Thêm dấu trang','Làm mới trang','Về trang chủ'],'Dừng tải trang web','Stop dừng quá trình tải trang web đang diễn ra; không phải nút đóng trình duyệt.');
insert into public.ic3_arcade_questions values ('l11-q02',11,'Nút Refresh có tác dụng gì?',array['Làm mới trang web','Xóa tất cả dấu trang','Tắt máy tính','Mở trình phát nhạc'],'Làm mới trang web','Refresh tải lại hoặc làm mới trạng thái trang web đang xem.');
insert into public.ic3_arcade_questions values ('l11-q03',11,'Nút Back (mũi tên quay lại) dùng để làm gì?',array['Quay lại trang đã xem trước đó','Đóng hết tab','Đặt lại mật khẩu','Chụp màn hình'],'Quay lại trang đã xem trước đó','Nút Back giúp quay lại trang web đã xem trước đó.');
insert into public.ic3_arcade_questions values ('l11-q04',11,'Nút Home trên trình duyệt có chức năng gì?',array['Chuyển đến trang mặc định (trang chủ)','Làm mới trang','Xóa lịch sử','Tắt Wi-Fi'],'Chuyển đến trang mặc định (trang chủ)','Home đưa người dùng tới trang chủ hoặc trang mặc định của trình duyệt.');
insert into public.ic3_arcade_questions values ('l11-q05',11,'Bookmark (Dấu trang) giúp người dùng làm gì?',array['Lưu một trang web để quay lại lần sau','Tăng tốc RAM','Tạo tài khoản Windows','Thay đổi kích thước màn hình'],'Lưu một trang web để quay lại lần sau','Bookmark giúp đánh dấu và lưu địa chỉ trang web muốn truy cập lại.');
insert into public.ic3_arcade_questions values ('l11-q06',11,'Sau khi nhấn biểu tượng ngôi sao và đặt tên dấu trang, học sinh cần chọn gì để lưu?',array['Done','Refresh','Back','Stop'],'Done','Theo hướng dẫn trong slide 21: nhấn ngôi sao, đặt tên dấu trang rồi chọn Done.');
insert into public.ic3_arcade_questions values ('l11-q07',11,'Trình duyệt web là gì?',array['Phần mềm ứng dụng để xem, truy cập và điều hướng trang web','Một hệ điều hành','Thiết bị để in tài liệu','Ổ lưu trữ ngoài'],'Phần mềm ứng dụng để xem, truy cập và điều hướng trang web','Trình duyệt là phần mềm ứng dụng, giúp xem và điều hướng nội dung trên Web.');
insert into public.ic3_arcade_questions values ('l11-q08',11,'Theo bài giảng, có thể xóa dấu trang bằng thao tác nào?',array['Nháy phải vào dấu trang và chọn Delete','Nhấn nút Home','Tắt loa','Mở máy tính'],'Nháy phải vào dấu trang và chọn Delete','Slide 22 hướng dẫn nháy chuột phải vào dấu trang rồi chọn Delete.');
create table public.ic3_arcade_gifts (
 student_id uuid references public.students(id) on delete cascade,
 request_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(student_id,request_id)
);
alter table public.ic3_arcade_gifts enable row level security;
revoke all on public.ic3_arcade_gifts from public,anon,authenticated;
create function public.ic3_arcade_turn(p_session_token text,p_action text default 'status',p_turn uuid default null,p_choice text default null,p_item int default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 who jsonb:=public.qlpm_student_desktop_whoami(p_session_token);
 sid uuid:=(who->>'student_id')::uuid;
 school uuid:=(who->>'school_id')::uuid;
 pl public.ic3_arcade_player%rowtype;
 q public.ic3_arcade_questions%rowtype;
 bonus int:=0; outcome text; feedback text; ordered jsonb; wallet jsonb;
begin
 if sid is null then raise exception 'Phiên học sinh đã hết hạn. Vui lòng đăng nhập lại.'; end if;
 insert into public.ic3_arcade_player(student_id) values(sid) on conflict do nothing;
 select * into strict pl from public.ic3_arcade_player where student_id=sid for update;
 if p_action='redeem' then
   if p_turn is null then raise exception 'Thiếu mã lần đổi quà'; end if;
   perform id from public.students where id=sid for update;
   if not exists(select 1 from public.ic3_arcade_gifts where student_id=sid and request_id=p_turn) then
     if coalesce((select available from public.ic3_star_wallets where student_id=sid and school_id=school),0)<2 then raise exception 'Cần đủ 2 sao để đổi quà'; end if;
     insert into public.ic3_arcade_gifts(student_id,request_id) values(sid,p_turn);
     insert into public.student_records(school_id,student_id,record_type,title,points,record_date)
     values(school,sid,'reward','Săn Sao IC3 · đổi quà',-2,(now() at time zone 'Asia/Ho_Chi_Minh')::date);
   end if;
   outcome:='redeemed';
 elsif p_action='costume' then
   if p_item is null or p_item not between 0 and least(19,pl.cleared) then raise exception 'Trang phục chưa mở'; end if;
   pl.costume:=p_item;
 elsif p_action='gear' then
   if p_item is null or p_item not between 0 and least(5,pl.cleared/3) then raise exception 'Trang bị chưa mở'; end if;
   pl.gear:=p_item;
 elsif p_action='answer' and pl.turn is not null and p_turn=pl.turn then
   select * into strict q from public.ic3_arcade_questions where id=pl.question;
   feedback:=q.explanation;
   if clock_timestamp()<=pl.deadline and p_choice=q.solution then
     outcome:='correct';pl.score:=pl.score+10;pl.hp:=greatest(0,pl.hp-100-pl.gear*3);
     bonus:=case pl.score when 400 then 1 when 800 then 1 when 1600 then 2 when 4200 then 2 else 0 end;
     if bonus>0 then
       insert into public.student_records(school_id,student_id,record_type,title,points,note,record_date)
       values(school,sid,'reward','Săn Sao IC3 · '||pl.score||' điểm',bonus,'Thưởng mốc điểm trong một lượt sống',(now() at time zone 'Asia/Ho_Chi_Minh')::date);
     end if;
     if pl.hp=0 then
       outcome:='victory';pl.cleared:=greatest(pl.cleared,pl.stage);pl.stage:=least(22,pl.stage+1);
       pl.hp:=1000+100*pl.stage;pl.seen:='{}';
     end if;
   else
     outcome:='wrong';pl.hearts:=greatest(0,pl.hearts-(1+(pl.stage-1)/9));
     if pl.hearts=0 then outcome:='defeat';pl.hearts:=3;pl.score:=0;pl.hp:=1000+100*pl.stage;end if;
   end if;
   pl.turn:=null;pl.question:=null;pl.deadline:=null;
 elsif p_action='next' and pl.turn is null then
   select * into q from public.ic3_arcade_questions where lesson<=pl.stage and not(id=any(pl.seen))
   order by (lesson=pl.stage) desc,random() limit 1;
   if not found then
     pl.seen:='{}';select * into strict q from public.ic3_arcade_questions where lesson=pl.stage order by random() limit 1;
   end if;
   pl.seen:=array_append(pl.seen,q.id);pl.question:=q.id;pl.turn:=gen_random_uuid();pl.deadline:=clock_timestamp()+interval '20 seconds';
 elsif p_action not in ('status','answer','next') then raise exception 'Thao tác không hợp lệ';end if;
 update public.ic3_arcade_player set stage=pl.stage,cleared=pl.cleared,score=pl.score,hearts=pl.hearts,hp=pl.hp,costume=pl.costume,gear=pl.gear,question=pl.question,turn=pl.turn,deadline=pl.deadline,seen=pl.seen where student_id=sid;
 if pl.turn is not null then
   select * into strict q from public.ic3_arcade_questions where id=pl.question;
   select jsonb_agg(v order by md5(pl.turn::text||v)) into ordered from unnest(q.choices) v;
 end if;
 select jsonb_build_object('earned',earned,'available',available) into wallet from public.ic3_star_wallets where student_id=sid and school_id=school;
 return (to_jsonb(pl)-'student_id'-'seen')||jsonb_build_object('prompt',case when pl.turn is not null then q.prompt end,'choices',ordered,'outcome',outcome,'feedback',feedback,'bonus',bonus,'wallet',coalesce(wallet,'{"earned":0,"available":0}'::jsonb),'server_now',clock_timestamp());
end $$;
revoke all on function public.ic3_arcade_turn(text,text,uuid,text,int) from public;
grant execute on function public.ic3_arcade_turn(text,text,uuid,text,int) to anon,authenticated;
