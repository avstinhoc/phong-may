import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Bell,BookOpen,MessageCircle,ClipboardList,Send,Image as ImageIcon,Clock,CheckCircle2,RefreshCw,Paperclip,X,AlertCircle} from 'lucide-react';
import {supabase} from '../lib/supabase.js';
import {compressClassroomImage,classroomDate,classroomRelative} from '../classroom/classroomUtils.js';
import '../classroom/classroom.css';

const TABS=[['assignments','Bài tập',ClipboardList],['announcements','Thông báo',Bell],['messages','Tin nhắn',MessageCircle]];
export default function StudentClassroom({session,onUnread}){
 const [tab,setTab]=useState('assignments'),[feed,setFeed]=useState(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [draftAnswers,setDraftAnswers]=useState({}),[essays,setEssays]=useState({});
 const [body,setBody]=useState(''),[image,setImage]=useState(null);
 const seen=useRef(null),end=useRef(null);
 const refresh=useCallback(async(quiet=false)=>{
  if(!supabase||!session?.token)return;
  try{
   if(!quiet)setLoading(true);
   const {data,error:e}=await supabase.rpc('qlpm_classroom_student_feed',{p_session_token:session.token});
   if(e)throw e;
   setFeed(data);onUnread?.(Number(data?.unread||0));
   const last=data?.messages?.at(-1);
   if(seen.current!==null&&last?.id!==seen.current&&last?.sender_kind==='teacher'){
    setNotice('Bạn có tin nhắn mới từ giáo viên!');
   }
   seen.current=last?.id||null;
   if(!quiet)setError('');
  }catch(e){if(!quiet)setError(e.message||'Không kết nối được lớp học');}
  finally{if(!quiet)setLoading(false)}
 },[session?.token,onUnread]);
 useEffect(()=>{
  void refresh();
  const id=setInterval(()=>{if(!document.hidden)void refresh(true)},15000);
  return()=>clearInterval(id);
 },[refresh]);
 async function action(type,payload){
  setBusy(true);setError('');setNotice('');
  try{
   const {data,error:e}=await supabase.rpc('qlpm_classroom_student_action',{
    p_session_token:session.token,p_action:type,p_payload:payload
   });
   if(e)throw e;
   await refresh(true);
   return data||{ok:true};
  }catch(e){setError(e.message||'Không thực hiện được thao tác');return null}
  finally{setBusy(false)}
 }
 useEffect(()=>{
  if(tab==='messages'&&feed?.unread>0)void action('read_messages',{});
  // Called only when opening the messages panel or unread count changes.
 },[tab,feed?.unread]);
 async function onFileChange(e){
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  setBusy(true);
  try{setImage(await compressClassroomImage(file));setError('')}catch(err){setError(err.message)}finally{setBusy(false)}
 }
 async function send(e){
  e.preventDefault();
  if(!body.trim()&&!image)return;
  if(await action('send_message',{body:body.trim(),image_data:image})){setBody('');setImage(null)}
 }
 async function submit(post){
  const payload={post_id:post.id};
  if(post.kind==='quiz'){
   const chosen=draftAnswers[post.id]||{};
   if(post.questions.some((_,i)=>!Number.isInteger(chosen[i]))){setError('Em cần trả lời đủ các câu A–D trước khi nộp');return}
   payload.choices=post.questions.map((_,i)=>chosen[i]);
  }else{
   payload.essay=(essays[post.id]||'').trim();
   if(!payload.essay){setError('Hãy nhập nội dung bài tự luận');return}
  }
  const response=await action('submit',payload);
  if(response)setNotice(post.kind==='quiz'?('Đã nộp bài. Điểm: '+Number(response.score).toFixed(1)+'/10'):'Đã gửi bài tự luận, chờ giáo viên chấm.');
 }
 const announcements=(feed?.posts||[]).filter(p=>p.kind==='announcement');
 const assignments=(feed?.posts||[]).filter(p=>p.kind!=='announcement');
 return <section className="classroom">
  <header className="classroom-header">
   <div><small>LỚP HỌC TƯƠNG TÁC · {feed?.class_name||session.class_name||''}</small>
    <h1><MessageCircle size={30}/> Kết nối giáo viên</h1>
    <p>Nhận bài tập, theo dõi thông báo, nộp bài và nhắn tin trực tiếp với giáo viên.</p>
   </div>
   <button type="button" onClick={()=>refresh()} aria-label="Cập nhật" className="classroom-refresh"><RefreshCw size={18}/> Làm mới</button>
  </header>
  <nav className="classroom-tabs" aria-label="Hoạt động lớp học">
   {TABS.map(([id,title,Icon])=><button key={id} type="button" aria-pressed={tab===id}
    onClick={()=>{setTab(id);setNotice('')}}><Icon size={19}/>{title}
    {id==='messages'&&feed?.unread>0&&<strong className="classroom-unread">{feed.unread}</strong>}
   </button>)}
  </nav>
  {error&&<p className="classroom-alert error" role="alert"><AlertCircle size={18}/>{error}</p>}
  {notice&&<p className="classroom-alert success" role="status"><Bell size={18}/>{notice}</p>}
  {loading?<p className="classroom-empty">Đang tải nội dung của lớp…</p>:null}
  {!loading&&tab==='assignments'&&<div className="classroom-stack">
   {assignments.length===0&&<p className="classroom-empty">Giáo viên chưa giao bài tập nào cho lớp em.</p>}
   {assignments.map(post=>{
    const sent=post.submission;const late=post.due_at&&new Date(post.due_at)<new Date();
    return <article className="classroom-card" key={post.id}>
     <div className="classroom-card-head"><span className="classroom-type">{post.kind==='quiz'?'Trắc nghiệm':'Tự luận'}</span>
      <span className={late?'classroom-late':'classroom-meta'}><Clock size={15}/>{classroomRelative(post.due_at)}</span></div>
     <h2>{post.title}</h2><p>{post.body}</p>
     {sent?<div className="classroom-submitted"><CheckCircle2 size={18}/>
       <div><strong>Đã nộp {classroomDate(sent.submitted_at)}</strong>
        <span>{sent.score!==null&&sent.score!==undefined?'Điểm: '+sent.score+'/10':'Đang chờ chấm bài'}</span>
        {sent.feedback&&<p><b>Nhận xét:</b> {sent.feedback}</p>}
       </div></div>:late?<p className="classroom-closed">Bài tập đã hết hạn nộp.</p>:
       <>
        {post.kind==='quiz'?<div className="classroom-questions">
         {(post.questions||[]).map((q,i)=><fieldset key={i}><legend>Câu {i+1}. {q.prompt}</legend>
          <div className="classroom-options">{(q.choices||[]).map((opt,j)=><label key={j}
           className={draftAnswers[post.id]?.[i]===j?'selected':''}>
           <input type="radio" name={'quiz-'+post.id+'-'+i}
            checked={draftAnswers[post.id]?.[i]===j}
            onChange={()=>setDraftAnswers(v=>({...v,[post.id]:{...(v[post.id]||{}),[i]:j}}))}/>
           <b>{'ABCD'[j]}</b><span>{opt}</span></label>)}</div>
         </fieldset>)}
        </div>:<textarea rows={6} maxLength={6000} placeholder="Viết câu trả lời tự luận của em ở đây..."
         value={essays[post.id]||''} onChange={e=>setEssays(v=>({...v,[post.id]:e.target.value}))}/>}
        <button type="button" className="classroom-primary" disabled={busy} onClick={()=>submit(post)}>
         <Send size={17}/> Nộp bài cho giáo viên
        </button>
       </>}
    </article>;
   })}
  </div>}
  {!loading&&tab==='announcements'&&<div className="classroom-stack">
    {announcements.length===0&&<p className="classroom-empty">Hiện chưa có thông báo mới.</p>}
    {announcements.map(post=><article className="classroom-card" key={post.id}>
     <div className="classroom-card-head"><span className="classroom-type"><Bell size={15}/> Thông báo</span>
      <span className="classroom-meta">{classroomDate(post.created_at)}</span></div>
     <h2>{post.title}</h2><p className="classroom-announcement-body">{post.body}</p>
    </article>)}
  </div>}
  {!loading&&tab==='messages'&&<div className="classroom-chat">
   <div className="classroom-chat-title"><MessageCircle size={18}/>
    <strong>Trao đổi với {feed?.teacher_name||'giáo viên'}</strong>
    <span>Chỉ giáo viên và em xem được nội dung</span></div>
   <div className="classroom-messages" aria-label="Lịch sử trò chuyện">
    {!feed?.messages?.length&&<p className="classroom-empty">Chưa có tin nhắn. Em có thể hỏi bài hoặc gửi hình bài làm.</p>}
    {(feed?.messages||[]).map(m=><div key={m.id} className={'classroom-bubble '+(m.sender_kind==='student'?'mine':'theirs')}>
     <small>{m.sender_kind==='student'?'Em':'Giáo viên'} · {classroomDate(m.created_at)}</small>
     {m.body&&<p>{m.body}</p>}
     {m.image_data&&<a href={m.image_data} target="_blank" rel="noopener noreferrer" title="Xem ảnh đính kèm">
      <img src={m.image_data} alt="Ảnh đính kèm do người gửi chọn" loading="lazy"/></a>}
    </div>)}
    <div ref={end}/>
   </div>
   <form className="classroom-compose" onSubmit={send}>
    {image&&<div className="classroom-image-preview"><img src={image} alt="Ảnh chuẩn bị gửi"/>
     <button type="button" onClick={()=>setImage(null)} aria-label="Bỏ ảnh"><X size={18}/></button></div>}
    <textarea value={body} maxLength={1500} rows={2} onChange={e=>setBody(e.target.value)}
     placeholder="Nhắn thầy/cô, hỏi bài hoặc gửi ảnh bài tập…"/>
    <div className="classroom-compose-actions">
     <label className="classroom-attach"><Paperclip size={19}/> Gửi ảnh JPG/PNG
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange}/>
     </label>
     <span>Ảnh được nén và chỉ gửi riêng cho giáo viên.</span>
     <button className="classroom-primary" disabled={busy||(!body.trim()&&!image)} type="submit"><Send size={18}/> Gửi</button>
    </div>
   </form>
  </div>}
 </section>;
}
