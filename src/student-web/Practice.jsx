import React,{useEffect,useState,useRef} from 'react';
import {BookOpen,Timer,ArrowLeft,CheckCircle,Monitor,Wifi,Layers,Shield,MessagesSquare,FileText} from 'lucide-react';
import {LEVEL_1_LESSONS} from '../learning/curriculum.js';
import bank from '../learning/practiceBank.json';
import {shuffle} from '../learning-arcade/expeditionScore.js';
import './practice.css';

const icons=[Monitor,Layers,Wifi,FileText,MessagesSquare,Shield];
const group=n=>Math.min(5,Math.floor((n-1)/4));
export function lessonTitle(n){return ({8:'Ôn tập phòng máy và dữ liệu',10:'Ôn tập kết nối và sao lưu'})[n]||LEVEL_1_LESSONS[n-1].title}
function pool(n){
 const count=8+n;
 const current=shuffle(bank.filter(q=>q.lesson===n)).slice(0,count);
 const earlier=shuffle(bank.filter(q=>q.lesson<n));
 return [...current,...earlier.slice(0,count-current.length)]
}
export default function Practice(){
 const [lesson,setLesson]=useState(0),[deck,setDeck]=useState([]),[index,setIndex]=useState(0),[answer,setAnswer]=useState(null),[score,setScore]=useState(0),[left,setLeft]=useState(20);
 const deadline=useRef(0),locked=useRef(false);
 function start(n){const selected=shuffle(pool(n)).map(q=>({...q,options:shuffle(q.choices)}));setDeck(selected);setIndex(0);setScore(0);setLesson(n);reset()}
 function reset(){deadline.current=Date.now()+20000;locked.current=false;setLeft(20);setAnswer(null)}
 const q=deck[index];
 function submit(choice){if(locked.current||!q)return;locked.current=true;const effective=Date.now()>=deadline.current?'':choice;setAnswer(effective);if(effective===q.choices[0])setScore(s=>s+1)}
 useEffect(()=>{if(!lesson||!q||answer!==null)return;function tick(){let t=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setLeft(t);if(!t)submit('')}const id=setInterval(tick,120);return()=>clearInterval(id)},[lesson,index,answer,q]);
 if(!lesson)return <section className="practice"><header><BookOpen/><h1>Phòng luyện IC3</h1><p>Chọn bài để luyện tập. Mỗi câu có 20 giây.</p></header><div className="practice-grid">{LEVEL_1_LESSONS.map(({number:n})=>{const Icon=icons[group(n)];return <button key={n} onClick={()=>start(n)}><Icon/><small>Bài {String(n).padStart(2,'0')} · {8+n} câu</small><strong>{lessonTitle(n)}</strong></button>})}</div></section>;
 return <section className="practice"><button onClick={()=>setLesson(0)}><ArrowLeft size={16}/> Danh sách bài</button>{q?<article className="practice-card"><small>BÀI {lesson}　/　CÂU {index+1} TRÊN {deck.length}</small><div className="practice-time"><Timer size={18}/> {left} giây</div><progress value={left} max="20"/><p>{q.title}</p><h2>{q.q}</h2>{q.image&&<img className="question-img" src={q.image} alt={q.alt}/>}<div className="practice-options">{q.options.map((o,i)=><button key={o} disabled={answer!==null} onClick={()=>submit(o)} className={answer!==null&&o===q.choices[0]?'correct':''}><b>{'ABCD'[i]}</b>{o}</button>)}</div>{answer!==null&&<div role="status"><p><strong>{answer===q.choices[0]?'Chính xác. ':answer===''?'Hết giờ. ':'Cùng xem lại. '}</strong>{q.why}</p><button onClick={()=>{setIndex(index+1);reset()}}>{index+1===deck.length?'Xem kết quả':'Câu tiếp theo'} →</button></div>}</article>:<article className="practice-card"><CheckCircle/><h2>Đã hoàn thành bài {lesson}</h2><p>Em trả lời đúng {score}/{deck.length} câu.</p><button onClick={()=>start(lesson)}>Luyện lại</button></article>}</section>
}
