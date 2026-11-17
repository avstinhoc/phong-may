// Date-only operations for calendar lesson filters. Work in UTC at noon so
// DST and host timezone cannot move the chosen day or Monday boundary.
const iso=/^\d{4}-\d{2}-\d{2}$/;
export function validSessionDate(value){
 if(typeof value!=='string'||!iso.test(value))return false;
 const d=new Date(value+'T12:00:00Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function shiftSessionDay(value,days){
 if(!validSessionDate(value))throw new Error('Ngày lọc không hợp lệ');
 if(!Number.isInteger(days)||Math.abs(days)>400)throw new Error('Số ngày dịch không hợp lệ');
 const d=new Date(value+'T12:00:00Z');
 d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString().slice(0,10);
}
export function mondayOfSessionWeek(value){
 if(!validSessionDate(value))throw new Error('Ngày lọc không hợp lệ');
 const wd=new Date(value+'T12:00:00Z').getUTCDay();
 return shiftSessionDay(value,-((wd+6)%7));
}
export function sessionDateWindow(mode,anchor){
 if(mode==='all')return null;
 if(!['week','day'].includes(mode)||!validSessionDate(anchor))return null;
 if(mode==='day')return {start:anchor,end:anchor};
 const monday=mondayOfSessionWeek(anchor);
 return {start:monday,end:shiftSessionDay(monday,6)};
}
export function filterCreatedSessions(rows,mode='all',anchor=''){
 const range=sessionDateWindow(mode,anchor);
 const list=Array.isArray(rows)?rows:[];
 return (range?list.filter(row=>row.session_date>=range.start&&row.session_date<=range.end):list)
   .slice().sort((a,b)=>String(b.session_date||'').localeCompare(String(a.session_date||''))||
     String(a.start_time||'').localeCompare(String(b.start_time||''))||
     String(a.class_name||'').localeCompare(String(b.class_name||''));
}
