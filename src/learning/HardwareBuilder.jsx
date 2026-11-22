import React,{useState} from 'react';
import {ArrowLeft,CheckCircle2,RotateCcw} from 'lucide-react';
import {HARDWARE_PARTS} from './hardwareGameRules.js';
import {previewDeck} from './offlineQuiz.js';
import {useQuestionClock} from './useQuestionClock.js';
import {QuestionPhoto} from '../student-web/QuestionPhoto.jsx';

export function HardwareBuilder({onBack,profile}){
 const [deck,setDeck]=useState(()=>previewDeck('lv1-01',profile));
 const [index,setIndex]=useState(0),[parts,setParts]=useState(0),[feedback,setFeedback]=useState(null);
 const q=deck[index],done=parts===HARDWARE_PARTS.length||!q;
 const clock=useQuestionClock(q,!done&&feedback===null,choice=>{
  setFeedback({correct:choice===q.solution});
 });
 function next(){
  if(feedback.correct)setParts(n=>n+1);
  setIndex(n=>n+1);setFeedback(null);
 }
 function restart(){setDeck(previewDeck('lv1-01',profile));setIndex(0);setParts(0);setFeedback(null);}
 return <section className="ic3-panel ic3-hardware">
  <button className="ic3-back" onClick={onBack}><ArrowLeft size={16}/> Trở lại thư viện trò chơi</button>
  <h2>Lắp ráp phần cứng</h2>
  <div className="ic3-hardware-board">{HARDWARE_PARTS.map((p,i)=><div key={p.id} className={'ic3-hardware-slot '+(i<parts?'placed':'')}>
   {i<parts?<><CheckCircle2 size={16}/>{p.label}</>:'Vị trí '+(i+1)}</div>)}</div>
  {done?<><p>{parts===4?'Đã hoàn thành bản lắp ráp!':'Đã hết câu hỏi trong lượt.'}</p><button onClick={restart}><RotateCcw/> Lắp lại</button></>:
   <><strong role="timer">{clock.seconds} giây</strong><h3>{q.prompt}</h3><QuestionPhoto media={q.media}/>
    <div className="ic3-hardware-parts">{q.options.map((o,i)=><button key={o.id} disabled={!!feedback}
     onClick={()=>clock.submit(o.id)}>{'ABCD'[i]} · {o.label}</button>)}</div>
    {feedback&&<div className="ic3-explanation"><strong>{feedback.correct?'Lắp được một linh kiện!':'Cùng xem lại'} · {q.solution}</strong>
     <p>{q.explanation}</p><small>{q.mediaTitle} · Bài 1</small><button onClick={next}>Tiếp tục</button></div>}</>}
 </section>;
}
