import {expect, type Page} from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path';
export const HUB='https://thiepn.dev';
const SUPABASE='https://hycegznamzjhwinegaai.supabase.co';
const OWNER=path.resolve(process.env.H21_LIBRARY_DIST??'../library/dist/library');
const KEY='thiepn:library:hub-consent:v1', INDEX='thiepn:library:hub-personal-index:v1';
const FIXTURE_UPDATED='2026-10-06T20:00:00.000Z';
const catalogue=JSON.parse(fs.readFileSync(path.join(OWNER,'hub/bridge/index.html'),'utf8').match(/data-books="([^\"]+)"/)![1]!.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'));
export const book=catalogue.find((b:any)=>b.format==='epub');
const grant={schemaVersion:1,deviceId:'11111111-1111-4111-8111-111111111111',revision:'22222222-2222-4222-8222-222222222222',permissions:['summary','continue','search'],includePersonal:false};
const mime=(p:string)=>p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':p.endsWith('.html')?'text/html':'application/octet-stream';
export async function fixture(page:Page, options:{account?:boolean}={}){
 const calls:{url:string;method:string}[]=[];let paused=false,fail=false,hold=false,accountMock=options.account===true,accountDrift=false,release=()=>{};
 await page.addInitScript(({account})=>{
   (window as any).__opens=[];(window as any).__results=[];(window as any).__libraryMessages=[];
   if(account){
     const accountId='33333333-3333-4333-8333-333333333333';
     const session={
       access_token:'fixture-hub-access-token',
       refresh_token:'fixture-hub-refresh-token',
       token_type:'bearer',
       expires_in:3600,
       expires_at:Math.floor(Date.now()/1000)+3600,
       user:{id:accountId,aud:'authenticated',role:'authenticated',email:'reader@example.test'},
     };
     localStorage.setItem('thiepn:hub-auth:v1',JSON.stringify(session));
   }
   if(location.pathname.startsWith('/home')){
     const open=indexedDB.open.bind(indexedDB);
     indexedDB.open=(...args:Parameters<IDBFactory['open']>)=>{(window as any).__opens.push(args[0]);return open(...args);};
     window.addEventListener('message',e=>{
       if(e.data?.protocol==='thiepn-library-hub-v1')(window as any).__libraryMessages.push(e.data);
       if(e.data?.kind==='result')(window as any).__results.push(e.data.envelope);
     });
   }
 },{account:options.account===true});
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());calls.push({url:u.href,method:req.method()});
  if(u.origin===SUPABASE && accountMock){
    if(u.pathname==='/auth/v1/user') {
      return route.fulfill({json:{id:'33333333-3333-4333-8333-333333333333',aud:'authenticated',role:'authenticated',email:'reader@example.test'}});
    }
    if(u.pathname==='/rest/v1/account_app_connections') return route.fulfill({json:[{status:'connected'}]});
    if(u.pathname==='/rest/v1/library_sync_state') {
      const updatedAt=FIXTURE_UPDATED;
      return route.fulfill({json:[{state:{
        format:'thiepn-library-backup',
        schemaVersion:1,
        exportedAt:updatedAt,
        state:{
          main:{
            schemaVersion:1,
            epubProgress:{
              schemaVersion:1,
              records:[{
                schemaVersion:2,
                workId:book.workId,
                edition:book.edition,
                releaseVersion:book.releaseVersion,
                cfi:'epubcfi(/6/2[SECRET-CFI])',
                percentage:accountDrift?.6:.2,
                furthestPercentage:accountDrift?.85:.8,
                updatedAt,
              }],
            },
          },
        },
      }}]});
    }
    if(u.pathname.startsWith('/rest/v1/rpc/')) return route.fulfill({status:405,json:{message:'Hub reading must not invoke Library write RPCs'}});
    return route.fulfill({status:404,json:{message:'Fixture endpoint unavailable'}});
  }
  if(u.origin!==HUB)return route.abort();
  if(u.pathname==='/reading-pilot.json'){
   if(hold){hold=false;await new Promise<void>(r=>{release=r;});}
   if(fail)return route.fulfill({status:503,body:'Unavailable'});
   const config=JSON.parse(fs.readFileSync('src/data/reading-pilot.json','utf8'));return route.fulfill({json:{...config,enabled:!paused}});
  }
  const owner=u.pathname.startsWith('/library/');let f=path.join(owner?OWNER:path.resolve(process.env.H21_HUB_DIST??'dist'),owner?u.pathname.slice('/library/'.length):u.pathname);
  if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
  if(fs.existsSync(f))return route.fulfill({path:f,contentType:mime(f)});return route.fulfill({status:404});
 });
 await page.goto(HUB+'/home/');return{
  calls,
  pause:()=>{paused=true;},
  fail:()=>{fail=true;},
  hold:()=>{hold=true;},
  release:()=>{hold=false;release();},
  enableAccountMock:()=>{accountMock=true;},
  driftAccount:()=>{accountDrift=true;},
 };
}
export async function join(page:Page){await page.getByRole('button',{name:'Connect Library',exact:true}).click();await expect(page.locator('[data-private-library]')).toBeVisible();}
export async function connect(page:Page){await join(page);await page.getByRole('button',{name:'Connect this browser',exact:true}).click();await expect(page.locator('[data-library-items]')).toContainText(book.title);}
export async function seed(page: Page, permissions = grant.permissions, personal = false, version = 9) {
  await page.evaluate(async ({ book, grant, KEY, INDEX, permissions, personal, version, FIXTURE_UPDATED }) => {
    localStorage.setItem(KEY, JSON.stringify({ ...grant, permissions, includePersonal: personal }));
    const put = (name: string, version: number, keyPath: string, rows: unknown[]) => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(name, version); open.onupgradeneeded = () => open.result.createObjectStore('progress', { keyPath });
      open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, tx = db.transaction('progress','readwrite'); rows.forEach(row => tx.objectStore('progress').put(row)); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    });
    const updatedAt = FIXTURE_UPDATED;
    await put('thiepn-library', version, 'workId', [{ schemaVersion: 2, workId: book.workId, edition: book.edition, releaseVersion: book.releaseVersion, percentage: .2, furthestPercentage: .8, updatedAt, cfi: 'epubcfi(/6/2[SECRET-CFI])' }, ...(personal ? [{ schemaVersion: 2, workId: 'personal:epub-fictional', edition: 1, releaseVersion: `local-${'a'.repeat(64)}`, percentage: .3, furthestPercentage: .4, updatedAt, cfi: 'PERSONAL-CFI' }] : [])]);
    if (personal) {
      localStorage.setItem(INDEX, JSON.stringify([{ workId: 'personal:epub-fictional', title: 'Private fictional import', format: 'epub', edition: 1, releaseVersion: `local-${'a'.repeat(64)}`, slug: 'personal', personalId: 'epub-fictional' }]));
      await new Promise<void>((resolve, reject) => { const open = indexedDB.open('thiepn-library-personal-books',3); open.onupgradeneeded = () => open.result.createObjectStore('books',{keyPath:'id'}); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, tx = db.transaction('books','readwrite'); tx.objectStore('books').put({ id: 'epub-fictional', file: new TextEncoder().encode('SECRET-BOOK-BYTES').buffer }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); }; }; });
    }
  }, { book, grant, KEY, INDEX, permissions, personal, version, FIXTURE_UPDATED });
}


export async function seedAccountAwareReading(page: Page) {
  const accountId='33333333-3333-4333-8333-333333333333';
  await page.evaluate(({KEY,accountId})=>{
    const consent=JSON.parse(localStorage.getItem(KEY)??'null');
    if(!consent)throw new Error('Seed device reading before Account reading.');
    localStorage.setItem(KEY,JSON.stringify({
      schemaVersion:2,
      deviceId:consent.deviceId,
      revision:crypto.randomUUID(),
      permissions:consent.permissions,
      includePersonal:consent.includePersonal,
      includeAccount:true,
    }));
    localStorage.setItem('thiepn.library.account-sync.v1',JSON.stringify({
      schemaVersion:1,
      userId:accountId,
      enabled:true,
      deviceId:'44444444-4444-4444-8444-444444444444',
    }));
    const expiresAt=Date.now()+3600_000;
    localStorage.setItem('thiepn:library-sso:v1:tokens',JSON.stringify({
      accessToken:'fixture-'+'a'.repeat(40),
      refreshToken:'fixture-'+'r'.repeat(40),
      expiresAt,
      scope:'email offline_access openid profile',
    }));
  },{KEY,accountId});
}
