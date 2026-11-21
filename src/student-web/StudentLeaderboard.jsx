import React,{useEffect,useMemo,useState} from 'react';
import {RefreshCw,Star,Trophy,GraduationCap,ExternalLink} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './studentLeaderboard.css';

// Native student component, not an iframe: prevents recursively embedded app shells.
export default function StudentLeaderboard({classCode}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const [grade,setGrade]=useState('all');
 async function load(){
  if(!classCode)return;
  setBusy(true);setError('');
  try {
   const {data:value,error:err}=await supabase.rpc('ic3_school_public_portal',{p_class_code:classCode});
   if(err)throw err;
   if(!value?.school_name)throw Error('Mã lớp không thuộc một trường đang hoạt động.');
   setData(value);
  }catch(e){setError(e.message||'Không tải được BXH.');}finally{setBusy(false);}
 }
 useEffect(()=>{load();},[classCode]);
 const grades=useMemo(()=>{
  const known=Object.keys(data?.grade_boards||{}).filter(g=>Array.isArray(data.grade_boards?.[g]));
  const fallback=['6','7','8','9'].filter(g=>Array.isArray(data?.['top_'+g]));
  return (known.length?known:fallback).sort((a,b)=>Number(a)-Number(b));
 },[data]);
 if(!classCode)return <p className="stlb-error">Cần mã lớp hợp lệ để xem bảng xếp hạng.</p>;
 const students=grade==='all'?(data?.top_school||[]).slice(0,5):
   (data?.grade_boards?.[grade]||data?.['top_'+grade]||[]).slice(0,10);
 return <section className="stlb" aria-label="Bảng xếp hạng học sinh toàn trường">
  <header className="stlb-heading">
    <div><small>IC3 GS6 · THÀNH TÍCH DO MÁY CHỦ XẾP HẠNG</small>
     <h1><Trophy size={30}/> Ngôi sao của {data?.school_name||'trường em'}</h1>
     <p>Số sao kiếm được, thứ hạng và ưu tiên đồng điểm lấy trực tiếp từ QLPM, không tự sắp xếp lại.</p></div>
    <button onClick={load} disabled={busy}><RefreshCw size={16}/> {busy?'Đang tải…':'Làm mới'}</button>
  </header>
  {error&&<p className="stlb-error" role="alert">{error}</p>}
  <div className="stlb-tabs" role="group" aria-label="Lọc bảng xếp hạng">
   <button aria-pressed={grade==='all'} onClick={()=>setGrade('all')}>🏆 Toàn trường</button>
   {grades.map(g=><button key={g} aria-pressed={grade===g} onClick={()=>setGrade(g)}>Khối {g}</button>)}
  </div>
  <div className="stlb-results">
   {!students.length?<div className="stlb-empty">{busy?'Đang lấy dữ liệu xếp hạng…':'Chưa có thành tích được ghi nhận cho mục này.'}</div>:
   students.map((s,i)=><article className={'stlb-student'+(i<3?' stlb-podium':'')} key={s.student_id||grade+'-'+i}>
    <span className="stlb-rank">{i<3?['🥇','🥈','🥉'][i]:'#'+(s.rank||i+1)}</span>
    <div><strong>{s.name}</strong><small>Lớp {s.class_name||'—'}</small></div>
    <b><Star size={18} fill="currentColor"/> {Number(s.earned||0).toLocaleString('vi-VN')} sao</b>
   </article>)}
  </div>
  <div className="stlb-foot">
   <p><GraduationCap size={17}/> Bảng xếp hạng hiện đúng dữ liệu của trường từ mã lớp em đăng nhập.</p>
   <a href={'/student-web?mode=register&code='+encodeURIComponent(classCode)}
      target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Đăng ký lớp (mở trang riêng)</a>
  </div>
 </section>;
}
