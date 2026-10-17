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
    box.textContent=(mddSummary.week ? 'Seven-day original MDD evidence was shared. ' : '')+(r.status==='assigned'
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
       (url.origin===location.origin&&(url.pathname==='/'||/\/(?:home|apps|folio)(?:\/|$)/.test(url.pathname)))||
       url.hostname==='localhost')return null;
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


/** Explicit original-device command flow: no record IDs or CAS revisions in URLs. */
type PendingFolioAction={
  nonce:string;popup:Window;resourceId:string;
  expectedUpdatedAt:string;operation:'habit.complete'|'habit.reopen';started:number;
};
let pendingFolioAction:PendingFolioAction|null=null;
let pendingFolioTimer:ReturnType<typeof setTimeout>|null=null;
function clearPendingFolio(){
  if(pendingFolioTimer!==null)clearTimeout(pendingFolioTimer);
  pendingFolioTimer=null;pendingFolioAction=null;
}
const folioNotice=()=>document.querySelector<HTMLElement>('[data-fd1-folio-receipt]');
document.addEventListener('click',event=>{
  const btn=(event.target as HTMLElement)?.closest?.<HTMLButtonElement>('[data-fd1-folio-operation]');
  if(!btn||document.hidden)return;
  const resourceId=btn.dataset.fd1FolioId??'';
  const expectedUpdatedAt=btn.dataset.fd1FolioRev??'';
  const operation=btn.dataset.fd1FolioOperation;
  if(!/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}$/.test(resourceId)||
     !Number.isFinite(Date.parse(expectedUpdatedAt))||
     (operation!=='habit.complete'&&operation!=='habit.reopen'))return;
  const status=folioNotice();
  if(pendingFolioAction){if(status)status.textContent='Finish or close the existing Folio review first.';return;}
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  const nonce=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  const url=new URL('/folio/',location.origin);
  // Nonce only. Never put private habit IDs, progress or CAS revisions in a URL.
  url.searchParams.set('fd1Action',nonce);
  const popup=window.open(url.href,'_blank');
  if(!popup){if(status)status.textContent='Allow this explicit Folio popup to review the requested action.';return;}
  pendingFolioAction={nonce,popup,resourceId,expectedUpdatedAt,operation,started:Date.now()};
  pendingFolioTimer=setTimeout(()=>{
    if(pendingFolioAction?.nonce===nonce){clearPendingFolio();const box=folioNotice();if(box)box.textContent='The Folio approval window expired without a receipt. No success is assumed.';}
  },180_000);
  if(status)status.textContent='Review and approve the original habit in the Folio popup. Hub cannot edit it directly.';
});
window.addEventListener('message',event=>{
  const p=pendingFolioAction;
  if(!p||event.origin!==location.origin||event.source!==p.popup||
     Date.now()-p.started>180_000||!event.data||event.data.nonce!==p.nonce)return;
  if(event.data.type==='thiepn:folio-fd1-ready:v1'){
    p.popup.postMessage({type:'thiepn:folio-fd1-command:v1',nonce:p.nonce,
      command:{idempotencyKey:p.nonce,operation:p.operation,resourceId:p.resourceId,
        expectedUpdatedAt:p.expectedUpdatedAt}},location.origin);
    return;
  }
  if(event.data.type!=='thiepn:folio-fd1-receipt:v1')return;
  const r=event.data.receipt;
  if(!r||r.idempotencyKey!==p.nonce||r.resourceId!==p.resourceId||
    r.operation!==p.operation||!['applied','conflict','denied','unavailable'].includes(r.result))return;
  clearPendingFolio();
  const box=folioNotice();
  if(box)box.textContent=r.result==='applied'
    ?'Original Folio action applied. Refresh the consented Folio snapshot to see the new status.'
    :r.result==='conflict'?'Original Folio record changed; no stale update was applied.'
    :r.result==='denied'?'Folio action declined; no changes reported.'
    :'Original Folio action unavailable. No success is assumed.';
});
window.addEventListener('pagehide',clearPendingFolio);
window.addEventListener('hub:identity',clearPendingFolio);
document.addEventListener('click',event=>{
  if((event.target as HTMLElement)?.closest?.('[data-action=privacy]'))clearPendingFolio();
});
