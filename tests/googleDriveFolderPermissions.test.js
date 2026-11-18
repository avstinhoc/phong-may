import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDriveFolderUrl} from '../src/lib/driveSchoolFolders.js';

const edge=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/SheetsConnectionPanel.jsx',import.meta.url),'utf8');
const script=readFileSync(new URL('../google-apps-script/qlpm-drive-auto-copy.gs',import.meta.url),'utf8');
const rootMigration=readFileSync(new URL('../supabase/migrations/20261118114600_qlpm_drive_root.sql',import.meta.url),'utf8');
const seeded=readFileSync(new URL('../supabase/migrations/20261118121500_seed_flat_qlpm_root.sql',import.meta.url),'utf8');

test('QLPM root contains the template and school files directly (no new school subfolders)',()=>{
 const folder='1d8ZiM9q2xyxKNZwTSD5mN77fpVma-Nti';
 const template='1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM';
 assert.equal(parseDriveFolderUrl('https://drive.google.com/drive/folders/'+folder),folder);
 assert.equal(parseDriveFolderUrl('https://drive.google.com/drive/u/0/folders/'+folder+'?usp=drive_link'),folder);
 assert.ok(seeded.includes(folder));
 assert.ok(edge.includes('const QLPM_ROOT_ID="'+folder+'"'));
 assert.ok(edge.includes('const QLPM_TEMPLATE_ID="'+template+'"'));
 assert.ok(script.includes("const TEMPLATE_NAME = 'DS ĐIỂM DANH'"));
 assert.ok(script.includes('template.makeCopy(filename, root)'));
 assert.ok(ui.includes('Không cần thư mục con'));
 assert.ok(!ui.includes('setSchoolFolder('));
});

test('owner Apps Script copies only signed requests and never creates duplicate school files',()=>{
 assert.ok(script.includes("PropertiesService.getScriptProperties()"));
 assert.ok(script.includes("setupQlpmCopy"));
 assert.ok(script.includes("Utilities.computeHmacSha256Signature"));
 assert.ok(script.includes("Math.abs(Date.now() - ts) > 5 * 60 * 1000"));
 assert.ok(script.includes("LockService.getScriptLock()"));
 assert.ok(script.includes("root.getFilesByName(filename)"));
 assert.ok(script.includes("QLPM_SCHOOL_ID:"));
 assert.ok(script.includes("ROOT_FOLDER_ID, TEMPLATE_SHEET_ID].join('|')"));
 assert.ok(edge.includes('const message=[ts,nonce,schoolId,title,rootId,QLPM_TEMPLATE_ID].join("|")'));
 assert.ok(edge.includes('crypto.subtle.sign("HMAC"'));
 assert.ok(edge.includes('QLPM_APPS_SCRIPT_SIGNING_KEY'));
 assert.ok(edge.includes('QLPM_APPS_SCRIPT_WEB_APP_URL'));
 assert.ok(!ui.includes('QLPM_COPY_SIGNING_KEY'));
});

test('file link and creation are school-scoped and reject other school workbooks',()=>{
 assert.ok(edge.includes('action==="create_school_workbook"||action==="link_school_workbook"'));
 assert.ok(edge.includes('.eq("school_id",schoolId).eq("user_id",ownerId)'));
 assert.ok(edge.includes('if(already){'));
 assert.ok(edge.includes('duplicates.length>1'));
 assert.ok(edge.includes('if(spreadsheetId===QLPM_TEMPLATE_ID)'));
 assert.ok(edge.includes('!file.parents?.includes(root.folder_id)||file.capabilities?.canEdit!==true'));
 assert.ok(edge.includes('.neq("school_id",schoolId).limit(1)'));
 assert.ok(edge.includes("status:\"verified\",auto_sync:true"));
 assert.ok(ui.includes("callSchoolDrive('create_school_workbook'"));
 assert.ok(ui.includes("callSchoolDrive('link_school_workbook'"));
 assert.ok(!ui.includes("from('school_sheet_links').insert"));
});
test('root registry admin-only, browser never receives signing key',()=>{
 assert.ok(rootMigration.includes('create table if not exists public.qlpm_drive_root'));
 assert.ok(rootMigration.includes('enable row level security'));
 assert.ok(rootMigration.includes('grant select on public.qlpm_drive_root to authenticated'));
 assert.ok(edge.includes('action==="register_qlpm_root"'));
 assert.ok(edge.includes('if(profile.role!=="admin")throw fail('));
 assert.ok(ui.includes('Lưu link có sẵn'));
 assert.ok(ui.includes('Tạo file Google Sheets của trường'));
 assert.ok(ui.includes('DS ĐIỂM DANH'));
 assert.ok(ui.includes('Hạn chế'));
 assert.ok(!ui.includes("from('school_drive_folders')"));
});

test('blank template Gốc tab is the source for new class tabs',()=>{
 assert.ok(edge.includes('t.title==="Gốc"'));
 assert.ok(edge.includes('template_tab:detectedTemplate'));
 assert.ok(ui.includes("tabs.find(t=>t.title==='Gốc')"));
});
test('block publicly shared Drive roots when permission metadata is returned',()=>{
 assert.ok(edge.includes('function ensurePrivateRoot(info:Dict)'));
 assert.ok(edge.includes('p.type==="anyone"'));
 assert.ok(edge.includes('Quyền truy cập chung → Hạn chế'));
 assert.ok(edge.includes('ensurePrivateRoot(rootInfo)'));
});
