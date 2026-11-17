// Class-session time fields represent Vietnamese wall-clock time (UTC+07:00).
// Preserve HH:mm without converting through the browser's timezone or Date.
export function parseVietnamTime(value){
 const match=/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value??'').trim());
 if(!match)return null;
 return match[1]+':'+match[2];
}
export function changeVietnamTimePart(value,part,partValue){
 const normalized=parseVietnamTime(value);
 if(!normalized)throw new Error('Giờ không hợp lệ');
 if(part!=='hour'&&part!=='minute')throw new Error('Thành phần giờ không hợp lệ');
 const n=Number(partValue);
 const max=part==='hour'?23:59;
 if(!Number.isInteger(n)||n<0||n>max)throw new Error('Giá trị giờ/phút không hợp lệ');
 const [h,m]=normalized.split(':');
 return part==='hour'?String(n).padStart(2,'0')+':'+m:h+':'+String(n).padStart(2,'0');
}
export function isVietnamTimeRange(start,end){
 const s=parseVietnamTime(start),e=parseVietnamTime(end);
 return Boolean(s&&e&&s<e);
}
