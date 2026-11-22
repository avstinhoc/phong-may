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
function hero(m,skin,t,wind,hit,recoil,index,look){
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
 // A: layered fantasy armor and a visually recognizable equipment silhouette.
 // Lightweight flat polygon inlays keep the classroom canvas responsive.
 const metal=look?.metal||'#b3d6e0',crest=look?.crest||g;
 for(const side of [-1,1]){
   const sh=plus(ch,[0,.19,side*.28]);
   m.face([plus(sh,[-.16,.07,-side*.04]),plus(sh,[.08,.10,side*.03]),
     plus(sh,[.21,-.04,side*.07]),plus(sh,[-.08,-.12,side*.04])],metal);
   m.face([plus(sh,[-.12,.05,side*.085]),plus(sh,[.05,.08,side*.11]),
     plus(sh,[.14,-.03,side*.11]),plus(sh,[.02,-.045,side*.11])],crest);
   const gauntlet=plus(ch,[.23,-.25,side*.23]);
   tube(plus(gauntlet,[-.13,.04,0]),plus(gauntlet,[.13,-.02,side*.055]),.092,.067,metal,6);
   // Knee guards with embossed fins.
   m.face([[side*.22,.37,side*.18],[side*.35,.32,side*.19],
     [side*.32,.20,side*.20],[side*.19,.20,side*.19]],metal);
 }
 m.face([plus(ch,[-.15,.21,.248]),plus(ch,[.18,.20,.248]),plus(ch,[.12,-.12,.267]),
   plus(ch,[-.12,-.12,.267])],metal);
 m.face([plus(ch,[-.11,.16,.278]),plus(ch,[.12,.14,.278]),
   plus(ch,[.04,-.10,.29]),plus(ch,[-.07,-.10,.29])],c);
 // Emblem centered on the armor, carrying the hero skin's own color.
 m.face([plus(ch,[.02,.15,.302]),plus(ch,[.10,.05,.305]),
   plus(ch,[.01,-.06,.305]),plus(ch,[-.07,.05,.305])],crest);
 ball(plus(head,[.07,.18,.275]),[.11,.075,.042],crest,7);
 if(skin.classId==='warrior'){
   // Broad sword guard, faceted blade and an off-hand shield.
   const shield=plus(ch,[.18,-.14,-.32]);
   m.face([plus(shield,[-.19,.23,0]),plus(shield,[.19,.23,0]),
     plus(shield,[.23,-.12,0]),plus(shield,[0,-.33,.03]),
     plus(shield,[-.23,-.12,0])],metal);
   m.face([plus(shield,[-.12,.14,.01]),plus(shield,[.12,.14,.01]),
     plus(shield,[.13,-.11,.02]),plus(shield,[0,-.24,.025]),
     plus(shield,[-.13,-.11,.02])],c);
   ball(plus(shield,[0,0,.035]),[.07,.09,.035],crest,7);
   tube(plus(hand,[-.16,.11,.08]),plus(hand,[.24,.12,.08]),.045,.038,crest,6);
   if((look?.level||0)>=2)tube(mix(hand,tip,.35),mix(hand,tip,.88),.045,.007,crest,5);
 } else if(skin.classId==='archer'){
   // Quiver worn over the cape, fletching differentiates the class.
   const quiver=plus(ch,[-.28,-.18,-.33]);
   tube(quiver,plus(quiver,[.08,.48,0]),.14,.12,metal,6);
   for(let j=0;j<3;j++)tube(plus(quiver,[j*.06-.1,.37,0]),
     plus(quiver,[j*.06-.1,.65,j*.035]),.018,.013,crest,5);
 } else if(skin.classId==='mage'){
   // Staff orb floating above a ring of fine metal facets.
   const gem=plus(tip,[0,.04,0]);
   for(let j=0;j<4;j++){
     const a=j*TAU/4;
     tube(plus(gem,[.16*cos(a),.15*sin(a),0]),
       plus(gem,[.22*cos(a+.15),.23*sin(a+.15),0]),.027,.007,crest,5);
   }
   ball(gem,[.095,.12,.095],crest,7);
 }
 // Each costume changes actual geometry, helmet, cape and silhouette — not hue alone.
 const style=look?.style||'knight';
 const up=(pos,x,y,z)=>plus(pos,[x,y,z]);
 const gem=(pos,color=crest)=>ball(pos,[.095,.115,.080],color,7);
 const feather=(pos,side=1,color=crest)=>m.face([
   up(pos,0,0,0),up(pos,.10,.27,side*.08),up(pos,-.04,.55,side*.11),
   up(pos,-.12,.17,side*.13)],color);
 if(style==='astronaut'){
   // Enclosed glass visor with a square oxygen backpack, side antenna.
   ball(up(head,0,.04,.15),[.33,.215,.22],'#8fe0ee');
   ball(up(head,.10,.08,.33),[.18,.13,.025],'#ddffff');
   m.face([up(ch,-.38,.16,-.28),up(ch,-.05,.17,-.48),
    up(ch,-.04,-.19,-.48),up(ch,-.38,-.19,-.28)],metal);
   tube(up(head,-.29,.18,-.15),up(head,-.42,.60,-.15),.026,.017,metal);
   gem(up(head,-.42,.61,-.15));
 } else if(style==='samurai'){
   // Wide kabuto crest, two dramatic horns, long tassels.
   for(const side of [-1,1]){
    m.face([up(head,-.28,.20,side*.10),up(head,-.20,.55,side*.31),
     up(head,.13,.64,side*.35),up(head,.20,.21,side*.08)],metal);
    tube(up(head,-.12,.52,side*.25),up(head,.14,.90,side*.55),.095,.012,crest,6);
    tube(up(ch,-.33,.09,side*.21),up(ch,-.41,-.63,side*.34),.045,.019,crest,5);
   }
 } else if(style==='pirate'){
   // Three-point hat, ornamental side cape and brass spyglass.
   m.face([up(head,-.36,.29,-.25),up(head,-.05,.66,-.32),
    up(head,.38,.35,-.16),up(head,.20,.34,.34),up(head,-.40,.32,.34)],metal);
   tube(up(ch,-.32,.15,-.23),up(ch,-.51,-.60,-.27),.20,.05,c,6);
   tube(up(hand,.04,.06,.08),up(hand,.43,.17,.07),.062,.058,crest,6);
 } else if(style==='mechanic'){
   // Dual goggles, cog shoulder and tool-filled backpack.
   for(const side of [-1,1]){
    tube(up(head,.13,.16,side*.15),up(head,.23,.17,side*.15),.12,.105,metal,8);
    gem(up(head,.25,.17,side*.15),'#c4f8ff');
    for(let j=0;j<5;j++){let a=j*TAU/5;
     tube(up(ch,-.24,.1,side*.26),up(ch,-.24+.16*cos(a),.1+.14*sin(a),side*.34),.045,.018,crest,5);
    }
   }
   tube(up(ch,-.32,-.10,-.24),up(ch,-.39,-.44,-.28),.20,.15,metal,6);
 } else if(style==='witch'){
   // Tall pointed wizard hat with asymmetric spiral ribbons.
   m.face([up(head,-.40,.18,-.21),up(head,.38,.18,-.21),
     up(head,.25,.18,.42),up(head,-.43,.18,.42)],metal);
   m.face([up(head,-.24,.26,-.16),up(head,.23,.26,-.16),
     up(head,-.13,1.11,.05)],c);
   tube(up(head,-.22,.34,.18),up(head,.16,.34,.18),.038,.038,crest,5);
 } else if(style==='paladin'){
   // Extra-tall shield and floating plated halo.
   for(let j=0;j<8;j++){let a=j*TAU/8;
    gem(up(head,.19*cos(a),.73+.14*sin(a),.10),j%2?metal:crest);
   }
   for(const side of [-1,1])m.face([up(ch,-.15,.25,side*.2),
      up(ch,-.04,.48,side*.51),up(ch,.20,.33,side*.46),up(ch,.10,.06,side*.21)],metal);
 } else if(style==='ninja'){
   // Wrapped hood, masked face and crossed short blades.
   ball(up(head,.18,-.09,.24),[.22,.10,.125],metal);
   for(const side of [-1,1]){
     tube(up(ch,-.36,.19,side*.21),up(ch,-.67,-.22,side*.34),.065,.015,c,5);
     tube(up(hand,-.08,.05,side*.06),up(hand,.22,.36,side*.19),.047,.007,'#e3faff',5);
   }
 } else if(style==='druid'){
   // Branch antlers, asymmetrical leafy cloak and luminous spores.
   for(const side of [-1,1]){
    const a=up(head,-.07,.20,side*.23),b=up(head,-.20,.76,side*.57);
    tube(a,b,.070,.023,metal,5);
    tube(up(head,-.16,.49,side*.40),up(head,.12,.72,side*.75),.044,.008,crest,5);
    m.face([up(ch,-.26,.15,side*.19),up(ch,-.67,-.35,side*.38),
     up(ch,-.31,-.50,side*.44)],c);
   }
   gem(up(ch,.15,.11,.34));
 } else if(style==='cyber'){
   // LED visor, floating antenna fins and heavy mechanical pack.
   ball(up(head,.19,.05,.27),[.19,.065,.045],crest);
   for(const side of [-1,1]){
    m.face([up(head,-.21,.24,side*.22),up(head,-.31,.61,side*.47),
       up(head,.07,.52,side*.35)],metal);
    tube(up(ch,-.18,.12,side*.30),up(ch,-.55,-.27,side*.48),.14,.07,metal,6);
   }
   for(let j=0;j<3;j++)gem(up(ch,-.41,.16-j*.15,-.33),j%2?crest:'#8acfe6');
 } else if(style==='dragon'){
   // Horned dragon mask, scale-like shoulder fins and a hooked tail.
   for(const side of [-1,1]){
    tube(up(head,-.13,.28,side*.24),up(head,-.33,.76,side*.44),.15,.005,crest,6);
    for(let j=0;j<3;j++)m.face([up(ch,-.26,.20-j*.17,side*.25),
       up(ch,-.46,.28-j*.17,side*.47),up(ch,-.21,.12-j*.17,side*.43)],metal);
   }
   tube(up(ch,-.30,-.33,-.27),up(ch,-.72,-.70,-.41),.14,.05,metal,6);
 } else if(style==='frost'){
   // Crystalline crown, ice shoulder prisms and snow-orb sceptre.
   for(let j=-2;j<=2;j++){
    let x=j*.11;
    m.face([up(head,x-.08,.32,.22),up(head,x+.07,.32,.22),
      up(head,x,.67+(.23-.07*Math.abs(j)),.18)],j%2?crest:metal);
   }
   for(const side of [-1,1])m.face([up(ch,-.12,.16,side*.25),
     up(ch,-.32,.58,side*.47),up(ch,.10,.29,side*.33)],crest);
   gem(up(tip,.05,.05,.0),'#e5ffff');
 } else if(style==='bard'){
   // Tall feather and side lute-like resonator (not another sword).
   feather(up(head,-.19,.23,-.24),-1,crest);
   ball(up(ch,-.21,-.23,.32),[.20,.26,.10],metal);
   tube(up(ch,-.22,-.13,.34),up(ch,.23,.46,.38),.04,.031,crest,6);
 } else if(style==='sky'){
   // Glider wings extending behind shoulders.
   for(const side of [-1,1])m.face([up(ch,-.18,.21,side*.17),
     up(ch,-.50,.46,side*.68),up(ch,-.85,.13,side*1.05),
     up(ch,-.37,-.15,side*.24)],metal);
 } else if(style==='royal'){
   // Large flowing twin-tabard cape and peaked royal crown.
   for(const side of [-1,1])m.face([up(ch,-.24,.19,side*.15),
     up(ch,-.67,-.46,side*.42),up(ch,-.23,-.69,side*.34)],c);
   for(let j=-2;j<=2;j++)tube(up(head,j*.12,.31,.05),
     up(head,j*.12,.56+.13*(2-Math.abs(j)),.05),.059,.012,crest,5);
 } else if(style==='aquatic'){
   // Two broad fins and a pearlescent sea crown.
   for(const side of [-1,1])m.face([up(ch,-.03,.20,side*.23),
     up(ch,-.36,.57,side*.64),up(ch,-.39,.01,side*.36)],crest);
   for(let j=0;j<3;j++)gem(up(head,-.20+j*.18,.47,.22),'#c9ffff');
 } else {
   // Knight helmet ridge and geometric crest.
   tube(up(head,-.1,.32,0),up(head,-.04,.73,0),.075,.01,crest,5);
 }
 return world(tip);
}
function creature(m,i,t,wind,hit,recoil,palette=i,wave=1,look){
 const {ball,tube,face,world}=m,c=look?.primary||colors[palette],g=look?.accent||accent[palette],dark=look?.metal||'#30263e',eye=look?.eye||'#ffca48';
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
 // A: per-name recognizable anatomy — wings, tusks, shells, scales and rune gears.
 const kind=look?.kind||'beast',variant=look?.variant||0,
   alloy=look?.metal||dark,glow=look?.energy||g;
 const left=-.7,right=.55,back=bodyY+.47;
 // Crown/spine type shifts for all seven encounters in each region.
 const spines=2+variant%3;
 for(let j=0;j<spines;j++){
   const x=left+j*.29,z=.02+(j%2)*.15;
   tube([x,back,z],[x-.12,back+.27+(variant%2)*.13,z*.88],.10,.006,j%2?alloy:g,5);
 }
 if(kind==='bird'||kind==='winged'||kind==='dragon'){
   for(const side of [-1,1]){
     const root=[-.24,bodyY+.22,side*.30],tip=[-.57,bodyY+.96+.13*sin(t*2.8),side*(1.12+variant*.05)];
     face([root,tip,[-1.25,bodyY+.32,side*.92],[-.69,bodyY-.08,side*.56]],alloy);
     for(let j=0;j<3;j++)face([tip,[-1.18-j*.13,bodyY+.12,side*(.91+j*.04)],
       [-.58-j*.11,bodyY+.40,side*.43]],j%2?g:c);
   }
 }
 if(kind==='arachnid'){
   // Longer asymmetric legs and a segmented armored carapace.
   for(const side of [-1,1])for(let j=0;j<2+variant%2;j++){
      const x=-.48+j*.39;
      tube([x,bodyY,side*.52],[x-.34,bodyY+.26+j*.11,side*(.93+j*.16)],.10,.045,alloy,5);
      tube([x-.34,bodyY+.26+j*.11,side*(.93+j*.16)],
        [x-.51,bodyY-.45,side*(1.30+j*.16)],.05,.006,g,5);
   }
 }
 if(kind==='aquatic'){
   for(const side of [-1,1])face([[-.17,bodyY+.18,side*.33],[-.86,bodyY+.66,side*.8],
      [-1.06,bodyY-.18,side*.56],[-.47,bodyY-.32,side*.37]],side<0?alloy:g);
   for(let j=0;j<3;j++){
      const a=j*.31;
      tube([-.55,bodyY-.28,.18*a],[ -.88-.10*sin(t*2+j),bodyY-.55-.09*j,a-.13],
       .095,.012,g,5);
   }
 }
 if(kind==='construct'){
   // Segmented runic metal plating on stone or robot-themed enemies.
   for(let j=0;j<3;j++){
     const x=-.65+j*.30;
     face([[x,bodyY+.26,.43],[x+.23,bodyY+.30,.43],
       [x+.18,bodyY+.02,.47],[x,bodyY-.05,.47]],j%2?alloy:g);
   }
   for(let j=0;j<3;j++){
     const x=-.32+j*.22;
     ball([x,bodyY+.21,.49],[.045,.053,.028],glow,6);
   }
 }
 if(kind==='beast'||kind==='serpent'){
   for(const side of [-1,1]){
     const ear=[.38,headY+.20,side*.33];
     tube(ear,[.11,headY+.67+variant*.03,side*.64],.13,.004,alloy,5);
   }
   for(let j=0;j<3;j++)face([[-.65+j*.22,bodyY+.17,.41],[-.50+j*.22,bodyY+.29,.46],
     [-.59+j*.22,bodyY+.12,.53]],j%2?g:alloy);
 }
 if(kind==='sprite'){
   for(let j=0;j<4;j++){
     const angle=t*.43+j*TAU/4;
     const pos=[cos(angle)*.74,bodyY+.12+sin(angle)*.32,sin(angle)*.39];
     face([plus(pos,[0,.14,0]),plus(pos,[.1,0,0]),plus(pos,[0,-.16,.04]),
       plus(pos,[-.1,0,0])],j%2?glow:alloy);
   }
 }
 if(look?.elite||look?.boss){
   // Two shoulder banners mark higher-tier foes without changing hitboxes.
   for(const side of [-1,1])face([[-.18,bodyY+.59,side*.30],
     [-.48,bodyY+1.17,side*.60],[-.77,bodyY+.89,side*.41],
     [-.55,bodyY+.28,side*.30]],alloy);
 }
 if(look?.boss){
   for(let j=-2;j<=2;j++){
     const x=j*.18;
     tube([x,bodyY+.63,.02],[x*.95,bodyY+1.02+(.25-.09*Math.abs(j)),.03],
       .085,.008,j%2?glow:alloy,6);
   }
   ball([.57,bodyY+.40,.37],[.12,.09,.045],glow,7);
 }
 return world(muzzle)
}
export function paintArena(ctx,w,h,{skin,index=0,round=1,wave=3,action='idle',time=0,elapsed=2,portrait=false,monsterAppearance=null,heroAppearance=null}){
 // Distinct creature archetypes, silhouette and palette for scouting / elite / boss.
 const region=round-1,variant=(region*3+wave*7)%22;
 const i=monsterAppearance?.archetype??(wave===7?region:(region*7+wave*5)%22);
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
 const hand=hero(model(draw,heroPos),skin,t,att?wind:0,att?swing:0,counter?flinch:0,index,heroAppearance);
 let mouth;if(!portrait)mouth=creature(model(draw,foePos,monsterScale,-1),i,t,counter?wind:0,counter?swing:0,att?flinch:0,palette,wave,monsterAppearance);
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
