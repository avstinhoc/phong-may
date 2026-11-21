import React,{useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Timer,ArrowLeft,CheckCircle,Monitor,Wifi,Layers,Shield,MessagesSquare,FileText,Cpu,MemoryStick,HardDrive,Mic,Cable,Keyboard,Mouse,Printer,ScanLine,Laptop,Tablet,Headphones} from 'lucide-react';
import {LEVEL_1_LESSONS} from '../learning/curriculum.js';
import bank from '../learning/practiceBank.json';
import extraChoices from '../learning/practiceExtraChoices.json';
import {shuffle} from '../learning-arcade/expeditionScore.js';
import {PRACTICE_EXPANSIONS} from './practiceExpansions.js';
import {deviceVisualFor} from './practiceDeviceMedia.js';
import {supabase} from '../lib/supabase';
import './practice.css';

const icons=[Monitor,Layers,Wifi,FileText,MessagesSquare,Shield];
const group=n=>Math.min(5,Math.floor((n-1)/4));
const LETTERS=['A','B','C','D'];
export function lessonTitle(n){
 return ({8:'Ôn tập phòng máy và dữ liệu',10:'Ôn tập kết nối và sao lưu'})[n]||LEVEL_1_LESSONS[n-1].title;
}
function validQuestion(q){
 const choices=Array.isArray(q?.choices)?q.choices:[];
 return choices.length===4 && new Set(choices).size===4 &&
 choices.every(x=>typeof x==='string'&&x.trim()) &&
 choices.includes(q.solution||choices[0]);
}
function completeQuestion(q){
 // Older baseline questions (88) were authored with 3 choices. Reuse the
 // exact fourth distractor now enforced in the Supabase arcade question bank.
 const choices=[...(q.choices||[])];
 const fourth=extraChoices[q.id];
 if(choices.length===3&&fourth&&!choices.includes(fourth))choices.push(fourth);
 const result={...q,choices,solution:q.solution||choices[0]};
 return validQuestion(result)?result:null;
}
function pool(n,all){
 const current=shuffle(all.filter(q=>Number(q.lesson)===n)).slice(0,25);
 const earlier=shuffle(all.filter(q=>Number(q.lesson)<n)).slice(0,Math.max(0,16-current.length));
 return [...current,...earlier];
}
const DEVICE_ICONS={cpu:Cpu,ram:MemoryStick,ssd:HardDrive,microphone:Mic,hdmi:Cable,
 keyboard:Keyboard,monitor:Monitor,mouse:Mouse,printer:Printer,scanner:ScanLine,
 laptop:Laptop,tablet:Tablet,headphone:Headphones};
function QuestionVisual({question}){
 const device=deviceVisualFor(question);
 if(!device)return null;
 const Icon=DEVICE_ICONS[device.kind]||Monitor;
 return <figure className="practice-device-card" role="group" aria-label={device.label}>
  <div className="practice-device-art" aria-hidden="true">
    <span className="practice-device-halo"/>
    <Icon size={118} strokeWidth={1.5}/>
    <span className="practice-device-grid"/>
  </div>
  <figcaption><strong>{device.label}</strong><span>{device.description}</span>
   <small>Minh họa dạng biểu tượng do hệ thống tạo · Không tải ảnh từ Internet</small>
  </figcaption>
 </figure>;
}

export default function Practice({session}){
 const [lesson,setLesson]=useState(0),[extra,setExtra]=useState([]),[loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [deck,setDeck]=useState([]),[index,setIndex]=useState(0),[answer,setAnswer]=useState(null),[score,setScore]=useState(0);
 const [left,setLeft]=useState(25);
 const deadline=useRef(0),locked=useRef(false);
 const all=useMemo(()=>[...bank,...PRACTICE_EXPANSIONS,...extra].map(completeQuestion).filter(Boolean),[extra]);

 useEffect(()=>{
  let alive=true;if(!session?.token)return;
  setLoading(true);
  supabase.rpc('qlpm_student_web_practice_questions',{p_session_token:session.token})
   .then(({data,error:err})=>{
    if(!alive)return;
    if(err)throw err;
    // Do not expose incomplete teacher-published answers to children.
    setExtra(Array.isArray(data)?data.filter(q=>Number(q.lesson)>0&&validQuestion(q)):[]);
   })
   .catch(e=>{if(alive)setError('Chưa đồng bộ được câu hỏi bổ sung. Em vẫn có thể luyện tập nội dung sẵn có.')})
   .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[session?.token]);

 function reset(){
  deadline.current=Date.now()+25000;
  locked.current=false;
  setLeft(25);setAnswer(null);
 }
 function start(n){
  const chosen=pool(n,all).map(q=>({...q,options:shuffle(q.choices)}));
  if(!chosen.length){setError('Bài này chưa có câu hỏi đầy đủ 4 đáp án.');return;}
  setDeck(chosen);setIndex(0);setScore(0);setLesson(n);reset();setError('');
 }
 const q=deck[index];
 function submit(choice){
  if(locked.current||!q)return;
  locked.current=true;
  const effective=Date.now()>=deadline.current?'':choice;
  setAnswer(effective);
  if(effective===q.solution)setScore(s=>s+1);
 }
 useEffect(()=>{
  if(!lesson||!q||answer!==null)return;
  const id=setInterval(()=>{
   const remaining=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));
   setLeft(remaining);
   if(remaining===0)submit('');
  },150);
  return()=>clearInterval(id);
 },[lesson,index,answer,q]);

 if(!lesson)return <section className="practice">
  <header><BookOpen/><h1>Phòng luyện IC3</h1>
   <p>Câu hỏi ôn tập kèm ảnh thiết bị và phần mềm đúng chủ đề, không hiển thị slide bài giảng. Mỗi câu có 25 giây.</p></header>
  {error&&<p role="status" className="practice-notice">{error}</p>}
  {loading&&<p className="practice-notice">Đang đồng bộ câu hỏi giáo viên xuất bản…</p>}
  <div className="practice-grid">{LEVEL_1_LESSONS.map(({number:n})=>{
   const Icon=icons[group(n)];
   const count=all.filter(q=>q.lesson===n).length;
   return <button key={n} onClick={()=>start(n)}>
    <Icon/><small>Bài {String(n).padStart(2,'0')} · {count} câu đúng chuẩn 4 đáp án</small>
    <strong>{lessonTitle(n)}</strong>
    <small>{[8,10].includes(n)?'Ôn tập tổng hợp · thiếu slide nguồn gốc':'Câu hỏi A–D · ảnh minh họa khi phù hợp'}</small>
   </button>;
  })}</div>
 </section>;

 return <section className="practice practice-visual">
  <button onClick={()=>setLesson(0)}><ArrowLeft size={16}/> Danh sách bài</button>
  {q?<article className="practice-card practice-visual-card">
   <div className="practice-question-top"><small>BÀI {lesson} · CÂU {index+1} / {deck.length}</small>
    <div className="practice-time"><Timer size={18}/>{left} giây</div></div>
   <progress value={left} max="25"/>
   <p className="practice-question-topic">{q.title}</p>
   <h2>{q.q}</h2>
   <QuestionVisual key={q.id} question={q}/>
   <div className="practice-options" role="group" aria-label="Bốn đáp án">
    {q.options.map((o,i)=><button key={i} type="button" disabled={answer!==null}
     onClick={()=>submit(o)}
     className={answer!==null&&o===q.solution?'correct':answer===o?'incorrect':''}>
      <b>{LETTERS[i]}</b><span>{o}</span>
     </button>)}
   </div>
   {answer!==null&&<div className="practice-answer-result" role="status">
    <p><strong>{answer===q.solution?'Chính xác! ':answer===''?'Hết giờ. ':'Cùng xem lại. '}</strong>{q.why}</p>
    <button onClick={()=>{setIndex(index+1);reset()}}>{index+1===deck.length?'Xem kết quả':'Câu tiếp theo'} →</button>
   </div>}
  </article>:<article className="practice-card"><CheckCircle/><h2>Đã hoàn thành bài {lesson}</h2>
   <p>Em trả lời đúng {score}/{deck.length} câu.</p>
   <button onClick={()=>start(lesson)}>Luyện lại</button>
  </article>}
 </section>;
}
