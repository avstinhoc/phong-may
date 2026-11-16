import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/timetable.js';
const uid='10000000-0000-0000-0000-000000000001';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.body=data;return this;}};}
test('timetable API checks auth, roles, config, valid range, quota and extracted sessions',async()=>{
 const old=global.fetch;const oldEnv={...process.env};let role='teacher',active=true,quota=false,calls=0;
 Object.assign(process.env,{VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:'public-test'});
 global.fetch=async input=>{const url=String(input);let body={};let status=200;
 if(url.includes('/auth/v1/user'))body={id:uid,email:'a@example.test'};
 else if(url.includes('/rest/v1/profiles'))body={role,is_active:active};
 else if(url.includes('/rpc/consume_timetable_quota')){if(quota){status=400;body={message:'quota reached'};}}
 else if(url.includes('generativelanguage')){calls++;body={candidates:[{content:{parts:[{text:JSON.stringify({rows:[{school_name:'Trường A',class_name:'6A',session_date:'2026-11-16',start_time:'07:00',end_time:'08:00',period_count:1}],warnings:[]})}]}}]};}
 else throw new Error('Unexpected network: '+url);
 return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});};
 const invoke=async changes=>{const res=response();await handler({method:'POST',headers:{authorization:'Bearer token'},body:{action:'extract',startDate:'2026-11-16',endDate:'2026-11-20',schoolName:'Trường A',fileText:'Lớp 6A, ngày 16/11/2026 từ 07:00 đến 08:00'},...changes},res);return res;};
 try{
 assert.equal((await invoke({method:'GET'})).code,405);
 assert.equal((await invoke({headers:{}})).code,401);
 role='pending';assert.equal((await invoke({})).code,403);role='teacher';active=false;assert.equal((await invoke({})).code,403);active=true;
 delete process.env.GEMINI_API_KEY;delete process.env.GEMINI_MODEL;assert.equal((await invoke({})).code,503);
 Object.assign(process.env,{GEMINI_API_KEY:'test-only',GEMINI_MODEL:'test-only'});
 assert.equal((await invoke({body:{}})).code,400);
 quota=true;assert.equal((await invoke({})).code,429);assert.equal(calls,0);quota=false;
 const success=await invoke({});assert.equal(success.code,200);assert.equal(success.body.rows[0].class_name,'6A');assert.equal(calls,1);
 }finally{global.fetch=old;process.env=oldEnv;}
});
