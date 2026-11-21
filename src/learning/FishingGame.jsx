import React,{useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Heart,RotateCcw,Trophy,BookOpen,Volume2,VolumeX,Anchor,CheckCircle2} from 'lucide-react';
import {PixelFish,PixelHero} from './PixelArt.jsx';
import {previewDeck} from '../learning/offlineQuiz.js';
import {useQuestionClock} from '../learning/useQuestionClock.js';
import {GameSoundButton,playGameSound} from './BattleScene.jsx';

const colorPool=['blue','orange','pink','gold'];
const sceneDecor=[
 {x:7,y:44,color:'green',delay:0},{x:26,y:66,color:'purple',delay:.8},
 {x:45,y:33,color:'gold',delay:1.2},{x:72,y:58,color:'pink',delay:.2},
 {x:87,y:24,color:'blue',delay:1.8}
];

export function FishingGame({skinId,onBack,profile}){
 const [questions,setQuestions]=useState(()=>previewDeck('lv1-11',profile));
 const [index,setIndex]=useState(0),[hearts,setHearts]=useState(3),[score,setScore]=useState(0);
 const [feedback,setFeedback]=useState(null),[finished,setFinished]=useState(false),[muted,setMuted]=useState(true);
 const q=questions[index];
 const choose=id=>{
  if(!q||feedback||finished)return;
  const correct=id===q.correctId;
  playGameSound(correct?'correct':'wrong',muted);
  setFeedback({id,correct});
  if(correct)setScore(n=>n+1);
  else setHearts(n=>Math.max(0,n-1));
 };
 const clock=useQuestionClock(q,!feedback&&!finished,choose);
 const next=()=>{if(index>=questions.length-1||hearts===0){setFinished(true);return;}setIndex(n=>n+1);setFeedback(null);};
 const reset=()=>{setQuestions(previewDeck('lv1-11',profile));setIndex(0);setHearts(3);setScore(0);setFeedback(null);setFinished(false);};
 return <div className="ic3-fishing-page">
  <div className="ic3-fishing-head">
   <div><button type="button" className="ic3-back" onClick={onBack}><ArrowLeft size={16}/> Trở lại trò chơi vui</button>
    <div className="ic3-fishing-heading"><span>🐠</span><div><h2>Câu cá kiến thức · Level 1 · Bài 11</h2>
     <p>Học về trình duyệt web và Bookmark. Nhấn vào con cá mang câu trả lời đúng!</p></div></div></div>
   <GameSoundButton muted={muted} setMuted={setMuted}/>
  </div>
  <div className="ic3-fishing-stats">
   <span className="ic3-fishing-hearts" aria-label={hearts+' trên 3 tim'}>
    {Array.from({length:3},(_,i)=><Heart key={i} size={24} color={i<hearts?'#e83e60':'#b5b1bb'} fill={i<hearts?'#ff6384':'none'}/>)}</span>
   <span><Trophy size={18}/> Điểm: {score}/{questions.length}</span>
   <span><BookOpen size={18}/> {finished?'Đã kết thúc':`Câu ${index+1}/${questions.length}`}</span>
   <button className="ic3-fish-end" onClick={()=>setFinished(true)} disabled={finished}>Kết thúc & xem kết quả</button>
  </div>
  {!finished&&q?<><div className="ic3-fishing-question"><strong>Câu {index+1}:</strong> {q.prompt} · {clock.seconds} giây</div>
   <div className="ic3-fishing-ocean" aria-label="Hồ cá câu hỏi">
    <div className="ic3-fishing-sun"/><div className="ic3-fishing-coast"/>
    <div className="ic3-fishing-sea"><div className="ic3-fishing-rays"/>
      {Array.from({length:19},(_,i)=><i key={i} className="ic3-fishing-bubble" style={{'--x':(i*41)%96+'%','--delay':((i*3)%9)+'s','--size':(i%3+1)*5+'px'}}/>)}
      {sceneDecor.map((fish,i)=><span aria-hidden="true" key={i} className="ic3-fishing-extra-fish" style={{left:fish.x+'%',top:fish.y+'%','--delay':fish.delay+'s'}}><PixelFish color={fish.color}/></span>)}
      {q.options.map((option,i)=><button key={option.id} type="button" onClick={()=>clock.submit(option.id)}
       disabled={Boolean(feedback)} className={'ic3-fishing-fish ic3-fish-pos-'+i+
       (feedback?.id===option.id?(feedback.correct?' caught':' lost'):'')+
       (feedback&&q.correctId===option.id?' answer':'')}>
       <PixelFish color={colorPool[i]}/>
       <span>{'ABCD'[i]} · {option.label}</span></button>)}
      <div className="ic3-fishing-seabed"><div className="ic3-reef r1">♣</div><div className="ic3-reef r2">♣</div>
        <div className="ic3-reef r3">❋</div><div className="ic3-shell s1">◕</div><div className="ic3-shell s2">◕</div>
       </div>
    </div>
    <div className="ic3-fishing-hero"><PixelHero skinId={skinId}/><span>Ngư dân tri thức</span></div>
    <div className="ic3-fishing-rod" aria-hidden="true"/><div className="ic3-fishing-float" aria-hidden="true"/>
    {feedback?.correct&&<div className="ic3-fishing-splash">+1 ĐIỂM! ✨</div>}
   </div>
   {feedback?<div className={'ic3-fishing-feedback '+(feedback.correct?'right':'wrong')}>
    <div><strong>{feedback.correct?'🎉 Câu đúng! Cá đã mắc câu.':'💡 Chưa đúng, cùng tìm hiểu nhé!'}</strong>
      <p>{q.solution} · {q.explanation}</p><small>Bài 11</small></div>
    <button type="button" className="ic3-main-btn" onClick={next}>{hearts===0||index===questions.length-1?'Xem kết quả':'Câu tiếp theo'} <ArrowRight size={17}/></button>
   </div>:<div className="ic3-fishing-hint">Chọn một đáp án trong 30 giây.</div>}
  </>:<div className="ic3-fishing-complete">
    <Trophy size={52}/><h2>{hearts===0?'Cùng ôn lại bài rồi thử nhé!':'Hoàn thành chuyến đi câu!'}</h2>
    <p>Em đã câu đúng <strong>{score}/{questions.length}</strong> câu.</p>
    <p>Đây là trò chơi học thử. Điểm không cộng vào BXH sao thưởng thật của QLPM.</p>
    <button type="button" className="ic3-main-btn" onClick={reset}><RotateCcw size={18}/> Chơi lại</button>
  </div>}
  <p className="ic3-fishing-source-note">Câu hỏi soạn thử theo slide Bài 11 của giáo viên, đang chờ duyệt nội dung trước khi mở cho học sinh thật.</p>
 </div>;
}
