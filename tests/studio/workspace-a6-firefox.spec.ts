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
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
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
  indexes,initial:logicalStyle(before.styles),preview:logicalStyle(preview.styles),
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
