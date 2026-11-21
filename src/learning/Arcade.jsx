import React,{useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Cpu,ArrowLeft,ArrowRight} from 'lucide-react';
import {Battle} from './LearningPrototype.jsx';
import {FishingGame} from './FishingGame.jsx';
import {HardwareBuilder} from './HardwareBuilder.jsx';
import {HeroPicker} from './HeroPicker.jsx';
import {PixelHero,PixelMonster,PixelFish,skinById,DEFAULT_HERO_SKIN} from './PixelArt.jsx';
import {beginBattle} from './battleEngine.js';
import {monsterFor} from './adventureCatalog.js';
import {lessonQuestions} from './questionBank.js';
import './arcade.css';

import {Figure,LegendsBattle} from './Legends.jsx';
import {stages as opponents} from './campaign.js';
import {applyWin,exchange,profileTransaction,shuffledDeck,wallet} from './expeditionScore.js';
const bank=lessonQuestions('lv1-01');
function Arcade(){
 const [scene,setScene]=useState('home'),[hero,setHero]=useState('legend-aurelia');
 const [battle,setBattle]=useState(null),[picker,setPicker]=useState(false);
 const [monster,setMonster]=useState(opponents[0]);
 const [questions,setQuestions]=useState(bank),[student,setStudent]=useState(''),[draft,setDraft]=useState(''),[profile,setProfile]=useState(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const saving=useRef(false);
 async function act(fn){if(saving.current)return;saving.current=true;setBusy(true);setErr('');try{await fn()}catch{setErr('Không lưu được hồ sơ trên trình duyệt. Hãy thử lại.')}finally{saving.current=false;setBusy(false)}}
 function login(e){e.preventDefault();const name=draft.trim().normalize('NFC');if(!name)return;act(async()=>{setProfile(await profileTransaction(name.toLocaleLowerCase('vi')));setStudent(name)})}
 const key=student.toLocaleLowerCase('vi'),unlocked=profile?.stage||0;
 const money=profile&&wallet(profile);
 function settle(win){return act(async()=>{const updated=await profileTransaction(key,p=>applyWin(p,win));setProfile(updated);setBattle(win)})}
 function redeem(){act(async()=>{const id=crypto.randomUUID();const updated=await profileTransaction(key,p=>exchange(p,id));setProfile(updated);setConfirm(false);if(!updated.claims.some(c=>c.id===id))setErr('Số sao hiện tại chưa đủ để đổi quà.')})}
 function advance(){if(battle.phase==='victory'&&monster.round<opponents.length)fight(opponents[monster.round])}
 const home=()=>setScene('home');
 function fight(monster){
  setMonster(monster);
  const deck=shuffledDeck(bank);setQuestions(deck);
  setBattle(beginBattle({lessonId:'lv1-01',monster,questions:deck,hero:skinById(hero).classId}));
  setScene('battle');
 }
 if(scene==='battle')return <LegendsBattle key={monster.id} advance={advance} settle={settle} busy={busy} error={err} money={money} battle={battle} setBattle={setBattle} questions={questions} hero={hero} monster={monster} onBack={home} retry={fight}/>;
 return <div className="ic3-learning-app arcade gallery-home"><header className="arc-nav"><b>IC3 <small>ARCADE</small></b>
 <button onClick={()=>setPicker(true)}>Nhân vật · {skinById(hero).name}</button></header><main>
 {scene==='home'?<><section className="score-desk">{profile?<><div><small>HỒ SƠ NGOẠI TUYẾN</small><strong>{student} · {money.points} điểm · {money.available} ★</strong><span>Mốc kế tiếp {money.next} điểm · Đã đổi {profile.claims.length} quà</span></div><button disabled={busy||money.available<2} onClick={()=>setConfirm(true)}>Đổi 2 ★ lấy 1 quà</button><button disabled={busy} onClick={()=>{setProfile(null);setStudent('');setDraft('');setConfirm(false);setErr('')}}>Đổi học sinh</button>{confirm&&<div><b>Xác nhận dùng 2 sao của {student}?</b><button disabled={busy} onClick={redeem}>Xác nhận đổi</button><button disabled={busy} onClick={()=>setConfirm(false)}>Hủy</button></div>}</>:<form onSubmit={login}><label>Mã học sinh hoặc tên kèm lớp<input required maxLength={64} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Ví dụ: 6.1 – Minh An"/></label><button disabled={busy}>Mở hồ sơ</button></form>}<p>Vượt ải để lưu điểm tốt nhất. Mỗi mốc 600, 1.200, 2.400… tặng 2 sao. Đổi quà được ghi trên máy này.</p>{err&&<p role="alert">{err}</p>}</section><div className="expedition"><div className="exp-copy"><small>IC3 GS6 · CHIẾN DỊCH PHẦN CỨNG</small><h1>Quần đảo Nhật Thực</h1><p>Ải {unlocked+1} / 12 · {opponents[unlocked].name}</p><button disabled={!profile||busy} onClick={()=>fight(opponents[unlocked])}>{unlocked?'Tiếp tục hành trình':'Bắt đầu hành trình'} <ArrowRight size={18}/></button></div>
 <div className="exp-map" aria-label="Bản đồ hành trình"><ol>{[[12,83],[21,71],[29,72],[38,64],[44,52],[53,59],[62,58],[70,53],[78,49],[84,42],[85,32],[87,19]].map(([x,y],i)=><li key={i} title={opponents[i].name} aria-label={'Ải '+(i+1)+' '+opponents[i].name} className={i===unlocked?'active':i<unlocked?'cleared':''} style={{left:x+'%',top:y+'%'}}>{i+1}</li>)}</ol></div></div><h2>Trò chơi luyện tập</h2><div className="arc-games"><button onClick={()=>setScene('fish')}><PixelFish/><span><strong>Câu cá kiến thức</strong><small>Bắt con cá mang đáp án đúng về trình duyệt.</small></span><ArrowRight/></button>
 <button onClick={()=>setScene('hardware')}><Cpu size={52}/><span><strong>Lắp ráp máy tính</strong><small>Chọn linh kiện phù hợp với nhiệm vụ.</small></span><ArrowRight/></button></div></>:
 scene==='fish'?<FishingGame skinId={hero} onBack={home}/>:<HardwareBuilder onBack={home}/>}
 </main>{picker&&<HeroPicker selected={hero} onSelect={setHero} onClose={()=>setPicker(false)}/>}</div>
}
createRoot(document.getElementById('learning-root')).render(<Arcade/>);
