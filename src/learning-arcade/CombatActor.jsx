import React,{useEffect,useRef} from 'react';
import {skinById} from './PixelArt.jsx';
import './combatActor.css';

// time, travel, rise, torso, upper arm, forearm, rear arm, front thigh,
// front shin, rear thigh, rear shin, neck, cape/wing, jaw
const heroStrike=[
 [0,0,0,0,-30,-58,10,-12,10,12,5,0,0,0],
 [.17,-.06,5,-13,-120,-75,28,25,-44,-26,40,-8,-15,0],
 [.34,.37,-8,15,-142,-34,70,-56,28,42,-58,9,-36,0],
 [.48,1,1,27,-78,-18,66,-38,38,39,-20,-12,-54,0],
 [.56,1,2,26,-42,-12,55,-35,35,36,-15,-9,-49,0],
 [.74,.67,0,9,-6,-50,22,8,-28,-19,38,0,-14,0],
 [1,0,0,0,-30,-58,10,-12,10,12,5,0,0,0]];
const beastStrike=[
 [0,0,0,0,22,-56,12,-18,16,12,6,0,0,0],
 [.24,-.09,8,-16,59,-113,49,28,-41,-19,39,-18,-39,35],
 [.39,.25,-13,12,-63,-69,-40,-59,23,48,-61,12,-64,50],
 [.50,1,-2,21,-87,-8,-70,-37,32,43,-24,22,-36,10],
 [.59,1,1,19,-74,-12,-58,-32,30,38,-20,16,-25,3],
 [.78,.51,4,-4,11,-68,18,21,-30,-18,27,-5,-15,22],
 [1,0,0,0,22,-56,12,-18,16,12,6,0,0,0]];
function pose(keys,t){
 const i=keys.findIndex(k=>k[0]>=t),b=keys[i<0?keys.length-1:i],a=keys[Math.max(0,i-1)];
 let u=(t-a[0])/(b[0]-a[0]||1);u=u*u*(3-2*u);
 return b.slice(1).map((v,j)=>a[j+1]+(v-a[j+1])*u);
}
function Leg({x,back,beast}){
 return <g transform={'translate('+x+' 108)'}><g data-j={back?'rearThigh':'thigh'}>
 <path fill={back?'#25344d':'var(--armor)'} d="M-8 -4 Q0 -9 8 -3 L7 18 2 23 -7 18Z"/>
 <g transform="translate(1 19)"><g data-j={back?'rearShin':'shin'}><path fill={beast?'#87506d':'#293e59'} d="M-7 -3 L6 -4 7 13 14 18 14 22 -9 22 -9 15Z"/>
 <path fill="var(--rim)" stroke="none" d={beast?'M7 14 L24 21 11 21Z':'M-6 2 L6 0 5 4 -6 6Z'}/></g></g></g></g>;
}
function Arm({back,beast,job}){
 return <g transform={back?'translate(72 72)':'translate(92 74)'}><g data-j={back?'rearArm':'arm'}>
 <path fill={back?'#344462':'var(--armor)'} d="M-8 -3 Q0 -12 9 -4 L7 21 -4 25 -8 16Z"/>
 <g transform="translate(1 22)"><g data-j={back?'rearElbow':'elbow'}>
 <path fill="var(--armor)" d="M-6 -4 L7 -4 8 16 4 24 -6 21 -9 11Z"/><path fill="var(--rim)" stroke="none" d="M-5 2 L6 -1 6 3 -5 7Z"/>
 {beast?<path fill="#f1d2a0" d="M-8 11 Q-23 23 -9 48 L-8 30 0 23 Q9 39 23 39 Q11 29 10 15Z"/>:<><path fill="var(--skin)" d="M-6 17 Q1 13 7 18 L8 25 2 30 -6 26Z"/>
 {!back&&<g transform="translate(2 21) rotate(28)">
 {job==='mage'?<><path stroke="#bc905f" strokeWidth="4" d="M0 12V-44"/><path fill="#c8adff" d="M0 -66 L9 -51 1 -38 -8 -50Z"/></>:job==='archer'?<><path fill="none" stroke="var(--rim)" strokeWidth="4" d="M9 -40 Q-20 -6 5 32"/><path fill="none" stroke="#d7efff" strokeWidth="1" d="M9 -40 L11 1 5 32"/></>:<><path fill="#b8eafa" d="M-4 -3 L-5 -45 1 -65 6 -46 4 -3Z"/><path fill="white" stroke="none" d="M1 -61 L4 -44 1 -8Z"/><path stroke="#ffcc79" strokeWidth="5" d="M-10 -3 Q0 1 10 -5"/></>}
 </g>}</>}</g></g></g></g>;
}
function HeroHead(){
 return <><path fill="var(--skin)" d="M-16 -19 Q-11 -34 7 -30 Q19 -29 22 -17 L21 -8 26 -3 20 0 Q19 10 8 13 L-8 8 -16 -1Z"/>
 <path fill="var(--hair)" d="M-20 2 L-25 -8 -19 -8 -24 -20 -16 -19 -16 -29 -7 -27 Q2 -39 16 -34 L12 -30 27 -30 19 -21 24 -22 10 -10 9 -18 -1 -9 -2 -15 -10 -4 -14 5Z"/>
 <path d="M-16 -21 Q-3 -33 11 -30" fill="none" stroke="var(--rim)" strokeWidth="2"/>
 <path d="M11 -12 L21 -15" strokeWidth="3"/><path fill="#fff7de" d="M11 -8 L20 -10 18 -4 13 -4Z"/><path d="M17 -9v4" strokeWidth="2"/><path d="M14 4l5 -1" strokeWidth="1.5"/></>;
}
function BeastHead(){
 return <><path fill="#684268" d="M-19 -16 L-29 -37 -7 -25 Q14 -30 23 -16 L31 -5 21 4 2 11 -19 2Z"/>
 <path fill="#be7995" d="M-21 -28 L-2 -22 21 -14 5 -12 -14 -16Z"/>
 <path fill="#ffc365" d="M4 -10 L21 -13 15 -3 8 -2Z"/><path d="M14 -10v5"/>
 <g data-j="jaw"><path fill="#59324e" d="M-4 1 L25 -3 30 2 12 15 -1 13Z"/><path fill="#fff0c3" d="M7 0l4 7 4 -8 M19 -2l4 6 3 -7"/></g>
 <path fill="#fccc9a" d="M-16 -16 Q-39 -20 -40 -38 Q-33 -26 -12 -23Z"/></>;
}
export function CombatActor({enemy=false,skinId,action='idle',reduced=false}){
 const root=useRef(null),skin=skinById(skinId);
 useEffect(()=>{
  const el=root.current,nodes=Object.fromEntries([...el.querySelectorAll('[data-j]')].map(n=>[n.dataset.j,n]));
  let frame,start=performance.now();const media=matchMedia('(prefers-reduced-motion: reduce)');
  const rot=(k,v)=>nodes[k]?.setAttribute('transform','rotate('+v+')');
  const keys=enemy?beastStrike:heroStrike;
  const actor=el.closest('.ic3-stage-actor'),rival=actor?.parentElement.querySelector(enemy?'.hero':'.enemy');
  const gap=rival?Math.abs(actor.offsetLeft+actor.offsetWidth/2-rival.offsetLeft-rival.offsetWidth/2):140;
  function draw(now){
   const still=reduced||media.matches,elapsed=(now-start)/1000,t=still?1:Math.min(1,elapsed/.88),wave=still?0:Math.sin(elapsed*3);
   let [travel,y,lean,arm,elbow,rear,thigh,shin,rt,rs,neck,wing,jaw]=pose(keys,action==='attack'?t:0);
   const impact=action==='hit'&&t>.43?Math.max(0,1-(t-.48)*3.7):0;
   lean-=impact*22;neck-=impact*21;arm+=impact*34;elbow-=impact*18;
   if(action==='defeat'){lean-=t*57;y+=t*22;thigh+=t*30;}
   if(action==='victory'){arm-=135*t;elbow+=42*t;neck-=9*t;}
   el.style.transform='translateX('+((enemy?-1:1)*(travel*Math.max(0,gap-el.clientWidth*.32)-impact*18))+'px)';
   nodes.body.setAttribute('transform','translate(0 '+(y+wave*1.5)+') rotate('+lean+' 82 108)');
   rot('arm',arm+wave*2);rot('elbow',elbow);rot('rearArm',rear-wave*2);rot('rearElbow',-30);
   rot('thigh',thigh);rot('shin',shin);rot('rearThigh',rt);rot('rearShin',rs);
   rot('neck',neck+wave*1.5);rot('cape',wing+wave*4);rot('jaw',jaw+2+wave*2);
   if(!still)frame=requestAnimationFrame(draw);
  }draw(start);return()=>cancelAnimationFrame(frame);
 },[enemy,action,reduced]);
 return <svg ref={root} className={'arc-rig '+(enemy?'beast':'knight')} viewBox="0 0 170 168" aria-hidden="true"
 style={{'--armor':enemy?'#825070':skin.outfit,'--rim':enemy?'#ffc66b':skin.trim,'--skin':skin.skin,'--hair':skin.hair}}>
 <g transform={enemy?'translate(170 0) scale(-1 1)':undefined} stroke="#1c203c" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
 <g data-j="body"><Leg x={74} back beast={enemy}/><Arm back beast={enemy}/>
 <g transform="translate(73 72)"><g data-j="cape"><path fill={enemy?'#613b66':skin.outfit} d={enemy?'M0 1 Q-8 -25 -39 -34 L-55 -52 -52 -18 -38 -21 -37 -5 -22 -9 -15 9Z':'M5 -3 Q-1 16 -20 34 L-35 49 -23 45 -26 52 -7 46 10 29Z'}/>
 <path fill="none" stroke="var(--rim)" d={enemy?'M-48 -42 L-37 -25 -23 -18 -9 0':'M-23 41 Q-9 33 -1 12'}/></g></g>
 <Leg x={89} beast={enemy}/><path fill="var(--armor)" d={enemy?'M59 81 Q54 46 83 48 Q107 51 110 80 L101 97 78 112 59 99Z':'M62 69 L76 62 97 65 104 74 94 95 98 108 68 110 65 92Z'}/>
 <path fill={enemy?'#bf8390':'#aec4ce'} d="M64 73 L76 63 94 66 99 73 84 84 73 81Z"/>
 <path fill="var(--rim)" d="M78 75 L83 68 89 74 84 80Z"/>
 <path fill="#323547" d="M68 96 L95 94 96 101 69 103Z"/><path fill="#d4aa68" d="M81 95h7v7h-7Z"/>
 <g transform={'translate('+(enemy?'97 63':'84 58')+')'}><g data-j="neck">{enemy?<BeastHead/>:<HeroHead/>}</g></g><Arm beast={enemy} job={skin.classId}/>
 </g></g></svg>;
}
