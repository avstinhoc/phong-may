import React,{useState} from 'react';
import {RotateCcw,ArrowLeft,CheckCircle2,Info} from 'lucide-react';
import {HARDWARE_SLOTS,HARDWARE_PARTS,evaluateHardwareChoice} from './hardwareGameRules.js';

// Interactive click-based (keyboard-accessible) assembly prototype.
// Facts trace to teacher-provided Lesson 1 slides 4, 5, 6 and 11.
// This exercise is a learning draft, not a scored/certified IC3 exam.
export function HardwareBuilder({onBack}){
 const [placed,setPlaced]=useState({});
 const [active,setActive]=useState(HARDWARE_SLOTS[0].id);
 const [feedback,setFeedback]=useState(null);
 const completed=Object.keys(placed).length===HARDWARE_SLOTS.length;
 const slot=HARDWARE_SLOTS.find(x=>x.id===active)||HARDWARE_SLOTS[0];
 const choosePart=partId=>{
  if(completed||placed[active])return;
  const correct=evaluateHardwareChoice(active,partId);
  setFeedback({correct,partId,slotId:active,message:correct?slot.explanation:
   'Chưa đúng chức năng. Hãy đọc kỹ yêu cầu của ô lắp ráp, chọn linh kiện phù hợp rồi thử lại.'});
  if(correct){
   const newPlaced={...placed,[active]:partId};
   setPlaced(newPlaced);
   const next=HARDWARE_SLOTS.find(s=>!newPlaced[s.id]);
   if(next)setActive(next.id);
  }
 };
 const reset=()=>{setPlaced({});setActive(HARDWARE_SLOTS[0].id);setFeedback(null)};
 return <section className="ic3-panel ic3-hardware">
  <button type="button" className="ic3-back" onClick={onBack}><ArrowLeft size={16}/> Trở lại thư viện trò chơi</button>
  <h2>🔧 Hardware Builder – Lắp ráp phần cứng</h2>
  <p>Chọn một ô chức năng trên bo mạch, rồi chọn linh kiện đúng ở phía dưới. Không giới hạn thời gian.</p>
  <p className="ic3-warning"><Info size={16}/> Mô hình minh họa khái niệm, không hướng dẫn lắp đặt thực tế hay tương thích phần cứng.</p>
  <div className="ic3-hardware-board" aria-label="Bảng chức năng linh kiện">
   {HARDWARE_SLOTS.map(s=><button key={s.id} type="button"
    disabled={Boolean(placed[s.id])}
    className={'ic3-hardware-slot '+(active===s.id&&!completed?'active ':'')+(placed[s.id]?'placed':'')}
    onClick={()=>{setActive(s.id);setFeedback(null);}}>
    <strong>{placed[s.id]?<><CheckCircle2 size={16}/> {HARDWARE_PARTS.find(x=>x.id===placed[s.id])?.label}</>:s.label}</strong>
    <span>{s.hint}</span>
   </button>)}
  </div>
  <h3>{completed?'Bạn đã hoàn thành bản lắp ráp!':`Đang chọn: ${slot.label}`}</h3>
  {!completed?<div className="ic3-hardware-parts">{HARDWARE_PARTS.map(part=>
   <button type="button" key={part.id} disabled={Object.values(placed).includes(part.id)}
    onClick={()=>choosePart(part.id)}><span>{part.symbol}</span><strong>{part.label}</strong></button>)}</div>:
    <p className="ic3-explanation good">✓ Giỏi lắm! Bạn đã phân biệt đúng CPU, RAM, SSD và GPU. Đây là thành tích của lượt chơi thử, chưa đồng bộ với tài khoản QLPM.</p>}
  {feedback&&!completed&&<div className={'ic3-explanation '+(feedback.correct?'good':'review')}>
   <strong>{feedback.correct?'✓ Lắp đúng linh kiện!':'↻ Cần thử lại'}</strong><p>{feedback.message}</p>
  </div>}
  <button type="button" className="ic3-main-btn" onClick={reset}><RotateCcw size={17}/> Lắp lại từ đầu</button>
 </section>;
}
