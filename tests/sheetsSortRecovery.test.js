import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studentSheetSortPlan,studentRowMoves,verifiedRowMapping} from '../supabase/functions/google-sheets-sync/nameSort.js';

const edge=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const data=(names)=>Array.from({length:66},(_,i)=>{
 if(i<3)return [];
 const row=i-3;
 const name=names[row]||'';
 return name ? ['CODE-'+name, row+1, name, '01/01/2012', true, '8.0'] : [];
});
const originalMapping={'studentA':8,'studentB':9,'studentC':10};

test('recover exact row IDs after successful or partially applied Google row moves',()=>{
 const before=data(['Trần Nam','Vũ An','Đào Bình']);
 const plan=studentSheetSortPlan(before.slice(3,66),8,70);
 assert.equal(plan.needsSort,true);
 const after=before.map(r=>[...r]);
 const order=plan.rows.map(r=>r.sheetRow);
 const moves=studentRowMoves(plan,17);
 for(const {moveDimension:{source,destinationIndex}} of moves){
  const from=source.startIndex-7,to=destinationIndex-7;
  after.splice(3+to,0,...after.splice(3+from,1));
  order.splice(to,0,...order.splice(from,1));
 }
 const expected=verifiedRowMapping(before,after,originalMapping);
 assert.deepEqual(expected,{safe:true,mapping:{studentA:10,studentB:8,studentC:9}});
 const partially=before.map(r=>[...r]);
 const first=moves[0].moveDimension;
 partially.splice(3+first.destinationIndex-7,0,...partially.splice(3+first.source.startIndex-7,1));
 const recovered=verifiedRowMapping(before,partially,originalMapping);
 assert.equal(recovered.safe,true);
 assert.notDeepEqual(recovered.mapping,originalMapping);
 assert.equal(new Set(Object.values(recovered.mapping)).size,3);
 assert.deepEqual(verifiedRowMapping(before,before,originalMapping),{safe:true,mapping:originalMapping});
});

test('refuse recovery on changed, ambiguous, or unmapped student rows',()=>{
 const before=data(['Trần Nam','Vũ An','Đào Bình']);
 const changed=before.map(r=>[...r]);
 changed[4][2]='Người khác';
 assert.equal(verifiedRowMapping(before,changed,originalMapping).safe,false);
 const twins=data(['Trần Nam','Trần Nam','Đào Bình']);
 assert.equal(verifiedRowMapping(twins,twins,originalMapping).safe,false);
 const blank={studentA:8,studentB:11};
 assert.equal(verifiedRowMapping(before,before,blank).safe,false);
 assert.equal(verifiedRowMapping(before,before,{}).safe,false);
});

test('Edge sorts in small chunks and restores mappings after Google 500 instead of retaining an empty mapping',()=>{
 assert.match(edge,/const groupSize=6/);
 assert.match(edge,/const verified=verifiedRowMapping\(grid,post,oldMapping\)/);
 assert.match(edge,/student_rows:verified.mapping/);
 assert.match(edge,/Google Sheets tạm lỗi khi sắp xếp/);
 assert.match(edge,/if\(!\(pulled.conflicts\|\|\[\]\).length&&!\(pushed.conflicts\|\|\[\]\).length\)/);
 const firstMove=edge.indexOf('const groupSize=6');
 const readAfter=edge.indexOf('post=await readTab(link.spreadsheet_id,map.sheet_title,token)',firstMove);
 assert.ok(firstMove>=0&&readAfter>firstMove);
 assert.match(edge,/const hasMerges=requests.some/);
 assert.match(edge,/if\(hasMerges\)/);
 assert.match(edge,/if\(serialRequests.length\)await sheetBatch\(link.spreadsheet_id,serialRequests,token\)/);
});
