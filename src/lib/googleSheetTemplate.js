// Exact inspected THCS DUY TÂN Sheets 6.1/6.2 structure.
// A:I profile, J:CA 70 Boolean checkbox lessons, CB:CQ 16 grades,
// CR comment, CS standard, CT exam, CU:CY computed summaries (never overwrite).
export const SHEETS_TEMPLATE={
 firstStudentRow:8,lastStudentRow:70,maxStudents:63,
 firstSessionCol:10,lastSessionCol:79,maxSessions:70,
 scoreStartCol:80,scoreEndCol:95,
 commentCol:96,standardCol:97,examCol:98,
 computedStartCol:99,computedEndCol:103,
};
export const SHEETS_SCORES=['QT1','QT2','HK1','QT3','QT4','HK2',
 ...Array.from({length:5},(_,i)=>'TEST '+(i+1)),
 ...Array.from({length:5},(_,i)=>'Mô phỏng lần '+(i+1))];
export function parseSheetUrl(text){
  const s=String(text||'').trim();
  const match=/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]{25,160})(?:\/|$)/.exec(s);
  if(!match)throw new Error('Chỉ nhận link Google Sheets dạng https://docs.google.com/spreadsheets/d/...');
  return match[1];
}
export function validateSheetTabName(s){
  const value=String(s||'').trim();
  if(!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,59}$/u.test(value)||/[\[\]*?/\\]/.test(value))
    throw new Error('Tên lớp/tab không hợp lệ');
  return value;
}
export function sheetOrdinal(value){
  const n=Number(value);
  if(!Number.isInteger(n)||n<1||n>70)throw new Error('Buổi điểm danh phải từ B1 đến B70');
  return n;
}
export function sheetAbsentFlag(value){
  return value===true || String(value).trim().toUpperCase()==='TRUE';
}
export function normalizeSheetName(name){
  return String(name||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
}
export function mapLessonsInOrder(sessions=[]){
 const sorted=[...sessions].sort((a,b)=>String(a.session_date).localeCompare(String(b.session_date))||
 String(a.start_time).localeCompare(String(b.start_time))||String(a.id).localeCompare(String(b.id)));
 if(sorted.length>70)throw new Error('Một tab chỉ hỗ trợ 70 buổi học; tạo thêm tab trước khi ghép lịch');
 return Object.fromEntries(sorted.map((s,i)=>[s.id,i+1]));
}
export function validateLessonMapping(map={},permittedIds=[]){
 const assigned=Object.entries(map||{}).filter(([,ordinal])=>ordinal!==''&&ordinal!==null&&ordinal!==undefined);
 const allowed=new Set(permittedIds);
 const cols=new Set();
 for(const [sid,n] of assigned){
  if(!allowed.has(sid))throw new Error('Buổi học không thuộc lớp');
  const num=sheetOrdinal(n);
  if(cols.has(num))throw new Error('Một cột B chỉ được gán cho một buổi học');
  cols.add(num);
 }
 return Object.fromEntries(assigned.map(([sid,n])=>[sid,Number(n)]));
}
