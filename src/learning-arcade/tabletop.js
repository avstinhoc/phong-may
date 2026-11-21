// Faceted meshes share one camera and light. Units and joints are in arena space.
const TAU=2*Math.PI;
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const plus=(a,b)=>a.map((v,i)=>v+b[i]);
const unit=v=>v.map(n=>n/(Math.hypot(...v)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const sin=Math.sin,cos=Math.cos;
const colors=['#9341cc','#339989','#f49c32','#5262bd','#69bcdb','#c34e32','#7eaf44','#415da4','#463b70','#f58033','#81b6c3','#333854','#cb6287','#796795','#5482bb','#8773be','#e7849e','#ac7a47','#b94a40','#493e79','#469794','#495d8a'];
const accent=['#ffc843','#f4d579','#382238','#a693ff','#fff0c3','#ffb236','#e75f86','#65dec9','#57d9ff','#ffe36b','#e5ffff','#ffbd47','#ffe298','#ffcd94','#c7fbff','#ffd7fa','#aaf4ff','#ffe5a0','#f1c79b','#daacff','#fd9d88','#c1ffcf'];
const shadeCache=new Map();
function shade(color,s){const n=Math.round(Math.max(.46,Math.min(1.24,s))*36),key=color+n;if(!shadeCache.has(key))shadeCache.set(key,'rgb('+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(color.slice(i,i+2),16)*n/36))).join(',')+')');return shadeCache.get(key)}
function model(draw,origin,scale=1,mirror=1){
 const world=p=>[origin[0]+p[0]*scale*mirror,origin[1]+p[1]*scale,origin[2]+p[2]*scale];
 const face=(pts,c)=>draw(pts.map(world),c);
 function tube(a,b,r,s,c,n=7){
  const axis=unit(b.map((v,i)=>v-a[i])),u=unit(cross(axis,Math.abs(axis[1])>.85?[1,0,0]:[0,1,0])),v=cross(axis,u);
  function ring(p,r){return Array.from({length:n},(_,i)=>p.map((x,j)=>x+r*(cos(i*TAU/n)*u[j]+sin(i*TAU/n)*v[j])))}
  const A=ring(a,r),B=ring(b,s);for(let i=0;i<n;i++){const k=(i+1)%n;face([A[i],A[k],B[k],B[i]],c)}if(s)face(B,c);if(r)face(A,c)
 }
 function ball(p,r,c,n=9){let prev;for(let j=0;j<=6;j++){const b=Math.PI*(j/6-.5),row=Array.from({length:n},(_,i)=>[p[0]+r[0]*cos(b)*cos(i*TAU/n),p[1]+r[1]*sin(b),p[2]+r[2]*cos(b)*sin(i*TAU/n)]);if(prev)for(let i=0;i<n;i++){const k=(i+1)%n;face([prev[i],prev[k],row[k],row[i]],c)}prev=row}}
 return {world,face,tube,ball};
}
function hero(m,skin,t,wind,hit,recoil,index){
 const {tube,ball,world}=m,c=skin.outfit,g=skin.trim,d='#263047',gold='#ffd376',idle=sin(t*2.8)*.026;
 const hips=[-.09*wind+.08*hit,.73-.14*wind+.02*hit,0],ch=plus(hips,[.02+.15*hit-.13*wind-.12*recoil,.36+idle,0]);
 for(const s of [-1,1]){let foot=[s*.24,.10,s*.12],knee=[foot[0]+.13+.14*wind,.40-.06*wind,s*.16];tube(hips,knee,.13,.11,d);tube(knee,foot,.13,.11,c);ball(plus(foot,[.06,0,.03]),[.19,.11,.13],d)}
 ball(ch,[.32,.36,.24],c);ball(plus(ch,[0,.02,.18]),[.23,.23,.09],g);
 const head=plus(ch,[.04,.49,0]);ball(head,[.31,.31,.28],skin.skin);ball(plus(head,[-.035,.17,-.01]),[.34,.22,.29],c);
 tube(plus(head,[-.11,.25,0]),plus(head,[-.27,.53,-.06]),.13,.02,g);
 ball(plus(head,[.23,.015,.145]),[.052,.067,.044],d);ball(plus(head,[.30,-.065,.04]),[.077,.062,.076],skin.skin);
 const cape=plus(ch,[-.25,-.54-.05*wind,-.14]);m.face([plus(ch,[-.1,.24,-.18]),plus(ch,[-.17,.24,.13]),plus(cape,[-.28*hit-.09*sin(t*3),0,.25]),plus(cape,[-.34*hit,0,-.18])],g);
 // Layered pauldrons, helmet cheek plates and a bright chest crest.
 for(const side of [-1,1]){
  const temple=plus(head,[-.015,.08,side*.23]);
  tube(temple,plus(temple,[-.09,.25,side*.10]),.085,.008,g);
  ball(plus(head,[-.04,-.04,side*.23]),[.13,.14,.045],c);
  ball(plus(ch,[.02,.17,side*.26]),[.165,.105,.13],g);
 }
 tube(plus(ch,[.11,.15,.17]),plus(ch,[-.10,-.19,.17]),.044,.037,gold,5);
 let hand;for(const s of [-1,1]){const shoulder=plus(ch,[0,.17,s*.23]),elbow=plus(shoulder,[.04-.22*wind+.20*hit,-.22+.12*wind,s*.07]),wrist=plus(elbow,[.22-.29*wind+.10*hit,.035+.32*wind+.12*hit,s*.02]);tube(shoulder,elbow,.12,.092,c);ball(shoulder,[.16,.15,.14],g);tube(elbow,wrist,.091,.07,d);ball(wrist,[.083,.08,.085],skin.skin);if(s===1)hand=wrist}
 if(skin.gear){
  const socket=plus(hand,[-.05,.036,.05]);ball(socket,[.115,.095,.115],g);
  for(let j=0;j<skin.gear;j++){const a=j*TAU/skin.gear;const root=plus(socket,[.06*cos(a),.04,.06*sin(a)]);tube(root,plus(root,[.06*cos(a),.10,.06*sin(a)]),.033,0,gold,5)}
 }
 let tip=plus(hand,[.16-.54*wind+.60*hit,.70-.42*hit,.01]);
 if(skin.classId==='archer'){const a=plus(hand,[.08,.37,0]),b=plus(hand,[.10,-.34,0]),mid=plus(hand,[.24,.04,0]);tube(a,mid,.04,.05,g);tube(mid,b,.05,.035,g);tube(a,b,.012,.012,gold);tip=mid}
 else if(skin.classId==='mage'){tube(hand,tip,.034,.032,'#995f45');ball(tip,[.12,.18,.12],g)}
 else{tube(hand,mix(hand,tip,.23),.045,.045,d);tube(plus(hand,[-.09,.1,0]),plus(hand,[.13,.05,0]),.041,.04,gold);tube(mix(hand,tip,.19),tip,.092,0,'#e5f6fb',4);if(index===15||index===18)ball(tip,[.20,.16,.14],gold)}
 // Detailed class-specific armor: pauldrons, engraved belt, bracers and plated greaves.
 for(const side of [-1,1]){
   const shoulder=plus(ch,[-.015,.18,side*.27]);
   ball(shoulder,[.20,.15,.16],g);
   tube(plus(hips,[.025,0,side*.09]),plus(hips,[.21,-.20,side*.18]),.07,.03,gold);
   tube(plus(hips,[.1,-.30,side*.12]),plus(hips,[.10,-.39,side*.13]),.15,.11,g);
   const arm=plus(ch,[.21,-.09,side*.22]);tube(arm,plus(arm,[.15,-.21,side*.05]),.10,.05,g);
 }
 tube(plus(ch,[-.15,-.22,.18]),plus(ch,[.15,-.22,.18]),.065,.055,gold);
 ball(plus(ch,[.02,.13,.28]),[.09,.12,.035],gold);
 for(let j=0;j<3;j++)ball(plus(ch,[.10-j*.07,.13-j*.11,.292]),[.028,.032,.017],g);
 return world(tip);
}
function creature(m,i,t,wind,hit,recoil,palette=i,wave=1){
 const {ball,tube,face,world}=m,c=colors[palette],g=accent[palette],dark='#30263e',eye='#ffca48';
 const bodyY=.82+.045*sin(t*2.3)-.13*wind+.08*hit, headY=bodyY+.37;let muzzle;
 function skull(p,r){ball(p,[r,r*.78,r*.90],c);ball(plus(p,[r*.64,-r*.14,r*.05]),[r*.7,r*.39,r*.64],g);
 for(const s of [-1,1]){ball(plus(p,[r*.60,r*.13,s*r*.59]),[r*.20,r*.23,r*.15],eye);ball(plus(p,[r*.70,r*.13,s*r*.65]),[r*.09,r*.16,r*.08],dark);tube(plus(p,[-r*.18,r*.50,s*r*.42]),plus(p,[-r*.50,r*1.14,s*r*.61]),r*.19,0,g)}
 muzzle=plus(p,[r*1.25,-r*.12,0]);}
 if(i>=12){
  const form=i-12, floating=[0,2,3,7,8].includes(form), y=bodyY+(floating?.25*sin(t*2)+.25:0);
  const length=[.53,.65,.98,.43,.64,1.04,.65,.50,.39,1.08][form];
  ball([0,y,0],[length,.45+.09*(form%3),.44],c);
  skull([length*.8+.12*hit,y+.20,0],.28+.04*(form%3));
  if([3,7].includes(form))for(const side of [-1,1]){
   const tip=[-.25,y+.78+.20*sin(t*4),side*1.18];face([[.30,y+.2,0],tip,[-.8,y-.1,side*.67]],g);
   tube([.3,y+.2,0],tip,.07,.016,c);
   if(form===3)ball([-.22,y+.36,side*.65],[.19,.19,.08],eye);
  }
  if([0,8,9].includes(form))for(let k=0;k<3+form%4;k++){const z=(k-2)*.16, a=[-.24,y-.24,z],b=[-.54+.17*sin(t*2+k),y-.65,z];tube(a,b,.11,.08,c);tube(b,[-.86+.20*sin(t*2+k),y-.85+.10*k,z],.08,.01,g)}
  if(form===1)for(let k=0;k<5;k++){const a=k*.98;ball([-.2+.21*cos(a),y+.32+.21*sin(a),.08*k],[.30,.28,.13],k%2?g:c)}
  if([4,5,6].includes(form))for(const side of [-1,1])for(let k=0;k<(form===5?8:4);k++){const x=-length+k*(form===5?.26:.30),a=[x,y,side*.34],b=[x+.04,.38,side*.6];tube(a,b,.10,.08,c);tube(b,[x+.15,.03,side*.74],.08,.013,g);if(form===4)tube(a,[x-.25,y+.63,side*.73],.15,.009,g)}
  if(form===6)for(const side of [-1,1]){const claw=[.82+.24*hit,y+.14,side*.65];tube([.34,y,side*.3],claw,.13,.15,c);for(const v of [-1,1])tube(claw,plus(claw,[.32,v*.17,0]),.15,.015,g)}
  if(form===2||form===9)for(const side of [-1,1])face([[-.80,y,0],[-1.29,y+.24,side*.55],[-1.06,y-.19,0]],g);
 }else if(i===0||i===8){
 ball([-.32,bodyY,0],[.77,.69,.72],c);ball([.43,bodyY-.04,0],[.55,.46,.55],c);
 for(const s of [-1,1])for(let n=0;n<4;n++){const x=-.64+n*.32,root=[x,bodyY-.07,s*.44],knee=[x+(n-1.5)*.18,bodyY+.12+.11*sin(t*3+n),s*.99],ankle=[knee[0]+(n-1.5)*.17,.25+.09*hit,s*1.26];tube(root,knee,.13,.14,c);tube(knee,ankle,.14,.092,dark);tube(ankle,[ankle[0]+.09,.025,s*1.33],.094,.024,c)}
 for(const s of [-1,1]){ball([.84,bodyY+.09,s*.22],[.13,.17,.13],eye);tube([.78,bodyY-.20,s*.24],[.94+.16*hit,bodyY-.47,s*.25],.09,.01,g)}
 for(let n=0;n<3;n++)tube([-.69+n*.25,bodyY+.52,0],[-.77+n*.25,bodyY+.89,0],.10,0,g);
 muzzle=[.95,bodyY-.11,0];
 if(i===8){const a=[-.7,bodyY,0],b=[-1.08,1.38,0],d=[-.83,1.95,0];tube(a,b,.19,.15,c);tube(b,d,.16,.12,c);muzzle=[-.44+.52*hit,1.79-.38*hit,0];tube(d,muzzle,.13,0,g)}
 }else if(i===1){
 ball([0,bodyY+.24,0],[.57,.68,.45],c);skull([.06,bodyY+1.05,0],.38);for(const s of [-1,1]){ball([0,bodyY+.57,s*.52],[.36,.34,.34],g);const f=[.22+.57*hit-.23*wind,bodyY-.06+.25*hit,s*.69];tube([0,bodyY+.5,s*.52],f,.20,.19,dark);ball(f,[.35,.34,.29],c);tube([0,.68,s*.25],[.04,.15,s*.33],.20,.18,c);ball([.11,.13,s*.33],[.28,.13,.19],dark);if(s===1)muzzle=f}
 }else if(i===7||i===6){
 ball([0,bodyY+.15,0],[.62,.73,.55],c);skull([.11,bodyY+.65,0],.40);
 for(let n=0;n<8;n++){const a=n*TAU/8,k=[cos(a)*.75,.35+.15*sin(t*3+n),sin(a)*.66],end=[cos(a)*1.03+.12*hit,.23+.24*(1+sin(t*3+n)),sin(a)*.88];tube([0,.75,0],k,.18,.11,c);tube(k,end,.12,.036,g);if(i===6)ball(end,[.10,.16,.12],g)}
 }else{
 const winged=[3,4,9,11].includes(i),heads=i===2?3:1;
 ball([-.13,bodyY,0],[.78,.57,.55],c);
 for(const s of [-1,1])for(const n of [-1,1]){let k=[n*.46+.06,.4-.06*wind,s*.4],f=[n*.52+.12,.09,s*.46];tube([n*.42,bodyY,s*.32],k,.18,.14,c);tube(k,f,.14,.095,g);ball(f,[.16,.10,.12],dark)}
 for(let n=0;n<heads;n++){let z=(n-(heads-1)/2)*.52,k=[.32,headY+.08,z*.55],p=[.58+.37*hit-.15*wind,headY+.45+.06*sin(t*2+n)-Math.abs(z)*.31,z];tube([.23,bodyY,0],k,.27,.20,c);tube(k,p,.21,.17,c);skull(p,i===10?.48:.32);if(i===10||i===5)for(const s of [-1,1])tube(plus(p,[.21,-.13,s*.19]),plus(p,[.53,.12,s*.26]),.085,0,'#fff0c8')}
 let k=[-.95,.69,.13*sin(t*2)];tube([-.60,bodyY,0],k,.23,.14,c);tube(k,[-1.37,.86+.15*sin(t*2),.15],.14,.014,g);
 if(winged)for(const s of [-1,1]){const a=[-.02,bodyY+.28,s*.29],b=[-.18,bodyY+1.0+.16*sin(t*3),s*.85],d=[-.78,bodyY+1.40+.26*sin(t*3),s*1.25],e=[-1,bodyY+.49,s*.83];face([a,b,d,e],g);face([a,e,[-.69,bodyY+.22,s*.60]],c);tube(a,b,.09,.063,c);tube(b,d,.067,.012,c)}
 }
 // High-wave enemies earn distinct crowns, asymmetrical fins and plated armor.
 if(wave>=3){
   for(const side of [-1,1]){
     const start=[-.2,bodyY+.45,side*.35],tip=[-.5-wave*.04,bodyY+.85+wave*.055,side*(.55+.04*wave)];
     tube(start,tip,.12,.008,g);
     if(wave>=5)face([start,tip,[-1.15,bodyY+.24,side*.47]],c);
   }
   for(let n=0;n<(wave>=5?4:2);n++){
     const v=[-.48+n*.25,bodyY+.39,.14*n-.2];
     ball(v,[.10,.15,.09],n%2?g:eye);
   }
 }
 // A ridge of overlapping scales and paired fangs follows the attack anchor.
 for(let n=0;n<4;n++){
  const root=[-.63+n*.20,bodyY+.48+.10*sin(n*.8),-.05];
  tube(root,plus(root,[-.15,.25+.08*sin(n),0]),.11,.009,g,5);
 }
 for(const side of [-1,1]){
  const fang=plus(muzzle,[-.10,-.03,side*.10]);
  tube(fang,plus(fang,[.05,-.15,.015*side]),.058,.006,'#ffe4ac',5);
 }
 return world(muzzle)
}
export function paintArena(ctx,w,h,{skin,index=0,round=1,wave=3,action='idle',time=0,elapsed=2,portrait=false}){
 // Distinct creature archetypes, silhouette and palette for scouting / elite / boss.
 const region=round-1,variant=(region*3+wave*7)%22;
 const i=wave===7?region:(region*7+wave*5)%22;
 const monsterScale=wave===7?1.78+Math.min(16,region)*.065:1.04+wave*.095+region*.015;
 const palette=wave===7?region:(region*5+wave*11)%22;
 const t=time,p=Math.min(1,elapsed/1.15),att=action==='strike',counter=action==='counter';
 const wind=(att||counter)?Math.sin(Math.PI*Math.min(1,p/.33)):0;
 const swing=(att||counter)?smooth((p-.27)/.22)*(1-smooth((p-.64)/.34)):0;
 const ranged=att?skin.classId!=='warrior':![0,1,5,8,10].includes(i);
 const impact=ranged?.69:.49,flinch=(att||counter)?smooth((p-impact)/.05)*(1-smooth((p-impact-.08)/.22)):0;
 const faces=[],yaw=.23,ct=cos(yaw),st=sin(yaw),tilt=.14;
 const scale=portrait?Math.min(w*.65,h*.46):Math.min(w/7.7,h/3.45);
 const project=([x,y,z])=>[w*.50+scale*(x*ct+z*st),h*(portrait?.94:.85)-scale*(y-z*tilt+x*.022),z*ct-x*st+y*.10];
 const draw=(ps,c)=>{const a=ps.map(project),[u,v,z]=a;const n=unit(cross([v[0]-u[0],u[1]-v[1],(v[2]-u[2])*scale],[z[0]-u[0],u[1]-z[1],(z[2]-u[2])*scale]));const s=n[2]<0?-1:1;faces.push([a,shade(c,.81+.37*s*(-n[0]*.44+n[1]*.78+n[2]*.34)),a.reduce((r,p)=>r+p[2],0)/a.length])};
 ctx.clearRect(0,0,w,h);
 const playerX=portrait?0:-2.35,enemyX=1.52;
 const heroY=action==='defeat'?-.33:0,foeY=action==='victory'?-.43:0;
 const contact=enemyX-(i===8?.72:.67)*monsterScale;
 const heroTravel=att?swing*(ranged?.15:Math.max(.1,contact-playerX-1.14)):0;
 const foeTravel=counter?swing*(ranged?.15:Math.max(.1,enemyX-playerX-.4-monsterScale*.96)):0;
 const heroPos=[playerX+heroTravel-(counter?.18*flinch:0),heroY,.23],foePos=[enemyX-foeTravel+(att?.20*flinch:0),foeY,-.15];
 function shadow(p,rx,rz){const a=project(p);ctx.fillStyle='rgba(27,53,32,.23)';ctx.beginPath();ctx.ellipse(a[0],a[1],rx*scale,rz*scale,0,0,TAU);ctx.fill()}
 shadow(heroPos,.41,.11);if(!portrait)shadow(foePos,monsterScale*.92,monsterScale*.19);
 const hand=hero(model(draw,heroPos),skin,t,att?wind:0,att?swing:0,counter?flinch:0,index);
 let mouth;if(!portrait)mouth=creature(model(draw,foePos,monsterScale,-1),i,t,counter?wind:0,counter?swing:0,att?flinch:0,palette,wave);
 faces.sort((a,b)=>a[2]-b[2]);for(const [ps,c] of faces){ctx.fillStyle=ctx.strokeStyle=c;ctx.lineWidth=.55;ctx.beginPath();ps.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke()}
 if(portrait||!(att||counter))return;
 const start=att?hand:mouth,target=att?[contact,monsterScale*1.03,0]:[heroPos[0]+.12,1.23,.22];
 const hue=att?skin.trim:accent[palette],style=att?index:i;
 function line(points,c,width){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}
 // Charge sparks converge on the actual hand or jaw before release.
 if(p>.08&&p<.37){const v=(p-.08)/.29;for(let n=0;n<5;n++){const a=n*TAU/5+v*2,r=(1-v)*.34+.04;
 line([plus(start,[cos(a)*r,sin(a)*r,.22]),plus(start,[cos(a)*r*.68,sin(a)*r*.68,.22])],hue,Math.max(1.5,scale*.022))}}
 if(ranged&&p>=.37&&p<impact){
 const u=smooth((p-.37)/(impact-.37));for(let j=0;j<1+style%3;j++){const curve=v=>plus(mix(start,target,v),[0,Math.sin(v*Math.PI)*(.12+j*.27),j*.03]);const tip=curve(u),tail=curve(Math.max(0,u-.18));line([curve(Math.max(0,u-.34)),tail,tip],hue,Math.max(3,scale*.09));line([tail,tip],'#fff8cf',Math.max(1,scale*.027));const [x,y]=project(tip);ctx.fillStyle='#fff4cf';ctx.beginPath();ctx.arc(x,y,Math.max(2,scale*.054),0,TAU);ctx.fill()}}
 if(!ranged&&p>.36&&p<.55){const side=att?1:-1;line([plus(start,[-side*.32,.29,0]),plus(start,[-side*.12,.16,.02]),start],hue,Math.max(2,scale*.035))}
 if(p>=impact&&p<impact+.21){const ripple=(p-impact)/.21;ctx.save();ctx.globalAlpha=.70*(1-ripple);const center=project(target);ctx.beginPath();ctx.strokeStyle=hue;ctx.lineWidth=2;ctx.ellipse(center[0],center[1],2+scale*.44*ripple,2+scale*.32*ripple,-.4,0,TAU);ctx.stroke();ctx.restore();const v=(p-impact)/.21;ctx.save();ctx.globalAlpha=1-v;for(let n=0;n<8+style%5;n++){const a=n*2.4;line([plus(target,[cos(a)*v*.48,sin(a)*v*.48,.4]),plus(target,[cos(a)*(v*.48+.14),sin(a)*(v*.48+.14),.4])],n%2?hue:'#fffbd0',Math.max(2,scale*.035))}ctx.restore()}
}
