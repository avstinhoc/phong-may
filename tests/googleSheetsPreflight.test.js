import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const edge=readFileSync(new URL("../supabase/functions/google-sheets-sync/index.ts",import.meta.url),"utf8");
test("Google Sheets CORS OPTIONS uses null body with HTTP 204",()=>{
 assert.ok(edge.includes('if(req.method==="OPTIONS")return new Response(safe?null:'));
 assert.ok(!edge.includes('new Response("",{status:safe?204'));
 assert.ok(edge.includes('if(!safe)return respond(403,'));
});
