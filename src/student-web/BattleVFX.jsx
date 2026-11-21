import React from 'react';

const DIRECTIONS=[
 [-128,-92],[-80,-141],[-11,-151],[79,-130],[145,-78],[167,-4],
 [133,80],[72,135],[-12,156],[-93,109],[-157,38],[-148,-42],
 [44,-69],[-63,53]
];

// Visual feedback only: answers, HP, stars, timer and outcomes are never mutated here.
// Re-mount using each server-confirmed answer event's unique key to replay animations.
export function BattleVFX({event}){
 if(!event)return null;
 const {kind,damage=0}=event;
 const attacking=kind==='correct'||kind==='wave_clear'||kind==='victory';
 const celebration=kind==='wave_clear'||kind==='victory';
 const takingDamage=kind==='wrong'||kind==='defeat';
 if(!attacking&&!takingDamage)return null;
 return <div className={'cw-vfx cw-vfx-'+kind} aria-hidden="true">
   <div className="cw-vfx-wash"/>
   {attacking&&<>
     <div className="cw-vfx-slash cw-vfx-slash-one"/>
     <div className="cw-vfx-slash cw-vfx-slash-two"/>
   </>}
   <span className="cw-vfx-impact"/>
   <span className="cw-vfx-ring"/>
   {DIRECTIONS.map(([x,y],i)=><span key={i} className="cw-vfx-particle"
      style={{'--particle-x':x+'px','--particle-y':y+'px','--particle-delay':i%4*35+'ms'}}/>)}
   {attacking&&<span className="cw-vfx-damage">−{Math.max(0,Number(damage))} HP</span>}
   {takingDamage&&<span className="cw-vfx-damage cw-vfx-damage-heart">−1 ❤</span>}
   {celebration&&<span className="cw-vfx-win">{kind==='victory'?'CHIẾN THẮNG!':'VƯỢT ẢI!'}</span>}
 </div>;
}
