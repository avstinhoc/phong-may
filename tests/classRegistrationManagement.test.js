import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const management=readFileSync(new URL('../src/ClassSettings.jsx',import.meta.url),'utf8');
const roster=readFileSync(new URL('../src/StudentRoster.jsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261117200332_teacher_manage_own_class_registration_code.sql',import.meta.url),'utf8');

test('class owner can edit, archive and restore a registration code safely',()=>{
 assert.ok(management.includes('Sửa mã'));
 assert.ok(management.includes('Xóa mã'));
 assert.ok(management.includes('Khôi phục mã'));
 assert.ok(management.includes("'ic3_manage_class_registration'"));
 assert.ok(!management.includes("profile.role==='admin'&&"));
 assert.ok(migration.includes('c.created_by is distinct from auth.uid()'));
 assert.ok(migration.includes('public.can_access_school(c.school_id)'));
 assert.ok(migration.includes("archived_at=case"));
});

test('student roster filter toolbar appears below attendance tabs and before table',()=>{
 const tabs=roster.indexOf('Hồ sơ & điểm danh');
 const filters=roster.indexOf('className="toolbar roster-toolbar"');
 const table=roster.indexOf('className="table-wrap"');
 assert.ok(tabs>=0 && filters>tabs && table>filters);
});
