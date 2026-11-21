import test from 'node:test';
import assert from 'node:assert/strict';
import {stages,resolveTurn,spellNames} from '../src/learning/campaign.js';
import {beginBattle,currentQuestion,nextBattle} from '../src/learning/battleEngine.js';
import {lessonQuestions} from '../src/learning/questionBank.js';
const questions=lessonQuestions('lv1-01');
const begin=monster=>beginBattle({lessonId:'lv1-01',monster,questions});
test('every successive boss is stronger and beatable within the available deck',()=>{
 let hp=0;for(const stage of stages){
  assert.ok(stage.hp>hp);hp=stage.hp;
  let b=begin(stage);while(b.phase==='question'){const q=currentQuestion(b,questions);b=nextBattle(resolveTurn(b,q,q.correctId,1,10))}
  assert.equal(b.phase,'victory');assert.equal(b.hearts,3);
 }
 assert.equal(new Set(spellNames).size,32)
});
test('deadline wins a simultaneous answer, late clicks and stale ticks cannot double-charge',()=>{
 const b=begin(stages[0]),q=currentQuestion(b,questions);
 assert.equal(resolveTurn(b,q,null,9,10),b);
 const n=resolveTurn(b,q,q.correctId,10,10);
 assert.equal(n.hearts,2);assert.equal(n.currentFeedback.timedOut,true);
 assert.equal(resolveTurn(n,q,null,11,10),n);
 const next=nextBattle(n);assert.equal(resolveTurn(next,q,null,12,10),next);
 assert.equal(resolveTurn(b,q,q.correctId,9,10).hearts,3);
});
