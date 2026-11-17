import test from 'node:test';
import assert from 'node:assert/strict';
import {restrictManagementScope} from '../src/lib/ownedManagement.js';
test('admin can manage their own centers and member schools but not another teacher center',()=>{
 const d=restrictManagementScope({accountId:'admin1',profileSchoolId:'s2',
  membershipIds:['s1'],schools:[{id:'s1'},{id:'s2'},{id:'s3'}],
  workplaces:[{id:'unit1',created_by:'admin1'},{id:'unit2',created_by:'teacher2'}],
  links:[{workplace_id:'unit1',school_id:'s1'},
   {workplace_id:'unit1',school_id:'s3'},{workplace_id:'unit2',school_id:'s2'}]});
 assert.deepEqual(d.schools.map(x=>x.id),['s1','s2']);
 assert.deepEqual(d.workplaces.map(x=>x.id),['unit1']);
 assert.deepEqual(d.links,[{workplace_id:'unit1',school_id:'s1'}]);
});
test('no membership means no other teacher schools leak to admin',()=>{
 assert.deepEqual(restrictManagementScope({accountId:'admin',schools:[{id:'other'}],
  workplaces:[{id:'foreign',created_by:'teacher'}]}),
 {schools:[],workplaces:[],links:[]});
});
