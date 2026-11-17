import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';
import {teacherRows,teacherTotals,exportMonthlyExcel,printMonthlyPdf,amount,vnDate} from './lib/teacherReports';
import {sessionsForWorkplace,schoolsForWorkplace,groupSchoolNames} from './lib/workplaceReports';
const initialMonth=()=>new Date().toLocaleDateString('en-CA').slice(0,7);
const monthEnds=month=>{const [y,m]=month.split('-').map(Number);return {from:month+'-01',to:new Date(y,m,0).toLocaleDateString('en-CA')};};
export function TeacherPayroll({profile,refresh,ping,schools=[],workplaces=[],workplaceLinks=[]}){
 const [month,setMonth]=useState(initialMonth);
 const [payrollSchool,setPayrollSchool]=useState('');
 const [recipientWorkplaceId,setRecipientWorkplaceId]=useState('');
 const recipientWorkplace=workplaces.find(w=>w.id===recipientWorkplaceId)||null;
 const recipientSchools=recipientWorkplace?schoolsForWorkplace(recipientWorkplace.id,schools,workplaceLinks):[];
 const recipientSchoolCount=groupSchoolNames(recipientSchools).length;
 const selectedSchool=schools.find(sc=>sc.id===payrollSchool)||(schools.length===1?schools[0]:null);
 const schoolLabel=selectedSchool?.name||'Tổng hợp các trường';
 const schoolLogo=selectedSchool?.logo_data||null;
 const [lessons,setLessons]=useState([]),[rates,setRates]=useState([]);
 const [selected,setSelected]=useState(profile.id);
 const [editingRate,setEditingRate]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
 const [error,setError]=useState('');
 useEffect(()=>{setSelected(profile.id);},[profile.id]);
 useEffect(()=>{
   let live=true;setLoading(true);setError('');
   const readAll=async (table,selection,sort)=>{
     const rows=[];
     for(let start=0;start<100000;start+=500){
       const {data,error}=await supabase.from(table).select(selection).order(sort).range(start,start+499);
       if(error)throw error;
       rows.push(...(data||[]));if(!data||data.length<500)break;
     }
     return rows;
   };
   Promise.all([
     readAll('class_sessions','id,school_id,teacher_id,teacher_name,class_name,session_date,start_time,end_time,period_count','id'),
     readAll('teacher_pay_rates','school_id,teacher_id,hourly_rate','teacher_id')
   ]).then(values=>{if(!live)return;setLoading(false);
     setLessons(values[0]||[]);setRates(values[1]||[]);
   }).catch(e=>{if(live){setError(e.message);setLoading(false);}});
   return()=>{live=false;};
 },[refresh,version]);
 const teachers=useMemo(()=>{
  const map=new Map([[profile.id,profile.full_name||'Giáo viên hiện tại']]);
  lessons.forEach(s=>{if(s.teacher_id&&!map.has(s.teacher_id))map.set(s.teacher_id,s.teacher_name||'Giáo viên');});
  return [...map].map(([id,name])=>({id,name}));
 },[lessons,profile.id,profile.full_name]);
 const allowed=profile.role==='admin'?teachers:teachers.filter(t=>t.id===profile.id);
 const teacher=allowed.find(t=>t.id===selected)||allowed[0]||{id:profile.id,name:profile.full_name||'Giáo viên'};
 const ratesBySchool=Object.fromEntries(rates.filter(r=>r.teacher_id===teacher.id)
   .map(r=>[r.school_id,Number(r.hourly_rate||0)]));
 const rate=payrollSchool?Number(ratesBySchool[payrollSchool]||0):0;
 const rateFor=session=>Number(ratesBySchool[session.school_id]||0);
 const schoolById=Object.fromEntries(schools.map(sc=>[sc.id,sc.name]));
 useEffect(()=>{setEditingRate(String(rate));},[rate,teacher.id]);
 const dates=monthEnds(month);
 const filtered=lessons.filter(s=>s.teacher_id===teacher.id&&s.session_date>=dates.from&&s.session_date<=dates.to&&(!payrollSchool||s.school_id===payrollSchool))
   .map(s=>({...s,school_name:schoolById[s.school_id]||''}));
 const rows=teacherRows(filtered,dates.from,dates.to,rateFor,schoolLabel);
 const total=teacherTotals(rows);
 const params={rows,sessions:filtered,teacher:teacher.name,school:schoolLabel,logo:schoolLogo,rate,ratesBySchool,from:dates.from};
 // The submission report is independent of the payroll school filter: choose a
 // receiving company/center and include every linked school ID for this teacher.
 const submitted=recipientWorkplace?sessionsForWorkplace({
  workplaceId:recipientWorkplace.id,links:workplaceLinks,sessions:lessons,
  teacherId:teacher.id,from:dates.from,to:dates.to,schoolById
 }):filtered;
 const submittedRows=recipientWorkplace?
  teacherRows(submitted,dates.from,dates.to,rateFor,'Tổng hợp các trường'):rows;
 const submissionParams=recipientWorkplace?{
  ...params,
  rows:submittedRows,sessions:submitted,school:recipientWorkplace.name,
  logo:recipientWorkplace.logo_data||null,
  recipient:{name:recipientWorkplace.name,kind:recipientWorkplace.kind},
 }:params;
 const submissionTotals=teacherTotals(submittedRows);
 async function saveRate(e){
  e.preventDefault();
  if(!payrollSchool){ping('Chọn một trường cụ thể để cập nhật đơn giá lương/giờ.');return;}
  const value=Number(editingRate);
  if(!Number.isFinite(value)||value<0||value>1e8){ping('Mức lương theo giờ chưa hợp lệ');return;}
  setBusy(true);
  const {error:err}=await supabase.from('teacher_pay_rates').upsert({
    school_id:payrollSchool,teacher_id:teacher.id,hourly_rate:value,updated_at:new Date().toISOString()
  },{onConflict:'school_id,teacher_id'});
  setBusy(false);
  if(err)ping(err.message);else{setVersion(v=>v+1);ping('Đã cập nhật tiền công theo giờ cho '+teacher.name);}
 }
 async function exportFile(privatePay){
   try{
     if(!privatePay&&recipientWorkplace&&!recipientSchools.length){
       ping('Đơn vị này chưa có trường liên kết mà bạn được phân quyền.');return;
     }
     setBusy(true);
     await exportMonthlyExcel({...(privatePay?params:submissionParams),privatePay});
   }
   catch(e){ping('Không xuất được Excel: '+e.message);}
   finally{setBusy(false);}
 }
 function pdf(privatePay){
   try{
    if(!privatePay&&recipientWorkplace&&!recipientSchools.length){
      ping('Đơn vị này chưa có trường liên kết mà bạn được phân quyền.');return;
    }
    printMonthlyPdf({...(privatePay?params:submissionParams),privatePay});
   }catch(e){ping(e.message);}
 }
 return <section className="payroll-page">
   <div className="report-banner payroll-banner">
     <div><span className="report-overline">CHẤM CÔNG GIÁO VIÊN</span><h2>Bảng kê tiết dạy & tiền công</h2>
       <p>Giữ nguyên dữ liệu giờ học và số tiết theo lịch dạy. Báo cáo trung tâm không hiển thị tiền; bản cá nhân tính theo đơn giá giờ của giáo viên.</p>
     </div><div className="report-banner-art" aria-hidden="true">BẢNG KÊ<br/>TIẾT DẠY<br/><span>IC3 GS6</span></div>
   </div>
   <div className="panel">
     <div className="payroll-filters">
       <label>Trường tính công
         <select value={payrollSchool} onChange={e=>setPayrollSchool(e.target.value)}>
           <option value="">Tất cả trường được phân quyền</option>
           {schools.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}
         </select>
       </label>
       <label>Tháng báo cáo<input type="month" required value={month} onChange={e=>setMonth(e.target.value)}/></label>
       <label>Giáo viên<select value={teacher.id} disabled={profile.role!=='admin'} onChange={e=>setSelected(e.target.value)}>
         {allowed.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
       </select></label>
       <form onSubmit={saveRate}><label>Đơn giá 1 giờ (VNĐ)<input type="number" min="0" max="100000000" step="1000" value={editingRate} disabled={!payrollSchool} onChange={e=>setEditingRate(e.target.value)}/></label>
         <button type="submit" className="btn primary" disabled={busy||!payrollSchool}>Lưu lương/giờ</button>
       </form>
     </div>
     <p className="muted">Mục này không phụ thuộc trường đang chọn ở menu trái. Muốn sửa đơn giá, chọn một trường cụ thể. Khi xem Tất cả trường, hệ thống cộng tiền theo mức lương từng trường. Mỗi giáo viên có mức lương riêng theo từng trường. Số giờ tính từ giờ bắt đầu đến giờ kết thúc của từng buổi, còn số tiết lấy từ lịch dạy. Thay đổi mức lương sẽ cập nhật phần tính toán của các kỳ đang xem.</p>
   </div>
   {error&&<div className="notice-box">{error}</div>}
   <div className="payroll-kpis">
     <div><small>Lượt lớp đã dạy</small><strong>{total.lessons}</strong><span>{total.days} ngày có dạy</span></div>
     <div><small>Tổng số tiết</small><strong>{total.periods}</strong><span>Theo thời khóa biểu</span></div>
     <div><small>Giờ thực dạy</small><strong>{total.hours.toFixed(2)}</strong><span>Tính theo thời gian</span></div>
     <div><small>Tiền công của giáo viên</small><strong>{amount(total.pay)}</strong><span>{payrollSchool?amount(rate)+' / giờ':'Theo từng trường'}</span></div>
   </div>
   <div className="report-two-exports">
     <article className="report-export-card">
       <span className="report-kind">BẢN NỘP TRƯỜNG / TRUNG TÂM</span><h3>Bảng kê tiết dạy</h3>
       <p>Ngày, thứ, lớp dạy sáng/chiều, số tiết, tên trường và tổng tháng. <b>Không chứa lương hoặc học phí.</b></p>
       <label className="report-recipient-select">Đơn vị nhận bảng kê
        <select value={recipientWorkplaceId} onChange={e=>setRecipientWorkplaceId(e.target.value)}>
         <option value="">Báo cáo theo trường đang lọc (mặc định)</option>
         {workplaces.map(w=><option key={w.id} value={w.id}>{w.kind==='company'?'Công ty':'Trung tâm'} · {w.name}</option>)}
        </select>
       </label>
       {recipientWorkplace&&<div className="report-recipient-preview">
         <span className="report-recipient-logo">{recipientWorkplace.logo_data?
          <img src={recipientWorkplace.logo_data} alt={'Logo '+recipientWorkplace.name}/>:
          <strong>{recipientWorkplace.name.slice(0,4).toUpperCase()}</strong>}</span>
         <span><b>Nộp cho {recipientWorkplace.name}</b>
          <small>{recipientSchoolCount} trường liên kết · {submissionTotals.lessons} lượt lớp · {submissionTotals.periods} tiết trong tháng</small>
         </span>
       </div>}
       <p className="report-recipient-hint">{recipientWorkplace?
        'Chỉ tổng hợp các trường liên kết với '+recipientWorkplace.name+'; không phụ thuộc bộ lọc Trường tính công phía trên. Logo của đơn vị sẽ thay logo IC3 trên Excel/PDF.':
        'Chọn công ty hoặc trung tâm để tự dùng logo đơn vị và tổng hợp các trường thuộc đơn vị đó.'}</p>
       <div className="report-buttons"><button disabled={busy||loading||(!!recipientWorkplace&&!recipientSchools.length)} className="btn primary" onClick={()=>exportFile(false)}>Xuất Excel trung tâm</button><button className="btn outline" disabled={loading||(!!recipientWorkplace&&!recipientSchools.length)} onClick={()=>pdf(false)}>In / Lưu PDF</button></div>
     </article>
     <article className="report-export-card personal">
       <span className="report-kind">BẢN RIÊNG CHO GIÁO VIÊN</span><h3>Bảng lương & giờ dạy</h3>
       <p>Hiển thị thêm tổng giờ thực dạy, mức tiền mỗi giờ, tiền công từng ngày và sheet chi tiết từng buổi học.</p>
       <div className="report-buttons"><button disabled={busy||loading} className="btn primary" onClick={()=>exportFile(true)}>Xuất Excel giáo viên</button><button className="btn outline" disabled={loading} onClick={()=>pdf(true)}>In / Lưu PDF</button></div>
     </article>
   </div>
   <div className="panel report-table-preview">
     <div className="report-section-head"><h3>Bảng kê tháng {month.split('-').reverse().join('/')}</h3><span>{filtered.length} lượt lớp · {total.periods} tiết</span></div>
     <div className="table-wrap"><table><thead><tr><th>Ngày</th><th>Thứ</th><th>Buổi sáng</th><th>Buổi chiều</th><th>Số tiết</th><th>Giờ thực dạy</th><th>Tiền công</th></tr></thead>
       <tbody>{rows.map(r=><tr key={r.date} className={r.weekday==='Chủ nhật'?'weekend-row':''}><td>{vnDate(r.date)}</td><td>{r.weekday}</td><td>{r.morning||'—'}</td><td>{r.afternoon||'—'}</td><td>{r.periods||'—'}</td><td>{r.lessons?r.hours.toFixed(2):'—'}</td><td>{r.lessons?amount(r.pay):'—'}</td></tr>)}</tbody>
       <tfoot><tr><td colSpan={4}>TỔNG CỘNG</td><td>{total.periods}</td><td>{total.hours.toFixed(2)}</td><td>{amount(total.pay)}</td></tr></tfoot></table></div>
   </div>
 </section>;
}
