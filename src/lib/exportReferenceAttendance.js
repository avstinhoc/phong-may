import {getExcelJS} from './exportPretty';
import {REFERENCE_SCORE_KEYS,partitionAttendanceSessions,referenceAttendanceStatus,
 referenceAttendanceColumnForSession,referenceColumnMap} from './attendanceReferenceLayout';

const C={navy:'143D50',teal:'109188',lightBlue:'CFE2F3',blue:'39748A',orange:'E69138',
 paleOrange:'FFF2DB',white:'FFFFFF',off:'F5F8FA',ink:'213D4D',line:'D7E2E5',gray:'F2F2F2'};
const colLabel=index=>{let n=index,out='';while(n){n--;out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26);}return out;};
const vnDate=value=>value?String(value).slice(0,10).split('-').reverse().join('/'):'';
function fill(cell,rgb){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+rgb}};}
function style(cell,{bg=C.white,color=C.ink,bold=false,size=10,align='center',wrap=true,border=true}={}){
 fill(cell,bg);cell.font={name:'Times New Roman',size,bold,color:{argb:'FF'+color}};
 cell.alignment={horizontal:align,vertical:'middle',wrapText:wrap};
 if(border)cell.border={bottom:{style:'hair',color:{argb:'FF'+C.line}},right:{style:'hair',color:{argb:'FF'+C.line}}};
}
const dateValue=s=>new Date(String(s||'')+'T12:00:00+07:00');
function createSheet(wb,params,sessions,firstIndex,chunkIndex){
 const {school,className,teacher,students,marks,results,logo,centerName}=params;
 const wbName=('Lớp '+className+(chunkIndex?' B'+(firstIndex+1):'')).replace(/[\\/*?:\[\]]/g,'_').slice(0,31);
 const ws=wb.addWorksheet(wbName,{views:[{state:'frozen',xSplit:9,ySplit:7}]});
 ws.properties.defaultRowHeight=22;
 ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,
   margins:{left:.25,right:.25,top:.3,bottom:.3,header:.2,footer:.2}};
 ws.headerFooter.oddFooter='IC3 GS6 · &P / &N';
 const M=referenceColumnMap();
 ws.getColumn(1).width=10;ws.getColumn(2).width=6;ws.getColumn(3).width=32;
 ws.getColumn(4).width=14;ws.getColumn(5).width=16;ws.getColumn(6).width=13;
 ws.getColumn(7).width=13;ws.getColumn(8).width=12;ws.getColumn(9).width=13;
 for(let col=10;col<=79;col++)ws.getColumn(col).width=11;
 for(let col=80;col<=95;col++)ws.getColumn(col).width=12;
 ws.getColumn(96).width=38;ws.getColumn(97).width=14;ws.getColumn(98).width=13;
 for(let col=99;col<=103;col++)ws.getColumn(col).width=14;
 ws.getRow(1).height=51;ws.getRow(2).height=29;ws.getRow(3).height=27;
 ws.getRow(4).height=24;ws.getRow(5).height=44;ws.getRow(6).height=25;ws.getRow(7).height=28;

 // Source 8A6 layout: wide title in row 1; school/class/teacher information in rows 2–3.
 ws.mergeCells(1,16,1,79);const title=ws.getCell(1,16);
 title.value='TRƯỜNG: '+String(school||'').toUpperCase()+'   ·   DANH SÁCH ĐIỂM DANH';
 style(title,{bg:C.navy,color:C.white,bold:true,size:18,border:false});
 for(let c=16;c<=79;c++)fill(ws.getCell(1,c),C.navy);
 ws.mergeCells('A1:I3');
 const brand=ws.getCell('A1');brand.value=logo?null:String(centerName||'IC3 GS6').toUpperCase();
 style(brand,{bg:C.white,color:C.teal,bold:true,size:17,border:false});
 if(logo?.startsWith('data:image/png;base64,')){
  try{
   const imageId=wb.addImage({base64:logo,extension:'png'});
   ws.addImage(imageId,{tl:{col:.25,row:.18},ext:{width:135,height:82}});
  }catch(e){brand.value=String(centerName||'IC3 GS6').toUpperCase();}
 }
 // A1:I3 remains dedicated to the brand image; do not write metadata into merged cells.
 ws.getCell('J2').value='Trường: '+String(school||'');
 ws.getCell('P2').value='Lớp: '+String(className||'');
 ws.getCell('X2').value='Giáo viên: '+String(teacher||'');
 ws.getCell('J3').value='Bắt đầu: '+vnDate(sessions[0]?.session_date);
 ws.getCell('N3').value='Kết thúc: '+vnDate(sessions.at(-1)?.session_date);
 ws.getCell('AH2').value='Số tiết: '+sessions.reduce((v,l)=>v+Number(l.period_count||0),0);
 for(const address of ['J2','P2','X2','J3','N3','AH2'])ws.getCell(address).font={name:'Times New Roman',size:11,bold:true,color:{argb:'FF'+C.ink}};
 ws.mergeCells(4,10,4,79);ws.getCell(4,10).value='GIỮ NGUYÊN CẤU TRÚC DANH SÁCH · Ô MÀU CAM LÀ SỐ TIẾT · Ô VẮNG/CÓ PHÉP ĐƯỢC TÔ MÀU';
 style(ws.getCell(4,10),{bg:C.gray,color:C.navy,bold:true,size:10,border:false});
 const fixed=['MÃ HS','STT','HỌ & TÊN','NGÀY SINH','SỐ ĐIỆN THOẠI','SỐ CMND',
    'MÃ DDDT','GIỚI TÍNH','XẾP LOẠI'];
 fixed.forEach((name,index)=>{const c=ws.getCell(5,index+1);c.value=name;style(c,{bg:C.gray,bold:true,size:10});});
 for(let i=0;i<70;i++){
  const c=ws.getCell(5,referenceAttendanceColumnForSession(i));
  c.value='B'+(firstIndex+i+1);style(c,{bg:C.gray,bold:true,size:10});
 }
 ws.mergeCells(5,80,5,95);ws.getCell(5,80).value='ĐIỂM KIỂM TRA & ĐÁNH GIÁ HỌC SINH';
 style(ws.getCell(5,80),{bg:C.lightBlue,color:C.navy,bold:true,size:12});
 ws.mergeCells(5,96,5,103);ws.getCell(5,96).value='NHẬN XÉT & THỐNG KÊ CHUYÊN CẦN';
 style(ws.getCell(5,96),{bg:C.lightBlue,color:C.navy,bold:true,size:11});
 const scoresAndSummary=[...REFERENCE_SCORE_KEYS,'GHI CHÚ / NHẬN XÉT','ĐẠT CHUẨN',
  'KQ THI','TỔNG BH','SỐ BH','SỐ BV','TL VẮNG','PĐ VẮNG'];
 scoresAndSummary.forEach((name,index)=>{
  const col=80+index,c=ws.getCell(7,col);c.value=name;
  style(c,{bg:C.lightBlue,color:C.ink,bold:true,size:10});
 });
 for(let i=0;i<70;i++){
  const col=referenceAttendanceColumnForSession(i),item=sessions[i];
  const periods=ws.getCell(6,col),date=ws.getCell(7,col);
  periods.value=item?Number(item.period_count||1):null;
  date.value=item?vnDate(item.session_date).slice(0,5):null;
  style(periods,{bg:item?C.orange:C.paleOrange,color:item?C.white:C.ink,bold:true});
  style(date,{bg:C.lightBlue,color:C.ink,bold:!!item});
 }
 const resultById=new Map((results||[]).map(x=>[x.student_id,x]));
 const marksByKey=new Map((marks||[]).map(x=>[x.student_id+':'+x.session_id,x]));
 const learners=(students||[]).slice();
 for(let i=0;i<learners.length;i++){
  const student=learners[i],result=resultById.get(student.id)||{};
  const row=8+i,alt=i%2===1,bg=alt?C.off:C.white;
  ws.getRow(row).height=25;
  const entries=[student.student_code||String(i+1).padStart(2,'0'),i+1,student.full_name,
   vnDate(student.date_of_birth),student.phone||'', '', '',result.gender||student.gender||'',
   result.classification||''];
  for(let k=0;k<entries.length;k++){
   const c=ws.getCell(row,k+1);c.value=entries[k];
   style(c,{bg:k<=1?C.lightBlue:bg,align:k===2?'left':'center',size:11});
  }
  for(let n=0;n<70;n++){
   const c=ws.getCell(row,referenceAttendanceColumnForSession(n));
   const session=sessions[n],mark=session?marksByKey.get(student.id+':'+session.id):null;
   const label=referenceAttendanceStatus(mark?.status);
   c.value=label||null;
   style(c,{bg:label=== 'VẮNG'||label==='CÓ PHÉP'?C.paleOrange:bg,
     color:label?C.navy:C.ink,bold:!!label,size:9});
  }
  const values=[...REFERENCE_SCORE_KEYS.map(k=>result.scores?.[k]??''),
   result.comment||'',result.standard_met?'Đạt':'',result.exam_result||''];
  values.forEach((value,j)=>{
   const c=ws.getCell(row,80+j);c.value=value;
   style(c,{bg,align:j===16?'left':'center',size:10});
  });
  ws.getCell(row,M.total).value=sessions.length;
  const first='J'+row,last=colLabel(79)+row;
  const absent='COUNTIF('+first+':'+last+',"VẮNG")+COUNTIF('+first+':'+last+',"CÓ PHÉP")';
  ws.getCell(row,M.absent).value={formula:absent};
  ws.getCell(row,M.present).value={formula:colLabel(M.total)+row+'-'+colLabel(M.absent)+row};
  ws.getCell(row,M.absentRate).value={formula:'IF('+colLabel(M.total)+row+'=0,0,'+colLabel(M.absent)+row+'/'+colLabel(M.total)+row+')'};
  ws.getCell(row,M.absentRate).numFmt='0.0%';
  ws.getCell(row,M.excused).value={formula:'COUNTIF('+first+':'+last+',"CÓ PHÉP")'};
  for(let col=M.total;col<=M.excused;col++)style(ws.getCell(row,col),{bg:col===M.absentRate?C.lightBlue:bg,bold:true});
 }
 const foot=8+learners.length+2;
 ws.mergeCells(foot,1,foot,33);
 ws.getCell(foot,1).value='Quy ước: ô trống = có mặt, VẮNG = vắng, CÓ PHÉP = vắng có phép, TRỄ = đến muộn. Mỗi cột B tương ứng một buổi học có ngày và số tiết.';
 ws.getCell(foot,1).font={name:'Times New Roman',size:10,italic:true,color:{argb:'FF'+C.blue}};
 ws.autoFilter={from:{row:7,column:1},to:{row:7,column:103}};
 ws.printTitlesRow='1:7';
 ws.pageSetup.printArea='A1:'+colLabel(103)+(Math.max(foot,8));
 return ws;
}
export async function exportAttendanceReference(params){
 const Excel=await getExcelJS(),wb=new Excel.Workbook();
 wb.creator='IC3 GS6 Computer Lab';wb.created=new Date();
 const sessions=partitionAttendanceSessions((params.sessions||[]).filter(x=>!x.is_cancelled));
 let offset=0;
 for(let i=0;i<sessions.length;i++){
  createSheet(wb,params,sessions[i],offset,i);
  offset+=sessions[i].length;
 }
 const buffer=await wb.xlsx.writeBuffer();
 const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='Diem_danh_'+String(params.className||'Lop').replace(/[^a-zA-Z0-9.\-]/g,'_')+'.xlsx';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
