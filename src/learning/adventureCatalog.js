import {LEVEL_1_LESSONS} from './curriculum.js';

// Original concept blueprints only; final art/animations are future deliverables.
const concepts=[
 ['Xưởng Linh Kiện','digital-workshop',['Bọ Nhịp Xung','Giáp Sĩ Bộ Nhớ','Kỵ Binh Ổ Cứng','Long Vương Vi Xử Lý']],
 ['Thành Phố Ngoại Vi','peripheral-city',['Tiểu Quái Bàn Phím','Vệ Binh Máy Quét','Pháo Thủ Máy Chiếu','Cự Nhân Màn Hình Cảm Ứng']],
 ['Đảo Các Loại Máy','device-islands',['Người Gác Tháp PC','Linh Miêu Laptop','Hộ Vệ Máy Bảng','Khổng Lồ Chromebook']],
 ['Thung Lũng Ứng Dụng','app-valley',['Mầm Non Phần Mềm','Cánh Cổng Web','Kỵ Sĩ Mã Nguồn','Đại Pháp Sư Ứng Dụng']],
 ['Cung Điện Hệ Điều Hành','os-palace',['Bóng Ma Thanh Tác Vụ','Chim Lửa Cửa Sổ','Người Gác Tiến Trình','Hoàng Đế Hệ Điều Hành']],
 ['Pháo Đài Tài Khoản','account-fort',['Chuột Túi Mật Khẩu','Người Canh Đăng Nhập','Cỗ Máy Điều Hướng','Thủ Lĩnh Khóa Bảo Vệ']],
 ['Khu Rừng Tập Tin','file-forest',['Bọ Cánh Cứng Tệp Tin','Thần Cây Thư Mục','Sói Bóng Bản Sao','Rồng Sao Lưu Dự Phòng']],
 ['Giảm Tải – Chưa Phát Hành','reserved-08',[]],
 ['Thành Phố Sóng Không Dây','wireless-city',['Tinh Linh Tín Hiệu','Cú Đêm Bluetooth','Đội Trưởng Wi-Fi','Lốc Xoáy Không Dây']],
 ['Chưa Có Tài Liệu','reserved-10',[]],
 ['Thư Viện Trình Duyệt','browser-library',['Bọ Tab Nhỏ','Thợ Săn Địa Chỉ','Người Giữ Dấu Trang','Vua Cổng Trình Duyệt']],
 ['Sa Mạc Công Cụ Tìm Kiếm','search-desert',['Bụi Cát Từ Khóa','Hộ Vệ Kết Quả','Sư Tử Bộ Lọc','Thần Đèn Truy Vấn']],
 ['Đảo Bản Quyền','commons-island',['Tiểu Quái Tác Giả','Kỵ Binh Giấy Phép','Hải Quái Tài Sản Công','Vương Miện Creative Commons']],
 ['Thành Danh Tính Số','identity-city',['Bóng Hình Hồ Sơ','Kỵ Sĩ Dấu Chân','Quạ Đen Danh Tiếng','Ảo Ảnh Danh Tính Số']],
 ['Rừng Hành Vi Trực Tuyến','behavior-forest',['Nhện Tin Đồn','Chim Cảnh Giác','Báo Săn Nguồn Tin','Thẩm Phán Hành Vi Số']],
 ['Hải Cảng Mạng Xã Hội','social-harbor',['Cá Bay Chia Sẻ','Hộ Vệ Kết Nối','Bão Bình Luận','Hải Vương Truyền Thông']],
 ['Thành Nội Quy Số','policy-citadel',['Bọ Luật Lệ','Kiếm Sĩ Quy Tắc','Người Canh Quyền Riêng Tư','Đại Tướng Chính Sách']],
 ['Tháp Tương Tác','communication-tower',['Bướm Hộp Thư','Người Đưa Tin Số','Người Gác Họp Video','Thần Rồng Giao Tiếp']],
 ['Hầm Bảo Mật','security-vault',['Bọ Rò Rỉ','Hiệp Sĩ Mã Khóa','Linh Hồn Máy Công Cộng','Đại Vệ Thần Dữ Liệu']],
 ['Căn Cứ Chống Mã Độc','malware-base',['Sâu Tập Tin Lạ','Bọ Lây Nhiễm','Cỗ Máy Phòng Thủ','Chúa Tể Nguy Cơ Số']],
 ['Mê Cung Lừa Đảo','fraud-maze',['Quái Thư Giả','Mèo Rủi Ro Mạng','Vệ Binh Điện Thoại','Bá Chủ Phòng Chống']],
 ['Pháo Đài Dữ Liệu','data-fortress',['Tiểu Quái Cookie','Người Thu Dấu Vết','Bóng Ma Thu Thập','Vua Quyền Riêng Tư']]
];
export const BALANCE={
 hearts:3,baseDamage:2,streakBonusEvery:3,streakBonusDamage:1,
 rounds:[{round:1,label:'Khám phá',hp:8},{round:2,label:'Luyện tập',hp:10},
         {round:3,label:'Thử thách',hp:12},{round:4,label:'Boss',hp:16}],
 maxAttackBonus:1,maxShieldBlocks:1,incorrectHeartDamage:1
};
export const WORLDS=LEVEL_1_LESSONS.map((lesson,i)=>({
 lessonId:lesson.id,lessonNumber:lesson.number,name:concepts[i][0],
 environmentKey:concepts[i][1],status:lesson.status==='source-linked'?'art-blueprint':'reserved',
 educationTitle:lesson.title
}));
const attackKeys=['pulse-strike','arc-wave','crystal-dash','boss-vortex'];
const silhouettes=['horned','winged','armored','golem','floating','serpent','mantis','beast','orb','crystalline','masked','tower'];
export const MONSTERS=WORLDS.flatMap((world,wi)=>BALANCE.rounds.map((round,ri)=>({
 id:`lv1-${String(wi+1).padStart(2,'0')}-enemy-${ri+1}`,
 lessonId:world.lessonId,round:ri+1,isBoss:ri===3,
 name:concepts[wi][2][ri]||`Chưa đặt tên — bài ${wi+1}, vòng ${ri+1}`,
 // Visual identity is unique at the blueprint level; actual bespoke sprites are NOT complete.
 visualKey:`enemy-${wi+1}-${ri+1}`,
 silhouette:silhouettes[(wi*4+ri)%silhouettes.length],
 ornamentVariant:`ornament-${wi+1}-${ri+1}`,
 attackStyle:`${attackKeys[ri]}-${wi+1}`,
 animationKey:`enemy-anim-${wi+1}-${ri+1}`,
 environmentKey:world.environmentKey,
 hp:round.hp,status:world.status
})));
export const HERO_STYLES=[
 {id:'warrior',name:'Cyber Warrior',emoji:'⚔️',description:'Chiến binh công nghệ'},
 {id:'archer',name:'Tech Archer',emoji:'🏹',description:'Cung thủ kỹ thuật số'},
 {id:'mage',name:'Digital Mage',emoji:'🪄',description:'Pháp sư số'}
];
export const EQUIPMENT_SLOTS=['weapon','armor','shield','boots','accessory'];
export const EQUIPMENT_RARITIES=['common','rare','epic','legendary'];
export const MINI_GAMES=[
 {id:'virus-defense',name:'Virus Defense',vi:'Phòng thủ Virus',objective:'Nhận diện nguy cơ và bảo mật',status:'planned'},
 {id:'hardware-builder',name:'Hardware Builder',vi:'Lắp ráp máy tính',objective:'Xác định thiết bị và chức năng',status:'planned'},
 {id:'network-rescue',name:'Network Rescue',vi:'Giải cứu mạng',objective:'Kết nối mạng và xử lý sự cố',status:'planned'},
 {id:'cyber-maze',name:'Cyber Maze',vi:'Mê cung số',objective:'Vận dụng kiến thức để chọn đường',status:'planned'},
 {id:'match-repair',name:'Match & Repair',vi:'Ghép đôi và sửa chữa',objective:'Ghép thuật ngữ và công dụng',status:'planned'},
 {id:'data-sorting-rush',name:'Data Sorting Rush',vi:'Phân loại dữ liệu',objective:'Nhóm đúng loại dữ liệu, thiết bị',status:'planned'},
 {id:'tech-racing',name:'Tech Racing',vi:'Đua xe công nghệ',objective:'Ôn tập không áp lực thời gian',status:'planned'},
 {id:'knowledge-challenge',name:'Knowledge Challenge',vi:'Thử thách kiến thức',objective:'Xâu chuỗi và giải quyết tình huống',status:'planned'}
];
export const monsterFor=(lessonId,round)=>MONSTERS.find(m=>m.lessonId===lessonId&&m.round===round);
