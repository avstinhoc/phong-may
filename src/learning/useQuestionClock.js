import {useLayoutEffect,useRef,useState} from 'react';
import {recordPresentation} from './offlineQuiz.js';

export function useQuestionClock(q,active,onAnswer){
 const deadline=useRef(0),locked=useRef(true),handler=useRef(onAnswer);
 handler.current=onAnswer;
 const [seconds,setSeconds]=useState(30);
 function submit(choice){
  if(!active||locked.current)return;
  locked.current=true;
  handler.current(Date.now()>=deadline.current?null:choice);
 }
 useLayoutEffect(()=>{
  if(!q||!active)return;
  recordPresentation(q);deadline.current=Date.now()+30000;locked.current=false;setSeconds(30);
  const tick=()=>{const n=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));
   setSeconds(n);if(!n)submit(null);};
  const id=setInterval(tick,100);document.addEventListener('visibilitychange',tick);
  return()=>{locked.current=true;clearInterval(id);document.removeEventListener('visibilitychange',tick)};
 },[q?.id,active]);
 return {seconds,submit};
}
