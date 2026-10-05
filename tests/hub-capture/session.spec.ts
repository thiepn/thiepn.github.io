import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const HUB='https://thiepn.dev',ACCOUNT='https://account.thiepn.dev',ISSUER='https://hycegznamzjhwinegaai.supabase.co';
const A='11111111-1111-4111-8111-111111111111',CLIENT='33333333-3333-4333-8333-333333333333',REV='44444444-4444-4444-8444-444444444444';
const token=(managed=false)=>'eyJhbGciOiJFUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:A,iss:ISSUER+'/auth/v1',aud:'authenticated',role:'authenticated',session_id:REV,exp:Math.floor(Date.now()/1000)+3600,...(managed?{client_id:CLIENT}:{})})).toString('base64url')+'.fictional_signature';
const user={id:A,email:'fictional@example.test',aud:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const mime=(p:string)=>p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.woff2')?'font/woff2':'application/octet-stream';
async function fixture(page:Page,permissions=['notes.hub.capture.create']){
  let state='',challenge='',denied=false,held=false,release!:()=>void,expires=120000,attention='unread',malformed=false,uncertain=false;let updated=new Date(Date.now()-1000).toISOString();
  const receipts=new Map<string,unknown>();
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
        if(req.method()==='GET')return route.fulfill({json:{authorization_id:'h14-fictional',redirect_uri:HUB+'/home/',scope:'email',client:{id:CLIENT,uri:HUB+'/',name:'THIEPN Hub'},user:{id:A,email:user.email}}});
        return route.fulfill({json:{redirect_url:HUB+'/home/?'+new URLSearchParams(req.postDataJSON()?.action==='deny'?{error:'access_denied',state}:{code:'h14-fictional-code',state})}});
      }
      if(url.pathname.endsWith('/oauth/token')){const body=new URLSearchParams(req.postData()!);expect(crypto.createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(challenge);return route.fulfill({json:{access_token:managedToken,refresh_token:'managed_refresh_sentinel',token_type:'bearer',expires_in:3600,scope:'email'}});}
      if(url.pathname.endsWith('/user'))return route.fulfill({json:user});
      if(url.pathname.endsWith('/get_thiepn_hub_notes_consent'))return route.fulfill({json:{permissions,revision:REV}});
      if(url.pathname.endsWith('/thiepn_hub_notes_capture')){
        expect(req.headers().authorization).toBe('Bearer '+managedToken);
        const body=req.postDataJSON();expect(body.p_destination).toBe('notes:unfiled');
        if(!receipts.has(body.p_request_id))receipts.set(body.p_request_id,{schemaVersion:1,accountId:A,grantRevision:body.p_revision,requestId:body.p_request_id,destination:body.p_destination,noteId:REV,createdAt:Date.now(),status:'confirmed'});
        if(uncertain)return route.fulfill({status:503,json:{message:'Fictional lost confirmation'}});
        return route.fulfill({json:receipts.get(body.p_request_id)});
      }
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
      const root=path.resolve(url.origin===HUB?'.cache/h18-hub':'.cache/h18-account');let file=path.join(root,url.pathname);
      if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      if(url.origin===ACCOUNT&&!fs.existsSync(file))file=path.join(root,'index.html');
      if(fs.existsSync(file))return route.fulfill({path:file,contentType:mime(file)});
    }
    return route.abort();
  });
  return{calls,receipts,recover:()=>{uncertain=false;},revoke:()=>{denied=true;},hold:()=>{held=true;},release:()=>{held=false;release?.();},shortExpiry:()=>{expires=1200;},malformed:()=>{malformed=true;},uncertain:()=>{uncertain=true;}};
}
async function choose(page:Page){await page.goto(HUB+'/home/');await expect(page.locator('[data-auth-status]')).toContainText(user.email);await page.getByRole('button',{name:'Use this account’s Notes',exact:true}).click();}
async function connect(page:Page){await page.getByRole('button',{name:'Connect capture',exact:true}).click();await expect(page.getByRole('heading',{name:'Connect THIEPN Hub'})).toBeVisible();await page.getByRole('button',{name:'Connect Hub',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('Capture connected');expect(page.url()).toBe(HUB+'/home/');}
test('actual PKCE and confirmed capture, no existing note data reads',async({page})=>{const f=await fixture(page);await choose(page);expect(f.calls.some(c=>c.url.endsWith('/thiepn_hub_notes_capture'))).toBe(false);await page.locator('[data-capture-form] [name=title]').fill('Thought');await page.locator('[data-capture-form] [name=content]').fill('<b>한글 café</b>');await connect(page);await page.getByRole('button',{name:'Save to Notes',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('Notes confirmed');expect(f.receipts.size).toBe(1);expect(f.calls.some(c=>c.url.includes('/notes_sync_records'))).toBe(false);expect(await page.evaluate(()=>Object.values(localStorage).join('')+Object.values(sessionStorage).join(''))).not.toContain('managed_refresh_sentinel');expect(await page.evaluate(async()=> (await(await fetch('/hub-release.json')).json()).features.inlineWrites)).toBe(true);});
test('lost confirmation retains immutable draft; retry confirms one note',async({page})=>{const f=await fixture(page);await choose(page);await page.locator('[data-capture-form] [name=content]').fill('Recover this text');await connect(page);f.uncertain();await page.getByRole('button',{name:'Save to Notes',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('outcome is unknown');await expect(page.locator('[data-capture-form] [name=content]')).toHaveJSProperty('readOnly',true);f.recover();await page.getByRole('button',{name:'Retry the same save',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('Notes confirmed');const writes=f.calls.filter(c=>c.url.endsWith('/thiepn_hub_notes_capture'));expect(writes).toHaveLength(2);expect(writes[0]!.body).toBe(writes[1]!.body);expect(f.receipts.size).toBe(1);});
test('reload recovers draft after explicit destination selection, never reconnects',async({page})=>{const f=await fixture(page);await choose(page);await page.locator('[data-capture-form] [name=content]').fill('Preserved draft');await connect(page);await page.reload();await expect(page.locator('[data-capture-form]')).toBeHidden();await page.getByRole('button',{name:'Use this account’s Notes',exact:true}).click();await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue('Preserved draft');await expect(page.getByRole('button',{name:'Save to Notes',exact:true})).toBeDisabled();expect(f.calls.filter(c=>c.url.endsWith('/oauth/token'))).toHaveLength(1);});
test('hiding Home clears visible text and managed connection',async({page})=>{await fixture(page);await choose(page);await page.locator('[data-capture-form] [name=content]').fill('Private thought');await connect(page);await page.getByRole('button',{name:'Hide Home',exact:true}).click();await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue('');await page.getByRole('button',{name:'Show Home',exact:true}).click();await expect(page.locator('[data-capture-form]')).toBeHidden();});
test('missing create consent cannot begin authorization and preserves text',async({page})=>{const f=await fixture(page,['notes.hub.inbox.read']);await choose(page);await page.locator('[data-capture-form] [name=content]').fill('Kept text');await page.getByRole('button',{name:'Connect capture',exact:true}).click();await expect(page.locator('[data-capture-status]')).toContainText('Enable creation');await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue('Kept text');expect(f.calls.some(c=>c.url.includes('/oauth/authorize'))).toBe(false);});
test('account change cannot send or reveal previous draft',async({page})=>{const f=await fixture(page);await choose(page);await page.locator('[data-capture-form] [name=content]').fill('Account A private');await page.evaluate(()=>{localStorage.removeItem('thiepn:hub-auth:v1');window.dispatchEvent(new StorageEvent('storage',{key:'thiepn:hub-auth:v1',newValue:null}));});await expect(page.locator('[data-capture-form]')).toBeHidden();await expect(page.locator('[data-capture-form] [name=content]')).toHaveValue('');expect(f.calls.some(c=>c.url.endsWith('/thiepn_hub_notes_capture'))).toBe(false);});
