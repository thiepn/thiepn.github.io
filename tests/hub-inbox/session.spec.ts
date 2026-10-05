import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const HUB='https://thiepn.dev',ACCOUNT='https://account.thiepn.dev',ISSUER='https://hycegznamzjhwinegaai.supabase.co';
const A='11111111-1111-4111-8111-111111111111',CLIENT='33333333-3333-4333-8333-333333333333',REV='44444444-4444-4444-8444-444444444444';
const token=(managed=false)=>'eyJhbGciOiJFUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:A,iss:ISSUER+'/auth/v1',aud:'authenticated',role:'authenticated',session_id:REV,exp:Math.floor(Date.now()/1000)+3600,...(managed?{client_id:CLIENT}:{})})).toString('base64url')+'.fictional_signature';
const user={id:A,email:'fictional@example.test',aud:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const mime=(p:string)=>p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.woff2')?'font/woff2':'application/octet-stream';
async function fixture(page:Page,permissions=['notes.hub.inbox.read','notes.hub.inbox.attention.write']){
  let state='',challenge='',denied=false,held=false,release!:()=>void,expires=120000,attention='unread',malformed=false,uncertain=false;let updated=new Date(Date.now()-1000).toISOString();
  const managedToken=token(true);
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
        if(req.method()==='GET')return route.fulfill({json:{authorization_id:'h14-fictional',redirect_uri:HUB+'/inbox/',scope:'email',client:{id:CLIENT,uri:HUB+'/',name:'THIEPN Hub'},user:{id:A,email:user.email}}});
        return route.fulfill({json:{redirect_url:HUB+'/inbox/?'+new URLSearchParams(req.postDataJSON()?.action==='deny'?{error:'access_denied',state}:{code:'h14-fictional-code',state})}});
      }
      if(url.pathname.endsWith('/oauth/token')){const body=new URLSearchParams(req.postData()!);expect(crypto.createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(challenge);return route.fulfill({json:{access_token:managedToken,refresh_token:'managed_refresh_sentinel',token_type:'bearer',expires_in:3600,scope:'email'}});}
      if(url.pathname.endsWith('/user'))return route.fulfill({json:user});
      if(url.pathname.endsWith('/get_thiepn_hub_notes_consent'))return route.fulfill({json:{permissions,revision:REV}});
      if(url.pathname.endsWith('/thiepn_hub_notes_inbox')){
        expect(req.headers().authorization).toBe('Bearer '+managedToken);
        if(denied)return route.fulfill({status:403,json:{message:'inbox_unavailable'}});
        const body=req.postDataJSON();if(held)await new Promise<void>(r=>{release=r;});
        if(body.p_action){expect(body.p_expected_updated_at).toBe(updated);attention=body.p_action==='dismiss'?'dismissed':'read';updated=new Date().toISOString();if(uncertain)return route.fulfill({status:503,json:{message:'Fictional uncertain'}});}
        const observed=Date.now();
        const item={issueId:'reminder:'+REV,dedupeKey:'reminder:'+REV,title:'<b>Fictional due reminder</b>',type:'reminder',severity:'normal',state:'open',attention,updatedAt:updated,expiresAt:null,actionKey:'open',...(malformed?{body:'PRIVATE_BODY'}:{})};
        const items=attention==='dismissed'&&!body.p_action?[]:[item];
        return route.fulfill({json:{schemaVersion:1,providerId:'notes',operation:'inbox',requestId:body.p_request_id,context:{scope:'account',accountId:A,workspaceId:null,grantRevision:body.p_revision,translationId:null},privacy:'private',coverage:'cloud-snapshot',status:items.length?'ready':'empty',observedAt:new Date(observed).toISOString(),expiresAt:new Date(observed+expires).toISOString(),sourceUpdatedAt:null,data:{items}}});
      }
      if(url.pathname.startsWith('/rest/v1/'))return route.fulfill({json:[]});
      return route.fulfill({status:404,json:{message:'Fictional unavailable'}});
    }
    if(url.origin===HUB||url.origin===ACCOUNT){
      const root=path.resolve(url.origin===HUB?'.cache/h17-hub':'.cache/h17-account');let file=path.join(root,url.pathname);
      if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      if(url.origin===ACCOUNT&&!fs.existsSync(file))file=path.join(root,'index.html');
      if(fs.existsSync(file))return route.fulfill({path:file,contentType:mime(file)});
    }
    return route.abort();
  });
  return{calls,revoke:()=>{denied=true;},hold:()=>{held=true;},release:()=>{held=false;release?.();},shortExpiry:()=>{expires=1200;},malformed:()=>{malformed=true;},uncertain:()=>{uncertain=true;}};
}
async function connect(page:Page){await page.goto(HUB+'/inbox/');await expect(page.locator('[data-auth-status]')).toContainText(user.email);await page.getByRole('button',{name:'Connect Notes reminders',exact:true}).click();await expect(page.getByRole('heading',{name:'Connect THIEPN Hub'})).toBeVisible();await page.getByRole('button',{name:'Connect Hub',exact:true}).click();await expect(page.locator('[data-inbox-items]')).toContainText('Fictional due reminder');expect(page.url()).toBe(HUB+'/inbox/');}
test('explicit actual Account PKCE connection, safe titles, partial coverage and confirmed actions',async({page})=>{
 const f=await fixture(page);await connect(page);expect(await page.evaluate(async()=>{const response=await fetch('/hub-release.json');return(await response.json()).features;})).toMatchObject({privateReads:true,inboxReads:true,inlineWrites:true});expect(await page.locator('[data-inbox-items] b').count()).toBe(0);await expect(page.locator('[data-inbox-total]')).toContainText('No unread total');
 await page.getByRole('button',{name:'Mark read:',exact:false}).click();await expect(page.locator('[data-inbox-items]')).toContainText('read');await expect(page.locator('[data-inbox-status]')).toContainText('Attention updated');
 await page.getByRole('button',{name:'Dismiss:',exact:false}).click();await expect(page.locator('[data-inbox-items]')).toBeEmpty();await expect(page.locator('[data-inbox-status]')).toContainText('Attention updated');
 expect(f.calls.some(c=>c.url.includes('/notes_sync_records')||c.url.includes('/storage/v1/'))).toBe(false);expect(await page.evaluate(()=>Object.values(localStorage).join('')+Object.values(sessionStorage).join(''))).not.toContain('managed_refresh_sentinel');
});
test('no automatic feed read; a read-only grant renders no write controls',async({page})=>{const f=await fixture(page,['notes.hub.inbox.read']);await page.goto(HUB+'/inbox/');await expect(page.locator('[data-auth-status]')).toContainText(user.email);expect(f.calls.some(c=>c.url.endsWith('/thiepn_hub_notes_inbox'))).toBe(false);await connect(page);await expect(page.getByRole('button',{name:'Mark read:',exact:false})).toHaveCount(0);await expect(page.getByRole('button',{name:'Dismiss:',exact:false})).toHaveCount(0);});
test('uncertain write requires refresh and never claims success or retries',async({page})=>{const f=await fixture(page);await connect(page);f.uncertain();await page.getByRole('button',{name:'Dismiss:',exact:false}).click();await expect(page.locator('[data-inbox-status]')).toContainText('did not confirm');await expect(page.locator('[data-inbox-items]')).toBeEmpty();expect(f.calls.filter(c=>c.url.endsWith('/thiepn_hub_notes_inbox')&&JSON.parse(c.body!).p_action)).toHaveLength(1);await page.getByRole('button',{name:'Refresh Inbox',exact:true}).click();await expect(page.locator('[data-source="notes"] > span')).toHaveText('No attention items');});
test('Hide Inbox clears held results and never restores them on Show',async({page})=>{const f=await fixture(page);await connect(page);f.hold();await page.getByRole('button',{name:'Refresh Inbox',exact:true}).click();await page.getByRole('button',{name:'Hide Inbox',exact:true}).click();f.release();await expect(page.locator('[data-inbox-items]')).toBeEmpty();await page.getByRole('button',{name:'Show Inbox',exact:true}).click();await expect(page.locator('[data-inbox-items]')).toBeEmpty();});
test('revocation clears the current feed on refresh',async({page})=>{const f=await fixture(page);await connect(page);f.revoke();await page.getByRole('button',{name:'Refresh Inbox',exact:true}).click();await expect(page.locator('[data-inbox-items]')).toBeEmpty();await expect(page.locator('[data-source="notes"] > span')).toHaveText('Unavailable');});
test('expired snapshots clear private DOM without interaction',async({page})=>{const f=await fixture(page);f.shortExpiry();await connect(page);await expect(page.locator('[data-inbox-items]')).toBeEmpty({timeout:5000});await expect(page.locator('[data-source="notes"] > span')).toHaveText('Refresh required');});
test('malformed owner data is rejected instead of exposing a body',async({page})=>{const f=await fixture(page);await connect(page);f.malformed();await page.getByRole('button',{name:'Refresh Inbox',exact:true}).click();await expect(page.locator('[data-inbox-items]')).toBeEmpty();expect(await page.locator('body').textContent()).not.toContain('PRIVATE_BODY');});
test('reload discards the managed token, feed and connection',async({page})=>{const f=await fixture(page);await connect(page);const exchanges=f.calls.filter(c=>c.url.endsWith('/oauth/token')).length;await page.reload();await expect(page.locator('[data-auth-status]')).toContainText(user.email);await expect(page.locator('[data-inbox-items]')).toBeEmpty();expect(f.calls.filter(c=>c.url.endsWith('/oauth/token')).length).toBe(exchanges);});
test('forged callback is scrubbed without a token exchange',async({page})=>{const f=await fixture(page);await page.goto(HUB+'/inbox/?code=forged&state='+'x'.repeat(43));await expect(page.locator('[data-auth-status]')).toContainText(user.email);expect(page.url()).toBe(HUB+'/inbox/');expect(f.calls.some(c=>c.url.endsWith('/oauth/token'))).toBe(false);});
