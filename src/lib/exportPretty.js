// Branded XLSX export. ExcelJS is loaded only when a teacher exports a workbook.
let excelLibPromise;
export async function getExcelJS(){
 if(window.ExcelJS)return window.ExcelJS;
 if(!excelLibPromise)excelLibPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
  script.async=true;
  script.onload=()=>window.ExcelJS?resolve(window.ExcelJS):reject(new Error('Không tải được trình tạo Excel'));
  script.onerror=()=>{
    const mirror=document.createElement('script');
    mirror.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    mirror.async=true;
    mirror.onload=()=>window.ExcelJS?resolve(window.ExcelJS):reject(new Error('Không tải được thư viện Excel'));
    mirror.onerror=()=>reject(new Error('Không tải được thư viện xuất Excel. Kiểm tra kết nối mạng.'));
    document.head.appendChild(mirror);
  };
  document.head.appendChild(script);
 });
 return excelLibPromise;
}
const C={navy:'143D50',teal:'0F9188',blue:'39748A',light:'DFEFF4',white:'FFFFFF',line:'D9E6EB',pale:'F4F8FA',orange:'FFDFCB',green:'DFF2E8',muted:'6B8693',ink:'243746'};
const date=s=>s?s.split('-').reverse().join('/'):'';
const formulaCol=i=>{let n=i,s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
function title(ws,school,sub,end,teacher,className,logo,book){
 const last=Math.max(end,18);
 ws.mergeCells(1,3,2,last);ws.getCell(1,3).value='TRƯỜNG: '+school.toUpperCase();
 ws.mergeCells(3,3,3,last);ws.getCell(3,3).value=sub;
 for(let r=1;r<=2;r++)for(let c=3;c<=last;c++){const z=ws.getCell(r,c);z.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.navy}};}
 ws.getCell(1,3).font={name:'Arial',size:17,bold:true,color:{argb:'FFFFFFFF'}};
 ws.getCell(1,3).alignment={horizontal:'center',vertical:'middle'};
 ws.getCell(3,3).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.teal}};
 ws.getCell(3,3).font={name:'Arial',size:12,bold:true,color:{argb:'FFFFFFFF'}};
 ws.getCell(3,3).alignment={horizontal:'center',vertical:'middle'};
 ws.getRow(1).height=30;ws.getRow(2).height=23;ws.getRow(3).height=29;
 ws.getCell('A5').value='LỚP';ws.getCell('B5').value=className;ws.getCell('E5').value='GIÁO VIÊN';ws.getCell('F5').value=teacher;
 for(const a of ['A5','E5']){ws.getCell(a).font={bold:true,color:{argb:'FF'+C.blue}};}
 if(logo?.startsWith('data:image/png;base64,')){
  try{const id=book.addImage({base64:logo,extension:'png'});ws.addImage(id,{tl:{col:0,row:0},ext:{width:130,height:75}});}catch(e){console.warn('Logo Excel không hợp lệ',e);}
 }
 ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:0.25,right:0.25,top:0.4,bottom:0.4,header:0.2,footer:0.2}};
 ws.headerFooter.oddFooter='IC3 GS6 - &P / &N';
}
function styleHeader(ws,row,headers){
 ws.getRow(row).values=headers;ws.getRow(row).height=36;
 ws.getRow(row).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'},size:9};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.blue}};
 c.alignment={horizontal:'center',vertical:'middle',wrapText:true};c.border={bottom:{style:'thin',color:{argb:'FF'+C.line}}};});
}
function styleData(ws,row,cols,alt=false){
 ws.getRow(row).height=24;
 for(let c=1;c<=cols;c++){const z=ws.getCell(row,c);z.font={size:10,name:'Arial',color:{argb:'FF'+C.ink}};
 z.alignment={vertical:'middle',wrapText:true};z.border={bottom:{style:'hair',color:{argb:'FF'+C.line}}};
 if(alt&&!z.fill?.fgColor)z.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.pale}};}
}
function saveFile(buffer,name){
 const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
}
export async function downloadPrettyRoster({school,className,teacher,students,sessions,marks,results,assignments,computers,scoreKeys,logo}){
 const Excel=await getExcelJS(),wb=new Excel.Workbook();
 wb.creator='IC3 GS6 Computer Lab';wb.created=new Date();
 const summary=wb.addWorksheet('Tổng kết',{views:[{state:'frozen',ySplit:7}]});
 const att=wb.addWorksheet('Điểm danh',{views:[{state:'frozen',xSplit:5,ySplit:9}]});
 const grade=wb.addWorksheet('Kết quả học tập',{views:[{state:'frozen',xSplit:3,ySplit:7}]});
 const people=students||[],sessionsList=sessions||[],resultsList=results||[];
 const absent=m=>['absent','excused'].includes(m?.status);
 const findMark=(s,l)=>(marks||[]).find(m=>m.student_id===s.id&&m.session_id===l?.id);
 const byPC=s=>(assignments||[]).filter(a=>a.active&&a.student_id===s.id).map(a=>(computers||[]).find(p=>p.id===a.computer_id)?.computer_code).filter(Boolean).join(', ');
 const metrics=[['SĨ SỐ',people.length],['SỐ BUỔI',sessionsList.length],['SỐ TIẾT',sessionsList.reduce((v,s)=>v+Number(s.period_count||0),0)],['LƯỢT VẮNG',people.reduce((v,p)=>v+sessionsList.filter(l=>absent(findMark(p,l))).length,0)]];
 summary.columns=[{width:13},{width:16},{width:29},{width:17},{width:20},{width:17},{width:17},{width:17}];
 title(summary,school,'TỔNG KẾT LỚP IC3 GS6',18,teacher,className,logo,wb);
 metrics.forEach(([key,val],i)=>{const c=1+i*2;const label=summary.getCell(7,c);label.value=key;label.font={bold:true,color:{argb:'FF'+C.blue}};
 const num=summary.getCell(8,c);num.value=val;num.font={bold:true,size:23,color:{argb:'FF'+C.teal}};num.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.green}};});
 summary.getRow(8).height=37;
 styleHeader(summary,11,['STT','MÃ HS','HỌ VÀ TÊN','SỐ BUỔI','CÓ MẶT','VẮNG','TL VẮNG']);
 people.forEach((s,i)=>{const r=12+i,n=sessionsList.filter(l=>absent(findMark(s,l))).length;
 summary.getRow(r).values=[i+1,s.student_code||'',s.full_name,sessionsList.length,sessionsList.length-n,n,sessionsList.length?n/sessionsList.length:0];
 summary.getCell(r,7).numFmt='0%';styleData(summary,r,7,i%2===1);});
 const n=Math.max(1,sessionsList.length),scol=6+n;
 att.getColumn(1).width=13;att.getColumn(2).width=7;att.getColumn(3).width=29;att.getColumn(4).width=13;att.getColumn(5).width=12;
 for(let j=0;j<n;j++)att.getColumn(6+j).width=14;
 for(let j=0;j<4;j++)att.getColumn(scol+j).width=15;
 title(att,school,'DANH SÁCH ĐIỂM DANH THEO BUỔI',Math.max(scol+3,18),teacher,className,logo,wb);
 att.mergeCells(6,1,6,5);att.getCell(6,1).value='THÔNG TIN HỌC SINH';
 att.mergeCells(6,6,6,5+n);att.getCell(6,6).value='ĐIỂM DANH B1–B'+sessionsList.length;
 att.mergeCells(6,scol,6,scol+3);att.getCell(6,scol).value='TỔNG KẾT CHUYÊN CẦN';
 for(const a of [att.getCell(6,1),att.getCell(6,6),att.getCell(6,scol)]){a.font={bold:true,color:{argb:'FF'+C.navy}};a.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.light}};a.alignment={horizontal:'center'};}
 const headers=['MÃ HS','STT','HỌ VÀ TÊN','GIỚI TÍNH','MÁY',...Array.from({length:n},(_,i)=>'B'+(i+1)),'TỔNG BUỔI','CÓ MẶT','VẮNG','TL VẮNG'];
 styleHeader(att,7,headers);
 for(let j=0;j<n;j++){att.getCell(8,6+j).value=sessionsList[j]?.period_count||'';att.getCell(9,6+j).value=date(sessionsList[j]?.session_date);for(const r of [8,9]){const c=att.getCell(r,6+j);c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.light}};c.alignment={horizontal:'center'};c.font={bold:true,size:9};}}
 people.forEach((s,i)=>{
  const r=10+i,rs=resultsList.find(p=>p.student_id===s.id)||{};
  [s.student_code||String(i+1).padStart(2,'0'),i+1,s.full_name,rs.gender||'',byPC(s)].forEach((v,j)=>att.getCell(r,j+1).value=v);
  sessionsList.forEach((l,j)=>{const status=findMark(s,l)?.status;
   const z=att.getCell(r,6+j);z.value=status==='absent'?'VẮNG':status==='excused'?'CÓ PHÉP':status==='late'?'TRỄ':'';
   if(absent(findMark(s,l))){z.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.orange}};z.font={bold:true,color:{argb:'FFAA572F'}};}z.alignment={horizontal:'center'};});
  att.getCell(r,scol).value=sessionsList.length;
  const span=formulaCol(6)+r+':'+formulaCol(5+n)+r;
  att.getCell(r,scol+2).value={formula:'COUNTIF('+span+',"VẮNG")+COUNTIF('+span+',"CÓ PHÉP")'};
  att.getCell(r,scol+1).value={formula:formulaCol(scol)+r+'-'+formulaCol(scol+2)+r};
  att.getCell(r,scol+3).value={formula:'IF('+formulaCol(scol)+r+'=0,0,'+formulaCol(scol+2)+r+'/'+formulaCol(scol)+r+')'};
  att.getCell(r,scol+3).numFmt='0%';styleData(att,r,scol+3,i%2===1);
 });
 att.getCell(people.length+11,1).value='Quy ước: Ô trống = Có mặt; ô cam = Vắng/Có phép. Dòng 8 là số tiết, dòng 9 là ngày học.';
 att.getCell(people.length+11,1).font={italic:true,size:9,color:{argb:'FF'+C.muted}};
 const keys=scoreKeys||[];const gradeHeaders=['STT','MÃ HS','HỌ VÀ TÊN','GIỚI TÍNH',...keys,'XẾP LOẠI','ĐẠT CHUẨN','KQ THI','NHẬN XÉT'];
 grade.getColumn(1).width=8;grade.getColumn(2).width=13;grade.getColumn(3).width=30;grade.getColumn(4).width=13;
 gradeHeaders.slice(4).forEach((_,i)=>grade.getColumn(i+5).width=i===gradeHeaders.length-5?33:14);
 title(grade,school,'KẾT QUẢ ĐÁNH GIÁ HỌC SINH · IC3 GS6',Math.max(gradeHeaders.length,18),teacher,className,logo,wb);
 styleHeader(grade,7,gradeHeaders);
 people.forEach((s,i)=>{const z=resultsList.find(p=>p.student_id===s.id)||{};const vals=[i+1,s.student_code||'',s.full_name,z.gender||'',...keys.map(k=>z.scores?.[k]??''),z.classification||'',z.standard_met?'Đạt':'',z.exam_result||'',z.comment||''];
 vals.forEach((v,j)=>grade.getCell(i+8,j+1).value=v);styleData(grade,i+8,vals.length,i%2===1);});
 for(const sheet of [summary,att,grade])sheet.properties.defaultRowHeight=21;
 const buffer=await wb.xlsx.writeBuffer();saveFile(buffer,'Bao_cao_IC3_'+(className||'lop').replace(/[^a-zA-Z0-9_-]/g,'_')+'.xlsx');
}
