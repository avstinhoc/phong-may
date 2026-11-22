import React,{useEffect,useState} from 'react';
import {Star,Trophy,AlertTriangle,Flame,RotateCcw} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './studentProfile.css';

const tiles=[
 ['Sao hiện có','available',Star,'Dùng để đổi quà'],
 ['Tổng sao đã kiếm','earned',Trophy,'Dùng xếp hạng'],
 ['Lỗi biên bản','violations',AlertTriangle,'Tổng số lỗi chính thức'],
 ['Sao hiệu ứng','effect_score',Flame,'Điểm hiệu ứng ngôi sao'],
 ['Lượt khôi phục','chances',RotateCcw,'Không hoàn trả sao']
];
export default function StudentCompetitionProfile({session}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;setData(null);setError('');
  supabase.rpc('qlpm_student_web_competition',{p_session_token:session.token})
   .then(({data:result,error:err})=>{
    if(!active)return;
    if(err)throw err;
    if(!result)throw Error('Phiên học sinh đã hết hạn.');
    setData(result);
   }).catch(e=>{if(active)setError(e.message||'Không tải được thành tích.');});
  return()=>{active=false};
 },[session.token]);
 return <section className="student-competition-profile" aria-label="Hồ sơ thi đua của học sinh">
  <header className="student-competition-heading">
   <span className="student-competition-initial">{(session.name||'H').trim().charAt(0).toUpperCase()}</span>
   <div><small>HỒ SƠ THI ĐUA</small><h1>{data?.name||session.name}</h1>
    <p>Lớp {data?.class_name||session.class_name||'—'} · Theo dõi thưởng & kỷ luật</p></div>
  </header>
  {error&&<p role="alert" className="qlpm-profile-alert error">{error}</p>}
  <div className="student-competition-tiles">
   {tiles.map(([label,key,Icon,description])=><article key={key}>
    <h2><Icon size={18}/> {label}</h2>
    <strong>{data?(key==='chances'?data[key]+'/3':Number(data[key]||0).toLocaleString('vi-VN')):'—'}</strong>
    <span>{description}</span>
   </article>)}
  </div>
 </section>;
}
