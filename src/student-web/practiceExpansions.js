import guided from '../learning/guidedLessons.json';
import extraChoices from '../learning/practiceExtraChoices.json';
import {LEVEL_1_LESSONS} from '../learning/curriculum.js';

// Use only the original lesson concept/explanation texts. A short first sentence
// is sufficient for reading a timed quiz; full source detail stays in "why".
const concise=text=>{
 const value=String(text||'').trim();
 return value.match(/^(.+?[.!?])(?:\s|$)/)?.[1]||value;
};

// 120 source-grounded questions. Each answer set contains four real, distinct
// choices, and NO PowerPoint cover/slides are used as unrelated illustrations.
export const PRACTICE_EXPANSIONS=guided.flatMap(guide=>{
 const lesson=LEVEL_1_LESSONS[guide.n-1];
 if(!lesson||lesson.status!=='source-linked')return [];
 const concepts=guide.concepts||[];
 if(concepts.length!==3)return [];
 return concepts.flatMap(([name,explanation],i)=>{
  const others=concepts.filter((_,j)=>j!==i);
  const meaningId='guide-'+guide.n+'-'+i+'-meaning';
  const conceptId='guide-'+guide.n+'-'+i+'-concept';
  return [
   {
    id:meaningId,lesson:guide.n,title:'Nhận biết khái niệm',
    q:'Tình huống nào minh họa đúng nhất cho “'+name+'”?',
    choices:[concise(explanation),...others.map(x=>concise(x[1])),concise(extraChoices[meaningId])],
    solution:concise(explanation),
    why:'Kiến thức bài học: '+name+' — '+explanation
   },
   {
    id:conceptId,lesson:guide.n,title:'Áp dụng thuật ngữ',
    q:'“'+concise(explanation)+'” nói đến khái niệm nào?',
    choices:[name,...others.map(x=>x[0]),extraChoices[conceptId]],
    solution:name,why:explanation
   }
  ];
 });
});
export const practiceCountByLesson=n=>PRACTICE_EXPANSIONS.filter(q=>q.lesson===n).length;
