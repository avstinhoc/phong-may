import { readLocalTimetable } from "./lib/ocr";
import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { validateRows, repeatRows } from "./lib/timetable";

export function SchoolManager({ schools, onCreated, onChanged, ping, role }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
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
    <p className="muted">Quản lý nhiều trường độc lập. Xóa trường sẽ xóa cả lớp, lịch, học sinh, điểm danh và dữ liệu liên quan của trường đó.</p>
    <div className="table-wrap"><table><thead><tr><th>Tên trường</th><th>Thao tác</th></tr></thead>
      <tbody>{schools.map(s=><tr key={s.id}><td><b>{s.name}</b></td><td>
        {role==="admin"&&<div className="actions"><button className="btn outline" onClick={()=>setEditing({...s})}>Sửa</button><button className="btn outline" onClick={()=>{setDeleteTarget(s);setConfirmation("");}}>Xóa</button></div>}
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
    [offset, setOffset] = useState(0);
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
  const change = (id, key, value) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  return (
    <section className="panel">
      <h2>Quản lý tài khoản</h2>
      <p className="muted">
        Duyệt giáo viên, chỉnh tên, cấp quyền và khóa quyền sử dụng. Khóa sẽ
        chặn truy cập dữ liệu kể cả với phiên đang đăng nhập.
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
                    <button
                      className="btn outline"
                      disabled={busy || r.id === profile.id}
                      onClick={() => save(r)}
                    >
                      Lưu
                    </button>
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
    </section>
  );
}
const initialMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function TimetableImport({ profile, reload, onImported }) {
  const [file, setFile] = useState(null),
    [preview, setPreview] = useState(""),
    [week, setWeek] = useState(initialMonday),
    [weeks, setWeeks] = useState(1),
    [rows, setRows] = useState([]),
    [warnings, setWarnings] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false),
    [ocrMode,setOcrMode] = useState("gemini"),
    [ocrText,setOcrText] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function read() {
    setBusy(true);
    setMessage("");
    setRows([]);
    setWarnings([]);
    try {
      if (
        !file ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 3 * 1024 * 1024
      )
        throw new Error("Chọn ảnh JPG, PNG hoặc WebP tối đa 3 MB.");
      if (!week || new Date(week + "T12:00:00").getDay() !== 1)
        throw new Error("Chọn ngày thứ Hai của tuần áp dụng.");
      if (ocrMode === "local") {
        const result=await readLocalTimetable(file,week,profile.school_name,setMessage);
        setRows(result.rows);setWarnings(result.warnings);setOcrText(result.text);
        setMessage(result.rows.length ? `Đã nhận diện ${result.rows.length} buổi. Kiểm tra trước khi lưu.` : "Đã đọc văn bản, cần kiểm tra và nhập các dòng lịch bên dưới.");
        return;
      }
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token || ""}`,
        },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
          weekStart: week,
          schoolName: profile.school_name,
        }),
      });
      const result = await response.json().catch(() => {
        throw new Error(
          "API đọc ảnh chưa chạy. Trên máy dùng vercel dev; trên Vercel kiểm tra cấu hình API.",
        );
      });
      if (!response.ok) throw new Error(result.error || "Không đọc được ảnh.");
      setRows(result.rows);
      setWarnings(result.warnings || []);
      setMessage(
        result.rows.length
          ? "Đã đọc ảnh. Kiểm tra và sửa bảng trước khi lưu."
          : "Không nhận diện được buổi học. Thử ảnh rõ hơn hoặc thêm dòng thủ công.",
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const items = repeatRows(validateRows(rows), weeks);
      const { data, error } = await supabase.rpc("import_timetable", { items });
      if (error) throw error;
      await onImported?.(items[0].session_date,items[0].school_name);
      setRows([]);
      setMessage(
        `Đã tạo ${data.created} buổi; bỏ qua ${data.skipped} buổi đã có.`,
      );
      reload();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  const change = (i, k, v) =>
    setRows((rs) => rs.map((r, j) => (i === j ? { ...r, [k]: v } : r)));
  return (
    <details className="panel">
      <summary>Nhập thời khóa biểu từ ảnh</summary>
      <p>
        Chọn ảnh → đọc lịch → kiểm tra → lưu. Trường và lớp chưa có sẽ được tạo
        cùng lịch dạy.
      </p>
      <div className="form-row">
        <label>
          Ảnh thời khóa biểu
          <input
            disabled={busy}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setRows([]);
              setWarnings([]);
            }}
          />
        </label>
        <label>
          Thứ Hai của tuần áp dụng
          <input
            disabled={busy}
            type="date"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
        </label>
      </div>
      {preview && (
        <img
          src={preview}
          alt="Ảnh thời khóa biểu cần đọc"
          style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }}
        />
      )}
      <label className="field-inline">Cách đọc ảnh <select value={ocrMode} disabled={busy} onChange={e=>setOcrMode(e.target.value)}><option value="local">Đọc trên thiết bị · không cần API key</option><option value="gemini">Google Gemini · cần cấu hình</option></select></label>
      <p className="muted">Đọc trên thiết bị hỗ trợ bảng có cột thứ và giờ bắt đầu/kết thúc. Ảnh được xử lý trong trình duyệt; lần đầu cần tải bộ nhận diện.</p>
      {ocrMode === "gemini" && <label className="consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        Tôi đồng ý gửi ảnh này tới Google Gemini để nhận diện lịch.
      </label>}
      <button
        className="btn primary"
        disabled={busy || !file || (ocrMode === "gemini" && !consent)}
        onClick={read}
      >
        {busy ? "Đang xử lý..." : "Đọc ảnh"}
      </button>
      <div role="status" aria-live="polite" className="notice-box">
        {message ||
          "Nếu ảnh chỉ ghi tiết học mà không có giờ, hãy điền giờ trong bảng kết quả."}
      </div>
      {ocrText && <details><summary>Văn bản đã đọc từ ảnh</summary><pre style={{whiteSpace:"pre-wrap"}}>{ocrText}</pre></details>}
      {warnings.map((w, i) => (
        <p key={i} className="notice-box">
          {w}
        </p>
      ))}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Trường</th>
              <th>Lớp</th>
              <th>Ngày</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Số tiết</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {[
                  ["school_name", "text"],
                  ["class_name", "text"],
                  ["session_date", "date"],
                  ["start_time", "time"],
                  ["end_time", "time"],
                  ["period_count", "number"],
                ].map(([key, type]) => (
                  <td key={key}>
                    <input
                      aria-label={`${key} dòng ${i + 1}`}
                      disabled={busy}
                      type={type}
                      value={r[key] ?? ""}
                      onChange={(e) => change(i, key, e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <button
                    className="btn outline"
                    disabled={busy}
                    onClick={() =>
                      setRows((rs) => rs.filter((_, j) => j !== i))
                    }
                  >
                    Bỏ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="btn outline"
        disabled={busy}
        onClick={() =>
          setRows((rs) => [
            ...rs,
            {
              school_name: profile.school_name,
              class_name: "",
              session_date: week,
              start_time: "",
              end_time: "",
              period_count: 1,
            },
          ])
        }
      >
        Thêm dòng thủ công
      </button>
      {rows.length > 0 && (
        <>
          <label>
            Lặp lại mỗi tuần (tính cả tuần đầu)
            <input
              disabled={busy}
              type="number"
              min="1"
              max="16"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
            />
          </label>
          <p>
            Tổng dự kiến: {rows.length * Number(weeks) || 0} buổi. Đơn giá mặc
            định 0; có thể chỉnh sau.
          </p>
          <button className="btn primary" disabled={busy} onClick={save}>
            Xác nhận lưu trường, lớp và lịch
          </button>
        </>
      )}
    </details>
  );
}
