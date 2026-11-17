import { test, expect, type Page } from '@playwright/test';

async function addFolioTask(page:Page,title:string,kind:'today'|'inbox'='today'){
  const desktop=page.locator('.topbar').getByRole('button',{name:'Add',exact:true});
  const mobile=page.getByRole('button',{name:'Add task or capture'});
  await expect.poll(async()=>await desktop.isVisible()||await mobile.isVisible(),{timeout:15_000}).toBe(true);
  if(await desktop.isVisible())await desktop.click();
  else await mobile.click();
  const form=page.getByRole('dialog',{name:'Quick add'});
  await expect(form).toBeVisible();
  await form.locator('#quick-capture-input').fill(title);
  await form.getByRole('button',{name:'Details',exact:true}).click();
  if(kind==='inbox')await form.getByRole('combobox',{name:'Type'}).selectOption('inbox');
  else {
    const today=await page.evaluate(()=>{
      const d=new Date();
      return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    });
    await form.getByLabel('Planned day').fill(today);
  }
  await form.getByRole('button',{name:'Add task',exact:true}).click();
  await expect(form).toBeHidden();
}
test('explicit live consent refreshes actual Folio tasks without a second popup or Hub writes',async({page,context},info)=>{
  await page.goto('/home/tasks/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const preview=page.locator('[data-folio-task-preview]');
  const folio=await context.newPage();
  await folio.goto('/folio/');
  await addFolioTask(folio,'Stage 1B actual Today item');
  let opened=0;
  page.on('popup',()=>opened++);
  const newPopup=page.waitForEvent('popup');
  await preview.getByRole('button',{name:'Share from Folio'}).click();
  const popup=await newPopup;
  const consent=popup.getByRole('dialog',{name:'Share today’s Folio summary?'});
  await expect(consent).toBeVisible();
  await expect(preview).not.toContainText('Stage 1B actual Today item');
  await popup.getByRole('button',{name:'Keep Hub tasks updated in this tab'}).click();
  await page.bringToFront();
  const live=page.locator('[data-folio-live]');
  await expect(live).toContainText('Stage 1B actual Today item');
  await expect(live).toContainText('Showing 1 of 1 Folio tasks');
  await expect(live.locator('[data-task-toggle]')).toHaveCount(0);
  await expect(live.locator('input[type=checkbox]')).toHaveCount(0);
  await expect(page.locator('.ws-task-results')).not.toContainText('Stage 1B actual Today item');
  await popup.close();

  await folio.bringToFront();
  await addFolioTask(folio,'Stage 1B new Today item');
  await page.bringToFront();
  if(info.project.name==='desktop-chromium'){
    // The source should be re-read by the 30-second visible-tab timer.
    await expect(live).toContainText('Stage 1B new Today item',{timeout:43_000});
  } else {
    await live.getByRole('button',{name:'Refresh now'}).click();
    await expect(live).toContainText('Stage 1B new Today item');
  }
  await expect(live).toContainText('Showing 2 of 2 Folio tasks');

  await folio.bringToFront();
  await addFolioTask(folio,'Stage 1B Inbox item','inbox');
  await page.bringToFront();
  await live.getByRole('button',{name:'Refresh now'}).click();
  await live.getByRole('button',{name:/Inbox/}).click();
  await expect(live).toContainText('Stage 1B Inbox item');
  await expect(live).toContainText('Showing 1 of 1 Folio tasks');
  await expect(live).not.toContainText('Stage 1B actual Today item');
  expect(opened).toBe(1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow,'No horizontal overflow').toBeLessThanOrEqual(1);
  await live.getByRole('button',{name:'Disconnect'}).click();
  expect(await page.evaluate(()=>sessionStorage.getItem('folio:hub:task-read-consent:v1'))).toBeNull();
  await expect(page.locator('[data-folio-live]')).toHaveCount(0);
  await expect(page.locator('iframe[title="Folio local task reader"]')).toHaveCount(0);
  await expect(preview).not.toContainText('Stage 1B Inbox item');
  await folio.close();
});

test('original single-share consent remains one-time; live read is not implicit',async({page})=>{
  await page.goto('/home/tasks/');
  const popupEvent=page.waitForEvent('popup');
  await page.locator('[data-folio-task-preview]').getByRole('button',{name:'Share from Folio'}).click();
  const popup=await popupEvent;
  const modal=popup.getByRole('dialog',{name:'Share today’s Folio summary?'});
  await expect(modal).toBeVisible();
  await popup.getByRole('button',{name:'Share summary once'}).click();
  await page.bringToFront();
  await expect(page.locator('iframe[title="Folio local task reader"]')).toHaveCount(0);
  await expect(page.locator('[data-folio-live]')).toHaveCount(0);
  await popup.close();
});

test('source-owned iframe refuses requests without Folio popup-issued live consent',async({page})=>{
  await page.goto('/home/tasks/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const events=await page.evaluate(async()=>{
    const messages:string[]=[];
    const listener=(event:MessageEvent)=>{
      if(event.origin===location.origin && typeof event.data?.type==='string' &&
        event.data.type.startsWith('thiepn:folio-hub-tasks-read:'))messages.push(event.data.type);
    };
    window.addEventListener('message',listener);
    const iframe=document.createElement('iframe');
    iframe.hidden=true;
    iframe.src='/folio/?hubTasksRead='+('a'.repeat(32));
    document.body.appendChild(iframe);
    await new Promise<void>(resolve=>{iframe.onload=()=>resolve();setTimeout(resolve,1500)});
    iframe.contentWindow?.postMessage({type:'thiepn:folio-hub-tasks-read:v1:read',
      nonce:'a'.repeat(32),requestId:'forged-1'},location.origin);
    await new Promise(resolve=>setTimeout(resolve,350));
    iframe.remove();window.removeEventListener('message',listener);
    return messages;
  });
  expect(events).toEqual([]);
});
