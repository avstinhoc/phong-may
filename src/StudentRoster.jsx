import {activeClassNames} from './lib/syncClassNames';
import React,{useEffect,useState} from 'react';
import {exportAttendanceReference} from './lib/exportReferenceAttendance';
import {SheetsConnectionPanel} from './SheetsConnectionPanel';
import {supabase} from './lib/supabase';
import {searchName,comparePC,compareStudentName,properName} from './lib/students';
const scoreKeys=['QT1','QT2','HK1','QT3','QT4','HK2',...Array.from({length:5},(_,i)=>`TEST ${i+1}`),...Array.from({length:5},(_,i)=>`Mô phỏng lần ${i+1}`)];
const date=s=>s?s.split('-').reverse().join('/'):'';
const statusText={present:'Có mặt',absent:'Vắng',late:'Trễ',excused:'Có phép'};
export function StudentRoster({profile,refresh,syncRefresh,ping}){
 const [centers,setCenters]=useState([]);
 const [logoSource,setLogoSource]=useState('school');
 const [temporaryLogo,setTemporaryLogo]=useState(null);
 const [data,setData]=useState({students:[],sessions:[],marks:[],results:[],assignments:[],computers:[],catalog:[]}),[className,setClassName]=useState(''),[query,setQuery]=useState(''),[view,setView]=useState('attendance'),[error,setError]=useState(''),[loading,setLoading]=useState(false),[editing,setEditing]=useState(null),[saving,setSaving]=useState(false),[version,setVersion]=useState(0),[markBusy,setMarkBusy]=useState(''),[lessonEdit,setLessonEdit]=useState(null),[lessonSaving,setLessonSaving]=useState(false),[exporting,setExporting]=useState(false),[nameEditing,setNameEditing]=useState(null),[nameBusy,setNameBusy]=useState(false);
 useEffect(()=>{let live=true;setLoading(true);setError('');(async()=>{const tables=['students','class_sessions','attendance','student_results','computer_assignments','computers','classes'];
 // Paginate rather than silently truncate large class registers.
 const values=await Promise.all(tables.map(async table=>{let all=[];for(let from=0;;from+=500){const {data,error}=await supabase.from(table).select('*').eq('school_id',profile.school_id).order('id').range(from,from+499);if(error)throw error;all.push(...data);if(data.length<500)break;}return all;})).catch(e=>{if(live)setError(e.message);return null;});if(!live)return;setLoading(false);if(values){const [students,sessions,marks,results,assignments,computers,catalog]=values;setData({students,sessions,marks,results,assignments,computers,catalog});}})();return()=>{live=false;};},[profile.school_id,refresh,version]);
 useEffect(()=>{
  let live=true;
  Promise.all([
   supabase.from('workplaces').select('id,name,kind,logo_data,created_by').eq('created_by',profile.id).order('name'),
   supabase.from('workplace_schools').select('workplace_id').eq('school_id',profile.school_id)
  ]).then(([units,links])=>{
   if(!live)return;
   if(units.error||links.error){setCenters([]);return;}
   const ids=new Set((links.data||[]).map(x=>x.workplace_id));
   setCenters((units.data||[]).filter(x=>ids.has(x.id)));
  }).catch(()=>{if(live)setCenters([]);});
  return()=>{live=false;};
 },[profile.id,profile.school_id,refresh]);
 const center=centers.find(c=>c.id===logoSource);
 const reportLogo=temporaryLogo||center?.logo_data||profile.school_logo||null;
 async function chooseLogo(file){
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024){
   ping('Chọn logo PNG, JPG hoặc WebP dưới 3 MB.');return;
  }
  try{
   const data=await new Promise((resolve,reject)=>{
    const u=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{try{
     const scale=Math.min(1,160/img.naturalWidth,90/img.naturalHeight);
     const canvas=document.createElement('canvas');
     canvas.width=Math.max(1,Math.floor(img.naturalWidth*scale));
     canvas.height=Math.max(1,Math.floor(img.naturalHeight*scale));
     canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
     resolve(canvas.toDataURL('image/png'));
    }catch(e){reject(e);}finally{URL.revokeObjectURL(u);}};
    img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Không đọc được ảnh logo.'));};
    img.src=u;
   });
   setTemporaryLogo(data);ping('Đã chọn logo thay thế cho file Excel.');
  }catch(e){ping(e.message);}
 }
 const classes=activeClassNames(data.catalog,[...data.students,...data.sessions].map(row=>row.class_name));
 const closedIds=new Set(data.catalog.filter(c=>c.archived_at).map(c=>c.id));
 const pupils=data.students.filter(s=>s.status==='active'&&!closedIds.has(s.class_id)&&classes.includes(s.class_name)&&(!className||s.class_name===className)&&searchName(s.full_name).includes(searchName(query))).sort(compareStudentName);
 const sessions=data.sessions.filter(s=>s.class_name===className&&!s.is_cancelled).sort((a,b)=>a.session_date.localeCompare(b.session_date)||a.start_time.localeCompare(b.start_time));
 const result=s=>data.results.find(r=>r.student_id===s.id)||{gender:'',classification:'',scores:{},comment:'',standard_met:false,exam_result:''};
 const pc=s=>data.assignments.filter(a=>a.student_id===s.id&&a.active).map(a=>data.computers.find(c=>c.id===a.computer_id)?.computer_code||'').sort(comparePC).join(', ');
 const mark=(s,lesson)=>data.marks.find(m=>m.student_id===s.id&&m.session_id===lesson?.id);
 const summary=s=>{const absent=sessions.filter(l=>['absent','excused'].includes(mark(s,l)?.status)).length;return {total:sessions.length,present:sessions.length-absent,absent,rate:sessions.length?Math.round(absent/sessions.length*100)+'%':'0%'};};
 async function toggleAbsence(student,lesson){
  if(lesson?.is_cancelled){ping('Buổi đã nghỉ, không thể sửa điểm danh.');return;}
  const k=student.id+lesson.id; if(markBusy)return;setMarkBusy(k);
  const old=mark(student,lesson);
  const result=old?.status==='absent'
   ? await supabase.from('attendance').delete().eq('id',old.id).eq('school_id',profile.school_id)
   : old
     ? await supabase.from('attendance').update({status:'absent'}).eq('id',old.id).eq('school_id',profile.school_id)
     : await supabase.from('attendance').insert({school_id:profile.school_id,session_id:lesson.id,student_id:student.id,status:'absent'});
  if(result.error){setMarkBusy('');ping(result.error.message);return;}
   try{
     const {data:link,error:linkError}=await supabase.from('school_sheet_links')
       .select('id,status,auto_sync').eq('school_id',profile.school_id).maybeSingle();
     if(linkError)throw linkError;
     if(link?.id&&link.status==='verified'&&link.auto_sync){
       const {error:syncError}=await supabase.functions.invoke('google-sheets-sync',{
         body:{action:'sync_attendance_cell',link_id:link.id,student_id:student.id,session_id:lesson.id}
       });
       if(syncError)throw syncError;
     }
   }catch(e){ping('Web đã lưu điểm danh nhưng Sheets chưa cập nhật: '+e.message);}
   setMarkBusy('');setVersion(v=>v+1);
 }
 async function saveLesson(e){
  e.preventDefault();if(!className||!lessonEdit)return;
  setLessonSaving(true);
  const payload={school_id:profile.school_id,class_name:className,
   class_id:lessonEdit.class_id||null,session_date:lessonEdit.session_date,
   start_time:lessonEdit.start_time,end_time:lessonEdit.end_time,
   period_count:Number(lessonEdit.period_count),teacher_id:profile.id,
   teacher_name:profile.full_name||'',created_by:profile.id};
  if(payload.end_time<=payload.start_time){setLessonSaving(false);ping('Giờ kết thúc phải sau giờ bắt đầu');return;}
  const {error}=lessonEdit.id
    ? await supabase.from('class_sessions').update(payload).eq('school_id',profile.school_id).eq('id',lessonEdit.id)
    : await supabase.from('class_sessions').insert(payload);
  setLessonSaving(false);if(error)ping(error.message);else{setLessonEdit(null);setVersion(v=>v+1);ping('Đã lưu buổi học');}
 }
 async function deleteLesson(l){
  if(!window.confirm('Xóa buổi '+l.session_date+' lớp '+className+'? Dữ liệu điểm danh buổi này cũng bị xóa.'))return;
  const {error}=await supabase.from('class_sessions').delete().eq('id',l.id).eq('school_id',profile.school_id);
  if(error)ping(error.message);else{setVersion(v=>v+1);ping('Đã xóa buổi học');}
 }
 async function saveStudentName(e){
  e.preventDefault();if(!nameEditing||nameBusy)return;
  setNameBusy(true);
  const {error}=await supabase.rpc('ic3_update_student_name',{p_student_id:nameEditing.id,
    p_new_name:properName(nameEditing.full_name)});
  setNameBusy(false);
  if(error)ping(error.message);
  else{setNameEditing(null);setVersion(v=>v+1);ping('Đã sửa tên học sinh.');}
 }
 async function removeStudent(student){
   if(!window.confirm('Xóa '+student.full_name+' khỏi danh sách học sinh lớp '+student.class_name+'? Hồ sơ sẽ được lưu ở trạng thái ngừng học để không mất điểm và lịch sử.'))return;
   const {error:deleteError}=await supabase.from('students').update({status:'inactive'})
     .eq('id',student.id).eq('school_id',profile.school_id);
   if(deleteError)ping('Không thể xóa khỏi danh sách: '+deleteError.message);
   else{setVersion(v=>v+1);ping('Đã đưa '+student.full_name+' khỏi danh sách, giữ nguyên lịch sử.');}
  }
  async function issueToken(s){
  const {data,error}=await supabase.rpc('issue_student_portal_token',{p_student_id:s.id});
  if(error)ping(error.message);else{
    navigator.clipboard?.writeText(data).catch(()=>{});
    window.prompt('Mã xem điểm của '+s.full_name+' (12 ký tự, đã sao chép). Cấp riêng cho học sinh; cấp lại sẽ vô hiệu mã cũ:',data);
  }
 }

 async function save(e){e.preventDefault();setSaving(true);const {error}=await supabase.from('student_results').upsert({school_id:profile.school_id,student_id:editing.student_id,gender:editing.gender,classification:editing.classification,scores:editing.scores,comment:editing.comment,standard_met:editing.standard_met,exam_result:editing.exam_result,updated_at:new Date().toISOString()},{onConflict:'student_id'});setSaving(false);if(error)ping(error.message);else{setEditing(null);setVersion(v=>v+1);ping('Đã lưu kết quả học sinh');}}
 async function exportFile(){
  if(!className||exporting)return;
  setExporting(true);
  try{
    await exportAttendanceReference({
      school:profile.school_name,className,teacher:profile.full_name||'',
      students:pupils,sessions,marks:data.marks,results:data.results,
      logo:reportLogo,centerName:center?.name||'IC3 GS6'
    });
    ping('Đã xuất Excel điểm danh theo mẫu B1–B70, có điểm và tổng chuyên cần.');
  }catch(e){ping('Không thể xuất Excel: '+e.message);}
  finally{setExporting(false);}
 }
 return <section className="panel roster"><h2>Danh sách học sinh</h2><p className="muted">Cấu trúc theo mẫu: hồ sơ, điểm danh theo buổi, điểm kiểm tra và nhận xét. Ô trống = có mặt, bấm ô để đánh dấu vắng. Số tiết và buổi học riêng cho từng lớp.</p>
 <SheetsConnectionPanel profile={profile} classes={classes} sessions={data.sessions}
   refresh={refresh} syncRefresh={syncRefresh} rosterVersion={version} logoData={reportLogo} logoLabel={center?.name||profile.school_name||'IC3'}
   onSynced={()=>setVersion(v=>v+1)}/>
 <div className="roster-export-options">
  <label>Logo trong file Excel
    <select aria-label="Chọn trung tâm và logo xuất Excel" value={logoSource}
      onChange={e=>{setLogoSource(e.target.value);setTemporaryLogo(null);}}>
      <option value="school">Logo trường / IC3 GS6</option>
      {centers.map(c=><option key={c.id} value={c.id}>Logo {c.kind==='company'?'Công ty':'Trung tâm'}: {c.name}</option>)}
    </select>
  </label>
  <label className="btn outline roster-logo-upload">Thay logo trong file
    <input hidden type="file" accept="image/png,image/jpeg,image/webp"
      onChange={e=>{chooseLogo(e.target.files?.[0]);e.target.value='';}}/>
  </label>
  {temporaryLogo&&<button className="mini-btn" type="button" onClick={()=>setTemporaryLogo(null)}>Dùng lại logo đã lưu</button>}
  <span className="muted">Logo ở góc trên bên trái. Để lưu logo vĩnh viễn, cập nhật tại Công ty/Trung tâm.</span>
 </div>
 <div className="actions"><button className={`btn ${view==='attendance'?'primary':''}`} onClick={()=>setView('attendance')}>Hồ sơ & điểm danh</button><button className={`btn ${view==='scores'?'primary':''}`} onClick={()=>setView('scores')}>Điểm & nhận xét</button></div>
 <div className="toolbar roster-toolbar"><label>Lớp <select value={className} onChange={e=>setClassName(e.target.value)}><option value="">Chọn lớp</option>{classes.map(c=><option key={c}>{c}</option>)}</select></label><input aria-label="Tìm tên trong danh sách" placeholder="Tìm họ tên…" value={query} onChange={e=>setQuery(e.target.value)}/><button className="btn" disabled={!className||loading} onClick={exportFile}>{exporting?"Đang tạo file...":"Xuất Excel nhanh (theo mẫu)"}</button>{className&&<button className="btn primary" onClick={()=>setLessonEdit({session_date:new Date().toLocaleDateString('en-CA'),start_time:'07:30',end_time:'08:15',period_count:1})}>+ Thêm buổi học</button>}</div>
 {error&&<p role="alert" className="notice-box">{error}</p>}{loading&&<p>Đang tải…</p>}{!className?<p className="notice-box">Chọn lớp để xem danh sách và các buổi học tương ứng.</p>:<div className="table-wrap"><table><thead><tr><th>STT</th><th>Mã HS</th><th className="sticky-name">Họ & tên</th>{view==='attendance'?<><th>Ngày sinh</th><th>Giới tính</th><th>Máy</th>{sessions.map((l,i)=><th key={l.id}>B{i+1}<small>{date(l.session_date)} · {l.start_time.slice(0,5)}</small><small>{l.period_count} tiết</small><div className="lesson-header-actions"><button type="button" title="Sửa buổi" onClick={()=>setLessonEdit({...l,start_time:l.start_time.slice(0,5),end_time:l.end_time.slice(0,5)})}>Sửa</button><button type="button" title="Xóa buổi" onClick={()=>deleteLesson(l)}>Xóa</button></div></th>)}<th>Có mặt</th><th>Vắng</th><th>TL vắng</th></>:<><th>Xếp loại</th>{scoreKeys.map(k=><th key={k}>{k}</th>)}<th>Nhận xét</th><th>Đạt chuẩn</th><th>KQ thi</th></>}<th>Cập nhật</th></tr></thead><tbody>{pupils.map((s,i)=>{const r=result(s),sum=summary(s);return <tr key={s.id}><td>{i+1}</td><td>{s.student_code}</td><td className="sticky-name"><b>{s.full_name}</b></td>{view==='attendance'?<><td>{date(s.date_of_birth)}</td><td>{r.gender}</td><td>{pc(s)}</td>{sessions.map(l=><td key={l.id}><button type="button" disabled={!!markBusy} className={'roster-mark '+(mark(s,l)?.status==='absent'?'absent':'present')} title="Bấm để đổi giữa có mặt và vắng" onClick={()=>toggleAbsence(s,l)}>{markBusy===s.id+l.id?'…':mark(s,l)?.status==='absent'?'☑ Vắng':'☐'}</button></td>)}<td>{sum.present}</td><td>{sum.absent}</td><td>{sum.rate||'—'}</td></>:<><td>{r.classification}</td>{scoreKeys.map(k=><td key={k}>{r.scores?.[k]??'—'}</td>)}<td>{r.comment}</td><td>{r.standard_met?'Đạt':'—'}</td><td>{r.exam_result}</td></>}<td><button className="mini-btn" onClick={()=>setNameEditing({id:s.id,full_name:s.full_name})}>Sửa tên</button><button className="mini-btn" onClick={()=>setEditing({...r,student_id:s.id,name:s.full_name,scores:{...r.scores}})}>Sửa điểm</button><button className="mini-btn" onClick={()=>issueToken(s)}>Mã xem điểm</button><button type="button" className="mini-btn danger" title="Xóa khỏi danh sách, lưu lịch sử" onClick={()=>removeStudent(s)}>Xóa</button></td></tr>;})}</tbody></table></div>}
 {nameEditing&&<div className="modal-backdrop"><div className="modal"><div className="modal-head">
   <h3>Sửa tên học sinh</h3><button className="btn" onClick={()=>setNameEditing(null)}>Đóng</button></div>
   <form className="form-stack" onSubmit={saveStudentName}>
    <label>Họ và tên có dấu<input autoFocus required value={nameEditing.full_name}
      onChange={e=>setNameEditing(v=>({...v,full_name:e.target.value}))}/></label>
    <button className="btn primary" disabled={nameBusy}>{nameBusy?'Đang lưu…':'Lưu tên'}</button>
   </form></div></div>}
 {lessonEdit&&<div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{lessonEdit.id?'Sửa':'Thêm'} buổi học · lớp {className}</h3><button className="btn" onClick={()=>setLessonEdit(null)}>Đóng</button></div><form className="form-stack" onSubmit={saveLesson}><label>Ngày học<input required type="date" value={lessonEdit.session_date} onChange={e=>setLessonEdit({...lessonEdit,session_date:e.target.value})}/></label><div className="form-row"><label>Bắt đầu<input required type="time" value={lessonEdit.start_time} onChange={e=>setLessonEdit({...lessonEdit,start_time:e.target.value})}/></label><label>Kết thúc<input required type="time" value={lessonEdit.end_time} onChange={e=>setLessonEdit({...lessonEdit,end_time:e.target.value})}/></label></div><label>Số tiết trong buổi<input required type="number" min="1" max="20" value={lessonEdit.period_count} onChange={e=>setLessonEdit({...lessonEdit,period_count:e.target.value})}/></label><button className="btn primary" disabled={lessonSaving}>Lưu buổi học</button></form></div></div>}
 {editing&&<div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{editing.name}</h3><button className="btn" disabled={saving} onClick={()=>setEditing(null)}>Đóng</button></div><form className="form-stack" onSubmit={save}><div className="form-row"><label>Giới tính<select value={editing.gender} onChange={e=>setEditing({...editing,gender:e.target.value})}><option value="">Chưa có</option><option>Nam</option><option>Nữ</option><option>Khác</option></select></label><label>Xếp loại<input value={editing.classification} onChange={e=>setEditing({...editing,classification:e.target.value})}/></label></div><div className="form-row">{scoreKeys.map(k=><label key={k}>{k}<input type="number" min="0" max="100" step="0.01" value={editing.scores[k]??''} onChange={e=>setEditing({...editing,scores:{...editing.scores,[k]:e.target.value===''?'':Number(e.target.value)}})}/></label>)}</div><label>Nhận xét<textarea value={editing.comment} onChange={e=>setEditing({...editing,comment:e.target.value})}/></label><label>Kết quả thi<input value={editing.exam_result} onChange={e=>setEditing({...editing,exam_result:e.target.value})}/></label><label><input type="checkbox" checked={editing.standard_met} onChange={e=>setEditing({...editing,standard_met:e.target.checked})}/> Đạt chuẩn</label><button className="btn primary" disabled={saving}>{saving?'Đang lưu…':'Lưu kết quả'}</button></form></div></div>}
 </section>;
}
