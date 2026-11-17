import {test,expect,type Page} from '@playwright/test'

async function connectFolio(page:Page) {
  await page.goto('/home/tasks/')
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally')
  const initial=page.locator('[data-folio-task-preview]')
  const shareEvent=page.waitForEvent('popup')
  await initial.getByRole('button',{name:'Share from Folio'}).click()
  const share=await shareEvent
  await expect(share.getByRole('dialog',{name:'Share today’s Folio summary?'})).toBeVisible()
  await share.getByRole('button',{name:'Keep Hub tasks updated in this tab'}).click()
  await page.bringToFront()
  const panel=page.locator('[data-folio-live]')
  await expect(panel.getByRole('button',{name:'Enable Folio task actions'})).toBeVisible()
  await share.close()
  const writeEvent=page.waitForEvent('popup')
  await panel.getByRole('button',{name:'Enable Folio task actions'}).click()
  const popup=await writeEvent
  await popup.getByRole('button',{name:'Allow task actions in Hub'}).click()
  await page.bringToFront()
  await expect(panel.locator('[data-folio-create-form]')).toBeVisible()
  await popup.close()
  return panel
}
async function createTask(page:Page,title:string){
  const form=page.locator('[data-folio-create-form]')
  await form.getByLabel('Folio task title').fill(title)
  await form.getByRole('button',{name:'Create in Folio'}).click()
  await expect(page.locator('.ws-folio-task-row',{hasText:title})).toHaveCount(1,{timeout:15000})
}
async function seedMany(page:Page,n=201){
  await createTask(page,'Stage 1G canonical source task')
  await page.evaluate(async count=>{
    const request=indexedDB.open('folio')
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)
    })
    try{
      const txn=db.transaction('tasks','readwrite')
      const store=txn.objectStore('tasks')
      const template=await new Promise<any>((resolve,reject)=>{
        const r=store.getAll()
        r.onsuccess=()=>resolve(r.result.find((x:any)=>x.title==='Stage 1G canonical source task'))
        r.onerror=()=>reject(r.error)
      })
      if(!template)throw Error('Missing seeded source template')
      const now=new Date().toISOString()
      for(let i=0;i<count;i++)store.put({...template,
        id:crypto.randomUUID(),title:'Stage 1G bulk '+String(i).padStart(4,'0'),
        createdAt:now,updatedAt:now,deletedAt:undefined,
        completedAt:undefined,seriesId:undefined,recurrenceDate:undefined,parentTaskId:undefined,
        status:'todo'})
      await new Promise<void>((resolve,reject)=>{
        txn.oncomplete=()=>resolve();txn.onerror=()=>reject(txn.error);txn.onabort=()=>reject(txn.error)
      })
    }finally{db.close()}
  },n)
}

test('real Folio TaskInspector opens through a one-time source ID link, without leaking task text in URL',async({page})=>{
  const panel=await connectFolio(page)
  await createTask(page,'Inspector link target alpha')
  await createTask(page,'Inspector link target beta')
  const details=panel.locator('[data-folio-detail-link]')
  await expect(details).toHaveCount(2)
  await details.first().focus()
  await page.keyboard.press('ArrowDown')
  await expect(details.nth(1)).toBeFocused()
  const target=panel.locator('.ws-folio-task-row',{hasText:'Inspector link target alpha'})
    .getByRole('link',{name:'Open Inspector link target alpha details in Folio'})
  const href=await target.getAttribute('href')
  expect(href).toMatch(/^\/folio\/\?view=today&(?:amp;)?hubTask=/)
  expect(href).not.toContain('Inspector link target alpha')
  const popupEvent=page.waitForEvent('popup')
  await target.click()
  const folio=await popupEvent
  await expect(folio.locator('.task-drawer-overlay')).toBeVisible({timeout:15000})
  await expect(folio.locator('.task-drawer-overlay')).toContainText('Inspector link target alpha')
  await expect.poll(()=>folio.evaluate(()=>location.search)).not.toContain('hubTask=')
  await expect(folio.locator('[data-folio-hub-task-notice]')).toHaveCount(0)
  await folio.close()
  await expect(panel.locator('.ws-folio-task-row',{hasText:'Inspector link target alpha'})).toHaveCount(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1)
})

test('missing source task reference is consumed and never opens another task',async({page})=>{
  await page.goto('/folio/?view=today&hubTask=missing-source-task-1g')
  await expect(page.locator('[data-folio-hub-task-notice]')).toContainText('Task not found',{timeout:15000})
  await expect(page.locator('.task-drawer-overlay')).toHaveCount(0)
  expect(await page.evaluate(()=>location.search)).not.toContain('hubTask=')
})

test('a concurrent Folio edit invalidates later pages and offers explicit restart without silent row shifts',async({page})=>{
  const panel=await connectFolio(page)
  await seedMany(page)
  await panel.getByRole('button',{name:'Refresh now'}).click()
  await expect(panel.locator('.ws-folio-pages')).toContainText('Page 1',{timeout:15000})
  await panel.getByRole('button',{name:'Next page'}).click()
  await expect(panel.locator('.ws-folio-pages')).toContainText('Page 2')
  // Independent source-side edit affects ordered task IDs and therefore the
  // listing revision. The next page must not silently use a shifted offset.
  await page.evaluate(async()=>{
    const req=indexedDB.open('folio')
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
    })
    try{
      const tx=db.transaction('tasks','readwrite')
      const store=tx.objectStore('tasks')
      const rows=await new Promise<any[]>((resolve,reject)=>{
        const r=store.getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)
      })
      const item=rows.find(x=>x.title==='Stage 1G bulk 0000')
      if(!item)throw Error('Missing source record')
      store.put({...item,title:'Stage 1G externally reordered task',
        updatedAt:new Date().toISOString()})
      await new Promise<void>((resolve,reject)=>{
        tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)
      })
    }finally{db.close()}
  })
  await panel.getByRole('button',{name:'Next page'}).click()
  await expect(panel).toContainText('Task list changed since you opened this page',{timeout:15000})
  await expect(panel.locator('.ws-folio-task-row')).toHaveCount(0)
  await panel.getByRole('button',{name:'Restart results'}).click()
  await expect(panel.locator('.ws-folio-pages')).toContainText('Page 1',{timeout:15000})
  await expect(panel.locator('.ws-folio-task-row')).toHaveCount(40)
  await expect(page.locator('.ws-task-results')).not.toContainText('Stage 1G externally reordered task')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1)
})
