import React,{useEffect,useRef,useState} from 'react';
import {supabase} from '../../lib/supabase';
import {HERO_SKINS} from '../../learning-arcade/PixelArt.jsx';
import {Tabletop} from '../../learning-arcade/Tabletop.jsx';
import {lessonTitle} from './Practice.jsx';
import {FishingGame} from '../../learning-arcade/FishingGame.jsx';
import {HardwareBuilder} from '../../learning-arcade/HardwareBuilder.jsx';
const monsters=['Nhện Tinh Thể','Hộ Vệ Ngọc','Tam Xà Hổ Phách','Long Vương Tinh Vân','Sư Ưng Băng','Ngưu Vương Dung Nham','Lan Ma Lục Bảo','Hải Vương Vực Sâu','Bọ Cạp Lôi Thạch','Phượng Hoàng Nhật Viêm','Ma Mút Băng Cổ','Hắc Long Nhật Thực','Sứa Đèn Lồng','Ốc Sên Thiên Thạch','Kình Ngư Sao Băng','Bướm Gương','Nhím Thạch Anh','Rết Đồng Hồ','Cua Thành Cổ','Dơi Nguyệt Thực','Hải Mã San Hô','Xà Vương Cực Quang'];
const places=['Rừng thạch anh','Thành ngọc','Cồn hổ phách','Đỉnh tinh vân','Đèo băng','Lò dung nham','Vườn lục bảo','Rãnh đại dương','Cung sấm','Miệng núi lửa','Thảo nguyên tuyết','Cổng nhật thực','Đầm đèn lồng','Bãi thiên thạch','Biển sao','Hồ gương','Hang pha lê','Xưởng đồng hồ','Pháo đài cát','Tháp trăng','Rạn san hô','Vịnh cực quang'];
const gear=['Tay trần','Găng đồng','Ấn ngọc','Vòng sấm','Bùa tinh vân','Ấn cực quang'];
export default function Campaign({session}){
 const [data,setData]=useState(null),[page,setPage]=useState('home'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[time,setTime]=useState(20),[claim,setClaim]=useState(null);
 const gate=useRef(false),alive=useRef(true),end=useRef(0);
 async function call(action,extra={}){
  if(gate.current)return;gate.current=true;setBusy(true);setError('');
  try{const {data:res,error:err}=await supabase.rpc('ic3_arcade_turn',{p_session_token:session.token,p_action:action,...extra});if(err)throw err;
   if(!alive.current)return;end.current=Date.now()+Date.parse(res.deadline)-Date.parse(res.server_now);setTime(Math.max(0,Math.ceil((end.current-Date.now())/1000))||0);setData(res);if(res.outcome==="redeemed")setClaim(null);
  }catch(e){if(alive.current)setError(e.message||'Mất kết nối. Thử lại để tiếp tục.')}finally{gate.current=false;if(alive.current)setBusy(false)}
 }
 useEffect(()=>{alive.current=true;call('status');return()=>{alive.current=false}},[]);
 useEffect(()=>{if(!data?.turn||page!=='battle'||error)return;const tick=()=>{const left=Math.max(0,Math.ceil((end.current-Date.now())/1000));setTime(left);if(!left)call('answer',{p_turn:data.turn})};const id=setInterval(tick,130);return()=>clearInterval(id)},[data,page,error]);
 const notice=error&&<p role="alert">{error} <button onClick={()=>call('status')}>Kết nối lại</button></p>;
 if(!data)return <section className="campaign-panel">{notice||'Đang mở hồ sơ Săn Sao…'}</section>;
 const skin=HERO_SKINS[data.costume],round=data.stage,foe=monsters[round-1],bg={backgroundImage:'url(/ic3-scenes/map-'+round+'.webp)'};
 const next=()=>{setPage('battle');call('next')};
 if(page==='fish')return <FishingGame skinId={skin.id} onBack={()=>setPage('home')}/>;
 if(page==='hardware')return <HardwareBuilder onBack={()=>setPage('home')}/>;
 return <section className="campaign"><nav><button onClick={()=>setPage('home')}>Sảnh</button> <button onClick={()=>setPage('gear')}>Trang bị</button></nav>{notice}
 {page==='gear'?<section className="campaign-panel"><h2>Trang bị của {session.name}</h2><div className="gear-layout"><div className="gear-preview"><Tabletop skin={skin} index={data.costume} portrait/><span className="gear-slot">{skin.name}</span><span className="gear-slot">{gear[data.gear]}</span></div><div><h3>Túi đồ</h3><div className="bag">{HERO_SKINS.map((s,i)=><button key={s.id} disabled={busy||i>data.cleared} onClick={()=>call('costume',{p_item:i})}>{s.name} · {i>data.cleared?'Qua ải '+i:i===data.costume?'Đang mặc':'Mặc'}</button>)}{gear.map((g,i)=><button key={g} disabled={busy||i*3>data.cleared} onClick={()=>call('gear',{p_item:i})}>{g} · {i*3>data.cleared?'Qua ải '+(i*3):'+'+i*3+' sát thương'}</button>)}</div></div></div></section>:page==='battle'?<div className="campaign-panel"><div className="campaign-hud"><b aria-label={data.hearts+' tim'}>{'❤️'.repeat(data.hearts)}</b><span>{foe} · {data.hp} HP <progress value={data.hp} max={1000+100*round}/></span></div>
 <div className="campaign-field" style={bg}><Tabletop skin={skin} index={data.costume} round={round} action={data.outcome==='correct'?'strike':data.outcome==='wrong'?'counter':'idle'}/></div>
 <small>Ải {round} · {places[round-1]}　|　{data.score} điểm</small>{data.turn?<><p><b>{time} giây</b></p><h2>{data.prompt}</h2><div className="practice-options">{data.choices.map(v=><button key={v} disabled={busy||!!error} onClick={()=>call('answer',{p_turn:data.turn,p_choice:v})}>{v}</button>)}</div></>:<><h2>{{defeat:'Hết tim · bắt đầu lượt sống mới',victory:'Vượt ải thành công!',correct:'Đòn đánh chính xác!',wrong:'Quái vật phản công!'}[data.outcome]||'Sẵn sàng vào trận'}</h2><p>{data.feedback} {data.bonus>0&&'Đã cộng '+data.bonus+' ★ vào sổ sao.'}</p><button disabled={busy} onClick={next}>Tiếp tục →</button></>}</div>:<><header className="campaign-home" style={{backgroundImage:'linear-gradient(90deg,#102e41ee,#102e4199),'+bg.backgroundImage,backgroundSize:'cover'}}><small>QUẦN ĐẢO SĂN SAO　/　ẢI {round} TRÊN 22</small><h1>{places[round-1]}</h1><p>{foe} · {lessonTitle(round)}</p><p>{session.name} · {data.score} điểm lượt sống · {data.wallet.available} ★ khả dụng · {data.wallet.earned} ★ tích lũy</p><button disabled={busy} onClick={next}>Vào đấu trường →</button></header>
 {data.outcome==='redeemed'&&<p role="status">Đã ghi nhận đổi quà. Giáo viên có thể xem trong sổ sao.</p>}{claim?<p>Đổi 2 sao lấy một phần quà? <button disabled={busy} onClick={()=>call('redeem',{p_turn:claim})}>Xác nhận đổi</button> <button disabled={busy} onClick={()=>setClaim(null)}>Hủy</button></p>:<button disabled={busy||data.wallet.available<2} onClick={()=>setClaim(crypto.randomUUID())}>Đổi 2 sao lấy quà</button>}<p>Mỗi câu đúng +10 điểm. Mốc 400 / 800 / 1.600 / 4.200 điểm lần lượt tặng 1 / 1 / 2 / 2 sao. Hết tim sẽ đặt lại điểm của lượt sống.</p><details><summary>Hành trình 22 bản đồ</summary><div className="practice-grid">{places.map((p,i)=><article key={p}><img width="100%" src={'/ic3-scenes/map-'+(i+1)+'.webp'} alt=""/><strong>{i+1}. {p}</strong><p>{monsters[i]} · {i<data.cleared?'Đã vượt':i+1===round?'Đang khám phá':'Chưa mở'}</p></article>)}</div></details><p><button onClick={()=>setPage('fish')}>Câu cá</button> <button onClick={()=>setPage('hardware')}>Lắp ráp máy tính</button></p></>}</section>
}
