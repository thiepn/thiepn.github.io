// Runs real local workerd + D1, never Cloudflare remote or THIEPN Account.
// No use of Cloudflare tokens, real JWTs or production data.
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=publicKey.export({format:'jwk'});
const tmp=mkdtempSync(join(tmpdir(),'h21-d1-local-'));
const endpoint='http://127.0.0.1:9797';
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const hash=()=>randomBytes(32).toString('hex');
const base64url=x=>Buffer.from(x).toString('base64url');
const iat=Math.floor(Date.now()/1000);
function token(user,{expired=false,wrongIssuer=false,anonymous=false}={}) {
  const h=base64url(JSON.stringify({alg:'ES256',typ:'JWT'}));
  const p=base64url(JSON.stringify({iss:wrongIssuer?'https://evil.invalid/auth/v1':'https://h21-disposable.invalid/auth/v1',aud:'authenticated',role:'authenticated',is_anonymous:anonymous,sub:user,iat,exp:expired?iat-20:iat+900}));
  const signature=sign('sha256',Buffer.from(h+'.'+p),{key:privateKey,dsaEncoding:'ieee-p1363'});
  return h+'.'+p+'.'+base64url(signature);
}
const ta=token(a),tb=token(b);
const base={
  schemaVersion:2,
  pages:[{id:'home',sectionIds:['section-start','section-apps','section-activity']}],
  sections:{
    'section-start':{id:'section-start',blockIds:['block-continue','block-now']},
    'section-apps':{id:'section-apps',blockIds:['block-apps']},
    'section-activity':{id:'section-activity',blockIds:['block-study','block-recent']},
  },
  blocks:{
    'block-continue':{id:'block-continue',type:'continue',settings:{}},
    'block-now':{id:'block-now',type:'now',settings:{}},
    'block-apps':{id:'block-apps',type:'apps',settings:{}},
    'block-study':{id:'block-study',type:'study',settings:{}},
    'block-recent':{id:'block-recent',type:'recent',settings:{}},
  },
  layouts:{
    desktop:{sectionOrder:['section-start','section-apps','section-activity'],placements:[
      {blockId:'block-continue',sectionId:'section-start',size:'l',x:0,y:0,w:8,h:1},
      {blockId:'block-now',sectionId:'section-start',size:'m',x:8,y:0,w:4,h:1},
      {blockId:'block-apps',sectionId:'section-apps',size:'xl',x:0,y:0,w:12,h:1},
      {blockId:'block-study',sectionId:'section-activity',size:'l',x:0,y:0,w:7,h:1},
      {blockId:'block-recent',sectionId:'section-activity',size:'m',x:7,y:0,w:5,h:1},
    ]},
    tablet:{sectionOrder:['section-start','section-apps','section-activity'],placements:[
      {blockId:'block-continue',sectionId:'section-start',size:'l',x:0,y:0,w:5,h:1},
      {blockId:'block-now',sectionId:'section-start',size:'m',x:5,y:0,w:3,h:1},
      {blockId:'block-apps',sectionId:'section-apps',size:'xl',x:0,y:0,w:8,h:1},
      {blockId:'block-study',sectionId:'section-activity',size:'l',x:0,y:0,w:5,h:1},
      {blockId:'block-recent',sectionId:'section-activity',size:'m',x:5,y:0,w:3,h:1},
    ]},
    mobile:{sectionOrder:['section-start','section-apps','section-activity'],placements:[
      {blockId:'block-continue',sectionId:'section-start',size:'l',x:0,y:0,w:4,h:1},
      {blockId:'block-now',sectionId:'section-start',size:'m',x:0,y:1,w:4,h:1},
      {blockId:'block-apps',sectionId:'section-apps',size:'xl',x:0,y:0,w:4,h:1},
      {blockId:'block-study',sectionId:'section-activity',size:'l',x:0,y:0,w:4,h:1},
      {blockId:'block-recent',sectionId:'section-activity',size:'m',x:0,y:1,w:4,h:1},
    ]},
  },
  appearance:{theme:'prism',mode:'system',density:'balanced',intensity:'balanced',motion:'balanced',surface:'default',cornerStyle:'default',iconStyle:'rich'},
  preferences:{customizeMobileSeparately:false},
};
const doc=(mode='system')=>JSON.stringify({...base,appearance:{...base.appearance,mode}});
function call(path,token,method='GET',body) {
  return fetch(endpoint+path,{
    method,
    headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(12000),
  });
}
const get=(owner,t=ta)=>call('/v1/home?ownerId='+owner,t);
const recovered=(owner,rev,t=ta)=>call('/v1/home/recovery?ownerId='+owner+'&revision='+rev,t);
const cas=(owner,expected,key,raw,t=ta)=>call('/v1/home/cas',t,'POST',{ownerId:owner,expectedRevision:expected,idempotencyKey:key,raw});
const ticks=[];
async function check(name,run) {await run();ticks.push(name);console.log('PASS',name);}
let child,logs='';
let done=false;
const cleanup=()=>{if(child&&!child.killed)child.kill('SIGTERM');};
async function main() {
  const config='tests/h21-cloudflare/wrangler.jsonc';
  const cli=['--yes','wrangler@4.50.0'];
  const cmd=spawnSync('npx',[...cli,'d1','execute','h21-disposable','--config',config,'--local','--persist-to',tmp,'--file','tests/h21-cloudflare/schema.sql'],{encoding:'utf8',timeout:90000});
  assert.equal(cmd.status,0,'local D1 schema failed: '+cmd.stderr+' '+cmd.stdout);
  child=spawn('npx',[...cli,'dev','--config',config,'--local','--ip','127.0.0.1','--port','9797','--persist-to',tmp,'--var','H21_TEST_PUBLIC_JWK:'+JSON.stringify(jwk)],{
    env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',x=>{logs+=x.toString();});
  child.stderr.on('data',x=>{logs+=x.toString();});
  let started=false;
  for(let i=0;i<140;i++){
    if(child.exitCode!==null)break;
    try {const r=await fetch(endpoint+'/status',{signal:AbortSignal.timeout(700)});if(r.status===404){started=true;break;}} catch {}
    await new Promise(ok=>setTimeout(ok,400));
  }
  assert.ok(started,'local Worker did not start: '+logs.slice(-3000));
  await check('unauthorized and forged token deny',async()=>{
    assert.equal((await get(a,null)).status,401);
    assert.equal((await get(a,token(a,{expired:true}))).status,401);
    assert.equal((await get(a,token(a,{wrongIssuer:true}))).status,401);
    assert.equal((await get(a,token(a,{anonymous:true}))).status,401);
    const bad=ta.slice(0,-3)+'xyz';assert.equal((await get(a,bad)).status,401);
  });
  await check('new owner empty and cross-owner denied',async()=>{
    assert.equal(await (await get(a)).json(),null);
    assert.equal((await get(a,tb)).status,403);
    assert.equal((await recovered(a,hash(),tb)).status,403);
    assert.equal((await cas(a,null,hash(),doc(),tb)).status,403);
  });
  const firstKey=hash(), raw1=doc();
  const first=await (await cas(a,null,firstKey,raw1)).json();
  await check('initial CAS and owner-qualified D1 read',async()=>{
    assert.equal(first.outcome,'applied');
    assert.match(first.revision,/^[a-f0-9]{64}$/);
    assert.deepEqual(await (await get(a)).json(),{ownerId:a,revision:first.revision,raw:raw1});
    assert.equal(await (await get(b)).json(),null);
  });
  await check('replay idempotency and mismatched reuse',async()=>{
    assert.deepEqual(await (await cas(a,null,firstKey,raw1)).json(),first);
    assert.equal((await cas(a,null,firstKey,doc('dark'))).status,409);
    assert.deepEqual(await (await get(a)).json(),{ownerId:a,revision:first.revision,raw:raw1});
  });
  await check('failed stale expected and malformed schema leave original unchanged',async()=>{
    const conflict=await (await cas(a,hash(),hash(),doc('light'))).json();
    assert.equal(conflict.outcome,'conflict');assert.equal(conflict.revision,first.revision);
    const invalid=structuredClone(base);delete invalid.layouts.mobile;
    assert.equal((await cas(a,first.revision,hash(),JSON.stringify(invalid))).status,400);
    assert.deepEqual(await (await get(a)).json(),{ownerId:a,revision:first.revision,raw:raw1});
  });
  const secondKey=hash(),raw2=doc('dark');
  const second=await (await cas(a,first.revision,secondKey,raw2)).json();
  await check('durable prior-revision exact byte recovery read',async()=>{
    assert.equal(second.outcome,'applied');
    assert.notEqual(second.revision,first.revision);
    assert.deepEqual(await (await recovered(a,first.revision)).json(),{ownerId:a,revision:first.revision,raw:raw1});
    assert.deepEqual(await (await get(a)).json(),{ownerId:a,revision:second.revision,raw:raw2});
    assert.deepEqual(await (await cas(a,first.revision,secondKey,raw2)).json(),second);
  });
  await check('concurrent CAS only one winner, loser creates no receipt',async()=>{
    const x=hash(),y=hash(),r1=doc('light'),r2=doc('system');
    const responses=await Promise.all([cas(a,second.revision,x,r1),cas(a,second.revision,y,r2)]);
    const values=await Promise.all(responses.map(z=>z.json()));
    assert.deepEqual(values.map(z=>z.outcome).sort(),['applied','conflict']);
    const winner=values.find(z=>z.outcome==='applied'), loser=values.find(z=>z.outcome==='conflict');
    const winRaw=values[0].outcome==='applied'?r1:r2;
    assert.equal((await (await get(a)).json()).raw,winRaw);
    assert.equal((await (await get(a)).json()).revision,winner.revision);
    assert.deepEqual(await (await recovered(a,second.revision)).json(),{ownerId:a,revision:second.revision,raw:raw2});
    const loserReplay=await (await cas(a,second.revision,values[0].outcome==='conflict'?x:y,values[0].outcome==='conflict'?r1:r2)).json();
    assert.equal(loserReplay.outcome,'conflict');
    assert.equal(loserReplay.revision,winner.revision);
    assert.equal(loser.outcome,'conflict');
  });
  await check('independent second owner and original preservation',async()=>{
    const other=await (await cas(b,null,hash(),doc('light'),tb)).json();
    assert.equal(other.outcome,'applied');
    assert.equal((await (await get(b,tb)).json()).ownerId,b);
    assert.equal((await get(b,ta)).status,403);
    assert.equal((await recovered(b,first.revision,ta)).status,403);
    assert.deepEqual(await (await recovered(a,first.revision)).json(),{ownerId:a,revision:first.revision,raw:raw1});
  });
  done=true;
}
try {await main();}
finally {
  cleanup();
  try{rmSync(tmp,{recursive:true,force:true});}catch{}
  writeFileSync('tests/h21-cloudflare/evidence.local.json',JSON.stringify({
    phase:'H21',kind:'ephemeral-worker-d1-test',success:done,cases:ticks,
    realOwnerConsent:false,realAccountAuth:false,productionTouched:false,
    release:'NO_GO',gatesOpen:7,localD1:true,
  },null,2)+'\n');
  if(!done)console.error('Local Worker output:',logs.slice(-4000));
}
assert.equal(ticks.length,8);
console.log('H21 local D1 PASS:',ticks.length,'acceptance groups; NO_GO remains.');
