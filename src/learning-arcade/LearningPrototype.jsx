import React,{useMemo,useState} from 'react';
import {BookOpen,ClipboardList,Swords,Trophy,LockKeyhole,ExternalLink,ArrowLeft,ArrowRight,Play,RotateCcw,Heart,Shield,Volume2,VolumeX,Info,Monitor,UserRound,CheckCircle2,AlertTriangle,ChevronRight,Target,Medal} from 'lucide-react';
import {LEVEL_1_LESSONS,LEVELS,lessonById} from './curriculum.js';
import {PROTOTYPE_QUESTIONS,lessonQuestions} from './questionBank.js';
import {BALANCE,HERO_STYLES,MONSTERS,MINI_GAMES,monsterFor,WORLDS,EQUIPMENT_SLOTS} from './adventureCatalog.js';
import {beginBattle,currentQuestion,answerBattle,nextBattle,missedQuestions,learningStarRating} from './battleEngine.js';
import {DeviceIllustration} from './DeviceIllustration.jsx';
import {HardwareBuilder} from './HardwareBuilder.jsx';
import {PixelHero,skinById,HERO_SKINS,DEFAULT_HERO_SKIN} from './PixelArt.jsx';
import {HeroPicker} from './HeroPicker.jsx';
import {BattleScene,playGameSound} from './BattleScene.jsx';
import {FishingGame} from './FishingGame.jsx';
import './gameVisuals.css';
import './learning.css';

const statuses={
 'source-linked':'Có tài liệu',reduced:'Giảm tải','missing-source':'Thiếu tài liệu'
};
const safeName=(n)=>String(n).padStart(2,'0');
function Header({section,onSection}){
 return <header className="ic3-head">
  <a href="#ic3-home" className="ic3-logo"><span className="ic3-brand-icon">◈</span><span><strong>QLPM Student</strong><small>Học tập IC3 GS6 · bản thử nghiệm độc lập</small></span></a>
  <nav aria-label="Danh mục học tập">
   <button type="button" className={section==='lessons'?'active':''} onClick={()=>onSection('lessons')}><BookOpen size={18}/> Bài giảng</button>
   <button type="button" className={section==='exercises'?'active':''} onClick={()=>onSection('exercises')}><ClipboardList size={18}/> Bài tập</button>
  </nav>
  <span className="ic3-preview-label"><Shield size={15}/> Dữ liệu mẫu · Không lưu lên Supabase</span>
 </header>;
}
function LessonTiles({selected,onChoose,mode='lessons'}){
 return <div className="ic3-lesson-grid">
 {LEVEL_1_LESSONS.map(lesson=>{
  const available=lesson.status==='source-linked';
  const qCount=lessonQuestions(lesson.id).length;
  const open=mode==='lessons'?available:mode==='questions'?qCount>0:lesson.number===1;
  const selectedClass=selected===lesson.id?' is-selected':'';
  return <button key={lesson.id} type="button" disabled={!open}
   className={'ic3-lesson-card'+selectedClass+(open?'':' is-locked')} onClick={()=>onChoose(lesson.id)}>
    <span className="ic3-lesson-index">{safeName(lesson.number)}</span>
    <strong>Bài {lesson.number}</strong>
    <span>{lesson.title}</span>
    <small>{!available?statuses[lesson.status]:mode==='lessons'
     ?(lesson.number===2?'Slide 1–16':lesson.number===3?'Slide 17–37':statuses[lesson.status])
     :mode==='questions'?(qCount?`${qCount} câu cần giáo viên duyệt`:'Chưa có câu hỏi đã duyệt')
     :lesson.number===1?'Vòng 1 thử nghiệm':'Chờ phê duyệt câu hỏi'}</small>
    {!open&&<LockKeyhole size={15} className="ic3-lock"/>}
  </button>;
 })}
 </div>;
}
function LessonViewer({lesson}){
 const [reloadKey,setReloadKey]=useState(0);
 if(!lesson?.previewUrl)return <p className="ic3-note">Bài này chưa có tệp trình chiếu để mở.</p>;
 return <article className="ic3-viewer">
  <div className="ic3-viewer-bar">
   <div><h3>Bài {lesson.number}: {lesson.title}</h3>
    <p>{lesson.number===3
      ?'Bài 3 bắt đầu từ slide 17 của bộ Bài 2–3. Trình xem Google Drive có thể mở ở slide 1; hãy chuyển đến slide 17.'
      :lesson.number===2?'Bài 2 nằm ở slide 1–16 trong bộ Bài 2–3 dùng chung.':'Dùng các nút chuyển trang bên trong trình xem Google Drive.'}</p>
   </div>
   <a href={lesson.sourceUrl} target="_blank" rel="noreferrer noopener"><ExternalLink size={16}/> Mở file gốc</a>
  </div>
  <div className="ic3-slide-frame"><iframe key={lesson.id+'-'+reloadKey} src={lesson.previewUrl}
    title={'Slide bài '+lesson.number} allowFullScreen loading="lazy"/></div>
  <div className="ic3-viewer-foot">
   <span>Trình chiếu qua Google Drive; cần quyền truy cập file và Internet. Định dạng PPSX có thể không hỗ trợ mọi hiệu ứng/âm thanh.</span>
   <button onClick={()=>setReloadKey(x=>x+1)}><RotateCcw size={15}/> Tải lại</button>
  </div>
 </article>;
}
function QuestionCard({question,selected,onSelect,showAnswer,questionIndex,total}){
 if(!question)return null;
 return <div className="ic3-question-card">
  <div className="ic3-question-eyebrow"><span>Câu {questionIndex+1}/{total}</span><span>Slide nguồn: {question.sourceSlides.join(', ')}</span></div>
  <h3>{question.prompt}</h3>
  {question.visual&&<DeviceIllustration device={question.visual.device}/>}
  <div className="ic3-options">
   {question.options.map((option,i)=>{
    const isCorrect=option.id===question.correctId;
    let cls='ic3-option'+(selected===option.id?' selected':'');
    if(showAnswer&&isCorrect)cls+=' correct';
    if(showAnswer&&selected===option.id&&!isCorrect)cls+=' incorrect';
    return <button type="button" key={option.id} className={cls} disabled={showAnswer}
      onClick={()=>onSelect(option.id)}><span className="ic3-option-letter">{String.fromCharCode(65+i)}</span>{option.label}</button>;
   })}
  </div>
  {showAnswer&&<div className={'ic3-explanation '+(selected===question.correctId?'good':'review')}>
   <strong>{selected===question.correctId?'✓ Chính xác!':'↻ Mình cùng ôn lại nhé!'}</strong>
   <p>{question.explanation}</p>
  </div>}
 </div>;
}
function Quiz({lesson,questions}){
 const [index,setIndex]=useState(0),[selected,setSelected]=useState(null),[answers,setAnswers]=useState([]);
 const done=index>=questions.length;
 const current=questions[index];
 const choose=id=>{if(selected!==null)return;setSelected(id);setAnswers(old=>[...old,{questionId:current.id,choice:id,correct:id===current.correctId}]);};
 const next=()=>{setSelected(null);setIndex(x=>x+1);};
 const restart=()=>{setIndex(0);setSelected(null);setAnswers([]);};
 return <section className="ic3-panel">
  <div className="ic3-panel-title"><h2>Câu hỏi · Bài {lesson.number}</h2><p>Ôn tập kiểu Quizizz/Wayground, không giới hạn thời gian.</p></div>
  <p className="ic3-warning"><AlertTriangle size={17}/> Bộ câu hỏi được biên soạn từ slide và đang chờ giáo viên duyệt, chưa phải đề IC3 chính thức; kết quả chỉ lưu trong phiên xem thử.</p>
  {done?<div className="ic3-finish">
   <Trophy size={50}/><h2>Hoàn thành lượt ôn tập!</h2>
   <p>Bạn làm đúng <strong>{answers.filter(x=>x.correct).length}/{questions.length}</strong> câu.</p>
   <button className="ic3-main-btn" onClick={restart}><RotateCcw size={18}/> Luyện lại</button>
  </div>:<>
   <div className="ic3-progress"><span style={{width:`${Math.round(index/questions.length*100)}%`}}/></div>
   <QuestionCard question={current} selected={selected} showAnswer={selected!==null} onSelect={choose} questionIndex={index} total={questions.length}/>
   {selected!==null&&<button className="ic3-main-btn" onClick={next}>{index===questions.length-1?'Xem kết quả':'Câu tiếp theo'} <ArrowRight size={17}/></button>}
  </>}
 </section>;
}
export function Battle({battle,setBattle,questions,skinId,monster}){
 const [muted,setMuted]=useState(true);
 const [lowMotion,setLowMotion]=useState(false);
 const question=currentQuestion(battle,questions);
 const answer=id=>{
  const next=answerBattle(battle,question,id);
  if(next===battle)return;
  playGameSound(next.currentFeedback.correct?'correct':'wrong',muted);
  setBattle(next);
 };
 const next=()=>setBattle(old=>nextBattle(old));
 const retry=()=>setBattle(beginBattle({lessonId:monster.lessonId,monster,questions,hero:skinById(skinId).classId}));
 return <div className="ic3-battle-layout ic3-battle-polished">
  <BattleScene battle={battle} monster={monster} skinId={skinId}
   muted={muted} setMuted={setMuted} lowMotion={lowMotion} setLowMotion={setLowMotion}/>
  {battle.phase==='question'||battle.phase==='feedback'?<div className="ic3-battle-question">
   <QuestionCard question={question}
    selected={battle.currentFeedback?.selectedId??null}
    showAnswer={battle.phase==='feedback'}
    onSelect={answer}
    questionIndex={battle.questionIndex} total={battle.order.length}/>
   {battle.phase==='feedback'&&<div className="ic3-battle-result">
    <strong>{battle.currentFeedback.correct?`⚔️ Đánh trúng! Quái vật mất ${battle.currentFeedback.damage} HP`:
      battle.currentFeedback.shieldConsumed?'🛡️ Khiên chắn đã bảo vệ bạn!':'💔 Quái vật phản công: mất 1 tim'}</strong>
    <button className="ic3-main-btn" onClick={next}>{battle.finish?'Xem kết quả trận đấu':'Câu tiếp theo'} <ChevronRight size={17}/></button>
   </div>}
  </div>:<div className="ic3-finish ic3-panel">
   {battle.phase==='victory'?<><Trophy size={46}/><h2>Chiến thắng vòng {monster.round}! 🎉</h2>
    <p>Hoàn thành với {battle.correct} câu đúng, {battle.wrong} câu cần ôn.</p>
    <p>Đánh giá lượt thử: {'⭐'.repeat(learningStarRating(battle))}. Không cộng vào sao thưởng QLPM.</p>
   </>:battle.phase==='defeat'?<><Heart size={46}/><h2>Đừng bỏ cuộc!</h2>
    <p>Em có thể ôn lại câu sai và quay lại thử thách.</p>
   </>:<><Info size={46}/><h2>Chưa đủ câu hỏi</h2><p>Đã dùng hết câu hỏi hiện có. Không tự tạo câu hỏi hoặc tính thắng.</p></>}
   {missedQuestions(battle).length>0&&<p>Câu cần xem lại: {missedQuestions(battle).join(', ')}</p>}
   <button className="ic3-main-btn" onClick={retry}><RotateCcw size={18}/> Chơi lại vòng {monster.round}</button>
  </div>}
 </div>;
}
function Adventure({selectedLesson,setSelectedLesson,heroSkin,onOpenPicker,battle,setBattle}){
 const lesson=lessonById(selectedLesson);
 const heroData=skinById(heroSkin);
 const monster=monsterFor('lv1-01',1);
 const start=()=>setBattle(beginBattle({lessonId:'lv1-01',monster,questions:lessonQuestions('lv1-01'),hero:heroData.classId}));
 return <div className="ic3-adventure">
  <div className="ic3-panel-title"><h2>⚔️ Phiêu lưu kiến thức – Hero vs Monster</h2>
   <p>Chọn nhân vật pixel-art, chiến đấu trong đấu trường nhiều lớp. Bài 1 · Vòng 1 là trận chơi thử đã có câu hỏi.</p></div>
  {!battle&&<>
   <div className="ic3-avatar-spotlight"><div className="ic3-avatar-frame">
     <PixelHero skinId={heroSkin}/>
    </div><div className="ic3-avatar-details"><small>NHÂN VẬT ĐANG CHỌN</small>
      <h3>{heroData.name}</h3><p>{heroData.job} · 3 tim · Sức mạnh bằng các nhân vật khác</p>
      <button className="ic3-main-btn" type="button" onClick={onOpenPicker}>✨ Chọn trong 12 nhân vật</button>
    </div></div>
   <h3>Chọn thế giới phiêu lưu</h3>
   <LessonTiles selected={selectedLesson} onChoose={setSelectedLesson} mode="games"/>
   {lesson?.number===1?<div className="ic3-start-panel ic3-start-arcade">
    <p><strong>🌌 Xưởng Linh Kiện</strong> · Vòng 1 · Quái vật: {monster.name} · {monster.hp} HP.</p>
    <p>Đáp án đúng mới gây sát thương. Đáp án sai mất 1 tim, luôn có giải thích. Không giới hạn thời gian.</p>
    <button className="ic3-main-btn" type="button" onClick={start}><Play size={18}/> Vào đấu trường</button>
    <small>Vòng 2–4 và Boss đang đợi ngân hàng câu hỏi được kiểm duyệt.</small>
   </div>:<p className="ic3-warning"><LockKeyhole size={17}/> Bài này cần bộ câu hỏi theo vòng được giáo viên phê duyệt trước khi mở phiêu lưu.</p>}
  </>}
  {battle&&<div><button type="button" className="ic3-back" onClick={()=>setBattle(null)}><ArrowLeft size={17}/> Rời trận thử nghiệm</button>
   <Battle battle={battle} setBattle={setBattle} questions={lessonQuestions('lv1-01')} skinId={heroSkin} monster={monster}/></div>}
 </div>;
}
function MiniGameLibrary({skinId}){
 const [playing,setPlaying]=useState(null);
 if(playing==='hardware-builder')return <HardwareBuilder onBack={()=>setPlaying(null)}/>;
 if(playing==='knowledge-fishing')return <FishingGame skinId={skinId} onBack={()=>setPlaying(null)}/>;
 const games=[...MINI_GAMES,{id:'knowledge-fishing',vi:'Câu cá kiến thức',name:'Knowledge Fishing',
   objective:'Ôn các nút trình duyệt và Bookmark · Bài 11',status:'prototype'}];
 return <div><div className="ic3-panel-title"><h2>🎮 Thư viện mini-game</h2>
    <p>2 trò chơi tương tác đã có bản thử: Hardware Builder và Câu cá kiến thức. 7 trò khác đang phát triển.</p></div>
  <div className="ic3-mini-grid">{games.map((g,i)=><article key={g.id} className={'ic3-mini-card '+(g.status==='prototype'?'ic3-mini-playable':'')}>
   <span className="ic3-mini-index">{g.id==='knowledge-fishing'?'🐠':String.fromCharCode(65+i)}</span>
   <h3>{g.vi}</h3><p>{g.name}</p><small>{g.objective}</small>
   {g.status==='prototype'
     ?<button className="ic3-main-btn" type="button" onClick={()=>setPlaying(g.id)}><Play size={16}/> Chơi thử {g.id==='knowledge-fishing'?'Bài 11':'Bài 1'}</button>
     :<span className="ic3-mini-planned">Chưa triển khai</span>}
  </article>)}</div>
 </div>;
}
function GameSection({selected,setSelected,heroSkin,setHeroSkin,battle,setBattle}){
 const [tab,setTab]=useState('adventure');
 const [pickerOpen,setPickerOpen]=useState(false);
 const tabs=[['adventure','Phiêu lưu'],['minigames','Trò chơi vui'],['hero','Nhân vật'],['equipment','Trang bị'],['achievements','Thành tích'],['review','Ôn tập']];
 return <div><div className="ic3-game-tabs">{tabs.map(([id,title])=><button key={id} type="button" className={tab===id?'active':''} onClick={()=>setTab(id)}>{title}</button>)}</div>
  {tab==='adventure'&&<Adventure selectedLesson={selected} setSelectedLesson={setSelected} heroSkin={heroSkin}
    onOpenPicker={()=>setPickerOpen(true)} battle={battle} setBattle={setBattle}/>}
  {tab==='minigames'&&<MiniGameLibrary skinId={heroSkin}/>}
  {tab==='hero'&&<div className="ic3-panel"><h2>🧑‍🚀 Nhân vật</h2>
   <p>12 hình tượng pixel-art nguyên bản, thuộc ba lớp chiến binh, cung thủ và pháp sư. Không có lợi thế sức mạnh.</p>
   <div className="ic3-hero-choices ic3-pixel-skin-choices">
    {HERO_SKINS.map(s=><button key={s.id} type="button" onClick={()=>setHeroSkin(s.id)} className={heroSkin===s.id?'selected':''}>
     <PixelHero skinId={s.id}/><strong>{s.name}</strong><small>{s.job}</small>
    </button>)}</div>
   <button className="ic3-main-btn" type="button" onClick={()=>setPickerOpen(true)}>✨ Mở bảng chọn nhân vật</button>
  </div>}
  {tab==='equipment'&&<div className="ic3-panel"><h2>Trang bị – Bản thiết kế</h2><p>5 ô: {EQUIPMENT_SLOTS.join(' · ')}. Chưa có kho đồ thật, không có vật phẩm ngẫu nhiên hoặc mua bán.</p>
   <p>Trang bị chỉ mở sau khi có phần thưởng học tập được xác thực phía máy chủ.</p></div>}
  {tab==='achievements'&&<div className="ic3-panel"><h2>Thành tích</h2><p>Chưa liên kết hồ sơ học sinh. Bản mẫu không lưu huy hiệu, XP hay sao thưởng thật.</p></div>}
  {tab==='review'&&<div className="ic3-panel"><h2>Ôn tập lỗi sai</h2>
   {battle&&missedQuestions(battle).length?<><p>Các câu cần ôn trong trận thử nghiệm gần nhất:</p><ul>{missedQuestions(battle).map(id=>{const q=PROTOTYPE_QUESTIONS.find(x=>x.id===id);return <li key={id}>{q?.prompt||id} — {q?.explanation}</li>;})}</ul></>:<p>Chưa có câu sai nào trong trận mẫu hiện tại. Khi tích hợp tài khoản, lịch sử sẽ lưu trên server.</p>}
  </div>}
  {pickerOpen&&<HeroPicker selected={heroSkin} onSelect={setHeroSkin} onClose={()=>setPickerOpen(false)}/>}
 </div>;
}
export default function LearningPrototype(){
 const [section,setSection]=useState('lessons'),[exerciseTab,setExerciseTab]=useState('questions');
 const [selectedLesson,setSelectedLesson]=useState('lv1-01'),[heroSkin,setHeroSkin]=useState(DEFAULT_HERO_SKIN),[battle,setBattle]=useState(null);
 const [quizKey,setQuizKey]=useState(0);
 const lesson=lessonById(selectedLesson);
 const questions=useMemo(()=>lessonQuestions(selectedLesson),[selectedLesson]);
 const chooseLesson=id=>{setSelectedLesson(id);setBattle(null);setQuizKey(k=>k+1);};
 return <div className="ic3-learning-app" id="ic3-home">
  <Header section={section} onSection={setSection}/>
  <main>
   <section className="ic3-intro"><span className="ic3-eyebrow">IC3 GLOBAL STANDARD 6 · THCS</span>
    <h1>Học để hiểu. Chơi để nhớ. <span>Thử thách để tiến bộ.</span></h1>
    <p>Trình chiếu tài liệu của giáo viên, ôn luyện bằng câu hỏi hình ảnh và thử thách quái vật – cùng một lộ trình Level 1.</p>
   </section>
   <div className="ic3-level-tabs" aria-label="Cấp độ IC3">
    {LEVELS.map(l=><button key={l.number} type="button" disabled={l.locked} className={!l.locked?'active':''}>
      {l.locked&&<LockKeyhole size={14}/>} {l.label} {l.locked?'— Tạm khóa':''}</button>)}
   </div>
   {section==='lessons'?<section>
    <div className="ic3-panel-title"><h2><BookOpen size={25}/> Bài giảng – 22 bài Level 1</h2>
     <p>Chọn bài để mở slide trực tiếp. Bài 2–3 dùng chung tài liệu, Bài 8 giảm tải, Bài 10 thiếu tài liệu.</p></div>
    <LessonTiles selected={selectedLesson} onChoose={chooseLesson}/>
    {lesson?.status==='source-linked'&&<LessonViewer key={selectedLesson} lesson={lesson}/>}
   </section>:<section>
    <div className="ic3-panel-title"><h2><ClipboardList size={25}/> Bài tập – Học mà chơi</h2>
     <p>Câu hỏi truyền thống và trò chơi nhập vai có cùng 22 bài, chỉ mở nội dung đã sẵn sàng.</p></div>
    <div className="ic3-mode-tabs">
     <button className={exerciseTab==='questions'?'active':''} onClick={()=>{setExerciseTab('questions');setBattle(null);}}><Target size={18}/> Câu hỏi</button>
     <button className={exerciseTab==='games'?'active':''} onClick={()=>{setExerciseTab('games');setBattle(null);}}><Swords size={18}/> Trò chơi</button>
    </div>
    {exerciseTab==='questions'?<>
      <LessonTiles selected={selectedLesson} onChoose={chooseLesson} mode="questions"/>
      {questions.length?<Quiz key={selectedLesson+'-'+quizKey} lesson={lesson} questions={questions}/>:
       <p className="ic3-note">Chưa có ngân hàng câu hỏi được biên soạn cho bài này. Không hiển thị đề mẫu như đề đã phê duyệt.</p>}
     </>:<GameSection selected={selectedLesson} setSelected={chooseLesson} heroSkin={heroSkin} setHeroSkin={setHeroSkin} battle={battle} setBattle={setBattle}/>}
   </section>}
  </main>
  <footer className="ic3-foot"><Monitor size={16}/> QLPM Student · Bản thử nghiệm trên nhánh phát triển · Chưa có đăng nhập/PIN hay đồng bộ kết quả</footer>
 </div>;
}
