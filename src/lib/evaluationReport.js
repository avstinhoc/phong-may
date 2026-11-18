import * as XLSX from 'xlsx';
import {compareStudentName} from './students';

const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function exportClassEvaluation({profile,className,period,data,makeEvidence,format='xlsx'}){
 const pupils=(data.students||[]).filter(s=>s.status==='active'&&s.class_name===className).sort(compareStudentName);
 if(!className||!pupils.length)throw Error('Hãy chọn một lớp có học sinh để xuất báo cáo.');
 const headers=['STT','Họ và tên','Lớp','Số buổi','Vắng','Đầu điểm','Lượt thưởng','Lượt vi phạm','Mức đánh giá','Nhận xét đã lưu','Ngày lưu'];
 const rows=pupils.map((st,i)=>{
   const facts=makeEvidence(st);
   const review=(data.evaluations||[]).filter(r=>r.student_id===st.id&&r.period_label===period)
     .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
   return [i+1,st.full_name,st.class_name,facts.total,facts.absence,facts.scores.length,
     facts.awards,facts.violations,review?.level||'Chưa lưu',
     review?.comment||'Chưa có đánh giá được giáo viên xác nhận.',
     review?.created_at?new Date(review.created_at).toLocaleDateString('vi-VN'):'—'];
 });
 const title='IC3 GS6 · BÁO CÁO ĐÁNH GIÁ HỌC SINH';
 const label='Trường: '+(profile.school_name||'')+' · Lớp: '+className+' · Giai đoạn: '+period;
 const fileName='Danh_gia_'+className.replace(/[^\p{L}\p{N}._-]+/gu,'_')+'_'+new Date().toISOString().slice(0,10);
 if(format==='xlsx'){
   const ws=XLSX.utils.aoa_to_sheet([[title],[label],['Giáo viên: '+(profile.full_name||'')+' · Sĩ số: '+pupils.length],[],headers,...rows]);
   ws['!merges']=[0,1,2].map(r=>({s:{r,c:0},e:{r,c:10}}));
   ws['!cols']=[{wch:7},{wch:28},{wch:11},{wch:11},{wch:9},{wch:11},{wch:13},{wch:13},{wch:24},{wch:95},{wch:17}];
   ws['!autofilter']={ref:'A5:K'+(5+rows.length)};
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,ws,'Đánh giá lớp');
   XLSX.writeFile(wb,fileName+'.xlsx');return;
 }
 const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>'+safe(title)+'</title><style>'+
  '@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#163148;margin:0}h1{text-align:center;color:#0c807a;font-size:19pt}h2{text-align:center;font-size:14pt;margin-top:0}.meta{border:1px solid #b8d8dc;border-radius:6px;background:#f1f8f9;padding:12px;margin:10px 0 16px;line-height:1.7}table{border-collapse:collapse;width:100%;font-size:8.2pt}th{background:#087e81;color:#fff}th,td{border:1px solid #bbd0d5;padding:6px;vertical-align:top;overflow-wrap:anywhere}tr:nth-child(even){background:#f1f7f8}.foot{text-align:right;margin-top:20px}.note{font-size:8pt;color:#526c76;margin-top:9px}</style></head><body>'+
  '<h1>'+safe(title)+'</h1><h2>Lớp '+safe(className)+'</h2>'+
  '<div class="meta">'+safe(label)+'<br>Giáo viên: '+safe(profile.full_name||'')+' · Sĩ số: '+pupils.length+' · Ngày xuất: '+new Date().toLocaleDateString('vi-VN')+'</div>'+
  '<table><thead><tr>'+headers.map(x=>'<th>'+safe(x)+'</th>').join('')+'</tr></thead><tbody>'+
  rows.map(row=>'<tr>'+row.map(value=>'<td>'+safe(value)+'</td>').join('')+'</tr>').join('')+
  '</tbody></table><p class="note">Chỉ nhận xét đã lưu bởi giáo viên được coi là kết quả chính thức; ô chưa lưu được ghi rõ.</p>'+
  '<p class="foot">GIÁO VIÊN XÁC NHẬN<br><br><br>'+safe(profile.full_name||'')+'</p></body></html>';
 const win=window.open('','_blank','width=1100,height=800');
 if(!win)throw Error('Trình duyệt chặn cửa sổ in. Hãy bật popup để xuất PDF.');
 win.document.open();win.document.write(html);win.document.close();win.focus();
 const print=()=>win.print();
 if(win.document.readyState==='complete')print();else win.addEventListener('load',print,{once:true});
}
