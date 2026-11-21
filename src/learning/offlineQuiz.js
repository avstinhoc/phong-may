import catalog from './quizCatalog.json' with {type:'json'};
import {shuffle} from '../learning-arcade/expeditionScore.js';

// Offline previews have no Supabase session. A named arcade profile shares its
// history across its games, while an anonymous classroom preview uses its own key.
export function previewDeck(lessonId,profile='preview'){
 const key='ic3-concept-counts:'+profile;
 let history={};
 try{history=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
 return shuffle(catalog.filter(q=>q.lesson===Number(lessonId.slice(-2))))
  .sort((a,b)=>(history[a.concept]||0)-(history[b.concept]||0))
  .map(q=>({...q,lessonId,profile,prompt:q.prompt,correctId:q.solution,
   options:shuffle(q.choices).map(label=>({id:label,label})),sourceSlides:[]}));
}
export function recordPresentation(q){
 if(!q)return;
 const key='ic3-concept-counts:'+(q.profile||'preview');
 try{
  const seen=JSON.parse(localStorage.getItem(key)||'{}')||{};
  seen[q.concept]=(seen[q.concept]||0)+1;localStorage.setItem(key,JSON.stringify(seen));
 }catch{}
}
