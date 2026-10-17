import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { renderAcademic, parseAcademic } from '../../src/lib/workspace/study-academic-read';

const origin = 'https://study.thiepn.dev';
const course = '11111111-1111-4111-8111-111111111111';
const skill = '22222222-2222-4222-8222-222222222222';
const assignment = '33333333-3333-4333-8333-333333333333';
const T = Date.parse('2026-10-17T12:01:00Z');
const css = readFileSync('src/styles/hub-studyos-c1.css','utf8');
function source() {
  return {
    schema:'study-hub-summary', schemaVersion:1,
    generatedAt:'2026-10-17T12:00:00Z', expiresAt:'2026-10-17T12:05:00Z',
    semester:{id:'44444444-4444-4444-8444-444444444444',name:'WS 2026',timezone:'Europe/Berlin'},
    coverage:{status:'partial',reasons:['reviews_cap'],from:'2026-10-17',days:7,
      truncated:true,calendarCoverage:'not_included',academicCandidates:'not_published'},
    courses:[{source:'studyos',courseId:course,name:'Differentialgleichungen',
      shortName:'DGL',sortOrder:1,examAt:'2026-11-15T10:00:00Z',
      examVerification:'owner_configured',durableMasteryPercent:42,totalSkills:24,
      unresolvedErrors:3,sourceRoute:'/courses/'+course}],
    exams:[{source:'studyos',courseId:course,courseName:'Differentialgleichungen',
      examAt:'2026-11-15T10:00:00Z',verification:'owner_configured',sourceRoute:'/courses/'+course}],
    commitments:[
      {source:'studyos',commitmentId:assignment,courseId:course,resourceId:null,
        title:'University assignment <img onerror=alert(1)>',kind:'assignment',
        dueAt:'2026-10-17T21:30:00Z',estimatedMinutes:90,priority:3,status:'open',
        originalUpdatedAt:'2026-10-16T12:00:00Z',calendarIdentity:null,
        sourceRoute:'/courses/'+course},
      {source:'studyos',commitmentId:'55555555-5555-4555-8555-555555555555',
        courseId:course,resourceId:null,title:'Previously due work',kind:'assignment',
        dueAt:'2026-10-15T13:00:00Z',estimatedMinutes:30,priority:1,status:'open',
        originalUpdatedAt:'2026-10-15T16:00:00Z',calendarIdentity:null,
        sourceRoute:'/courses/'+course}
    ],
    reviews:{dueSkillCount:1,actionableSkillCount:1,budgetMinutes:40,
      items:[{source:'studyos',skillId:skill,courseId:course,title:'Variation der Konstanten',
        nextReviewAt:'2026-10-17T08:00:00Z',priorityScore:10,actionable:true,
        sourceRoute:'/practice?mode=repair&course='+course+'&skill='+skill}]},
    candidates:[]
  };
}
function markup(kind:'ready'|'unavailable'|'stale'|'signed-out', mode:'today'|'week') {
  const data = parseAcademic(source(),T);
  const state = kind === 'ready' ? {kind:'ready' as const,data} : {kind};
  return renderAcademic(state,origin,mode,T);
}
async function render(page:import('@playwright/test').Page, html:string, width=1440){
  // about:blank has an opaque origin and forbids localStorage. A fully intercepted,
  // non-public fixture origin makes read-only browser-storage assertions meaningful.
  await page.route('https://c1-offline.test/blank', route=>route.fulfill({
    status:200,contentType:'text/html',body:'<!doctype html><title>StudyOS C1 offline fixture</title>'
  }));
  await page.goto('https://c1-offline.test/blank');
  await page.setViewportSize({width,height:844});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>'+
    '<style>*,*:before,*:after{box-sizing:border-box}body{margin:0;padding:16px;font:14px Arial,sans-serif}main{max-width:100%;margin:auto}'+css+'</style>'+
    '</head><body><main data-workspace><div data-hub-study-panel>'+html+'</div></main></body></html>');
}

test('C1-B desktop source-owner projection: exam, overdue, original repair, no local writers',async({page})=>{
  await render(page,markup('ready','week'),1440);
  const panel=page.getByRole('region',{name:'StudyOS academic overview'});
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading',{name:'Study in your week'})).toBeVisible();
  await expect(panel.getByText('Partial academic coverage: reviews_cap')).toBeVisible();
  await expect(panel.getByText('Previously due work')).toBeVisible();
  await expect(panel.getByRole('heading',{name:'Later configured exams'})).toBeVisible();
  await expect(panel.getByText('42% durable mastery')).toBeVisible();
  await expect(panel.locator('img')).toHaveCount(0);
  await expect(panel.locator('a[href*="/practice?mode=repair"]')).toHaveCount(1);
  expect(await panel.locator('a[href*="/practice?mode=repair"]').first().getAttribute('href'))
    .toBe(origin+'/practice?mode=repair&course='+course+'&skill='+skill);
  await expect(panel.locator('[data-task-toggle], [data-action="save-task"], form')).toHaveCount(0);
  const store=await page.evaluate(()=>({local:localStorage.length,db:sessionStorage.length}));
  expect(store).toEqual({local:0,db:0});
});
test('C1-B stale, signed-out, unavailable states do not leak academic details',async({page})=>{
  for(const state of ['stale','signed-out','unavailable'] as const){
    await render(page,markup(state,'today'),1440);
    await expect(page.getByRole('region',{name:'StudyOS academic overview'})).toBeVisible();
    await expect(page.getByText('Variation der Konstanten')).toHaveCount(0);
    await expect(page.locator('[href*="/practice"]')).toHaveCount(0);
    await expect(page.locator('[data-action="study-connect"]')).toHaveCount(1);
  }
});
test('C1-B synthetic smartphone 390px Today and Week are readable without horizontal overflow @mobile-cert',async({page})=>{
  for(const mode of ['today','week'] as const){
    await render(page,markup('ready',mode),390);
    await expect(page.getByRole('region',{name:'StudyOS academic overview'})).toBeVisible();
    await expect(page.getByRole('heading',{name:/University today|Study in your week/})).toBeVisible();
    await expect(page.getByText('Variation der Konstanten')).toBeVisible();
    const metrics=await page.evaluate(()=>({
      doc:document.documentElement.scrollWidth,inner:innerWidth,
      col:getComputedStyle(document.querySelector('.ws-study-c1-grid')!).gridTemplateColumns,
      detail:!!document.querySelector('a[href*="mode=repair"]')
    }));
    expect(metrics.doc).toBeLessThanOrEqual(metrics.inner);
    expect(metrics.detail).toBe(true);
    await page.screenshot({path:'test-results/studyos-c1-'+mode+'-mobile.png',fullPage:true});
  }
});
