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
