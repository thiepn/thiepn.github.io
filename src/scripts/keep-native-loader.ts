/**
 * Native Hub adapter for the ORIGINAL KEEP B3 compiled React module.
 * The engine is built from the complete original source, never imitated here.
 * This adapter does not load remote code or handle vault keys.
 */
export interface OriginalKeepMountHandle {
  lock():void;
  unmount():void;
  isEncrypted():boolean;
  isUnlocked():boolean;
}
interface NativeManifest {
  format:'thiepn-keep-b3-original-react';
  schema:1;
  entry:'keep-b3-original.js';
  css:'keep-b3-original.css';
  sourceSha256:string;
  jsSha256:string;
  cssSha256:string;
}
export interface OriginalKeepAuthority {
  mayMount():boolean;
  revoked:AbortSignal;
}
interface OriginalKeepModule {
  mountOriginalKeep(container:HTMLElement,authority:OriginalKeepAuthority):OriginalKeepMountHandle;
}
const PREFIX='/keep-b3-native/';
const SHA=/^[a-f0-9]{64}$/u;
const CONTENT_JS=/javascript|ecmascript/u;
const CONTENT_CSS=/css/u;
async function sha256(bytes:ArrayBuffer):Promise<string>{
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
    .map(n=>n.toString(16).padStart(2,'0')).join('');
}
function validManifest(value:unknown):value is NativeManifest {
  if(!value||typeof value!=='object')return false;
  const v=value as Record<string,unknown>;
  return v.format==='thiepn-keep-b3-original-react'&&v.schema===1&&
    v.entry==='keep-b3-original.js'&&v.css==='keep-b3-original.css'&&
    typeof v.sourceSha256==='string'&&SHA.test(v.sourceSha256)&&
    typeof v.jsSha256==='string'&&SHA.test(v.jsSha256)&&
    typeof v.cssSha256==='string'&&SHA.test(v.cssSha256);
}
async function verifiedAsset(name:string,expected:string,contentType:RegExp,signal:AbortSignal){
  const uri=new URL(PREFIX+name,location.origin);
  if(uri.origin!==location.origin)throw new Error('KEEP must load from Hub origin.');
  const response=await fetch(uri.href,{signal,cache:'no-store',credentials:'same-origin',redirect:'error'});
  if(!response.ok||!contentType.test(response.headers.get('content-type')??'')){
    throw new Error('The original KEEP build is not available on this Hub preview.');
  }
  if(await sha256(await response.arrayBuffer())!==expected){
    throw new Error('Original KEEP build integrity check failed.');
  }
  return uri.href;
}
/** Explicit opt-in, verified same-origin ESM React module; never an iframe. */
export async function mountOriginalKeepInHub(
  container:HTMLElement,authority:OriginalKeepAuthority
):Promise<OriginalKeepMountHandle> {
  if(!authority.mayMount()||authority.revoked.aborted||!container.isConnected||container.childElementCount)
    throw new Error('KEEP needs an empty workspace with current Hub owner authorization.');
  const signal=authority.revoked;
  const response=await fetch(PREFIX+'manifest.json',{signal,cache:'no-store',credentials:'same-origin',redirect:'error'});
  if(!response.ok||!(response.headers.get('content-type')??'').includes('json'))
    throw new Error('Original KEEP React source has not been built into this preview.');
  const manifest:unknown=await response.json();
  if(!validManifest(manifest))throw new Error('Original KEEP build manifest is invalid.');
  const [entry,css]=await Promise.all([
    verifiedAsset(manifest.entry,manifest.jsSha256,CONTENT_JS,signal),
    verifiedAsset(manifest.css,manifest.cssSha256,CONTENT_CSS,signal)
  ]);
  if(signal.aborted||!authority.mayMount())throw new Error('KEEP owner authorization expired.');
  const style=document.createElement('link');
  style.rel='stylesheet';style.href=css;style.dataset.keepNativeStyle='true';
  document.head.appendChild(style);
  try {
    // Intentional runtime import: this module is created by the original
    // KEEP Vite build, not a Hub-generated alternative component.
    const engine=await import(/* @vite-ignore */ entry) as OriginalKeepModule;
    if(signal.aborted||!authority.mayMount()||!container.isConnected)
      throw new Error('KEEP owner authorization expired.');
    if(typeof engine.mountOriginalKeep!=='function')
      throw new Error('The original KEEP React export is missing.');
    const handle=engine.mountOriginalKeep(container,authority);
    let live=true;
    const onRevoke=()=>{release();};
    function release(){
      if(!live)return;
      live=false;signal.removeEventListener('abort',onRevoke);
      try{handle.unmount();}finally{style.remove();}
    }
    signal.addEventListener('abort',onRevoke,{once:true});
    if(signal.aborted){release();throw new Error('KEEP owner authorization expired.');}
    return {
      isEncrypted:()=>live&&handle.isEncrypted(),
      isUnlocked:()=>live&&handle.isUnlocked(),
      lock:()=>{if(live)handle.lock();},
      unmount:release
    };
  }catch(error){style.remove();throw error;}
}
