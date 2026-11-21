import React,{useState,useEffect,useRef,useLayoutEffect} from 'react';
import {ArrowLeft,ArrowRight,Volume2,VolumeX,Wind,Heart,RotateCcw} from 'lucide-react';
import {CombatActor} from './CombatActor.jsx';
import {DeviceIllustration} from './DeviceIllustration.jsx';
import {HERO_SKINS,skinById} from './PixelArt.jsx';
import {answerBattle,currentQuestion,nextBattle} from './battleEngine.js';
import {playGameSound} from './BattleScene.jsx';
import atlas from './fx/legends.webp';
import eclipse from './fx/eclipse.webp';
import {LivingArt} from './LivingArt.jsx';
import {Tabletop} from './Tabletop.jsx';
import {stagePoints} from './expeditionScore.js';
import {resolveTurn,spellNames,stages} from './campaign.js';
import './legends.css';
export function Figure({index,className=''}){const extra=index>=12;if(extra)index-=12;return <i aria-hidden="true" className={'legend-figure '+className} style={{backgroundImage:'url('+(extra?eclipse:atlas)+')',backgroundSize:extra?'400% 200%':'400% 300%',backgroundPosition:(index%4)*100/3+'% '+Math.floor(index/4)*(extra?100:50)+'%'}}/>}
export function LegendsBattle({battle:b,setBattle,questions,monster,hero,onBack,retry,advance,settle,busy,error,money}){
 const [mute,setMute]=useState(true),[quiet,setQuiet]=useState(()=>matchMedia('(prefers-reduced-motion:reduce)').matches);
 const q=currentQuestion(b,questions),feedback=b.phase==='feedback'?b.currentFeedback:null,skin=skinById(hero);
 const ended=['victory','defeat','questions-exhausted'].includes(b.phase);
 const action=feedback?(feedback.correct?'strike':'counter'):b.phase;
 const deadline=useRef(0),locked=useRef(false);
 const [seconds,setSeconds]=useState(monster.seconds);
 useLayoutEffect(()=>{if(b.phase==='question'){deadline.current=performance.now()+monster.seconds*1000;locked.current=false;setSeconds(monster.seconds)}},[b.phase,b.questionIndex,b.monsterId,b.order]);
 function choose(id){
  if(locked.current||b.phase!=='question')return;
  const n=resolveTurn(b,q,id,performance.now(),deadline.current);if(n===b)return;
  locked.current=true;playGameSound(n.currentFeedback.correct?'correct':'wrong',mute);setBattle(n)
 }
 useEffect(()=>{if(b.phase!=='question')return;
  const tick=()=>{const left=Math.max(0,Math.ceil((deadline.current-performance.now())/1000));setSeconds(left);if(!left)choose(null)};
  const id=setInterval(tick,120);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(id);document.removeEventListener('visibilitychange',tick)}
 },[b,mute]);
 const spell=feedback?.correct?HERO_SKINS.findIndex(s=>s.id===hero):20+monster.round-1;
 return <section className={'legend-ring '+action+(quiet?' quiet':'')} style={{'--growth':1+(monster.round-1)*.047,'--affinity':(spell*43)%360}} aria-label="Đấu trường">
 <div className="ring-nav"><button onClick={onBack}><ArrowLeft/> Sảnh</button><b>NHẬT THỰC · ẢI {monster.round}/12</b><span/><button aria-label="Âm thanh" aria-pressed={!mute} onClick={()=>setMute(!mute)}>{mute?<VolumeX/>:<Volume2/>}</button><button aria-label="Giảm chuyển động" aria-pressed={quiet} onClick={()=>setQuiet(!quiet)}><Wind/></button></div>
 <div className="ring-field"><div className={"combat-floor region-"+Math.floor((monster.round-1)/4)}><div className="ring-hud"><div><small>{skin.job}</small><b>{skin.name}</b><span aria-label={b.hearts+' tim'}>{Array.from({length:3},(_,i)=><Heart key={i} size={19} fill={i<b.hearts?'#ff657c':'none'}/>)}</span></div><div><small>{monster.rank}</small><b>{monster.name}</b><div className="ring-hp" role="progressbar" aria-label="Máu quái" aria-valuemin={0} aria-valuemax={b.maxHp} aria-valuenow={b.hp}><i style={{width:100*b.hp/b.maxHp+'%'}}/></div><strong>{b.hp} / {b.maxHp} HP</strong></div></div>
 <Tabletop skin={skin} index={HERO_SKINS.indexOf(skin)} round={monster.round} action={action} quiet={quiet}/>
 {feedback&&<output className={'ring-impact '+(feedback.correct?'right':'left')}>{feedback.correct?'−'+feedback.damage+' HP':'−1 ♥'}<small>{spellNames[spell]}</small></output>}
 </div><div className="ring-panel" key={b.questionIndex}>{error&&<p role="alert">{error}</p>}{ended?<><small>KẾT QUẢ TRẬN ĐẤU</small><h2>{b.phase==='victory'?(monster.round===stages.length?'Đã chinh phục Nhật Thực!':'Vượt ải thành công!'):b.phase==='defeat'?'Hết tim!':'Đã hết câu hỏi'}</h2><p>{b.correct} câu đúng · {b.wrong} câu cần ôn · {stagePoints(b)} điểm ải<br/>Tổng đã lưu: {money.points} điểm · {money.available} ★</p>{b.phase==='victory'&&monster.round<stages.length?<button className="ring-primary" onClick={advance}>Sang ải {monster.round+1} <ArrowRight/></button>:<button className="ring-primary" onClick={()=>retry(monster)}><RotateCcw/> Đấu lại</button>}</>:<><header><small>CÂU {b.questionIndex+1} / {b.order.length}</small>{!feedback&&<b className={seconds<=5?'timer urgent':'timer'} role="timer">◷ {seconds} giây</b>}<span>{stagePoints(b)} điểm ải · Chuỗi {b.streak}</span></header>
 {feedback?<><h2>{feedback.correct?'Chính xác!':feedback.timedOut?'Hết giờ!':'Cùng xem lại nhé'}</h2><p aria-live="polite"><b>{q.options.find(o=>o.id===q.correctId)?.label}</b> · {feedback.explanation}</p><button className="ring-primary" disabled={busy} onClick={()=>{const next=nextBattle(b);if(next.phase==='victory')settle(next);else setBattle(next)}}>{b.finish?'Xem kết quả':'Câu tiếp theo'} <ArrowRight/></button></>:<><div className="ring-prompt">{q.visual&&<DeviceIllustration device={q.visual.device}/>}<h2>{q.prompt}</h2></div><div className="ring-answers">{q.options.map((o,i)=><button key={o.id} onClick={()=>choose(o.id)}><b>{'ABCD'[i]}</b>{o.label}</button>)}</div></>}</>}</div></div></section>
}
