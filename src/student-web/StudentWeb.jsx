import React,{useEffect,useState} from 'react';
import {
 Monitor, BookOpen, ClipboardList, Gamepad2, GraduationCap, Star, Trophy,
 LockKeyhole, Settings2, Wifi, WifiOff, ArrowLeft, ChevronRight,
 CalendarDays, ShieldCheck, Info, Laptop, School, HelpCircle, MoonStar, UserRound
} from 'lucide-react';
import StudentOnboarding from './StudentOnboarding.jsx';
const Lessons=React.lazy(()=>import('./Lessons.jsx'));
const Practice=React.lazy(()=>import('./Practice.jsx'));
const Campaign=React.lazy(()=>import('./Campaign.jsx'));
import './studentDesktop.css';
import {supabase} from '../lib/supabase';
import './studentExtras.css';

const navigation=[
 {id:'home',title:'Trang chủ',icon:Monitor},
 {id:'lessons',title:'Bài giảng',icon:BookOpen},
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
function StudentHome({onNavigate,online}){
 return <>
  <section className="student-hero">
   <div className="student-hero-copy">
    <span className="student-eyebrow">QLPM STUDENT · IC3 GLOBAL STANDARD 6</span>
    <h1>Học công nghệ,<br/><span>khám phá thế giới số!</span></h1>
    <p>Cùng học bài giảng, luyện câu hỏi và chinh phục thử thách. Kiến thức đúng mới giúp em chiến thắng!</p>
    <div className="student-hero-actions">
     <button type="button" className="student-cta primary" onClick={()=>onNavigate('lessons')}><BookOpen size={19}/> Mở bài giảng</button>
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
    <p>Vượt 22 bản đồ, mở trang phục và tích sao đổi quà.</p>
    <span className="student-card-action">Vào thế giới trò chơi <ChevronRight size={17}/></span>
   </button>
  </section>
  <div className="student-home-leaderboard"><button type="button" onClick={()=>onNavigate('leaderboard')}><Trophy size={22}/> <span><strong>Bảng xếp hạng toàn trường</strong><small>Top 5 trường · Top 10 từng khối · Sao và thành tích</small></span><ChevronRight size={18}/></button></div>
  <section className="student-bottom-grid">
   <article className="student-small-panel">
    <div className="student-small-icon"><School size={22}/></div>
    <div><h3>Trường, lớp và máy PC</h3><p>Thiết bị chưa được liên kết với một phòng máy. Giáo viên sẽ kích hoạt khi hoàn thiện cơ chế ghép nối an toàn.</p></div>
   </article>
   <article className="student-small-panel">
    <div className="student-small-icon"><ShieldCheck size={22}/></div>
    <div><h3>Quyền riêng tư của học sinh</h3><p>Vào tài khoản bằng mã PIN tự tạo khi đăng ký để lưu điểm và trang bị của riêng em.</p></div>
   </article>
  </section>
  {!online&&<p className="student-notice offline"><WifiOff size={18}/> Bài giảng Drive và game có dữ liệu trực tuyến cần kết nối Internet.</p>}
 </>;
}
function StudentAccount({session,onLogout}){
 return <section className="student-locked-panel">
  <div className="student-locked-icon"><UserRound size={37}/></div>
  <span className="student-eyebrow">TÀI KHOẢN HỌC SINH</span>
  <h2>{session.name}</h2>
  <p>Lớp {session.class_name||'—'} · {session.pc?'Đã ghép '+session.pc:'Chưa ghép PC'}</p>
  <p>Phiên đăng nhập được xác minh trên máy chủ. PIN không được lưu lại trên máy tính dùng chung.</p>
  <div className="student-login-steps">
   <div><span>✓</span><strong>Đã đăng nhập</strong><small>{session.name}</small></div>
   <div><span>✓</span><strong>Lớp</strong><small>{session.class_name||'—'}</small></div>
   <div><span>🖥</span><strong>Máy tính</strong><small>{session.pc||'Đợi giáo viên duyệt ghép PC'}</small></div>
  </div>
  <button className="student-signout" type="button" onClick={onLogout}><LockKeyhole size={18}/> Đăng xuất và xóa phiên</button>
 </section>;
}
function DeviceSettings({online,session}){
 const [pcCode,setPcCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function requestPc(e){
  e.preventDefault();if(!session?.token||!pcCode.trim())return;
  setBusy(true);setMessage('');
  try{
   const {data,error}=await supabase.rpc('qlpm_student_desktop_request_pc',{
     p_session_token:session.token,p_pc:pcCode.trim(),p_device_id:''
   });
   if(error)throw error;
   setMessage(data?.message||'Đã gửi yêu cầu.');
  }catch(e){setMessage(e.message||String(e));}finally{setBusy(false);}
 }
 return <div className="student-device-settings">
  <div className="student-section-title"><h2>Thiết bị & cài đặt</h2><p>PC01–PC40 phải được giáo viên xác nhận trước khi gắn với tài khoản học sinh.</p></div>
  <div className="student-settings-grid">
   <article className="student-setting-card"><Laptop size={28}/><h3>Máy tính đang ghép</h3>
    <strong>{session?.pc||'Chưa ghép PC'}</strong><p>Máy chỉ được xác nhận khi giáo viên duyệt yêu cầu và kiểm tra vị trí thực tế.</p>
    {session?<form className="student-pc-request" onSubmit={requestPc}>
      <label>Nhập mã PC muốn ghép<input placeholder="VD: PC21" value={pcCode} onChange={e=>setPcCode(e.target.value)} maxLength={16}/></label>
      <button disabled={busy||!pcCode.trim()} type="submit">Gửi giáo viên duyệt PC</button>
      {message&&<p role="status">{message}</p>}
    </form>:<p>Đăng nhập PIN trước để gửi yêu cầu kết nối máy.</p>}
   </article>
   <article className="student-setting-card"><CalendarDays size={28}/><h3>Truy cập bằng trình duyệt</h3><strong>Bật mặc định lần đầu</strong><p>Student Web hoạt động trong trình duyệt, không cài đặt phần mềm Windows.</p></article>
   <article className="student-setting-card">{online?<Wifi size={28}/>:<WifiOff size={28}/>}<h3>Kết nối mạng</h3><strong>{online?'Đang trực tuyến':'Không có kết nối'}</strong><p>Phiên đăng nhập và yêu cầu duyệt cần Internet; mất kết nối không tự xóa điểm đã lưu trên máy chủ.</p></article>
   <article className="student-setting-card"><ShieldCheck size={28}/><h3>Giao diện web</h3><strong>Thu nhỏ và phóng to được</strong><p>Có thể mở trên máy tính hoặc điện thoại; dữ liệu cá nhân chỉ hiện sau khi đăng nhập.</p></article>
  </div>
 </div>;
}
export default function StudentWeb(){
 const [page,setPage]=useState('account');
 const [online,setOnline]=useState(typeof navigator!=='undefined'?navigator.onLine:true);
 const [session,setSession]=useState(null);
 const [lastCode,setLastCode]=useState('');
 useEffect(()=>{
  const goOnline=()=>setOnline(true),goOffline=()=>setOnline(false);
  window.addEventListener('online',goOnline);window.addEventListener('offline',goOffline);
  return()=>{window.removeEventListener('online',goOnline);window.removeEventListener('offline',goOffline);};
 },[]);
 useEffect(()=>{
  let active=true;
  const token=sessionStorage.getItem('qlpm.student.web.session');
  if(!token||!supabase)return;
  supabase.rpc('qlpm_student_web_whoami',{p_session_token:token}).then(({data,error})=>{
   if(!active)return;
   if(error||!data){sessionStorage.removeItem('qlpm.student.web.session');setSession(null);setPage('account');return;}
   setSession({...data,token,student_name:data.name});setLastCode(data.class_code||'');setPage('home');
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
 const current=navigation.find(x=>x.id===page)||navigation[0];
 const navigate=next=>{setPage(session?next:'account');window.scrollTo({top:0,behavior:'auto'});};
 function acceptLogin(data){
  if(!data?.session_token)return;
  sessionStorage.setItem('qlpm.student.web.session',data.session_token);
  setLastCode(data.class_code||'');
  setSession({...data,token:data.session_token,name:data.student_name,pc:null});
  setPage('home');
 }
 async function logout(){
  const token=session?.token;
  sessionStorage.removeItem('qlpm.student.web.session');setSession(null);setPage('account');
  if(token&&supabase)try{await supabase.rpc('qlpm_student_desktop_logout',{p_session_token:token});}catch{}
 }
 const embedded=page==='lessons'||page==='questions';
 return <div className="student-desktop-root">
  <aside className="student-desktop-sidebar">
   <div className="student-logo"><span><GraduationCap size={29}/></span><div><strong>QLPM Student</strong><small>Phòng máy thông minh</small></div></div>
   <div className="student-side-label">{session?'HỌC TẬP & KHÁM PHÁ':'ĐĂNG NHẬP ĐỂ BẮT ĐẦU'}</div>
   <nav aria-label="Menu QLPM Student">{session?navigation.map(x=><button key={x.id} type="button" className={page===x.id?'current':''} onClick={()=>navigate(x.id)}>
      <x.icon size={20}/><span>{x.title}</span>{['lessons','questions','games'].includes(x.id)&&<span className="student-side-marker"/>}
     </button>):<p style={{padding:12,fontSize:13,color:'#bdd5df'}}>Đăng nhập để mở bài giảng, câu hỏi và trò chơi.</p>}</nav>
   <div className="student-side-spacer"/>
   <div className="student-device-badge"><Monitor size={23}/><div><strong>{session?.pc||'Máy chưa liên kết'}</strong><small>{session?session.name:'Chưa đăng nhập'}</small></div></div>
   <div className="student-sidebar-footer"><Info size={15}/> QLPM Student · Web</div>
  </aside>
  <div className="student-desktop-body">
   <header className="student-desktop-header">
    <div className="student-header-current"><current.icon size={19}/><strong>{current.title}</strong><span>IC3 GS6 · Level 1</span></div>
    <div className="student-header-actions"><StatusPill online={online}/><button type="button" className="student-profile-shortcut" onClick={()=>navigate('account')} title="Tài khoản học sinh"><UserRound size={17}/>{session?.name||'Đăng nhập'}</button></div>
   </header>
   <main className={'student-desktop-content '+(embedded||page==='games'?'learning-active':'')}>
    {page==='account'&&(session?<StudentAccount session={session} onLogout={logout}/>:
      <StudentOnboarding onLogin={acceptLogin} defaultCode={lastCode}/>)}
    {session&&page==='home'&&<StudentHome onNavigate={navigate} online={online}/>}
    <React.Suspense fallback={<p className="student-load-status" role="status">Đang mở nội dung học tập...</p>}>
     {session&&page==='lessons'&&<Lessons/>}
     {session&&page==='questions'&&<Practice/>}
     {session&&page==='games'&&<Campaign key={session.token} session={session}/>}
    </React.Suspense>
    {session&&page==='leaderboard'&&(lastCode?<iframe title="Bảng xếp hạng QLPM của trường" loading="lazy" src={'/school?code='+encodeURIComponent(lastCode)} style={{width:'100%',minHeight:'83vh',border:0,borderRadius:18,background:'#fff'}}/>:<p>Không xác định được mã lớp. Hãy đăng nhập lại.</p>)}
    {session&&page==='device'&&<DeviceSettings online={online} session={session}/>}
   </main>
   <footer className="student-desktop-footer"><span>✦ Học để hiểu · Chơi để nhớ · Tự tin sử dụng công nghệ</span><span>Level 2 & 3 tạm khóa</span></footer>
  </div>
 </div>;
}
