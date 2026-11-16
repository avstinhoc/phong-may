import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

export function SchoolManager({ schools, onCreated, onChanged, ping, role }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignedTeachers,setAssignedTeachers] = useState({});
  const [teacherNamesLoading,setTeacherNamesLoading] = useState(role==="admin");
  const [teacherNamesError,setTeacherNamesError] = useState("");
  useEffect(()=>{
    if(role!=="admin")return;
    let live=true;
    const ids=schools.map(s=>s.id);
    if(!ids.length){setAssignedTeachers({});setTeacherNamesLoading(false);return;}
    setTeacherNamesLoading(true);setTeacherNamesError("");
    (async()=>{
      try{
        // Memberships list staff formally assigned to each school; sessions
        // include teachers with a saved teaching assignment but no membership.
        const [membersResult,sessionsResult]=await Promise.all([
          supabase.from("school_members").select("school_id,user_id").in("school_id",ids),
          supabase.from("class_sessions").select("school_id,teacher_id,created_by").in("school_id",ids)
        ]);
        if(membersResult.error)throw membersResult.error;
        if(sessionsResult.error)throw sessionsResult.error;
        const usersBySchool=new Map(ids.map(id=>[id,new Set()]));
        for(const m of membersResult.data||[]){
          usersBySchool.get(m.school_id)?.add(m.user_id);
        }
        for(const lesson of sessionsResult.data||[]){
          const userId=lesson.teacher_id||lesson.created_by;
          if(userId)usersBySchool.get(lesson.school_id)?.add(userId);
        }
        const allUserIds=[...new Set([...usersBySchool.values()].flatMap(set=>[...set]))];
        let profiles=[];
        if(allUserIds.length){
          const result=await supabase.from("profiles")
            .select("id,full_name,role,is_active").in("id",allUserIds);
          if(result.error)throw result.error;
          profiles=result.data||[];
        }
        const people=new Map(profiles.filter(p=>p.is_active&&
          ["admin","teacher","staff"].includes(p.role))
          .map(p=>[p.id,p.full_name?.trim()||"Chưa cập nhật họ tên"]));
        const teachers=Object.fromEntries([...usersBySchool.entries()].map(([id,users])=>
          [id,[...users].filter(userId=>people.has(userId))
             .map(userId=>({id:userId,name:people.get(userId)}))
             .sort((a,b)=>a.name.localeCompare(b.name,"vi"))]));
        if(live)setAssignedTeachers(teachers);
      }catch(err){
        if(live){setAssignedTeachers({});setTeacherNamesError(err?.message||"Không tải được giáo viên.");}
      }finally{if(live)setTeacherNamesLoading(false);}
    })();
    return ()=>{live=false;};
  },[role,schools]);
  async function add(e) {
    e.preventDefault();
    setBusy(true);
    const {data,error}=await supabase.rpc("create_my_school",{school_name:name.trim()});
    setBusy(false);
    if(error) ping(error.message); else {setName("");onCreated(data);}
  }
  async function rename(e) {
    e.preventDefault();
    if(!editing)return;
    setBusy(true);
    const {error}=await supabase.rpc("rename_my_school",{p_school_id:editing.id,p_new_name:editing.name.trim()});
    setBusy(false);
    if(error)ping(error.message);else{setEditing(null);ping("Đã đổi tên trường");onChanged?.();}
  }
  async function updateLogo(school,file) {
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>3*1024*1024) {
      ping('Chọn logo PNG, JPG hoặc WebP dưới 3 MB');return;
    }
    setBusy(true);
    try{
      const url=URL.createObjectURL(file);
      const img=new Image();
      try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});}
      finally{URL.revokeObjectURL(url);}
      const size=Math.min(1,180/img.naturalWidth,130/img.naturalHeight);
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.naturalWidth*size));
      canvas.height=Math.max(1,Math.round(img.naturalHeight*size));
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/png');
      if(data.length>220000)throw new Error('Logo vẫn quá lớn. Hãy dùng ảnh ít chi tiết hơn.');
      const {error}=await supabase.rpc('update_my_school_logo',{p_school_id:school.id,p_logo_data:data});
      if(error)throw error;
      ping('Đã cập nhật logo trường');onChanged?.();
    }catch(e){ping(e.message);}finally{setBusy(false);}
  }
  async function clearLogo(school){
    if(!window.confirm('Bỏ logo của trường '+school.name+'?'))return;
    const {error}=await supabase.rpc('update_my_school_logo',{p_school_id:school.id,p_logo_data:null});
    if(error)ping(error.message);else{ping('Đã bỏ logo');onChanged?.();}
  }
  async function remove(e) {
    e.preventDefault();
    if(!deleteTarget || confirmation!==deleteTarget.name)return;
    setBusy(true);
    const {error}=await supabase.rpc("delete_my_school",{p_school_id:deleteTarget.id,p_confirmation:confirmation});
    setBusy(false);
    if(error)ping(error.message);else{const id=deleteTarget.id;setDeleteTarget(null);setConfirmation("");ping("Đã xóa trường và dữ liệu liên quan");onChanged?.(id);}
  }
  return <section className="panel school-manager">
    <h2>Trường công tác</h2>
    <p className="muted">{role==="admin"?
      "Quản lý trường và xem giáo viên đang công tác theo phân công hoặc lịch dạy từng trường. Bạn có thể thêm, sửa, xóa trường; xóa trường sẽ xóa dữ liệu liên quan.":
      "Quản lý trường được phân quyền: thêm, sửa, thay logo hoặc xóa trường. Xóa trường sẽ xóa các dữ liệu liên quan."}</p>
    <div className="table-wrap"><table><thead><tr><th>Tên trường</th><th>{role==="admin"?"Giáo viên công tác":"Logo báo cáo & Excel"}</th><th>Thao tác</th></tr></thead>
      <tbody>{schools.map(s=><tr key={s.id}><td><b>{s.name}</b></td>
        <td>{role==="admin"?
          <div className="school-assigned-teachers">
            {teacherNamesLoading?<span className="muted">Đang tải giáo viên…</span>:
             teacherNamesError?<span className="negative" role="alert">Không tải được danh sách giáo viên.</span>:
             assignedTeachers[s.id]?.length?
               assignedTeachers[s.id].map(t=><span className="school-teacher-name" key={t.id}>{t.name}</span>):
               <span className="muted">Chưa có giáo viên được phân công</span>}
          </div>:
          <div className="school-logo-admin">
            {s.logo_data?<img src={s.logo_data} alt={'Logo '+s.name}/>:<span>Chưa có logo</span>}
            {['teacher','staff'].includes(role)&&<><label className="mini-btn">Thay logo<input type="file" style={{display:'none'}} accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{updateLogo(s,e.target.files?.[0]);e.target.value='';}}/></label>
            {s.logo_data&&<button className="mini-btn" disabled={busy} onClick={()=>clearLogo(s)}>Bỏ logo</button>}</>}
          </div>}</td><td>
        {['admin','teacher','staff'].includes(role)&&<div className="actions"><button className="btn outline" onClick={()=>setEditing({...s})}>Sửa</button><button className="btn outline" onClick={()=>{setDeleteTarget(s);setConfirmation("");}}>Xóa</button></div>}
      </td></tr>)}</tbody></table></div>
    <form className="form-row" onSubmit={add}>
      <label>Tên trường mới<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)} placeholder="Ví dụ: THCS Nguyễn Du" /></label>
      <button className="btn primary" disabled={busy}>{busy?"Đang lưu...":"Thêm trường"}</button>
    </form>
    {editing&&<div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>Sửa tên trường</h3><button className="btn" onClick={()=>setEditing(null)}>Đóng</button></div>
      <form className="form-stack" onSubmit={rename}><label>Tên trường<input required maxLength={200} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><button className="btn primary" disabled={busy}>Lưu thay đổi</button></form>
    </div></div>}
    {deleteTarget&&<div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><h3>Xác minh xóa trường</h3><button className="btn" onClick={()=>setDeleteTarget(null)}>Đóng</button></div>
      <p><b>Hành động không thể hoàn tác.</b> Bạn sẽ xóa toàn bộ lớp, lịch, hồ sơ, điểm danh, điểm và dữ liệu máy của trường <b>{deleteTarget.name}</b>.</p>
      <form className="form-stack" onSubmit={remove}><label>Nhập chính xác tên trường để xác nhận: <b>{deleteTarget.name}</b><input autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></label><button className="btn danger" disabled={busy||confirmation!==deleteTarget.name}>Xóa vĩnh viễn trường</button></form>
    </div></div>}
  </section>;
}

export function Accounts({ profile }) {
  const [rows, setRows] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0),
    [deleteTarget, setDeleteTarget] = useState(null),
    [confirmationEmail, setConfirmationEmail] = useState("");
  async function load() {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,is_active,created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + 49);
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [offset]);
  async function save(row) {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.rpc("admin_update_account", {
        target_id: row.id,
        new_role: row.role,
        active: row.is_active,
        display_name: row.full_name || "",
      });
      if (error) throw error;
      setMessage("Đã cập nhật tài khoản.");
      await load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function removeAccount(e) {
    e.preventDefault();
    if (!deleteTarget || deleteTarget.id === profile.id) return;
    if (deleteTarget.role === "admin") {
      setMessage("Không thể xóa tài khoản Admin. Hãy bàn giao quyền trước.");
      return;
    }
    if (confirmationEmail.trim().toLowerCase() !== deleteTarget.email.trim().toLowerCase()) return;
    setBusy(true);
    setMessage("");
    try {
      const {data, error} = await supabase.functions.invoke("admin-delete-account", {
        body: {
          target_id: deleteTarget.id,
          confirmation_email: confirmationEmail.trim()
        }
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await error.context?.json?.();
          msg = body?.error || msg;
        } catch (_) {}
        throw new Error(msg || "Không thể xóa tài khoản.");
      }
      if (!data?.success) throw new Error(data?.error || "Máy chủ chưa xác nhận xóa tài khoản.");
      setDeleteTarget(null);
      setConfirmationEmail("");
      setMessage("Đã xóa tài khoản đăng nhập. Lịch dạy và dữ liệu học sinh liên quan vẫn được giữ.");
      await load();
    } catch (e) {
      setMessage("Không thể xóa tài khoản: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }
  const change = (id, key, value) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  return (
    <section className="panel">
      <h2>Quản lý tài khoản</h2>
      <p className="muted">
        Duyệt giáo viên, chỉnh tên, cấp quyền, khóa hoặc xóa tài khoản.
        Xóa tài khoản sẽ loại bỏ đăng nhập Supabase; lịch sử học sinh và buổi dạy được giữ nguyên.
      </p>
      <div role="status">{message}</div>
      <input
        aria-label="Tìm tài khoản trong trang"
        placeholder="Tìm email hoặc tên trong trang"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th>Cho phép sử dụng</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) =>
                (r.email + " " + r.full_name)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.email}
                    {r.id === profile.id && " (bạn)"}
                  </td>
                  <td>
                    <input
                      aria-label={"Tên " + r.email}
                      disabled={busy || r.id === profile.id}
                      value={r.full_name || ""}
                      onChange={(e) =>
                        change(r.id, "full_name", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <select
                      aria-label={"Vai trò " + r.email}
                      disabled={busy || r.id === profile.id}
                      value={r.role}
                      onChange={(e) => change(r.id, "role", e.target.value)}
                    >
                      <option value="pending">Chờ duyệt</option>
                      <option value="teacher">Giáo viên</option>
                      <option value="admin">Admin</option>
                      {!["pending", "teacher", "admin"].includes(r.role) && (
                        <option value={r.role}>{r.role}</option>
                      )}
                    </select>
                  </td>
                  <td>
                    <input
                      aria-label={"Kích hoạt " + r.email}
                      type="checkbox"
                      disabled={busy || r.id === profile.id}
                      checked={r.is_active}
                      onChange={(e) =>
                        change(r.id, "is_active", e.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <div className="account-actions">
                      <button
                        className="btn outline"
                        disabled={busy || r.id === profile.id}
                        onClick={() => save(r)}
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        className="btn account-delete-btn"
                        disabled={busy || r.id === profile.id || r.role === "admin"}
                        title={r.role === "admin" ? "Không xóa trực tiếp tài khoản Admin" : r.id === profile.id ? "Không thể tự xóa tài khoản" : "Xóa tài khoản đăng nhập"}
                        onClick={() => { setDeleteTarget(r); setConfirmationEmail(""); setMessage(""); }}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <button
        className="btn outline"
        disabled={busy || !offset}
        onClick={() => setOffset((n) => Math.max(0, n - 50))}
      >
        Trước
      </button>{" "}
      <button
        className="btn outline"
        disabled={busy || rows.length < 50}
        onClick={() => setOffset((n) => n + 50)}
      >
        Sau
      </button>{" "}
      <button className="btn outline" disabled={busy} onClick={load}>
        Làm mới
      </button>
      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal account-delete-modal" role="dialog" aria-modal="true" aria-labelledby="account-delete-title">
            <div className="modal-head">
              <h3 id="account-delete-title">Xác minh xóa tài khoản</h3>
              <button type="button" className="btn outline" disabled={busy} onClick={() => setDeleteTarget(null)}>Đóng</button>
            </div>
            <p>Bạn sắp xóa tài khoản <b>{deleteTarget.full_name || "Chưa đặt tên"}</b>.</p>
            <p className="muted">Email: <strong>{deleteTarget.email}</strong></p>
            <p className="account-delete-warning">Tài khoản này sẽ không thể đăng nhập nữa. Đây là thao tác vĩnh viễn, nhưng các dữ liệu lớp học, học sinh và lịch dạy cũ vẫn được giữ lại. Nếu chỉ muốn tạm dừng sử dụng, hãy bỏ chọn “Cho phép sử dụng” thay vì xóa.</p>
            <form className="form-stack" onSubmit={removeAccount}>
              <label>Nhập chính xác email để xác nhận xóa
                <input
                  type="email"
                  autoComplete="off"
                  required
                  placeholder={deleteTarget.email}
                  value={confirmationEmail}
                  disabled={busy}
                  onChange={e => setConfirmationEmail(e.target.value)}
                />
              </label>
              <button type="submit" className="btn account-confirm-delete" disabled={busy || confirmationEmail.trim().toLowerCase() !== deleteTarget.email.trim().toLowerCase()}>
                {busy ? "Đang xóa…" : "Xóa tài khoản vĩnh viễn"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
const initialMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export {TimetableImport} from "./TimetableAssistant";
