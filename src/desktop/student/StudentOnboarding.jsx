import React,{useState} from 'react';
import {GraduationCap,LockKeyhole,School,UserRound,ShieldCheck,Send,ArrowRight,RefreshCw,Info,Trophy} from 'lucide-react';
import {supabase,configurationError} from '../../lib/supabase';

const unavailable=e=>/Could not find the function|schema cache|PGRST202|function .* does not exist/i.test(String(e?.message||e));
const normalizeCode=v=>String(v||'').trim().toUpperCase();

export default function StudentOnboarding({onLogin,onTrial,onLeaderboard,defaultCode=''}) {
 const [mode,setMode]=useState('login'),[code,setCode]=useState(defaultCode),[roster,setRoster]=useState(null);
 const [studentId,setStudentId]=useState(''),[pin,setPin]=useState('');
 const [name,setName]=useState(''),[gender,setGender]=useState('Nam'),[pc,setPc]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const clear=()=>{setError('');setNotice('')};
 async function loadClass(e){
  e?.preventDefault();clear();setBusy(true);setRoster(null);setStudentId('');
  try{
   if(!supabase)throw Error(configurationError||'Không kết nối được hệ thống.');
   const {data,error:err}=await supabase.rpc('qlpm_student_desktop_roster',{p_code:normalizeCode(code)});
   if(err){if(unavailable(err))throw Error('Máy chủ chưa kích hoạt đăng nhập PIN QLPM Student. Bạn vẫn có thể gửi đăng ký lớp hoặc vào chế độ học thử.');throw err;}
   if(!data?.class_id)throw Error('Không tìm thấy lớp. Kiểm tra mã đăng ký do giáo viên cung cấp.');
   setCode(data.registration_code||normalizeCode(code));setRoster(data);
  }catch(e){setError(e.message||String(e));}finally{setBusy(false);}
 }
 async function login(e){
  e.preventDefault();clear();
  if(!studentId||!/^[0-9]{6}$/.test(pin)){setError('Chọn tên học sinh và nhập PIN gồm đúng 6 chữ số.');return;}
  setBusy(true);
  try{
   const {data,error:err}=await supabase.rpc('qlpm_student_desktop_login',{
    p_code:normalizeCode(code),p_student_id:studentId,p_pin:pin,p_device_id:''
   });
   if(err)throw err;
   if(!data?.ok)throw Error(data?.message||'Đăng nhập không thành công.');
   setPin('');onLogin(data);
  }catch(e){setError(unavailable(e)?'Chức năng đăng nhập PIN đang chờ kích hoạt máy chủ.':e.message||String(e));}
  finally{setBusy(false);}
 }
 async function register(e){
  e.preventDefault();clear();setBusy(true);
  try{
   if(!supabase)throw Error(configurationError||'Không có kết nối máy chủ.');
   if(name.trim().split(/\s+/).length<2)throw Error('Hãy nhập đầy đủ họ và tên có dấu.');
   const {data,error:err}=await supabase.rpc('ic3_submit_registration',{
    p_code:normalizeCode(code),p_full_name:name.trim().replace(/\s+/g,' '),
    p_gender:gender,p_computer:pc.trim()||null,p_note:'Đăng ký từ QLPM Student Desktop'
   });
   if(err)throw err;
   if(!['pending','approved'].includes(data?.status))throw Error(data?.message||'Thông tin đăng ký chưa hợp lệ.');
   setNotice(data.status==='pending'
     ?'Đã gửi yêu cầu. Giáo viên cần duyệt hồ sơ, sau đó cấp PIN để bạn đăng nhập.'
     :'Hồ sơ được duyệt theo chế độ tự duyệt của lớp. Liên hệ giáo viên để nhận PIN đăng nhập.');
   setName('');setPc('');
  }catch(e){setError(e.message||String(e));}finally{setBusy(false);}
 }
 async function requestReset(){
  clear();
  if(!roster||!studentId){setError('Chọn lớp và tên học sinh trước khi gửi yêu cầu.');return;}
  setBusy(true);
  try{
   const {data,error:err}=await supabase.rpc('qlpm_student_desktop_request_pin_reset',{p_class_code:normalizeCode(code),p_student_id:studentId});
   if(err)throw err;
   setNotice(data?.message||'Đã gửi yêu cầu cấp lại PIN đến giáo viên.');setPin('');
  }catch(e){setError(unavailable(e)?'Máy chủ chưa kích hoạt tính năng duyệt PIN. Hãy nhờ giáo viên trực tiếp cấp mã mới.':e.message||String(e));}
  finally{setBusy(false);}
 }
 return <div className="qlpm-student-auth">
  <div className="qlpm-student-auth-banner">
   <div className="qlpm-auth-brand"><span><GraduationCap size={33}/></span><div><small>CHÀO MỪNG ĐẾN VỚI</small><strong>QLPM Student</strong></div></div>
   <h1>Học vui hơn, thông minh hơn ✨</h1>
   <p>Đăng nhập để sử dụng hồ sơ riêng hoặc đăng ký lớp để giáo viên duyệt.</p>
   <div className="qlpm-auth-decoration">📚　🧠　⚔️　⭐</div>
   <button type="button" onClick={onLeaderboard}><Trophy size={18}/> Bảng xếp hạng toàn trường</button>
  </div>
  <div className="qlpm-student-auth-form">
   <div className="qlpm-auth-tabs">
    <button type="button" className={mode==='login'?'selected':''} onClick={()=>{setMode('login');clear();}}><LockKeyhole size={17}/> Đăng nhập</button>
    <button type="button" className={mode==='register'?'selected':''} onClick={()=>{setMode('register');clear();}}><Send size={17}/> Đăng ký lớp</button>
   </div>
   {mode==='login'?<form onSubmit={login}>
    <h2>Đăng nhập học sinh</h2>
    <p>Chọn lớp, chọn tên rồi nhập mã PIN do giáo viên cấp.</p>
    <label>Mã lớp / Mã đăng ký
     <div className="qlpm-auth-inline"><input value={code} maxLength={120} required onChange={e=>{setCode(e.target.value);setRoster(null);setStudentId('');}} placeholder="VD: IC3-DUYTAN-6.1"/>
      <button type="button" onClick={loadClass} disabled={busy||!code.trim()}>{busy?<RefreshCw size={17}/>:<School size={17}/>} Tìm lớp</button></div>
    </label>
    {roster&&<div className="qlpm-auth-class"><School size={18}/><span><strong>{roster.school_name}</strong> · Lớp {roster.class_name}</span></div>}
    <label>Họ và tên học sinh
     <select disabled={!roster||busy} value={studentId} onChange={e=>setStudentId(e.target.value)}>
      <option value="">-- Chọn học sinh đã được duyệt --</option>
      {(roster?.students||[]).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
     </select>
    </label>
    <label>PIN gồm 6 số
     <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}" placeholder="••••••"
      value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} disabled={!studentId||busy}/>
    </label>
    <button className="qlpm-auth-submit" disabled={busy||!studentId||pin.length!==6}><ArrowRight size={18}/> Đăng nhập vào lớp học</button>
    <button type="button" className="qlpm-auth-reset" disabled={busy||!studentId} onClick={requestReset}>Quên PIN? Gửi yêu cầu cho giáo viên</button>
    {!roster&&<p className="qlpm-auth-tip">Đã đăng ký nhưng chưa có tên? Giáo viên cần duyệt hồ sơ trước khi cấp PIN.</p>}
   </form>:<form onSubmit={register}>
    <h2>Đăng ký học sinh</h2>
    <p>Gửi thông tin đúng tên thật. Giáo viên duyệt danh sách trong QLPM Teacher.</p>
    <label>Mã lớp do giáo viên cung cấp<input value={code} required maxLength={120} onChange={e=>setCode(e.target.value)} placeholder="Nhập mã lớp"/></label>
    <label>Họ và tên có dấu<input required maxLength={90} value={name} onChange={e=>setName(e.target.value)} placeholder="Nguyễn Văn An"/></label>
    <label>Giới tính<select value={gender} onChange={e=>setGender(e.target.value)}><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
    <label>Máy mong muốn (không bắt buộc)<input value={pc} maxLength={16} onChange={e=>setPc(e.target.value)} placeholder="VD: PC21"/></label>
    <button className="qlpm-auth-submit" disabled={busy||!code.trim()||!name.trim()}><Send size={18}/> Gửi đăng ký cho giáo viên</button>
   </form>}
   {error&&<div className="qlpm-auth-feedback error" role="alert">{error}</div>}
   {notice&&<div className="qlpm-auth-feedback good" role="status">{notice}</div>}
   <div className="qlpm-auth-bottom"><ShieldCheck size={17}/> PIN được máy chủ xác minh; không gửi qua game hoặc công khai trên BXH.</div>
   <button className="qlpm-auth-guest" type="button" onClick={onTrial}>Vào học thử không cần đăng nhập <ArrowRight size={17}/></button>
  </div>
 </div>;
}
