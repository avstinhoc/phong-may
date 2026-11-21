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
 assert.match(practice,/deviceVisualFor/);
 assert.match(practice,/LETTERS=\['A','B','C','D'\]/);
 assert.match(practice,/completeQuestion/);
 assert.doesNotMatch(practice,/<img|referrerPolicy|https?:\/\/|practice-source-panel|showSlide|lessonImage|sourceSlide/i);
 assert.doesNotMatch(expansion,/ic3-slides|sourceSlide|slide='/);
 assert.match(media,/DEVICES=/);
 assert.match(media,/PER_QUESTION=/);
 assert.doesNotMatch(media,/https?:\/\/|FilePath|commons\.wikimedia|\bsrc\s*:/i);
 assert.doesNotMatch(editor,/Chọn ảnh slide này|Ảnh từ slide: số slide|swm-image-preview/);
 assert.match(editor,/image_path:null,alt:''/);
 assert.match(editor,/choices\.length!==4/);
});

test('No remotely loaded image can appear in student practice (safety regression)',()=>{
 const q=read('src/student-web/Practice.jsx');
 const photos=read('src/student-web/practiceDeviceMedia.js');
 const teacher=read('src/StudentWebManagement.jsx');
 assert.doesNotMatch(q,/<img\b|<picture\b|<iframe\b/);
 assert.doesNotMatch(q,/src=\{q\.image\}|src=\{media/);
 assert.doesNotMatch(photos,/https?:\/\/|commons\.wikimedia|Special:FilePath|<img/);
 assert.match(q,/DEVICE_ICONS/);
 assert.match(q,/practice-device-card/);
 assert.doesNotMatch(teacher,/src=\{draft\.image_path\}|swm-image-preview/);
});
