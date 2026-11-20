import React,{useEffect,useMemo,useRef} from 'react';
import {X,CheckCircle2,Sparkles,ShieldCheck} from 'lucide-react';
import {HERO_SKINS,PixelHero,skinById} from './PixelArt.jsx';

export function HeroPicker({selected,onSelect,onClose}){
 const closeRef=useRef(null);
 useEffect(()=>{
  closeRef.current?.focus();
  const key=e=>{if(e.key==='Escape')onClose();};
  window.addEventListener('keydown',key);
  return ()=>window.removeEventListener('keydown',key);
 },[onClose]);
 return <div className="ic3-picker-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="ic3-picker-modal" role="dialog" aria-modal="true" aria-label="Chọn nhân vật phiêu lưu">
   <div className="ic3-picker-header"><div>
    <span className="ic3-picker-kicker">✨ NHÂN VẬT CỦA EM</span>
    <h2>Chọn người bạn đồng hành</h2>
    <p>12 ngoại hình pixel-art được thiết kế riêng. Tất cả nhân vật đều có sức mạnh học tập ngang nhau.</p>
   </div><button type="button" onClick={onClose} ref={closeRef} className="ic3-picker-close"><X size={19}/> Đóng</button></div>
   <div className="ic3-picker-gallery">
    {HERO_SKINS.map(skin=><button type="button" className={'ic3-picker-card '+(selected===skin.id?'selected':'')}
      aria-pressed={selected===skin.id} key={skin.id} onClick={()=>onSelect(skin.id)}>
      <span className="ic3-picker-sprite"><PixelHero skinId={skin.id}/></span>
      <strong>{skin.name}</strong><span className="ic3-picker-role">{skin.job}</span>
      {selected===skin.id&&<span className="ic3-picker-selected"><CheckCircle2 size={16}/> Đã chọn</span>}
    </button>)}
   </div>
   <div className="ic3-picker-bottom"><span><ShieldCheck size={16}/> Ngoại hình không ảnh hưởng độ khó hoặc điểm thưởng.</span>
    <button type="button" className="ic3-picker-confirm" onClick={onClose}><Sparkles size={18}/> Dùng {skinById(selected).name}</button>
   </div>
  </section>
 </div>;
}
