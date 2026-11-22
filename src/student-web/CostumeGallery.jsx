import React,{useState} from 'react';
import {CheckCircle2,Shirt,Sparkles,Shield,Feather,WandSparkles} from 'lucide-react';
import {HERO_SKINS,PixelHero} from '../learning-arcade/PixelArt.jsx';
import {Tabletop} from '../learning-arcade/Tabletop.jsx';
import './costumeGallery.css';

const CATEGORIES=[
 {key:'all',label:'Tất cả'},
 {key:'warrior',label:'Chiến binh'},
 {key:'archer',label:'Xạ thủ'},
 {key:'mage',label:'Pháp sư'}
];
const ICONS={warrior:Shield,archer:Feather,mage:WandSparkles};
const LABELS={
 astronaut:'Mũ kính & bình dưỡng khí',samurai:'Giáp Kabuto & cặp sừng',bard:'Mũ lông & đàn',
 mechanic:'Kính bảo hộ & bánh răng',witch:'Mũ pháp sư nhọn',
 paladin:'Giáp thánh & hào quang',ninja:'Khăn bịt mặt & đoản đao',
 druid:'Gạc cây & áo choàng lá',pirate:'Mũ thuyền trưởng & ống nhòm',
 cyber:'Kính điện tử & cánh máy',dragon:'Giáp vảy & sừng rồng',
 frost:'Vương miện pha lê băng',royal:'Áo choàng hoàng gia',sky:'Cánh lượn',
 aquatic:'Giáp vây biển',knight:'Mũ hiệp sĩ'
};
export default function CostumeGallery({index=0,busy=false,onSelect}){
 const [filter,setFilter]=useState('all');
 const active=HERO_SKINS[index]||HERO_SKINS[0];
 const matching=HERO_SKINS.map((skin,i)=>({...skin,idx:i}))
   .filter(s=>filter==='all'||s.classId===filter);
 return <div className="cw-costume-page">
  <div className="cw-costume-header">
   <div><small>NHÀ THIẾT KẾ NHÂN VẬT · 32 TRANG PHỤC</small>
    <h1><Shirt size={30}/> Phòng thay trang phục</h1>
    <p>Trang phục khác nhau ở mũ, kiểu áo, giáp, vũ khí và phụ kiện 3D — không chỉ đổi màu. Chọn miễn phí, không làm tăng sát thương.</p>
   </div>
   <div className="cw-costume-count"><Sparkles size={22}/><b>{HERO_SKINS.length}</b><span>nhân vật</span></div>
  </div>
  <div className="cw-costume-layout">
   <aside className="cw-costume-preview">
    <div className="cw-costume-portrait"><Tabletop key={active.id} skin={{...active,gear:0}} index={index} portrait quiet/></div>
    <small>ĐANG MẶC · {active.classId.toUpperCase()}</small>
    <h2>{active.name}</h2>
    <p>{active.job} · {LABELS[active.artStyle]||'Áo giáp phiêu lưu'}</p>
    <span className="cw-costume-free"><CheckCircle2 size={17}/> Tất cả trang phục đã mở · Không tốn sao/điểm</span>
   </aside>
   <section className="cw-costume-chooser">
    <div className="cw-costume-filters" role="group" aria-label="Lọc lớp nhân vật">
     {CATEGORIES.map(cat=><button key={cat.key} type="button"
      aria-pressed={filter===cat.key} onClick={()=>setFilter(cat.key)}>{cat.label}</button>)}
    </div>
    <div className="cw-costume-list">
     {matching.map(s=>{
      const Icon=ICONS[s.classId]||Shield;
      return <button key={s.id} type="button" disabled={busy}
       aria-pressed={index===s.idx} onClick={()=>onSelect(s.idx)}
       className={'cw-costume-option'+(index===s.idx?' chosen':'')}>
       <span className="cw-costume-avatar"><PixelHero skinId={s.id}/></span>
       <span className="cw-costume-copy"><strong>{s.name}</strong>
        <small><Icon size={13}/> {s.job}</small>
        <em>{LABELS[s.artStyle]||'Bộ trang phục phiêu lưu'}</em>
       </span>
       {index===s.idx?<CheckCircle2 size={22} color="#048b71"/>:<Shirt size={20}/>}
      </button>;
     })}
    </div>
   </section>
  </div>
 </div>;
}
