// Awarded stars persist in history; candy redemption spends the available balance.
export const starTotals=(records,studentId)=>{
 const items=(records||[]).filter(x=>x.student_id===studentId&&x.record_type==='reward');
 const earned=items.reduce((n,x)=>n+Math.max(0,Number(x.points)||0),0);
 const balance=items.reduce((n,x)=>n+(Number(x.points)||0),0);
 return {earned:Math.round(earned),available:Math.max(0,Math.round(balance))};
};
export const starLeaderboard=(students,records)=>(students||[])
 .filter(s=>s.status==='active')
 .map(s=>({...s,stars:starTotals(records,s.id)}))
 .sort((a,b)=>b.stars.earned-a.stars.earned||b.stars.available-a.stars.available||
   String(a.full_name).localeCompare(String(b.full_name),'vi'))
 .map((s,i)=>({...s,rank:i+1}));
