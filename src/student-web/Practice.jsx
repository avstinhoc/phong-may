import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,Timer,ArrowLeft,CheckCircle,Monitor,Wifi,Layers,Shield,MessagesSquare,FileText,Image,ChevronLeft,ChevronRight} from 'lucide-react';
import {LEVEL_1_LESSONS} from '../learning/curriculum.js';
import slideCounts from '../learning/slideCounts.json';
import bank from '../learning/practiceBank.json';
import {shuffle} from '../learning-arcade/expeditionScore.js';
import {PRACTICE_EXPANSIONS} from './practiceExpansions.js';
import {supabase} from '../lib/supabase';
import './practice.css';

const icons=[Monitor,Layers,Wifi,FileText,MessagesSquare,Shield];
const group=n=>Math.min(5,Math.floor((n-1)/4));
export function lessonTitle(n){return ({8:'Ôn tập phòng máy và dữ liệu',10:'Ôn tập kết nối và sao lưu'})[n]||LEVEL_1_LESSONS[n-1].title}
const lessonSlides=n=>Number(slideCounts[n-1]||9);
function lessonImage(n,slide){return '/ic3-slides/Bai-'+String(n).padStart(2,'0')+'/'+Math.max(1,Math.min(lessonSlides(n),slide))+'.webp'}
const answerOf=q=>q.solution||q.choices[0];
function pool(n,all){
 const current=shuffle(all.filter(q=>Number(q.lesson)===n)).slice(0,25);
 const earlier=shuffle(all.filter(q=>Number(q.lesson)<n)).slice(0,Math.max(0,16-current.length));
 return [...current,...earlier];
}

export default function Practice({session}){
 const [lesson,setLesson]=useState(0),[extra,setExtra]=useState([]),[loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [deck,setDeck]=useState([]),[index,setIndex]=useState(0),[answer,setAnswer]=useState(null),[score,setScore]=useState(0);
 const [left,setLeft]=useState(25),[showSlide,setShowSlide]=useState(false),[slide,setSlide]=useState(1);
 const deadline=useRef(0),locked=useRef(false);
 const all=[...bank,...PRACTICE_EXPANSIONS,...extra];
 useEffect(()=>{
  let alive=true;if(!session?.token)return;
  setLoading(true);
  supabase.rpc('qlpm_student_web_practice_questions',{p_session_token:session.token})
   .then(({data,error:err})=>{
    if(!alive)return;
    if(err)throw err;
    setExtra(Array.isArray(data)?data.filter(q=>Number(q.lesson)>0&&Array.isArray(q.choices)):[]);
   })
   .catch(e=>{if(alive)setError('Câu hỏi bổ sung chưa tải được; vẫn có thể luyện bộ câu hỏi có sẵn. '+(e.message||''))})
   .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[session?.token]);
 function reset(){
  deadline.current=Date.now()+25000;locked.current=false;setLeft(25);setAnswer(null);
  setShowSlide(false);
 }
 function start(n){
  const selected=shuffle(pool(n,all)).map(q=>({...q,options:shuffle(q.choices)}));
  setDeck(selected);setIndex(0);setScore(0);setLesson(n);reset();setSlide(1);
 }
 const q=deck[index];
 function submit(choice){
  if(locked.current||!q)return;
  locked.current=true;
  const effective=Date.now()>=deadline.current?'':choice;
  setAnswer(effective);
  if(effective===answerOf(q))setScore(s=>s+1);
 }
 useEffect(()=>{
  if(!lesson||!q||answer!==null)return;
  function tick(){const t=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setLeft(t);if(!t)submit('')}
  const id=setInterval(tick,150);return()=>clearInterval(id);
 },[lesson,index,answer,q]);
 if(!lesson)return <section className="practice">
  <header><BookOpen/><h1>Phòng luyện IC3</h1>
   <p>Ngân hàng câu hỏi tình huống, khái niệm và hình minh họa. Mỗi câu có 25 giây.</p></header>
  {error&&<p role="status" className="practice-notice">{error}</p>}
  {loading&&<p className="practice-notice">Đang đồng bộ câu hỏi giáo viên xuất bản…</p>}
  <div className="practice-grid">{LEVEL_1_LESSONS.map(({number:n})=>{
   const Icon=icons[group(n)];
   const count=all.filter(q=>q.lesson===n).length;
   return <button key={n} onClick={()=>start(n)}>
    <Icon/><small>Bài {String(n).padStart(2,'0')} · {count} câu riêng theo bài</small>
    <strong>{lessonTitle(n)}</strong>
    <small>{[8,10].includes(n)?'Ôn tập tổng hợp · thiếu tài liệu nguồn gốc':'Luyện tập + xem ảnh từ slide'}</small>
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
   {q.image&&<figure className="practice-reference-figure">
    <img className="question-img" src={q.image} alt={q.alt||'Ảnh bài học'} loading="lazy" onError={e=>{e.currentTarget.hidden=true}}/>
    <figcaption>{q.sourceType==='slide'?'Ảnh tham khảo từ PowerPoint bài học':'Ảnh minh họa tình huống học tập'}</figcaption>
   </figure>}
   <div className="practice-options">{q.options.map((o,i)=><button key={i} disabled={answer!==null}
    onClick={()=>submit(o)} className={answer!==null&&o===answerOf(q)?'correct':answer===o?'incorrect':''}>
    <b>{'ABCDEF'[i]}</b>{o}</button>)}</div>
   {answer!==null&&<div className="practice-answer-result" role="status">
    <p><strong>{answer===answerOf(q)?'Chính xác! ':answer===''?'Hết giờ. ':'Cùng xem lại. '}</strong>{q.why}</p>
    <button onClick={()=>{setIndex(index+1);reset()}}>{index+1===deck.length?'Xem kết quả':'Câu tiếp theo'} →</button></div>}
   <div className="practice-source-panel">
    <button type="button" onClick={()=>{setShowSlide(v=>!v);setSlide(Number(q.sourceSlide)||1)}}><Image size={16}/> {showSlide?'Ẩn slide nguồn':'Xem hình ảnh PowerPoint bài '+lesson}</button>
    {showSlide&&<div className="practice-source-image">
     <img src={lessonImage(lesson,slide)} alt={'Slide '+slide+' của bài '+lesson} onError={e=>{e.currentTarget.hidden=true}}/>
     <div><button disabled={slide<=1} onClick={()=>setSlide(n=>Math.max(1,n-1))}><ChevronLeft size={17}/></button>
      <span>Slide {slide}/{lessonSlides(lesson)}</span>
      <button disabled={slide>=lessonSlides(lesson)} onClick={()=>setSlide(n=>Math.min(lessonSlides(lesson),n+1))}><ChevronRight size={17}/></button></div>
     <p>Hình được lấy từ slide bài giảng; dùng để tham khảo, không nhất thiết là đáp án trực tiếp cho câu hỏi.</p>
    </div>}
   </div>
  </article>:<article className="practice-card"><CheckCircle/><h2>Đã hoàn thành bài {lesson}</h2>
   <p>Em trả lời đúng {score}/{deck.length} câu.</p>
   <button onClick={()=>start(lesson)}>Luyện lại</button>
  </article>}
 </section>;
}
