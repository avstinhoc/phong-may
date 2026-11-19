import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';
import {FlameBadge} from './FlameBadge';
import {isFormalViolation} from './lib/stars';
import './StudentRewardManagement.css';
import {StudentPicker} from './StudentPicker';
import {RecordCorrectionEditor} from './RecordCorrectionEditor';

const today=()=>{
 const d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
const types={
 award:{title:'Thưởng 1 sao ⭐',description:'Cộng 1 sao và giữ chuỗi lửa'},
 disorder:{title:'Mất trật tự (−2 sao trở lên)',description:'Trừ sao, giảm một cấp lửa; không tính lỗi lập biên bản'},
 violation:{title:'Lỗi / vi phạm',description:'Ghi nhận lỗi chính thức, có thể dùng để lập biên bản'},
 point:{title:'Điểm học tập',description:'Ghi điểm học tập, không thay đổi sao'},
 redeem:{title:'Đổi quà',description:'Đổi tối thiểu 2 sao khả dụng'},
 restore:{title:'Khôi phục lửa xám',description:'Dùng một lượt khôi phục, không hoàn lại sao'}
};
const num=value=>Number(value||0).toLocaleString('vi-VN');
const dateLabel=value=>value?String(value).slice(0,10).split('-').reverse().join('/'):'—';

export function StudentRewardManagement({profile,refresh,onNavigate}){
 const [students,setStudents]=useState([]),[wallets,setWallets]=useState([]);
 const [violationTotals,setViolationTotals]=useState([]),[statAudit,setStatAudit]=useState([]);
 const [showTotalsEditor,setShowTotalsEditor]=useState(false),[totalsBusy,setTotalsBusy]=useState(false);
 const [totalsDraft,setTotalsDraft]=useState({available:'0',earned:'0',violations:'0',reason:''});
 const [selectedClass,setSelectedClass]=useState('');
 const [studentId,setStudentId]=useState(''),[history,setHistory]=useState([]);
 const [kind,setKind]=useState('award'),[title,setTitle]=useState('Nhắc 1');
 const [stars,setStars]=useState(2),[points,setPoints]=useState(1),[awardStars,setAwardStars]=useState(1);
 const [editing,setEditing]=useState(null);
 const [note,setNote]=useState(''),[recordDate,setRecordDate]=useState(today());
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[success,setSuccess]=useState('');
 const [localRefresh,setLocalRefresh]=useState(0);
 const schoolId=profile?.school_id;
 useEffect(()=>{
   let alive=true;
   if(!schoolId){setStudents([]);setWallets([]);setViolationTotals([]);setLoading(false);return;}
   setLoading(true);setError('');
   Promise.all([
     supabase.from('students').select('id,full_name,class_name,status').eq('school_id',schoolId).eq('status','active').order('full_name').limit(2000),
     supabase.from('ic3_star_wallets').select('*').eq('school_id',schoolId).limit(2000),
     supabase.from('ic3_student_violation_totals').select('student_id,violations,adjustment').eq('school_id',schoolId).limit(2000)
   ]).then(([studentsResult,walletResult,violationsResult])=>{
     if(!alive)return;
     setLoading(false);
     if(studentsResult.error||walletResult.error||violationsResult.error){
       setError((studentsResult.error||walletResult.error||violationsResult.error).message);
       return;
     }
     setStudents(studentsResult.data||[]);setWallets(walletResult.data||[]);
     setViolationTotals(violationsResult.data||[]);
   }).catch(err=>{if(alive){setLoading(false);setError(err.message);}});
   return()=>{alive=false;};
 },[schoolId,refresh,localRefresh]);
 useEffect(()=>{
   let alive=true;
   setHistory([]);setStatAudit([]);
   if(!schoolId||!studentId)return;
   supabase.from('ic3_student_stat_audit').select('id,before_totals,after_totals,reason,changed_at')
     .eq('school_id',schoolId).eq('student_id',studentId).order('changed_at',{ascending:false}).limit(5)
     .then(({data,error})=>{if(alive){if(error)setError(error.message);else setStatAudit(data||[]);}})
     .catch(err=>{if(alive)setError(err.message);});
   supabase.from('student_records').select('id,student_id,record_type,star_event,title,points,note,record_date,created_at')
     .eq('school_id',schoolId).eq('student_id',studentId)
     .order('created_at',{ascending:false}).limit(100)
     .then(({data,error})=>{
       if(!alive)return;
       if(error)setError(error.message);
       else setHistory(data||[]);
     }).catch(err=>{if(alive)setError(err.message);});
   return()=>{alive=false;};
 },[schoolId,studentId,refresh,localRefresh]);
 const classes=useMemo(()=>[...new Set(students.map(s=>s.class_name).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,'vi',{numeric:true})),[students]);
 const visible=useMemo(()=>students.filter(st=>
   !selectedClass||st.class_name===selectedClass
 ),[students,selectedClass]);
 const student=students.find(st=>st.id===studentId);
 const wallet=wallets.find(w=>w.student_id===studentId);
 const statRow=violationTotals.find(r=>r.student_id===studentId);
 const formalCount=Number(statRow?.violations??history.filter(isFormalViolation).length);
 const adjusted=statAudit.length>0||Boolean(statRow?.adjustment);
 const penalties=history.filter(r=>r.star_event==='penalty').length;
 function openTotalsEditor(){
   if(!student||loading||totalsBusy)return;
   setTotalsDraft({
     available:String(Number(wallet?.available||0)),
     earned:String(Number(wallet?.earned||0)),
     violations:String(formalCount),reason:''
   });
   setShowTotalsEditor(true);setError('');setSuccess('');
 }
 async function saveTotals(e){
   e.preventDefault();
   if(!student||loading||totalsBusy||!schoolId)return;
   const newAvailable=Number(totalsDraft.available);
   const newEarned=Number(totalsDraft.earned);
   const newViolations=Number(totalsDraft.violations);
   if(![newAvailable,newEarned,newViolations].every(Number.isSafeInteger)
     ||newAvailable<0||newEarned<0||newAvailable>newEarned
     ||newAvailable>1000000||newEarned>1000000
     ||newViolations<0||newViolations>500){
     setError('Nhập số nguyên hợp lệ: sao không âm, sao hiện có không vượt tổng sao; lỗi từ 0 đến 500.');return;
   }
   if(totalsDraft.reason.trim().length<5||totalsDraft.reason.trim().length>500){
     setError('Lý do chỉnh sửa cần từ 5 đến 500 ký tự.');return;
   }
   const oldAvailable=Number(wallet?.available||0),oldEarned=Number(wallet?.earned||0);
   if(newAvailable===oldAvailable&&newEarned===oldEarned&&newViolations===formalCount){
     setError('Bạn chưa thay đổi chỉ số nào.');return;
   }
   if(!window.confirm('Xác nhận sửa chỉ số của '+student.full_name+' · Lớp '+student.class_name
     +'?\nSao hiện có: '+oldAvailable+' → '+newAvailable
     +'\nTổng sao đã kiếm: '+oldEarned+' → '+newEarned
     +'\nLỗi biên bản: '+formalCount+' → '+newViolations
     +'\nHệ thống sẽ lưu nhật ký đối soát và cập nhật BXH.'))return;
   setTotalsBusy(true);setError('');setSuccess('');
   try{
     const {error:err}=await supabase.rpc('ic3_set_student_summary_totals',{
       p_student_id:studentId,
       p_available:newAvailable,p_earned:newEarned,p_violations:newViolations,
       p_expected_available:oldAvailable,p_expected_earned:oldEarned,
       p_expected_violations:formalCount,p_reason:totalsDraft.reason.trim()
     });
     if(err)throw err;
     setShowTotalsEditor(false);
     setSuccess('Đã cập nhật 3 chỉ số của '+student.full_name+'. BXH và số lỗi được tính lại.');
     setLocalRefresh(n=>n+1);
   }catch(err){setError('Không chỉnh sửa được chỉ số: '+(err?.message||String(err)));}
   finally{setTotalsBusy(false);}
 }
 async function save(e){
   e.preventDefault();
   setError('');setSuccess('');
   if(!student||busy)return;
   const amount=Number(stars),score=Number(points),reward=Number(awardStars);
   if(kind==='award'&&(!Number.isSafeInteger(reward)||reward<1||reward>1000)){
     setError('Số sao thưởng phải là số nguyên từ 1 đến 1000.');return;
   }
   if(['disorder','redeem'].includes(kind)&&(!Number.isSafeInteger(amount)||amount<2)){
     setError('Cần nhập ít nhất 2 sao nguyên.');return;
   }
   if(kind==='redeem'&&amount>Number(wallet?.available||0)){
     setError('Sao hiện có không đủ để đổi quà.');return;
   }
   if(kind==='restore'&&!wallet?.can_restore){
     setError('Học sinh chưa đủ điều kiện hoặc đã hết lượt khôi phục.');return;
   }
   if(kind==='point'&&!Number.isFinite(score)){setError('Nhập điểm học tập hợp lệ.');return;}
   if(kind==='violation'&&!title.trim()){setError('Cần nhập nội dung vi phạm.');return;}
   if(['redeem','disorder','restore'].includes(kind)&&!window.confirm(
     kind==='redeem'?'Xác nhận đổi '+amount+' sao của '+student.full_name+'?':
     kind==='restore'?'Dùng 1 lượt khôi phục lửa cho '+student.full_name+', không hoàn lại sao?':
     'Xác nhận trừ '+amount+' sao của '+student.full_name+' vì mất trật tự?'
   ))return;
   setBusy(true);
   try{
     if(kind==='redeem'){
       const {error:err}=await supabase.rpc('ic3_redeem_student_stars',{
         p_student_id:studentId,p_stars:amount,p_note:note.trim()||'Giáo viên đã xác nhận đổi quà'
       });
       if(err)throw err;
     }else{
       const record={
         school_id:schoolId,student_id:studentId,created_by:profile.id,
         record_date:recordDate,note:note.trim().slice(0,500),
         record_type:kind==='point'?'point':kind==='violation'?'violation':'reward',
         title:kind==='award'?'Điểm thưởng':kind==='disorder'?'Mất trật tự':
           kind==='restore'?'Phục hồi chuỗi sao':kind==='point'?'Điểm học tập':title.trim(),
         points:kind==='award'?reward:kind==='disorder'?-amount:
           kind==='restore'?0:kind==='point'?score:0,
         ...(kind==='disorder'?{star_event:'penalty'}:
           kind==='restore'?{star_event:'recovery'}:{})
       };
       const {error:err}=await supabase.from('student_records').insert(record);
       if(err)throw err;
     }
     setSuccess('Đã lưu '+types[kind].title.toLocaleLowerCase('vi')+' cho '+student.full_name+'.');
     setNote('');setLocalRefresh(n=>n+1);
   }catch(err){setError('Không lưu được: '+(err?.message||String(err)));}
   finally{setBusy(false);}
 }
 return <div className="student-reward-management">
   <header className="srm-header">
     <div><span className="srm-eyebrow">GIẢNG DẠY · THEO DÕI CÁ NHÂN</span>
       <h2>⭐ Quản lý sao, thưởng & vi phạm</h2>
       <p>Tra cứu từng học sinh, ghi thưởng/phạt và xem lịch sử. Cùng dữ liệu với mục Điểm, lỗi & thưởng, không nhân đôi bản ghi.</p>
     </div>
     <button className="btn outline" type="button" onClick={()=>onNavigate('records')}>Xem đầy đủ Điểm, lỗi & thưởng ↗</button>
   </header>
   <section className="srm-filter panel">
     <StudentPicker key={selectedClass} students={visible} selectedId={studentId}
       onSelect={id=>{setStudentId(id);setEditing(null);setShowTotalsEditor(false);setError('');setSuccess('');}}
       label="🔎 Tìm & chọn học sinh" placeholder="Nhập tên rồi chọn đúng học sinh trong danh sách…"
       disabled={loading||busy}/>
     <label>🏫 Lọc theo lớp
       <select value={selectedClass} onChange={e=>{setSelectedClass(e.target.value);setStudentId('');setEditing(null);setShowTotalsEditor(false);}}>
         <option value="">Tất cả lớp</option>
         {classes.map(c=><option key={c} value={c}>{c}</option>)}
       </select>
     </label>
   </section>
   {loading&&<p className="srm-message">Đang tải danh sách học sinh và số sao…</p>}
   {error&&<p className="srm-error" role="alert">{error}</p>}
   {success&&<p className="srm-success" role="status">{success}</p>}
   {!student&&!loading&&<section className="panel srm-welcome">
     <span>🏅</span><h3>Chọn học sinh để bắt đầu</h3>
     <p>Hiện có {visible.length} học sinh theo bộ lọc. Bạn có thể tra cứu sao hiện có, tổng sao đã kiếm, số lần vi phạm và thực hiện cộng/trừ thưởng.</p>
   </section>}
   {student&&!loading&&<>
     <section className="srm-student-hero">
       <div className="srm-student-heading">
         <div className="srm-student-title"><div className="srm-avatar" aria-hidden="true">{student.full_name.slice(0,1)}</div>
           <div><small>HỒ SƠ THI ĐUA</small><h3>{student.full_name} <FlameBadge wallet={wallet||{earned:0,effect_score:0}} compact/></h3>
             <p>Lớp {student.class_name||'Chưa phân lớp'} · {wallet?.flame_state==='gray'?'Lửa đang xám':wallet?.flame_state==='cooling'?'Cần giữ chuỗi':'Theo dõi thưởng & kỷ luật'}</p>
           </div>
         </div>
         <button className="srm-edit-totals-btn" type="button" onClick={()=>showTotalsEditor?setShowTotalsEditor(false):openTotalsEditor()}
           disabled={totalsBusy||loading} aria-expanded={showTotalsEditor}
           aria-controls="srm-totals-editor">
           {showTotalsEditor?'✕ Đóng chỉnh sửa':'✏️ Sửa 3 chỉ số'}
         </button>
       </div>
       <div className="srm-stats">
         <article><span>⭐ Sao hiện có</span><strong>{num(wallet?.available)}</strong><small>Dùng để đổi quà</small></article>
         <article><span>🏆 Tổng sao đã kiếm</span><strong>{num(wallet?.earned)}</strong><small>Dùng xếp hạng</small></article>
         <article><span>⚠️ Lỗi biên bản</span><strong>{formalCount}</strong><small>Tổng số lỗi chính thức</small></article>
         <article><span>🔥 Sao hiệu ứng</span><strong>{num(wallet?.effect_score)}</strong><small>{penalties} lần phạt gần nhất</small></article>
         <article><span>↻ Lượt khôi phục</span><strong>{wallet?.chances??3}/3</strong><small>Không hoàn trả sao</small></article>
       </div>
       {showTotalsEditor&&<form id="srm-totals-editor" className="srm-totals-editor" onSubmit={saveTotals}>
         <div className="srm-totals-editor-header">
           <div><h4>✏️ Điều chỉnh trực tiếp chỉ số học sinh</h4>
             <p>Sửa số tổng của học sinh, không xóa lịch sử thưởng/phạt đã ghi nhận.</p></div>
         </div>
         <div className="srm-totals-fields">
           <label>⭐ Sao hiện có
             <input type="number" min="0" max="1000000" step="1" required
               value={totalsDraft.available} disabled={totalsBusy}
               onChange={e=>setTotalsDraft(v=>({...v,available:e.target.value}))}/>
           </label>
           <label>🏆 Tổng sao đã kiếm
             <input type="number" min="0" max="1000000" step="1" required
               value={totalsDraft.earned} disabled={totalsBusy}
               onChange={e=>setTotalsDraft(v=>({...v,earned:e.target.value}))}/>
           </label>
           <label>⚠️ Lỗi biên bản
             <input type="number" min="0" max="500" step="1" required
               value={totalsDraft.violations} disabled={totalsBusy}
               onChange={e=>setTotalsDraft(v=>({...v,violations:e.target.value}))}/>
           </label>
         </div>
         <label className="srm-totals-reason">Lý do chỉnh sửa (bắt buộc)
           <textarea rows={2} required minLength={5} maxLength={500} disabled={totalsBusy}
             value={totalsDraft.reason} onChange={e=>setTotalsDraft(v=>({...v,reason:e.target.value}))}
             placeholder="Ví dụ: Giáo viên cộng nhầm sao hoặc ghi nhầm số lỗi."/>
         </label>
         <p className="srm-totals-warning">
           Sao hiện có phải không vượt tổng sao đã kiếm. Biên bản đã xác nhận được bảo vệ;
           sau này thưởng/phạt tiếp thì các chỉ số vẫn tự cộng dồn.
         </p>
         <div className="srm-totals-actions">
           <button type="button" className="btn outline" onClick={()=>setShowTotalsEditor(false)} disabled={totalsBusy}>Hủy</button>
           <button type="submit" className="btn primary" disabled={totalsBusy}>
             {totalsBusy?'Đang cập nhật…':'✓ Lưu 3 chỉ số'}
           </button>
         </div>
       </form>}
       {statAudit.length>0&&<details className="srm-total-audit">
         <summary>🧾 Lịch sử chỉnh sửa chỉ số ({statAudit.length} lần gần nhất)</summary>
         <div className="srm-audit-items">{statAudit.map(a=><div key={a.id} className="srm-audit-item">
           <strong>{dateLabel(a.changed_at)} · {new Date(a.changed_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</strong>
           <p>{a.reason}</p>
           <small>⭐ {a.before_totals?.available} → {a.after_totals?.available} ·
             🏆 {a.before_totals?.earned} → {a.after_totals?.earned} ·
             ⚠️ {a.before_totals?.violations} → {a.after_totals?.violations}</small>
         </div>)}</div>
       </details>}
     </section>
     <div className="srm-grid">
       <section className="panel srm-action-panel">
         <h3>✍️ Ghi nhận cho {student.full_name}</h3>
         <form className="srm-form" onSubmit={save}>
           <label>Loại ghi nhận
             <select value={kind} onChange={e=>{setKind(e.target.value);setError('');}}>
               {Object.entries(types).map(([key,value])=>
                 <option key={key} value={key}>{value.title}</option>)}
             </select>
           </label>
           <p className="srm-action-hint">{types[kind].description}</p>
           {kind==='award'&&<label>Số sao thưởng
             <input required type="number" min="1" max="1000" step="1" value={awardStars} onChange={e=>setAwardStars(e.target.value)}/>
           </label>}
           {(kind==='disorder'||kind==='redeem')&&<label>{kind==='disorder'?'Số sao bị trừ':'Số sao muốn đổi'}
             <input required type="number" min="2" step="1" value={stars} onChange={e=>setStars(e.target.value)}/>
           </label>}
           {kind==='point'&&<label>Điểm học tập (+/−)
             <input required type="number" step="any" value={points} onChange={e=>setPoints(e.target.value)}/>
           </label>}
           {kind==='violation'&&<label>Nội dung lỗi / vi phạm
             <input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ví dụ: Không làm bài"/>
           </label>}
           {kind!=='redeem'&&<label>Ngày ghi nhận
             <input required type="date" value={recordDate} onChange={e=>setRecordDate(e.target.value)}/>
           </label>}
           <label>Ghi chú (không bắt buộc)
             <textarea rows={3} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Nội dung ngắn gọn để giáo viên đối chiếu…"/>
           </label>
           <button className="btn primary full" type="submit" disabled={busy||(kind==='restore'&&!wallet?.can_restore)}>
             {busy?'Đang lưu…':kind==='redeem'?'✓ Xác nhận đổi quà':kind==='restore'?'↻ Khôi phục hiệu ứng':'Lưu ghi nhận'}
           </button>
           {kind==='restore'&&!wallet?.can_restore&&<small>Học sinh chưa có lửa xám đủ điều kiện hoặc đã hết 3 lượt khôi phục.</small>}
         </form>
       </section>
       <section className="panel srm-history-panel">
         <div className="srm-history-header"><h3>📖 Lịch sử học sinh</h3><span>{history.length} ghi nhận gần nhất</span></div>
         <div className="srm-history-scroller">
           {history.map(r=><React.Fragment key={r.id}>
             <div className="srm-history-row">
               <div><b>{r.title}</b><small>{dateLabel(r.record_date)} · {
                 r.star_event==='penalty'?'Phạt trừ sao':
                 r.star_event==='recovery'?'Phục hồi lửa':
                 isFormalViolation(r)?'Lỗi biên bản':
                 r.record_type==='reward'?'Sao & quà':'Điểm học tập'}</small></div>
               <strong className={Number(r.points)<0?'srm-negative':'srm-positive'}>
                 {isFormalViolation(r)?'1 lỗi':Number(r.points)>0?'+'+num(r.points):num(r.points)}
               </strong>
               <button type="button" className="record-correction-edit-button" disabled={busy||r.star_event==='recovery'}
                 onClick={()=>setEditing(editing?.id===r.id?null:r)}
                 title={r.star_event==='recovery'?'Không thể sửa trực tiếp lượt khôi phục':'Chỉnh sửa ghi nhận khi chọn nhầm học sinh'}>✏️ Sửa</button>
             </div>

           </React.Fragment>)}
           {!history.length&&<p className="srm-message">Chưa có ghi nhận cho học sinh này.</p>}
         </div>
         {editing&&<RecordCorrectionEditor key={editing.id} record={editing} students={students}
           onCancel={()=>setEditing(null)}
           onSaved={message=>{setEditing(null);setSuccess(message);setLocalRefresh(n=>n+1);}}/>}
       </section>
     </div>
   </>}
 </div>;
}
