import {test,expect,type Page} from '@playwright/test';

async function authorize(page:Page){
  await page.goto('/home/tasks/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const start=page.locator('[data-folio-task-preview]');
  const shareWait=page.waitForEvent('popup');
  await start.getByRole('button',{name:'Share from Folio'}).click();
  const share=await shareWait;
  await expect(share.getByRole('dialog',{name:'Share today’s Folio summary?'})).toBeVisible();
  await share.getByRole('button',{name:'Keep Hub tasks updated in this tab'}).click();
  await page.bringToFront();
  const panel=page.locator('[data-folio-live]');
  await expect(panel.getByRole('button',{name:'Enable Folio task actions'})).toBeVisible();
  await share.close();
  const writeWait=page.waitForEvent('popup');
  await panel.getByRole('button',{name:'Enable Folio task actions'}).click();
  const popup=await writeWait;
  await expect(popup.getByRole('dialog',{name:'Allow Hub to change Folio tasks?'})).toBeVisible();
  await popup.getByRole('button',{name:'Allow task actions in Hub'}).click();
  await page.bringToFront();
  await expect(panel.locator('[data-folio-create-form]')).toBeVisible();
  await popup.close();
  return panel;
}
async function seedContext(page:Page){
  await page.evaluate(async()=>{
    const request=indexedDB.open('folio');
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    try{
      const tx=db.transaction(['projects','lists'],'readwrite');
      const now=new Date().toISOString();
      tx.objectStore('projects').put({
        id:'stage1e-project',name:'Stage 1E Coursework',description:'',notes:'',
        type:'personal',status:'active',archived:false,favorite:false,
        milestones:[],activity:[],createdAt:now,updatedAt:now,
      });
      tx.objectStore('lists').put({
        id:'stage1e-list',name:'Stage 1E Daily list',description:'',
        favorite:false,archived:false,sortOrder:0,sortMode:'manual',
        groupMode:'none',showCompleted:false,createdAt:now,updatedAt:now,
      });
      await new Promise<void>((resolve,reject)=>{
        tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
    }finally{db.close()}
  });
}

test('source-backed project/list capture, in-tab search and project grouping',async({page})=>{
  const panel=await authorize(page);
  await seedContext(page);
  await panel.getByRole('button',{name:'Refresh now'}).click();
  const form=panel.locator('[data-folio-create-form]');
  await form.locator('summary').click();
  await expect(form.getByLabel('Folio create project')).toBeVisible();
  await expect(form.getByLabel('Folio create project')).toHaveValue('');
  await expect(form.getByLabel('Folio create project').locator('option')).toContainText(['None','Stage 1E Coursework']);
  await form.getByLabel('Folio create project').selectOption('stage1e-project');
  await form.getByLabel('Folio create list').selectOption('stage1e-list');
  await form.getByLabel('Folio task title').fill('Coursework proof task');
  await form.getByRole('button',{name:'Create in Folio'}).click();
  let row=panel.locator('.ws-folio-task-row',{hasText:'Coursework proof task'});
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Project: Stage 1E Coursework');
  await expect(row).toContainText('List: Stage 1E Daily list');
  await expect(page.locator('.ws-task-results')).not.toContainText('Coursework proof task');
  await panel.getByRole('button',{name:/All \d+/}).click();
  await panel.getByLabel('Group Folio tasks').selectOption('project');
  await expect(panel.locator('.ws-folio-task-section h3')).toContainText(['Stage 1E Coursework']);
  await panel.getByLabel('Filter Folio project').selectOption('stage1e-project');
  await expect(panel.locator('.ws-folio-task-row',{hasText:'Coursework proof task'})).toHaveCount(1);
  const search=panel.getByLabel('Find Folio tasks');
  await search.fill('not in this project');
  await expect(search).toBeFocused();
  await expect(panel.locator('.ws-folio-task-row')).toHaveCount(0);
  await search.fill('daily list');
  await expect(panel.locator('.ws-folio-task-row')).toHaveCount(1);
  await expect(panel).toContainText('Showing 1 matching');
  await panel.getByLabel('Filter Folio project').selectOption('none');
  await expect(panel.locator('.ws-folio-task-row')).toHaveCount(0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow,'no horizontal overflow on viewport').toBeLessThanOrEqual(1);
});

test('keyboard quick capture, direct inbox and one-click day planning preserve source identity',async({page})=>{
  const panel=await authorize(page);
  await page.keyboard.press('Alt+Shift+N');
  const title=panel.getByLabel('Folio task title');
  await expect(title).toBeFocused();
  await title.fill('Quick owner proof');
  await title.press('Enter');
  let row=panel.locator('.ws-folio-task-row',{hasText:'Quick owner proof'});
  await expect(row).toHaveCount(1);
  await expect(page.locator('.ws-task-results')).not.toContainText('Quick owner proof');
  await title.fill('Inbox capture proof');
  await panel.getByRole('button',{name:'Capture to Inbox'}).click();
  await panel.locator('[data-action="folio-read-filter"][data-id="inbox"]').click();
  await expect(panel.locator('.ws-folio-task-row',{hasText:'Inbox capture proof'})).toHaveCount(1);
  await panel.locator('[data-action="folio-read-filter"][data-id="today"]').click();
  row=panel.locator('.ws-folio-task-row',{hasText:'Quick owner proof'});
  await expect(row).toHaveCount(1);
  await row.getByRole('button',{name:'Tomorrow'}).click();
  await panel.locator('[data-action="folio-read-filter"][data-id="upcoming"]').click();
  row=panel.locator('.ws-folio-task-row',{hasText:'Quick owner proof'});
  await expect(row).toHaveCount(1);
  await row.getByRole('button',{name:'Today'}).click();
  await panel.locator('[data-action="folio-read-filter"][data-id="today"]').click();
  await expect(panel.locator('.ws-folio-task-row',{hasText:'Quick owner proof'})).toHaveCount(1);
  await expect(page.locator('.ws-task-results')).not.toContainText('Quick owner proof');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
