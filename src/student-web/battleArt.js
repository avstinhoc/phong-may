import {waveAt} from './worldMap.js';

// Procedural art direction for every encounter. Styling only — never touches
// student sessions, answers, HP, stars, unlocks or server-validated progression.
const ZONES=[
 ['#397f96','#7af1dc','#244d69'],['#35897c','#f7d28f','#275b73'],
 ['#ba8052','#ffe0a3','#786044'],['#607ec2','#d2adff','#484b95'],
 ['#83b8ca','#e0fcff','#426e8a'],['#a74c3e','#ffba5f','#673844'],
 ['#478f60','#b9fc95','#3f6d53'],['#418aa7','#9be9ff','#325b8c'],
 ['#616ac6','#c5c9ff','#423f7f'],['#b7492e','#ffd176','#743c39'],
 ['#7c9db8','#e6f9ff','#53758b'],['#7658a0','#d5b2ff','#403a68'],
 ['#729c58','#e2f8ab','#376b65'],['#8976a9','#ffdab4','#594878'],
 ['#3f86bb','#a5f2ff','#244f85'],['#8f9db4','#ddfaff','#5c7b92'],
 ['#538bb9','#c1ffff','#335b7a'],['#9f8659','#ffdc98','#5f6b7b'],
 ['#b99154','#ffe5b0','#826547'],['#778fc1','#e7eaff','#4d558d'],
 ['#48a4a7','#ffd0ab','#357986'],['#5b93af','#b3ffe5','#345e87']
];
const CLASSIFIERS=[
 {kind:'arachnid',model:0,re:/(nhện|bọ|bọ cạp|rết|bọ ngựa|cánh cứng|ong|dế)/i},
 {kind:'bird',model:11,re:/(chim|ưng|cú |cú$|đại bàng|phượng|nhạn|cánh chim)/i},
 {kind:'dragon',model:10,re:/(rồng|long vương|long mã|hắc long|phượng hoàng)/i},
 {kind:'aquatic',model:16,re:/(^cá |^cá$|mực|bạch tuộc|sứa|hải mã|hải vương|cá mập|cáo biển|cua |rùa biển|lươn)/i},
 {kind:'serpent',model:15,re:/(rắn|xà |xà$|tích xà|giun|thạch tích|rết đá)/i},
 {kind:'construct',model:1,re:/(golem|tượng|người máy|bộ máy|robot|thợ máy|cỗ máy|chiến giáp|thạch giáp|máy gác|bánh răng)/i},
 {kind:'winged',model:3,re:/(bướm|dơi|thiên mã|linh hồn|bóng trăng)/i},
 {kind:'beast',model:4,re:/(cáo|sói|hồ ly|thỏ|linh miêu|mèo|báo|sư tử|hổ |hươu|ngưu|tê giác|tượng tuyết|ma mút|mãnh tượng|vượn)/i},
 {kind:'sprite',model:12,re:/(tinh linh|đom đóm|linh thú|bóng đen|tiểu quỷ|vệ tinh|yêu tinh|linh hồn|thần cây)/i}
];
const hashName=name=>Array.from(name).reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))>>>0,2166136261)>>>0;
const safeColor=(hex,delta)=>{
 const n=parseInt(hex.slice(1),16);
 const channel=v=>Math.max(0,Math.min(255,v+delta)).toString(16).padStart(2,'0');
 return '#'+channel(n>>16)+channel(n>>8&255)+channel(n&255);
};
export function monsterArt(worldId=1,wave=1){
 const world=Math.max(1,Math.min(22,Number(worldId)||1));
 const stage=Math.max(1,Math.min(7,Number(wave)||1));
 const entry=waveAt(world,stage);
 const seed=hashName(entry.name);
 const type=CLASSIFIERS.find(c=>c.re.test(entry.name));
 const kind=type?.kind||['construct','sprite','beast','dragon'][seed%4];
 const base=type?.model??(seed%22);
 // Each stage has a distinct material and unique additional silhouette details.
 const palette=ZONES[world-1];
 const hueShift=seed%27-13+(stage-4)*3;
 return {
  name:entry.name,kind,archetype:base,
  seed,variant:seed%7,ornament:Math.floor(seed/7)%6,
  stage,elite:stage>=5,boss:stage===7,
  primary:safeColor(palette[0],hueShift),
  accent:safeColor(palette[1],Math.round(-hueShift/2)),
  metal:safeColor(palette[2],14+stage*2),
  eye:stage===7?'#ffe6a1':'#e4fcff',
  energy:safeColor(palette[1],18)
 };
}
export const HERO_ART_CLASSES={
 warrior:{helmet:'crown',weapon:'sword',ornament:'lion'},
 archer:{helmet:'hood',weapon:'bow',ornament:'leaf'},
 mage:{helmet:'spire',weapon:'staff',ornament:'star'}
};
export function heroArt(skin,gear=0){
 const level=Math.max(0,Math.min(5,Number(gear)||0));
 return {
  classId:skin.classId||'warrior',
  style:skin.artStyle||'knight',
  costumeId:skin.id,
  ...HERO_ART_CLASSES[skin.classId||'warrior'],
  armor:skin.outfit,
  luminous:skin.trim,
  metal:level>=4?'#ffea9b':level>=2?'#d3ebff':'#a5bbc8',
  crest:level>=3?'#fff0b7':skin.trim,
  level
 };
}
