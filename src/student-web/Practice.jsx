import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,Timer,ArrowLeft,CheckCircle} from 'lucide-react';
import {LEVEL_1_LESSONS} from '../learning/curriculum.js';
import {QuestionPhoto} from './QuestionPhoto.jsx';
import {supabase} from '../lib/supabase';
import './practice.css';

export function lessonTitle(n){
 return ({8:'Ôn tập phòng máy và dữ liệu',10:'Ôn tập kết nối và sao lưu'})[n]||LEVEL_1_LESSONS[n-1].title;
}
export default function Practice({session}){
 const [lesson,setLesson]=useState(0),[question,setQuestion]=useState(null),[feedback,setFeedback]=useState(null);
 const [done,setDone]=useState(false),[score,setScore]=useState(0),[count,setCount]=useState(0);
 const [left,setLeft]=useState(30),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const run=useRef(null),gate=useRef(false),deadline=useRef(0),pending=useRef(null);
 useEffect(()=>()=>{run.current=null},[session.token]);

 async function request(action, turn, choice, n=lesson){
  if(gate.current||!run.current)return;
  const context=run.current;
  gate.current=true;setBusy(true);setError('');
  pending.current=[action,turn,choice,n];
  try{
   const {data,error:err}=await supabase.rpc('ic3_practice_turn',{
    p_session_token:session.token,p_run:context,p_lesson:n,p_action:action,p_turn:turn,p_choice:choice??null
   });
   if(context!==run.current)return;
   if(err)throw err;
   if(data.done){setDone(true);setQuestion(null);}
   else if(action==='next'){
    deadline.current=Date.now()+Math.max(0,Date.parse(data.deadline)-Date.parse(data.server_now));
    setLeft(Math.ceil((deadline.current-Date.now())/1000));setQuestion(data);setFeedback(null);setCount(v=>v+1);
   }else{
    setFeedback(data);if(data.correct)setScore(v=>v+1);
   }
   pending.current=null;
  }catch(e){if(context===run.current)setError(e.message||'Chưa tải được câu hỏi.');}
  finally{if(context===run.current){gate.current=false;setBusy(false);}}
 }
 function start(n){
  run.current=crypto.randomUUID();gate.current=false;setScore(0);setCount(0);setQuestion(null);setFeedback(null);setDone(false);setLesson(n);
  void request('next',crypto.randomUUID(),null,n);
 }
 useEffect(()=>{
  if(!question||feedback||busy||error)return;
  const tick=()=>{const value=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setLeft(value);
   if(!value)void request('answer',question.turn,null);};
  const id=setInterval(tick,100);return()=>clearInterval(id);
 },[question,feedback,busy,error]);

 if(!lesson)return <section className="practice"><header><BookOpen/><h1>Phòng luyện IC3</h1>
  <p>Chọn bài để luyện tập. Mỗi câu có 30 giây.</p></header>
  <div className="practice-grid">{LEVEL_1_LESSONS.map(({number:n})=><button key={n} onClick={()=>start(n)}>
   <BookOpen/><small>Bài {String(n).padStart(2,'0')}</small><strong>{lessonTitle(n)}</strong></button>)}</div></section>;
 return <section className="practice practice-visual">
  <button onClick={()=>{run.current=null;setLesson(0)}}><ArrowLeft size={16}/> Danh sách bài</button>
  {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>pending.current&&request(...pending.current)}>Thử lại</button></p>}
  {done?<article className="practice-card"><CheckCircle/><h2>Hoàn thành bài {lesson}</h2><p>Em trả lời đúng {score}/{count} câu.</p>
    <button onClick={()=>start(lesson)}>Luyện lại</button></article>:
   question?<article className="practice-card practice-visual-card">
    <div className="practice-time"><Timer size={18}/>{left} giây</div><progress value={left} max="30"/>
    <h2>{question.prompt}</h2><QuestionPhoto media={question.media}/>
    <div className="practice-options">{question.choices.map((o,i)=><button key={o} disabled={!!feedback||busy||!!error}
     onClick={()=>request('answer',question.turn,Date.now()<deadline.current?o:null)}
     className={feedback?.solution===o?'correct':''}><b>{'ABCD'[i]}</b><span>{o}</span></button>)}</div>
    {feedback&&<div className="practice-answer-result" role="status"><strong>{feedback.correct?'Chính xác!':'Đáp án đúng'} · {feedback.solution}</strong>
     <p>{feedback.explanation}</p><p>{feedback.media_title&&feedback.media_title+' · '}Bài {feedback.lesson} · {lessonTitle(feedback.lesson)} {feedback.media_title&&<a href="/ic3-media/credits.json" target="_blank" rel="noreferrer">Nguồn ảnh</a>}</p>
     <button disabled={busy||!!error} onClick={()=>request('next',crypto.randomUUID(),null)}>Tiếp tục →</button></div>}
   </article>:busy&&<p role="status">Đang tải câu hỏi…</p>}
 </section>;
}
