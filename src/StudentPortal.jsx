import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';
const stateLabel={available:'Sẵn sàng',occupied:'Đang sử dụng',broken:'Hỏng',maintenance:'Bảo trì'};
const typeLabel={point:'Điểm',reward:'Thưởng',violation:'Vi phạm'};
const date=s=>s?s.split('-').reverse().join('/'):'';
export function StudentPortal(){
  const [code,setCode]=useState(()=>new URLSearchParams(window.location.search).get('code')||'');
  const [secret,setSecret]=useState('');
  const [payload,setPayload]=useState(null);
  const [violationBadges,setViolationBadges]=useState([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function load(nextCode=code,nextSecret=secret){
    setBusy(true);setError('');
    let normalizedCode=nextCode.trim().toUpperCase();
    const resolved=await supabase.rpc('ic3_resolve_class_code',{p_code:normalizedCode});
    if(resolved.error||!resolved.data){
      setPayload(null);setViolationBadges([]);setBusy(false);
      setError('Mã lớp chưa tồn tại hoặc đã ngừng đăng ký.');
      return;
    }
    normalizedCode=resolved.data;
    setCode(normalizedCode);
    const [main,badges]=await Promise.all([
      supabase.rpc('get_student_class_portal',{
        p_code:normalizedCode,p_secret:nextSecret.trim()||null}),
      supabase.rpc('get_class_violation_badges',{p_code:normalizedCode})
    ]);
    setBusy(false);
    if(main.error){setPayload(null);setViolationBadges([]);setError(main.error.message);}
    else{setPayload(main.data);setViolationBadges(Array.isArray(badges.data)?badges.data:[]);}

  }
  useEffect(()=>{if(code)load(code,'');},[]);
  const student=payload?.student;
  const scores=student?.scores?.scores||{};
  const machines=payload?.computers||[];
  const counts=useMemo(()=>({
    total:machines.length,
    available:machines.filter(m=>m.status==='available'||m.status==='occupied').length,
    broken:machines.filter(m=>m.status==='broken'||m.status==='maintenance').length,
    occupied:machines.reduce((n,m)=>n+Number(m.occupied||0),0),
    waiting:machines.reduce((n,m)=>n+(m.cleaning||[]).filter(x=>x.status!=='done').length,0)
  }),[payload]);
  return <div className="student-portal">
    <header className="portal-header">
      {payload?.logo?<img className="portal-logo" src={payload.logo} alt="Logo trường"/>:<div className="brand-mark">IC3</div>}
      <div><b>IC3 GS6 · Lớp học của chúng mình</b><small>Máy tính • Lịch dạy • Vệ sinh • Điểm & phần thưởng</small></div>
      <span className="portal-header-hint">Lớp học · Thông tin & kết quả</span>
    </header>
    <main className="portal-content">
      <section className="portal-hero">
        <div><span className="portal-eyebrow">CỔNG THÔNG TIN HỌC SINH</span>
          <h1>{payload?`Xin chào lớp ${payload.class_name}! ✨`:'Chào mừng đến với lớp IC3 GS6! ✨'}</h1>
          <p>{payload?`Trường ${payload.school} · Cùng xem lớp mình hôm nay có gì mới nhé.`:'Nhập mã lớp giáo viên cấp để xem máy tính, bạn cùng lớp và lịch vệ sinh.'}</p>
          <a className="portal-hero-register" href={code?'/register?code='+encodeURIComponent(code):'/register'}>
            <span className="portal-register-icon" aria-hidden="true">✍️</span>
            <span><strong>ĐĂNG KÝ LỚP</strong><small>Thêm bạn mới vào lớp ngay</small></span>
            <span className="portal-register-arrow" aria-hidden="true">→</span>
          </a>
        </div>
        <div className="portal-hero-art" aria-hidden="true">💻<span>🌟</span></div>
      </section>
      <section className="panel portal-search">
        <h3>Tra cứu lớp và kết quả</h3>
        <form className="portal-form" onSubmit={e=>{e.preventDefault();load();}}>
          <label>Mã lớp<input required value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Nhập mã lớp" autoComplete="off"/></label>
          <label>Mã xem điểm cá nhân (nếu có)<input type="text" inputMode="text" maxLength={48} autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value.toUpperCase())} placeholder="Ví dụ: ABCD-EFGH-JKLM"/></label>
          <button className="btn primary" disabled={busy}>{busy?'Đang tra cứu…':'Xem lớp của mình'}</button>
        </form>
        {error&&<p role="alert" className="notice-box">{error}</p>}
        {payload&&secret.trim()&&!student&&<p className="notice-box">Mã cá nhân chưa đúng hoặc chưa được giáo viên cấp. Bạn vẫn xem được thông tin chung của lớp.</p>}
        <p className="muted">Tên các bạn trên máy hiển thị ngắn gọn theo mã lớp. Mã xem điểm chỉ dùng cho bạn, không nên chia sẻ công khai.</p>
      </section>
      {payload&&<>
        <div className="portal-metrics portal-overview">
          <div><small>Máy trong trường</small><b>{counts.total}</b><span>🖥️</span></div>
          <div><small>Máy sẵn sàng</small><b>{counts.available}</b><span>✅</span></div>
          <div><small>Máy cần sửa</small><b>{counts.broken}</b><span>🛠️</span></div>
          <div><small>Vị trí lớp mình</small><b>{counts.occupied}</b><span>👨‍🎓</span></div>
        </div>
        <section className="panel">
          <div className="portal-section-title"><div><h2>💻 Sơ đồ máy tính lớp {payload.class_name}</h2><p className="muted">Xem bạn nào đang ngồi máy nào và việc vệ sinh cần làm.</p></div><span className="portal-mini-pill">{counts.waiting} việc vệ sinh chưa xong</span></div>
          <div className="portal-pcs">
            {machines.map(c=><article className={'portal-pc '+((c.status==='broken'||c.status==='maintenance')?'pc-broken':'')} key={c.computer}>
              <div className="portal-pc-head"><b>🖥 {c.computer}</b><span className={c.status==='broken'||c.status==='maintenance'?'portal-bad':'portal-good'}>{stateLabel[c.status]||c.status}</span></div>
              <p>{c.occupied}/{c.capacity} học sinh lớp mình</p>
              {(() => {
                const incident=violationBadges.find(v=>v.computer===c.computer);
                const count=Number(incident?.violations||0);
                return count>0?<div className="portal-violation-summary">
                  <span className="pc-violation-badge">{count} lỗi</span>
                  {incident?.["biên_bản"]&&<span className="incident-confirmed">Đã có biên bản</span>}
                </div>:null;
              })()}
              <div className="portal-names"><strong>👩‍💻 Bạn ngồi máy:</strong>
                {(c.students||[]).length?<div>{c.students.map((name,i)=><span key={i}>{name}</span>)}</div>:<small>Chưa có bạn nào</small>}
              </div>
              <div className="portal-cleaning">
                <strong>🧹 Lịch vệ sinh</strong>
                {(c.cleaning||[]).length?<ul>{c.cleaning.slice(0,3).map((l,i)=><li key={i}><b>{date(l.date)}</b> · {l.student} <span className={l.status==='done'?'done':'pending'}>{l.status==='done'?'✓ Đã làm':'Chưa làm'}</span></li>)}</ul>:<small>Chưa được phân công</small>}
              </div>
            </article>)}
          </div>
        </section>
        <section className="panel">
          <div className="portal-section-title"><div><h2>📅 Lịch học sắp tới</h2><p className="muted">Ngày học, giờ vào lớp và số tiết của lớp mình.</p></div></div>
          <div className="table-wrap"><table><thead><tr><th>Ngày học</th><th>Giờ học</th><th>Số tiết</th></tr></thead><tbody>
          {(payload.schedule||[]).map((s,i)=><tr key={i}><td><b>{date(s.date)}</b></td><td>{String(s.start||'').slice(0,5)} – {String(s.end||'').slice(0,5)}</td><td>{s.periods}</td></tr>)}
          </tbody></table></div>
          {!payload.schedule?.length&&<p className="muted">Giáo viên chưa có lịch học được công bố.</p>}
        </section>
        {student&&<>
          <section className="panel">
            <h2>🏅 Góc kết quả của {student.name}</h2>
            <p className="muted">Mã học sinh: {student.student_code||'Chưa có'}</p>
            <div className="portal-metrics"><div><small>Xếp loại</small><b>{student.scores?.classification||'Chưa có'}</b></div><div><small>Kết quả thi</small><b>{student.scores?.exam_result||'Chưa có'}</b></div><div><small>Đạt chuẩn</small><b>{student.scores?.standard_met?'Đạt':'Chưa ghi nhận'}</b></div></div>
            <h3>Điểm kiểm tra</h3>
            <div className="portal-scores">{Object.entries(scores).map(([name,value])=><div key={name}><small>{name}</small><b>{value===''?'—':value}</b></div>)}</div>
            <p>{student.scores?.comment||'Chưa có nhận xét của giáo viên.'}</p>
          </section>
          <section className="panel">
            <h3>🎁 Điểm thưởng và ghi nhận</h3>
            {(student.records||[]).map((r,i)=><div className="portal-record" key={i}><div><b>{typeLabel[r.type]||r.type}: {r.title}</b><small>{date(r.date)}</small></div><strong>{r.points} điểm</strong></div>)}
            {!student.records?.length&&<p className="muted">Chưa có ghi nhận.</p>}
            <h3>Điểm danh của mình</h3>
            {(student.attendance||[]).map((r,i)=><p key={i}>{date(r.session_date)}: {r.status==='absent'?'Vắng':r.status==='late'?'Đi trễ':r.status==='excused'?'Có phép':'Có mặt'}</p>)}
          </section>
        </>}
      </>}
      <footer className="portal-footer">IC3 GS6 · Học Tin học thật vui 🌟</footer>
    </main>
  </div>;
}
