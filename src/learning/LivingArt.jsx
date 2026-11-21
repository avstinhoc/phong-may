import React,{useRef,useEffect} from 'react';
import original from './fx/legends.webp';
import eclipse from './fx/eclipse.webp';
const images=new Map();
function texture(url){if(!images.has(url)){const img=new Image();img.src=url;images.set(url,img)}return images.get(url)}
// Overlapping horizontal strips bend independently around the feet, torso and head.
export function LivingArt({art,move,quiet}){
 const ref=useRef(null);
 useEffect(()=>{const el=ref.current,ctx=el.getContext('2d');if(!ctx)return;const next=art>=12,i=next?art-12:art,img=texture(next?eclipse:original),start=performance.now();let id,last=-100;
 function draw(now){if(img.naturalWidth&&now-last>31){last=now;const t=(now-start)/1000,w=img.naturalWidth/4,h=img.naturalHeight/(next?2:3),sx=(i%4)*w,sy=Math.floor(i/4)*h;
 const pulse=quiet?0:Math.sin(t*(2.3+art%5*.23)),hit=quiet?0:Math.sin(Math.PI*Math.min(1,t/.78)),direction=art<8||(art>=12&&art<16)?-1:1;
 ctx.clearRect(0,0,420,420);
 for(let j=0;j<32;j++){const v=j/32,upper=1-v,limb=Math.sin(v*7+art*.9);
 const bend=quiet?0:upper*(pulse*(2.3+art%4)+limb*2*Math.sin(t*3+v*3))+(move==='attack'?direction*hit*upper*(8+8*limb):move==='hit'?-direction*hit*upper*13:0);
 const grow=quiet?0:pulse*Math.sin(v*Math.PI)*3;
 ctx.drawImage(img,sx,sy+j*h/32,w,h/32,13+bend-grow,10+v*396,394+2*grow,396/32+.8)}
 if(quiet)return}id=requestAnimationFrame(draw)}draw(start);return()=>cancelAnimationFrame(id)},[art,move,quiet]);
 return <canvas ref={ref} width="420" height="420" className="living-art" aria-hidden="true"/>
}
