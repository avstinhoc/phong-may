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

// Earned stars unlock higher visuals. Redemption never changes flame eligibility;
// disciplinary penalties and inactive award days reduce effect_score in the DB.
export const FIRE_TIERS = [
 {min:20, label:'Mồi lửa',color:'#f9ae32',core:'#fff1a9',size:20,glow:7},
 {min:30, label:'Lửa cam',color:'#ff7726',core:'#ffdf74',size:22,glow:9},
 {min:40, label:'Lửa đỏ',color:'#f34437',core:'#ffc165',size:24,glow:11},
 {min:50, label:'Lửa hồng',color:'#f33f79',core:'#ffc0b0',size:26,glow:13},
 {min:65, label:'Lửa tím',color:'#b947d8',core:'#f5a9ff',size:28,glow:16},
 {min:85, label:'Lửa tím huyền',color:'#8554f1',core:'#d9bbff',size:30,glow:19},
 {min:110,label:'Lửa xanh dương',color:'#3089f0',core:'#acd9ff',size:32,glow:23},
 {min:150,label:'Lửa lam ngọc',color:'#0acaba',core:'#c5fff0',size:34,glow:27},
 {min:220,label:'Lửa cực quang',color:'#d472f9',core:'#7ffff6',size:37,glow:31}
];
export function flameEffect(value){
 const wallet=typeof value==='object'&&value!==null?value:{effect_score:value};
 const score=Math.max(0,Number(wallet.effect_score)||0);
 const earned=Number(wallet.earned??score)||0;
 const state=wallet.flame_state|| (score>=20?'active':'off');
 if(earned<20||state==='off')return {visible:false,state:'off',tier:null,style:undefined};
 const rawTier=FIRE_TIERS.filter(t=>score>=t.min).at(-1)||FIRE_TIERS[0];
 const index=FIRE_TIERS.indexOf(rawTier);
 const gray=state==='gray', cooling=state==='cooling';
 const color=gray?'#939da8':rawTier.color;
 const core=gray?'#dde3e8':rawTier.core;
 const glow=gray?4:cooling?Math.max(6,rawTier.glow-5):rawTier.glow;
 return {
  visible:true, state, tier:index+1,label:rawTier.label,
  className:'flame-pc flame-pc--'+state+' flame-pc--tier-'+(index+1),
  style:{
   '--flame-color':color,'--flame-core':core,'--flame-glow':glow+'px',
   '--flame-size':(rawTier.size+(gray?-2:0))+'px',
   '--flame-speed':Math.max(.8,1.65-index*.07)+'s'
  }
 };
}
export function fireStyle(value){return flameEffect(value).style;}

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
