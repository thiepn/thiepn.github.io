import {test,expect,type Page} from '@playwright/test';

async function authorize(page:Page){
  await page.goto('/home/tasks/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const legacy=page.locator('[data-legacy-hub-tasks]');
  await expect(legacy).toBeVisible();
  expect(await legacy.evaluate(el=>(el as HTMLDetailsElement).open)).toBe(false);
  const first=page.locator('[data-folio-task-preview]');
  const sourceBeforeLegacy=await page.evaluate(()=>{
    const a=document.querySelector('[data-folio-task-preview]')!;
    const b=document.querySelector('[data-legacy-hub-tasks]')!;
    return Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(sourceBeforeLegacy).toBe(true);
  const popupWait=page.waitForEvent('popup');
  await first.getByRole('button',{name:'Share from Folio'}).click();
  const popup=await popupWait;
  await expect(popup.getByRole('dialog',{name:'Share today’s Folio summary?'})).toBeVisible();
  await popup.getByRole('button',{name:'Keep Hub tasks updated in this tab'}).click();
  await page.bringToFront();
  const panel=page.locator('[data-folio-live]');
  await expect(panel.getByRole('button',{name:'Enable Folio task actions'})).toBeVisible();
  await popup.close();
  const writeWait=page.waitForEvent('popup');
  await panel.getByRole('button',{name:'Enable Folio task actions'}).click();
  const write=await writeWait;
  await expect(write.getByRole('dialog',{name:'Allow Hub to change Folio tasks?'})).toBeVisible();
  await write.getByRole('button',{name:'Allow task actions in Hub'}).click();
  await page.bringToFront();
  await expect(panel.locator('[data-folio-create-form]')).toBeVisible();
  await write.close();
  return panel;
}

async function seedManyFromCanonicalTask(page:Page,count:number){
  const form=page.locator('[data-folio-create-form]');
  await form.getByLabel('Folio task title').fill('Stage 1F canonical source task');
  await form.getByRole('button',{name:'Create in Folio'}).click();
  await expect(page.locator('.ws-folio-task-row',{hasText:'Stage 1F canonical source task'})).toHaveCount(1);
  await page.evaluate(async count=>{
    const req=indexedDB.open('folio');
    const db=await new Promise<IDBDatabase>((res,rej)=>{
      req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);
    });
    try {
      const tx=db.transaction('tasks','readwrite');
      const store=tx.objectStore('tasks');
      const template=await new Promise<any>((res,rej)=>{
        const get=store.getAll();
        get.onsuccess=()=>res(get.result.find((x:any)=>x.title==='Stage 1F canonical source task'));
        get.onerror=()=>rej(get.error);
      });
      if(!template)throw Error('Canonical task not found');
      const now=new Date().toISOString();
      for(let i=0;i<count;i++){
        store.put({...template,id:crypto.randomUUID(),
          title:'zz bulk '+String(i).padStart(4,'0'),
          createdAt:now,updatedAt:now,deletedAt:undefined,
          parentTaskId:undefined,seriesId:undefined,recurrenceDate:undefined,
          completedAt:undefined,status:'todo'});
      }
      store.put({...template,id:crypto.randomUUID(),title:'zzzz rare needle beyond preview',
        createdAt:now,updatedAt:now,deletedAt:undefined,parentTaskId:undefined,
        seriesId:undefined,recurrenceDate:undefined,completedAt:undefined,status:'todo'});
      await new Promise<void>((res,rej)=>{
        tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);
      });
    }finally{db.close();}
  },count);
}

test('Folio-first is primary; complete source search reaches tasks beyond preview and legacy stays intact',async({page})=>{
  const panel=await authorize(page);
  await seedManyFromCanonicalTask(page,205);
  await panel.getByRole('button',{name:'Refresh now'}).click();
  await expect(panel.locator('.ws-folio-pages')).toContainText('Page 1',{timeout:15_000});
  await expect(panel).toContainText('of 207 Folio tasks');
  await expect(panel.locator('.ws-folio-task-row')).toHaveCount(40);
  await expect(panel.locator('.ws-folio-task-row',{hasText:'zzzz rare needle beyond preview'})).toHaveCount(0);
  const search=panel.getByLabel('Find Folio tasks');
  await search.fill('rare needle beyond preview');
  await expect(panel).toContainText('Showing 1 matching of 1 Folio tasks',{timeout:15_000});
  await expect(panel.locator('.ws-folio-task-row',{hasText:'zzzz rare needle beyond preview'})).toHaveCount(1);
  await expect(search).toBeFocused();
  await panel.getByRole('button',{name:'Disconnect'}).click();
  await expect(page.locator('[data-folio-live]')).toHaveCount(0);
  await expect(page.locator('[data-folio-task-preview]')).not.toContainText('rare needle beyond preview');
  const legacy=page.locator('[data-legacy-hub-tasks]');
  await legacy.locator('summary').click();
  await expect(legacy.locator('.ws-task-results')).toBeVisible();
  await expect(legacy.getByRole('button',{name:'+ Add task'})).toBeVisible();
  await expect(legacy.locator('.ws-task-results')).not.toContainText('zzzz rare needle beyond preview');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});

test('source-owned paging beyond row 160 can complete a task with original version checks',async({page})=>{
  const panel=await authorize(page);
  await seedManyFromCanonicalTask(page,205);
  await panel.getByRole('button',{name:'Refresh now'}).click();
  await expect(panel.locator('.ws-folio-pages')).toContainText('Page 1',{timeout:15_000});
  for(let i=0;i<5;i++){
    await panel.getByRole('button',{name:'Next page'}).click();
    await expect(panel.locator('.ws-folio-pages')).toContainText('Page '+(i+2));
  }
  const row=panel.locator('.ws-folio-task-row',{hasText:'zzzz rare needle beyond preview'});
  await expect(row).toHaveCount(1);
  const id=await row.getByRole('button',{name:'Complete'}).getAttribute('data-id');
  expect(id).toBeTruthy();
  await row.getByRole('button',{name:'Complete'}).click();
  await expect(panel).toContainText('Task completed',{timeout:15_000});
  await expect(row).toHaveCount(0);
  const saved=await page.evaluate(async taskId=>{
    const request=indexedDB.open('folio');
    const db=await new Promise<IDBDatabase>((res,rej)=>{
      request.onsuccess=()=>res(request.result);request.onerror=()=>rej(request.error)
    });
    try{
      const tx=db.transaction('tasks','readonly');
      return await new Promise<any>((res,rej)=>{
        const r=tx.objectStore('tasks').get(taskId);
        r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
      });
    }finally{db.close()}
  },id);
  expect(saved.status).toBe('completed');
  await expect(page.locator('.ws-task-results')).not.toContainText('zzzz rare needle beyond preview');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});
