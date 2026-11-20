// IC3 GS6 Level 1: source-backed curriculum slots, not a claim of 22 complete slide decks.
// Source titles and ranges were checked against the teacher-provided PowerPoint files.
const source = (n,title,fileId,slideCount,start=1,end=slideCount)=>({
  id:`lv1-${String(n).padStart(2,'0')}`,number:n,title,fileId,
  sourceUrl:`https://drive.google.com/file/d/${fileId}/view`,
  previewUrl:`https://drive.google.com/file/d/${fileId}/preview`,
  slideCount,slideStart:start,slideEnd:end,status:'source-linked',
  quizStatus:'awaiting-teacher-review',gameStatus:'awaiting-question-approval'
});
export const LEVEL_1_LESSONS=[
 source(1,'Tìm hiểu phần cứng cơ bản của máy tính','1I4Ibkc4znQFz_Y6ZtIE0YZbPl0xMTstG',28),
 source(2,'Các thiết bị nhập và thiết bị xuất cơ bản','1T3oLbjG5-I2LQR_zliHYmtaKLs7akcI-',37,1,16),
 source(3,'Tìm hiểu các loại máy tính','1T3oLbjG5-I2LQR_zliHYmtaKLs7akcI-',37,17,37),
 source(4,'Tìm hiểu về phần mềm và ứng dụng','1cjH4k7bEtpwLEtafqoylmuKa9dw1V41V',29),
 source(5,'Tìm hiểu về hệ điều hành','1e3J98kvn5k_jTifRZDa5Upk98LdWSfqd',33),
 source(6,'Tài khoản đăng nhập và các tác vụ điều hướng','1NS8tlxyZtH1mrYH2sXQmAjVL9shRFo6o',26),
 source(7,'Quản lí tập tin và sao lưu dự phòng','1diS8v-MsWCSquRCp8Om099yOpFrFY_mx',25),
 {id:'lv1-08',number:8,title:'Giảm tải',status:'reduced',quizStatus:'locked',gameStatus:'locked',fileId:null},
 source(9,'Tìm hiểu về kết nối mạng không dây','1uB_gZy5w3UcwTTuXLLatVoeKpaHwFHnG',38),
 {id:'lv1-10',number:10,title:'Chưa được cung cấp tài liệu',status:'missing-source',quizStatus:'locked',gameStatus:'locked',fileId:null},
 {...source(11,'Các trình duyệt Web phổ biến và quản lí Bookmark','176MH2jHn4prgLDvbpLUU5vznTRteHePZ',null),sourceUrl:'https://docs.google.com/presentation/d/176MH2jHn4prgLDvbpLUU5vznTRteHePZ/edit'},
 source(12,'Tìm kiếm thông tin và thu hẹp phạm vi tìm kiếm','10FW1EcLzlE5iYxmp8Yorhwus-FOFYTbV',24),
 source(13,'Tìm hiểu về tài sản công cộng và giấy phép Creative Commons','1qlun3YUaKu9JFxFaVA-JuekJFuncl5c3',30),
 source(14,'Danh tính kĩ thuật số','1p_VlFnWWTZrBOwyASrjHECzwL5zZIX6F',25),
 source(15,'Các hành vi trực tuyến','1K4X_pGPnHJelAmo2FPh-741-1NQPbxUw',20),
 source(16,'Một số mạng truyền thông xã hội phổ biến','1L2vTJta5WsX6LSOuoP8zBDNDPJPEsggx',15),
 source(17,'Các nguyên tắc và chính sách khi tham gia mạng truyền thông xã hội','1Wz1wpTl8QtFNiRgpIGgsTga2VlEJByEw',22),
 source(18,'Tương tác trên môi trường kĩ thuật số','1DTnCk0Nez0zB0C6t3aTR7ixIrzvm_N7e',31),
 source(19,'Sự cần thiết của bảo mật thông tin','1IDggfjSA3qsPD8Qke0wZiw6qX6NMViOI',23),
 source(20,'Các mối nguy hiểm và cách phòng chống khi sử dụng công nghệ kĩ thuật số','1luGRRvBDmLCMpNe4xtn_NCsf-pBSkDxN',29),
 source(21,'Cách phòng chống khi sử dụng công nghệ kĩ thuật số','1sYGJrFUMN9y5u2IjOuGdymdFQXf1pltX',23),
 source(22,'Tìm hiểu công nghệ thu thập dữ liệu','1yknWH3mD1MkvCzf4Rrw_PNgR8DvcS_N_',28)
];
export const LEVELS=[{number:1,label:'Level 1',locked:false},{number:2,label:'Level 2',locked:true},{number:3,label:'Level 3',locked:true}];
export const lessonById=id=>LEVEL_1_LESSONS.find(x=>x.id===id)||null;
export const availableLessons=()=>LEVEL_1_LESSONS.filter(x=>x.status==='source-linked');
