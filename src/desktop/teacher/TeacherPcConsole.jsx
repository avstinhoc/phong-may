import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Monitor,RefreshCw,KeyRound,Star,Plus,CheckCircle2,XCircle,ShieldCheck,Users,ClipboardCheck,Copy,AlertTriangle,Gift,School} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import './teacherPcConsole.css';

const schoolError=e=>/Could not find the function|PGRST202|schema cache/i.test(e?.message||'')
 ?'Các chức năng PIN/ghép PC đang chờ cập nhật máy chủ. Không có dữ liệu học sinh nào bị thay đổi.':e?.message||String(e);
const nameSort=(a,b)=>String(a||'').localeCompare(String(b||''),'vi',{sensitivity:'base'});
const onlyPositive=n=>Number.isSafeInteger(Number(n))&&Number(n)>0&&Number(n)<=1000;
const VNDate=()=>new Date(Date.now()+7*3600*1000).toISOString().slice(0,10);

export function TeacherPcConsole({profile,refresh=0,onNavigate=()=>{}}){
 const [pcs,setPcs]=useState([]),[students,setStudents]=useState([]),[assigned,setAssigned]=useState([]);
 const [requests,setRequests]=useState({pin_requests:[],pc_requests:[]});
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[note,setNote]=useState('');
 const [selectedPc,setSelectedPc]=useState(''),[selectedStudent,setSelectedStudent]=useState(''),[amount,setAmount]=useState('10'),[kind,setKind]=useState('point');
 const [issuedPin,setIssuedPin]=useState(null);
 const [query,setQuery]=useState('');
 const load=useCallback(async()=>{
  if(!profile?.school_id||!supabase)return;
  setLoading(true);setError('');
  try{
   const [p,s,a,r]=await Promise.all([
    supabase.from('computers').select('id,computer_code,status,capacity').eq('school_id',profile.school_id).order('computer_code'),
    supabase.from('students').select('id,full_name,class_name,status').eq('school_id',profile.school_id).eq('status','active'),
    supabase.from('computer_assignments').select('id,computer_id,student_id,active').eq('school_id',profile.school_id).eq('active',true),
    supabase.rpc('qlpm_teacher_desktop_requests',{p_school_id:profile.school_id})
   ]);
   for(const x of [p,s,a])if(x.error)throw x.error;
   setPcs(p.data||[]);setStudents((s.data||[]).sort((x,y)=>nameSort(x.full_name,y.full_name)));
   setAssigned(a.data||[]);
   if(r.error){setRequests({pin_requests:[],pc_requests:[]});setNote(schoolError(r.error));}
   else{setRequests(r.data||{pin_requests:[],pc_requests:[]});}
  }catch(e){setError(schoolError(e));}finally{setLoading(false);}
 },[profile?.school_id]);
 useEffect(()=>{load();},[load,refresh]);
 useEffect(()=>{
  if(!profile?.school_id)return;
  const timer=window.setInterval(()=>load(),30000);
  return()=>window.clearInterval(timer);
 },[profile?.school_id,load]);
 const studentFor=id=>students.find(s=>s.id===id)||null;
 const pcFor=id=>pcs.find(c=>c.id===id)||null;
 const filtered=useMemo(()=>pcs.filter(pc=>!query||pc.computer_code.toLowerCase().includes(query.toLowerCase())||
   assigned.some(a=>a.computer_id===pc.id&&studentFor(a.student_id)?.full_name?.toLowerCase().includes(query.toLowerCase()))),[pcs,query,assigned,students]);
 const studentsAtPc=pcId=>assigned.filter(a=>a.computer_id===pcId).map(a=>studentFor(a.student_id)).filter(Boolean);
 const studentSelected=studentFor(selectedStudent);
 const choosePc=pc=>{
  setSelectedPc(pc.id);setIssuedPin(null);
  const first=studentsAtPc(pc.id)[0];
  setSelectedStudent(first?.id||'');
 };
 async function issuePin(studentId=selectedStudent){
  const s=studentFor(studentId);
  if(!s)return setError('Chưa chọn học sinh hợp lệ.');
  if(!window.confirm('Cấp PIN MỚI cho '+s.full_name+'? PIN cũ và các phiên đăng nhập trước sẽ bị vô hiệu hóa.'))return;
  setBusy('pin:'+studentId);setError('');setIssuedPin(null);
  try{
   const {data,error:err}=await supabase.rpc('qlpm_teacher_issue_student_pin',{p_student_id:studentId});
   if(err)throw err;
   if(!/^[0-9]{6}$/.test(String(data)))throw Error('Máy chủ không trả về PIN hợp lệ.');
   setIssuedPin({student:s.full_name,pin:data});setNote('Đã cấp PIN mới cho '+s.full_name+'. Hãy giao riêng cho học sinh, không công khai trên màn hình máy chiếu.');
  }catch(e){setError(schoolError(e));}finally{setBusy('');}
 }
 async function review(type,requestId,approve){
  const title=type==='pin'?'đổi PIN':'ghép PC';
  if(!window.confirm((approve?'Duyệt':'Từ chối')+' yêu cầu '+title+' này?'))return;
  setBusy(type+requestId);setError('');setIssuedPin(null);
  try{
   const name=type==='pin'?'qlpm_teacher_review_pin_request':'qlpm_teacher_review_pc_request';
   const params=type==='pin'?{p_request_id:requestId,p_approve:approve}:{p_request_id:requestId,p_approve:approve};
   const {data,error:err}=await supabase.rpc(name,params);
   if(err)throw err;
   if(type==='pin'&&approve&&/^[0-9]{6}$/.test(String(data)))setIssuedPin({student:'Học sinh vừa duyệt',pin:String(data)});
   setNote('Đã '+(approve?'duyệt':'từ chối')+' yêu cầu '+title+'.');
   await load();
  }catch(e){setError(schoolError(e));}finally{setBusy('');}
 }
 async function award(e){
  e.preventDefault();setError('');
  if(!studentSelected)return setError('Chọn học sinh đã được gán vào PC.');
  const value=Number(amount);
  if(!onlyPositive(value))return setError('Điểm/sao thưởng phải là số nguyên từ 1 đến 1000.');
  const label=kind==='reward'?'sao thưởng':'điểm thưởng';
  if(!window.confirm('Xác nhận cộng '+value+' '+label+' cho '+studentSelected.full_name+' · '+studentSelected.class_name+'?'))return;
  setBusy('award');setIssuedPin(null);
  try{
   const record={student_id:studentSelected.id,school_id:profile.school_id,created_by:profile.id,
    record_date:VNDate(),record_type:kind,points:value,
    title:kind==='reward'?'Giáo viên thưởng sao qua QLPM Teacher Desktop':'Giáo viên cộng điểm qua QLPM Teacher Desktop',
    note:'Giáo viên xác nhận thủ công khi quản lý máy học sinh'};
   const {error:err}=await supabase.from('student_records').insert(record);
   if(err)throw err;
   setNote('Đã ghi nhận '+value+' '+label+' cho '+studentSelected.full_name+'. Tất cả bảng điểm/BXH vẫn do hệ thống hiện tại tính.');
  }catch(e){setError(schoolError(e));}finally{setBusy('');}
 }
 if(!profile?.school_id)return <div className="teacher-pc-console">Chọn trường trước khi quản lý thiết bị học sinh.</div>;
 const pendingPin=requests.pin_requests||[],pendingPc=requests.pc_requests||[];
 return <section className="teacher-pc-console">
  <div className="tpc-title"><div><span className="tpc-eyebrow">QLPM TEACHER ↔ QLPM STUDENT</span><h2><Monitor size={25}/> Quản lý máy học sinh & PIN</h2>
   <p>Quản lý PC đã phân công, nhận yêu cầu từ Student và thưởng điểm/sao bằng xác nhận giáo viên.</p></div>
   <button className="tpc-button muted" onClick={load} disabled={loading}><RefreshCw size={17}/> Làm mới</button>
  </div>
  <div className="tpc-stats">
   <div><Monitor size={20}/><strong>{pcs.length}</strong><span>Máy đã tạo</span></div>
   <div><Users size={20}/><strong>{new Set(assigned.map(a=>a.student_id)).size}</strong><span>Học sinh gán PC</span></div>
   <div><KeyRound size={20}/><strong>{pendingPin.length}</strong><span>Chờ cấp lại PIN</span></div>
   <div><ClipboardCheck size={20}/><strong>{pendingPc.length}</strong><span>Chờ ghép PC</span></div>
  </div>
  {error&&<p className="tpc-message error" role="alert"><AlertTriangle size={17}/>{error}</p>}
  {note&&<p className="tpc-message info" role="status">{note}</p>}
  {issuedPin&&<div className="tpc-secret" role="alert"><KeyRound size={24}/><div><small>PIN CHỈ HIỆN MỘT LẦN · {issuedPin.student}</small>
      <strong>{issuedPin.pin}</strong><span>Giao trực tiếp cho học sinh. Đóng thông báo sau khi đã ghi nhận mã.</span></div>
    <button type="button" onClick={()=>setIssuedPin(null)}>Ẩn mã</button></div>}
  <div className="tpc-layout">
   <div className="tpc-panel">
    <div className="tpc-panel-header"><h3>🖥 Phòng máy</h3><input aria-label="Tìm máy hoặc học sinh" placeholder="Tìm PC21, tên học sinh…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="tpc-pc-grid">{filtered.map(pc=>{
      const occupants=studentsAtPc(pc.id);
      return <button type="button" key={pc.id} onClick={()=>choosePc(pc)} className={'tpc-pc '+(selectedPc===pc.id?'selected':'')}>
       <Monitor size={25}/><strong>{pc.computer_code}</strong><small>{occupants.length?occupants.map(s=>s.full_name).join(', '):'Chưa phân chỗ'}</small>
       <span>{pc.status==='broken'?'Hỏng':occupants.length?occupants.length+' / '+pc.capacity+' học sinh':'Trống'}</span>
      </button>;
    })}</div>
    {!filtered.length&&<p className="tpc-empty">Không có PC phù hợp. Bạn có thể tạo máy trong mục Phòng máy.</p>}
   </div>
   <div className="tpc-panel tpc-actions">
    <h3>🎓 Thao tác theo học sinh</h3>
    <p>Chọn PC rồi chọn học sinh để quản lý.</p>
    <label>Máy đang chọn<select value={selectedPc} onChange={e=>choosePc(pcFor(e.target.value)||{id:e.target.value})}>
      <option value="">-- Chọn máy --</option>{pcs.map(pc=><option value={pc.id} key={pc.id}>{pc.computer_code}</option>)}
    </select></label>
    <label>Học sinh<select value={selectedStudent} onChange={e=>{setSelectedStudent(e.target.value);setIssuedPin(null);}}>
     <option value="">-- Chọn học sinh --</option>
     {studentsAtPc(selectedPc).map(s=><option value={s.id} key={s.id}>{s.full_name} · {s.class_name}</option>)}
    </select></label>
    {studentSelected&&<div className="tpc-student-name"><Users size={18}/>{studentSelected.full_name} · {studentSelected.class_name}</div>}
    <button className="tpc-button outline" disabled={!studentSelected||!!busy} onClick={()=>issuePin()}><KeyRound size={17}/> Cấp/đổi PIN (6 số)</button>
    <form onSubmit={award} className="tpc-award">
      <h4>Cộng điểm hoặc sao</h4>
      <div className="tpc-award-fields"><select aria-label="Loại thưởng" value={kind} onChange={e=>setKind(e.target.value)}>
        <option value="point">Cộng điểm</option><option value="reward">Cộng sao thưởng</option>
      </select>
      <input type="number" min="1" max="1000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} aria-label="Số điểm hoặc sao" /></div>
      <button type="submit" className="tpc-button primary" disabled={!studentSelected||!!busy}><Star size={17}/> Xác nhận cộng thưởng</button>
    </form>
    <button type="button" className="tpc-button muted" onClick={()=>onNavigate('records')}><ClipboardCheck size={17}/> Xem lịch sử điểm & sao</button>
    <p className="tpc-disclaimer">Giáo viên thao tác trực tiếp, không tự thưởng từ game. PC được liên kết bằng phân công hiện tại của QLPM.</p>
   </div>
  </div>
  <div className="tpc-requests">
   <div className="tpc-panel"><h3><KeyRound size={19}/> Yêu cầu đổi PIN ({pendingPin.length})</h3>
    {!pendingPin.length?<p className="tpc-empty">Không có yêu cầu chờ duyệt.</p>:
      pendingPin.map(r=><div className="tpc-request" key={r.id}><div><strong>{r.name}</strong><small>Lớp {r.class_name}</small></div>
       <div className="tpc-request-actions"><button onClick={()=>review('pin',r.id,true)} disabled={!!busy}><CheckCircle2 size={16}/> Cấp PIN</button>
       <button onClick={()=>review('pin',r.id,false)} disabled={!!busy}><XCircle size={16}/> Từ chối</button></div>
      </div>)}
   </div>
   <div className="tpc-panel"><h3><Monitor size={19}/> Yêu cầu ghép PC ({pendingPc.length})</h3>
    {!pendingPc.length?<p className="tpc-empty">Không có yêu cầu chờ duyệt.</p>:
     pendingPc.map(r=><div className="tpc-request" key={r.id}><div><strong>{r.name}</strong><small>{r.class_name} → {r.computer_code}</small></div>
      <div className="tpc-request-actions"><button onClick={()=>review('pc',r.id,true)} disabled={!!busy}><CheckCircle2 size={16}/> Duyệt</button>
        <button onClick={()=>review('pc',r.id,false)} disabled={!!busy}><XCircle size={16}/> Từ chối</button></div>
      </div>)}
   </div>
  </div>
  <div className="tpc-footnote"><ShieldCheck size={18}/> Mọi thao tác áp dụng phân quyền theo trường trên máy chủ. PIN không được tự chuyển thành quyền giáo viên hoặc điểm thưởng.</div>
 </section>;
}
