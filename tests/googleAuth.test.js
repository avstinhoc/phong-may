import test from 'node:test';
import assert from 'node:assert/strict';
import {GOOGLE_PROVIDER,googleCallbackUrl,googleOAuthError,hasGoogleIdentity,startGoogleAuth} from '../src/lib/googleAuth.js';

const origin='https://phong-may.vercel.app/auth/callback';
test('Google sign-in keeps fixed verified callback and minimal scopes',async()=>{
 let payload;
 const result=await startGoogleAuth({signInWithOAuth:async arg=>{payload=arg;return {data:{url:'https://accounts.google.com/test'},error:null};}},origin);
 assert.equal(GOOGLE_PROVIDER,'google');
 assert.equal(result.url,'https://accounts.google.com/test');
 assert.deepEqual(payload,{provider:'google',options:{redirectTo:origin+'?provider=google'}});
 assert.equal('scopes' in payload.options,false);
});
test('Google linking targets logged-in account with an explicit callback flag',async()=>{
 let payload;
 await startGoogleAuth({linkIdentity:async arg=>{payload=arg;return {data:{url:'https://accounts.google.com/link'},error:null};}},origin,{linkExisting:true});
 assert.deepEqual(payload,{provider:'google',options:{redirectTo:origin+'?provider=google&linked=1'}});
});
test('callback cannot redirect to a different site or insecure internet origin',()=>{
 assert.throws(()=>googleCallbackUrl('https://untrusted.test/'),/hợp lệ/);
 assert.throws(()=>googleCallbackUrl('http://example.com/auth/callback'),/hợp lệ/);
 assert.equal(googleCallbackUrl('http://localhost:5173/auth/callback'),'http://localhost:5173/auth/callback?provider=google');
});
test('Google identity is detected without changing app role',()=>{
 assert.equal(hasGoogleIdentity([{provider:'email'},{provider:'google'}]),true);
 assert.equal(hasGoogleIdentity([{provider:'email'}]),false);
 assert.equal(hasGoogleIdentity(null),false);
});
test('provider missing, linking disabled and redirected error have useful Vietnamese messages',()=>{
 assert.match(googleOAuthError({message:'Unsupported provider: provider is not enabled'}),/Supabase/);
 assert.match(googleOAuthError({message:'Manual identity linking is disabled'}),/Manual Identity Linking/);
 assert.match(googleOAuthError({message:'invalid redirect url'}),/auth\/callback/);
});
test('auth server failure never marks Google sign-in successful',async()=>{
 await assert.rejects(()=>startGoogleAuth({signInWithOAuth:async()=>({error:Error('provider is not enabled')})},origin),/provider is not enabled/);
});
