import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('FD1 source-owned Folio habit action needs a second popup approval and uses nonce-only URL',async({page,context})=>{
  const snapshotBody = `<!doctype html><html><body><button id="source-share">Share original owner summary once</button><script>
  document.querySelector('#source-share').onclick=()=>{
    const nonce=new URL(location.href).searchParams.get('hubBridge');
    window.opener.postMessage({type:'thiepn:folio-hub-daily:v1',nonce,
      snapshot:{schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
      generatedAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10),
      pendingCount:0,overdueCount:0,tasks:[],events:[],notes:[],
      habits:[{id:'original-habit-1',title:'Practice',target:1,value:0,status:'open',
        updatedAt:new Date().toISOString()}]}},location.origin)
  }</script></body></html>`;
  const actionBody = `<!doctype html><html><body>
    <h1>Original Folio user approval required</h1><button id="approve" disabled>Approve in Folio</button>
    <script>
    const nonce=new URL(location.href).searchParams.get('fd1Action');
    window.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==window.opener||
         event.data?.type!=='thiepn:folio-fd1-command:v1'||event.data.nonce!==nonce)return;
      window.command=event.data.command;
      document.querySelector('#approve').disabled=false;
    });
    setTimeout(()=>window.opener.postMessage({type:'thiepn:folio-fd1-ready:v1',nonce},location.origin),50);
    document.querySelector('#approve').onclick=()=>{
      window.opener.postMessage({type:'thiepn:folio-fd1-receipt:v1',nonce,
        receipt:{idempotencyKey:nonce,resourceId:window.command.resourceId,
        operation:window.command.operation,result:'applied'},
        observedAt:new Date().toISOString()},location.origin);
    };
    </script></body></html>`;
  await context.route('**/folio/?hubBridge=*',route=>route.fulfill({contentType:'text/html',body:snapshotBody}));
  await context.route('**/folio/?fd1Action=*',route=>route.fulfill({contentType:'text/html',body:actionBody}));
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const sharePopupPromise=page.waitForEvent('popup');
  await page.locator('[data-folio-device] [data-action=connect-folio]').click();
  const sharePopup=await sharePopupPromise;
  await sharePopup.locator('#source-share').click();
  await expect(page.locator('[data-faith-discipline]')).toContainText('Practice');
  const action=page.locator('[data-faith-discipline] [data-fd1-folio-operation="habit.complete"]');
  await expect(action).toBeVisible();
  const actionPopupPromise=page.waitForEvent('popup');
  await action.click();
  const actionPopup=await actionPopupPromise;
  const url=new URL(actionPopup.url());
  expect(url.searchParams.has('fd1Action')).toBe(true);
  expect(url.searchParams.has('resourceId')).toBe(false);
  expect(url.searchParams.has('fd1_rev')).toBe(false);
  expect(url.search).not.toContain('original-habit-1');
  await expect(actionPopup.locator('#approve')).toBeEnabled();
  await expect(page.locator('[data-fd1-folio-receipt]')).not.toContainText('action applied');
  await page.evaluate(()=>window.postMessage({type:'thiepn:folio-fd1-receipt:v1',
    nonce:'00000000000000000000000000000000',receipt:{result:'applied'}},location.origin));
  await expect(page.locator('[data-fd1-folio-receipt]')).not.toContainText('action applied');
  await actionPopup.locator('#approve').click();
  await expect(page.locator('[data-fd1-folio-receipt]')).toContainText('action applied');
  await Promise.all([sharePopup.close(),actionPopup.close()]);
});
