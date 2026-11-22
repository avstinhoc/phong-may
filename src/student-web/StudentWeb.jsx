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
const SchoolPortal=React.lazy(()=>import('../SchoolPortal.jsx').then(m=>({default:m.SchoolPortal})));
const StudentPortal=React.lazy(()=>import('../StudentPortal.jsx').then(m=>({default:m.StudentPortal})));
const StudentProfile=React.lazy(()=>import('./StudentProfile.jsx'));
import StudentCompetitionProfile from './StudentCompetitionProfile.jsx';
import './studentDesktop.css';
import {supabase} from '../lib/supabase';
import './studentExtras.css';

const navigation=[
 {id:'home',title:'Trang chủ',icon:Monitor},
 {id:'classroom',title:'Lớp học tương tác',icon:MessageCircle},
 {id:'questions',title:'Câu hỏi',icon:ClipboardList},
 {id:'games',title:'Trò chơi',icon:Gamepad2},
 {id:'school-board',title:'BXH trường, khối',icon:Trophy},
 {id:'class-board',title:'BXH lớp',icon:Star}
];
function StatusPill({online}){
 return <span className={'student-online-pill '+(online?'online':'offline')}>
   {online?<Wifi size={15}/>:<WifiOff size={15}/>}
   {online?'Đã kết nối Internet':'Không có Internet'}
 </span>;
}
function StudentHome({onNavigate,online,session}){
 return <>
  <StudentCompetitionProfile session={session}/>
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
  <div className="student-home-leaderboard"><button type="button" onClick={()=>onNavigate('school-board')}><Trophy size={22}/> <span><strong>BXH trường & khối</strong><small>Top 5 toàn trường · Top 10 từng khối · Sao và thành tích</small></span><ChevronRight size={18}/></button></div>
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
 const prevPost=React.useRef(null);
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
   if(error||!data){sessionStorage.removeItem('qlpm.student.web.session');setSession(null);setPage('account');setClassroomUnread(0);setClassroomToast('');prevUnread.current=null;prevPost.current=null;return;}
   setSession({...data,token,student_name:data.name,name:data.name});setLastCode(data.class_code||'');
   setPage(new URLSearchParams(window.location.search).has('classroom')?'classroom':'home');
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
  if(!session?.token||!supabase){setClassroomUnread(0);prevUnread.current=null;prevPost.current=null;return;}
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
   const latestPost=data?.posts?.[0];
   if(prevPost.current!==null&&latestPost?.id&&latestPost.id!==prevPost.current){
     setClassroomToast('Có bài tập hoặc thông báo mới từ giáo viên!');
   }
   prevPost.current=latestPost?.id||null;
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
  setPage(new URLSearchParams(window.location.search).has('classroom')?'classroom':'home');
  try{await refreshStudent(token);}catch(e){setSyncWarning('PC sẽ cập nhật khi kết nối lại: '+(e.message||String(e)))}
 }
 async function logout(){
  const token=session?.token;
  sessionStorage.removeItem('qlpm.student.web.session');setSession(null);setPage('account');setClassroomUnread(0);setClassroomToast('');prevUnread.current=null;prevPost.current=null;
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
   <button type="button" className={'student-profile-sidebar'+(page==='profile'?' current':'')}
    onClick={()=>navigate('profile')}><UserRound size={18}/><span><strong>Hồ sơ học sinh</strong><small>{session?.name||'Đăng nhập'}</small></span></button>
  </aside>
  <div className="student-desktop-body">
   {classroomToast&&page!=='classroom'&&<button className="student-classroom-toast" onClick={()=>{navigate('classroom');setClassroomToast('')}} role="status"><Bell size={19}/>{classroomToast} · Bấm để xem</button>}
   <main className={'student-desktop-content '+(embedded||page==='games'?'learning-active':'')}>
    {!session&&<StudentOnboarding onLogin={acceptLogin} defaultCode={lastCode}/>}
    {session&&page==='home'&&<StudentHome onNavigate={navigate} online={online} session={session}/>}
    <React.Suspense fallback={<p className="student-load-status" role="status">Đang mở nội dung học tập...</p>}>
     {session&&page==='classroom'&&<StudentClassroom session={session} onUnread={setClassroomUnread}/>}
     {session&&page==='questions'&&<Practice key={session.token} session={session}/>}
     {session&&page==='games'&&<Campaign key={session.token} session={session}/>}
     {session&&page==='school-board'&&<SchoolPortal initialCode={lastCode} embedded rankingsOnly/>}
     {session&&page==='class-board'&&<StudentPortal initialCode={lastCode} classOnly/>}
     {session&&page==='profile'&&<StudentProfile session={session} onRefresh={()=>refreshStudent(session.token)} onLogout={logout}/>} 
    </React.Suspense>

    {syncWarning&&page==='profile'&&<p role="status" className="student-sync-warning">{syncWarning}</p>}
   </main>
   <footer className="student-desktop-footer"><span>✦ Học để hiểu · Chơi để nhớ · Tự tin sử dụng công nghệ</span><span>Level 2 & 3 tạm khóa</span></footer>
  </div>
 </div>;
}
