import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';
const source=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const code=source.slice(source.indexOf('async function reconcileClassTabs('),source.indexOf('async function syncSchool('));
const build=transformSync(code,{loader:'ts',target:'es2022'}).code;
const link={id:'link',school_id:'school',spreadsheet_id:'book',template_tab:'Gốc'};
const row={class_id:'class',class_name:'6.2',school_id:'school',link_id:'link',workbook:'book',gid:7,state:'active'};
function setup(records,sheets,claims=[]){
 const operations=[];
 const admin={from(table){
  let result=table==='class_tab_identity'?records:table==='school_sheet_links'?[link]:claims;
  const builder={select(){return this},eq(){return this},in(){return this},limit(){return this},
   update(value){operations.push(value);result=[];return this},then(resolve){resolve({data:result})}};
  return builder;
 },async rpc(name,p){operations.push([name,p]);return {}}};
 const reconcile=Function('sheetBatch','classTabTitle','fail',build+';return reconcileClassTabs')(async(id,requests)=>operations.push(requests),n=>n,Error);
 const meta={spreadsheetId:'book',sheets:sheets.map(([sheetId,title])=>({properties:{sheetId,title}}))};
 return {run:()=>reconcile(admin,link,meta,'test'),operations,meta};
}
test('confirmed Web deletion targets only its bound gid and is safe to retry',async()=>{
 const fixture=setup([{...row,state:'delete_requested'}],[[7,'6.2'],[8,'Gốc']]);
 await fixture.run();await fixture.run();
 assert.deepEqual(fixture.operations.filter(Array.isArray),[[{deleteSheet:{sheetId:7}}]]);
 assert.deepEqual(fixture.meta.sheets.map(s=>s.properties.title),['Gốc']);
});
test('renamed, foreign, shared and template sheets are protected',async()=>{
 for(const [record,sheets,claims] of [[row,[[7,'Renamed']],[]],[{...row,school_id:'other',state:'delete_requested'},[[7,'6.2']],[]],
 [{...row,state:'delete_requested'},[[7,'6.2'],[8,'Gốc']],[link]],[{...row,state:'delete_requested'},[[7,'Gốc'],[8,'6.2']],[]]]){
  const f=setup([record],sheets,claims);await f.run();assert.equal(f.operations.length,0);
 }
});
test('missing gid with a same-name replacement is observed without touching replacement',async()=>{
 const f=setup([row],[[8,'6.2']]);const result=await f.run();assert.ok(result.blocked.has('6.2'));
 assert.equal(f.operations[0][1].p_gid,7);assert.equal(f.meta.sheets[0].properties.sheetId,8);
});
test('database deactivates only on a repeated scoped observation and retains students',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table schools(id uuid primary key);create table classes(id uuid primary key,school_id uuid,class_name text,created_at timestamptz default now(),archived_at timestamptz,retired_at timestamptz);
 create table school_sheet_links(id uuid primary key,school_id uuid,spreadsheet_id text,template_tab text);
 create table school_sheet_tabs(link_id uuid,sheet_gid int,sheet_title text,class_name text,created_at timestamptz default now());
 create table students(class_id uuid references classes);insert into schools values(gen_random_uuid());
 insert into classes select id,id,'6.2',now(),null,null from schools;
 insert into school_sheet_links select id,id,'book','Gốc' from schools;
 insert into school_sheet_tabs select id,7,'6.2','6.2',now() from schools;
 insert into students select id from classes;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261119065000_class_tab_identity.sql',import.meta.url),'utf8'));
 const observe="select observe_missing_class_tab(id,id,'book',7) from classes";
 await db.exec(observe);assert.equal((await db.query('select retired_at from classes')).rows[0].retired_at,null);
 await db.exec("update class_tab_identity set missing_since=now()-interval '2 minutes'");await db.exec(observe.replace("'book'","'other'"));
 assert.equal((await db.query('select retired_at from classes')).rows[0].retired_at,null);
 await db.exec(observe);assert.ok((await db.query('select retired_at from classes')).rows[0].retired_at);
 assert.equal((await db.query('select * from students')).rows.length,1);
 }finally{await db.close();}
});
