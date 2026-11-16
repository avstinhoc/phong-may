export const dayPeriod = time=>time<'12:00'?'morning':time<'18:00'?'afternoon':'evening';
export const timeValue = row=>String(row?.start_time||'').slice(0,5);
export const toMinutes = time => Number(time.slice(0,2))*60+Number(time.slice(3,5));
export function slotGroups(rows){
 const groups=[{id:'morning',label:'SÁNG',rows:[]},{id:'afternoon',label:'CHIỀU',rows:[]},{id:'evening',label:'TỐI',rows:[]}];
 for(const row of rows||[]){
   const start=timeValue(row);
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))continue;
   groups.find(g=>g.id===dayPeriod(start)).rows.push(row);
 }
 const result=[];
 for(const g of groups){
   const unique=[...new Set(g.rows.map(timeValue))].sort((a,b)=>toMinutes(a)-toMinutes(b));
   if(!unique.length){
     if(g.id!=='evening')result.push({id:g.id,label:g.label,slots:[{key:g.id+'-none',empty:true}]});
     continue;
   }
   const differences=unique.slice(1).map((x,i)=>toMinutes(x)-toMinutes(unique[i]));
   // Prefer a real interval seen in the current week, never invent a clock time for gaps.
   const reasonable=differences.filter(x=>x>=25&&x<=75);
   const typical=reasonable.length?Math.min(...reasonable):50;
   const slots=[];
   unique.forEach((time,i)=>{
     if(i){
       const delta=toMinutes(time)-toMinutes(unique[i-1]);
       if(delta>Math.max(85,typical*1.65)){
         const missing=Math.min(2,Math.max(1,Math.round(delta/typical)-1));
         for(let j=0;j<missing;j++)slots.push({key:g.id+'-gap-'+i+'-'+j,gap:true});
       }
     }
     slots.push({key:g.id+'-'+time,time});
   });
   result.push({id:g.id,label:g.label,slots});
 }
 return result;
}
