import React,{useState} from 'react';
import {GraduationCap,LockKeyhole,ShieldCheck,Send,ArrowRight,Trophy} from 'lucide-react';
import {supabase,configurationError} from '../lib/supabase';

const normalizeCode=v=>String(v||'').trim().toUpperCase();
const normalizeUsername=v=>String(v||'').trim().toLowerCase();
const validUser=v=>/^[a-z][a-z0-9._]{3,23}$/.test(v);
const validPin=v=>/^\d{6}$/.test(v)&&!/^(.)\1{5}$/.test(v);

export default function StudentOnboarding({onLogin,defaultCode=''}) {
 const [mode,setMode]=useState('login');
 const [code,setCode]=useState(defaultCode);
 const [username,setUsername]=useState('');
 const [name,setName]=useState('');
 const [pin,setPin]=useState('');
 const [repeatPin,setRepeatPin]=useState('');
 const [pc,setPc]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const switchMode=next=>{setMode(next);setPin('');setRepeatPin('');setError('');setNotice('');};
 async function login(e){
  e.preventDefault();setError('');setNotice('');
  if(!validUser(normalizeUsername(username))||!/^\d{6}$/.test(pin)){
   setError('Nhập tên đăng nhập hợp lệ và PIN gồm 6 số.');return;
  }
  setBusy(true);
  try{
   if(!supabase)throw Error(configurationError||'Không thể kết nối máy chủ.');
   const {data,error:err}=await supabase.rpc('qlpm_student_web_login',{
    p_username:normalizeUsername(username),p_pin:pin
   });
   if(err)throw err;
   if(!data?.ok)throw Error(data?.message||'Đăng nhập không thành công.');
   setPin('');onLogin(data);
  }catch(e){setError(e.message||String(e));}finally{setBusy(false);}
 }
 async function register(e){
  e.preventDefault();setError('');setNotice('');
  const user=normalizeUsername(username);
  if(!validUser(user)){setError('Tên đăng nhập dài 4–24 ký tự, bắt đầu bằng chữ thường, chỉ có a–z, số, dấu chấm hoặc _.');return;}
  if(name.trim().split(/\s+/).length<2){setError('Nhập họ và tên thật đầy đủ.');return;}
  if(!validPin(pin)){setError('Mã PIN phải có 6 số, không được dùng 6 chữ số giống nhau.');return;}
  if(pin!==repeatPin){setError('Hai mã PIN chưa trùng nhau.');return;}
  setBusy(true);
  try{
   if(!supabase)throw Error(configurationError||'Không thể kết nối máy chủ.');
   const {data,error:err}=await supabase.rpc('qlpm_student_web_register',{
    p_code:normalizeCode(code),p_full_name:name.trim().replace(/\s+/g,' '),
    p_username:user,p_pin:pin,p_pc:pc.trim()||null
   });
   if(err)throw err;
   if(!data?.ok)throw Error(data?.message||'Không gửi được đăng ký.');
   setPin('');setRepeatPin('');
   setNotice(data.message||'Đã gửi yêu cầu. Giáo viên sẽ duyệt hồ sơ trước khi em đăng nhập.');
   setMode('login');
  }catch(e){setError(e.message||String(e));}finally{setBusy(false);}
 }
 return <div className="qlpm-student-auth">
  <div className="qlpm-student-auth-banner">
   <div className="qlpm-auth-brand"><span><GraduationCap size={33}/></span><div><small>CHÀO MỪNG ĐẾN VỚI</small><strong>QLPM Student Web</strong></div></div>
   <h1>Học vui hơn, thông minh hơn ✨</h1>
   <p>Đăng nhập bằng tên đăng nhập và PIN tự tạo để học, ôn tập và lưu tiến độ của riêng em.</p>
   <div className="qlpm-auth-decoration">📚　🧠　⚔️　⭐</div>
   <div className="qlpm-student-auth-hint"><Trophy size={19}/> BXH sử dụng trực tiếp dữ liệu của trường trên QLPM.</div>
  </div>
  <div className="qlpm-student-auth-form">
   <div className="qlpm-auth-tabs">
    <button type="button" className={mode==='login'?'selected':''} onClick={()=>switchMode('login')}><LockKeyhole size={17}/> Đăng nhập</button>
    <button type="button" className={mode==='register'?'selected':''} onClick={()=>switchMode('register')}><Send size={17}/> Đăng ký</button>
   </div>
   {mode==='login'?<form onSubmit={login}>
    <h2>Đăng nhập học sinh</h2>
    <p>Sử dụng tên đăng nhập và mã PIN em đã tạo khi đăng ký. Tài khoản chỉ hoạt động sau khi giáo viên duyệt.</p>
    <label>Tên đăng nhập
     <input required minLength={4} maxLength={24} autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)}
      placeholder="Ví dụ: nguyenvanan"/>
    </label>
    <label>Mã PIN (6 số)
     <input required type="password" inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}"
      value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="••••••"/>
    </label>
    <button className="qlpm-auth-submit" disabled={busy||!username.trim()||pin.length!==6}><ArrowRight size={18}/> Đăng nhập</button>
    <p className="qlpm-auth-tip">Quên mã PIN? Liên hệ giáo viên để xác minh và đặt lại mã. Không chia sẻ PIN cho bạn khác.</p>
   </form>:<form onSubmit={register}>
    <h2>Đăng ký tài khoản</h2>
    <p>Thông tin đăng ký được gửi đến mục <strong>Đăng ký & duyệt</strong> của giáo viên.</p>
    <label>Mã lớp đăng ký<input required maxLength={120} value={code} onChange={e=>setCode(e.target.value)} placeholder="VD: IC3-KHUONGNINH-6.2-2"/></label>
    <label>Họ và tên học sinh<input required maxLength={90} value={name} onChange={e=>setName(e.target.value)} placeholder="Nguyễn Văn An"/></label>
    <label>Tên đăng nhập tự tạo
     <input required autoComplete="username" minLength={4} maxLength={24} value={username} onChange={e=>setUsername(e.target.value)}
      placeholder="nguyenvanan"/>
    </label>
    <label>Mã PIN tự tạo (6 số)
     <input required type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="••••••"/>
    </label>
    <label>Nhập lại mã PIN
     <input required type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={repeatPin} onChange={e=>setRepeatPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="••••••"/>
    </label>
    <label>PC muốn liên kết (không bắt buộc)
     <input maxLength={16} value={pc} onChange={e=>setPc(e.target.value)} placeholder="VD: PC21"/>
    </label>
    <button className="qlpm-auth-submit" disabled={busy||!code.trim()||!name.trim()||!validUser(normalizeUsername(username))||!validPin(pin)||pin!==repeatPin}><Send size={18}/> Gửi đăng ký cho giáo viên</button>
   </form>}
   {error&&<div className="qlpm-auth-feedback error" role="alert">{error}</div>}
   {notice&&<div className="qlpm-auth-feedback good" role="status">{notice}</div>}
   <div className="qlpm-auth-bottom"><ShieldCheck size={17}/> PIN được băm an toàn trên máy chủ, giáo viên không xem được mã PIN gốc.</div>
  </div>
 </div>;
}
