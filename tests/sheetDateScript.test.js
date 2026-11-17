import test from 'node:test';import assert from 'node:assert/strict';
import {fixedDateScript} from '../src/lib/sheetDateScript.js';
test('native Apps Script stamps a literal date only once on J6:CA6 edits',()=>{
 assert.ok(fixedDateScript.includes('function onEdit(e)'));
 assert.ok(fixedDateScript.includes("r !== 6 || col < 10 || col > 79"));
 assert.ok(fixedDateScript.includes('e.oldValue !== undefined'));
 assert.ok(fixedDateScript.includes('cell.setValue(day)'));
 assert.ok(fixedDateScript.includes('function kiemTraNgayCu()'));
});
