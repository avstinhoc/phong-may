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
 {min:20, label:'Tia lửa vàng',color:'#f9ba37',core:'#fff5c4',size:20.0,glow:7.0},
 {min:24, label:'Lửa vàng',color:'#ffad32',core:'#fff0a0',size:20.4,glow:7.8},
 {min:28, label:'Lửa hổ phách',color:'#ff982c',core:'#ffe18c',size:20.9,glow:8.6},
 {min:32, label:'Lửa cam nhạt',color:'#ff8428',core:'#ffdc79',size:21.4,glow:9.3},
 {min:36, label:'Lửa cam rực',color:'#ff7026',core:'#ffd172',size:21.8,glow:10.1},
 {min:40, label:'Lửa cam đỏ',color:'#ff5f28',core:'#ffbe73',size:22.3,glow:10.9},
 {min:44, label:'Lửa đỏ cam',color:'#ff4c2c',core:'#ffb87b',size:22.7,glow:11.7},
 {min:48, label:'Lửa đỏ',color:'#f83e3e',core:'#ffb58c',size:23.1,glow:12.5},
 {min:52, label:'Lửa đỏ hồng',color:'#f33957',core:'#ffc0a8',size:23.6,glow:13.2},
 {min:56, label:'Lửa hồng đậm',color:'#ec3774',core:'#ffc8b7',size:24.1,glow:14.0},
 {min:60, label:'Lửa hồng neon',color:'#e33591',core:'#ffd0df',size:24.5,glow:14.8},
 {min:64, label:'Lửa tím hồng',color:'#d633b0',core:'#ffd2f7',size:24.9,glow:15.6},
 {min:68, label:'Lửa tím sen',color:'#c434c8',core:'#fbc3ff',size:25.4,glow:16.4},
 {min:72, label:'Lửa tím sáng',color:'#b53add',core:'#f8c6ff',size:25.9,glow:17.1},
 {min:76, label:'Lửa tím neon',color:'#a441ec',core:'#ebc0ff',size:26.3,glow:17.9},
 {min:80, label:'Lửa tím đậm',color:'#924cf1',core:'#dcc3ff',size:26.8,glow:18.7},
 {min:84, label:'Lửa chàm',color:'#805cf4',core:'#d2c9ff',size:27.2,glow:19.5},
 {min:88, label:'Lửa lam tím',color:'#6c70f5',core:'#c9d9ff',size:27.6,glow:20.3},
 {min:92, label:'Lửa xanh tím',color:'#5682f4',core:'#c5e0ff',size:28.1,glow:21.0},
 {min:96, label:'Lửa xanh dương',color:'#4195f1',core:'#c0edff',size:28.6,glow:21.8},
 {min:100, label:'Lửa xanh neon',color:'#2aa8e9',core:'#c0faff',size:29.0,glow:22.6},
 {min:110, label:'Lửa xanh biển',color:'#13b9dd',core:'#c4ffff',size:29.5,glow:23.4},
 {min:120, label:'Lửa ngọc lam',color:'#0acac6',core:'#c7ffee',size:29.9,glow:24.2},
 {min:135, label:'Lửa lục bảo',color:'#1bd2ab',core:'#d1ffe4',size:30.4,glow:24.9},
 {min:150, label:'Lửa ngọc rực',color:'#4cd791',core:'#f3ffbe',size:30.8,glow:25.7},
 {min:175, label:'Lửa băng pha lê',color:'#5ce2ee',core:'#dafaff',size:31.3,glow:26.5},
 {min:200, label:'Lửa cực quang',color:'#d46cf5',core:'#92fff1',size:31.7,glow:27.3},
];
// Four-star steps from 20 to 100 let students level up about once per school day.
// Higher ranks take longer so the rare effects remain meaningful.
export function flameEffect(value){
 const wallet=typeof value==='object'&&value!==null?value:{effect_score:value};
 const score=Math.max(0,Number(wallet.effect_score)||0);
 const earned=Number(wallet.earned??score)||0;
 const state=wallet.flame_state||(score>=20?'active':'off');
 if(earned<20||state==='off')return {visible:false,state:'off',tier:null,style:undefined};
 const index=Math.max(0,FIRE_TIERS.findLastIndex(t=>score>=t.min));
 const rawTier=FIRE_TIERS[index];
 const next=FIRE_TIERS[index+1];
 const gray=state==='gray',cooling=state==='cooling';
 const color=gray?'#939da8':rawTier.color;
 const core=gray?'#dde3e8':rawTier.core;
 const glow=gray?4:cooling?Math.max(6,rawTier.glow-5):rawTier.glow;
 return {
  visible:true,state,tier:index+1,label:rawTier.label,
  nextMin:next?.min??null,remaining:next?Math.max(0,next.min-score):0,
  className:'flame-pc flame-pc--'+state+' flame-pc--tier-'+(index+1),
  style:{
   '--flame-color':color,'--flame-core':core,'--flame-glow':glow+'px',
   '--flame-size':(rawTier.size+(gray?-2:0))+'px',
   '--flame-speed':Math.max(.72,1.65-index*.032)+'s',
   '--flame-frame-width':index>=18?3:index>=7?2.5:2+'px',
   '--flame-ring-speed':Math.max(1.8,4-index*.085)+'s'
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
