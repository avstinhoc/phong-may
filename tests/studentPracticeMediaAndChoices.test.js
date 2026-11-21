import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const bank=JSON.parse(read('src/learning/practiceBank.json'));
const fourth=JSON.parse(read('src/learning/practiceExtraChoices.json'));
const guided=JSON.parse(read('src/learning/guidedLessons.json'));
const trim=s=>{
 const t=String(s).trim();
 return t.match(/^(.+?[.!?])(?:\s|$)/)?.[1]||t;
};
test('all existing 116 baseline practice questions have 4 unique real answers',()=>{
 assert.equal(bank.length,116);
 for(const q of bank){
  const choices=[...q.choices];
  if(choices.length===3)choices.push(fourth[q.id]);
  assert.equal(choices.length,4,q.id);
  assert.equal(new Set(choices).size,4,q.id);
  assert.ok(choices.every(x=>typeof x==='string'&&x.trim()),q.id);
  assert.ok(choices.includes(q.choices[0]),q.id);
 }
});
test('120 guided question expansions use exactly 4 unique options and original explanations',()=>{
 let count=0;
 for(const guide of guided){
  if([8,10].includes(guide.n))continue;
  assert.equal(guide.concepts.length,3);
  for(let i=0;i<guide.concepts.length;i++){
   const [concept,explanation]=guide.concepts[i];
   const others=guide.concepts.filter((_,j)=>j!==i);
   const meaningId='guide-'+guide.n+'-'+i+'-meaning';
   const conceptId='guide-'+guide.n+'-'+i+'-concept';
   const meaning=[trim(explanation),...others.map(x=>trim(x[1])),trim(fourth[meaningId])];
   const concepts=[concept,...others.map(x=>x[0]),fourth[conceptId]];
   for(const answers of [meaning,concepts]){
    assert.equal(answers.length,4);
    assert.equal(new Set(answers).size,4,guide.n+'-'+i);
    assert.ok(answers.every(x=>x.trim().length>1));
   }
   count+=2;
  }
 }
 assert.equal(count,120);
});
test('practice no longer displays PowerPoint slides or an image unrelated to the question',()=>{
 const practice=read('src/student-web/Practice.jsx');
 const expansion=read('src/student-web/practiceExpansions.js');
 const media=read('src/student-web/practiceDeviceMedia.js');
 const editor=read('src/StudentWebManagement.jsx');
 assert.match(practice,/devicePhotoFor/);
 assert.match(practice,/LETTERS=\['A','B','C','D'\]/);
 assert.match(practice,/completeQuestion/);
 assert.doesNotMatch(practice,/practice-source-panel|showSlide|lessonImage|sourceSlide/i);
 assert.doesNotMatch(expansion,/ic3-slides|sourceSlide|slide='/);
 assert.match(media,/Cpu-processor\.jpg/);
 assert.match(media,/Special:FilePath/);
 assert.match(media,/license:|license='/);
 assert.doesNotMatch(editor,/Chọn ảnh slide này|Ảnh từ slide: số slide/);
 assert.match(editor,/choices\.length!==4/);
});
