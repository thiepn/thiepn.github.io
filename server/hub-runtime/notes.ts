import type{HubServerEnv}from'./env.js';import{validUuid}from'./env.js';import{readBoundedJson,readRequestJson}from'./bounded-json.js';import{failure,privateJson,requestId,sameOriginAllowed,success}from'./response.js';import{verifyManagedBearer,type ManagedIdentity}from'./auth.js';
type Operation='summary'|'continue'|'search';
type Authorization={accountId:string;consumer:'thiepn-hub';audience:'notes-hub';permissions:string[];grantRevision:string;expiresAt:number;accountState:'active';notesSyncAccess:true};
type Context={scope:'account';accountId:string;workspaceId:null;grantRevision:string;translationId:null};
type ProviderRequest={providerId:'notes';operation:Operation;requestId:string;context:Context;query?:string};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const token=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(v);
const purposes=['notes.hub.summary.read','notes.hub.continue.read','notes.hub.search.read'];
const hasControl=(s:string)=>/[\u0000-\u001f\u007f]/.test(s);
const unavailable=(request:Request,id:string,status=503)=>failure(request,id,'HUB_PRIVATE_UNAVAILABLE',status);
function parseAccess(value:unknown):{operation:Operation;grantRevision:string}{
  if(!object(value)||!exact(value,['operation','grantRevision'])||!['summary','continue','search'].includes(String(value.operation))||!validUuid(value.grantRevision))throw new Error('bad');
  const grantRevision=value.grantRevision;if(!validUuid(grantRevision))throw new Error('bad');
  return{operation:value.operation as Operation,grantRevision};
}
function parseProviderRequest(value:unknown):ProviderRequest{
  if(!object(value)||!['summary','continue','search'].includes(String(value.operation)))throw new Error('bad');
  const searching=value.operation==='search';
  if(!exact(value,['providerId','operation','requestId','context',...(searching?['query']:[])])||value.providerId!=='notes'||!token(value.requestId)||!object(value.context)||!exact(value.context,['scope','accountId','workspaceId','grantRevision','translationId'])||value.context.scope!=='account'||!validUuid(value.context.accountId)||value.context.workspaceId!==null||!validUuid(value.context.grantRevision)||value.context.translationId!==null||(searching&&(typeof value.query!=='string'||!value.query.trim()||value.query.length>256||hasControl(value.query)))||(!searching&&value.query!==undefined))throw new Error('bad');
  return structuredClone(value) as ProviderRequest;
}
function validAuthorization(value:unknown,identity:ManagedIdentity,operation:Operation,revision:string,now:number):value is Authorization{
  return object(value)&&exact(value,['accountId','accountState','audience','consumer','expiresAt','grantRevision','notesSyncAccess','permissions'])&&value.accountId===identity.userId&&value.consumer==='thiepn-hub'&&value.audience==='notes-hub'&&value.accountState==='active'&&value.notesSyncAccess===true&&value.grantRevision===revision&&Array.isArray(value.permissions)&&value.permissions.length<=3&&new Set(value.permissions).size===value.permissions.length&&value.permissions.every(p=>typeof p==='string'&&purposes.includes(p))&&value.permissions.includes('notes.hub.'+operation+'.read')&&Number.isSafeInteger(value.expiresAt)&&Number(value.expiresAt)>now&&Number(value.expiresAt)<=identity.expiresAt;
}
async function abortRace<T>(signal:AbortSignal,work:Promise<T>):Promise<T>{
  let detach=()=>{};
  const aborted=new Promise<never>((_,reject)=>{const onAbort=()=>reject(new Error('timeout'));detach=()=>signal.removeEventListener('abort',onAbort);if(signal.aborted)onAbort();else signal.addEventListener('abort',onAbort,{once:true});});
  try{return await Promise.race([work,aborted]);}finally{detach();}
}
async function rpc(env:HubServerEnv,identity:ManagedIdentity,name:string,body:Record<string,unknown>,limit:number,signal:AbortSignal,http:typeof fetch){
  const work=(async()=>{let response:Response;try{response=await http(env.accountUrl+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:env.publishableKey,Authorization:'Bearer '+identity.bearer,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal});}catch{throw new Error('upstream');}if(!response.ok)throw new Error('upstream');return readBoundedJson(response.body,limit,signal);})();
  return abortRace(signal,work);
}
async function authorize(env:HubServerEnv,identity:ManagedIdentity,operation:Operation,revision:string,signal:AbortSignal,http:typeof fetch,now:number){
  const value=await rpc(env,identity,'authorize_thiepn_hub_notes',{p_operation:operation,p_revision:revision},4096,signal,http);
  if(!validAuthorization(value,identity,operation,revision,now))throw new Error('denied');return value;
}
function millis(value:unknown){const n=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||n>8.64e15)throw new Error('row');return n;}
function timestamp(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;}
function displayTitle(value:string){return Array.from(value.normalize('NFC'),p=>hasControl(p)?' ':p).join('').replace(/\s+/gu,' ').trim().slice(0,160)||'Untitled note';}
function projectRows(value:unknown,request:ProviderRequest,now:number){
  if(!Array.isArray(value)||value.length>(request.operation==='search'?20:10))throw new Error('row');
  const ids=new Set<string>();let sourceUpdatedAt:string|null=null;
  const items=value.map(row=>{
    if(!object(row)||!exact(row,['user_id','entity_type','entity_id','deleted_at','note_id','note_type','title','note_updated_at','archived_at','trashed_at','synced_at'])||row.user_id!==request.context.accountId||row.entity_type!=='note'||row.deleted_at!==null||!validUuid(row.entity_id)||row.note_id!==row.entity_id||!['text','checklist'].includes(String(row.note_type))||typeof row.title!=='string'||row.title.length>500||row.trashed_at!==null||(request.operation!=='search'&&row.archived_at!==null)||!timestamp(row.synced_at)||Date.parse(row.synced_at)>now+30000||ids.has(String(row.entity_id).toLowerCase()))throw new Error('row');
    if(row.archived_at!==null)millis(row.archived_at);
    const updated=millis(row.note_updated_at);if(updated>now+30000)throw new Error('row');
    const entityId=row.entity_id;if(!validUuid(entityId))throw new Error('row');
    const syncedAt=row.synced_at;if(!timestamp(syncedAt))throw new Error('row');
    ids.add(entityId.toLowerCase());if(sourceUpdatedAt===null||syncedAt>sourceUpdatedAt)sourceUpdatedAt=syncedAt;
    return{resourceId:entityId,title:displayTitle(row.title),updatedAt:new Date(updated).toISOString()};
  });
  return{items,sourceUpdatedAt};
}
type RuntimeOptions={env:HubServerEnv|null;http?:typeof fetch;now?:()=>number};
async function identityFor(request:Request,env:HubServerEnv,signal:AbortSignal,http:typeof fetch,now:()=>number){return abortRace(signal,verifyManagedBearer(request,env,signal,{http,now}));}
function authFailure(request:Request,id:string,error:unknown){
  const value=error instanceof Error?error.message:'unavailable';
  if(value==='required')return failure(request,id,'HUB_AUTH_REQUIRED',401);
  if(value==='invalid')return failure(request,id,'HUB_AUTH_INVALID',401);
  return failure(request,id,value==='timeout'?'HUB_TIMEOUT':'HUB_AUTH_UNAVAILABLE',value==='timeout'?504:503);
}
export async function handleNotesAccess(request:Request,options:RuntimeOptions){
  const id=requestId(request);if(!options.env)return failure(request,id,'HUB_PRIVATE_DISABLED',503);if(!sameOriginAllowed(request))return failure(request,id,'HUB_ORIGIN_DENIED',403);if(request.method!=='POST')return failure(request,id,'HUB_BAD_REQUEST',405);
  const controller=new AbortController(),signal=AbortSignal.any([request.signal,controller.signal]),timer=setTimeout(()=>controller.abort(),2000),http=options.http??fetch,now=options.now??Date.now;
  try{
    let input;try{input=parseAccess(await abortRace(signal,readRequestJson(request,1024,signal)));}catch(error){if(signal.aborted)return failure(request,id,'HUB_TIMEOUT',504);const large=error instanceof Error&&error.message==='too-large';return failure(request,id,large?'HUB_PAYLOAD_TOO_LARGE':'HUB_BAD_REQUEST',large?413:400);}
    let identity;try{identity=await identityFor(request,options.env,signal,http,now);}catch(error){return authFailure(request,id,error);}
    try{return success(request,id,await authorize(options.env,identity,input.operation,input.grantRevision,signal,http,now()));}catch{if(signal.aborted)return failure(request,id,'HUB_TIMEOUT',504);return unavailable(request,id,403);}
  }finally{clearTimeout(timer);controller.abort();}
}
export async function handleNotesProjection(request:Request,options:RuntimeOptions){
  const id=requestId(request);if(!options.env)return failure(request,id,'HUB_PRIVATE_DISABLED',503);if(!sameOriginAllowed(request))return failure(request,id,'HUB_ORIGIN_DENIED',403);if(request.method!=='POST')return failure(request,id,'HUB_BAD_REQUEST',405);
  const controller=new AbortController(),signal=AbortSignal.any([request.signal,controller.signal]),timer=setTimeout(()=>controller.abort(),2000),http=options.http??fetch,now=options.now??Date.now;
  try{
    let input:ProviderRequest;try{input=parseProviderRequest(await abortRace(signal,readRequestJson(request,4096,signal)));}catch(error){if(signal.aborted)return failure(request,id,'HUB_TIMEOUT',504);const large=error instanceof Error&&error.message==='too-large';return failure(request,id,large?'HUB_PAYLOAD_TOO_LARGE':'HUB_BAD_REQUEST',large?413:400);}
    let identity:ManagedIdentity;try{identity=await identityFor(request,options.env,signal,http,now);}catch(error){return authFailure(request,id,error);}
    if(identity.userId!==input.context.accountId)return unavailable(request,id,403);
    let initial:Authorization;try{initial=await authorize(options.env,identity,input.operation,input.context.grantRevision,signal,http,now());}catch{if(signal.aborted)return failure(request,id,'HUB_TIMEOUT',504);return unavailable(request,id,403);}
    let raw:unknown;try{raw=await rpc(options.env,identity,'read_thiepn_hub_notes',{p_operation:input.operation,p_revision:input.context.grantRevision,p_query:input.operation==='search'?input.query:null},65536,signal,http);}catch{if(signal.aborted)return failure(request,id,'HUB_TIMEOUT',504);return unavailable(request,id);}
    let current:Authorization;try{current=await authorize(options.env,identity,input.operation,input.context.grantRevision,signal,http,now());}catch{if(signal.aborted)return failure(request,id,'HUB_TIMEOUT',504);return unavailable(request,id,403);}
    try{
      const observed=now(),projected=projectRows(raw,input,observed),expires=Math.min(observed+300000,initial.expiresAt,current.expiresAt);if(expires<=observed)return unavailable(request,id,403);
      const envelope={schemaVersion:1,providerId:'notes',operation:input.operation,requestId:input.requestId,context:input.context,privacy:'private',coverage:'cloud-snapshot',status:projected.items.length?'ready':'empty',observedAt:new Date(observed).toISOString(),expiresAt:new Date(expires).toISOString(),sourceUpdatedAt:projected.sourceUpdatedAt,data:{items:projected.items}};
      if(new TextEncoder().encode(JSON.stringify(envelope)).byteLength>(input.operation==='search'?65536:32768))return unavailable(request,id);
      return privateJson(request,id,envelope);
    }catch{return unavailable(request,id);}
  }finally{clearTimeout(timer);controller.abort();}
}
