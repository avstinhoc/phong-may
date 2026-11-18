import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const script=readFileSync(new URL('../google-apps-script/qlpm-drive-auto-copy.gs',import.meta.url),'utf8');

test('current and legacy HMAC use the same field order and web-safe encoding',async()=>{
 const key='a'.repeat(128);
 const parts=[1794980000000,'b'.repeat(32),'12345678-1234-4234-8234-123456789abc',
  'DS ĐIỂM DANH THCS KHƯƠNG NINH',
  '1d8ZiM9q2xyxKNZwTSD5mN77fpVma-Nti',
  '1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM'];
 const subtleKey=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(key),
   {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signatures=[];
 for(const separator of ['|','\n']){
  const msg=parts.join(separator);
  const subtle=Buffer.from(await webcrypto.subtle.sign('HMAC',subtleKey,new TextEncoder().encode(msg)))
   .toString('base64url');
  const expected=createHmac('sha256',key).update(msg,'utf8').digest('base64url');
  assert.equal(subtle,expected);
  signatures.push(subtle);
 }
 assert.notEqual(signatures[0],signatures[1]);
 assert.ok(script.includes("ROOT_FOLDER_ID, TEMPLATE_SHEET_ID].join('|')"));
 assert.ok(edge.includes('const message=messageParts.join(separator)'));
 assert.ok(edge.includes('signatureFor("|")'));
 assert.ok(edge.includes('signatureFor("\\n")'));
});

test('only signature rejection causes the legacy retry and never skips verification',()=>{
 assert.ok(edge.includes('if(result?.ok!==true && clean(result?.error).includes("Chữ ký xác thực không hợp lệ"))'));
 assert.ok(edge.includes('result=await send(await signatureFor("\\n"))'));
 assert.ok(script.includes('if (!safeEqual_(body.signature, sign_(data, secret)))'));
 assert.ok(edge.includes('if(result?.ok!==true){'));
 assert.ok(edge.includes('if(!idSafe(clean(result.spreadsheet_id)))'));
});

test('server never logs signing secret or silently accepts an incorrectly copied key',()=>{
 assert.ok(edge.includes('/^[0-9a-f]{128}$/i.test(key)'));
 assert.ok(edge.includes('Không gửi khóa vào chat.'));
 assert.ok(!edge.includes('console.log(key)'));
 assert.ok(!edge.includes('respond(200,{key'));
 assert.ok(!edge.includes('signature:signature'));
});

test('the diagnostic HMAC fingerprint is deterministic and never shares key material',()=>{
 const secret='c'.repeat(128);
 const probe='QLPM-KEY-CHECK-V1';
 const expected=createHmac('sha256',secret).update(probe).digest('base64url').slice(0,16);
 assert.equal(expected.length,16);
 assert.notEqual(expected,secret.slice(0,16));
 assert.ok(edge.includes('QLPM_KEY_FINGERPRINT_V1='));
 assert.ok(script.includes('function diagnoseQlpmKey()'));
 assert.ok(script.includes("sign_('QLPM-KEY-CHECK-V1', secret).slice(0, 16)"));
 assert.ok(edge.includes('new TextEncoder().encode("QLPM-KEY-CHECK-V1")'));
 assert.ok(edge.includes('.split("+").join("-").split("/").join("_")'));
 assert.ok(!edge.includes('console.warn(key)'));
 assert.ok(!script.includes('Logger.log(secret)'));
});
