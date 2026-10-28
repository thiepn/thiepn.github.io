import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test.skip(process.env.KEEP_NATIVE_BUILT!=='1','Requires exact original KEEP Bun/Vite/crypto build.');
type Fixture={passphrase:string;header:Record<string,unknown>;record:{id:string;isEncrypted:true;ciphertext:string}};
const getFixture=():Fixture=>JSON.parse(readFileSync('.cache/keep-phase15-synthetic.json','utf8')) as Fixture;
async function sourceDatabase(page:import('@playwright/test').Page,note?:unknown,header?:unknown){
 await page.evaluate(async ({note,header})=>{
   if(header)localStorage.setItem('keepnotes_vault_enc_header',JSON.stringify(header));
   await new Promise<void>((resolve,reject)=>{
     const r=indexedDB.open('KeepNotesDB',1);
     r.onupgradeneeded=()=>{
       for(const name of ['notes','folders','saved_searches','settings'])
         r.result.createObjectStore(name,{keyPath:name==='settings'?'key':'id'});
     };
     r.onerror=()=>reject(r.error);
     r.onsuccess=()=>{
       const db=r.result;
       if(!note){db.close();resolve();return;}
       const tx=db.transaction('notes','readwrite');
       tx.objectStore('notes').put(note);
       tx.oncomplete=()=>{db.close();resolve();};
       tx.onerror=()=>reject(tx.error);
     };
   });
 },{note,header});
}
for(const width of [390,1440]){
 test('original KEEP refuses header-only encryption of existing plaintext owner records '+width,async({page})=>{
  test.setTimeout(75_000);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const source={id:'prior-plaintext-note',title:'Original plaintext stays intact',content:'Do not silently erase or overwrite',tags:[]};
  await sourceDatabase(page,source);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-action=knowledge-native-start]').click();
  await expect(page.locator('[data-keep-original-react-active=true]')).toBeVisible();
  await page.locator('#btn-workspace-tools-menu').click();
  await page.getByRole('button',{name:'Encryption & Keys'}).click();
  const modal=page.getByRole('dialog').filter({hasText:'Full-Vault Client-Side Encryption'});
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder('Enter strong master passphrase...').fill('test-only-encryption-passphrase');
  await modal.getByPlaceholder('Re-enter master passphrase...').fill('test-only-encryption-passphrase');
  await modal.getByRole('button',{name:'Enable Full-Vault Encryption'}).click();
  await expect(modal).toContainText('Hub cannot enable full-vault encryption until the original owner implements atomic existing-record conversion',{timeout:10000});
  expect(await page.evaluate(()=>localStorage.getItem('keepnotes_vault_enc_header'))).toBeNull();
  const unchanged=await page.evaluate(async()=>new Promise<unknown>((resolve,reject)=>{
   const request=indexedDB.open('KeepNotesDB');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const db=request.result,r=db.transaction('notes').objectStore('notes').get('prior-plaintext-note');
    r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>reject(r.error)};
  }));
  expect(unchanged).toEqual(source);
  await modal.locator('button').first().click();
  await expect(modal).toHaveCount(0);
  await page.locator('[data-keep-native-exit]').click();
  await expect(page.locator('[data-keep-original-react-active=true]')).toHaveCount(0);
 });
 test('original encrypted synthetic note unlock, reload, offline lock and identity revocation '+width,async({page,context})=>{
  test.setTimeout(100_000);
  const fixture=getFixture();
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await sourceDatabase(page,fixture.record,fixture.header);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-action=knowledge-native-start]').click();
  await expect(page.getByRole('heading',{name:'Vault is Locked'})).toBeVisible();
  await page.getByPlaceholder('Enter master passphrase...').fill('incorrect-test-only-passphrase');
  await page.getByRole('button',{name:'Unlock Vault'}).click();
  await expect(page.getByText('Incorrect master passphrase or corrupted key')).toBeVisible({timeout:20_000});
  await page.getByPlaceholder('Enter master passphrase...').fill(fixture.passphrase);
  await page.getByRole('button',{name:'Unlock Vault'}).click();
  await expect(page.getByRole('heading',{name:'Vault is Locked'})).toHaveCount(0,{timeout:20_000});
  await expect(page.locator('[data-keep-original-react-active=true]')).toBeVisible();
  await context.setOffline(true);
  await page.locator('[data-keep-native-exit]').click();
  await expect(page.locator('[data-keep-native-frame]')).toBeHidden();
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-action=knowledge-native-start]').click();
  await expect(page.getByRole('heading',{name:'Vault is Locked'})).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'checking'}})));
  await expect(page.locator('[data-keep-original-react-active=true]')).toHaveCount(0);
  const after=await page.evaluate(async()=>new Promise<unknown>((resolve,reject)=>{
   const request=indexedDB.open('KeepNotesDB');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const db=request.result,r=db.transaction('notes').objectStore('notes').get('authentic-existing-keep-note');
    r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>reject(r.error)};
  }));
  expect(after).toEqual(fixture.record);
  expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('keepnotes_vault_enc_header')??'null'))).toEqual(fixture.header);
 });
}

test('encrypted original owner refuses plaintext legacy mirror without touching its bytes',async({page})=>{
 const fixture=getFixture();
 await page.goto('/home/knowledge/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await sourceDatabase(page,fixture.record,fixture.header);
 await page.evaluate(()=>localStorage.setItem('keepnotes_settings',JSON.stringify({theme:'dark',owner:'original-owner'})));
 page.once('dialog',d=>d.accept());
 await page.locator('[data-action=knowledge-native-start]').click();
 await expect(page.locator('[data-workspace-toast]')).toContainText('unencrypted legacy data mirror');
 await expect(page.locator('[data-keep-original-react-active=true]')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('keepnotes_settings'))).toContain('original-owner');
});
test('encrypted original owner refuses unconverted original settings store',async({page})=>{
 const fixture=getFixture();
 await page.goto('/home/knowledge/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await sourceDatabase(page,fixture.record,fixture.header);
 await page.evaluate(async()=>await new Promise<void>((resolve,reject)=>{
  const r=indexedDB.open('KeepNotesDB');r.onerror=()=>reject(r.error);
  r.onsuccess=()=>{const db=r.result,tx=db.transaction('settings','readwrite');
   tx.objectStore('settings').put({key:'app_settings',value:{theme:'dark',privateValue:'unchanged'}});
   tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);
  };
 }));
 page.once('dialog',d=>d.accept());
 await page.locator('[data-action=knowledge-native-start]').click();
 await expect(page.locator('[data-workspace-toast]')).toContainText('vault header coexists with plaintext owner records');
 await expect(page.locator('[data-keep-original-react-active=true]')).toHaveCount(0);
 const old=await page.evaluate(async()=>new Promise<unknown>((resolve,reject)=>{
  const r=indexedDB.open('KeepNotesDB');r.onerror=()=>reject(r.error);
  r.onsuccess=()=>{const db=r.result,g=db.transaction('settings').objectStore('settings').get('app_settings');
   g.onsuccess=()=>{db.close();resolve(g.result)};g.onerror=()=>reject(g.error);
  };
 }));
 expect(old).toEqual({key:'app_settings',value:{theme:'dark',privateValue:'unchanged'}});
});
