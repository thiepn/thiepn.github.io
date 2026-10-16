import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('native Notes owner-consent summary is private, source-bound and mobile readable',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});
  await context.route('**/notes/?hubNotes=*',route=>route.fulfill({
    status:200,contentType:'text/html',body:"<!doctype html><html><body><button id=\"consent\">Share Notes overview once</button><script>\ndocument.querySelector('#consent').addEventListener('click', () => {\n  window.opener.postMessage({\n    type:'thiepn:notes-hub-local:v1',\n    nonce:new URL(location.href).searchParams.get('hubNotes'),\n    snapshot:{\n      schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',\n      generatedAt:new Date().toISOString(),activeCount:1,\n      notes:[{id:'note-1',title:'Notes-owned <lecture>',updatedAt:new Date().toISOString(),pinned:true}],\n      reminders:[{id:'reminder-1',noteId:'note-1',title:'Notes-owned <lecture>',dueAt:new Date(Date.now()+3600000).toISOString()}]\n    }\n  },location.origin);\n});\n</script></body></html>"
  }));
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(page.locator('[data-notes-source]')).toContainText('Share from Notes');
  const opening=page.waitForEvent('popup');
  await page.locator('[data-notes-source] [data-action=connect-notes-source]').click();
  const popup=await opening;
  await expect(page.locator('[data-notes-source]')).toContainText('Review the sharing request');
  await page.evaluate(()=>window.postMessage({type:'thiepn:notes-hub-local:v1',nonce:'fake',snapshot:{}},location.origin));
  await expect(page.locator('[data-notes-source]')).not.toContainText('Notes-owned');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'checking'}})));
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'signed-out'}})));
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await popup.getByRole('button',{name:'Share Notes overview once'}).click();
  await expect(page.locator('[data-notes-source]')).toContainText('Notes-owned <lecture>');
  await expect(page.locator('[data-notes-source]')).toContainText('Active reminders');
  await expect(page.locator('[data-notes-source]')).toContainText('1 active Notes items');
  await expect(page.locator('[data-notes-source]')).toContainText('not live sync');
  const escaped=await page.locator('[data-notes-source]').evaluate(el=>el.querySelectorAll('lecture,script').length);
  expect(escaped).toBe(0);
  await page.locator('[data-notes-source] [data-action=clear-notes-source]').click();
  await expect(page.locator('[data-notes-source]')).not.toContainText('Notes-owned');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await popup.close();
});
