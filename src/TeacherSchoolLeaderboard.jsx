import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
import {SchoolPortal} from './SchoolPortal';

/** A school membership-gated entry point, embedded in the logged-in teacher app.
 * Individual teachers do not have to own the class that provides the code. */
export function TeacherSchoolLeaderboard({profile,refresh,onNavigate}){
 const [result,setResult]=useState({schoolId:'',code:'',loading:true,error:''});
 useEffect(()=>{
   let alive=true;
   if(!profile?.school_id){
     setResult({schoolId:'',code:'',loading:false,error:''});
     return;
   }
   setResult({schoolId:profile.school_id,code:'',loading:true,error:''});
   supabase.rpc('ic3_my_school_board_code',{p_school_id:profile.school_id})
    .then(({data,error})=>{
      if(!alive)return;
      setResult({schoolId:profile.school_id,code:error?'':String(data||''),loading:false,error:error?.message||''});
    }).catch(err=>{
      if(alive)setResult({schoolId:profile.school_id,code:'',loading:false,error:err.message||'Không thể kết nối.'});
    });
   return()=>{alive=false;};
 },[profile?.school_id,refresh]);
 if(result.schoolId!==profile?.school_id||result.loading){
   return <section className="panel teacher-school-board-loading" aria-live="polite">
     <h2>🏆 Bảng xếp hạng toàn trường</h2><p>Đang lấy danh sách lớp được chia sẻ của trường…</p>
   </section>;
 }
 if(!result.code)return <section className="panel teacher-school-board-empty">
   <h2>🏆 Bảng xếp hạng toàn trường</h2>
   <p>{result.error||'Trường này chưa có mã lớp đang hoạt động hoặc bạn chưa được cấp quyền vào trường.'}</p>
   <p className="muted">Bảng xếp hạng tổng hợp theo đúng trường đang chọn, kể cả lớp do giáo viên khác tạo. Tạo lớp đầu tiên tại Lớp & mã đăng ký nếu trường chưa có lớp nào.</p>
   <button type="button" className="btn primary" onClick={()=>onNavigate('settings')}>Đến Lớp & mã đăng ký</button>
 </section>;
 return <div className="teacher-school-board">
   <div className="teacher-school-board-intro">
     <div><b>🏆 Bảng xếp hạng trường</b><p>Dùng chung cho mọi giáo viên thuộc cùng trường · tự đồng bộ điểm thưởng.</p></div>
     <a className="btn outline" href={'/school?code='+encodeURIComponent(result.code)} target="_blank" rel="noopener noreferrer">↗ Mở trang học sinh</a>
   </div>
   <SchoolPortal embedded initialCode={result.code}/>
 </div>;
}
