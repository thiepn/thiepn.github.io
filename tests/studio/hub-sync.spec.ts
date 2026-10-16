import { test,expect,type Browser,type Page } from '@playwright/test';
import fs from 'node:fs';
const configuration=JSON.parse(fs.readFileSync('src/data/hub-account.json','utf8'));
const OWNER='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';
const base='http://127.0.0.1:4321';
const jwt=(owner:string)=>['fixture',Buffer.from(JSON.stringify({sub:owner,client_id:configuration.clientId,iss:configuration.issuer+'/auth/v1',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
function backend(options={sharing:false,probeEligible:false}) {
 const failures=new Map<string,number>();
 const heads=new Map<string,{revision:number;state:unknown}>(),receipts=new Map<string,{hash:string;revision:number}>();
 let challenge='',exchanges=0,probeDelay=0;let unavailable=false;const writes:{owner:string;state:any}[]=[];
 return {heads,failures,writes,delayProbe:(ms:number)=>probeDelay=ms,accountSignedIn:(value:boolean)=>options.probeEligible=value,exchanges:()=>exchanges,offline:(value:boolean)=>unavailable=value,async device(browser:Browser,owner:string|null=OWNER,viewport={width:1440,height:1024},clock=false) {
  const context=await browser.newContext({viewport,timezoneId:'Europe/Berlin',serviceWorkers:'block'});
  if(owner)await context.addInitScript(({owner,token})=>localStorage.setItem('thiepn:hub-sso:v1:tokens',JSON.stringify({accessToken:token,refreshToken:'fixture-refresh',expiresAt:Date.now()+3600000,scope:'openid email profile offline_access'})),{owner,token:jwt(owner)});
  await context.route('https://thiepn.dev/**',async route=>{const url=new URL(route.request().url());const response=await context.request.get(base+url.pathname+url.search);expect(new URL(response.url()).origin).toBe(base);await route.fulfill({response});});
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
   if(url.pathname==='/auth/v1/oauth/token'){const data=request.postDataJSON();expect(data.client_id).toBe(configuration.clientId);expect(data.code).toBe('fictional-one-use-code');const {createHash}=await import('node:crypto');expect(createHash('sha256').update(data.code_verifier).digest('base64url')).toBe(challenge);exchanges++;await route.fulfill({json:{access_token:jwt(OWNER),refresh_token:'fixture-refreshed',expires_in:3600,scope:'openid email profile offline_access',token_type:'bearer'}});return;}
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
  const page=await context.newPage();if(clock)await page.clock.install();await page.goto('https://thiepn.dev/');await expect(page.locator('[data-storage-label]')).toHaveText(owner||options.probeEligible?'THIEPN Account':'This device');await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');if(owner===null&&!options.probeEligible){await expect.poll(()=>probeRequests).toBeGreaterThan(0);await expect(page.locator('iframe[src*="/sso/probe"]')).toHaveCount(0);}return {page,context};
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
