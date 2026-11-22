import {namePairs} from './lib/namePairs';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase, configurationError, authMessage, isEmailSendLimit } from "./lib/supabase";
import { SchoolManager, Accounts, TimetableImport } from "./Management";
import { WorkplaceManager } from "./WorkplaceManager";
import { StudentRoster } from "./StudentRoster";
import { StudentEvaluation } from "./StudentEvaluation";
import { StudentPortal } from "./StudentPortal";
import { SchoolPortal } from "./SchoolPortal";
import { TeacherSchoolLeaderboard } from "./TeacherSchoolLeaderboard";
import StudentWebManagement from "./StudentWebManagement";
import TeacherClassroom from "./TeacherClassroom";
import { StudentRewardManagement } from "./StudentRewardManagement";
import { StudentPicker } from "./StudentPicker";
import { RecordCorrectionEditor } from "./RecordCorrectionEditor";
import { AuthCallback, emailCallbackUrl } from "./AuthCallback";
import { startGoogleAuth, googleOAuthError } from "./lib/googleAuth";
import { TeacherPayroll } from "./TeacherPayroll";
import { ClassSettings } from "./ClassSettings";
import { ReportsCenter } from "./ReportsCenter";
import { HelpAssistant } from "./HelpAssistant";
import { ProfileSettings } from "./ProfileSettings";
import { properName, searchName, comparePC, compareStudentName } from "./lib/students";
import {flameEffect,groupedHistory,isFormalViolation} from "./lib/stars";
import {FlameBadge} from "./FlameBadge";
import { normalizeComputerCode,validFullName } from "./lib/registration";
import {pendingRegistrationsForClass,nextFriendRegistration,canConfirmFlaggedName} from "./lib/studentRegistrationUI";
import {buildIncidentReportHtml} from "./lib/incidentReportHtml";
import { TeachingCalendar } from "./TeachingCalendar";
import { Time24Input } from "./Time24Input";
import { isVietnamTimeRange } from "./lib/vietnamTime";
import {filterCreatedSessions,sessionDateWindow,shiftSessionDay,mondayOfSessionWeek} from "./lib/sessionDateFilter";
import { RollCall } from "./RollCall";
import {restrictManagementScope} from "./lib/ownedManagement";
import {ownTeachingLessons} from "./lib/rollCallSelection";
import {lessonsForHoliday,holidayShiftLabel} from "./lib/cancelledLessons";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, Users, Monitor, ClipboardList, CalendarDays, Wallet,
  Award, Sparkles, Settings, LogOut, Plus, Search, Download, RefreshCw,
  CheckCircle2, Clock3, AlertTriangle, School, Menu, X, UserPlus, MessageCircle, Bell,
  ShieldCheck, Trash2, FileSpreadsheet, ClipboardCheck, FileText,
  ChevronLeft, ChevronRight, Printer, UserCheck, UserRound, Building2, Trophy, Star, KeyRound
} from "lucide-react";

const nav = [
  ["dashboard", "Tổng quan", LayoutDashboard],
  ["students", "Đăng ký & duyệt", Users],
  ["roster", "Danh sách học sinh", ClipboardList],
  ["computers", "Phòng máy", Monitor],
  ["attendance", "Lịch dạy giáo viên", CalendarDays],
  ["rollcall", "Điểm danh học sinh", UserCheck],
  ["records", "Điểm, lỗi & thưởng", ClipboardList],
  ["student_rewards", "Quản lý sao & vi phạm", Star],
  ["leaderboard", "Bảng xếp hạng", Trophy],
  ["student_web", "Quản lý Student Web", Monitor],
  ["classroom", "Lớp học tương tác", MessageCircle],
  ["cleaning", "Vệ sinh máy", ClipboardCheck],
  ["finance", "Chấm công & tiền công", Clock3],
  ["evaluation", "Đánh giá học sinh", Sparkles],
  ["reports", "Báo cáo", FileText],
  ["workplaces", "Công ty / Trung tâm", Building2],
  ["schools", "Trường công tác", School],
  ["settings", "Lớp & mã đăng ký", Settings],
  ["accounts", "Quản lý tài khoản", ShieldCheck],
  ["personal", "Cá nhân", UserRound]
];

const money = n =>
  new Intl.NumberFormat("vi-VN").format(Number(n || 0)) + " đ";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dateText = value => {
  if (!value) return "—";
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("vi-VN");
};

function App() {
  const [calendarDate,setCalendarDate]=useState(today());
  const [session, setSession] = useState(null);
  const [account, setProfile] = useState(null);
  const [schools, setSchools] = useState([]);
  const [workplaces,setWorkplaces] = useState([]);
  const [workplaceSchools,setWorkplaceSchools] = useState([]);
  const [schoolId, setSchoolId] = useState(()=>{try{return sessionStorage.getItem('qlpm.schoolId')||'';}catch{return '';}});
  const [profileError, setProfileError] = useState("");
  const school = schools.find(s => s.id === schoolId);
  const profile = account ? {...account, school_id: school?.id || null, school_name: school?.name || "", school_logo:school?.logo_data||null} : null;
  const [page, setPage] = useState(()=>{
    try{const saved=sessionStorage.getItem('qlpm.page');return nav.some(x=>x[0]===saved)?saved:'dashboard';}
    catch{return 'dashboard';}
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [mobileNav, setMobileNav] = useState(false);
  const [manualRefresh,setManualRefresh]=useState(0);
  const [refresh, setRefresh] = useState(0);
  const [classroomUnread,setClassroomUnread]=useState(0);
  const [classroomToast,setClassroomToast]=useState('');
  const classroomLast=useRef(null);
  useEffect(()=>{
    if(!session?.user||!schoolId||!supabase){setClassroomUnread(0);classroomLast.current=null;return;}
    let live=true;
    const check=async()=>{
      if(document.hidden)return;
      const {data,error}=await supabase.rpc('qlpm_classroom_teacher_unread',{p_school_id:schoolId});
      if(error||!live)return;
      const next=Number(data||0);
      if(classroomLast.current!==null&&next>classroomLast.current){
        setClassroomToast('Có tin nhắn mới từ học sinh!');
      }
      classroomLast.current=next;setClassroomUnread(next);
    };
    void check();
    const timer=window.setInterval(check,18000);
    return()=>{live=false;window.clearInterval(timer)}
  },[session?.user?.id,schoolId]);
  useEffect(()=>{
    try{sessionStorage.setItem('qlpm.page',page);sessionStorage.setItem('qlpm.schoolId',schoolId);}catch{}
  },[page,schoolId]);
  // No reload to dashboard; refresh active data upon focus and once per visible minute.
  useEffect(()=>{
    const onFocus=()=>{if(!document.hidden)setRefresh(v=>v+1);};
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onFocus);
    const timer=window.setInterval(()=>{if(!document.hidden)setRefresh(v=>v+1);},60000);
    return()=>{window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);window.clearInterval(timer);};
  },[]);

  useEffect(()=>{
    const oauthError=e=>setProfileError('Google Windows: '+(e.detail?.message||'Không thể hoàn tất đăng nhập.'));
    window.addEventListener('qlpm-native-oauth-error',oauthError);
    return()=>window.removeEventListener('qlpm-native-oauth-error',oauthError);
  },[]);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data, error }) => { if (error) setProfileError(authMessage(error)); setSession(data.session); }).catch(e => { setProfileError(authMessage(e)); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => setSession(s)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let live = true;
    async function loadProfile() {
      if (!session?.user) {
        if (live) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      if (!account || account.id !== session.user.id) setLoading(true);
      try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (live) {
        setProfile(error ? null : data);
        setProfileError(error?.message || (!data ? "Chưa có hồ sơ. Hãy chạy migration để đồng bộ tài khoản Auth sang profiles." : ""));
        const [result,unitsResult,linksResult,membershipsResult]=await Promise.all([
          supabase.from("schools").select("id,name,logo_data").order("name"),
          supabase.from("workplaces").select("id,name,kind,created_by,logo_data").order("name"),
          supabase.from("workplace_schools").select("workplace_id,school_id"),
          supabase.from("school_members").select("school_id").eq("user_id",session.user.id)
        ]);
        if (!live) return;
        if (result.error) setProfileError(result.error.message);
        const scoped=account?.role==='admin'||data?.role==='admin'
          ? restrictManagementScope({
              schools:result.data||[],workplaces:unitsResult.data||[],links:linksResult.data||[],
              membershipIds:(membershipsResult.data||[]).map(x=>x.school_id),
              accountId:session.user.id,profileSchoolId:data?.school_id
            })
          : {schools:result.data||[],workplaces:(unitsResult.data||[]).filter(w=>w.created_by===session.user.id),
             links:linksResult.data||[]};
        setSchools(scoped.schools);
        setWorkplaces(scoped.workplaces);
        setWorkplaceSchools(scoped.links);
        setSchoolId(current=>scoped.schools.some(sc=>sc.id===current)?current:scoped.schools[0]?.id||"");
        if(unitsResult.error||linksResult.error||membershipsResult.error)
          setNotice("Không tải đủ phạm vi trường và trung tâm của tài khoản. Vui lòng làm mới và kiểm tra phân quyền.");
        setLoading(false);
      }
      } catch(e) { if(live) { setProfileError(authMessage(e)); setLoading(false); } }
    }
    loadProfile();
    return () => { live = false; };
  }, [session, refresh]);

  const ping = msg => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };
  const reload = () => {setRefresh(v => v + 1);setManualRefresh(v => v + 1);};
  const signOut = async () => {
    await supabase.auth.signOut();
    try{sessionStorage.removeItem('qlpm.page');sessionStorage.removeItem('qlpm.schoolId');}catch{}
    setProfile(null);
    setSchools([]);setWorkplaces([]);setWorkplaceSchools([]); setSchoolId(""); setPage("dashboard");
  };

  if (!supabase) return <SetupScreen />;
  if (window.location.pathname === "/auth/callback") return <AuthCallback />;
  if (window.location.pathname === "/student") {
    return <StudentPortal />;
  }
  if (window.location.pathname === "/school" || /^\/school\/grade\/[1-9]\/?$/.test(window.location.pathname)) {
    return <SchoolPortal />;
  }
  if (window.location.pathname === "/register") {
    return <><PublicStudentRegister ping={ping} />{notice && <div role="status" className="toast">{notice}</div>}</>;
  }
  if (loading) {
    return <div className="center-screen"><div className="spinner" />Đang tải hệ thống...</div>;
  }
  if (!session) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} ping={ping} />;
  }
  const isTeacher = profile?.is_active && ["admin", "teacher", "staff"].includes(profile?.role);
  if (!profile || !isTeacher || profileError) {
    return <div className="auth-wrap"><div className="auth-card"><h1>{profile?.is_active === false ? "Tài khoản đã bị khóa" : "Tài khoản đang chờ cấp quyền"}</h1><p>{profileError || "Admin cần duyệt tài khoản giáo viên. Bạn không cần đăng ký lại."}</p><button className="btn primary" onClick={reload}>Kiểm tra lại</button> <button className="btn outline" onClick={signOut}>Đăng xuất</button></div></div>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "show" : ""}`}>
        <div className="brand">
          <div className="brand-mark">IC3</div>
          <div><b>IC3 GS6</b><small>COMPUTER LAB</small></div>
          <button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <div className="school-chip">
          <School size={16} /><select aria-label="Trường đang quản lý" value={schoolId} onChange={e => setSchoolId(e.target.value)}>
            <option value="" disabled>Chọn trường</option>
            {workplaces.length?<>
              {workplaces.map(unit=>{
                const ids=new Set(workplaceSchools.filter(x=>x.workplace_id===unit.id).map(x=>x.school_id));
                const list=schools.filter(s=>ids.has(s.id));
                return list.length?<optgroup key={unit.id} label={(unit.kind==='company'?'Công ty':'Trung tâm')+' · '+unit.name}>
                  {list.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>:null;
              })}
              <optgroup label="Trường chưa thuộc đơn vị">
                {schools.filter(s=>!workplaceSchools.some(l=>l.school_id===s.id)).map(s=>
                  <option value={s.id} key={s.id}>{s.name}</option>)}
              </optgroup>
            </>:schools.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
           </select>
        </div>
        <nav className="nav-scroll" aria-label="Menu chính">
          {[["GIẢNG DẠY", ["dashboard", "attendance", "rollcall", "roster", "records", "student_rewards", "classroom", "evaluation"]],
            ["PHÒNG MÁY", ["computers", "students", "settings", "leaderboard", "cleaning"]],
            ["ỨNG DỤNG HỌC SINH", ["student_web"]],
            ["QUẢN LÝ", ["workplaces", "schools", "finance", "reports", "accounts"]]].map(([group, ids]) => <React.Fragment key={group}>
            <div className="nav-label">{group}</div>
            <ChevronRight size={17} className="profile-chevron"/>
            {ids.map(id => nav.find(n => n[0] === id)).filter(([id]) => id!=="accounts" || profile.role === "admin").map(([id,label,Icon]) => <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={()=>{setPage(id);setMobileNav(false);}}><Icon size={18}/>{label}{id==="classroom"&&classroomUnread>0&&<span className="classroom-global-badge">{classroomUnread>99?"99+":classroomUnread}</span>}</button>)}
          </React.Fragment>)}
        </nav>
        <div className="sidebar-bottom">
          <button type="button" className={'user-mini personal-entry '+(page==='personal'?'active':'')} aria-label="Mở trang Cá nhân" aria-current={page==='personal'?'page':undefined} onClick={()=>{setPage('personal');setMobileNav(false);}} title="Mở trang cá nhân">
            <div className="avatar">{profile.avatar_data?<img src={profile.avatar_data} alt="Ảnh đại diện"/>:(profile.full_name || "U").slice(0, 1).toUpperCase()}</div>
            <div>
              <b>{profile.full_name || session.user.email}</b>
              <small>{profile.role === "admin" ? "Quản trị viên" : profile.role === "teacher" ? "Giáo viên" : "Học sinh"}</small>
            </div>
          </button>
          <button className="nav-item" onClick={signOut}><LogOut size={18} />Đăng xuất</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setMobileNav(true)}><Menu /></button>
          <div>
            <div className="eyebrow">HỆ THỐNG QUẢN LÝ PHÒNG MÁY</div>
            <h1>{nav.find(x => x[0] === page)?.[1] || "IC3 GS6"}</h1>
          </div>
          <div className="top-actions"><button className="btn" onClick={signOut}><LogOut size={16}/>Đăng xuất</button>
            <span className="role-pill">{profile.role === "admin" ? "ADMIN" : profile.role === "teacher" ? "GIÁO VIÊN" : "HỌC SINH"}</span>
            <button className="icon-btn" title="Làm mới mục hiện tại và giữ nguyên trang" onClick={reload}><RefreshCw size={18} /></button>
            <button type="button" className="avatar avatar-action" onClick={()=>setPage('personal')} title="Cá nhân">{profile.avatar_data?<img src={profile.avatar_data} alt="Ảnh đại diện"/>:(profile.full_name || "U").slice(0, 1).toUpperCase()}</button>
          </div>
        </header>

        {notice && <div className="toast"><CheckCircle2 size={17} />{notice}</div>}
        {classroomToast&&page!=='classroom'&&<button className="classroom-global-toast"
          onClick={()=>{setPage('classroom');setClassroomToast('')}}><Bell size={18}/>
          {classroomToast} · Xem ngay</button>}

        <div className="content" key={(["workplaces","schools","settings","finance","reports","accounts","personal"].includes(page)?page:schoolId)+':'+page}>
          {page === "schools" && <SchoolManager
            schools={schools} workplaces={workplaces} workplaceSchools={workplaceSchools} role={profile.role}
            onCreated={id => {setSchoolId(id); reload();}}
            onChanged={deletedId => {if(deletedId === schoolId) setSchoolId(""); reload();}} ping={ping} />}
          {page==="workplaces"&&<WorkplaceManager profile={profile} schools={schools} workplaces={workplaces}
            links={workplaceSchools} onChanged={reload} ping={ping}
            onGoSchools={()=>setPage("schools")}/>}
          {page === "accounts" && profile.role === "admin" && <Accounts refresh={refresh} profile={profile} />}
          {page === "personal" && <ProfileSettings refresh={refresh} key={profile.id} profile={profile} email={session.user.email} reload={reload} ping={ping}/>}
          {page === "settings" && <ClassSettings refresh={refresh} profile={profile} ping={ping} schools={schools} onChanged={reload} />}
          {page === "finance" && <TeacherPayroll profile={profile} refresh={refresh} ping={ping} schools={schools} workplaces={workplaces} workplaceLinks={workplaceSchools} />}
          {page === "reports" && <ReportsCenter profile={profile} refresh={refresh} ping={ping} schools={schools} />}
          {!schoolId && !["workplaces","schools","settings","finance","reports","accounts","personal"].includes(page) && <div className="notice-box">Thêm trường đầu tiên để bắt đầu quản lý học sinh và lịch dạy.</div>}
          {schoolId && <>
          {page === "dashboard" && <Dashboard profile={profile} refresh={refresh} setPage={setPage} />}
          {page === "roster" && <StudentRoster profile={profile} refresh={refresh} syncRefresh={manualRefresh} ping={ping} />}
          {page === "students" && isTeacher && <Students profile={profile} refresh={refresh} reload={reload} ping={ping} navigate={setPage} />}
          {page === "computers" && <Computers profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "rollcall" && isTeacher && <RollCallView profile={profile} refresh={refresh} reload={reload} ping={ping} focusDate={calendarDate} setFocusDate={setCalendarDate} />}
          {page === "attendance" && isTeacher && <Attendance profile={profile} refresh={refresh} reload={reload} ping={ping} focusDate={calendarDate} setFocusDate={setCalendarDate} onImported={async(date,name)=>{setCalendarDate(date);const {data,error}=await supabase.rpc("create_my_school",{school_name:name});if(!error)setSchoolId(data);reload();}} />}
          {page === "records" && isTeacher && <Records profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "student_rewards" && isTeacher && <StudentRewardManagement profile={profile} refresh={refresh} onNavigate={setPage} />}
          {page === "leaderboard" && <TeacherSchoolLeaderboard profile={profile} refresh={refresh} onNavigate={setPage} />}
          {page === "student_web" && isTeacher && <StudentWebManagement profile={profile} onNavigate={setPage} />}
          {page === "classroom" && isTeacher && <TeacherClassroom profile={profile} />}
          {page === "cleaning" && isTeacher && <Cleaning profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "evaluation" && <StudentEvaluation profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          </>}
        </div>
        <footer>IC3 GS6 Computer Lab <span>•</span> Dữ liệu được lưu trên Supabase</footer>
      </main>
      <HelpAssistant key={profile.id} profile={profile} page={page}
        scheduleTeacher={{id:profile.id,name:profile.full_name}}
        onSaved={reload} onNavigate={id=>{setPage(id);setMobileNav(false);}} />
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="center-screen">
      <div className="setup-card">
        <div className="brand-mark large">IC3</div>
        <h1>Chưa kết nối cơ sở dữ liệu</h1><div role="alert" className="notice-box">{configurationError}</div>
        <p>Hãy tạo dự án Supabase, chạy tệp <b>supabase/schema.sql</b>, sau đó điền URL và anon key vào biến môi trường Vercel.</p>
        <ol>
          <li>Mở <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a> và tạo project.</li>
          <li>Vào SQL Editor, chạy schema.sql.</li>
          <li>Vào Project Settings → API, sao chép Project URL và anon key.</li>
          <li>Thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong Vercel.</li>
        </ol>
        <div className="notice-box">Không đưa service_role key vào mã nguồn frontend.</div>
      </div>
    </div>
  );
}

function AuthScreen({ mode, setMode, ping }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy,setGoogleBusy]=useState(false);
  const [emailLimited, setEmailLimited] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!cooldownUntil || cooldownUntil <= Date.now()) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - clock) / 1000));
  const handleEmailError = (error) => {
    if (isEmailSendLimit(error)) setEmailLimited(true);
    if (error?.status === 429 || isEmailSendLimit(error)) {
      setCooldownUntil(Date.now() + 60000);
      setClock(Date.now());
    }
    setMessage(authMessage(error));
  };

  async function submit(e) {
    e.preventDefault();
    if ((mode === "register"||mode==="forgot") && cooldownSeconds > 0) return;
    setBusy(true); setMessage("");
    setEmailLimited(false);
    try {
      if (mode === "forgot") {
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{
          redirectTo:emailCallbackUrl()+'?recovery=1'
        });
        if(error)throw error;
        setMessage("Nếu email đã đăng ký trong IC3 GS6, hệ thống sẽ gửi liên kết đặt lại mật khẩu. Kiểm tra Hộp thư đến, Quảng cáo và Thư rác.");
        setCooldownUntil(Date.now()+60000);
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({email:email.trim(),password, options:{emailRedirectTo:emailCallbackUrl(), data:{full_name:name.trim()}}});
        if(error) throw error;
        setMessage(data.session ? "Đã đăng ký. Chờ Admin cấp quyền giáo viên." : "Đã gửi yêu cầu. Kiểm tra email xác nhận (kể cả thư rác), sau đó đăng nhập. Nếu email đã có tài khoản, hãy dùng mật khẩu hiện tại.");
      }
    } catch(e) {handleEmailError(e);} finally {setBusy(false);}
  }
  async function googleSignIn(){
    if(busy||googleBusy)return;
    setGoogleBusy(true);setMessage("");
    try{
      await startGoogleAuth(supabase.auth,emailCallbackUrl());
      // The browser redirects to Google; app roles are read from profiles on return.
    }catch(e){
      setMessage(googleOAuthError(e));
      setGoogleBusy(false);
    }
  }
  async function resend() {
    if(!email.trim()) {setMessage("Nhập email trước khi gửi lại."); return;}
    if(cooldownSeconds > 0) return;
    setBusy(true);
    try {const {error}=await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:emailCallbackUrl()}}); if(error) throw error; setMessage("Đã gửi yêu cầu gửi lại email xác nhận.");}
    catch(e){handleEmailError(e);} finally{setBusy(false);}
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><div className="brand-mark large">IC3</div><span>COMPUTER LAB MANAGEMENT</span></div>
        <h1>{mode==="forgot"?"Quên mật khẩu":mode === "login" ? "Đăng nhập hệ thống" : "Đăng ký tài khoản giáo viên"}</h1>
        <p className="muted">Quản lý lớp học, học sinh và phòng máy IC3 GS6</p>
        <div role="status" aria-live="polite">{message && <p className="notice-box">{message}</p>}</div>
        {emailLimited && mode === "register" && <div className="auth-limit-help">
          <b>Vì sao không đăng ký được?</b>
          <p>Supabase giới hạn số email xác nhận cho cả dự án. Đây không phải lỗi họ tên hay mật khẩu. Bấm lại liên tục sẽ không tăng hạn mức.</p>
          <p>Admin cần bật dịch vụ gửi email riêng (Custom SMTP). Sau khi cấu hình xong, hãy đăng ký lại bằng email này.</p>
          <a href="https://supabase.com/dashboard/project/hzxfgwnwmpdqxkvnqyim/auth/smtp" target="_blank" rel="noreferrer">Admin: Mở cài đặt SMTP của Supabase</a>
        </div>}
        <form onSubmit={submit} className="form-stack">
          {mode === "register" && <>
            <label>Họ và tên<input required value={name} onBlur={()=>setName(properName(name))} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" /></label>
            <p className="muted">Sau khi được duyệt, bạn có thể tự thêm nhiều trường và lịch dạy.</p>
          </>}
          <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></label>
          {mode!=="forgot"&&<label>Mật khẩu<input type="password" required minLength="6" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" /></label>}
          <button className="btn primary full" disabled={busy || ((mode === "register"||mode==="forgot") && cooldownSeconds > 0)}>{busy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : cooldownSeconds > 0 ? `Tạm dừng gửi (${cooldownSeconds}s)` : mode==="forgot"?"Gửi liên kết đặt lại mật khẩu":"Gửi đăng ký giáo viên"}</button>
        </form>
        {mode!=="forgot"&&<>
          <div className="auth-oauth-divider" role="separator"><span>hoặc</span></div>
          <button type="button" className="auth-google-btn" onClick={googleSignIn}
            disabled={busy||googleBusy} aria-label="Tiếp tục đăng nhập bằng Google">
            <span className="google-g-mark" aria-hidden="true">G</span>
            {googleBusy?"Đang chuyển đến Google…":"Tiếp tục với Google"}
          </button>
          <p className="auth-google-note">Tài khoản mới chờ Admin duyệt. Giáo viên đã có tài khoản nên dùng cùng email Google hoặc liên kết trong mục Cá nhân để giữ quyền và dữ liệu.</p>
        </>}
        <div className="auth-switch">
          {mode==="forgot"?"Đã nhớ mật khẩu?":mode === "login" ? "Chưa có tài khoản giáo viên?" : "Đã có tài khoản?"}
          {" "}<button type="button" onClick={() => {setMessage("");setMode(mode==="login"?"register":"login");}}>{mode === "login" ? "Đăng ký" : "Đăng nhập"}</button>
        </div>
        {mode==="login"&&<button className="btn outline full" type="button" onClick={()=>{setMode("forgot");setMessage("");}}>Quên mật khẩu?</button>}
        {mode!=="forgot"&&<button className="btn outline full" type="button" disabled={busy || cooldownSeconds > 0} onClick={resend}>{cooldownSeconds > 0 ? `Không gửi lại email trong ${cooldownSeconds}s` : "Gửi lại email xác nhận"}</button>}
        {mode==="forgot"&&<p className="muted">Chức năng áp dụng cho cả Admin và giáo viên. Email xác thực có thể nằm trong tab Quảng cáo hoặc Thư rác tùy nhà cung cấp.</p>}
        <div className="auth-foot">Tài khoản giáo viên mới cần quản trị viên cấp quyền trước khi sử dụng.</div>
      </div>
    </div>
  );
}

function PublicStudentRegister({ ping }) {
  const initialCode=new URLSearchParams(window.location.search).get("code")?.trim()||"";
  const lockedCode=Boolean(initialCode);
  const [code,setCode]=useState(initialCode.toUpperCase());
  const [name,setName]=useState("");
  const [gender,setGender]=useState("");
  const [computer,setComputer]=useState("");
  const [note,setNote]=useState("");
  const [done,setDone]=useState(false);
  const [doneMessage,setDoneMessage]=useState("");
  const [doneStatus,setDoneStatus]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [friendFormKey,setFriendFormKey]=useState(0);
  useEffect(()=>{
    if(!initialCode)return;
    let live=true;
    supabase.rpc('ic3_resolve_class_code',{p_code:initialCode}).then(({data,error})=>{
      if(live&&!error&&data)setCode(data);
    });
    return()=>{live=false;};
  },[initialCode]);
  async function submit(e){
    e.preventDefault();
    if(!validFullName(name)){
      setNotice("Vui lòng nhập họ và tên thật có dấu, từ hai từ trở lên, không dùng biệt danh hoặc số.");
      return;
    }
    const normalizedPC=normalizeComputerCode(computer);
    if(normalizedPC===null){
      setNotice("Số máy chưa đúng. Nhập 21, pc 21, PC021 đều được hiểu là PC21.");
      return;
    }
    setBusy(true);setNotice("");
    try{
      const {data,error}=await supabase.rpc('ic3_submit_registration',{
        p_code:code.trim().toUpperCase(),
        p_full_name:properName(name),p_gender:gender,
        p_computer:normalizedPC||null,p_note:note.trim().slice(0,500)
      });
      if(error)throw error;
      if(data?.code)setCode(data.code);
      if(data?.status==='approved'||data?.status==='pending'){
        setDoneMessage(data.message||"Đã gửi đăng ký.");
        setDoneStatus(data.status);
        setDone(true);
      }else{
        setNotice(data?.message||"Thông tin chưa được chấp nhận. Hãy kiểm tra lại.");
      }
    }catch(error){setNotice("Không gửi được đăng ký: "+(error.message||"Lỗi không xác định"));}
    finally{setBusy(false);}
  }
  function addFriend(){
    const next=nextFriendRegistration({code});
    setCode(next.code);setName(next.name);setGender(next.gender);
    setComputer(next.computer);setNote(next.note);
    setFriendFormKey(n=>n+1);
    setNotice("");setDone(false);setDoneMessage("");setDoneStatus("");
  }
  return <div className="auth-wrap student-register-wrap">
    <div className="auth-card student-register-card">
      <div className="auth-logo"><div className="brand-mark large">IC3</div><span>STUDENT REGISTRATION</span></div>
      {done ? <>
        <h1>{doneStatus==='approved'?"Đăng ký thành công!":"Đã gửi đăng ký!"}</h1>
        <p className="muted" role="status">{doneMessage}</p>
        <div className="registration-success-actions">
          <a className="btn outline full" href={'/student?code='+encodeURIComponent(code)}>Về trang chủ lớp của mình</a>
          <button type="button" className="btn primary full" onClick={addFriend}>Thêm bạn tiếp theo</button>
        </div>
        <small className="muted">Thêm bạn sẽ giữ mã lớp, nhưng làm mới tên, giới tính, ghi chú và <b>số máy mong muốn</b>. Bạn có thể chọn máy khác cho từng bạn.</small>
      </> : <>
        <h1>Đăng ký học sinh IC3 GS6</h1>
        <p className="muted">Nhập <strong>họ và tên thật có dấu</strong>, không dùng biệt danh hoặc tên đùa.</p>
        {notice&&<div className="notice-box registration-warning" role="alert">{notice}</div>}
        <form key={friendFormKey} className="form-stack" onSubmit={submit}>
          <label>Mã lớp đăng ký
            <input required value={code} readOnly={lockedCode}
              aria-readonly={lockedCode}
              onChange={e=>!lockedCode&&setCode(e.target.value.toUpperCase())}
              placeholder="Ví dụ: IC3-DUYTAN-6.1" />
          </label>
          {lockedCode&&<small className="muted">Mã lớp được lấy từ trang lớp và đã khóa để tránh đăng ký nhầm.</small>}
          <label>Họ và tên <span className="required-note">(Nhập tên thật có dấu)</span>
            <input required value={name} maxLength={90} autoComplete="name"
              onChange={e=>setName(e.target.value)} placeholder="Ví dụ: Nguyễn Văn An"/>
          </label>
          <label>Giới tính
            <select required value={gender} onChange={e=>setGender(e.target.value)}>
              <option value="">Chọn giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </label>
          <label>Số máy mong muốn (có thể đổi cho từng bạn)
            <div className="registration-pc-edit">
              <input key={'pc-'+friendFormKey} value={computer} inputMode="text" maxLength={10} autoComplete="off"
                aria-label="Số máy mong muốn cho học sinh đang đăng ký"
                onChange={e=>setComputer(e.target.value)}
                onBlur={()=>{const v=normalizeComputerCode(computer);if(v!==null)setComputer(v);}}
                placeholder="Ví dụ: PC12"/>
              {computer&&<button type="button" className="mini-btn" onClick={()=>setComputer("")}
                aria-label="Xóa số máy để chọn số khác">Đổi máy</button>}
            </div>
          </label>
          <small className="muted">Các cách nhập như 21, pc 21 hoặc PC021 đều nhận là PC21. Có thể bỏ trống nếu chưa chọn máy.</small>
          <label>Ghi chú (không bắt buộc)
            <textarea value={note} maxLength={500} onChange={e=>setNote(e.target.value)}/>
          </label>
          <button className="btn primary full" disabled={busy||!gender||!code.trim()}>
            {busy?"Đang gửi…":"Gửi đăng ký"}
          </button>
        </form>
      </>}
    </div>
  </div>;
}

function useRows(table, profile, refresh, extra = {}) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      setBusy(true);
      let data=[],error=null;
      const paged=["student_records","ic3_star_wallets","students","ic3_student_violation_totals"].includes(table);
      for(let offset=0;live;offset+=500){
        let q = supabase.from(table).select("*");
        if (profile?.school_id && table !== "student_registrations") q = q.eq("school_id", profile.school_id);
        Object.entries(extra).forEach(([k, v]) => {
          if (v !== undefined && v !== null) q = q.eq(k, v);
        });
        const batch=await (paged?q.order(["ic3_star_wallets","ic3_student_violation_totals"].includes(table)?"student_id":"id",{ascending:true}).range(offset,offset+499):q.limit(500));
        if(batch.error){error=batch.error;break;}
        data.push(...batch.data);
        if(!paged||batch.data.length<500)break;
      }
      if (live) {
        if(!error)setRows(data);
        setError(error?.message || "");
        setBusy(false);
      }
    })();
    return () => { live = false; };
  }, [table, profile?.school_id, refresh, JSON.stringify(extra)]);

  return { rows, busy, error, setRows };
}

function Metric({ label, value, sub, Icon, tone = "teal" }) {
  return (
    <div className="metric">
      <div className={`metric-icon ${tone}`}><Icon size={20} /></div>
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        <div className="metric-sub">{sub}</div>
      </div>
    </div>
  );
}

function Dashboard({ profile, refresh, setPage }) {
  const students = useRows("students", profile, refresh);
  const pcs = useRows("computers", profile, refresh);
  const sessions = useRows("class_sessions", profile, refresh);
  const pending = students.rows.filter(x => x.status === "pending").length;
  const active = pcs.rows.filter(x => x.status === "occupied").length;

  return <>
    <div className="welcome">
      <div>
        <div className="eyebrow light">XIN CHÀO, {profile.full_name?.toUpperCase() || "BẠN"}</div>
        <h2>Không gian quản lý phòng máy</h2>
        <p>Theo dõi hoạt động học tập và vận hành phòng máy trên cùng một hệ thống.</p>
      </div>
      <img className="welcome-illustration" src="/computer-lab-hero.svg" alt="Minh họa phòng máy tin học hiện đại"/>
    </div>
    <div className="metrics-grid">
      <Metric label="Tổng học sinh" value={students.rows.length} sub={`${pending} hồ sơ chờ duyệt`} Icon={Users} />
      <Metric label="Máy tính" value={pcs.rows.length} sub={`${active} máy đang sử dụng`} Icon={Monitor} tone="blue" />
      <Metric label="Buổi học" value={sessions.rows.length} sub="Lịch đã ghi nhận" Icon={CalendarDays} tone="purple" />
      <Metric label="Hồ sơ chờ duyệt" value={pending} sub="Cần giáo viên xử lý" Icon={Clock3} tone="orange" />
    </div>
    <div className="two-col">
      <div className="panel">
        <div className="panel-head"><div><h3>Việc cần xử lý</h3><p>Những đầu việc quan trọng trong hệ thống</p></div><ShieldCheck /></div>
        <div className="task-row" onClick={() => setPage("students")}>
          <span className="task-icon orange"><UserPlus /></span>
          <div><b>Duyệt học sinh đăng ký</b><small>{pending} hồ sơ đang chờ xác nhận</small></div>
          <span className="task-count">{pending}</span>
        </div>
        <div className="task-row" onClick={() => setPage("computers")}>
          <span className="task-icon blue"><Monitor /></span>
          <div><b>Kiểm tra sơ đồ phòng máy</b><small>Rà soát tình trạng máy và phân công chỗ ngồi</small></div>
        </div>
        <div className="task-row" onClick={() => setPage("attendance")}>
          <span className="task-icon purple"><CalendarDays /></span>
          <div><b>Cập nhật lịch học và chấm công</b><small>Ghi nhận thời gian dạy, học theo từng buổi</small></div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><div><h3>Bắt đầu nhanh</h3><p>Các thao tác thường dùng</p></div><Sparkles /></div>
        <div className="quick-grid">
          <button className="quick-item" onClick={() => setPage("students")}><UserPlus size={19} /><b>Thêm học sinh</b><small>Tạo hồ sơ mới</small></button>
          <button className="quick-item" onClick={() => setPage("computers")}><Monitor size={19} /><b>Quản lý máy</b><small>Thêm PC và phân chỗ</small></button>
          <button className="quick-item" onClick={() => setPage("records")}><Award size={19} /><b>Ghi nhận điểm</b><small>Thưởng hoặc vi phạm</small></button>
          <button className="quick-item" onClick={() => setPage("reports")}><FileText size={19} /><b>Báo cáo</b><small>In PDF hoặc xuất Excel</small></button>
        </div>
      </div>
    </div>
  </>;
}

function SectionHead({ title, desc, action }) {
  return <div className="section-head"><div><h2>{title}</h2><p>{desc}</p></div>{action}</div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X /></button></div>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty"><Users size={28} /><p>{text}</p></div>;
}

function exportRows(rows, name) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Du lieu");
  XLSX.writeFile(wb, name + ".xlsx");
}

function Students({ profile, refresh, reload, ping, navigate }) {
  const { rows, busy } = useRows("students", profile, refresh);
  const registrations = useRows("student_registrations", profile, refresh);
  const schoolClasses = useRows("classes", profile, refresh);
  const [webAccounts,setWebAccounts]=useState([]);
  useEffect(()=>{
    let active=true;
    if(!profile?.school_id)return;
    supabase.rpc("qlpm_teacher_student_web_accounts",{p_school_id:profile.school_id})
      .then(({data,error})=>{if(active)setWebAccounts(!error&&Array.isArray(data)?data:[]);})
      .catch(()=>{if(active)setWebAccounts([]);});
    return()=>{active=false;};
  },[profile?.school_id,refresh]);
  const webForStudent=id=>webAccounts.find(a=>a.student_id===id);
  const webForRegistration=id=>webAccounts.find(a=>a.registration_id===id);
  const [approvalBusy,setApprovalBusy]=useState(null);
  const [pendingClassFilter,setPendingClassFilter]=useState("");
  const [reviewBusy,setReviewBusy]=useState(null);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [approvedClassFilter,setApprovedClassFilter]=useState("");
  const [nameEditing,setNameEditing]=useState(null);
  const [nameBusy,setNameBusy]=useState(false);
  const [pinEditing,setPinEditing]=useState(null);
  const [pinBusy,setPinBusy]=useState(false);
  const [form, setForm] = useState({
    full_name: "", class_name: "", school_name: profile.school_name || "",
    student_code: "", phone: "", date_of_birth:"", status: "active"
  });

  const approvedClasses=[...new Set(rows.filter(s=>s.status==="active").map(s=>s.class_name).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'vi',{numeric:true}));
  const filtered = rows.filter(s=>
    s.status!=="inactive" &&
    (!approvedClassFilter||s.class_name===approvedClassFilter) &&
    `${s.full_name} ${s.class_name} ${s.student_code||""}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a,b)=>compareStudentName(a,b)||
    String(a.class_name||"").localeCompare(String(b.class_name||""),'vi',{numeric:true}));
  const ownedClasses=schoolClasses.rows.filter(c=>c.created_by===profile.id&&!c.archived_at)
    .sort((a,b)=>a.class_name.localeCompare(b.class_name,'vi',{numeric:true}));
  const waitingAll=pendingRegistrationsForClass(registrations.rows,ownedClasses);
  const waiting=pendingRegistrationsForClass(registrations.rows,ownedClasses,pendingClassFilter)
    .sort((a,b)=>compareStudentName(a,b));
  const suspectStudents=rows.filter(s=>s.status==="active" && s.name_review_status && s.name_review_status!=="allow" &&
    (profile.role==="admin" || ownedClasses.some(c=>c.id===s.class_id)));

  const reviewKey='qlpm.review.pairs.'+profile.id+'.'+profile.school_id;
  const [reviewRevision,setReviewRevision]=useState(0);
  const reviewedPairs=useMemo(()=>{
    try{return new Set(JSON.parse(localStorage.getItem(reviewKey)||'[]'));}catch{return new Set();}
  },[reviewKey,reviewRevision]);
  const possiblePairs=namePairs(rows.filter(s=>s.status==='active'&&(profile.role==='admin'||
    ownedClasses.some(c=>s.class_id?c.id===s.class_id:c.class_name===s.class_name)))).filter(p=>!reviewedPairs.has(p.id));
  async function removeReviewed(student,other){
    if(reviewBusy)return;
    const label=s=>s.full_name+' · '+(s.student_code||s.id);
    if(!window.confirm('Lớp '+student.class_name+'\nXóa khỏi danh sách: '+label(student)+'\nGiữ lại: '+label(other)+'\nĐiểm và lịch sử của hồ sơ được xóa vẫn được lưu.'))return;
    setReviewBusy(student.id);
    try{
      const {error}=await supabase.from('students').update({status:'inactive'})
        .eq('school_id',profile.school_id).eq('id',student.id).eq('status','active').select('id').single();
      if(error)throw error;
      ping('Đã xóa '+student.full_name+' khỏi danh sách lớp');reload();
    }catch(e){ping('Chưa xóa được hồ sơ: '+e.message);}
    finally{setReviewBusy(null);}
  }
  function confirmSeparate(id){
    localStorage.setItem(reviewKey,JSON.stringify([...reviewedPairs,id]));
    setReviewRevision(v=>v+1);
  }
  async function save(e) {
    e.preventDefault();
    const {data:review,error:reviewError}=await supabase.rpc('ic3_name_review',{p_name:form.full_name});
    if(reviewError){ping('Không kiểm tra được tên học sinh: '+reviewError.message);return;}
    if(review?.decision==='reject'){ping(review.reason||'Tên học sinh không phù hợp.');return;}
    if(review?.decision==='review'&&!window.confirm('Tên này cần xác minh: '+review.reason+'\nBạn đã kiểm tra giấy tờ/danh sách lớp và muốn thêm thủ công?'))return;
    const { error } = await supabase.from("students").insert({
      ...form, full_name:properName(form.full_name),date_of_birth:form.date_of_birth||null, school_id: profile.school_id, created_by: profile.id
    });
    if (error) ping(error.message);
    else {
      ping("Đã thêm học sinh");
      setShow(false);
      setForm({ ...form, full_name: "", student_code: "" });
      reload();
    }
  }

  async function approve(s) {
    if(s.name_review_status==='reject'){ping('Tên chưa nghiêm túc. Cần sửa đúng họ tên trước khi duyệt.');return;}
    if(s.name_review_status==='review'&&!window.confirm('Tên cần xác minh: '+s.full_name+'\nBạn đã kiểm tra họ tên thật?'))return;
    const { error } = await supabase.from("students")
      .update({ status: "active" }).eq("id", s.id);
    if (error) ping(error.message);
    else { ping("Đã duyệt học sinh"); reload(); }
  }

  async function remove(s) {
    if (!confirm("Xóa "+s.full_name+" khỏi danh sách lớp "+s.class_name+"? Điểm và lịch sử được giữ lại.")) return;
    const { error } = await supabase.from("students").update({status:"inactive"}).eq("id", s.id).eq("school_id",profile.school_id).select("id").single();
    if (error) ping(error.message);
    else { ping("Đã xóa hồ sơ"); reload(); }
  }

  async function resetStudentPin(e) {
    e.preventDefault();
    if (!pinEditing || pinBusy) return;
    if (!/^\d{6}$/.test(pinEditing.pin) || /^(.)\1{5}$/.test(pinEditing.pin)) {
      ping("PIN mới phải có 6 chữ số và không được lặp lại một số duy nhất."); return;
    }
    if (pinEditing.pin!==pinEditing.confirm) {
      ping("Hai lần nhập PIN mới chưa trùng nhau."); return;
    }
    if (!window.confirm("Đặt lại PIN cho "+pinEditing.name+"? PIN cũ và toàn bộ phiên đăng nhập trước đó sẽ hết hiệu lực.")) return;
    setPinBusy(true);
    try {
      const {data,error}=await supabase.rpc("qlpm_teacher_student_web_reset_pin",{
        p_student_id:pinEditing.id,p_new_pin:pinEditing.pin
      });
      if(error) throw error;
      if(data!==true)throw Error("Máy chủ chưa xác nhận thay đổi PIN.");
      setPinEditing(null);
      ping("Đã đặt lại PIN. Hãy giao PIN mới trực tiếp cho học sinh.");
      reload();
    } catch(err) {
      ping("Không đổi được PIN: "+(err?.message||String(err)));
    } finally {
      setPinBusy(false);
    }
  }

  async function approveRegistration(r) {
    const {error}=await supabase.rpc("qlpm_teacher_student_web_approve",{p_registration_id:r.id});
    if(error) ping(error.message); else {ping("Đã duyệt học sinh và gán máy đăng ký");reload();}
  }

  async function changeClassApproval(c,next){
    setApprovalBusy(c.id);
    const {error}=await supabase.rpc('ic3_set_auto_approve',{p_class_id:c.id,p_value:next});
    setApprovalBusy(null);
    if(error)ping(error.message);
    else{
      ping(next?'Đã bật tự duyệt lớp '+c.class_name:'Đã tắt tự duyệt lớp '+c.class_name);
      reload();
    }
  }

  async function archiveDuplicates(){
    if(!window.confirm("Ẩn hồ sơ học sinh bị trùng tên trong cùng lớp do bạn tạo? Dữ liệu điểm, điểm danh và lịch sử cũ vẫn được giữ. Hãy kiểm tra trước nếu lớp có hai học sinh trùng họ tên thật."))return;
    const {data,error}=await supabase.rpc('ic3_archive_duplicate_students',{
      p_school_id:profile.school_id,p_owner:profile.id
    });
    if(error)ping(error.message);
    else{ping('Đã ẩn '+data.archived+' hồ sơ trùng trong '+data.groups+' nhóm, giữ nguyên lịch sử.');reload();}
  }

  async function confirmSuspect(s){
    if(reviewBusy||!canConfirmFlaggedName(s))return;
    if(!window.confirm('Bạn đã kiểm tra danh sách lớp/giấy tờ và xác nhận đây là họ tên thật của '+s.full_name+'?\nChỉ bỏ cảnh báo tên, không tạo hồ sơ mới hoặc thay đổi điểm.'))return;
    setReviewBusy(s.id);
    try{
      const {error}=await supabase.rpc('ic3_confirm_student_name_review',{p_student_id:s.id});
      if(error)throw error;
      ping('Đã xác minh tên học sinh '+s.full_name+'. Dữ liệu lớp, điểm và máy được giữ nguyên.');
      reload();
    }catch(err){ping('Không thể xác minh tên: '+err.message);}
    finally{setReviewBusy(null);}
  }
  async function rejectSuspect(s){
    if(!window.confirm('Xóa VĨNH VIỄN toàn bộ hồ sơ '+s.full_name+'?\nĐiểm, điểm danh, biên bản và xếp máy liên quan đều bị xóa. Không có cách khôi phục.'))return;
    if(window.prompt('Nhập XÓA để xóa vĩnh viễn hồ sơ học sinh:')!=='XÓA')return;
    const {error}=await supabase.rpc('ic3_permanent_delete_flagged_student',{p_student_id:s.id});
    if(error)ping(error.message);else{ping('Đã xóa vĩnh viễn hồ sơ và dữ liệu học sinh liên quan.');reload();}
  }

  async function rejectRegistration(r) {
    if(!window.confirm('Từ chối và xóa vĩnh viễn yêu cầu đăng ký của '+r.full_name+'? Không thể khôi phục.'))return;
    const {error}=await supabase.rpc('ic3_delete_rejected_registration',{p_registration_id:r.id});
    if(error)ping(error.message);
    else{ping('Đã xóa yêu cầu đăng ký.');reload();}
  }

  async function saveName(e){
    e.preventDefault();if(!nameEditing||nameBusy)return;
    setNameBusy(true);
    const {error}=await supabase.rpc('ic3_update_student_name',{
      p_student_id:nameEditing.id,p_new_name:properName(nameEditing.full_name)
    });
    setNameBusy(false);
    if(error)ping(error.message);
    else{setNameEditing(null);ping('Đã sửa tên học sinh.');reload();}
  }

  return <>
    <SectionHead
      title="Quản lý học sinh"
      desc="Hồ sơ học sinh theo trường, lớp và trạng thái duyệt"
      action={<>
        <a className="btn outline" href="/student-web" target="_blank" rel="noopener noreferrer">Mở Student Web</a>
        <button className="btn outline" onClick={()=>navigate("settings")}>Mở trang đăng ký</button>
        <button className="btn primary" onClick={() => setShow(true)}><Plus size={17} />Thêm học sinh</button>
      </>}
    />

    <section className="panel" style={{marginBottom:16}}>
      <div className="panel-head"><div>
        <h3>Thiết lập duyệt tự động theo lớp</h3>
        <p>Tự duyệt hồ sơ hợp lệ. Tên trùng hoặc biệt danh không được tự thêm; mỗi giáo viên chỉ chỉnh được lớp của mình.</p>
      </div></div>
      <div className="registration-approval-list">
        {ownedClasses.map(c=><label key={c.id} className="registration-approval-option">
          <span><strong>Lớp {c.class_name}</strong><small>{c.registration_code}</small></span>
          <span className="auto-approve-toggle">
            <input type="checkbox" checked={!!c.auto_approve} disabled={approvalBusy!==null}
              onChange={e=>changeClassApproval(c,e.target.checked)}/>
            {c.auto_approve?'Tự duyệt: Bật':'Tự duyệt: Tắt'}
          </span>
        </label>)}
        {!ownedClasses.length&&<p className="muted">Bạn chưa tạo lớp ở trường này. Vào Lớp & mã đăng ký để tạo lớp riêng.</p>}
      </div>
    </section>
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head">
        <div><h3>Đăng ký trực tuyến chờ duyệt</h3><p>Học sinh điền form công khai tại đường dẫn /register</p></div>
        <span className="status pending">{waitingAll.length} chờ duyệt</span>
      </div>
      <div className="pending-class-filter">
        <label>Lọc danh sách đăng ký theo lớp
          <select aria-label="Lọc hồ sơ chờ duyệt theo lớp" value={pendingClassFilter}
            onChange={e=>setPendingClassFilter(e.target.value)}>
            <option value="">Tất cả lớp ({waitingAll.length})</option>
            {ownedClasses.map(c=><option key={c.id} value={c.id}>
              Lớp {c.class_name} ({waitingAll.filter(r=>r.registration_code===c.registration_code).length})
            </option>)}
          </select>
        </label>
        <span className="muted">Đang xem {waiting.length}/{waitingAll.length} hồ sơ chờ duyệt</span>
      </div>
      {waiting.map(r => (
        <div className="task-row" key={r.id}>
          <span className="task-icon blue"><UserPlus /></span>
          <div>
            <b>{r.full_name}</b>
            <small>Mã lớp: {r.registration_code} · Máy mong muốn: {r.computer_code||"Chưa chọn"}</small>
            <small>Tên đăng nhập: <b>{webForRegistration(r.id)?.username||"—"}</b> · Mã PIN: {webForRegistration(r.id)?"Đã tạo (ẩn)":"—"}</small>
            {r.review_note&&<small className="negative">Cần kiểm tra: {r.review_note}</small>}
          </div>
          <button className="mini-btn success" onClick={() => approveRegistration(r)}>Duyệt</button>
          <button className="mini-btn danger" onClick={() => rejectRegistration(r)}>Từ chối & xóa</button>
        </div>
      ))}
      {!waiting.length && <p className="muted">{waitingAll.length?
        "Không có hồ sơ chờ duyệt trong lớp đã chọn. Hãy đổi bộ lọc để xem lớp khác.":
        "Chưa có hồ sơ đăng ký trực tuyến chờ duyệt."}</p>}
    </div>

    <section className="panel"><h3>Rà soát hồ sơ trùng hoặc gần giống ({possiblePairs.length})</h3>
      {!possiblePairs.length&&<p>Chưa có cặp tên cần đối chiếu.</p>}
      {possiblePairs.map(pair=><div className="task-row" key={pair.id}><b>Lớp {pair.students[0].class_name}</b>
        {pair.students.map((st,i)=><span key={st.id}><button className="mini-btn" onClick={()=>setNameEditing({id:st.id,full_name:st.full_name})}>Sửa tên · {st.full_name}</button> <button className="mini-btn danger" disabled={!!reviewBusy} aria-label={"Xóa "+st.full_name+" khỏi danh sách lớp"} onClick={()=>removeReviewed(st,pair.students[1-i])}>Xóa</button></span>)}
        <button className="mini-btn success" onClick={()=>confirmSeparate(pair.id)}>Xác nhận hai học sinh riêng</button>
      </div>)}
    </section>
    {suspectStudents.length>0&&<section className="panel student-name-review-panel">
      <div className="panel-head"><div>
        <h3>Rà soát tên học sinh đã được duyệt ({suspectStudents.length})</h3>
        <p>Học sinh đăng ký tên không hợp lệ có thể sửa đúng họ tên. Chỉ khi xác nhận từ chối, hệ thống mới xóa vĩnh viễn hồ sơ và dữ liệu liên quan.</p>
      </div></div>
      {suspectStudents.map(st=><div className="task-row" key={st.id}>
        <span className="status pending">{st.name_review_status==="reject"?"Tên không phù hợp":"Cần xác minh"}</span>
        <div className="student-review-details"><b>{st.full_name}</b>
          <small>Lớp {st.class_name} · {st.name_review_reason||"Tên cần kiểm tra"}</small>
        </div>
        <div className="student-review-actions">
          <button type="button" className="mini-btn success" disabled={!!reviewBusy||!canConfirmFlaggedName(st)}
            title={!canConfirmFlaggedName(st)?"Tên chưa hợp lệ, hãy sửa tên trước":"Xác nhận đã kiểm tra tên thật"}
            onClick={()=>confirmSuspect(st)}>{reviewBusy===st.id?"Đang duyệt…":"Duyệt"}</button>
          <button type="button" className="mini-btn" disabled={!!reviewBusy}
            onClick={()=>setNameEditing({id:st.id,full_name:st.full_name})}>Sửa tên</button>
          <button type="button" className="mini-btn danger" disabled={!!reviewBusy}
            onClick={()=>rejectSuspect(st)}>Từ chối & xóa</button>
        </div>
      </div>)}
    </section>}

    <div className="toolbar student-approved-toolbar">
      <div className="searchbox"><Search size={17} /><input placeholder="Tìm tên, lớp, mã học sinh..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <label className="approved-class-filter">Lọc hồ sơ đã duyệt theo lớp
        <select aria-label="Lọc hồ sơ học sinh đã duyệt theo lớp" value={approvedClassFilter}
          onChange={e=>setApprovedClassFilter(e.target.value)}>
          <option value="">Tất cả lớp ({rows.filter(s=>s.status==="active").length} học sinh)</option>
          {approvedClasses.map(c=><option key={c} value={c}>Lớp {c} ({rows.filter(s=>s.status==="active"&&s.class_name===c).length})</option>)}
        </select>
      </label>
      <button className="btn outline" onClick={archiveDuplicates} title="Ẩn các hồ sơ trùng sau khi xác nhận, không xóa điểm hay lịch sử">Dọn hồ sơ trùng</button>
      <button className="btn outline" onClick={() => exportRows(filtered.map((s,i)=>({STT:i+1,...s})), "Danh_sach_hoc_sinh")}><Download size={16} />Xuất Excel</button>
    </div>

    <div className="panel table-panel">
      <div className="table-wrap">
        <table>
          <thead><tr><th>STT</th><th>HỌC SINH (A–Z THEO TÊN)</th><th>GIỚI TÍNH</th><th>LỚP</th><th>TRƯỜNG</th><th>TÊN ĐĂNG NHẬP</th><th>MÃ PIN</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {filtered.map((s,index) => (
              <tr key={s.id}>
                <td>{index+1}</td>
                <td><b>{s.full_name}</b>{s.name_review_status!=="allow"&&s.name_review_status&&
                  <small className="negative">Cần rà soát tên</small>}</td>
                <td>{s.gender||"—"}</td>
                <td>{s.class_name || "—"}</td>
                <td>{s.school_name || "—"}</td>
                <td>{webForStudent(s.id)?.username||"—"}</td>
                <td>
                  {webForStudent(s.id)?<>
                    <small>Đã đặt · Ẩn bảo mật</small>
                    <button type="button" className="mini-btn"
                      onClick={()=>setPinEditing({id:s.id,name:s.full_name,pin:"",confirm:""})}
                      title="Không thể xem PIN cũ, chỉ đặt lại PIN mới">Đặt lại PIN</button>
                  </>:"—"}
                </td>
                <td className="actions">
                  {s.status === "pending" && <button className="mini-btn success" onClick={() => approve(s)}>Duyệt</button>}
                  <button className="mini-btn" onClick={()=>setNameEditing({id:s.id,full_name:s.full_name})}>Sửa tên</button>
                  <button className="mini-btn danger" onClick={() => remove(s)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty text={busy ? "Đang tải..." : "Chưa có học sinh."} />}
      </div>
    </div>

    {pinEditing&&<Modal title={"Đặt lại PIN Student Web · "+pinEditing.name} onClose={()=>!pinBusy&&setPinEditing(null)}>
      <form className="form-stack" onSubmit={resetStudentPin}>
        <p className="muted">Không thể xem lại PIN học sinh đã tự đặt. Giáo viên chủ lớp có thể tạo mã mới và giao riêng cho học sinh.</p>
        <label>PIN mới (6 số)
          <input type="password" inputMode="numeric" autoComplete="new-password" required
            value={pinEditing.pin} maxLength={6} pattern="[0-9]{6}"
            onChange={e=>setPinEditing(v=>({...v,pin:e.target.value.replace(/\D/g,"").slice(0,6)}))}/>
        </label>
        <label>Nhập lại PIN mới
          <input type="password" inputMode="numeric" autoComplete="new-password" required
            value={pinEditing.confirm} maxLength={6} pattern="[0-9]{6}"
            onChange={e=>setPinEditing(v=>({...v,confirm:e.target.value.replace(/\D/g,"").slice(0,6)}))}/>
        </label>
        <p className="muted">Đặt lại sẽ vô hiệu hóa mã PIN cũ và các phiên đăng nhập trước. Chỉ giao mã mới trực tiếp cho học sinh, không đưa lên bảng xếp hạng hoặc file Excel.</p>
        <button type="submit" className="btn primary full" disabled={pinBusy||pinEditing.pin.length!==6||pinEditing.confirm!==pinEditing.pin}>
          {pinBusy?"Đang cập nhật...":"Xác nhận đặt lại PIN"}
        </button>
      </form>
    </Modal>}

    {nameEditing&&<Modal title="Sửa họ và tên học sinh" onClose={()=>setNameEditing(null)}>
       <form className="form-stack" onSubmit={saveName}>
         <label>Họ và tên đầy đủ có dấu
          <input autoFocus required value={nameEditing.full_name} onChange={e=>setNameEditing(v=>({...v,full_name:e.target.value}))}/>
         </label>
         <p className="muted">Chỉ thay đổi tên hiển thị, không xóa điểm, điểm danh hoặc mã học sinh.</p>
         <button className="btn primary" disabled={nameBusy}>{nameBusy?'Đang lưu…':'Lưu tên học sinh'}</button>
       </form>
    </Modal>}
    {show && <Modal title="Thêm học sinh" onClose={() => setShow(false)}>
      <form className="form-stack" onSubmit={save}>
        <label>Họ và tên<input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
        <div className="form-row">
          <label>Mã học sinh<input value={form.student_code} onChange={e => setForm({ ...form, student_code: e.target.value })} /></label>
          <label>Lớp<input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} /></label>
        </div>
        <label>Trường<input value={form.school_name} onChange={e => setForm({ ...form, school_name: e.target.value })} /></label>
        <label>Ngày sinh (nếu có)<input type="date" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></label>
        <label>Số điện thoại liên hệ (không bắt buộc)<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
        <button className="btn primary full">Lưu học sinh</button>
      </form>
    </Modal>}
  </>;
}

function Computers({ profile, refresh, reload, ping }) {
  const { rows, busy } = useRows("computers", profile, refresh);
  const [className,setClassName]=useState("");
  const classes=useRows("classes",profile,refresh);
  const students = useRows("students", profile, refresh);
  const assigned = useRows("computer_assignments", profile, refresh);
  const records = useRows("student_records", profile, refresh);
  const classNames=[...new Set([...classes.rows.map(c=>c.class_name),...students.rows.map(s=>s.class_name)].filter(Boolean))].sort();
  const classStudents=students.rows.filter(s=>s.class_name===className&&s.status==='active');
  const activeClass=classes.rows.find(c=>c.class_name===className&&!c.archived_at&&c.registration_code);
  const wallets=useRows("ic3_star_wallets",profile,refresh);
  const requests=useRows("seat_change_requests",profile,refresh,{status:"pending"});
  async function reviewSeat(id,approve){
    const {error}=await supabase.rpc('review_seat_change',{p_id:id,p_approve:approve});
    ping(error?.message||(approve?'Đã đổi máy':'Đã từ chối yêu cầu'));reload();
  }
  const classAssignments=assigned.rows.filter(a=>classStudents.some(s=>s.id===a.student_id));
  const [assigning,setAssigning]=useState(null),[chosenId,setChosenId]=useState(""),[assignBusy,setAssignBusy]=useState(false);
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(40);
  const [pc, setPc] = useState({
    computer_code: "", location: "Phòng máy 1", status: "available", capacity: 2
  });

  async function addOne(code) {
    const { error } = await supabase.from("computers").upsert({
      school_id: profile.school_id,
      computer_code: code,
      location: pc.location,
      status: "available",
      capacity: Number(pc.capacity)
    }, { onConflict: "school_id,computer_code", ignoreDuplicates: true });
    return error;
  }

  async function create(e) {
    e.preventDefault();
    const code = pc.computer_code.trim().toUpperCase();
    const error = await addOne(code);
    if (error) ping(error.message);
    else { ping("Đã thêm " + code); setShow(false); reload(); }
  }

  async function generate() {
    const total = Math.min(500, Math.max(1, Number(count) || 1));
    for (let i = 1; i <= total; i++) {
      const error = await addOne("PC" + i);
      if (error) { ping(error.message); return; }
    }
    ping(`Đã tạo/cập nhật PC1–PC${total}`);
    reload();
  }

  async function assign(e) {
    e.preventDefault();if(!chosenId||!assigning||assignBusy)return;setAssignBusy(true);
    const {error}=await supabase.from("computer_assignments").insert({school_id:profile.school_id,computer_id:assigning.id,student_id:chosenId,assigned_date:today(),active:true});
    setAssignBusy(false);if(error)ping(error.message);else{setAssigning(null);setChosenId("");ping("Đã lưu chỗ ngồi cho lớp "+className);reload();}
  }

  async function release(a) {
    if (!confirm("Gỡ học sinh khỏi máy này?")) return;
    const { error } = await supabase.from("computer_assignments")
      .update({ active: false, released_at: new Date().toISOString() })
      .eq("id", a.id);
    if (error) ping(error.message);
    else { ping("Đã gỡ phân công"); reload(); }
  }

  async function changeStatus(computer, status) {
    const { error } = await supabase.from("computers")
      .update({ status }).eq("id", computer.id);
    if (error) ping(error.message);
    else { ping("Đã cập nhật trạng thái máy"); reload(); }
  }

  return <>
    <SectionHead
      title="Sơ đồ phòng máy"
      desc="Quản lý máy tính, sức chứa và học sinh ngồi theo từng máy"
      action={<>
        <button className="btn outline" onClick={generate}><RefreshCw size={16} />Tạo PC1–PC{count}</button>
        <button className="btn primary" onClick={() => setShow(true)}><Plus size={17} />Thêm máy</button>
      </>}
    />
    {requests.rows.length>0&&<section className="panel"><h3>Yêu cầu đổi máy</h3>{requests.rows.map(r=><div key={r.id} className="record-row">
      <b>{students.rows.find(s=>s.id===r.student_id)?.full_name} · {classes.rows.find(c=>c.id===r.class_id)?.class_name}</b>
      <span>Muốn chuyển đến {rows.find(pc=>pc.id===r.computer_id)?.computer_code}</span>
      <button className="mini-btn" onClick={()=>reviewSeat(r.id,true)}>Duyệt</button><button className="mini-btn danger" onClick={()=>reviewSeat(r.id,false)}>Từ chối</button>
    </div>)}</section>}
    <div className="toolbar"><label className="field-inline">Lớp đang xem <select aria-label="Lớp phòng máy" value={className} onChange={e=>setClassName(e.target.value)}><option value="">Chọn lớp</option>{classNames.map(c=><option key={c}>{c}</option>)}</select></label>
       <a className="btn outline" href={activeClass?'/student?code='+encodeURIComponent(activeClass.registration_code):undefined}
         target="_blank" rel="noopener noreferrer" aria-disabled={!activeClass}
         onClick={e=>{if(!activeClass){e.preventDefault();ping('Lớp này chưa có mã đăng ký. Tạo mã trong Lớp & mã đăng ký.');}}}>🌐 Mở trang lớp</a>
      <div className="field-inline">Số máy muốn khởi tạo <input type="number" min="1" max="500" value={count} onChange={e => setCount(e.target.value)} /></div>
      <span className="muted">{rows.length} máy đã có trong hệ thống</span>
    </div>
    <p className="notice-box">{className ? `Chỗ ngồi được lưu riêng cho lớp ${className}. Trạng thái hỏng/bảo trì áp dụng cho máy ở mọi lớp.` : "Chọn lớp để xem và sắp xếp chỗ ngồi."}</p>
    <div className="computer-grid">
      {[...rows].sort((a,b)=>comparePC(a.computer_code,b.computer_code)).map(c => {
        const users = classAssignments.filter(a => a.computer_id === c.id && a.active);
        const machineViolationCount=users.reduce((total,a)=>
          total+records.rows.filter(r=>r.student_id===a.student_id&&isFormalViolation(r)).length,0);
        const machineFlame=users.map(a=>flameEffect(wallets.rows.find(w=>w.student_id===a.student_id)))
          .filter(fx=>fx.visible).sort((a,b)=>a.tier-b.tier||(['gray','cooling','active'].indexOf(a.state)-['gray','cooling','active'].indexOf(b.state))).at(-1);
        return (
          <div className={`computer-card ${["maintenance","broken"].includes(c.status) ? "maintenance" : users.length ? "occupied" : ""} ${machineFlame?.className||""}`}
             style={machineFlame?.style} key={c.id}>
            <div className="pc-top">
              <Monitor size={22} />
              <span className={`status ${["maintenance","broken"].includes(c.status) ? "pending" : users.length ? "active" : "free"}`}>
                {c.status === "broken" ? "Hỏng" : c.status === "maintenance" ? "Bảo trì" : users.length ? "Đang dùng" : "Trống"}
              </span>
            </div>
            <h3>{c.computer_code}</h3>
            <p>{c.location || "Chưa phân khu"}</p>
            <small>Sức chứa: {users.length}/{c.capacity || 2} học sinh</small>
            <div className="pc-users">
              {className&&machineViolationCount>0&&<div className="pc-violation-summary">
                <span className="pc-violation-badge">{machineViolationCount} lỗi</span>
                {users.map(a=>{
                  const count=records.rows.filter(r=>r.student_id===a.student_id&&isFormalViolation(r)).length;
                  const full=students.rows.find(st=>st.id===a.student_id)?.full_name||"Học sinh";
                  return count?<small key={a.student_id}>{full.trim().split(/\s+/).slice(-2).join(" ")}: {count} lỗi</small>:null;
                })}
              </div>}
              {users.length ? users.map(a => { const wallet=wallets.rows.find(w=>w.student_id===a.student_id); return (
                <div className="pc-user-row" key={a.id}>
                  <span>• {(students.rows.find(s => s.id === a.student_id)?.full_name || "Học sinh").trim().split(/\s+/).slice(-2).join(" ")}
                   {wallet&&<b> ⭐ {wallet.available} <FlameBadge wallet={wallet} compact/></b>}</span>
                  <button className="mini-btn danger" onClick={() => release(a)}>Gỡ</button>
                  {records.rows.filter(r=>r.student_id===a.student_id && isFormalViolation(r)).slice(-3).map(r=><small className="negative" key={r.id}>{r.title}</small>)}
                </div>
              )}) : <span>Chưa có học sinh</span>}
            </div>
            <button className="mini-btn" disabled={!className || users.length >= Number(c.capacity || 2) || ["maintenance","broken"].includes(c.status)} onClick={() => {setAssigning(c);setChosenId("");}}>+ Gán học sinh</button>
            <select value={c.status || "available"} onChange={e => changeStatus(c, e.target.value)}>
              <option value="available">Sẵn sàng</option>
              <option value="maintenance">Bảo trì</option>
              <option value="broken">Hỏng</option>
            </select>
          </div>
        );
      })}
    </div>
    {!rows.length && !busy && <Empty text="Chưa có máy tính. Dùng nút tạo PC1–PC40 để khởi tạo nhanh." />}
    {assigning && <Modal title={`Gán học sinh lớp ${className} vào ${assigning.computer_code}`} onClose={()=>setAssigning(null)}><form className="form-stack" onSubmit={assign}><label>Học sinh<select required value={chosenId} onChange={e=>setChosenId(e.target.value)}><option value="">Chọn học sinh chưa có máy</option>{classStudents.filter(s=>s.status==='active'&&!assigned.rows.some(a=>a.active&&a.student_id===s.id)).map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label><button className="btn primary" disabled={assignBusy}>Lưu chỗ ngồi</button></form></Modal>}
    {show && <Modal title="Thêm máy tính" onClose={() => setShow(false)}>
      <form className="form-stack" onSubmit={create}>
        <label>Mã máy<input required placeholder="PC41" value={pc.computer_code} onChange={e => setPc({ ...pc, computer_code: e.target.value })} /></label>
        <label>Vị trí<input value={pc.location} onChange={e => setPc({ ...pc, location: e.target.value })} /></label>
        <label>Số học sinh tối đa<select value={pc.capacity} onChange={e => setPc({ ...pc, capacity: e.target.value })}><option value="1">1 học sinh</option><option value="2">2 học sinh</option></select></label>
        <button className="btn primary full">Lưu máy</button>
      </form>
    </Modal>}
  </>;
}

function RollCallView({profile,refresh,reload,ping,focusDate,setFocusDate}){
  const {rows,error}=useRows("class_sessions",profile,refresh);
  const [selectedLessonId,setSelectedLessonId]=useState("");
  const myLessons=useMemo(()=>ownTeachingLessons(rows,profile.id),[rows,profile.id]);
  useEffect(()=>{
    if(selectedLessonId&&!myLessons.some(s=>s.id===selectedLessonId))setSelectedLessonId("");
  },[selectedLessonId,myLessons]);
  async function toggleLessonHoliday(lesson){
    const next=!lesson.is_cancelled;
    const reason=next?window.prompt('Lý do nghỉ tiết/buổi (ví dụ: Nghỉ lễ 20/11):','Nghỉ lễ / không dạy'):'';
    if(next&&reason===null)return;
    if(!window.confirm((next?'Đánh dấu nghỉ':'Khôi phục lịch dạy')+' lớp '+lesson.class_name+' ngày '+lesson.session_date+'? Điểm danh cũ được giữ nguyên.'))return;
    const {error:err}=await supabase.from('class_sessions')
      .update({is_cancelled:next,cancel_reason:next?reason.trim():''})
      .eq('id',lesson.id).eq('school_id',profile.school_id);
    if(err){ping('Không cập nhật được trạng thái nghỉ: '+err.message);return;}
    if(next&&selectedLessonId===lesson.id)setSelectedLessonId('');
    ping(next?'Đã đánh dấu nghỉ, giữ nguyên điểm danh cũ.':'Đã khôi phục buổi học.');
    reload();
  }
  function selectLesson(lesson){
    if(lesson.is_cancelled){ping('Buổi này đã đánh dấu nghỉ, không điểm danh. Hãy khôi phục lịch nếu có dạy.');return;}
    setSelectedLessonId(lesson.id);
    setFocusDate(lesson.session_date);
    window.requestAnimationFrame(()=>{
      document.getElementById('rollcall-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  return <>
    <TeachingCalendar rows={myLessons} focusDate={focusDate} onDateChange={setFocusDate}
      school={profile.school_name} teacher={profile.full_name}
      selectedLessonId={selectedLessonId} onLessonSelect={selectLesson}
      onToggleCancellation={toggleLessonHoliday}/>
    <RollCall profile={profile} sessions={myLessons} selectedSessionId={selectedLessonId}
      refresh={refresh} onSaved={reload} ping={ping}/>
    {error&&<p role="alert" className="notice-box">{error}</p>}
  </>;
}

function Attendance({ profile, refresh, reload, ping, focusDate, setFocusDate, onImported, adminView=false,
  adminSelection=null,onAdminSelection=()=>{} }) {
  const { rows, error: scheduleError } = useRows("class_sessions", profile, refresh);
  const classes = useRows("classes", profile, refresh);
  const [teacherChoices,setTeacherChoices]=useState([{id:profile.id,full_name:profile.full_name||"Giáo viên"}]);
  // Every personal calendar is scoped to its signed-in teacher. Admin can use
  // the separate management view to inspect/edit one teacher at a time.
  const selectedTeacher=adminView?(adminSelection?.id||profile.id):profile.id;
  const targetTeacher=adminView?selectedTeacher:profile.id;
  const [editorMode,setEditorMode]=useState("import");
  const visibleRows=rows.filter(r=>targetTeacher==="unassigned"?
    (!r.teacher_id&&!r.created_by):
    (r.teacher_id===targetTeacher||(!r.teacher_id&&r.created_by===targetTeacher)));
  const viewingName=teacherChoices.find(t=>t.id===targetTeacher)?.full_name||
    (targetTeacher==="unassigned"?"Chưa phân công":profile.full_name||"Giáo viên");
  useEffect(()=>{
    let live=true;
    if(profile.role!=="admin")return ()=>{live=false;};
    supabase.from("profiles").select("id,full_name,role,is_active").eq("is_active",true)
      .in("role",["admin","teacher","staff"]).order("full_name").then(({data,error})=>{
        if(live&&!error&&data?.length){
          setTeacherChoices(data.some(t=>t.id===profile.id)?data:
            [{id:profile.id,full_name:profile.full_name||"Giáo viên"},...data]);
        }
      });
    return ()=>{live=false;};
  },[profile.school_id,profile.id]);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedSessionIds,setSelectedSessionIds]=useState([]);
  const [holidayDay,setHolidayDay]=useState(focusDate||today());
  const [holidayShift,setHolidayShift]=useState('all');
  useEffect(()=>{if(focusDate)setHolidayDay(focusDate);},[focusDate]);
  const [sessionFilterMode,setSessionFilterMode]=useState("all");
  const [sessionFilterDate,setSessionFilterDate]=useState(today());
  const filteredSessionRows=useMemo(
    ()=>filterCreatedSessions(visibleRows,sessionFilterMode,sessionFilterDate),
    [visibleRows,sessionFilterMode,sessionFilterDate]
  );
  const sessionFilterWindow=sessionDateWindow(sessionFilterMode,sessionFilterDate);
  const allowedSessionRows=filteredSessionRows;
  const allSessionsSelected=allowedSessionRows.length>0 && allowedSessionRows.every(r=>selectedSessionIds.includes(r.id));
  useEffect(()=>{setSelectedSessionIds([]);},[profile.school_id,targetTeacher]);
  function changeSessionFilter(mode,anchor){
    if(mode!==undefined)setSessionFilterMode(mode);
    if(anchor!==undefined)setSessionFilterDate(anchor);
    setSelectedSessionIds([]);
  }
  function moveSessionFilter(direction){
    if(sessionFilterMode==="all")return;
    const base=sessionFilterMode==="week"?mondayOfSessionWeek(sessionFilterDate):sessionFilterDate;
    changeSessionFilter(undefined,shiftSessionDay(base,direction*(sessionFilterMode==="week"?7:1)));
  }
  const [form, setForm] = useState({
    class_name: "", session_date: today(), start_time: "17:00",
    end_time: "19:00", teacher_name: profile.full_name || "", teacher_id:profile.id,
    period_count: 1
  });

  async function save(e) {
    e.preventDefault();
    if(saving) return;
    if(!isVietnamTimeRange(form.start_time,form.end_time)){
      ping("Giờ kết thúc phải sau giờ bắt đầu. Chọn giờ Việt Nam dạng 24 giờ (00:00–23:59).");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      school_id: profile.school_id,
      teacher_id: adminView?(targetTeacher==="unassigned"?form.teacher_id:targetTeacher):profile.id,
      teacher_name:teacherChoices.find(t=>t.id===(adminView?(targetTeacher==="unassigned"?form.teacher_id:targetTeacher):profile.id))?.full_name||profile.full_name,
      created_by: profile.id,
      period_count: Number(form.period_count)
    };
    if(adminView&&targetTeacher==="unassigned"&&!editingId){setSaving(false);ping("Chọn giáo viên ở bộ lọc để tạo lịch; ở mục Chưa phân công chỉ dùng Sửa để gán buổi học cũ.");return;}
    const { error } = editingId ? await supabase.from("class_sessions").update(payload)
      .eq("id",editingId).eq("school_id",profile.school_id) :
      await supabase.from("class_sessions").insert(payload);
    setSaving(false);
    if (error) ping(error.message);
    else { ping("Đã lưu buổi học"); setFocusDate(form.session_date);
      if(sessionFilterMode!=="all")setSessionFilterDate(form.session_date);
      setEditingId(null); reload(); }
  }

  async function bulkDeleteSessions(){
    const ids=selectedSessionIds.filter(id=>allowedSessionRows.some(r=>r.id===id));
    if(!ids.length)return;
    if(!window.confirm('Xóa vĩnh viễn '+ids.length+' buổi học đã chọn? Điểm danh gắn với các buổi này sẽ bị xóa theo. Không thể hoàn tác.'))return;
    if(window.prompt('Để xác nhận xóa '+ids.length+' buổi, nhập XÓA:')!=='XÓA')return;
    setSaving(true);
    let query=supabase.from('class_sessions').delete().in('id',ids).eq('school_id',profile.school_id);
    if(!adminView)query=query.or('teacher_id.eq.'+profile.id+',and(teacher_id.is.null,created_by.eq.'+profile.id+')');
    const {data,error}=await query.select('id');
    setSaving(false);
    if(error){ping('Không xóa được lịch: '+error.message);return;}
    const deleted=new Set((data||[]).map(r=>r.id));
    setSelectedSessionIds(current=>current.filter(id=>!deleted.has(id)));
    if(editingId&&deleted.has(editingId))setEditingId(null);
    ping('Đã xóa '+deleted.size+'/'+ids.length+' buổi đã chọn.');
    reload();
  }

  async function markHoliday(rowsToChange,cancel=true){
    const ids=rowsToChange.filter(r=>r.is_cancelled!==cancel).map(r=>r.id);
    if(!ids.length){ping(cancel?'Không có buổi đang dạy nào cần đánh dấu nghỉ.':'Không có buổi nghỉ nào để khôi phục.');return;}
    const reason=cancel?window.prompt('Lý do nghỉ (ghi trên lịch, không xóa điểm danh):','Nghỉ lễ / không dạy'):'';
    if(cancel&&reason===null)return;
    if(!window.confirm((cancel?'Đánh dấu nghỉ ':'Khôi phục ')+ids.length+' buổi? Điểm danh cũ được giữ nguyên.'))return;
    setSaving(true);
    const {data,error}=await supabase.from('class_sessions')
      .update({is_cancelled:cancel,cancel_reason:cancel?reason.trim():''})
      .eq('school_id',profile.school_id).in('id',ids).select('id');
    setSaving(false);
    if(error){ping('Không lưu được ngày nghỉ: '+error.message);return;}
    ping('Đã cập nhật '+(data||[]).length+'/'+ids.length+' buổi. Điểm danh không bị xóa.');
    reload();
  }
  async function removeSession(r) {
    if (!window.confirm(`Xóa buổi học lớp ${r.class_name} ngày ${dateText(r.session_date)}? Điểm danh của buổi này cũng sẽ bị xóa.`)) return;
    const {error}=await supabase.from("class_sessions").delete().eq("id",r.id).eq("school_id",profile.school_id);
    if(error)ping(error.message);else{if(editingId===r.id)setEditingId(null);ping("Đã xóa buổi học");reload();}
  }

  const minutes = Math.max(0,
    Number(form.end_time.slice(0, 2)) * 60 + Number(form.end_time.slice(3, 5)) -
    Number(form.start_time.slice(0, 2)) * 60 - Number(form.start_time.slice(3, 5))
  );

  return <>
    {adminView?<section className="panel teacher-schedule-switcher">
      <h2>Quản lý lịch theo giáo viên</h2>
      <p className="muted">Admin chọn từng giáo viên để xem và sửa lịch riêng, không trộn lịch nhiều người. Lịch cá nhân nằm ở mục Lịch dạy giáo viên.</p>
      <label>Chọn giáo viên
        <select aria-label="Chọn giáo viên để xem lịch" value={selectedTeacher}
          onChange={e=>{
            const id=e.target.value;
            onAdminSelection({id,name:teacherChoices.find(t=>t.id===id)?.full_name||""});
            setEditingId(null);
            const found=teacherChoices.find(t=>t.id===id);
            setForm(old=>({...old,teacher_id:id==="unassigned"?profile.id:id,
              teacher_name:found?.full_name||profile.full_name||""}));
          }}>
          {teacherChoices.map(t=><option key={t.id} value={t.id}>{t.full_name}{t.id===profile.id?" (bạn)":""}</option>)}
          {rows.some(r=>!r.teacher_id&&!r.created_by)&&<option value="unassigned">Buổi học chưa phân công</option>}
        </select>
      </label>
      <p className="muted">{visibleRows.length} buổi học đang hiển thị của {viewingName}.</p>
    </section>:null}
    <TeachingCalendar rows={visibleRows} focusDate={focusDate} onDateChange={setFocusDate} school={profile.school_name} teacher={viewingName}
      onToggleCancellation={lesson=>markHoliday([lesson],!lesson.is_cancelled)} />
    <section className="panel schedule-holiday-panel" aria-label="Đánh dấu ngày nghỉ không xóa điểm danh">
      <h3>🌤️ Nghỉ học / nghỉ dạy (giữ nguyên lịch sử)</h3>
      <p className="muted">Chọn ngày và buổi. Đánh dấu nghỉ chỉ ảnh hưởng buổi đã chọn, không xóa học sinh hay điểm danh cũ; buổi nghỉ không tính vào chấm công.</p>
      <div className="actions">
        <label>Ngày <input aria-label="Ngày nghỉ" type="date" value={holidayDay} onChange={e=>setHolidayDay(e.target.value)} /></label>
        <label>Phạm vi <select aria-label="Phạm vi nghỉ" value={holidayShift} onChange={e=>setHolidayShift(e.target.value)}>
          <option value="all">Cả ngày</option><option value="morning">Buổi sáng</option><option value="afternoon">Buổi chiều</option>
        </select></label>
        <button type="button" className="btn outline" disabled={saving||!lessonsForHoliday(visibleRows,holidayDay,holidayShift).length}
          onClick={()=>markHoliday(lessonsForHoliday(visibleRows,holidayDay,holidayShift))}>
          Đánh dấu nghỉ {holidayShiftLabel(holidayShift)}
        </button>
        <button type="button" className="btn outline" disabled={saving||!visibleRows.some(r=>r.session_date===holidayDay&&r.is_cancelled)}
          onClick={()=>markHoliday(visibleRows.filter(r=>r.session_date===holidayDay&&r.is_cancelled&&
             (holidayShift==='all'||(String(r.start_time).slice(0,5)<'12:00'?'morning':'afternoon')===holidayShift)),false)}>
          Khôi phục lịch đã nghỉ
        </button>
      </div>
    </section>
    {scheduleError && <p role="alert" className="notice-box">Không tải được lịch: {scheduleError}</p>}
    <section className="panel schedule-workspace">
      <div className="schedule-workspace-heading">
        <div><h2>Thêm hoặc điều chỉnh lịch dạy</h2>
          <p>Nhập trực tiếp hoặc tải ảnh, Excel, PDF rồi nhờ AI tạo bản nháp. Chỉ lưu sau khi bạn xác nhận.</p>
          {adminView&&<p><b>Đang thao tác cho:</b> {viewingName}. Lịch sẽ xuất hiện trong tài khoản giáo viên này.</p>}
        </div>
        <div className="schedule-entry-tabs" role="group" aria-label="Chọn cách nhập lịch">
          <button type="button" className={editorMode==="manual"?"active":""} onClick={()=>setEditorMode("manual")}>Nhập thủ công</button>
          <button type="button" className={editorMode==="import"?"active":""} onClick={()=>setEditorMode("import")}>Ảnh, tệp & AI</button>
        </div>
      </div>
      {editorMode==="import"?
        (adminView&&targetTeacher==="unassigned"?
          <p className="notice-box">Hãy chọn một giáo viên cụ thể trước khi nhập lịch.</p>:
          <TimetableImport key={adminView?targetTeacher:'self'} embedded adminView={adminView}
            targetTeacherId={targetTeacher} targetTeacherName={viewingName}
            profile={profile} reload={reload} onImported={onImported}/>):
        <div className="two-col">
      <div className="panel">
        <h3>{editingId ? "Sửa buổi học" : "Tạo buổi học / chấm công"}</h3>
        {adminView&&targetTeacher==="unassigned"&&<p className="muted">Các buổi cũ chưa có giáo viên. Bấm Sửa tại một dòng rồi chọn giáo viên phụ trách để gán lại.</p>}
        <form className="form-stack" onSubmit={save}>
          <label>Lớp
            <input list="class-options" required value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} placeholder="Chọn hoặc nhập tên lớp" />
            <datalist id="class-options">{classes.rows.map(c => <option key={c.id} value={c.class_name} />)}</datalist>
          </label>
          <label>Ngày học<input type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })} /></label>
          <div className="form-row schedule-time-row">
            <label>Giờ bắt đầu (24h)
              <Time24Input label="Giờ bắt đầu" value={form.start_time} disabled={saving}
                onChange={time => setForm(old=>({ ...old, start_time:time }))}/>
            </label>
            <label>Giờ kết thúc (24h)
              <Time24Input label="Giờ kết thúc" value={form.end_time} disabled={saving}
                onChange={time => setForm(old=>({ ...old, end_time:time }))}/>
            </label>
          </div>
          <p className="schedule-time-hint">Giờ Việt Nam (UTC+7) · Hiển thị 24 giờ. Ví dụ: 17:00 – 19:00.</p>
          <label>Giáo viên phụ trách
            {adminView&&targetTeacher==="unassigned"?
              <select value={form.teacher_id} onChange={e=>{
                const t=teacherChoices.find(x=>x.id===e.target.value);
                setForm(v=>({...v,teacher_id:e.target.value,teacher_name:t?.full_name||""}));
              }}>
                {teacherChoices.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>:
              <input readOnly value={adminView?viewingName:profile.full_name||"Giáo viên"} />}
          </label>

          <label>Số tiết<input type="number" min="1" value={form.period_count} onChange={e => setForm({ ...form, period_count: e.target.value })} /></label>
          <button className="btn primary full" disabled={saving}>{saving ? "Đang lưu..." : "Lưu lịch học"}</button>{editingId && <button type="button" className="btn outline" onClick={()=>setEditingId(null)}>Hủy sửa</button>}
        </form>
      </div>
      <div className="panel">
        <h3>Thông tin thời lượng buổi dạy</h3>
        <div className="calc-box">
          <small>Số tiết dự kiến</small><b>{form.period_count} tiết</b>
          <small>Thời gian thực dạy</small><b>{(minutes / 60).toFixed(2)} giờ</b>
        </div>
        <p className="muted">Mức tiền công của từng giáo viên được điều chỉnh riêng tại mục Chấm công & tiền công. Không tính hoặc hiển thị học phí học sinh.</p>
      </div>
    </div>}
    </section>

    <div className="panel table-panel">
      <div className="schedule-table-header">
        <h3>Buổi học đã tạo</h3>
        <div className="actions">
          <span className="muted">Đã chọn {selectedSessionIds.filter(id=>filteredSessionRows.some(r=>r.id===id)).length} buổi</span>
          <button type="button" className="btn outline schedule-delete-selected" onClick={bulkDeleteSessions}
            disabled={saving||!selectedSessionIds.some(id=>filteredSessionRows.some(r=>r.id===id))}>
            <Trash2 size={15}/> Xóa lịch đã chọn
          </button>
        </div>
      </div>
      <div className="created-lessons-filters" role="group" aria-label="Lọc buổi học đã tạo">
        <label className="created-lessons-filter-mode">Xem lịch theo
          <select value={sessionFilterMode} onChange={e=>changeSessionFilter(e.target.value)} aria-label="Chế độ lọc lịch">
            <option value="all">Tất cả buổi học</option>
            <option value="week">Theo tuần</option>
            <option value="day">Theo ngày</option>
          </select>
        </label>
        {sessionFilterMode!=="all"&&<>
          <label className="created-lessons-filter-date">{sessionFilterMode==="week"?"Chọn ngày trong tuần":"Chọn ngày"}
            <input type="date" value={sessionFilterDate} onChange={e=>{if(e.target.value)changeSessionFilter(undefined,e.target.value)}} aria-label="Chọn ngày lọc lịch"/>
          </label>
          <div className="created-lessons-nav">
            <button type="button" className="btn outline" onClick={()=>moveSessionFilter(-1)}
              aria-label={sessionFilterMode==="week"?"Tuần trước":"Ngày trước"}>‹</button>
            <button type="button" className="btn outline" onClick={()=>changeSessionFilter(undefined,today())}>Hôm nay</button>
            <button type="button" className="btn outline" onClick={()=>moveSessionFilter(1)}
              aria-label={sessionFilterMode==="week"?"Tuần sau":"Ngày sau"}>›</button>
          </div>
        </>}
        <div className="created-lessons-filter-count" aria-live="polite">
          <strong>{filteredSessionRows.length}/{visibleRows.length} buổi học</strong>
          <span>{sessionFilterWindow?sessionFilterMode==="week"?
            'Từ '+dateText(sessionFilterWindow.start)+' đến '+dateText(sessionFilterWindow.end):
            'Ngày '+dateText(sessionFilterWindow.start):
            'Toàn bộ lịch của '+viewingName}</span>
        </div>
      </div>
      <div className="table-wrap">
      <table>
        <thead><tr><th><input type="checkbox" title="Chọn tất cả lịch đang hiển thị" aria-label="Chọn tất cả lịch đang hiển thị"
          checked={allSessionsSelected} onChange={e=>setSelectedSessionIds(e.target.checked?filteredSessionRows.map(r=>r.id):[])} /></th><th>NGÀY</th><th>LỚP</th><th>GIÁO VIÊN</th><th>GIỜ</th><th>SỐ TIẾT</th><th></th></tr></thead>
        <tbody>{filteredSessionRows.map(r => (
          <tr key={r.id}><td><input type="checkbox" aria-label={'Chọn buổi '+r.class_name+' ngày '+r.session_date}
            checked={selectedSessionIds.includes(r.id)} onChange={e=>setSelectedSessionIds(old=>e.target.checked?[...new Set([...old,r.id])]:old.filter(id=>id!==r.id))}/></td><td>{dateText(r.session_date)}</td><td>{r.class_name}</td><td>{r.teacher_name}</td><td>{r.start_time} – {r.end_time}</td><td>{r.is_cancelled?<span title={r.cancel_reason||'Nghỉ'}>Nghỉ · {r.period_count} tiết</span>:r.period_count}</td><td>
           <button className="btn outline" onClick={()=>markHoliday([r],!r.is_cancelled)}>{r.is_cancelled?'Khôi phục':'Nghỉ buổi'}</button>
           <button className="btn outline" onClick={()=>{setEditorMode("manual");setEditingId(r.id);setForm({class_name:r.class_name,session_date:r.session_date,start_time:r.start_time.slice(0,5),end_time:r.end_time.slice(0,5),teacher_name:r.teacher_name||"",teacher_id:r.teacher_id||profile.id,period_count:r.period_count});}}>Sửa</button><button className="btn outline" onClick={()=>removeSession(r)}>Xóa</button></td></tr>
        ))}</tbody>
      </table></div>
      {!filteredSessionRows.length && <Empty text={visibleRows.length?
        "Không có buổi học trong khoảng thời gian đã chọn. Đổi ngày/tuần hoặc chọn Tất cả buổi học.":
        "Chưa có lịch dạy ở trường này."} />}
    </div>
  </>;
}

function Records({ profile, refresh, reload, ping }) {
  const students=useRows("students",profile,refresh);
  const records=useRows("student_records",profile,refresh);
  const violationTotals=useRows("ic3_student_violation_totals",profile,refresh);
  const [selectedClass,setSelectedClass]=useState("");
  const [selectedStudent,setSelectedStudent]=useState("");
  const [nameQuery,setNameQuery]=useState("");
  const [editHistory,setEditHistory]=useState(false),[editingRecord,setEditingRecord]=useState(null);
  const [awardStars,setAwardStars]=useState(1);
  const [threshold,setThreshold]=useState(3);
  const [reports,setReports]=useState([]);
  const [reportNote,setReportNote]=useState({});
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({
    student_id:"",record_type:"violation",title:"Nhắc 1",points:0,note:"",record_date:today()
  });
  const classes=[...new Set(students.rows.map(x=>x.class_name).filter(Boolean))].sort();
  const allowedStudents=students.rows.filter(st=>(!selectedClass||st.class_name===selectedClass)&&st.status==="active" &&
    searchName(st.full_name).includes(searchName(nameQuery)));
  const [penalty,setPenalty]=useState(2);
  const disorder=form.record_type==='violation'&&['mất trật tự','lỗi mất trật tự'].includes(form.title.trim().toLowerCase());
  const filteredRecords=records.rows.filter(r=>{
    const st=students.rows.find(x=>x.id===r.student_id);
    return st&&(!selectedClass||st.class_name===selectedClass)&&(!selectedStudent||st.id===selectedStudent) &&
      searchName(st.full_name).includes(searchName(nameQuery));
  }).sort((a,b)=>String(b.record_date).localeCompare(String(a.record_date))||String(b.created_at).localeCompare(String(a.created_at)));
  const violationCounts=new Map(violationTotals.rows.map(row=>
    [row.student_id,Number(row.violations||0)]));
  useEffect(()=>{
    let mounted=true;
    (async()=>{
      const [s,r]=await Promise.all([
        supabase.from("schools").select("violation_report_threshold").eq("id",profile.school_id).maybeSingle(),
        supabase.from("student_incident_reports").select("*").eq("school_id",profile.school_id).order("created_at",{ascending:false}).limit(200)
      ]);
      if(!mounted)return;
      if(!s.error&&s.data)setThreshold(s.data.violation_report_threshold||3);
      if(!r.error)setReports(r.data||[]);
      else ping("Không đọc được biên bản: "+r.error.message);
    })();
    return()=>{mounted=false;};
  },[profile.school_id,refresh]);
  async function save(e){
    e.preventDefault();
    if(!form.student_id)return ping("Chọn học sinh trước khi lưu.");
    const selected=students.rows.find(st=>st.id===form.student_id);
    if(!selected)return ping("Hãy chọn học sinh hợp lệ trong danh sách.");
    const rewardAmount=Number(awardStars);
    if(form.record_type==='reward'&&(!Number.isSafeInteger(rewardAmount)||rewardAmount<1||rewardAmount>1000)){
      return ping("Sao thưởng phải là số nguyên từ 1 đến 1000.");
    }
    if(!window.confirm('Xác nhận lưu ghi nhận "'+form.title+'" cho '+selected.full_name+
      ' · Lớp '+selected.class_name+'?'))return;
    setBusy(true);
    const {error}=await supabase.from("student_records").insert({
      ...form,school_id:profile.school_id,created_by:profile.id,
       ...(form.record_type==='break'?{record_type:'reward',star_event:'penalty'}:{}),
       points:form.record_type==='break'?-2:disorder?-Number(penalty):form.record_type==='reward'?rewardAmount:Number(form.points)
    });
    setBusy(false);
    if(error)ping(error.message);
    else{
      ping((disorder||form.record_type==="break")?"Đã trừ sao do mất trật tự, lửa giảm 1 cấp.":form.record_type==="violation"?"Đã ghi nhận một lần vi phạm. Nếu đủ ngưỡng sẽ có biên bản nháp.":"Đã lưu ghi nhận");
      setForm(old=>({...old,note:"",record_date:today()}));reload();
    }
  }
  async function changeThreshold(value){
    setBusy(true);
    const {error}=await supabase.rpc("set_school_violation_threshold",{
      p_school_id:profile.school_id,p_threshold:Number(value)
    });
    setBusy(false);
    if(error)ping(error.message);
    else{setThreshold(Number(value));ping("Đã cập nhật ngưỡng lập biên bản.");reload();}
  }
  async function confirmReport(r){
    if(!window.confirm("Xác nhận biên bản của "+(students.rows.find(s=>s.id===r.student_id)?.full_name||"học sinh")+"?"))return;
    setBusy(true);
    const {error}=await supabase.rpc("confirm_student_incident",{
      p_report_id:r.id,p_notes:reportNote[r.id]||""
    });
    setBusy(false);
    if(error)ping(error.message);
    else{ping("Đã xác nhận biên bản.");reload();}
  }
  function printReport(r){
    const student=students.rows.find(s=>s.id===r.student_id);
    if(!student){ping('Không tìm thấy học sinh để lập biên bản.');return;}
    const count=Number(r.violation_count)||0;
    const violations=records.rows.filter(x=>x.student_id===r.student_id&&isFormalViolation(x))
      .sort((a,b)=>String(a.record_date).localeCompare(String(b.record_date))||
        String(a.created_at).localeCompare(String(b.created_at)))
      .slice(0,count||undefined);
    const html=buildIncidentReportHtml({
      student,schoolName:student.school_name||profile.school_name||'',
      teacherName:profile.full_name||profile.name||'',
      report:{...r,notes:reportNote[r.id]??r.notes},
      violations,
      date:today()
    });
    const w=window.open('','_blank','width=920,height=780');
    if(!w){ping('Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup.');return;}
    w.document.open();w.document.write(html);w.document.close();
    w.focus();
    const run=()=>{try{w.print();}catch(err){ping('Không mở được hộp thoại in: '+err.message);}};
    if(w.document.readyState==='complete')run();
    else w.addEventListener('load',run,{once:true});
  }
  return <>
    <SectionHead title="Điểm, lỗi & thưởng" desc="Ghi nhận theo lớp, tổng số lần vi phạm và biên bản xác nhận của giáo viên"/>
    <div className="toolbar record-filter-bar">
      <StudentPicker key={selectedClass} students={allowedStudents} selectedId={selectedStudent}
        label="🔎 Tìm & chọn học sinh" placeholder="Gõ tên rồi chọn học sinh đúng lớp…"
        onSelect={id=>{setSelectedStudent(id);setForm(v=>({...v,student_id:id}));setEditingRecord(null);}}
        onQueryChange={setNameQuery} disabled={busy}/>
      <label className="field-inline">Lọc theo lớp
        <select aria-label="Lọc lớp ghi nhận" value={selectedClass} onChange={e=>{
          setSelectedClass(e.target.value);setSelectedStudent("");setNameQuery("");
          setEditingRecord(null);setForm(v=>({...v,student_id:""}));
        }}>
          <option value="">Tất cả lớp</option>{classes.map(c=><option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="field-inline">Ngưỡng lập biên bản
        <select disabled={busy} value={threshold} onChange={e=>changeThreshold(e.target.value)} aria-label="Số lần vi phạm lập biên bản">
          <option value="3">3 lần vi phạm</option><option value="4">4 lần vi phạm</option>
        </select>
      </label>
    </div>
    <div className="two-col">
      <div className="panel">
        <h3>Ghi nhận mới</h3>
        <form className="form-stack" onSubmit={save}>
          <div className="record-selected-student" role="status">
            {form.student_id?<>✅ Ghi nhận cho: <strong>{students.rows.find(st=>st.id===form.student_id)?.full_name||'Học sinh'}</strong> · Lớp {students.rows.find(st=>st.id===form.student_id)?.class_name||'—'}</>:
              <>🔎 Tìm và chọn đúng học sinh ở thanh phía trên trước khi lưu.</>}
          </div>
          <label>Loại ghi nhận<select value={form.record_type} onChange={e=>setForm({
            ...form,record_type:e.target.value,title:e.target.value==="violation"?"Nhắc 1":e.target.value==="reward"?"Điểm thưởng":e.target.value==="break"?"Mất trật tự":"Điểm thực hành",
            points:e.target.value==="violation"?0:1
          })}>
            <option value="violation">Lỗi / vi phạm</option><option value="reward">Thưởng 1 ⭐</option><option value="break">Mất trật tự (−2 sao)</option><option value="point">Điểm học tập</option>
          </select></label>
          {form.record_type==="violation"&&<label>Ghi nhận nhanh
            <select value={["Nhắc 1","1 Lỗi","Không làm bài","Mất trật tự","Không tuân thủ nội quy"].includes(form.title)?form.title:"other"}
              onChange={e=>setForm({...form,title:e.target.value==="other"?"":e.target.value})}>
              <option value="Nhắc 1">Nhắc 1</option><option value="1 Lỗi">1 Lỗi</option>
              <option value="Không làm bài">Không làm bài</option><option value="Mất trật tự">Mất trật tự</option>
              <option value="Không tuân thủ nội quy">Không tuân thủ nội quy</option><option value="other">Tự nhập...</option>
            </select>
          </label>}
          <label>Nội dung<input required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
          {form.record_type==="reward"?<>
            <p className="star-award-hint">Sao được dùng để đổi quà, số sao đổi 1 phần quà tùy vào giáo viên.</p>
            <label>Số sao thưởng<input type="number" min="1" max="1000" step="1" required
              value={awardStars} onChange={e=>setAwardStars(e.target.value)}/></label>
          </>:form.record_type==="point"&&<label>Điểm (+/-)<input type="number" value={form.points} onChange={e=>setForm({...form,points:e.target.value})}/></label>}
          {disorder&&<label>Số sao bị trừ<input required type="number" min="2" step="1" value={penalty} onChange={e=>setPenalty(e.target.value)}/></label>}
          <label>Ngày<input required type="date" value={form.record_date} onChange={e=>setForm({...form,record_date:e.target.value})}/></label>
          <label>Ghi chú<textarea maxLength={1500} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
          {form.student_id&&<p className="notice-box">Học sinh này có <b>{violationCounts.get(form.student_id)||0} lỗi</b>. Đến mốc {threshold} lỗi sẽ có biên bản nháp, giáo viên kiểm tra trước khi xác nhận.</p>}
          <button className="btn primary full" disabled={busy}>{busy?"Đang lưu…":"Lưu ghi nhận"}</button>
        </form>
      </div>
      <div className="panel">
        <div className="record-history-heading">
          <h3>Lịch sử theo lớp</h3>
          <button type="button" className="record-correction-edit-button" onClick={()=>{
            setEditHistory(v=>!v);setEditingRecord(null);
          }}>{editHistory?'✓ Xong chỉnh sửa':'✏️ Chỉnh sửa ghi nhận'}</button>
        </div>
        <div className="history-scroll">
          {(editHistory?filteredRecords:groupedHistory(filteredRecords)).map(r=><React.Fragment key={r.id}>
            <div className="record-row">
              <div className={"record-dot "+r.record_type}/>
              <div className="record-row-main"><b>{r.title}</b><small>
                {students.rows.find(st=>st.id===r.student_id)?.full_name||"Học sinh"}
                {" · "}{r.record_type==="violation"?"Vi phạm":r.kind==="penalty"||r.star_event==="penalty"?"Trừ sao":r.kind==="recovery"||r.star_event==="recovery"?"Phục hồi":r.kind==="redeem"||r.record_type==="reward"&&Number(r.points)<0?"Đổi quà":r.record_type==="reward"?"Khen thưởng":"Điểm"}
                {" · "}{dateText(r.record_date)}
              </small></div>
              {isFormalViolation(r)?<span className="pc-violation-badge">1 lỗi</span>:
                <strong className={r.points<0?"negative":"positive"}>{r.points>0?"+":""}{r.points}</strong>}
              {editHistory&&<button type="button" className="record-correction-edit-button"
                onClick={()=>setEditingRecord(editingRecord?.id===r.id?null:r)}
                disabled={r.star_event==='recovery'}
                title={r.star_event==='recovery'?'Cần đối soát riêng lượt khôi phục':'Sửa ghi nhận đã lưu'}>✏️ Sửa</button>}
            </div>

          </React.Fragment>)}
        </div>
        {!filteredRecords.length&&<Empty text="Chưa có ghi nhận cho bộ lọc này."/>}
        {editHistory&&editingRecord&&<RecordCorrectionEditor key={editingRecord.id} record={editingRecord}
          students={students.rows.filter(st=>st.status==='active')}
          onCancel={()=>setEditingRecord(null)}
          onSaved={message=>{setEditingRecord(null);ping(message);reload();}}/>}
      </div>
    </div>
    <section className="panel incident-reports-panel">
      <h3>Biên bản vi phạm</h3>
      <p className="muted">Đủ {threshold} lần vi phạm sẽ tạo biên bản nháp. Bản in kết hợp mẫu học sinh tường trình, bảng lỗi đã ghi nhận và phần ký xác nhận; học sinh tự điền phần giải trình. Giáo viên kiểm tra rồi xác nhận, không tự áp dụng hình thức kỷ luật.</p>
      {reports.filter(r=>{
        const st=students.rows.find(s=>s.id===r.student_id);
        return st&&(!selectedClass||st.class_name===selectedClass)&&(!selectedStudent||st.id===selectedStudent);
      }).map(r=><article className="incident-report-row" key={r.id}>
        <div><strong>{students.rows.find(s=>s.id===r.student_id)?.full_name||"Học sinh"}</strong>
          <small>{students.rows.find(s=>s.id===r.student_id)?.class_name} · Mốc {r.violation_count} lỗi</small>
          <span className={r.status==="confirmed"?"incident-confirmed":"incident-draft"}>
            {r.status==="confirmed"?"Đã xác nhận biên bản":"Đang chờ giáo viên xác nhận"}
          </span>
        </div>
        {r.status==="draft"&&<textarea rows={2} aria-label="Ý kiến biên bản" placeholder="Ghi ý kiến giáo viên trước khi xác nhận..."
          value={reportNote[r.id]||""} onChange={e=>setReportNote(v=>({...v,[r.id]:e.target.value}))}/>}
        <div className="incident-report-actions">
          {r.status==="draft"&&<button className="btn primary" disabled={busy} onClick={()=>confirmReport(r)}>Xác nhận biên bản</button>}
          <button className="btn outline" onClick={()=>printReport(r)}>In / Lưu PDF biên bản</button>
        </div>
      </article>)}
      {!reports.length&&<p className="muted">Chưa có học sinh đạt ngưỡng lập biên bản.</p>}
    </section>
  </>;
}

function Cleaning({profile,refresh,reload,ping}){
  const pcs=useRows('computers',profile,refresh);
  const students=useRows('students',profile,refresh);
  const assigned=useRows('computer_assignments',profile,refresh);
  const logs=useRows('cleaning_logs',profile,refresh);
  const [className,setClassName]=useState('');
  const [selectedPC,setSelectedPC]=useState('');
  const [cleanDate,setCleanDate]=useState(today());
  const [status,setStatus]=useState('not_done');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const classNames=[...new Set(students.rows.map(s=>s.class_name).filter(Boolean))].sort();
  const pupils=students.rows.filter(s=>s.class_name===className&&s.status==='active');
  const peopleByPc=pcId=>assigned.rows
    .filter(a=>a.active&&a.computer_id===pcId)
    .map(a=>pupils.find(s=>s.id===a.student_id)).filter(Boolean);
  const classPcs=pcs.rows.filter(p=>peopleByPc(p.id).length>0).sort((a,b)=>comparePC(a.computer_code,b.computer_code));
  const visibleLogs=logs.rows.filter(l=>pupils.some(s=>s.id===l.student_id))
    .sort((a,b)=>b.cleaning_date.localeCompare(a.cleaning_date)||b.created_at.localeCompare(a.created_at));
  async function scheduleFor(pcsToAssign){
    if(!className||!pcsToAssign.length)return;
    setBusy(true);
    try{
      let total=0;
      for(const p of pcsToAssign){
        const owners=peopleByPc(p.id);
        for(const student of owners){
          const existing=logs.rows.find(l=>l.computer_id===p.id&&l.student_id===student.id&&l.cleaning_date===cleanDate);
          const record={school_id:profile.school_id,computer_id:p.id,student_id:student.id,cleaning_date:cleanDate,status,note:note.slice(0,1000),created_by:profile.id};
          const {error}=existing
            ? await supabase.from('cleaning_logs').update({status,note:note.slice(0,1000)}).eq('id',existing.id).eq('school_id',profile.school_id)
            : await supabase.from('cleaning_logs').insert(record);
          if(error)throw error;total++;
        }
      }
      ping('Đã lưu phân công vệ sinh cho '+total+' học sinh');reload();
    }catch(e){ping(e.message);}finally{setBusy(false);}
  }
  async function changeStatus(l,value){
    const {error}=await supabase.from('cleaning_logs').update({status:value})
      .eq('id',l.id).eq('school_id',profile.school_id);
    if(error)ping(error.message);else reload();
  }
  return <>
    <SectionHead title="Vệ sinh máy theo lớp" desc="Máy nào có học sinh của lớp đang ngồi thì chính học sinh đó được phân công vệ sinh" />
    <div className="toolbar roll-toolbar">
      <label>Lớp học<select value={className} onChange={e=>{setClassName(e.target.value);setSelectedPC('');}}><option value="">Chọn lớp</option>{classNames.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
      <span className="muted">{className?`${classPcs.length} máy có học sinh · ${pupils.length} học sinh`:'Chọn lớp để phân công vệ sinh'}</span>
    </div>
    <div className="two-col">
      <div className="panel">
        <h3>Phân công vệ sinh</h3>
        <form className="form-stack" onSubmit={e=>{e.preventDefault();scheduleFor(classPcs.filter(p=>p.id===selectedPC));}}>
          <label>Máy cần vệ sinh<select required value={selectedPC} disabled={!className||busy} onChange={e=>setSelectedPC(e.target.value)}><option value="">Chọn máy đã có học sinh ngồi</option>{classPcs.map(p=><option key={p.id} value={p.id}>{p.computer_code} · {peopleByPc(p.id).map(s=>s.full_name).join(', ')}</option>)}</select></label>
          {!!selectedPC&&<p className="muted">Người phụ trách: <b>{peopleByPc(selectedPC).map(s=>s.full_name).join(', ')||'Chưa có học sinh'}</b>. Không thể giao máy này cho học sinh khác.</p>}
          <label>Ngày vệ sinh<input type="date" required value={cleanDate} onChange={e=>setCleanDate(e.target.value)}/></label>
          <label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="not_done">Chưa hoàn thành / đã lên lịch</option><option value="done">Đã hoàn thành</option></select></label>
          <label>Ghi chú<input maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label>
          <button className="btn primary full" disabled={busy||!selectedPC}>Lưu lịch cho học sinh ngồi máy này</button>
          <button className="btn outline full" type="button" disabled={busy||!classPcs.length} onClick={()=>{if(window.confirm('Giao vệ sinh ngày '+dateText(cleanDate)+' cho mọi học sinh đã ngồi máy của lớp '+className+'?'))scheduleFor(classPcs);}}>Giao cho tất cả máy có học sinh lớp này</button>
        </form>
      </div>
      <div className="panel">
        <h3>Lịch vệ sinh và hoàn thành</h3>
        {!className?<p className="muted">Chọn lớp để xem đúng lịch vệ sinh của học sinh lớp đó.</p>:<div className="cleaning-list">
          {visibleLogs.map(l=><div className="task-row" key={l.id}>
            <span className={`task-icon ${l.status==='done'?'green':'orange'}`}><ClipboardCheck/></span>
            <div><b>{pcs.rows.find(p=>p.id===l.computer_id)?.computer_code||'Máy'} · {students.rows.find(s=>s.id===l.student_id)?.full_name||'Học sinh'}</b>
              <small>{dateText(l.cleaning_date)} · {l.status==='done'?'Đã hoàn thành':'Chưa hoàn thành'}</small></div>
            <button className="mini-btn" onClick={()=>changeStatus(l,l.status==='done'?'not_done':'done')}>{l.status==='done'?'Đánh dấu chưa làm':'Xác nhận đã dọn'}</button>
          </div>)}
          {!visibleLogs.length&&<p className="muted">Chưa có lịch vệ sinh cho lớp này.</p>}
        </div>}
      </div>
    </div>
    {!!className&&<div className="panel">
      <h3>Phân bổ máy của lớp {className}</h3>
      <div className="portal-pcs">{classPcs.map(p=><article key={p.id} className="portal-pc">
        <b>{p.computer_code}</b><p>{peopleByPc(p.id).map(s=>s.full_name).join(', ')}</p>
        <small>{visibleLogs.filter(l=>l.computer_id===p.id).slice(0,2).map(l=>dateText(l.cleaning_date)+' · '+(l.status==='done'?'Đã làm':'Chưa làm')).join(' | ')||'Chưa có lịch'}</small>
      </article>)}</div>
    </div>}
  </>;
}

export default App;
