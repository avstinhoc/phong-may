import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDriveFolderUrl,schoolFolderSuggestedName} from '../src/lib/driveSchoolFolders.js';

const edge=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/SheetsConnectionPanel.jsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261118111200_school_google_drive_folders.sql',import.meta.url),'utf8');

test('accept only native Google Drive folder URLs, not Sheet links or arbitrary URLs',()=>{
 const id='123456789abcdefghi_jklmnopqrstuv';
 assert.equal(parseDriveFolderUrl('https://drive.google.com/drive/folders/'+id),id);
 assert.equal(parseDriveFolderUrl('https://drive.google.com/drive/u/0/folders/'+id+'?usp=sharing'),id);
 assert.throws(()=>parseDriveFolderUrl('https://docs.google.com/spreadsheets/d/'+id+'/edit'));
 assert.throws(()=>parseDriveFolderUrl('https://malicious.test/drive/folders/'+id));
 assert.equal(schoolFolderSuggestedName('THCS Duy Tân'),'THCS Duy Tân');
});

test('server checks school membership, folder editor access, file parent and file edit access',()=>{
 assert.ok(edge.includes('action==="register_school_folder"'));
 assert.ok(edge.includes('action==="link_school_workbook"'));
 assert.ok(edge.includes('school_drive_folders'));
 assert.ok(edge.includes('info.capabilities?.canEdit!==true'));
 assert.ok(edge.includes('file.capabilities?.canEdit!==true'));
 assert.ok(edge.includes('file.parents?.includes(existingFolder.folder_id)'));
 assert.ok(edge.includes('.eq("school_id",schoolId).eq("user_id",ownerId)'));
 assert.ok(edge.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(edge.includes('if(linked.spreadsheet_id===spreadsheetId)'));
});

test('new workbook insertion cannot bypass server folder verification via Data API',()=>{
 assert.ok(migration.includes('create table if not exists public.school_drive_folders'));
 assert.ok(migration.includes('enable row level security'));
 assert.ok(migration.includes('grant select on public.school_drive_folders to authenticated'));
 assert.ok(migration.includes('drop policy if exists sheet_links_own_insert'));
 assert.ok(!migration.includes('grant insert on public.school_drive_folders to authenticated'));
 assert.ok(ui.includes("callSchoolDrive('link_school_workbook'"));
 assert.ok(!ui.includes("from('school_sheet_links').insert"));
});

test('website guides a school teacher through one-time folder sharing then moving a fresh Sheet',()=>{
 assert.ok(ui.includes('Kiểm tra & lưu thư mục'));
 assert.ok(ui.includes('Tạo file Google Sheets của trường'));
 assert.ok(ui.includes('Di chuyển'));
 assert.ok(ui.includes('Sao chép email Editor'));
 assert.ok(ui.includes('ic3-sheets-sync@qlpm-ic3.iam.gserviceaccount.com'));
 assert.ok(ui.includes('schoolFolder?.folder_name'));
 assert.ok(ui.includes('setSchoolFolder(folderData||null)'));
 assert.ok(ui.includes('Dán link bản sao &amp; liên kết'));
});

const rootMigration=readFileSync(new URL('../supabase/migrations/20261118114600_qlpm_drive_root.sql',import.meta.url),'utf8');

test('QLPM Drive structure is root → individual school folder → spreadsheet',()=>{
 assert.ok(rootMigration.includes('create table if not exists public.qlpm_drive_root'));
 assert.ok(rootMigration.includes('enable row level security'));
 assert.ok(rootMigration.includes('grant select on public.qlpm_drive_root to authenticated'));
 assert.ok(edge.includes('action==="register_qlpm_root"'));
 assert.ok(edge.includes('profile.role!=="admin"'));
 assert.ok(edge.includes('info.parents?.includes(qlpmRoot.folder_id)'));
 assert.ok(edge.includes('folderInfo.parents?.includes(qlpmRoot.folder_id)'));
 assert.ok(edge.includes('actualSchoolFolder.parents?.includes(rootGuard.folder_id)'));
 assert.ok(ui.includes('Bước 1 · Thư mục cha chung: QLPM – Google Sheets'));
 assert.ok(ui.includes('Bước 2 · Thư mục con: {profile.school_name}'));
 assert.ok(ui.includes('Bước 3 · Tạo file Google Sheets của trường từ mẫu trống'));
 assert.ok(ui.includes('register_qlpm_root'));
});

test('root is admin-only to configure, existing school links remain intact',()=>{
 assert.ok(rootMigration.includes('grant select on public.qlpm_drive_root to authenticated'));
 assert.ok(!rootMigration.includes('grant insert on public.qlpm_drive_root to authenticated'));
 assert.ok(edge.includes('if(profile.role!=="admin")throw fail('));
 assert.ok(edge.includes('if(existingChild?.length)throw fail('));
 assert.ok(ui.includes('Liên kết Google Sheets'));
 assert.ok(ui.includes('File Sheets đã liên kết trước đây vẫn được giữ nguyên'));
});
