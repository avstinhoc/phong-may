// Teacher-review drafts derived from the supplied slides. NOT an official/approved IC3 bank.
// Server-validated answer checking and staff approval are required before real pupil rewards.
const mc=(id,lessonNumber,slide,objective,prompt,options,correctId,explanation,tags=[],visual=null)=>({
 id,lessonId:`lv1-${String(lessonNumber).padStart(2,'0')}`,objective,
 type:visual?'image-choice':'multiple-choice',difficulty:'discovery',prompt,
 options:options.map(([id,label])=>({id,label})),correctId,explanation,
 tags,sourceSlides:[slide],status:'teacher-review-required',visual
});
export const PROTOTYPE_QUESTIONS=[
 mc('l01-q01',1,4,'Nhận biết thiết bị xử lý','Bộ phận nào chủ yếu xử lý dữ liệu và thực thi lệnh trong máy tính?',
  [['a','CPU'],['b','Loa'],['c','Máy in'],['d','Webcam']],'a',
  'CPU là bộ xử lý trung tâm, thực thi lệnh và xử lý dữ liệu.', ['cpu','xử lý'],{device:'cpu'}),
 mc('l01-q02',1,6,'Phân biệt RAM và lưu trữ lâu dài','Điều gì xảy ra với dữ liệu tạm trong RAM khi tắt nguồn máy tính?',
  [['a','Được giữ vĩnh viễn'],['b','Bị mất'],['c','Tự chuyển vào USB'],['d','Tự chuyển thành ROM']],'b',
  'RAM là bộ nhớ khả biến; dữ liệu đang lưu tạm trong RAM sẽ mất khi ngắt nguồn.', ['ram','bộ nhớ']),
 mc('l01-q03',1,7,'Phân biệt RAM và ROM','Theo bài học, ROM là loại bộ nhớ nào?',
  [['a','Bộ nhớ chỉ đọc, không mất dữ liệu khi tắt máy'],['b','Bộ nhớ chỉ chứa âm thanh'],['c','Bộ nhớ tạm bị xóa khi tắt máy'],['d','Thiết bị nhập văn bản']],'a',
  'ROM là bộ nhớ chỉ đọc và không khả biến, khác với RAM.', ['rom','bộ nhớ']),
 mc('l01-q04',1,11,'Nhận biết công nghệ SSD','Ổ SSD sử dụng công nghệ nào để lưu dữ liệu?',
  [['a','Đĩa từ quay'],['b','Băng giấy'],['c','Bộ nhớ Flash'],['d','Đầu kim in']],'c',
  'SSD lưu dữ liệu trên các chip nhớ Flash, không dùng đĩa từ quay như HDD.', ['ssd','lưu trữ'],{device:'ssd'}),
 mc('l01-q05',1,9,'Nhận biết công nghệ HDD','HDD truyền thống lưu dữ liệu chủ yếu bằng cách nào?',
  [['a','Dùng đĩa từ quay và đầu đọc/ghi'],['b','Dùng micro'],['c','Dùng tia máy chiếu'],['d','Dùng màn hình cảm ứng']],'a',
  'Ổ HDD cơ học dùng đĩa từ quay và đầu đọc/ghi.', ['hdd','lưu trữ']),
 mc('l01-q06',1,15,'Thiết bị lưu trữ ngoài','Thiết bị lưu trữ nào nhỏ gọn và thường kết nối máy tính qua cổng USB?',
  [['a','GPU'],['b','Ổ USB Flash'],['c','ROM trên bo mạch chủ'],['d','CPU']],'b',
  'USB Flash Drive là thiết bị lưu trữ ngoài dùng bộ nhớ Flash và cổng USB.', ['usb','lưu trữ'],{device:'usb'}),
 mc('l01-q07',1,14,'So sánh HDD SSD','Thiết bị nào dưới đây thường hoạt động yên tĩnh hơn do không có đĩa quay cơ học?',
  [['a','Ổ SSD'],['b','Ổ HDD cơ học'],['c','Quạt tản nhiệt'],['d','Máy in laser']],'a',
  'SSD dùng chip Flash, không có bộ phận đĩa quay cơ học như HDD.', ['hdd','ssd']),
 mc('l01-q08',1,18,'Nhận biết phần cứng bên trong','Các bộ phận bên trong thân máy thường kết nối với thành phần nào?',
  [['a','Máy chiếu'],['b','Bo mạch chủ (Mainboard)'],['c','Tai nghe'],['d','Máy in']],'b',
  'Bài học nêu các thiết bị bên trong kết nối với bo mạch chủ.', ['mainboard'],{device:'mainboard'}),
 mc('l01-q09',1,4,'Phân loại phần cứng','CPU và GPU thuộc nhóm thiết bị nào?',
  [['a','Thiết bị xử lý'],['b','Thiết bị in'],['c','Thiết bị phát âm'],['d','Thiết bị ngoại vi chỉ nhập']],'a',
  'CPU và GPU là ví dụ về các thiết bị xử lý.', ['cpu','gpu']),
 mc('l01-q10',1,5,'Nhận biết thiết bị lưu trữ','Thiết bị nào dưới đây dùng để lưu trữ tệp lâu dài thay vì chỉ giữ dữ liệu tạm của chương trình?',
  [['a','RAM'],['b','SSD'],['c','CPU'],['d','GPU']],'b',
  'Ổ SSD lưu giữ dữ liệu lâu dài; RAM chủ yếu là bộ nhớ làm việc tạm thời.', ['ram','ssd']),
 mc('l01-q11',1,19,'Nhận biết thiết bị ngoại vi','Thiết bị nào sau đây thường là thiết bị bên ngoài thân máy?',
  [['a','Bàn phím'],['b','Chip CPU trong máy'],['c','Khe RAM trên bo mạch'],['d','Chip ROM trên bo mạch']],'a',
  'Bàn phím thường đặt bên ngoài và kết nối với máy tính.', ['thiết bị ngoài']),
 mc('l01-q12',1,16,'Chọn giải pháp lưu trữ','Muốn mang tệp sang máy tính khác mà không cần tháo linh kiện bên trong, nên chọn gì?',
  [['a','CPU'],['b','RAM lắp trong máy'],['c','USB Flash Drive'],['d','ROM trên bo mạch']],'c',
  'USB Flash Drive nhỏ gọn và dùng để lưu trữ, di chuyển dữ liệu giữa máy tính.', ['usb','ứng dụng']),
 mc('l02-q01',2,5,'Thiết bị nhập','Thiết bị nào đưa văn bản vào máy tính bằng cách gõ?',
  [['a','Bàn phím'],['b','Màn hình'],['c','Loa'],['d','Máy chiếu']],'a',
  'Bàn phím là thiết bị nhập dùng để nhập ký tự vào máy tính.', ['input'],{device:'keyboard'}),
 mc('l02-q02',2,6,'Thiết bị xuất','Thiết bị nào thường dùng để in nội dung từ máy tính ra giấy?',
  [['a','Webcam'],['b','Máy in'],['c','Chuột'],['d','Máy quét']],'b',
  'Máy in (printer) là thiết bị xuất, đưa nội dung từ máy tính lên giấy.', ['output','printer'],{device:'printer'}),
 mc('l02-q03',2,8,'Thiết bị vừa nhập vừa xuất','Màn hình cảm ứng được xếp vào nhóm nào?',
  [['a','Chỉ nhập'],['b','Chỉ xuất'],['c','Vừa nhập vừa xuất'],['d','Chỉ lưu trữ']],'c',
  'Màn hình cảm ứng hiển thị hình ảnh và nhận thao tác chạm.', ['input','output']),
 mc('l02-q04',2,12,'Cổng mạng','Đầu nối Ethernet thường phục vụ việc gì?',
  [['a','Kết nối mạng'],['b','In ảnh không cần máy in'],['c','Tăng dung lượng RAM'],['d','Làm bộ nhớ ROM']],'a',
  'Cổng Ethernet dùng để kết nối máy tính với mạng.', ['ethernet','kết nối']),
 mc('l02-q05',2,10,'Nhận biết cổng hình ảnh','Cổng HDMI thường dùng để kết nối thiết bị nào?',
  [['a','Máy chiếu hoặc màn hình'],['b','Bút mực'],['c','Ổ cắm điện dân dụng'],['d','Giấy in']],'a',
  'HDMI là một giao tiếp hình ảnh, thường dùng nối màn hình hoặc máy chiếu.', ['hdmi','kết nối']),
 mc('l03-q01',3,21,'Phân loại máy tính','Thiết bị nào có bàn phím vật lý tích hợp và dùng pin để mang theo?',
  [['a','Máy tính để bàn không có pin'],['b','Laptop'],['c','Máy chiếu'],['d','Máy in']],'b',
  'Laptop có thiết kế di động, bàn phím tích hợp và pin sạc.', ['laptop']),
 mc('l03-q02',3,23,'Nhận biết máy tính bảng','Thiết bị nào thường sử dụng màn hình cảm ứng và bàn phím ảo?',
  [['a','Máy tính bảng (tablet)'],['b','Máy in laser'],['c','Màn hình máy tính rời'],['d','Máy quét']],'a',
  'Tablet tích hợp màn hình cảm ứng, pin và bàn phím ảo.', ['tablet']),
 mc('l03-q03',3,22,'Nhận biết Chromebook','Chromebook trong bài học sử dụng hệ điều hành gì?',
  [['a','ChromeOS'],['b','MS-DOS'],['c','watchOS'],['d','FreeDOS']],'a',
  'Chromebook là dòng máy tính xách tay sử dụng ChromeOS.', ['chromebook','os'])
];
export const lessonQuestions=id=>PROTOTYPE_QUESTIONS.filter(q=>q.lessonId===id);
export function validateQuestion(q){
 return Boolean(q.id&&q.lessonId&&q.objective&&q.prompt&&q.explanation&&
 Array.isArray(q.sourceSlides)&&q.sourceSlides.length&&
 Array.isArray(q.tags)&&q.options?.length===4&&
 new Set(q.options.map(x=>x.id)).size===4&&q.options.some(x=>x.id===q.correctId));
}
