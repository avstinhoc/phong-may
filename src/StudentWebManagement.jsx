import React,{useEffect,useMemo,useState} from 'react';
import {BookOpen,Gamepad2,Monitor,RefreshCw,ExternalLink,Save,Trash2,Plus,Image,ShieldCheck} from 'lucide-react';
import {supabase} from './lib/supabase';
import {LEVEL_1_LESSONS} from './learning/curriculum.js';
import baseQuestions from './learning/practiceBank.json';
import {PRACTICE_EXPANSIONS} from './student-web/practiceExpansions.js';
import {WORLD_MAPS,WAVES_PER_WORLD} from './student-web/worldMap.js';
import './StudentWebManagement.css';

const blank=()=>({id:null,lesson:1,title:'',q:'',choices:['','','',''],solution:'',why:'',image_path:'',alt:'',published:false});
const deviceLabels={assigned:'Đã gán PC',approved:'Yêu cầu đã duyệt',requested:'PC mong muốn',unlinked:'Chưa có PC'};
const titles=LEVEL_1_LESSONS.map(l=>l.title||'Bài '+l.number);
const countBase=n=>[...baseQuestions,...PRACTICE_EXPANSIONS].filter(q=>q.lesson===n).length;

export default function StudentWebManagement({profile,onNavigate}){
 const schoolId=profile?.school_id;
 const [tab,setTab]=useState('overview');
 const [devices,setDevices]=useState([]);
 const [questions,setQuestions]=useState([]);
 const [draft,setDraft]=useState(blank);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [filterLesson,setFilterLesson]=useState('all');

 async function refreshData(){
  if(!schoolId)return;
  setBusy(true);setError('');
  try{
   const [devicesResult,questionResult]=await Promise.all([
    supabase.rpc('qlpm_teacher_student_web_devices',{p_school_id:schoolId}),
    supabase.from('student_web_practice_questions').select('*').eq('school_id',schoolId).order('created_at',{ascending:false})
   ]);
   if(devicesResult.error)throw devicesResult.error;
   if(questionResult.error)throw questionResult.error;
   setDevices(Array.isArray(devicesResult.data)?devicesResult.data:[]);
   setQuestions(Array.isArray(questionResult.data)?questionResult.data:[]);
  }catch(e){setError('Không tải được thông tin Student Web: '+(e.message||e));}
  finally{setBusy(false)}
 }
 useEffect(()=>{refreshData()},[schoolId]);
 const published=questions.filter(q=>q.published).length;
 const withPC=devices.filter(d=>d.display_pc).length;
 const pendingPC=devices.filter(d=>!d.display_pc&&d.requested_pc).length;
 const filtered=questions.filter(q=>filterLesson==='all'||String(q.lesson)===filterLesson);
 const numberOfVisible=n=>countBase(n)+questions.filter(q=>q.lesson===n&&q.published).length;
 const editsAvailable=Boolean(schoolId);
 async function saveQuestion(e){
  e.preventDefault();if(!schoolId)return;
  const choices=draft.choices.map(x=>x.trim()).filter(Boolean);
  if(choices.length!==4||new Set(choices).size!==4||!choices.includes(draft.solution)){
   setError('Mỗi câu cần đúng 4 đáp án A–D khác nhau và phải chỉ rõ đáp án đúng.');return;
  }
  setBusy(true);setError('');setMessage('');
  const row={school_id:schoolId,lesson:Number(draft.lesson),title:draft.title.trim(),
   q:draft.q.trim(),choices,solution:draft.solution,why:draft.why.trim(),
   image_path:null,alt:'',published:!!draft.published,updated_at:new Date().toISOString()};
  try{
   const result=draft.id?
    await supabase.from('student_web_practice_questions').update(row).eq('id',draft.id).eq('school_id',schoolId):
    await supabase.from('student_web_practice_questions').insert(row);
   if(result.error)throw result.error;
   setDraft(blank());setMessage(draft.id?'Đã lưu câu hỏi.':'Đã thêm câu hỏi.');
   await refreshData();
  }catch(ex){setError('Lưu thất bại: '+(ex.message||ex));}finally{setBusy(false)}
 }
 async function removeQuestion(row){
  if(!window.confirm('Xóa câu hỏi này? Thao tác không thể khôi phục.'))return;
  setBusy(true);setError('');
  try{
   const {error:err}=await supabase.from('student_web_practice_questions').delete().eq('id',row.id).eq('school_id',schoolId);
   if(err)throw err;
   if(draft.id===row.id)setDraft(blank());
   setMessage('Đã xóa câu hỏi.');await refreshData();
  }catch(e){setError(e.message||String(e));}finally{setBusy(false)}
 }
 function edit(row){
  setDraft({id:row.id,lesson:row.lesson,title:row.title,q:row.q,choices:[...row.choices.slice(0,4),...Array(Math.max(0,4-row.choices.length)).fill('')],
   solution:row.solution,why:row.why,image_path:row.image_path||'',alt:row.alt||'',published:row.published});
  setTab('questions');document.getElementById('swm-editor')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 const tabs=[['overview','Tổng quan'],['devices','Tài khoản & PC'],['questions','Câu hỏi & hình ảnh'],['games','Trò chơi & bản đồ']];
 return <section className="swm">
  <header className="swm-hero"><div>
   <small>PHƯN NGHỊCH · QUẢN LÝ HỌC SINH</small>
   <h1>Quản lý Student Web</h1>
   <p>Theo dõi liên kết PC, nội dung ôn tập, ải game và tài khoản học sinh trên cùng Supabase.</p></div>
   <div className="swm-hero-actions"><a href="/student-web" target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Xem Student Web</a>
    <button disabled={busy} onClick={refreshData}><RefreshCw size={16}/> Làm mới</button></div>
  </header>
  <nav className="swm-tabs" aria-label="Quản lý Student Web">
   {tabs.map(([id,title])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{title}</button>)}
  </nav>
  {error&&<p className="swm-error" role="alert">{error}</p>}
  {message&&<p className="swm-success" role="status">{message}</p>}
  {tab==='overview'&&<>
   <div className="swm-kpis">
    <article><Monitor/><strong>{devices.length}</strong><span>Tài khoản Student Web trong trường</span></article>
    <article><ShieldCheck/><strong>{withPC}</strong><span>Học sinh có PC liên kết</span></article>
    <article><BookOpen/><strong>{baseQuestions.length+PRACTICE_EXPANSIONS.length+published}</strong><span>Câu hỏi hiện có + đã xuất bản</span></article>
    <article><Gamepad2/><strong>{WORLD_MAPS.length*WAVES_PER_WORLD}</strong><span>Ải chiến dịch trên 22 bản đồ</span></article>
   </div>
   <div className="swm-action-grid">
    <button onClick={()=>setTab('devices')}><Monitor/><strong>Kiểm tra PC và tài khoản</strong><span>{pendingPC} yêu cầu PC chưa được gán</span></button>
    <button onClick={()=>setTab('questions')}><BookOpen/><strong>Thêm câu hỏi bằng hình</strong><span>Biên tập, xem trước và xuất bản theo trường</span></button>
    <button onClick={()=>setTab('games')}><Gamepad2/><strong>Kiểm tra 22 bản đồ</strong><span>Xem tiến trình ải, bộ câu hỏi và trạng thái</span></button>
   </div>
  </>}
  {tab==='devices'&&<>
   <div className="swm-section-head"><div><h2>Đồng bộ tài khoản & PC</h2><p>Thứ tự ưu tiên: PC giáo viên gán → PC duyệt → PC mong muốn.</p></div>
    <button onClick={()=>onNavigate('computers')}>Mở phòng máy để gán PC</button></div>
   <div className="swm-table-wrap"><table><thead><tr><th>Học sinh / tài khoản</th><th>Lớp</th><th>PC mong muốn</th><th>PC đã gán / duyệt</th><th>Trạng thái</th></tr></thead>
    <tbody>{devices.map((d,i)=><tr key={d.student_id||d.username||i}>
      <td><strong>{d.student_name||'—'}</strong><small>@{d.username||'—'}</small></td>
      <td>{d.class_name||'—'}</td><td>{d.requested_pc||'—'}</td>
      <td>{d.display_pc||'—'}</td>
      <td><span className={'swm-device-status '+d.pc_status}>{deviceLabels[d.pc_status]||d.pc_status}</span></td>
     </tr>)}
     {!devices.length&&<tr><td colSpan={5}>Chưa có tài khoản Student Web thuộc trường đang chọn.</td></tr>}
    </tbody></table></div>
   <p className="swm-info">Trạng thái này được lấy trực tiếp từ bảng gán PC và yêu cầu ghép đã duyệt. Nếu giáo viên vừa gán PC, học sinh chỉ cần chuyển tab rồi quay lại để đồng bộ.</p>
   <button onClick={()=>onNavigate('students')}>Đăng ký & duyệt tài khoản học sinh</button>
  </>}
  {tab==='questions'&&<>
   <div className="swm-section-head"><div><h2>Ngân hàng câu hỏi & hình ảnh</h2>
    <p>{baseQuestions.length+PRACTICE_EXPANSIONS.length} câu hỏi nền, {published} câu bổ sung đã xuất bản, {questions.length-published} bản nháp của trường.</p></div>
    <button onClick={()=>setDraft(blank())}><Plus size={16}/> Tạo câu hỏi mới</button></div>
   <div className="swm-counts">{LEVEL_1_LESSONS.map(l=><span key={l.number}>Bài {l.number}: <b>{numberOfVisible(l.number)}</b> câu</span>)}</div>
   <form id="swm-editor" className="swm-editor" onSubmit={saveQuestion}>
    <h3>{draft.id?'Sửa câu hỏi':'Thêm câu hỏi ôn tập'}</h3>
    <div className="swm-form-grid">
     <label>Bài học<select value={draft.lesson} onChange={e=>setDraft(v=>({...v,lesson:Number(e.target.value)}))}>{LEVEL_1_LESSONS.map(l=><option value={l.number} key={l.number}>Bài {l.number}: {l.title||'Ôn tập'}</option>)}</select></label>
     <label>Tiêu đề<input value={draft.title} required minLength={3} maxLength={160} onChange={e=>setDraft(v=>({...v,title:e.target.value}))}/></label>
     <label className="wide">Nội dung câu hỏi<textarea rows={3} value={draft.q} required minLength={8} onChange={e=>setDraft(v=>({...v,q:e.target.value}))}/></label>
     {draft.choices.map((c,i)=><label key={i}>Phương án {String.fromCharCode(65+i)}
       <input value={c} onChange={e=>setDraft(v=>({...v,choices:v.choices.map((x,j)=>i===j?e.target.value:x)}))}/></label>)}
     <label>Đáp án đúng<select required value={draft.solution} onChange={e=>setDraft(v=>({...v,solution:e.target.value}))}>
      <option value="">-- Chọn đáp án --</option>
      {draft.choices.filter(Boolean).map((c,i)=><option key={i} value={c}>{c}</option>)}
     </select></label>
     <label>Giải thích<textarea rows={2} value={draft.why} onChange={e=>setDraft(v=>({...v,why:e.target.value}))}/></label>
     <p className="wide">Hình câu hỏi hiện chỉ dùng biểu tượng thiết bị vẽ sẵn trong hệ thống. Đã vô hiệu hóa ảnh bên ngoài để bảo vệ học sinh.</p>
    </div>
    <label className="swm-checkbox"><input type="checkbox" checked={draft.published} onChange={e=>setDraft(v=>({...v,published:e.target.checked}))}/>
      Xuất bản cho học sinh trường này (câu nháp không hiển thị)</label>
    <div className="swm-form-actions"><button type="submit" disabled={busy||!editsAvailable}><Save size={17}/> {draft.id?'Lưu thay đổi':'Thêm câu hỏi'}</button><button type="button" onClick={()=>setDraft(blank())}>Hủy chỉnh sửa</button></div>
   </form>
   <div className="swm-section-head"><h3>Danh sách câu hỏi do giáo viên bổ sung</h3><label>Lọc bài <select value={filterLesson} onChange={e=>setFilterLesson(e.target.value)}><option value="all">Tất cả</option>{LEVEL_1_LESSONS.map(l=><option value={l.number} key={l.number}>Bài {l.number}</option>)}</select></label></div>
   <div className="swm-questions">{filtered.map(q=><article key={q.id}><small>Bài {q.lesson} · {q.published?'Đã xuất bản':'Bản nháp'}</small><strong>{q.title}</strong><p>{q.q}</p>
    <div><button onClick={()=>edit(q)}>Sửa</button><button onClick={()=>removeQuestion(q)}><Trash2 size={15}/> Xóa</button></div></article>)}
    {!filtered.length&&<p>Chưa có câu bổ sung. Câu hỏi nền của IC3 vẫn được giữ nguyên.</p>}</div>
  </>}
  {tab==='games'&&<>
   <div className="swm-section-head"><div><h2>Thư viện 22 bản đồ</h2><p>Điểm, sao, trang bị và mở ải do Supabase kiểm tra; giáo viên xem trước các bản đồ tại đây.</p></div></div>
   <div className="swm-maps">{WORLD_MAPS.map(w=><article key={w.id}><img loading="lazy" src={w.background} alt={w.title}/><strong>Bài {w.id}: {w.title}</strong><small>{w.waves.length} ải · {w.waves[w.waves.length-1].name}</small>
      <small>{countBase(w.id)} câu hỏi nền</small></article>)}</div>
   <p className="swm-info">Chỉnh tên quái, số ải hoặc phần thưởng liên quan đến xác minh máy chủ; không thay trực tiếp trong trình duyệt để ngăn gian lận.</p>
  </>}
 </section>;
}
