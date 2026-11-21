import {BALANCE} from './adventureCatalog.js';

// Pure, replayable battle logic. Preview only: never submit reward or score from this client
// without identity-bound server-side verification of the entire attempt.
export function beginBattle({lessonId,monster,questions,hero='warrior',equipment={}}){
 if(!monster||monster.lessonId!==lessonId||!Number.isInteger(monster.hp)||monster.hp<1)throw Error('Invalid monster');
 const ids=questions.filter(q=>q.lessonId===lessonId).map(q=>q.id);
 if(!ids.length)throw Error('Chưa có câu hỏi được duyệt để thử nghiệm bài này');
 if(new Set(ids).size!==ids.length)throw Error('Duplicate question IDs');
 return {
  lessonId,monsterId:monster.id,round:monster.round,maxHp:monster.hp,hp:monster.hp,
  damageScale:monster.damageScale||1,hero,phase:'question',hearts:BALANCE.hearts,streak:0,
  order:ids,questionIndex:0,attempts:[],correct:0,wrong:0,
  currentFeedback:null,finish:null,
  equipment:{weapon:Math.min(Math.max(0,Number(equipment.weapon)||0),BALANCE.maxAttackBonus),
   shield:Math.min(Math.max(0,Number(equipment.shield)||0),BALANCE.maxShieldBlocks)}
 };
}
export function currentQuestion(state,questions){
 return state&&state.order[state.questionIndex]
  ?questions.find(q=>q.id===state.order[state.questionIndex])||null:null;
}
export function answerBattle(state,question,selectedId){
 if(state?.phase!=='question')return state;
 if(!question||question.id!==state.order[state.questionIndex]||
    !question.options?.some(option=>option.id===selectedId))return state;
 const correct=selectedId===question.correctId;
 const streak=correct?state.streak+1:0;
 const streakBonus=correct&&streak%BALANCE.streakBonusEvery===0?BALANCE.streakBonusDamage:0;
 // Equipment bonus requires a streak: basic hero always deals enough to finish.
 const weaponBonus=correct&&streak>=BALANCE.streakBonusEvery?state.equipment.weapon:0;
 const damage=correct?(BALANCE.baseDamage+streakBonus+weaponBonus)*(state.damageScale||1):0;
 const shieldConsumed=!correct&&state.equipment.shield>0;
 const hearts=Math.max(0,state.hearts-(correct||shieldConsumed?0:BALANCE.incorrectHeartDamage));
 const hp=Math.max(0,state.hp-damage);
 const finish=hp===0?'victory':hearts===0?'defeat':null;
 return {
  ...state,phase:'feedback',hp,hearts,streak,
  correct:state.correct+(correct?1:0),wrong:state.wrong+(correct?0:1),
  equipment:{...state.equipment,shield:shieldConsumed?state.equipment.shield-1:state.equipment.shield},
  attempts:[...state.attempts,{questionId:question.id,selectedId,correct,damage,shieldConsumed}],
  currentFeedback:{
   correct,selectedId,correctId:question.correctId,explanation:question.explanation,
   tip:correct?'Ghi nhớ kiến thức này để chinh phục vòng tiếp theo.':'Đọc lại giải thích và ôn slide tương ứng.',
   damage,shieldConsumed
  },finish
 };
}
export function nextBattle(state){
 if(state?.phase!=='feedback')return state;
 if(state.finish)return {...state,phase:state.finish};
 const next=state.questionIndex+1;
 if(next>=state.order.length)return {...state,phase:'questions-exhausted'};
 return {...state,phase:'question',questionIndex:next,currentFeedback:null};
}
export function learningStarRating(state){
 if(state?.phase!=='victory')return 0;
 const attempted=state.correct+state.wrong;
 const accuracy=attempted?state.correct/attempted:0;
 return accuracy>=.9?3:accuracy>=.75?2:1;
}
export function missedQuestions(state){return (state?.attempts||[]).filter(x=>!x.correct).map(x=>x.questionId);}
