import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
import {FlameBadge} from './FlameBadge';
import {flameEffect} from './lib/stars';
import {topFive,schoolPodiumOrder,gradeClassRows} from './lib/schoolLeaderboard';
import './schoolPortal.css';

const medal={1:'🥇',2:'🥈',3:'🥉',4:'✦',5:'✦'};
const codeLink=value=>'/student?code='+encodeURIComponent(value);
const registerLink=value=>'/register?code='+encodeURIComponent(value);

function StarFace({student,large=false}){
 const effect=flameEffect(student);
 return <div className={'school-star-face '+(large?'school-star-face--large':'')}>
   {effect.visible?<FlameBadge wallet={student}/>:<span className="school-star-placeholder" aria-label="Ngôi sao">✦</span>}
 </div>;
}
function SchoolPodium({rows}){
 const visible=schoolPodiumOrder(rows);
 return <div className="school-podium-scroller" aria-label="Năm học sinh dẫn đầu toàn trường">
   <div className="school-podium-row">
     {visible.map(student=>{
       const fx=flameEffect(student);
       return <article key={student.rank} className={'school-podium-card school-rank-'+student.rank+' '+(fx.visible?fx.className:'')}
         style={fx.style} aria-label={'Hạng '+student.rank+': '+student.name+', lớp '+student.class_name+', '+student.earned+' sao'}>
         <span className="school-podium-number">{medal[student.rank]} TOP {student.rank}</span>
         <StarFace student={student} large/>
         <strong className="school-podium-student">{student.name}</strong>
         <span className="school-podium-class">Lớp {student.class_name}</span>
         <span className="school-podium-earn">⭐ {Number(student.earned).toLocaleString('vi-VN')}</span>
         <small>Tổng sao đã kiếm</small>
         <div className="school-podium-foot"><span>HẠNG {student.rank}</span></div>
       </article>;
     })}
   </div>
 </div>;
}
function GradeLeaderboard({grade,items}){
 const rows=topFive(items);
 return <section className={'school-grade-board school-grade-board--'+grade} aria-label={'Top 5 học sinh khối '+grade}>
   <div className="school-grade-board-head">
     <div><span className="school-grade-crown">{grade==='8'?'💜':grade==='6'?'🧡':'💙'}</span>
       <div><h3>TOP 5 KHỐI {grade}</h3><small>Thi đua theo tổng sao đã kiếm</small></div></div>
     <span className="school-grade-number">0{grade}</span>
   </div>
   {rows.length?<ol className="school-grade-list">
     {rows.map((student,i)=>{
       const fx=flameEffect(student);
       return <li key={i} className={'school-grade-row '+(i===0?'school-grade-row--first':'')}>
         <span className="school-grade-place">{medal[Number(student.rank)]||'#'+student.rank}</span>
         <span className="school-grade-info"><b>{student.name}</b><small>Lớp {student.class_name}</small></span>
         <span className="school-grade-points">⭐ {Number(student.earned).toLocaleString('vi-VN')}</span>
         {fx.visible&&<FlameBadge wallet={student} compact/>}
       </li>;
     })}
   </ol>:<div className="school-grade-empty"><span>✨</span><p>Khối {grade} chưa có sao thưởng.</p><small>Hãy cùng cố gắng để lên bảng vàng!</small></div>}
 </section>;
}
function GradeClassSection({grade,rows,onCopy}){
 return <section className="school-class-section" id={'school-grade-'+grade}>
   <div className="school-class-heading">
     <div className="school-class-heading-icon" aria-hidden="true">{grade==='8'?'🎓':grade==='7'?'📘':'🚀'}</div>
     <div><p>KHỐI {grade}</p><h2>Khám phá các lớp khối {grade}</h2>
       <span>{rows.length} lớp · Mã lớp được cập nhật từ hệ thống QLPM</span></div>
   </div>
   {rows.length?<div className="school-class-grid">{rows.map(item=>
     <article className="school-class-card" key={item.registration_code}>
       <div className="school-class-card-top"><span>IC3 GS6</span><span>KHỐI {grade}</span></div>
       <h3>Lớp {item.class_name}</h3>
       <p>{item.student_count} học sinh đang học</p>
       <div className="school-class-code"><span>MÃ LỚP</span><code>{item.registration_code}</code></div>
       <div className="school-class-buttons">
         <a href={codeLink(item.registration_code)} className="school-class-open">Vào trang lớp <span aria-hidden="true">↗</span></a>
         <button type="button" onClick={()=>onCopy(item.registration_code)} title="Sao chép mã lớp">Sao chép</button>
       </div>
       <a className="school-class-register" href={registerLink(item.registration_code)}>✍️ Đăng ký vào lớp</a>
     </article>
   )}</div>:<p className="school-empty-classes">Chưa có lớp khối {grade} tại trường này. Lớp sẽ xuất hiện tự động sau khi giáo viên tạo mã.</p>}
 </section>;
}
export function SchoolPortal(){
 const [code,setCode]=useState(()=>new URLSearchParams(window.location.search).get('code')||'');
 const [data,setData]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [updatedAt,setUpdatedAt]=useState(null),[search,setSearch]=useState('');
 const [copied,setCopied]=useState('');
 async function reload(nextCode=code){
   if(!nextCode.trim()){setError('Nhập mã của một lớp trong trường để xem bảng xếp hạng.');return;}
   setBusy(true);setError('');
   const normalized=nextCode.trim().toUpperCase();
   try{
     const {data:result,error:apiError}=await supabase.rpc('ic3_school_public_portal',{p_class_code:normalized});
     if(apiError)throw apiError;
     if(!result?.school_name){setData(null);throw Error('Không tìm thấy trường từ mã lớp này. Hãy sử dụng mã lớp đang hoạt động.');}
     setData(result);setCode(normalized);setUpdatedAt(new Date());
     window.history.replaceState(null,'','/school?code='+encodeURIComponent(normalized));
   }catch(e){setError('Không tải được BXH: '+(e.message||String(e)));}
   finally{setBusy(false);}
 }
 useEffect(()=>{
   const initial=new URLSearchParams(window.location.search).get('code');
   if(initial)reload(initial);
 },[]);
 async function copy(value){
   try{await navigator.clipboard.writeText(value);setCopied(value);}
   catch{setError('Không sao chép được, hãy chọn mã lớp và sao chép thủ công.');}
 }
 const classes=Array.isArray(data?.classes)?data.classes:[];
 return <div className="school-public-page">
   <header className="school-public-header">
     <a href="#school-top" className="school-public-brand"><span>IC3</span><b>IC3 GS6 <small>ĐẤU TRƯỜNG NGÔI SAO</small></b></a>
     <nav aria-label="Đi nhanh đến mục" className="school-public-nav">
       <a href="#school-standings">🏆 BXH</a>
       <a href="#school-grade-8">Khối 8</a>
       <a href="#school-grade-7">Khối 7</a>
       <a href="#school-grade-6">Khối 6</a>
     </nav>
     <button className="school-header-refresh" type="button" onClick={()=>reload()} disabled={busy} title="Làm mới tất cả BXH và mã lớp">{busy?'Đang tải…':'↻ Làm mới'}</button>
   </header>
   <main className="school-public-main" id="school-top">
     {!data&&<section className="school-join">
       <span>✨ CHÀO MỪNG TỚI IC3 GS6</span>
       <h1>Đấu trường ngôi sao của trường</h1>
       <p>Nhập mã của bất kỳ lớp nào trong trường để xem BXH chung, các khối và danh sách lớp.</p>
       <form onSubmit={e=>{e.preventDefault();reload();}}>
         <label>Mã lớp<input required value={code} onChange={e=>setCode(e.target.value)} placeholder="Ví dụ: IC3-TRUONG-6A1" autoComplete="off"/></label>
         <button type="submit" disabled={busy}>{busy?'Đang mở…':'Mở BXH trường'}</button>
       </form>
     </section>}
     {error&&<p className="school-public-error" role="alert">{error}</p>}
     {data&&<>
       <section className="school-showcase">
         <div className="school-showcase-title">
           <span>🏅 HỘI THI ĐUA IC3 GS6 · NĂM HỌC</span>
           <h1>Ngôi sao của <em>{data.school_name}</em></h1>
           <p>Cùng thi đua giữ chuỗi, tích sao và tỏa sáng. Mỗi lớp, mỗi giáo viên đều góp mặt trên một bảng vàng của trường!</p>
           <div className="school-hero-pills">
             <span>🏫 {data.class_count||0} lớp</span>
             <span>🎒 {data.student_count||0} học sinh</span>
             {updatedAt&&<span>↻ Cập nhật {updatedAt.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span>}
           </div>
         </div>
         <div className="school-showcase-decoration" aria-hidden="true">🏆<span>✦</span></div>
       </section>
       <section id="school-standings" className="school-main-standings">
         <div className="school-standings-heading">
           <div><span>HALL OF FAME</span><h2>🏆 TOP 5 TOÀN TRƯỜNG</h2>
             <p>5 học sinh có tổng sao kiếm được cao nhất, xếp hạng độc lập với việc đổi quà.</p></div>
           <span className="school-standings-trophy">👑</span>
         </div>
         {data.top_school?.length?<SchoolPodium rows={topFive(data.top_school)}/>:
           <div className="school-main-empty">🌟 Chưa có học sinh nào được cộng sao. Hãy là người đầu tiên lên bảng vàng!</div>}
       </section>
       <div className="school-three-grades" aria-label="Bảng xếp hạng theo khối">
         <GradeLeaderboard grade="8" items={data.top_8}/>
         <GradeLeaderboard grade="6" items={data.top_6}/>
         <GradeLeaderboard grade="7" items={data.top_7}/>
       </div>
       <section className="school-class-index">
         <div><span>📚 KHÁM PHÁ KHỐI LỚP</span><h2>Chọn lớp của mình nhé!</h2>
           <p>Mã lớp tự động xuất hiện khi giáo viên tạo lớp mới tại đúng trường này.</p></div>
         <label>🔎 Tìm nhanh lớp<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="6A1, 7/2, 8-3…"/></label>
       </section>
       {['8','7','6'].map(grade=><GradeClassSection grade={grade} key={grade} rows={gradeClassRows(classes,grade,search)} onCopy={copy}/>)}
       {classes.some(c=>!['6','7','8'].includes(String(c.grade)))&&<div className="school-other-classes">
         <h3>Những lớp khác trong trường</h3>
         <div>{classes.filter(c=>!['6','7','8'].includes(String(c.grade))).map(c=>
           <a key={c.registration_code} href={codeLink(c.registration_code)}>Lớp {c.class_name} ↗</a>)}</div>
       </div>}
       <footer className="school-public-footer">
         <span>IC3 GS6 · Phòng máy & thi đua</span>
         <small>BXH chỉ công bố tên, lớp và sao thưởng; không công khai điểm kiểm tra hay thông tin liên hệ. Dữ liệu của các trường khác nhau được tách riêng.</small>
       </footer>
     </>}
   </main>
   {copied&&<div className="school-copy-notice" role="status">✓ Đã sao chép mã lớp: {copied}<button type="button" onClick={()=>setCopied('')}>×</button></div>}
   <button className="school-go-top" aria-label="Lên đầu trang" title="Lên đầu trang" type="button"
     onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>↑</button>
 </div>;
}
