import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
import {FlameBadge} from './FlameBadge';
import {flameEffect} from './lib/stars';
import {topFive,schoolPodiumOrder,gradeClassRows} from './lib/schoolLeaderboard';
import './schoolPortal.css';

const medal={1:'🥇',2:'🥈',3:'🥉'};
const codeLink=value=>'/student?code='+encodeURIComponent(value);
const schoolLink=code=>'/school?code='+encodeURIComponent(code);
const gradeLink=(grade,code)=>'/school/grade/'+grade+'?code='+encodeURIComponent(code);

function StarFace({student,large=false}){
 const effect=flameEffect(student);
 return <div className={'school-star-face '+(large?'school-star-face--large':'')}>
   {effect.visible?<FlameBadge wallet={student}/>:<span className="school-star-placeholder" aria-label="Ngôi sao">✦</span>}
 </div>;
}
function SchoolPodium({rows}){
 return <div className="school-podium-scroller" aria-label="Năm học sinh dẫn đầu toàn trường">
   <div className="school-podium-row">
     {schoolPodiumOrder(rows).map(student=>{
       const fx=flameEffect(student);
       return <article key={student.rank} className={'school-podium-card school-rank-'+student.rank+' '+(fx.visible?fx.className:'')}
         style={fx.style} aria-label={'Hạng '+student.rank+': '+student.name+', lớp '+student.class_name+', '+student.earned+' sao'}>
         <span className="school-podium-number">{medal[student.rank]||'✦'} TOP {student.rank}</span>
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
 const rows=(items||[]).slice(0,10);
 return <section className={'school-grade-board school-grade-board--'+grade} aria-label={'Top 10 học sinh khối '+grade}>
   <div className="school-grade-board-head">
     <div><span className="school-grade-crown">{grade==='8'?'💜':grade==='6'?'🧡':'💙'}</span>
       <div><h3>TOP 10 KHỐI {grade}</h3><small>10 ngôi sao có tổng sao cao nhất</small></div></div>
     <span className="school-grade-number">0{grade}</span>
   </div>
   {rows.length?<ol className="school-grade-list">
     {rows.map((student,i)=>{
       const fx=flameEffect(student);
       return <li key={student.rank} className={'school-grade-row '+(i===0?'school-grade-row--first':'')}>
         <span className="school-grade-place">{medal[Number(student.rank)]||'#'+student.rank}</span>
         <span className="school-grade-info"><b title={student.name}>{student.name}</b><small>Lớp {student.class_name}</small></span>
         <span className="school-grade-points">⭐ {Number(student.earned).toLocaleString('vi-VN')}</span>
         {fx.visible&&<FlameBadge wallet={student} compact/>}
       </li>;
     })}
   </ol>:<div className="school-grade-empty"><span>✨</span><p>Khối {grade} chưa có sao thưởng.</p><small>Hãy cùng cố gắng để lên bảng vàng!</small></div>}
 </section>;
}
function GradeClassSection({grade,rows,query=''}) {
 return <section className="school-class-section" id="school-classes">
   <div className="school-class-heading">
     <div className="school-class-heading-icon" aria-hidden="true">{grade==='8'?'🎓':grade==='7'?'📘':'🚀'}</div>
     <div><p>KHỐI {grade}</p><h2>Khám phá các lớp khối {grade}</h2>
       <span>{rows.length} lớp · Chọn "Vào trang lớp" để xem thông tin lớp mình</span></div>
   </div>
   {rows.length?<div className="school-class-grid">{rows.map(item=>
     <article className="school-class-card" key={item.registration_code}>
       <div className="school-class-card-top"><span>IC3 GS6</span><span>KHỐI {grade}</span></div>
       <h3>Lớp {item.class_name}</h3>
       <p>{item.student_count} học sinh đang học</p>
       <a href={codeLink(item.registration_code)} className="school-class-open school-class-open--solo">
         Vào trang lớp <span aria-hidden="true">↗</span>
       </a>
     </article>
   )}</div>:<p className="school-empty-classes">{query?'Không tìm thấy lớp phù hợp.':'Chưa có lớp khối '+grade+' tại trường này. Lớp sẽ xuất hiện khi giáo viên tạo mã.'}</p>}
 </section>;
}
export function SchoolPortal({initialCode='',embedded=false}){
 const [code,setCode]=useState(()=>initialCode||new URLSearchParams(window.location.search).get('code')||'');
 const [data,setData]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [updatedAt,setUpdatedAt]=useState(null),[search,setSearch]=useState('');
 const selectedGrade=window.location.pathname.match(/^\/school\/grade\/([678])\/?$/)?.[1]||null;
 async function reload(nextCode=code){
   if(!nextCode.trim()){setError('Nhập mã của một lớp trong trường để xem bảng xếp hạng.');return;}
   setBusy(true);setError('');
   const normalized=nextCode.trim().toUpperCase();
   try{
     const {data:result,error:apiError}=await supabase.rpc('ic3_school_public_portal',{p_class_code:normalized});
     if(apiError)throw apiError;
     if(!result?.school_name){setData(null);throw Error('Không tìm thấy trường từ mã lớp này. Hãy sử dụng mã lớp đang hoạt động.');}
     setData(result);setCode(normalized);setUpdatedAt(new Date());
     if(!embedded)window.history.replaceState(null,'',(selectedGrade?'/school/grade/'+selectedGrade:'/school')+'?code='+encodeURIComponent(normalized));
   }catch(e){setError('Không tải được BXH: '+(e.message||String(e)));}
   finally{setBusy(false);}
 }
 useEffect(()=>{
   const initial=initialCode||new URLSearchParams(window.location.search).get('code');
   if(initial)reload(initial);
 },[initialCode]);
 const classes=Array.isArray(data?.classes)?data.classes:[];
 const matches=search.trim()?classes.filter(item=>String(item.class_name||'').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))).slice(0,8):[];
 function findClass(e){
   e.preventDefault();
   if(!matches.length)return;
   const grade=String(matches[0].grade||'');
   if(['6','7','8'].includes(grade))window.location.assign(gradeLink(grade,code)+'#school-classes');
   else window.location.assign(codeLink(matches[0].registration_code));
 }
 return <div className={'school-public-page '+(embedded?'school-public-page--embedded':'')}>
   <header className="school-public-header">
     <a href={schoolLink(code)} className="school-public-brand"><span>IC3</span><b>IC3 GS6 <small>ĐẤU TRƯỜNG NGÔI SAO</small></b></a>
     <nav aria-label="Đi nhanh đến mục" className="school-public-nav">
       <a className="school-nav-rank" href={schoolLink(code)+'#school-standings'}>🏆 Toàn trường</a>
       <a className="school-nav-grade8" href={gradeLink('8',code)}>🎓 Khối 8</a>
       <a className="school-nav-grade7" href={gradeLink('7',code)}>📘 Khối 7</a>
       <a className="school-nav-grade6" href={gradeLink('6',code)}>🚀 Khối 6</a>
     </nav>
     {data&&<form className="school-header-class-search" role="search" aria-label="Tìm lớp trong trường" onSubmit={findClass}>
       <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
         placeholder="🔎 Tìm lớp 6.1, 7.2…" aria-label="Tìm nhanh lớp" autoComplete="off"/>
       <button type="submit" disabled={!matches.length} aria-label="Đến lớp đầu tiên phù hợp">Tìm</button>
       {search.trim()&&<div className="school-header-search-results" role="status">
         {matches.length?matches.map(item=><a key={item.registration_code} href={['6','7','8'].includes(String(item.grade))?gradeLink(item.grade,code)+'#school-classes':codeLink(item.registration_code)}>
           <span>📚 Lớp {item.class_name}</span><small>Khối {item.grade||'khác'} · {item.student_count} học sinh</small>
         </a>):<span className="school-header-no-results">Không tìm thấy lớp phù hợp.</span>}
       </div>}
     </form>}
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
       {!selectedGrade&&<>
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
               <p>5 học sinh có tổng sao kiếm được cao nhất, không trừ sao đã đổi quà.</p></div>
             <span className="school-standings-trophy">👑</span>
           </div>
           {data.top_school?.length?<SchoolPodium rows={topFive(data.top_school)}/>:
             <div className="school-main-empty">🌟 Chưa có học sinh nào được cộng sao. Hãy là người đầu tiên lên bảng vàng!</div>}
         </section>
         <section className="school-grade-launchers" aria-label="Chọn khối để xem Top 10 và các lớp">
           <div className="school-standings-heading"><div><span>3 ĐẤU TRƯỜNG THEO KHỐI</span><h2>✨ Chọn khối của bạn</h2>
             <p>Mỗi khối có bảng Top 10 riêng và danh sách lớp bên dưới. Chọn khối để khám phá nhé!</p></div></div>
           <div className="school-grade-launcher-grid">
             {['8','7','6'].map(grade=><a key={grade} className={'school-grade-launcher school-grade-launcher--'+grade} href={gradeLink(grade,code)}>
               <span className="school-grade-launcher-icon">{grade==='8'?'🎓':grade==='7'?'📘':'🚀'}</span>
               <span className="school-grade-launcher-text"><strong>KHỐI {grade}</strong><small>{gradeClassRows(classes,grade).length} lớp đang hoạt động</small>
                 <b>Khám phá Top 10 & các lớp <span aria-hidden="true">↗</span></b></span>
             </a>)}
           </div>
         </section>
       </>}
       {selectedGrade&&<>
         <section className={'school-grade-detail-hero school-grade-detail-hero--'+selectedGrade}>
           <a href={schoolLink(code)} className="school-grade-back">← Về BXH toàn trường</a>
           <span className="school-grade-detail-overline">🏆 ĐẤU TRƯỜNG NGÔI SAO · {data.school_name}</span>
           <h1>{selectedGrade==='8'?'🎓':selectedGrade==='7'?'📘':'🚀'} Bảng vàng khối {selectedGrade}</h1>
           <p>Vinh danh 10 học sinh xuất sắc nhất khối {selectedGrade} và khám phá danh sách lớp đang hoạt động.</p>
           <div className="school-grade-detail-pills"><span>⭐ Top 10 sao</span><span>🏫 {gradeClassRows(classes,selectedGrade).length} lớp</span><span>🔒 Chỉ hiển thị thành tích công khai</span></div>
         </section>
         <div className="school-grade-detail"><GradeLeaderboard grade={selectedGrade} items={data['top_'+selectedGrade]}/></div>
         <GradeClassSection grade={selectedGrade} rows={gradeClassRows(classes,selectedGrade,search)} query={search}/>
       </>}
       <footer className="school-public-footer">
         <span>IC3 GS6 · Phòng máy & thi đua</span>
         <small>BXH chỉ công bố tên, lớp và sao thưởng; không công khai điểm kiểm tra hay thông tin liên hệ. Dữ liệu của các trường khác nhau được tách riêng.</small>
       </footer>
     </>}
   </main>
   <button className="school-go-top" aria-label="Lên đầu trang" title="Lên đầu trang" type="button"
     onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>↑</button>
 </div>;
}
