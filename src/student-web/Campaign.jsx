import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ChevronRight,Crown,
 Heart,LockKeyhole,Map as MapIcon,Maximize2,Minimize2,Shield,ShoppingBag,Sparkles,
 Star,Swords,Trophy} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {HERO_SKINS} from '../learning-arcade/PixelArt.jsx';
import {Tabletop} from '../learning-arcade/Tabletop.jsx';
import {lessonTitle} from './Practice.jsx';
import {GEAR_CATALOG,WAVES_PER_WORLD,WORLD_MAPS,worldAt,waveAt} from './worldMap.js';
import './campaignWorld.css';

const num=n=>Number.isFinite(Number(n))?Number(n):0;
const maxHearts=3;
const stars=n=>Number(n||0).toLocaleString('vi-VN');
const tint=['','#e4bb79','#76d6be','#94c1fa','#c594e9','#ffe179'];

function ArenaTop({children}){return <div className="cw-section-heading">{children}</div>}

function WorldMap({current,worldId,cleared,wave,select}){
 const world=worldAt(worldId);
 const inWorld=worldId===current;
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
    const at=i+1;
    const done=cleared>=22||worldId<current||inWorld&&at<wave;
    const active=inWorld&&at===wave&&cleared<22;
    return <button type="button" key={entry.name}
     onClick={()=>select(at)} className={'cw-map-pin pin-'+at+(done?' finished':active?' active':'')}
     style={{left:[10,23,37,51,65,79,90][i]+'%',top:[79,66,72,51,56,35,16][i]+'%'}}
     aria-label={'Ải '+at+' '+entry.name+(done?' đã hoàn thành':active?' đang mở':'')}
     title={entry.name}>
     {done?<CheckCircle2 size={19}/>:at===WAVES_PER_WORLD?<Crown size={18}/>:<Swords size={18}/>}
     <span>{at}</span>
    </button>;
   })}
   <span className="cw-world-map-caption"><MapIcon size={15}/> Bản đồ {String(world.id).padStart(2,'0')} / 22</span>
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
 const [time,setTime]=useState(20);
 const [claim,setClaim]=useState(null);
 const [fullscreen,setFullscreen]=useState(false);
 const [fallbackFull,setFallbackFull]=useState(false);
 const gate=useRef(false),alive=useRef(true),end=useRef(0),root=useRef(null);

 async function call(action,extra={}){
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
   if(res.outcome==='redeemed')setClaim(null);
  } catch(e){
   if(alive.current)setError(e.message||'Không tải được dữ liệu trò chơi. Hãy thử lại.');
  } finally {
   gate.current=false;if(alive.current)setBusy(false);
  }
 }
 useEffect(()=>{alive.current=true;void call('status');return()=>{alive.current=false}},[session.token]);
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
 const next=()=>{setView('battle');void call(data?.turn?'status':'next')};
 const feedback=data?.feedback;
 const world=worldAt(data?.stage||1);
 const currentId=num(data?.stage)||1;
 const mapId=selectedMap||currentId;
 const preview=worldAt(mapId);
 const wave=num(data?.wave)||1;
 const previewWave=selectedWave||Math.min(WAVES_PER_WORLD,wave);
 const selectedEncounter=waveAt(mapId,previewWave);
 const selectedActive=mapId===currentId;
 const isComplete=num(data?.cleared)>=22;
 const boss=waveAt(currentId,wave);
 const costumeId=num(data?.costume);
 const skinBase=HERO_SKINS[costumeId]||HERO_SKINS[0];
 const skin={...skinBase,gear:num(data?.gear),trim:tint[num(data?.gear)]||skinBase.trim};
 const hpMax=num(data?.wave_max_hp)||160+95*wave+10*currentId;
 const monsterHp=Math.max(0,num(data?.hp));
 const clearCount=num(data?.cleared);
 const unlockedSkins=Math.min(HERO_SKINS.length,clearCount+1);
 const damage=num(data?.damage)||160+18*num(data?.gear);
 const sceneStyle={backgroundImage:"linear-gradient(180deg,#0b253450,transparent 58%,#0e243956),url('"+world.background+"')"};
 const wallet=data?.wallet||{earned:0,available:0};
 const notice=error&&<div className="cw-error" role="alert">{error} <button onClick={()=>call('status')}>Kết nối lại</button></div>;
 if(!data)return <section className="cw-loading" role="status">{notice||'Đang tải 22 bản đồ Săn Sao...'}</section>;
 const stateLabel={correct:'Đòn đánh chuẩn xác!',wrong:'Quái vật phản công!',
  wave_clear:'Vượt ải! Nhận 1 tim hồi phục.',victory:isComplete?'Đã hoàn thành cả 22 bản đồ!':'Đánh bại trùm cuối!',
  defeat:'Hết 3 tim — thử lại từ ải đầu bản đồ.',redeemed:'Đã gửi yêu cầu đổi quà.'};
 return <section ref={root} className={'campaign cw-game'+(fullscreen||fallbackFull?' cw-immersive':'')}>
  <header className="cw-topbar">
   <div className="cw-title"><span className="cw-title-icon"><Swords size={24}/></span><div>
    <small>IC3 GS6 • CHIẾN DỊCH ÔN TẬP</small><strong>QUẦN ĐẢO SĂN SAO</strong></div></div>
   <div className="cw-top-actions">
    <span className="cw-wallet" title="Sao thưởng được xác nhận bởi máy chủ"><Star size={17} fill="currentColor"/> {stars(wallet.available)} sao</span>
    <button type="button" className={view==='world'?'active':''} onClick={()=>setView('world')}><MapIcon size={17}/> Bản đồ</button>
    <button type="button" className={view==='gear'?'active':''} onClick={()=>setView('gear')}><Shield size={17}/> Trang bị</button>
    <button type="button" onClick={toggleGameFullscreen} title="Mở rộng trò chơi ra toàn màn hình">
     {fullscreen||fallbackFull?<Minimize2 size={17}/>:<Maximize2 size={17}/>}
     {fullscreen||fallbackFull?'Thu nhỏ':'Toàn màn hình'}
    </button>
   </div>
  </header>
  {notice}
  {view==='gear'?<div className="cw-gear-page">
   <ArenaTop><div><small>RƯƠNG ĐỒ CỦA NHÀ THÁM HIỂM</small><h1>Kho trang bị</h1><p>Vượt bản đồ để mở trang phục và sức mạnh. Thay đồ không trừ sao, không mất điểm.</p></div>
    <span className="cw-achievement"><Trophy size={18}/> {clearCount}/22 bản đồ</span></ArenaTop>
   <div className="cw-gear-layout">
    <div className="cw-character-card"><div className="cw-character-preview">
     <Tabletop skin={skin} index={costumeId} portrait quiet/>
    </div>
     <div className="cw-character-legend"><strong>{skinBase.name}</strong><span>{skinBase.job}</span>
      <div><Shield size={16}/> {GEAR_CATALOG[num(data.gear)]?.name}</div>
      <div><Swords size={16}/> {damage} sát thương / câu đúng</div></div>
    </div>
    <div className="cw-gear-inventory">
     <div className="cw-gear-heading"><ShoppingBag size={20}/><h2>Vũ khí & bảo vật</h2><small>6 cấp sức mạnh</small></div>
     <div className="cw-gear-grid">{GEAR_CATALOG.map(g=>{
      const locked=clearCount<g.unlock,active=num(data.gear)===g.id;
      return <button key={g.id} type="button" className={'cw-gear-item'+(active?' equipped':'')}
       disabled={busy||locked} onClick={()=>call('gear',{p_item:g.id})}>
       <span className="cw-gear-emoji" aria-hidden="true">{g.icon}</span><span className="cw-gear-copy">
        <small>{g.grade} · {locked?'Khóa':active?'Đang trang bị':'Đã mở'}</small>
        <strong>{g.name}</strong><span>{g.description}</span>
        <em>{locked?'Mở sau '+g.unlock+' bản đồ':'⚔ '+g.damage+' sát thương'}</em>
       </span>{locked?<LockKeyhole size={18}/>:active?<CheckCircle2 size={20}/>:<ChevronRight size={18}/>}
      </button>})}</div>
     <div className="cw-gear-heading"><Sparkles size={20}/><h2>Trang phục anh hùng</h2><small>{unlockedSkins}/{HERO_SKINS.length} đã mở</small></div>
     <div className="cw-skin-grid">{HERO_SKINS.map((s,i)=>{
      const locked=i>clearCount,active=i===costumeId;
      return <button key={s.id} type="button" disabled={busy||locked}
       onClick={()=>call('costume',{p_item:i})} className={'cw-skin'+(active?' equipped':'')}>
       <span className="cw-skin-emblem">{locked?'🔒':i===costumeId?'👑':'🛡️'}</span>
       <strong>{s.name}</strong>
       <small>{locked?'Mở sau bản đồ '+i:active?'Đang mặc':'Chọn trang phục'}</small>
      </button>})}</div>
    </div>
   </div>
  </div>:view==='battle'?<div className="cw-combat">
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
   <div className={'cw-battle-field'+(data.outcome==='correct'?' cw-hit':'')+(data.outcome==='wrong'?' cw-damage':'')}
     style={sceneStyle}>
    <div className="cw-scene-title">⚔️ {skinBase.name} <span>VS</span> {boss.name}</div>
    <div className="cw-character-aura" aria-hidden="true"/>
    <Tabletop key={currentId+'-'+wave} skin={skin} index={costumeId} round={currentId} wave={wave}
     action={data.outcome==='correct'?'strike':data.outcome==='wrong'?'counter':data.outcome==='victory'?'victory':'idle'}/>
    {data.outcome==='correct'&&<div className="cw-combat-fx cw-slash-fx" aria-hidden="true"><span>✦</span><b>-{damage} HP</b></div>}
    {data.outcome==='wrong'&&<div className="cw-combat-fx cw-heart-fx" aria-hidden="true"><span>✺</span><b>-1 ❤</b></div>}
    {data.outcome==='wave_clear'&&<div className="cw-combat-fx cw-clear-fx" aria-hidden="true"><span>✷</span><b>VƯỢT ẢI!</b></div>}
    <span className="cw-field-badge">Bài {currentId} · {lessonTitle(currentId)}</span>
   </div>
   <div className="cw-fight-question">
    {data.turn?<><div className="cw-question-header"><strong><BookOpen size={17}/> Câu hỏi IC3</strong>
     <span className={time<=5?'cw-clock urgent':'cw-clock'}>⏱ {time} giây</span></div>
     <h2>{data.prompt}</h2>
     <div className="cw-answer-grid">{(data.choices||[]).map((v,i)=>
      <button key={i+'-'+v} type="button" disabled={busy||!!error} onClick={()=>call('answer',{p_turn:data.turn,p_choice:v})}>
       <b>{String.fromCharCode(65+i)}</b><span>{v}</span><ArrowRight size={18}/></button>)}</div></>:
     <div className="cw-combat-result">
      <span className={'cw-result-symbol '+(data.outcome||'idle')}>{data.outcome==='wrong'?'💥':data.outcome==='defeat'?'💔':data.outcome==='wave_clear'?'🏅':'✨'}</span>
      <div><h2>{stateLabel[data.outcome]||'Sẵn sàng bước vào ải!'}</h2>
       <p>{feedback||'Trả lời câu hỏi để nhân vật tấn công quái vật.'}{num(data.bonus)>0?' Thưởng mốc: +'+data.bonus+' sao đã được ghi nhận.':''}</p></div>
      {!isComplete?<button type="button" className="cw-primary" disabled={busy||!!error} onClick={next}>
       {busy?'Đang mở trận…':'Tiếp tục chiến đấu'} <ArrowRight size={19}/></button>:
      <button type="button" className="cw-primary" onClick={()=>setView('world')}>Xem hành trình</button>}
     </div>}
   </div>
   <div className="cw-battle-footer"><button type="button" onClick={()=>setView('world')}><ArrowLeft size={17}/> Bản đồ</button>
    <p>Đúng: tấn công quái · Sai / hết giờ: mất 1 tim · Qua ải: hồi 1 tim · 7 ải = 1 bản đồ</p></div>
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
    <p>Đọc kiến thức, trả lời đúng và hạ bảy quái vật khác nhau để mở vùng đất tiếp theo.</p></div></ArenaTop>
   <div className="cw-world-layout"><WorldMap current={currentId} worldId={mapId} cleared={clearCount}
      wave={wave} select={setSelectedWave}/>
    <div className="cw-wave-panel"><div className="cw-world-progress">
     <small>{selectedActive?'BẢN ĐỒ ĐANG CHINH PHỤC':mapId<currentId?'BẢN ĐỒ ĐÃ HOÀN THÀNH':'BẢN ĐỒ CHƯA MỞ'}</small>
     <strong>{preview.title}</strong><span>{mapId} / 22</span></div>
     <div className="cw-wave-list">{preview.waves.map((m,i)=>{
      const w=i+1,done=isComplete||mapId<currentId||selectedActive&&w<wave;
      const active=selectedActive&&w===wave&&!isComplete;
      return <button type="button" key={m.name} onClick={()=>setSelectedWave(w)}
       className={'cw-wave-row'+(active?' active':'')+(selectedWave===w?' chosen':'')}>
       <span className="cw-wave-step">{done?<CheckCircle2 size={18}/>:w===3?<Crown size={19}/>:w}</span>
       <span><small>ẢI {w} · {m.tier}</small><strong>{m.name}</strong><em>{m.hint}</em></span>
       {done?<CheckCircle2 color="#1cae99" size={20}/>:active?<Swords size={20}/>:<LockKeyhole size={17}/>}
      </button>;
     })}</div>
     <div className="cw-wave-selected"><strong>Đang xem: {selectedEncounter.name}</strong>
      <small>{selectedEncounter.hint}</small></div>
     {selectedActive&&!isComplete?<button type="button" className="cw-primary" disabled={busy||!!error} onClick={next}>
      <Swords size={20}/> {busy?'Đang mở…':data.turn?'Tiếp tục ải '+wave:'Vào ải '+wave+' / 3'} <ArrowRight size={19}/></button>:
      <p className="cw-map-locked">{isComplete?'🎉 Đã chinh phục toàn bộ 22 bản đồ!':
       mapId<currentId?'Bản đồ hoàn thành. Chọn bản đồ đang mở để tiếp tục.':'🔒 Hãy hoàn thành bản đồ '+currentId+' trước.'}</p>}
    </div>
   </div>
   <div className="cw-library-heading"><div><h2>Thư viện 22 bản đồ</h2><p>Mỗi bản đồ là một bài học IC3 riêng biệt</p></div>
    <span>{clearCount} / 22 hoàn thành</span></div>
   <div className="cw-world-library">{WORLD_MAPS.map(m=>{
    const locked=m.id>currentId,done=m.id<currentId||isComplete,selected=mapId===m.id;
    return <button type="button" key={m.id} onClick={()=>{setSelectedMap(m.id);setSelectedWave(null)}}
     className={'cw-world-card'+(selected?' selected':'')+(locked?' locked':'')}>
     <span className="cw-world-image"><img src={m.background} alt="" loading="lazy"/>
      <span className="cw-world-index">{String(m.id).padStart(2,'0')}</span></span>
     <span className="cw-world-card-copy"><strong>{m.title}</strong><small>{m.waves.length} ải · Bài {m.id}</small>
      <em>{done?'✓ Đã chinh phục':locked?'🔒 Chưa mở':'⚔ Đang khám phá'}</em></span>
    </button>})}</div>
   <div className="cw-world-bottom"><div><strong>🏆 Săn Sao bằng kiến thức thật</strong>
    <p>Thưởng 400 / 800 / 1.600 / 4.200 điểm được máy chủ ghi nhận theo tiến trình, không tự cộng khi chỉ bấm xem bản đồ.</p></div>
    {claim?<div><span>Đổi 2 sao lấy quà?</span><button disabled={busy} onClick={()=>call('redeem',{p_turn:claim})}>Xác nhận</button><button onClick={()=>setClaim(null)}>Hủy</button></div>:
    <button disabled={busy||num(wallet.available)<2} onClick={()=>setClaim(crypto.randomUUID())}>Đổi 2 sao lấy quà</button>}
   </div>
  </div>}
 </section>;
}
