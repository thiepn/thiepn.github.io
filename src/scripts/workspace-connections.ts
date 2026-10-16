import {CONNECTED_SOURCES,sourceStates,listenSourceStates,safeDiagnostics,sourcePresentation} from '../lib/providers/connection-state';
import {hubIdentity} from './portal-auth';
import manifest from '../generated/launch-manifest.json';
const root=document.querySelector<HTMLElement>('[data-connection-center]');
if(root){
 const render=()=>{
  const states=sourceStates();
  const workspace=document.querySelector<HTMLElement>('[data-workspace]');
  const hidden=workspace?.dataset.calendarPrivate==='true'||workspace?.dataset.calendarPrivate==='pending';
  for(const source of CONNECTED_SOURCES){
   const row=states.find(state=>state.source===source), view=sourcePresentation(row,hubIdentity.status==='signed-in',hidden);
   const status=root.querySelector<HTMLElement>(`[data-source-status="${source}"]`), detail=root.querySelector<HTMLElement>(`[data-source-detail="${source}"]`), repair=root.querySelector<HTMLElement>(`[data-source-repair="${source}"]`);
   if(status)status.textContent=view.label;
   if(detail)detail.textContent=[row?.lastSuccessAt?'Last successful read '+new Date(row.lastSuccessAt).toLocaleString():'No successful read in this tab',row?.errorCode?'Code: '+row.errorCode:''].filter(Boolean).join(' · ');
   if(repair && repair.dataset.repair!==view.repair){repair.dataset.repair=view.repair;repair.replaceChildren();if(view.repair!=='none'){
    const action=document.createElement(view.repair==='sharing'?'a':'button');action.className='ws-text-button';action.textContent=view.action;
    if(action instanceof HTMLAnchorElement){action.href=source==='tms60'?'https://account.thiepn.dev/hub/tms60':'https://account.thiepn.dev/hub/connections';action.rel='noreferrer';}
    else{action.type='button';action.dataset.action=view.repair==='account'?'account':'refresh-connections';}
    repair.append(action);
   }}
   if(repair?.firstElementChild && repair.firstElementChild.textContent!==view.action)repair.firstElementChild.textContent=view.action;
  }
  root.querySelectorAll<HTMLButtonElement>('[data-action=refresh-connections]').forEach(button=>button.disabled=hubIdentity.status!=='signed-in'||states.some(row=>row.status==='checking')||document.hidden||hidden);
 };
 const workspace=document.querySelector('[data-workspace]');if(workspace)new MutationObserver(render).observe(workspace,{attributes:true,attributeFilter:['data-calendar-private']});
 listenSourceStates(render);window.addEventListener('hub:identity',render);render();
 const timer=setInterval(render,1000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 root.querySelector('[data-export-diagnostics]')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({...safeDiagnostics(),launchSource:manifest.source},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='thiepn-hub-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
}
