import React,{useState} from 'react';
import {Heart,Volume2,VolumeX,Shield,Settings2,Zap} from 'lucide-react';
import {PixelHero,PixelMonster,skinById} from './PixelArt.jsx';
import {BALANCE} from './adventureCatalog.js';

export function GameSoundButton({muted,setMuted}){
 return <button type="button" className="ic3-arcade-control" aria-label={muted?'Bật hiệu ứng âm thanh':'Tắt hiệu ứng âm thanh'}
    aria-pressed={!muted} onClick={()=>setMuted(m=>!m)}>
  {muted?<VolumeX size={17}/>:<Volume2 size={17}/>} {muted?'Bật âm':'Tắt âm'}
 </button>;
}
export function playGameSound(type,muted){
 if(muted||typeof window==='undefined')return;
 try{
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return;
  const ctx=new Context();
  const notes=type==='correct'?[[580,0,.095],[780,.095,.095],[1010,.19,.14]]:
    type==='wrong'?[[310,0,.09],[220,.10,.15]]:[[510,0,.10],[680,.1,.10]];
  notes.forEach(([frequency,offset,duration],index)=>{
   const o=ctx.createOscillator(),gain=ctx.createGain();
   o.type=type==='wrong'?'triangle':'sine';
   o.frequency.setValueAtTime(frequency,ctx.currentTime+offset);
   gain.gain.setValueAtTime(.0001,ctx.currentTime+offset);
   gain.gain.exponentialRampToValueAtTime(.07,ctx.currentTime+offset+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+offset+duration);
   o.connect(gain).connect(ctx.destination);
   if(index===notes.length-1)o.onended=()=>{ctx.close().catch(()=>{});};
   o.start(ctx.currentTime+offset);o.stop(ctx.currentTime+offset+duration+.015);
  });
 }catch{/* Browser audio policy may block the effect; gameplay remains usable. */}
}
export function BattleScene({battle,monster,skinId,muted,setMuted,lowMotion,setLowMotion}){
 const feedback=battle.phase==='feedback'?battle.currentFeedback:null;
 const correct=feedback?.correct,wrong=feedback&&!feedback.correct;
 const skin=skinById(skinId);
 const isBoss=monster?.isBoss;
 return <section className={'ic3-arcade-stage '+(lowMotion?'ic3-reduce-motion ':'')+
  (correct?'ic3-attack-frame ':wrong?'ic3-counter-frame ':'')} aria-label="Đấu trường phiêu lưu">
  <div className="ic3-arcade-sky" aria-hidden="true">
   <div className="ic3-sky-sun"/><div className="ic3-cloud cloud-a"/><div className="ic3-cloud cloud-b"/>
   <div className="ic3-back-hill hill-one"/><div className="ic3-back-hill hill-two"/>
   <div className="ic3-cityline distant">
    {Array.from({length:15},(_,i)=><span key={i} style={{'--n':i,'--h':(i*37)%64+32}}/>)}
   </div>
   <div className="ic3-cityline foreground">
    {Array.from({length:12},(_,i)=><span key={i} style={{'--n':i,'--h':(i*23)%48+34}}/>)}
   </div>
  </div>
  <div className="ic3-stage-bits" aria-hidden="true">
   {Array.from({length:17},(_,i)=><span key={i} style={{'--x':(i*31)%97,'--y':(i*19)%67,'--delay':i*.21}}/>)}
  </div>
  <div className="ic3-stage-top">
   <div className="ic3-stage-round">⚔️ LEVEL 1 · BÀI 01 · VÒNG {battle.round}
    {isBoss&&<b> BOSS</b>}</div>
   <div className="ic3-stage-controls">
    <GameSoundButton muted={muted} setMuted={setMuted}/>
    <button type="button" className="ic3-arcade-control" onClick={()=>setLowMotion(v=>!v)} aria-pressed={lowMotion}>
     <Settings2 size={16}/> {lowMotion?'Hiệu ứng thấp':'Giảm hiệu ứng'}
    </button>
   </div>
  </div>
  <div className="ic3-stage-healthbox">
   <div className="ic3-health-label"><span>{isBoss?'👑 BOSS':'👾 QUÁI VẬT'} · {monster.name}</span><strong>{battle.hp}/{battle.maxHp} HP</strong></div>
   <div className="ic3-arcade-hp" role="progressbar" aria-label="Máu quái vật" aria-valuenow={battle.hp}
    aria-valuemin={0} aria-valuemax={battle.maxHp}><span style={{width:`${100*battle.hp/battle.maxHp}%`}}/></div>
  </div>
  <div className="ic3-stage-ground" aria-hidden="true">
   <div className="ic3-ground-platform"/><div className="ic3-ground-runes">◈　✦　◈　✧　◈</div>
  </div>
  <div className="ic3-stage-actors">
   <div className={'ic3-stage-actor hero '+(correct?'attacking':wrong?'hit':'')}>
    <span className="ic3-stage-aura"/>
    <PixelHero skinId={skinId}/>
    <div className="ic3-actor-name">{skin.name}<span>{skin.job}</span></div>
    <div className="ic3-stage-hearts" aria-label={battle.hearts+' trên '+BALANCE.hearts+' tim'}>
     {Array.from({length:BALANCE.hearts},(_,i)=><Heart key={i} size={25} fill={i<battle.hearts?'#ff506f':'none'}
      color={i<battle.hearts?'#ff506f':'#a9a7b9'} strokeWidth={3}/>)}
    </div>
   </div>
   <div className={'ic3-stage-center '+(correct?'correct':wrong?'wrong':'')} aria-hidden="true">
    <span className="ic3-stage-versus">VS</span>
    {feedback&&<div className="ic3-slash-wave"><span/><span/><span/></div>}
    {correct&&<div className="ic3-impact-text">−{feedback.damage} HP <Zap size={22} fill="#ffe4a2"/></div>}
    {wrong&&<div className="ic3-impact-text incorrect">{feedback.shieldConsumed?'KHIÊN CHẮN!':'−1 TIM'}</div>}
   </div>
   <div className={'ic3-stage-actor enemy '+(wrong?'attacking':correct?'hit':'')}>
    <span className="ic3-stage-aura"/>
    <PixelMonster round={monster.round}/>
    <div className="ic3-actor-name">{monster.name}<span>{isBoss?'BOSS CUỐI VÒNG':'Quái vật kiến thức'}</span></div>
   </div>
  </div>
  <div className="ic3-stage-status">
   <span>✅ Đúng: {battle.correct}</span><span>📘 Cần ôn: {battle.wrong}</span>
   <span>✨ Liên tiếp: {battle.streak}</span>
   <span>30 giây mỗi câu</span>
  </div>
 </section>;
}
