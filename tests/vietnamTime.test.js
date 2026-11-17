import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVietnamTime,changeVietnamTimePart,isVietnamTimeRange} from '../src/lib/vietnamTime.js';

test('15:30, 17:00 and 23:59 stay in Vietnamese 24-hour format',()=>{
 assert.equal(parseVietnamTime('17:00'),'17:00');
 assert.equal(parseVietnamTime('14:45:00'),'14:45');
 assert.equal(parseVietnamTime('23:59'),'23:59');
 assert.equal(parseVietnamTime('05:00 CH'),null);
});
test('hour/minute selectors preserve selected part with padding',()=>{
 assert.equal(changeVietnamTimePart('17:00','hour','05'),'05:00');
 assert.equal(changeVietnamTimePart('05:00','hour','17'),'17:00');
 assert.equal(changeVietnamTimePart('17:00','minute','45'),'17:45');
 assert.equal(changeVietnamTimePart('14:05','minute','0'),'14:00');
});
test('invalid time or inverted range is rejected before saving',()=>{
 for(const wrong of ['24:00','17:60','-1:00','5:00','03:20 PM',null]){
   assert.equal(parseVietnamTime(wrong),null);
 }
 assert.equal(isVietnamTimeRange('17:00','19:00'),true);
 assert.equal(isVietnamTimeRange('19:00','17:00'),false);
 assert.equal(isVietnamTimeRange('17:00','17:00'),false);
 assert.equal(isVietnamTimeRange('14:00:00','14:45:00'),true);
});
