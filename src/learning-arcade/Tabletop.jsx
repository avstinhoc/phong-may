import React,{useRef,useEffect} from 'react';
import {paintArena} from './tabletop.js';
import {monsterArt,heroArt} from '../student-web/battleArt.js';
export function Tabletop({skin,index,round=1,wave=3,action='idle',quiet=false,portrait=false}){
 const ref=useRef(null);
 useEffect(()=>{const el=ref.current,ctx=el.getContext('2d');if(!ctx)return;
 let frame,last=-100,start=performance.now();const reduced=quiet||matchMedia('(prefers-reduced-motion:reduce)').matches;
 const monsterAppearance=monsterArt(round,wave),heroAppearance=heroArt(skin,skin.gear);
 function paint(now){const lowCost=el.clientWidth>1100;const interval=lowCost?40:32;if(now-last>=interval||portrait||reduced){last=now;const w=el.clientWidth,h=el.clientHeight;if(w&&h){const ratio=Math.min(lowCost?1.25:1.5,devicePixelRatio||1);if(el.width!==Math.round(w*ratio)||el.height!==Math.round(h*ratio)){el.width=Math.round(w*ratio);el.height=Math.round(h*ratio)}ctx.setTransform(ratio,0,0,ratio,0,0);paintArena(ctx,w,h,{skin,index,round,wave,action,time:reduced?0:now/1000,elapsed:reduced?2:(now-start)/1000,portrait,monsterAppearance,heroAppearance})}}if(!portrait&&!reduced)frame=requestAnimationFrame(paint)}
 const refresh=()=>{cancelAnimationFrame(frame);last=-100;paint(performance.now())};const ro=new ResizeObserver(refresh);ro.observe(el);refresh();return()=>{ro.disconnect();cancelAnimationFrame(frame)}
 },[skin,index,round,wave,action,quiet,portrait]);
 return <canvas ref={ref} className={portrait?'toy-portrait':'toy-arena'} aria-hidden="true"/>;
}
