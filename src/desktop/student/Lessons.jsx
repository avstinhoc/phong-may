import React,{useEffect,useState} from 'react';
import {ArrowLeft,BookOpen,Download} from 'lucide-react';
import {LEVEL_1_LESSONS} from '../../learning/curriculum.js';
import counts from '../../learning/slideCounts.json';
import {lessonTitle} from './Practice.jsx';

export default function Lessons(){
 const [n,setN]=useState(0),[page,setPage]=useState(1),[offline,setOffline]=useState(false);
 useEffect(()=>{if(!n)return;let active=true;const image=new Image();image.onload=()=>{if(active)setOffline(true)};image.src='/ic3-slides/Bai-'+String(n).padStart(2,'0')+'/1.webp';return()=>{active=false}},[n]);
 if(!n)return <section className="practice"><header><BookOpen/><h1>Bài giảng IC3</h1><p>22 bài học và ôn tập · Level 1</p></header><div className="practice-grid">{LEVEL_1_LESSONS.map(l=><button key={l.number} onClick={()=>{setOffline(false);setPage(1);setN(l.number)}}><small>BÀI {String(l.number).padStart(2,'0')}　·　{counts[l.number-1]} slide</small><strong>{lessonTitle(l.number)}</strong></button>)}</div></section>;
 const path='/ic3-slides/Bai-'+String(n).padStart(2,'0'),file=path+'.pptx';
 const host=window.__TAURI_INTERNALS__?'https://phong-may.vercel.app':location.origin;
 return <section className="practice"><button onClick={()=>setN(0)}><ArrowLeft size={17}/> Bài giảng</button><h2>Bài {n} · {lessonTitle(n)}</h2>{offline?<><img src={path+'/'+page+'.webp'} alt={'Bài '+n+', slide '+page} style={{display:'block',width:'100%',maxHeight:'65vh',objectFit:'contain'}}/><button disabled={page===1} onClick={()=>setPage(page-1)}>← Trước</button> {page} / {counts[n-1]} <button disabled={page===counts[n-1]} onClick={()=>setPage(page+1)}>Sau →</button></>:<iframe title={'Trình chiếu bài '+n} style={{width:'100%',height:'64vh',border:0}} allowFullScreen src={'https://view.officeapps.live.com/op/embed.aspx?src='+encodeURIComponent(host+file)}/>} <a href={file} download><Download size={16}/> Tải PowerPoint</a></section>
}
