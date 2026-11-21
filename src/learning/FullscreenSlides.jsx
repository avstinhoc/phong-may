import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight,ExternalLink,Expand,Minimize2,RotateCcw,X,BookOpen} from 'lucide-react';
import './fullscreenSlides.css';

/**
 * Private Drive slide decks open in an immersive viewing surface.
 * A real horizontal swipe carousel is available when authorized image slides
 * are explicitly supplied. For the current PPSX decks Drive owns page
 * navigation inside its cross-origin iframe; we never fake remote Next/Prev.
 */
export default function FullscreenSlides({lesson,onClose,slides=[]}){
 const root=useRef(null),track=useRef(null),[page,setPage]=useState(0),[reload,setReload]=useState(0);
 const images=Array.isArray(slides)&&slides.length>0;
 const count=images?slides.length:lesson.slideCount;
 const go=next=>setPage(p=>Math.max(0,Math.min((slides.length||1)-1,next)));
 useEffect(()=>{
  const prev=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=e=>{
    if(e.key==='Escape'){e.preventDefault();onClose();}
    if(images&&e.key==='ArrowRight'){e.preventDefault();go(page+1);}
    if(images&&e.key==='ArrowLeft'){e.preventDefault();go(page-1);}
  };
  window.addEventListener('keydown',onKey);
  return()=>{window.removeEventListener('keydown',onKey);document.body.style.overflow=prev;};
 },[images,page,onClose]);
 useEffect(()=>{if(images)track.current?.children[page]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});},[page,images]);
 async function toggleFullscreen(){
  if(document.fullscreenElement){await document.exitFullscreen();return;}
  try{await root.current?.requestFullscreen?.();}catch{}
 }
 const content=<div className="ic3-slide-overlay" ref={root} role="dialog" aria-modal="true" aria-label={'Trình chiếu bài '+lesson.number}>
  <div className="ic3-slide-topbar">
   <button type="button" onClick={onClose} aria-label="Đóng trình chiếu"><X size={23}/><span>Thoát</span></button>
   <div className="ic3-slide-title"><BookOpen size={20}/><div><strong>Bài {lesson.number}: {lesson.title}</strong><small>IC3 GS6 · Level 1 · THCS</small></div></div>
   <div className="ic3-slide-topactions">
    <button type="button" onClick={()=>setReload(x=>x+1)} aria-label="Tải lại bài"><RotateCcw size={19}/></button>
    <button type="button" onClick={toggleFullscreen} aria-label="Chế độ toàn màn hình"><Expand size={19}/></button>
   </div>
  </div>
  <div className="ic3-slide-stage">
   {images?<div className="ic3-slide-track" ref={track} aria-label="Slide cuộn ngang">
    {slides.map((src,i)=><div key={i} className="ic3-slide-item">
      <img src={src} draggable="false" alt={'Slide '+(i+1)+' / '+slides.length} loading={i<2?'eager':'lazy'}/>
    </div>)}
   </div>:<iframe key={lesson.id+'-'+reload} src={lesson.previewUrl} title={'Bài giảng '+lesson.number}
    loading="eager" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="ic3-slide-drive"/>}
  </div>
  <footer className="ic3-slide-bottom">
   <div className="ic3-slide-hint">{images
    ?'Vuốt hoặc lướt ngang để chuyển slide · Phím ← → trên máy tính'
    :lesson.number===3
      ?'Bài 3 bắt đầu từ slide 17 của tệp Bài 2–3. Dùng điều khiển chuyển trang trong trình xem Google Drive.'
      :'Dùng mũi tên chuyển slide bên trong trình xem Google Drive. Slide gốc cần Internet và quyền xem.'}</div>
   <div className="ic3-slide-bottom-actions">
    {images&&<><button type="button" onClick={()=>go(page-1)} disabled={page<=0}><ArrowLeft size={19}/></button>
      <span>Slide {page+1}/{count}</span>
      <button type="button" onClick={()=>go(page+1)} disabled={page>=slides.length-1}><ArrowRight size={19}/></button></>}
    {!images&&<span className="ic3-drive-info">{count?'Bộ '+count+' slide':'Trình chiếu Drive'}</span>}
    <a href={lesson.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="Mở tài liệu gốc"><ExternalLink size={16}/> File gốc</a>
   </div>
  </footer>
 </div>;
 return createPortal(content,document.body);
}
