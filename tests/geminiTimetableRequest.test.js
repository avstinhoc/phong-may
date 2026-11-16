import test from 'node:test';
import assert from 'node:assert/strict';
import {requestTimetableGemini,GeminiTimetableError} from '../src/lib/geminiTimetableRequest.js';
const ok={ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:'{"rows":[]}'}]}}]})};
const run=(fetcher)=>requestTimetableGemini({apiKey:'dummy',model:'gemini-2.5-flash',fallbackModel:'gemini-2.5-flash-lite',parts:[{text:'test'}],fetcher,delay:async()=>{}});
test('successful Gemini response does not retry',async()=>{
 let count=0;const r=await run(async()=>{count++;return ok;});
 assert.equal(count,1);assert.equal(r.fallbackUsed,false);
});
test('HTTP 503 retries and returns successful response',async()=>{
 let count=0;const r=await run(async()=>{count++;return count===1?{ok:false,status:503}:ok;});
 assert.equal(count,2);assert.equal(r.model,'gemini-2.5-flash');
});
test('persistent HTTP 503 switches to fallback model',async()=>{
 const calls=[];const r=await run(async(url)=>{calls.push(url);return calls.length<3?{ok:false,status:503}:ok;});
 assert.equal(calls.length,3);assert.ok(calls[2].includes('gemini-2.5-flash-lite'));assert.equal(r.fallbackUsed,true);
});
test('quota and auth failures are not retried',async()=>{
 for(const status of [429,403,404,400]){
  let count=0;
  await assert.rejects(run(async()=>{count++;return {ok:false,status};}),GeminiTimetableError);
  assert.equal(count,1);
 }
});
test('network timeouts retry safely',async()=>{
 let count=0;const r=await run(async()=>{count++;if(count===1)throw Error('timeout');return ok;});
 assert.equal(count,2);assert.ok(r.data.candidates.length);
});
