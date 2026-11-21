import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_MAPS} from '../src/student-web/worldMap.js';
import {monsterArt,heroArt} from '../src/student-web/battleArt.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all 154 monster encounters receive distinct named profiles and valid styled materials',()=>{
 assert.equal(WORLD_MAPS.length,22);
 const profiles=WORLD_MAPS.flatMap((world)=>world.waves.map((wave,i)=>{
  const style=monsterArt(world.id,i+1);
  assert.equal(style.name,wave.name);
  assert.equal(style.stage,i+1);
  for(const key of ['primary','accent','metal','eye','energy'])
   assert.match(style[key],/^#[0-9a-f]{6}$/i);
  assert.ok(style.archetype>=0&&style.archetype<22);
  return style;
 }));
 assert.equal(profiles.length,154);
 assert.equal(new Set(profiles.map(p=>p.name)).size,154);
 assert.ok(new Set(profiles.map(p=>p.kind)).size>=7);
 assert.ok(new Set(profiles.map(p=>p.primary)).size>40);
 assert.equal(profiles.filter(p=>p.boss).length,22);
 assert.equal(profiles.filter(p=>p.elite).length,22*3);
});
test('hero art covers warrior, archer and mage without changing gameplay damage',()=>{
 for(const classId of ['warrior','archer','mage']){
   const h=heroArt({classId,outfit:'#225588',trim:'#cceeff'},5);
   assert.equal(h.classId,classId);
   assert.ok(h.weapon);
   assert.match(h.crest,/^#[\da-f]{6}$/i);
 }
 const canvas=read('src/learning-arcade/tabletop.js');
 const wrapper=read('src/learning-arcade/Tabletop.jsx');
 assert.match(canvas,/heroAppearance/);
 assert.match(canvas,/monsterAppearance/);
 assert.match(canvas,/look\?\.boss/);
 assert.match(canvas,/kind==='arachnid'/);
 assert.match(canvas,/kind==='aquatic'/);
 assert.match(canvas,/kind==='construct'/);
 assert.match(wrapper,/monsterArt\(round,wave\)/);
 assert.match(wrapper,/heroArt\(skin,skin\.gear\)/);
});
test('battle quiz uses exactly four server-supplied answers and does not fake an answer',()=>{
 const quiz=read('src/student-web/BattleQuiz.jsx');
 const css=read('src/student-web/battleQuiz.css');
 const campaign=read('src/student-web/Campaign.jsx');
 assert.match(quiz,/choices\.length===4/);
 assert.match(quiz,/new Set\(choices\)\.size===4/);
 assert.match(quiz,/const LABELS=\['A','B','C','D'\]/);
 assert.match(quiz,/onAnswer\(choice\)/);
 assert.match(quiz,/if\(!valid\|\|disabled/);
 assert.doesNotMatch(quiz,/correctIndex|Math\.random|Phương án D|fallbackPool/);
 assert.match(campaign,/onAnswer=\{choice=>call\('answer'/);
 assert.match(campaign,/p_choice:choice/);
 assert.match(css,/battle-quiz-answer/);
 assert.match(css,/prefers-reduced-motion/);
});
test('database migration upgrades legacy questions and validates four unique options',()=>{
 const sql=read('supabase/migrations/20261122223000_arcade_four_choices.sql');
 assert.equal((sql.match(/^\s*\('(?:guide-|\d+-)/gm)||[]).length,208);
 assert.match(sql,/cardinality\(q\.choices\)=3/);
 assert.match(sql,/cardinality\(q\.choices\)<>4/);
 assert.match(sql,/solution=any\(choices\)/);
 assert.match(sql,/ic3_arcade_exactly_four_choices/);
});
