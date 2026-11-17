import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const oauth=readFileSync(new URL('../supabase/functions/google-drive-oauth/index.ts',import.meta.url),'utf8');
const sync=readFileSync(new URL('../supabase/functions/google-sheets-sync/index.ts',import.meta.url),'utf8');
const refresh=readFileSync(new URL('../supabase/functions/google-sheets-sync/google-user-token.ts',import.meta.url),'utf8');
const card=readFileSync(new URL('../src/GoogleDriveOAuthCard.jsx',import.meta.url),'utf8');
const config=readFileSync(new URL('../supabase/config.toml',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261118020000_google_drive_oauth.sql',import.meta.url),'utf8');

test('OAuth flow requires one-time PKCE challenge and Supabase identity for POST actions',()=>{
 assert.ok(oauth.includes('code_challenge_method:"S256"'));
 assert.ok(oauth.includes('access_type:"offline"'));
 assert.ok(oauth.includes('code_verifier:pending.code_verifier'));
 assert.ok(oauth.includes('.is("consumed_at",null)'));
 assert.ok(oauth.includes('await authorizeTeacher(req)'));
 assert.ok(oauth.includes('await client.auth.getUser(jwt)'));
 assert.ok(config.includes('[functions.google-drive-oauth]\nverify_jwt = false'));
 assert.ok(config.includes('[functions.google-sheets-sync]\nverify_jwt = true'));
});
test('refresh tokens encrypted with AES-256-GCM and user-specific associated data',()=>{
 assert.ok(oauth.includes('crypto.subtle.encrypt('));
 assert.ok(oauth.includes('additionalData:encoder.encode(userId)'));
 assert.ok(refresh.includes('crypto.subtle.decrypt('));
 assert.ok(refresh.includes('additionalData:encode.encode(ownerId)'));
 assert.ok(migration.includes('alter table public.google_drive_connections enable row level security'));
 assert.ok(migration.includes('revoke all privileges on public.google_drive_connections from public,anon,authenticated'));
 assert.ok(!oauth.includes('refresh_token: data.refresh_token'));
});
test('OAuth callback never hands Google tokens to the browser',()=>{
 const html=oauth.slice(oauth.indexOf('function landing('),oauth.indexOf('async function callback('));
 assert.ok(html.includes('window.opener.postMessage('));
 assert.ok(!html.includes('access_token'));
 assert.ok(!html.includes('refresh_token'));
 assert.ok(!html.includes('data.refresh_token'));
 assert.ok(!html.includes('data.access_token'));
});
test('personal My Drive creation does not depend on Service Account Shared Drive',()=>{
 assert.ok(sync.includes('await googleUserAccessToken(ownerId)'));
 assert.ok(sync.includes('const token=await googleToken(ownerId)'));
 assert.ok(!sync.includes('GOOGLE_SHEETS_PARENT_FOLDER_ID'));
 assert.ok(sync.includes('copyMode="sheets-copyto"'));
 assert.ok(sync.includes('freshTabRequests(tab.id,tab.title,school.name)'));
 assert.ok(card.includes('Kết nối Google Drive'));
});
