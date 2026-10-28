import {mountOriginalKeepInHub, type OriginalKeepMountHandle} from './keep-native-loader';

/** One mounted original KEEP React writer at a time; Hub owns no vault key. */
export interface NativeKeepController {
  start():Promise<void>;
  revoke():void;
  recheck():void;
  active():boolean;
}
export function attachNativeKeep(
  root:HTMLElement, authorized:()=>boolean,
  changed:()=>void, report:(message:string)=>void,
):NativeKeepController {
  const frame=root.querySelector<HTMLElement>('[data-keep-native-frame]');
  const host=root.querySelector<HTMLElement>('[data-keep-native-host]');
  const exit=root.querySelector<HTMLButtonElement>('[data-keep-native-exit]');
  const content=root.querySelector<HTMLElement>('[data-workspace-content]');
  let abort:AbortController|null=null,handle:OriginalKeepMountHandle|null=null,loading=false;
  let generation=0;
  const active=()=>!!handle;
  function revoke(){
    ++generation;
    const signal=abort;abort=null;signal?.abort();
    const current=handle;handle=null;loading=false;
    try{current?.lock();}finally{
      try{current?.unmount();}finally{
        host?.replaceChildren();
        if(frame)frame.hidden=true;
        if(exit)exit.hidden=true;
        // An inaccessible owner must never briefly display the previous Knowledge page.
        if(content)content.hidden=!authorized();
      }
    }
  }
  async function start(){
    if(loading||handle)return;
    if(!frame||!host||!exit||!content||!authorized())
      throw new Error('Original KEEP requires an authorized Hub Knowledge session.');
    if(!window.confirm('Open the original KEEP editor and encrypted vault on this Hub origin? Only existing original KEEP records are used. No data is migrated.'))return;
    const ticket=++generation,controller=new AbortController();
    abort=controller;loading=true;
    const mayMount=()=>ticket===generation&&!controller.signal.aborted&&authorized();
    try{
      const mounted=await mountOriginalKeepInHub(host,{mayMount,revoked:controller.signal});
      if(!mayMount()){mounted.unmount();throw new Error('KEEP authorization changed while opening.');}
      handle=mounted;loading=false;frame.hidden=false;exit.hidden=false;
      content.hidden=true;
      changed();
    }catch(error){
      if(ticket===generation){revoke();changed();}
      throw error;
    }
  }
  function recheck(){
    if((handle||loading)&&!authorized()){revoke();return;}
    if(handle){if(frame)frame.hidden=false;if(content)content.hidden=true;}
  }
  window.addEventListener('hub:identity',()=>{if(handle||loading)revoke();});
  window.addEventListener('pagehide',revoke);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(handle||loading))revoke();});
  window.addEventListener('storage',event=>{
    if(['keepnotes_vault_enc_header','keepnotes_vault_enc_config'].includes(event.key??'')&&(handle||loading))revoke();
  });
  // Never assume an earlier original origin may be opened through this host.
  void report;
  return {start,revoke,recheck,active};
}
