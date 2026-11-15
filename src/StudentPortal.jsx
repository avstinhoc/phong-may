import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
const stateLabel={available:'Sẵn sàng',occupied:'Đang sử dụng',broken:'Hỏng',maintenance:'Bảo trì'};
const typeLabel={point:'Điểm',reward:'Khen thưởng',violation:'Vi phạm'};
export function StudentPortal(){
  const [code,setCode]=useState(()=>new URLSearchParams(window.location.search).get('code')||'');
  const [secret,setSecret]=useState('');
  const [payload,setPayload]=useState(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function load(nextCode=code,nextSecret=secret){
    setBusy(true);setError('');
    const {data,error:err}=await supabase.rpc('get_student_class_portal',{
      p_code:nextCode.trim().toUpperCase(),p_secret:nextSecret.trim()||null});
    setBusy(false);
    if(err){setPayload(null);setError(err.message);}
    else setPayload(data);
  }
  useEffect(()=>{if(code)load(code,'');},[]);
  const student=payload?.student;
  const scores=student?.scores?.scores||{};
  return <div className="student-portal">
    <header className="portal-header"><div className="brand-mark">IC3</div><div><b>IC3 GS6 · Cổng học sinh</b><small>Thông tin lớp, phòng máy và kết quả học tập</small></div></header>
    <main className="portal-content">
      <section className="panel">
        <h2>Xem thông tin lớp học</h2>
        <form className="form-stack" onSubmit={e=>{e.preventDefault();load();}}>
          <label>Mã lớp do giáo viên cung cấp<input required value={code} onChange={e=>setCode(e.target.value)} placeholder="Ví dụ: IC3-K01" /></label>
          <label>Mã cá nhân để xem điểm, thưởng và tên người ngồi máy<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="Nhập mã riêng do giáo viên cấp (không bắt buộc)"/></label>
          <button className="btn primary" disabled={busy}>{busy?'Đang tải...':'Xem thông tin'}</button>
        </form>
        {error&&<p role="alert" className="notice-box">{error}</p>}
        <p className="muted">Mã lớp xem được trạng thái máy; mã cá nhân mở thêm tên bạn cùng lớp, điểm và khen thưởng của chính bạn. Không chia sẻ mã cá nhân cho người khác.</p>
      </section>
      {payload&&<>
        <section className="panel">
          <h2>{payload.school} · Lớp {payload.class_name}</h2>
          <p className="muted">{payload.computers?.length||0} máy trong trường. Danh sách chỗ ngồi hiển thị theo lớp đang xem.</p>
          <div className="portal-pcs">
            {(payload.computers||[]).map(c=><article className="portal-pc" key={c.computer}>
              <div className="portal-pc-head"><b>{c.computer}</b><span className={c.status==='broken'||c.status==='maintenance'?'portal-bad':'portal-good'}>{stateLabel[c.status]||c.status}</span></div>
              <p>{c.occupied}/{c.capacity} học sinh lớp này</p>
              {student&&<small>{(c.students||[]).join(', ')||'Chưa có học sinh'}</small>}
            </article>)}
          </div>
        </section>
        <section className="panel">
          <h3>Lịch học của lớp</h3>
          <div className="table-wrap"><table><thead><tr><th>Ngày</th><th>Giờ</th><th>Số tiết</th></tr></thead>
            <tbody>{(payload.schedule||[]).map((s,i)=><tr key={i}><td>{s.date}</td><td>{String(s.start||'').slice(0,5)} – {String(s.end||'').slice(0,5)}</td><td>{s.periods}</td></tr>)}</tbody></table></div>
          {!payload.schedule?.length&&<p className="muted">Chưa có lịch học sắp tới.</p>}
        </section>
        {student&&<>
          <section className="panel">
            <h2>Kết quả của {student.name}</h2>
            <p className="muted">Mã học sinh: {student.student_code||'Chưa có'}</p>
            <div className="portal-metrics"><div><small>Xếp loại</small><b>{student.scores?.classification||'Chưa có'}</b></div><div><small>Kết quả thi</small><b>{student.scores?.exam_result||'Chưa có'}</b></div><div><small>Đạt chuẩn</small><b>{student.scores?.standard_met?'Đạt':'Chưa ghi nhận'}</b></div></div>
            <h3>Điểm kiểm tra</h3>
            <div className="portal-scores">{Object.entries(scores).map(([name,value])=><div key={name}><small>{name}</small><b>{value===''?'—':value}</b></div>)}</div>
            <p>{student.scores?.comment||'Chưa có nhận xét của giáo viên.'}</p>
          </section>
          <section className="panel">
            <h3>Điểm, thưởng và ghi nhận</h3>
            {(student.records||[]).map((r,i)=><div className="portal-record" key={i}><div><b>{typeLabel[r.type]||r.type}: {r.title}</b><small>{r.date}</small></div><strong>{r.points} điểm</strong></div>)}
            {!student.records?.length&&<p className="muted">Chưa có ghi nhận.</p>}
            <h3>Điểm danh</h3>
            <p className="muted">Có mặt là mặc định; những buổi vắng/trễ/có phép sẽ xuất hiện trong bảng ghi nhận.</p>
            {(student.attendance||[]).map((r,i)=><p key={i}>{r.session_date}: {r.status==='absent'?'Vắng':r.status==='late'?'Đi trễ':r.status==='excused'?'Có phép':'Có mặt'}</p>)}
          </section>
        </>}
      </>}
    </main>
  </div>;
}
