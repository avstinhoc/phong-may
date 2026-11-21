import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,BookOpen,Download,Maximize2,Minimize2,ChevronLeft,ChevronRight} from 'lucide-react';
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
 const [immersive,setImmersive]=useState(false);
 const viewer=useRef(null);
 const total=full?counts[n-1]:9;
 const show=n>0;
 const stem='Bai-'+String(n).padStart(2,'0'),path='/ic3-slides/'+stem;
 function navigatePage(delta){setPage(p=>Math.max(1,Math.min(total,p+delta)))}
 async function toggleFullscreen(){
  if(!viewer.current)return;
  if(document.fullscreenElement===viewer.current){
   await document.exitFullscreen();return;
  }
  if(immersive){setImmersive(false);return;}
  try {
   if(typeof viewer.current.requestFullscreen!=='function')throw Error('not supported');
   await viewer.current.requestFullscreen();
  } catch {setImmersive(true);}
 }
 useEffect(()=>{
  const sync=()=>{if(!document.fullscreenElement)setImmersive(false)};
  document.addEventListener('fullscreenchange',sync);
  return()=>document.removeEventListener('fullscreenchange',sync);
 },[]);
 useEffect(()=>{
  if(!show)return;
  function key(e){
   const target=e.target?.tagName;
   if(target==='INPUT'||target==='TEXTAREA'||target==='SELECT')return;
   if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();navigatePage(1);}
   if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();navigatePage(-1);}
   if(e.key==='Escape'&&immersive)setImmersive(false);
  }
  window.addEventListener('keydown',key);
  return()=>window.removeEventListener('keydown',key);
 },[show,total,immersive]);
 if(!show)return <section className="practice lecture-library">
  <header><BookOpen/><h1>Bài giảng IC3</h1><p>22 bài học · slide lớn, trình chiếu toàn màn hình</p></header>
  <div className="practice-grid">{LEVEL_1_LESSONS.map(lesson=>
   <button key={lesson.number} onClick={()=>{setFull(true);setPage(1);setN(lesson.number)}}>
    <small>BÀI {String(lesson.number).padStart(2,'0')}</small>
    <strong>{lessonTitle(lesson.number)}</strong>
    <small>Chạm để mở bài và trình chiếu</small>
   </button>)}
  </div>
 </section>;
 const isFullscreen=immersive||(typeof document!=='undefined'&&document.fullscreenElement===viewer.current);
 return <section className="practice lecture-view">
  <div className="lecture-heading">
    <button type="button" onClick={()=>{if(document.fullscreenElement===viewer.current)void document.exitFullscreen();setImmersive(false);setN(0)}}><ArrowLeft size={17}/> Danh sách bài</button>
    <div><small>BÀI {String(n).padStart(2,'0')} · IC3 GS6 LEVEL 1</small><h2>{lessonTitle(n)}</h2></div>
  </div>
  <div className="guide-controls lecture-mode">{['Bản dạy trên lớp','Bản đầy đủ'].map((label,i)=>
   <button type="button" key={label} aria-pressed={full===Boolean(i)} onClick={()=>{setFull(Boolean(i));setPage(1)}}>{label}</button>
  )}</div>
  <div ref={viewer} className={'lecture-stage '+(immersive?'lecture-stage-fallback':'')}>
    <div className="lecture-stage-top">
      <strong>BÀI {String(n).padStart(2,'0')} · {lessonTitle(n)}</strong>
      <button type="button" className="lecture-fullscreen" onClick={toggleFullscreen}
       aria-label={isFullscreen?'Thoát toàn màn hình':'Trình chiếu toàn màn hình'} aria-pressed={isFullscreen}>
       {isFullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}
       {isFullscreen?'Thoát toàn màn hình':'Toàn màn hình'}
      </button>
    </div>
    <div className="lecture-stage-screen" aria-live="polite">
      {full?<img className="lecture-stage-image" src={path+'/'+page+'.webp'}
        alt={'Bài '+n+', slide '+page+' trên '+total} loading="eager"/>:<GuidedSlide n={n} page={page}/>}
    </div>
    <div className="lecture-stage-bottom">
      <button type="button" disabled={page===1} onClick={()=>navigatePage(-1)}><ChevronLeft size={19}/> Trước</button>
      <span className="lecture-page" aria-live="polite">{page} / {total}</span>
      <button type="button" disabled={page===total} onClick={()=>navigatePage(1)}>Sau <ChevronRight size={19}/></button>
    </div>
  </div>
  <div className="lecture-foot">
    <span>Dùng phím ← → để chuyển trang, Esc để thoát toàn màn hình.</span>
    <a href={(full?path:'/ic3-guided/'+stem)+'.pptx'} download><Download size={17}/> Tải PowerPoint</a>
  </div>
 </section>;
}
