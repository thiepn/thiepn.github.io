import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const HUB='https://thiepn.dev',ACCOUNT='https://account.thiepn.dev',ISSUER='https://hycegznamzjhwinegaai.supabase.co';
const A='11111111-1111-4111-8111-111111111111',CLIENT='33333333-3333-4333-8333-333333333333',REV='44444444-4444-4444-8444-444444444444';
const token=(managed=false)=>'eyJhbGciOiJFUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:A,iss:ISSUER+'/auth/v1',aud:'authenticated',role:'authenticated',session_id:REV,exp:Math.floor(Date.now()/1000)+3600,...(managed?{client_id:CLIENT}:{})})).toString('base64url')+'.fictional_signature';
const user={id:A,email:'fictional@example.test',aud:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const mime=(p:string)=>p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.woff2')?'font/woff2':'application/octet-stream';

const OWNER=path.resolve(process.env.H19_LIBRARY_DIST??'../library/dist/library');
const TMS='https://tms60.thiepn.dev';
const catalogue=JSON.parse(fs.readFileSync(path.join(OWNER,'hub/bridge/index.html'),'utf8').match(/data-books="([^"]+)"/)![1]!.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'));
const book=catalogue.find((b:any)=>b.format==='epub');
const grant={schemaVersion:1,deviceId:A,revision:REV,permissions:['summary','continue','search'],includePersonal:false};
const KEY='thiepn:library:hub-consent:v1',INDEX='thiepn:library:hub-personal-index:v1';

async function fixture(page:Page,permissions=['notes.hub.capture.create']){
  let state='',challenge='';
  const receipts=new Map<string,unknown>();
  const managedToken=token(true);
  const calls:{url:string;body:string|null}[]=[];
  await page.addInitScript(({HUB,ACCOUNT,user,bearer})=>{
    const session={access_token:bearer,refresh_token:'identity_refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
    if(location.origin===HUB&&!localStorage.getItem('thiepn:hub-auth:v1'))localStorage.setItem('thiepn:hub-auth:v1',JSON.stringify(session));
    if(location.origin===ACCOUNT&&!localStorage.getItem('sb-hycegznamzjhwinegaai-auth-token'))localStorage.setItem('sb-hycegznamzjhwinegaai-auth-token',JSON.stringify(session));
  },{HUB,ACCOUNT,user,bearer:token()});
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());calls.push({url:req.url(),body:req.postData()});
    if(url.origin===ISSUER){
      if(url.pathname.endsWith('/oauth/authorize')){state=url.searchParams.get('state')!;challenge=url.searchParams.get('code_challenge')!;return route.fulfill({contentType:'text/html',body:`<script>location.replace(${JSON.stringify(ACCOUNT+'/oauth/consent?authorization_id=h14-fictional')})</script>`});}
      if(url.pathname.includes('/oauth/authorizations/')){
        if(req.method()==='GET')return route.fulfill({json:{authorization_id:'h14-fictional',redirect_uri:HUB+'/home/',scope:'email',client:{id:CLIENT,uri:HUB+'/',name:'THIEPN Hub'},user:{id:A,email:user.email}}});
        return route.fulfill({json:{redirect_url:HUB+'/home/?'+new URLSearchParams(req.postDataJSON()?.action==='deny'?{error:'access_denied',state}:{code:'h14-fictional-code',state})}});
      }
      if(url.pathname.endsWith('/oauth/token')){const body=new URLSearchParams(req.postData()!);expect(crypto.createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(challenge);return route.fulfill({json:{access_token:managedToken,refresh_token:'managed_refresh_sentinel',token_type:'bearer',expires_in:3600,scope:'email'}});}
      if(url.pathname.endsWith('/user'))return route.fulfill({json:user});
      if(url.pathname.endsWith('/get_thiepn_hub_tms60_consent'))return route.fulfill({json:{permissions:['tms60.hub.summary.read'],revision:REV}});
      if(url.pathname.endsWith('/read_thiepn_hub_tms60')){const body=req.postDataJSON(),now=Date.now();return route.fulfill({json:{schemaVersion:1,providerId:'tms60',operation:body.p_operation,requestId:body.p_request_id,context:{scope:'account',accountId:A,workspaceId:null,grantRevision:REV,translationId:body.p_translation},privacy:'private',coverage:'translation-cloud-snapshot',status:'ready',observedAt:new Date(now).toISOString(),expiresAt:new Date(now+120000).toISOString(),sourceUpdatedAt:null,data:{items:[{resourceId:body.p_translation+':1:reference',title:'2 Corinthians 5:17',dimension:'reference',updatedAt:new Date(now-1000).toISOString()}],dueTaskCount:1,dueVerseCount:1,newVerseCount:0}}});}
      if(url.pathname.endsWith('/get_thiepn_hub_notes_consent'))return route.fulfill({json:{permissions,revision:REV}});
      if(url.pathname.endsWith('/thiepn_hub_notes_capture')){
        expect(req.headers().authorization).toBe('Bearer '+managedToken);
        const body=req.postDataJSON();expect(body.p_destination).toBe('notes:unfiled');
        if(!receipts.has(body.p_request_id))receipts.set(body.p_request_id,{schemaVersion:1,accountId:A,grantRevision:body.p_revision,requestId:body.p_request_id,destination:body.p_destination,noteId:REV,createdAt:Date.now(),status:'confirmed'});
        return route.fulfill({json:receipts.get(body.p_request_id)});
      }
      if(url.pathname.startsWith('/rest/v1/'))return route.fulfill({json:[]});
      return route.fulfill({status:404,json:{message:'Fictional unavailable'}});
    }
    if(url.origin===TMS||url.origin===HUB&&url.pathname.startsWith('/library/')){let file=path.join(url.origin===TMS?path.resolve(process.env.H19_TMS_DIR??'../tms60'):OWNER,url.origin===TMS?url.pathname:url.pathname.slice('/library/'.length));if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(fs.existsSync(file))return route.fulfill({path:file,contentType:mime(file)});}
    if(url.origin===HUB||url.origin===ACCOUNT){
      const root=path.resolve(url.origin===HUB?'.cache/h19-hub':'.cache/h19-account');let file=path.join(root,url.pathname);
      if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      if(url.origin===ACCOUNT&&!fs.existsSync(file))file=path.join(root,'index.html');
      if(fs.existsSync(file))return route.fulfill({path:file,contentType:mime(file)});
    }
    return route.abort();
  });
  return{calls,receipts};
}
async function seed(page: Page, permissions = grant.permissions, personal = false, version = 9) {
  await page.evaluate(async ({ book, grant, KEY, INDEX, permissions, personal, version }) => {
    localStorage.setItem(KEY, JSON.stringify({ ...grant, permissions, includePersonal: personal }));
    const put = (name: string, version: number, keyPath: string, rows: unknown[]) => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(name, version); open.onupgradeneeded = () => open.result.createObjectStore('progress', { keyPath });
      open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, tx = db.transaction('progress','readwrite'); rows.forEach(row => tx.objectStore('progress').put(row)); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    });
    const updatedAt = new Date(Date.now()-1000).toISOString();
    await put('thiepn-library', version, 'workId', [{ schemaVersion: 2, workId: book.workId, edition: book.edition, releaseVersion: book.releaseVersion, percentage: .2, furthestPercentage: .8, updatedAt, cfi: 'SECRET-CFI', chapterLabel: 'SECRET-CHAPTER' }, ...(personal ? [{ schemaVersion: 2, workId: 'personal:epub-fictional', edition: 1, releaseVersion: `local-${'a'.repeat(64)}`, percentage: .3, furthestPercentage: .4, updatedAt, cfi: 'PERSONAL-CFI' }] : [])]);
    if (personal) {
      localStorage.setItem(INDEX, JSON.stringify([{ workId: 'personal:epub-fictional', title: 'Private fictional import', format: 'epub', edition: 1, releaseVersion: `local-${'a'.repeat(64)}`, slug: 'personal', personalId: 'epub-fictional' }]));
      await new Promise<void>((resolve, reject) => { const open = indexedDB.open('thiepn-library-personal-books',3); open.onupgradeneeded = () => open.result.createObjectStore('books',{keyPath:'id'}); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, tx = db.transaction('books','readwrite'); tx.objectStore('books').put({ id: 'epub-fictional', file: new TextEncoder().encode('SECRET-BOOK-BYTES').buffer }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); }; }; });
    }
  }, { book, grant, KEY, INDEX, permissions, personal, version });
}
async function start(page:Page){await page.goto(HUB+'/home/');await expect(page.locator('[data-auth-status]')).toContainText(user.email);}
async function captureConnect(page:Page){await page.getByRole('button',{name:'Connect capture',exact:true}).click();await page.getByRole('button',{name:'Connect Hub',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('Capture connected');}
async function reading(page:Page){await seed(page);await page.getByRole('button',{name:'Connect this browser',exact:true}).click();await expect(page.locator('[data-workflow-library]')).toContainText(book.title);await page.locator('[data-workflow-library] button').first().click();}
test('capture workflow previews account/destination before opening and saving draft',async({page})=>{const f=await fixture(page);await start(page);await page.getByRole('button',{name:'Preview capture to Notes',exact:true}).click();await expect(page.locator('[data-workflow-destination]')).toContainText('selected Hub account');expect(f.receipts.size).toBe(0);await page.getByRole('button',{name:'Confirm destination',exact:true}).click();await expect(page.locator('[data-capture-form]')).toBeVisible();await page.locator('[data-capture-form] [name=content]').fill('Confirmed thought');await captureConnect(page);await page.getByRole('button',{name:'Save to Notes',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('Notes confirmed');expect(f.receipts.size).toBe(1);});
test('actual Library metadata becomes a recoverable study-note draft and one confirmed note',async({page})=>{const f=await fixture(page);await start(page);await reading(page);await expect(page.locator('[data-workflow-note]')).toContainText('Current progress: 20% · furthest: 80%');expect(f.receipts.size).toBe(0);await page.getByRole('button',{name:'Confirm destination',exact:true}).click();await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue(/My study notes:/);await expect(page.locator('[data-workflow-handoff]')).toHaveAttribute('href',/edition=/);await captureConnect(page);await page.getByRole('button',{name:'Save to Notes',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('Notes confirmed');const call=f.calls.find(c=>c.url.endsWith('/thiepn_hub_notes_capture'));expect(JSON.parse(call!.body!).p_content).toContain(book.title);expect(JSON.parse(call!.body!).p_content).not.toContain('SECRET-CFI');});
test('existing capture text is never overwritten by a reading workflow',async({page})=>{await fixture(page);await start(page);await page.getByRole('button',{name:'Use this account’s Notes',exact:true}).click();await page.locator('[data-capture-form] [name=content]').fill('Keep existing thought');await reading(page);await page.getByRole('button',{name:'Confirm destination',exact:true}).click();await expect(page.locator('[data-workflow-status]')).toContainText('Existing drafts remain intact');await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue('Keep existing thought');});
test('prepared reading work survives reload without automatically connecting or saving',async({page})=>{const f=await fixture(page);await start(page);await reading(page);await page.getByRole('button',{name:'Confirm destination',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Use this account’s Notes',exact:true}).click();await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue(new RegExp(book.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));await expect(page.locator('[data-workflow-library] button')).toHaveCount(0);expect(f.receipts.size).toBe(0);});
test('cancel and privacy masking clear previews without destination writes',async({page})=>{const f=await fixture(page);await start(page);await reading(page);await page.getByRole('button',{name:'Cancel preview',exact:true}).click();await expect(page.locator('[data-workflow-preview]')).toBeHidden();await page.locator('[data-workflow-library] button').first().click();await page.getByRole('button',{name:'Hide Home',exact:true}).click();await expect(page.locator('[data-workflow-note]')).toBeEmpty();expect(f.receipts.size).toBe(0);});
test('due-review workflow opens the actual native reference screen without practice',async({page})=>{const f=await fixture(page);await start(page);await page.getByRole('button',{name:'Connect TMS60',exact:true}).click();await page.getByRole('button',{name:'Connect Hub',exact:true}).click();await expect(page.locator('[data-workflow-tms60]')).toContainText('2 Corinthians 5:17');await page.locator('[data-workflow-tms60] button').first().click();await expect(page.locator('[data-workflow-handoff]')).toBeHidden();await page.getByRole('button',{name:'Confirm destination',exact:true}).click();const href=await page.locator('[data-workflow-handoff]').getAttribute('href');expect(href).toBe(TMS+'/#hub=esv%3A1%3Areference');await page.goto(href!);const app=page.frameLocator('#app-frame');await expect(app.getByRole('dialog')).toContainText('2 Corinthians 5:17');await expect(app.getByRole('button',{name:'Start reference recall',exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tms60-esv-memory-lab-v1')!).progress['1'].stage)).toBe(0);expect(f.receipts.size).toBe(0);});
test('unavailable create permission keeps prepared study work for recovery',async({page})=>{const f=await fixture(page,['notes.hub.inbox.read']);await start(page);await reading(page);await page.getByRole('button',{name:'Confirm destination',exact:true}).click();await page.getByRole('button',{name:'Connect capture',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('Enable creation');await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue(/Reading notes for/);expect(f.receipts.size).toBe(0);await page.reload();await page.getByRole('button',{name:'Use this account’s Notes',exact:true}).click();await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue(/Reading notes for/);});

// Viewport/touch emulation supplements, but does not certify, physical devices.
test('long study-note preview and capture remain usable in a compact viewport', async ({page}) => {
  const f = await fixture(page); await start(page); await reading(page);
  await expect(page.locator('[data-workflow-preview]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', {name:'Confirm destination',exact:true}).click();
  const content = page.locator('[data-capture-form] [name=content]');
  await content.fill('Recoverable study notes '.repeat(80));
  await content.blur(); await page.reload();
  await page.getByRole('button',{name:'Use this account’s Notes',exact:true}).click();
  await expect(content).toHaveValue('Recoverable study notes '.repeat(80));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(f.receipts.size).toBe(0);
});
