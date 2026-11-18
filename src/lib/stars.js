// Awarded stars persist in history; candy redemption spends the available balance.
export const starTotals=(records,studentId)=>{
 const items=(records||[]).filter(x=>x.student_id===studentId&&x.record_type==='reward');
 const earned=items.reduce((n,x)=>n+Math.max(0,Number(x.points)||0),0);
 const balance=items.reduce((n,x)=>n+(Number(x.points)||0),0);
 return {earned:Math.round(earned),available:Math.round(balance)};
};
export const starLeaderboard=(students,records)=>(students||[])
 .filter(s=>s.status==='active')
 .map(s=>({...s,stars:starTotals(records,s.id)}))
 .sort((a,b)=>b.stars.earned-a.stars.earned||b.stars.available-a.stars.available||
   String(a.full_name).localeCompare(String(b.full_name),'vi'))
 .map((s,i)=>({...s,rank:i+1}));

export const FIRE_TIERS = [
 {min:20,color:'#da5819',size:4,hue:0},
 {min:30,color:'#d52c59',size:7,hue:322},
 {min:45,color:'#8553dc',size:10,hue:245},
 {min:65,color:'#008fae',size:14,hue:165}
];
export function fireStyle(score){
 const tier=FIRE_TIERS.filter(t=>score>=t.min).at(-1);
 return tier?{'--fire-color':tier.color,'--fire-size':tier.size+'px','--fire-hue':tier.hue+'deg'}:undefined;
}
export function groupedHistory(rows){
 const groups=[];
 for(const row of rows){
  const kind=row.record_type==='reward'?(row.star_event||(row.points<0?'redeem':'award')):null;
  const last=groups.at(-1);
  if(kind && last?.kind===kind && last.student_id===row.student_id && last.record_date===row.record_date){
   last.points+=Number(row.points);
  }else{
   groups.push({...row,kind,points:Number(row.points),title:({award:'Khen thưởng',redeem:'Đã đổi quà'})[kind]||row.title});
  }
 }
 return groups;
}

export function isFormalViolation(row){
 return row.record_type==='violation'&&!['mất trật tự','lỗi mất trật tự'].includes(row.title?.trim().toLowerCase());
}
