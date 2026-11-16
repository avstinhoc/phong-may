import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';
import {compareStudentName} from './lib/students';
const date=s=>s?s.split('-').reverse().join('/'):'';
const labels={present:'Có mặt',absent:'Vắng',late:'Đi trễ',excused:'Có phép'};
export function RollCall({profile,sessions,refresh,onSaved,ping}){
 const [className,setClassName]=useState('');
 const [sessionId,setSessionId]=useState('');
 const [rows,setRows]=useState([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const classes=useMemo(()=>[...new Set(sessions.map(s=>s.class_name).filter(Boolean))].sort(),[sessions]);
 const matches=sessions.filter(s=>!className||s.class_name===className).sort((a,b)=>b.session_date.localeCompare(a.session_date)||b.start_time.localeCompare(a.start_time));
 useEffect(()=>{if(sessionId&&!matches.some(s=>s.id===sessionId))setSessionId('');},[className,sessions]);
 useEffect(()=>{
  let live=true;setRows([]);setError('');
  if(!sessionId)return;
  setLoading(true);
  (async()=>{
   const lesson=sessions.find(s=>s.id===sessionId);
   if(!lesson)return;
   const results=await Promise.all([
    supabase.from('students').select('id,full_name,class_id,class_name,status').eq('school_id',profile.school_id).eq('status','active'),
    supabase.from('computer_assignments').select('student_id,computer_id').eq('school_id',profile.school_id).eq('active',true),
    supabase.from('computers').select('id,computer_code').eq('school_id',profile.school_id),
    supabase.from('attendance').select('student_id,status,note').eq('session_id',sessionId)
   ]);
   if(!live)return;
   setLoading(false);
   const failed=results.find(r=>r.error);if(failed){setError(failed.error.message);return;}
   const [students,assignments,pcs,saved]=results.map(r=>r.data);
   const pupils=students.filter(s=>(lesson.class_id&&s.class_id?s.class_id===lesson.class_id:s.class_name===lesson.class_name));
   const normalized=pupils.map(s=>{
    const a=assignments.find(a=>a.student_id===s.id);
    const old=saved.find(x=>x.student_id===s.id);
    return {student_id:s.id,name:s.full_name,pc:pcs.find(p=>p.id===a?.computer_id)?.computer_code||'Chưa gán máy',status:old?.status||'present',note:old?.note||''};
   }).sort((a,b)=>compareStudentName(a.name,b.name)||a.pc.localeCompare(b.pc,'vi',{numeric:true}));
   setRows(normalized);
  })().catch(e=>{if(live){setLoading(false);setError(e.message);}});
  return ()=>{live=false;};
 },[sessionId,profile.school_id,refresh,sessions]);
 const update=(id,key,value)=>setRows(rs=>rs.map(r=>r.student_id===id?{...r,[key]:value}:r));
 const absent=rows.filter(r=>r.status==='absent'||r.status==='excused').length;
 async function save(){
  if(!sessionId||busy)return;setBusy(true);setError('');
  const {error:err}=await supabase.rpc('save_roll_call',{target_session:sessionId,entries:rows.map(({student_id,status,note})=>({student_id,status,note}))});
  setBusy(false);if(err)setError(err.message);else{ping('Đã lưu điểm danh '+rows.length+' học sinh');onSaved?.();}
 }
 return <section className="panel roll-call">
  <h2>Điểm danh học sinh</h2><p className="muted">Cùng dữ liệu với mục Danh sách học sinh. Chưa đánh dấu vắng = có mặt. Không bắt buộc phải gán máy mới được điểm danh.</p>
  <div className="toolbar roll-toolbar">
    <label>Lớp <select value={className} onChange={e=>{setClassName(e.target.value);setSessionId('');}}>
      <option value="">Tất cả lớp</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}
    </select></label>
    <label>Buổi học <select aria-label="Chọn buổi học" value={sessionId} disabled={busy} onChange={e=>setSessionId(e.target.value)}>
      <option value="">Chọn buổi học</option>{matches.map(s=><option key={s.id} value={s.id}>{date(s.session_date)} · {s.start_time.slice(0,5)} · {s.class_name} · {s.period_count} tiết</option>)}
    </select></label>
    <button className="btn" disabled={!rows.length||busy} onClick={()=>setRows(rs=>rs.map(r=>({...r,status:'present'})))}>Tất cả có mặt</button>
  </div>
  {error&&<p role="alert" className="notice-box">{error}</p>}
  {loading&&<p className="muted">Đang tải danh sách lớp…</p>}
  {!!sessionId&&!loading&&!rows.length&&!error&&<p className="notice-box">Lớp này chưa có học sinh đang học được duyệt.</p>}
  {!!rows.length&&<>
    <div className="roster-mini-summary"><span>Tổng: <b>{rows.length}</b></span><span>Có mặt/đi trễ: <b>{rows.length-absent}</b></span><span>Vắng/có phép: <b>{absent}</b></span></div>
    <div className="table-wrap"><table><thead><tr><th>Máy</th><th>Học sinh</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>
    {rows.map(r=><tr key={r.student_id}>
      <td>{r.pc}</td><td><b>{r.name}</b></td>
      <td><button type="button" className={'roster-mark '+(r.status==='absent'?'absent':'present')} title="Đổi nhanh Có mặt / Vắng" disabled={busy} onClick={()=>update(r.student_id,'status',r.status==='absent'?'present':'absent')}>{r.status==='absent'?'☑ Vắng':'☐'}</button>
        <select aria-label={'Điểm danh '+r.name} value={r.status} disabled={busy} onChange={e=>update(r.student_id,'status',e.target.value)}>
        {Object.entries(labels).map(([k,label])=><option key={k} value={k}>{label}</option>)}
        </select>
      </td>
      <td><input value={r.note} disabled={busy} aria-label={'Ghi chú '+r.name} onChange={e=>update(r.student_id,'note',e.target.value)}/></td>
    </tr>)}
    </tbody></table></div>
    <button className="btn primary" disabled={busy} onClick={save}>{busy?'Đang lưu…':'Lưu điểm danh lớp'}</button>
  </>}
 </section>;
}
