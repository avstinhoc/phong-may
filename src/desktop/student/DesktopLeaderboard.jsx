import React,{useEffect,useState} from 'react';
import {Trophy,School,Search,RefreshCw,Medal,Star,Users} from 'lucide-react';
import {supabase,configurationError} from '../../lib/supabase';

const medal=['🥇','🥈','🥉'];
const rankRows=(items,limit=10)=>Array.isArray(items)?items.slice(0,limit):[];
export default function DesktopLeaderboard({initialCode='',onCodeChange}){
 const [code,setCode]=useState(initialCode),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [grade,setGrade]=useState('all');
 async function load(value=code){
  if(!value.trim()){setError('Nhập mã lớp để xem BXH của trường.');return;}
  setBusy(true);setError('');
  try{
   if(!supabase)throw Error(configurationError||'Chưa có kết nối Supabase.');
   const normalized=value.trim().toUpperCase();
   const {data:board,error:err}=await supabase.rpc('ic3_school_public_portal',{p_class_code:normalized});
   if(err)throw err;
   if(!board?.school_name)throw Error('Không tìm thấy trường tương ứng với mã lớp.');
   setData(board);setCode(normalized);setGrade('all');onCodeChange?.(normalized);
  }catch(e){setError(e.message||String(e));setData(null);}
  finally{setBusy(false);}
 }
 useEffect(()=>{if(initialCode)load(initialCode);},[initialCode]);
 const grades=Array.isArray(data?.grades)?data.grades.filter(g=>/^[1-9]$/.test(String(g))):[];
 const rows=grade==='all'?rankRows(data?.top_school,5):rankRows(data?.grade_boards?.[grade],10);
 return <div className="qlpm-school-board">
  <header><div className="qlpm-school-board-logo"><Trophy size={34}/></div><div><small>THÀNH TÍCH TOÀN TRƯỜNG</small><h1>🏆 Bảng xếp hạng sao</h1>
   <p>Top 5 toàn trường và Top 10 theo khối, cập nhật theo dữ liệu QLPM.</p></div></header>
  <form onSubmit={e=>{e.preventDefault();load();}} className="qlpm-school-search">
   <label htmlFor="qlpm-school-code"><School size={17}/> Mã lớp của trường</label>
   <input id="qlpm-school-code" required value={code} onChange={e=>setCode(e.target.value)} placeholder="Ví dụ: IC3-DUYTAN-6.1"/>
   <button disabled={busy} type="submit"><Search size={18}/> {busy?'Đang tải...':'Xem BXH'}</button>
  </form>
  {error&&<p className="qlpm-board-error" role="alert">{error}</p>}
  {data&&<><div className="qlpm-school-heading"><div><h2>{data.school_name}</h2><p><Users size={15}/> {data.student_count||0} học sinh · {data.class_count||0} lớp</p></div>
    <button type="button" onClick={()=>load()} disabled={busy}><RefreshCw size={16}/> Làm mới</button></div>
    <div className="qlpm-grade-tabs"><button className={grade==='all'?'active':''} onClick={()=>setGrade('all')}>🏅 Toàn trường</button>
      {grades.map(g=><button key={g} onClick={()=>setGrade(String(g))} className={grade===String(g)?'active':''}>Khối {g}</button>)}
    </div>
    <div className="qlpm-top-summary">{grade==='all'?'BẢNG VÀNG TOP 5 TOÀN TRƯỜNG':'TOP 10 HỌC SINH KHỐI '+grade}</div>
    <div className="qlpm-rank-table">
      {rows.map((s,i)=><div className={'qlpm-rank-row '+(i<3?'medal':'')} key={i}>
       <span className="qlpm-rank-place">{medal[i]||('#'+(s.rank||i+1))}</span>
       <div className="qlpm-rank-person"><strong>{s.name}</strong><small>Lớp {s.class_name}</small></div>
       <div className="qlpm-rank-star"><Star size={19} fill="#f3c45a"/><strong>{s.earned||0}</strong><small>sao đã nhận</small></div>
      </div>)}
      {!rows.length&&<p className="qlpm-empty-rank">Chưa có thành tích sao nào trong bảng xếp hạng này.</p>}
    </div>
    <p className="qlpm-board-explain">Thứ hạng do máy chủ tính, ưu tiên học sinh đạt cùng mốc sao sớm hơn; bản desktop không tự sắp xếp lại khi đồng điểm.</p>
  </>}
 </div>;
}
