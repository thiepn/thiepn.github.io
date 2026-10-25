import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';

const origin='http://127.0.0.1:3039', secret=process.env.TMS60_TEST_JWT_SECRET;
assert.ok(secret&&secret.length>=32,'Disposable JWT secret required');
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
function jwt(sub,role='authenticated',key=secret){
 const pre=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub,role,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
 return pre+'.'+createHmac('sha256',key).update(pre).digest('base64url');
}
async function request(path,{sub,method='GET',body,token}={}){
 const headers={'Content-Type':'application/json',Prefer:'return=representation'};
 if(sub)headers.Authorization='Bearer '+jwt(sub);
 if(token)headers.Authorization='Bearer '+token;
 const res=await fetch(origin+path,{method,headers,body:body?JSON.stringify(body):undefined});
 const txt=await res.text();let data;try{data=JSON.parse(txt)}catch{data=txt}
 return {status:res.status,data};
}
function okay(x,allowed=[200,201,204]){assert.ok(allowed.includes(x.status),JSON.stringify(x));return x.data;}
async function ready(){
 for(let i=0;i<60;i++){
  try{await fetch(origin+'/');return}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Disposable PostgREST did not start');
}
await ready();
const state=(owner,title,language='esv')=>({user_id:owner,translation_id:language,state_schema:1,state:{note:title},client_updated_at:1,revision:1});
const backup=(owner,title)=>({user_id:owner,translation_id:'esv',state_schema:1,state:{note:title},source_revision:1});
okay(await request('/tms60_sync_state',{sub:a,method:'POST',body:state(a,'owner-A-original')}));
okay(await request('/tms60_sync_state',{sub:b,method:'POST',body:state(b,'owner-B-original')}));
okay(await request('/tms60_sync_state',{sub:a,method:'POST',body:state(a,'owner-A-French','nlt')}));
okay(await request('/tms60_backups',{sub:a,method:'POST',body:backup(a,'owner-A-backup')}));
okay(await request('/tms60_backups',{sub:b,method:'POST',body:backup(b,'owner-B-backup')}));
for(const [sub,expected] of [[a,'owner-A-original'],[b,'owner-B-original']]){
 const states=okay(await request('/tms60_sync_state?select=user_id,translation_id,state',{sub}));
 assert.ok(Array.isArray(states)&&states.length===(sub===a?2:1),JSON.stringify(states));
 assert.ok(states.every(x=>x.user_id===sub),'Cross-account state appeared');
 assert.equal(states.find(x=>x.translation_id==='esv').state.note,expected);
 const backups=okay(await request('/tms60_backups?select=user_id,translation_id,state',{sub}));
 assert.equal(backups.length,1);
 assert.equal(backups[0].user_id,sub);
 console.log('PASS JWT authenticated-only own state and backups',sub);
}
const deny=await request('/tms60_sync_state',{sub:b,method:'POST',body:state(a,'forbidden-create','hfa')});
assert.equal(deny.status,403,'Owner B must not insert owner A state');
const crossUpdate=okay(await request('/tms60_sync_state?user_id=eq.'+a+'&translation_id=eq.esv',{sub:b,method:'PATCH',body:{state:{note:'evil'}}}));
assert.deepEqual(crossUpdate,[],'Owner B update must touch no other-account row');
const crossRead=okay(await request('/tms60_backups?user_id=eq.'+a,{sub:b}));
assert.deepEqual(crossRead,[]);
console.log('PASS cross-account create, edit and backup read blocked');
const wrong=await request('/rpc/delete_tms60_cloud_data',{sub:a,method:'POST',body:{p_expected_user_id:b}});
assert.ok(wrong.status===403||wrong.status===400,'Identity-switch mismatch must fail: '+JSON.stringify(wrong));
const rightBefore=okay(await request('/tms60_sync_state?user_id=eq.'+a,{sub:a}));
assert.equal(rightBefore.length,2,'Failed delete must preserve A original rows');
assert.equal(okay(await request('/tms60_sync_state?user_id=eq.'+b,{sub:b})).length,1,'Failed delete must preserve B rows');
console.log('PASS mismatched identity destructive RPC denies and preserves both owners');
const malformed=await request('/tms60_sync_state?select=state',{token:jwt(a,'authenticated','other-disposable-secret-000000000000000000'),method:'GET'});
assert.equal(malformed.status,401,'Bad signed JWT must be rejected');
const anonymous=await request('/tms60_sync_state?select=state');
assert.ok([401,403].includes(anonymous.status),'Anonymous state read must fail');
console.log('PASS unsigned and invalid-signature access rejected');
// Allowed owner-specific deletion is exercised only within disposable PG17, never production.
const legitimate=okay(await request('/rpc/delete_tms60_cloud_data',{sub:a,method:'POST',body:{p_expected_user_id:a}}));
assert.ok(legitimate.deleted_sync_states>=2&&legitimate.deleted_backups>=1,'Original identity-bound delete must remove only A');
assert.deepEqual(okay(await request('/tms60_sync_state?select=user_id',{sub:a})),[]);
assert.equal(okay(await request('/tms60_sync_state?select=user_id',{sub:b})).length,1);
assert.equal(okay(await request('/tms60_backups?select=user_id',{sub:b})).length,1);
console.log('PASS valid A-only cloud deletion preserves B original state and backup');
console.log('PASS original TMS60 first five SQL migrations + signed JWT + genuine non-bypass RLS in disposable PostgreSQL');
