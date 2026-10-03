import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const HUB='https://thiepn.dev',ACCOUNT='https://account.thiepn.dev',ISSUER='https://hycegznamzjhwinegaai.supabase.co',PLATFORM='https://platform-fictional.vercel.app';
const A='11111111-1111-4111-8111-111111111111',CLIENT='33333333-3333-4333-8333-333333333333',REV='44444444-4444-4444-8444-444444444444';
const token=(managed=false)=>'eyJhbGciOiJFUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:A,iss:ISSUER+'/auth/v1',aud:'authenticated',role:'authenticated',session_id:REV,exp:Math.floor(Date.now()/1000)+3600,...(managed?{client_id:CLIENT}:{})})).toString('base64url')+'.fictional_signature';
const user={id:A,email:'fictional@example.test',aud:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const mime=(p:string)=>p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.woff2')?'font/woff2':'application/octet-stream';
async function fixture(page:Page,permissions=['notes.hub.summary.read','notes.hub.search.read','notes.hub.continue.read']){
  let state='',challenge='',denied=false,held=false,release!:()=>void,expires=300000;
  const managedToken=token(true),managedExpiry=JSON.parse(Buffer.from(managedToken.split('.')[1]!,'base64url').toString()).exp*1000;
  const calls:{url:string;body:string|null}[]=[];
  await page.addInitScript(({HUB,ACCOUNT,user,bearer})=>{
    const session={access_token:bearer,refresh_token:'identity_refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
    if(location.origin===HUB&&!localStorage.getItem('thiepn:hub-auth:v1'))localStorage.setItem('thiepn:hub-auth:v1',JSON.stringify(session));
    if(location.origin===ACCOUNT&&!localStorage.getItem('sb-hycegznamzjhwinegaai-auth-token'))localStorage.setItem('sb-hycegznamzjhwinegaai-auth-token',JSON.stringify(session));
  },{HUB,ACCOUNT,user,bearer:token()});
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());calls.push({url:req.url(),body:req.postData()});
    if(url.origin===ISSUER){
      if(url.pathname.endsWith('/oauth/authorize')){state=url.searchParams.get('state')!;challenge=url.searchParams.get('code_challenge')!;return route.fulfill({contentType:'text/html',body:`<script>location.replace(${JSON.stringify(ACCOUNT+'/oauth/consent?authorization_id=h14-fictional')})</script>`});}
      if(url.pathname.includes('/oauth/authorizations/')){
        if(req.method()==='GET')return route.fulfill({json:{authorization_id:'h14-fictional',redirect_uri:HUB+'/home/',scope:'email',client:{id:CLIENT,uri:HUB+'/',name:'THIEPN Hub'},user:{id:A,email:user.email}}});
        return route.fulfill({json:{redirect_url:HUB+'/home/?'+new URLSearchParams(req.postDataJSON()?.action==='deny'?{error:'access_denied',state}:{code:'h14-fictional-code',state})}});
      }
      if(url.pathname.endsWith('/oauth/token')){const body=new URLSearchParams(req.postData()!);expect(crypto.createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(challenge);return route.fulfill({json:{access_token:managedToken,refresh_token:'managed_refresh_sentinel',token_type:'bearer',expires_in:3600,scope:'email'}});}
      if(url.pathname.endsWith('/user'))return route.fulfill({json:user});
      if(url.pathname.endsWith('/get_thiepn_hub_notes_consent'))return route.fulfill({json:{permissions,revision:REV}});
      if(url.pathname.startsWith('/rest/v1/'))return route.fulfill({json:[]});
      return route.fulfill({status:404,json:{message:'Fictional unavailable'}});
    }
    if(url.origin===PLATFORM){
      expect(req.headers().authorization).toBe('Bearer '+managedToken);
      if(url.pathname.endsWith('/access'))return route.fulfill({json:{ok:true,data:denied?null:{accountId:A,consumer:'thiepn-hub',audience:'notes-hub',permissions,grantRevision:REV,expiresAt:managedExpiry,accountState:'active',notesSyncAccess:true}}});
      const body=req.postDataJSON();if(held)await new Promise<void>(r=>{release=r;});
      return route.fulfill({json:{schemaVersion:1,providerId:'notes',operation:body.operation,requestId:body.requestId,context:body.context,privacy:'private',coverage:'cloud-snapshot',status:'ready',observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+expires).toISOString(),sourceUpdatedAt:new Date(Date.now()-1000).toISOString(),data:{items:[{resourceId:REV,title:body.operation==='search'?'Search fixture title':'<b>Fictional private title</b>',updatedAt:new Date(Date.now()-1000).toISOString()}]}}});
    }
    if(url.origin===HUB||url.origin===ACCOUNT){
      const root=path.resolve(url.origin===HUB?'.cache/h14-hub':'.cache/h14-account');let file=path.join(root,url.pathname);
      if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      if(url.origin===ACCOUNT&&!fs.existsSync(file))file=path.join(root,'index.html');
      if(fs.existsSync(file))return route.fulfill({path:file,contentType:mime(file)});
    }
    return route.abort();
  });
  return{calls,revoke:()=>{denied=true;},hold:()=>{held=true;},release:()=>{held=false;release?.();},shortExpiry:()=>{expires=1200;}};
}
async function connect(page:Page){await page.goto(HUB+'/home/');await expect(page.locator('[data-auth-status]')).toContainText(user.email);await page.getByRole('button',{name:'Connect Notes',exact:true}).click();await expect(page.getByRole('heading',{name:'Connect THIEPN Hub'})).toBeVisible();await page.getByRole('button',{name:'Connect Hub',exact:true}).click();await expect(page.locator('[data-notes-items]')).toContainText('Fictional private title');expect(page.url()).toBe(HUB+'/home/');}
test('actual Account authorization, browser PKCE and title-only UI with explicit search',async({page})=>{
  const f=await fixture(page);await connect(page);
  expect(await page.locator('[data-notes-items] b').count()).toBe(0);
  await page.getByRole('radio',{name:'Continue',exact:true}).check();await expect(page.locator('[data-notes-items]')).toContainText('Fictional private title');expect(f.calls.some(c=>c.url.endsWith('/hub/notes/v1')&&JSON.parse(c.body??'{}').operation==='continue')).toBe(true);
  expect(await page.evaluate(()=>Object.values(localStorage).join('')+Object.values(sessionStorage).join(''))).not.toContain('managed_refresh_sentinel');
  await page.getByRole('searchbox',{name:'Search synced titles'}).fill('private query');await page.getByRole('button',{name:'Search Notes',exact:true}).click();await expect(page.locator('[data-notes-items]')).toContainText('Search fixture title');
  expect(f.calls.some(c=>c.url.includes('private query'))).toBe(false);
  expect(f.calls.some(c=>c.url.includes('/rest/v1/notes_sync_records')||c.url.includes('/storage/v1/'))).toBe(false);
  await page.getByRole('button',{name:'Disconnect this tab'}).click();await expect(page.locator('[data-notes-items]')).toBeEmpty();
});
test('revocation withholds results and clears the previous titles',async({page})=>{const f=await fixture(page);await connect(page);f.revoke();await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.locator('[data-notes-items]')).toBeEmpty();await expect(page.locator('[data-notes-status]')).toContainText('could not be checked');});
test('Hide Home clears in-flight private data and never restores a late result',async({page})=>{const f=await fixture(page);await connect(page);f.hold();await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'Hide Home',exact:true}).click();f.release();await expect(page.locator('[data-notes-items]')).toBeEmpty();await page.getByRole('button',{name:'Show Home',exact:true}).click();await expect(page.locator('[data-notes-items]')).toBeEmpty();});
test('expired snapshot removes titles and requires another authority check',async({page})=>{const f=await fixture(page);f.shortExpiry();await connect(page);await expect(page.locator('[data-notes-items]')).toBeEmpty({timeout:5000});await expect(page.locator('[data-notes-status]')).toContainText('expired');});
test('forged managed callback is scrubbed and cannot exchange a token',async({page})=>{const f=await fixture(page);await page.goto(HUB+'/home/?code=forged&state='+'x'.repeat(43));await expect(page.locator('[data-notes-status]')).toContainText('missing, expired');expect(page.url()).toBe(HUB+'/home/');expect(f.calls.some(c=>c.url.endsWith('/oauth/token'))).toBe(false);});

test('explicit Account denial returns safely without a token exchange',async({page})=>{const f=await fixture(page);await page.goto(HUB+'/home/');await expect(page.locator('[data-auth-status]')).toContainText(user.email);await page.getByRole('button',{name:'Connect Notes',exact:true}).click();await expect(page.getByRole('heading',{name:'Connect THIEPN Hub'})).toBeVisible();await page.getByRole('button',{name:'Decline',exact:true}).click();await expect(page.locator('[data-notes-status]')).toContainText('missing, expired');expect(page.url()).toBe(HUB+'/home/');expect(f.calls.some(c=>c.url.endsWith('/oauth/token'))).toBe(false);});
test('reload discards managed connection and private results',async({page})=>{const f=await fixture(page);await connect(page);const exchanges=f.calls.filter(c=>c.url.endsWith('/oauth/token')).length;await page.reload();await expect(page.locator('[data-auth-status]')).toContainText(user.email);await expect(page.locator('[data-notes-items]')).toBeEmpty();await expect(page.getByRole('button',{name:'Connect Notes',exact:true})).toBeEnabled();expect(f.calls.filter(c=>c.url.endsWith('/oauth/token')).length).toBe(exchanges);});
test('search-only sharing never requests recent titles or Continue',async({page})=>{const f=await fixture(page,['notes.hub.search.read']);await page.goto(HUB+'/home/');await expect(page.locator('[data-auth-status]')).toContainText(user.email);await page.getByRole('button',{name:'Connect Notes',exact:true}).click();await page.getByRole('button',{name:'Connect Hub',exact:true}).click();await expect(page.locator('[data-notes-status]')).toContainText('Connected. Search');await page.getByRole('searchbox',{name:'Search synced titles'}).fill('fictional');await page.getByRole('button',{name:'Search Notes',exact:true}).click();await expect(page.locator('[data-notes-items]')).toContainText('Search fixture title');expect(f.calls.filter(c=>c.url.endsWith('/hub/notes/v1')).every(c=>JSON.parse(c.body!).operation==='search')).toBe(true);});
test('Continue-only sharing opens the permitted view directly',async({page})=>{const f=await fixture(page,['notes.hub.continue.read']);await connect(page);await expect(page.getByRole('radio',{name:'Recent titles',exact:true})).toBeDisabled();await expect(page.getByRole('radio',{name:'Continue',exact:true})).toBeChecked();await expect(page.getByRole('searchbox',{name:'Search synced titles'})).toBeHidden();expect(f.calls.filter(c=>c.url.endsWith('/hub/notes/v1')).every(c=>JSON.parse(c.body!).operation==='continue')).toBe(true);});
