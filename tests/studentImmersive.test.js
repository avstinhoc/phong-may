import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_MAPS,WAVES_PER_WORLD,worldAt,waveAt,GEAR_CATALOG} from '../src/student-web/worldMap.js';

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
test('Equipment unlocks follow the server progression rules and documented damage',()=>{
 assert.equal(GEAR_CATALOG.length,6);
 for(const item of GEAR_CATALOG){
  assert.equal(item.unlock,item.id*3);
  assert.equal(item.damage,160+18*item.id);
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
 const upgraded=read('supabase/migrations/20261121232000_ic3_arcade_seven_waves.sql');
 const style=read('src/student-web/campaignWorld.css');
 assert.match(src,/WORLD_MAPS.map/);
 assert.match(src,/WAVES_PER_WORLD/);
 assert.match(src,/ic3_arcade_turn/);
 assert.match(src,/cw-gear-inventory/);
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
