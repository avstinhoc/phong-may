import test from 'node:test';
import assert from 'node:assert/strict';
import {requestTimetableGemini,GeminiTimetableError} from '../src/lib/geminiTimetableRequest.js';

const ok={ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:'{"rows":[]}'}]}}]})};
const run=(fetcher,overrides={})=>requestTimetableGemini({
 apiKey:'mock-only',model:'gemini-2.5-flash',fallbackModel:'gemini-3.8-flash',
 secondaryModel:'gemini-3.5-flash-lite',parts:[{text:'Synthetic test, no real student data'}],
 fetcher,delay:async()=>{},...overrides
});
const unavailable=status=>({ok:false,status});

test('successful primary model does not retry',async()=>{
 const calls=[];const r=await run(async url=>{calls.push(url);return ok;});
 assert.equal(calls.length,1);assert.equal(r.fallbackUsed,false);
});
test('transient HTTP 503 retries the primary model once',async()=>{
 let count=0;const r=await run(async()=>{count++;return count===1?unavailable(503):ok;});
 assert.equal(count,2);assert.equal(r.model,'gemini-2.5-flash');
});
test('persistent HTTP 503 switches to current 3.8 Flash',async()=>{
 const calls=[];const r=await run(async url=>{calls.push(url);return calls.length<3?unavailable(503):ok;});
 assert.equal(calls.length,3);assert.match(calls[2],/gemini-3\.8-flash/);assert.equal(r.fallbackUsed,true);
});
test('legacy 2.5 returning 404 immediately moves to newer model',async()=>{
 const calls=[];const r=await run(async url=>{calls.push(url);return calls.length===1?unavailable(404):ok;});
 assert.equal(calls.length,2);assert.match(calls[1],/gemini-3\.8-flash/);assert.equal(r.fallbackUsed,true);
});
test('reported issue: primary 503, fallback 404, secondary 3.5 works',async()=>{
 const calls=[];const r=await run(async url=>{
  calls.push(url);
  if(calls.length<=2)return unavailable(503);
  if(calls.length===3)return unavailable(404);
  return ok;
 });
 assert.equal(calls.length,4);
 assert.match(calls[2],/gemini-3\.8-flash/);
 assert.match(calls[3],/gemini-3\.5-flash-lite/);
 assert.equal(r.model,'gemini-3.5-flash-lite');
});
test('all 404s report model access issue without inventing success',async()=>{
 let count=0;
 await assert.rejects(run(async()=>{count++;return unavailable(404);}),err=>
  err instanceof GeminiTimetableError&&/API key/.test(err.message));
 assert.equal(count,3);
});
test('quota, auth and malformed input errors never try another model',async()=>{
 for(const status of [429,403,401,400]){
  let calls=0;
  await assert.rejects(run(async()=>{calls++;return unavailable(status);}),GeminiTimetableError);
  assert.equal(calls,1);
 }
});
test('transient network failure can use a working fallback',async()=>{
 let count=0;const r=await run(async()=>{count++;if(count===1)throw Error('timeout');return ok;});
 assert.equal(count,2);assert.ok(r.data.candidates.length);
});
test('duplicate model configuration is not requested twice as separate fallback',async()=>{
 const models=[];
 await assert.rejects(run(async url=>{models.push(url);return unavailable(404);},{
   model:'gemini-3.8-flash',fallbackModel:'gemini-3.8-flash',secondaryModel:'gemini-3.5-flash-lite'
 }),GeminiTimetableError);
 assert.equal(models.length,2);
});
