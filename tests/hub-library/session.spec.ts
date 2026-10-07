import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const HUB = 'https://thiepn.dev';
const OWNER = path.resolve(process.env.H16_LIBRARY_DIST ?? '../library/dist/library');
const KEY = 'thiepn:library:hub-consent:v1', INDEX = 'thiepn:library:hub-personal-index:v1';
const catalogue = JSON.parse(fs.readFileSync(path.join(OWNER,'hub/bridge/index.html'),'utf8').match(/data-books="([^"]+)"/)![1]!.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'));
const book = catalogue.find((b: any) => b.format === 'epub');
if (!book) throw new Error('Actual owner catalogue has no EPUB');
const grant = { schemaVersion: 1, deviceId: '11111111-1111-4111-8111-111111111111', revision: '22222222-2222-4222-8222-222222222222', permissions: ['summary','continue','search'], includePersonal: false };
const mime = (p: string) => p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.html') ? 'text/html' : p.endsWith('.json') ? 'application/json' : p.endsWith('.svg') ? 'image/svg+xml' : p.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
async function fixture(page: Page, homePath = '/home/') {
  const calls: string[] = []; let hold = false; let release: () => void = () => {};
  await page.addInitScript(() => {
    (window as any).__requests = []; window.addEventListener('message', e => { if(e.data?.kind === 'read') (window as any).__requests.push(e.data); });
    if (location.pathname.startsWith('/home')) {
      (window as any).__opens = [];
      const open = indexedDB.open.bind(indexedDB);
      indexedDB.open = (...args: Parameters<IDBFactory['open']>) => { (window as any).__opens.push(args[0]); return open(...args); };
      (window as any).__results = [];
      window.addEventListener('message', e => { if (e.data?.kind === 'result') (window as any).__results.push(e.data.envelope); });
    }
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url()); calls.push(url.href);
    if (url.origin !== HUB) return route.abort();
    const isOwner = url.pathname.startsWith('/library/');
    let file = path.join(isOwner ? OWNER : path.resolve('.cache/h16-hub'), isOwner ? url.pathname.slice('/library/'.length) : url.pathname);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
    if (hold && url.pathname === '/library/hub/bridge') await new Promise<void>(r => { release = r; });
    if (fs.existsSync(file)) return route.fulfill({ path: file, contentType: mime(file) });
    return route.fulfill({ status: 404, body: 'Fictional fixture: unavailable' });
  });
  await page.goto(HUB+homePath);
  if (homePath === '/home/') await expect(page.locator('[data-private-library]')).toBeVisible();
  return { calls, hold: () => { hold = true; }, release: () => { hold = false; release(); } };
}
async function seed(page: Page, permissions = grant.permissions, personal = false, version = 9) {
  await page.evaluate(async ({ book, grant, KEY, INDEX, permissions, personal, version }) => {
    localStorage.setItem(KEY, JSON.stringify({ ...grant, permissions, includePersonal: personal }));
    const put = (name: string, version: number, keyPath: string, rows: unknown[]) => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(name, version); open.onupgradeneeded = () => open.result.createObjectStore('progress', { keyPath });
      open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, tx = db.transaction('progress','readwrite'); rows.forEach(row => tx.objectStore('progress').put(row)); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    });
    const updatedAt = new Date(Date.now()-1000).toISOString();
    await put('thiepn-library', version, 'workId', [{ schemaVersion: 2, workId: book.workId, edition: book.edition, releaseVersion: book.releaseVersion, percentage: .2, furthestPercentage: .8, updatedAt, cfi: 'SECRET-CFI', chapterLabel: 'SECRET-CHAPTER' }, ...(personal ? [{ schemaVersion: 2, workId: 'personal:epub-fictional', edition: 1, releaseVersion: `local-${'a'.repeat(64)}`, percentage: .3, furthestPercentage: .4, updatedAt, cfi: 'PERSONAL-CFI' }] : [])]);
    if (personal) {
      localStorage.setItem(INDEX, JSON.stringify([{ workId: 'personal:epub-fictional', title: 'Private fictional import', format: 'epub', edition: 1, releaseVersion: `local-${'a'.repeat(64)}`, slug: 'personal', personalId: 'epub-fictional' }]));
      await new Promise<void>((resolve, reject) => { const open = indexedDB.open('thiepn-library-personal-books',3); open.onupgradeneeded = () => open.result.createObjectStore('books',{keyPath:'id'}); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, tx = db.transaction('books','readwrite'); tx.objectStore('books').put({ id: 'epub-fictional', file: new TextEncoder().encode('SECRET-BOOK-BYTES').buffer }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); }; }; });
    }
  }, { book, grant, KEY, INDEX, permissions, personal, version });
}
async function connect(page: Page) { await page.getByRole('button',{name:'Connect this browser',exact:true}).click(); await expect(page.locator('[data-library-items]')).toContainText(book.title); }
test('Prism Continue hydrates from the real device-local Library provider', async ({page}) => {
  await fixture(page,'/home/prism-preview/');
  await seed(page);
  await page.getByRole('button',{name:'Open THIEPN Account',exact:true}).first().click();
  const connectButton=page.locator('[data-prism-library-connect]');
  await expect(connectButton).toBeVisible();
  await connectButton.click();

  const continuation=page.locator('[data-prism-block-id="block-continue"]');
  await expect(continuation.locator('[data-prism-continue-title]')).toHaveText(book.title);
  await expect(continuation.locator('[data-prism-continue-copy]')).toContainText('Library · 20%');
  const href=await continuation.locator('[data-prism-continue-action]').getAttribute('href');
  expect(href).toContain('/library/hub/continue?');
  expect(href).toContain('release=');
  expect(href).not.toContain('CFI');
  expect(JSON.stringify(await page.evaluate(() => (window as any).__results))).not.toContain('SECRET');
});
test('no automatic owner load or reading-storage access; connection without consent reads nothing', async ({page}) => {
  const f = await fixture(page);
  expect(f.calls.some(u => u.includes('/library/hub/bridge'))).toBe(false);
  expect(await page.evaluate(() => (window as any).__opens)).toEqual([]);
  await page.getByRole('button',{name:'Connect this browser',exact:true}).click();
  await expect(page.locator('[data-library-status]')).toContainText('Choose sharing');
  expect(await page.evaluate(() => (window as any).__results)).toEqual([]);
});
test('actual owner reads metadata, renders current/furthest separately, and search stays out of URLs', async ({page}) => {
  const f = await fixture(page); await seed(page); await connect(page);
  await expect(page.locator('[data-library-items]')).toContainText('Current 20% · furthest 80%');
  const raw = await page.evaluate(() => JSON.stringify((window as any).__results)); expect(raw).not.toContain('SECRET');
  await page.getByRole('searchbox',{name:'Search saved reading titles'}).fill(book.title);
  await page.getByRole('button',{name:'Search Library',exact:true}).click(); await expect(page.locator('[data-library-items]')).toContainText(book.title);
  expect(f.calls.some(u => u.includes(encodeURIComponent(book.title)))).toBe(false);
  expect(await page.evaluate(() => Object.values(localStorage).join('')+Object.values(sessionStorage).join(''))).not.toContain(book.title);
  await page.getByRole('radio',{name:'Continue',exact:true}).check(); await expect(page.locator('[data-library-items]')).toContainText(book.title);
  const href = await page.locator('[data-library-items] a').first().getAttribute('href'); expect(href).toContain('release='); expect(href).not.toContain('CFI');
});
test('search-only permission never reads summary or continue', async ({page}) => {
  await fixture(page); await seed(page,['search']); await page.getByRole('button',{name:'Connect this browser',exact:true}).click();
  await expect(page.locator('[data-library-status]')).toContainText('Connected. Search');
  expect(await page.evaluate(() => (window as any).__results)).toEqual([]);
  await expect(page.getByRole('radio',{name:'Continue',exact:true})).toBeDisabled();
  await page.getByRole('searchbox',{name:'Search saved reading titles'}).fill(book.title); await page.getByRole('button',{name:'Search Library',exact:true}).click(); await expect(page.locator('[data-library-items]')).toContainText(book.title);
});
test('cross-tab revocation immediately removes previous titles and frame', async ({page, context}) => {
  await fixture(page); await seed(page); await connect(page);
  const other = await context.newPage(); await other.route('**/*', r => r.fulfill({contentType:'text/html',body:'<html></html>'})); await other.goto(HUB+'/revoke');
  await other.evaluate(KEY => localStorage.removeItem(KEY), KEY);
  await expect(page.locator('[data-library-items]')).toBeEmpty(); await expect(page.locator('iframe')).toHaveCount(0);
});
test('Hide Home clears results; Show Home and reload do not restore them', async ({page}) => {
  await fixture(page); await seed(page); await connect(page);
  await page.getByRole('button',{name:'Hide Home',exact:true}).click(); await expect(page.locator('[data-library-items]')).toBeEmpty();
  await page.getByRole('button',{name:'Show Home',exact:true}).click(); await expect(page.locator('[data-library-items]')).toBeEmpty();
  await page.reload(); await expect(page.locator('[data-library-items]')).toBeEmpty(); await expect(page.locator('iframe')).toHaveCount(0);
});
test('Hide Home while the owner is loading cancels late connection', async ({page}) => {
  const f = await fixture(page); await seed(page); f.hold(); await page.getByRole('button',{name:'Connect this browser',exact:true}).click();
  await page.getByRole('button',{name:'Hide Home',exact:true}).click(); f.release(); await expect(page.locator('iframe')).toHaveCount(0); await expect(page.locator('[data-library-items]')).toBeEmpty();
});
test('unsupported future DB schema is unavailable, not an empty library', async ({page}) => {
  await fixture(page); await seed(page, grant.permissions, false, 10); await page.getByRole('button',{name:'Connect this browser',exact:true}).click();
  await expect(page.locator('[data-library-status]')).toContainText('could not be checked'); await expect(page.locator('[data-library-items]')).toBeEmpty();
  expect(await page.evaluate(() => (window as any).__results[0].status)).toBe('unsupported');
});
test('imported titles require opt-in and deleted book keys suppress stale metadata', async ({page}) => {
  await fixture(page); await seed(page, grant.permissions, true);
  await page.evaluate(KEY => { const c=JSON.parse(localStorage.getItem(KEY)!); c.includePersonal=false; localStorage.setItem(KEY,JSON.stringify(c)); },KEY);
  await connect(page); await expect(page.locator('[data-library-items]')).not.toContainText('Private fictional import');
  await page.getByRole('button',{name:'Disconnect this tab',exact:true}).click();
  await page.evaluate(KEY => { const c=JSON.parse(localStorage.getItem(KEY)!); c.includePersonal=true; localStorage.setItem(KEY,JSON.stringify(c)); },KEY);
  await connect(page); await expect(page.locator('[data-library-items]')).toContainText('Private fictional import');
  await page.evaluate(async () => { await new Promise<void>(resolve => { const open=indexedDB.open('thiepn-library-personal-books'); open.onsuccess=()=>{ const db=open.result, tx=db.transaction('books','readwrite'); tx.objectStore('books').delete('epub-fictional'); tx.oncomplete=()=>{db.close();resolve();}; }; }); });
  await page.getByRole('button',{name:'Refresh',exact:true}).click(); await expect(page.locator('[data-library-items]')).toContainText(book.title); await expect(page.locator('[data-library-items]')).not.toContainText('Private fictional import');
});
test('stale release cannot silently open the current reader', async ({page}) => {
  await fixture(page); await seed(page);
  await page.goto(HUB+'/library/hub/continue?'+new URLSearchParams({resource:book.workId+':epub',edition:String(book.edition),release:'obsolete-release'}));
  await expect(page.locator('[data-hub-continue]')).toContainText('no longer available'); expect(page.url()).toBe(HUB+'/library/hub/continue');
});
test('owner consent defaults off, persists separate choices and revokes all sharing', async ({page}) => {
  await fixture(page); await page.goto(HUB+'/library/hub');
  const checks = page.locator('[data-hub-consent] input'); for (let i=0;i<4;i++) await expect(checks.nth(i)).not.toBeChecked();
  await page.getByLabel('Continue reading', {exact:true}).check(); await page.getByRole('button',{name:'Save choices',exact:true}).click();
  await expect(page.locator('[data-hub-status]')).toContainText('Choices saved');
  const consent = await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)!),KEY); expect(consent.permissions).toEqual(['continue']); expect(consent.includePersonal).toBe(false);
  await page.getByRole('button',{name:'Revoke all sharing',exact:true}).click(); expect(await page.evaluate(KEY=>localStorage.getItem(KEY),KEY)).toBeNull();
});
test('forged parent-window result does not replace owner progress', async ({page}) => {
  await fixture(page); await seed(page); await connect(page);
  await page.evaluate(() => window.postMessage({protocol:'thiepn-library-hub-v1',kind:'result',channel:'forged',requestId:'forged',envelope:{data:{items:[{title:'FORGED'}]}}},location.origin));
  await expect(page.locator('[data-library-items]')).not.toContainText('FORGED'); await expect(page.locator('[data-library-items]')).toContainText(book.title);
});
test('identity transition erases device results without transferring consent to an account', async ({page}) => {
  await fixture(page); await seed(page); await connect(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'signed-in',id:'different-fictional-owner'}})));
  await expect(page.locator('[data-library-items]')).toBeEmpty(); await expect(page.locator('iframe')).toHaveCount(0);
});
test('absent native databases are empty without persisting new databases', async ({page}) => {
  await fixture(page); await page.evaluate(({KEY,grant})=>localStorage.setItem(KEY,JSON.stringify(grant)),{KEY,grant});
  await page.getByRole('button',{name:'Connect this browser',exact:true}).click(); await expect(page.locator('[data-library-status]')).toContainText('No matching saved progress');
  expect(await page.evaluate(async()=> (await indexedDB.databases()).map(db=>db.name))).toEqual([]);
});
test('native progress events erase the prior snapshot and require reconnection', async ({page}) => {
  await fixture(page); await seed(page); await connect(page);
  await page.evaluate(() => { const channel = new BroadcastChannel('thiepn-library'); channel.postMessage({type:'progress'}); channel.close(); });
  await expect(page.locator('[data-library-items]')).toBeEmpty(); await expect(page.locator('iframe')).toHaveCount(0);
});
test('owner ignores duplicate requests instead of replaying private snapshots', async ({page}) => {
  await fixture(page); await seed(page); await connect(page);
  const replayed = await page.evaluate(async () => {
    const frame = document.querySelector('iframe')!.contentWindow!;
    const request = (frame as any).__requests[0];
    const before = (window as any).__results.length;
    frame.postMessage(request, location.origin);
    await new Promise(resolve=>setTimeout(resolve,150));
    return (window as any).__results.length-before;
  }); expect(replayed).toBe(0);
});
test('exact current release returns to the owner native reader', async ({page}) => {
  await fixture(page); await seed(page); await connect(page);
  const target=page.locator('[data-library-items] a').first(); await target.click(); await expect(page).toHaveURL(HUB+'/library/read/'+book.slug);
});
test('two-minute snapshot expiry removes private titles and the frame', async ({page}) => {
  await fixture(page); await seed(page); await page.clock.install(); await connect(page);
  await page.clock.fastForward(120001); await expect(page.locator('[data-library-items]')).toBeEmpty(); await expect(page.locator('iframe')).toHaveCount(0);
});
test('owner-load deadline fails closed and drops its frame', async ({page}) => {
  const f=await fixture(page); await seed(page); f.hold(); await page.getByRole('button',{name:'Connect this browser',exact:true}).click();
  await expect(page.locator('[data-library-status]')).toContainText('Choose sharing'); await expect(page.locator('iframe')).toHaveCount(0); f.release();
});
