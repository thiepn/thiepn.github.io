import {test,expect} from '@playwright/test';
import manifest from '../../src/generated/launch-manifest.json' with {type:'json'};

test('retired Folio and Notes are not duplicate dashboard cards; Hub note remains editable',async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?mode=workspace');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const brief=page.locator('[data-native-overview]');
  await expect(brief).toBeVisible();
  await expect(brief.locator('[data-folio-device]')).toHaveCount(0);
  await expect(brief.locator('[data-notes-source]')).toHaveCount(0);
  await expect(brief.getByRole('heading',{name:'Tasks',exact:true})).toBeVisible();
  await expect(brief.getByRole('heading',{name:'Agenda',exact:true})).toBeVisible();
  await expect(brief.getByRole('heading',{name:'Habits & trackers'})).toBeVisible();
  await brief.locator('[data-action="brief-capture"]').click();
  await page.getByLabel('Title',{exact:true}).fill('Original Hub note 11');
  await page.getByLabel('Note',{exact:true}).fill('<private> preserved only in Hub');
  await page.locator('[data-dialog-submit]').click();
  await expect(brief).toContainText('Original Hub note 11');
  await brief.getByRole('link',{name:'Knowledge',exact:true}).click();
  await expect(page).toHaveURL(/\/home\/knowledge\//);
  await expect(page.locator('[data-hub-knowledge]')).toContainText('Original Hub note 11');
  await expect(page.locator('[data-hub-knowledge]')).toContainText('<private> preserved only in Hub');
  await page.reload();
  await expect(page.locator('[data-hub-knowledge]')).toContainText('Original Hub note 11');
});

test('catalogue retires Notes only at presentation while preserving original launch manifest',async ({page})=>{
  const legacy=manifest.entries.find(e=>e.id==='notes');
  expect(legacy).toBeDefined();
  expect(legacy?.url).toBe('https://thiepn.dev/notes/');
  expect(legacy?.moduleRef).toBe('folio/notes');
  expect(manifest.entries).toHaveLength(31);
  await page.goto('/apps/');
  await expect(page.locator('[data-hub-item]')).toHaveCount(manifest.entries.length-1);
  const apps=JSON.parse((await page.locator('[data-workspace-apps]').textContent())||'[]') as {id:string}[];
  expect(apps.map(a=>a.id)).toEqual(manifest.entries.filter(e=>e.id!=='notes').map(e=>e.id));
  await expect(page.locator('[data-hub-current-app]')).toHaveCount(12);
});

test('legacy recovery requires explicit navigation and retains all historical deep links',async ({page})=>{
  await page.goto('/home/legacy/');
  const legacy=page.locator('[data-hub-legacy-recovery]');
  await expect(legacy).toBeVisible();
  await expect(legacy.getByRole('link',{name:'Original standalone Notes'})).toHaveAttribute('href','/notes/');
  await expect(legacy.getByRole('link',{name:'Original Folio Today'})).toHaveAttribute('href','/folio/?view=today');
  await expect(legacy.getByRole('link',{name:'Original Folio Planner'})).toHaveAttribute('href','/folio/?view=planner');
  await expect(legacy.getByRole('link',{name:'Original Folio Notes'})).toHaveAttribute('href','/folio/?view=notes');
  await expect(legacy.getByRole('link',{name:'Original Folio Habits'})).toHaveAttribute('href','/folio/?view=habits');
  await expect(legacy).toContainText('not been moved or deleted');
  await expect(legacy).toContainText('encrypted KEEP editing remains under review');
});
