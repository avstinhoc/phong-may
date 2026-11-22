import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,Crown,Heart,LockKeyhole,Map as MapIcon,Maximize2,Minimize2,Shield,Shirt,Star,Swords} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {HERO_SKINS} from '../learning-arcade/PixelArt.jsx';
import CostumeGallery from './CostumeGallery.jsx';
import {Tabletop} from '../learning-arcade/Tabletop.jsx';
import {BattleVFX} from './BattleVFX.jsx';
import BattleQuiz from './BattleQuiz.jsx';
import {monsterArt,heroArt} from './battleArt.js';
import {battleTheme,battleBackground} from './battleThemes.js';
import {lessonTitle} from './Practice.jsx';
import {WAVES_PER_WORLD,WORLD_MAPS,worldAt,waveAt,waveUnlocked} from './worldMap.js';
import './campaignWorld.css';
import './battleFX.css';
import './battleCharacter.css';

const num=n=>Number.isFinite(Number(n))?Number(n):0;
const maxHearts=3;
const stars=n=>Number(n||0).toLocaleString('vi-VN');

function ArenaTop({children}){return <div className="cw-section-heading">{children}</div>}

function WorldMap({worldId,completed=[],currentWorld,currentWave,inBattle,select}){
 const world=worldAt(worldId);
 return <div className="cw-map-stack">
  <div className="cw-world-map" aria-label={'Bản đồ '+world.title}>
   <img src={world.background} alt={'Toàn cảnh '+world.title} loading="eager"/>
   <svg className="cw-map-trail" viewBox="0 0 1000 560" aria-hidden="true" preserveAspectRatio="none">
    <path d="M 100 442 C 165 428 178 347 230 370 S 327 417 370 403 S 469 271 510 285 S 611 340 650 314 S 744 191 790 196 S 859 111 900 90"
     fill="none" stroke="#152c31" strokeWidth="14" strokeLinecap="round" strokeDasharray="1 20" opacity=".58"/>
    <path d="M 100 442 C 165 428 178 347 230 370 S 327 417 370 403 S 469 271 510 285 S 611 340 650 314 S 744 191 790 196 S 859 111 900 90"
     fill="none" stroke="#fff4a1" strokeWidth="8" strokeLinecap="round" strokeDasharray="1 19" opacity=".96"/>
   </svg>
   {world.waves.map((entry,i)=>{
    const at=i+1,done=completed.includes(at),
     active=inBattle&&worldId===currentWorld&&at===currentWave;
    const unlocked=waveUnlocked(completed,at,active);
    return <button type="button" key={entry.name} onClick={()=>select(at)}
     disabled={!unlocked}
     className={'cw-map-pin pin-'+at+(done?' finished':active?' active':'')+(!unlocked?' locked':'')}
     style={{left:[10,23,37,51,65,79,90][i]+'%',top:[79,66,72,51,56,35,16][i]+'%'}}
     aria-label={'Ải '+at+' '+entry.name+(done?' · đã chinh phục, chơi lại':unlocked?' · đã mở':' · chưa mở, cần hoàn thành ải '+(at-1))}
     title={unlocked?'Nhấn để '+(done?'chơi lại':'vào')+' ải '+at:'Khóa: hoàn thành ải '+(at-1)+' để mở'}>
     {!unlocked?<LockKeyhole size={19}/>:done?<CheckCircle2 size={19}/>:at===WAVES_PER_WORLD?<Crown size={18}/>:<Swords size={18}/>}
     <span>{at}</span>
    </button>;
   })}
   <span className="cw-world-map-caption"><MapIcon size={15}/> Bản đồ {String(world.id).padStart(2,'0')} / 22 · Vượt ải để mở khóa</span>
  </div>
 </div>;
}

export default function Campaign({session}){
 const [data,setData]=useState(null);
 const [view,setView]=useState('world');
 const [selectedMap,setSelectedMap]=useState(null);
 const [selectedWave,setSelectedWave]=useState(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [time,setTime]=useState(30);
 const [claim,setClaim]=useState(null);
 const [fullscreen,setFullscreen]=useState(false);
 const [fallbackFull,setFallbackFull]=useState(false);
 const [fx,setFx]=useState(null);
 const fxSequence=useRef(0);
 const gate=useRef(false),alive=useRef(true),end=useRef(0),root=useRef(null),mapSection=useRef(null);
 const inBattleRef=useRef(false);
 inBattleRef.current=!!data?.in_battle;

 async function call(action,extra={},nextView=null){
  if(gate.current||!supabase)return;
  gate.current=true;setBusy(true);setError('');
  try {
   const {data:res,error:err}=await supabase.rpc('ic3_arcade_turn',{
    p_session_token:session.token,p_action:action,...extra
   });
   if(err)throw err;
   if(!alive.current)return;
   if(!res||typeof res.stage!=='number')throw Error('Chưa tải được tiến trình trò chơi.');
   const server=Date.parse(res.server_now||'');
   const deadline=Date.parse(res.deadline||'');
   const remain=Number.isFinite(server)&&Number.isFinite(deadline)?Math.max(0,deadline-server):0;
   end.current=Date.now()+remain;setTime(Math.ceil(remain/1000));
   setData(res);
   if(nextView)setView(nextView);
   // Animation is a transient reaction to a server-confirmed answer, never
   // an independent damage or reward calculation in the browser.
   if(action==='answer'&&['correct','wrong','wave_clear','victory','defeat'].includes(res.outcome)){
     setFx({id:++fxSequence.current,kind:res.outcome,damage:num(res.damage)});
   }
   if(res.outcome==='redeemed')setClaim(null);
   return true;
  } catch(e){
   if(alive.current)setError(e.message||'Không tải được dữ liệu trò chơi. Hãy thử lại.');
   return false;
  } finally {
   gate.current=false;if(alive.current)setBusy(false);
  }
 }
 useEffect(()=>{alive.current=true;void call('status');return()=>{
   alive.current=false;
   // Sidebar navigation can unmount this screen without using the internal back button.
   // Best-effort server leave; server action is idempotent and never charges twice.
   if(inBattleRef.current&&supabase){
    void supabase.rpc('ic3_arcade_turn',{p_session_token:session.token,p_action:'leave'});
   }
  }},[session.token]);
 useEffect(()=>{
  const warn=e=>{if(!inBattleRef.current)return;e.preventDefault();e.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[]);
 useEffect(()=>{
  if(!data?.turn||view!=='battle'||error)return;
  const tick=()=>{
   const left=Math.max(0,Math.ceil((end.current-Date.now())/1000));
   setTime(left);
   if(left===0)void call('answer',{p_turn:data.turn});
  };
  const id=setInterval(tick,240);return()=>clearInterval(id);
 },[data?.turn,view,error]);
 useEffect(()=>{
   if(!fx)return;
   const id=setTimeout(()=>setFx(null),1400);
   return()=>clearTimeout(id);
 },[fx?.id]);
 useEffect(()=>{
  const listener=()=>setFullscreen(document.fullscreenElement===root.current);
  document.addEventListener('fullscreenchange',listener);
  return()=>document.removeEventListener('fullscreenchange',listener);
 },[]);
 async function toggleGameFullscreen(){
  if(document.fullscreenElement===root.current){await document.exitFullscreen();return;}
  if(fallbackFull){setFallbackFull(false);return;}
  try{if(!root.current?.requestFullscreen)throw Error('unsupported');await root.current.requestFullscreen();}
  catch{setFallbackFull(true);}
 }
 const next=()=>{setFx(null);if(data?.in_battle)void call(data?.turn?'status':'next',{},'battle');else setView('world')};
 const enterEncounter=async(mapId,waveNumber)=>{
  if(busy)return;
  const finished=data?.map_progress?.[String(mapId)];
  const resuming=!!data?.in_battle&&Number(data?.stage)===mapId&&Number(data?.wave)===waveNumber;
  if(!waveUnlocked(finished,waveNumber,resuming))return;
  const different=data?.in_battle&&(Number(data.stage)!==mapId||Number(data.wave)!==waveNumber);
  if(different&&!window.confirm('Đang trong trận! Chuyển sang ải khác sẽ trừ tối đa 200 điểm chiến đấu (không trừ sao). Tiếp tục?'))return;
  setFx(null);
  const ok=await call('enter',{p_item:mapId*100+waveNumber},'battle');
  if(ok){setSelectedMap(mapId);setSelectedWave(waveNumber)}
 };
 const navigateTo=async(destination)=>{
  if(busy)return;
  if(view==='battle'&&data?.in_battle){
   if(!window.confirm('Rời trận sẽ trừ tối đa 200 điểm chiến đấu, không trừ sao thưởng. Em có muốn thoát?'))return;
   const ok=await call('leave',{},destination);
   if(!ok)return;
  }else setView(destination);
  setFx(null);
 };
 const feedback=data?.feedback;
 const world=worldAt(data?.stage||1);
 const currentId=num(data?.stage)||1;
 const mapId=selectedMap||currentId;
 const preview=worldAt(mapId);
 const wave=num(data?.wave)||1;
 const previewWave=selectedWave||(mapId===currentId?Math.min(WAVES_PER_WORLD,wave):1);
 const selectedEncounter=waveAt(mapId,previewWave);
 const progress=data?.map_progress||{};
 const completedFor=id=>Array.isArray(progress[String(id)])?progress[String(id)]:[];
 const clearCount=WORLD_MAPS.filter(m=>completedFor(m.id).length===7).length;
 const isComplete=clearCount===22;
 const boss=waveAt(currentId,wave);
 const costumeId=num(data?.costume);
 const skinBase=HERO_SKINS[costumeId]||HERO_SKINS[0];
 const skin={...skinBase,gear:0};
 const opponentArt=monsterArt(currentId,num(data?.wave)||1);
 const championArt=heroArt(skin,num(data?.gear));
 const hpMax=num(data?.wave_max_hp)||160+95*wave+10*currentId;
 const monsterHp=Math.max(0,num(data?.hp));
 const theme=battleTheme(currentId);
 const sceneStyle={
   backgroundImage:"linear-gradient(180deg,#09192c28,transparent 60%,#081f2650),url('"+battleBackground(currentId)+"')",
   '--cw-light':theme.light,'--cw-accent':theme.accent,'--cw-shadow':theme.shadow
 };
 const wallet=data?.wallet||{earned:0,available:0};
 const notice=error&&<div className="cw-error" role="alert">{error} <button onClick={()=>call('status')}>Kết nối lại</button></div>;
 if(!data)return <section className="cw-loading" role="status">{notice||'Đang tải 22 bản đồ Săn Sao...'}</section>;
 const stateLabel={correct:'Đòn đánh chuẩn xác!',wrong:'Quái vật phản công!',
  wave_clear:'Vượt ải! Nhận 1 tim hồi phục.',victory:isComplete?'Đã hoàn thành cả 22 bản đồ!':'Đánh bại trùm cuối!',
  defeat:'Hết 3 tim — mất toàn bộ điểm chiến đấu! Có thể chơi lại ải này.',redeemed:'Đã gửi yêu cầu đổi quà.'};
 return <section ref={root} className={'campaign cw-game'+(fullscreen||fallbackFull?' cw-immersive':'')}>
  <header className="cw-topbar">
   <div className="cw-title"><span className="cw-title-icon"><Swords size={24}/></span><div>
    <small>IC3 GS6 • CHIẾN DỊCH ÔN TẬP</small><strong>QUẦN ĐẢO SĂN SAO</strong></div></div>
   <div className="cw-top-actions">
    <span className="cw-wallet" title="Sao thưởng được xác nhận bởi máy chủ"><Star size={17} fill="currentColor"/> {stars(wallet.available)} sao</span>
    <button type="button" className={view==='world'?'active':''} onClick={()=>navigateTo('world')}><MapIcon size={17}/> Bản đồ</button>
    <button type="button" className={view==='costumes'?'active':''} onClick={()=>navigateTo('costumes')}><Shirt size={17}/> Trang phục</button>
    <button type="button" onClick={toggleGameFullscreen} title="Mở rộng trò chơi ra toàn màn hình">
     {fullscreen||fallbackFull?<Minimize2 size={17}/>:<Maximize2 size={17}/>}
     {fullscreen||fallbackFull?'Thu nhỏ':'Toàn màn hình'}
    </button>
   </div>
  </header>
  {notice}
  {view==='costumes'?<CostumeGallery index={costumeId} busy={busy} onSelect={id=>call('costume',{p_item:id})}/>:view==='battle'?<div className="cw-combat">
   <div className="cw-fight-top">
    <div><small>BẢN ĐỒ {String(currentId).padStart(2,'0')} / 22 · ẢI {wave} / {WAVES_PER_WORLD}</small><h1>{world.title}</h1>
     <p>{boss.name} · {boss.tier}</p></div>
    <div className="cw-hearts" aria-label={'Còn '+num(data.hearts)+' tim'}>
     {Array.from({length:maxHearts},(_,i)=><Heart key={i} size={25} fill={i<num(data.hearts)?'#f85a71':'#233445'} color={i<num(data.hearts)?'#ff8392':'#556877'}/>)}
     <span>{data.score} điểm</span>
    </div>
   </div>
   <div className="cw-hp-panel">
    <div><strong><Crown size={18}/> {boss.name}</strong><span>{monsterHp} / {hpMax} HP</span></div>
    <progress aria-label="Sinh lực quái vật" value={Math.min(hpMax,monsterHp)} max={hpMax}/>
   </div>
   <div className={'cw-battle-field'+(fx?.kind==='correct'||fx?.kind==='wave_clear'||fx?.kind==='victory'?' cw-stage-hit':'')+(fx?.kind==='wrong'||fx?.kind==='defeat'?' cw-stage-hurt':'')}
     style={sceneStyle} data-weather={theme.weather} data-hero-class={championArt.classId} data-enemy-type={opponentArt.kind}>
    <div className="cw-depth cw-depth-distant" aria-hidden="true"/>
    <div className="cw-depth cw-depth-atmosphere" aria-hidden="true"/>
    <div className="cw-scene-lights" aria-hidden="true"/>
    <div className="cw-scene-title">
      <span className="cw-battle-hero-name"><Shield size={16}/> {skinBase.name}<small>{skinBase.job} · {skinBase.artStyle||'Trang phục đặc biệt'}</small></span>
      <span className="cw-battle-vs">VS</span>
      <span className="cw-battle-monster-name"><Swords size={16}/> {boss.name}<small>{boss.tier} · {opponentArt.kind}</small></span>
    </div>
    <div className="cw-character-aura" aria-hidden="true"/>
    <Tabletop key={currentId+'-'+wave} skin={skin} index={costumeId} round={currentId} wave={wave}
     action={fx?.kind==='correct'||fx?.kind==='wave_clear'||fx?.kind==='victory'?'strike':fx?.kind==='wrong'||fx?.kind==='defeat'?'counter':'idle'}/>
    <div className="cw-depth cw-depth-foreground" aria-hidden="true"/>
    <BattleVFX key={fx?.id||'idle'} event={fx}/>
    <span className="cw-field-badge">Bài {currentId} · {lessonTitle(currentId)}</span>
   </div>
   <div className="cw-fight-question">
    {data.turn?<BattleQuiz key={data.turn} turn={data.turn} prompt={data.prompt} media={data.media} choices={data.choices}
     time={time} disabled={busy||!!error} stage={currentId} wave={wave}
     onAnswer={choice=>call('answer',{p_turn:data.turn,p_choice:choice})}
     onRefresh={()=>call('status')}/>:
     <div className="cw-combat-result">
      <span className={'cw-result-symbol '+(data.outcome||'idle')}>{data.outcome==='wrong'?'💥':data.outcome==='defeat'?'💔':data.outcome==='wave_clear'?'🏅':'✨'}</span>
      <div><h2>{stateLabel[data.outcome]||'Sẵn sàng bước vào ải!'}</h2>
       <p>{data.review&&<strong>Đáp án đúng · {data.review.solution}<br/></strong>}{feedback||'Trả lời câu hỏi để nhân vật tấn công quái vật.'}{num(data.bonus)>0?' Thưởng mốc: +'+data.bonus+' sao đã được ghi nhận.':''}</p>{data.review&&<small>{data.review.media_title&&data.review.media_title+' · '}Bài {data.review.lesson} {data.review.media_title&&<a href="/ic3-media/credits.json" target="_blank" rel="noreferrer">Nguồn ảnh</a>}</small>}{data.outcome==='set_complete'&&<p>Em đã gặp hết câu hỏi của lượt này. Tiếp tục để mở lượt ôn mới.</p>}</div>
      {data.in_battle?<button type="button" className="cw-primary" disabled={busy||!!error||!!fx} onClick={next}>
       {busy?'Đang mở trận…':'Tiếp tục chiến đấu'} <ArrowRight size={19}/></button>:
      <button type="button" className="cw-primary" onClick={()=>navigateTo('world')}>Xem bản đồ</button>}
     </div>}
   </div>
   <div className="cw-battle-footer"><button type="button" onClick={()=>navigateTo('world')}><ArrowLeft size={17}/> Rời trận về bản đồ</button>
    <p>Đúng: +10 điểm và tấn công · Sai: mất 1 tim · Rời trận: −200 điểm · Hết tim: 0 điểm · Sao QLPM không bị trừ</p></div>
  </div>:<div className="cw-world">
   <div className="cw-world-banner" style={{backgroundImage:"linear-gradient(105deg,#081b2bf0,#113b4fca 52%,#1237461c),url('"+preview.background+"')"}}>
    <div><small>HÀNH TRÌNH 22 VÙNG ĐẤT · 154 ẢI</small><h1>{preview.title}</h1>
     <p>Bài {preview.id}: {lessonTitle(preview.id)}</p>
     <div className="cw-world-tags"><span><MapIcon size={16}/> {Math.min(clearCount,22)} / 22 bản đồ</span>
      <span><Swords size={16}/> 7 ải mỗi bản đồ</span><span><Star size={16}/> {stars(wallet.earned)} sao tích lũy</span></div>
    </div>
    <div className="cw-banner-boss" aria-hidden="true"><span>🐉</span><small>THỬ THÁCH CUỐI</small></div>
   </div>
   <ArenaTop><div><small>BẢN ĐỒ PHIÊU LƯU</small><h2>Khám phá từng ải</h2>
    <p>Cả 22 bản đồ đều mở. Mỗi bản đồ bắt đầu từ ải 1, thắng ải trước mới mở ải tiếp theo. Ải đã qua có thể chơi lại.</p></div></ArenaTop>
   <div className="cw-world-layout" ref={mapSection}><WorldMap worldId={mapId} completed={completedFor(mapId)}
      currentWorld={currentId} currentWave={wave} inBattle={!!data.in_battle} select={selected=>enterEncounter(mapId,selected)}/>
    <div className="cw-wave-panel"><div className="cw-world-progress">
     <small>{completedFor(mapId).length===7?'HOÀN THÀNH · CÓ THỂ CHƠI LẠI':'BẢN ĐỒ ĐÃ MỞ · CHINH PHỤC THEO THỨ TỰ'}</small>
     <strong>{preview.title}</strong><span>{mapId} / 22</span></div>
     <div className="cw-wave-list">{preview.waves.map((m,i)=>{
      const w=i+1,done=completedFor(mapId).includes(w);
      const active=!!data.in_battle&&mapId===currentId&&w===wave;
      const unlocked=waveUnlocked(completedFor(mapId),w,active);
      return <button type="button" key={m.name} onClick={()=>setSelectedWave(w)}
       disabled={!unlocked}
       aria-label={'Ải '+w+' '+m.name+(unlocked?' đã mở':' chưa mở')}
       className={'cw-wave-row'+(active?' active':'')+(selectedWave===w?' chosen':'')+(!unlocked?' locked':'')}>
       <span className="cw-wave-step">{!unlocked?<LockKeyhole size={18}/>:done?<CheckCircle2 size={18}/>:w===WAVES_PER_WORLD?<Crown size={19}/>:w}</span>
       <span><small>ẢI {w} · {m.tier}</small><strong>{m.name}</strong>
        <em>{!unlocked?'Hoàn thành ải '+(w-1)+' để mở':done?'Đã chinh phục · có thể chơi lại':m.hint}</em></span>
       {!unlocked?<LockKeyhole size={18}/>:done?<CheckCircle2 color="#1cae99" size={20}/>:<Swords size={19}/>}
      </button>;
     })}</div>
     <div className="cw-wave-selected"><strong>Đang xem: {selectedEncounter.name}</strong>
      <small>{selectedEncounter.hint}</small></div>
     <button type="button" className="cw-primary" disabled={busy||!!error||!waveUnlocked(completedFor(mapId),previewWave,!!data.in_battle&&mapId===currentId&&previewWave===wave)} onClick={()=>enterEncounter(mapId,previewWave)}>
      <Swords size={20}/> {busy?'Đang mở…':!waveUnlocked(completedFor(mapId),previewWave,!!data.in_battle&&mapId===currentId&&previewWave===wave)?'Ải '+previewWave+' chưa mở':completedFor(mapId).includes(previewWave)?'Chơi lại ải '+previewWave:'Vào ải '+previewWave} <ArrowRight size={19}/></button>
     <p className="cw-risk-note">Rời trận: −200 điểm chiến đấu · Hết 3 tim: về 0 điểm · Không trừ sao hay thưởng giáo viên.</p>
    </div>
   </div>
   <div className="cw-library-heading"><div><h2>Thư viện 22 bản đồ</h2><p>Mỗi bản đồ là một bài học IC3 riêng biệt</p></div>
    <span>{clearCount} / 22 hoàn thành</span></div>
   <div className="cw-world-library">{WORLD_MAPS.map(m=>{
    const done=completedFor(m.id).length===7,doneCount=completedFor(m.id).length,selected=mapId===m.id;
    return <button type="button" key={m.id} onClick={()=>{
      setSelectedMap(m.id);setSelectedWave(null);
      mapSection.current?.scrollIntoView({behavior:'smooth',block:'start'});
     }}
     className={'cw-world-card'+(selected?' selected':'')}>
     <span className="cw-world-image"><img src={m.background} alt="" loading="lazy"/>
      <span className="cw-world-index">{String(m.id).padStart(2,'0')}</span></span>
     <span className="cw-world-card-copy"><strong>{m.title}</strong><small>{m.waves.length} ải · Bài {m.id}</small>
      <em>{done?'✓ Hoàn thành · Chơi lại':doneCount?'⚔ Đã qua '+doneCount+'/7 ải':'✓ Đã mở · Bắt đầu khám phá'}</em></span>
    </button>})}</div>
   <div className="cw-world-bottom"><div><strong>🏆 Săn Sao bằng kiến thức thật</strong>
    <p>Thưởng mốc 400 / 800 / 1.600 / 4.200 điểm chỉ nhận sao một lần; chơi lại không tạo thêm sao. Điểm chiến đấu khác với sao thưởng QLPM.</p></div>
    {claim?<div><span>Đổi 2 sao lấy quà?</span><button disabled={busy} onClick={()=>call('redeem',{p_turn:claim})}>Xác nhận</button><button onClick={()=>setClaim(null)}>Hủy</button></div>:
    <button disabled={busy||num(wallet.available)<2} onClick={()=>setClaim(crypto.randomUUID())}>Đổi 2 sao lấy quà</button>}
   </div>
  </div>}
 </section>;
}
