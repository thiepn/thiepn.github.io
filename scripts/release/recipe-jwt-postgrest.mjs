import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';

const origin='http://127.0.0.1:3039';
const secret=process.env.RECIPE_TEST_JWT_SECRET;
assert.ok(secret && secret.length>=32,'Fixture JWT secret missing');
const UUIDS=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function jwt(sub,role='authenticated',secretOverride=secret){
 const header=encode({alg:'HS256',typ:'JWT'});
 const payload=encode({sub,role,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)});
 const data=header+'.'+payload;
 return data+'.'+createHmac('sha256',secretOverride).update(data).digest('base64url');
}
async function request(path,{token=null,profile='audit'}={}){
 const headers={'Accept-Profile':profile};
 if(token) headers.Authorization='Bearer '+token;
 const r=await fetch(origin+path,{headers});
 const text=await r.text();
 return {status:r.status,body:text,parsed:(()=>{try{return JSON.parse(text)}catch{return null}})()};
}
async function ready(){
 for(let i=0;i<40;i++){
  try{const r=await fetch(origin+'/');if(r.status>0)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw Error('Local PostgREST did not start');
}
await ready();
for(const owner of UUIDS){
 const result=await request('/owner_probe?select=user_id,value',{token:jwt(owner)});
 assert.equal(result.status,200,JSON.stringify(result));
 assert.equal(result.parsed.length,1,'Non-bypass role should read exactly one owner record');
 assert.equal(result.parsed[0].user_id,owner);
 assert.equal(result.parsed[0].value,owner===UUIDS[0]?'owner-one-private':'owner-two-private');
 console.log('PASS signed local JWT owner-only row',owner);
}
const invalid=await request('/owner_probe?select=user_id',{token:jwt(UUIDS[0],'authenticated','wrong-disposable-audit-signing-key-00000000')});
assert.equal(invalid.status,401,'Invalid JWT signature must be rejected');
console.log('PASS invalid signature denied');

const anonymous=await request('/owner_probe?select=user_id');
assert.ok([401,403].includes(anonymous.status),'Anonymous role should not access private owner fixture');
console.log('PASS anonymous fixture read denied');

for(const owner of UUIDS){
 const denied=await request('/recipes?select=id',{token:jwt(owner),profile:'recipe'});
 assert.ok([401,403,404].includes(denied.status),'Authenticated Recipe direct table read must fail: '+JSON.stringify(denied));
 console.log('PASS original Recipe table direct access denied',owner,denied.status);
}
const wrongRole=await request('/owner_probe?select=user_id',{token:jwt(UUIDS[0],'service_role')});
assert.ok([401,403].includes(wrongRole.status),'Authenticator must not be able to adopt service_role');
console.log('PASS service_role impersonation denied');
console.log('PASS all disposable PostgreSQL 17 / signed-JWT / non-BYPASSRLS authorization assertions');
