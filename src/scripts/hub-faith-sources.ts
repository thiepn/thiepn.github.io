import {getFaithTmsDue,clearFaithTmsDue} from '../lib/workspace/faith-source-session';
import {acceptMddReply,type MddDeviceSummary} from '../lib/workspace/mdd-device';
import {buildFaithReviewSignals} from '../lib/workspace/faith-weekly';
/** Only displays data that the original TMS60 Hub session already approved. */
function updateFaithTms(){
  const element=document.querySelector<HTMLElement>('[data-fd1-tms]');
  if(!element || document.hidden)return;
  const granted=getFaithTmsDue();
  const weekly=document.querySelector<HTMLElement>('[data-fd1-review-tms60]');
  if(weekly)weekly.textContent='TMS60: '+buildFaithReviewSignals({folio:null,mdd:null,tms:granted})[2].detail;
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
let mddExpiryTimer:ReturnType<typeof setTimeout>|null=null;
function cancelMddExpiry(){if(mddExpiryTimer!==null){clearTimeout(mddExpiryTimer);mddExpiryTimer=null;}}
const mddStatus=()=>document.querySelector<HTMLElement>('[data-fd1-mdd]');
function showMdd(){
  const box=mddStatus();if(!box || document.hidden)return;
  if(mddSummary && Date.parse(mddSummary.expiresAt)>Date.now()){
    const weekly=document.querySelector<HTMLElement>('[data-fd1-review-mdd]');
    if(weekly)weekly.textContent='My Daily Devotion: '+buildFaithReviewSignals({folio:null,mdd:mddSummary,tms:null})[1].detail;
    const r=mddSummary.reading;
    box.textContent=(r.status==='assigned'
      ? `Explicit MDD device summary: ${r.completed} of ${r.assigned} original readings`
      : 'Original MDD reading plan is not assigned today')+
      ` · reflection ${mddSummary.reflection.exists?'exists':'not recorded'} · one-time device-only read.`;
  } else {
    mddSummary=null;
    const weekly=document.querySelector<HTMLElement>('[data-fd1-review-mdd]');
    if(weekly)weekly.textContent='My Daily Devotion: '+buildFaithReviewSignals({folio:null,mdd:null,tms:null})[1].detail;
    box.textContent='My Daily Devotion owns reading and reflection records; no current device-only summary has been shared in this tab.';
  }
}
const clearMdd=()=>{cancelMddExpiry();pendingMdd=null;mddSummary=null;showMdd();};
function reviewedMddUrl(button:HTMLButtonElement):URL|null {
  // The URL originates from the exact reviewed app entry rendered by Hub.
  // Never fall back to an invented deployment URL or an arbitrary input.
  try {
    const raw=button.dataset.fd1MddUrl;
    if(!raw)return null;
    const url=new URL(raw);
    if(url.protocol!=='https:'||url.username||url.password||url.search||
       (url.hash&&!/^#\/today\/?$/.test(url.hash))||
       url.origin==='https://thiepn.dev' || url.hostname==='localhost')return null;
    // Original MDD uses a HashRouter. The handoff query stays BEFORE #/today.
    url.hash='#/today';
    return url;
  } catch{return null}
}
document.addEventListener('click',event=>{
  const button=(event.target as HTMLElement)?.closest?.<HTMLButtonElement>('[data-fd1-mdd-connect]');
  if(!button)return;
  const owner=reviewedMddUrl(button);
  const box=mddStatus();
  if(!owner){if(box)box.textContent='No reviewed My Daily Devotion launch is registered in Hub. No request was sent.';return;}
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  const nonce=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  owner.searchParams.set('fd1_nonce',nonce);
  owner.searchParams.set('fd1_hub','https://thiepn.dev');
  const popup=window.open(owner.toString(),'_blank');
  if(!popup){if(box)box.textContent='The devotional app did not open. Allow this explicit popup or use its original app link.';return;}
  cancelMddExpiry();mddSummary=null;
  pendingMdd={nonce,origin:owner.origin,popup,requestedAt:Date.now()};
  if(box)box.textContent='In My Daily Devotion, explicitly select Share this device-only summary. No data is accessed automatically.';
});
window.addEventListener('message',event=>{
  const p=pendingMdd;
  if(!p||event.source!==p.popup||event.origin!==p.origin||
    Date.now()-p.requestedAt>300_000)return;
  const result=acceptMddReply(event.data,p.nonce);
  if(!result)return;
  cancelMddExpiry();
  pendingMdd=null;mddSummary=result;showMdd();
  const delay=Date.parse(result.expiresAt)-Date.now();
  if(delay>0) mddExpiryTimer=setTimeout(()=>{mddExpiryTimer=null;mddSummary=null;showMdd();},Math.min(delay+50,61_000));
  else {mddSummary=null;showMdd();}
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)showMdd()});
window.addEventListener('hub:identity',clearMdd);
window.addEventListener('pagehide',clearMdd);
document.addEventListener('click',e=>{
  if((e.target as HTMLElement)?.closest?.('[data-action=privacy]'))clearMdd();
});
