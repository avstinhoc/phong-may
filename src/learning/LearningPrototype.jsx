import React,{useMemo,useState} from 'react';
import {BookOpen,ClipboardList,Swords,Trophy,LockKeyhole,ExternalLink,ArrowLeft,ArrowRight,Play,RotateCcw,Heart,Shield,Volume2,VolumeX,Info,Monitor,UserRound,CheckCircle2,AlertTriangle,ChevronRight,Target,Medal} from 'lucide-react';
import {LEVEL_1_LESSONS,LEVELS,lessonById} from './curriculum.js';
import {PROTOTYPE_QUESTIONS,lessonQuestions} from './questionBank.js';
import {BALANCE,HERO_STYLES,MONSTERS,MINI_GAMES,monsterFor,WORLDS,EQUIPMENT_SLOTS} from './adventureCatalog.js';
import {beginBattle,currentQuestion,answerBattle,nextBattle,missedQuestions,learningStarRating} from './battleEngine.js';
import {DeviceIllustration} from './DeviceIllustration.jsx';
import {HardwareBuilder} from './HardwareBuilder.jsx';
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
function MonsterArt({monster,attacking=false,damaged=false}){
 return <div className={'ic3-monster-art '+(attacking?'attack ' :'')+(damaged?'damaged':'')} aria-label={'Quái vật '+monster.name}>
  <div className="ic3-monster-halo"/><div className="ic3-monster-horns">✦ ✦</div>
  <div className={'ic3-monster-body shape-'+monster.silhouette}>
   <div className="ic3-monster-eye left"/><div className="ic3-monster-eye right"/>
   <div className="ic3-monster-mouth"/>
  </div><div className="ic3-monster-feet">◢ ◣</div>
 </div>;
}
function HeroArt({hero,attacking=false,damaged=false}){
 return <div className={'ic3-hero-art '+(attacking?'attack ':'')+(damaged?'damaged':'')}>
  <div className="ic3-hero-spark">✦</div><div className="ic3-hero-body">
   <span className="ic3-hero-icon">{hero.emoji}</span>
  </div><span className="ic3-hero-shadow"/>
 </div>;
}
function Battle({battle,setBattle,questions,hero,monster}){
 const question=currentQuestion(battle,questions);
 const correctFeedback=battle.phase==='feedback'&&battle.currentFeedback?.correct;
 const wrongFeedback=battle.phase==='feedback'&&!battle.currentFeedback?.correct;
 const answer=id=>setBattle(old=>answerBattle(old,question,id));
 const next=()=>setBattle(old=>nextBattle(old));
 const retry=()=>setBattle(beginBattle({lessonId:monster.lessonId,monster,questions,hero:hero.id}));
 return <div className="ic3-battle-layout">
  <div className="ic3-arena">
   <div className="ic3-arena-head">
    <span>⚔️ Bài 1 · Vòng 1: Khám phá</span>
    <span>Quái vật: {monster.name}</span>
   </div>
   <div className="ic3-enemy-health"><span>HP quái vật</span><div className="ic3-health-track"><span style={{width:`${100*battle.hp/battle.maxHp}%`}}/></div><strong>{battle.hp}/{battle.maxHp}</strong></div>
   <div className="ic3-combatants">
    <div><HeroArt hero={hero} attacking={correctFeedback} damaged={wrongFeedback}/><strong>{hero.name}</strong><div className="ic3-hearts">{Array.from({length:BALANCE.hearts},(_,i)=><Heart key={i} size={24} fill={i<battle.hearts?'#fa637c':'none'} color={i<battle.hearts?'#fa637c':'#8ca4b6'}/>)}</div></div>
    <div className="ic3-combat-vs">VS</div>
    <div><MonsterArt monster={monster} attacking={wrongFeedback} damaged={correctFeedback}/><strong>{monster.name}</strong><small>{monster.isBoss?'BOSS':'Quái vật khám phá'}</small></div>
   </div>
   <div className="ic3-arena-footer">Đúng: {battle.correct} · Cần ôn: {battle.wrong} · Chuỗi đúng: {battle.streak} · Không giới hạn thời gian</div>
  </div>
  {battle.phase==='question'||battle.phase==='feedback'?<div className="ic3-battle-question">
   <QuestionCard question={question}
    selected={battle.currentFeedback?.selectedId??null}
    showAnswer={battle.phase==='feedback'}
    onSelect={answer}
    questionIndex={battle.questionIndex} total={battle.order.length}/>
   {battle.phase==='feedback'&&<div className="ic3-battle-result">
    <strong>{battle.currentFeedback.correct?`Đòn tấn công! −${battle.currentFeedback.damage} HP`:
      battle.currentFeedback.shieldConsumed?'Khiên chắn đã bảo vệ bạn!':'Quái vật phản công: −1 tim'}</strong>
    <button className="ic3-main-btn" onClick={next}>{battle.finish?'Xem kết quả trận đấu':'Tiếp tục'} <ChevronRight size={17}/></button>
   </div>}
  </div>:<div className="ic3-finish ic3-panel">
   {battle.phase==='victory'?<><Trophy size={46}/><h2>Chiến thắng vòng 1!</h2>
    <p>Hoàn thành với {battle.correct} câu đúng, {battle.wrong} câu cần ôn.</p>
    <p>Đánh giá lượt thử: {'⭐'.repeat(learningStarRating(battle))}. Không cộng vào sao thưởng QLPM.</p>
   </>:battle.phase==='defeat'?<><Heart size={46}/><h2>Đừng bỏ cuộc!</h2>
    <p>Bạn có thể ôn lại câu sai rồi thử lại vòng này.</p>
   </>:<><Info size={46}/><h2>Chưa đủ câu hỏi</h2><p>Đã dùng hết câu hỏi hiện có. Không tự tạo câu hỏi hay tính thắng.</p></>}
   {missedQuestions(battle).length>0&&<p>Câu cần xem lại: {missedQuestions(battle).join(', ')}</p>}
   <button className="ic3-main-btn" onClick={retry}><RotateCcw size={18}/> Chơi lại vòng 1</button>
  </div>}
 </div>;
}
function Adventure({selectedLesson,setSelectedLesson,hero,setHero,battle,setBattle}){
 const lesson=lessonById(selectedLesson);
 const heroData=HERO_STYLES.find(x=>x.id===hero)||HERO_STYLES[0];
 const monster=monsterFor('lv1-01',1);
 const canStart=lesson?.number===1;
 const start=()=>setBattle(beginBattle({lessonId:'lv1-01',monster,questions:lessonQuestions('lv1-01'),hero}));
 return <div className="ic3-adventure">
  <div className="ic3-panel-title"><h2>⚔️ Phiêu lưu kiến thức – Hero vs Monster</h2>
   <p>22 thế giới, 4 vòng mỗi bài (88 bản thiết kế quái vật). Chỉ vòng 1 của Bài 1 hiện có cơ chế chiến đấu thử nghiệm.</p></div>
  {!battle&&<><h3>Chọn nhân vật</h3><div className="ic3-hero-choices">
    {HERO_STYLES.map(x=><button key={x.id} type="button" className={hero===x.id?'selected':''} onClick={()=>setHero(x.id)}>
     <span>{x.emoji}</span><strong>{x.name}</strong><small>{x.description}</small></button>)}
   </div>
   <h3>Chọn bài phiêu lưu</h3><LessonTiles selected={selectedLesson} onChoose={setSelectedLesson} mode="games"/>
   {lesson?.number===1?<div className="ic3-start-panel">
    <p><strong>Thế giới: {WORLDS[0].name}</strong> · Quái vật vòng 1: {monster.name} · {monster.hp} HP.</p>
    <p>3 tim, mỗi đáp án đúng gây 2 sát thương. Sai mất 1 tim; không có bộ đếm giờ.</p>
    <button className="ic3-main-btn" onClick={start}><Play size={18}/> Bắt đầu vòng 1</button>
    <small>Vòng 2–4 và Boss chưa mở vì bộ câu hỏi phân cấp độ khó chưa được phê duyệt.</small>
   </div>:<p className="ic3-warning"><LockKeyhole size={17}/> Bài này cần ngân hàng câu hỏi được giáo viên duyệt trước khi mở chiến đấu.</p>}
  </>}
  {battle&&<div><button className="ic3-back" onClick={()=>setBattle(null)}><ArrowLeft size={17}/> Rời trận thử nghiệm</button>
   <Battle battle={battle} setBattle={setBattle} questions={lessonQuestions('lv1-01')} hero={heroData} monster={monster}/></div>}
 </div>;
}
function MiniGameLibrary(){
 const [playing,setPlaying]=useState(false);
 if(playing)return <HardwareBuilder onBack={()=>setPlaying(false)}/>;
 return <div><div className="ic3-panel-title"><h2>Trò chơi vui – 8 mini-game</h2>
    <p>Hardware Builder đã chơi thử được từ nội dung Bài 1. Bảy trò còn lại đang ở giai đoạn thiết kế.</p></div>
  <div className="ic3-mini-grid">{MINI_GAMES.map((g,i)=><article key={g.id} className="ic3-mini-card">
   <span className="ic3-mini-index">{String.fromCharCode(65+i)}</span><h3>{g.vi}</h3><p>{g.name}</p>
   <small>{g.objective}</small>
   {g.id==='hardware-builder'
     ?<button className="ic3-main-btn" type="button" onClick={()=>setPlaying(true)}><Play size={16}/> Chơi thử Bài 1</button>
     :<span className="ic3-mini-planned">Chưa triển khai</span>}
  </article>)}</div>
 </div>;
}
function GameSection({selected,setSelected,hero,setHero,battle,setBattle}){
 const [tab,setTab]=useState('adventure');
 const tabs=[['adventure','Phiêu lưu'],['minigames','Trò chơi vui'],['hero','Nhân vật'],['equipment','Trang bị'],['achievements','Thành tích'],['review','Ôn tập']];
 return <div><div className="ic3-game-tabs">{tabs.map(([id,title])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{title}</button>)}</div>
  {tab==='adventure'&&<Adventure selectedLesson={selected} setSelectedLesson={setSelected} hero={hero} setHero={setHero} battle={battle} setBattle={setBattle}/>}
  {tab==='minigames'&&<MiniGameLibrary/>}
  {tab==='hero'&&<div className="ic3-panel"><h2>Nhân vật</h2><p>Ba phong cách có cùng sức mạnh cơ bản. Chọn nhân vật sẽ đổi ngoại hình trong trận mẫu.</p>
   <div className="ic3-hero-choices">{HERO_STYLES.map(x=><button key={x.id} type="button" onClick={()=>setHero(x.id)} className={hero===x.id?'selected':''}><span>{x.emoji}</span><strong>{x.name}</strong></button>)}</div></div>}
  {tab==='equipment'&&<div className="ic3-panel"><h2>Trang bị – Bản thiết kế</h2><p>5 ô: {EQUIPMENT_SLOTS.join(' · ')}. Chưa có kho đồ thật, không có vật phẩm ngẫu nhiên hoặc mua bán.</p>
   <p>Chỉ kích hoạt trang bị sau khi có dữ liệu phần thưởng được xác thực ở server.</p></div>}
  {tab==='achievements'&&<div className="ic3-panel"><h2>Thành tích</h2><p>Chưa liên kết hồ sơ học sinh. Bản mẫu không lưu huy hiệu, XP hay sao thưởng thật.</p></div>}
  {tab==='review'&&<div className="ic3-panel"><h2>Ôn tập lỗi sai</h2>
   {battle&&missedQuestions(battle).length?<><p>Các câu cần ôn trong trận thử nghiệm gần nhất:</p><ul>{missedQuestions(battle).map(id=>{const q=PROTOTYPE_QUESTIONS.find(x=>x.id===id);return <li key={id}>{q?.prompt||id} — {q?.explanation}</li>;})}</ul></>:<p>Chưa có câu sai nào trong trận mẫu hiện tại. Khi tích hợp tài khoản, lịch sử sẽ lưu trên server.</p>}
  </div>}
 </div>;
}
export default function LearningPrototype(){
 const [section,setSection]=useState('lessons'),[exerciseTab,setExerciseTab]=useState('questions');
 const [selectedLesson,setSelectedLesson]=useState('lv1-01'),[hero,setHero]=useState('warrior'),[battle,setBattle]=useState(null);
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
     </>:<GameSection selected={selectedLesson} setSelected={chooseLesson} hero={hero} setHero={setHero} battle={battle} setBattle={setBattle}/>}
   </section>}
  </main>
  <footer className="ic3-foot"><Monitor size={16}/> QLPM Student · Bản thử nghiệm trên nhánh phát triển · Chưa có đăng nhập/PIN hay đồng bộ kết quả</footer>
 </div>;
}
