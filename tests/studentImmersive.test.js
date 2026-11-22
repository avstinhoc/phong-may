import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_MAPS,WAVES_PER_WORLD,worldAt,waveAt,waveUnlocked} from '../src/student-web/worldMap.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Săn Sao has exactly 22 distinct maps and 154 uniquely named enemies',()=>{
 assert.equal(WORLD_MAPS.length,22);
 assert.equal(WAVES_PER_WORLD,7);
 const foes=WORLD_MAPS.flatMap(world=>world.waves);
 assert.equal(foes.length,154);
 assert.equal(new Set(foes.map(w=>w.name)).size,154);
 assert.equal(new Set(WORLD_MAPS.map(world=>world.title)).size,22);
 for(let i=1;i<=22;i++){
  const world=worldAt(i);
  assert.equal(world.id,i);
  assert.equal(world.background,'/ic3-scenes/map-'+i+'.webp');
  assert.equal(world.waves[6].tier,'Trùm cuối');
  assert.equal(waveAt(i,7).name,world.waves[6].name);
 }
});
test('Lecture displays original 22 slide decks large with fullscreen and keyboard navigation',()=>{
 const src=read('src/student-web/Lessons.jsx');
 const css=read('src/student-web/practice.css');
 assert.match(src,/requestFullscreen/);
 assert.match(src,/exitFullscreen/);
 assert.match(src,/ArrowRight/);
 assert.match(src,/Escape/);
 assert.match(src,/ic3-slides/);
 assert.match(css,/\.lecture-stage:fullscreen/);
 assert.match(css,/aspect-ratio:16 \/ 9/);
 assert.doesNotMatch(src,/maxHeight:'65vh'/);
});
test('One core campaign, removes two unfinished mini games and uses server-validated waves',()=>{
 const src=read('src/student-web/Campaign.jsx');
 const backend=read('supabase/migrations/20261122210000_ic3_arcade_three_waves.sql');
 const upgraded=read('supabase/migrations/20261122220000_ic3_arcade_seven_waves.sql');
 const style=read('src/student-web/campaignWorld.css');
 assert.match(src,/WORLD_MAPS.map/);
 assert.match(src,/WAVES_PER_WORLD/);
 assert.match(src,/ic3_arcade_turn/);
 assert.match(src,/CostumeGallery/);
 assert.match(src,/enterEncounter/);
 assert.match(src,/call\('leave'/);
 assert.match(src,/map_progress/);
 assert.doesNotMatch(src,/GEAR_CATALOG|cw-gear-inventory|Trang bị<\/button>/);
 assert.match(src,/requestFullscreen/);
 assert.doesNotMatch(src,/FishingGame|HardwareBuilder/);
 assert.match(backend,/add column if not exists wave /i);
 assert.match(backend,/pl\.wave_hp/);
 assert.match(backend,/outcome:='wave_clear'/);
 assert.match(backend,/pl\.wave<3/);
 assert.match(upgraded,/pl\.wave<7/);
 assert.match(upgraded,/'total_waves',7/);
 assert.match(backend,/ic3_star_wallets/);
 assert.match(style,/\.cw-battle-field/);
 assert.match(style,/\.cw-world-map/);
 assert.match(style,/\.cw-gear-item/);
});

test('32 visual-only hero outfits and clickable pins are served by 22 open islands',()=>{
 const hero=read('src/learning-arcade/PixelArt.jsx');
 const gallery=read('src/student-web/CostumeGallery.jsx');
 const canvas=read('src/learning-arcade/tabletop.js');
 const sql=read('supabase/migrations/20261123020000_ic3_arcade_open_islands_cosmetics.sql');
 assert.match(hero,/HERO_FASHION_COLLECTION/);
 assert.match(hero,/aster-astronaut/);
 assert.match(hero,/nova-dragon/);
 assert.match(gallery,/HERO_SKINS\.map|matching\.map/);
 assert.match(gallery,/onSelect\(s\.idx\)/);
 for(const style of ['astronaut','samurai','pirate','mechanic','witch','paladin',
  'ninja','druid','cyber','dragon','frost','bard'])
   assert.match(canvas,new RegExp("style==='"+style+"'"));
 assert.match(sql,/p_action='enter'/);
 assert.match(sql,/p_action='leave'/);
 assert.match(sql,/pl\.score:=greatest\(0,pl\.score-200\)/);
 assert.match(sql,/pl\.score:=0/);
 assert.match(sql,/ic3_arcade_map_progress/);
 assert.match(sql,/ic3_arcade_score_awards/);
 assert.match(sql,/p_item NOT BETWEEN 0 AND 31/);
 assert.match(sql,/pl\.wave_hp:=greatest\(0,pl\.wave_hp-160\)/);
});

test('Each island initially unlocks only wave 1 and advances one encounter after victory',()=>{
 assert.equal(waveUnlocked([],1),true);
 for(let w=2;w<=7;w++)assert.equal(waveUnlocked([],w),false);
 assert.equal(waveUnlocked([1],2),true);
 assert.equal(waveUnlocked([1],3),false);
 assert.equal(waveUnlocked([1,2,3],4),true);
 assert.equal(waveUnlocked([1,2,3],5),false);
 assert.equal(waveUnlocked([1,2,3,4,5,6],7),true);
 assert.equal(waveUnlocked([1,2,3,4,5,6,7],7),true);
 assert.equal(waveUnlocked([7],7),true); // previously conquered wave remains replayable
 assert.equal(waveUnlocked([],7,true),true); // active legacy encounter can resume
 assert.equal(waveUnlocked([],0),false);
 assert.equal(waveUnlocked([],8),false);
 const app=read('src/student-web/Campaign.jsx');
 const migration=read('supabase/migrations/20261123030000_ic3_arcade_sequential_wave_unlock.sql');
 assert.match(app,/disabled=\{!unlocked\}/);
 assert.match(app,/waveUnlocked\(completedFor\(mapId\),w,active\)/);
 assert.match(app,/Hoàn thành ải/);
 assert.match(migration,/encounter-1=ANY\(mp\.completed_waves\)/);
 assert.match(migration,/RAISE EXCEPTION 'Ải % chưa mở/);
});
