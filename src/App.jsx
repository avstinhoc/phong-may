
import React, { useEffect, useMemo, useState } from "react";
import { supabase, configurationError, authMessage } from "./lib/supabase";
import { SchoolManager, Accounts, TimetableImport } from "./Management";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, Users, Monitor, ClipboardList, CalendarDays, Wallet,
  Award, Sparkles, Settings, LogOut, Plus, Search, Download, RefreshCw,
  CheckCircle2, Clock3, AlertTriangle, School, Menu, X, UserPlus,
  ShieldCheck, Trash2, FileSpreadsheet, ClipboardCheck, FileText,
  ChevronLeft, ChevronRight, Printer, UserCheck
} from "lucide-react";

const nav = [
  ["dashboard", "Tổng quan", LayoutDashboard],
  ["students", "Học sinh", Users],
  ["computers", "Phòng máy", Monitor],
  ["attendance", "Điểm danh & lịch", CalendarDays],
  ["records", "Điểm, lỗi & thưởng", ClipboardList],
  ["cleaning", "Vệ sinh máy", ClipboardCheck],
  ["finance", "Học phí & tiền công", Wallet],
  ["evaluation", "Đánh giá học sinh", Sparkles],
  ["reports", "Báo cáo PDF", FileText],
  ["settings", "Thiết lập", Settings],
  ["accounts", "Quản lý tài khoản", ShieldCheck]
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
  const [session, setSession] = useState(null);
  const [account, setProfile] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState("");
  const [profileError, setProfileError] = useState("");
  const school = schools.find(s => s.id === schoolId);
  const profile = account ? {...account, school_id: school?.id || null, school_name: school?.name || ""} : null;
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [mobileNav, setMobileNav] = useState(false);
  const [refresh, setRefresh] = useState(0);

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
        const result = await supabase.from("schools").select("id,name").order("name");
        if (!live) return;
        if (result.error) setProfileError(result.error.message);
        setSchools(result.data || []);
        setSchoolId(current => (result.data || []).some(s => s.id === current) ? current : result.data?.[0]?.id || "");
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
  const reload = () => setRefresh(v => v + 1);
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSchools([]); setSchoolId(""); setPage("dashboard");
  };

  if (!supabase) return <SetupScreen />;
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
          <School size={16} /><select aria-label="Trường đang quản lý" value={schoolId} onChange={e => setSchoolId(e.target.value)}><option value="" disabled>Chọn trường</option>{schools.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select>
        </div>
        <div className="nav-label">MENU CHÍNH</div>
        {nav.filter(([id]) =>
          id !== "accounts" || profile.role === "admin"
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            className={`nav-item ${page === id ? "active" : ""}`}
            onClick={() => { setPage(id); setMobileNav(false); }}
          >
            <Icon size={18} />{label}
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{(profile.full_name || "U").slice(0, 1).toUpperCase()}</div>
            <div>
              <b>{profile.full_name || session.user.email}</b>
              <small>{profile.role === "admin" ? "Quản trị viên" : profile.role === "teacher" ? "Giáo viên" : "Học sinh"}</small>
            </div>
          </div>
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
          <div className="top-actions">
            <span className="role-pill">{profile.role === "admin" ? "ADMIN" : profile.role === "teacher" ? "GIÁO VIÊN" : "HỌC SINH"}</span>
            <button className="icon-btn" title="Làm mới" onClick={reload}><RefreshCw size={18} /></button>
            <div className="avatar">{(profile.full_name || "U").slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        {notice && <div className="toast"><CheckCircle2 size={17} />{notice}</div>}

        <div className="content" key={schoolId}>
          <SchoolManager schools={schools} onCreated={id => {setSchoolId(id); reload();}} ping={ping} />
          {page === "accounts" && profile.role === "admin" && <Accounts profile={profile} />}
          {!schoolId && <div className="notice-box">Thêm trường đầu tiên để bắt đầu quản lý học sinh và lịch dạy.</div>}
          {schoolId && <>
          {page === "dashboard" && <Dashboard profile={profile} refresh={refresh} setPage={setPage} />}
          {page === "students" && isTeacher && <Students profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "computers" && <Computers profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "attendance" && isTeacher && <Attendance profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "records" && isTeacher && <Records profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "cleaning" && isTeacher && <Cleaning profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "finance" && isTeacher && <Finance profile={profile} refresh={refresh} />}
          {page === "evaluation" && <Evaluation profile={profile} refresh={refresh} reload={reload} ping={ping} />}
          {page === "reports" && isTeacher && <Reports profile={profile} refresh={refresh} ping={ping} />}
          {page === "settings" && isTeacher && <SettingsPage profile={profile} ping={ping} />}
          </>}
        </div>
        <footer>IC3 GS6 Computer Lab <span>•</span> Dữ liệu được lưu trên Supabase</footer>
      </main>
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

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({email:email.trim(),password, options:{emailRedirectTo:window.location.origin, data:{full_name:name.trim()}}});
        if(error) throw error;
        setMessage(data.session ? "Đã đăng ký. Chờ Admin cấp quyền giáo viên." : "Đã gửi yêu cầu. Kiểm tra email xác nhận (kể cả thư rác), sau đó đăng nhập. Nếu email đã có tài khoản, hãy dùng mật khẩu hiện tại.");
      }
    } catch(e) {setMessage(authMessage(e));} finally {setBusy(false);}
  }
  async function resend() {
    if(!email.trim()) {setMessage("Nhập email trước khi gửi lại."); return;}
    setBusy(true);
    try {const {error}=await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:window.location.origin}}); if(error) throw error; setMessage("Đã gửi yêu cầu gửi lại email xác nhận.");}
    catch(e){setMessage(authMessage(e));} finally{setBusy(false);}
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><div className="brand-mark large">IC3</div><span>COMPUTER LAB MANAGEMENT</span></div>
        <h1>{mode === "login" ? "Đăng nhập hệ thống" : "Đăng ký tài khoản giáo viên"}</h1>
        <p className="muted">Quản lý lớp học, học sinh và phòng máy IC3 GS6</p>
        <div role="status" aria-live="polite">{message && <p className="notice-box">{message}</p>}</div>
        <form onSubmit={submit} className="form-stack">
          {mode === "register" && <>
            <label>Họ và tên<input required value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" /></label>
            <p className="muted">Sau khi được duyệt, bạn có thể tự thêm nhiều trường và lịch dạy.</p>
          </>}
          <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></label>
          <label>Mật khẩu<input type="password" required minLength="6" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" /></label>
          <button className="btn primary full" disabled={busy}>{busy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Gửi đăng ký giáo viên"}</button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? "Chưa có tài khoản giáo viên?" : "Đã có tài khoản?"}
          {" "}<button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Đăng ký" : "Đăng nhập"}</button>
        </div>
        <button className="btn outline full" type="button" disabled={busy} onClick={resend}>Gửi lại email xác nhận</button>
        <div className="auth-foot">Tài khoản giáo viên mới cần quản trị viên cấp quyền trước khi sử dụng.</div>
      </div>
    </div>
  );
}

function PublicStudentRegister({ ping }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [phone, setPhone] = useState("");
  const [computer, setComputer] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("student_registrations").insert({
      registration_code: code.trim().toUpperCase(),
      full_name: name,
      student_code: studentCode,
      phone,
      computer_code: computer.trim().toUpperCase(),
      note
    });
    setBusy(false);
    if (error) ping("Không gửi được đăng ký: " + error.message);
    else setDone(true);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><div className="brand-mark large">IC3</div><span>STUDENT REGISTRATION</span></div>
        {done ? <>
          <h1>Đã gửi đăng ký!</h1>
          <p className="muted">Thông tin đã được gửi đến giáo viên. Hồ sơ chỉ được thêm vào danh sách chính thức sau khi giáo viên duyệt.</p>
          <a className="btn outline full" href="/">Quay lại trang chủ</a>
        </> : <>
          <h1>Đăng ký học sinh IC3 GS6</h1>
          <p className="muted">Điền thông tin và mã lớp do giáo viên cung cấp.</p>
          <form className="form-stack" onSubmit={submit}>
            <label>Mã lớp đăng ký<input required value={code} onChange={e => setCode(e.target.value)} placeholder="Ví dụ: IC3-K01" /></label>
            <label>Họ và tên<input required value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" /></label>
            <label>Mã học sinh (nếu có)<input value={studentCode} onChange={e => setStudentCode(e.target.value)} /></label>
            <label>Số điện thoại<input value={phone} onChange={e => setPhone(e.target.value)} /></label>
            <label>Số máy mong muốn<input value={computer} onChange={e => setComputer(e.target.value)} placeholder="PC1 – PC40" /></label>
            <label>Ghi chú<textarea value={note} onChange={e => setNote(e.target.value)} /></label>
            <button className="btn primary full" disabled={busy}>{busy ? "Đang gửi..." : "Gửi đăng ký"}</button>
          </form>
        </>}
      </div>
    </div>
  );
}

function useRows(table, profile, refresh, extra = {}) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      setBusy(true);
      let q = supabase.from(table).select("*");
      if (profile?.school_id) q = q.eq("school_id", profile.school_id);
      Object.entries(extra).forEach(([k, v]) => {
        if (v !== undefined && v !== null) q = q.eq(k, v);
      });
      const { data, error } = await q.limit(500);
      if (live) {
        setRows(data || []);
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
      <div className="welcome-icon"><Monitor size={54} /></div>
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
          <button className="quick-item" onClick={() => setPage("reports")}><FileText size={19} /><b>Báo cáo PDF</b><small>In báo cáo</small></button>
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

function Students({ profile, refresh, reload, ping }) {
  const { rows, busy } = useRows("students", profile, refresh);
  const registrations = useRows("student_registrations", profile, refresh);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    full_name: "", class_name: "", school_name: profile.school_name || "",
    student_code: "", phone: "", status: "active"
  });

  const filtered = rows.filter(s =>
    `${s.full_name} ${s.class_name} ${s.student_code}`.toLowerCase().includes(search.toLowerCase())
  );
  const waiting = registrations.rows.filter(r => r.status === "pending");

  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from("students").insert({
      ...form, school_id: profile.school_id, created_by: profile.id
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
    const { error } = await supabase.from("students")
      .update({ status: "active" }).eq("id", s.id);
    if (error) ping(error.message);
    else { ping("Đã duyệt học sinh"); reload(); }
  }

  async function remove(s) {
    if (!confirm("Xóa hồ sơ học sinh này?")) return;
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (error) ping(error.message);
    else { ping("Đã xóa hồ sơ"); reload(); }
  }

  async function approveRegistration(r) {
    const { data: cls, error: ce } = await supabase.from("classes")
      .select("*").eq("registration_code", r.registration_code).maybeSingle();

    if (ce || !cls) {
      ping(ce?.message || "Không tìm thấy lớp theo mã đăng ký");
      return;
    }

    const { data: student, error } = await supabase.from("students").insert({
      school_id: cls.school_id,
      class_id: cls.id,
      full_name: r.full_name,
      student_code: r.student_code,
      class_name: cls.class_name,
      school_name: profile.school_name,
      phone: r.phone,
      status: "active",
      created_by: profile.id
    }).select().single();

    if (error) { ping(error.message); return; }

    const { error: updateError } = await supabase.from("student_registrations")
      .update({ status: "approved" }).eq("id", r.id);

    if (updateError) {
      ping("Đã tạo học sinh nhưng cập nhật đăng ký gặp lỗi: " + updateError.message);
      reload();
      return;
    }

    if (r.computer_code) {
      const { data: pc } = await supabase.from("computers")
        .select("id,capacity").eq("school_id", cls.school_id)
        .eq("computer_code", r.computer_code).maybeSingle();

      if (pc && student) {
        const { count } = await supabase.from("computer_assignments")
          .select("*", { count: "exact", head: true })
          .eq("computer_id", pc.id).eq("active", true);

        if ((count || 0) < Number(pc.capacity || 2)) {
          const { error: assignError } = await supabase.from("computer_assignments").insert({
            school_id: cls.school_id,
            computer_id: pc.id,
            student_id: student.id,
            assigned_date: today(),
            active: true
          });
          ping(assignError ? "Đã duyệt học sinh nhưng chưa gán được máy: " + assignError.message : "Đã duyệt và gán máy " + r.computer_code);
        } else {
          ping("Đã duyệt học sinh. Máy đăng ký đã đủ chỗ, hãy chọn máy khác.");
        }
      } else {
        ping("Đã duyệt học sinh; máy đăng ký chưa có trong danh sách.");
      }
    } else {
      ping("Đã duyệt học sinh");
    }
    reload();
  }

  async function rejectRegistration(r) {
    if (!confirm("Từ chối đăng ký của " + r.full_name + "?")) return;
    const { error } = await supabase.from("student_registrations")
      .update({ status: "rejected" }).eq("id", r.id);
    if (error) ping(error.message);
    else { ping("Đã từ chối đăng ký"); reload(); }
  }

  return <>
    <SectionHead
      title="Quản lý học sinh"
      desc="Hồ sơ học sinh theo trường, lớp và trạng thái duyệt"
      action={<>
        <a className="btn outline" href="/register" target="_blank" rel="noreferrer">Mở trang đăng ký</a>
        <button className="btn primary" onClick={() => setShow(true)}><Plus size={17} />Thêm học sinh</button>
      </>}
    />

    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head">
        <div><h3>Đăng ký trực tuyến chờ duyệt</h3><p>Học sinh điền form công khai tại đường dẫn /register</p></div>
        <span className="status pending">{waiting.length} chờ duyệt</span>
      </div>
      {waiting.map(r => (
        <div className="task-row" key={r.id}>
          <span className="task-icon blue"><UserPlus /></span>
          <div>
            <b>{r.full_name}</b>
            <small>Mã lớp: {r.registration_code} · Máy mong muốn: {r.computer_code || "Chưa chọn"} · {r.phone || "Không có SĐT"}</small>
          </div>
          <button className="mini-btn success" onClick={() => approveRegistration(r)}>Duyệt</button>
          <button className="mini-btn danger" onClick={() => rejectRegistration(r)}>Từ chối</button>
        </div>
      ))}
      {!waiting.length && <p className="muted">Chưa có hồ sơ đăng ký trực tuyến chờ duyệt.</p>}
    </div>

    <div className="toolbar">
      <div className="searchbox"><Search size={17} /><input placeholder="Tìm tên, lớp, mã học sinh..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <button className="btn outline" onClick={() => exportRows(filtered, "Danh_sach_hoc_sinh")}><Download size={16} />Xuất Excel</button>
    </div>

    <div className="panel table-panel">
      <div className="table-wrap">
        <table>
          <thead><tr><th>HỌC SINH</th><th>MÃ HS</th><th>LỚP</th><th>TRƯỜNG</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td><b>{s.full_name}</b><small>{s.phone || "Chưa có SĐT"}</small></td>
                <td>{s.student_code || "—"}</td>
                <td>{s.class_name || "—"}</td>
                <td>{s.school_name || "—"}</td>
                <td><span className={`status ${s.status === "pending" ? "pending" : "active"}`}>{s.status === "pending" ? "Chờ duyệt" : s.status === "rejected" ? "Từ chối" : "Đang học"}</span></td>
                <td className="actions">
                  {s.status === "pending" && <button className="mini-btn success" onClick={() => approve(s)}>Duyệt</button>}
                  <button className="mini-btn danger" onClick={() => remove(s)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty text={busy ? "Đang tải..." : "Chưa có học sinh."} />}
      </div>
    </div>

    {show && <Modal title="Thêm học sinh" onClose={() => setShow(false)}>
      <form className="form-stack" onSubmit={save}>
        <label>Họ và tên<input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
        <div className="form-row">
          <label>Mã học sinh<input value={form.student_code} onChange={e => setForm({ ...form, student_code: e.target.value })} /></label>
          <label>Lớp<input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} /></label>
        </div>
        <label>Trường<input value={form.school_name} onChange={e => setForm({ ...form, school_name: e.target.value })} /></label>
        <label>Số điện thoại<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
        <button className="btn primary full">Lưu học sinh</button>
      </form>
    </Modal>}
  </>;
}

function Computers({ profile, refresh, reload, ping }) {
  const { rows, busy } = useRows("computers", profile, refresh);
  const students = useRows("students", profile, refresh);
  const assigned = useRows("computer_assignments", profile, refresh);
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
    }, { onConflict: "school_id,computer_code" });
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

  async function assign(computer) {
    const activeAssignments = assigned.rows.filter(
      a => a.computer_id === computer.id && a.active
    );
    if (activeAssignments.length >= Number(computer.capacity || 2)) {
      ping("Máy này đã đủ sức chứa.");
      return;
    }

    const chosen = prompt(
      "Nhập mã học sinh hoặc ID học sinh cần gán vào " + computer.computer_code
    );
    if (!chosen) return;

    const student = students.rows.find(
      s => s.student_code === chosen.trim() || s.id === chosen.trim()
    );
    if (!student) { ping("Không tìm thấy học sinh."); return; }

    const already = assigned.rows.find(
      a => a.student_id === student.id && a.active
    );
    if (already) {
      ping("Học sinh đang được gán vào một máy khác. Hãy gỡ phân công cũ trước.");
      return;
    }

    const { error } = await supabase.from("computer_assignments").insert({
      school_id: profile.school_id,
      computer_id: computer.id,
      student_id: student.id,
      assigned_date: today(),
      active: true
    });
    if (error) ping(error.message);
    else { ping("Đã phân công " + student.full_name + " vào " + computer.computer_code); reload(); }
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
    <div className="toolbar">
      <div className="field-inline">Số máy muốn khởi tạo <input type="number" min="1" max="500" value={count} onChange={e => setCount(e.target.value)} /></div>
      <span className="muted">{rows.length} máy đã có trong hệ thống</span>
    </div>
    <div className="computer-grid">
      {rows.map(c => {
        const users = assigned.rows.filter(a => a.computer_id === c.id && a.active);
        return (
          <div className={`computer-card ${c.status === "maintenance" ? "maintenance" : users.length ? "occupied" : ""}`} key={c.id}>
            <div className="pc-top">
              <Monitor size={22} />
              <span className={`status ${c.status === "maintenance" ? "pending" : users.length ? "active" : "free"}`}>
                {c.status === "maintenance" ? "Bảo trì" : users.length ? "Đang dùng" : "Trống"}
              </span>
            </div>
            <h3>{c.computer_code}</h3>
            <p>{c.location || "Chưa phân khu"}</p>
            <small>Sức chứa: {users.length}/{c.capacity || 2} học sinh</small>
            <div className="pc-users">
              {users.length ? users.map(a => (
                <div className="pc-user-row" key={a.id}>
                  <span>• {students.rows.find(s => s.id === a.student_id)?.full_name || "Học sinh"}</span>
                  <button className="mini-btn danger" onClick={() => release(a)}>Gỡ</button>
                </div>
              )) : <span>Chưa có học sinh</span>}
            </div>
            <button className="mini-btn" disabled={users.length >= Number(c.capacity || 2) || c.status === "maintenance"} onClick={() => assign(c)}>+ Gán học sinh</button>
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

function Attendance({ profile, refresh, reload, ping }) {
  const { rows } = useRows("class_sessions", profile, refresh);
  const classes = useRows("classes", profile, refresh);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    class_name: "", session_date: today(), start_time: "17:00",
    end_time: "19:00", teacher_name: profile.full_name || "",
    hourly_rate: 0, student_fee_per_period: 0, period_count: 1
  });

  async function save(e) {
    e.preventDefault();
    if(saving) return;
    setSaving(true);
    const payload = {
      ...form,
      school_id: profile.school_id,
      teacher_id: profile.id,
      created_by: profile.id,
      hourly_rate: Number(form.hourly_rate),
      student_fee_per_period: Number(form.student_fee_per_period),
      period_count: Number(form.period_count)
    };
    const { error } = editingId ? await supabase.from("class_sessions").update(payload).eq("id",editingId) : await supabase.from("class_sessions").insert(payload);
    setSaving(false);
    if (error) ping(error.message);
    else { ping("Đã lưu buổi học"); setEditingId(null); reload(); }
  }

  const minutes = Math.max(0,
    Number(form.end_time.slice(0, 2)) * 60 + Number(form.end_time.slice(3, 5)) -
    Number(form.start_time.slice(0, 2)) * 60 - Number(form.start_time.slice(3, 5))
  );

  return <>
    <TimetableImport profile={profile} reload={reload} />
    <SectionHead title="Lịch học & chấm công" desc="Lập lịch theo lớp, ghi nhận giờ dạy và số tiết học" />
    <div className="two-col">
      <div className="panel">
        <h3>{editingId ? "Sửa buổi học" : "Tạo buổi học / chấm công"}</h3>
        <form className="form-stack" onSubmit={save}>
          <label>Lớp
            <input list="class-options" required value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} placeholder="Chọn hoặc nhập tên lớp" />
            <datalist id="class-options">{classes.rows.map(c => <option key={c.id} value={c.class_name} />)}</datalist>
          </label>
          <label>Ngày học<input type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })} /></label>
          <div className="form-row">
            <label>Giờ bắt đầu<input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></label>
            <label>Giờ kết thúc<input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></label>
          </div>
          <label>Giáo viên<input value={form.teacher_name} onChange={e => setForm({ ...form, teacher_name: e.target.value })} /></label>
          <div className="form-row">
            <label>Tiền công / giờ<input type="number" min="0" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} /></label>
            <label>Tiền / tiết / học sinh<input type="number" min="0" value={form.student_fee_per_period} onChange={e => setForm({ ...form, student_fee_per_period: e.target.value })} /></label>
          </div>
          <label>Số tiết<input type="number" min="1" value={form.period_count} onChange={e => setForm({ ...form, period_count: e.target.value })} /></label>
          <button className="btn primary full" disabled={saving}>{saving ? "Đang lưu..." : "Lưu lịch học"}</button>{editingId && <button type="button" className="btn outline" onClick={()=>setEditingId(null)}>Hủy sửa</button>}
        </form>
      </div>
      <div className="panel">
        <h3>Quy tắc tính tiền</h3>
        <div className="calc-box">
          <small>Tiền học một học sinh</small>
          <b>{money(form.student_fee_per_period * form.period_count)}</b>
          <small>Tiền công giáo viên ước tính</small>
          <b>{money(form.hourly_rate * minutes / 60)}</b>
        </div>
        <p className="muted">Lịch tuần được hiển thị ở bên dưới. Học phí và tiền công được tổng hợp trong mục Tài chính.</p>
      </div>
    </div>
    <WeeklySchedule rows={rows} />
    <div className="panel table-panel">
      <h3>Buổi học đã tạo</h3>
      <table>
        <thead><tr><th>NGÀY</th><th>LỚP</th><th>GIÁO VIÊN</th><th>GIỜ</th><th>SỐ TIẾT</th><th></th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id}><td>{dateText(r.session_date)}</td><td>{r.class_name}</td><td>{r.teacher_name}</td><td>{r.start_time} – {r.end_time}</td><td>{r.period_count}</td><td><button className="btn outline" onClick={()=>{setEditingId(r.id);setForm({class_name:r.class_name,session_date:r.session_date,start_time:r.start_time.slice(0,5),end_time:r.end_time.slice(0,5),teacher_name:r.teacher_name||"",hourly_rate:r.hourly_rate,student_fee_per_period:r.student_fee_per_period,period_count:r.period_count});}}>Sửa</button></td></tr>
        ))}</tbody>
      </table>
      {!rows.length && <Empty text="Chưa có lịch học." />}
    </div>
  </>;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function WeeklySchedule({ rows = [] }) {
  const [weekShift, setWeekShift] = useState(0);
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + weekShift * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const end = days[6];

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head">
        <div>
          <h3>Lịch học theo tuần</h3>
          <p>{dateText(toDateKey(monday))} – {dateText(toDateKey(end))}</p>
        </div>
        <div className="actions">
          <button className="icon-btn" onClick={() => setWeekShift(v => v - 1)}><ChevronLeft /></button>
          <button className="btn outline" onClick={() => setWeekShift(0)}>Tuần này</button>
          <button className="icon-btn" onClick={() => setWeekShift(v => v + 1)}><ChevronRight /></button>
        </div>
      </div>
      <div className="week-grid">
        {days.map((day, i) => {
          const key = toDateKey(day);
          const list = rows.filter(r => r.session_date === key)
            .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
          return (
            <div className="week-day" key={key}>
              <div className="week-day-head">
                <b>{["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"][i]}</b>
                <small>{day.getDate()}/{day.getMonth() + 1}</small>
              </div>
              {list.map(item => (
                <div className="week-event" key={item.id}>
                  <b>{item.class_name}</b>
                  <small>{item.start_time}–{item.end_time}</small>
                  <small>{item.teacher_name}</small>
                </div>
              ))}
              {!list.length && <small className="muted">Không có lịch</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Records({ profile, refresh, reload, ping }) {
  const students = useRows("students", profile, refresh);
  const records = useRows("student_records", profile, refresh);
  const [form, setForm] = useState({
    student_id: "", record_type: "point", title: "Điểm thực hành",
    points: 1, note: "", record_date: today()
  });

  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from("student_records").insert({
      ...form,
      school_id: profile.school_id,
      created_by: profile.id,
      points: Number(form.points)
    });
    if (error) ping(error.message);
    else { ping("Đã ghi nhận"); reload(); }
  }

  return <>
    <SectionHead title="Điểm, lỗi & thưởng" desc="Ghi nhận kết quả và hành vi theo từng học sinh" />
    <div className="two-col">
      <div className="panel">
        <h3>Ghi nhận mới</h3>
        <form className="form-stack" onSubmit={save}>
          <label>Học sinh<select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}><option value="">Chọn học sinh</option>{students.rows.map(s => <option value={s.id} key={s.id}>{s.full_name} – {s.class_name}</option>)}</select></label>
          <label>Loại ghi nhận<select value={form.record_type} onChange={e => setForm({ ...form, record_type: e.target.value })}><option value="point">Điểm học tập</option><option value="reward">Thưởng</option><option value="violation">Lỗi / vi phạm</option></select></label>
          <label>Nội dung<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label>Điểm (+/-)<input type="number" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} /></label>
          <label>Ngày ghi nhận<input type="date" value={form.record_date} onChange={e => setForm({ ...form, record_date: e.target.value })} /></label>
          <label>Ghi chú<textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>
          <button className="btn primary full">Lưu ghi nhận</button>
        </form>
      </div>
      <div className="panel">
        <h3>Lịch sử gần đây</h3>
        {records.rows.slice(0, 20).map(r => (
          <div className="record-row" key={r.id}>
            <div className={`record-dot ${r.record_type}`} />
            <div>
              <b>{r.title}</b>
              <small>{students.rows.find(s => s.id === r.student_id)?.full_name || "Học sinh"} · {r.record_type === "violation" ? "Vi phạm" : r.record_type === "reward" ? "Khen thưởng" : "Điểm"}</small>
            </div>
            <strong className={r.points < 0 ? "negative" : "positive"}>{r.points > 0 ? "+" : ""}{r.points}</strong>
          </div>
        ))}
        {!records.rows.length && <Empty text="Chưa có ghi nhận." />}
      </div>
    </div>
  </>;
}

function Cleaning({ profile, refresh, reload, ping }) {
  const pcs = useRows("computers", profile, refresh);
  const students = useRows("students", profile, refresh);
  const logs = useRows("cleaning_logs", profile, refresh);
  const [form, setForm] = useState({
    computer_id: "", student_id: "", cleaning_date: today(), status: "done", note: ""
  });

  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from("cleaning_logs").insert({
      ...form, school_id: profile.school_id, created_by: profile.id
    });
    if (error) ping(error.message);
    else { ping("Đã lưu vệ sinh"); reload(); }
  }

  return <>
    <SectionHead title="Quản lý vệ sinh máy" desc="Phân công và theo dõi vệ sinh theo từng số máy" />
    <div className="two-col">
      <div className="panel">
        <h3>Ghi nhận vệ sinh</h3>
        <form className="form-stack" onSubmit={save}>
          <label>Số máy<select required value={form.computer_id} onChange={e => setForm({ ...form, computer_id: e.target.value })}><option value="">Chọn máy</option>{pcs.rows.map(p => <option key={p.id} value={p.id}>{p.computer_code}</option>)}</select></label>
          <label>Học sinh phụ trách<select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}><option value="">Chọn học sinh</option>{students.rows.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label>
          <label>Ngày<input type="date" value={form.cleaning_date} onChange={e => setForm({ ...form, cleaning_date: e.target.value })} /></label>
          <label>Trạng thái<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="done">Đã hoàn thành</option><option value="not_done">Chưa hoàn thành</option></select></label>
          <label>Ghi chú<input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>
          <button className="btn primary full">Lưu phân công</button>
        </form>
      </div>
      <div className="panel">
        <h3>Lịch sử vệ sinh</h3>
        {logs.rows.slice(0, 20).map(l => (
          <div className="task-row" key={l.id}>
            <span className={`task-icon ${l.status === "done" ? "green" : "orange"}`}><ClipboardCheck /></span>
            <div>
              <b>{pcs.rows.find(p => p.id === l.computer_id)?.computer_code || "Máy"} · {students.rows.find(s => s.id === l.student_id)?.full_name || "Học sinh"}</b>
              <small>{dateText(l.cleaning_date)} · {l.status === "done" ? "Đã hoàn thành" : "Chưa hoàn thành"}</small>
            </div>
          </div>
        ))}
        {!logs.rows.length && <Empty text="Chưa có dữ liệu vệ sinh." />}
      </div>
    </div>
  </>;
}

function Finance({ profile, refresh }) {
  const sessions = useRows("class_sessions", profile, refresh);
  const students = useRows("students", profile, refresh);
  const [className, setClassName] = useState("");

  const data = sessions.rows.filter(s => !className || s.class_name === className).map(s => {
    const mins = Math.max(0,
      Number(s.end_time?.slice(0, 2)) * 60 + Number(s.end_time?.slice(3, 5)) -
      Number(s.start_time?.slice(0, 2)) * 60 - Number(s.start_time?.slice(3, 5))
    );
    return {
      ...s,
      hours: mins / 60,
      teacher_pay: mins / 60 * Number(s.hourly_rate || 0),
      student_fee: Number(s.student_fee_per_period || 0) *
        Number(s.period_count || 0) *
        students.rows.filter(x => x.class_name === s.class_name && x.status !== "inactive").length
    };
  });

  const sumTeacher = data.reduce((a, b) => a + b.teacher_pay, 0);
  const sumStudent = data.reduce((a, b) => a + b.student_fee, 0);

  return <>
    <SectionHead title="Học phí & tiền công" desc="Tổng hợp tiền học theo tiết và tiền công giáo viên theo giờ" />
    <div className="metrics-grid">
      <Metric label="Tổng học phí dự kiến" value={money(sumStudent)} sub="Theo số học sinh và số tiết" Icon={Wallet} />
      <Metric label="Tổng tiền công giáo viên" value={money(sumTeacher)} sub="Theo thời lượng buổi dạy" Icon={Clock3} tone="blue" />
      <Metric label="Số buổi đã ghi" value={data.length} sub="Theo bộ lọc hiện tại" Icon={CalendarDays} tone="purple" />
      <Metric label="Học sinh" value={students.rows.length} sub="Trong phạm vi dữ liệu" Icon={Users} tone="orange" />
    </div>
    <div className="toolbar">
      <select value={className} onChange={e => setClassName(e.target.value)}>
        <option value="">Tất cả lớp</option>
        {[...new Set(sessions.rows.map(s => s.class_name))].map(c => <option key={c}>{c}</option>)}
      </select>
      <button className="btn outline" onClick={() => exportRows(data, "Bao_cao_hoc_phi_tien_cong")}><Download size={16} />Xuất Excel</button>
    </div>
    <div className="panel table-panel">
      <table>
        <thead><tr><th>NGÀY</th><th>LỚP</th><th>GIÁO VIÊN</th><th>SỐ TIẾT</th><th>HỌC PHÍ DỰ KIẾN</th><th>TIỀN CÔNG</th></tr></thead>
        <tbody>{data.map(d => (
          <tr key={d.id}><td>{dateText(d.session_date)}</td><td>{d.class_name}</td><td>{d.teacher_name}</td><td>{d.period_count}</td><td>{money(d.student_fee)}</td><td>{money(d.teacher_pay)}</td></tr>
        ))}</tbody>
      </table>
      {!data.length && <Empty text="Chưa có buổi học để tính tiền." />}
    </div>
    <p className="muted tiny">Học phí trong báo cáo là số tiền dự kiến theo số học sinh thuộc lớp, chưa phải số tiền thực thu. Muốn quản lý công nợ cần thêm bảng thu phí riêng.</p>
  </>;
}

function Evaluation({ profile, refresh, reload, ping }) {
  const students = useRows("students", profile, refresh);
  const records = useRows("student_records", profile, refresh);
  const attendance = useRows("attendance", profile, refresh);
  const [selected, setSelected] = useState("");
  const [commentEdit, setCommentEdit] = useState("");

  const target = students.rows.find(s => s.id === selected);

  const evalData = useMemo(() => {
    if (!target) return null;
    const r = records.rows.filter(x => x.student_id === target.id);
    const score = r.filter(x => x.record_type === "point" || x.record_type === "reward")
      .reduce((a, b) => a + Number(b.points || 0), 0);
    const violations = r.filter(x => x.record_type === "violation");
    const rewards = r.filter(x => x.record_type === "reward");
    const studentAttendance = attendance.rows.filter(x => x.student_id === target.id);
    const abs = studentAttendance.filter(x => x.status === "absent").length;
    const present = studentAttendance.filter(x => ["present", "late"].includes(x.status)).length;
    const attendanceRate = studentAttendance.length
      ? Math.round(present / studentAttendance.length * 100)
      : null;

    let level = "Đang cập nhật";
    let comment = "Chưa có đủ dữ liệu để đưa ra nhận xét đáng tin cậy.";

    if (r.length || studentAttendance.length) {
      if (score >= 8 && violations.length <= 1 && abs === 0 &&
        (attendanceRate === null || attendanceRate >= 90)) {
        level = "Tốt";
        comment = "Có ý thức học tập tích cực, kết quả ghi nhận tốt và chấp hành nội quy. Tiếp tục phát huy tinh thần chủ động trong các bài thực hành.";
      } else if (score >= 3 && violations.length <= 3 &&
        (attendanceRate === null || attendanceRate >= 70)) {
        level = "Khá";
        comment = "Có sự tham gia và tiến bộ trong quá trình học. Cần duy trì việc luyện tập, chú ý nội quy và hoàn thành nhiệm vụ đúng thời hạn.";
      } else {
        level = "Cần cố gắng";
        comment = "Cần tăng cường luyện tập, chủ động hỏi khi gặp khó khăn và chú ý hơn đến nội quy phòng máy. Giáo viên nên trao đổi trực tiếp để hỗ trợ phù hợp.";
      }
    }

    return {
      score,
      violations: violations.length,
      rewards: rewards.length,
      abs,
      present,
      attendanceRate,
      level,
      comment
    };
  }, [target, records.rows, attendance.rows]);

  useEffect(() => {
    setCommentEdit(evalData?.comment || "");
  }, [selected, evalData?.comment]);

  async function save() {
    if (!target || !evalData) return;
    const { error } = await supabase.from("student_evaluations").insert({
      school_id: profile.school_id,
      student_id: target.id,
      period_label: "Đánh giá " + today(),
      level: evalData.level,
      comment: commentEdit,
      metrics: evalData,
      created_by: profile.id
    });
    if (error) ping(error.message);
    else { ping("Đã lưu nhận xét"); reload(); }
  }

  return <>
    <SectionHead title="Đánh giá học sinh" desc="Tạo nhận xét tự động dựa trên điểm, vi phạm, thưởng và chuyên cần" />
    <div className="panel eval-panel">
      <label>Chọn học sinh
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Chọn học sinh cần đánh giá</option>
          {students.rows.map(s => <option key={s.id} value={s.id}>{s.full_name} – {s.class_name}</option>)}
        </select>
      </label>

      {target && evalData && <>
        <div className="eval-profile">
          <div className="avatar big">{target.full_name.slice(0, 1)}</div>
          <div><h2>{target.full_name}</h2><p>{target.class_name} · {target.school_name}</p></div>
          <span className="status active">{evalData.level}</span>
        </div>

        <div className="metrics-grid compact">
          <Metric label="Điểm tích lũy" value={evalData.score} sub="Điểm và thưởng" Icon={Award} />
          <Metric label="Lỗi ghi nhận" value={evalData.violations} sub="Số lần vi phạm" Icon={AlertTriangle} tone="orange" />
          <Metric label="Lượt khen thưởng" value={evalData.rewards} sub="Ghi nhận tích cực" Icon={Sparkles} tone="purple" />
          <Metric label="Buổi vắng" value={evalData.abs} sub="Theo dữ liệu điểm danh" Icon={CalendarDays} tone="blue" />
          <Metric label="Chuyên cần" value={evalData.attendanceRate === null ? "Chưa có" : evalData.attendanceRate + "%"} sub={`${evalData.present} lượt có mặt/đi muộn`} Icon={UserCheck} tone="green" />
        </div>

        <div className="ai-comment">
          <div><Sparkles /> <b>Nhận xét tự động – giáo viên có thể chỉnh sửa</b></div>
          <textarea rows="5" value={commentEdit} onChange={e => setCommentEdit(e.target.value)} />
          <small>Đây là đánh giá theo quy tắc dựa trên dữ liệu hiện có, không phải mô hình AI tạo sinh. Giáo viên cần xem lại trước khi lưu.</small>
        </div>
        <button className="btn primary" onClick={save}>Lưu nhận xét vào hồ sơ</button>
      </>}
    </div>
  </>;
}

function Reports({ profile, refresh, ping }) {
  const students = useRows("students", profile, refresh);
  const pcs = useRows("computers", profile, refresh);
  const sessions = useRows("class_sessions", profile, refresh);
  const records = useRows("student_records", profile, refresh);
  const cleaning = useRows("cleaning_logs", profile, refresh);
  const attendance = useRows("attendance", profile, refresh);
  const [from, setFrom] = useState(today().slice(0, 8) + "01");
  const [to, setTo] = useState(today());
  const [kind, setKind] = useState("overview");

  const inRange = row => {
    const d = row.session_date || row.record_date || row.cleaning_date;
    return !d || (d >= from && d <= to);
  };

  const filteredSessions = sessions.rows.filter(inRange);
  const filteredRecords = records.rows.filter(inRange);
  const filteredCleaning = cleaning.rows.filter(inRange);
  const filteredAttendance = attendance.rows;

  const reportRows = useMemo(() => {
    if (kind === "students") return students.rows.map(s => ({
      "Họ tên": s.full_name,
      "Mã học sinh": s.student_code,
      "Lớp": s.class_name,
      "Trường": s.school_name,
      "Trạng thái": s.status,
      "Điện thoại": s.phone
    }));
    if (kind === "computers") return pcs.rows.map(p => ({
      "Mã máy": p.computer_code,
      "Vị trí": p.location,
      "Trạng thái": p.status,
      "Sức chứa": p.capacity
    }));
    if (kind === "records") return filteredRecords.map(r => ({
      "Ngày": r.record_date,
      "Học sinh": students.rows.find(s => s.id === r.student_id)?.full_name || "",
      "Loại": r.record_type,
      "Nội dung": r.title,
      "Điểm": r.points,
      "Ghi chú": r.note
    }));
    if (kind === "cleaning") return filteredCleaning.map(r => ({
      "Ngày": r.cleaning_date,
      "Máy": pcs.rows.find(p => p.id === r.computer_id)?.computer_code || "",
      "Học sinh": students.rows.find(s => s.id === r.student_id)?.full_name || "",
      "Trạng thái": r.status,
      "Ghi chú": r.note
    }));
    if (kind === "attendance") return filteredAttendance.map(r => ({
      "Buổi học": r.session_id,
      "Học sinh": students.rows.find(s => s.id === r.student_id)?.full_name || "",
      "Trạng thái": r.status,
      "Ghi chú": r.note
    }));
    return filteredSessions.map(s => ({
      "Ngày": s.session_date,
      "Lớp": s.class_name,
      "Giáo viên": s.teacher_name,
      "Bắt đầu": s.start_time,
      "Kết thúc": s.end_time,
      "Số tiết": s.period_count,
      "Tiền công/giờ": s.hourly_rate,
      "Học phí/tiết": s.student_fee_per_period
    }));
  }, [kind, students.rows, pcs.rows, filteredRecords, filteredCleaning, filteredAttendance, filteredSessions]);

  function printPdf() {
    const titles = {
      overview: "BÁO CÁO LỊCH HỌC",
      students: "DANH SÁCH HỌC SINH",
      computers: "DANH SÁCH PHÒNG MÁY",
      records: "BÁO CÁO ĐIỂM, LỖI VÀ KHEN THƯỞNG",
      cleaning: "BÁO CÁO VỆ SINH MÁY",
      attendance: "BÁO CÁO ĐIỂM DANH"
    };
    const title = titles[kind] || "BÁO CÁO";
    const columns = reportRows.length ? Object.keys(reportRows[0]) : [];
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
    const html = `
      <!doctype html><html lang="vi"><head><meta charset="utf-8">
      <title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#172033;padding:24px}
        h1{text-align:center;font-size:20px;margin:0 0 8px}
        p{text-align:center;color:#555;margin:4px 0 20px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #bbb;padding:7px;text-align:left;vertical-align:top}
        th{background:#edf2f7}
        .foot{margin-top:28px;text-align:right;font-size:12px}
        @media print{body{padding:0} @page{size:A4 landscape;margin:12mm}}
      </style></head><body>
      <h1>${esc(title)}</h1>
      <p>${esc(profile.school_name || "IC3 GS6")} · Từ ${esc(dateText(from))} đến ${esc(dateText(to))}</p>
      ${columns.length ? `<table><thead><tr>${columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${reportRows.map(row => `<tr>${columns.map(c => `<td>${esc(row[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "<p>Không có dữ liệu trong báo cáo.</p>"}
      <div class="foot">Ngày xuất báo cáo: ${esc(dateText(today()))}</div>
      <script>window.onload=()=>{window.print()}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      ping("Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up rồi thử lại.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return <>
    <SectionHead title="Báo cáo & xuất PDF" desc="Lọc dữ liệu theo thời gian, in hoặc lưu thành PDF" />
    <div className="panel">
      <div className="form-row">
        <label>Từ ngày<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>Đến ngày<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      <label>Loại báo cáo
        <select value={kind} onChange={e => setKind(e.target.value)}>
          <option value="overview">Lịch học</option>
          <option value="students">Danh sách học sinh</option>
          <option value="computers">Danh sách máy tính</option>
          <option value="records">Điểm, lỗi và khen thưởng</option>
          <option value="cleaning">Vệ sinh máy</option>
          <option value="attendance">Điểm danh</option>
        </select>
      </label>
      <div className="toolbar">
        <button className="btn primary" onClick={printPdf}><Printer size={17} />In / Lưu PDF</button>
        <button className="btn outline" onClick={() => exportRows(reportRows, "Bao_cao_IC3_GS6")}><FileSpreadsheet size={17} />Xuất Excel</button>
      </div>
      <p className="muted tiny">Khi cửa sổ in mở ra, chọn máy in “Save as PDF” hoặc “Lưu thành PDF”. Báo cáo chỉ chứa dữ liệu mà tài khoản hiện tại được phép đọc.</p>
    </div>
    <div className="panel table-panel">
      <div className="panel-head"><div><h3>Xem trước báo cáo</h3><p>{reportRows.length} dòng dữ liệu</p></div></div>
      <div className="table-wrap">
        {reportRows.length ? <table>
          <thead><tr>{Object.keys(reportRows[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
          <tbody>{reportRows.slice(0, 100).map((r, i) => (
            <tr key={i}>{Object.keys(reportRows[0]).map(k => <td key={k}>{String(r[k] ?? "")}</td>)}</tr>
          ))}</tbody>
        </table> : <Empty text="Không có dữ liệu cho loại báo cáo này." />}
      </div>
      {reportRows.length > 100 && <p className="muted tiny">Bảng xem trước giới hạn 100 dòng; thao tác xuất báo cáo vẫn lấy toàn bộ dữ liệu đã tải.</p>}
    </div>
  </>;
}

function SettingsPage({ profile, ping }) {
  const [classCode, setClassCode] = useState("IC3-" + Math.random().toString(36).slice(2, 7).toUpperCase());
  const [className, setClassName] = useState("IC3 GS6 - K01");
  const [fee, setFee] = useState(0);

  async function createClass(e) {
    e.preventDefault();
    const { error } = await supabase.from("classes").insert({
      school_id: profile.school_id,
      class_name: className,
      registration_code: classCode,
      student_fee_per_period: Number(fee),
      created_by: profile.id
    });
    if (error) ping(error.message);
    else ping("Đã tạo lớp và mã đăng ký");
  }

  return <>
    <SectionHead title="Thiết lập hệ thống" desc="Thông tin trường, lớp học, mã đăng ký và đơn giá" />
    <div className="two-col">
      <div className="panel">
        <h3>Tạo lớp và mã đăng ký học sinh</h3>
        <form className="form-stack" onSubmit={createClass}>
          <label>Tên lớp<input value={className} onChange={e => setClassName(e.target.value)} /></label>
          <label>Mã đăng ký<input value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())} /></label>
          <label>Học phí mỗi tiết / học sinh<input type="number" min="0" value={fee} onChange={e => setFee(e.target.value)} /></label>
          <button className="btn primary full">Tạo lớp</button>
        </form>
        <div className="notice-box">Mã lớp dùng để học sinh đăng ký. Hồ sơ sẽ chờ giáo viên duyệt.</div>
      </div>
      <div className="panel">
        <h3>Đăng ký học sinh</h3>
        <p className="muted">Gửi đường dẫn đăng ký công khai cho học sinh và cung cấp mã lớp.</p>
        <div className="code-box">{classCode}</div>
        <button className="btn outline" onClick={() => {
          navigator.clipboard?.writeText(classCode)
            .then(() => ping("Đã sao chép mã lớp"))
            .catch(() => ping("Không thể sao chép mã trên trình duyệt này"));
        }}>Sao chép mã lớp</button>
        <hr />
        <h3>Trường công tác</h3><p className="muted">Dùng danh sách ở thanh bên để đổi trường. Mỗi trường có lớp, học sinh và lịch riêng.</p>
      </div>
    </div>
  </>;
}

export default App;
