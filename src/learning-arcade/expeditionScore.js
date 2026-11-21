export const SECONDS=30;
export function shuffle(values,random=Math.random){
 const result=[...values];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result;
}
export function shuffledDeck(questions,random=Math.random){
 return shuffle(questions,random).map(q=>({...q,options:shuffle(q.options,random)}));
}
export function stagePoints(b){return Math.max(0,30*b.correct-15*b.wrong)}
export function wallet(profile){
 const points=Object.values(profile.best).reduce((a,b)=>a+b,0);
 let next=600,earned=0;
 while(points>=next){earned+=2;next*=2}
 return {points,next,earned,available:earned-profile.claims.length*2};
}
export function applyWin(profile,b){
 if(b.phase!=='victory')return profile;
 return {...profile,best:{...profile.best,[b.round]:Math.max(profile.best[b.round]||0,stagePoints(b))},stage:Math.max(profile.stage,Math.min(11,b.round))};
}
export function exchange(profile,id){
 if(wallet(profile).available<2||profile.claims.some(c=>c.id===id))return profile;
 return {...profile,claims:[...profile.claims,{id,at:Date.now()}]};
}
// A single read/write transaction serializes updates from classroom browser tabs.
export async function profileTransaction(key,update){
 const db=await new Promise((ok,fail)=>{const req=indexedDB.open('ic3-expedition-offline',1);req.onupgradeneeded=()=>req.result.createObjectStore('profiles');req.onsuccess=()=>ok(req.result);req.onerror=()=>fail(req.error)});
 return new Promise((ok,fail)=>{const tx=db.transaction('profiles','readwrite'),store=tx.objectStore('profiles'),get=store.get(key);let value;
 get.onsuccess=()=>{const previous=get.result||{stage:0,best:{},claims:[]};value=update?update(previous):previous;if(value!==previous)store.put(value,key)};
 tx.oncomplete=()=>{db.close();ok(value)};tx.onabort=()=>{db.close();fail(tx.error)};
 });
}
