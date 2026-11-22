import React,{useCallback,useEffect,useState,useRef} from 'react';
import {Bell,BookOpen,ClipboardList,MessageCircle,Send,Plus,Trash2,RefreshCw,Paperclip,X,CheckCircle2,AlertCircle,GraduationCap,Clock,FileText} from 'lucide-react';
import {supabase} from './lib/supabase.js';
import {classroomDate,classroomRelative,compressClassroomImage,classroomBlankQuiz} from './classroom/classroomUtils.js';
import './classroom/classroom.css';

const blank=()=>({kind:'announcement',title:'',body:'',due_at:'',questions:[classroomBlankQuiz()]});
export default function TeacherClassroom({profile}){
 const schoolId=profile?.school_id;
 const [feed,setFeed]=useState(null),[classId,setClassId]=useState('');
 const [tab,setTab]=useState('posts'),[draft,setDraft]=useState(blank);
 const [studentId,setStudentId]=useState(''),[text,setText]=useState(''),[image,setImage]=useState(null);
 const [grades,setGrades]=useState({}),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const init=useRef(false),lastUnread=useRef(0);
 const refresh=useCallback(async(quiet=false)=>{
  if(!supabase||!schoolId)return;
  try{
   if(!quiet)setLoading(true);
   const {data,error:e}=await supabase.rpc('qlpm_classroom_teacher_feed',{
    p_school_id:schoolId,p_class_id:classId||null
   });
   if(e)throw e;
   setFeed(data);
   if(!classId&&data?.selected_class)setClassId(data.selected_class);
   if(lastUnread.current!==null&&Number(data?.unread||0)>lastUnread.current&&init.current){
    setNotice('Có tin nhắn mới của học sinh!');
   }
   lastUnread.current=Number(data?.unread||0);init.current=true;
   if(!studentId&&data?.students?.length)setStudentId(data.students[0].id);
   if(!quiet)setError('');
  }catch(e){if(!quiet)setError(e.message||'Không tải được lớp học')}
  finally{if(!quiet)setLoading(false)}
 },[schoolId,classId,studentId]);
 useEffect(()=>{
  init.current=false;lastUnread.current=0;
  setClassId('');setFeed(null);setStudentId('');
 },[schoolId]);
 useEffect(()=>{
  void refresh();
  const id=setInterval(()=>{if(!document.hidden)void refresh(true)},15000);
  return()=>clearInterval(id);
 },[refresh]);
 async function action(type,payload){
  setBusy(true);setError('');setNotice('');
  try{
   const {data,error:e}=await supabase.rpc('qlpm_classroom_teacher_action',{
    p_school_id:schoolId,p_class_id:classId,p_action:type,p_payload:payload
   });
   if(e)throw e;
   await refresh(true);
   return data||{ok:true};
  }catch(e){setError(e.message||'Thao tác chưa thành công');return null}
  finally{setBusy(false)}
 }
 async function submitPost(e){
  e.preventDefault();
  const payload={...draft,body:draft.body.trim(),title:draft.title.trim()};
  if(!payload.title){setError('Hãy nhập tiêu đề');return}
  if(draft.kind==='quiz'){
   for(const question of draft.questions){
    if(!question.prompt.trim()||question.choices.some(s=>!s.trim())||
     new Set(question.choices.map(s=>s.trim().toLocaleLowerCase('vi'))).size!==4){
     setError('Mỗi câu hỏi cần đủ bốn đáp án A–D khác nhau.');return;
    }
   }
  }
  if(await action('create_post',payload)){setDraft(blank());setNotice('Đã đăng nội dung cho lớp '+(feed?.classes?.find(c=>c.id===classId)?.name||''))}
 }
 function updateQuestion(i,field,value,optionIndex){
  setDraft(d=>({...d,questions:d.questions.map((q,j)=>j===i?
   optionIndex===undefined?{...q,[field]:value}:
    {...q,choices:q.choices.map((c,k)=>k===optionIndex?value:c)}:q)}));
 }
 async function pickImage(e){
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  setBusy(true);
  try{setImage(await compressClassroomImage(file));setError('')}catch(err){setError(err.message)}finally{setBusy(false)}
 }
 async function send(e){
  e.preventDefault();
  if(!studentId||(!text.trim()&&!image))return;
  if(await action('send_message',{student_id:studentId,body:text.trim(),image_data:image})){
   setText('');setImage(null);
  }
 }
 async function readChat(){
  if(!studentId)return;
  const unread=(feed?.messages||[]).some(m=>m.student_id===studentId&&m.sender_kind==='student'&&!m.read_at);
  if(unread)await action('read_messages',{student_id:studentId});
 }
 useEffect(()=>{if(tab==='messages'&&studentId)void readChat()},[tab,studentId,feed?.unread]);
 const posts=feed?.posts||[],submissions=feed?.submissions||[],students=feed?.students||[];
 const chat=(feed?.messages||[]).filter(m=>m.student_id===studentId);
 const tabs=[['posts','Giao bài & thông báo',Bell],['submissions','Chấm bài',ClipboardList],['messages','Tin nhắn',MessageCircle]];
 return <section className="classroom classroom-teacher">
  <header className="classroom-header">
   <div><small>PHƯN NGHỊCH · GIAO TIẾP GIÁO VIÊN & HỌC SINH</small>
    <h1><GraduationCap size={30}/> Lớp học tương tác</h1>
    <p>Giao bài trắc nghiệm, chấm tự luận, gửi thông báo và nhắn tin riêng với học sinh.</p>
   </div>
   <button type="button" className="classroom-refresh" onClick={()=>refresh()} disabled={busy}>
    <RefreshCw size={18}/> Làm mới</button>
  </header>
  <div className="classroom-class-selector">
   <label>Đang quản lý lớp
    <select value={classId} onChange={e=>{setClassId(e.target.value);setStudentId('');setFeed(null);setDraft(blank());setNotice('')}}>
     {(feed?.classes||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
   </label>
   <span>{students.length} học sinh · {posts.length} bài đăng · {submissions.length} bài nộp</span>
  </div>
  <nav className="classroom-tabs" aria-label="Chức năng giáo viên">
   {tabs.map(([id,label,Icon])=><button key={id} type="button" aria-pressed={tab===id}
    onClick={()=>setTab(id)}><Icon size={18}/>{label}
    {id==='messages'&&feed?.unread>0&&<strong className="classroom-unread">{feed.unread}</strong>}
    </button>)}
  </nav>
  {error&&<p className="classroom-alert error" role="alert"><AlertCircle size={17}/>{error}</p>}
  {notice&&<p className="classroom-alert success" role="status"><Bell size={17}/>{notice}</p>}
  {loading&&<p className="classroom-empty">Đang tải dữ liệu lớp học…</p>}
  {!loading&&(!feed?.classes?.length)&&<p className="classroom-empty">Bạn chưa có lớp đang quản lý tại trường này.</p>}
  {!loading&&feed?.classes?.length>0&&tab==='posts'&&<div className="classroom-teacher-grid">
   <form className="classroom-card classroom-editor" onSubmit={submitPost}>
    <h2><Plus size={21}/> Tạo hoạt động mới</h2>
    <label>Loại nội dung<select value={draft.kind} onChange={e=>setDraft(v=>({...v,kind:e.target.value}))}>
     <option value="announcement">Thông báo</option><option value="quiz">Bài tập trắc nghiệm</option>
     <option value="essay">Bài tập tự luận</option></select></label>
    <label>Tiêu đề<input required maxLength={160} value={draft.title}
      onChange={e=>setDraft(v=>({...v,title:e.target.value}))}
      placeholder="VD: Bài tập nhận biết thiết bị nhập"/></label>
    <label>Nội dung / Hướng dẫn<textarea rows={3} maxLength={2500} value={draft.body}
     onChange={e=>setDraft(v=>({...v,body:e.target.value}))} placeholder="Nội dung gửi tới cả lớp..."/></label>
    {draft.kind!=='announcement'&&<label>Hạn nộp (để trống nếu không giới hạn)
     <input type="datetime-local" value={draft.due_at} onChange={e=>setDraft(v=>({...v,due_at:e.target.value}))}/></label>}
    {draft.kind==='quiz'&&<div className="classroom-quiz-builder">
     {draft.questions.map((q,i)=><fieldset key={i}><legend>Câu hỏi {i+1}</legend>
      <label>Nội dung câu hỏi<input maxLength={550} value={q.prompt} placeholder="Nhập câu hỏi..."
       onChange={e=>updateQuestion(i,'prompt',e.target.value)}/></label>
      {q.choices.map((choice,j)=><label key={j}>{'ABCD'[j]}. <input maxLength={250} value={choice}
       onChange={e=>updateQuestion(i,'choices',e.target.value,j)} placeholder={'Đáp án '+('ABCD'[j])}/></label>)}
      <label>Đáp án đúng<select value={q.correct} onChange={e=>updateQuestion(i,'correct',Number(e.target.value))}>
       {q.choices.map((_,j)=><option value={j} key={j}>{'ABCD'[j]}</option>)}
      </select></label>
      {draft.questions.length>1&&<button type="button" className="classroom-text-button"
       onClick={()=>setDraft(d=>({...d,questions:d.questions.filter((_,j)=>j!==i)}))}>
       <Trash2 size={15}/> Bỏ câu này</button>}
     </fieldset>)}
     <button type="button" className="classroom-add-question" disabled={draft.questions.length>=10}
      onClick={()=>setDraft(d=>({...d,questions:[...d.questions,classroomBlankQuiz()]}))}>
      <Plus size={16}/> Thêm câu hỏi ({draft.questions.length}/10)</button>
    </div>}
    <button type="submit" disabled={busy||!classId} className="classroom-primary">
     <Send size={17}/> {draft.kind==='announcement'?'Đăng thông báo':'Giao bài cho lớp'}</button>
   </form>
   <div className="classroom-stack">
    {posts.length===0&&<p className="classroom-empty">Chưa có hoạt động nào. Tạo thông báo hoặc bài tập đầu tiên.</p>}
    {posts.map(post=><article key={post.id} className="classroom-card">
     <div className="classroom-card-head"><span className="classroom-type">{post.kind==='announcement'?'Thông báo':post.kind==='quiz'?'Trắc nghiệm':'Tự luận'}</span>
      <span className="classroom-meta">{classroomDate(post.created_at)}</span></div>
     <h2>{post.title}</h2><p>{post.body}</p>
     {post.kind!=='announcement'&&<p className="classroom-meta"><Clock size={15}/>
      {classroomRelative(post.due_at)} · Đã nộp {post.submitted}/{students.length}</p>}
     <button className="classroom-text-button danger" type="button" disabled={busy} onClick={async()=>{
      if(window.confirm('Xóa bài này và toàn bộ bài nộp liên quan?'))await action('delete_post',{post_id:post.id});
     }}><Trash2 size={15}/> Xóa</button>
    </article>)}
   </div>
  </div>}
  {!loading&&tab==='submissions'&&<div className="classroom-stack">
   {submissions.length===0&&<p className="classroom-empty">Chưa có bài nộp từ học sinh.</p>}
   {submissions.map(sub=>{
    const post=posts.find(p=>p.id===sub.post_id);
    if(!post)return null;
    return <article className="classroom-card" key={sub.id}>
     <div className="classroom-card-head"><span className="classroom-type"><FileText size={15}/> {sub.student_name}</span>
       <span className="classroom-meta">{classroomDate(sub.submitted_at)}</span></div>
     <h2>{post.title}</h2>
     {post.kind==='essay'?<>
      <p className="classroom-essay-answer">{sub.answer?.essay||''}</p>
      <div className="classroom-grade-fields">
       <label>Điểm (0–10)<input type="number" min="0" max="10" step=".25"
        value={grades[sub.id]?.score??sub.score??''}
        onChange={e=>setGrades(v=>({...v,[sub.id]:{...(v[sub.id]||{}),score:e.target.value}}))}/></label>
       <label>Nhận xét<textarea rows={2} maxLength={1000}
        value={grades[sub.id]?.feedback??sub.feedback??''}
        onChange={e=>setGrades(v=>({...v,[sub.id]:{...(v[sub.id]||{}),feedback:e.target.value}}))}/></label>
       <button type="button" className="classroom-primary" disabled={busy}
        onClick={()=>action('grade',{submission_id:sub.id,score:Number(grades[sub.id]?.score??sub.score),feedback:grades[sub.id]?.feedback??sub.feedback??''})}>
        <CheckCircle2 size={17}/> Lưu điểm & phản hồi</button>
      </div>
     </>:<p><CheckCircle2 size={17}/> Hệ thống đã chấm trắc nghiệm: <strong>{sub.score}/10</strong></p>}
    </article>;
   })}
  </div>}
  {!loading&&tab==='messages'&&<div className="classroom-teacher-chat">
   <aside className="classroom-contacts"><h3><MessageCircle size={19}/> Học sinh trong lớp</h3>
    {students.map(st=><button key={st.id} type="button" className={studentId===st.id?'selected':''}
      onClick={()=>setStudentId(st.id)}>{st.name}
      {(feed.messages||[]).some(m=>m.student_id===st.id&&m.sender_kind==='student'&&!m.read_at)&&<strong>●</strong>}
     </button>)}
   </aside>
   <div className="classroom-chat">
    <div className="classroom-chat-title"><MessageCircle size={18}/>
      <strong>{students.find(s=>s.id===studentId)?.name||'Chọn học sinh để trao đổi'}</strong>
      <span>Cuộc trò chuyện riêng tư</span></div>
    <div className="classroom-messages">
     {chat.length===0&&<p className="classroom-empty">Chưa có tin nhắn nào.</p>}
     {chat.map(m=><div key={m.id} className={'classroom-bubble '+(m.sender_kind==='teacher'?'mine':'theirs')}>
      <small>{m.sender_kind==='teacher'?'Giáo viên':m.student_name} · {classroomDate(m.created_at)}</small>
      {m.body&&<p>{m.body}</p>}
      {m.image_data&&<a href={m.image_data} target="_blank" rel="noopener noreferrer">
       <img src={m.image_data} alt="Ảnh do người gửi lựa chọn" loading="lazy"/></a>}
     </div>)}
    </div>
    <form onSubmit={send} className="classroom-compose">
     {image&&<div className="classroom-image-preview"><img src={image} alt="Ảnh chuẩn bị gửi"/>
       <button type="button" onClick={()=>setImage(null)}><X size={18}/></button></div>}
     <textarea rows={2} value={text} onChange={e=>setText(e.target.value)} maxLength={1500}
       placeholder="Nhắn lời nhắc học tập hoặc gửi hình hướng dẫn cho học sinh..."/>
     <div className="classroom-compose-actions">
      <label className="classroom-attach"><Paperclip size={19}/> Đính kèm ảnh
       <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage}/></label>
      <span>Học sinh nhận thông báo khi có tin nhắn mới.</span>
      <button type="submit" className="classroom-primary" disabled={busy||!studentId||(!text.trim()&&!image)}>
       <Send size={18}/> Gửi</button>
     </div>
    </form>
   </div>
  </div>}
 </section>;
}
