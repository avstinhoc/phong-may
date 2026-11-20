import React,{useMemo} from 'react';

/**
 * All sprites are original procedural pixel artwork, not copied game assets.
 * Crisp SVG pixels remain sharp in low-spec classroom Windows PCs and can be
 * recolored without network fetches or third-party sprite licenses.
 */
export const HERO_SKINS=[
 {id:'warrior-aqua',name:'Kiếm sĩ Sao Xanh',classId:'warrior',job:'Kiếm sĩ',hair:'#25365a',trim:'#5ce9d1',outfit:'#277baf',skin:'#f5bd99',hairStyle:0},
 {id:'warrior-sun',name:'Chiến binh Ánh Dương',classId:'warrior',job:'Kiếm sĩ',hair:'#d78939',trim:'#fff0a3',outfit:'#bd5d35',skin:'#f2c09c',hairStyle:1},
 {id:'warrior-night',name:'Hiệp sĩ Màn Đêm',classId:'warrior',job:'Kiếm sĩ',hair:'#353151',trim:'#bda3ff',outfit:'#6659b5',skin:'#cf9273',hairStyle:2},
 {id:'warrior-fire',name:'Thợ rèn Sao Lửa',classId:'warrior',job:'Kiếm sĩ',hair:'#ab3b38',trim:'#ffbb70',outfit:'#b94b51',skin:'#eab38b',hairStyle:3},
 {id:'archer-forest',name:'Cung thủ Rừng Số',classId:'archer',job:'Cung thủ',hair:'#32614f',trim:'#b4f38c',outfit:'#328477',skin:'#d59c77',hairStyle:4},
 {id:'archer-sky',name:'Xạ thủ Mây Xanh',classId:'archer',job:'Cung thủ',hair:'#3368a4',trim:'#9fe7ff',outfit:'#386abf',skin:'#e5af93',hairStyle:5},
 {id:'archer-rose',name:'Thợ săn Hoa Hồng',classId:'archer',job:'Cung thủ',hair:'#b75b82',trim:'#ffbed4',outfit:'#9c5079',skin:'#efc09e',hairStyle:6},
 {id:'archer-copper',name:'Người Gác Đường Truyền',classId:'archer',job:'Cung thủ',hair:'#76463c',trim:'#f6d092',outfit:'#95663b',skin:'#b98566',hairStyle:7},
 {id:'mage-moon',name:'Pháp sư Trăng Non',classId:'mage',job:'Pháp sư',hair:'#baaed4',trim:'#e7bdff',outfit:'#7857aa',skin:'#f2c5ac',hairStyle:8},
 {id:'mage-ocean',name:'Pháp sư Thủy Triều',classId:'mage',job:'Pháp sư',hair:'#245f85',trim:'#9ef8ed',outfit:'#2577a7',skin:'#d49a76',hairStyle:9},
 {id:'mage-star',name:'Phù thủy Sao Băng',classId:'mage',job:'Pháp sư',hair:'#76458c',trim:'#ffd4fc',outfit:'#7347ae',skin:'#efb69c',hairStyle:10},
 {id:'mage-sakura',name:'Pháp sư Hoa Anh Đào',classId:'mage',job:'Pháp sư',hair:'#d9859d',trim:'#fff0b0',outfit:'#d17c9e',skin:'#f4c9a9',hairStyle:11}
];
export const DEFAULT_HERO_SKIN='warrior-aqua';
export const skinById=id=>HERO_SKINS.find(s=>s.id===id)||HERO_SKINS[0];
const D='#222c4d',P='#fff8e7';
const rgb=hex=>{const h=hex.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
const tint=(color,factor)=>'#'+rgb(color).map(c=>Math.min(255,Math.max(0,Math.round(c*factor))).toString(16).padStart(2,'0')).join('');
function grid(w,h){
 const pixels=new Array(w*h).fill(null);
 const pixel=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<w&&y>=0&&y<h&&c)pixels[y*w+x]=c;};
 const rect=(x,y,ww,hh,c)=>{for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+ww;xx++)pixel(xx,yy,c);};
 const ellipse=(cx,cy,rx,ry,c)=>{
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)
    for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++)
      if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)pixel(x,y,c);
 };
 const borderEllipse=(cx,cy,rx,ry,c,b)=>{ellipse(cx,cy,rx,ry,b);ellipse(cx,cy,rx-1.4,ry-1.4,c);};
 const get=()=>pixels.map((color,i)=>color&&{x:i%w,y:Math.floor(i/w),color}).filter(Boolean);
 return {pixel,rect,ellipse,borderEllipse,get};
}
function heroPixels(skin){
 const g=grid(32,40);
 const dark=tint(skin.outfit,.48),light=tint(skin.outfit,1.45),hairHi=tint(skin.hair,1.35);
 // Far cape and scarf create a distinctive silhouette.
 if(skin.classId==='mage'){
  g.ellipse(16,28,12,11,D);g.ellipse(16,28,10,9,tint(skin.outfit,.72));
  g.rect(6,35,20,2,skin.trim);
 }else if(skin.classId==='archer'){
  g.ellipse(17,29,10,9,D);g.ellipse(17,29,8,7,tint(skin.outfit,.66));
 }
 // Boots with shiny pixel buckles.
 g.rect(10,32,6,5,D);g.rect(17,32,6,5,D);
 g.rect(11,33,4,3,dark);g.rect(18,33,4,3,dark);
 g.rect(10,36,7,2,D);g.rect(17,36,7,2,D);
 g.pixel(12,35,skin.trim);g.pixel(19,35,skin.trim);
 // Arms and gauntlets.
 g.rect(5,23,6,9,D);g.rect(21,23,6,9,D);
 g.rect(6,24,4,5,skin.outfit);g.rect(22,24,4,5,skin.outfit);
 g.rect(6,29,4,3,skin.skin);g.rect(22,29,4,3,skin.skin);
 g.rect(7,27,2,2,skin.trim);g.rect(23,27,2,2,skin.trim);
 // Tunic.
 g.rect(9,21,15,13,D);g.rect(10,22,13,10,skin.outfit);
 g.rect(11,24,2,8,light);g.rect(20,23,2,8,dark);
 g.rect(10,31,13,2,dark);g.rect(15,22,3,12,skin.trim);
 g.rect(12,31,9,1,P);
 // Hair back.
 g.borderEllipse(16,13,11,12,skin.hair,D);
 if(skin.hairStyle%4===0){g.rect(5,14,4,13,D);g.rect(6,16,2,10,skin.hair);g.rect(24,14,4,12,D);g.rect(25,15,2,10,skin.hair);}
 if(skin.hairStyle%4===1){g.rect(5,17,5,10,D);g.rect(6,18,3,9,skin.hair);g.rect(23,16,4,10,skin.hair);}
 if(skin.hairStyle%4===2){g.ellipse(26,11,4,4,D);g.ellipse(26,11,3,3,skin.hair);}
 if(skin.hairStyle%4===3){g.ellipse(6,11,4,4,D);g.ellipse(6,11,3,3,skin.hair);}
 // Head, ears, cheeks.
 g.borderEllipse(16,16,8.3,8.6,skin.skin,D);
 g.rect(8,16,2,3,skin.skin);g.rect(23,16,2,3,skin.skin);
 g.pixel(10,19,'#e9948e');g.pixel(22,19,'#e9948e');
 // Large chibi eyes.
 g.rect(11,15,3,4,D);g.rect(19,15,3,4,D);
 g.rect(12,15,1,2,P);g.rect(20,15,1,2,P);
 g.pixel(16,21,'#9d5664');g.pixel(17,21,'#9d5664');
 // Pixel bangs with asymmetry.
 g.rect(8,6,17,5,D);g.rect(9,7,15,3,skin.hair);
 g.rect(9,10,6,5,skin.hair);g.rect(18,10,7,4,skin.hair);
 g.rect(13,10,4,3,hairHi);g.rect(20,8,3,2,hairHi);
 if(skin.hairStyle%3===0){g.rect(13,11,3,4,skin.hair);g.rect(9,12,3,2,skin.hair);}
 if(skin.hairStyle%3===1){g.rect(19,11,3,5,skin.hair);g.pixel(9,11,hairHi);}
 if(skin.hairStyle%3===2){g.rect(9,10,5,5,skin.hair);g.rect(18,10,3,5,skin.hair);}
 if(skin.hairStyle>=8){g.rect(9,5,15,3,D);g.rect(10,5,13,2,skin.trim);g.pixel(16,4,P);}
 // Head ornament.
 if(skin.classId==='warrior'){g.rect(22,8,3,2,skin.trim);g.pixel(23,7,P);}
 if(skin.classId==='archer'){g.pixel(11,6,skin.trim);g.pixel(13,5,skin.trim);g.pixel(15,6,skin.trim);}
 if(skin.classId==='mage'){g.pixel(16,3,P);g.pixel(16,4,skin.trim);g.pixel(15,5,skin.trim);g.pixel(17,5,skin.trim);}
 // Equipment: sword / bow / staff. Weapon is pure visual, not extra power.
 if(skin.classId==='warrior'){
  g.rect(27,11,2,15,D);g.rect(28,10,1,14,P);g.rect(26,23,5,2,skin.trim);g.rect(28,25,2,7,D);g.pixel(29,10,skin.trim);
 }
 if(skin.classId==='archer'){
  for(let y=10;y<=31;y++){const x=30-Math.round(Math.sin((y-10)/21*Math.PI)*4);g.pixel(x,y,skin.trim);}
  g.rect(28,12,1,18,P);g.pixel(28,21,skin.trim);
 }
 if(skin.classId==='mage'){
  g.rect(28,12,2,23,D);g.rect(29,13,1,22,tint(skin.trim,.85));
  g.ellipse(28,9,4,4,skin.trim);g.ellipse(28,9,2,2,P);
 }
 return g.get();
}
const monsterPalettes=[
 {base:'#b35dcd',bright:'#f9a0d2',dark:'#6e367e',eyes:'#ffdd7b'},
 {base:'#a95eb2',bright:'#e0a1ee',dark:'#603379',eyes:'#b9fbdf'},
 {base:'#e8845b',bright:'#ffc18e',dark:'#9c3f51',eyes:'#ffe17c'},
 {base:'#bf434f',bright:'#f18b92',dark:'#623461',eyes:'#e5f7af'}
];
function monsterPixels(round=1,variant=0){
 const p=monsterPalettes[(round-1)%4];
 const g=grid(40,40);
 const shell=round===4?14:12;
 // Beetle legs and claws.
 for(const [a,b] of [[7,23],[32,23],[5,28],[34,28]]){
  g.rect(a,b,4,3,D);g.rect(a+1,b+1,2,3,p.base);
  g.rect(a<20?a-3:a+3,b+3,5,3,D);
 }
 g.borderEllipse(20,23,shell+4,12,p.dark,D);
 g.borderEllipse(20,19,shell,13,p.base,D);
 g.ellipse(15,14,6,5,p.bright);g.ellipse(26,14,4,4,p.bright);
 // Chest plates.
 g.rect(13,25,14,2,p.dark);g.rect(17,28,6,2,p.bright);
 // Tall horns plus antennae.
 if(round===1){
  g.rect(10,5,4,9,D);g.rect(12,6,2,8,p.base);
  g.rect(27,5,4,9,D);g.rect(27,6,2,8,p.base);
  g.pixel(11,4,p.eyes);g.pixel(29,4,p.eyes);
 }else if(round===2){
  for(let i=0;i<7;i++){g.pixel(7+i,6+i,p.bright);g.pixel(32-i,6+i,p.bright);}
 }else if(round===3){g.rect(13,3,14,5,D);g.rect(14,4,12,4,p.bright);}
 else {g.rect(9,3,6,9,D);g.rect(25,3,6,9,D);g.rect(15,1,10,7,p.eyes);}
 // Glowing eyes and fangs.
 g.rect(13,18,5,5,D);g.rect(23,18,5,5,D);
 g.rect(14,19,3,2,p.eyes);g.rect(24,19,3,2,p.eyes);
 g.pixel(16,18,P);g.pixel(26,18,P);
 g.rect(19,25,4,2,D);g.pixel(19,27,P);g.pixel(22,27,P);
 // Armor ridges and hard pixels.
 g.pixel(11,12,P);g.pixel(29,12,P);
 g.rect(15,10,4,2,tint(p.bright,1.12));g.rect(23,10,3,2,p.bright);
 for(let i=0;i<4;i++){g.pixel(10+i*6,30+((i+variant)%3),p.bright);}
 return g.get();
}
function fishPixels(colorKey='blue'){
 const palettes={
  blue:['#258bd3','#85e2ff','#1b5187'],orange:['#e58a37','#fff0a5','#9e4c2b'],
  pink:['#e971b7','#ffd2e2','#a8478e'],gold:['#c69c24','#fff59a','#71502b'],
  green:['#34a89b','#b9ffe4','#18756d'],purple:['#9365c6','#e2ceff','#4c3385']
 };
 const [base,shine,dark]=palettes[colorKey]||palettes.blue;
 const g=grid(32,22);
 // Tall pixel tail, fins, body and white cheeks.
 for(let row=0;row<10;row++){const rx=4-Math.abs(4.5-row);g.rect(Math.round(Math.max(0,rx)),5+row,3,1,base);}
 g.rect(3,4,3,3,base);g.rect(3,13,3,3,base);
 g.borderEllipse(17,11,12,7,base,dark);
 g.ellipse(16,9,8,3,shine);g.rect(12,14,9,2,dark);
 g.rect(12,4,4,4,dark);g.rect(14,3,3,3,base);
 g.rect(17,15,4,3,dark);g.pixel(27,9,P);g.pixel(27,10,D);
 g.pixel(29,12,P);g.pixel(11,9,P);
 return g.get();
}
function renderPixels(pixels,width,height){return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
    shapeRendering="crispEdges" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
   {pixels.map((p,i)=><rect key={i} x={p.x} y={p.y} width="1" height="1" fill={p.color}/>)}
  </svg>;}
export function PixelHero({skinId=DEFAULT_HERO_SKIN,className='' }){
 const skin=skinById(skinId);
 const pixels=useMemo(()=>heroPixels(skin),[skin.id]);
 return <span className={'ic3-pixel-sprite ic3-pixel-hero '+className} role="img" aria-label={skin.name}>{renderPixels(pixels,32,40)}</span>;
}
export function PixelMonster({round=1,variant=0,className=''}){
 const pixels=useMemo(()=>monsterPixels(round,variant),[round,variant]);
 return <span className={'ic3-pixel-sprite ic3-pixel-monster '+className} role="img" aria-label={'Quái vật vòng '+round}>{renderPixels(pixels,40,40)}</span>;
}
export function PixelFish({color='blue',className=''}){
 const pixels=useMemo(()=>fishPixels(color),[color]);
 return <span className={'ic3-pixel-sprite ic3-pixel-fish '+className} aria-hidden="true">{renderPixels(pixels,32,22)}</span>;
}
