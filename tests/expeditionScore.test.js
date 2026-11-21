import test from 'node:test';
import assert from 'node:assert/strict';
import {stages} from '../src/learning/campaign.js';
import {wallet,exchange,applyWin,shuffledDeck} from '../src/learning/expeditionScore.js';
import {lessonQuestions} from '../src/learning/questionBank.js';
test('20 seconds throughout and the shuffle preserves answer keys and source order',()=>{
 assert(stages.every(s=>s.seconds===20));const src=lessonQuestions('lv1-01'),before=JSON.stringify(src),deck=shuffledDeck(src,()=>0);
 assert.notEqual(src[0].id,deck[0].id);for(const q of deck){const old=src.find(o=>o.id===q.id);assert.notEqual(q.options[0].id,old.options[0].id);assert.equal(q.correctId,old.correctId);assert.equal(new Set(q.options.map(o=>o.id)).size,old.options.length)}
 assert.equal(JSON.stringify(src),before)
});
test('milestones, best win only, idempotent redemption, balance floor',()=>{
 const base={stage:0,best:{},claims:[]};for(const [points,earned] of [[599,0],[600,2],[1199,2],[1200,4],[2400,6],[4800,8]])assert.equal(wallet({...base,best:{1:points}}).earned,earned);
 const win={round:1,phase:'victory',correct:6,wrong:0},p=applyWin(base,win);
 assert.equal(wallet(applyWin(p,win)).points,180);assert.equal(applyWin(base,{...win,phase:'defeat'}),base);
 const funded={...base,best:{1:600}},spent=exchange(funded,'x');assert.equal(wallet(spent).available,0);assert.equal(exchange(spent,'x'),spent);assert.equal(exchange(spent,'y'),spent)
});
