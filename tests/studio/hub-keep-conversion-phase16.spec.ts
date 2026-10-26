import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test.skip(process.env.KEEP_NATIVE_BUILT!=='1','Requires exact source-qualified original KEEP build.');
async function prepare(page:import('@playwright/test').Page,bad:'none'|'binary'|'extra'='none'){
 await page.goto('/home/knowledge/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await page.evaluate(async bad=>{
  const request=indexedDB.open('KeepNotesDB',1);
  await new Promise<void>((resolve,reject)=>{
   request.onupgradeneeded=()=>{
    for(const name of ['notes','folders','saved_searches','settings'])
     request.result.createObjectStore(name,{keyPath:name==='settings'?'key':'id'});
    if(bad==='extra')request.result.createObjectStore('unknown-owner-store',{keyPath:'id'});
   };
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{request.result.close();resolve();};
  });
  if(bad!=='extra'){
   const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const r=indexedDB.open('KeepNotesDB');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['notes','folders','saved_searches','settings'],'readwrite');
    tx.objectStore('notes').put({id:'original-note',title:'Private original',
      content:'Top secret source body',images:bad==='binary'?[new Blob(['bytes'])]:[]});
    tx.objectStore('folders').put({id:'folder-1',name:'Private folder'});
    tx.objectStore('saved_searches').put({id:'search-1',query:'private'});
    tx.objectStore('settings').put({key:'app_settings',value:{theme:'dark'}});
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
   });
  }
 },bad);
}
async function run(page:import('@playwright/test').Page,revoked=false){
 return await page.evaluate(async revoked=>{
  const uri=new URL('/keep-b3-native/keep-b3-original.js',location.origin).href;
  const mod=await import(/* @vite-ignore */ uri) as {
   rehearseOriginalKeepConversion(a:{mayMount():boolean;revoked:AbortSignal}):Promise<unknown>
  };
  const controller=new AbortController();if(revoked)controller.abort();
  try{return {result:await mod.rehearseOriginalKeepConversion({mayMount:()=>true,revoked:controller.signal})};}
  catch(e){return {error:e instanceof Error?e.message:String(e)};}
 },revoked) as any;
}
for(const width of [390,1440]){
 test('original owner rehearses all 4 stores using AES-GCM with zero writes '+width,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:900});
  await prepare(page);
  const before=await page.evaluate(async()=>new Promise<unknown[]>((resolve,reject)=>{
   const r=indexedDB.open('KeepNotesDB');r.onerror=()=>reject(r.error);r.onsuccess=()=>{
    const db=r.result,tx=db.transaction('notes');const g=tx.objectStore('notes').getAll();
    g.onsuccess=()=>{db.close();resolve(g.result)};g.onerror=()=>reject(g.error);
   };
  }));
  const receipt=await run(page);
  expect(receipt.error).toBeUndefined();
  expect(receipt.result).toMatchObject({format:'keep-b3-original-conversion-rehearsal',ownerVersion:1,
   counts:{notes:1,folders:1,saved_searches:1,settings:1},verifiedAesRoundTrips:4,
   writes:0,blocked:true,backupVerifiedExternally:false,transactionalHeaderCommitImplemented:false,rollbackVerified:false});
  expect(receipt.result.originalSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(receipt.result.stagedEncryptedSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(receipt.result.originalSha256).not.toBe(receipt.result.stagedEncryptedSha256);
  const after=await page.evaluate(async()=>new Promise<unknown[]>((resolve,reject)=>{
   const r=indexedDB.open('KeepNotesDB');r.onerror=()=>reject(r.error);r.onsuccess=()=>{
    const db=r.result,tx=db.transaction('notes');const g=tx.objectStore('notes').getAll();
    g.onsuccess=()=>{db.close();resolve(g.result)};g.onerror=()=>reject(g.error);
   };
  }));
  expect(after).toEqual(before);
  expect(await page.evaluate(()=>localStorage.getItem('keepnotes_vault_enc_header'))).toBeNull();
  expect((await run(page,true)).error).toContain('revoked');
 });
}
test('original conversion rehearsal rejects unowned binary attachments and never writes',async({page})=>{
 await prepare(page,'binary');
 const result=await run(page);
 expect(result.error).toContain('requires independent binary custody');
 expect(await page.evaluate(()=>localStorage.getItem('keepnotes_vault_enc_header'))).toBeNull();
});
test('original conversion rehearsal rejects unexpected owner schema and existing header',async({page})=>{
 await prepare(page,'extra');
 expect((await run(page)).error).toContain('Unrecognized original KEEP database schema');
 await page.evaluate(()=>localStorage.setItem('keepnotes_vault_enc_header','tampered'));
 expect((await run(page)).error).toContain('Existing original KEEP vault header');
});
