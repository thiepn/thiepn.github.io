import {test,expect} from '@playwright/test';
for(const path of ['/?mode=workspace','/home/','/home/knowledge/','/apps/']){
 test('320px Hub route has no genuine horizontal overflow '+path,async({page})=>{
  await page.setViewportSize({width:320,height:960});
  await page.goto(path);
  if(path!=='/apps/')await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const issue=await page.evaluate(()=>{
   const width=document.documentElement.clientWidth;
   const offenders=[...document.querySelectorAll<HTMLElement>('body *')].filter(el=>{
    const box=el.getBoundingClientRect(),style=getComputedStyle(el);
    return style.display!=='none'&&style.visibility!=='hidden'&&style.position!=='fixed'&&
      box.width>0&&box.height>0&&box.right>width+1&&box.left<width&&box.bottom>0;
   }).sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right).slice(0,15).map(el=>{
    const r=el.getBoundingClientRect();
    return {tag:el.tagName,cls:String(el.className).slice(0,100),right:Math.round(r.right),left:Math.round(r.left),width:Math.round(r.width),text:el.textContent?.trim().slice(0,45)};
   });
   return {width,scroll:document.documentElement.scrollWidth,offenders};
  });
  expect(issue.scroll,JSON.stringify(issue)).toBeLessThanOrEqual(320);
 });
}
