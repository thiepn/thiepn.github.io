import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hubOrigin='https://thiepn.dev', accountOrigin='https://account.thiepn.dev', issuer='https://hycegznamzjhwinegaai.supabase.co';
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
const prefs=(pins:string[])=>JSON.stringify({version:1,pins,density:'compact'});
const accountDist=process.env.H2_ACCOUNT_DIST;
if(!accountDist) throw new Error('Set H2_ACCOUNT_DIST to the paired Account production build (VITE_SUPABASE_URL must match the canonical project).');
const mime=(file:string)=>file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.html')?'text/html':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'application/octet-stream';
async function fixture(page:Page) {
  let subject=a, userFailure=false, logoutFailure=false, challenge='', tokenExchanges=0;
  const requests:string[]=[];
  await page.route('**/*',async route=>{
    const request=route.request(); const url=new URL(request.url()); requests.push(request.url());
    if(url.origin===issuer){
      if(url.pathname.endsWith('/authorize')){challenge=url.searchParams.get('code_challenge')!;return route.fulfill({contentType:'text/html',body:`<script>location.replace(${JSON.stringify(url.searchParams.get('redirect_to')!+'&code=fixture-once')})</script>`});}
      if(url.pathname.endsWith('/token')){
        tokenExchanges++;
        const body=request.postDataJSON();
        expect(crypto.createHash('sha256').update(body.code_verifier).digest('base64url')).toBe(challenge);
        const exp=Math.floor(Date.now()/1000)+3600;
        const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:subject,exp,iat:exp-3600,aud:'authenticated',role:'authenticated',session_id:subject})).toString('base64url'),'fixture-signature'].join('.');
        return route.fulfill({json:{access_token:token,refresh_token:'fixture-refresh-'+subject,token_type:'bearer',expires_in:3600,expires_at:exp,user:{id:subject,email:subject===a?'a@example.test':'b@example.test',app_metadata:{},user_metadata:{},aud:'authenticated',created_at:'2026-01-01T00:00:00Z'}}});
      }
      if(url.pathname.endsWith('/user')) return route.fulfill({status:userFailure?503:200,json:userFailure?{message:'Fixture unavailable'}:{id:subject,email:subject===a?'a@example.test':'b@example.test',app_metadata:{},user_metadata:{},aud:'authenticated',created_at:'2026-01-01T00:00:00Z'}});
      if(url.pathname.endsWith('/logout')) return route.fulfill({status:logoutFailure?500:204,json:logoutFailure?{message:'Unavailable'}:undefined});
      return route.fulfill({status:404,json:{message:'Unsupported fixture endpoint'}});
    }
    if(url.origin===hubOrigin||url.origin===accountOrigin){
      const root=url.origin===hubOrigin?path.resolve('dist'):accountDist!;
      let file=path.join(root,decodeURIComponent(url.pathname));
      if(url.origin===accountOrigin && !fs.existsSync(file)) file=path.join(root,'index.html');
      if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      if(fs.existsSync(file))return route.fulfill({path:file,contentType:mime(file)});
      return route.fulfill({status:404,body:'Fixture file missing'});
    }
    return route.abort();
  });
  return {requests, setUser:(id:string)=>{subject=id;}, failUser:()=>{userFailure=true;}, failLogout:()=>{logoutFailure=true;}, exchanges:()=>tokenExchanges};
}
async function login(page:Page, label='Sign in') {
  await page.getByRole('button',{name:label,exact:true}).focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(accountOrigin+'/hub/entry');
  await expect(page.getByRole('heading',{name:'Sign in to THIEPN Hub'})).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('thiepn:hub-auth')))).toBe(false);
  await page.getByRole('link',{name:'Continue with Google'}).focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(hubOrigin+'/home/');
}
test('real SDK PKCE through Account entry, isolated account preferences and local sign-out',async({page})=>{
  const f=await fixture(page);
  await page.addInitScript(({a,b,guest,pa,pb})=>{if(location.origin==='https://thiepn.dev'){localStorage.setItem('thiepn:hub-preferences',guest);localStorage.setItem(`thiepn:hub-preferences:user:${a}:v1`,pa);localStorage.setItem(`thiepn:hub-preferences:user:${b}:v1`,pb);localStorage.setItem('notes:sentinel','keep');}}, {a,b,guest:prefs(['mathlab']),pa:prefs(['notes']),pb:prefs(['tms60'])});
  await page.goto(hubOrigin+'/home/');
  await expect(page.locator('[data-pin-list] a')).toHaveCount(1);
  await expect(page.locator('[data-pin-list] a')).toHaveAttribute('data-pin-slug','mathlab');
  await login(page);
  await expect(page.locator('[data-auth-status]')).toContainText('a@example.test');
  await expect(page.locator('[data-pin-list] a')).toHaveAttribute('data-pin-slug','notes');
  expect(await page.evaluate(()=>localStorage.getItem('notes:sentinel'))).toBe('keep');
  f.setUser(b); await login(page,'Switch account');
  await expect(page.locator('[data-auth-status]')).toContainText('b@example.test');
  await expect(page.locator('[data-pin-list] a')).toHaveAttribute('data-pin-slug','tms60');
  await page.getByRole('button',{name:'Sign out of Hub'}).click();
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  await expect(page.locator('[data-pin-list] a')).toHaveAttribute('data-pin-slug','mathlab');
  expect(f.exchanges()).toBe(2);
  expect(f.requests.some(url=>/access_token|refresh_token|code_verifier/.test(url))).toBe(false);
});
test('forged callback and expired nonce never exchange a code or disclose account preferences',async({page})=>{
  const f=await fixture(page);
  await page.goto(hubOrigin+'/home/auth/callback/?code=forged&flow='+'a'.repeat(64));
  await expect(page.locator('[data-auth-status]')).toContainText('missing, expired or already used');
  expect(page.url()).toBe(hubOrigin+'/home/auth/callback/'); expect(f.exchanges()).toBe(0);
});
test('unverified session hides previous account pins and does not accept foreign identity messages',async({page})=>{
  const f=await fixture(page);await page.goto(hubOrigin+'/home/');await login(page);
  await page.getByRole('button',{name:'Customize',exact:true}).click();
  while(await page.locator('[data-pin-choice]:checked').count()) await page.locator('[data-pin-choice]:checked').first().uncheck();
  await page.locator('[data-pin-choice][value="notes"]').check();await page.keyboard.press('Escape');
  f.failUser();await page.reload();
  await expect(page.locator('[data-auth-status]')).toContainText('unavailable');
  await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeDisabled();
  await page.evaluate(()=>window.postMessage({type:'hub:identity',id:'22222222-2222-4222-8222-222222222222'},'*'));
  await expect(page.locator('[data-pin-list] a')).not.toHaveCount(1);
});
test('Account rejects an attacker destination in the actual built entry route',async({page})=>{
  await fixture(page);
  await page.goto(accountOrigin+'/hub/entry?request='+encodeURIComponent('https://evil.test/authorize'));
  await expect(page.getByRole('heading',{name:'This Hub sign-in request is invalid.'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Continue with Google'})).toHaveCount(0);
  expect(page.url()).toBe(accountOrigin+'/hub/entry');
});

test('same-origin Hub tabs clear account identity after local sign-out',async({page,context})=>{
  await fixture(page);await page.goto(hubOrigin+'/home/');await login(page);
  const other=await context.newPage();await fixture(other);await other.goto(hubOrigin+'/home/');
  await expect(other.locator('[data-auth-status]')).toContainText('a@example.test');
  await page.getByRole('button',{name:'Sign out of Hub'}).click();
  await expect(other.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
});
test('cancelled account switch cannot restore the previous signed-in state',async({page})=>{
  await fixture(page);await page.goto(hubOrigin+'/home/');await login(page);
  await page.getByRole('button',{name:'Switch account',exact:true}).click();
  await expect(page.getByRole('link',{name:'Return to Hub'})).toBeVisible();
  await page.getByRole('link',{name:'Return to Hub'}).click();
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Switch account',exact:true})).toBeHidden();
});
test('blocked browser storage prevents an unsafe OAuth round trip',async({page})=>{
  await fixture(page);await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
  await page.goto(hubOrigin+'/home/');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.locator('[data-auth-status]')).toContainText('Check browser storage');
  expect(page.url()).toBe(hubOrigin+'/home/');
});
test('sign-out failure hides account preferences and reports an unconfirmed sign-out',async({page})=>{
  const f=await fixture(page);await page.goto(hubOrigin+'/home/');await login(page);f.failLogout();
  await page.getByRole('button',{name:'Sign out of Hub'}).click();
  await expect(page.locator('[data-auth-status]')).toContainText('could not be confirmed');
  await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeDisabled();
});
for(const width of [320,1440])test(`Account entry and signed-in Home reflow at ${width}`,async({page})=>{
  await fixture(page);await page.setViewportSize({width,height:900});await page.goto(hubOrigin+'/home/');
  await login(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:`.cache/h2-home-${width}.png`});
  if(process.env.H2_AXE_PATH){await page.addScriptTag({content:fs.readFileSync(process.env.H2_AXE_PATH,'utf8')});expect(await page.evaluate(async()=>{const result=await (window as any).axe.run();return result.violations.map((v:any)=>({id:v.id,impact:v.impact}));})).toEqual([]);}
  await page.getByRole('button',{name:'Switch account',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in to THIEPN Hub'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:`.cache/h2-account-${width}.png`});
  if(process.env.H2_AXE_PATH){await page.addScriptTag({content:fs.readFileSync(process.env.H2_AXE_PATH,'utf8')});expect(await page.evaluate(async()=>{const result=await (window as any).axe.run();return result.violations.map((v:any)=>({id:v.id,impact:v.impact}));})).toEqual([]);}
});

test('H4 daily view and timezone stay partitioned across guest, A, B and sign-out',async({page})=>{
  const f=await fixture(page);
  const view=(pins:string[],modules:string[],timezone:string,mode='today',focus='study')=>JSON.stringify({version:1,pins,density:'compact',home:{modules,timezone,mode,focus,hidden:false}});
  await page.addInitScript(({a,b,guest,pa,pb})=>{if(location.origin==='https://thiepn.dev'){localStorage.setItem('thiepn:hub-preferences',guest);localStorage.setItem(`thiepn:hub-preferences:user:${a}:v1`,pa);localStorage.setItem(`thiepn:hub-preferences:user:${b}:v1`,pb);}}, {a,b,guest:view(['mathlab'],['today'],'UTC'),pa:view(['notes'],['today','faith','study'],'Europe/Berlin','focus','faith'),pb:view(['tms60'],['routines'],'Asia/Seoul')});
  const visible=()=>page.locator('[data-home-module]:visible').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.homeModule));
  await page.goto(hubOrigin+'/home/');await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();expect(await visible()).toEqual(['today']);
  await login(page);await expect(page.locator('[data-auth-status]')).toContainText('a@example.test');expect(await visible()).toEqual(['today','faith']);await expect(page.locator('[data-day-zone]')).toHaveText('Europe/Berlin');
  f.setUser(b);await login(page,'Switch account');await expect(page.locator('[data-auth-status]')).toContainText('b@example.test');expect(await visible()).toEqual(['routines']);
  await page.getByRole('button',{name:'Customize',exact:true}).click();await expect(page.locator('[data-home-timezone]')).toHaveValue('Asia/Seoul');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Sign out of Hub'}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();expect(await visible()).toEqual(['today']);await expect(page.locator('[data-day-zone]')).toHaveText('UTC');
  expect(f.requests.some(url=>/rest\/v1|hub\/summary/.test(url))).toBe(false);
});
test('H4 privacy stays held during session re-verification and unverified view reset',async({page})=>{
  const f=await fixture(page);await page.goto(hubOrigin+'/home/');await login(page);
  await page.getByRole('button',{name:'Hide Home',exact:true}).click();f.failUser();
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('[data-auth-status]')).toContainText('unavailable');
  await expect(page.locator('[data-home-personal]:visible')).toHaveCount(0);
  await expect(page.getByRole('radio',{name:'Focus',exact:true})).toBeHidden();
  await page.getByRole('button',{name:'Show Home',exact:true}).click();
  await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeDisabled();
  await expect(page.getByRole('radio',{name:'Focus',exact:true})).toBeDisabled();
});

test('H5 verified Hub identity does not grant private Search or Inbox access', async ({ page }) => {
  const f = await fixture(page); await page.goto(hubOrigin + '/home/'); await login(page);
  await page.goto(hubOrigin + '/inbox/'); await expect(page.locator('[data-auth-status]')).toContainText('a@example.test');
  await expect(page.locator('[data-inbox-items]')).toBeEmpty(); await expect(page.locator('.portal-inbox-footer')).toContainText('No unread total');
  await page.getByRole('button', { name: 'Hide Inbox', exact: true }).click(); await expect(page.locator('[data-hub-account]')).toBeHidden();
  await page.getByRole('button', { name: 'Show Inbox', exact: true }).click(); await page.getByRole('button', { name: 'Sign out of Hub', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible(); await expect(page.locator('[data-inbox-items]')).toBeEmpty();
  await page.goto(hubOrigin + '/search/?scope=resources'); await expect(page.locator('[data-portal-query]')).toBeHidden();
  expect(f.requests.some(url => /hub\/(search|inbox)|rest\/v1/.test(url))).toBe(false);
});
