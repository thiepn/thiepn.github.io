import {test,expect,type Page} from '@playwright/test';

/** A6 read-only Firefox layout evidence, scoped to synthetic guest storage. */
function logicalStyle(value:string|null){
 const p=Object.fromEntries([...String(value??'').matchAll(/--(col|span|row|height)\s*:\s*(\d+)/g)].map(m=>[m[1],Number(m[2])]));
 return {col:p.col??null,span:p.span??null,row:p.row??null,height:p.height??null};
}
async function snapshot(page:Page,id:string){
 return page.evaluate(async widgetId=>{
  const el=[...document.querySelectorAll<HTMLElement>('[data-widget-id]')].find(node=>node.dataset.widgetId===widgetId);
  const index=[...document.querySelectorAll<HTMLElement>('[data-widget-id]')].findIndex(node=>node.dataset.widgetId===widgetId);
  const styles=el?.getAttribute('style')??null;
  const database=await new Promise<IDBDatabase>((resolve,reject)=>{
   const r=indexedDB.open('thiepn-adaptive-workspace',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  const saved=await new Promise<string|null>((resolve,reject)=>{
   const req=database.transaction('records','readonly').objectStore('records').get('guest');
   req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);
  });database.close();
  const record=saved?JSON.parse(saved):null;
  const active=record?.workspaces?.find((w:any)=>w.id===record?.active);
  const widget=active?.widgets?.find((w:any)=>w.id===widgetId);
  return {
   index,styles,widget:widget?.desktop??null,
   revision:record?.revision??null,
   accountLabel:document.querySelector('[data-storage-label]')?.textContent??null,
   status:document.querySelector('[data-workspace-status]')?.textContent??null,
   activeSameId:!!el,
  };
 },id);
}

test('A6 Firefox stable widget ID survives pointer drop, reflow and reload',async({page,browserName})=>{
 test.skip(browserName!=='firefox','Firefox layout regression investigation only');
 test.setTimeout(90_000);
 await page.addInitScript(()=>{
  const original=Promise.prototype.catch;
  (window as any).__a6Caught=[];
  (window as any).__a6Capture=false;
  (Promise.prototype as any).catch=function(handler:(error:unknown)=>unknown){
   return original.call(this,(error:unknown)=>{
    if((window as any).__a6Capture && (window as any).__a6Caught.length<12){
     (window as any).__a6Caught.push({
      name:error instanceof Error?error.name:typeof error,
      message:error instanceof Error?error.message.slice(0,140):'non-Error rejection'
     });
    }
    return handler(error);
   });
  };
 });
 await page.goto('/');
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 await page.getByRole('button',{name:'Customize',exact:true}).click();
 const cell=page.locator('[data-widget-id]').nth(1);
 const id=await cell.getAttribute('data-widget-id');expect(id).toBeTruthy();
 const before=await snapshot(page,id!);
 const handle=cell.locator('[data-drag]');
 const box=await handle.boundingBox();expect(box).not.toBeNull();
 await page.mouse.move(box!.x+8,box!.y+8);
 await page.mouse.down();
 await page.mouse.move(box!.x+8,box!.y+88,{steps:5});
 await page.mouse.up();
 const preview=await snapshot(page,id!);
 await page.evaluate(()=>{
  (window as any).__a6Capture=true;
  (window as any).__a6DoneClicks=[];
  document.querySelector('[data-workspace]')?.addEventListener('click',(event:Event)=>{
   const action=(event.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action??null;
   if(action==='done-layout'){
    (window as any).__a6DoneClicks.push({action,defaultPrevented:event.defaultPrevented});
   }
  },true);
 });
 const doneButton=page.getByRole('button',{name:'Done',exact:true});
 const doneMeta=await doneButton.evaluate((node:HTMLElement)=>({
  action:node.dataset.action??null,inRoot:!!node.closest('[data-workspace]'),
  element:node.tagName.toLowerCase()
 }));
 await doneButton.click();
 await page.waitForTimeout(120);
 const pointerDelivered=await page.evaluate(()=>((window as any).__a6DoneClicks as unknown[]).length>0);
 let keyboardFallback=false;
 if(!pointerDelivered){
  keyboardFallback=true;
  await doneButton.focus();
  await page.keyboard.press('Enter');
 }
 await page.waitForTimeout(350);
 const doneState=await page.evaluate(()=>({
  caught:(window as any).__a6Caught as {name:string;message:string}[],
  doneClicks:(window as any).__a6DoneClicks as {action:string;defaultPrevented:boolean}[],
  toast:document.querySelector('[data-workspace-toast]')?.textContent??null,
  toastHidden:!!(document.querySelector('[data-workspace-toast]') as HTMLElement)?.hidden,
  customizeAvailable:!![...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.trim()==='Customize'),
  editLabelPresent:!!document.querySelector('.ws-edit-label'),
  notice:document.querySelector('[data-workspace-notice]')?.textContent??null,
  status:document.querySelector('[data-workspace-status]')?.textContent??null,
 }));
 const candidateDiagnostic=await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const request=indexedDB.open('thiepn-adaptive-workspace',1);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  const tx=db.transaction(['records','drafts'],'readonly');
  const rec=tx.objectStore('records').get('guest');
  const dr=tx.objectStore('drafts').get('guest');
  const rows=await new Promise<{record:string|null;draft:any|null}>((resolve,reject)=>{
   tx.oncomplete=()=>resolve({record:rec.result??null,draft:dr.result??null});
   tx.onabort=()=>reject(tx.error);
  });
  db.close();
  return rows;
 });
 const storedState=candidateDiagnostic.record?JSON.parse(candidateDiagnostic.record):null;
 const activeWorkspace=storedState?.workspaces.find((w:any)=>w.id===storedState.active);
 const editDraft=candidateDiagnostic.draft;
 const editedWidgets=editDraft?.workspace?.widgets as {desktop?:{x:number;y:number;w:number;h:number}}[]|undefined;
 const rectangleViolations=(editedWidgets??[]).filter(widget=>{
  const r=widget.desktop;
  return !r||![r.x,r.y,r.w,r.h].every(Number.isSafeInteger)||
   r.x<0||r.y<0||r.y>10000||r.w<1||r.x+r.w>12||r.h<8||r.h>120;
 }).length;
 const draftEvidence={
  recordRevision:storedState?.revision??null,
  activeWorkspaceRevision:activeWorkspace?.revision??null,
  draftBaseRevision:editDraft?.baseRevision??null,
  draftWorkspaceRevision:editDraft?.workspace?.revision??null,
  draftWidgets:editDraft?.workspace?.widgets?.length??null,
  rectangleViolations,
 };
 const committed=await snapshot(page,id!);
 await page.setViewportSize({width:390,height:844});
 const mobile=await snapshot(page,id!);
 await page.setViewportSize({width:1440,height:1024});
 const restored=await snapshot(page,id!);
 await page.reload();
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 const reloaded=await snapshot(page,id!);
 const indexes=[before.index,preview.index,committed.index,mobile.index,restored.index,reloaded.index];
 console.info('A6_FIREFOX_LAYOUT',JSON.stringify({
  indexes,doneMeta,pointerDelivered,keyboardFallback,doneState,draftEvidence,initial:logicalStyle(before.styles),preview:logicalStyle(preview.styles),
  committed:logicalStyle(committed.styles),mobile:logicalStyle(mobile.styles),
  restored:logicalStyle(restored.styles),reloaded:logicalStyle(reloaded.styles),
  saveRevision:committed.revision,reloadRevision:reloaded.revision,
  savedWidget:committed.widget,loadedWidget:reloaded.widget,
 }));
 expect(logicalStyle(preview.styles)).not.toEqual(logicalStyle(before.styles));
 expect(logicalStyle(committed.styles)).toEqual(logicalStyle(restored.styles));
 expect(logicalStyle(committed.styles)).toEqual(logicalStyle(reloaded.styles));
 expect(reloaded.widget).toEqual(committed.widget);
 expect(reloaded.activeSameId).toBe(true);
});
