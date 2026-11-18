import React from 'react';
import {flameEffect} from './lib/stars';

// Inline SVG keeps all 27 flame colors consistent across operating systems.
// CSS animates the fire softly, and respects prefers-reduced-motion.
export function FlameBadge({wallet,compact=false}){
 const fx=flameEffect(wallet);
 if(!fx.visible)return null;
 const nextHint=fx.nextMin===null?'Đã đạt cấp lửa cao nhất':
   'Còn '+fx.remaining+' sao hiệu ứng để lên cấp '+(fx.tier+1)+' ('+fx.nextMin+' sao)';
 const label='Lửa cấp '+fx.tier+' · '+fx.label+'. '+nextHint;
 return <span className={'qlpm-flame '+(compact?'qlpm-flame--compact ':'')+
   'qlpm-flame--'+fx.state} style={fx.style}
   role="img" aria-label={fx.state==='gray'?'Lửa xám, có thể phục hồi':
     fx.state==='cooling'?'Lửa đang yếu dần, cần giữ chuỗi':label}
   title={fx.state==='gray'?'Lửa tạm xám: có thể khôi phục chuỗi. '+nextHint:
     fx.state==='cooling'?'Lửa đang yếu, hãy giữ chuỗi. '+nextHint:label}>
  <svg viewBox="0 0 34 44" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
   <path className="qlpm-flame-outer" d="M17 1C18 10 8 14 10 23 6 19 6 16 7 12 0 21 0 27 4 34 7 40 12 43 17 43 27 43 33 35 33 26 33 17 27 13 27 10 24 16 23 17 21 17 21 11 19 6 17 1Z"/>
   <path className="qlpm-flame-inner" d="M17 19C18 25 11 28 11 34 11 39 14 41 18 41 23 41 27 37 26 32 25 28 21 27 21 24 20 28 18 29 17 19Z"/>
  </svg>
 </span>;
}
