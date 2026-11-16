import test from 'node:test';
import assert from 'node:assert/strict';
import {isValidSchoolId} from '../src/lib/schoolIds.js';

test('real PostgreSQL UUID school ids with digits 0-9 are accepted',()=>{
 assert.equal(isValidSchoolId('f8750c1e-1a64-4be2-b51b-91ac0de72f08'),true);
 assert.equal(isValidSchoolId('09d79828-0370-497e-8f3c-f74a1a5d7032'),true);
 assert.equal(isValidSchoolId('ABCDEFAB-ABCD-ABCD-ABCD-ABCDEFABCDEF'),true);
});

test('bad, missing, or made-up school IDs are rejected',()=>{
 for(const x of ['',undefined,null,'THCS Duy Tân','123','g8750c1e-1a64-4be2-b51b-91ac0de72f08',
   'f8750c1e-1a64-4be2-b51b-91ac0de72f0','f8750c1e-1a64-4be2-b51b-91ac0de72f08 ']){
  assert.equal(isValidSchoolId(x),false,String(x));
 }
});
