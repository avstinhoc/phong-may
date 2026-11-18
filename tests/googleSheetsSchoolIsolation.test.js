import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/SheetsConnectionPanel.jsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261118093000_shared_google_sheets_per_school.sql',import.meta.url),'utf8');

test('shared Google Sheets allows only the same normalized school name across teacher-specific school UUIDs',()=>{
 assert.ok(server.includes('async function assertExclusiveWorkbook(url:string,link:Dict)'));
 assert.ok(server.includes('async function assertSameSchoolWorkbook(admin:any,schoolId:string,otherSchoolIds:string[])'));
 assert.ok(server.includes('toLocaleUpperCase("vi")'));
 assert.ok(server.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(server.includes('.select("id,name").in("id",unique)'));
 assert.ok(server.includes('workbookSchoolKey(s.name)!==key'));
 assert.ok(server.includes('await assertSameSchoolWorkbook(admin,schoolId,(usedBy||[])'));
 assert.ok(server.includes('await assertSameSchoolWorkbook(admin,link.school_id,(data||[])'));
 assert.ok(server.indexOf('await assertExclusiveWorkbook(url,link)')<server.indexOf('const token=await googleToken();',server.indexOf('await assertExclusiveWorkbook(url,link)')));
 assert.ok(server.includes('.eq("id",linkId).maybeSingle()'));
 assert.ok(!server.includes('.eq("id",linkId).eq("owner_id",ownerId)'));
});
test('school-level RLS allows only authorized staff to use a shared workbook',()=>{
 assert.ok(migration.includes('school_sheet_links_one_per_school'));
 assert.ok(migration.includes('public.can_access_school(school_id)'));
 assert.ok(migration.includes('public.can_access_school(l.school_id)'));
 assert.ok(migration.includes('owner_id=(select auth.uid()) or public.is_admin()'));
 assert.ok(migration.includes('new.spreadsheet_id'));
 assert.ok(migration.includes('protect_shared_school_sheet_link'));
});
test('source template is fixed and cannot be saved as a live school workbook',()=>{
 assert.ok(ui.includes('1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM'));
 assert.ok(ui.includes("callSchoolDrive('create_school_workbook'"));
 assert.ok(ui.includes('suggestedTitle'));
 assert.ok(ui.includes('Tạo file Google Sheets của trường'));
 assert.ok(ui.includes('Lưu link có sẵn'));
 assert.ok(ui.includes('Service Account'));
 assert.ok(ui.includes('ic3-sheets-sync@qlpm-ic3.iam.gserviceaccount.com'));
 assert.ok(ui.includes('if(id===EMPTY_SCHOOL_TEMPLATE_ID)'));
 assert.ok(!ui.includes('Quyền Google:'));
});
test('other school teachers see shared link instead of a private personal link',()=>{
 assert.ok(ui.includes(".select('*').eq('school_id',profile.school_id).maybeSingle()"));
 assert.ok(ui.includes('const canManageLink='));
 assert.ok(ui.includes('Dùng chung cho giáo viên tại'));
 assert.ok(!ui.includes(".eq('owner_id',profile.id).eq('school_id',profile.school_id)"));
});
