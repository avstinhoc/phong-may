import {normalizeIntent} from './weekPlanner.js';

// A grid with weekdays is a template. It often has no calendar date in its
// individual cells; rejecting those cells is what used to drop most lessons.
export function inferWeeklyTimetable({question='',attachment=null,explicitWeekly=false}={}){
 if(explicitWeekly)return true;
 if(!attachment)return false;
 const q=normalizeIntent(question),name=normalizeIntent(attachment.name||'');
 if(/(chi|duy nhat|mot buoi|buoi le|mot ngay|ngay \d{1,2}[\/.-]\d{1,2}|\d{4}-\d{2}-\d{2})/.test(q))return false;
 if(/(thoi khoa bieu|tkb|lich tuan|lich hang tuan|tuan hoc|ca tuan)/.test(q+' '+name))return true;
 const raw=normalizeIntent(attachment.text||'');
 const hits=['thu hai','thu ba','thu tu','thu nam','thu sau','thu bay'].filter(v=>raw.includes(v)).length;
 if(hits>=3)return true;
 return /(nhap|them|tao|doc|lap|xep).{0,30}lich/.test(q)&&
  (/(lich|tkb|schedule)/.test(name)||Boolean(attachment.mimeType?.startsWith('image/')));
}

export function compactWarnings(warnings){
 const counts=new Map();
 for(const item of warnings){
  const w=String(item||'').trim();
  if(!w)continue;
  counts.set(w,(counts.get(w)||0)+1);
 }
 return [...counts].map(([word,n])=>n>1?word+' (lặp '+n+' ô)':word);
}
