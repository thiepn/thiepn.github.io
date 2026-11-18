import { test,expect,type Browser,type Page } from '@playwright/test';
import fs from 'node:fs';
const configuration=JSON.parse(fs.readFileSync('src/data/hub-account.json','utf8'));
const OWNER='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';
const base='http://127.0.0.1:4321';
const jwt=(owner:string)=>['fixture',Buffer.from(JSON.stringify({sub:owner,client_id:configuration.clientId,iss:configuration.issuer+'/auth/v1',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
function backend(options:{sharing:boolean;probeEligible:boolean;singleUseRefresh?:boolean;refreshDelayMs?:number}={sharing:false,probeEligible:false}) {
 const failures=new Map<string,number>();
 const heads=new Map<string,{revision:number;state:unknown}>(),receipts=new Map<string,{hash:string;revision:number}>();
 let challenge='',exchanges=0,refreshes=0,probeDelay=0;let unavailable=false;let refreshConsumed=false;const writes:{owner:string;state:any}[]=[];
 return {heads,failures,writes,delayProbe:(ms:number)=>probeDelay=ms,accountSignedIn:(value:boolean)=>options.probeEligible=value,exchanges:()=>exchanges,refreshes:()=>refreshes,offline:(value:boolean)=>unavailable=value,async device(browser:Browser,owner:string|null=OWNER,viewport={width:1440,height:1024},clock=false,storageMode:'normal'|'quota'|'session-blocked'|'idb-blocked'='normal') {
  const context=await browser.newContext({viewport,timezoneId:'Europe/Berlin',serviceWorkers:'block'});
  if(storageMode!=='normal')await context.addInitScript(({mode,noLocks})=>{
   if(location.origin!=='https://thiepn.dev')return;
   if(noLocks)Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});
   if(mode==='idb-blocked'){const open=indexedDB.open.bind(indexedDB);indexedDB.open=(name,version)=>{if(name==='thiepn-hub-account')throw new DOMException('Fixture blocks Account IndexedDB','SecurityError');return open(name,version);};return;}
   if(mode==='session-blocked'){
    if(localStorage.getItem('fixture:session-recovered')!=='1')Object.defineProperty(window,'sessionStorage',{configurable:true,get(){throw new DOMException('Fixture blocks session storage','SecurityError');}});
    return;
   }
   if(sessionStorage.getItem('fixture:quota-filled'))return;
   sessionStorage.setItem('fixture:quota-filled','1');
   let i=0;for(const size of [500_000,10_000,100,1]){try{for(let n=0;n<1000;n++)localStorage.setItem('fixture:app-data:'+i++,'x'.repeat(size));}catch{}}
  },{mode:storageMode,noLocks:options.singleUseRefresh===true});
  if(owner)await context.addInitScript(({owner,token,seedOnce})=>{
    if(seedOnce&&localStorage.getItem('a1:seeded')==='1')return;
    localStorage.setItem('thiepn:hub-sso:v1:tokens',JSON.stringify({
      accessToken:token,refreshToken:seedOnce?'fixture-refreshed':'fixture-refresh',
      expiresAt:Date.now()+3600000,scope:'openid email profile offline_access'}));
    if(seedOnce)localStorage.setItem('a1:seeded','1');
  },{owner,token:jwt(owner),seedOnce:options.singleUseRefresh===true});
  await context.route('https://thiepn.dev/**',async route=>{
   try {const url=new URL(route.request().url());const response=await context.request.get(base+url.pathname+url.search,{maxRetries:2});expect(new URL(response.url()).origin).toBe(base);await route.fulfill({response});}
   catch(error){
    // A late favicon/stylesheet request may be cancelled by context teardown.
    // Keep failures observable while any test page is still open.
    if(context.pages().some(page=>!page.isClosed()))throw error;
   }
  });
  let probeRequests=0;
  await context.route('https://account.thiepn.dev/**',async route=>{probeRequests++;if(probeDelay)await new Promise(resolve=>setTimeout(resolve,probeDelay));await route.fulfill({contentType:'text/html',body:`<script>parent.postMessage(${JSON.stringify({type:'thiepn:sso-probe:v1',clientId:configuration.clientId,signedIn:options.probeEligible,eligible:options.probeEligible})},'https://thiepn.dev')</script>`});});
  await context.route('https://thiepn-core-gateway.thiepn.workers.dev/v1/languages/dashboard',async route=>{
   const request=route.request();expect(request.method()).toBe('GET');const bearer=request.headers().authorization??'';expect(bearer).toMatch(/^Bearer fixture\./);const token=JSON.parse(Buffer.from(bearer.split('.')[1]!,'base64url').toString());expect(token.client_id).toBe(configuration.clientId);expect([OWNER,OTHER]).toContain(token.sub);
   await route.fulfill({json:{ok:true,data:{schema:'thiepn-language-dashboard',schemaVersion:1,contractVersion:'p9-dashboard-v1',generatedAt:new Date().toISOString(),enrollments:[],snapshots:[]}}});
  });
  await context.route(configuration.issuer+'/**',async route=>{
   if(unavailable){await route.abort('internetdisconnected');return;}
   const request=route.request(),url=new URL(request.url());
   if(url.pathname==='/auth/v1/oauth/authorize'){expect(url.searchParams.get('client_id')).toBe(configuration.clientId);expect(url.searchParams.get('code_challenge_method')).toBe('S256');challenge=url.searchParams.get('code_challenge')!;const callback=new URL(configuration.callback);callback.searchParams.set('code','fictional-one-use-code');callback.searchParams.set('state',url.searchParams.get('state')!);await route.fulfill({contentType:'text/html',body:'<script>location.replace('+JSON.stringify(callback.href)+')</script>'});return;}
   if(url.pathname==='/auth/v1/oauth/token'){const data=request.postDataJSON();if(data.grant_type==='refresh_token'){expect(data.client_id).toBe(configuration.clientId);expect(data.refresh_token).toBe('fixture-refreshed');refreshes++;const replay=refreshConsumed;refreshConsumed=true;await new Promise(resolve=>setTimeout(resolve,options.refreshDelayMs??100));if(replay&&options.singleUseRefresh){await route.fulfill({status:400,json:{error:'invalid_grant'}});return;}await route.fulfill({json:{access_token:jwt(OWNER),refresh_token:'fixture-rotated',expires_in:3600,scope:'openid email profile offline_access',token_type:'bearer'}});return;}expect(data.client_id).toBe(configuration.clientId);expect(data.code).toBe('fictional-one-use-code');const {createHash}=await import('node:crypto');expect(createHash('sha256').update(data.code_verifier).digest('base64url')).toBe(challenge);exchanges++;await route.fulfill({json:{access_token:jwt(OWNER),refresh_token:'fixture-refreshed',expires_in:3600,scope:'openid email profile offline_access',token_type:'bearer'}});return;}
   const payload=JSON.parse(Buffer.from((request.headers().authorization??'').split('.')[1]??'','base64url').toString()||'{}');const uid=payload.sub;
   if(url.pathname==='/auth/v1/user'){await route.fulfill({json:{id:uid,email:'fixture@example.test'}});return;}
   const rpc=url.pathname.split('/').at(-1)!,data=request.postDataJSON()??{};let result:unknown;
   const failure=failures.get(rpc);if(failure){await route.fulfill({status:failure,json:{message:'PRIVATE backend error body'}});return;}
   if(rpc==='get_thiepn_hub_connections')result={owner:uid,notes:{permissions:options.sharing?['notes.hub.summary.read']:[],revision:options.sharing?OTHER:null},tms60:options.sharing?[{translation:'esv',permissions:['tms60.hub.summary.read'],revision:OTHER}]:[],library:options.sharing};
   else if(rpc==='read_thiepn_hub_notes')result=[{user_id:uid,note_id:OTHER,title:'Connected Notes title',deleted_at:null,trashed_at:null,archived_at:null}];
   else if(rpc==='read_thiepn_hub_library')result={owner:uid,items:[{title:'Connected Library book',percentage:50}]};
   else if(rpc==='read_thiepn_hub_tms60')result={schemaVersion:1,providerId:'tms60',operation:'summary',requestId:data.p_request_id,context:{scope:'account',accountId:uid,workspaceId:null,grantRevision:data.p_revision,translationId:data.p_translation},status:'ready',privacy:'private',coverage:'translation-cloud-snapshot',observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),sourceUpdatedAt:null,data:{items:[],dueTaskCount:2,dueVerseCount:1,newVerseCount:3}};
   else if(rpc==='read_thiepn_hub_workspace')result={owner:uid,...(heads.get(uid)??{revision:0,state:null})};
   else if(rpc==='sync_thiepn_hub_workspace') {
    const key=uid+':'+data.p_mutation_id,hash=JSON.stringify(data),old=receipts.get(key),head=heads.get(uid)??{revision:0,state:null};
    if(old){if(old.hash!==hash){await route.fulfill({status:400,json:{message:'mutation reuse'}});return;}result={owner:uid,status:'applied',revision:old.revision};}
    else if(data.p_base_revision!==head.revision)result={owner:uid,status:'conflict',revision:head.revision};
    else{const revision=head.revision+1;heads.set(uid,{revision,state:data.p_state});receipts.set(key,{hash,revision});writes.push({owner:uid,state:data.p_state});result={owner:uid,status:'applied',revision};}
   } else {await route.fulfill({status:404,json:{message:'unexpected RPC'}});return;}
   await route.fulfill({json:result});
  });
  const page=await context.newPage();await page.bringToFront();if(clock)await page.clock.install();await page.goto('https://thiepn.dev/');if(storageMode==='session-blocked'){await expect(page.locator('[data-hub-account]')).toHaveAttribute('data-account-failure','SecurityError');return {page,context};}try {
   // Cold SSO includes the bounded eight-second Account probe plus PKCE
   // navigation and verification. Local-token/guest assertions stay at 5s.
   await expect(page.locator('[data-storage-label]')).toHaveText(owner||options.probeEligible?'THIEPN Account':'This device',{timeout:owner===null&&options.probeEligible?15_000:5_000});
  }catch(error){const state=await page.evaluate(()=>({path:location.pathname,visible:!document.hidden,hasAppToken:Boolean(localStorage.getItem('thiepn:hub-sso:v1:tokens'))}));throw new Error('Account bootstrap incomplete: '+JSON.stringify({probeRequests,exchanges,...state}),{cause:error});}await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');if(owner===null&&!options.probeEligible){await expect.poll(()=>probeRequests).toBeGreaterThan(0);await expect(page.locator('iframe[src*="/sso/probe"]')).toHaveCount(0);}return {page,context};
 }};
}
async function sync(page:Page){await page.locator('[data-action=cloud-retry]:visible').first().click();await expect(page.locator('[data-cloud-status]:visible').first()).toHaveText('Synced with your account');}
async function task(page:Page,title:string){await page.locator('[data-planner] [data-action=new-task]').first().click();await page.getByLabel('Task',{exact:true}).fill(title);await page.locator('[data-dialog-submit]').click();await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();}
test('two independent devices sync tasks, offline changes and app navigation without sharing another account',async({browser})=>{
 // This journey opens three independent devices and performs several sync cycles.
 // Preserve per-action/assertion deadlines; allow the complete journey to finish on WebKit.
 test.setTimeout(60_000);
 const api=backend(),a=await api.device(browser);await sync(a.page);await task(a.page,'First device task');await sync(a.page);
 const b=await api.device(browser);await sync(b.page);await expect(b.page.locator('.ws-task-title')).toHaveText('First device task');
 await task(b.page,'Second device task');await sync(b.page);await sync(a.page);await expect(a.page.locator('.ws-task-title')).toHaveText(['First device task','Second device task']);
 api.offline(true);await task(a.page,'Offline task');await a.page.locator('[data-action=cloud-retry]').first().click();await expect(a.page.locator('[data-cloud-status]').first()).not.toHaveText('Synced with your account');
 api.offline(false);await sync(a.page);await sync(b.page);await expect(b.page.locator('.ws-task-title')).toHaveCount(3);
 await a.page.locator('a[href="/apps/"]').first().click();await expect(a.page).toHaveURL('https://thiepn.dev/apps/');await a.page.locator('a[href="/"]').first().click();await expect(a.page.locator('.ws-task-title')).toHaveCount(3);
 const other=await api.device(browser,OTHER);await sync(other.page);await expect(other.page.locator('.ws-task-title')).toHaveCount(0);expect(api.heads.get(OTHER)?.state).not.toEqual(api.heads.get(OWNER)?.state);
 await Promise.all([a.context.close(),b.context.close(),other.context.close()]);
});
test('remote updates preserve an active capture draft and signing out clears account data',async({browser})=>{
 // Two devices, multiple sync cycles and WebKit context shutdown share this budget.
 // Individual action/assertion deadlines remain unchanged.
 test.setTimeout(60_000);
 const api=backend(),a=await api.device(browser);await sync(a.page);const b=await api.device(browser);await sync(b.page);
 const capture=a.page.locator('[data-capture-draft]');await capture.fill('Still typing');await task(b.page,'Remote task');await sync(b.page);
 await a.page.locator('[data-action=cloud-retry]').first().click(); // Clicking finishes focus; edit text must still be preserved.
 await expect(capture).toHaveValue('Still typing');await sync(a.page);await expect(capture).toHaveValue('Still typing');
 await a.page.locator('.ws-topbar [data-action=account]').click();await a.page.locator('[data-auth-logout]').click();await expect(a.page.locator('[data-storage-label]')).toHaveText('This device');await expect(a.page.locator('.ws-task-title')).toHaveCount(0);await expect(a.page.locator('[data-capture-draft]')).toHaveValue('');
 await Promise.all([a.context.close(),b.context.close()]);
});
test('mobile account dialog exposes cloud status and recovery actions',async({browser})=>{
 const api=backend(),a=await api.device(browser,OWNER,{width:390,height:844});await expect(a.page.locator('[data-cloud-status]').first()).toHaveText('Synced with your account');await a.page.locator('.ws-topbar [data-action=account]').click();await expect(a.page.locator('[data-account-dialog] [data-cloud-status]')).toHaveText('Synced with your account');await expect(a.page.locator('[data-account-dialog] [data-action=cloud-retry]')).toBeVisible();await a.context.close();
});

test('the shared SDK completes explicit PKCE sign-in and consumes the callback once',async({browser})=>{
 const api=backend(),a=await api.device(browser,null);await a.page.locator('.ws-topbar [data-action=account]').click();await a.page.locator('[data-auth-login]').click();await expect(a.page.locator('[data-storage-label]')).toHaveText('THIEPN Account');await expect(a.page).toHaveURL('https://thiepn.dev/');expect(api.exchanges()).toBe(1);await a.page.reload();await expect(a.page.locator('[data-storage-label]')).toHaveText('THIEPN Account');expect(api.exchanges()).toBe(1);await a.context.close();
});
test('an eligible Account session connects Hub automatically through tokenless SSO and PKCE',async({browser})=>{
 const api=backend({sharing:false,probeEligible:true}),a=await api.device(browser,null);expect(api.exchanges()).toBe(1);await sync(a.page);await a.context.close();
});
for(const storageMode of ['normal','idb-blocked'] as const)test(`fresh tabs reuse the connected session after previous tabs close (${storageMode})`,async({browser})=>{
 const api=backend({sharing:false,probeEligible:true}),a=await api.device(browser,null,undefined,false,storageMode);
 expect(api.exchanges()).toBe(1);await a.page.close();
 const next=await a.context.newPage();const destinations:string[]=[];next.on('framenavigated',frame=>{if(frame===next.mainFrame())destinations.push(frame.url());});
 await next.goto('https://thiepn.dev/');await expect(next.locator('[data-storage-label]')).toHaveText('THIEPN Account');
 expect(api.exchanges()).toBe(1);expect(destinations.every(url=>new URL(url).origin==='https://thiepn.dev')).toBe(true);
 await a.context.close();
});
test('concurrent new tabs share one rotating refresh even without Web Locks',async({browser})=>{
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true}),a=await api.device(browser,null);
 // No prior verified identity or OAuth navigation. Seed a single synthetic,
 // expired Account credential identically in localStorage and the durable DB.
 // This isolates true refresh behavior from PKCE and stale VERIFIED cache state.
 await a.page.evaluate(async accessToken=>{
   const key='thiepn:hub-sso:v1:tokens';
   const value=JSON.stringify({accessToken,refreshToken:'fixture-refreshed',
     expiresAt:0,scope:'openid email profile offline_access'});
   localStorage.setItem(key,value);
   await new Promise<void>((resolve,reject)=>{
     const request=indexedDB.open('thiepn-hub-account');
     request.onsuccess=()=>{
       const db=request.result,tx=db.transaction('session','readwrite');
       tx.objectStore('session').put({value,legacy:value},key);
       tx.oncomplete=()=>{db.close();resolve();};
       tx.onabort=()=>reject(tx.error);
     };
     request.onerror=()=>reject(request.error);
   });
 },jwt(OWNER));
 await a.page.close();
  // Force the Safari/browser fallback on both new tabs; a single rotating
  // refresh must still be shared without navigator.locks.
  await a.context.addInitScript(()=>{
    Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});
    // Test-only instrumentation: no credentials, token values, task data or
    // identifiers recorded. Observe IndexedDB lease operations per fresh tab.
    const metrics={leaseReads:0,leaseWrites:0,leaseReleases:0,accountDbOpens:0,accountDbFailures:0};
    (window as any).__hubA1Metrics=metrics;
    const originalOpen=indexedDB.open.bind(indexedDB);
    Object.defineProperty(indexedDB,'open',{configurable:true,value:(name:string,version?:number)=>{
      const request=version===undefined?originalOpen(name):originalOpen(name,version);
      if(name==='thiepn-hub-account'){metrics.accountDbOpens++;
        request.addEventListener('error',()=>{metrics.accountDbFailures++;});}
      return request;
    }});
    const oldGet=IDBObjectStore.prototype.get,oldPut=IDBObjectStore.prototype.put;
    const oldDelete=IDBObjectStore.prototype.delete;
    const leaseKey='thiepn:hub-account-storage:refresh-lease';
    Object.defineProperty(IDBObjectStore.prototype,'get',{configurable:true,value:function(this:IDBObjectStore,...args:unknown[]){
      if(this.name==='session'&&args[0]===leaseKey)metrics.leaseReads++;
      return Reflect.apply(oldGet,this,args);
    }});
    Object.defineProperty(IDBObjectStore.prototype,'put',{configurable:true,value:function(this:IDBObjectStore,...args:unknown[]){
      if(this.name==='session'&&args[1]===leaseKey)metrics.leaseWrites++;
      return Reflect.apply(oldPut,this,args);
    }});
    Object.defineProperty(IDBObjectStore.prototype,'delete',{configurable:true,value:function(this:IDBObjectStore,...args:unknown[]){
      if(this.name==='session'&&args[0]===leaseKey)metrics.leaseReleases++;
      return Reflect.apply(oldDelete,this,args);
    }});
  });
  const pages=await Promise.all([a.context.newPage(),a.context.newPage()]);
 await Promise.all(pages.map(async page=>{await page.goto('https://thiepn.dev/');await expect(page.locator('[data-storage-label]')).toHaveText('THIEPN Account');}));
 for(const page of pages)expect(await page.evaluate(()=>Boolean(navigator.locks))).toBe(false);
 const metrics=await Promise.all(pages.map(page=>page.evaluate(()=>(window as any).__hubA1Metrics)));
 // Emit only aggregate lease counts and request counts, never credential data.
 console.info('A1_REFRESH_DIAGNOSTICS',JSON.stringify({refreshAttempts:api.refreshes(),
   perTab:metrics}));
 expect(api.exchanges()).toBe(0);
 expect(api.refreshes(),'single-use refresh and IndexedDB lease evidence: '+JSON.stringify(metrics)).toBe(1);
 await a.context.close();
});
test('A1 restricted storage and no Web Locks must preserve local workspace without uncoordinated refresh',async({browser})=>{
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true});
 const a=await api.device(browser,OWNER,undefined,false,'idb-blocked');
 await a.page.evaluate(()=>{
   const key='thiepn:hub-sso:v1:tokens';
   const raw=localStorage.getItem(key);
   if(!raw)throw Error('A1 fixture requires a local token');
   const record=JSON.parse(raw);
   localStorage.setItem(key,JSON.stringify({...record,expiresAt:0,refreshToken:'fixture-refreshed'}));
 });
 await a.page.close();
 api.accountSignedIn(false); // Prevent unrelated automatic OAuth navigation during fallback proof.
 await a.context.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
 const pages=await Promise.all([a.context.newPage(),a.context.newPage()]);
 try{
   await Promise.all(pages.map(async page=>{
     await page.goto('https://thiepn.dev/');
     // With both distributed coordination primitives missing, Account may
     // enter guest mode; the local workspace must still render readably.
     await expect(page.locator('[data-workspace]')).toBeVisible();
     await expect(page.locator('[data-storage-label]')).toHaveText('This device');
     expect(await page.evaluate(()=>Boolean(navigator.locks))).toBe(false);
   }));
   console.info('A1_RESTRICTED_STORAGE_DIAGNOSTICS',JSON.stringify({
     refreshAttempts:api.refreshes(),
     localWorkspacesAccessible:pages.length,
     saveStatus:await Promise.all(pages.map(page=>page.locator('[data-workspace-status]').textContent())),
     state:await Promise.all(pages.map(page=>page.locator('[data-storage-label]').textContent()))
   }));
   expect(api.refreshes(),'No distributed lease means no safe rotating refresh').toBe(0);
 }finally{await a.context.close();}
});

/** A2 test-only fixture: source and durable credentials start identical and expired. */
async function seedA2ExpiredToken(page:Page){
 await page.evaluate(async accessToken=>{
  const key='thiepn:hub-sso:v1:tokens';
  const value=JSON.stringify({accessToken,refreshToken:'fixture-refreshed',expiresAt:0,
   scope:'openid email profile offline_access'});
  localStorage.setItem(key,value);
  await new Promise<void>((resolve,reject)=>{
   const request=indexedDB.open('thiepn-hub-account');
   request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('session','readwrite');
    tx.objectStore('session').put({value,legacy:value},key);
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=()=>reject(tx.error);
   };
   request.onerror=()=>reject(request.error);
  });
 },jwt(OWNER));
}
test('A2 lease contention keeps one single-use refresh with four tabs and no Web Locks',async({browser})=>{
 test.setTimeout(75_000);
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true,refreshDelayMs:1200});
 const a=await api.device(browser,null);
 await seedA2ExpiredToken(a.page);
 await a.page.close();
 await a.context.addInitScript(()=>{
  Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});
  const metrics={leaseReads:0,leaseWrites:0,leaseReleases:0,dbErrors:0};
  (window as any).__a2LeaseMetrics=metrics;
  const get=IDBObjectStore.prototype.get,put=IDBObjectStore.prototype.put,del=IDBObjectStore.prototype.delete;
  const key='thiepn:hub-account-storage:refresh-lease';
  IDBObjectStore.prototype.get=function(...args){if(this.name==='session'&&args[0]===key)metrics.leaseReads++;return Reflect.apply(get,this,args);};
  IDBObjectStore.prototype.put=function(...args){if(this.name==='session'&&args[1]===key)metrics.leaseWrites++;return Reflect.apply(put,this,args);};
  IDBObjectStore.prototype.delete=function(...args){if(this.name==='session'&&args[0]===key)metrics.leaseReleases++;return Reflect.apply(del,this,args);};
  const open=indexedDB.open.bind(indexedDB);
  indexedDB.open=((name:string,version?:number)=>{
   const request=version===undefined?open(name):open(name,version);
   if(name==='thiepn-hub-account')request.addEventListener('error',()=>metrics.dbErrors++);
   return request;
  }) as typeof indexedDB.open;
 });
 const pages=await Promise.all(Array.from({length:4},()=>a.context.newPage()));
 try{
  await Promise.all(pages.map(async page=>{
   await page.goto('https://thiepn.dev/');
   await expect(page.locator('[data-storage-label]')).toHaveText('THIEPN Account',{timeout:30_000});
   expect(await page.evaluate(()=>Boolean(navigator.locks))).toBe(false);
  }));
  const metrics=await Promise.all(pages.map(page=>page.evaluate(()=>(window as any).__a2LeaseMetrics)));
  console.info('A2_CONTENTION_COUNTS',JSON.stringify({refreshAttempts:api.refreshes(),leaseReads:metrics.map(m=>m.leaseReads),leaseWrites:metrics.map(m=>m.leaseWrites),leaseReleases:metrics.map(m=>m.leaseReleases),dbErrors:metrics.map(m=>m.dbErrors)}));
  expect(api.exchanges()).toBe(0);
  expect(api.refreshes()).toBe(1);
  expect(metrics.every(m=>m.dbErrors===0&&m.leaseReads>0&&m.leaseWrites>0&&m.leaseReleases>0)).toBe(true);
 }finally{await a.context.close();}
});
test('A2 stale expired localStorage mirror cannot undo a completed durable rotation without Web Locks',async({browser})=>{
 test.setTimeout(60_000);
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true});
 const a=await api.device(browser,null);
 await seedA2ExpiredToken(a.page);
 await a.page.close();
 await a.context.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
 const first=await a.context.newPage();
 try {
  await first.goto('https://thiepn.dev/');
  await expect(first.locator('[data-storage-label]')).toHaveText('THIEPN Account');
  expect(api.refreshes()).toBe(1);
  await first.evaluate(accessToken=>{
   // Simulate an old tab writing an expired legacy mirror AFTER durable refresh.
   localStorage.setItem('thiepn:hub-sso:v1:tokens',JSON.stringify({
    accessToken,refreshToken:'fixture-refreshed',expiresAt:0,
    scope:'openid email profile offline_access'}));
  },jwt(OWNER));
  const second=await a.context.newPage();
  await second.goto('https://thiepn.dev/');
  await expect(second.locator('[data-storage-label]')).toHaveText('THIEPN Account');
  const durableRotated=await second.evaluate(async()=>{
   return await new Promise<boolean>((resolve,reject)=>{
    const request=indexedDB.open('thiepn-hub-account');
    request.onsuccess=()=>{
     const db=request.result,tx=db.transaction('session','readonly');
     const read=tx.objectStore('session').get('thiepn:hub-sso:v1:tokens');
     tx.oncomplete=()=>{db.close();resolve(JSON.parse(read.result?.value??'null')?.refreshToken==='fixture-rotated');};
     tx.onabort=()=>reject(tx.error);
    };
    request.onerror=()=>reject(request.error);
   });
  });
  console.info('A2_STALE_MIRROR_COUNTS',JSON.stringify({refreshAttempts:api.refreshes(),durableRotated}));
  expect(durableRotated).toBe(true);
  expect(api.refreshes()).toBe(1);
 }finally{await a.context.close();}
});


// A3 deliberately uses isolated synthetic credentials and logs only boolean outcomes/counts.
test('A3 SDK re-entry from focus and online does not duplicate a single-use cross-tab refresh',async({browser})=>{
 test.setTimeout(65_000);
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true,refreshDelayMs:1200});
 const a=await api.device(browser,null);
 await seedA2ExpiredToken(a.page);
 await a.page.close();
 await a.context.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
 const pages=await Promise.all([a.context.newPage(),a.context.newPage()]);
 try{
  await Promise.all(pages.map(async page=>{
   await page.goto('https://thiepn.dev/');
   await page.evaluate(()=>{
    for(let n=0;n<4;n++){window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('online'));}
   });
   await expect(page.locator('[data-storage-label]')).toHaveText('THIEPN Account',{timeout:30_000});
  }));
  console.info('A3_SDK_REENTRY',JSON.stringify({refreshAttempts:api.refreshes(),tabCount:pages.length}));
  expect(api.refreshes()).toBe(1);
  expect(api.exchanges()).toBe(0);
 }finally{await a.context.close();}
});
test('A3 legacy expiry manipulation cannot roll back a rotated durable refresh token',async({browser})=>{
 test.setTimeout(65_000);
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true});
 const a=await api.device(browser,null);
 await seedA2ExpiredToken(a.page);
 await a.page.close();
 await a.context.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
 try{
  const first=await a.context.newPage();
  await first.goto('https://thiepn.dev/');
  await expect(first.locator('[data-storage-label]')).toHaveText('THIEPN Account',{timeout:20_000});
  expect(api.refreshes()).toBe(1);
  // A stale predecessor's refresh token may be paired with an expiry larger
  // than the newly rotated durable expiry; timestamps alone prove no lineage.
  await first.evaluate(accessToken=>{
   const key='thiepn:hub-sso:v1:tokens';
   localStorage.setItem(key,JSON.stringify({accessToken,refreshToken:'fixture-refreshed',
    expiresAt:Date.now()+7200_000,scope:'openid email profile offline_access'}));
  },jwt(OWNER));
  const second=await a.context.newPage();
  await second.goto('https://thiepn.dev/');
  await expect(second.locator('[data-storage-label]')).toHaveText('THIEPN Account',{timeout:20_000});
  const state=await second.evaluate(async()=>{
   return await new Promise<{rotated:boolean,legacyAhead:boolean}>((resolve,reject)=>{
    const open=indexedDB.open('thiepn-hub-account');
    open.onsuccess=()=>{
     const db=open.result,tx=db.transaction('session','readonly');
     const req=tx.objectStore('session').get('thiepn:hub-sso:v1:tokens');
     tx.oncomplete=()=>{
      db.close();
      const entry=req.result;
      const tokens=JSON.parse(entry?.value??'null');
      const legacy=JSON.parse(localStorage.getItem('thiepn:hub-sso:v1:tokens')??'null');
      resolve({rotated:tokens?.refreshToken==='fixture-rotated',
       legacyAhead:typeof legacy?.expiresAt==='number'&&legacy.expiresAt>Date.now()+6900_000});
     };
     tx.onabort=()=>reject(tx.error);
    };
    open.onerror=()=>reject(open.error);
   });
  });
  console.info('A3_EXPIRY_LINEAGE',JSON.stringify({refreshAttempts:api.refreshes(),durableRotated:state.rotated,legacyExpiryWasLater:state.legacyAhead}));
  expect(state.legacyAhead).toBe(true);
  expect(state.rotated,'durable token must survive changed expiry of its stale predecessor').toBe(true);
  expect(api.refreshes()).toBe(1);
 }finally{await a.context.close();}
});
test('A3 foreign IndexedDB lease times out without rotating tokens or blocking device workspace',async({browser})=>{
 test.setTimeout(65_000);
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true});
 const a=await api.device(browser,null);
 await seedA2ExpiredToken(a.page);
 await a.page.evaluate(async()=>{
  await new Promise<void>((resolve,reject)=>{
   const open=indexedDB.open('thiepn-hub-account');
   open.onsuccess=()=>{
    const db=open.result,tx=db.transaction('session','readwrite');
    tx.objectStore('session').put({owner:'fixture-foreign-tab',expiresAt:Date.now()+60_000},'thiepn:hub-account-storage:refresh-lease');
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=()=>reject(tx.error);
   };
   open.onerror=()=>reject(open.error);
  });
 });
 await a.page.close();
 await a.context.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
 const page=await a.context.newPage();
 try{
  const started=Date.now();
  await page.goto('https://thiepn.dev/');
  await expect(page.locator('[data-workspace]')).toBeVisible();
  await expect(page.locator('[data-hub-account]')).toHaveAttribute('data-account-failure','initialization',{timeout:35_000});
  const elapsedMs=Date.now()-started;
  await expect(page.locator('[data-storage-label]')).toHaveText('This device');
  await expect(page.locator('[data-workspace]')).toBeVisible();
  console.info('A3_LEASE_TIMEOUT',JSON.stringify({refreshAttempts:api.refreshes(),workspaceAccessible:true,elapsedMs}));
  expect(elapsedMs,'must observe actual 20s lease deadline, not an early guest label').toBeGreaterThanOrEqual(18_000);
  expect(api.refreshes()).toBe(0);
 }finally{await a.context.close();}
});
function a3EnforceRestrictedAccountStorage(){
 Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});
 // WebKit can ignore an own-property replacement of IDBFactory.open. Intercept
 // the actual prototype method instead, without blocking workspace IndexedDB.
 const proto=Object.getPrototypeOf(indexedDB) as IDBFactory;
 const original=proto.open;
 Object.defineProperty(proto,'open',{configurable:true,writable:true,
  value:function(this:IDBFactory,name:string,version?:number){
   if(name==='thiepn-hub-account')throw new DOMException('A3 test-only Account IDB refusal','SecurityError');
   return version===undefined
    ? Reflect.apply(original,this,[name])
    : Reflect.apply(original,this,[name,version]);
  }
 });
}
test('A3 restricted-storage single-tab local task persists without Account refresh',async({browser})=>{
 test.setTimeout(65_000);
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true});
 const a=await api.device(browser,OWNER,undefined,false,'idb-blocked');
 await a.page.evaluate(()=>{
  const key='thiepn:hub-sso:v1:tokens',current=JSON.parse(localStorage.getItem(key)!);
  localStorage.setItem(key,JSON.stringify({...current,expiresAt:0,refreshToken:'fixture-refreshed'}));
 });
 await a.page.close();
 await a.context.addInitScript(a3EnforceRestrictedAccountStorage);
 const page=await a.context.newPage();
 try{
  await page.goto('https://thiepn.dev/');
  await expect(page.locator('[data-storage-label]')).toHaveText('This device');
  const mode=await page.evaluate(()=>{
   let idbBlocked=false;try{indexedDB.open('thiepn-hub-account');}catch{idbBlocked=true;}
   return {noWebLocks:typeof navigator.locks?.request!=='function',idbBlocked};
  });
  expect(mode.noWebLocks&&mode.idbBlocked).toBe(true);
  const initial=await page.locator('[data-workspace-status]').textContent();
  try{await task(page,'A3 restricted solo fixture');}catch(error){
   console.info('A3_SOLO_SAVE_ERROR',JSON.stringify({mode,initial,
    status:await page.locator('[data-workspace-status]').textContent(),
    dialogVisible:await page.locator('[data-workspace-dialog]').isVisible(),
    refreshAttempts:api.refreshes()}));
   throw error;
  }
  await expect(page.locator('.ws-task-title').filter({hasText:'A3 restricted solo fixture'})).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-workspace]')).toBeVisible();
  const preserved=await page.locator('.ws-task-title').filter({hasText:'A3 restricted solo fixture'}).count();
  console.info('A3_SOLO_DURABILITY',JSON.stringify({mode,initial,preserved,refreshAttempts:api.refreshes()}));
  expect(preserved).toBe(1);
  expect(api.refreshes()).toBe(0);
 }finally{await a.context.close();}
});

test('A3 restricted-storage two-tab saving remains durable across reload',async({browser})=>{
 test.setTimeout(65_000);
 const api=backend({sharing:false,probeEligible:false,singleUseRefresh:true});
 const a=await api.device(browser,OWNER,undefined,false,'idb-blocked');
 await a.page.evaluate(()=>{
  const key='thiepn:hub-sso:v1:tokens',current=JSON.parse(localStorage.getItem(key)!);
  localStorage.setItem(key,JSON.stringify({...current,expiresAt:0,refreshToken:'fixture-refreshed'}));
 });
 await a.page.close();
 await a.context.addInitScript(a3EnforceRestrictedAccountStorage);
 const first=await a.context.newPage(),second=await a.context.newPage();
 try {
  await Promise.all([first,second].map(async page=>{
   await page.goto('https://thiepn.dev/');
   await expect(page.locator('[data-workspace]')).toBeVisible();
   await expect(page.locator('[data-storage-label]')).toHaveText('This device');
  }));
  const mode=await Promise.all([first,second].map(page=>page.evaluate(()=>{
    let idbBlocked=false;
    try{indexedDB.open('thiepn-hub-account');}catch{idbBlocked=true;}
    return {noWebLocks:typeof navigator.locks?.request!=='function',idbBlocked};
  })));
  console.info('A3_RESTRICTED_MODE',JSON.stringify({mode,refreshBeforeSave:api.refreshes()}));
  expect(mode.every(item=>item.noWebLocks&&item.idbBlocked)).toBe(true);
  const initial=await Promise.all([first,second].map(p=>p.locator('[data-workspace-status]').textContent()));
  try{await task(first,'A3 restricted durable fixture');}catch(error){
    console.info('A3_RESTRICTED_SAVE_ERROR',JSON.stringify({
      initial,refreshAttempts:api.refreshes(),
      saveStatus:await first.locator('[data-workspace-status]').textContent(),
      dialogVisible:await first.locator('[data-workspace-dialog]').isVisible()}));
    throw error;
  }
  await expect(first.locator('.ws-task-title').filter({hasText:'A3 restricted durable fixture'})).toHaveCount(1);
  const after=await Promise.all([first,second].map(p=>p.locator('[data-workspace-status]').textContent()));
  await first.reload();
  await expect(first.locator('[data-workspace]')).toBeVisible();
  const preserved=await first.locator('.ws-task-title').filter({hasText:'A3 restricted durable fixture'}).count();
  console.info('A3_RESTRICTED_DURABILITY',JSON.stringify({
    initial,after,preserved,refreshAttempts:api.refreshes(),mode}));
  expect(preserved,'local task must survive reload even with Account IndexedDB disabled').toBe(1);
  expect(api.refreshes()).toBe(0);
 }finally{await a.context.close();}
});

test('durable Account token cannot be downgraded by stale localStorage mirror',async({browser})=>{
  const api=backend({sharing:false,probeEligible:true}),a=await api.device(browser,null);
  expect(api.exchanges()).toBe(1);
  await a.page.evaluate(()=>{
    const key='thiepn:hub-sso:v1:tokens';
    const original=JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key,JSON.stringify({...original,expiresAt:0}));
  });
  await a.page.close();
  const next=await a.context.newPage();
  await next.goto('https://thiepn.dev/');
  await expect(next.locator('[data-storage-label]')).toHaveText('THIEPN Account');
  expect(api.exchanges()).toBe(1);
  expect(api.refreshes()).toBe(0);
  await a.context.close();
});
test('full app storage does not block automatic Account connection or erase app data',async({browser})=>{
 const api=backend({sharing:false,probeEligible:true}),a=await api.device(browser,null,undefined,false,'quota');
 const preserved=()=>a.page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('fixture:app-data:')).reduce((size,key)=>size+localStorage.getItem(key)!.length,0));
 const before=await preserved();expect(before).toBeGreaterThan(4_000_000);expect(api.exchanges()).toBe(1);await sync(a.page);
 await a.page.reload();await expect(a.page.locator('[data-storage-label]')).toHaveText('THIEPN Account');expect(api.exchanges()).toBe(1);expect(await preserved()).toBe(before);
 const other=await a.context.newPage();await other.goto('https://thiepn.dev/');await expect(other.locator('[data-storage-label]')).toHaveText('THIEPN Account',{timeout:15_000});expect(api.exchanges()).toBe(1);
 await a.page.locator('.ws-topbar [data-action=account]').click();await a.page.locator('[data-auth-logout]').click();await expect(other.locator('[data-storage-label]')).toHaveText('This device');
 await a.page.reload();await expect(a.page.locator('[data-storage-label]')).toHaveText('This device');expect(await preserved()).toBe(before);
 await Promise.all([a.page.close(),other.close()]);const fresh=await a.context.newPage();await fresh.goto('https://thiepn.dev/');await expect(fresh.locator('[data-storage-label]')).toHaveText('This device');expect(api.exchanges()).toBe(1);await a.context.close();
});
test('Try again restarts Account initialization after session storage recovers',async({browser})=>{
 const api=backend({sharing:false,probeEligible:true}),a=await api.device(browser,null,undefined,false,'session-blocked');
 await a.page.locator('.ws-topbar [data-action=account]').click();await expect(a.page.locator('[data-auth-status]')).toContainText('session storage');
 await a.page.evaluate(()=>localStorage.setItem('fixture:session-recovered','1'));await a.page.locator('[data-auth-retry]').click();
 await expect(a.page.locator('[data-storage-label]')).toHaveText('THIEPN Account',{timeout:15_000});expect(api.exchanges()).toBe(1);await a.context.close();
});
test('visitors get an introduction and can choose their local workspace without signing in',async({browser})=>{
 const api=backend(),a=await api.device(browser,null);
 await expect(a.page.locator('[data-visitor-welcome]')).toBeVisible();await expect(a.page.getByRole('heading',{level:1})).toHaveText('THIEPN Hub');await expect(a.page.locator('[data-visitor-welcome] a[href="/apps/"]')).toBeVisible();
 await a.page.getByRole('link',{name:'Explore apps',exact:false}).click();await expect(a.page).toHaveURL('https://thiepn.dev/apps/');await expect(a.page.locator('[data-hub-item]')).toHaveCount(31);
 await a.page.goto('https://thiepn.dev/');await a.page.getByRole('button',{name:'Use this workspace',exact:true}).click();await expect(a.page.locator('[data-visitor-welcome]')).not.toBeVisible();
 await a.page.reload();await expect(a.page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');await expect(a.page.locator('[data-visitor-welcome]')).not.toBeVisible();expect(api.exchanges()).toBe(0);await a.context.close();
});
test('Account initialization failure leaves local tasks usable and persistent',async({browser})=>{
 const api=backend(),a=await api.device(browser,null,undefined,false,'session-blocked');
 await expect(a.page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');await expect(a.page.locator('[data-visitor-welcome]')).toBeVisible();
 await a.page.locator('[data-planner] [data-action=new-task]').first().click();await a.page.getByLabel('Task',{exact:true}).fill('Works without Account');await a.page.locator('[data-workspace-dialog]').getByRole('button',{name:'Save',exact:true}).click();
 await expect(a.page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');await expect(a.page.locator('[data-visitor-welcome]')).not.toBeVisible();
 await a.page.reload();await expect(a.page.locator('.ws-task-title')).toContainText('Works without Account');await expect(a.page.locator('[data-storage-label]')).toHaveText('This device');
 await a.page.locator('.ws-topbar [data-action=account]').click();await expect(a.page.locator('[data-auth-status]')).toContainText('session storage is blocked');expect(api.exchanges()).toBe(0);expect(api.writes).toHaveLength(0);await a.context.close();
});
test('consented Notes, Library and TMS60 insights appear together and clear with privacy',async({browser})=>{
 const api=backend({sharing:true,probeEligible:false}),a=await api.device(browser);const widget=a.page.locator('[data-widget-type=continue]');await expect(widget).toContainText('Connected Notes title');await expect(widget).toContainText('Connected Library book');await expect(widget).toContainText('50% read');await expect(widget).toContainText('2 reviews due');await a.page.locator('.ws-topbar [data-action=account]').click();await a.page.locator('[data-action=privacy]').first().click();await expect(a.page.locator('[data-workspace-content]')).not.toContainText('Connected Notes title');await expect(a.page.locator('[data-workspace-content]')).not.toContainText('Connected Library book');await a.context.close();
});

test('an account change from another tab saves pending capture to the old owner without uploading it to the new owner',async({browser})=>{
 const api=backend(),a=await api.device(browser);await sync(a.page);await a.page.locator('[data-capture-draft]').fill('Draft owned by the first account');
 await a.page.evaluate(token=>{localStorage.setItem('thiepn:hub-sso:v1:tokens',JSON.stringify({accessToken:token,refreshToken:'fixture-refresh',expiresAt:Date.now()+3600000,scope:'openid email profile offline_access'}));window.dispatchEvent(new StorageEvent('storage',{key:'thiepn:hub-sso:v1:tokens'}));},jwt(OTHER));
 await expect(a.page.locator('[data-capture-draft]')).toHaveValue('');await sync(a.page);
 const old=await a.page.evaluate(owner=>new Promise<string>((resolve,reject)=>{const request=indexedDB.open('thiepn-adaptive-workspace',1);request.onsuccess=()=>{const db=request.result,read=db.transaction('records').objectStore('records').get('user:'+owner);read.onsuccess=()=>{resolve(read.result);db.close();};read.onerror=()=>reject(read.error);};request.onerror=()=>reject(request.error);}),OWNER);
 expect(JSON.parse(old).captureDraft).toBe('Draft owned by the first account');expect(api.writes.filter(write=>write.owner===OTHER).every(write=>write.state.captureDraft==='')).toBe(true);await a.context.close();
});

// Exercises the real shared shell and summary readers, not a standalone status fixture.
test('Connections preserves last success, distinguishes revoked access and exports only safe diagnostics',async({browser})=>{
 const api=backend({sharing:true,probeEligible:false}),a=await api.device(browser);
 try {
  await a.page.goto('https://thiepn.dev/home/connections/');
  const notes=a.page.locator('[data-source-status=notes]'),detail=a.page.locator('[data-source-detail=notes]');
  await expect(notes).toHaveText('Connected · fresh summary');await expect(detail).toContainText('Last successful read');
  api.failures.set('read_thiepn_hub_notes',403);
  await a.page.getByRole('button',{name:'Refresh connections',exact:true}).click();
  await expect(notes).toHaveText('Sharing needs attention');await expect(detail).toContainText('Last successful read');await expect(detail).toContainText('permission-required');
  await expect(a.page.locator('[data-source-status=library]')).toHaveText('Connected · fresh summary');
  await expect(a.page.locator('[data-source-repair=notes] a')).toHaveAttribute('href','https://account.thiepn.dev/hub/connections');
  const downloadPromise=a.page.waitForEvent('download');await a.page.getByRole('button',{name:'Export diagnostics',exact:true}).click();const download=await downloadPromise;
  const report=JSON.parse(fs.readFileSync((await download.path())!,'utf8'));
  expect(report.sources.find((row:any)=>row.source==='notes')).toMatchObject({status:'revoked',errorCode:'permission-required'});
  expect(JSON.stringify(report)).not.toMatch(/PRIVATE|Connected Notes title|Connected Library book|fixture-refresh|note_id|accessToken/);
  // Refreshing status must not replace the focused recovery control every second.
  const repair=a.page.locator('[data-source-repair=notes] a');await repair.focus();await expect(repair).toBeFocused();await a.page.waitForTimeout(1100);await expect(repair).toBeFocused();
  await a.page.locator('.ws-topbar [data-action=account]').click();await a.page.locator('[data-auth-logout]').click();
  await expect(notes).toHaveText('Account not connected');await expect(detail).toHaveText('No successful read in this tab');
 }finally{await a.context.close();}
});

test('the shared verified Account session also supplies the existing language summary read',async({browser})=>{
 const api=backend(),a=await api.device(browser);
 try{
  const response=a.page.waitForResponse('https://thiepn-core-gateway.thiepn.workers.dev/v1/languages/dashboard');
  await a.page.locator('[data-action=refresh-languages]').click();await response;
  await expect(a.page.locator('[data-native-overview]')).toContainText('No visible language snapshots have been published');
 }finally{await a.context.close();}
});

for(const trigger of ['focus','periodic'] as const)test(`Account sign-in is discovered automatically after Hub is already open: ${trigger}`,async({browser})=>{
 const api=backend(),a=await api.device(browser,null,undefined,true);
 try{
  expect(api.exchanges()).toBe(0);api.accountSignedIn(true);
  await a.page.clock.fastForward(trigger==='focus'?31_000:61_000);
  if(trigger==='focus'){
   api.delayProbe(3000);
   await a.page.evaluate(()=>{let attempts=0;window.addEventListener('hub:before-account-navigation',event=>{if(++attempts===2)(event as CustomEvent<{wait(work:Promise<void>):void}>).detail.wait(new Promise<void>(resolve=>(window as any).__continueAccountNavigation=resolve));});});
   await a.page.locator('[data-capture-draft]').fill('Guest draft stays on its device');
   await a.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await expect(a.page.locator('iframe[src*="/sso/probe"]')).toHaveCount(1);
   await a.page.locator('[data-capture-draft]').fill('Latest guest draft written during discovery');
   await expect.poll(()=>a.page.evaluate(()=>typeof (window as any).__continueAccountNavigation)).toBe('function');
   await expect(a.page).toHaveURL('https://thiepn.dev/');
   await a.page.evaluate(()=>(window as any).__continueAccountNavigation());
  }
  await expect(a.page.locator('[data-storage-label]')).toHaveText('THIEPN Account',{timeout:10_000});expect(api.exchanges()).toBe(1);
  if(trigger==='focus'){
   const guest=await a.page.evaluate(()=>new Promise<string>((resolve,reject)=>{const open=indexedDB.open('thiepn-adaptive-workspace',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,read=db.transaction('records').objectStore('records').get('guest');read.onsuccess=()=>{resolve(read.result);db.close();};read.onerror=()=>reject(read.error);};}));
   expect(JSON.parse(guest).captureDraft).toBe('Latest guest draft written during discovery');await expect(a.page.locator('[data-capture-draft]')).toHaveValue('');
  }
 }finally{await a.context.close();}
});


/** A5 diagnostics: distinguish an obsolete localStorage token-mirror assertion
 * from a real verified owner change. Synthetic identities only; never log
 * token values or private draft strings. Original Quality test is untouched. */
test('A5 unchanged durable token rejects another owner in the legacy compatibility mirror',async({browser})=>{
 test.setTimeout(60_000);
 const api=backend(),a=await api.device(browser);
 try {
  await sync(a.page);
  await a.page.evaluate(()=>{
   (window as any).__a5Published=[];
   window.addEventListener('hub:identity',(event:Event)=>{
    const identity=(event as CustomEvent<{status:string;id?:string}>).detail;
    (window as any).__a5Published.push({status:identity.status,id:identity.id??null});
   });
  });
  const draft='A5 original owner diagnostic draft';
  await a.page.locator('[data-capture-draft]').fill(draft);
  await a.page.evaluate(token=>{
   localStorage.setItem('thiepn:hub-sso:v1:tokens',JSON.stringify({
    accessToken:token,refreshToken:'fixture-refresh',expiresAt:Date.now()+3600000,
    scope:'openid email profile offline_access'
   }));
   window.dispatchEvent(new StorageEvent('storage',{key:'thiepn:hub-sso:v1:tokens'}));
  },jwt(OTHER));
  await a.page.waitForTimeout(1200);
  const evidence=await a.page.evaluate(async()=>{
   const open=indexedDB.open('thiepn-hub-account');
   const record=await new Promise<any>((resolve,reject)=>{
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
     const db=open.result,tx=db.transaction('session','readonly'),req=tx.objectStore('session').get('thiepn:hub-sso:v1:tokens');
     tx.oncomplete=()=>{db.close();resolve(req.result);};
     tx.onabort=()=>reject(tx.error);
    };
   });
   const token=JSON.parse(record?.value??'null');
   const subject=token?.accessToken?JSON.parse(atob(token.accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub:null;
   return {
    durableSubject:subject,
    published:(window as any).__a5Published as {status:string;id:string|null}[],
    draftPresent:(document.querySelector('[data-capture-draft]') as HTMLTextAreaElement)?.value==='A5 original owner diagnostic draft',
    accountStatus:document.querySelector('[data-storage-label]')?.textContent,
   };
  });
  console.info('A5_LEGACY_MIRROR',JSON.stringify({
   durableOwnerUnchanged:evidence.durableSubject===OWNER,
   otherIdentityPublished:evidence.published.some(x=>x.id===OTHER),
   originalDraftStillVisible:evidence.draftPresent,
   otherAccountWrites:api.writes.filter(x=>x.owner===OTHER).length,
  }));
  expect(evidence.durableSubject).toBe(OWNER);
  expect(evidence.published.some(x=>x.id===OTHER)).toBe(false);
  expect(evidence.draftPresent).toBe(true);
  expect(api.writes.filter(x=>x.owner===OTHER)).toHaveLength(0);
 }finally{await a.context.close();}
});

test('A5 verified synthetic durable owner transition isolates draft and preserves old owner',async({browser})=>{
 test.setTimeout(80_000);
 const api=backend(),a=await api.device(browser);
 try{
  await sync(a.page);
  await a.page.evaluate(()=>{
   (window as any).__a5Published=[];
   window.addEventListener('hub:identity',(event:Event)=>{
    const identity=(event as CustomEvent<{status:string;id?:string}>).detail;
    (window as any).__a5Published.push({status:identity.status,id:identity.id??null});
   });
  });
  await a.page.locator('[data-capture-draft]').fill('A5 durable old owner draft');
  // Test fixture models an externally verified durable credential handoff.
  // Both legacy and authoritative IDB records are changed consistently.
  await a.page.evaluate(async token=>{
   const key='thiepn:hub-sso:v1:tokens';
   const value=JSON.stringify({accessToken:token,refreshToken:'fixture-refresh',
    expiresAt:Date.now()+3600000,scope:'openid email profile offline_access'});
   await new Promise<void>((resolve,reject)=>{
    const open=indexedDB.open('thiepn-hub-account');
    open.onsuccess=()=>{
     const db=open.result,tx=db.transaction('session','readwrite');
     tx.objectStore('session').put({value,legacy:value},key);
     tx.oncomplete=()=>{db.close();resolve();};
     tx.onabort=()=>reject(tx.error);
    };
    open.onerror=()=>reject(open.error);
   });
   localStorage.setItem(key,value);
   window.dispatchEvent(new StorageEvent('storage',{key}));
   window.dispatchEvent(new Event('focus'));
  },jwt(OTHER));
  await expect.poll(()=>a.page.evaluate(()=>
    ((window as any).__a5Published as {status:string;id?:string}[]).some(x=>x.status==='signed-in'&&x.id==='22222222-2222-4222-8222-222222222222')
  ),{timeout:20_000}).toBe(true);
  await expect(a.page.locator('[data-capture-draft]')).toHaveValue('',{timeout:10_000});
  const evidence=await a.page.evaluate(async owners=>{
   const open=indexedDB.open('thiepn-adaptive-workspace',1);
   const db=await new Promise<IDBDatabase>((resolve,reject)=>{open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
   const results=await Promise.all(owners.map(owner=>new Promise<any>((resolve,reject)=>{
    const req=db.transaction('records','readonly').objectStore('records').get('user:'+owner);
    req.onsuccess=()=>resolve(req.result===undefined?null:JSON.parse(String(req.result)));
    req.onerror=()=>reject(req.error);
   }))); db.close();
   return {
    oldDraftPreserved:results[0]?.captureDraft==='A5 durable old owner draft',
    newDraftEmpty:results[1]?.captureDraft===''||!results[1]?.captureDraft,
    draftVisible:(document.querySelector('[data-capture-draft]') as HTMLTextAreaElement)?.value==='A5 durable old owner draft',
    currentWorkspaceLabel:document.querySelector('[data-storage-label]')?.textContent,
   };
  },[OWNER,OTHER]);
  const otherWrites=api.writes.filter(x=>x.owner===OTHER&&x.state?.captureDraft==='A5 durable old owner draft').length;
  console.info('A5_DURABLE_OWNER_HANDOFF',JSON.stringify({...evidence,oldDraftUploadedToOther:otherWrites>0}));
  expect(evidence.oldDraftPreserved).toBe(true);
  expect(evidence.newDraftEmpty).toBe(true);
  expect(evidence.draftVisible).toBe(false);
  expect(otherWrites).toBe(0);
 }finally{await a.context.close();}
});
