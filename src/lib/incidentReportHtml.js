// Print-ready A4 student incident record combining the user's written statement
// template with verified incident notes already recorded by the school.
const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));
const vnDate=value=>{
 if(!value)return '…/…/……';
 const parts=String(value).slice(0,10).split('-');
 return parts.length===3?parts.reverse().join('/'):String(value);
};
export function buildIncidentReportHtml({student={},schoolName='',teacherName='',report={},violations=[],date=''}={}){
 const confirmed=report.status==='confirmed';
 const title='BIÊN BẢN GHI NHẬN LỖI HỌC SINH';
 const school=escape(schoolName||'................................');
 const learner=escape(student.full_name||'................................');
 const className=escape(student.class_name||'........');
 const teacher=escape(teacherName||'................................');
 const count=Number(report.violation_count)||violations.length||0;
 const milestone=Number(report.milestone)||0;
 const rows=(violations||[]).map((row,i)=>'<tr><td class="center">'+(i+1)+'</td><td>'+
   escape(vnDate(row.record_date))+'</td><td>'+escape(row.title||'Ghi nhận lỗi')+
   '</td><td>'+escape(row.note||'—')+'</td></tr>').join('');
 const day=date?new Date(date+'T12:00:00+07:00'):new Date();
 const valid=!Number.isNaN(day.getTime());
 const stamp=valid?new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'numeric',month:'numeric',year:'numeric'}).format(day):'…/…/……';
 const reason=String(report.notes||'').trim();
 return '<!doctype html><html lang="vi"><head><meta charset="UTF-8"/>'+
   '<title>'+title+'</title>'+
   '<style>'+
   '@page{size:A4 portrait;margin:16mm 18mm 18mm}'+
   'html,body{margin:0;padding:0;background:#fff;color:#172b3a;font-family:"Times New Roman",serif;font-size:12pt;line-height:1.45}'+
   '.sheet{max-width:210mm;margin:0 auto}.nation{text-align:center;font-size:12pt;font-weight:700}'+
   '.motto{text-align:center;font-weight:700;margin:3px 0 20px;border-bottom:1px solid #333;display:table;margin-left:auto;margin-right:auto;padding-bottom:4px}'+
   '.date{text-align:right;font-style:italic;margin:9px 0 19px}.title{text-align:center;font-size:17pt;font-weight:700;margin:10px 0 20px}'+
   '.address{margin:0 0 15px}.line{margin:6px 0}.section{margin:17px 0 7px;font-weight:700}'+
   'table{border-collapse:collapse;width:100%;margin:9px 0 14px;font-size:10.5pt;table-layout:fixed}'+
   'th,td{border:1px solid #555;padding:6px 7px;vertical-align:top;overflow-wrap:anywhere}'+
   'th{background:#f2f4f5;font-weight:700}.center{text-align:center}.line-space{border-bottom:1px dotted #6b7479;height:23px}'+
   '.note{padding:8px 10px;border:1px solid #aab1b6;white-space:pre-wrap;overflow-wrap:anywhere}'+
   '.muted{color:#4e5e67;font-size:10pt}.signatures{display:flex;justify-content:space-between;gap:20px;text-align:center;margin-top:28px;break-inside:avoid}'+
   '.signatures>div{width:46%}.signatures strong{display:block}.signatures em{display:block;font-size:10pt;margin:3px 0 70px}'+
   '.watermark{font:700 10pt Arial,sans-serif;letter-spacing:.04em;color:#aa5220;text-align:center;padding:7px;border:1px solid #e1b89a;margin:0 0 18px}'+
   '@media screen{body{background:#e9f0f2;padding:20px}.sheet{background:white;padding:20mm;box-shadow:0 2px 22px #253f4930}}'+
   '@media print{.sheet{max-width:none}.watermark{color:#555}table tr{break-inside:avoid}}'+
   '</style></head><body><article class="sheet">'+
   (confirmed?'':'<div class="watermark">BẢN NHÁP — CHƯA ĐƯỢC GIÁO VIÊN XÁC NHẬN</div>')+
   '<div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>'+
   '<div class="motto">Độc lập - Tự do - Hạnh phúc</div>'+
   '<div class="date">Ngày lập: '+escape(stamp)+'</div>'+
   '<h1 class="title">'+title+'</h1>'+
   '<div class="address"><strong>Kính gửi:</strong><div class="line">- Hiệu trưởng Trường '+school+'</div>'+
   '<div class="line">- Giáo viên chủ nhiệm: ........................................ · Lớp: '+className+'</div></div>'+
   '<div class="line"><strong>Em tên là:</strong> '+learner+' &nbsp;&nbsp; <strong>Lớp:</strong> '+className+
   ' &nbsp;&nbsp; <strong>Năm học:</strong> ....................</div>'+
   '<div class="section">I. Nội dung ghi nhận từ hệ thống quản lý</div>'+
   '<div class="line muted">Có '+escape(count)+' lần ghi nhận lỗi'+(milestone?' (mốc lập biên bản: '+escape(milestone)+')':'')+'. Nội dung dưới đây là ghi nhận của giáo viên, không thay thế phần tường trình của học sinh.</div>'+
   '<table><thead><tr><th style="width:7%">STT</th><th style="width:17%">Ngày</th><th style="width:30%">Nội dung lỗi</th><th>Ghi chú</th></tr></thead><tbody>'+
   (rows||'<tr><td colspan="4">Chưa có nội dung lỗi được ghi nhận.</td></tr>')+'</tbody></table>'+
   '<div class="section">II. Tường trình của học sinh</div>'+
   '<div class="muted">Em xin trình bày lý do em viết biên bản này như sau (học sinh tự viết):</div>'+
   '<div class="line-space"></div><div class="line-space"></div><div class="line-space"></div><div class="line-space"></div>'+
   '<div class="section">III. Ý kiến của giáo viên giảng dạy</div>'+
   '<div class="note">'+escape(reason||'................................................................................................')+'</div>'+
   '<p class="muted">Tài liệu ghi nhận sự việc và phục vụ đối chiếu. Không tự áp dụng hình thức kỷ luật.</p>'+
   '<div class="signatures"><div><strong>HỌC SINH</strong><em>(Ký, ghi rõ họ tên)</em></div>'+
   '<div><strong>XÁC NHẬN CỦA GIÁO VIÊN GIẢNG DẠY</strong><em>(Ký, ghi rõ họ tên)</em><b>'+teacher+'</b></div></div>'+
   '</article></body></html>';
}
