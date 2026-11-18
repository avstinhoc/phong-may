import React,{useEffect,useMemo,useState} from 'react';
import {flameEffect} from './lib/stars';
import {FlameBadge} from './FlameBadge';
import {supabase} from './lib/supabase';
const stateLabel={available:'Sẵn sàng',occupied:'Đang sử dụng',broken:'Hỏng',maintenance:'Bảo trì'};
const typeLabel={point:'Điểm',reward:'Thưởng',violation:'Vi phạm'};
const date=s=>s?s.split('-').reverse().join('/'):'';
const seatKey=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi').trim().replace(/\s+/g,' ');
export function StudentPortal(){
  const [code,setCode]=useState(()=>new URLSearchParams(window.location.search).get('code')||'');
  const [seat,setSeat]=useState('');
  const [highlight,setHighlight]=useState('');
  const [seatMessage,setSeatMessage]=useState('');
  const [secret,setSecret]=useState('');
  const [payload,setPayload]=useState(null);
  const [violationBadges,setViolationBadges]=useState([]);
  const [starBoard,setStarBoard]=useState([]);
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
    const [main,badges,stars,flames]=await Promise.all([
      supabase.rpc('get_student_class_portal',{
        p_code:normalizedCode,p_secret:nextSecret.trim()||null}),
      supabase.rpc('get_class_violation_badges',{p_code:normalizedCode}),
       supabase.rpc('ic3_class_stars',{p_code:normalizedCode}),
       supabase.rpc('ic3_class_flame_status',{p_code:normalizedCode})
    ]);
    setBusy(false);
    if(main.error){setPayload(null);setViolationBadges([]);setError(main.error.message);}
    else{setPayload(main.data);setViolationBadges(Array.isArray(badges.data)?badges.data:[]);
      const flameMap=new Map((flames.data||[]).map(item=>[item.student_id,item]));
       setStarBoard((Array.isArray(stars.data)?stars.data:[]).map(item=>({...item,...(flameMap.get(item.student_id)||{})})));}

  }
  useEffect(()=>{if(code)load(code,'');},[]);
  const student=payload?.student;
  const scores=student?.scores?.scores||{};
  const machines=payload?.computers||[];
  const ranked=[...starBoard].sort((a,b)=>Number(b.earned)-Number(a.earned||0)||Number(b.available)-Number(a.available||0));
  const fireForMachine=c=>{
    const residents=starBoard.filter(st=>st.computer===c.computer);
    return residents.map(st=>flameEffect(st)).filter(fx=>fx.visible)
      .sort((a,b)=>a.tier-b.tier||(['gray','cooling','active'].indexOf(a.state)-['gray','cooling','active'].indexOf(b.state))).at(-1);
  };
  function locateSeat(e){
    e.preventDefault();
    const key=value=>seatKey(value).replace(/^(pc|máy|may)\s*/,'').replace(/^0+(?=\d)/,'');
    const matches=machines.filter(m=>key(m.computer)===key(seat));
    const machine=matches.length===1?matches[0]:null;
    setHighlight(machine?.computer||'');
    setSeatMessage(machine?(machine.students||[]).join(', ')||'Máy đang trống.':'Chưa tìm thấy máy trong lớp.');
    if(machine){
      const card=document.getElementById('seat-'+machine.computer);
      card?.focus({preventScroll:true});
      card?.scrollIntoView({behavior:'smooth',block:'center'});
    }
  }
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
      <section className="panel portal-search portal-search-compact">
        <div className="portal-search-heading">
          <div><h3>📍 {payload?'Tìm nhanh vị trí máy':'Mở lớp học'}</h3>
            <p className="muted">{payload?'Nhập PC1, PC01 hoặc số 1 để tới ngay ô máy.':'Nhập mã lớp được giáo viên cấp để bắt đầu.'}</p></div>
          {busy&&<span className="portal-search-spinner">Đang tải dữ liệu…</span>}
        </div>
        {payload&&<form className="seat-search portal-seat-inline" onSubmit={locateSeat}>
          <label className="portal-seat-label">Số máy / vị trí
            <input required value={seat} onChange={e=>setSeat(e.target.value)} placeholder="Ví dụ: PC02"/></label>
          <button className="btn primary">🔎 Tìm máy</button>
          {seatMessage&&<output role="status">{seatMessage}</output>}
        </form>}
        {!payload&&<form className="portal-form" onSubmit={e=>{e.preventDefault();load();}}>
          <label>Mã lớp<input required value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Nhập mã lớp" autoComplete="off"/></label>
          <button className="btn primary" disabled={busy}>{busy?'Đang mở…':'Mở lớp'}</button></form>}
        {payload&&<details className="portal-private-lookup">
          <summary><span>🔐 Tra cứu kết quả cá nhân</span><small>Chỉ mở khi có mã xem điểm riêng</small></summary>
          <form className="portal-form portal-form--private" onSubmit={e=>{e.preventDefault();load();}}>
            <label>Mã xem điểm cá nhân<input type="text" inputMode="text" maxLength={48} autoComplete="off"
              value={secret} onChange={e=>setSecret(e.target.value.toUpperCase())} placeholder="Ví dụ: ABCD-EFGH-JKLM"/></label>
            <button className="btn primary" disabled={busy}>{busy?'Đang tra cứu…':'Xem kết quả cá nhân'}</button>
          </form>
          <p className="muted">Mã xem điểm chỉ dùng cho bản thân, không chia sẻ công khai.</p>
          {secret.trim()&&!student&&<p className="notice-box">Mã cá nhân chưa đúng hoặc chưa được giáo viên cấp.</p>}
        </details>}
        {error&&<p role="alert" className="notice-box">{error}</p>}
      </section>
      {payload&&<>
        <div className="portal-metrics portal-overview">
          <div><small>Máy trong trường</small><b>{counts.total}</b><span>🖥️</span></div>
          <div><small>Máy sẵn sàng</small><b>{counts.available}</b><span>✅</span></div>
          <div><small>Máy cần sửa</small><b>{counts.broken}</b><span>🛠️</span></div>
          <div><small>Vị trí lớp mình</small><b>{counts.occupied}</b><span>👨‍🎓</span></div>
        </div>
        <details className="panel portal-star-leaderboard portal-star-collapsible">
          <summary className="portal-rank-summary">
            <span>🏆 Bảng xếp hạng sao · Lớp {payload.class_name}</span>
            <small>{ranked[0]&&Number(ranked[0].earned)>0
              ?'🥇 '+ranked[0].student_name+' · '+ranked[0].earned+' sao đã kiếm'
              :'Khám phá những ngôi sao của lớp'}</small>
            <span className="portal-rank-arrow" aria-hidden="true">⌄</span>
          </summary>
          <p className="muted">Tổng sao kiếm được dùng để xếp hạng; sao hiện có để đổi quà. Giữ chuỗi để nâng cấp lửa và khung máy.</p>
          <div className="portal-star-grid">
            {ranked.filter(st=>Number(st.earned)>0).slice(0,12).map((st,i)=>{
              const fx=flameEffect(st);
              return <div key={st.student_id}
                style={fx.style} className={'portal-star-rank '+(fx.visible?fx.className:'')}>
                <span>{i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</span>
                <b>{st.student_name} <FlameBadge wallet={st} compact/></b>
                <span>⭐ {st.earned} đã kiếm · {st.available} hiện có</span>
              </div>;
            })}
            {!ranked.some(st=>Number(st.earned)>0)&&<p className="muted">Chưa có sao thưởng. Cùng cố gắng nhé! ✨</p>}
          </div>
        </details>
        <section className="panel">
          <div className="portal-section-title"><div><h2>💻 Sơ đồ máy tính lớp {payload.class_name}</h2><p className="muted">Xem bạn nào đang ngồi máy nào và việc vệ sinh cần làm.</p></div><span className="portal-mini-pill">{counts.waiting} việc vệ sinh chưa xong</span></div>
          <div className="portal-pcs">
            {machines.map(c=>{const fx=fireForMachine(c);return <article id={'seat-'+c.computer} tabIndex={-1}
              style={fx?.style} className={'portal-pc '+(highlight===c.computer?'seat-found ':'')+
                ((c.status==='broken'||c.status==='maintenance')?'pc-broken ':'')+(fx?.className||'')} key={c.computer}>
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
                {(c.students||[]).length?<div>{(()=>{
                  const seated=starBoard.filter(st=>st.computer===c.computer);
                  if(seated.length!==(c.students||[]).length)return c.students.map((name,i)=><span key={i}>{name}</span>);
                  return seated.map(st=><span key={st.student_id} className="portal-pupil-pill">
                    {st.student_name} · ⭐ {st.available} <FlameBadge wallet={st} compact/>
                  </span>);
                })()}</div>:<small>Chưa có bạn nào</small>}
              </div>
              <div className="portal-cleaning">
                <strong>🧹 Lịch vệ sinh</strong>
                {(c.cleaning||[]).length?<ul>{c.cleaning.slice(0,3).map((l,i)=><li key={i}><b>{date(l.date)}</b> · {l.student} <span className={l.status==='done'?'done':'pending'}>{l.status==='done'?'✓ Đã làm':'Chưa làm'}</span></li>)}</ul>:<small>Chưa được phân công</small>}
              </div>
            </article>;})}
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
      <div className="portal-floating-actions" role="group" aria-label="Điều hướng trang lớp">
        <button className="portal-float-action" type="button" aria-label="Tải lại dữ liệu lớp" title="Tải lại dữ liệu lớp"
          disabled={busy} onClick={()=>load()}>{busy?'…':'↻'}</button>
        <button className="portal-float-action" type="button" aria-label="Về đầu trang" title="Về đầu trang"
          onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>↑</button>
      </div>
      <footer className="portal-footer">IC3 GS6 · Học Tin học thật vui 🌟</footer>
    </main>
  </div>;
}
