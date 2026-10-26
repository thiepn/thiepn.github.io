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
  assets:Record<string,string>;
  inputSha256:Record<string,string>;
}
export interface OriginalKeepAuthority {
  mayMount():boolean;
  revoked:AbortSignal;
}
interface OriginalKeepModule {
  mountOriginalKeep(container:HTMLElement,authority:OriginalKeepAuthority):OriginalKeepMountHandle;
  createOriginalKeepEmptyHubWorkspace(authority:OriginalKeepAuthority):Promise<void>;
}
const PREFIX='/keep-b3-native/';
// Immutable manifest digest of the supplied K6 original KEEP B3 source tree.
const EXPECTED_SOURCE_SHA256='d76f1ef9a0d8fb93ee91a945c9640407b778d757db61925abe911abada8a3e0f';
const EXPECTED_INPUTS:Record<string,string>={
  'hub-embed/entry.tsx':'07779820d97f64a23920b9946f0ecaaffc4d7c32b917d3c07c7d387b75eb5eca',
  'hub-embed/vite.config.ts':'617dbbe87b2083719e187f3ff541f9e811a4955f273512335c99038592bca8df',
  'package.json':'653e357793d1361de10003e1ac819f74b791b780ea3e7a3b821c54082356a7e5',
  'bun.lock':'b62a4df384d47672d03dfe00527bce8e6415b05db129f97967d6e82044d043ba'
};
const SHA=/^[a-f0-9]{64}$/u;
const CONTENT_JS=/javascript|ecmascript/u;
const CONTENT_CSS=/css/u;
const SAFE_ASSET=/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/u;
async function sha256(bytes:ArrayBuffer):Promise<string>{
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
    .map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function validKeepNativeManifest(value:unknown):value is NativeManifest {
  if(!value||typeof value!=='object')return false;
  const v=value as Record<string,unknown>;
  return v.format==='thiepn-keep-b3-original-react'&&v.schema===1&&
    v.entry==='keep-b3-original.js'&&v.css==='keep-b3-original.css'&&
    v.sourceSha256===EXPECTED_SOURCE_SHA256&&
    typeof v.jsSha256==='string'&&SHA.test(v.jsSha256)&&
    typeof v.cssSha256==='string'&&SHA.test(v.cssSha256)&&
    !!v.assets&&typeof v.assets==='object'&&!Array.isArray(v.assets)&&
    Object.entries(v.assets).length>=2&&Object.entries(v.assets).length<=600&&
    Object.entries(v.assets).every(([name,digest])=>
      name!=='manifest.json'&&!name.includes('..')&&SAFE_ASSET.test(name)&&
      typeof digest==='string'&&SHA.test(digest))&&
    (v.assets as Record<string,string>)[v.entry as string]===v.jsSha256&&
    (v.assets as Record<string,string>)[v.css as string]===v.cssSha256&&
    !!v.inputSha256&&typeof v.inputSha256==='object'&&!Array.isArray(v.inputSha256)&&
    Object.keys(v.inputSha256).length===Object.keys(EXPECTED_INPUTS).length&&
    Object.entries(EXPECTED_INPUTS).every(([name,expected])=>
      (v.inputSha256 as Record<string,unknown>)[name]===expected);
}
/** Reuse an existing original KEEP owner DB; never silently initialize another one. */
async function requireExistingOriginalKeepDatabase(signal:AbortSignal):Promise<void>{
  if(typeof indexedDB.databases!=='function')
    throw new Error('This browser cannot verify an existing original KEEP database.');
  const databases=await indexedDB.databases();
  if(signal.aborted)throw new Error('KEEP owner session was revoked.');
  if(!databases.some(db=>db.name==='KeepNotesDB'&&db.version===1))
    throw new Error('No original KEEP B3 v1 database exists on this Hub origin. Nothing was created or migrated.');
  await new Promise<void>((resolve,reject)=>{
    const req=indexedDB.open('KeepNotesDB');
    req.onupgradeneeded=()=>{
      req.transaction?.abort();
      reject(new Error('Original KEEP schema initialization is forbidden in Hub.'));
    };
    req.onerror=()=>reject(req.error??new Error('Original KEEP database is unavailable.'));
    req.onblocked=()=>reject(new Error('Original KEEP database is busy in another tab.'));
    req.onsuccess=()=>{
      const db=req.result;
      const ok=db.version===1&&db.objectStoreNames.contains('notes')&&!signal.aborted;
      db.close();
      ok?resolve():reject(new Error('Original KEEP B3 notes store or owner session is unavailable.'));
    };
  });
}

async function verifiedAsset(name:string,expected:string,contentType:RegExp|null,signal:AbortSignal){
  const uri=new URL(PREFIX+name,location.origin);
  if(uri.origin!==location.origin)throw new Error('KEEP must load from Hub origin.');
  const response=await fetch(uri.href,{signal,cache:'no-store',credentials:'same-origin',redirect:'error'});
  if(!response.ok||(contentType&&!contentType.test(response.headers.get('content-type')??''))){
    throw new Error('The original KEEP build is not available on this Hub preview.');
  }
  if(await sha256(await response.arrayBuffer())!==expected){
    throw new Error('Original KEEP build integrity check failed.');
  }
  return uri.href;
}
/** Shared byte-verified original source loader for mount and explicit enrollment. */
async function loadVerifiedOriginalKeep(authority:OriginalKeepAuthority):Promise<{
  engine:OriginalKeepModule;css:string
}> {
  const signal=authority.revoked;
  if(signal.aborted||!authority.mayMount())throw new Error('KEEP owner authorization expired.');
  const response=await fetch(PREFIX+'manifest.json',{signal,cache:'no-store',credentials:'same-origin',redirect:'error'});
  if(!response.ok||!(response.headers.get('content-type')??'').includes('json'))
    throw new Error('Original KEEP React source has not been built into this preview.');
  const manifest:unknown=await response.json();
  if(!validKeepNativeManifest(manifest))throw new Error('Original KEEP build manifest is invalid.');
  // The original KEEP Vite build includes lazy modules, workers, wasm and
  // other assets. Verify the complete closure, not merely the entry JS/CSS.
  const all=Object.entries(manifest.assets);
  for(let start=0;start<all.length;start+=6){
    const batch=all.slice(start,start+6);
    await Promise.all(batch.map(([name,digest])=>verifiedAsset(name,digest,
       name===manifest.entry?CONTENT_JS:name===manifest.css?CONTENT_CSS:null,signal)));
  }
  const entry=new URL(PREFIX+manifest.entry,location.origin).href;
  const css=new URL(PREFIX+manifest.css,location.origin).href;
  if(signal.aborted||!authority.mayMount())throw new Error('KEEP owner authorization expired.');
  // The original B3 ESM module is verified by its complete asset closure.
  const engine=await import(/* @vite-ignore */ entry) as OriginalKeepModule;
  if(signal.aborted||!authority.mayMount())throw new Error('KEEP owner authorization expired.');
  return {engine,css};
}

/** Only a deliberate first-use action may create the original KEEP v1 schema. */
export async function createEmptyOriginalKeepInHub(authority:OriginalKeepAuthority):Promise<void> {
  if(authority.revoked.aborted||!authority.mayMount())
    throw new Error('KEEP owner authorization expired.');
  // Avoid even loading React unless this origin has no original KEEP DB.
  if(typeof indexedDB.databases!=='function')
    throw new Error('Browser cannot verify KEEP origin storage.');
  const existing=await indexedDB.databases();
  if(existing.some(db=>db.name==='KeepNotesDB'))
    throw new Error('Original KEEP source already exists. No data was changed.');
  const {engine}=await loadVerifiedOriginalKeep(authority);
  if(typeof engine.createOriginalKeepEmptyHubWorkspace!=='function')
    throw new Error('Original KEEP source enrollment export is missing.');
  await engine.createOriginalKeepEmptyHubWorkspace(authority);
}

/** Explicit opt-in, verified same-origin ESM React module; never an iframe. */
export async function mountOriginalKeepInHub(
  container:HTMLElement,authority:OriginalKeepAuthority
):Promise<OriginalKeepMountHandle> {
  if(!authority.mayMount()||authority.revoked.aborted||!container.isConnected||container.childElementCount)
    throw new Error('KEEP needs an empty workspace with current Hub owner authorization.');
  const signal=authority.revoked;
  await requireExistingOriginalKeepDatabase(signal);
  if(!authority.mayMount())throw new Error('KEEP owner authorization expired.');
  const {engine,css}=await loadVerifiedOriginalKeep(authority);
  if(typeof engine.mountOriginalKeep!=='function')
    throw new Error('The original KEEP React export is missing.');
  const style=document.createElement('link');
  style.rel='stylesheet';style.href=css;style.dataset.keepNativeStyle='true';
  document.head.appendChild(style);
  try {
    // Intentional runtime import: this module is created by the original
    // KEEP Vite build, not a Hub-generated alternative component.
    if(signal.aborted||!authority.mayMount()||!container.isConnected)
      throw new Error('KEEP owner authorization expired.');
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
