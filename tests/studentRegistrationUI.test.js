import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingRegistrationsForClass,nextFriendRegistration,canConfirmFlaggedName} from '../src/lib/studentRegistrationUI.js';

const classes=[{id:'a',registration_code:'IC3-DUYTAN-6.1'}, {id:'b',registration_code:'IC3-DUYTAN-6.5'}, {id:'old',registration_code:'IC3-DUYTAN-7.1',archived_at:'2026-01-01'}];
const requests=[
 {id:1,status:'pending',registration_code:'IC3-DUYTAN-6.1'},
 {id:2,status:'approved',registration_code:'IC3-DUYTAN-6.1'},
 {id:3,status:'pending',registration_code:'IC3-DUYTAN-6.5'},
 {id:4,status:'pending',registration_code:'OTHER-6.1'},
 {id:5,status:'pending',registration_code:'IC3-DUYTAN-7.1'}
];
test('pending class filter excludes approved/other teacher/archived classes',()=>{
 assert.deepEqual(pendingRegistrationsForClass(requests,classes).map(x=>x.id),[1,3]);
 assert.deepEqual(pendingRegistrationsForClass(requests,classes,'b').map(x=>x.id),[3]);
 assert.deepEqual(pendingRegistrationsForClass(requests,classes,'a').map(x=>x.id),[1]);
 assert.deepEqual(pendingRegistrationsForClass(requests,classes,'unknown'),[]);
});
test('next friend keeps class code, clears desired PC and all personal fields',()=>{
 const prior={code:'IC3-VUNGTAU-6.5',name:'Học Sinh Một',gender:'Nữ',computer:'PC21',note:'đã ghi'};
 const next=nextFriendRegistration(prior);
 assert.deepEqual(next,{code:'IC3-VUNGTAU-6.5',name:'',gender:'',computer:'',note:''});
 assert.equal(prior.computer,'PC21');
 next.computer='PC12';assert.equal(next.computer,'PC12');
});
test('only genuinely review-flagged active name offers manual approval',()=>{
 assert.equal(canConfirmFlaggedName({status:'active',name_review_status:'review'}),true);
 for(const status of ['allow','reject',''])assert.equal(canConfirmFlaggedName({status:'active',name_review_status:status}),false);
 assert.equal(canConfirmFlaggedName({status:'pending',name_review_status:'review'}),false);
});
