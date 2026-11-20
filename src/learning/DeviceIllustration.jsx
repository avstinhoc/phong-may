import React from 'react';

export function DeviceIllustration({device}){
 const deviceLabel={
  cpu:'Bộ xử lý CPU',ssd:'Ổ cứng SSD',usb:'USB Flash Drive',mainboard:'Bo mạch chủ',
  keyboard:'Bàn phím',printer:'Máy in'
 }[device]||'Thiết bị công nghệ';
 return <figure className="ic3-device-art" aria-label={'Hình minh họa tự vẽ: '+deviceLabel}>
  <svg viewBox="0 0 220 130" role="img" aria-labelledby={'device-label-'+device}>
   <title id={'device-label-'+device}>{deviceLabel}</title>
   <defs><linearGradient id="ic3chip" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#6ecadf"/><stop offset="1" stopColor="#4973bb"/></linearGradient></defs>
   {device==='cpu'&&<g>
    <rect x="75" y="20" width="70" height="75" rx="8" fill="#2b556f" stroke="#a9deef" strokeWidth="4"/>
    <rect x="88" y="34" width="44" height="47" rx="5" fill="url(#ic3chip)"/>
    {Array.from({length:6},(_,i)=><g key={i} stroke="#ecbb65" strokeWidth="4"><path d={`M${80+i*12} 11 v9`}/><path d={`M${80+i*12} 95 v10`}/></g>)}
    <text x="110" y="63" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">CPU</text>
   </g>}
   {device==='ssd'&&<g><rect x="50" y="24" width="120" height="76" rx="8" fill="#26435e" stroke="#92cce0" strokeWidth="5"/>
    <rect x="60" y="37" width="100" height="49" rx="4" fill="#2c738e"/><text x="110" y="66" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="bold">SSD</text>
    <rect x="88" y="101" width="45" height="8" fill="#e9b961"/></g>}
   {device==='usb'&&<g><rect x="46" y="43" width="110" height="49" rx="10" fill="#247d9c"/>
    <rect x="156" y="52" width="34" height="30" rx="3" fill="#c2d5e0"/><path d="M166 52V42h16v10" stroke="#c2d5e0" fill="none" strokeWidth="4"/>
    <text x="100" y="72" textAnchor="middle" fill="#fff" fontSize="17">USB</text></g>}
   {device==='mainboard'&&<g><rect x="56" y="15" width="110" height="105" rx="7" fill="#236e70" stroke="#94d7c3" strokeWidth="4"/>
    <rect x="74" y="30" width="45" height="38" rx="2" fill="#315770" stroke="#b8d5e0" strokeWidth="3"/>
    <rect x="130" y="27" width="17" height="76" rx="3" fill="#bad1c8"/>
    <path d="M77 90h44M77 103h44M94 68v20" stroke="#c8deb5" strokeWidth="4"/></g>}
   {device==='keyboard'&&<g><rect x="20" y="37" width="180" height="62" rx="9" fill="#2c5c79"/>
    {Array.from({length:4},(_,row)=>Array.from({length:9},(_,col)=><rect key={row+'-'+col} x={30+col*18} y={44+row*12} width="14" height="9" rx="2" fill="#cde1f0"/>))}</g>}
   {device==='printer'&&<g><rect x="62" y="42" width="96" height="65" rx="9" fill="#2a5770"/>
    <rect x="80" y="17" width="61" height="39" fill="#fff" stroke="#a5bbd0" strokeWidth="4"/>
    <rect x="76" y="78" width="68" height="42" fill="#fff" stroke="#a5bbd0" strokeWidth="4"/>
    <rect x="129" y="59" width="12" height="6" rx="2" fill="#9de3ca"/></g>}
  </svg><figcaption>{deviceLabel}</figcaption>
 </figure>;
}
