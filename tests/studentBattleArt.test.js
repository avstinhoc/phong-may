import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BATTLE_THEMES,battleTheme,battleBackground} from '../src/student-web/battleThemes.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('22 deterministic atmospheric themes match the existing 22 scene backgrounds',()=>{
 assert.equal(BATTLE_THEMES.length,22);
 assert.equal(new Set(BATTLE_THEMES.map(x=>x.biome)).size,22);
 for(let i=1;i<=22;i++){
  const theme=battleTheme(i);
  assert.equal(theme.world,i);
  assert.match(theme.light,/^#[\da-f]{6}$/i);
  assert.match(theme.accent,/^#[\da-f]{6}$/i);
  assert.match(theme.shadow,/^#[\da-f]{6}$/i);
  assert.equal(battleBackground(i),'/ic3-scenes/map-'+i+'.webp');
 }
});
test('VFX is purely presentational and reacts only to confirmed answer results',()=>{
 const game=read('src/student-web/Campaign.jsx');
 const fx=read('src/student-web/BattleVFX.jsx');
 assert.match(game,/action==='answer'/);
 assert.match(game,/setFx\(\{id:\+\+fxSequence\.current/);
 assert.match(game,/BattleVFX key=\{fx\?\.id/);
 assert.match(game,/setTimeout\(\(\)=>setFx\(null\),1400\)/);
 assert.match(game,/ic3_arcade_turn/);
 assert.match(game,/setData\(res\)/);
 assert.match(fx,/aria-hidden="true"/);
 assert.match(fx,/cw-vfx-slash/);
 assert.match(fx,/cw-vfx-particle/);
 assert.doesNotMatch(fx,/supabase|rpc\(|setData\(|wallet|session|setHp|setScore/);
});
test('Battle scene has real background depth, selective animations and motion safety',()=>{
 const game=read('src/student-web/Campaign.jsx');
 const css=read('src/student-web/battleFX.css');
 assert.match(game,/cw-depth-distant/);
 assert.match(game,/cw-depth-atmosphere/);
 assert.match(game,/cw-depth-foreground/);
 assert.match(game,/cw-scene-lights/);
 assert.match(game,/battleTheme\(currentId\)/);
 assert.match(css,/radial-gradient/);
 assert.match(css,/cw-vfx-damage-up/);
 assert.match(css,/cw-vfx-spark/);
 assert.match(css,/cw-stage-counter/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(game,/import '.\/battleFX.css'/);
});
