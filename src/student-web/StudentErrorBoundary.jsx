import React from 'react';
import {AlertTriangle,RefreshCw,ExternalLink} from 'lucide-react';

/**
 * A native WebView has no browser devtools by default. Always render a visible
 * recovery screen instead of a white blank window when a React render crashes.
 * Keep errors out of the classroom UI to avoid disclosing internal paths/tokens.
 */
export default class StudentErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error,info){
  // Developer logs are available when investigating the installer locally.
  console.error('QLPM Student UI failed to render',error,info?.componentStack);
 }
 render(){
  if(!this.state.failed)return this.props.children;
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,
   fontFamily:'Segoe UI,Arial,sans-serif',background:'#f4f8ff',color:'#234361'}}>
   <section role="alert" style={{maxWidth:550,background:'#fff',border:'1px solid #d8e7f4',
    padding:35,borderRadius:22,boxShadow:'0 12px 32px #1e42601a',textAlign:'center'}}>
    <AlertTriangle size={42} color="#c16b36" aria-hidden="true"/>
    <h1 style={{fontSize:24}}>QLPM Student chưa mở được giao diện</h1>
    <p style={{fontSize:14,lineHeight:1.7,color:'#637c94'}}>
     Ứng dụng gặp lỗi hiển thị. Thử mở lại; nếu vẫn xảy ra, hãy báo giáo viên để cập nhật bộ cài.
     Hồ sơ và điểm học sinh trên máy chủ không bị xóa vì lỗi hiển thị này.</p>
    <button type="button" onClick={()=>window.location.reload()}
     style={{border:0,borderRadius:12,background:'#1b8592',color:'#fff',
      padding:'13px 19px',fontWeight:800,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:9}}>
     <RefreshCw size={18}/> Tải lại ứng dụng
    </button>
    <p style={{fontSize:12,color:'#7d91a4',marginTop:20}}>QLPM Student · Windows</p>
   </section>
  </main>;
 }
}
