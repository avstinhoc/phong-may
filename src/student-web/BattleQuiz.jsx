import React,{useEffect,useState} from 'react';
import {BookOpen,Clock3,Swords,ArrowUpRight,RefreshCw,ShieldCheck} from 'lucide-react';
import './battleQuiz.css';

const LABELS=['A','B','C','D'];
const validChoices=choices=>Array.isArray(choices)&&choices.length===4
  &&choices.every(x=>typeof x==='string'&&x.trim())
  &&new Set(choices).size===4;

/**
 * Presentation-only classroom quiz. Only passes an existing answer string
 * to the parent Supabase RPC; never infers the correct answer or changes HP.
 */
export default function BattleQuiz({turn,prompt,choices,time,disabled=false,stage,wave,onAnswer,onRefresh}){
 const [selected,setSelected]=useState(null);
 const valid=validChoices(choices);
 useEffect(()=>setSelected(null),[turn]);
 const submit=choice=>{
   if(disabled||selected!==null||!valid||!turn)return;
   setSelected(choice);
   onAnswer(choice);
 };
 useEffect(()=>{
   if(!valid||disabled||!turn||selected!==null)return;
   const onKey=e=>{
     if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
     const node=e.target;
     if(node?.closest?.('input,textarea,select,[contenteditable="true"],button,[role="dialog"]'))return;
     const letter=e.key.toUpperCase();
     const pos=LABELS.indexOf(letter);
     const number=['1','2','3','4'].indexOf(e.key);
     const index=pos>=0?pos:number;
     if(index<0)return;
     e.preventDefault();
     submit(choices[index]);
   };
   window.addEventListener('keydown',onKey);
   return()=>window.removeEventListener('keydown',onKey);
 },[turn,choices,disabled,selected,onAnswer,valid]);
 const seconds=Math.max(0,Math.min(20,Number(time)||0));
 return <div className="battle-question-shell">
   <div className="battle-quiz-heading">
     <div className="battle-quiz-kicker"><span className="battle-quiz-icon"><BookOpen size={18}/></span>
       <div><small>THỬ THÁCH KIẾN THỨC</small><strong>Bài {stage} · Ải {wave}</strong></div>
     </div>
     <div className={'battle-quiz-timer'+(seconds<=5?' is-urgent':'')}
       aria-label={'Còn '+seconds+' giây trả lời'}><Clock3 size={19}/><b>{seconds}</b><span>giây</span></div>
   </div>
   <div className="battle-quiz-time-track" role="progressbar"
     aria-label="Thời gian còn lại" aria-valuemin={0} aria-valuemax={20} aria-valuenow={seconds}>
     <div style={{width:seconds*5+'%'}}/>
   </div>
   <div className="battle-quiz-prompt">
     <div className="battle-quiz-eyebrow"><Swords size={16}/> TRẢ LỜI ĐÚNG ĐỂ TẤN CÔNG</div>
     <h2>{prompt}</h2>
   </div>
   {valid?
     <div className="battle-quiz-answers" role="group" aria-label="Bốn phương án trả lời">
       {choices.map((text,i)=><button type="button" key={LABELS[i]} className={'battle-quiz-answer'+(selected===text?' is-selected':'')}
         disabled={disabled||selected!==null} onClick={()=>submit(text)} aria-label={'Đáp án '+LABELS[i]+': '+text}>
         <span className="battle-quiz-letter">{LABELS[i]}</span>
         <span className="battle-quiz-answer-text">{text}</span>
         <ArrowUpRight className="battle-quiz-arrow" size={19} aria-hidden="true"/>
       </button>)}
     </div>:
     <div className="battle-quiz-invalid" role="alert">
       <p>Câu hỏi chưa đồng bộ đủ 4 đáp án. Không tính lượt trả lời này.</p>
       <button type="button" onClick={onRefresh}><RefreshCw size={16}/> Kiểm tra lại dữ liệu</button>
     </div>}
   <div className="battle-quiz-help"><ShieldCheck size={16}/>
     <span>Chọn đáp án A–D hoặc nhấn phím 1–4. Đúng: tung đòn · Sai: mất 1 tim.</span>
   </div>
 </div>;
}
