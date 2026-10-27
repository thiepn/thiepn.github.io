import type {OwnerDryRun,OwnerDryRunRow} from './legacy-migration-dry-run';
export type OwnerCaseChoice='KEEP_SEPARATE'|'REVIEW_SOURCE'|'REVIEW_HUB'|'DEFER';
export interface OwnerCaseChoiceInput {
 readonly kind:OwnerDryRunRow['kind'];
 readonly originalId:string;
 readonly observedStatus:OwnerDryRunRow['status'];
 readonly choice:OwnerCaseChoice;
}
export interface OwnerCaseworkReceipt {
 readonly owner:OwnerDryRun['owner'];
 readonly originalFileSha256:string;
 readonly hubRevision:number;
 readonly attachmentReferences:number;
 readonly reviewed:number;
 readonly held:number;
 readonly selected:Readonly<Record<OwnerCaseChoice,number>>;
 readonly sourceRightsApproved:false;
 readonly ownerBackupVerified:false;
 readonly destinationBackupVerified:false;
 readonly readyToMigrate:false;
 readonly writes:0;
 readonly blocked:true;
}
/** A read-only decision receipt, NOT an import/approval workflow. 
 * Never rewrite IDs, resolve ambiguous identity automatically or persist choices.
 */
export function reviewOriginalOwnerCases(
 plan:OwnerDryRun,
 decisions:readonly OwnerCaseChoiceInput[],
 observedSourceSha256:string,
 observedHubRevision:number,
):OwnerCaseworkReceipt {
 if(!/^[a-f0-9]{64}$/u.test(observedSourceSha256)||
    plan.originalFileSha256!==observedSourceSha256||
    plan.hubRevision!==observedHubRevision)
   throw new Error('Original owner casework receipt is stale or is for a different source/HUB version.');
 const records=new Map<string,OwnerDryRunRow>();
 for(const row of plan.rows)records.set(row.kind+'\u0000'+row.originalId,row);
 const selected:Record<OwnerCaseChoice,number>={KEEP_SEPARATE:0,REVIEW_SOURCE:0,REVIEW_HUB:0,DEFER:0};
 const reviewed=new Set<string>();
 for(const decision of decisions){
  const k=decision.kind+'\u0000'+decision.originalId,row=records.get(k);
  if(!row)throw new Error('Original owner casework references an unknown immutable record.');
  if(reviewed.has(k))throw new Error('Original owner casework contains competing decisions for the same record.');
  if(row.status!==decision.observedStatus)throw new Error('Original owner casework record status changed.');
  if(!Object.prototype.hasOwnProperty.call(selected,decision.choice))
   throw new Error('Original owner casework choice is unsupported.');
  reviewed.add(k);selected[decision.choice]++;
 }
 const held=plan.rows.length-reviewed.size+selected.DEFER+selected.REVIEW_SOURCE+selected.REVIEW_HUB;
 return {owner:plan.owner,originalFileSha256:plan.originalFileSha256,hubRevision:plan.hubRevision,
  attachmentReferences:plan.rows.reduce((sum,row)=>sum+row.originalAttachmentIds.length,0),
  reviewed:reviewed.size,held,selected,
  sourceRightsApproved:false,ownerBackupVerified:false,destinationBackupVerified:false,
  readyToMigrate:false,writes:0,blocked:true};
}

const esc=(s:string):string=>s.replace(/[&<>"']/gu,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]!));
/** Ephemeral review UI. Never stores source records or review choices in Hub. */
export const OWNER_CASE_PAGE_SIZE=80;
export function renderOriginalOwnerCaseworkForm(
 plan:OwnerDryRun,offset=0,decisions:readonly OwnerCaseChoiceInput[]=[],
):string {
 const limit=OWNER_CASE_PAGE_SIZE;
 if(!Number.isSafeInteger(offset)||offset<0||offset>=Math.max(plan.rows.length,1)||offset%limit!==0)
  throw new Error('Original owner casework page is invalid.');
 const visible=plan.rows.slice(offset,offset+limit);
 const selected=new Map(decisions.map(d=>[d.kind+'\\u0000'+d.originalId,d.choice]));
 const rows=visible.map((row,index)=>
  '<li><label><span>Case '+(offset+index+1)+' · '+esc(plan.owner)+' '+esc(row.kind)+
   ' · ID <code>'+esc(row.originalId)+'</code> · '+esc(row.status.replace(/_/gu,' '))+
   ' · '+row.originalAttachmentIds.length+' original attachments</span>'+
   '<select data-original-owner-choice data-case-kind="'+esc(row.kind)+
   '" data-case-id="'+esc(row.originalId)+'" data-case-status="'+esc(row.status)+'">'+
   '<option value=""'+(!selected.has(row.kind+'\\u0000'+row.originalId)?' selected':'')+'>Not reviewed</option>'+
   '<option value="KEEP_SEPARATE"'+(selected.get(row.kind+'\\u0000'+row.originalId)==='KEEP_SEPARATE'?' selected':'')+'>Keep in original owner</option>'+
   '<option value="REVIEW_SOURCE"'+(selected.get(row.kind+'\\u0000'+row.originalId)==='REVIEW_SOURCE'?' selected':'')+'>Review original source</option>'+
   '<option value="REVIEW_HUB"'+(selected.get(row.kind+'\\u0000'+row.originalId)==='REVIEW_HUB'?' selected':'')+'>Review Hub record</option>'+
   '<option value="DEFER"'+(selected.get(row.kind+'\\u0000'+row.originalId)==='DEFER'?' selected':'')+'>Hold for evidence</option>'+
   '</select></label></li>'
 ).join('');
 return '<section data-owner-casework aria-label="Original-owner conflict review">'+
  '<h4>Review individual source records</h4>'+
  '<ol class="ws-owner-case-list">'+rows+'</ol>'+
  (plan.rows.length>limit?
    '<nav class="ws-owner-case-pages" aria-label="Original source cases">'+
    '<button type="button" data-action="original-owner-page-prev"'+(offset===0?' disabled':'')+'>Previous 80</button>'+
    '<span>Records '+(offset+1)+'–'+Math.min(offset+limit,plan.rows.length)+' of '+plan.rows.length+'</span>'+
    '<button type="button" data-action="original-owner-page-next"'+(offset+limit>=plan.rows.length?' disabled':'')+'>Next 80</button>'+
    '</nav>':'')+
  '<p data-owner-casework-receipt role="status">No cases reviewed. Migration remains blocked.</p>'+
  '<p>Choices are temporary and cannot authorize imports, overwrite IDs or change source data.</p>'+
  '</section>';
}
export function renderOriginalOwnerCaseworkReceipt(receipt:OwnerCaseworkReceipt):string {
 return receipt.reviewed+' reviewed · '+receipt.held+' still held · '+
  receipt.attachmentReferences+' preserved original attachment references. Migration blocked.';
}
