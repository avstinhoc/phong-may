import React from 'react';
import {slotGroups,timeValue} from './lib/calendarSlots';
const key=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dtext=s=>new Date(s+'T12:00:00').toLocaleDateString('vi-VN');
const weekday=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ nhật'];
const endTime=row=>String(row.end_time||'').slice(0,5);
export function TeachingCalendar({rows=[],focusDate,onDateChange,school,teacher,onLessonSelect=null,selectedLessonId=''}){
 const focus=new Date((focusDate||key(new Date()))+'T12:00:00');
 const monday=new Date(focus);monday.setDate(focus.getDate()-(focus.getDay()+6)%7);
 const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});
 const start=key(days[0]),end=key(days[6]);
 const visible=rows.filter(r=>r.session_date>=start&&r.session_date<=end)
   .sort((a,b)=>a.session_date.localeCompare(b.session_date)||timeValue(a).localeCompare(timeValue(b)));
 const periods=slotGroups(visible);
 const counts=Object.fromEntries(days.map(d=>[key(d),visible.filter(r=>r.session_date===key(d)).length]));
 const move=n=>{const d=new Date(monday);d.setDate(monday.getDate()+7*n);onDateChange(key(d));};
 return <section className="panel teaching-calendar flexible-calendar" aria-label="Thời khóa biểu giáo viên">
  <div className="section-head">
   <div><h2>Thời khóa biểu theo tiết và buổi</h2><p>{school} · {teacher} · {dtext(start)} – {dtext(end)}</p></div>
   <div className="actions">
    <button type="button" className="btn" aria-label="Tuần trước" onClick={()=>move(-1)}>‹</button>
    <button type="button" className="btn" onClick={()=>onDateChange(key(new Date()))}>Tuần này</button>
    <button type="button" className="btn" aria-label="Tuần sau" onClick={()=>move(1)}>›</button>
   </div>
  </div>
  <label className="field-inline">Chọn ngày xem lịch <input type="date" style={{width:175}} value={focusDate||key(new Date())} onChange={e=>e.target.value&&onDateChange(e.target.value)}/></label>
  <div className="calendar-grid-scroll" role="region" aria-label="Bảng lịch sáng chiều theo ngày" tabIndex={0}>
    <table className="calendar-grid" aria-label="Lịch dạy với các tiết trống theo cùng hàng giờ">
      <thead><tr><th className="cal-period-col">Buổi</th><th className="cal-time-col">Bắt đầu – kết thúc</th>
      {days.map((d,i)=>{const date=key(d);return <th key={date} className={date===key(new Date())?'cal-today':''}>
        <strong>{weekday[i]}</strong><span>{d.getDate()}/{d.getMonth()+1}</span><small>{counts[date]||0} buổi</small>
      </th>})}</tr></thead>
      <tbody>{periods.map(period=>period.slots.map((slot,index)=><tr className={'cal-period-row '+(slot.gap?'cal-gap-row':'')} key={slot.key}>
        {index===0&&<th className={'cal-shift '+period.id} rowSpan={period.slots.length} scope="rowgroup"><span>{period.label}</span></th>}
        <th className="cal-time-cell" scope="row">{slot.gap?'Tiết trống':slot.empty?'—':(()=>{
          const ends=[...new Set(visible.filter(r=>timeValue(r)===slot.time&&r.session_date>=start&&r.session_date<=end).map(endTime))].sort();
          return <span className="cal-time-range">{slot.time}{ends.length===1?' – '+ends[0]:' – xem ô lịch'}</span>;
        })()}</th>
        {days.map(d=>{const date=key(d);
          const lessons=slot.time?visible.filter(r=>r.session_date===date&&timeValue(r)===slot.time):[];
          return <td key={date+slot.key} className={(date===key(new Date())?'cal-today ':'')+(!lessons.length?'cal-open-slot':'cal-filled-slot')}>
            {lessons.length?lessons.map((r,i)=>{
              const detail=<>
                <strong>{r.class_name}</strong>
                <small>{timeValue(r)} – {endTime(r)}</small>
                <small>{r.period_count||1} tiết{r.teacher_name&&r.teacher_name!==teacher?' · GV '+r.teacher_name:''}</small>
              </>;
              return onLessonSelect?
                <button type="button" key={r.id||date+'-'+slot.time+'-'+i}
                  className={'cal-grid-lesson cal-grid-lesson-button '+period.id+(selectedLessonId===r.id?' selected':'')}
                  aria-pressed={selectedLessonId===r.id}
                  aria-label={'Điểm danh lớp '+r.class_name+' ngày '+dtext(r.session_date)+' lúc '+timeValue(r)}
                  onClick={()=>onLessonSelect(r)}>
                  {detail}<small className="cal-lesson-action">{selectedLessonId===r.id?'Đang điểm danh':'Nhấn để điểm danh'}</small>
                </button>:
                <div key={r.id||date+'-'+slot.time+'-'+i} className={'cal-grid-lesson '+period.id}>{detail}</div>;
            }):<span className="cal-slot-placeholder" aria-label="Không có lớp tại khung giờ này">—</span>}
          </td>;
        })}
      </tr>))}</tbody>
    </table>
  </div>
  <p className="muted">{onLessonSelect?
      "Bấm trực tiếp vào tiết học trên thời khóa biểu để mở danh sách điểm danh lớp đó ở ngay bên dưới. Ô trống không tạo buổi học mới.":
      "Các ngày dùng chung hàng khung giờ. Ô chưa có lớp được để trống, kể cả giữa hai tiết; nhãn “Tiết trống” chỉ biểu thị khoảng cách và không tự tạo giờ học mới. Lịch từng trường vẫn giữ nguyên giờ bắt đầu/kết thúc thực tế."}</p>
 </section>;
}
