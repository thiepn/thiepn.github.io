import { hubIdentity, readHubNotesConsent } from './portal-auth';
import { HubNotesSession, NOTES_PENDING_KEY } from '../lib/hub-notes-session';
import type { Operation } from '../lib/providers/types';

import {managedQuery as query,managedFragment as fragment,managedCallback,managedTarget} from '../lib/hub-managed-return';
const callback=managedCallback && (managedTarget===null || managedTarget===NOTES_PENDING_KEY);
const root=document.querySelector<HTMLElement>('[data-private-notes]');
if(root){
  const status=root.querySelector<HTMLElement>('[data-notes-status]')!;
  const list=root.querySelector<HTMLElement>('[data-notes-items]')!;
  const panel=root.querySelector<HTMLElement>('[data-notes-private]')!;
  const freshness=root.querySelector<HTMLElement>('[data-notes-freshness]')!;
  const connect=root.querySelector<HTMLButtonElement>('[data-notes-connect]')!;
  const refresh=root.querySelector<HTMLButtonElement>('[data-notes-refresh]')!;
  const disconnect=root.querySelector<HTMLButtonElement>('[data-notes-disconnect]')!;
  const form=root.querySelector<HTMLFormElement>('[data-notes-search]')!;
  let generation=0,controller:AbortController|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const coreAgent=import.meta.env.PUBLIC_HUB_CORE_AGENT_NOTES==='staged-v1';
  const owner=()=>hubIdentity.status==='signed-in'?hubIdentity.id:null;
  let session:HubNotesSession|null=null;
  let permissions=new Set<string>();
  const radios=[...root.querySelectorAll<HTMLInputElement>('[name="notes-operation"]')];
  function operationAllowed(operation:Operation){return permissions.has(`notes.hub.${operation}.read`);}
  function configureOperations(){radios.forEach(r=>{r.disabled=!operationAllowed(r.value as Operation);});form.hidden=!operationAllowed('search');root!.querySelector<HTMLElement>('fieldset')!.hidden=!operationAllowed('summary')&&!operationAllowed('continue');}
  function erase(message='Connect Notes to show your synced titles.'){
    ++generation;controller?.abort();controller=null;clearTimeout(timer);list.replaceChildren();freshness.textContent='';panel.hidden=true;form.reset();
    refresh.hidden=disconnect.hidden=true;status.textContent=message;
  }
  function clear(message?:string,removePending=true){session?.clear(removePending);permissions.clear();configureOperations();erase(message);}
  function controls(){connect.disabled=Boolean(!owner() || !session || root!.hidden || document.hidden);}
  try {
    if(location.origin!=='https://thiepn.dev' || import.meta.env.PUBLIC_HUB_ACCOUNT_ENTRY!=='v1' || coreAgent&&!import.meta.env.PUBLIC_CORE_GATEWAY_ORIGIN)throw new Error('Unavailable');
    session=new HubNotesSession({clientId:import.meta.env.PUBLIC_HUB_NOTES_CLIENT_ID ?? '',platformOrigin:import.meta.env.PUBLIC_HUB_PLATFORM_ORIGIN ?? '',publishableKey:import.meta.env.PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY ?? '',...(coreAgent&&import.meta.env.PUBLIC_CORE_GATEWAY_ORIGIN?{coreOrigin:import.meta.env.PUBLIC_CORE_GATEWAY_ORIGIN}:{})},sessionStorage,owner);
  }catch{status.textContent='Notes connection is unavailable. You can open Notes directly.';}
  controls();
  async function load(operation:Operation,search?:string){
    if(!session || !owner() || root!.hidden || document.hidden || !operationAllowed(operation))return;
    erase('Checking current Notes access…');const epoch=generation;
    const abort=new AbortController();controller=abort;
    try{
      if(coreAgent&&operation==='search'){
        if(typeof search!=='string'||!search.trim())throw new Error('Unavailable');
        const hits=await session.searchViaCore(search,abort.signal);
        if(epoch!==generation || root!.hidden || document.hidden)return;
        for(const item of hits){
          const li=document.createElement('li'),a=document.createElement('a');
          a.href='https://thiepn.dev/notes/';a.rel='noreferrer';a.textContent=item.title;li.append(a);list.append(li);
        }
        panel.hidden=false;refresh.hidden=!operationAllowed('summary')&&!operationAllowed('continue');disconnect.hidden=false;
        status.textContent=hits.length?'Synced Notes titles':'No matching synced notes.';
        freshness.textContent='Search ran through the staged THIEPN Core agent path with your current Notes grant.';
      }else{
        const envelope=await session.read(operation,abort.signal,search);
        if(epoch!==generation || root!.hidden || document.hidden)return;
        if(!['ready','empty'].includes(envelope.status) || !envelope.data)throw new Error('Unavailable');
        for(const item of envelope.data.items){
          const li=document.createElement('li'),a=document.createElement('a');
          // Notes has no qualified resource deep link yet. Open its real workspace.
          a.href='https://thiepn.dev/notes/';a.rel='noreferrer';a.textContent=item.title;
          const time=document.createElement('time');time.dateTime=item.updatedAt;time.textContent=new Date(item.updatedAt).toLocaleString();
          li.append(a,document.createTextNode(' · '),time);list.append(li);
        }
        panel.hidden=false;refresh.hidden=!operationAllowed('summary')&&!operationAllowed('continue');disconnect.hidden=false;
        status.textContent=envelope.status==='empty'?'No matching synced notes.':'Synced Notes titles';
        freshness.textContent=`Cloud snapshot checked ${new Date(envelope.observedAt).toLocaleTimeString()}. Open Notes for current local changes.`;
        timer=setTimeout(()=>{erase('This snapshot expired. Search or refresh to check Notes again.');panel.hidden=!operationAllowed('search');refresh.hidden=!operationAllowed('summary')&&!operationAllowed('continue');disconnect.hidden=false;controls();},Math.max(0,Date.parse(envelope.expiresAt)-Date.now()));
      }
    }catch{if(epoch===generation)clear('Notes could not be checked. Your sharing may have changed; reconnect or open Notes.');}
    finally{if(epoch===generation)controller=null;controls();}
  }
  connect.addEventListener('click',()=>void(async()=>{
    const id=owner();if(!session || !id)return;clear('Checking your sharing choices…');const epoch=generation;connect.disabled=true;
    try{const consent=await readHubNotesConsent(id);if(epoch!==generation || id!==owner())return;const url=await session.begin(id,consent);if(epoch!==generation || id!==owner())return;location.assign(url);}
    catch{if(epoch===generation)clear('Choose your Notes sharing permissions in Account, then connect again.');controls();}
  })());
  refresh.addEventListener('click',()=>void load((root!.querySelector<HTMLInputElement>('[name="notes-operation"]:checked')?.value ?? 'summary') as Operation));
  disconnect.addEventListener('click',()=>{clear('Notes are disconnected in this tab. Manage sharing in Account to revoke access everywhere.');controls();});
  root.querySelectorAll<HTMLInputElement>('[name="notes-operation"]').forEach(r=>r.addEventListener('change',()=>void load(r.value as Operation)));
  form.addEventListener('submit',e=>{e.preventDefault();const value=(form.elements.namedItem('query') as HTMLInputElement).value.trim();if(value)void load('search',value);});
  let completing=false,callbackUsed=false;
  async function identityChanged(){
    clear(owner()?'Connect Notes to show your synced titles.':'Sign in to connect your Notes.',!callback || callbackUsed);controls();
    if(callback && !callbackUsed && !completing && owner() && session && !document.hidden && !root!.hidden){
      completing=true;callbackUsed=true;const epoch=generation;status.textContent='Completing Notes connection…';
      try{
        await session.complete(query,fragment);const id=owner();if(epoch!==generation || !id)return;
        const consent=await readHubNotesConsent(id);if(epoch!==generation || id!==owner())return;
        permissions=new Set(consent.permissions);configureOperations();
        const initial:Operation|null=operationAllowed('summary')?'summary':operationAllowed('continue')?'continue':null;
        if(initial){radios.forEach(r=>{r.checked=r.value===initial;});await load(initial);}
        else if(operationAllowed('search')){panel.hidden=false;disconnect.hidden=false;status.textContent='Connected. Search your synced Notes titles.';}
        else clear('Choose your Notes sharing permissions in Account, then connect again.');
      }
      catch{if(epoch===generation)clear('This Notes return is missing, expired or already used. Connect again.');}
      finally{completing=false;controls();}
    }
  }
  window.addEventListener('hub:identity',()=>void identityChanged());
  window.addEventListener('pagehide',()=>clear(undefined,false));
  window.addEventListener('pageshow',e=>{if(e.persisted){clear();controls();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear(undefined,false);else if(callback&&!callbackUsed)void identityChanged();controls();});
  new MutationObserver(()=>{if(root!.hidden)clear(undefined,!callback || callbackUsed);controls();}).observe(root,{attributes:true,attributeFilter:['hidden']});
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('thiepn:hub-notes:clear:v1'):null;
  channel?.addEventListener('message',()=>{clear();controls();});
  disconnect.addEventListener('click',()=>channel?.postMessage({type:'clear'}));
  window.addEventListener('storage',e=>{if(e.key==='thiepn:hub-auth:v1'){clear();controls();}});
  void identityChanged();
}else if(callback){try{sessionStorage.removeItem(NOTES_PENDING_KEY);}catch{/* storage unavailable */}}
