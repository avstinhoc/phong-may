import React from 'react';
import {changeVietnamTimePart,parseVietnamTime} from './lib/vietnamTime';

const HOURS=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
const MINUTES=Array.from({length:60},(_,i)=>String(i).padStart(2,'0'));

export function Time24Input({label,value,onChange,disabled=false}){
 const normalized=parseVietnamTime(value)||'00:00';
 const [hours,minutes]=normalized.split(':');
 return <div className="time24-input" role="group" aria-label={label}>
   <select aria-label={label+' - giờ (00 đến 23)'} value={hours} disabled={disabled}
     onChange={e=>onChange(changeVietnamTimePart(normalized,'hour',e.target.value))}>
     {HOURS.map(hour=><option value={hour} key={hour}>{hour}</option>)}
   </select>
   <span className="time24-colon" aria-hidden="true">:</span>
   <select aria-label={label+' - phút (00 đến 59)'} value={minutes} disabled={disabled}
     onChange={e=>onChange(changeVietnamTimePart(normalized,'minute',e.target.value))}>
     {MINUTES.map(minute=><option value={minute} key={minute}>{minute}</option>)}
   </select>
 </div>;
}
