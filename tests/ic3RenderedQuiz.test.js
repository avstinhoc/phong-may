import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const bank=JSON.parse(readFileSync(new URL('../src/learning/quizCatalog.json',import.meta.url)));

test('render all battle prompts and check neutral pre-submit markup and accessible local photographs',async()=>{
 const result=await build({stdin:{contents:`
 import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
 import Quiz from './src/student-web/BattleQuiz.jsx';
 export const render=q=>renderToStaticMarkup(<Quiz turn="turn" prompt={q.prompt} choices={q.choices} media={q.media} time={30}/>);
 `,resolveDir:process.cwd(),loader:'jsx'},platform:'node',format:'cjs',bundle:true,write:false,loader:{'.css':'empty'}});
 const mod={exports:{}};
 new Function('module','exports','require',result.outputFiles[0].text)(mod,mod.exports,require);
 for(const q of bank){
  const html=mod.exports.render(q);
  assert.equal((html.match(/<button /g)||[]).length,4,q.id);
  assert.ok(html.includes('aria-valuenow="30"'));
  assert.ok(!html.includes(q.explanation));assert.doesNotMatch(html,/<figcaption| title=|is-selected|aria-checked="true"/);
  if(q.media){
   assert.ok(html.includes('/ic3-media/'+q.media+'.webp'));
   const alt=html.match(/<img[^>]+alt="([^"]+)"/)?.[1];assert.ok(alt&&alt!==q.mediaTitle&&alt!==q.solution);
  }else assert.doesNotMatch(html,/<img /);
 }
});
