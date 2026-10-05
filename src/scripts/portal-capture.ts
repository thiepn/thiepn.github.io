import {registerNoteDestination} from '../lib/workflows/integrated';
import {hubIdentity,readHubNotesConsent} from './portal-auth';
import {HubNotesSession,CAPTURE_PENDING_KEY} from '../lib/hub-notes-session';
import {NotesCapture} from '../lib/notes-capture';
import {managedQuery,managedFragment,managedCallback,managedTarget} from '../lib/hub-managed-return';
const root=document.querySelector<HTMLElement>('[data-private-capture]');
if(root){
  const status=root.querySelector<HTMLElement>('[data-capture-status]')!,form=root.querySelector<HTMLFormElement>('form')!;
  const title=form.elements.namedItem('title') as HTMLInputElement,content=form.elements.namedItem('content') as HTMLTextAreaElement;
  const select=root.querySelector<HTMLButtonElement>('[data-capture-select]')!,connect=root.querySelector<HTMLButtonElement>('[data-capture-connect]')!,save=root.querySelector<HTMLButtonElement>('[data-capture-save]')!,fresh=root.querySelector<HTMLButtonElement>('[data-capture-new]')!,erase=root.querySelector<HTMLButtonElement>('[data-capture-erase]')!,disconnect=root.querySelector<HTMLButtonElement>('[data-capture-disconnect]')!;
  const owner=()=>hubIdentity.status==='signed-in'?hubIdentity.id:null;
  const callback=managedCallback&&managedTarget===CAPTURE_PENDING_KEY;
  let session:HubNotesSession|null=null,draft:NotesCapture|null=null,abort:AbortController|null=null,epoch=0,used=false,busy=false,storageError=false;
  try{if(location.origin!=='https://thiepn.dev'||import.meta.env.PUBLIC_HUB_ACCOUNT_ENTRY!=='v1')throw Error();session=new HubNotesSession({capture:true,clientId:import.meta.env.PUBLIC_HUB_CAPTURE_CLIENT_ID??'',platformOrigin:'',publishableKey:import.meta.env.PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY??''},sessionStorage,owner);}catch{status.textContent='Capture connection unavailable. Open Notes to create a note.';}
  function controls(){const masked=Boolean(root!.hidden||document.hidden);const d=draft?.snapshot();select.disabled=busy||masked||!owner();connect.disabled=busy||masked||!session||!draft;save.disabled=busy||masked||storageError||!session?.connected()||!draft||d?.state==='confirmed'||!(d?.title.trim()||d?.content.trim());title.readOnly=content.readOnly=busy||d?.state!=='draft';fresh.hidden=d?.state!=='confirmed';fresh.disabled=erase.disabled=busy||masked;erase.disabled ||= d?.state==='uncertain';save.textContent=d?.state==='uncertain'?'Retry the same save':'Save to Notes';disconnect.hidden=!session?.connected();}
  function clear(removePending=true){++epoch;abort?.abort();abort=null;draft?.clear();draft=null;session?.clear(removePending);busy=false;storageError=false;title.value=content.value='';form.hidden=true;status.textContent='Choose your destination to start or recover a draft.';controls();}
  function choose(){const id=owner();if(!id||root!.hidden||document.hidden)return;draft=new NotesCapture(id,localStorage,owner,(command,signal)=>session!.capture(command,signal));const d=draft.snapshot();title.value=d.title;content.value=d.content;form.hidden=false;status.textContent=d.state==='uncertain'?'The previous save outcome is unknown. Reconnect and retry the same save; your text is preserved.':d.state==='confirmed'?'A receipt for the previous save is stored in this browser. Open Notes to see it, or start a new draft.':'Draft destination selected. Connect capture before saving.';controls();}
  if(import.meta.env.PUBLIC_HUB_WORKFLOWS_PRIVATE==='staged-v1')registerNoteDestination({available:()=>Boolean(session)&&!busy&&!storageError&&!root!.hidden&&!document.hidden,prepare:(id,note)=>{
    if(id!==owner())throw Error('Account changed');
    if(!draft)choose();
    if(!draft)throw Error('Draft unavailable');
    const d=draft.snapshot();
    if(note){if(d.state!=='draft'||d.title||d.content)throw Error('Existing draft preserved');draft.edit(note.title,note.content);title.value=note.title;content.value=note.content;}
    status.textContent='Destination selected. Review your draft and connect capture before saving.';form.hidden=false;root!.scrollIntoView({block:'nearest'});controls();
  }});
  select.addEventListener('click',()=>{if(busy)return;clear();try{choose();}catch{status.textContent='Cannot recover this browser draft. Stored text has been kept.';}});
  form.addEventListener('input',()=>{try{draft?.edit(title.value,content.value);storageError=false;}catch{storageError=true;status.textContent='Draft could not be stored. Copy your text before leaving; saving is paused.';}controls();});
  connect.addEventListener('click',()=>void(async()=>{const id=owner(),generation=epoch;if(!session||!id||!draft||busy)return;busy=true;controls();try{const consent=await readHubNotesConsent(id);if(generation!==epoch||id!==owner())return;const url=await session.begin(id,consent);if(generation===epoch&&id===owner()&&!root!.hidden&&!document.hidden)location.assign(url);}catch{if(generation===epoch)status.textContent='Enable creation in Account sharing, then connect again. Your draft is kept.';}finally{if(generation===epoch){busy=false;controls();}}})());
  form.addEventListener('submit',e=>{e.preventDefault();void(async()=>{if(save.disabled||!draft)return;const generation=epoch,active=draft;abort=new AbortController();busy=true;controls();status.textContent='Saving to Notes…';try{await active.save(abort.signal);if(generation===epoch){status.textContent='Notes confirmed this save. Open Notes to read it after sync.';}}catch{if(generation===epoch)status.textContent='Save outcome is unknown. Your draft is kept. Retry the same save to check or complete it.';}finally{if(generation===epoch){busy=false;controls();}}})();});
  fresh.addEventListener('click',()=>{try{draft?.newDraft();title.value=content.value='';status.textContent='New draft ready.';controls();}catch{status.textContent='Could not store a new draft. Previous receipt is kept.';}});
  erase.addEventListener('click',()=>{try{draft?.erase();title.value=content.value='';status.textContent='Local draft erased.';controls();}catch{status.textContent='Reconcile the previous save before erasing its draft.';}});
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('thiepn:hub-notes:clear:v1'):null;
  disconnect.addEventListener('click',()=>{clear();channel?.postMessage({type:'clear'});});channel?.addEventListener('message',()=>clear());
  async function identityChanged(){clear(!callback||used);if(!callback||used||!owner()||!session||root!.hidden||document.hidden)return;used=true;const generation=epoch;try{await session.complete(managedQuery,managedFragment);if(generation!==epoch)return;choose();status.textContent='Capture connected. Saving requires your confirmation.';controls();}catch{if(generation===epoch){clear();status.textContent='Capture return unavailable. Your stored draft is kept; choose its destination and reconnect.';}}}
  window.addEventListener('hub:identity',()=>void identityChanged());window.addEventListener('pagehide',()=>clear(false));window.addEventListener('pageshow',e=>{if(e.persisted)clear();});
  window.addEventListener('storage',e=>{if(e.key==='thiepn:hub-auth:v1'||e.key?.startsWith('thiepn:hub-capture:draft:'))clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear(false);else if(callback&&!used)void identityChanged();controls();});
  new MutationObserver(()=>{if(root!.hidden)clear(!callback||used);controls();}).observe(root,{attributes:true,attributeFilter:['hidden']});
  controls();void identityChanged();
}
