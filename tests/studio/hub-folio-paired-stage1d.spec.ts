import {test,expect,type Page} from '@playwright/test'

async function approveFolioActions(page:Page){
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
  const write=await writeEvent
  await expect(write.getByRole('dialog',{name:'Allow Hub to change Folio tasks?'})).toBeVisible()
  await write.getByRole('button',{name:'Allow task actions in Hub'}).click()
  await page.bringToFront()
  await expect(panel.locator('[data-folio-create-form]')).toBeVisible()
  await write.close()
  return panel
}
async function createTask(page:Page,title:string){
  const form=page.locator('[data-folio-create-form]')
  await form.getByLabel('Folio task title').fill(title)
  await form.getByRole('button',{name:'Create in Folio'}).click()
  await expect(page.locator('.ws-folio-task-row',{hasText:title})).toHaveCount(1,{timeout:15_000})
  return (await page.locator('.ws-folio-task-row',{hasText:title}).getByRole('button',{name:'Complete'}).getAttribute('data-id'))!
}
async function readFolioStore(page:Page,store:string,id?:string){
  return await page.evaluate(async({store,id})=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const req=indexedDB.open('folio')
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
    })
    try{
      const txn=db.transaction(store,'readonly')
      return await new Promise<any>((resolve,reject)=>{
        const req=id?txn.objectStore(store).get(id):txn.objectStore(store).getAll()
        req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
      })
    }finally{db.close()}
  },{store,id})
}
async function modifyFolioStore(page:Page,changes:{sourceId:string;mode:'edit'|'child'|'recurrence';date?:string}){
  return await page.evaluate(async({sourceId,mode,date})=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const req=indexedDB.open('folio')
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
    })
    try{
      const tx=db.transaction(mode==='recurrence'?['tasks','recurringSeries']:['tasks'],'readwrite')
      const tasks=tx.objectStore('tasks')
      const get=await new Promise<any>((resolve,reject)=>{
        const req=tasks.get(sourceId)
        req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
      })
      if(!get)throw Error('Test source task missing')
      let linkedId=''
      if(mode==='edit'){
        // Simulates an independent Folio tab changing a task within the same
        // millisecond. This must not permit an old Undo to overwrite it.
        get.title='Edited by independent Folio tab'
        tasks.put(get)
      }else if(mode==='child'){
        linkedId=crypto.randomUUID()
        tasks.add({...get,id:linkedId,parentTaskId:sourceId,title:'Real Folio child proof',
          status:'todo',lastOpenStatus:'todo',completedAt:undefined,
          createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
          seriesId:undefined,recurrenceDate:undefined,activity:[]})
      }else{
        linkedId=crypto.randomUUID()
        const now=new Date().toISOString()
        tx.objectStore('recurringSeries').add({
          id:linkedId,title:'Daily after completion',timezone:'UTC',
          status:'active',startDate:date,rule:{frequency:'after-completion',interval:1,afterCompletionUnit:'day'},
          taskTemplate:{title:'Recurring proof occurrence',description:'',priority:'normal',tags:[],
            tagIds:[],checklist:[],pinned:false},exceptions:{},createdAt:now,updatedAt:now,
        })
        get.seriesId=linkedId
        get.recurrenceDate=date
        get.updatedAt=now
        tasks.put(get)
      }
      await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})
      return linkedId
    }finally{db.close()}
  },changes)
}
async function sourceAction(page:Page,action:unknown,requestId:string,readerIndex=0){
  return await page.evaluate(async({action,requestId,readerIndex})=>{
    const frame=document.querySelectorAll<HTMLIFrameElement>('iframe[title="Folio local task reader"]')[readerIndex]
    if(!frame?.contentWindow)throw Error('Reader iframe unavailable')
    const read=JSON.parse(sessionStorage.getItem('folio:hub:task-read-consent:v1')||'null')
    const write=JSON.parse(sessionStorage.getItem('folio:hub:task-write-consent:v1')||'null')
    const response=new Promise<any>(resolve=>{
      const timer=setTimeout(()=>{window.removeEventListener('message',listen);resolve(null)},10_000)
      const listen=(e:MessageEvent)=>{
        if(e.origin===location.origin&&e.source===frame.contentWindow&&
           e.data?.type==='thiepn:folio-hub-task-actions:v1:result'&&
           e.data.requestId===requestId){
          clearTimeout(timer);window.removeEventListener('message',listen);resolve(e.data.result)
        }
      }
      window.addEventListener('message',listen)
    })
    frame.contentWindow.postMessage({
      type:'thiepn:folio-hub-task-actions:v1:request',
      nonce:read.grant,writeGrant:write.grant,requestId,action,
    },location.origin)
    return await response
  },{action,requestId,readerIndex})
}

test('tab receipt blocks uncertain writes and preserves idempotency after iframe restart',async({page})=>{
  const panel=await approveFolioActions(page)
  const date=await page.evaluate(()=>{
    const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
  })
  const action={kind:'create',title:'Receipt proof owner task',status:'todo',priority:'normal',plannedDate:date}
  const id=crypto.randomUUID()
  const first=await sourceAction(page,action,id)
  expect(first?.ok).toBe(true)
  // A freshly mounted reader has a new in-memory seen map. It must still
  // recognize the original source receipt rather than creating twice.
  await page.evaluate(async()=>{
    const frame=document.createElement('iframe')
    frame.hidden=true;frame.title='Folio local task reader'
    frame.src='/folio/?hubTasksRead=1'
    document.body.appendChild(frame)
    await new Promise<void>(resolve=>{
      if(frame.contentDocument?.readyState==='complete'){resolve();return}
      frame.addEventListener('load',()=>resolve(),{once:true})
    })
  })
  const repeat=await sourceAction(page,action,id,1)
  expect(repeat?.ok).toBe(true)
  expect(repeat.taskId).toBe(first.taskId)
  expect(repeat.undoId).toBeUndefined()
  const mismatched=await sourceAction(page,{...action,title:'Different command with same ID'},id,1)
  expect(mismatched?.code).toBe('invalid')
  const uncertain={kind:'create',title:'Must never duplicate pending task',status:'todo',
    priority:'normal',plannedDate:date}
  const pendingId=crypto.randomUUID()
  await page.evaluate(async({pendingId,uncertain})=>{
    const write=JSON.parse(sessionStorage.getItem('folio:hub:task-write-consent:v1')||'null')
    const bytes=new TextEncoder().encode(JSON.stringify([write.grant,uncertain]))
    const digest=await crypto.subtle.digest('SHA-256',bytes)
    const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')
    const key='folio:hub:task-command-receipts:v1'
    const records=JSON.parse(sessionStorage.getItem(key)||'[]')
    records.push({requestId:pendingId,hash,state:'pending',expiresAt:Date.now()+64*60_000})
    sessionStorage.setItem(key,JSON.stringify(records))
  },{pendingId,uncertain})
  const blocked=await sourceAction(page,uncertain,pendingId,1)
  expect(blocked?.ok).toBe(false)
  expect(blocked.code).toBe('unavailable')
  const records=await readFolioStore(page,'tasks') as any[]
  expect(records.filter(x=>x.title==='Receipt proof owner task')).toHaveLength(1)
  expect(records.filter(x=>x.title==='Must never duplicate pending task')).toHaveLength(0)
  await expect(panel.locator('[data-folio-create-form]')).toBeVisible()
})

test('stale undo is rejected even if another tab edits in the same timestamp',async({page})=>{
  const panel=await approveFolioActions(page)
  const id=await createTask(page,'Undo collision proof task')
  await expect(panel.getByRole('button',{name:'Undo last Folio action'})).toBeVisible()
  await modifyFolioStore(page,{sourceId:id,mode:'edit'})
  await panel.getByRole('button',{name:'Undo last Folio action'}).click()
  await expect(panel).toContainText('Task or subtasks changed')
  const saved=await readFolioStore(page,'tasks',id) as any
  expect(saved.title).toBe('Edited by independent Folio tab')
  await expect(panel.getByRole('button',{name:'Undo last Folio action'})).toHaveCount(0)
})

test('parent completion cascades via Folio and forbids unsafe descendant overwrite undo',async({page})=>{
  const panel=await approveFolioActions(page)
  const id=await createTask(page,'Parent task cascade proof')
  const childId=await modifyFolioStore(page,{sourceId:id,mode:'child'})
  await panel.getByRole('button',{name:'Refresh now'}).click()
  const row=panel.locator('.ws-folio-task-row',{hasText:'Parent task cascade proof'})
  await expect(row).toContainText('completing also completes subtasks')
  page.once('dialog',dialog=>{expect(dialog.message()).toContain('subtasks');void dialog.accept()})
  await row.getByRole('button',{name:'Complete'}).click()
  await expect(panel).toContainText('complex task: review changes in Folio')
  expect((await readFolioStore(page,'tasks',childId) as any).status).toBe('completed')
  await expect(panel.getByRole('button',{name:'Undo last Folio action'})).toHaveCount(0)
})

test('completion of real after-completion recurring series creates next occurrence without risky undo',async({page})=>{
  const panel=await approveFolioActions(page)
  const id=await createTask(page,'Recurring parent proof task')
  const date=await page.evaluate(()=>{
    const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
  })
  const seriesId=await modifyFolioStore(page,{sourceId:id,mode:'recurrence',date})
  await panel.getByRole('button',{name:'Refresh now'}).click()
  const row=panel.locator('.ws-folio-task-row',{hasText:'Recurring parent proof task'})
  await expect(row).toContainText('Recurring')
  page.once('dialog',dialog=>{expect(dialog.message()).toContain('recurring');void dialog.accept()})
  await row.getByRole('button',{name:'Complete'}).click()
  await expect(panel).toContainText('next occurrence created')
  await expect(panel.getByRole('button',{name:'Undo last Folio action'})).toHaveCount(0)
  const tasks=await readFolioStore(page,'tasks') as any[]
  expect(tasks.filter(t=>t.seriesId===seriesId&&t.id!==id&&t.status==='todo')).toHaveLength(1)
})
