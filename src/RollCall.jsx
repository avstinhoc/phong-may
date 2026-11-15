import React, {useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
export function RollCall({profile,sessions,refresh,ping}) {
 const [sessionId,setSessionId]=useState(''),[rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{let live=true; setRows([]);setError(''); if(!sessionId)return; setLoading(true);
 (async()=>{
  const lesson=sessions.find(s=>s.id===sessionId);if(!lesson){setLoading(false);return;}
  const results=await Promise.all([
   supabase.from('students').select('*').eq('school_id',profile.school_id).eq('status','active'),
   supabase.from('computer_assignments').select('student_id,computer_id').eq('school_id',profile.school_id).eq('active',true),
   supabase.from('computers').select('id,computer_code').eq('school_id',profile.school_id),
   supabase.from('attendance').select('student_id,status,note').eq('session_id',sessionId)]);
  if(!live)return;setLoading(false);const failed=results.find(r=>r.error);if(failed){setError(failed.error.message);return;}
  const [students,assignments,pcs,saved]=results.map(r=>r.data);
  setRows(students.filter(s=>(lesson.class_id&&s.class_id?s.class_id===lesson.class_id:s.class_name===lesson.class_name)&&assignments.some(a=>a.student_id===s.id)).map(s=>{
   const a=assignments.find(a=>a.student_id===s.id), old=saved.find(a=>a.student_id===s.id);
   return {student_id:s.id,name:s.full_name,pc:pcs.find(p=>p.id===a.computer_id)?.computer_code,status:old?.status||'',note:old?.note||''};
  }).sort((a,b)=>(a.pc||'').localeCompare(b.pc||'',undefined,{numeric:true})));
 })();return ()=>{live=false;};},[sessionId,profile.school_id,refresh,sessions]);
 async function save(){setBusy(true);setError('');const {error}=await supabase.rpc('save_roll_call',{target_session:sessionId,entries:rows.map(({student_id,status,note})=>({student_id,status,note}))});setBusy(false);if(error)setError(error.message);else ping('Đã lưu điểm danh '+rows.length+' học sinh');}
 const update=(id,key,value)=>setRows(rs=>rs.map(r=>r.student_id===id?{...r,[key]:value}:r));
 return <section className="panel roll-call"><h3>Điểm danh học sinh</h3><p className="muted">Danh sách học sinh đã duyệt và được gán máy trong lớp của buổi học.</p>
 <div className="toolbar"><select aria-label="Buổi học điểm danh" value={sessionId} disabled={busy} onChange={e=>setSessionId(e.target.value)}><option value="">Chọn buổi học</option>{[...sessions].sort((a,b)=>b.session_date.localeCompare(a.session_date)).map(s=><option value={s.id} key={s.id}>{s.session_date.split('-').reverse().join('/')} · {s.start_time.slice(0,5)} · {s.class_name}</option>)}</select><button className="btn" disabled={!rows.length||busy} onClick={()=>setRows(rs=>rs.map(r=>({...r,status:'present'})))}>Tất cả có mặt</button></div>
 {error&&<p role="alert" className="notice-box">{error}</p>}{loading&&<p>Đang tải danh sách…</p>}
 {!!sessionId&&!loading&&!rows.length&&!error&&<p className="muted">Lớp chưa có học sinh được gán máy. Duyệt đăng ký trong mục Học sinh hoặc gán máy trong Phòng máy.</p>}
 {!!rows.length&&<><div className="table-wrap"><table><thead><tr><th>Máy</th><th>Học sinh</th><th>Điểm danh</th><th>Ghi chú</th></tr></thead><tbody>{rows.map(r=><tr key={r.student_id}><td>{r.pc}</td><td>{r.name}</td><td><select aria-label={'Điểm danh '+r.name} disabled={busy} value={r.status} onChange={e=>update(r.student_id,'status',e.target.value)}><option value="">Chưa điểm danh</option><option value="present">Có mặt</option><option value="absent">Vắng</option><option value="late">Đi trễ</option><option value="excused">Có phép</option></select></td><td><input aria-label={'Ghi chú '+r.name} disabled={busy} value={r.note} onChange={e=>update(r.student_id,'note',e.target.value)}/></td></tr>)}</tbody></table></div><button className="btn primary" disabled={busy||rows.some(r=>!r.status)} onClick={save}>{busy?'Đang lưu…':'Lưu điểm danh'}</button></>}
 </section>;
}
