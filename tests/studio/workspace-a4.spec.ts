import {test,expect,type Browser,type BrowserContext,type Page} from '@playwright/test';

/** Stage A4: synthetic guest only. Never collect workspace bodies or credentials. */
async function isolated(browser:Browser,sessionBlocked=false){
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});
  const proto=Object.getPrototypeOf(indexedDB) as IDBFactory;
  const original=proto.open;
  Object.defineProperty(proto,'open',{configurable:true,writable:true,
   value:function(this:IDBFactory,name:string,version?:number){
    if(name==='thiepn-hub-account')throw new DOMException('A4 isolated Account IDB refusal','SecurityError');
    return version===undefined?Reflect.apply(original,this,[name]):Reflect.apply(original,this,[name,version]);
   }
  });
  type Observation={op:string;revision?:number|null;tasks?:number|null;mode?:string};
  const rows:Observation[]=[];
  const mark=(row:Observation)=>{if(rows.length<150)rows.push(row);};
  (window as any).__a4Evidence=rows;
  const get=IDBObjectStore.prototype.get,put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.get=function(...args){
   const request=Reflect.apply(get,this,args) as IDBRequest;
   if(this.name==='records'&&args[0]==='guest')request.addEventListener('success',()=>{
    try{const parsed=request.result===undefined?null:JSON.parse(String(request.result));
     mark({op:'read',revision:parsed?.revision??null,tasks:Array.isArray(parsed?.tasks)?parsed.tasks.length:null});
    }catch{mark({op:'read-invalid'});}
   });
   return request;
  };
  IDBObjectStore.prototype.put=function(...args){
   if(this.name==='records'&&args[1]==='guest'){
    try{const parsed=JSON.parse(String(args[0]));
     mark({op:'put',revision:parsed?.revision??null,tasks:Array.isArray(parsed?.tasks)?parsed.tasks.length:null});
    }catch{mark({op:'put-invalid'});}
   }
   return Reflect.apply(put,this,args);
  };
  const transaction=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(...args){
   const tx=Reflect.apply(transaction,this,args) as IDBTransaction;
   const stores=Array.isArray(args[0])?args[0]:[args[0]];
   if(this.name==='thiepn-adaptive-workspace'&&stores.includes('records')){
    tx.addEventListener('abort',()=>mark({op:'abort',mode:tx.mode}));
    tx.addEventListener('complete',()=>mark({op:'complete',mode:tx.mode}));
   }
   return tx;
  };
 });
 if(sessionBlocked)await context.addInitScript(()=>{
  Object.defineProperty(window,'sessionStorage',{configurable:true,get(){
   throw new DOMException('A4 test-only session storage refusal','SecurityError');
  }});
 });
 return context;
}
async function verifyRestricted(page:Page){
 return page.evaluate(()=>{
  let accountIdbDenied=false;
  try{indexedDB.open('thiepn-hub-account');}catch{accountIdbDenied=true;}
  return {accountIdbDenied,locksAbsent:typeof navigator.locks?.request!=='function'};
 });
}
async function state(page:Page){
 return page.evaluate(async()=>{
  const rows=((window as any).__a4Evidence??[]) as {op:string;revision?:number|null;tasks?:number|null;mode?:string}[];
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const request=indexedDB.open('thiepn-adaptive-workspace',1);
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  const stored=await new Promise<unknown>((resolve,reject)=>{
   const tx=db.transaction('records','readonly');
   const request=tx.objectStore('records').get('guest');
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  db.close();
  const parsed=stored===undefined?null:JSON.parse(String(stored));
  return {
   status:document.querySelector('[data-workspace-status]')?.textContent??null,
   noticePresent:!!document.querySelector('[data-workspace-notice]:not([hidden])'),
   dialogOpen:!!(document.querySelector('[data-workspace-dialog]') as HTMLDialogElement)?.open,
   persistedRevision:typeof parsed?.revision==='number'?parsed.revision:null,
   persistedTasks:Array.isArray(parsed?.tasks)?parsed.tasks.length:null,
   readsMissing:rows.filter(x=>x.op==='read'&&x.revision===null).length,
   readsExisting:rows.filter(x=>x.op==='read'&&typeof x.revision==='number').length,
   writes:rows.filter(x=>x.op==='put').length,
   aborts:rows.filter(x=>x.op==='abort').length,
   trace:rows.slice(0,30)
  };
 });
}
async function ready(page:Page){
 await page.goto('/');
 await expect(page.locator('[data-workspace]')).toBeVisible();
 await expect(page.locator('[data-storage-label]')).toHaveText('This device',{timeout:15000});
 await expect(page.locator('[data-workspace-status]')).toHaveText(/Workspace saved locally|Unsaved/, {timeout:15000});
 const mode=await verifyRestricted(page);
 expect(mode).toEqual({accountIdbDenied:true,locksAbsent:true});
}
async function submitTask(page:Page,title:string){
 await page.locator('[data-planner] [data-action=new-task]').first().click();
 await page.getByLabel('Task',{exact:true}).fill(title);
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-dialog-submit]')).toBeEnabled({timeout:10000});
}
test('A4 cold-start two-tab initialization cannot leave a guest workspace unsaved',async({browser})=>{
 test.setTimeout(150_000);
 const observations:unknown[]=[];
 let unsaved=0,dualMissing=0,aborts=0;
 for(let cycle=0;cycle<8;cycle++){
  const context=await isolated(browser);
  try{
   const pages=await Promise.all([context.newPage(),context.newPage()]);
   await Promise.all(pages.map(p=>ready(p)));
   const evidence=await Promise.all(pages.map(p=>state(p)));
   const cases=evidence.filter(x=>x.status?.includes('Unsaved'));
   unsaved+=cases.length;
   if(evidence.every(x=>x.readsMissing>0))dualMissing++;
   aborts+=evidence.reduce((sum,x)=>sum+x.aborts,0);
   observations.push({cycle,status:evidence.map(x=>x.status),
    missing:evidence.map(x=>x.readsMissing),writes:evidence.map(x=>x.writes),
    aborts:evidence.map(x=>x.aborts),revision:evidence.map(x=>x.persistedRevision)});
  }finally{await context.close();}
 }
 console.info('A4_COLD_INITIALIZATION',JSON.stringify({cycles:8,unsaved,dualMissing,aborts,observations}));
 expect(unsaved,'A4 cold-start emitted Unsaved without user edits').toBe(0);
});
test('A4 warm-start sequential tabs save and reload without competing initial writes',async({browser})=>{
 test.setTimeout(90000);
 const context=await isolated(browser);
 try{
  const first=await context.newPage();
  await ready(first);await expect(first.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const second=await context.newPage();
  await ready(second);await expect(second.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const before=await Promise.all([state(first),state(second)]);
  await submitTask(first,'A4 warm synthetic task');
  await expect(first.locator('[data-workspace-dialog]')).not.toBeVisible();
  await first.reload();
  await expect(first.locator('.ws-task-title').filter({hasText:'A4 warm synthetic task'})).toHaveCount(1);
  const after=await state(first);
  console.info('A4_WARM_RELOAD',JSON.stringify({before:before.map(x=>({status:x.status,revision:x.persistedRevision,aborts:x.aborts})),
   after:{status:after.status,revision:after.persistedRevision,tasks:after.persistedTasks,aborts:after.aborts}}));
  expect(after.status).toBe('Workspace saved locally');
  expect(after.persistedTasks).toBe(1);
 }finally{await context.close();}
});
test('A4 simultaneous explicit writes preserve CAS and form acknowledgements',async({browser})=>{
 test.setTimeout(90000);
 const context=await isolated(browser);
 try{
  const seed=await context.newPage();
  await ready(seed);await expect(seed.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await seed.close();
  const [a,b]=await Promise.all([context.newPage(),context.newPage()]);
  await Promise.all([ready(a),ready(b)]);
  await Promise.all([a,b].map(p=>expect(p.locator('[data-workspace-status]')).toHaveText('Workspace saved locally')));
  await Promise.all([a,b].map(async(p,i)=>{
   await p.locator('[data-planner] [data-action=new-task]').first().click();
   await p.getByLabel('Task',{exact:true}).fill('A4 competing task '+i);
  }));
  await Promise.all([a,b].map(p=>p.locator('[data-dialog-submit]').click()));
  await Promise.all([a,b].map(p=>expect(p.locator('[data-dialog-submit]')).toBeEnabled({timeout:10000})));
  const evidence=await Promise.all([state(a),state(b)]);
  const persisted=evidence[0]?.persistedTasks;
  console.info('A4_CONCURRENT_MUTATIONS',JSON.stringify({status:evidence.map(x=>x.status),
   dialogs:evidence.map(x=>x.dialogOpen),aborts:evidence.map(x=>x.aborts),
   revisions:evidence.map(x=>x.persistedRevision),persistedTasks:persisted}));
  expect(persisted).toBeGreaterThanOrEqual(1);
  expect(persisted).toBeLessThanOrEqual(2);
  expect(evidence.some(x=>!x.dialogOpen||x.status?.includes('Unsaved'))).toBe(true);
 }finally{await context.close();}
});
test('A4 sessionStorage refusal does not prevent guest IndexedDB task persistence',async({browser})=>{
 test.setTimeout(60000);
 const context=await isolated(browser,true);
 try{
  const page=await context.newPage();
  await ready(page);
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await submitTask(page,'A4 session fallback synthetic task');
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.ws-task-title').filter({hasText:'A4 session fallback synthetic task'})).toHaveCount(1);
  const outcome=await state(page);
  console.info('A4_SESSION_FALLBACK',JSON.stringify({status:outcome.status,tasks:outcome.persistedTasks,
   revision:outcome.persistedRevision,aborts:outcome.aborts}));
  expect(outcome.persistedTasks).toBe(1);
 }finally{await context.close();}
});
