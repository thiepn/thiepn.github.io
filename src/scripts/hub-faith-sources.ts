import {getFaithTmsDue,clearFaithTmsDue} from '../lib/workspace/faith-source-session';
import {acceptMddReply,type MddDeviceSummary} from '../lib/workspace/mdd-device';
/** Only displays data that the original TMS60 Hub session already approved. */
function updateFaithTms(){
  const element=document.querySelector<HTMLElement>('[data-fd1-tms]');
  if(!element || document.hidden)return;
  const granted=getFaithTmsDue();
  element.textContent=granted
    ? `TMS60 authorized summary: ${granted.dueTaskCount} review tasks across ${granted.dueVerseCount} due verses · ${granted.newVerseCount} new verses (observed ${granted.observedAt}).`
    : 'TMS60 progress is unavailable until the original TMS60 Hub summary is authorized and opened.';
}
document.addEventListener('hub:faith-source-updated',updateFaithTms);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)clearFaithTmsDue();else updateFaithTms();
});
window.addEventListener('hub:identity',clearFaithTmsDue);
window.addEventListener('pagehide',clearFaithTmsDue);

type PendingMdd={nonce:string;origin:string;popup:Window;requestedAt:number};
let pendingMdd:PendingMdd|null=null, mddSummary:MddDeviceSummary|null=null;
const mddStatus=()=>document.querySelector<HTMLElement>('[data-fd1-mdd]');
function showMdd(){
  const box=mddStatus();if(!box || document.hidden)return;
  if(mddSummary && Date.parse(mddSummary.expiresAt)>Date.now()){
    const r=mddSummary.reading;
    box.textContent=(r.status==='assigned'
      ? `Explicit MDD device summary: ${r.completed} of ${r.assigned} original readings`
      : 'Original MDD reading plan is not assigned today')+
      ` · reflection ${mddSummary.reflection.exists?'exists':'not recorded'} · one-time device-only read.`;
  } else {
    mddSummary=null;
    box.textContent='My Daily Devotion owns reading and reflection records; no current device-only summary has been shared in this tab.';
  }
}
const clearMdd=()=>{pendingMdd=null;mddSummary=null;showMdd();};
function reviewedMddUrl():URL|null{
  try {
    const source=document.querySelector<HTMLScriptElement>('[data-workspace-apps]');
    const entries:unknown=JSON.parse(source?.textContent??'null');
    if(!Array.isArray(entries))return null;
    const found=entries.find((v:unknown)=>v && typeof v==='object' &&
      /^(my-daily-devotion|daily-devotion|mdd)$/.test(String((v as {id?:unknown}).id)));
    if(!found||typeof found.url!=='string')return null;
    const url=new URL(found.url);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return null;
    return url;
  }catch{return null}
}
document.addEventListener('click',event=>{
  const button=(event.target as HTMLElement)?.closest?.<HTMLButtonElement>('[data-fd1-mdd-connect]');
  if(!button)return;
  const owner=reviewedMddUrl();
  const box=mddStatus();
  if(!owner){if(box)box.textContent='No reviewed My Daily Devotion launch is registered in Hub. No request was sent.';return;}
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  const nonce=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  owner.searchParams.set('fd1_nonce',nonce);
  owner.searchParams.set('fd1_hub','https://thiepn.dev');
  const popup=window.open(owner.toString(),'_blank');
  if(!popup){if(box)box.textContent='The devotional app did not open. Allow this explicit popup or use its original app link.';return;}
  mddSummary=null;
  pendingMdd={nonce,origin:owner.origin,popup,requestedAt:Date.now()};
  if(box)box.textContent='In My Daily Devotion, explicitly select Share this device-only summary. No data is accessed automatically.';
});
window.addEventListener('message',event=>{
  const p=pendingMdd;
  if(!p||event.source!==p.popup||event.origin!==p.origin||
    Date.now()-p.requestedAt>300_000)return;
  const result=acceptMddReply(event.data,p.nonce);
  if(!result)return;
  pendingMdd=null;mddSummary=result;showMdd();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)showMdd()});
window.addEventListener('hub:identity',clearMdd);
window.addEventListener('pagehide',clearMdd);
document.addEventListener('click',e=>{
  if((e.target as HTMLElement)?.closest?.('[data-action=privacy]'))clearMdd();
});
