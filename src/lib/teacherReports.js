import {getExcelJS} from './exportPretty';
const palette={navy:'193A50',blue:'23547A',teal:'0D877D',light:'E7F2F5',white:'FFFFFF',gray:'F4F8FA'};
export const amount=v=>Math.round(Number(v)||0).toLocaleString('vi-VN')+' đ';
export const vnDate=d=>d?String(d).slice(0,10).split('-').reverse().join('/'):'';
export const schoolYear=date=>{const y=Number(String(date).slice(0,4)),m=Number(String(date).slice(5,7));const from=m>=8?y:y-1;return from+'–'+(from+1);};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export const hours=s=>{const tm=v=>{const p=String(v||'0:0').split(':');return Number(p[0]||0)+Number(p[1]||0)/60;};return Math.max(0,tm(s.end_time)-tm(s.start_time));};
const dayNames=['Chủ nhật','Hai','Ba','Tư','Năm','Sáu','Bảy'];
export const teacherRows=(sessions,from,to,rate,school)=>{
 const map=new Map();
 (sessions||[]).filter(s=>s.session_date>=from&&s.session_date<=to).forEach(s=>{const k=s.session_date;if(!map.has(k))map.set(k,[]);map.get(k).push(s);});
 const out=[];if(!from||!to||from>to)return out;
 let d=new Date(from+'T12:00:00');
 for(let i=0;i<370&&d.toISOString().slice(0,10)<=to;i++,d.setDate(d.getDate()+1)){
  const date=d.toISOString().slice(0,10),list=map.get(date)||[];
  const multiSchool=new Set(list.map(s=>s.school_name).filter(Boolean)).size>1||/tổng hợp các trường/i.test(school||'');
  const uniq=items=>[...new Set(items.map(s=>multiSchool&&s.school_name?`${s.class_name} (${s.school_name})`:s.class_name))].join(', ');
  const realHours=list.reduce((n,s)=>n+hours(s),0);
  const rateFor=typeof rate==='function'?rate:(()=>Number(rate||0));
  const rateValues=[...new Set(list.map(s=>Number(rateFor(s)||0)))];
  const rowRate=rateValues.length===1?rateValues[0]:(rateValues.length?'Theo trường':'');
  const actualPay=list.reduce((n,s)=>n+Math.round(hours(s)*Number(rateFor(s)||0)),0);
  const schoolLabel=[...new Set(list.map(s=>s.school_name||school).filter(Boolean))].join(' / ');
  out.push({date,weekday:dayNames[d.getDay()],morning:uniq(list.filter(s=>s.start_time<'12:00')),afternoon:uniq(list.filter(s=>s.start_time>='12:00')),
    periods:list.reduce((n,s)=>n+Number(s.period_count||0),0),hours:realHours,rate:rowRate,pay:actualPay,school:schoolLabel||'',lessons:list.length});
 }
 return out;
};
export const teacherTotals=rows=>rows.reduce((a,r)=>({periods:a.periods+r.periods,hours:a.hours+r.hours,pay:a.pay+r.pay,lessons:a.lessons+r.lessons,days:a.days+(r.lessons>0?1:0)}),{periods:0,hours:0,pay:0,lessons:0,days:0});
function save(buffer,name){
 const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
}
const fName=s=>String(s||'IC3').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]+/gi,'_').slice(0,60);
function heading(ws,wb,logo,school,teacher,month,privatePay,cols){
 ws.mergeCells(1,3,2,cols);ws.mergeCells(3,3,3,cols);ws.mergeCells(4,3,4,cols);
 [['C1',String(school).toUpperCase(),16],['C3','BẢNG KÊ TIẾT DẠY THÁNG '+month,14],['C4','Môn: Tin học quốc tế IC3 GS6 · Năm học '+schoolYear(month.slice(3,7)+'-'+month.slice(0,2)+'-01'),10]].forEach(([ref,v,size])=>{const cell=ws.getCell(ref);cell.value=v;cell.font={name:'Arial',bold:true,size,color:{argb:'FF'+palette.navy}};cell.alignment={horizontal:'center',vertical:'middle'};});
 ws.getRow(1).height=30;ws.getRow(3).height=29;ws.getRow(4).height=23;
 ws.getCell('A6').value='Giáo viên:';ws.getCell('B6').value=teacher;ws.getCell('E6').value='Kỳ báo cáo:';ws.getCell('F6').value=month;
 for(const key of ['A6','E6'])ws.getCell(key).font={bold:true,color:{argb:'FF'+palette.blue}};
 if(logo?.startsWith('data:image/png;base64,')){try{const id=wb.addImage({base64:logo,extension:'png'});ws.addImage(id,{tl:{col:0,row:0},ext:{width:120,height:72}});}catch(e){}}
 ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.25,right:.25,top:.35,bottom:.4,header:.1,footer:.1}};
 ws.headerFooter.oddFooter='IC3 GS6 · Trang &P / &N';
}
function tableHeader(ws,row,names){
 ws.getRow(row).height=39;names.forEach((v,i)=>{const c=ws.getCell(row,i+1);c.value=v;c.font={bold:true,size:10,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+palette.blue}};c.alignment={horizontal:'center',vertical:'middle',wrapText:true};});
}
function tableRow(ws,row,values,isWeekend){
 ws.getRow(row).height=25;values.forEach((v,i)=>{const c=ws.getCell(row,i+1);c.value=v??'';c.font={name:'Arial',size:10,color:{argb:'FF'+palette.navy}};c.alignment={vertical:'middle',wrapText:true};c.border={bottom:{style:'hair',color:{argb:'FFD2E0E5'}}};if(isWeekend||row%2)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+palette.gray}};});
}
function buildSheet(wb,p){
 const privatePay=p.privatePay,ws=wb.addWorksheet(privatePay?'Bảng kê giáo viên':'Bảng kê trung tâm',{views:[{state:'frozen',ySplit:9}]});
 const widths=privatePay?[16,13,24,24,12,16,18,21]:[16,13,26,26,12,25,24];
 widths.forEach((v,i)=>ws.getColumn(i+1).width=v);
 heading(ws,wb,p.logo,p.school,p.teacher,p.month,privatePay,widths.length);
 const headers=privatePay?['NGÀY','THỨ','LỚP SÁNG','LỚP CHIỀU','SỐ TIẾT','GIỜ THỰC DẠY','LƯƠNG/GIỜ','THÀNH TIỀN']:
 ['NGÀY','THỨ','LỚP SÁNG','LỚP CHIỀU','SỐ TIẾT','TRƯỜNG','GHI CHÚ'];
 tableHeader(ws,9,headers);
 p.rows.forEach((r,i)=>{const row=i+10,vals=privatePay?[vnDate(r.date),r.weekday,r.morning,r.afternoon,r.periods||'',r.lessons?Number(r.hours.toFixed(2)):'',r.lessons?r.rate:'',r.lessons?r.pay:'']:
 [vnDate(r.date),r.weekday,r.morning,r.afternoon,r.periods||'',r.lessons?r.school:'',''];
 tableRow(ws,row,vals,['Bảy','Chủ nhật'].includes(r.weekday));if(privatePay){if(typeof p.rows[i].rate==='number')ws.getCell(row,7).numFmt='#,##0 "đ"';ws.getCell(row,8).numFmt='#,##0 "đ"';ws.getCell(row,6).numFmt='0.00';}});
 const total=teacherTotals(p.rows),last=p.rows.length+10;
 tableRow(ws,last,privatePay?['TỔNG','','','',total.periods,Number(total.hours.toFixed(2)),'',total.pay]:['TỔNG','','','',total.periods,'',''],false);
 for(let i=1;i<=headers.length;i++){const c=ws.getCell(last,i);c.font={bold:true,color:{argb:'FF'+palette.blue}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+palette.light}};}
 if(privatePay){ws.getCell(last,8).numFmt='#,##0 "đ"';ws.getCell(last,6).numFmt='0.00';}
 ws.getCell(last+2,1).value='Tổng số ngày có dạy: '+total.days+' · Số lượt lớp: '+total.lessons+' · Tổng tiết: '+total.periods+(privatePay?' · Tổng giờ: '+total.hours.toFixed(2):'');
 ws.getCell(last+4,5).value='NGƯỜI LẬP BẢNG';ws.getCell(last+5,5).value='(Ký, ghi rõ họ tên)';ws.getCell(last+8,5).value=p.teacher;
 ws.getCell(last+8,5).font={bold:true,color:{argb:'FF'+palette.navy}};
}
export async function exportMonthlyExcel(p){
 const Excel=await getExcelJS(),wb=new Excel.Workbook();wb.creator='IC3 GS6';
 const month=p.from.slice(5,7)+'/'+p.from.slice(0,4);buildSheet(wb,{...p,month});
 if(p.privatePay){
  const ws=wb.addWorksheet('Chi tiết từng buổi',{views:[{state:'frozen',ySplit:6}]});
  [16,18,16,16,12,12,17,19].forEach((n,i)=>ws.getColumn(i+1).width=n);
  ws.mergeCells('A1:H2');ws.getCell('A1').value='CHI TIẾT TIẾT DẠY VÀ TIỀN CÔNG';
  ws.getCell('A1').font={bold:true,size:17,color:{argb:'FF'+palette.navy}};
  ws.getCell('A4').value='Giáo viên: '+p.teacher;ws.getCell('D4').value='Trường: '+p.school;
  tableHeader(ws,6,['NGÀY','LỚP','GIỜ VÀO','GIỜ RA','SỐ TIẾT','GIỜ DẠY','LƯƠNG/GIỜ','THÀNH TIỀN']);
  [...p.sessions].sort((a,b)=>a.session_date.localeCompare(b.session_date)||a.start_time.localeCompare(b.start_time)).forEach((s,i)=>{
    const r=i+7,actualHours=hours(s);tableRow(ws,r,[vnDate(s.session_date),s.class_name,s.start_time.slice(0,5),s.end_time.slice(0,5),Number(s.period_count),Number(actualHours.toFixed(2)),Number(p.ratesBySchool?.[s.school_id]??p.rate??0),Math.round(actualHours*Number(p.ratesBySchool?.[s.school_id]??p.rate??0))],i%2===1);
    ws.getCell(r,7).numFmt='#,##0 "đ"';ws.getCell(r,8).numFmt='#,##0 "đ"';
  });
 }
 save(await wb.xlsx.writeBuffer(),(p.privatePay?'Luong_giao_vien_':'Bao_cao_trung_tam_')+fName(p.teacher)+'_'+p.from.slice(0,7)+'.xlsx');
}
export async function exportGeneralXlsx({title,school,logo,headers,rows,teacher}){
 const Excel=await getExcelJS(),wb=new Excel.Workbook(),ws=wb.addWorksheet('Báo cáo');
 wb.creator='IC3 GS6';headers.forEach((h,i)=>ws.getColumn(i+1).width=Math.min(36,Math.max(14,h.length+12)));
 const end=Math.max(headers.length,5);ws.mergeCells(1,2,2,end);ws.getCell('B1').value=String(school).toUpperCase();
 ws.mergeCells(3,2,3,end);ws.getCell('B3').value=title.toUpperCase();
 for(const a of ['B1','B3']){ws.getCell(a).font={bold:true,size:15,color:{argb:'FF'+palette.navy}};ws.getCell(a).alignment={horizontal:'center'};}
 if(logo?.startsWith('data:image/png;base64,')){try{const id=wb.addImage({base64:logo,extension:'png'});ws.addImage(id,{tl:{col:0,row:0},ext:{width:110,height:65}});}catch(e){}}
 tableHeader(ws,6,headers);
 const gradeIndex=headers.findIndex(h=>h.toLowerCase().includes('xếp loại'));
 rows.forEach((r,i)=>{
  const row=i+7;tableRow(ws,row,r,i%2===1);
  if(gradeIndex>=0){
   const grade=String(r[gradeIndex]||'').trim().toUpperCase(),cell=ws.getCell(row,gradeIndex+1);
   if(['A','B','C'].includes(grade)){
     cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:grade==='A'?'FFDFF2E8':grade==='B'?'FFFFF2D6':'FFFFDFCB'}};
     cell.font={bold:true,color:{argb:grade==='A'?'FF1B7D54':grade==='B'?'FF986D1B':'FFB04625'}};
     cell.alignment={horizontal:'center',vertical:'middle'};
   }
  }
 });
 const signRow=rows.length+10;
 ws.getCell(signRow,1).value='Ngày xuất: '+new Date().toLocaleDateString('vi-VN');
 ws.getCell(signRow,Math.max(3,headers.length-2)).value='NGƯỜI LẬP BẢNG';
 ws.getCell(signRow+1,Math.max(3,headers.length-2)).value='(Ký, ghi rõ họ tên)';
 ws.getCell(signRow+4,Math.max(3,headers.length-2)).value=teacher||'';
 ws.getCell(signRow+4,Math.max(3,headers.length-2)).font={bold:true,color:{argb:'FF'+palette.navy}};
 ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
 save(await wb.xlsx.writeBuffer(),fName(title)+'.xlsx');
}
function printHtml({title,subtitle,school,teacher,logo,headers,rows,total,summary,privatePay=false}){
 const logoPart=logo?.startsWith('data:image/png;base64,')?'<img src="'+logo+'"/>':'<span class="brand">IC3</span>';
 const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>'+escape(title)+'</title><style>'+
 '@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:"Times New Roman",serif;color:#173245;padding:12px;margin:0}header{display:grid;grid-template-columns:100px 1fr;align-items:center;padding-bottom:12px;border-bottom:2px solid #21567A}header img{max-width:86px;max-height:70px}header .brand{display:block;background:#0b877a;color:white;padding:20px 14px;font:bold 23px Arial;border-radius:9px}header h3{text-align:center;font-size:13px;margin:0 0 6px}header h1{text-align:center;font-size:20px;margin:4px 0;color:#204f70}header p{text-align:center;margin:3px;font-size:12px}.meta{display:flex;justify-content:space-between;margin:12px 0;font-size:12px}table{border-collapse:collapse;width:100%;table-layout:fixed}th{background:#21567A;color:#fff;border:1px solid #21567A;padding:9px 4px;font-size:11px}td{border:1px solid #c4d0d7;padding:6px 5px;font-size:11px;word-wrap:break-word}.alt{background:#f4f8fa}.total{background:#e8f4f5;font-weight:bold}.summary{background:#e8f4f5;border-left:4px solid #0d877d;padding:10px;margin-top:13px;font-size:12px;font-weight:bold}.sign{margin:30px 0 0 auto;width:260px;text-align:center;font-size:12px}.sign b{display:block}.sign i{display:block;margin-top:8px}.sign strong{display:block;margin-top:45px}.footer{text-align:center;font-size:9px;color:#72828d;margin-top:25px}.print{padding:8px;text-align:right}.print button{border:0;border-radius:5px;background:#0d877d;color:#fff;padding:10px 16px;cursor:pointer}@media print{body{padding:0}.print{display:none}thead{display:table-header-group}tr{page-break-inside:avoid}}'+
 '</style></head><body><div class="print"><button onclick="window.print()">In / Lưu PDF</button></div><header>'+logoPart+'<div><h3>TRƯỜNG: '+escape(school)+'</h3><h1>'+escape(title)+'</h1><p>'+escape(subtitle)+'</p></div></header><div class="meta"><span>Giáo viên: <b>'+escape(teacher)+'</b></span><span>Môn học: Tin học quốc tế IC3 GS6</span><span>'+escape(privatePay?'Bản riêng cho giáo viên':'Bản nộp trung tâm / trường')+'</span></div>'+
 '<table><thead><tr>'+headers.map(h=>'<th>'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map((a,i)=>'<tr class="'+(i%2?'alt':'')+'">'+a.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>').join('')+
 (total?'<tr class="total">'+total.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>':'')+
 '</tbody></table><div class="summary">'+escape(summary)+'</div><div class="sign"><div>Ngày '+new Date().toLocaleDateString('vi-VN')+'</div><b>NGƯỜI LẬP BẢNG</b><i>(Ký, ghi rõ họ tên)</i><strong>'+escape(teacher)+'</strong></div><div class="footer">IC3 GS6 · Báo cáo chính thức được xuất từ hệ thống quản lý</div></body></html>';
 const w=window.open('','_blank');if(!w)throw new Error('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up.');
 w.document.open();w.document.write(html);w.document.close();
}
export function printMonthlyPdf(p){
 const t=teacherTotals(p.rows),month=p.from.slice(5,7)+'/'+p.from.slice(0,4);
 const headers=p.privatePay?['Ngày','Thứ','Lớp sáng','Lớp chiều','Số tiết','Giờ dạy','Lương/giờ','Thành tiền']:['Ngày','Thứ','Lớp sáng','Lớp chiều','Số tiết','Trường','Ghi chú'];
 const rows=p.rows.map(r=>p.privatePay?[vnDate(r.date),r.weekday,r.morning,r.afternoon,r.periods||'',r.lessons?r.hours.toFixed(2):'',r.lessons?(typeof r.rate==='number'?amount(r.rate):r.rate):'',r.lessons?amount(r.pay):'']:
  [vnDate(r.date),r.weekday,r.morning,r.afternoon,r.periods||'',r.lessons?r.school:'','']);
 const total=p.privatePay?['TỔNG','','','',t.periods,t.hours.toFixed(2),'',amount(t.pay)]:['TỔNG','','','',t.periods,'',''];
 printHtml({title:'BẢNG KÊ TIẾT DẠY THÁNG '+month,subtitle:'Năm học '+schoolYear(p.from),school:p.school,teacher:p.teacher,logo:p.logo,headers,rows,total,privatePay:p.privatePay,
 summary:'Tổng '+t.days+' ngày dạy · '+t.lessons+' lượt lớp · '+t.periods+' tiết'+(p.privatePay?' · '+t.hours.toFixed(2)+' giờ · Tiền công: '+amount(t.pay):'')});
}
export function printGeneralPdf(p){printHtml({...p,total:null,summary:'Tổng số dòng: '+p.rows.length,privatePay:false});}
