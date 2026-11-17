import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/SheetsConnectionPanel.jsx',import.meta.url),'utf8');

test('cross-school workbook collision checked server-side before any Google Sheets call',()=>{
 assert.ok(server.includes('async function assertExclusiveWorkbook(url:string,link:Dict)'));
 assert.ok(server.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(server.includes('.eq("status","verified")'));
 assert.ok(server.includes('data[0].id!==link.id'));
 assert.ok(server.includes('order("created_at"'));
 assert.ok(server.indexOf('await assertExclusiveWorkbook(url,link)')<server.indexOf('const token=await googleToken();',server.indexOf('await assertExclusiveWorkbook(url,link)')));
 assert.ok(server.includes('mỗi giáo viên/trường phải dùng file riêng'));
});

test('new schools do not silently reuse private reference workbook',()=>{
 assert.ok(!ui.includes('setUrl(profile.school_name?.toLocaleLowerCase'));
 assert.ok(ui.includes("setUrl('')"));
 assert.ok(ui.includes('Mỗi giáo viên/trường có file Google Sheets riêng.'));
});

test('Service Account workflow offers Google copy and editor access without OAuth',()=>{
 assert.ok(ui.includes('Tạo bản sao Google Sheets'));
 assert.ok(ui.includes('ic3-sheets-sync@qlpm-ic3.iam.gserviceaccount.com'));
 assert.ok(ui.includes('sourceCopyId'));
 assert.ok(ui.includes('Người chỉnh sửa (Editor)'));
 assert.ok(!ui.includes('Quyền Google:'));
});
