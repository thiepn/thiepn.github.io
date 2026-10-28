import {test,expect,type Page} from '@playwright/test';

// WCAG 1.4.11: UI component boundaries need a 3:1 difference from their
// adjacent surfaces; primary-button labels need the 4.5:1 text threshold.
const luminance=(color:string)=>{
 const v=color.match(/[\d.]+/g)?.slice(0,3).map(Number);
 if(!v||v.length!==3)throw new Error('Expected rgb control colour: '+color);
 const c=v.map(x=>{const n=x/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;});
 return c[0]!*0.2126+c[1]!*0.7152+c[2]!*0.0722;
};
const contrast=(a:string,b:string)=>{
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
};
async function scheme(page:Page,dark:boolean){
 await page.evaluate(value=>document.documentElement.setAttribute('data-theme',value),dark?'dark':'light');
}
async function visual(page:Page,selector:string){
 return page.locator(selector).first().evaluate(el=>{
   const c=getComputedStyle(el);
   const shell=getComputedStyle(document.documentElement);
   return {border:c.borderTopColor,background:c.backgroundColor,color:c.color,
     opacity:c.opacity,borderWidth:c.borderTopWidth,
     surface:shell.getPropertyValue('--ws-surface').trim()};
 });
}

test('real Hub search and capture controls have visible borders, legible primary labels and keyboard focus at phone/tablet/desktop widths',async({page})=>{
 for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:844});
   await page.goto('/?mode=workspace');
   const search=page.locator('.ws-search-trigger');
   const primary=page.locator('.ws-topbar-actions>.ws-primary');
   await expect(search).toBeVisible();
   await expect(primary).toBeVisible();
   for(const dark of [false,true]){
     await scheme(page,dark);
     const secondary=await visual(page,'.ws-search-trigger');
     const main=await visual(page,'.ws-topbar-actions>.ws-primary');
     expect(secondary.borderWidth,'search border at '+width).toBe('1px');
     expect(contrast(secondary.border,secondary.background),'search border/fill '+width+' dark='+dark).toBeGreaterThanOrEqual(3);
     expect(contrast(secondary.border,secondary.surface),'search border/panel '+width+' dark='+dark).toBeGreaterThanOrEqual(3);
     expect(contrast(main.color,main.background),'primary label '+width+' dark='+dark).toBeGreaterThanOrEqual(4.5);
     await page.keyboard.press('Tab');
     await search.focus();
     const outline=await search.evaluate(el=>{const s=getComputedStyle(el);return {style:s.outlineStyle,width:parseFloat(s.outlineWidth)};});
     expect(outline.style).toBe('solid');
     expect(outline.width).toBeGreaterThanOrEqual(2);
     const box=await search.boundingBox();
     expect(box,'search is reachable at '+width).not.toBeNull();
     expect(box!.x).toBeGreaterThanOrEqual(-1);
     expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
   }
   await search.click();
   await expect(page.locator('[data-search-dialog]')).toBeVisible();
   await page.locator('[data-action=close-search]').first().click();
   await expect(page.locator('[data-search-dialog]')).not.toBeVisible();
 }
});

test('native secondary and disabled actions remain distinguishable in both themes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?mode=workspace');
 await expect(page.locator('.ws-toolbar .ws-button').first()).toBeVisible();
 for(const dark of [false,true]){
   await scheme(page,dark);
   const secondary=await visual(page,'.ws-toolbar .ws-button');
   expect(contrast(secondary.border,secondary.background),'toolbar control dark='+dark).toBeGreaterThanOrEqual(3);
   const disabled=await page.locator('.ws-toolbar .ws-button').first().evaluate(el=>{
     const clone=el.cloneNode(true) as HTMLButtonElement;
     clone.disabled=true;
     clone.style.position='fixed';clone.style.top='-200px';
     el.parentElement!.appendChild(clone);
     const c=getComputedStyle(clone);
     const values={border:c.borderTopColor,background:c.backgroundColor,opacity:c.opacity};
     clone.remove();
     return values;
   });
   expect(disabled.opacity).toBe('1');
   expect(contrast(disabled.border,secondary.surface),'disabled still bounded dark='+dark).toBeGreaterThanOrEqual(3);
 }
 await page.locator('.ws-toolbar [data-action=customize]').first().click();
 await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.locator('.ws-toolbar [data-action=customize]')).toBeVisible();
});

test('actual Today mode switch has distinct visible controls while panel divider tokens remain quiet',async({page})=>{
 await page.setViewportSize({width:320,height:720});
 await page.goto('/');
 const modes=page.locator('.ws-mode-bar button');
 await expect(modes.first()).toBeVisible();
 for(const dark of [false,true]){
   await scheme(page,dark);
   const mode=await visual(page,'.ws-mode-bar button');
   expect(contrast(mode.border,mode.background)).toBeGreaterThanOrEqual(3);
   const divider=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--ws-line').trim());
   expect(divider).toBe(dark?'#334052':'#e6ebf2');
 }
 await expect(page.locator('.ws-mode-bar button[aria-pressed=true]')).toHaveCount(1);
});
