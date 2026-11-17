export const REFERENCE_SESSIONS_PER_SHEET=70;
export const REFERENCE_SCORE_KEYS=['QT1','QT2','HK1','QT3','QT4','HK2',
 ...Array.from({length:5},(_,i)=>'TEST '+(i+1)),
 ...Array.from({length:5},(_,i)=>'Mô phỏng lần '+(i+1))];
export function partitionAttendanceSessions(rows=[],size=REFERENCE_SESSIONS_PER_SHEET){
 if(!Number.isInteger(size)||size<1)throw Error('Số buổi trên mỗi sheet không hợp lệ');
 const sorted=(rows||[]).slice().sort((a,b)=>String(a.session_date||'').localeCompare(String(b.session_date||''))||
   String(a.start_time||'').localeCompare(String(b.start_time||''))||String(a.id||'').localeCompare(String(b.id||'')));
 if(!sorted.length)return [[]];
 const chunks=[];for(let i=0;i<sorted.length;i+=size)chunks.push(sorted.slice(i,i+size));
 return chunks;
}
export function referenceAttendanceColumnForSession(index){
 if(!Number.isInteger(index)||index<0||index>=REFERENCE_SESSIONS_PER_SHEET)throw Error('Buổi học ngoài mẫu B1–B70');
 return 10+index;
}
export function referenceAttendanceStatus(status){
 return status==='absent'?'VẮNG':status==='excused'?'CÓ PHÉP':status==='late'?'TRỄ':'';
}
export function referenceColumnMap(){
 return {studentCode:1,order:2,name:3,birthday:4,phone:5,idNumber:6,ethnicCode:7,
  gender:8,classification:9,firstSession:10,lastSession:79,
  firstScore:80,lastScore:95,comment:96,standard:97,exam:98,
  total:99,present:100,absent:101,absentRate:102,excused:103};
}
