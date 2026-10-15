import { listenOwnerContinue, type ContinueMessage, type ContinueSourceStatus } from '../lib/workspace/owner-continuation';
import { hubIdentity } from './portal-auth';
import { libraryContinueUrl } from '../lib/hub-library-session';
import { providerAction } from '../lib/providers/registry';
import type { ProviderEnvelope, ProviderId, ContinueItem } from '../lib/providers/types';

const desks = [...document.querySelectorAll<HTMLElement>('[data-owner-continue]')];


const sources: ProviderId[] = ['notes', 'library', 'tms60'];
const names: Record<ProviderId,string> = { notes:'Notes', library:'Library', tms60:'TMS60' };
const owners: Record<ProviderId,string> = { notes:'/home/connections/', library:'/home/#reading', tms60:'/home/connections/' };
const nativeRefresh: Record<ProviderId,string> = { notes:'[data-notes-refresh]',library:'[data-library-refresh]',tms60:'[data-tms60-refresh]' };
const nativeConnect: Record<ProviderId,string> = { notes:'[data-notes-connect]',library:'[data-library-connect]',tms60:'[data-tms60-connect]' };
type OwnerState = { status: ContinueSourceStatus; envelope: ProviderEnvelope | null };
const node = <K extends keyof HTMLElementTagNameMap>(name: K, className?: string, label?: string): HTMLElementTagNameMap[K] => {
  const element = document.createElement(name);
  if (className) element.className = className;
  if (label !== undefined) element.textContent = label;
  return element;
};
function ownerURL(provider:ProviderId, item:ContinueItem):{url:string;exact:boolean} {
  if(provider==='library' && item.edition && item.releaseVersion && (item.format==='pdf'||item.format==='epub'))
    return {url:libraryContinueUrl(item),exact:true};
  if(provider==='tms60' && /^[a-z][a-z0-9-]+:([1-9]|[1-5][0-9]|60):(wording|reference|learning)$/.test(item.resourceId))
    return {url:'https://tms60.thiepn.dev/#hub='+encodeURIComponent(item.resourceId),exact:true};
  return {url:providerAction(provider,'open') ?? '/apps/',exact:false};
}
function statusName(status:ContinueSourceStatus) {
  return ({ready:'Connected',empty:'No recent items',unconnected:'Not connected',
    loading:'Checking access',offline:'Offline',stale:'Expired',error:'Read unavailable',
    revoked:'Access revoked',unsupported:'Unsupported'} as Record<ContinueSourceStatus,string>)[status];
}
function start(desks:HTMLElement[]) {
  const selected = new Set<ProviderId>(sources);
  const current = new Map<ProviderId,OwnerState>();
  let identity: string | null = hubIdentity.status==='signed-in' ? hubIdentity.id : null, deadline:ReturnType<typeof setTimeout>|undefined;
  const privateOK = () => {
    const workspace = document.querySelector<HTMLElement>('[data-workspace]');
    return !document.hidden && (!workspace || workspace.dataset.calendarPrivate === 'false');
  };
  function clear() { current.clear(); clearTimeout(deadline); render(); }
  function expire() {
    clearTimeout(deadline);
    const next = [...current.values()].map(s=>s.envelope ? Date.parse(s.envelope.expiresAt) : Infinity)
      .filter(t=>Number.isFinite(t)).sort((a,b)=>a-b)[0];
    if(next===undefined) return;
    deadline=setTimeout(()=>{
      for(const [id,row] of current) if(row.envelope && Date.parse(row.envelope.expiresAt)<=Date.now())
        current.set(id,{status:'stale',envelope:null});
      render();expire();
    },Math.max(0,next-Date.now()+10));
  }
  function onOwner(message:ContinueMessage) {
    if(!privateOK()){clear();return;}
    if(!selected.has(message.providerId)) return;
    if(message.data?.context.scope==='account' &&
       (identity === null || message.data.context.accountId !== identity)) return;
    if(message.data && Date.parse(message.data.expiresAt)<=Date.now())
      current.set(message.providerId,{status:'stale',envelope:null});
    else current.set(message.providerId,{status:message.status,envelope:message.data});
    expire();render();
  }
  function sourceCard(id:ProviderId, limit:number):HTMLElement {
    const row=current.get(id);
    const envelope=row?.envelope && Date.parse(row.envelope.expiresAt)>Date.now()?row.envelope:null;
    const status= !navigator.onLine && !envelope ? 'offline' : row?.status ?? 'unconnected';
    const section=node('section','ws-owner-source');
    section.dataset.ownerSource=id;
    const header=node('header');
    const title=node('div');
    title.append(node('h3',undefined,names[id]));
    const pill=node('span','ws-owner-status',statusName(status));
    pill.dataset.state=status;
    title.append(pill);
    const link=node('a','ws-owner-open','Connections');
    link.href=owners[id];
    header.append(title,link);section.append(header);
    if(!envelope){
      const nativeAvailable=!!document.querySelector(nativeConnect[id]);
      const descriptions:Record<ContinueSourceStatus,string>={
        ready:'No current snapshot.',empty:'The owner returned no recent resources.',
        loading:'Reading through the existing authorized owner session…',
        unconnected:nativeAvailable?'Use the owner Connect control to grant access.':'Open App connections to enable an existing owner read.',
        unsupported:'Owner read permission is not supported on this route.',
        offline:'Network unavailable; no cloud result is inferred.',
        stale:'The approved snapshot expired. Refresh in the owner panel.',
        revoked:'Permission is no longer available; reconnect explicitly.',
        error:'Owner data could not be read. This does not mean there are no records.'
      };
      section.append(node('p','ws-owner-empty',descriptions[status]));
      return section;
    }
    const coverage=id==='notes'?'Notes owner cloud titles':id==='library'?'Library · this browser only':'TMS60 translation cloud';
    const observed=new Date(envelope.observedAt);
    const updated=envelope.sourceUpdatedAt?new Date(envelope.sourceUpdatedAt):null;
    const meta=node('p','ws-owner-context',
      coverage+' · checked '+observed.toLocaleTimeString()+(updated?' · source '+updated.toLocaleString():''));
    section.append(meta);
    if(envelope.data?.items.length){
      const list=node('ul','ws-owner-items');
      for(const item of envelope.data.items.slice(0,limit)){
        const destination=ownerURL(id,item);
        const anchor=node('a','ws-owner-item');
        anchor.href=destination.url; anchor.rel='noreferrer';
        const content=node('span');
        content.append(node('strong',undefined,item.title));
        const description=id==='library'
          ? `${(item.format??'book').toUpperCase()} · ${Math.round((item.current??0)*100)}% current in this browser`
          :id==='tms60' ? `${item.dimension??'recall'} · owner translation`
          :'Synced title only · no qualified note deep link';
        content.append(node('small',undefined,description+' · '+new Date(item.updatedAt).toLocaleDateString()));
        anchor.append(content,node('span','ws-owner-item-action',destination.exact?'Resume ↗':'Open app ↗'));
        const li=node('li');li.append(anchor);list.append(li);
      }
      section.append(list);
    }else section.append(node('p','ws-owner-empty','No recent matching resources in this approved snapshot.'));
    if(id==='tms60' && envelope.operation==='summary' && envelope.data)
      section.append(node('p','ws-owner-context',
       `${envelope.data.dueTaskCount??0} review tasks · ${envelope.data.dueVerseCount??0} verses · ${envelope.data.newVerseCount??0} new`));
    section.append(node('small','ws-owner-context','Read-only metadata · valid until '+new Date(envelope.expiresAt).toLocaleTimeString()));
    return section;
  }
  function renderWidgets() {
    // Reuse this H11 desk's existing current owner envelopes; no second cache or transport.
    for (const host of document.querySelectorAll<HTMLElement>('[data-owner-widget-live]')) {
      host.replaceChildren();
      if (!privateOK()) {
        host.append(node('p','ws-owner-empty','Private workspace is hidden.'));
        continue;
      }
      const allowed = new Set(host.dataset.ownerWidgetSources?.split(',') ?? []);
      const ids = sources.filter(id=>allowed.has(id) && selected.has(id));
      const active = ids.filter(id=>current.has(id));
      if (!active.length) {
        host.append(node('p','ws-owner-empty',ids.length ?
          'No approved owner read in this tab. Use the existing owner connection to check or refresh.' :
          'No enabled owner sources. Use widget settings to select them.'));
        continue;
      }
      const heading = node('p','ws-widget-ownership','Owner connection states · data shown only with a valid grant');
      const list = node('div','ws-widget-owner-preview');
      for (const id of active) list.append(sourceCard(id,2));
      host.append(heading,list);
    }
  }
  function render(){
    renderWidgets();
    for(const desk of desks) {
      const results=desk.querySelector<HTMLElement>('[data-owner-continue-results]');
      const status=desk.querySelector<HTMLElement>('[data-owner-overview-status]');
      if(!results||!status) continue;
      results.replaceChildren();
      if(!privateOK()){
        results.append(node('p','ws-owner-empty','Personal information is hidden; previous owner results were cleared.'));
        status.textContent='Private view closed';
        continue;
      }
      const ids=sources.filter(id=>selected.has(id));
      const ready=ids.filter(id=>current.get(id)?.status==='ready'&&current.get(id)?.envelope).length;
      status.textContent=ready?`${ready} authorized source${ready===1?'':'s'} available · temporary metadata`:
        ids.length?'No connected results · owner consent required':'All sources hidden';
      if(!ids.length){results.append(node('p','ws-owner-empty','Choose a source to see its connection state.'));continue;}
      const container=node('div','ws-owner-grid');
      const limit=desk.dataset.compact==='true'?2:6;
      for(const id of ids)container.append(sourceCard(id,limit));
      results.append(container);
      for(const input of desk.querySelectorAll<HTMLInputElement>('[data-owner-select]'))
        input.checked=selected.has(input.dataset.ownerSelect as ProviderId);
    }
  }
  for(const desk of desks){
    desk.addEventListener('change', event=>{
      const input=(event.target as HTMLElement).closest<HTMLInputElement>('[data-owner-select]');
      if(!input || !sources.includes(input.dataset.ownerSelect as ProviderId))return;
      const id=input.dataset.ownerSelect as ProviderId;
      if(input.checked)selected.add(id);else{selected.delete(id);current.delete(id);}
      expire();render();
    });
    desk.querySelector('[data-owner-refresh]')?.addEventListener('click',()=>{
      if(!privateOK())return;
      let refreshed=0;
      for(const id of sources){
        if(!selected.has(id))continue;
        const button=document.querySelector<HTMLButtonElement>(nativeRefresh[id]);
        if(!button||button.hidden||button.disabled||button.closest('[hidden]'))continue;
        button.click();refreshed++;
      }
      if(!refreshed){
        const label=desk.querySelector<HTMLElement>('[data-owner-overview-status]');
        if(label)label.textContent='No active owner reader here. Open the owner connection to refresh.';
      }
    });
  }
  listenOwnerContinue(onOwner);
  window.addEventListener('hub:identity',event=>{
    const detail=(event as CustomEvent).detail;
    identity=detail?.status==='signed-in'?detail.id:null;
    clear();
  });
  window.addEventListener('pagehide',clear);
  window.addEventListener('pageshow',event=>{if(event.persisted)clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();else render();});
  window.addEventListener('offline',render);
  window.addEventListener('online',render);
  const workspace=document.querySelector<HTMLElement>('[data-workspace]');
  if(workspace)new MutationObserver(()=>{if(!privateOK())clear();else render();})
    .observe(workspace,{attributes:true,attributeFilter:['data-calendar-private']});
  const workspaceContent=document.querySelector('[data-workspace-content]');
  if(workspaceContent)new MutationObserver(()=>renderWidgets()).observe(workspaceContent,{childList:true});
  render();
}

// Initialize after the rendering helpers and source metadata are defined.
if (desks.length) start(desks);
