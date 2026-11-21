// Deterministic, locally rendered technology illustrations ONLY.
// No external image URLs, no fetched photos, no PowerPoint screenshots.
// Device content is mapped to specific verified practice-question IDs.
const DEVICES={
 cpu:{kind:'cpu',label:'Bộ xử lý trung tâm (CPU)',description:'Bộ phận thực hiện các lệnh xử lý'},
 ram:{kind:'ram',label:'Bộ nhớ RAM',description:'Lưu dữ liệu tạm khi chương trình đang chạy'},
 ssd:{kind:'ssd',label:'Ổ lưu trữ SSD',description:'Lưu dữ liệu ngay cả khi tắt máy'},
 microphone:{kind:'microphone',label:'Micrô',description:'Thiết bị nhập âm thanh'},
 hdmi:{kind:'hdmi',label:'Cáp HDMI',description:'Kết nối truyền hình ảnh và âm thanh'},
 keyboard:{kind:'keyboard',label:'Bàn phím',description:'Thiết bị nhập văn bản'},
 monitor:{kind:'monitor',label:'Màn hình',description:'Thiết bị hiển thị hình ảnh'},
 mouse:{kind:'mouse',label:'Chuột',description:'Thiết bị nhập thao tác trỏ và nhấp'},
 printer:{kind:'printer',label:'Máy in',description:'Thiết bị xuất tài liệu ra giấy'},
 scanner:{kind:'scanner',label:'Máy quét',description:'Số hóa nội dung tài liệu giấy'},
 laptop:{kind:'laptop',label:'Laptop',description:'Máy tính có màn hình, bàn phím và pin tích hợp'},
 tablet:{kind:'tablet',label:'Máy tính bảng',description:'Máy tính di động có màn hình cảm ứng'},
 headphone:{kind:'headphone',label:'Tai nghe',description:'Thiết bị phát âm thanh cá nhân'}
};
const PER_QUESTION={
 '1-1':'ram','1-2':'ssd','1-3':'cpu',
 '2-1':'microphone','2-2':'hdmi','2-3':'tablet',
 '3-1':'laptop','3-2':'monitor','3-3':'tablet',
 '5-1':'printer','8-1':'scanner','9-1':'headphone',
 'guide-1-0':'cpu','guide-1-1':'ram','guide-1-2':'ssd',
 'guide-2-0':'microphone','guide-2-1':'monitor','guide-2-2':'hdmi',
 'guide-3-0':'monitor','guide-3-1':'laptop','guide-3-2':'tablet'
};
export function deviceVisualFor(q){
 const id=String(q?.id||'');
 const kind=PER_QUESTION[id]||PER_QUESTION[id.replace(/-(meaning|concept)$/,'')];
 return kind?DEVICES[kind]||null:null;
}
export const safeDeviceIllustrationCount=()=>Object.keys(DEVICES).length;
