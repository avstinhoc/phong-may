import guided from '../learning/guidedLessons.json';
import {LEVEL_1_LESSONS} from '../learning/curriculum.js';

// New factual matching questions are derived directly from the existing
// three concept / explanation pairs in each source-linked guided lesson.
// Do not fabricate content for lesson slots 8 and 10, which lack source slides.
export const PRACTICE_EXPANSIONS=guided.flatMap(guide=>{
 const lesson=LEVEL_1_LESSONS[guide.n-1];
 if(!lesson||lesson.status!=='source-linked')return [];
 const list=guide.concepts||[];
 if(list.length!==3)return [];
 return list.flatMap(([name,explanation],i)=>{
  const others=list.filter((_,j)=>j!==i);
  const slide='/ic3-slides/Bai-'+String(guide.n).padStart(2,'0')+'/'+(i+2)+'.webp';
  return [
   {
    id:'guide-'+guide.n+'-'+i+'-meaning',lesson:guide.n,
    title:'Nhận biết khái niệm trong bài',
    q:'Trong bài học, câu nào giải thích phù hợp nhất về “'+name+'”?',
    choices:[explanation,...others.map(x=>x[1])],
    why:'Kiến thức đối chiếu: '+name+' — '+explanation,
    image:slide,alt:'Trang tham khảo từ PowerPoint bài '+guide.n+' (cần đọc nội dung hình trước khi trả lời).',
    sourceSlide:i+2,sourceType:'slide'
   },
   {
    id:'guide-'+guide.n+'-'+i+'-concept',lesson:guide.n,
    title:'Gắn tình huống với thuật ngữ',
    q:'Theo bài học, mô tả “'+explanation+'” liên quan trực tiếp nhất đến khái niệm nào?',
    choices:[name,...others.map(x=>x[0])],
    why:explanation,
    sourceSlide:i+2,sourceType:'text'
   }
  ];
 });
});
export const practiceCountByLesson=n=>PRACTICE_EXPANSIONS.filter(q=>q.lesson===n).length;
