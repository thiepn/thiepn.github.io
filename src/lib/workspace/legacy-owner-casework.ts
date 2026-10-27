import type {OwnerDryRun,OwnerDryRunRow} from './legacy-migration-dry-run';
export type OwnerCaseChoice='KEEP_SEPARATE'|'REVIEW_SOURCE'|'REVIEW_HUB'|'DEFER';
export const OWNER_CASE_FILTERS=['ALL','ID_COLLISION','TITLE_AMBIGUITY','MISSING_RELATION','SOURCE_ONLY'] as const;
export type OwnerCaseFilter=typeof OWNER_CASE_FILTERS[number];
/** Ephemeral status filter: original record indices and owner IDs remain authoritative. */
export function originalOwnerFilteredRows(plan:OwnerDryRun,filter:OwnerCaseFilter='ALL'){
 if(!(OWNER_CASE_FILTERS as readonly string[]).includes(filter))
  throw new Error('Original owner casework filter is unsupported.');
 return plan.rows.flatMap((row,index)=>filter==='ALL'||row.status===filter?[{row,index}]:[]);
}
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

/** Apply a reversible decision to exactly one visible page. Never authorizes a migration. */
export function applyOriginalOwnerPageChoice(
 plan:OwnerDryRun,
 decisions:readonly OwnerCaseChoiceInput[],
 offset:number,
 choice:'KEEP_SEPARATE'|null,
 observedSourceSha256:string,
 observedHubRevision:number,
 filter:OwnerCaseFilter='ALL',
):OwnerCaseChoiceInput[] {
 // Authenticate the old selection and its immutable source receipt *before*
 // changing anything; forged or stale case rows fail without partial updates.
 reviewOriginalOwnerCases(plan,decisions,observedSourceSha256,observedHubRevision);
 const matched=originalOwnerFilteredRows(plan,filter);
 if(!Number.isSafeInteger(offset)||offset<0||offset>=matched.length||offset%OWNER_CASE_PAGE_SIZE!==0)
   throw new Error('Original owner casework page is invalid.');
 const visible=matched.slice(offset,offset+OWNER_CASE_PAGE_SIZE);
 const key=(kind:string,id:string)=>kind+'\u0000'+id;
 const candidate=new Map<string,OwnerCaseChoiceInput>(decisions.map(row=>[key(row.kind,row.originalId),row] as const));
 for(const {row} of visible){
   const id=key(row.kind,row.originalId);
   if(choice===null)candidate.delete(id);
   else candidate.set(id,{kind:row.kind,originalId:row.originalId,observedStatus:row.status,choice});
 }
 const next=[...candidate.values()];
 reviewOriginalOwnerCases(plan,next,observedSourceSha256,observedHubRevision);
 return next;
}

const esc=(s:string):string=>s.replace(/[&<>"']/gu,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]!));
/** Ephemeral review UI. Never stores source records or review choices in Hub. */
export const OWNER_CASE_PAGE_SIZE=80;
const OWNER_CASE_FILTER_LABELS:Readonly<Record<OwnerCaseFilter,string>>={
 ALL:'All source cases',ID_COLLISION:'ID collisions',TITLE_AMBIGUITY:'Ambiguous titles',
 MISSING_RELATION:'Missing relations',SOURCE_ONLY:'Source-only',
};
export function renderOriginalOwnerCaseworkForm(
 plan:OwnerDryRun,offset=0,decisions:readonly OwnerCaseChoiceInput[]=[],filter:OwnerCaseFilter='ALL',
):string {
 const limit=OWNER_CASE_PAGE_SIZE,matched=originalOwnerFilteredRows(plan,filter);
 if(!Number.isSafeInteger(offset)||offset<0||offset>=Math.max(matched.length,1)||offset%limit!==0)
  throw new Error('Original owner casework page is invalid.');
 const visible=matched.slice(offset,offset+limit);
 const caseKey=(kind:string,id:string)=>kind+'\\u0000'+id;
 const selected=new Map(decisions.map(d=>[caseKey(d.kind,d.originalId),d.choice]));
 const rows=visible.map(({row,index})=>
  '<li><label><span>Case '+(index+1)+' · '+esc(plan.owner)+' '+esc(row.kind)+
   ' · ID <code>'+esc(row.originalId)+'</code> · '+esc(row.status.replace(/_/gu,' '))+
   ' · '+row.originalAttachmentIds.length+' original attachments</span>'+
   '<select data-original-owner-choice data-case-kind="'+esc(row.kind)+
   '" data-case-id="'+esc(row.originalId)+'" data-case-status="'+esc(row.status)+'">'+
   '<option value=""'+(!selected.has(caseKey(row.kind,row.originalId))?' selected':'')+'>Not reviewed</option>'+
   '<option value="KEEP_SEPARATE"'+(selected.get(caseKey(row.kind,row.originalId))==='KEEP_SEPARATE'?' selected':'')+'>Keep in original owner</option>'+
   '<option value="REVIEW_SOURCE"'+(selected.get(caseKey(row.kind,row.originalId))==='REVIEW_SOURCE'?' selected':'')+'>Review original source</option>'+
   '<option value="REVIEW_HUB"'+(selected.get(caseKey(row.kind,row.originalId))==='REVIEW_HUB'?' selected':'')+'>Review Hub record</option>'+
   '<option value="DEFER"'+(selected.get(caseKey(row.kind,row.originalId))==='DEFER'?' selected':'')+'>Hold for evidence</option>'+
   '</select></label></li>'
 ).join('');
 const unreviewed=matched.some(({row})=>!selected.has(caseKey(row.kind,row.originalId)));
 return '<section data-owner-casework aria-label="Original-owner conflict review">'+
  '<h4>Review individual source records</h4>'+
  '<div class="ws-owner-case-toolbar">'+
   '<label>Filter by conflict type<select aria-label="Filter original source cases" data-original-owner-filter>'+
   OWNER_CASE_FILTERS.map(status=>'<option value="'+status+'"'+(status===filter?' selected':'')+'>'+
    OWNER_CASE_FILTER_LABELS[status]+' ('+(status==='ALL'?plan.rows.length:plan.counts[status])+')</option>').join('')+
   '</select></label>'+
   '<span data-owner-case-summary>'+matched.length+' matching original records of '+plan.rows.length+'</span>'+
  '</div>'+
  (matched.length>limit?
    '<nav class="ws-owner-case-pages" aria-label="Original source cases">'+
    '<button type="button" data-action="original-owner-page-prev"'+(offset===0?' disabled':'')+'>Previous 80</button>'+
    '<span>Records '+(offset+1)+'–'+Math.min(offset+limit,matched.length)+' of '+matched.length+'</span>'+
    '<button type="button" data-action="original-owner-page-next"'+(offset+limit>=matched.length?' disabled':'')+'>Next 80</button>'+
    '</nav>':'')+
  '<div class="ws-owner-case-pages" aria-label="Visible-page review actions">'+
   '<button type="button" data-action="original-owner-next-unreviewed"'+(!unreviewed?' disabled':'')+'>Next unreviewed</button>'+
   '<button type="button" data-action="original-owner-page-keep"'+(!visible.length?' disabled':'')+'>Keep visible '+visible.length+' in original owner</button>'+
   '<button type="button" data-action="original-owner-page-clear"'+(!visible.length?' disabled':'')+'>Clear visible '+visible.length+' choices</button>'+
  '</div>'+
  '<p data-owner-casework-receipt role="status">No cases reviewed. Migration remains blocked.</p>'+
  (visible.length?'<ol class="ws-owner-case-list">'+rows+'</ol>':
   '<p data-owner-case-empty>No original cases match this conflict type.</p>')+
  '<p>Choices are temporary and cannot authorize imports, overwrite IDs or change source data.</p>'+
  '</section>';
}

export function renderOriginalOwnerCaseworkReceipt(receipt:OwnerCaseworkReceipt):string {
 return receipt.reviewed+' reviewed · '+receipt.held+' still held · '+
  receipt.attachmentReferences+' preserved original attachment references. Migration blocked.';
}
