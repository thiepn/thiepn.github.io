import {sourceStates,listenSourceStates,safeDiagnostics} from '../lib/providers/connection-state';
import manifest from '../generated/launch-manifest.json';
const root=document.querySelector<HTMLElement>('[data-connection-center]');
if(root){
 const labels={unconnected:'Sharing not enabled',checking:'Checking sharing…',ready:'Connected · fresh summary',empty:'Connected · no matching records',offline:'Offline · try again when connected',error:'Could not verify access · retry in Account',hidden:'Personal content hidden'};
 const render=()=>{root.querySelectorAll<HTMLElement>('[data-source-status]').forEach(el=>el.textContent='Connect Account to check sharing');for(const row of sourceStates()){const el=root.querySelector<HTMLElement>(`[data-source-status="${row.source}"]`);if(el)el.textContent=labels[row.status];}};
 listenSourceStates(render);render();
 root.querySelector('[data-export-diagnostics]')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({...safeDiagnostics(),launchSource:manifest.source},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='thiepn-hub-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
}
