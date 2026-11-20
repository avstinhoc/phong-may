import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVEL_1_LESSONS,availableLessons,lessonById,LEVELS} from '../src/learning/curriculum.js';
import {PROTOTYPE_QUESTIONS,lessonQuestions,validateQuestion} from '../src/learning/questionBank.js';
import {BALANCE,WORLDS,MONSTERS,MINI_GAMES,HERO_STYLES,monsterFor} from '../src/learning/adventureCatalog.js';
import {beginBattle,currentQuestion,answerBattle,nextBattle,learningStarRating,missedQuestions} from '../src/learning/battleEngine.js';
import {HARDWARE_SLOTS,HARDWARE_PARTS,evaluateHardwareChoice} from '../src/learning/hardwareGameRules.js';

test('22 curriculum slots preserve shared lesson 2–3 presentation and missing/reduced content',()=>{
 assert.equal(LEVEL_1_LESSONS.length,22);
 assert.deepEqual(LEVEL_1_LESSONS.map(x=>x.number),Array.from({length:22},(_,i)=>i+1));
 assert.equal(availableLessons().length,20);
 assert.equal(new Set(availableLessons().map(x=>x.fileId)).size,19);
 assert.equal(lessonById('lv1-02').fileId,lessonById('lv1-03').fileId);
 assert.equal(lessonById('lv1-02').slideEnd,16);
 assert.equal(lessonById('lv1-03').slideStart,17);
 assert.equal(lessonById('lv1-01').slideCount,28);
 assert.equal(lessonById('lv1-08').status,'reduced');
 assert.equal(lessonById('lv1-10').status,'missing-source');
 assert.equal(lessonById('lv1-08').fileId,null);
 assert.equal(lessonById('lv1-10').fileId,null);
 assert.deepEqual(LEVELS.filter(x=>x.locked).map(x=>x.number),[2,3]);
 for(const lesson of availableLessons()){
  assert.match(lesson.previewUrl,/^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/preview$/);
  assert.equal(lesson.quizStatus,'awaiting-teacher-review');
 }
});

test('88 unique monster concepts and eight distinct mini-game definitions are separated from approvals',()=>{
 assert.equal(WORLDS.length,22);
 assert.equal(MONSTERS.length,88);
 assert.equal(MINI_GAMES.length,8);
 assert.equal(new Set(MONSTERS.map(x=>x.id)).size,88);
 assert.equal(new Set(MONSTERS.map(x=>x.visualKey)).size,88);
 assert.equal(new Set(MONSTERS.map(x=>x.attackStyle)).size,88);
 assert.equal(new Set(MONSTERS.map(x=>x.animationKey)).size,88);
 assert.equal(MONSTERS.filter(x=>x.isBoss).length,22);
 assert.equal(MONSTERS.filter(x=>x.status==='reserved').length,8);
 assert.ok(MONSTERS.every(x=>x.hp===BALANCE.rounds[x.round-1].hp));
 assert.ok(MONSTERS.every(x=>x.id.startsWith(x.lessonId+'-enemy-')));
 assert.equal(new Set(MINI_GAMES.map(x=>x.id)).size,8);
 assert.equal(MINI_GAMES.filter(x=>x.status==='planned').length,7);
 assert.equal(MINI_GAMES.find(x=>x.id==='hardware-builder').status,'prototype');
 assert.equal(HERO_STYLES.length,3);
 assert.deepEqual(BALANCE.rounds.map(x=>x.hp),[8,10,12,16]);
 assert.equal(BALANCE.hearts,3);
});

test('question drafts have grounded source slides, complete choices and explicit review status',()=>{
 assert.ok(PROTOTYPE_QUESTIONS.length>=18);
 assert.equal(new Set(PROTOTYPE_QUESTIONS.map(q=>q.id)).size,PROTOTYPE_QUESTIONS.length);
 assert.ok(PROTOTYPE_QUESTIONS.every(validateQuestion));
 assert.ok(PROTOTYPE_QUESTIONS.every(q=>q.status==='teacher-review-required'));
 assert.ok(PROTOTYPE_QUESTIONS.every(q=>lessonById(q.lessonId)?.status==='source-linked'));
 assert.ok(PROTOTYPE_QUESTIONS.every(q=>q.sourceSlides.every(n=>n>=1&&n<=lessonById(q.lessonId).slideEnd)));
 assert.ok(lessonQuestions('lv1-01').length>=8);
 assert.equal(lessonQuestions('lv1-10').length,0);
 assert.ok(PROTOTYPE_QUESTIONS.some(q=>q.type==='image-choice'));
});

test('real battle transition: correct explanations, 3-heart damage rule, victory and star rating',()=>{
 const monster=monsterFor('lv1-01',1),questions=lessonQuestions('lv1-01');
 let state=beginBattle({lessonId:monster.lessonId,monster,questions,hero:'warrior'});
 assert.equal(state.hearts,3);assert.equal(state.hp,8);assert.equal(state.phase,'question');
 assert.equal(currentQuestion(state,questions).id,questions[0].id);
 for(let i=0;i<4;i++){
  const question=currentQuestion(state,questions);
  state=answerBattle(state,question,question.correctId);
  assert.equal(state.phase,'feedback');
  assert.equal(state.currentFeedback.correct,true);
  assert.equal(state.currentFeedback.explanation,question.explanation);
  assert.ok(state.currentFeedback.damage>=2);
  assert.equal(state.hearts,3);
  assert.deepEqual(answerBattle(state,question,question.correctId),state,'cannot double-submit while feedback is shown');
  state=nextBattle(state);
 }
 assert.equal(state.phase,'victory');
 assert.equal(state.hp,0);
 assert.equal(learningStarRating(state),3);
 assert.equal(missedQuestions(state).length,0);
 assert.equal(state.attempts.length,4);
});

test('wrong answer deals at most one heart and defeated student can retry without clearing global progress',()=>{
 const monster=monsterFor('lv1-01',1),questions=lessonQuestions('lv1-01');
 let state=beginBattle({lessonId:monster.lessonId,monster,questions,hero:'mage'});
 for(let i=0;i<3;i++){
  const q=currentQuestion(state,questions);
  const wrong=q.options.find(option=>option.id!==q.correctId);
  state=answerBattle(state,q,wrong.id);
  assert.equal(state.hearts,2-i);
  assert.equal(state.currentFeedback.correct,false);
  assert.equal(state.currentFeedback.correctId,q.correctId);
  assert.ok(state.currentFeedback.explanation.length>20);
  state=nextBattle(state);
 }
 assert.equal(state.phase,'defeat');
 assert.equal(learningStarRating(state),0);
 assert.equal(missedQuestions(state).length,3);
 const retry=beginBattle({lessonId:monster.lessonId,monster,questions,hero:'mage'});
 assert.equal(retry.hearts,3);
 assert.equal(retry.attempts.length,0);
});

test('shield only blocks one incorrect answer; missing questions never create a fake victory',()=>{
 const monster=monsterFor('lv1-01',4),questions=lessonQuestions('lv1-01').slice(0,1);
 let state=beginBattle({lessonId:monster.lessonId,monster,questions,equipment:{shield:1}});
 const q=currentQuestion(state,questions);
 state=answerBattle(state,q,q.options.find(x=>x.id!==q.correctId).id);
 assert.equal(state.hearts,3);
 assert.equal(state.equipment.shield,0);
 state=nextBattle(state);
 assert.equal(state.phase,'questions-exhausted');
 assert.equal(state.hp,16);
 assert.equal(learningStarRating(state),0);
});

test('independent learning entry does not route through live app or submit simulated rewards',()=>{
 const prototype=readFileSync(new URL('../src/learning/LearningPrototype.jsx',import.meta.url),'utf8');
 const html=readFileSync(new URL('../learning-prototype.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.ok(html.includes('src/learning/main.jsx'));
 assert.ok(prototype.includes('LessonViewer'));
 assert.ok(prototype.includes('Battle'));
 assert.ok(prototype.includes('Không lưu lên Supabase'));
 assert.ok(!prototype.includes('supabase.from('));
 assert.ok(!app.includes('LearningPrototype'));
});

test('hardware builder accepts correct component functions from Lesson 1',()=>{
 assert.equal(HARDWARE_SLOTS.length,4);
 assert.equal(HARDWARE_PARTS.length,4);
 assert.equal(new Set(HARDWARE_SLOTS.map(x=>x.expected)).size,4);
 for(const slot of HARDWARE_SLOTS){
  assert.equal(evaluateHardwareChoice(slot.id,slot.expected),true);
  for(const part of HARDWARE_PARTS.filter(x=>x.id!==slot.expected))assert.equal(evaluateHardwareChoice(slot.id,part.id),false);
 }
 assert.equal(evaluateHardwareChoice('invalid','cpu'),false);
});

test('pixel-art redesign includes twelve original selectable skins and screenshot-inspired fishing gameplay',()=>{
 const sprites=readFileSync(new URL('../src/learning/PixelArt.jsx',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/learning/BattleScene.jsx',import.meta.url),'utf8');
 const picker=readFileSync(new URL('../src/learning/HeroPicker.jsx',import.meta.url),'utf8');
 const fish=readFileSync(new URL('../src/learning/FishingGame.jsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/learning/LearningPrototype.jsx',import.meta.url),'utf8');
 const style=readFileSync(new URL('../src/learning/gameVisuals.css',import.meta.url),'utf8');
 assert.equal((sprites.match(/\{id:'(?:warrior|archer|mage)-/g)||[]).length,12);
 assert.ok(style.includes('image-rendering:pixelated'));
 assert.ok(sprites.includes('PixelHero'));
 assert.ok(sprites.includes('PixelMonster'));
 assert.ok(sprites.includes('PixelFish'));
 assert.ok(picker.includes('role="dialog"')&&picker.includes('aria-modal="true"'));
 assert.ok(scene.includes('PixelHero skinId={skinId}')&&scene.includes('PixelMonster round={monster.round}'));
 assert.ok(scene.includes('role="progressbar"'));
 assert.ok(fish.includes("lessonQuestions('lv1-11')"));
 assert.ok(fish.includes('feedback')&&fish.includes('setHearts'));
 assert.ok(app.includes('HeroPicker')&&app.includes('FishingGame')&&app.includes('BattleScene'));
 assert.ok(!app.includes('function HeroArt('),'Emoji-only hero placeholder must be removed');
 assert.ok(!app.includes('function MonsterArt('),'Blob-only monster placeholder must be removed');
 assert.ok(style.includes('prefers-reduced-motion:reduce'));
 assert.ok(style.includes('.ic3-fishing-ocean'));
 assert.ok(style.includes('.ic3-arcade-stage'));
});

test('Lesson 11 fishing items trace to genuine supplied presentation slides and always explain answers',()=>{
 const questions=lessonQuestions('lv1-11');
 assert.equal(questions.length,8);
 assert.ok(questions.every(validateQuestion));
 assert.ok(questions.every(q=>q.status==='teacher-review-required'));
 assert.ok(questions.every(q=>q.sourceSlides.every(n=>n>=4&&n<=22)));
 assert.ok(questions.every(q=>q.explanation.length>35));
 const stop=questions.find(q=>q.id==='l11-q01');
 assert.equal(stop.sourceSlides[0],18);
 assert.equal(stop.options.find(o=>o.id===stop.correctId).label,'Dừng tải trang web');
 assert.ok(questions.some(q=>q.tags.includes('bookmark')));
 assert.ok(questions.some(q=>q.tags.includes('refresh')));
});
