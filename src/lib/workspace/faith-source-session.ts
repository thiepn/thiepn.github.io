/**
 * Ephemeral in-tab display projection from the ORIGINAL TMS60 consented Hub
 * session. Never accesses the TMS60 database, stores tokens or grants access.
 */
export interface FaithTmsDue {
  dueTaskCount:number;dueVerseCount:number;newVerseCount:number;
  observedAt:string;expiresAt:string;
}
let current:FaithTmsDue|null=null;
const count=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0&&Number(x)<=100000;
export function clearFaithTmsDue(){
  current=null;
  if(typeof document!=='undefined')document.dispatchEvent(new Event('hub:faith-source-updated'));
}
export function publishFaithTmsDue(
  raw: {data?: {dueTaskCount?:unknown;dueVerseCount?:unknown;newVerseCount?:unknown};observedAt?:unknown;expiresAt?:unknown;status?:unknown},
  granted:boolean, now=Date.now()
):boolean{
  current=null;
  const a=raw.data, observed=typeof raw.observedAt==='string'?Date.parse(raw.observedAt):NaN;
  const expires=typeof raw.expiresAt==='string'?Date.parse(raw.expiresAt):NaN;
  if(!granted||!['ready','empty'].includes(String(raw.status))||!a||
    !count(a.dueTaskCount)||!count(a.dueVerseCount)||!count(a.newVerseCount)||
    !Number.isFinite(observed)||!Number.isFinite(expires)||
    observed>now+5000||expires<=now||expires<=observed){
    clearFaithTmsDue();return false;
  }
  current={
    dueTaskCount:Number(a.dueTaskCount),dueVerseCount:Number(a.dueVerseCount),
    newVerseCount:Number(a.newVerseCount),observedAt:String(raw.observedAt),expiresAt:String(raw.expiresAt)
  };
  if(typeof document!=='undefined')document.dispatchEvent(new Event('hub:faith-source-updated'));
  return true;
}
export function getFaithTmsDue(now=Date.now()):FaithTmsDue|null{
  if(!current||Date.parse(current.expiresAt)<=now)return null;
  return current;
}
