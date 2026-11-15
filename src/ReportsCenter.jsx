import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';
import {teacherRows,teacherTotals,exportMonthlyExcel,printMonthlyPdf,exportGeneralXlsx,printGeneralPdf,amount,vnDate,schoolYear} from './lib/teacherReports';
const firstMonth=()=>new Date().toLocaleDateString('en-CA').slice(0,7);
const scoreNames=['QT1','QT2','HK1','QT3','QT4','HK2','TEST 1','TEST 2','TEST 3','TEST 4','TEST 5','Mô phỏng lần 1','Mô phỏng lần 2','Mô phỏng lần 3','Mô phỏng lần 4','Mô phỏng lần 5'];
const reportOptions=[
 ['center','Bảng kê nộp trung tâm'],
 ['teacher','Bảng kê riêng giáo viên'],
 ['scores','Kết quả học sinh'],
 ['attendance','Điểm danh theo lớp'],
 ['students','Danh sách học sinh'],
 ['computers','Danh sách máy tính'],
 ['records','Điểm, lỗi & thưởng'],
 ['cleaning','Vệ sinh máy']
];
const clean=s=>String(s||'').trim();
export function ReportsCenter({profile,refresh,ping}){
 const [kind,setKind]=useState('center'),[month,setMonth]=useState(firstMonth),[className,setClassName]=useState(''),[teacherId,setTeacherId]=useState(profile.id),[exam,setExam]=useState('TEST 1');
 const [data,setData]=useState({}),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 useEffect(()=>{setTeacherId(profile.id);},[profile.id,profile.school_id]);
 useEffect(()=>{let live=true;setLoading(true);setError('');
  const names=['class_sessions','students','student_results','attendance','computers','student_records','cleaning_logs','teacher_pay_rates'];
  const fetchAll=async name=>{
    const results=[],sort=name==='teacher_pay_rates'?'teacher_id':'id';
    for(let from=0;from<100000;from+=500){
      const {data:part,error}=await supabase.from(name).select('*')
        .eq('school_id',profile.school_id).order(sort).range(from,from+499);
      if(error)throw error;
      results.push(...(part||[]));if(!part||part.length<500)break;
    }
    return results;
  };
  Promise.all(names.map(fetchAll)).then(results=>{
    if(!live)return;setLoading(false);
    const next={};names.forEach((name,i)=>{next[name]=results[i]||[];});setData(next);
  }).catch(e=>{if(live){setLoading(false);setError(e.message);}});return()=>{live=false;};
 },[profile.school_id,refresh]);
 const lessons=data.class_sessions||[],students=data.students||[];
 const teachers=useMemo(()=>{
  const map=new Map([[profile.id,profile.full_name||'Giáo viên']]);
  lessons.forEach(s=>{if(s.teacher_id&&!map.has(s.teacher_id))map.set(s.teacher_id,s.teacher_name||'Giáo viên');});
  return [...map].filter(([id])=>profile.role==='admin'||id===profile.id).map(([id,name])=>({id,name}));
 },[lessons,profile.id,profile.full_name,profile.role]);
 const selectedTeacher=teachers.find(t=>t.id===teacherId)||teachers[0]||{id:profile.id,name:profile.full_name};
 const rate=Number((data.teacher_pay_rates||[]).find(x=>x.teacher_id===selectedTeacher.id)?.hourly_rate||0);
 const yy=Number(month.slice(0,4)),mm=Number(month.slice(5,7));
 const from=month+'-01',to=new Date(yy,mm,0).toLocaleDateString('en-CA');
 const forMonth=lessons.filter(x=>x.session_date>=from&&x.session_date<=to&&x.teacher_id===selectedTeacher.id);
 const monthly=teacherRows(forMonth,from,to,rate,profile.school_name);
 const total=teacherTotals(monthly);
 const names=[...new Set([...students.map(s=>s.class_name),...lessons.map(s=>s.class_name)].filter(Boolean))].sort();
 const results=data.student_results||[];
 const chosen=students.filter(s=>s.status==='active'&&(!className||s.class_name===className)).sort((a,b)=>clean(a.full_name).localeCompare(clean(b.full_name),'vi'));
 const selectedSessions=lessons.filter(s=>!className||s.class_name===className).sort((a,b)=>a.session_date.localeCompare(b.session_date));
 const statusMap=new Map((data.attendance||[]).map(a=>[a.student_id+':'+a.session_id,a.status]));
 const ready={
  center:()=>({headers:['Ngày','Thứ','Lớp sáng','Lớp chiều','Số tiết','Trường','Ghi chú'],rows:monthly.map(s=>[vnDate(s.date),s.weekday,s.morning,s.afternoon,s.periods||'',s.lessons?s.school:'',''])}),
  teacher:()=>({headers:['Ngày','Thứ','Lớp sáng','Lớp chiều','Số tiết','Giờ dạy','Lương / giờ','Thành tiền'],rows:monthly.map(s=>[vnDate(s.date),s.weekday,s.morning,s.afternoon,s.periods||'',s.lessons?s.hours.toFixed(2):'',s.lessons?amount(rate):'',s.lessons?amount(s.pay):''])}),
  scores:()=>({headers:['STT','Họ','Tên','Lớp','Điểm '+exam,'Xếp loại','Nhận xét'],rows:chosen.map((s,i)=>{
    const r=results.find(z=>z.student_id===s.id)||{},n=clean(s.full_name).split(/\s+/);
    return [i+1,n.slice(0,-1).join(' '),n.at(-1)||'',s.class_name,r.scores?.[exam]??'',r.classification||'',r.comment||''];})}),
  attendance:()=>({headers:['STT','Học sinh','Lớp','Buổi học','Ngày','Số tiết','Điểm danh'],rows:chosen.flatMap((s,i)=>selectedSessions.filter(l=>l.class_name===s.class_name).map((l,j)=>{
    const status=statusMap.get(s.id+':'+l.id);return [i+1,s.full_name,s.class_name,j+1,vnDate(l.session_date),l.period_count,status==='absent'?'Vắng':status==='late'?'Đi trễ':status==='excused'?'Có phép':'Có mặt'];}))}),
  students:()=>({headers:['STT','Mã HS','Họ tên','Lớp','Trường','Trạng thái'],rows:chosen.map((s,i)=>[i+1,s.student_code||'',s.full_name,s.class_name,s.school_name||profile.school_name,'Đang học'])}),
  computers:()=>({headers:['Máy','Vị trí','Trạng thái','Số chỗ'],rows:(data.computers||[]).map(p=>[p.computer_code,p.location||'',p.status,p.capacity])}),
  records:()=>({headers:['Ngày','Học sinh','Lớp','Loại','Nội dung','Điểm'],rows:(data.student_records||[]).map(r=>{const st=students.find(s=>s.id===r.student_id);return [vnDate(r.record_date),st?.full_name||'',st?.class_name||'',r.record_type,r.title||'',r.points];})}),
  cleaning:()=>({headers:['Ngày','Máy','Học sinh','Lớp','Trạng thái'],rows:(data.cleaning_logs||[]).map(r=>{const st=students.find(s=>s.id===r.student_id),pc=(data.computers||[]).find(p=>p.id===r.computer_id);return [vnDate(r.cleaning_date),pc?.computer_code||'',st?.full_name||'',st?.class_name||'',r.status==='done'?'Đã làm':'Chưa làm'];})})
 };
 const preview=(ready[kind]||ready.center)();
 const title=(reportOptions.find(x=>x[0]===kind)||reportOptions[0])[1];
 const args={title,school:profile.school_name,logo:profile.school_logo,headers:preview.headers,rows:preview.rows,teacher:selectedTeacher.name,subtitle:'Năm học '+schoolYear(from)};
 async function excel(){
  try{setBusy(true);
   if(kind==='center'||kind==='teacher')await exportMonthlyExcel({rows:monthly,sessions:forMonth,teacher:selectedTeacher.name,school:profile.school_name,logo:profile.school_logo,from,rate,privatePay:kind==='teacher'});
   else await exportGeneralXlsx(args);
  }catch(e){ping('Lỗi xuất Excel: '+e.message);}finally{setBusy(false);}
 }
 function pdf(){
  try{
   if(kind==='center'||kind==='teacher')printMonthlyPdf({rows:monthly,teacher:selectedTeacher.name,school:profile.school_name,logo:profile.school_logo,from,rate,privatePay:kind==='teacher'});
   else printGeneralPdf(args);
  }catch(e){ping('Lỗi PDF: '+e.message);}
 }
 return <section className="report-center">
   <div className="report-banner">
     <div><span className="report-overline">HỒ SƠ – BIỂU MẪU – TỔNG HỢP</span><h2>Trung tâm báo cáo</h2>
       <p>Thiết kế theo bố cục báo cáo trường học: logo tùy chỉnh, tên trường, bảng số liệu rõ ràng, tổng kết và vị trí ký tên. Không đưa học phí học sinh vào báo cáo.</p>
     </div><div className="report-banner-art" aria-hidden="true">BÁO CÁO<br/>CHÍNH THỨC<br/><span>IC3 GS6</span></div>
   </div>
   <div className="report-template-chooser">{reportOptions.map(([id,name])=><button type="button" key={id} className={'report-option '+(kind===id?'selected':'')} onClick={()=>setKind(id)}>{name}</button>)}</div>
   <div className="panel report-controls">
     <div className="report-control-grid">
       {(kind==='center'||kind==='teacher')&&<label>Tháng báo cáo<input type="month" value={month} onChange={e=>setMonth(e.target.value)} /></label>}
       {(kind==='center'||kind==='teacher')&&<label>Giáo viên<select value={selectedTeacher.id} onChange={e=>setTeacherId(e.target.value)} disabled={profile.role!=='admin'}>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
       {!['center','teacher','computers'].includes(kind)&&<label>Lớp<select value={className} onChange={e=>setClassName(e.target.value)}><option value="">Tất cả lớp</option>{names.map(c=><option key={c}>{c}</option>)}</select></label>}
       {kind==='scores'&&<label>Bài kiểm tra<select value={exam} onChange={e=>setExam(e.target.value)}>{scoreNames.map(k=><option key={k}>{k}</option>)}</select></label>}
     </div>
     <div className="report-action-bar">
       <div><b>{title}</b><small>{kind==='teacher'?'Bản riêng: có lương theo giờ':kind==='center'?'Bản nộp: không hiển thị số tiền':'Bảng dữ liệu có thể xuất Excel hoặc PDF'} · {preview.rows.length} dòng</small></div>
       <div className="report-buttons"><button disabled={busy||loading} className="btn primary" onClick={excel}>{busy?'Đang xuất…':'Xuất Excel'}</button><button disabled={loading} className="btn outline" onClick={pdf}>In / Lưu PDF</button></div>
     </div>
   </div>
   {error&&<div className="notice-box">{error}</div>}
   {(kind==='center'||kind==='teacher')&&<div className="report-summary-line"><span><b>{total.lessons}</b> lượt lớp</span><span><b>{total.periods}</b> tiết</span><span><b>{total.hours.toFixed(2)}</b> giờ</span>{kind==='teacher'&&<span><b>{amount(total.pay)}</b> tiền công</span>}</div>}
   <div className="panel report-table-preview">
     <div className="report-section-head"><h3>Xem trước: {title}</h3><span>{profile.school_name}</span></div>
     {loading?<p className="muted">Đang tải dữ liệu…</p>:<div className="table-wrap"><table><thead><tr>{preview.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{preview.rows.slice(0,100).map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v??''}</td>)}</tr>)}</tbody></table></div>}
     {!loading&&!preview.rows.length&&<p className="muted">Chưa có dữ liệu cho mẫu báo cáo này.</p>}
     {preview.rows.length>100&&<p className="muted">Đang xem 100 dòng đầu; file xuất chứa toàn bộ dữ liệu đã tải.</p>}
   </div>
 </section>;
}
