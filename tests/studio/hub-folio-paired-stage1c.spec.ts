import {test,expect,type Page} from '@playwright/test'

async function connectLiveAndAuthorize(page:Page){
  await page.goto('/home/tasks/')
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally')
  const initial=page.locator('[data-folio-task-preview]')
  const shareWait=page.waitForEvent('popup')
  await initial.getByRole('button',{name:'Share from Folio'}).click()
  const share=await shareWait
  await expect(share.getByRole('dialog',{name:'Share today’s Folio summary?'})).toBeVisible()
  await share.getByRole('button',{name:'Keep Hub tasks updated in this tab'}).click()
  await page.bringToFront()
  const panel=page.locator('[data-folio-live]')
  await expect(panel.getByRole('button',{name:'Enable Folio task actions'})).toBeVisible()
  await share.close()
  const writeWait=page.waitForEvent('popup')
  await panel.getByRole('button',{name:'Enable Folio task actions'}).click()
  const write=await writeWait
  const modal=write.getByRole('dialog',{name:'Allow Hub to change Folio tasks?'})
  await expect(modal).toBeVisible()
  await expect(panel.locator('[data-folio-create-form]')).toHaveCount(0)
  await write.getByRole('button',{name:'Allow task actions in Hub'}).click()
  await page.bringToFront()
  await expect(panel.locator('[data-folio-create-form]')).toBeVisible()
  await write.close()
  return panel
}

test('source-owned create, complete, reopen, reschedule and undo in real Folio, no Hub copies',async({page})=>{
  const panel=await connectLiveAndAuthorize(page)
  const form=panel.locator('[data-folio-create-form]')
  await form.getByLabel('Folio task title').fill('Stage 1C source proof alpha')
  await form.getByRole('button',{name:'Create in Folio'}).click()
  await expect(panel).toContainText('Stage 1C source proof alpha',{timeout:15_000})
  await expect(page.locator('.ws-task-results')).not.toContainText('Stage 1C source proof alpha')
  let row=panel.locator('.ws-folio-task-row',{hasText:'Stage 1C source proof alpha'})
  await expect(row).toHaveCount(1)
  await row.getByRole('button',{name:'Complete'}).click()
  await expect(panel).toContainText('Task completed')
  await panel.getByRole('button',{name:/Recently completed/}).click()
  row=panel.locator('.ws-folio-task-row',{hasText:'Stage 1C source proof alpha'})
  await expect(row).toHaveCount(1)
  await row.getByRole('button',{name:'Reopen'}).click()
  await expect(panel).toContainText('Task reopened')
  await panel.getByRole('button',{name:/Today/}).click()
  row=panel.locator('.ws-folio-task-row',{hasText:'Stage 1C source proof alpha'})
  await expect(row).toHaveCount(1)

  const planned=await page.evaluate(()=>{
    const d=new Date();d.setDate(d.getDate()+2)
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
  })
  await row.getByRole('textbox',{name:/Plan .* for/}).count().catch(()=>{})
  await row.locator('input[type=date]').fill(planned)
  await row.getByRole('button',{name:'Set date'}).click()
  await expect(panel).toContainText('Task rescheduled')
  await expect(panel.getByRole('button',{name:'Undo last Folio action'})).toBeVisible()
  await panel.getByRole('button',{name:'Undo last Folio action'}).click()
  await expect(panel).toContainText('Last Folio action undone')
  await expect(panel.locator('.ws-folio-task-row',{hasText:'Stage 1C source proof alpha'})).toHaveCount(1)
  await expect(page.locator('.ws-task-results')).not.toContainText('Stage 1C source proof alpha')
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('owner rejects stale versions and repeats a request ID without duplicate creation',async({page})=>{
  const panel=await connectLiveAndAuthorize(page)
  const today=await page.evaluate(()=>{
    const d=new Date()
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
  })
  const results=await page.evaluate(async date=>{
    const frame=document.querySelector<HTMLIFrameElement>('iframe[title="Folio local task reader"]')!
    const read=JSON.parse(sessionStorage.getItem('folio:hub:task-read-consent:v1')||'null')
    const write=JSON.parse(sessionStorage.getItem('folio:hub:task-write-consent:v1')||'null')
    const requestId=crypto.randomUUID()
    const request={type:'thiepn:folio-hub-task-actions:v1:request',
      nonce:read.grant,writeGrant:write.grant,requestId,
      action:{kind:'create',title:'Stage 1C deduplicated proof',status:'todo',priority:'normal',plannedDate:date}}
    const received:any[]=[]
    const listener=(event:MessageEvent)=>{
      if(event.source===frame.contentWindow&&event.data?.type==='thiepn:folio-hub-task-actions:v1:result' &&
         event.data.requestId===requestId)received.push(event.data.result)
    }
    window.addEventListener('message',listener)
    frame.contentWindow!.postMessage(request,location.origin)
    frame.contentWindow!.postMessage(request,location.origin)
    const limit=Date.now()+12000
    while(received.length<1 && Date.now()<limit)await new Promise(resolve=>setTimeout(resolve,75))
    frame.contentWindow!.postMessage(request,location.origin)
    while(received.length<2 && Date.now()<limit)await new Promise(resolve=>setTimeout(resolve,75))
    window.removeEventListener('message',listener)
    return received
  },today)
  expect(results).toHaveLength(2)
  expect(results[0].ok).toBe(true)
  expect(results[1]).toEqual(results[0])
  await panel.getByRole('button',{name:'Refresh now'}).click()
  await expect(panel.locator('.ws-folio-task-row',{hasText:'Stage 1C deduplicated proof'})).toHaveCount(1)
  const row=panel.locator('.ws-folio-task-row',{hasText:'Stage 1C deduplicated proof'})
  const sourceId=await row.getByRole('button',{name:'Complete'}).getAttribute('data-id')
  const denied=await page.evaluate(async taskId=>{
    const frame=document.querySelector<HTMLIFrameElement>('iframe[title="Folio local task reader"]')!
    const read=JSON.parse(sessionStorage.getItem('folio:hub:task-read-consent:v1')||'null')
    const write=JSON.parse(sessionStorage.getItem('folio:hub:task-write-consent:v1')||'null')
    const requestId=crypto.randomUUID()
    const response=new Promise<any>(resolve=>{
      const listener=(event:MessageEvent)=>{
        if(event.source===frame.contentWindow&&event.data?.type==='thiepn:folio-hub-task-actions:v1:result' &&
           event.data.requestId===requestId){window.removeEventListener('message',listener);resolve(event.data.result)}
      }
      window.addEventListener('message',listener)
      setTimeout(()=>{window.removeEventListener('message',listener);resolve(null)},8000)
    })
    frame.contentWindow!.postMessage({type:'thiepn:folio-hub-task-actions:v1:request',nonce:read.grant,
      writeGrant:write.grant,requestId,action:{kind:'complete',taskId,expectedUpdatedAt:'1970-01-01T00:00:00Z'}},
      location.origin)
    return response
  },sourceId)
  expect(denied?.ok).toBe(false)
  expect(denied?.code).toBe('conflict')
  await expect(row.getByRole('button',{name:'Complete'})).toBeVisible()
  await panel.getByRole('button',{name:'Disconnect'}).click()
  expect(await page.evaluate(()=>sessionStorage.getItem('folio:hub:task-write-consent:v1'))).toBeNull()
})
