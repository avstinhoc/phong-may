import React,{useEffect,useMemo,useState} from 'react';
import {Sparkles,BookOpenCheck,UserRound,BarChart3,ShieldCheck,CalendarCheck,
  Award,AlertTriangle,TrendingUp,ClipboardList,CheckCircle2,Loader2,Lightbulb,
  History,FileCheck2,Info,Search,RefreshCw} from 'lucide-react';
import {supabase} from './lib/supabase';
import {searchName,compareStudentName} from './lib/students';

const emptyData={students:[],records:[],attendance:[],sessions:[],results:[],evaluations:[]};
const niceDate=v=>v?new Date(v).toLocaleDateString('vi-VN'):'—';
const numeric=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
const periods=['Đánh giá thường xuyên','Giữa học kỳ I','Cuối học kỳ I','Giữa học kỳ II','Cuối học kỳ II','Cuối năm học'];
const periodName=(choice,custom)=>choice==='Khác'?custom.trim():choice;
const countWords=text=>text.trim().split(/\s+/).filter(Boolean).length;

function makeEvidence(student,data){
 const studentRecords=data.records.filter(x=>x.student_id===student.id);
 const pSessions=data.sessions.filter(x=>x.class_name===student.class_name);
 const ids=new Set(pSessions.map(x=>x.id));
 const marks=data.attendance.filter(x=>x.student_id===student.id&&ids.has(x.session_id));
 const absence=marks.filter(x=>['absent','excused'].includes(x.status)).length;
 const late=marks.filter(x=>x.status==='late').length;
 const results=data.results.find(x=>x.student_id===student.id);
 const scores=Object.entries(results?.scores||{})
  .filter(([,v])=>numeric(v)).map(([name,value])=>({name,value:Number(value)}));
 const points=studentRecords.filter(x=>['point','reward'].includes(x.record_type))
  .reduce((sum,x)=>sum+(Number(x.points)||0),0);
 const awards=studentRecords.filter(x=>x.record_type==='reward').length;
 const violations=studentRecords.filter(x=>x.record_type==='violation').length;
 const attendanceRate=pSessions.length?Math.max(0,Math.round((pSessions.length-absence)/pSessions.length*100)):null;
 const hasEvidence=!!(studentRecords.length||pSessions.length||scores.length);
 const level=!hasEvidence?'Chưa đủ dữ liệu':violations>0||absence>=2?'Cần hỗ trợ thêm':
   awards>0||scores.length>0?'Có ghi nhận tích cực':'Đang theo dõi';
 const evidence=[
  pSessions.length?'Đã ghi nhận '+pSessions.length+' buổi học.':'Chưa có buổi học để tính chuyên cần.',
  scores.length?'Đã nhập '+scores.length+' đầu điểm.':'Chưa có điểm kiểm tra.',
  studentRecords.length?'Có '+studentRecords.length+' ghi nhận thưởng, điểm hoặc nội quy.':'Chưa có ghi nhận thưởng hoặc nội quy.'
 ];
 const positives=[];
 if(awards)positives.push('Đã có '+awards+' lần được ghi nhận/khen thưởng');
 if(scores.length)positives.push('Có '+scores.length+' đầu điểm phục vụ theo dõi học tập');
 if(attendanceRate!==null&&absence===0)positives.push('Không có lượt vắng trong '+pSessions.length+' buổi đã tạo');
 const needs=[];
 if(absence)needs.push('Trao đổi và hỗ trợ sau '+absence+' buổi nghỉ');
 if(violations)needs.push('Nhắc lại quy tắc sử dụng phòng máy dựa trên '+violations+' lần ghi nhận');
 if(!scores.length)needs.push('Bổ sung kết quả thực hành và kiểm tra');
 const actions=['Đặt mục tiêu nhỏ cho buổi thực hành kế tiếp','Theo dõi và điều chỉnh nhận xét sau khi có dữ liệu mới'];
 const ruleDraft=!hasEvidence?
  'Chưa có đủ dữ liệu để viết nhận xét học tập. Giáo viên cần cập nhật điểm, buổi học hoặc ghi nhận trước khi đánh giá.':
  [
   'Trong giai đoạn theo dõi, học sinh có '+scores.length+' đầu điểm, '+awards+' lần khen thưởng và '+violations+' lượt ghi nhận cần lưu ý.',
   pSessions.length?'Trong '+pSessions.length+' buổi học đã ghi nhận, có '+absence+' buổi vắng'+(late?', '+late+' lần đi muộn':'')+'.':'Chưa đủ buổi học để nhận xét chuyên cần.',
   'Giáo viên khuyến khích học sinh luyện tập đều, chủ động hoàn thành bài thực hành và tiếp tục theo dõi tiến bộ trong thời gian tới.'
  ].join(' ');
 return {points,awards,violations,absence,late,total:pSessions.length,attendanceRate,
  scores,level,evidence,positives,needs,actions,hasEvidence,ruleDraft};
}

export function StudentEvaluation({profile,refresh,reload,ping}){
 const [data,setData]=useState(emptyData);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [classFilter,setClassFilter]=useState(''),[search,setSearch]=useState(''),[selected,setSelected]=useState('');
 const [period,setPeriod]=useState(periods[0]),[customPeriod,setCustomPeriod]=useState('');
 const [comment,setComment]=useState(''),[source,setSource]=useState('rule');
 const [insights,setInsights]=useState(null),[aiBusy,setAiBusy]=useState(false),[saving,setSaving]=useState(false);
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  let active=true;
  if(!profile.school_id){setData(emptyData);setLoading(false);return;}
  setLoading(true);setError('');
  const tables=['students','student_records','attendance','class_sessions','student_results','student_evaluations'];
  const fetchTable=async(table)=>{
   let rows=[];
   for(let index=0;index<10;index++){
    const {data:part,error:fetchErr}=await supabase.from(table).select('*')
     .eq('school_id',profile.school_id).order('id').range(index*500,index*500+499);
    if(fetchErr)throw fetchErr;
    rows.push(...(part||[]));
    if((part||[]).length<500)break;
   }
   return rows;
  };
  Promise.all(tables.map(fetchTable)).then(result=>{
   if(!active)return;
   setData(Object.fromEntries(tables.map((table,i)=>[({class_sessions:'sessions',student_records:'records',student_results:'results',student_evaluations:'evaluations'})[table]||table,result[i]])));
  }).catch(e=>{if(active)setError(e.message||'Không tải được hồ sơ đánh giá.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[profile.school_id,refresh,version]);
 const classNames=useMemo(()=>[...new Set(data.students.map(x=>x.class_name).filter(Boolean))]
  .sort((a,b)=>a.localeCompare(b,'vi',{numeric:true})),[data.students]);
 const visible=useMemo(()=>data.students.filter(x=>x.status==='active'&&(!classFilter||x.class_name===classFilter)
   &&searchName(x.full_name).includes(searchName(search))).sort(compareStudentName),
   [data.students,classFilter,search]);
 const student=data.students.find(x=>x.id===selected);
 const summary=useMemo(()=>student?makeEvidence(student,data):null,[student,data]);
 const pastReviews=useMemo(()=>data.evaluations.filter(x=>x.student_id===selected)
  .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5),[data.evaluations,selected]);
 useEffect(()=>{setComment(summary?.ruleDraft||'');setSource('rule');setInsights(null);},[selected,summary?.ruleDraft]);
 async function askAI(){
  if(!student||!summary?.hasEvidence||aiBusy)return;
  setAiBusy(true);setError('');
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token)throw Error('Phiên đăng nhập hết hạn.');
   const resp=await fetch('/api/student-evaluation',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
    body:JSON.stringify({school_id:profile.school_id,student_id:student.id,
      period_label:periodName(period,customPeriod)})
   });
   const result=await resp.json().catch(()=>({}));
   if(!resp.ok)throw Error(result.error||'AI chưa tạo được nhận xét.');
   if(selected!==student.id)return;
   setComment(result.comment);setInsights(result);setSource('ai');
   ping?.('AI đã tạo bản nháp. Hãy xem, chỉnh sửa rồi mới lưu hồ sơ.');
  }catch(e){setError(e.message||'AI chưa phản hồi.');}
  finally{setAiBusy(false);}
 }
 async function save(){
  if(!student||!summary||!summary.hasEvidence||saving)return;
  const label=periodName(period,customPeriod);
  if(label.length<3||label.length>90){setError('Nhập giai đoạn đánh giá từ 3 đến 90 ký tự.');return;}
  if(comment.trim().length<25){setError('Nhận xét cần ít nhất 25 ký tự.');return;}
  setSaving(true);setError('');
  const {error:saveErr}=await supabase.from('student_evaluations').insert({
   school_id:profile.school_id,student_id:student.id,period_label:label,
   level:summary.level,comment:comment.trim().slice(0,1600),
   metrics:{points:summary.points,awards:summary.awards,violations:summary.violations,
    lessons:summary.total,absences:summary.absence,lates:summary.late,
    attendance_rate:summary.attendanceRate,scores_count:summary.scores.length,
    source,ai_confidence:source==='ai'?insights?.confidence:null,
    strengths:insights?.strengths||summary.positives,
    improvements:insights?.improvements||summary.needs,
    actions:insights?.actions||summary.actions},created_by:profile.id
  });
  setSaving(false);
  if(saveErr){setError(saveErr.message);return;}
  ping?.('Đã lưu đánh giá vào hồ sơ học sinh.');
  setVersion(v=>v+1);reload?.();
 }
 const getTitle=student?.full_name||'Học sinh';
 const evidenceReady=summary?.hasEvidence&&!!student;
 return <section className="evaluation-v2">
  <header className="evaluation-v2-hero">
   <div className="evaluation-v2-orb"><Sparkles size={30}/></div>
   <div><span className="evaluation-v2-kicker">IC3 GS6 · STUDENT INSIGHTS</span>
     <h2>Đánh giá & phát triển học sinh</h2>
     <p>Tổng hợp điểm, chuyên cần, khen thưởng và nội quy thành nhận xét có căn cứ. AI hỗ trợ soạn nháp, giáo viên quyết định kết quả cuối cùng.</p>
   </div>
   <div className="evaluation-v2-hero-pill"><ShieldCheck size={16}/> Giáo viên kiểm duyệt</div>
  </header>
  <div className="evaluation-v2-shell">
   <div className="evaluation-v2-content">
    <section className="evaluation-v2-panel">
     <div className="evaluation-v2-section-head"><div><h3><Search size={17}/> Chọn hồ sơ cần đánh giá</h3>
       <p>Chọn đúng trường, lớp và học sinh trước khi tạo nhận xét.</p></div>
       <span className="evaluation-v2-count">{visible.length} học sinh</span></div>
     <div className="evaluation-v2-filters">
      <label>Lọc lớp<select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setSelected('');}}>
       <option value="">Tất cả lớp</option>{classNames.map(c=><option key={c}>{c}</option>)}
      </select></label>
      <label>Tìm học sinh<input value={search} onChange={e=>{setSearch(e.target.value);setSelected('');}}
       placeholder="Nhập họ và tên, có dấu hoặc không dấu"/></label>
      <label>Chọn học sinh<select value={selected} onChange={e=>setSelected(e.target.value)}>
       <option value="">Chọn một học sinh</option>{visible.map(x=><option key={x.id} value={x.id}>{x.full_name} · {x.class_name}</option>)}
      </select></label>
     </div>
     {loading&&<p className="evaluation-v2-empty"><Loader2 className="eval-spin" size={19}/> Đang tải số liệu của trường...</p>}
     {error&&<p className="evaluation-v2-error" role="alert">{error}</p>}
     {!loading&&!student&&<div className="evaluation-v2-empty"><UserRound size={32}/>
       <strong>Chọn học sinh để bắt đầu</strong><p>Hồ sơ sẽ hiện bảng chỉ số, bằng chứng, gợi ý và lịch sử đánh giá tại đây.</p></div>}
     {!loading&&student&&summary&&<>
      <div className="evaluation-v2-profile">
       <div className="evaluation-v2-avatar">{getTitle.slice(0,1).toLocaleUpperCase('vi')}</div>
       <div><h3>{getTitle}</h3><p>Lớp {student.class_name} · {profile.school_name}</p></div>
       <span className={'evaluation-v2-level '+(!summary.hasEvidence?'quiet':summary.violations||summary.absence>=2?'caution':'good')}>{summary.level}</span>
      </div>
      <div className="evaluation-v2-stats">
       <div><Award/><small>Điểm ghi nhận</small><b>{summary.points}</b><span>Điểm thưởng/tích lũy</span></div>
       <div><BarChart3/><small>Đầu điểm</small><b>{summary.scores.length}</b><span>Điểm kiểm tra đã nhập</span></div>
       <div><CalendarCheck/><small>Chuyên cần</small><b>{summary.attendanceRate===null?'—':summary.attendanceRate+'%'}</b><span>{summary.absence} vắng / {summary.total} buổi</span></div>
       <div><Sparkles/><small>Khen thưởng</small><b>{summary.awards}</b><span>Lần ghi nhận tích cực</span></div>
       <div><AlertTriangle/><small>Lưu ý nội quy</small><b>{summary.violations}</b><span>Lượt ghi nhận</span></div>
      </div>
      <div className="evaluation-v2-evidence">
       <h4><BookOpenCheck size={17}/> Căn cứ đánh giá</h4>
       {summary.evidence.map((s,i)=><div key={i}><CheckCircle2 size={14}/>{s}</div>)}
       {summary.scores.length>0&&<details><summary>Xem {summary.scores.length} đầu điểm đã nhập</summary>
        <div className="evaluation-v2-score-list">{summary.scores.map((x,i)=><span key={i}>{x.name}: <b>{x.value}</b></span>)}</div>
       </details>}
       <small>Chuyên cần tính theo số buổi lớp đã tạo: ô không đánh dấu vắng được tính có mặt theo quy ước QLPM. Chỉ số không thay thế nhận định sư phạm.</small>
      </div>
     </>}
    </section>
    {student&&summary&&<section className="evaluation-v2-panel evaluation-v2-editor">
      <div className="evaluation-v2-section-head"><div><h3><Sparkles size={18}/> Soạn nhận xét chuyên sâu</h3>
       <p>AI chỉ phân tích số liệu ẩn danh; không gửi tên, giới tính, ngày sinh hoặc ghi chú tự do của học sinh.</p></div></div>
      <div className="evaluation-v2-filters">
       <label>Giai đoạn<select value={period} onChange={e=>setPeriod(e.target.value)}>
        {periods.map(p=><option key={p}>{p}</option>)}<option>Khác</option>
       </select></label>
       {period==='Khác'&&<label>Tên giai đoạn<input maxLength={90} value={customPeriod} onChange={e=>setCustomPeriod(e.target.value)} placeholder="Ví dụ: Tháng 11/2026"/></label>}
      </div>
      <div className="evaluation-v2-controls">
       <button type="button" className="btn outline" onClick={()=>{setComment(summary.ruleDraft);setInsights(null);setSource('rule');}} disabled={!evidenceReady||aiBusy}><RefreshCw size={15}/> Theo quy tắc</button>
       <button type="button" className="btn primary" disabled={!evidenceReady||aiBusy||!periodName(period,customPeriod).trim()} onClick={askAI}>
        {aiBusy?<Loader2 className="eval-spin" size={16}/>:<Sparkles size={16}/>}
        {aiBusy?'AI đang phân tích…':'AI đánh giá chi tiết'}
       </button>
       <span className="evaluation-v2-source">{source==='ai'?'Bản nháp Gemini AI':'Nhận xét theo quy tắc'}</span>
      </div>
      <textarea aria-label="Nội dung nhận xét học sinh" rows={6} value={comment} maxLength={1600} onChange={e=>setComment(e.target.value)}/>
      <div className="evaluation-v2-editor-footer"><small>{countWords(comment)} từ · Có thể chỉnh sửa trước khi lưu</small>
       <button type="button" className="btn primary" onClick={save} disabled={!evidenceReady||saving||comment.trim().length<25}>
        {saving?<Loader2 className="eval-spin" size={15}/>:<FileCheck2 size={15}/>}
        {saving?'Đang lưu…':'Lưu đánh giá vào hồ sơ'}
       </button>
      </div>
      {!summary.hasEvidence&&<p className="evaluation-v2-note"><Info size={15}/> Cần ghi nhận ít nhất một buổi học, đầu điểm hoặc sự kiện trước khi đánh giá.</p>}
    </section>}
   </div>
   <aside className="evaluation-v2-aside">
    <section className="evaluation-v2-panel">
     <h3><Lightbulb size={18}/> Gợi ý phát triển</h3>
     {!student?<p className="muted">Chọn một học sinh để xem gợi ý dựa trên dữ liệu.</p>:<>
       <h4>Điểm tích cực</h4>
       <ul>{(insights?.strengths?.length?insights.strengths:summary?.positives?.length?summary.positives:['Chưa có dữ liệu tích cực cụ thể để kết luận.']).map((x,i)=><li key={i}>{x}</li>)}</ul>
       <h4>Điểm cần hỗ trợ</h4>
       <ul>{(insights?.improvements?.length?insights.improvements:summary?.needs||[]).map((x,i)=><li key={i}>{x}</li>)}</ul>
       <h4>Hướng hành động</h4>
       <ul>{(insights?.actions?.length?insights.actions:summary?.actions||[]).map((x,i)=><li key={i}>{x}</li>)}</ul>
     </>}
    </section>
    <section className="evaluation-v2-panel">
     <h3><History size={18}/> Lịch sử đánh giá</h3>
     {!pastReviews.length?<p className="muted">Chưa lưu nhận xét cho học sinh này.</p>:pastReviews.map(v=><article key={v.id} className="evaluation-v2-history">
      <strong>{v.period_label}</strong><time>{niceDate(v.created_at)}</time><p>{v.comment}</p>
      <span>{v.level}</span>
     </article>)}
    </section>
    <div className="evaluation-v2-privacy"><ShieldCheck size={18}/>
     <span>AI là công cụ tham khảo, không tự ghi dữ liệu và không thay thế đánh giá của giáo viên. Mỗi lần dùng AI tính vào hạn mức trợ lý hiện có.</span>
    </div>
   </aside>
  </div>
 </section>;
}
