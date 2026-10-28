import type {OwnerDryRun,OwnerDryRunRow} from './legacy-migration-dry-run';
export type OwnerCaseChoice='KEEP_SEPARATE'|'REVIEW_SOURCE'|'REVIEW_HUB'|'DEFER';
export const OWNER_CASE_FILTERS=['ALL','ID_COLLISION','TITLE_AMBIGUITY','MISSING_RELATION','SOURCE_ONLY'] as const;
export type OwnerCaseFilter=typeof OWNER_CASE_FILTERS[number];
export const OWNER_REVIEW_FILTERS=['ALL','UNREVIEWED','KEEP_SEPARATE','REVIEW_SOURCE','REVIEW_HUB','DEFER'] as const;
export type OwnerReviewFilter=typeof OWNER_REVIEW_FILTERS[number];
export const OWNER_MARK_FILTERS=['ALL','MARKED','UNMARKED'] as const;
export type OwnerMarkFilter=typeof OWNER_MARK_FILTERS[number];
const selectionKey=(kind:string,id:string)=>kind+'\\u0000'+id;
/** Original-source row queue; never reallocate IDs or persist decisions. */
export function originalOwnerFilteredRows(
 plan:OwnerDryRun,filter:OwnerCaseFilter='ALL',decisions:readonly OwnerCaseChoiceInput[]=[],
 reviewFilter:OwnerReviewFilter='ALL',marks:readonly OwnerMarkedCase[]=[],markFilter:OwnerMarkFilter='ALL',
){
 if(!(OWNER_CASE_FILTERS as readonly string[]).includes(filter)||
    !(OWNER_REVIEW_FILTERS as readonly string[]).includes(reviewFilter)||
    !(OWNER_MARK_FILTERS as readonly string[]).includes(markFilter))
  throw new Error('Original owner casework filter is unsupported.');
 reviewOriginalOwnerCases(plan,decisions,plan.originalFileSha256,plan.hubRevision);
 validateOriginalOwnerMarks(plan,marks,plan.originalFileSha256,plan.hubRevision);
 const marked=new Set(marks.map(mark=>immutableOwnerId(mark.kind,mark.originalId)));
 const chosen=new Map(decisions.map(x=>[selectionKey(x.kind,x.originalId),x.choice]));
 return plan.rows.flatMap((row,index)=>{
  const decision=chosen.get(selectionKey(row.kind,row.originalId));
  const showReview=reviewFilter==='ALL'||(reviewFilter==='UNREVIEWED'?decision===undefined:decision===reviewFilter);
  const inMarks=marked.has(immutableOwnerId(row.kind,row.originalId));
  const showMark=markFilter==='ALL'||(markFilter==='MARKED'?inMarks:!inMarks);
  return (filter==='ALL'||row.status===filter)&&showReview&&showMark?[{row,index}]:[];
 });
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
 reviewFilter:OwnerReviewFilter='ALL',
 marks:readonly OwnerMarkedCase[]=[],markFilter:OwnerMarkFilter='ALL',
):OwnerCaseChoiceInput[] {
 // Authenticate the old selection and its immutable source receipt *before*
 // changing anything; forged or stale case rows fail without partial updates.
 reviewOriginalOwnerCases(plan,decisions,observedSourceSha256,observedHubRevision);
 const matched=originalOwnerFilteredRows(plan,filter,decisions,reviewFilter,marks,markFilter);
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


/** A temporary mark is not an approval and does not contain original source bytes. */
export interface OwnerMarkedCase {
 readonly kind:OwnerDryRunRow['kind'];
 readonly originalId:string;
 readonly observedStatus:OwnerDryRunRow['status'];
}
export const OWNER_MARK_LIMIT=256;
const immutableOwnerId=(kind:string,id:string)=>JSON.stringify([kind,id]);
/** Verify all marks atomically against the exact source snapshot. */
export function validateOriginalOwnerMarks(
 plan:OwnerDryRun,marks:readonly OwnerMarkedCase[],sha:string,revision:number,
):void {
 reviewOriginalOwnerCases(plan,[],sha,revision);
 if(marks.length>OWNER_MARK_LIMIT)throw new Error('Original owner marked selection exceeds its memory limit.');
 const source=new Map(plan.rows.map(row=>[immutableOwnerId(row.kind,row.originalId),row]));
 const seen=new Set<string>();
 for(const mark of marks){
  const id=immutableOwnerId(mark.kind,mark.originalId);
  if(seen.has(id))throw new Error('Original owner case is marked twice.');
  seen.add(id);
  const row=source.get(id);
  if(!row||row.status!==mark.observedStatus)throw new Error('Original owner mark has changed source identity.');
 }
}
/** Mark or unmark only the visible filtered 80-row page; off-page marks are untouched. */
export function updateOriginalOwnerPageMarks(
 plan:OwnerDryRun,choices:readonly OwnerCaseChoiceInput[],marks:readonly OwnerMarkedCase[],
 offset:number,add:boolean,sha:string,revision:number,
 filter:OwnerCaseFilter='ALL',reviewFilter:OwnerReviewFilter='ALL',markFilter:OwnerMarkFilter='ALL',
):OwnerMarkedCase[] {
 reviewOriginalOwnerCases(plan,choices,sha,revision);
 validateOriginalOwnerMarks(plan,marks,sha,revision);
 const matched=originalOwnerFilteredRows(plan,filter,choices,reviewFilter,marks,markFilter);
 if(!Number.isSafeInteger(offset)||offset<0||offset>=matched.length||offset%OWNER_CASE_PAGE_SIZE!==0)
  throw new Error('Original owner marked page is invalid.');
 const candidate=new Map(marks.map(mark=>[immutableOwnerId(mark.kind,mark.originalId),mark]));
 for(const {row} of matched.slice(offset,offset+OWNER_CASE_PAGE_SIZE)){
  const id=immutableOwnerId(row.kind,row.originalId);
  if(add)candidate.set(id,{kind:row.kind,originalId:row.originalId,observedStatus:row.status});
  else candidate.delete(id);
 }
 const next=[...candidate.values()];
 validateOriginalOwnerMarks(plan,next,sha,revision);
 return next;
}
/** Apply a decision only to explicitly marked original cases, even across pages. */
export function applyOriginalOwnerMarkedChoice(
 plan:OwnerDryRun,choices:readonly OwnerCaseChoiceInput[],marks:readonly OwnerMarkedCase[],
 choice:OwnerCaseChoice|null,sha:string,revision:number,
):OwnerCaseChoiceInput[] {
 reviewOriginalOwnerCases(plan,choices,sha,revision);
 validateOriginalOwnerMarks(plan,marks,sha,revision);
 if(choice!==null&&!(['KEEP_SEPARATE','REVIEW_SOURCE','REVIEW_HUB','DEFER'] as const).includes(choice))
  throw new Error('Original owner marked choice is unsupported.');
 const next=new Map(choices.map(row=>[immutableOwnerId(row.kind,row.originalId),row]));
 for(const mark of marks){
  const id=immutableOwnerId(mark.kind,mark.originalId);
  if(choice===null)next.delete(id);
  else next.set(id,{...mark,choice});
 }
 const result=[...next.values()];
 reviewOriginalOwnerCases(plan,result,sha,revision);
 return result;
}


/** Source- and revision-pinned, strictly memory-only reversible casework. */
export const OWNER_CASE_HISTORY_LIMIT=12;
export interface OriginalOwnerCaseFrame {
 readonly owner:OwnerDryRun['owner'];
 readonly sourceSha256:string;
 readonly hubRevision:number;
 readonly choices:readonly OwnerCaseChoiceInput[];
 readonly marks:readonly OwnerMarkedCase[];
 readonly filter:OwnerCaseFilter;
 readonly reviewFilter:OwnerReviewFilter;
 readonly markFilter:OwnerMarkFilter;
 readonly page:number;
}
export interface OriginalOwnerCaseTimeline {
 readonly past:readonly OriginalOwnerCaseFrame[];
 readonly current:OriginalOwnerCaseFrame;
 readonly future:readonly OriginalOwnerCaseFrame[];
}
export function makeOriginalOwnerCaseFrame(
 plan:OwnerDryRun,choices:readonly OwnerCaseChoiceInput[],marks:readonly OwnerMarkedCase[],
 page:number,filter:OwnerCaseFilter='ALL',reviewFilter:OwnerReviewFilter='ALL',
 markFilter:OwnerMarkFilter='ALL',sha=plan.originalFileSha256,revision=plan.hubRevision,
):OriginalOwnerCaseFrame {
 reviewOriginalOwnerCases(plan,choices,sha,revision);
 validateOriginalOwnerMarks(plan,marks,sha,revision);
 const matched=originalOwnerFilteredRows(plan,filter,choices,reviewFilter,marks,markFilter);
 const maxPage=Math.floor(Math.max(0,matched.length-1)/OWNER_CASE_PAGE_SIZE);
 if(!Number.isSafeInteger(page)||page<0||page>maxPage)
   throw new Error('Original owner recovery page is invalid.');
 return {owner:plan.owner,sourceSha256:sha,hubRevision:revision,
  choices:choices.map(row=>({...row})),marks:marks.map(row=>({...row})),
  filter,reviewFilter,markFilter,page};
}
function verifyOriginalCaseFrame(plan:OwnerDryRun,frame:OriginalOwnerCaseFrame):OriginalOwnerCaseFrame {
 if(frame.owner!==plan.owner||frame.sourceSha256!==plan.originalFileSha256||frame.hubRevision!==plan.hubRevision)
  throw new Error('Original owner recovery source provenance changed.');
 return makeOriginalOwnerCaseFrame(plan,frame.choices,frame.marks,frame.page,
  frame.filter,frame.reviewFilter,frame.markFilter,frame.sourceSha256,frame.hubRevision);
}
function verifyOriginalCaseTimeline(plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline):void {
 if(timeline.past.length>OWNER_CASE_HISTORY_LIMIT||timeline.future.length>OWNER_CASE_HISTORY_LIMIT)
  throw new Error('Original owner recovery exceeded the history memory limit.');
 for(const frame of [...timeline.past,timeline.current,...timeline.future])verifyOriginalCaseFrame(plan,frame);
}
export function advanceOriginalOwnerCaseTimeline(
 plan:OwnerDryRun,history:OriginalOwnerCaseTimeline|null,frame:OriginalOwnerCaseFrame,
):OriginalOwnerCaseTimeline {
 const checked=verifyOriginalCaseFrame(plan,frame);
 if(!history)return {past:[],current:checked,future:[]};
 verifyOriginalCaseTimeline(plan,history);
 if(JSON.stringify(history.current)===JSON.stringify(checked))return history;
 return {past:[...history.past,history.current].slice(-OWNER_CASE_HISTORY_LIMIT),current:checked,future:[]};
}
export function traverseOriginalOwnerCaseTimeline(
 plan:OwnerDryRun,history:OriginalOwnerCaseTimeline,direction:'undo'|'redo',
):OriginalOwnerCaseTimeline {
 verifyOriginalCaseTimeline(plan,history);
 if(direction==='undo'){
  if(!history.past.length)return history;
  return {past:history.past.slice(0,-1),
   current:verifyOriginalCaseFrame(plan,history.past[history.past.length-1]!),
   future:[history.current,...history.future]};
 }
 if(direction==='redo'){
  if(!history.future.length)return history;
  return {past:[...history.past,history.current].slice(-OWNER_CASE_HISTORY_LIMIT),
   current:verifyOriginalCaseFrame(plan,history.future[0]!),
   future:history.future.slice(1)};
 }
 throw new Error('Unsupported original casework recovery direction.');
}


/** Selection-specific historical recovery only fills missing reviewed choices.
 * A divergent, independently authored current choice is always protected.
 * Source bytes, attachments and approval rights remain outside this engine.
 */
export interface OriginalOwnerSelectiveRecovery {
 readonly owner:OwnerDryRun['owner'];
 readonly sourceSha256:string;
 readonly hubRevision:number;
 readonly stepsBack:number;
 readonly currentWitness:string;
 readonly historicalWitness:string;
 readonly recoverable:number;
 readonly protectedCurrent:number;
 readonly unchanged:number;
 readonly unavailable:number;
 readonly blocked:true;
 readonly writes:0;
}
export function previewOriginalOwnerSelectiveRecovery(
 plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline,stepsBack:number,
):OriginalOwnerSelectiveRecovery {
 verifyOriginalCaseTimeline(plan,timeline);
 if(!Number.isSafeInteger(stepsBack)||stepsBack<1||stepsBack>timeline.past.length)
  throw new Error('Original owner historical generation is unavailable.');
 const current=timeline.current,history=timeline.past[timeline.past.length-stepsBack]!;
 const before=new Map(history.choices.map(c=>[immutableOwnerId(c.kind,c.originalId),c.choice]));
 const now=new Map(current.choices.map(c=>[immutableOwnerId(c.kind,c.originalId),c.choice]));
 let recoverable=0,protectedCurrent=0,unchanged=0,unavailable=0;
 for(const mark of current.marks){
  const key=immutableOwnerId(mark.kind,mark.originalId);
  const old=before.get(key),present=now.get(key);
  if(old===undefined)unavailable++;
  else if(present===undefined)recoverable++;
  else if(present===old)unchanged++;
  else protectedCurrent++;
 }
 return {owner:plan.owner,sourceSha256:plan.originalFileSha256,
  hubRevision:plan.hubRevision,stepsBack,
  currentWitness:JSON.stringify(current),historicalWitness:JSON.stringify(history),
  recoverable,protectedCurrent,unchanged,unavailable,blocked:true,writes:0};
}
/** Re-preflight every original frame and exact current/historical witness.
 * Conflict cases NEVER silently overwrite a current choice.
 */
export function applyOriginalOwnerSelectiveRecovery(
 plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline,preview:OriginalOwnerSelectiveRecovery,
):OwnerCaseChoiceInput[] {
 const fresh=previewOriginalOwnerSelectiveRecovery(plan,timeline,preview.stepsBack);
 if(JSON.stringify(preview)!==JSON.stringify(fresh))
  throw new Error('Original owner recovery preview expired after a source or review change.');
 const historical=timeline.past[timeline.past.length-preview.stepsBack]!;
 const previous=new Map(historical.choices.map(c=>[immutableOwnerId(c.kind,c.originalId),c]));
 const choices=new Map(timeline.current.choices.map(c=>[immutableOwnerId(c.kind,c.originalId),c]));
 for(const mark of timeline.current.marks){
  const key=immutableOwnerId(mark.kind,mark.originalId);
  const old=previous.get(key);
  if(old&&!choices.has(key))choices.set(key,{...old});
 }
 const restored=[...choices.values()];
 reviewOriginalOwnerCases(plan,restored,plan.originalFileSha256,plan.hubRevision);
 return restored;
}


/** Cross-visit recovery is independent per immutable original-source record.
 * A selected record may have a useful earlier reviewed generation even when
 * another record's latest reviewed generation comes from a different visit.
 * Newer current decisions always win; no auto-merge or owner writes exist.
 */
export interface OriginalOwnerCrossVisitCandidate extends OwnerCaseChoiceInput {
 readonly visitsBack:number;
}
export interface OriginalOwnerCrossVisitPreview {
 readonly owner:OwnerDryRun['owner'];
 readonly originalFileSha256:string;
 readonly hubRevision:number;
 readonly timelineWitness:string;
 readonly recoverable:readonly OriginalOwnerCrossVisitCandidate[];
 readonly protectedCurrent:number;
 readonly unchangedCurrent:number;
 readonly withoutHistory:number;
 readonly visitsUsed:number;
 readonly blocked:true;
 readonly writes:0;
 readonly readyToMigrate:false;
}
export function previewOriginalOwnerCrossVisitRecovery(
 plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline,
):OriginalOwnerCrossVisitPreview {
 verifyOriginalCaseTimeline(plan,timeline);
 const current=timeline.current;
 const present=new Map(current.choices.map(c=>[immutableOwnerId(c.kind,c.originalId),c]));
 const past=timeline.past;
 const latest=new Map<string,OriginalOwnerCrossVisitCandidate>();
 for(let index=past.length-1;index>=0;index--){
  const visit=past[index]!;
  const visitsBack=past.length-index;
  for(const choice of visit.choices){
   const key=immutableOwnerId(choice.kind,choice.originalId);
   if(!latest.has(key))latest.set(key,{...choice,visitsBack});
  }
 }
 const recoverable:OriginalOwnerCrossVisitCandidate[]=[];
 let protectedCurrent=0,unchangedCurrent=0,withoutHistory=0;
 for(const mark of current.marks){
  const key=immutableOwnerId(mark.kind,mark.originalId);
  const original=latest.get(key),active=present.get(key);
  if(!original){withoutHistory++;continue;}
  if(!active)recoverable.push({...original});
  else if(active.choice===original.choice)unchangedCurrent++;
  else protectedCurrent++;
 }
 const visitsUsed=new Set(recoverable.map(row=>row.visitsBack)).size;
 return {owner:plan.owner,originalFileSha256:plan.originalFileSha256,hubRevision:plan.hubRevision,
  timelineWitness:JSON.stringify({current:timeline.current,past:timeline.past,future:timeline.future}),
  recoverable,protectedCurrent,unchangedCurrent,withoutHistory,visitsUsed,
  blocked:true,writes:0,readyToMigrate:false};
}
/** The checked review receipt and every historical frame are revalidated at
 * apply time. Never overwrite an independently reviewed current record.
 */
export function applyOriginalOwnerCrossVisitRecovery(
 plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline,review:OriginalOwnerCrossVisitPreview,
):OwnerCaseChoiceInput[] {
 const fresh=previewOriginalOwnerCrossVisitRecovery(plan,timeline);
 if(JSON.stringify(fresh)!==JSON.stringify(review))
  throw new Error('Original owner cross-visit recovery is stale; make a fresh preview.');
 const chosen=new Map(timeline.current.choices.map(row=>[immutableOwnerId(row.kind,row.originalId),{...row}]));
 for(const {kind,originalId,observedStatus,choice} of fresh.recoverable){
  const key=immutableOwnerId(kind,originalId);
  if(chosen.has(key))throw new Error('An independently reviewed original record cannot be overwritten.');
  chosen.set(key,{kind,originalId,observedStatus,choice});
 }
 const result=[...chosen.values()];
 reviewOriginalOwnerCases(plan,result,plan.originalFileSha256,plan.hubRevision);
 return result;
}


/** A reviewer can opt out of any otherwise eligible historical decision.
 * A full current/source/history witness and exact selected original IDs are
 * checked again at apply. No source records, migration rights or ID changes.
 */
export interface OriginalOwnerCrossVisitSubsetReceipt {
 readonly owner:OwnerDryRun['owner'];
 readonly sourceSha256:string;
 readonly hubRevision:number;
 readonly fullPreviewWitness:string;
 readonly selected:readonly OriginalOwnerCrossVisitCandidate[];
 readonly excluded:number;
 readonly protectedCurrent:number;
 readonly writes:0;
 readonly blocked:true;
 readonly readyToMigrate:false;
}
export function previewOriginalOwnerCrossVisitSubset(
 plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline,review:OriginalOwnerCrossVisitPreview,
 selectedIds:readonly string[],
):OriginalOwnerCrossVisitSubsetReceipt {
 const fresh=previewOriginalOwnerCrossVisitRecovery(plan,timeline);
 if(JSON.stringify(fresh)!==JSON.stringify(review))
  throw new Error('Original owner historical review or source changed. Preview again.');
 if(selectedIds.length>OWNER_MARK_LIMIT)throw new Error('Original owner recovery exceeds the marked memory limit.');
 const eligible=new Map(fresh.recoverable.map(x=>[immutableOwnerId(x.kind,x.originalId),x]));
 const wanted=new Set<string>();
 for(const id of selectedIds){
  if(typeof id!=='string'||!eligible.has(id))throw new Error('Original owner selected an ineligible source record.');
  if(wanted.has(id))throw new Error('Original owner selected the same historical record twice.');
  wanted.add(id);
 }
 const selected=fresh.recoverable.filter(row=>wanted.has(immutableOwnerId(row.kind,row.originalId)))
  .map(row=>({...row}));
 return {owner:plan.owner,sourceSha256:plan.originalFileSha256,
  hubRevision:plan.hubRevision,fullPreviewWitness:JSON.stringify(fresh),
  selected,excluded:fresh.recoverable.length-selected.length,
  protectedCurrent:fresh.protectedCurrent,writes:0,blocked:true,readyToMigrate:false};
}
export function applyOriginalOwnerCrossVisitSubset(
 plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline,receipt:OriginalOwnerCrossVisitSubsetReceipt,
):OwnerCaseChoiceInput[] {
 const current=previewOriginalOwnerCrossVisitRecovery(plan,timeline);
 const verified=previewOriginalOwnerCrossVisitSubset(plan,timeline,current,
  receipt.selected.map(row=>immutableOwnerId(row.kind,row.originalId)));
 if(JSON.stringify(receipt)!==JSON.stringify(verified))
  throw new Error('Original owner selective source receipt expired or was modified.');
 const next=new Map(timeline.current.choices.map(row=>[immutableOwnerId(row.kind,row.originalId),{...row}]));
 for(const selected of verified.selected){
  const key=immutableOwnerId(selected.kind,selected.originalId);
  if(next.has(key))throw new Error('Independent current original-source decision is protected.');
  next.set(key,{kind:selected.kind,originalId:selected.originalId,
   observedStatus:selected.observedStatus,choice:selected.choice});
 }
 const result=[...next.values()];
 reviewOriginalOwnerCases(plan,result,plan.originalFileSha256,plan.hubRevision);
 return result;
}


/** Phase 32: reviewer-selected exact generation of a historical decision.
 * Source IDs and current independent choices are immutable. This code has
 * no storage or migration writer.
 */
export interface OriginalOwnerGenerationRequest {
 readonly kind:OwnerDryRunRow['kind'];
 readonly originalId:string;
 readonly visitsBack:number;
}
export interface OriginalOwnerGenerationReceipt {
 readonly fullPreviewWitness:string;
 readonly selected:readonly OriginalOwnerCrossVisitCandidate[];
 readonly protectedCurrent:number;
 readonly writes:0;
 readonly blocked:true;
 readonly readyToMigrate:false;
}
export function previewOriginalOwnerGenerationSelection(
 plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline,
 preview:OriginalOwnerCrossVisitPreview,requests:readonly OriginalOwnerGenerationRequest[],
):OriginalOwnerGenerationReceipt {
 const fresh=previewOriginalOwnerCrossVisitRecovery(plan,timeline);
 if(JSON.stringify(preview)!==JSON.stringify(fresh))
  throw new Error('Original owner historical generation changed. Preview again.');
 if(requests.length>OWNER_MARK_LIMIT)throw new Error('Original owner selected too many source generations.');
 const eligible=new Set(fresh.recoverable.map(row=>immutableOwnerId(row.kind,row.originalId)));
 const seen=new Set<string>(),selected:OriginalOwnerCrossVisitCandidate[]=[];
 for(const request of requests){
  const id=immutableOwnerId(request.kind,request.originalId);
  if(seen.has(id))throw new Error('Multiple generations selected for one original-source record.');
  seen.add(id);
  if(!eligible.has(id)||!Number.isSafeInteger(request.visitsBack)||
      request.visitsBack<1||request.visitsBack>timeline.past.length)
   throw new Error('Historical generation is not available for this marked source record.');
  const frame=timeline.past[timeline.past.length-request.visitsBack]!;
  const historical=frame.choices.find(row=>row.kind===request.kind&&row.originalId===request.originalId);
  if(!historical)throw new Error('Historical generation lacks independently reviewed source evidence.');
  selected.push({...historical,visitsBack:request.visitsBack});
 }
 return {fullPreviewWitness:JSON.stringify(fresh),selected,
  protectedCurrent:fresh.protectedCurrent,writes:0,blocked:true,readyToMigrate:false};
}
export function applyOriginalOwnerGenerationSelection(
 plan:OwnerDryRun,timeline:OriginalOwnerCaseTimeline,receipt:OriginalOwnerGenerationReceipt,
):OwnerCaseChoiceInput[] {
 const fresh=previewOriginalOwnerCrossVisitRecovery(plan,timeline);
 const checked=previewOriginalOwnerGenerationSelection(plan,timeline,fresh,
  receipt.selected.map(row=>({kind:row.kind,originalId:row.originalId,visitsBack:row.visitsBack})));
 if(JSON.stringify(checked)!==JSON.stringify(receipt))
  throw new Error('Historical original-source receipt became stale or was modified.');
 const choices=new Map(timeline.current.choices.map(row=>[immutableOwnerId(row.kind,row.originalId),{...row}]));
 for(const row of checked.selected){
  const key=immutableOwnerId(row.kind,row.originalId);
  if(choices.has(key))throw new Error('A newer independent original-source review is protected.');
  choices.set(key,{kind:row.kind,originalId:row.originalId,observedStatus:row.observedStatus,choice:row.choice});
 }
 const result=[...choices.values()];
 reviewOriginalOwnerCases(plan,result,plan.originalFileSha256,plan.hubRevision);
 return result;
}

const esc=(s:string):string=>s.replace(/[&<>"']/gu,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]!));
/** Ephemeral review UI. Never stores source records or review choices in Hub. */
export const OWNER_CASE_PAGE_SIZE=80;
const OWNER_MARK_LABELS:Readonly<Record<OwnerMarkFilter,string>>={
 ALL:'All source cases',MARKED:'Marked for review',UNMARKED:'Not marked',
};
const OWNER_REVIEW_LABELS:Readonly<Record<OwnerReviewFilter,string>>={
 ALL:'All review states',UNREVIEWED:'Not reviewed',KEEP_SEPARATE:'Keep in original owner',
 REVIEW_SOURCE:'Review original source',REVIEW_HUB:'Review Hub record',DEFER:'Hold for evidence',
};
const OWNER_CASE_FILTER_LABELS:Readonly<Record<OwnerCaseFilter,string>>={
 ALL:'All source cases',ID_COLLISION:'ID collisions',TITLE_AMBIGUITY:'Ambiguous titles',
 MISSING_RELATION:'Missing relations',SOURCE_ONLY:'Source-only',
};
export function renderOriginalOwnerCaseworkForm(
 plan:OwnerDryRun,offset=0,decisions:readonly OwnerCaseChoiceInput[]=[],filter:OwnerCaseFilter='ALL',
 reviewFilter:OwnerReviewFilter='ALL',marks:readonly OwnerMarkedCase[]=[],
 markFilter:OwnerMarkFilter='ALL',
):string {
 validateOriginalOwnerMarks(plan,marks,plan.originalFileSha256,plan.hubRevision);
 const markedKeys=new Set(marks.map(mark=>immutableOwnerId(mark.kind,mark.originalId)));
 const limit=OWNER_CASE_PAGE_SIZE,matched=originalOwnerFilteredRows(plan,filter,decisions,reviewFilter,marks,markFilter);
 const review=reviewOriginalOwnerCases(plan,decisions,plan.originalFileSha256,plan.hubRevision);
 const reviewCounts:Readonly<Record<OwnerReviewFilter,number>>={
  ALL:plan.rows.length,UNREVIEWED:plan.rows.length-review.reviewed,...review.selected,
 };
 if(!Number.isSafeInteger(offset)||offset<0||offset>=Math.max(matched.length,1)||offset%limit!==0)
  throw new Error('Original owner casework page is invalid.');
 const visible=matched.slice(offset,offset+limit);
 const caseKey=(kind:string,id:string)=>kind+'\\u0000'+id;
 const selected=new Map(decisions.map(d=>[caseKey(d.kind,d.originalId),d.choice]));
 const rows=visible.map(({row,index})=>
  '<li><label class="ws-owner-case-mark"><input type="checkbox" data-original-owner-mark data-case-kind="'+esc(row.kind)+
   '" data-case-id="'+esc(row.originalId)+'" data-case-status="'+esc(row.status)+'"'+
   (markedKeys.has(immutableOwnerId(row.kind,row.originalId))?' checked':'')+
   '>Mark case for selective review</label><label><span>Case '+(index+1)+' · '+esc(plan.owner)+' '+esc(row.kind)+
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
  '<h4 tabindex="-1">Review individual source records</h4>'+
  '<div class="ws-owner-case-toolbar">'+
   '<label>Filter by conflict type<select aria-label="Filter original source cases" data-original-owner-filter>'+
   OWNER_CASE_FILTERS.map(status=>'<option value="'+status+'"'+(status===filter?' selected':'')+'>'+
    OWNER_CASE_FILTER_LABELS[status]+' ('+(status==='ALL'?plan.rows.length:plan.counts[status])+')</option>').join('')+
   '</select></label>'+
   '<label>Filter by review state<select aria-label="Filter original owner review state" data-original-owner-review-filter>'+
   OWNER_REVIEW_FILTERS.map(item=>'<option value="'+item+'"'+(item===reviewFilter?' selected':'')+'>'+
    OWNER_REVIEW_LABELS[item]+' ('+reviewCounts[item]+')</option>').join('')+
   '</select></label>'+
   '<label>Filter by marked cases<select aria-label="Filter marked original cases" data-original-owner-mark-filter>'+
   OWNER_MARK_FILTERS.map(scope=>'<option value="'+scope+'"'+(scope===markFilter?' selected':'')+'>'+
    OWNER_MARK_LABELS[scope]+' ('+(scope==='ALL'?plan.rows.length:scope==='MARKED'?marks.length:plan.rows.length-marks.length)+')</option>').join('')+
   '</select></label>'+
   '<span data-owner-case-summary>'+matched.length+' matching original records of '+plan.rows.length+
   ' · '+review.reviewed+' reviewed · '+(plan.rows.length-review.reviewed)+' awaiting review'+
   ' · <span data-owner-mark-count>'+marks.length+'</span> marked across pages (limit '+OWNER_MARK_LIMIT+')</span>'+
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
  '<div class="ws-owner-case-marks" role="group" aria-label="Selective original-source review">'+
    '<button type="button" data-action="original-owner-mark-visible"'+(!visible.length?' disabled':'')+'>Mark visible '+visible.length+'</button>'+
    '<button type="button" data-action="original-owner-unmark-visible"'+(!visible.length?' disabled':'')+'>Unmark visible '+visible.length+'</button>'+
    '<button type="button" data-action="original-owner-marked-keep"'+(!marks.length?' disabled':'')+'>Keep '+marks.length+' marked in source</button>'+
    '<button type="button" data-action="original-owner-marked-clear"'+(!marks.length?' disabled':'')+'>Clear '+marks.length+' marked choices</button>'+
    '<button type="button" data-action="original-owner-marked-reset"'+(!marks.length?' disabled':'')+'>Unmark all</button>'+
   '</div>'+
  '<div class="ws-owner-case-history" role="group" aria-label="Original casework local undo and recovery">'+
   '<button type="button" data-action="original-owner-undo" disabled>Undo last review change</button>'+
   '<button type="button" data-action="original-owner-redo" disabled>Redo last review change</button>'+
   '<span data-owner-history-status role="status">0 undo steps · 0 redo steps; session-only</span>'+
  '</div>'+
  '<div class="ws-owner-case-recovery" role="group" aria-label="Recover missing original-source decisions">'+
   '<label>Historical review visit<select aria-label="Historical source review generation" data-original-owner-recovery-step disabled>'+
    '<option value="1">1 visit back</option></select></label>'+
   '<button type="button" data-action="original-owner-recovery-preview" disabled>Preview safe marked recovery</button>'+
   '<button type="button" data-action="original-owner-recovery-apply" disabled>Restore missing choices</button>'+
   '<p data-owner-recovery-status role="status">No recovery preview · current reviewed decisions remain protected.</p>'+
  '</div>'+
  '<div class="ws-owner-case-recovery ws-owner-cross-visit" role="group" aria-label="Recover missing original records across historical visits">'+
   '<button type="button" data-action="original-owner-cross-preview" disabled>Scan marked cases across all retained visits</button>'+
   '<button type="button" data-action="original-owner-cross-apply" disabled>Restore safe missing selections</button>'+
   '<div data-owner-cross-candidates class="ws-owner-cross-candidates" role="group" aria-label="Choose each original-source historical decision"></div>'+
   '<p data-owner-cross-status role="status">No cross-visit preview · independent current decisions stay protected.</p>'+
  '</div>'+
  '<p data-owner-history-provenance>Unverified '+esc(plan.owner)+' source fingerprint '+esc(plan.originalFileSha256.slice(0,12))+
   '… · Hub revision '+plan.hubRevision+'. Fingerprint is not rights approval.</p>'+
  '<p data-owner-casework-receipt role="status">No cases reviewed. Migration remains blocked.</p>'+
  (visible.length?'<ol class="ws-owner-case-list">'+rows+'</ol>':
   '<p data-owner-case-empty>No original cases match this conflict type.</p>')+
  '<p>Review filters, marks and choices are session-only. Marked cases preserve original identities; no imports or owner writes are authorized.</p>'+
  '</section>';
}

export function renderOriginalOwnerCaseworkReceipt(receipt:OwnerCaseworkReceipt):string {
 return receipt.reviewed+' reviewed · '+receipt.held+' still held · '+
  receipt.attachmentReferences+' preserved original attachment references. Migration blocked.';
}
