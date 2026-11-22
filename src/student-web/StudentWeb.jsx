import React,{useEffect,useState} from 'react';
import {
 Monitor, BookOpen, ClipboardList, Gamepad2, GraduationCap, Star, Trophy,
 LockKeyhole, Settings2, Wifi, WifiOff, ArrowLeft, ChevronRight, MessageCircle, Bell,
 CalendarDays, ShieldCheck, Info, Laptop, School, HelpCircle, MoonStar, UserRound
} from 'lucide-react';
import StudentOnboarding from './StudentOnboarding.jsx';
const StudentClassroom=React.lazy(()=>import('./StudentClassroom.jsx'));
const Practice=React.lazy(()=>import('./Practice.jsx'));
const Campaign=React.lazy(()=>import('./Campaign.jsx'));
const StudentLeaderboard=React.lazy(()=>import('./StudentLeaderboard.jsx'));
import './studentDesktop.css';
import {supabase} from '../lib/supabase';
import './studentExtras.css';

const navigation=[
 {id:'home',title:'Trang chủ',icon:Monitor},
 {id:'classroom',title:'Lớp học tương tác',icon:MessageCircle},
 {id:'questions',title:'Câu hỏi',icon:ClipboardList},
 {id:'games',title:'Trò chơi',icon:Gamepad2},
 {id:'leaderboard',title:'BXH toàn trường',icon:Trophy},
 {id:'account',title:'Tài khoản học sinh',icon:LockKeyhole},
 {id:'device',title:'Thiết bị & cài đặt',icon:Settings2}
];
function StatusPill({online}){
 return <span className={'student-online-pill '+(online?'online':'offline')}>
   {online?<Wifi size={15}/>:<WifiOff size={15}/>}
   {online?'Đã kết nối Internet':'Không có Internet'}
 </span>;
}
function StudentHome({onNavigate,online,session}){
 return <>
  <section className="student-hero">
   <div className="student-hero-copy">
    <span className="student-eyebrow">QLPM STUDENT · IC3 GLOBAL STANDARD 6</span>
    <h1>Học công nghệ,<br/><span>khám phá thế giới số!</span></h1>
    <p>Kết nối giáo viên, nhận bài tập, luyện câu hỏi và chinh phục thử thách. Kiến thức đúng mới giúp em chiến thắng!</p>
    <div className="student-hero-actions">
     <button type="button" className="student-cta primary" onClick={()=>onNavigate('classroom')}><MessageCircle size={19}/> Lớp học tương tác</button>
     <button type="button" className="student-cta secondary" onClick={()=>onNavigate('games')}><Gamepad2 size={19}/> Vào trò chơi</button>
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
   <button type="button" className="student-feature-card lecture" onClick={()=>onNavigate('classroom')}>
    <span className="student-feature-icon"><MessageCircle size={32}/></span>
    <strong>Lớp học tương tác</strong>
    <p>Nhận bài tập từ giáo viên, xem thông báo và nhắn tin riêng.</p>
    <span className="student-card-action">Mở lớp của em <ChevronRight size={17}/></span>
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
    <p>Vượt 22 bản đồ, mở trang phục và tích sao đổi quà.</p>
    <span className="student-card-action">Vào thế giới trò chơi <ChevronRight size={17}/></span>
   </button>
  </section>
  <div className="student-home-leaderboard"><button type="button" onClick={()=>onNavigate('leaderboard')}><Trophy size={22}/> <span><strong>Bảng xếp hạng toàn trường</strong><small>Top 5 trường · Top 10 từng khối · Sao và thành tích</small></span><ChevronRight size={18}/></button></div>
  <section className="student-bottom-grid">
   <article className="student-small-panel">
    <div className="student-small-icon"><School size={22}/></div>
    <div><h3>Trường, lớp và máy PC</h3><p>{session?.pc?'Máy liên kết: '+session.pc:session?.pc_requested?'Đã gửi yêu cầu PC '+session.pc_requested+'. Giáo viên cần duyệt trước khi liên kết.':'Chưa gán PC. Giáo viên có thể phân chỗ ngồi trong Quản lý phòng máy.'}</p></div>
   </article>
   <article className="student-small-panel">
    <div className="student-small-icon"><ShieldCheck size={22}/></div>
    <div><h3>Quyền riêng tư của học sinh</h3><p>Vào tài khoản bằng mã PIN tự tạo khi đăng ký để lưu điểm và tiến độ học tập của riêng em.</p></div>
   </article>
  </section>
  {!online&&<p className="student-notice offline"><WifiOff size={18}/> Tin nhắn, bài tập và trò chơi cần kết nối Internet.</p>}
 </>;
}
function StudentAccount({session,onLogout}){
 return <section className="student-locked-panel">
  <div className="student-locked-icon"><UserRound size={37}/></div>
  <span className="student-eyebrow">TÀI KHOẢN HỌC SINH</span>
  <h2>{session.name}</h2>
  <p>Lớp {session.class_name||'—'} · {session.pc?'Đã liên kết '+session.pc:session.pc_requested?'Đang chờ ghép '+session.pc_requested:'Chưa được gán PC'}</p>
  <p>Phiên đăng nhập được xác minh trên máy chủ. PIN không được lưu lại trên máy tính dùng chung.</p>
  <div className="student-login-steps">
   <div><span>✓</span><strong>Đã đăng nhập</strong><small>{session.name}</small></div>
   <div><span>✓</span><strong>Lớp</strong><small>{session.class_name||'—'}</small></div>
   <div><span>🖥</span><strong>Máy tính</strong><small>{session.pc||('Chờ duyệt '+(session.pc_requested||'PC'))}</small></div>
  </div>
  <button className="student-signout" type="button" onClick={onLogout}><LockKeyhole size={18}/> Đăng xuất và xóa phiên</button>
 </section>;
}
function DeviceSettings({online,session,onRefresh}){
 const [pcCode,setPcCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function requestPc(e){
  e.preventDefault();if(!session?.token||!pcCode.trim())return;
  setBusy(true);setMessage('');
  try{
   const {data,error}=await supabase.rpc('qlpm_student_desktop_request_pc',{
     p_session_token:session.token,p_pc:pcCode.trim(),p_device_id:''
   });
   if(error)throw error;
   setMessage(data?.message||'Đã gửi yêu cầu.');if(data?.ok)onRefresh?.();
  }catch(e){setMessage(e.message||String(e));}finally{setBusy(false);}
 }
 return <div className="student-device-settings">
  <div className="student-section-title"><h2>Thiết bị & cài đặt</h2><p>PC01–PC40 phải được giáo viên xác nhận trước khi gắn với tài khoản học sinh.</p></div>
  <div className="student-settings-grid">
   <article className="student-setting-card"><Laptop size={28}/><h3>Máy tính đang ghép</h3>
    <strong>{session?.pc||'Chưa ghép PC'}</strong><p>{session?.pc?'Máy đã được giáo viên gán hoặc duyệt.':session?.pc_requested?'PC mong muốn: '+session.pc_requested+' (chưa được gán hoặc xác nhận).':'Giáo viên cần gán máy hoặc phê duyệt yêu cầu ghép PC.'}</p>
    {session?<form className="student-pc-request" onSubmit={requestPc}>
      <label>Nhập mã PC muốn ghép<input placeholder="VD: PC21" value={pcCode} onChange={e=>setPcCode(e.target.value)} maxLength={16}/></label>
      <button disabled={busy||!pcCode.trim()} type="submit">Gửi giáo viên duyệt PC</button>
      {message&&<p role="status">{message}</p>}
    </form>:<p>Đăng nhập PIN trước để gửi yêu cầu kết nối máy.</p>}
   </article>
   <article className="student-setting-card"><CalendarDays size={28}/><h3>Truy cập bằng trình duyệt</h3><strong>Không cần cài đặt</strong><p>Student Web mở bằng trình duyệt. Lưu đường dẫn trên màn hình chính hoặc thanh dấu trang để vào nhanh.</p></article>
   <article className="student-setting-card">{online?<Wifi size={28}/>:<WifiOff size={28}/>}<h3>Kết nối mạng</h3><strong>{online?'Đang trực tuyến':'Không có kết nối'}</strong><p>Phiên đăng nhập và yêu cầu duyệt cần Internet; mất kết nối không tự xóa điểm đã lưu trên máy chủ.</p></article>
   <article className="student-setting-card"><ShieldCheck size={28}/><h3>Giao diện web</h3><strong>Thu nhỏ và phóng to được</strong><p>Có thể mở trên máy tính hoặc điện thoại; dữ liệu cá nhân chỉ hiện sau khi đăng nhập.</p></article>
  </div>
 </div>;
}
export default function StudentWeb(){
 useEffect(()=>{const previous=document.title;document.title='QLPM Student – IC3 GS6';return()=>{document.title=previous;};},[]);
 const [page,setPage]=useState('account');
 const [online,setOnline]=useState(typeof navigator!=='undefined'?navigator.onLine:true);
 const [session,setSession]=useState(null);
 const [lastCode,setLastCode]=useState('');
 const [syncWarning,setSyncWarning]=useState('');
 const [classroomUnread,setClassroomUnread]=useState(0);
 const [classroomToast,setClassroomToast]=useState('');
 const prevUnread=React.useRef(null);
 useEffect(()=>{
  const goOnline=()=>setOnline(true),goOffline=()=>setOnline(false);
  window.addEventListener('online',goOnline);window.addEventListener('offline',goOffline);
  return()=>{window.removeEventListener('online',goOnline);window.removeEventListener('offline',goOffline);};
 },[]);
 async function refreshStudent(token=sessionStorage.getItem('qlpm.student.web.session')){
  if(!token||!supabase)return;
  const {data,error}=await supabase.rpc('qlpm_student_web_whoami',{p_session_token:token});
  if(error)throw error;
  if(!data)throw Error('Phiên học sinh hết hạn.');
  setSession(v=>({...v,...data,token,name:data.name||v?.name||data.student_name}));
  if(data.class_code)setLastCode(data.class_code);
 }
 useEffect(()=>{
  let active=true;
  const token=sessionStorage.getItem('qlpm.student.web.session');
  if(!token||!supabase)return;
  supabase.rpc('qlpm_student_web_whoami',{p_session_token:token}).then(({data,error})=>{
   if(!active)return;
   if(error||!data){sessionStorage.removeItem('qlpm.student.web.session');setSession(null);setPage('account');setClassroomUnread(0);setClassroomToast('');prevUnread.current=null;return;}
   setSession({...data,token,student_name:data.name,name:data.name});setLastCode(data.class_code||'');setPage('home');
  }).catch(()=>{});
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  if(!session)return;
  let lastActivity=Date.now();
  const touch=()=>{lastActivity=Date.now()};
  const events=['pointerdown','keydown','mousemove'];
  for(const name of events)window.addEventListener(name,touch,{passive:true});
  const timer=window.setInterval(async()=>{
   if(Date.now()-lastActivity>20*60*1000){
    const token=sessionStorage.getItem('qlpm.student.web.session');sessionStorage.removeItem('qlpm.student.web.session');
    setSession(null);setPage('account');
    if(token)void supabase?.rpc('qlpm_student_desktop_logout',{p_session_token:token}).catch(()=>{});
   }
  },60000);
  return()=>{window.clearInterval(timer);for(const name of events)window.removeEventListener(name,touch);};
 },[session?.token]);
 useEffect(()=>{
  if(!session?.token)return;
  let lastCheck=0;
  const update=()=>{
   if(document.visibilityState==='hidden'||Date.now()-lastCheck<12000)return;
   lastCheck=Date.now();
   refreshStudent(session.token).then(()=>setSyncWarning('')).catch(e=>setSyncWarning(e.message||'Không cập nhật được trạng thái PC.'));
  };
  document.addEventListener('visibilitychange',update);
  window.addEventListener('focus',update);
  return()=>{document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update)};
 },[session?.token]);
 useEffect(()=>{
  if(!session?.token||!supabase){setClassroomUnread(0);prevUnread.current=null;return;}
  let alive=true;
  const check=async()=>{
   if(document.hidden)return;
   const {data,error}=await supabase.rpc('qlpm_classroom_student_feed',{p_session_token:session.token});
   if(error||!alive)return;
   const unread=Number(data?.unread||0);
   if(prevUnread.current!==null&&unread>prevUnread.current){
    setClassroomToast('🔔 Có tin nhắn mới từ giáo viên!');
   }
   prevUnread.current=unread;setClassroomUnread(unread);
  };
  void check();
  const id=setInterval(check,18000);
  return()=>{alive=false;clearInterval(id)};
 },[session?.token]);
 const current=navigation.find(x=>x.id===page)||navigation[0];
 const navigate=next=>{if(next==='classroom')setClassroomToast('');setPage(session?next:'account');window.scrollTo({top:0,behavior:'auto'});};
 async function acceptLogin(data){
  if(!data?.session_token)return;
  const token=data.session_token;
  sessionStorage.setItem('qlpm.student.web.session',token);
  setLastCode(data.class_code||'');
  setSession({...data,token,name:data.student_name,pc:data.pc||null});
  setPage('home');
  try{await refreshStudent(token);}catch(e){setSyncWarning('PC sẽ cập nhật khi kết nối lại: '+(e.message||String(e)))}
 }
 async function logout(){
  const token=session?.token;
  sessionStorage.removeItem('qlpm.student.web.session');setSession(null);setPage('account');setClassroomUnread(0);setClassroomToast('');prevUnread.current=null;
  if(token&&supabase)try{await supabase.rpc('qlpm_student_desktop_logout',{p_session_token:token});}catch{}
 }
 const embedded=page==='questions';
 return <div className="student-desktop-root">
  <aside className="student-desktop-sidebar">
   <div className="student-logo"><span><GraduationCap size={29}/></span><div><strong>QLPM Student</strong><small>Phòng máy thông minh</small></div></div>
   <div className="student-side-label">{session?'HỌC TẬP & KHÁM PHÁ':'ĐĂNG NHẬP ĐỂ BẮT ĐẦU'}</div>
   <nav aria-label="Menu QLPM Student">{session?navigation.map(x=><button key={x.id} type="button" className={page===x.id?'current':''} onClick={()=>navigate(x.id)}>
      <x.icon size={20}/><span>{x.title}</span>{x.id==='classroom'&&classroomUnread>0?<strong className="student-classroom-badge">{classroomUnread>99?'99+':classroomUnread}</strong>:
       ['questions','games'].includes(x.id)&&<span className="student-side-marker"/>}
     </button>):<p style={{padding:12,fontSize:13,color:'#bdd5df'}}>Đăng nhập để nhận bài tập, thông báo và nhắn tin với giáo viên.</p>}</nav>
   <div className="student-side-spacer"/>
   <div className="student-sidebar-connection"><StatusPill online={online}/></div>
   <button type="button" className="student-profile-sidebar" onClick={()=>navigate('account')}><UserRound size={18}/>{session?.name||'Đăng nhập'}</button>
   <div className="student-device-badge"><Monitor size={23}/><div><strong>{session?.pc||'Máy chưa liên kết'}</strong><small>{session?session.name:'Chưa đăng nhập'}</small></div></div>
   <div className="student-sidebar-footer"><Info size={15}/> QLPM Student · Web</div>
  </aside>
  <div className="student-desktop-body">
   {classroomToast&&page!=='classroom'&&<button className="student-classroom-toast" onClick={()=>{navigate('classroom');setClassroomToast('')}} role="status"><Bell size={19}/>{classroomToast} · Bấm để xem</button>}
   <main className={'student-desktop-content '+(embedded||page==='games'?'learning-active':'')}>
    {page==='account'&&(session?<StudentAccount session={session} onLogout={logout}/>:
      <StudentOnboarding onLogin={acceptLogin} defaultCode={lastCode}/>)}
    {session&&page==='home'&&<StudentHome onNavigate={navigate} online={online} session={session}/>}
    <React.Suspense fallback={<p className="student-load-status" role="status">Đang mở nội dung học tập...</p>}>
     {session&&page==='classroom'&&<StudentClassroom session={session} onUnread={setClassroomUnread}/>}
     {session&&page==='questions'&&<Practice key={session.token} session={session}/>}
     {session&&page==='games'&&<Campaign key={session.token} session={session}/>}
     {session&&page==='leaderboard'&&<StudentLeaderboard classCode={lastCode}/>} 
    </React.Suspense>

    {session&&page==='device'&&<DeviceSettings online={online} session={session} onRefresh={()=>refreshStudent(session.token)}/>}
    {syncWarning&&page==='device'&&<p role="status" className="student-sync-warning">{syncWarning}</p>}
   </main>
   <footer className="student-desktop-footer"><span>✦ Học để hiểu · Chơi để nhớ · Tự tin sử dụng công nghệ</span><span>Level 2 & 3 tạm khóa</span></footer>
  </div>
 </div>;
}
