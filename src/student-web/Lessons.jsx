import React,{useEffect,useState} from 'react';
import {ArrowLeft,BookOpen,Download} from 'lucide-react';
import {LEVEL_1_LESSONS} from '../learning/curriculum.js';
import counts from '../learning/slideCounts.json';
import guides from '../learning/guidedLessons.json';
import bank from '../learning/practiceBank.json';
import {lessonTitle} from './Practice.jsx';

function GuidedSlide({n,page}){
 const guide=guides[n-1],questions=bank.filter(q=>q.lesson===n).slice(0,3);
 if(page===1)return <div className="guide-page guide-cover"><small>IC3 GS6　/　LEVEL 1　/　BÀI {n}</small><h1>{guide.title}</h1><p>{guide.hook}</p></div>;
 if(page<=4){const current=page-2;return <div className="guide-page"><small>BÀI {n}　/　KHÁM PHÁ</small><h1>{guide.concepts[current][0]}</h1><p>{guide.concepts[current][1]}</p><div className="guide-road">{guide.concepts.map(([label],i)=><span className={current===i?'selected':''} key={label}>{label}</span>)}</div></div>}
 if(page<=7){const i=page-5,q=questions[i];return <div className="guide-page"><small>THỬ SỨC　/　20 GIÂY</small><h2>{q.title}</h2>{q.image&&<img className="question-img" src={q.image} alt={q.alt}/>}<p>{q.q}</p><ol type="A">{[0,1,2].map(j=><li key={j}>{q.choices[(i+n+j)%3]}</li>)}</ol></div>}
 if(page===8)return <div className="guide-page guide-cover"><small>BÀI {n}　/　ĐỐI CHIẾU</small>{questions.map(q=><div key={q.id}><h3>{q.choices[0]}</h3><p>{q.why}</p></div>)}</div>;
 return <div className="guide-page"><small>HOẠT ĐỘNG CUỐI GIỜ</small><h1>Thử ngay tại lớp</h1><p>{guide.task}</p><details><summary>Gợi ý đối chiếu</summary><p>{guide.solution}</p></details></div>
}
export default function Lessons(){
 const [n,setN]=useState(0),[page,setPage]=useState(1),[full,setFull]=useState(false);
 const total=full?counts[n-1]:9;
 useEffect(()=>{
  if(!n)return;
  function key(e){if(e.key==='ArrowRight')setPage(p=>Math.min(total,p+1));if(e.key==='ArrowLeft')setPage(p=>Math.max(1,p-1))}
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[n,total]);
 if(!n)return <section className="practice"><header><BookOpen/><h1>Bài giảng IC3</h1><p>22 bài học và ôn tập · Level 1</p></header><div className="practice-grid">{LEVEL_1_LESSONS.map(l=><button key={l.number} onClick={()=>{setFull(false);setPage(1);setN(l.number)}}><small>BÀI {String(l.number).padStart(2,'0')}</small><strong>{lessonTitle(l.number)}</strong></button>)}</div></section>;
 const stem='Bai-'+String(n).padStart(2,'0'),path='/ic3-slides/'+stem;
 return <section className="practice"><button onClick={()=>setN(0)}><ArrowLeft size={17}/> Bài giảng</button><h2>Bài {n} · {lessonTitle(n)}</h2>
 <div className="guide-controls">{['Bản dạy trên lớp','Bản đầy đủ'].map((label,i)=><button key={label} aria-pressed={full===Boolean(i)} onClick={()=>{setFull(Boolean(i));setPage(1)}}>{label}</button>)}</div>
 {full?<img src={path+'/'+page+'.webp'} alt={'Bài '+n+', slide '+page} style={{display:'block',width:'100%',maxHeight:'65vh',objectFit:'contain'}}/>:<GuidedSlide n={n} page={page}/>}
 <div className="guide-controls"><button disabled={page===1} onClick={()=>setPage(page-1)}>← Trước</button> <span aria-live="polite">{page} / {total}</span> <button disabled={page===total} onClick={()=>setPage(page+1)}>Sau →</button>
 <a href={(full?path:'/ic3-guided/'+stem)+'.pptx'} download><Download size={16}/> Tải PowerPoint</a></div></section>
}
