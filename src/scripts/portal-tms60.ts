import { hubIdentity, readHubTmsConsent } from './portal-auth';
import { HubNotesSession } from '../lib/hub-notes-session';
import type { Operation } from '../lib/providers/types';

import {managedQuery as query,managedFragment as fragment,managedCallback,managedTarget} from '../lib/hub-managed-return';
const translationReturn=managedTarget?.match(/^thiepn:hub-tms60:pkce:([a-z0-9]+):v1$/)?.[1];
const callback=managedCallback && (managedTarget===null || Boolean(translationReturn));
const TMS_PENDING_KEY=managedTarget??'';
const root=document.querySelector<HTMLElement>('[data-private-tms60]');
if(root){
  const translation=root.querySelector<HTMLSelectElement>('[data-tms60-translation]')!;
  if(translationReturn)translation.value=translationReturn;
  const counts=root.querySelector<HTMLElement>('[data-tms60-counts]')!;
  const status=root.querySelector<HTMLElement>('[data-tms60-status]')!;
  const list=root.querySelector<HTMLElement>('[data-tms60-items]')!;
  const panel=root.querySelector<HTMLElement>('[data-tms60-private]')!;
  const freshness=root.querySelector<HTMLElement>('[data-tms60-freshness]')!;
  const connect=root.querySelector<HTMLButtonElement>('[data-tms60-connect]')!;
  const refresh=root.querySelector<HTMLButtonElement>('[data-tms60-refresh]')!;
  const disconnect=root.querySelector<HTMLButtonElement>('[data-tms60-disconnect]')!;
  const form=root.querySelector<HTMLFormElement>('[data-tms60-search]')!;
  let generation=0,controller:AbortController|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const owner=()=>hubIdentity.status==='signed-in'?hubIdentity.id:null;
  let session:HubNotesSession|null=null;
  let permissions=new Set<string>();
  const radios=[...root.querySelectorAll<HTMLInputElement>('[name="tms60-operation"]')];
  function operationAllowed(operation:Operation){return permissions.has(`tms60.hub.${operation}.read`);}
  function configureOperations(){radios.forEach(r=>{r.disabled=!operationAllowed(r.value as Operation);});form.hidden=!operationAllowed('search');root!.querySelector<HTMLElement>('fieldset')!.hidden=!operationAllowed('summary')&&!operationAllowed('continue');}
  function erase(message='Connect TMS60 to show your synced Bible references.'){
    ++generation;controller?.abort();controller=null;clearTimeout(timer);list.replaceChildren();counts.textContent='';freshness.textContent='';panel.hidden=true;form.reset();
    refresh.hidden=disconnect.hidden=true;status.textContent=message;
  }
  function clear(message?:string,removePending=true){session?.clear(removePending);permissions.clear();configureOperations();erase(message);}
  function controls(){connect.disabled=Boolean(!owner() || !session || root!.hidden || document.hidden);}
  try {
    if(location.origin!=='https://thiepn.dev' || import.meta.env.PUBLIC_HUB_ACCOUNT_ENTRY!=='v1')throw new Error('Unavailable');
    session=new HubNotesSession({clientId:import.meta.env.PUBLIC_HUB_NOTES_CLIENT_ID ?? '',platformOrigin:'',provider:'tms60',translationId:translation.value,publishableKey:import.meta.env.PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY ?? ''},sessionStorage,owner);
  }catch{status.textContent='TMS60 connection is unavailable. You can open TMS60 directly.';}
  translation.addEventListener('change',()=>{clear();try{session=new HubNotesSession({clientId:import.meta.env.PUBLIC_HUB_NOTES_CLIENT_ID??'',platformOrigin:'',provider:'tms60',translationId:translation.value,publishableKey:import.meta.env.PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY??''},sessionStorage,owner);}catch{session=null;}controls();});
  controls();
  async function load(operation:Operation,search?:string){
    if(!session || !owner() || root!.hidden || document.hidden || !operationAllowed(operation))return;
    erase('Checking current TMS60 access…');const epoch=generation;
    const abort=new AbortController();controller=abort;
    try{
      const envelope=await session.read(operation,abort.signal,search);
      if(epoch!==generation || root!.hidden || document.hidden)return;
      if(['unconnected','unsupported'].includes(envelope.status)){
        erase(envelope.status==='unconnected'?'No cloud snapshot for this translation. Sync it in TMS60, then refresh.':'This translation’s cloud snapshot cannot be read yet. Open TMS60 to check its sync.');
        refresh.hidden=!operationAllowed('summary')&&!operationAllowed('continue');disconnect.hidden=false;return;
      }
      if(!['ready','empty'].includes(envelope.status) || !envelope.data)throw new Error('Unavailable');
      for(const item of envelope.data.items){
        const li=document.createElement('li'),a=document.createElement('a');
        // Exact metadata-only resource link; native app requires explicit practice.
        a.href='https://tms60.thiepn.dev/#hub='+encodeURIComponent(item.resourceId);a.rel='noreferrer';a.textContent=item.title+' · '+(item.dimension==='reference'?'Reference recall':item.dimension==='learning'?'Learning':'Wording recall');
        const time=document.createElement('time');time.dateTime=item.updatedAt;time.textContent=new Date(item.updatedAt).toLocaleString();
        li.append(a,document.createTextNode(' · '),time);list.append(li);
      }
      counts.textContent=operation==='summary'?`${envelope.data.dueTaskCount} review tasks across ${envelope.data.dueVerseCount} ${envelope.data.dueVerseCount===1?'verse':'verses'} · ${envelope.data.newVerseCount} new verses`:'';
      panel.hidden=false;refresh.hidden=!operationAllowed('summary')&&!operationAllowed('continue');disconnect.hidden=false;
      status.textContent=envelope.status==='empty'?(operation==='search'?'No matching Bible references.':operation==='continue'?'No recent synced practice.':'No due review tasks.'):'Synced TMS60 references';
      freshness.textContent=`Cloud snapshot checked ${new Date(envelope.observedAt).toLocaleTimeString()}. Open TMS60 for current local changes.`;
      timer=setTimeout(()=>{erase('This snapshot expired. Search or refresh to check TMS60 again.');panel.hidden=!operationAllowed('search');refresh.hidden=!operationAllowed('summary')&&!operationAllowed('continue');disconnect.hidden=false;controls();},Math.max(0,Date.parse(envelope.expiresAt)-Date.now()));
    }catch{if(epoch===generation)clear('TMS60 could not be checked. Your sharing may have changed; reconnect or open TMS60.');}
    finally{if(epoch===generation)controller=null;controls();}
  }
  connect.addEventListener('click',()=>void(async()=>{
    const id=owner();if(!session || !id)return;clear('Checking your sharing choices…');const epoch=generation;connect.disabled=true;
    try{const consent=await readHubTmsConsent(id,translation.value);if(epoch!==generation || id!==owner())return;const url=await session.begin(id,consent);if(epoch!==generation || id!==owner())return;location.assign(url);}
    catch{if(epoch===generation)clear('Choose your TMS60 sharing permissions in Account, then connect again.');controls();}
  })());
  refresh.addEventListener('click',()=>void load((root!.querySelector<HTMLInputElement>('[name="tms60-operation"]:checked')?.value ?? 'summary') as Operation));
  disconnect.addEventListener('click',()=>{clear('TMS60 is disconnected in this tab. Manage sharing in Account to revoke access everywhere.');controls();});
  root.querySelectorAll<HTMLInputElement>('[name="tms60-operation"]').forEach(r=>r.addEventListener('change',()=>void load(r.value as Operation)));
  form.addEventListener('submit',e=>{e.preventDefault();const value=(form.elements.namedItem('query') as HTMLInputElement).value.trim();if(value)void load('search',value);});
  let completing=false,callbackUsed=false;
  async function identityChanged(){
    clear(owner()?'Connect TMS60 to show your synced Bible references.':'Sign in to connect your TMS60.',!callback || callbackUsed);controls();
    if(callback && !callbackUsed && !completing && owner() && session && !document.hidden && !root!.hidden){
      completing=true;callbackUsed=true;const epoch=generation;status.textContent='Completing TMS60 connection…';
      try{
        await session.complete(query,fragment);const id=owner();if(epoch!==generation || !id)return;
        const consent=await readHubTmsConsent(id,translation.value);if(epoch!==generation || id!==owner())return;
        permissions=new Set(consent.permissions);configureOperations();
        const initial:Operation|null=operationAllowed('summary')?'summary':operationAllowed('continue')?'continue':null;
        if(initial){radios.forEach(r=>{r.checked=r.value===initial;});await load(initial);}
        else if(operationAllowed('search')){panel.hidden=false;disconnect.hidden=false;status.textContent='Connected. Search your synced TMS60 references.';}
        else clear('Choose your TMS60 sharing permissions in Account, then connect again.');
      }
      catch{if(epoch===generation)clear('This TMS60 return is missing, expired or already used. Connect again.');}
      finally{completing=false;controls();}
    }
  }
  window.addEventListener('hub:identity',()=>void identityChanged());
  window.addEventListener('pagehide',()=>clear(undefined,false));
  window.addEventListener('pageshow',e=>{if(e.persisted){clear();controls();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear(undefined,false);else if(callback&&!callbackUsed)void identityChanged();controls();});
  new MutationObserver(()=>{if(root!.hidden)clear(undefined,!callback || callbackUsed);controls();}).observe(root,{attributes:true,attributeFilter:['hidden']});
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('thiepn:hub-tms60:clear:v1'):null;
  channel?.addEventListener('message',()=>{clear();controls();});
  disconnect.addEventListener('click',()=>channel?.postMessage({type:'clear'}));
  window.addEventListener('storage',e=>{if(e.key==='thiepn:hub-auth:v1'){clear();controls();}});
  void identityChanged();
}else if(callback){try{sessionStorage.removeItem(TMS_PENDING_KEY);}catch{/* storage unavailable */}}
