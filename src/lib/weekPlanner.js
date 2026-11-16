export function isoDay(date){
 const d=typeof date==='string'?new Date(date+'T12:00:00Z'):date;
 if(Number.isNaN(d.getTime()))throw new Error('Ngày không hợp lệ');
 return d.toISOString().slice(0,10);
}
export function addDays(date,n){
 const d=new Date(isoDay(date)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);
 return isoDay(d);
}
export function weekday(date){
 const d=new Date(isoDay(date)+'T12:00:00Z');
 return ((d.getUTCDay()+6)%7)+1;
}
export const mondayOf=date=>addDays(date,1-weekday(date));
export function vnToday(now=new Date()){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function normalizeIntent(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
}
export function planIntent(prompt){
 const q=normalizeIntent(prompt);
 const replace=/(thay the|ghi de|xoa lich cu|thay lich cu|lam moi lich|thay toan bo|cap nhat toan bo lich)/.test(q);
 const weekly=/(thoi khoa bieu|lich hang tuan|tuan nay|tuan sau|moi tuan|hang tuan|lap lai hang tuan|cac tuan)/.test(q);
 return {replace,weekly};
}
export function expandWeekly(template,start,end,limit=300){
 const out=[];const used=new Set();
 const days=Math.floor((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);
 if(days<0||days>120)throw new Error('Khoảng ngày không hợp lệ');
 for(const row of template){
  const day=Number(row.weekday);
  if(!Number.isInteger(day)||day<1||day>7)throw new Error('Thiếu thứ trong tuần để nhân lịch.');
  let dt=addDays(start,(day-weekday(start)+7)%7);
  while(dt<=end){
   const x={...row,session_date:dt,operation:'create',target_id:null};
   delete x.weekday;
   const key=[dt,x.class_name,x.start_time,x.end_time].join('|');
   if(!used.has(key)){used.add(key);out.push(x);}
   if(out.length>limit)throw new Error('Quá nhiều buổi học, hãy thu hẹp khoảng thời gian.');
   dt=addDays(dt,7);
  }
 }
 return out.sort((a,b)=>a.session_date.localeCompare(b.session_date)||a.start_time.localeCompare(b.start_time)||a.class_name.localeCompare(b.class_name,'vi'));
}
