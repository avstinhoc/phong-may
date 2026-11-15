import React from 'react';
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dtext=s=>new Date(s+'T12:00:00').toLocaleDateString('vi-VN');
const weekday=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ nhật'];
function atTime(r){return String(r.start_time||'').slice(0,5);}
function groupName(time){return time<'12:00'?'Sáng':time<'18:00'?'Chiều':'Tối';}
export function TeachingCalendar({rows=[],focusDate,onDateChange,school,teacher}){
 const focus=new Date((focusDate||key(new Date()))+'T12:00:00');
 const monday=new Date(focus);monday.setDate(focus.getDate()-(focus.getDay()+6)%7);
 const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});
 const start=key(days[0]),end=key(days[6]);
 const visible=rows.filter(r=>r.session_date>=start&&r.session_date<=end)
   .sort((a,b)=>a.session_date.localeCompare(b.session_date)||atTime(a).localeCompare(atTime(b)));
 const move=n=>{const d=new Date(monday);d.setDate(monday.getDate()+7*n);onDateChange(key(d));};
 return <section className="panel teaching-calendar flexible-calendar">
  <div className="section-head">
   <div><h2>Thời khóa biểu theo giờ thực tế</h2><p>{school} · {teacher} · {dtext(start)} – {dtext(end)}</p></div>
   <div className="actions">
    <button className="btn" aria-label="Tuần trước" onClick={()=>move(-1)}>‹</button>
    <button className="btn" onClick={()=>onDateChange(key(new Date()))}>Tuần này</button>
    <button className="btn" aria-label="Tuần sau" onClick={()=>move(1)}>›</button>
   </div>
  </div>
  <label className="field-inline">Chọn một ngày bất kỳ trong tuần <input type="date" style={{width:175}} value={focusDate} onChange={e=>e.target.value&&onDateChange(e.target.value)}/></label>
  <div className="calendar-days" role="group" aria-label="Lịch học theo bảy ngày trong tuần">
   {days.map((d,i)=>{const date=key(d),sessions=visible.filter(r=>r.session_date===date);
    return <article key={date} className={'calendar-day '+(date===key(new Date())?'today':'')}>
     <header><strong>{weekday[i]}</strong><span>{d.getDate()}/{d.getMonth()+1}</span><small>{sessions.length} buổi</small></header>
     <div className="calendar-lesson-stack">
      {sessions.map(r=><div key={r.id||date+'-'+atTime(r)+'-'+r.class_name} className={'calendar-lesson '+(atTime(r)<'12:00'?'am':atTime(r)<'18:00'?'pm':'night')}>
       <div className="lesson-time">{atTime(r)} – {String(r.end_time||'').slice(0,5)}</div>
       <b>{r.class_name}</b><small>{groupName(atTime(r))} · {r.period_count||1} tiết</small>
       {r.teacher_name&&r.teacher_name!==teacher&&<small>GV: {r.teacher_name}</small>}
      </div>)}
      {!sessions.length&&<span className="calendar-empty">Không có lịch</span>}
     </div>
    </article>;
   })}
  </div>
  <p className="muted">Mỗi ngày hiển thị chính xác giờ bắt đầu – kết thúc đã lưu. Không thêm tiết trống hoặc dùng chung khung giờ giữa các trường.</p>
 </section>;
}
