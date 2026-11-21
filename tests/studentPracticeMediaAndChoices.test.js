import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {previewDeck} from '../src/learning/offlineQuiz.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const bank=JSON.parse(read('src/learning/quizCatalog.json'));
const norm=s=>s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
test('all 22 lesson pools have distinct concepts, prompts, four choices and an explanation',()=>{
 for(const key of ['id','concept','prompt'])assert.equal(new Set(bank.map(q=>norm(q[key]))).size,bank.length,key);
 for(let n=1;n<=22;n++){
  const deck=previewDeck('lv1-'+String(n).padStart(2,'0'));
  assert.ok(deck.length>=8,'lesson '+n);
  for(const q of deck){
   assert.equal(new Set(q.options.map(o=>norm(o.label))).size,4,q.id);
   assert.equal(q.options.filter(o=>o.id===q.correctId).length,1,q.id);
   assert.ok(q.explanation.trim(),q.id);
  }
 }
});
test('every image is an attributed, local WebP used by a catalog item',()=>{
 const credits=JSON.parse(read('public/ic3-media/credits.json'));
 const used=new Set(bank.map(q=>q.media).filter(Boolean));
 assert.deepEqual(new Set(credits.map(r=>r.file)),new Set([...used].map(id=>id+'.webp')));
 for(const r of credits){
  assert.ok(r.author&&r.source&&r.license);assert.match(r.file,/^m\d\d\.webp$/);
  const data=readFileSync(new URL('../public/ic3-media/'+r.file,import.meta.url));
  assert.equal(data.toString('ascii',8,12),'WEBP');
 }
 const component=read('src/student-web/QuestionPhoto.jsx');
 assert.doesNotMatch(component,/title=|figcaption|src=\{media\}|alt=\{(?:solution|title|q\.)/);
});
