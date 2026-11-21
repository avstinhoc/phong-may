import React,{useEffect,useState} from 'react';
import {
 Monitor, BookOpen, ClipboardList, Gamepad2, GraduationCap, Star, Trophy,
 LockKeyhole, Settings2, Wifi, WifiOff, ArrowLeft, ChevronRight,
 CalendarDays, ShieldCheck, Info, Laptop, School, HelpCircle, MoonStar
} from 'lucide-react';
import LearningPrototype from '../../learning/LearningPrototype.jsx';

const navigation=[
 {id:'home',title:'Trang chủ',icon:Monitor},
 {id:'lessons',title:'Bài giảng',icon:BookOpen},
 {id:'questions',title:'Câu hỏi',icon:ClipboardList},
 {id:'games',title:'Trò chơi',icon:Gamepad2},
 {id:'account',title:'Tài khoản học sinh',icon:LockKeyhole},
 {id:'device',title:'Thiết bị & cài đặt',icon:Settings2}
];
function StatusPill({online}){
 return <span className={'student-online-pill '+(online?'online':'offline')}>
   {online?<Wifi size={15}/>:<WifiOff size={15}/>}
   {online?'Đã kết nối Internet':'Không có Internet'}
 </span>;
}
function StudentHome({onNavigate,online}){
 return <>
  <section className="student-hero">
   <div className="student-hero-copy">
    <span className="student-eyebrow">QLPM STUDENT · IC3 GLOBAL STANDARD 6</span>
    <h1>Học công nghệ,<br/><span>khám phá thế giới số!</span></h1>
    <p>Cùng học bài giảng, luyện câu hỏi và chinh phục thử thách. Kiến thức đúng mới giúp em chiến thắng!</p>
    <div className="student-hero-actions">
     <button type="button" className="student-cta primary" onClick={()=>onNavigate('lessons')}><BookOpen size={19}/> Mở bài giảng</button>
     <button type="button" className="student-cta secondary" onClick={()=>onNavigate('games')}><Gamepad2 size={19}/> Chơi thử</button>
    </div>
   </div>
   <div className="student-hero-graphic" aria-hidden="true">
    <div className="student-orbit one"/><div className="student-orbit two"/>
    <span className="student-orbit-star left">✦</span><span className="student-orbit-star right">✧</span>
    <div className="student-hero-display"><Monitor size={93} strokeWidth={1.4}/><span>IC3</span></div>
    <span className="student-floating-icon a">🧠</span>
    <span className="student-floating-icon b">⭐</span>
    <span className="student-floating-icon c">🎮</span>
   </div>
  </section>
  <div className="student-section-title"><h2>Hôm nay em muốn làm gì?</h2><p>Chọn một hoạt động để bắt đầu</p></div>
  <section className="student-feature-grid">
   <button type="button" className="student-feature-card lecture" onClick={()=>onNavigate('lessons')}>
    <span className="student-feature-icon"><BookOpen size={32}/></span>
    <strong>Bài giảng</strong>
    <p>Xem tài liệu IC3 Level 1 theo dạng slide của giáo viên.</p>
    <span className="student-card-action">Khám phá 22 bài <ChevronRight size={17}/></span>
   </button>
   <button type="button" className="student-feature-card practice" onClick={()=>onNavigate('questions')}>
    <span className="student-feature-icon"><ClipboardList size={32}/></span>
    <strong>Câu hỏi</strong>
    <p>Trắc nghiệm, hình ảnh thiết bị và giải thích kiến thức.</p>
    <span className="student-card-action">Bắt đầu ôn tập <ChevronRight size={17}/></span>
   </button>
   <button type="button" className="student-feature-card adventure" onClick={()=>onNavigate('games')}>
    <span className="student-feature-icon"><Gamepad2 size={32}/></span>
    <strong>Trò chơi</strong>
    <p>Phiêu lưu RPG, câu cá kiến thức và lắp ráp phần cứng.</p>
    <span className="student-card-action">Vào thế giới trò chơi <ChevronRight size={17}/></span>
   </button>
  </section>
  <section className="student-bottom-grid">
   <article className="student-small-panel">
    <div className="student-small-icon"><School size={22}/></div>
    <div><h3>Trường, lớp và máy PC</h3><p>Thiết bị chưa được liên kết với một phòng máy. Giáo viên sẽ kích hoạt khi hoàn thiện cơ chế ghép nối an toàn.</p></div>
   </article>
   <article className="student-small-panel">
    <div className="student-small-icon"><ShieldCheck size={22}/></div>
    <div><h3>Quyền riêng tư của học sinh</h3><p>Giai đoạn thử nghiệm chỉ dùng bài học và câu hỏi mẫu; không yêu cầu mật khẩu/PIN, không lưu điểm cá nhân lên QLPM.</p></div>
   </article>
  </section>
  {!online&&<p className="student-notice offline"><WifiOff size={18}/> Bài giảng Drive và game có dữ liệu trực tuyến cần kết nối Internet.</p>}
 </>;
}
function StudentAccount(){
 return <section className="student-locked-panel">
  <div className="student-locked-icon"><LockKeyhole size={37}/></div>
  <span className="student-eyebrow">ĐĂNG NHẬP CÁ NHÂN</span>
  <h2>Chọn lớp → Chọn tên → Nhập PIN</h2>
  <p>Đây là phương thức đăng nhập chính thức đã chọn cho QLPM Student. Phần xác thực PIN phía máy chủ hiện chưa được kích hoạt trong bản thử nghiệm, để không xảy ra tình trạng truy cập nhầm hồ sơ học sinh.</p>
  <div className="student-login-steps">
   <div><span>1</span><strong>Trường & lớp</strong><small>Hiển thị theo buổi học đã được giáo viên mở</small></div>
   <div><span>2</span><strong>Họ tên</strong><small>Chỉ hiển thị danh sách được cấp quyền</small></div>
   <div><span>3</span><strong>PIN 6 số</strong><small>Máy chủ kiểm tra, không lưu PIN trên máy chung</small></div>
  </div>
  <p className="student-private-note"><ShieldCheck size={17}/> Hiện không có nút đăng nhập giả và không tải danh sách học sinh khi chưa được phép.</p>
 </section>;
}
function DeviceSettings({online}){
 return <div className="student-device-settings">
  <div className="student-section-title"><h2>Thiết bị & cài đặt</h2><p>Thông tin của bản QLPM Student thử nghiệm</p></div>
  <div className="student-settings-grid">
   <article className="student-setting-card"><Laptop size={28}/><h3>Định danh máy</h3><strong>Chưa liên kết PC</strong><p>PC01–PC40 sẽ chỉ được gán bởi giáo viên/Admin khi cơ chế đăng ký thiết bị đã sẵn sàng.</p></article>
   <article className="student-setting-card"><CalendarDays size={28}/><h3>Tự mở cùng Windows</h3><strong>Bật mặc định lần đầu</strong><p>Bản Windows đăng ký khởi chạy khi người dùng đăng nhập. Có thể tắt trong Windows Settings → Apps → Startup, ứng dụng sẽ không tự bật lại.</p></article>
   <article className="student-setting-card">{online?<Wifi size={28}/>:<WifiOff size={28}/>}<h3>Kết nối mạng</h3><strong>{online?'Đang trực tuyến':'Không có kết nối'}</strong><p>Ứng dụng không tự ghi kết quả trong chế độ offline và không xóa lịch sử học sinh.</p></article>
   <article className="student-setting-card"><ShieldCheck size={28}/><h3>Chế độ cửa sổ</h3><strong>Thu nhỏ và phóng to được</strong><p>Có thể sử dụng Word, Excel, PowerPoint hoặc các ứng dụng học IC3 khác bình thường.</p></article>
  </div>
 </div>;
}
export default function StudentDesktop(){
 const [page,setPage]=useState('home');
 const [online,setOnline]=useState(typeof navigator!=='undefined'?navigator.onLine:true);
 useEffect(()=>{
  const goOnline=()=>setOnline(true);
  const goOffline=()=>setOnline(false);
  window.addEventListener('online',goOnline);
  window.addEventListener('offline',goOffline);
  return()=>{window.removeEventListener('online',goOnline);window.removeEventListener('offline',goOffline)};
 },[]);
 const current=navigation.find(x=>x.id===page)||navigation[0];
 const navigate=(next)=>{setPage(next);window.scrollTo({top:0,behavior:'instant'});};
 const embedded=page==='lessons'||page==='questions'||page==='games';
 const learningSection=page==='lessons'?'lessons':'exercises';
 return <div className="student-desktop-root">
  <aside className="student-desktop-sidebar">
   <div className="student-logo"><span><GraduationCap size={29}/></span><div><strong>QLPM Student</strong><small>Phòng máy thông minh</small></div></div>
   <div className="student-side-label">HỌC TẬP & KHÁM PHÁ</div>
   <nav aria-label="Menu QLPM Student">{navigation.map(x=><button key={x.id} type="button" className={page===x.id?'current':''} onClick={()=>navigate(x.id)}>
      <x.icon size={20}/><span>{x.title}</span>{x.id==='lessons'||x.id==='questions'||x.id==='games'?<span className="student-side-marker"/>:null}
     </button>)}</nav>
   <div className="student-side-spacer"/>
   <div className="student-device-badge"><Monitor size={23}/><div><strong>Máy chưa liên kết</strong><small>Chế độ học thử</small></div></div>
   <div className="student-sidebar-footer"><Info size={15}/> QLPM Student v0.1 · Preview</div>
  </aside>
  <div className="student-desktop-body">
   <header className="student-desktop-header">
    <div className="student-header-current"><current.icon size={19}/><strong>{current.title}</strong><span>IC3 GS6 · Level 1</span></div>
    <div className="student-header-actions"><StatusPill online={online}/><button type="button" className="student-profile-shortcut" onClick={()=>navigate('account')} title="Tài khoản học sinh"><LockKeyhole size={17}/> Đăng nhập</button></div>
   </header>
   <main className={'student-desktop-content '+(embedded?'learning-active':'')}>
    {page==='home'&&<StudentHome onNavigate={navigate} online={online}/>}
    {embedded&&<><div className="student-learning-heading"><button type="button" onClick={()=>navigate('home')}><ArrowLeft size={17}/> Trang chủ</button><span>{page==='lessons'?'Bài giảng':page==='questions'?'Câu hỏi':'Trò chơi'} · 22 bài IC3 Level 1</span></div>
      <LearningPrototype key={page} embedded initialSection={learningSection} initialExerciseTab={page==='games'?'games':'questions'}/></>}
    {page==='account'&&<StudentAccount/>}
    {page==='device'&&<DeviceSettings online={online}/>}
   </main>
   <footer className="student-desktop-footer"><span>✦ Học để hiểu · Chơi để nhớ · Tự tin sử dụng công nghệ</span><span>Level 2 & 3 tạm khóa</span></footer>
  </div>
 </div>;
}
