import React,{useEffect,useRef} from 'react';

const palette=['#9652ef','#188f93','#e57b30','#4954aa'];
// Orthographic projection with depth-sorted, individually lit polygon faces.
function render(ctx,w,h,kind,time,attack,hit,fallen){
 const faces=[],yaw=-.48+.035*Math.sin(time*1.3), tilt=.20,scale=Math.min(w/4.55,h/3.92);
 const shade=(hex,v)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*v)).toString(16).padStart(2,'0')).join('');
 const project=([x,y,z])=>{
  const a=fallen*.68,xx=x*Math.cos(a)-y*Math.sin(a),yy=x*Math.sin(a)+y*Math.cos(a);
  const X=xx*Math.cos(yaw)+z*Math.sin(yaw),Z=z*Math.cos(yaw)-xx*Math.sin(yaw);
  return [w*.51+scale*X,h*.78-scale*(yy*Math.cos(tilt)-Z*Math.sin(tilt)),Z*Math.cos(tilt)+yy*Math.sin(tilt)];
 };
 function face(points,color){
  const p=points.map(project),[a,b,c]=p;
  const ux=(b[0]-a[0])/scale,uy=-(b[1]-a[1])/scale,uz=b[2]-a[2],vx=(c[0]-a[0])/scale,vy=-(c[1]-a[1])/scale,vz=c[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const n=Math.hypot(nx,ny,nz)||1;if(nz<0){nx=-nx;ny=-ny;nz=-nz;}
  const light=.74+.39*(-.45*nx+.78*ny+.44*nz)/n+hit*.33;
  faces.push([p,shade(color,light),p.reduce((s,v)=>s+v[2],0)/p.length]);
 }
 function orb(x,y,z,rx,ry,rz,col,n=8){
  const rings=[];
  for(let j=0;j<=5;j++){
   const b=Math.PI*j/5-Math.PI/2;
   rings.push(Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n;return [x+rx*Math.cos(b)*Math.cos(a),y+ry*Math.sin(b),z+rz*Math.cos(b)*Math.sin(a)]}));
  }
  for(let j=0;j<5;j++)for(let i=0;i<n;i++){const k=(i+1)%n;face([rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]],col)}
 }
 function limb(a,b,r,s,color){
  const d=b.map((v,i)=>v-a[i]),l=Math.hypot(...d)||1,u=d.map(v=>v/l),v=Math.abs(u[1])>.9?[1,0,0]:[-u[2],0,u[0]];
  const vl=Math.hypot(...v);v.forEach((_,i)=>v[i]/=vl);
  const q=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const ring=(p,r)=>Array.from({length:6},(_,i)=>p.map((e,j)=>e+r*(v[j]*Math.cos(i*Math.PI/3)+q[j]*Math.sin(i*Math.PI/3))));
  const A=ring(a,r),B=ring(b,s);for(let i=0;i<6;i++){let k=(i+1)%6;face([A[i],A[k],B[k],B[i]],color)}if(s)face(B,color);
 }
 const wave=Math.sin(time*3),y=.04*wave+.16*attack, shell=palette[kind-1]||palette[0],dark='#302e50',gold='#ffd566',ice='#9efbfa';
 const eye=(x,y,z)=>orb(x,y,z,.105,.13,.075,gold,6);
 if(kind===1){
  orb(.35,1.05+y,0,.87,.74,.78,shell);orb(-.56,.87+y,.08,.57,.48,.53,dark);
  for(const side of [-1,1])for(let i=0;i<4;i++){const x=-.62+i*.37,z=side*.42,dx=(i-1.5)*.31,k=[x+dx,1.05+y+.12*Math.sin(time*4+i),side*1.02],foot=[x+dx*1.8-.28*attack,.07,side*(1.28+.13*Math.cos(i))];limb([x,.86+y,z],k,.14,.12,shell);limb(k,foot,.13,.015,dark)}
  for(const z of [-.23,.23]){eye(-1.03,.98+y,z);limb([-.94,.68+y,z],[-1.13,.35+y,z],.08,0,gold)}
  for(let i=0;i<3;i++)limb([.05+i*.31,1.54+y,.13],[.12+i*.31,1.95+y,.14],.14,0,ice);
 }else if(kind===2){
  orb(.10,1.25+y,0,.68,.75,.43,shell);orb(.01,2.14+y,0,.51,.38,.41,dark);eye(-.28,2.2+y,.32);
  for(const s of [-1,1]){const z=s*.38,arm=[-.15-.32*attack,1.36+y,z*2.2];
   orb(.06,1.76+y,z*1.4,.45,.43,.41,shell);limb([0,1.7+y,z],arm,.24,.2,dark);
   orb(arm[0]-.16-.48*attack,1.05+y,z*2.3,.41,.44,.37,shell);
   limb([.13,.91,z],[.18,.32,z*1.25],.23,.22,dark);orb(.07,.23,z*1.25,.36,.23,.29,shell);
   limb([.22,1.98+y,z*1.4],[.36,2.52+y,z*1.6],.16,0,ice)}
  orb(-.53,1.48+y,.18,.15,.23,.22,gold);
 }else{
  const dragon=kind===4;orb(.20,.76+y,0,.81,.57,.59,shell);
  limb([.67,.75+y,0],[1.28,.48,.08],.30,.16,shell);limb([1.28,.48,.08],[1.72,.80+.12*wave,.10],.16,0,gold);
  for(const s of [-1,1]){
   limb([.42,.61+y,s*.38],[.58,.13,s*.65],.22,.16,shell);
   if(dragon){const tip=[.62,2.47+.26*wave+.2*attack,s*1.63];const base=[.35,1.06+y,s*.30],mid=[.06,2.01+y,s*.85];face([base,mid,tip],'#78b9eb');face([base,tip,[1.13,1.52,s*1.10]],'#7063b7');limb(base,mid,.10,.08,shell);limb(mid,tip,.08,0,ice)}
  }
  for(const i of (dragon?[0]:[-1,0,1])){
   const sway=.11*Math.sin(time*2.8+i*2),z=i*.65,k=[-.33,1.22+y,z*.57],head=[-.70-.60*attack+sway,1.94+y-.18*Math.abs(i)-attack*.30,z];
   limb([-.22,.76+y,0],k,.30,.23,shell);limb(k,head,.24,.21,shell);
   orb(...head,.38,.32,.30,shell);const [a,b,c]=head;orb(a-.28,b-.09,c,.32,.16,.24,dragon?'#66aaaf':'#dfad57');eye(a-.20,b+.06,c+.23);
   limb([a+.12,b+.21,c],[a+.25,b+.53,c],.12,0,gold);
  }
 }
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#111b3233';ctx.beginPath();ctx.ellipse(w*.52,h*.80,scale*1.02,scale*.17,0,0,Math.PI*2);ctx.fill();
 faces.sort((a,b)=>a[2]-b[2]);for(const [p,color] of faces){ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=ctx.strokeStyle=color;ctx.lineWidth=.48;ctx.fill();ctx.stroke()}
}
export function MonsterModel({kind,action='idle',reduced=false,portrait=false}){
 const ref=useRef(null);
 useEffect(()=>{const el=ref.current,ctx=el.getContext('2d');if(!ctx)return;
 const start=performance.now(),still=portrait||reduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
 let id,last=-100;const actor=el.closest('.enemy'),rival=actor?.parentElement.querySelector('.hero');
 const distance=rival?Math.max(0,actor.offsetLeft+actor.offsetWidth/2-rival.offsetLeft-rival.offsetWidth/2-el.clientWidth*.37):0;
 function tick(now){if(now-last>=32||still){last=now;const t=still?1:Math.min(1,(now-start)/880),phase=Math.max(0,1-Math.abs(t-.49)/.31),attack=action==='attack'?phase:0,hit=action==='hit'?phase:0;
 el.style.transform='translateX('+(-attack*distance+hit*13)+'px)';render(ctx,el.width,el.height,kind,still?0:(now-start)/1000,attack,hit,action==='defeat'?t:0)}if(!still)id=requestAnimationFrame(tick)}
 tick(start);return()=>cancelAnimationFrame(id)},[kind,action,portrait,reduced]);
 return <canvas className="arena-model" aria-hidden="true" ref={ref} width={portrait?320:448} height={portrait?248:360}/>;
}
