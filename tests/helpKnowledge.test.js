import test from 'node:test';
import assert from 'node:assert/strict';
import {helpTopics,helpQuestions,visibleHelpTopics,getHelpTopic,helpPageTitles} from '../src/lib/helpKnowledge.js';

test('all navigation pages have a grounded help topic',()=>{
 const visibleIds=['dashboard','students','roster','computers','attendance','rollcall','records','cleaning','finance','evaluation','reports','schools','settings','accounts'];
 const ids=helpTopics.map(x=>x.id);
 for(const id of visibleIds)assert.ok(ids.includes(id),'Missing guide for '+id);
 assert.equal(new Set(ids).size,ids.length,'Every help topic must have a unique id');
});
test('admin account operations are never advertised to regular teachers',()=>{
 for(const role of ['teacher','staff']){
  assert.equal(getHelpTopic('accounts',role),undefined);
  assert.ok(!visibleHelpTopics(role).some(t=>t.id==='accounts'));
 }
 assert.ok(getHelpTopic('accounts','admin'));
});
test('all guidance topics have actionable steps and valid app links',()=>{
 for(const topic of helpTopics){
  assert.ok(topic.title?.trim());
  assert.ok(topic.summary?.trim());
  assert.ok(topic.steps.length>=3,topic.id+' requires steps');
  assert.ok(topic.roles.length>=1);
 }
 for(const example of helpQuestions)assert.ok(helpPageTitles[example.page],example.page);
});
