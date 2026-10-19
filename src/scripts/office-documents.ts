import {hubIdentity} from './portal-auth';
import {namespace} from '../lib/workspace/store';
import {OfficeDeviceStore} from '../lib/office/device';
import {documentFilename,type OfficeDocument} from '../lib/office/documents';
import {formatSelection,renderMarkdown,type FormatAction} from '../lib/office/markdown';
import {findDocuments,outlineFor,backupDocuments,type DocumentSort} from '../lib/office/library';
import {getOfficeTemplate} from '../lib/office/templates';
import {standaloneHtml} from '../lib/office/portable';
import {decodeMarkdownImport,MAX_IMPORT_BYTES,PREVIEW_LENGTH,type MarkdownImport} from '../lib/office/import';
import {parseOfficeBackup,previewBackupRestore,MAX_BACKUP_BYTES,type ValidatedOfficeBackup} from '../lib/office/restore';
import {exportOfficeBundle} from '../lib/office/bundle';
import {findEditorText,replaceEditorText,documentSections,moveDocumentSection,type TextMatch} from '../lib/office/navigation';
import {compareOfficeRevision,recoverRevisionLines,applyRevisionExcerpt} from '../lib/office/revision-review';
import {revisionHunks,type RevisionHunk} from '../lib/office/revision-hunks';
import {previewMultiRevisionRecovery,MAX_MULTI_RECOVERY_HUNKS} from '../lib/office/multi-recovery';
import {officeRevisionTimeline,timelineExcerpt} from '../lib/office/revision-timeline';
import {searchOfficeHistory,compareOfficeSavedVersions} from '../lib/office/history-explorer';
import {insertAuthoringBlock,sourcePositionAtLine,sourceWritingStats,type AuthoringBlock} from '../lib/office/authoring';
import {adjacentDocumentHeading,documentSectionAt,insertOfficeSection,type SectionPlacement} from '../lib/office/section-authoring';
import {transformOfficeSection,type StructuralAction} from '../lib/office/section-transform';
import {officeHeadingReferences,generateOfficeToc,insertOfficeHeadingLink} from '../lib/office/toc';
import {analyzeOfficeReferences,insertOfficeFootnote,defineMissingOfficeFootnote,retargetBrokenOfficeHeading,officeCitationInventory,insertExistingOfficeCitation,renameOfficeCitation,updateOfficeFootnoteDefinition,compareOfficeCitationRevisions,previewOfficeCitationRecovery,previewOfficeCitationReconciliation,reviewOfficeCitationThreeWay,previewOfficeCitationThreeWay,traceOfficeReferenceIssues,inspectOfficeDuplicateFootnotes,previewOfficeDuplicateResolution,inspectOfficeCitationUseImpact,formatOfficeCitationUseAudit,type OfficeCitationImpactReport,type OfficeCitationImpactEntry,type OfficeDuplicateGroup,type OfficeDuplicateRepair,type OfficeIssueHistory,type OfficeIssueLineage,type OfficeCitationMergeReview,type OfficeCitationMergeDecision,type OfficeCitationMergeResult,type OfficeCitationRecovery,type OfficeCitationReconciliation} from '../lib/office/footnotes';
import {parseMarkdownBatch,MAX_MULTI_IMPORT_FILES,MAX_MULTI_IMPORT_BYTES} from '../lib/office/multi-import';
const root=document.querySelector<HTMLElement>('[data-office]')!;
const shell=document.querySelector<HTMLElement>('[data-workspace]')!;
if(root && shell){
  const pick=<T extends HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const list=pick<HTMLElement>('[data-office-list]');
  const search=pick<HTMLInputElement>('[data-office-search]');
  const sort=pick<HTMLSelectElement>('[data-office-sort]');
  const count=pick<HTMLElement>('[data-office-count]');
  const bundleCount=pick<HTMLElement>('[data-office-bundle-count]');
  const bundleButton=pick<HTMLButtonElement>('[data-office-bundle]');
  const selectVisible=pick<HTMLButtonElement>('[data-office-select-visible]');
  const clearSelection=pick<HTMLButtonElement>('[data-office-clear-selection]');
  const backup=pick<HTMLButtonElement>('[data-office-backup]');
  const outline=pick<HTMLElement>('[data-office-outline]');
  const outlineEmpty=pick<HTMLElement>('[data-office-outline-empty]');
  const findQuery=pick<HTMLInputElement>('[data-office-find-query]');
  const findCase=pick<HTMLInputElement>('[data-office-find-case]');
  const findCount=pick<HTMLElement>('[data-office-find-count]');
  const findPrevious=pick<HTMLButtonElement>('[data-office-find-previous]');
  const findNext=pick<HTMLButtonElement>('[data-office-find-next]');
  const replaceValue=pick<HTMLInputElement>('[data-office-replace-value]');
  const replaceAll=pick<HTMLButtonElement>('[data-office-replace-all]');
  const sectionSelect=pick<HTMLSelectElement>('[data-office-section-select]');
  const sectionFocus=pick<HTMLButtonElement>('[data-office-section-focus]');
  const sectionUp=pick<HTMLButtonElement>('[data-office-section-up]');
  const sectionDown=pick<HTMLButtonElement>('[data-office-section-down]');
  const sectionTitle=pick<HTMLInputElement>('[data-office-section-title]');
  const sectionAddSibling=pick<HTMLButtonElement>('[data-office-section-add-sibling]');
  const sectionAddChild=pick<HTMLButtonElement>('[data-office-section-add-child]');
  const headingPrevious=pick<HTMLButtonElement>('[data-office-heading-previous]');
  const headingNext=pick<HTMLButtonElement>('[data-office-heading-next]');
  const transformDuplicate=pick<HTMLButtonElement>('[data-office-transform-duplicate]');
  const transformPromote=pick<HTMLButtonElement>('[data-office-transform-promote]');
  const transformDemote=pick<HTMLButtonElement>('[data-office-transform-demote]');
  const transformReview=pick<HTMLElement>('[data-office-transform-review]');
  const transformSummary=pick<HTMLElement>('[data-office-transform-summary]');
  const transformSource=pick<HTMLTextAreaElement>('[data-office-transform-source]');
  const transformConfirm=pick<HTMLButtonElement>('[data-office-transform-confirm]');
  const transformCancel=pick<HTMLButtonElement>('[data-office-transform-cancel]');
  const status=pick<HTMLElement>('[data-office-status]');
  const title=pick<HTMLInputElement>('[data-office-title]');
  const body=pick<HTMLTextAreaElement>('[data-office-body]');
  const writingStats=pick<HTMLElement>('[data-office-writing-stats]');
  const writingLine=pick<HTMLInputElement>('[data-office-writing-line]');
  const writingGo=pick<HTMLButtonElement>('[data-office-writing-go]');
  const writingBlock=pick<HTMLSelectElement>('[data-office-writing-block]');
  const writingRows=pick<HTMLInputElement>('[data-office-writing-rows]');
  const writingColumns=pick<HTMLInputElement>('[data-office-writing-columns]');
  const writingLanguage=pick<HTMLInputElement>('[data-office-writing-language]');
  const writingInsert=pick<HTMLButtonElement>('[data-office-writing-insert]');
  const tocReviewButton=pick<HTMLButtonElement>('[data-office-toc-review]');
  const referenceTarget=pick<HTMLSelectElement>('[data-office-reference-heading]');
  const referenceInsert=pick<HTMLButtonElement>('[data-office-reference-insert]');
  const tocPanel=pick<HTMLElement>('[data-office-toc-panel]');
  const tocSummary=pick<HTMLElement>('[data-office-toc-summary]');
  const tocSource=pick<HTMLTextAreaElement>('[data-office-toc-source]');
  const tocConfirm=pick<HTMLButtonElement>('[data-office-toc-confirm]');
  const tocCancel=pick<HTMLButtonElement>('[data-office-toc-cancel]');
  const footnoteId=pick<HTMLInputElement>('[data-office-footnote-id]');
  const footnoteText=pick<HTMLInputElement>('[data-office-footnote-text]');
  const footnoteInsert=pick<HTMLButtonElement>('[data-office-footnote-insert]');
  const referenceSummary=pick<HTMLElement>('[data-office-reference-summary]');
  const referenceProblems=pick<HTMLElement>('[data-office-reference-problems]');

  const impactBase=pick<HTMLSelectElement>('[data-office-impact-base]');
  const impactReview=pick<HTMLButtonElement>('[data-office-impact-review]');
  const impactSummary=pick<HTMLElement>('[data-office-impact-summary]');
  const impactCitation=pick<HTMLSelectElement>('[data-office-impact-citation]');
  const impactDetail=pick<HTMLElement>('[data-office-impact-detail]');
  const impactCurrentUse=pick<HTMLSelectElement>('[data-office-impact-current-use]');
  const impactJump=pick<HTMLButtonElement>('[data-office-impact-jump]');
  const impactHistory=pick<HTMLButtonElement>('[data-office-impact-history]');
  const impactDownload=pick<HTMLButtonElement>('[data-office-impact-export]');
  type CitationImpactState={
    scope:string;documentId:string;revision:number;source:string;
    baselineRevision:number|null;baselineBody:string|null;report:OfficeCitationImpactReport;
  };
  let citationImpactState:CitationImpactState|null=null;
  function clearCitationImpact(resetBaseline=false){
    citationImpactState=null;impactSummary.textContent='No use impact reviewed.';
    impactCitation.replaceChildren(new Option('Choose footnote',''));
    impactCurrentUse.replaceChildren(new Option('Choose current use',''));
    impactDetail.replaceChildren();impactCitation.disabled=impactCurrentUse.disabled=true;
    impactJump.disabled=impactHistory.disabled=impactDownload.disabled=true;
    if(resetBaseline)impactBase.replaceChildren(new Option('Current source only',''));
  }
  function citationImpactValid(state:CitationImpactState|null){
    return !!state&&!!store&&!!active&&allowed()&&!blocked&&!busy&&!dirty&&
      state.scope===store.scope&&state.documentId===active.id&&
      state.revision===active.revision&&state.source===body.value&&
      (state.baselineRevision===null||
       active.history.some(row=>row.revision===state.baselineRevision&&row.body===state.baselineBody));
  }


  const duplicateReview=pick<HTMLButtonElement>('[data-office-duplicate-review]');
  const duplicatePanel=pick<HTMLElement>('[data-office-duplicate-panel]');
  const duplicateGroup=pick<HTMLSelectElement>('[data-office-duplicate-group]');
  const duplicateCandidates=pick<HTMLElement>('[data-office-duplicate-candidates]');
  const duplicateStatus=pick<HTMLElement>('[data-office-duplicate-status]');
  const duplicatePreview=pick<HTMLButtonElement>('[data-office-duplicate-preview]');
  const duplicateResultPanel=pick<HTMLElement>('[data-office-duplicate-result-panel]');
  const duplicateResultSummary=pick<HTMLElement>('[data-office-duplicate-result-summary]');
  const duplicateResult=pick<HTMLTextAreaElement>('[data-office-duplicate-result]');
  const duplicateRemoved=pick<HTMLElement>('[data-office-duplicate-removed]');
  const duplicateConfirm=pick<HTMLButtonElement>('[data-office-duplicate-confirm]');
  const duplicateCancel=pick<HTMLButtonElement>('[data-office-duplicate-cancel]');
  type DuplicateReviewState={
    scope:string;documentId:string;revision:number;source:string;
    groups:OfficeDuplicateGroup[];selectedId:string;keepOffset:number|null;
  };
  type DuplicateResolutionPlan={review:DuplicateReviewState;result:OfficeDuplicateRepair};
  let duplicateReviewState:DuplicateReviewState|null=null,duplicatePlan:DuplicateResolutionPlan|null=null;
  function clearDuplicatePreview(){
    duplicatePlan=null;duplicateResultPanel.hidden=true;
    duplicateResultSummary.textContent='';duplicateResult.value='';duplicateRemoved.replaceChildren();
    duplicateConfirm.disabled=true;
  }
  function clearDuplicateTriage(){
    duplicateReviewState=null;clearDuplicatePreview();
    duplicatePanel.hidden=true;duplicateGroup.replaceChildren(new Option('Choose duplicate ID',''));
    duplicateCandidates.replaceChildren();duplicateStatus.textContent='';
  }
  function duplicateReviewValid(state:DuplicateReviewState|null){
    return !!state&&!!store&&!!active&&allowed()&&!busy&&!blocked&&!dirty&&
      state.scope===store.scope&&state.documentId===active.id&&
      state.revision===active.revision&&state.source===body.value;
  }


  const issueHistoryReview=pick<HTMLButtonElement>('[data-office-issue-history-review]');
  const issueHistoryFilter=pick<HTMLSelectElement>('[data-office-issue-history-filter]');
  const issueHistorySummary=pick<HTMLElement>('[data-office-issue-history-summary]');
  const issueHistoryRows=pick<HTMLElement>('[data-office-issue-history-rows]');
  type IssueHistoryReview={scope:string;documentId:string;revision:number;
    source:string;revisions:{revision:number;body:string}[];report:OfficeIssueHistory};
  let issueHistoryState:IssueHistoryReview|null=null;
  function clearIssueHistory(){
    issueHistoryState=null;issueHistoryRows.replaceChildren();
    issueHistorySummary.textContent='No issue history reviewed.';
    issueHistoryFilter.value='unresolved';
  }
  function issueHistoryValid(state:IssueHistoryReview|null){
    return !!state&&!!store&&!!active&&allowed()&&!blocked&&!busy&&!dirty&&
      state.scope===store.scope&&state.documentId===active.id&&
      state.revision===active.revision&&state.source===body.value&&
      state.revisions.length===active.history.length+1&&
      active.history.every((row,i)=>row.revision===state.revisions[i]?.revision&&
        row.body===state.revisions[i]?.body);
  }

  const citationSelect=pick<HTMLSelectElement>('[data-office-citation-select]');
  const citationSummary=pick<HTMLElement>('[data-office-citation-summary]');
  const citationDefinition=pick<HTMLButtonElement>('[data-office-citation-definition]');
  const citationUsage=pick<HTMLButtonElement>('[data-office-citation-usage]');
  const citationInsert=pick<HTMLButtonElement>('[data-office-citation-insert]');
  const citationNewId=pick<HTMLInputElement>('[data-office-citation-new-id]');
  const citationRename=pick<HTMLButtonElement>('[data-office-citation-rename]');
  const citationEdit=pick<HTMLInputElement>('[data-office-citation-edit]');
  const citationEditApply=pick<HTMLButtonElement>('[data-office-citation-edit-apply]');
  const citationEditCancel=pick<HTMLButtonElement>('[data-office-citation-edit-cancel]');
  const citationEditStatus=pick<HTMLElement>('[data-office-citation-edit-status]');
  const citationAuditBase=pick<HTMLSelectElement>('[data-office-citation-audit-base]');
  const citationAuditCompare=pick<HTMLButtonElement>('[data-office-citation-audit-compare]');
  const citationAuditSummary=pick<HTMLElement>('[data-office-citation-audit-summary]');
  const citationAuditChanges=pick<HTMLElement>('[data-office-citation-audit-changes]');
  const citationRestorePanel=pick<HTMLElement>('[data-office-citation-restore-panel]');
  const citationRestoreSummary=pick<HTMLElement>('[data-office-citation-restore-summary]');
  const citationRestoreResult=pick<HTMLTextAreaElement>('[data-office-citation-restore-result]');
  const citationRestoreConfirm=pick<HTMLButtonElement>('[data-office-citation-restore-confirm]');
  const citationRestoreCancel=pick<HTMLButtonElement>('[data-office-citation-restore-cancel]');

  const citationMergeBase=pick<HTMLSelectElement>('[data-office-citation-merge-base]');
  const citationMergeIncoming=pick<HTMLSelectElement>('[data-office-citation-merge-incoming]');
  const citationMergeReviewButton=pick<HTMLButtonElement>('[data-office-citation-merge-review]');
  const citationMergeSummary=pick<HTMLElement>('[data-office-citation-merge-summary]');
  const citationMergeRows=pick<HTMLElement>('[data-office-citation-merge-rows]');
  const citationMergePreviewButton=pick<HTMLButtonElement>('[data-office-citation-merge-preview]');
  const citationMergePanel=pick<HTMLElement>('[data-office-citation-merge-panel]');
  const citationMergePreviewSummary=pick<HTMLElement>('[data-office-citation-merge-preview-summary]');
  const citationMergeResult=pick<HTMLTextAreaElement>('[data-office-citation-merge-result]');
  const citationMergeConfirm=pick<HTMLButtonElement>('[data-office-citation-merge-confirm]');
  const citationMergeCancel=pick<HTMLButtonElement>('[data-office-citation-merge-cancel]');
  type CitationMergeReviewState={
    scope:string;documentId:string;currentRevision:number;currentBody:string;
    baseRevision:number;baseBody:string;incomingRevision:number;incomingBody:string;
    audit:OfficeCitationMergeReview;decisions:Record<string,OfficeCitationMergeDecision>;
  };
  type CitationMergePlan={
    review:CitationMergeReviewState;decisions:string;result:OfficeCitationMergeResult;
  };
  let citationMergeReviewState:CitationMergeReviewState|null=null,citationMergePlan:CitationMergePlan|null=null;
  function clearCitationMergePreview(){
    citationMergePlan=null;citationMergePanel.hidden=true;citationMergePreviewSummary.textContent='';
    citationMergeResult.value='';citationMergeConfirm.disabled=true;
  }
  function clearCitationMerge(resetSelectors=false){
    citationMergeReviewState=null;clearCitationMergePreview();
    citationMergeRows.replaceChildren();
    citationMergeSummary.textContent='No three-way comparison selected.';
    if(resetSelectors){
      citationMergeBase.replaceChildren(new Option('Choose baseline revision',''));
      citationMergeIncoming.replaceChildren(new Option('Choose proposed revision',''));
    }
  }
  function citationMergeSelections(state:CitationMergeReviewState){
    return Object.entries(state.decisions).sort(([a],[b])=>a.localeCompare(b))
      .map(([id,choice])=>id+':'+choice).join('|');
  }
  function citationMergeValid(state:CitationMergeReviewState|null){
    if(!state||!store||!active||!allowed()||blocked||busy||dirty)return false;
    if(state.scope!==store.scope||state.documentId!==active.id||
       state.currentRevision!==active.revision||state.currentBody!==body.value)return false;
    return active.history.some(row=>row.revision===state.baseRevision&&row.body===state.baseBody)&&
      active.history.some(row=>row.revision===state.incomingRevision&&row.body===state.incomingBody);
  }
  const citationBatchSelectedText=pick<HTMLElement>('[data-office-citation-batch-selected]');
  const citationBatchPreview=pick<HTMLButtonElement>('[data-office-citation-batch-preview]');
  const citationBatchPanel=pick<HTMLElement>('[data-office-citation-batch-panel]');
  const citationBatchSummary=pick<HTMLElement>('[data-office-citation-batch-summary]');
  const citationBatchResult=pick<HTMLTextAreaElement>('[data-office-citation-batch-result]');
  const citationBatchConfirm=pick<HTMLButtonElement>('[data-office-citation-batch-confirm]');
  const citationBatchCancel=pick<HTMLButtonElement>('[data-office-citation-batch-cancel]');
  const citationBatchSelected=new Set<string>();
  type CitationAuditSnapshot={scope:string;documentId:string;revision:number;body:string;baselineRevision:number};
  type CitationRecoveryPlan={snapshot:CitationAuditSnapshot;baselineBody:string;result:OfficeCitationRecovery};
  type CitationBatchPlan={
    snapshot:CitationAuditSnapshot;baselineBody:string;ids:string[];result:OfficeCitationReconciliation;
  };
  let citationBatchPlan:CitationBatchPlan|null=null;
  let citationAuditSnapshot:CitationAuditSnapshot|null=null,citationRecoveryPlan:CitationRecoveryPlan|null=null;
  function clearCitationBatchPlan(){
    citationBatchPlan=null;citationBatchPanel.hidden=true;citationBatchSummary.textContent='';
    citationBatchResult.value='';citationBatchConfirm.disabled=true;
  }
  function updateCitationBatchSelection(){
    citationBatchSelectedText.textContent=citationBatchSelected.size+' of 12 definitions selected';
  }
  function clearCitationRecovery(){
    citationRecoveryPlan=null;citationRestorePanel.hidden=true;
    citationRestoreSummary.textContent='';citationRestoreResult.value='';
    citationRestoreConfirm.disabled=true;
  }
  function clearCitationAudit(resetBaseline=false){
    citationAuditSnapshot=null;clearCitationRecovery();clearCitationBatchPlan();
    citationBatchSelected.clear();updateCitationBatchSelection();
    citationAuditChanges.replaceChildren();
    citationAuditSummary.textContent='No comparison selected.';
    if(resetBaseline)citationAuditBase.replaceChildren(new Option('Choose retained revision',''));
  }
  type CitationEditDraft={scope:string;documentId:string;revision:number;id:string;offset:number;content:string;source:string};
  let citationEditDraft:CitationEditDraft|null=null;
  let citationOwnerKey:string|null=null,citationUsageCursor=0;
  function clearCitationEdit(){
    citationEditDraft=null;citationEdit.value='';citationEditStatus.textContent='';
  }
  const history=pick<HTMLSelectElement>('[data-office-history]');
  const timelineList=pick<HTMLElement>('[data-office-timeline-list]');
  const timelineSearch=pick<HTMLInputElement>('[data-office-history-search]');
  const timelineCase=pick<HTMLInputElement>('[data-office-history-case]');
  const timelineCount=pick<HTMLElement>('[data-office-history-count]');
  const timelineNote=pick<HTMLElement>('[data-office-timeline-note]');
  const timelinePreview=pick<HTMLElement>('[data-office-timeline-preview]');
  const timelineSummary=pick<HTMLElement>('[data-office-timeline-summary]');
  const timelineExcerptNode=pick<HTMLElement>('[data-office-timeline-excerpt]');
  const timelineTruncated=pick<HTMLElement>('[data-office-timeline-truncated]');
  const timelineCompare=pick<HTMLButtonElement>('[data-office-timeline-compare]');
  const timelineRestore=pick<HTMLButtonElement>('[data-office-timeline-restore]');
  const timelineClose=pick<HTMLButtonElement>('[data-office-timeline-close]');
  const timelineBaselineButton=pick<HTMLButtonElement>('[data-office-timeline-baseline]');
  const timelinePairButton=pick<HTMLButtonElement>('[data-office-timeline-pair]');
  const timelineBaselineNote=pick<HTMLElement>('[data-office-timeline-baseline-note]');
  const timelinePairPanel=pick<HTMLElement>('[data-office-timeline-pair-panel]');
  const timelinePairSummary=pick<HTMLElement>('[data-office-timeline-pair-summary]');
  const timelinePairDiffs=pick<HTMLElement>('[data-office-timeline-pair-diffs]');
  const add=pick<HTMLButtonElement>('[data-office-new]');
  const templatePicker=pick<HTMLSelectElement>('[data-office-template]');
  const htmlButton=pick<HTMLButtonElement>('[data-office-html]');
  const printButton=pick<HTMLButtonElement>('[data-office-print]');
  const printSheet=pick<HTMLElement>('[data-office-print-sheet]');
  const save=pick<HTMLButtonElement>('[data-office-save]');
  const download=pick<HTMLButtonElement>('[data-office-export]');
  const restore=pick<HTMLButtonElement>('[data-office-restore]');
  const compareButton=pick<HTMLButtonElement>('[data-office-compare]');
  const comparePanel=pick<HTMLElement>('[data-office-compare-panel]');
  const compareSummary=pick<HTMLElement>('[data-office-compare-summary]');
  const compareDiffs=pick<HTMLElement>('[data-office-compare-diffs]');
  const hunkPrevious=pick<HTMLButtonElement>('[data-office-hunk-prev]');
  const hunkNext=pick<HTMLButtonElement>('[data-office-hunk-next]');
  const hunkPosition=pick<HTMLElement>('[data-office-hunk-position]');
  const hunkDetails=pick<HTMLElement>('[data-office-hunk-details]');
  const hunkPreview=pick<HTMLElement>('[data-office-hunk-preview]');
  const hunkHistorical=pick<HTMLButtonElement>('[data-office-hunk-historical]');
  const hunkCurrent=pick<HTMLButtonElement>('[data-office-hunk-current]');
  const batchList=pick<HTMLElement>('[data-office-batch-list]');
  const batchSelection=pick<HTMLElement>('[data-office-batch-selection]');
  const batchPreview=pick<HTMLButtonElement>('[data-office-batch-preview]');
  const batchCancel=pick<HTMLButtonElement>('[data-office-batch-cancel]');
  const batchResult=pick<HTMLElement>('[data-office-batch-result]');
  const batchSummary=pick<HTMLElement>('[data-office-batch-summary]');
  const batchDocument=pick<HTMLTextAreaElement>('[data-office-batch-document]');
  const batchConfirm=pick<HTMLButtonElement>('[data-office-batch-confirm]');
  const batchDismiss=pick<HTMLButtonElement>('[data-office-batch-dismiss]');
  const recoverStart=pick<HTMLInputElement>('[data-office-recover-start]');
  const recoverEnd=pick<HTMLInputElement>('[data-office-recover-end]');
  const recoverInfo=pick<HTMLElement>('[data-office-recover-info]');
  const recoverPreview=pick<HTMLElement>('[data-office-recover-preview]');
  const recoverInsert=pick<HTMLButtonElement>('[data-office-recover-insert]');
  const recoverReplace=pick<HTMLButtonElement>('[data-office-recover-replace]');
  const compareClose=pick<HTMLButtonElement>('[data-office-compare-close]');
  const importFile=pick<HTMLInputElement>('[data-office-import-file]');
  const importPanel=pick<HTMLElement>('[data-office-import-panel]');
  const importTitle=pick<HTMLInputElement>('[data-office-import-title]');
  const importInfo=pick<HTMLElement>('[data-office-import-info]');
  const importRender=pick<HTMLElement>('[data-office-import-render]');
  const importConfirm=pick<HTMLButtonElement>('[data-office-import-confirm]');
  const importCancel=pick<HTMLButtonElement>('[data-office-import-cancel]');
  const multiFiles=pick<HTMLInputElement>('[data-office-multi-files]');
  const multiPanel=pick<HTMLElement>('[data-office-multi-panel]');
  const multiSummary=pick<HTMLElement>('[data-office-multi-summary]');
  const multiList=pick<HTMLElement>('[data-office-multi-list]');
  const multiConfirm=pick<HTMLButtonElement>('[data-office-multi-confirm]');
  const multiCancel=pick<HTMLButtonElement>('[data-office-multi-cancel]');
  const restoreFile=pick<HTMLInputElement>('[data-office-restore-file]');
  const restorePanel=pick<HTMLElement>('[data-office-restore-panel]');
  const restoreSummary=pick<HTMLElement>('[data-office-restore-summary]');
  const restoreList=pick<HTMLElement>('[data-office-restore-list]');
  const restoreConfirm=pick<HTMLButtonElement>('[data-office-restore-confirm]');
  const restoreCancel=pick<HTMLButtonElement>('[data-office-restore-cancel]');
  const preview=pick<HTMLElement>('[data-office-preview]');
  const formatButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-office-format]')];
  const layoutButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-office-mode]')];
  function renderWritingStats(){
    if(!active||!allowed()){
      writingStats.textContent='Open a document for writing statistics.';
      return;
    }
    try{
      const stats=sourceWritingStats(body.value);
      writingStats.textContent=stats.words+' words · '+stats.characters+' characters · '+
        stats.lines+' lines · '+stats.paragraphs+' paragraphs';
    }catch{
      writingStats.textContent='Document exceeds the 200,000-character Office limit. Shorten or export before saving.';
    }
  }
  function renderReferenceProblems(){
    referenceProblems.replaceChildren();
    if(!active||!allowed()){
      referenceSummary.textContent='No open document.';return;
    }
    const report=analyzeOfficeReferences(body.value);
    if(report.limited){
      referenceSummary.textContent='Source reference inspection is limited. Shorten the document or reduce references.';
      return;
    }
    referenceSummary.textContent=report.definitions.length+' footnote definition'+
      (report.definitions.length===1?'':'s')+' · '+report.references.length+' reference'+
      (report.references.length===1?'':'s')+' · '+report.problems.length+' issue'+
      (report.problems.length===1?'':'s');
    for(const problem of report.problems){
      const control=document.createElement('button');control.type='button';
      control.className='office-reference-problem';
      control.dataset.officeProblem=problem.kind;
      control.dataset.officeProblemLine=String(problem.line);
      control.textContent='Line '+problem.line+' · '+problem.message;
      control.addEventListener('click',()=>{
        if(!active||!allowed()||body.disabled)return;
        const current=analyzeOfficeReferences(body.value).problems.find(item=>
          item.offset===problem.offset&&item.kind===problem.kind&&item.id===problem.id);
        if(!current)return;
        focusEditor(current.offset,current.offset);
        message('Focused original reference issue on line '+current.line+'.');
      });
      referenceProblems.append(control);
      if(problem.kind==='missing-footnote'||problem.kind==='broken-heading'){
        const repair=document.createElement('button');repair.type='button';
        repair.className='office-reference-problem';
        repair.dataset.officeRepair=problem.kind;
        repair.dataset.officeRepairLine=String(problem.line);
        repair.textContent=problem.kind==='missing-footnote'?
          'Define missing [^'+problem.id+'] using footnote text above':
          'Retarget broken heading link using selected heading above';
        repair.addEventListener('click',()=>{
          if(!active||!allowed()||body.disabled||busy||blocked)return;
          const current=analyzeOfficeReferences(body.value).problems.find(item=>
            item.offset===problem.offset&&item.kind===problem.kind&&item.id===problem.id);
          if(!current){message('Reference has changed. Review the current source.');return;}
          try{
            const result=current.kind==='missing-footnote'?
              defineMissingOfficeFootnote(body.value,current.id,footnoteText.value):
              retargetBrokenOfficeHeading(body.value,current.offset,referenceTarget.value);
            body.value=result.value;
            body.dispatchEvent(new Event('input',{bubbles:true}));
            if(current.kind==='missing-footnote')footnoteText.value='';
            focusEditor(result.start,result.end);
            message('Repaired original '+(current.kind==='missing-footnote'?'footnote':'heading reference')+
              '. Autosave pending; revisions remain recoverable.');
            enable();
          }catch(error){message(error instanceof Error?error.message:'Reference repair refused.');}
        });
        referenceProblems.append(repair);
      }
    }
  }
  function renderCitationWorkbench(){
    const key=active&&store&&allowed()?store.scope+'/'+active.id:null;
    if(key!==citationOwnerKey){
      citationOwnerKey=key;citationUsageCursor=0;citationNewId.value='';
      clearCitationEdit();
      citationSelect.replaceChildren(new Option('Choose existing footnote',''));
    }
    const chosen=citationSelect.value;
    citationSelect.replaceChildren(new Option('Choose existing footnote',''));
    citationSummary.textContent='No citation selected.';
    if(!key)return;
    const inventory=officeCitationInventory(body.value);
    if(inventory.limited){
      citationSummary.textContent='Citation inventory limited. Shorten source or reduce references.';
      return;
    }
    for(const entry of inventory.entries)
      citationSelect.add(new Option('[^'+entry.id+'] · '+entry.uses.length+' uses',entry.id));
    if(chosen&&inventory.entries.some(row=>row.id===chosen))citationSelect.value=chosen;
    const selected=inventory.entries.find(row=>row.id===citationSelect.value);
    if(citationEditDraft){
      if(citationEditDraft.id!==citationSelect.value){clearCitationEdit();}
      else if(!store||!active||citationEditDraft.scope!==store.scope||
          citationEditDraft.documentId!==active.id||
          citationEditDraft.source!==body.value||citationEditDraft.revision!==active.revision){
        citationEditStatus.textContent='Source changed. Select the citation again before applying.';
      }
    }
    if(!selected){
      citationSummary.textContent=inventory.entries.length+' defined footnote'+
        (inventory.entries.length===1?'':'s')+' in the current source.';
      return;
    }
    citationSummary.textContent='[^'+selected.id+'] · '+selected.uses.length+' use'+
      (selected.uses.length===1?'':'s')+' · definition line '+selected.definitionLine+
      (selected.definitionCount>1?' · duplicate definitions; resolve before reusing or renaming':'')+
      ' · '+selected.excerpt;
  }
  function renderPreview(){renderMarkdown(body.value,preview);renderWritingStats();renderReferenceProblems();renderCitationWorkbench();}
  let store:OfficeDeviceStore|null=null,active:OfficeDocument|null=null;
  let savedDocuments:OfficeDocument[]=[];
  const selectedBundle=new Set<string>();
  let matches:TextMatch[]=[],findTruncated=false,matchCursor=-1;
  let timelineChosen:{scope:string;id:string;currentRevision:number;selectedRevision:number}|null=null;
  let contentsPlan:{scope:string;id:string;revision:number;body:string;title:string;
    result:string;mode:'insert'|'update';headings:number}|null=null;
  function discardContents(){
    contentsPlan=null;tocPanel.hidden=true;tocSummary.textContent='';tocSource.value='';
  }
  let structuralPlan:{scope:string;id:string;revision:number;body:string;title:string;
    offset:number;action:StructuralAction;result:string;selection:number;heading:string}|null=null;
  function discardStructure(){
    structuralPlan=null;transformReview.hidden=true;transformSummary.textContent='';
    transformSource.value='';
  }
  let timelineBaseline:{scope:string;id:string;currentRevision:number;selectedRevision:number}|null=null;
  function clearVersionPair(){
    timelinePairPanel.hidden=true;timelinePairSummary.textContent='';timelinePairDiffs.replaceChildren();
  }
  let compared:{scope:string;id:string;revision:number;historical:number}|null=null;
  let changeHunks:RevisionHunk[]=[],hunkIndex=-1,hunkTotal=0,hunkLimited=false,hunkSummaryOnly=false;
  const selectedHistoricalHunks=new Set<number>();
  let batchPlan:{scope:string;id:string;revision:number;historical:number;body:string;title:string;selected:number[];value:string}|null=null;
  function discardBatchPreview(){
    batchPlan=null;batchResult.hidden=true;batchDocument.value='';batchSummary.textContent='';
  }
  let epoch=0,dirty=false,busy=false,blocked=false,auto:ReturnType<typeof setTimeout>|undefined;
  // In-memory recovery across Hub privacy/identity rechecks; never written to another owner scope.
  let heldDraft:{scope:string;id:string;revision:number;title:string;body:string}|null=null;
  let importNonce=0,pendingImport:({scope:string}&MarkdownImport)|null=null;
  let multiNonce=0,pendingMulti:{scope:string;docs:readonly MarkdownImport[]}|null=null;
  function clearMulti(){
    multiNonce++;pendingMulti=null;multiFiles.value='';
    multiSummary.textContent='';multiList.replaceChildren();multiPanel.hidden=true;
  }
  let restoreNonce=0,pendingRestore:({scope:string;filename:string}&ValidatedOfficeBackup)|null=null;
  let restoreNew=0;
  function clearImport(){
    importNonce++;pendingImport=null;importFile.value='';importTitle.value='';
    importInfo.textContent='';importRender.replaceChildren();importPanel.hidden=true;
  }
  function clearRestore(){
    restoreNonce++;pendingRestore=null;restoreNew=0;
    restoreFile.value='';restoreSummary.textContent='';restoreList.replaceChildren();restorePanel.hidden=true;
  }
  const allowed=()=>shell.dataset.calendarPrivate==='false' &&
    (hubIdentity.status==='signed-out'||hubIdentity.status==='signed-in');
  const message=(value:string)=>{status.textContent=value;};
  const enable=()=>{
    const editing=!!store && !!active && !blocked && allowed() && !busy;
    title.disabled=body.disabled=!editing;
    // A concurrent-edit conflict must never prevent exporting the unsaved text.
    download.disabled=htmlButton.disabled=printButton.disabled=!active||!allowed();
    save.disabled=!editing||busy;
    writingLine.disabled=writingGo.disabled=writingBlock.disabled=writingInsert.disabled=!editing;
    footnoteId.disabled=footnoteText.disabled=!editing;
    footnoteInsert.disabled=!editing||!footnoteText.value.trim();
    impactBase.disabled=impactReview.disabled=!editing||dirty;
    impactCitation.disabled=impactDownload.disabled=!editing||!citationImpactValid(citationImpactState);
    const selectedImpact=citationImpactState?.report.entries.find(row=>row.id===impactCitation.value);
    impactCurrentUse.disabled=!editing||!citationImpactValid(citationImpactState)||!selectedImpact?.currentUses.length;
    impactJump.disabled=impactCurrentUse.disabled||!selectedImpact?.currentUses.some(row=>String(row.offset)===impactCurrentUse.value);
    impactHistory.disabled=!editing||!citationImpactValid(citationImpactState)||citationImpactState?.baselineRevision===null;
    duplicateReview.disabled=!editing||dirty||
      !analyzeOfficeReferences(body.value).problems.some(row=>row.kind==='duplicate-footnote');
    duplicateGroup.disabled=!editing||!duplicateReviewValid(duplicateReviewState);
    duplicatePreview.disabled=!editing||!duplicateReviewValid(duplicateReviewState)||
      duplicateReviewState?.keepOffset===null;
    duplicateConfirm.disabled=!editing||!duplicatePlan||
      duplicatePlan.review!==duplicateReviewState||
      !duplicateReviewValid(duplicatePlan.review);
    issueHistoryReview.disabled=!editing||dirty;issueHistoryFilter.disabled=!editing||!issueHistoryValid(issueHistoryState);
    citationMergeBase.disabled=citationMergeIncoming.disabled=!editing||dirty||!active||active.history.length<2;
    citationMergeReviewButton.disabled=!editing||dirty||
      !active?.history.some(rev=>String(rev.revision)===citationMergeBase.value)||
      !active?.history.some(rev=>String(rev.revision)===citationMergeIncoming.value)||
      Number(citationMergeBase.value)>=Number(citationMergeIncoming.value)||
      Number(citationMergeIncoming.value)>=Number(active?.revision);
    const mergeActionable=citationMergeReviewState?.audit.rows.filter(row=>row.status==='safe'||row.status==='conflict')??[];
    citationMergePreviewButton.disabled=!editing||dirty||!citationMergeValid(citationMergeReviewState)||
      !!citationMergeReviewState?.audit.blocked||!mergeActionable.length||
      mergeActionable.some(row=>!citationMergeReviewState?.decisions[row.id] );
    citationMergeConfirm.disabled=!editing||dirty||!citationMergePlan||
      !citationMergeValid(citationMergePlan?.review??null)||
      citationMergePlan?.review!==citationMergeReviewState||
      citationMergePlan?.decisions!==citationMergeSelections(citationMergePlan.review);
    citationAuditBase.disabled=!editing||!active?.history.length;
    citationAuditCompare.disabled=!editing||!active?.history.some(row=>String(row.revision)===citationAuditBase.value);
    citationBatchPreview.disabled=!editing||dirty||!citationAuditSnapshot||!citationBatchSelected.size;
    citationBatchConfirm.disabled=!editing||dirty||!citationBatchPlan||
      citationBatchPlan.snapshot!==citationAuditSnapshot||
      citationBatchPlan.snapshot.scope!==store?.scope||
      citationBatchPlan.snapshot.documentId!==active?.id||
      citationBatchPlan.snapshot.revision!==active?.revision||
      citationBatchPlan.snapshot.body!==body.value||
      !active?.history.some(row=>row.revision===citationBatchPlan?.snapshot.baselineRevision&&
        row.body===citationBatchPlan?.baselineBody);
    citationRestoreConfirm.disabled=!editing||dirty||!citationRecoveryPlan||
      citationRecoveryPlan.snapshot!==citationAuditSnapshot||
      citationRecoveryPlan.snapshot.scope!==store?.scope||
      citationRecoveryPlan.snapshot.documentId!==active?.id||
      citationRecoveryPlan.snapshot.revision!==active?.revision||
      citationRecoveryPlan.snapshot.body!==body.value||
      !active?.history.some(row=>row.revision===citationRecoveryPlan?.snapshot.baselineRevision&&
        row.body===citationRecoveryPlan?.baselineBody);
    const citation=editing?officeCitationInventory(body.value).entries.find(row=>row.id===citationSelect.value):undefined;
    citationSelect.disabled=!editing;
    citationDefinition.disabled=!citation;
    citationUsage.disabled=!citation?.uses.length;
    citationInsert.disabled=!citation||citation.definitionCount!==1;
    citationNewId.disabled=!citation||citation.definitionCount!==1;
    citationRename.disabled=!citation||citation.definitionCount!==1||!citationNewId.value.trim();
    const editReady=editing&&!!citationEditDraft&&citationEditDraft.scope===store?.scope&&
      citationEditDraft.documentId===active?.id&&citationEditDraft.id===citationSelect.value&&
      citationEditDraft.revision===active?.revision&&citationEditDraft.source===body.value&&
      citation?.definitionCount===1;
    citationEdit.disabled=!editReady;
    citationEditApply.disabled=!editReady||!citationEdit.value.trim()||
      citationEdit.value===citationEditDraft?.content;
    citationEditCancel.disabled=!editing||!citationEditDraft;
    const hasRealHeadings=editing&&officeHeadingReferences(body.value).length>0;
    tocReviewButton.disabled=!hasRealHeadings||dirty;
    referenceTarget.disabled=!hasRealHeadings;
    referenceInsert.disabled=!hasRealHeadings||!referenceTarget.value;
    tocConfirm.disabled=!editing||dirty||!contentsPlan||contentsPlan.scope!==store?.scope||
      contentsPlan.id!==active?.id||contentsPlan.revision!==active?.revision||
      contentsPlan.body!==body.value||contentsPlan.title!==title.value;
    writingRows.disabled=writingColumns.disabled=!editing||writingBlock.value!=='table';
    writingLanguage.disabled=!editing||writingBlock.value!=='code';
    history.disabled=restore.disabled=!editing||busy||!active?.history.length;
    compareButton.disabled=!editing||!history.value||!active?.history.some(rev=>String(rev.revision)===history.value);
    const timelineValid=!!active&&!!store&&!!timelineChosen&&allowed()&&
      timelineChosen.scope===store.scope&&timelineChosen.id===active.id&&
      timelineChosen.currentRevision===active.revision;
    const historicalSelected=timelineValid&&!!active&&active.history.some(entry=>entry.revision===timelineChosen!.selectedRevision);
    timelineCompare.disabled=!editing||!historicalSelected;
    timelineSearch.disabled=timelineCase.disabled=!editing;
    const baselineValid=!!store&&!!active&&!!timelineBaseline&&allowed()&&
      timelineBaseline.scope===store.scope&&timelineBaseline.id===active.id&&
      timelineBaseline.currentRevision===active.revision;
    timelineBaselineButton.disabled=!editing||!timelineValid;
    timelinePairButton.disabled=!editing||!baselineValid||!timelineValid||
      timelineBaseline?.selectedRevision===timelineChosen?.selectedRevision;
    timelineRestore.disabled=!editing||dirty||!historicalSelected;
    for(const control of timelineList.querySelectorAll<HTMLButtonElement>('button[data-office-timeline-revision]'))
      control.disabled=!editing;
    const reviewActive=!!compared&&editing&&compared.scope===store?.scope&&compared.id===active?.id&&compared.revision===active?.revision;
    recoverStart.disabled=recoverEnd.disabled=!reviewActive;
    const from=Number(recoverStart.value),to=Number(recoverEnd.value);
    const validRange=reviewActive&&Number.isSafeInteger(from)&&from>=1&&Number.isSafeInteger(to)&&to>=from&&to-from<200;
    recoverInsert.disabled=recoverReplace.disabled=!validRange;
    const chosenHunk=hunkIndex>=0?changeHunks[hunkIndex]:null;
    hunkPrevious.disabled=hunkNext.disabled=!reviewActive||changeHunks.length<2;
    hunkHistorical.disabled=!reviewActive||!chosenHunk||chosenHunk.removed===0;
    hunkCurrent.disabled=!reviewActive||!chosenHunk;
    const exactRecovery=reviewActive&&!dirty&&!hunkLimited&&!hunkSummaryOnly;
    batchPreview.disabled=!exactRecovery||!selectedHistoricalHunks.size||selectedHistoricalHunks.size>MAX_MULTI_RECOVERY_HUNKS;
    batchCancel.disabled=!reviewActive||!selectedHistoricalHunks.size;
    batchConfirm.disabled=!exactRecovery||!batchPlan||batchPlan.scope!==store?.scope||batchPlan.id!==active?.id||
      batchPlan.revision!==active?.revision||batchPlan.body!==body.value||batchPlan.title!==title.value;
    for(const item of batchList.querySelectorAll<HTMLInputElement>('input[data-office-batch-index]'))item.disabled=!exactRecovery;
    add.disabled=!store||blocked||!allowed()||busy;
    templatePicker.disabled=!store||blocked||!allowed()||busy;
    importFile.disabled=!store||blocked||!allowed()||busy;
    importTitle.disabled=importConfirm.disabled=!pendingImport||!store||blocked||!allowed()||busy;
    importCancel.disabled=!pendingImport||busy;
    multiFiles.disabled=!store||blocked||!allowed()||busy;
    multiConfirm.disabled=!pendingMulti||!store||blocked||!allowed()||busy;
    multiCancel.disabled=!pendingMulti||busy;
    for(const field of multiList.querySelectorAll<HTMLInputElement>('input[data-office-multi-title]'))field.disabled=!pendingMulti||busy||!allowed();
    restoreFile.disabled=!store||blocked||!allowed()||busy;
    restoreConfirm.disabled=!pendingRestore||!restoreNew||!store||blocked||!allowed()||busy;
    restoreCancel.disabled=!pendingRestore||busy;
    search.disabled=sort.disabled=backup.disabled=!store||!allowed()||busy;
    findQuery.disabled=findCase.disabled=replaceValue.disabled=!editing;
    findPrevious.disabled=findNext.disabled=!editing||matches.length===0;
    replaceAll.disabled=!editing||matches.length===0||findTruncated;
    sectionSelect.disabled=!editing||documentSections(body.value).length===0;
    const selectedSection=documentSections(body.value).find(section=>String(section.offset)===sectionSelect.value);
    sectionFocus.disabled=sectionUp.disabled=sectionDown.disabled=!editing||!selectedSection;
    const canSelect=!!store&&allowed()&&!busy;
    selectVisible.disabled=!canSelect||!savedDocuments.length;
    clearSelection.disabled=!canSelect||!selectedBundle.size;
    bundleButton.disabled=!canSelect||!selectedBundle.size||dirty||!!heldDraft||blocked;
    for(const checkbox of list.querySelectorAll<HTMLInputElement>('input[data-office-select-id]'))checkbox.disabled=!canSelect;
    const sectionsForAuthoring=editing?documentSections(body.value):[];
    const atSelection=sectionsForAuthoring.find(entry=>String(entry.offset)===sectionSelect.value)||
      (sectionsForAuthoring.length?sectionsForAuthoring.filter(entry=>entry.offset<=body.selectionStart&&body.selectionStart<=entry.end).at(-1):null);
    sectionTitle.disabled=!editing;
    sectionAddSibling.disabled=!editing||!atSelection||!sectionTitle.value.trim();
    sectionAddChild.disabled=!editing||!atSelection||atSelection.level>=6||!sectionTitle.value.trim();
    headingPrevious.disabled=headingNext.disabled=!editing||!sectionsForAuthoring.length;
    const savedSection=editing&&!dirty&&selectedSection;
    transformDuplicate.disabled=!savedSection;
    transformPromote.disabled=!savedSection||savedSection.level<=1;
    transformDemote.disabled=!savedSection||savedSection.level>=6;
    transformConfirm.disabled=!savedSection||!structuralPlan||structuralPlan.scope!==store?.scope||
      structuralPlan.id!==active?.id||structuralPlan.revision!==active?.revision||
      structuralPlan.body!==body.value||structuralPlan.title!==title.value||
      String(structuralPlan.offset)!==sectionSelect.value;
    for(const button of formatButtons)button.disabled=!editing||busy;
  };
  function clearComparison(){
    compared=null;comparePanel.hidden=true;compareSummary.textContent='';
    compareDiffs.replaceChildren();recoverPreview.textContent='';recoverInfo.textContent='';
    changeHunks=[];hunkIndex=-1;hunkTotal=0;hunkLimited=false;hunkSummaryOnly=false;
    hunkPosition.textContent='No differences selected';hunkDetails.textContent='';
    hunkPreview.replaceChildren();recoverStart.value='';recoverEnd.value='';
    selectedHistoricalHunks.clear();batchList.replaceChildren();batchSelection.textContent='0 changes selected';
    discardBatchPreview();
  }
  function comparedHistory(){
    if(!active||!store||!compared||!allowed()||compared.scope!==store.scope||
       compared.id!==active.id||compared.revision!==active.revision)return null;
    return active.history.find(entry=>entry.revision===compared!.historical)??null;
  }
  function previewRecovery(){
    const rev=comparedHistory();
    recoverPreview.textContent='';
    if(!rev){recoverInfo.textContent='Select a saved revision first.';return;}
    const from=Number(recoverStart.value),to=Number(recoverEnd.value);
    try{
      const excerpt=recoverRevisionLines(rev,from,to);
      recoverPreview.textContent=excerpt;
      recoverInfo.textContent='Revision '+rev.revision+' · historical lines '+from+'–'+to+' · '+excerpt.length+' characters';
    }catch(error){recoverInfo.textContent=error instanceof Error?error.message:'Range unavailable';}
    enable();
  }
  function renderSelectedHunk(){
    const hunk=changeHunks[hunkIndex];
    hunkPreview.replaceChildren();
    if(!hunk||!comparedHistory()){
      hunkPosition.textContent='No changed sections';
      hunkDetails.textContent='Historical and current source match.';
      enable();return;
    }
    hunkPosition.textContent='Change '+(hunkIndex+1)+' of '+hunkTotal+
      (hunkLimited?' · first '+changeHunks.length+' navigable':'');
    hunkDetails.textContent='History lines '+hunk.historicalFrom+'–'+hunk.historicalTo+
      ' ('+hunk.removed+' removed), current lines '+hunk.currentFrom+'–'+hunk.currentTo+
      ' ('+hunk.added+' added).'+
      (hunkSummaryOnly?' Large document: a single bounded summary, not an exact changed-hunk diff.':'')+
      (hunk.removed>200?' Historical recovery is limited to the first 200 lines.':'');
    const historical=document.createElement('pre'),current=document.createElement('pre');
    historical.textContent='Historical excerpt:\n'+(hunk.historicalSample.length?hunk.historicalSample.join('\n'):'(no historical lines)');
    current.textContent='Current excerpt:\n'+(hunk.currentSample.length?hunk.currentSample.join('\n'):'(no current lines)');
    hunkPreview.append(historical,current);enable();
  }
  function focusHunk(delta:number){
    if(!changeHunks.length||!comparedHistory()||body.disabled)return;
    hunkIndex=(hunkIndex+delta+changeHunks.length)%changeHunks.length;
    renderSelectedHunk();
  }
  function renderBatchSelection(){
    batchSelection.textContent=selectedHistoricalHunks.size+' of '+changeHunks.length+' changes selected'+
      (hunkLimited?' (truncated source; batch recovery unavailable)':'')+
      (hunkSummaryOnly?' (summary only; batch recovery unavailable)':'');
    enable();
  }
  function renderBatchChoices(){
    batchList.replaceChildren();
    for(let i=0;i<changeHunks.length;i++){
      const hunk=changeHunks[i]!;
      const label=document.createElement('label');label.className='office-batch-choice';
      const input=document.createElement('input');input.type='checkbox';input.dataset.officeBatchIndex=String(i);
      input.checked=selectedHistoricalHunks.has(i);
      const note=document.createElement('span');
      note.textContent='Change '+(i+1)+' · history '+hunk.historicalFrom+'–'+hunk.historicalTo+
        ' → current '+hunk.currentFrom+'–'+hunk.currentTo;
      input.addEventListener('change',()=>{
        if(!comparedHistory()||busy||dirty||blocked||!allowed()){input.checked=selectedHistoricalHunks.has(i);return;}
        if(input.checked){
          if(selectedHistoricalHunks.size>=MAX_MULTI_RECOVERY_HUNKS){
            input.checked=false;message('Choose at most 20 changes in one recovery.');return;
          }
          selectedHistoricalHunks.add(i);
        }else selectedHistoricalHunks.delete(i);
        discardBatchPreview();renderBatchSelection();
      });
      label.append(input,note);batchList.append(label);
    }
    renderBatchSelection();
  }
  function renderComparison(){
    const rev=comparedHistory();
    if(!rev){clearComparison();enable();return;}
    const result=compareOfficeRevision(rev.body,body.value);
    const detailed=revisionHunks(rev.body,body.value);
    changeHunks=detailed.hunks;hunkTotal=detailed.totalHunks;hunkLimited=detailed.truncated;hunkSummaryOnly=detailed.summaryOnly;
    discardBatchPreview();
    for(const index of [...selectedHistoricalHunks])if(index>=changeHunks.length)selectedHistoricalHunks.delete(index);
    renderBatchChoices();
    if(!changeHunks.length)hunkIndex=-1;
    else if(hunkIndex<0||hunkIndex>=changeHunks.length)hunkIndex=0;
    compareSummary.textContent='Historical revision '+rev.revision+' (“'+rev.title+'”) vs '+(dirty?'unsaved current draft':'saved current revision '+active!.revision)+
      ' (“'+title.value+'”) · '+result.changedRows+' differing lines'+(result.truncated?' (first 80 shown)':'');
    compareDiffs.replaceChildren();
    if(!result.differences.length){
      const same=document.createElement('p');same.textContent='Bodies are identical. Titles may still differ.';compareDiffs.append(same);
    }
    for(const difference of result.differences){
      const row=document.createElement('div');row.className='office-revision-diff';
      const older=document.createElement('pre');older.textContent='History line '+difference.line+': '+(difference.historical??'—');
      const newer=document.createElement('pre');newer.textContent='Current line '+difference.line+': '+(difference.current??'—');
      row.append(older,newer);compareDiffs.append(row);
    }
    renderSelectedHunk();previewRecovery();enable();
  }
  function clearTimeline(){
    timelineChosen=null;timelinePreview.hidden=true;
    timelineSummary.textContent='';timelineExcerptNode.textContent='';
    timelineTruncated.textContent='';timelineList.replaceChildren();
    timelineSearch.value='';timelineCase.checked=false;timelineCount.textContent='No versions available';
    timelineBaseline=null;timelineBaselineNote.textContent='No baseline selected';
    clearVersionPair();
    timelineNote.textContent='Create or open a document to inspect saved revisions.';
  }
  function timelineRevision(){
    if(!store||!active||!timelineChosen||!allowed()||
       timelineChosen.scope!==store.scope||timelineChosen.id!==active.id||
       timelineChosen.currentRevision!==active.revision)return null;
    const selected=timelineChosen.selectedRevision;
    return selected===active.revision?
      {revision:active.revision,title:active.title,body:active.body,updatedAt:active.updatedAt}:
      active.history.find(entry=>entry.revision===selected)??null;
  }
  function inspectTimeline(revision:number){
    if(!active||!store||!allowed()||busy||blocked)return;
    const entry=officeRevisionTimeline(active).find(row=>row.revision===revision);
    const source=revision===active.revision?
      {title:active.title,body:active.body,updatedAt:active.updatedAt}:
      active.history.find(row=>row.revision===revision);
    if(!entry||!source)return;
    clearComparison();clearVersionPair();
    timelineChosen={scope:store.scope,id:active.id,currentRevision:active.revision,selectedRevision:revision};
    const excerpt=timelineExcerpt(source.body);
    timelineSummary.textContent='Revision '+revision+' · '+source.title+' · '+
      new Date(source.updatedAt).toLocaleString()+' · '+entry.lines+' lines · '+entry.characters+' characters'+
      (entry.historical?' · historical snapshot':' · latest saved version');
    timelineExcerptNode.textContent=excerpt.text;
    timelineTruncated.textContent=excerpt.truncated?
      'Showing '+excerpt.shownLines+' of '+excerpt.totalLines+' lines (at most 5,000 characters). Original saved record is not modified.':
      'Complete source preview. Original saved record is not modified.';
    timelinePreview.hidden=false;
    if(entry.historical)history.value=String(revision);
    else history.value='';
    for(const item of timelineList.querySelectorAll<HTMLButtonElement>('button[data-office-timeline-revision]'))
      item.setAttribute('aria-pressed',String(item.dataset.officeTimelineRevision===String(revision)));
    enable();
  }
  function renderHistoryMatches(){
    timelineList.replaceChildren();
    if(!active||!store||!allowed()){timelineCount.textContent='No versions available';return;}
    const rows=officeRevisionTimeline(active);
    const matches=searchOfficeHistory(active,timelineSearch.value,timelineCase.checked);
    const visible=new Map(matches.map(hit=>[hit.revision,hit]));
    timelineCount.textContent=matches.length+' of '+rows.length+' retained version'+(rows.length===1?'':'s')+' match';
    for(const item of rows){
      const hit=visible.get(item.revision);
      if(!hit)continue;
      const wrapper=document.createElement('div');wrapper.className='office-timeline-row';wrapper.setAttribute('role','listitem');
      const button=document.createElement('button');button.type='button';button.dataset.officeTimelineRevision=String(item.revision);
      button.setAttribute('aria-pressed',String(timelineChosen?.selectedRevision===item.revision));
      const heading=document.createElement('strong');heading.textContent='Revision '+item.revision+(item.historical?'':' · current');
      const detail=document.createElement('span');detail.textContent=item.title+' · '+new Date(item.updatedAt).toLocaleString();
      const changes=document.createElement('small');changes.textContent=item.historical?
        item.changedSpan+' lines in changed span'+(item.titleChanged?' · title changed':''):
        item.lines+' lines · latest saved version';
      button.append(heading,detail,changes);
      if(hit.snippet){const excerpt=document.createElement('small');excerpt.className='office-history-hit';excerpt.textContent=hit.snippet;button.append(excerpt);}
      button.addEventListener('click',()=>inspectTimeline(item.revision));
      wrapper.append(button);timelineList.append(wrapper);
    }
    if(!matches.length){const empty=document.createElement('p');empty.className='ws-muted';empty.textContent='No retained revisions match the search.';timelineList.append(empty);}
    enable();
  }
  function renderTimeline(){
    timelinePreview.hidden=true;
    if(!active||!allowed()||!store){clearTimeline();enable();return;}
    const rows=officeRevisionTimeline(active),first=rows[0]?.revision??0,last=rows[rows.length-1]?.revision??0;
    timelineNote.textContent=rows.length+' retained version'+(rows.length===1?'':'s')+
      ' · revision '+last+'–'+first+' · older snapshots may have expired under the 12-history limit.';
    // Revision changes invalidate staged historical selections, but never touch stored records.
    timelineChosen=null;timelineBaseline=null;timelineBaselineNote.textContent='No baseline selected';
    clearVersionPair();timelineSummary.textContent='';timelineExcerptNode.textContent='';
    timelineTruncated.textContent='';renderHistoryMatches();enable();
  }
  function clearEditor(){
    clearCitationImpact(true);clearDuplicateTriage();clearIssueHistory();clearCitationMerge(true);clearCitationAudit(true);
    discardContents();discardStructure();clearComparison();clearTimeline();active=null;dirty=false;title.value='';body.value='';
    writingLine.value='';writingLanguage.value='';sectionTitle.value='';
    footnoteId.value='';footnoteText.value='';
    renderPreview();renderOutline();renderFind();printSheet.replaceChildren();
    history.replaceChildren(new Option('History',''));enable();
  }
  function renderOutline(){
    outline.replaceChildren();
    const previousReference=referenceTarget.value;
    referenceTarget.replaceChildren(new Option('Choose a heading',''));
    if(active&&allowed()){
      const references=officeHeadingReferences(body.value);
      for(const heading of references)
        referenceTarget.add(new Option('  '.repeat(heading.level-1)+heading.title,heading.id));
      if(previousReference&&references.some(heading=>heading.id===previousReference))
        referenceTarget.value=previousReference;
    }
    if(!active||!allowed()){
      sectionSelect.replaceChildren(new Option('Choose heading',''));
      outlineEmpty.hidden=false;return;
    }
    const headings=outlineFor(body.value);
    outlineEmpty.hidden=headings.length>0;
    const oldSelection=sectionSelect.value;
    sectionSelect.replaceChildren(new Option('Choose heading',''));
    for(const heading of documentSections(body.value)){
      sectionSelect.add(new Option('  '.repeat(heading.level-1)+heading.title,String(heading.offset)));
    }
    if(oldSelection&&documentSections(body.value).some(section=>String(section.offset)===oldSelection))sectionSelect.value=oldSelection;
    for(const heading of headings){
      const link=document.createElement('button');link.type='button';
      link.className='office-heading-link';link.dataset.officeHeading=String(heading.offset);
      link.style.paddingInlineStart=String((heading.level-1)*12+8)+'px';
      link.textContent=heading.title;
      link.title='Jump to '+heading.title;
      link.addEventListener('click',()=>{
        if(!active||!allowed()||body.disabled)return;
        if(root.dataset.officeMode==='preview'){
          root.dataset.officeMode='write';
          for(const option of layoutButtons)option.setAttribute('aria-pressed',String(option.dataset.officeMode==='write'));
        }
        body.focus();
        body.setSelectionRange(heading.offset,heading.offset);
        body.scrollTop=Math.max(0,(heading.line-3)*22);
      });
      outline.append(link);
    }
  }
  function renderFind(){
    matches=[];findTruncated=false;
    if(!active||!allowed()){
      matchCursor=-1;findCount.textContent='No search';return;
    }
    try{
      const result=findEditorText(body.value,findQuery.value,findCase.checked);
      matches=result.matches;findTruncated=result.truncated;
      if(!matches.length)matchCursor=-1;
      else if(matchCursor>=matches.length)matchCursor=matches.length-1;
      findCount.textContent=!findQuery.value?'No search':matches.length+(findTruncated?'+':'')+' match'+(matches.length===1&&!findTruncated?'':'es')+(matchCursor>=0?' · '+(matchCursor+1)+' selected':'');
    }catch(error){matchCursor=-1;findCount.textContent=error instanceof Error?error.message:'Search unavailable';}
  }
  function focusEditor(start:number,end:number){
    if(!active||!allowed()||body.disabled)return;
    if(root.dataset.officeMode==='preview'){
      root.dataset.officeMode='write';
      for(const mode of layoutButtons)mode.setAttribute('aria-pressed',String(mode.dataset.officeMode==='write'));
    }
    body.focus();body.setSelectionRange(start,end);
    const line=body.value.slice(0,start).split('\n').length;
    body.scrollTop=Math.max(0,(line-3)*22);
  }
  function jumpMatch(delta:number){
    if(!matches.length||body.disabled||!allowed())return;
    matchCursor=matchCursor<0?(delta>0?0:matches.length-1):(matchCursor+delta+matches.length)%matches.length;
    const match=matches[matchCursor]!;
    focusEditor(match.start,match.end);renderFind();
  }
  function renderHistory(){
    clearCitationImpact(true);clearDuplicateTriage();clearIssueHistory();clearCitationMerge(true);clearCitationAudit();
    const chosen=citationAuditBase.value;
    citationAuditBase.replaceChildren(new Option('Choose retained revision',''));
    history.replaceChildren(new Option('History',''));
    for(const rev of [...(active?.history??[])].reverse()){
      history.add(new Option('Revision '+rev.revision+' · '+new Date(rev.updatedAt).toLocaleString(),String(rev.revision)));
      citationAuditBase.add(new Option('Revision '+rev.revision,String(rev.revision)));
      impactBase.add(new Option('Revision '+rev.revision,String(rev.revision)));
      citationMergeBase.add(new Option('Revision '+rev.revision,String(rev.revision)));
      citationMergeIncoming.add(new Option('Revision '+rev.revision,String(rev.revision)));
    }
    if(chosen&&active?.history.some(rev=>String(rev.revision)===chosen))citationAuditBase.value=chosen;
    renderTimeline();
  }
  function selectionStatus(){
    bundleCount.textContent=selectedBundle.size+' document'+(selectedBundle.size===1?'':'s')+' selected';
    enable();
  }
  function renderList(){
    list.replaceChildren();
    if(!allowed()){count.textContent='Documents hidden';selectionStatus();return;}
    const results=findDocuments(savedDocuments,search.value,sort.value as DocumentSort);
    count.textContent=results.length+' of '+savedDocuments.length+' documents';
    for(const id of [...selectedBundle])if(!savedDocuments.some(doc=>doc.id===id))selectedBundle.delete(id);
    selectionStatus();
    if(!results.length){
      const empty=document.createElement('p');empty.className='ws-muted';
      empty.textContent=search.value.trim()?'No documents match this search.':'No documents yet.';
      list.append(empty);return;
    }
    const appendGroup=(label:string,items:typeof results)=>{
      if(!items.length)return;
      const heading=document.createElement('h3');heading.className='office-list-heading';heading.textContent=label;list.append(heading);
      for(const hit of items){
        const doc=hit.doc,button=document.createElement('button');button.type='button';button.className='office-entry';
        button.dataset.officeId=doc.id;button.setAttribute('aria-current',doc.id===active?.id?'page':'false');
        const name=document.createElement('strong');name.textContent=doc.title;button.append(name);
        const meta=document.createElement('small');meta.textContent='Edited '+new Date(doc.updatedAt).toLocaleDateString()+' · revision '+doc.revision;button.append(meta);
        if(search.value.trim()&&hit.match==='body'&&hit.snippet){
          const excerpt=document.createElement('span');excerpt.className='office-match';excerpt.textContent=hit.snippet;button.append(excerpt);
        }
        button.addEventListener('click',()=>void select(doc.id));
        const wrapper=document.createElement('div');wrapper.className='office-entry-row';
        const checkbox=document.createElement('input');checkbox.type='checkbox';
        checkbox.dataset.officeSelectId=doc.id;checkbox.setAttribute('aria-label','Select '+doc.title+' for Markdown ZIP');
        checkbox.checked=selectedBundle.has(doc.id);
        checkbox.disabled=!store||!allowed()||busy;
        checkbox.addEventListener('change',()=>{
          if(!allowed()||!store)return;
          if(checkbox.checked)selectedBundle.add(doc.id);else selectedBundle.delete(doc.id);
          selectionStatus();
        });
        wrapper.append(checkbox,button);list.append(wrapper);
      }
    };
    if(sort.value==='recent'&&!search.value.trim()&&results.length>5){
      appendGroup('Recently edited',results.slice(0,5));
      appendGroup('Earlier documents',results.slice(5));
    }else appendGroup(search.value.trim()?'Search results':sort.value==='title'?'All documents · A–Z':'Recently edited',results);
  }
  async function refreshList(){
    const opened=store,ticket=epoch;
    if(!opened)return;
    const docs=await opened.list();
    if(ticket===epoch&&opened===store&&allowed()){savedDocuments=docs;renderList();}
  }
  async function select(id:string){
    if(!store||busy||blocked||!allowed())return;
    if(dirty){await persist();if(dirty)return;}
    const opened=store,ticket=epoch;
    try{
      const doc=await opened.read(id);
      if(ticket!==epoch||opened!==store||!allowed())return;
      if(!doc)throw new Error('Document no longer exists.');
      clearCitationImpact(true);clearDuplicateTriage();clearIssueHistory();clearCitationMerge(true);clearCitationAudit(true);
      discardContents();discardStructure();clearComparison();active=doc;title.value=doc.title;body.value=doc.body;writingLine.value='';sectionTitle.value='';footnoteId.value='';footnoteText.value='';renderPreview();dirty=false;renderOutline();renderFind();
      renderHistory();await refreshList();enable();message('Revision '+doc.revision+' · saved on this device');
    }catch(e){message(e instanceof Error?e.message:'Cannot open document');}
  }
  async function persist(){
    if(!dirty||!active||!store||blocked||!allowed()||busy)return;
    clearTimeout(auto);busy=true;enable();
    const current=active,stamp=epoch,wantedTitle=title.value,wantedBody=body.value;
    try{
      const saved=await store.save(current,wantedTitle,wantedBody);
      if(stamp!==epoch||!allowed())return;
      if(saved.revision!==current.revision)clearComparison();
      active=saved;
      dirty=title.value!==saved.title||body.value!==saved.body;
      renderHistory();await refreshList();
      message(dirty?'New edits waiting to save':'Saved locally · revision '+saved.revision);
    }catch(e){
      if(stamp!==epoch)return;
      blocked=true;message((e instanceof Error?e.message:'Could not save')+' Export your current text before reloading.');
    }finally{
      busy=false;enable();
      if(dirty&&!blocked&&stamp===epoch)queueAutosave();
    }
  }
  function queueAutosave(){
    clearTimeout(auto);
    auto=setTimeout(()=>void persist(),600);
  }
  async function create(){
    if(!store||busy||blocked||!allowed())return;
    if(dirty){await persist();if(dirty)return;}
    const opened=store,ticket=epoch;
    busy=true;enable(); // Do not allow filling the previous document while the new IDB record is being created.
    try{
      const chosen=getOfficeTemplate(templatePicker.value);
      const doc=await opened.create(chosen.id==='blank'?undefined:{title:chosen.title,body:chosen.body});
      if(ticket!==epoch||opened!==store||!allowed())return;
      active=doc;title.value=doc.title;body.value=doc.body;dirty=false;
      sectionTitle.value='';footnoteId.value='';footnoteText.value='';
      discardContents();discardStructure();
      renderPreview();renderOutline();renderFind();renderHistory();
      await refreshList();
      if(ticket!==epoch||opened!==store||!allowed())return;
      templatePicker.value='blank';title.focus();
      message(chosen.id==='blank'?'Revision 0 · saved on this device':'New '+chosen.label.toLowerCase()+' created locally. Edit the placeholders before sharing.');
    }catch(e){if(ticket===epoch)message(e instanceof Error?e.message:'Cannot create document');}
    finally{if(ticket===epoch){busy=false;enable();}}
  }
  async function start(){
    const ticket=++epoch;
    if(dirty&&active&&store)heldDraft={scope:store.scope,id:active.id,revision:active.revision,title:title.value,body:body.value};
    clearTimeout(auto);store?.close();store=null;blocked=false;busy=false;
    clearComparison();clearImport();clearMulti();clearRestore();selectedBundle.clear();
    findQuery.value='';replaceValue.value='';findCase.checked=false;matches=[];matchCursor=-1;
    bundleCount.textContent='0 documents selected';
    savedDocuments=[];list.replaceChildren();count.textContent='Documents hidden';clearEditor();
    if(!allowed()){search.value='';message('Documents hidden while Hub privacy or Account identity is unavailable.');return;}
    const scope=namespace(hubIdentity.status==='signed-in'?hubIdentity.id:null);
    // A changed owner must never inherit another owner's in-memory draft.
    if(heldDraft&&heldDraft.scope!==scope)heldDraft=null;
    const opened=new OfficeDeviceStore(scope);
    try{
      await opened.open();
      if(ticket!==epoch||!allowed()){opened.close();return;}
      store=opened;
      const docs=await store.list();
      if(ticket!==epoch)return;
      savedDocuments=docs;renderList();enable();
      if(docs.length){
        const id=heldDraft&&docs.some(doc=>doc.id===heldDraft!.id)?heldDraft.id:docs[0]!.id;
        await select(id);
        if(ticket!==epoch||!active||!heldDraft||active.id!==heldDraft.id)return;
        title.value=heldDraft.title;body.value=heldDraft.body;renderPreview();renderOutline();renderFind();
        dirty=title.value!==active.title||body.value!==active.body;
        blocked=active.revision!==heldDraft.revision;
        heldDraft=null;
        enable();
        if(blocked)message('Another tab changed this document while it was hidden. Export this draft before reopening.');
        else if(dirty){message('Recovered unsaved edits after privacy change · autosave pending');queueAutosave();}
      }else message('Ready · your Office documents stay in a separate local database.');
    }catch(e){
      opened.close();if(ticket===epoch){store=null;enable();message(e instanceof Error?e.message:'Office storage is unavailable.');}
    }
  }
  multiFiles.addEventListener('change',()=>void (async()=>{
    const chosen=[...(multiFiles.files??[])];
    clearMulti();
    if(!chosen.length||!store||blocked||busy||!allowed())return;
    const opened=store,ticket=epoch,nonce=multiNonce;
    if(chosen.length>MAX_MULTI_IMPORT_FILES){
      message('Choose no more than 20 Markdown files. Nothing imported.');return;
    }
    if(chosen.some(file=>file.size>MAX_IMPORT_BYTES)||chosen.reduce((sum,file)=>sum+file.size,0)>MAX_MULTI_IMPORT_BYTES){
      message('Batch exceeds the Markdown size limits. Nothing imported.');return;
    }
    try{
      const inputs=await Promise.all(chosen.map(async file=>({name:file.name,data:await file.arrayBuffer()})));
      if(ticket!==epoch||nonce!==multiNonce||opened!==store||!allowed())return;
      const batch=parseMarkdownBatch(inputs);
      if(ticket!==epoch||nonce!==multiNonce||opened!==store||!allowed())return;
      pendingMulti={scope:opened.scope,docs:batch.documents};
      multiSummary.textContent=batch.documents.length+' files · '+batch.bytes+' UTF-8 bytes · each file will receive a new Office document ID';
      multiList.replaceChildren();
      for(const [index,doc] of batch.documents.entries()){
        const section=document.createElement('section');section.className='office-multi-entry';
        const filename=document.createElement('p');filename.textContent=(index+1)+'. '+doc.sourceName+' · '+doc.bytes+' bytes';
        const label=document.createElement('label'),id='office-multi-title-'+index;
        label.htmlFor=id;label.textContent='Document title';
        const field=document.createElement('input');field.id=id;field.maxLength=120;
        field.dataset.officeMultiTitle=String(index);field.value=doc.title;
        const sample=document.createElement('div');sample.className='office-preview office-multi-sample';
        renderMarkdown(doc.body.slice(0,800),sample);
        section.append(filename,label,field,sample);multiList.append(section);
      }
      multiPanel.hidden=false;enable();
      message('Review all files and their proposed titles before importing. No records have been written.');
    }catch(error){
      if(ticket!==epoch||nonce!==multiNonce||opened!==store||!allowed())return;
      clearMulti();enable();message(error instanceof Error?error.message:'Markdown batch was rejected. Nothing imported.');
    }
  })());
  multiCancel.addEventListener('click',()=>{
    clearMulti();enable();message('Multi-document import cancelled. Existing records unchanged.');
  });
  multiConfirm.addEventListener('click',()=>void (async()=>{
    if(!pendingMulti||!store||!allowed()||busy||blocked)return;
    const plan=pendingMulti,opened=store,ticket=epoch;
    if(plan.scope!==opened.scope)return;
    const inputs=[...multiList.querySelectorAll<HTMLInputElement>('input[data-office-multi-title]')];
    if(inputs.length!==plan.docs.length){message('Review list changed; cancel and select files again.');return;}
    const records=inputs.map((input,i)=>({title:input.value.trim(),body:plan.docs[i]!.body}));
    if(records.some(item=>!item.title||item.title.length>120)){
      message('Every document must have a title of 1–120 characters. Nothing imported.');return;
    }
    if(dirty){await persist();if(dirty||blocked||ticket!==epoch||opened!==store||!allowed())return;}
    if(pendingMulti!==plan||plan.scope!==opened.scope)return;
    busy=true;enable();
    try{
      const created=await opened.createBatch(records);
      if(ticket!==epoch||opened!==store||!allowed())return;
      active=created[0]??active;
      if(created[0]){
        title.value=created[0].title;body.value=created[0].body;dirty=false;
        renderPreview();renderOutline();renderFind();renderHistory();
      }
      await refreshList();
      if(ticket!==epoch||opened!==store||!allowed())return;
      clearMulti();
      message('Imported '+created.length+' new Office documents atomically. Existing records and histories unchanged.');
    }catch(error){
      if(ticket===epoch)message(error instanceof Error?error.message:'Whole import batch rolled back. No documents imported.');
    }finally{if(ticket===epoch){busy=false;enable();}}
  })());
  importFile.addEventListener('change',()=>void (async()=>{
    const file=importFile.files?.[0];
    clearImport();
    if(!file||!store||!allowed()||blocked||busy)return;
    const opened=store,ticket=epoch,nonce=importNonce;
    if(file.size>MAX_IMPORT_BYTES){message('Markdown import exceeds 256 KB. No records created.');return;}
    try{
      const data=await file.arrayBuffer();
      if(ticket!==epoch||nonce!==importNonce||opened!==store||!allowed())return;
      const parsed=decodeMarkdownImport(file.name,data);
      if(ticket!==epoch||nonce!==importNonce||opened!==store||!allowed())return;
      pendingImport={...parsed,scope:opened.scope};
      importTitle.value=parsed.title;
      importInfo.textContent=parsed.sourceName+' · '+parsed.bytes+' bytes · '+parsed.body.length+' characters';
      renderMarkdown(parsed.body.slice(0,PREVIEW_LENGTH),importRender);
      importPanel.hidden=false;enable();
      message('Review this Markdown file before creating a new document.');
    }catch(error){
      if(ticket!==epoch||nonce!==importNonce||opened!==store||!allowed())return;
      clearImport();enable();message(error instanceof Error?error.message:'Markdown could not be opened.');
    }
  })());
  importCancel.addEventListener('click',()=>{
    clearImport();enable();message('Import cancelled; existing documents unchanged.');
  });
  importConfirm.addEventListener('click',()=>void (async()=>{
    if(!pendingImport||!store||!allowed()||blocked||busy)return;
    const pending=pendingImport,opened=store,ticket=epoch;
    if(pending.scope!==opened.scope)return;
    const name=importTitle.value.trim();
    if(!name||name.length>120){message('Enter a valid title (up to 120 characters).');return;}
    if(dirty){await persist();if(dirty||blocked||ticket!==epoch||opened!==store||!allowed())return;}
    if(pending!==pendingImport||pending.scope!==opened.scope)return;
    busy=true;enable();
    try{
      const doc=await opened.create({title:name,body:pending.body});
      if(ticket!==epoch||opened!==store||!allowed())return;
      active=doc;title.value=doc.title;body.value=doc.body;dirty=false;
      sectionTitle.value='';footnoteId.value='';footnoteText.value='';
      discardContents();discardStructure();
      renderPreview();renderOutline();renderFind();renderHistory();
      await refreshList();
      if(ticket!==epoch||opened!==store||!allowed())return;
      clearImport();
      message('Imported '+pending.sourceName+' as a new local document. Original documents unchanged.');
    }catch(error){
      if(ticket===epoch)message(error instanceof Error?error.message:'Import failed; existing documents unchanged.');
    }finally{if(ticket===epoch){busy=false;enable();}}
  })());
  restoreFile.addEventListener('change',()=>void (async()=>{
    const file=restoreFile.files?.[0];clearRestore();
    if(!file||!store||!allowed()||blocked||busy)return;
    const opened=store,ticket=epoch,nonce=restoreNonce;
    if(!/\.json$/i.test(file.name)||file.size<1||file.size>MAX_BACKUP_BYTES){
      message('Choose a nonempty Office .json backup no larger than 20 MB.');return;
    }
    try{
      const bytes=await file.arrayBuffer();
      if(ticket!==epoch||nonce!==restoreNonce||opened!==store||!allowed())return;
      const parsed=parseOfficeBackup(bytes);
      const existing=await opened.list();
      if(ticket!==epoch||nonce!==restoreNonce||opened!==store||!allowed())return;
      const plan=previewBackupRestore(parsed.documents,existing);
      pendingRestore={...parsed,scope:opened.scope,filename:file.name};
      restoreNew=plan.full?0:plan.add;
      restorePanel.hidden=false;
      restoreSummary.textContent=file.name+' · '+parsed.documents.length+' records · '+plan.add+' new · '+plan.skip+' same-ID skipped'+(plan.full?' · insufficient capacity':'');
      const occupied=new Set(existing.map(doc=>doc.id));
      restoreList.replaceChildren();
      for(const doc of parsed.documents){
        const row=document.createElement('p');row.className='office-restore-entry';
        row.textContent=(occupied.has(doc.id)?'Skip existing ID: ':'Add: ')+doc.title+' · revision '+doc.revision+' · '+doc.history.length+' historical snapshots';
        restoreList.append(row);
      }
      enable();message('Review every entry before confirming. Existing IDs cannot be replaced.');
    }catch(error){
      if(ticket!==epoch||nonce!==restoreNonce||opened!==store||!allowed())return;
      clearRestore();enable();message(error instanceof Error?error.message:'Office backup could not be validated.');
    }
  })());
  restoreCancel.addEventListener('click',()=>{
    clearRestore();enable();message('Backup restoration cancelled. Existing documents unchanged.');
  });
  restoreConfirm.addEventListener('click',()=>void (async()=>{
    if(!pendingRestore||!store||!allowed()||blocked||busy||!restoreNew)return;
    const selected=pendingRestore,opened=store,ticket=epoch;
    if(selected.scope!==opened.scope)return;
    if(dirty){await persist();if(dirty||blocked||ticket!==epoch||opened!==store||!allowed())return;}
    if(selected!==pendingRestore||selected.scope!==opened.scope)return;
    busy=true;enable();
    try{
      const receipt=await opened.restoreMissing(selected.documents);
      if(ticket!==epoch||opened!==store||!allowed())return;
      await refreshList();
      if(ticket!==epoch||opened!==store||!allowed())return;
      clearRestore();
      message('Restore complete: '+receipt.added+' added, '+receipt.skipped+' existing IDs skipped. All existing histories unchanged.');
    }catch(error){
      if(ticket===epoch)message(error instanceof Error?error.message:'Restore rolled back without modifying existing records.');
    }finally{if(ticket===epoch){busy=false;enable();}}
  })());
  search.addEventListener('input',renderList);
  sort.addEventListener('change',renderList);
  selectVisible.addEventListener('click',()=>{
    if(!store||!allowed()||busy)return;
    for(const result of findDocuments(savedDocuments,search.value,sort.value as DocumentSort))selectedBundle.add(result.doc.id);
    renderList();
  });
  clearSelection.addEventListener('click',()=>{
    if(!store||!allowed()||busy)return;
    selectedBundle.clear();renderList();
  });
  bundleButton.addEventListener('click',()=>void (async()=>{
    if(!store||!allowed()||busy||blocked||dirty||heldDraft||!selectedBundle.size)return;
    const opened=store,ticket=epoch,selection=[...selectedBundle];
    busy=true;enable();
    try{
      const docs=await opened.list();
      if(ticket!==epoch||opened!==store||!allowed()||dirty||blocked||heldDraft)return;
      const wanted=new Set(selection),chosen=docs.filter(doc=>wanted.has(doc.id));
      if(chosen.length!==selection.length)throw new Error('Some selected documents are no longer saved. Choose again.');
      const archive=exportOfficeBundle(chosen,new Date().toISOString());
      if(ticket!==epoch||opened!==store||!allowed()||dirty||blocked||heldDraft)return;
      const bytes=new Uint8Array(archive.byteLength);bytes.set(archive.bytes);
      downloadBlob(new Blob([bytes],{type:'application/zip'}),'thiepn-office-markdown-'+new Date().toISOString().slice(0,10)+'.zip');
      message('Exported '+archive.documentCount+' saved Markdown documents in one ZIP. Full revision history is in JSON backups.');
    }catch(error){if(ticket===epoch)message(error instanceof Error?error.message:'Markdown bundle export failed.');}
    finally{if(ticket===epoch){busy=false;enable();}}
  })());
  backup.addEventListener('click',()=>void (async()=>{
    if(!store||!allowed()||busy)return;
    if(dirty||heldDraft||blocked){
      message('Export unsaved document text as .md first. Backup includes only saved revisions.');
      return;
    }
    const opened=store,ticket=epoch;
    backup.disabled=true;
    try{
      const documents=await opened.list();
      if(ticket!==epoch||opened!==store||!allowed())return;
      if(dirty||heldDraft||blocked){message('Export the unsaved draft as .md before downloading the saved-document backup.');return;}
      const stamp=new Date().toISOString();
      const json=backupDocuments(documents,stamp);
      if(ticket!==epoch||opened!==store||!allowed())return;
      const blob=new Blob([json],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='thiepn-office-backup-'+stamp.slice(0,10)+'.json';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      message('Office backup exported: '+documents.length+' saved documents and their revision histories.');
    }catch(e){if(ticket===epoch)message(e instanceof Error?e.message:'Backup failed. No saved records changed.');}
    finally{if(ticket===epoch)enable();}
  })());
  add.addEventListener('click',()=>void create());
  save.addEventListener('click',()=>void persist());
  for(const input of [title,body])input.addEventListener('input',()=>{
    if(!active||blocked||!allowed())return;
    dirty=true;clearCitationImpact();clearDuplicateTriage();clearIssueHistory();clearCitationMerge();clearCitationAudit();discardContents();discardStructure();discardBatchPreview();renderPreview();renderOutline();renderFind();
    if(compared)renderComparison();enable();
    message('Unsaved edits · autosave pending');queueAutosave();
  });
  findQuery.addEventListener('input',()=>{matchCursor=-1;renderFind();enable();});
  findCase.addEventListener('change',()=>{matchCursor=-1;renderFind();enable();});
  findNext.addEventListener('click',()=>jumpMatch(1));
  findPrevious.addEventListener('click',()=>jumpMatch(-1));
  replaceAll.addEventListener('click',()=>{
    if(!active||!allowed()||body.disabled||!findQuery.value||findTruncated)return;
    if(!confirm('Replace all '+matches.length+' occurrences in this document? The previous version remains in Office revision history after saving.'))return;
    try{
      const result=replaceEditorText(body.value,findQuery.value,replaceValue.value,findCase.checked);
      if(!result.count){message('No matches to replace.');return;}
      body.value=result.value;matchCursor=-1;
      body.dispatchEvent(new Event('input',{bubbles:true}));
      message('Replaced '+result.count+' matches. Autosave pending; prior revisions remain recoverable.');
    }catch(error){message(error instanceof Error?error.message:'Replacement refused; document unchanged.');}
  });
  sectionTitle.addEventListener('input',enable);
  function targetSection(useCaret=false){
    if(!body.disabled&&useCaret)return documentSectionAt(body.value,body.selectionStart);
    const selected=documentSections(body.value).find(entry=>String(entry.offset)===sectionSelect.value);
    return selected??documentSectionAt(body.value,body.selectionStart);
  }
  function insertSection(placement:SectionPlacement,useCaret=false){
    if(!active||!allowed()||body.disabled||busy||blocked)return;
    try{
      const target=targetSection(useCaret);
      const result=insertOfficeSection(body.value,target.offset,sectionTitle.value,placement);
      body.value=result.value;
      body.dispatchEvent(new Event('input',{bubbles:true}));
      sectionSelect.value=String(result.offset);
      focusEditor(result.start,result.end);
      message('New '+(placement==='child'?'subsection':'section')+' inserted into original Markdown. Autosave pending.');
    }catch(error){message(error instanceof Error?error.message:'Cannot insert section. Original Markdown unchanged.');}
  }
  function jumpHeading(direction:'previous'|'next'){
    if(!active||!allowed()||body.disabled)return;
    try{
      const offset=adjacentDocumentHeading(body.value,body.selectionStart,direction);
      focusEditor(offset,offset);
      const chosen=documentSections(body.value).find(s=>s.offset===offset);
      if(chosen)sectionSelect.value=String(chosen.offset);
      message('Focused '+direction+' original document heading.');
    }catch(error){message(error instanceof Error?error.message:'Heading navigation unavailable.');}
  }
  sectionAddSibling.addEventListener('click',()=>insertSection('sibling'));
  sectionAddChild.addEventListener('click',()=>insertSection('child'));
  headingPrevious.addEventListener('click',()=>jumpHeading('previous'));
  headingNext.addEventListener('click',()=>jumpHeading('next'));
  body.addEventListener('keydown',event=>{
    if(!(event.ctrlKey||event.metaKey)||body.disabled||!active||!allowed()||blocked||busy)return;
    if(event.shiftKey&&!event.altKey&&event.key==='Enter'){
      event.preventDefault();insertSection('sibling',true);
    }else if(event.altKey&&!event.shiftKey&&(event.key==='ArrowUp'||event.key==='ArrowDown')){
      event.preventDefault();jumpHeading(event.key==='ArrowUp'?'previous':'next');
    }
  });
  sectionSelect.addEventListener('change',()=>{discardStructure();enable();});
  transformCancel.addEventListener('click',()=>{discardStructure();enable();});
  function prepareTransform(action:StructuralAction){
    if(!active||!store||!allowed()||body.disabled||busy||blocked||dirty)return;
    const chosen=documentSections(body.value).find(section=>String(section.offset)===sectionSelect.value);
    if(!chosen)return;
    try{
      const outcome=transformOfficeSection(body.value,chosen.offset,action);
      structuralPlan={scope:store.scope,id:active.id,revision:active.revision,
        body:body.value,title:title.value,offset:chosen.offset,action,result:outcome.value,
        selection:outcome.offset,heading:chosen.title};
      transformSource.value=outcome.value;
      transformSummary.textContent='Preview only · '+action+' “'+chosen.title+'” · '+
        outcome.affectedHeadings+' genuine heading'+(outcome.affectedHeadings===1?'':'s')+
        ' affected · '+outcome.originalCharacters+' original characters · '+
        outcome.value.length+' total source characters. Original records unchanged.';
      transformReview.hidden=false;enable();
    }catch(error){discardStructure();message(error instanceof Error?error.message:'Section transformation refused.');enable();}
  }
  transformDuplicate.addEventListener('click',()=>prepareTransform('duplicate'));
  transformPromote.addEventListener('click',()=>prepareTransform('promote'));
  transformDemote.addEventListener('click',()=>prepareTransform('demote'));
  transformConfirm.addEventListener('click',()=>void (async()=>{
    const plan=structuralPlan,opened=store,current=active,stamp=epoch;
    if(!plan||!opened||!current||!allowed()||busy||blocked||dirty||transformConfirm.disabled||
       plan.scope!==opened.scope||plan.id!==current.id||plan.revision!==current.revision||
       plan.body!==body.value||plan.title!==title.value||
       String(plan.offset)!==sectionSelect.value)return;
    if(!confirm('Apply the previewed '+plan.action+' transformation of “'+plan.heading+
       '” as one new Office revision? Existing history is retained under the normal policy.'))return;
    if(stamp!==epoch||opened!==store||current!==active||plan!==structuralPlan||
       !allowed()||busy||blocked||dirty)return;
    busy=true;enable();
    try{
      const saved=await opened.save(current,plan.title,plan.result);
      if(stamp!==epoch||opened!==store||!allowed())return;
      active=saved;body.value=saved.body;title.value=saved.title;dirty=false;
      discardStructure();clearComparison();
      renderPreview();renderOutline();renderFind();renderHistory();
      await refreshList();
      if(stamp!==epoch||opened!==store||!allowed())return;
      sectionSelect.value=String(plan.selection);
      focusEditor(plan.selection,plan.selection);
      message('Applied '+plan.action+' to original Office document · saved revision '+saved.revision+'.');
    }catch(error){
      if(stamp===epoch&&opened===store){
        blocked=true;discardStructure();
        message((error instanceof Error?error.message:'Structural save failed')+
          ' Source was not replaced. Export any unsaved text before reloading.');
      }
    }finally{if(stamp===epoch){busy=false;enable();}}
  })());
  sectionFocus.addEventListener('click',()=>{
    if(!active||!allowed()||body.disabled)return;
    const section=documentSections(body.value).find(entry=>String(entry.offset)===sectionSelect.value);
    if(section)focusEditor(section.offset,section.end);
  });
  function moveSelectedSection(direction:'earlier'|'later'){
    if(!active||!allowed()||body.disabled)return;
    const offset=Number(sectionSelect.value);
    if(!sectionSelect.value||!Number.isSafeInteger(offset))return;
    try{
      const result=moveDocumentSection(body.value,offset,direction);
      body.value=result.value;
      body.dispatchEvent(new Event('input',{bubbles:true}));
      sectionSelect.value=String(result.offset);
      enable();focusEditor(result.offset,result.offset);
      message('Section moved '+direction+'. Autosave pending; original revisions are preserved.');
    }catch(error){message(error instanceof Error?error.message:'Section cannot be moved.');}
  }
  sectionUp.addEventListener('click',()=>moveSelectedSection('earlier'));
  sectionDown.addEventListener('click',()=>moveSelectedSection('later'));


  citationRestoreCancel.addEventListener('click',()=>{clearCitationRecovery();enable();});
  citationRestoreConfirm.addEventListener('click',()=>{
    const plan=citationRecoveryPlan,current=active,opened=store;
    if(!plan||!current||!opened||!allowed()||blocked||busy||dirty||body.disabled||
      citationRestoreConfirm.disabled)return;
    const {snapshot,result,baselineBody}=plan;
    const historical=current.history.find(row=>row.revision===snapshot.baselineRevision);
    if(snapshot!==citationAuditSnapshot||snapshot.scope!==opened.scope||
      snapshot.documentId!==current.id||snapshot.revision!==current.revision||
      snapshot.body!==body.value||!historical||historical.body!==baselineBody){
      clearCitationAudit();enable();
      message('Original source or history changed. Compare citations again.');return;
    }
    try{
      const verified=previewOfficeCitationRecovery(historical.body,body.value,result.id);
      if(verified.value!==result.value||verified.previousText!==result.previousText||
        verified.historicalText!==result.historicalText){
        clearCitationAudit();enable();
        message('Citation recovery preview is stale. Compare citations again.');return;
      }
      body.value=verified.value;
      body.dispatchEvent(new Event('input',{bubbles:true}));
      focusEditor(verified.start,verified.end);
      message('Recovered original [^'+verified.id+'] definition from revision '+
        historical.revision+'. Autosave pending; unrelated source preserved.');
      enable();
    }catch(error){
      clearCitationRecovery();enable();
      message(error instanceof Error?error.message:'Original citation recovery refused.');
    }
  });




  function renderIssueHistory(){
    issueHistoryRows.replaceChildren();
    const state=issueHistoryState;
    if(!issueHistoryValid(state)||!state){clearIssueHistory();enable();return;}
    const visible=state.report.rows.filter(row=>
      issueHistoryFilter.value==='all'||
      (issueHistoryFilter.value==='resolved'?row.current===null:row.current!==null));
    issueHistorySummary.textContent=state.report.unresolved+' unresolved · '+
      state.report.resolved+' resolved across '+state.report.retainedCount+
      ' retained/current revisions ('+state.report.firstRevision+'–'+state.report.currentRevision+
      '). Earlier history may no longer be retained.';
    if(!visible.length){
      const empty=document.createElement('p');
      empty.textContent='No '+(issueHistoryFilter.value==='resolved'?'resolved':issueHistoryFilter.value==='all'?'':'unresolved')+
        ' reference problems in these source revisions.';
      issueHistoryRows.append(empty);enable();return;
    }
    for(const item of visible){
      const row=document.createElement('article');row.className='office-issue-history-row';
      row.dataset.officeIssueHistoryKind=item.kind;row.dataset.officeIssueHistoryId=item.id;
      const title=document.createElement('strong');
      title.textContent=item.kind+' · '+item.id+' · '+item.status;
      const detail=document.createElement('p');
      detail.textContent='Observed in retained revisions '+item.observed.map(x=>String(x.revision)).join(', ')+
        ' · first observed '+item.firstObserved+' · last observed '+item.lastObserved;
      row.append(title,detail);
      const actions=document.createElement('div');actions.className='office-citation-actions';
      if(item.current){
        const current=document.createElement('button');current.type='button';
        current.dataset.officeIssueHistoryCurrent=item.id;
        current.textContent='Go to current line '+item.current.line;
        current.addEventListener('click',()=>{
          if(!issueHistoryValid(state)||issueHistoryState!==state){clearIssueHistory();enable();return;}
          const found=analyzeOfficeReferences(body.value).problems.find(x=>
            x.kind===item.kind&&x.id===item.id&&x.offset===item.current?.offset);
          if(!found){clearIssueHistory();enable();return;}
          focusEditor(found.offset,found.offset);
          message('Focused '+item.kind+' in original source, line '+found.line+'.');
        });
        actions.append(current);
      }
      for(const recorded of item.observed.filter(x=>x.revision!==state.revision)){
        const inspect=document.createElement('button');inspect.type='button';
        inspect.dataset.officeIssueHistoryRevision=String(recorded.revision);
        inspect.textContent='Revision '+recorded.revision+' · line '+recorded.line+
          (recorded.count>1?' · '+recorded.count+' occurrences':'');
        inspect.addEventListener('click',()=>{
          if(!issueHistoryValid(state)||issueHistoryState!==state){clearIssueHistory();enable();return;}
          const original=active?.history.find(x=>x.revision===recorded.revision);
          if(!original||original.body!==state.revisions.find(x=>x.revision===recorded.revision)?.body){
            clearIssueHistory();enable();return;
          }
          inspectTimeline(recorded.revision);
          timelinePreview.scrollIntoView({block:'nearest'});
        });
        actions.append(inspect);
      }
      row.append(actions);issueHistoryRows.append(row);
    }
    enable();
  }


  function renderCitationImpactDetail(){
    impactDetail.replaceChildren();
    impactCurrentUse.replaceChildren(new Option('Choose current use',''));
    const state=citationImpactState;
    if(!citationImpactValid(state)||!state){clearCitationImpact();enable();return;}
    const item=state.report.entries.find(row=>row.id===impactCitation.value);
    if(!item){enable();return;}
    const description=document.createElement('p');
    description.textContent='[^'+item.id+'] · '+item.currentUses.length+' current uses'+
      (state.report.compared?' · '+item.historicalUses.length+' previous uses'+
        ' · '+item.addedUses.length+' added/changed passages'+
        ' · '+item.removedUses.length+' removed/changed passages':'')+
      ' · '+(item.currentProblems.join(', ')||'no local reference problems');
    impactDetail.append(description);
    const current=document.createElement('p');
    current.textContent='Current definition: '+
      (item.currentDefinition?item.currentDefinition.content.slice(0,240):'Missing')+
      (item.currentDefinition&&item.currentDefinition.content.length>240?'…':'');
    impactDetail.append(current);
    for(const site of item.currentUses)
      impactCurrentUse.add(new Option('Line '+site.line+' · '+site.excerpt.slice(0,110),String(site.offset)));
    if(state.report.compared){
      const prior=document.createElement('p');
      prior.textContent='Historical definition: '+
        (item.historicalDefinition?item.historicalDefinition.content.slice(0,240):'Missing')+
        (item.definitionChanged?' · definition changed':'');
      impactDetail.append(prior);
      for(const [label,uses] of [
        ['Added or changed use passages',item.addedUses],
        ['Removed or changed use passages',item.removedUses]
      ] as const){
        const heading=document.createElement('strong');
        heading.textContent=label+' · '+uses.length;
        impactDetail.append(heading);
        for(const site of uses.slice(0,12)){
          const p=document.createElement('p');
          p.textContent='Line '+site.line+' · '+site.excerpt;
          impactDetail.append(p);
        }
        if(uses.length>12){
          const remaining=document.createElement('p');
          remaining.textContent=(uses.length-12)+' more use passages in the complete text audit.';
          impactDetail.append(remaining);
        }
      }
    }
    enable();
  }
  impactBase.addEventListener('change',()=>{clearCitationImpact();enable();});
  impactCitation.addEventListener('change',renderCitationImpactDetail);
  impactCurrentUse.addEventListener('change',enable);
  impactReview.addEventListener('click',()=>{
    if(!active||!store||busy||blocked||dirty||body.disabled||!allowed())return;
    const historical=active.history.find(row=>String(row.revision)===impactBase.value);
    if(impactBase.value&&!historical){clearCitationImpact();enable();message('Retained revision is no longer available.');return;}
    clearCitationImpact();
    try{
      const report=inspectOfficeCitationUseImpact(body.value,historical?.body);
      citationImpactState={scope:store.scope,documentId:active.id,revision:active.revision,
        source:body.value,baselineRevision:historical?.revision??null,
        baselineBody:historical?.body??null,report};
      impactSummary.textContent=report.entries.length+' original footnotes · '+report.currentCount+
        ' current uses'+(report.compared?' · '+report.historicalCount+
          ' historical uses · '+report.changed+' affected IDs':'')+'.';
      for(const row of report.entries){
        impactCitation.add(new Option('[^'+row.id+'] · '+row.currentUses.length+' uses',row.id));
      }
      if(report.entries.length)impactCitation.value=report.entries[0]!.id;
      renderCitationImpactDetail();
    }catch(error){
      clearCitationImpact();enable();
      message(error instanceof Error?error.message:'Cannot inspect original citation uses.');
    }
  });
  impactJump.addEventListener('click',()=>{
    const state=citationImpactState;
    if(!citationImpactValid(state)||!state||impactJump.disabled)return;
    const row=state.report.entries.find(x=>x.id===impactCitation.value);
    const site=row?.currentUses.find(x=>String(x.offset)===impactCurrentUse.value);
    if(!site)return;
    const current=analyzeOfficeReferences(body.value).references.find(ref=>
      ref.kind==='footnote'&&ref.id===row?.id&&ref.offset===site.offset);
    if(!current){clearCitationImpact();enable();return;}
    focusEditor(current.offset,current.offset+('[^'+current.id+']').length);
    message('Focused original citation [^'+current.id+'] on line '+current.line+'.');
  });
  impactHistory.addEventListener('click',()=>{
    const state=citationImpactState;
    if(!citationImpactValid(state)||!state||impactHistory.disabled||state.baselineRevision===null)return;
    inspectTimeline(state.baselineRevision);
    timelinePreview.scrollIntoView({block:'nearest'});
  });
  impactDownload.addEventListener('click',()=>void (async()=>{
    const state=citationImpactState,current=active,opened=store,ticket=epoch;
    if(!citationImpactValid(state)||!state||impactDownload.disabled||!current||!opened)return;
    try{
      const latest=await opened.read(current.id);
      if(ticket!==epoch||!allowed()||opened!==store||
        !citationImpactValid(state)||citationImpactState!==state)return;
      if(!latest||latest.revision!==state.revision||latest.body!==state.source){
        clearCitationImpact();enable();
        message('Document changed in another tab. Reopen its latest revision before exporting source uses.');
        return;
      }
      const checked=inspectOfficeCitationUseImpact(state.source,state.baselineBody??undefined);
      const content=formatOfficeCitationUseAudit(checked,current.title,current.revision,state.baselineRevision);
      const filename=documentFilename(current.title).replace(/\.md$/,'-citation-impact.txt');
      if(ticket!==epoch||!allowed()||!citationImpactValid(state))return;
      downloadBlob(new Blob([content],{type:'text/plain;charset=utf-8'}),filename);
      message('Source citation use audit exported for saved revision '+current.revision+'.');
    }catch(error){
      if(ticket===epoch&&allowed())message(error instanceof Error?error.message:'Cannot export original citation audit.');
    }
  })());

  function renderDuplicateCandidates(){
    duplicateCandidates.replaceChildren();clearDuplicatePreview();
    const state=duplicateReviewState;
    if(!duplicateReviewValid(state)||!state){clearDuplicateTriage();enable();return;}
    const group=state.groups.find(row=>row.id===duplicateGroup.value);
    if(!group){state.selectedId='';state.keepOffset=null;duplicateStatus.textContent='Choose a duplicate ID.';enable();return;}
    if(state.selectedId!==group.id){state.selectedId=group.id;state.keepOffset=null;}
    duplicateStatus.textContent='[^'+group.id+'] · '+group.definitions.length+
      ' original definitions · '+group.uses+' citation uses.';
    for(const candidate of group.definitions){
      const row=document.createElement('div');row.className='office-duplicate-choice';
      const label=document.createElement('label');
      const radio=document.createElement('input');radio.type='radio';
      radio.name='office-duplicate-preserved-definition';
      radio.value=String(candidate.offset);
      radio.dataset.officeDuplicateOption=String(candidate.offset);
      radio.setAttribute('aria-label','Keep definition on line '+candidate.line);
      radio.checked=state.keepOffset===candidate.offset;
      radio.addEventListener('change',()=>{
        if(!duplicateReviewValid(state)||state!==duplicateReviewState){
          clearDuplicateTriage();enable();return;
        }
        state.keepOffset=candidate.offset;clearDuplicatePreview();enable();
      });
      const description=document.createElement('span');
      description.textContent='Line '+candidate.line+' · offset '+candidate.offset+
        ' · '+candidate.rawLine.slice(0,240)+(candidate.rawLine.length>240?'…':'');
      label.append(radio,description);
      const jump=document.createElement('button');jump.type='button';
      jump.dataset.officeDuplicateJump=String(candidate.offset);
      jump.textContent='View original';
      jump.addEventListener('click',()=>{
        if(!duplicateReviewValid(state)||state!==duplicateReviewState){
          clearDuplicateTriage();enable();return;
        }
        focusEditor(candidate.offset,candidate.offset+candidate.rawLine.length);
      });
      row.append(label,jump);duplicateCandidates.append(row);
    }
    enable();
  }
  duplicateReview.addEventListener('click',()=>{
    if(!active||!store||!allowed()||busy||blocked||dirty||body.disabled)return;
    clearDuplicateTriage();
    const found=inspectOfficeDuplicateFootnotes(body.value);
    if(found.limited){message('Duplicate inspection exceeds the original source limits.');return;}
    if(!found.groups.length){message('No genuine duplicate definition groups in current source.');return;}
    duplicateReviewState={scope:store.scope,documentId:active.id,
      revision:active.revision,source:body.value,groups:found.groups,
      selectedId:'',keepOffset:null};
    for(const group of found.groups)
      duplicateGroup.add(new Option('[^'+group.id+'] · '+group.definitions.length+' definitions',group.id));
    duplicateGroup.value=found.groups[0]!.id;
    duplicatePanel.hidden=false;renderDuplicateCandidates();
  });
  duplicateGroup.addEventListener('change',renderDuplicateCandidates);
  duplicateCancel.addEventListener('click',()=>{clearDuplicatePreview();enable();});
  duplicatePreview.addEventListener('click',()=>{
    const state=duplicateReviewState;
    if(!state||!duplicateReviewValid(state)||state.keepOffset===null||duplicatePreview.disabled)return;
    try{
      const result=previewOfficeDuplicateResolution(body.value,state.selectedId,state.keepOffset);
      duplicatePlan={review:state,result};
      duplicateResultSummary.textContent='Keep [^'+result.id+'] on original line '+result.kept.line+
        ' · remove '+result.removed.length+' competing definition'+
        (result.removed.length===1?'':'s')+' · preserve '+result.usesPreserved+
        ' citation use'+(result.usesPreserved===1?'':'s')+'. No source changed yet.';
      duplicateResult.value=result.value;duplicateRemoved.replaceChildren();
      for(const removed of result.removed){
        const detail=document.createElement('p');
        detail.textContent='Remove line '+removed.line+' · offset '+removed.offset+' · '+removed.rawLine;
        duplicateRemoved.append(detail);
      }
      duplicateResultPanel.hidden=false;enable();
      duplicateResultPanel.scrollIntoView({block:'nearest'});
    }catch(error){
      clearDuplicatePreview();enable();
      message(error instanceof Error?error.message:'Duplicate resolution preview refused.');
    }
  });
  duplicateConfirm.addEventListener('click',()=>{
    const plan=duplicatePlan,state=plan?.review;
    if(!plan||!state||!duplicateReviewValid(state)||state!==duplicateReviewState||
      duplicateConfirm.disabled||state.selectedId!==plan.result.id||
      state.keepOffset!==plan.result.kept.offset){
      clearDuplicatePreview();enable();return;
    }
    try{
      const verified=previewOfficeDuplicateResolution(body.value,state.selectedId,state.keepOffset);
      if(verified.value!==plan.result.value||verified.removed.length!==plan.result.removed.length||
        verified.removed.some((row,i)=>row.offset!==plan.result.removed[i]?.offset||
          row.rawLine!==plan.result.removed[i]?.rawLine)){
        clearDuplicatePreview();enable();
        message('Original duplicate source changed. Review and preview again.');return;
      }
      body.value=verified.value;
      body.dispatchEvent(new Event('input',{bubbles:true}));
      focusEditor(verified.start,verified.end);
      message('Kept original [^'+verified.id+'] definition from line '+verified.kept.line+
        ' and removed '+verified.removed.length+' competing definition(s). Autosave pending.');
      enable();
    }catch(error){
      clearDuplicatePreview();enable();
      message(error instanceof Error?error.message:'Duplicate resolution refused.');
    }
  });

  issueHistoryReview.addEventListener('click',()=>{
    if(!active||!store||!allowed()||busy||blocked||dirty||body.disabled)return;
    clearIssueHistory();
    const sources=[...active.history.map(row=>({revision:row.revision,body:row.body})),
      {revision:active.revision,body:body.value}];
    try{
      const report=traceOfficeReferenceIssues(sources);
      issueHistoryState={scope:store.scope,documentId:active.id,
        revision:active.revision,source:body.value,revisions:sources,report};
      renderIssueHistory();
    }catch(error){
      clearIssueHistory();enable();
      message(error instanceof Error?error.message:'Original reference issue history is unavailable.');
    }
  });
  issueHistoryFilter.addEventListener('change',renderIssueHistory);

  citationMergeBase.addEventListener('change',()=>{clearCitationMerge();enable();});
  citationMergeIncoming.addEventListener('change',()=>{clearCitationMerge();enable();});
  citationMergeCancel.addEventListener('click',()=>{clearCitationMergePreview();enable();});
  citationMergeReviewButton.addEventListener('click',()=>{
    if(!active||!store||!allowed()||busy||blocked||dirty||citationMergeReviewButton.disabled)return;
    const base=active.history.find(row=>String(row.revision)===citationMergeBase.value);
    const incoming=active.history.find(row=>String(row.revision)===citationMergeIncoming.value);
    if(!base||!incoming||base.revision>=incoming.revision||incoming.revision>=active.revision)return;
    clearCitationMerge();
    try{
      const audit=reviewOfficeCitationThreeWay(base.body,incoming.body,body.value);
      const state:CitationMergeReviewState={
        scope:store.scope,documentId:active.id,currentRevision:active.revision,
        currentBody:body.value,baseRevision:base.revision,baseBody:base.body,
        incomingRevision:incoming.revision,incomingBody:incoming.body,
        audit,decisions:{}
      };
      citationMergeReviewState=state;
      citationMergeSummary.textContent='Baseline revision '+base.revision+
        ' · proposed revision '+incoming.revision+' · current revision '+active.revision+
        ' · '+audit.conflicts+' conflicts · '+audit.safe+' proposed-only · '+
        audit.alreadyApplied+' already present · '+audit.blocked+' blocked.';
      for(const row of audit.rows){
        const container=document.createElement('div');
        container.className='office-citation-audit-row';
        container.dataset.officeCitationMergeId=row.id;
        const heading=document.createElement('strong');
        heading.textContent='[^'+row.id+'] · '+row.status;
        const original=document.createElement('p');
        original.textContent='Baseline: '+(row.base??'No unique definition');
        const proposed=document.createElement('p');
        proposed.textContent='Proposed: '+(row.proposed??'No unique definition');
        const current=document.createElement('p');
        current.textContent='Current: '+(row.current??'No unique definition');
        const reason=document.createElement('p');reason.textContent=row.reason;
        container.append(heading,original,proposed,current,reason);
        if(row.status==='safe'||row.status==='conflict'){
          const label=document.createElement('label');
          label.textContent='Resolution for [^'+row.id+']';
          const select=document.createElement('select');
          select.dataset.officeCitationMergeDecision=row.id;
          select.setAttribute('aria-label','Resolution for citation '+row.id);
          select.add(new Option('Choose resolution',''));
          select.add(new Option('Keep current definition','keep-current'));
          select.add(new Option('Use proposed revision '+incoming.revision,'use-proposed'));
          select.addEventListener('change',()=>{
            if(!citationMergeValid(state)||citationMergeReviewState!==state){
              clearCitationMerge();enable();return;
            }
            if(select.value==='keep-current'||select.value==='use-proposed')
              state.decisions[row.id]=select.value;
            else delete state.decisions[row.id];
            clearCitationMergePreview();enable();
          });
          label.append(select);container.append(label);
        }
        citationMergeRows.append(container);
      }
      if(!audit.rows.length){
        const empty=document.createElement('p');
        empty.textContent='No original citation definitions changed between these revisions.';
        citationMergeRows.append(empty);
      }
      enable();
    }catch(error){
      clearCitationMerge();enable();
      message(error instanceof Error?error.message:'Citation comparison is unavailable.');
    }
  });
  citationMergePreviewButton.addEventListener('click',()=>{
    const state=citationMergeReviewState;
    if(!citationMergeValid(state)||!state||citationMergePreviewButton.disabled)return;
    try{
      const result=previewOfficeCitationThreeWay(state.baseBody,state.incomingBody,
        state.currentBody,state.decisions);
      citationMergePlan={review:state,decisions:citationMergeSelections(state),result};
      citationMergePreviewSummary.textContent='Baseline '+state.baseRevision+
        ' → proposed '+state.incomingRevision+' → current '+state.currentRevision+
        ' · '+result.ids.length+' proposed definitions · '+result.kept.length+
        ' current definitions retained · '+result.conflictsResolved+
        ' resolved conflicts · '+result.usesPreserved+' citation uses preserved.';
      citationMergeResult.value=result.value;citationMergePanel.hidden=false;
      enable();citationMergePanel.scrollIntoView({block:'nearest'});
    }catch(error){
      clearCitationMergePreview();enable();
      message(error instanceof Error?error.message:'Cannot preview citation resolutions.');
    }
  });
  citationMergeConfirm.addEventListener('click',()=>{
    const plan=citationMergePlan,state=plan?.review;
    if(!plan||!state||!citationMergeValid(state)||plan.review!==citationMergeReviewState||
      plan.decisions!==citationMergeSelections(state)||citationMergeConfirm.disabled)return;
    try{
      const verified=previewOfficeCitationThreeWay(state.baseBody,state.incomingBody,
        body.value,state.decisions);
      if(verified.value!==plan.result.value||
         verified.ids.join('|')!==plan.result.ids.join('|')||
         verified.kept.join('|')!==plan.result.kept.join('|')){
        clearCitationMergePreview();enable();
        message('Source or decisions changed. Review the citation resolution again.');return;
      }
      body.value=verified.value;
      body.dispatchEvent(new Event('input',{bubbles:true}));
      const reference=analyzeOfficeReferences(body.value).definitions.find(row=>row.id===verified.ids[0]);
      if(reference)focusEditor(reference.offset,reference.offset);
      message('Applied '+verified.ids.length+' proposed definitions with explicit conflict decisions. Autosave pending.');
      enable();
    }catch(error){
      clearCitationMergePreview();enable();
      message(error instanceof Error?error.message:'Citation conflict resolution refused.');
    }
  });

  citationBatchCancel.addEventListener('click',()=>{clearCitationBatchPlan();enable();});
  citationBatchPreview.addEventListener('click',()=>{
    const snapshot=citationAuditSnapshot,current=active,opened=store;
    if(!snapshot||!current||!opened||!allowed()||blocked||busy||dirty||body.disabled)return;
    if(snapshot.scope!==opened.scope||snapshot.documentId!==current.id||
      snapshot.revision!==current.revision||snapshot.body!==body.value){
      clearCitationAudit();enable();message('Source changed. Compare citations again.');return;
    }
    const baseline=current.history.find(row=>row.revision===snapshot.baselineRevision);
    if(!baseline){clearCitationAudit();enable();message('Retained revision is no longer available.');return;}
    try{
      const ids=[...citationBatchSelected];
      const result=previewOfficeCitationReconciliation(baseline.body,body.value,ids);
      citationBatchPlan={snapshot,baselineBody:baseline.body,ids:result.ids,result};
      citationBatchSummary.textContent=result.ids.length+' historical definitions from revision '+
        baseline.revision+' · '+result.usesPreserved+
        ' original citation uses preserved. Selected historical text replaces current text.';
      citationBatchResult.value=result.value;citationBatchPanel.hidden=false;
      enable();citationBatchPanel.scrollIntoView({block:'nearest'});
    }catch(error){
      clearCitationBatchPlan();enable();
      message(error instanceof Error?error.message:'Cannot reconcile selected historical citations.');
    }
  });
  citationBatchConfirm.addEventListener('click',()=>{
    const plan=citationBatchPlan,current=active,opened=store;
    if(!plan||!current||!opened||!allowed()||blocked||busy||dirty||body.disabled||
       citationBatchConfirm.disabled)return;
    const {snapshot,result,baselineBody,ids}=plan;
    const baseline=current.history.find(row=>row.revision===snapshot.baselineRevision);
    if(snapshot!==citationAuditSnapshot||snapshot.scope!==opened.scope||
       snapshot.documentId!==current.id||snapshot.revision!==current.revision||
       snapshot.body!==body.value||!baseline||baseline.body!==baselineBody||
       ids.length!==citationBatchSelected.size||ids.some(id=>!citationBatchSelected.has(id))){
      clearCitationAudit();enable();message('Reconciliation selection or original source changed. Compare again.');return;
    }
    try{
      const verified=previewOfficeCitationReconciliation(baseline.body,body.value,ids);
      if(verified.value!==result.value||verified.ids.join('|')!==result.ids.join('|')||
         verified.changes.some((edit,i)=>edit.previousText!==result.changes[i]?.previousText||
           edit.historicalText!==result.changes[i]?.historicalText)){
        clearCitationBatchPlan();enable();message('Reconciliation preview is stale. Review the changes again.');return;
      }
      body.value=verified.value;
      body.dispatchEvent(new Event('input',{bubbles:true}));
      const first=analyzeOfficeReferences(body.value).definitions.find(row=>row.id===verified.ids[0]);
      if(first)focusEditor(first.offset,first.offset);
      message('Applied '+verified.ids.length+' selected original citation definitions. Autosave pending.');
      enable();
    }catch(error){
      clearCitationBatchPlan();enable();
      message(error instanceof Error?error.message:'Citation reconciliation refused.');
    }
  });
  citationAuditBase.addEventListener('change',()=>{clearCitationAudit();enable();});
  citationAuditCompare.addEventListener('click',()=>{
    if(!active||!store||!allowed()||blocked||busy||body.disabled)return;
    const baseline=active.history.find(row=>String(row.revision)===citationAuditBase.value);
    if(!baseline)return;
    clearCitationAudit();
    const report=compareOfficeCitationRevisions(baseline.body,body.value);
    if(report.limited){
      citationAuditSummary.textContent='Citation comparison exceeds source reference or identity limits.';
      return;
    }
    const snapshot={scope:store.scope,documentId:active.id,revision:active.revision,
      body:body.value,baselineRevision:baseline.revision};
    citationAuditSnapshot=snapshot;
    citationAuditSummary.textContent='Revision '+baseline.revision+' → '+
      (dirty?'unsaved draft':'revision '+active.revision)+' · '+
      report.changes.length+' changed citations · '+report.unchanged+' unchanged';
    if(!report.changes.length){
      const noChange=document.createElement('p');
      noChange.textContent='No changes to citation definitions, use counts or detected issues.';
      citationAuditChanges.append(noChange);
    }
    for(const item of report.changes){
      const wrapper=document.createElement('div');
      wrapper.className='office-citation-audit-row';
      wrapper.dataset.officeCitationAuditId=item.id;
      const title=document.createElement('strong');
      title.textContent='[^'+item.id+'] · '+item.changes.join(' · ');
      const old=document.createElement('p');
      old.textContent='Historical: '+item.before.useCount+' uses · '+
        (item.before.definitionText===null?'No definition':item.before.definitionText.slice(0,180));
      const now=document.createElement('p');
      now.textContent='Current: '+item.after.useCount+' uses · '+
        (item.after.definitionText===null?'No definition':item.after.definitionText.slice(0,180));
      wrapper.append(title,old,now);
      const actions=document.createElement('div');actions.className='office-citation-actions';
      const currentPosition=item.after.definitionOffset??item.after.firstUseOffset;
      if(currentPosition!==null){
        const open=document.createElement('button');open.type='button';
        open.dataset.officeCitationAuditCurrent=item.id;
        open.textContent=item.after.definitionOffset!==null?'Go to current definition':'Go to current use';
        open.addEventListener('click',()=>{
          if(!citationAuditSnapshot||!active||!store||!allowed()||blocked||busy||body.disabled||
            citationAuditSnapshot!==snapshot||snapshot.scope!==store.scope||
            snapshot.documentId!==active.id||snapshot.revision!==active.revision||snapshot.body!==body.value){
            clearCitationAudit();message('Source changed. Compare citations again.');return;
          }
          focusEditor(currentPosition,currentPosition);
          message('Focused original citation [^'+item.id+'] in the current source.');
        });
        actions.append(open);
      }
      const oldButton=document.createElement('button');oldButton.type='button';
      oldButton.dataset.officeCitationAuditHistory=item.id;
      oldButton.textContent='View retained revision '+baseline.revision;
      oldButton.addEventListener('click',()=>{
        if(!citationAuditSnapshot||!active||!store||!allowed()||blocked||busy||
          citationAuditSnapshot!==snapshot||snapshot.scope!==store.scope||
          snapshot.documentId!==active.id||snapshot.revision!==active.revision||
          snapshot.body!==body.value||
          !active.history.some(row=>row.revision===snapshot.baselineRevision)){
          clearCitationAudit();message('Retained source changed. Compare citations again.');return;
        }
        inspectTimeline(baseline.revision);
        timelinePreview.scrollIntoView({block:'nearest'});
      });
      actions.append(oldButton);

      if(item.before.definitionCount===1&&item.after.definitionCount===1&&
        item.before.definitionText!==null&&item.after.definitionText!==null&&
        item.before.definitionText!==item.after.definitionText){
        const recover=document.createElement('button');recover.type='button';
        recover.dataset.officeCitationAuditRestore=item.id;
        recover.textContent='Preview historical definition';
        recover.addEventListener('click',()=>{
          if(!citationAuditSnapshot||!active||!store||!allowed()||blocked||busy||dirty||body.disabled||
            snapshot!==citationAuditSnapshot||snapshot.scope!==store.scope||
            snapshot.documentId!==active.id||snapshot.revision!==active.revision||
            snapshot.body!==body.value){
            clearCitationRecovery();enable();
            message('Save current changes and compare again before recovering a citation.');return;
          }
          const retained=active.history.find(row=>row.revision===snapshot.baselineRevision);
          if(!retained||retained.body!==baseline.body){
            clearCitationAudit();enable();message('Historical revision changed. Compare citations again.');return;
          }
          try{
            const result=previewOfficeCitationRecovery(retained.body,body.value,item.id);
            citationRecoveryPlan={snapshot,baselineBody:retained.body,result};
            citationRestoreSummary.textContent='[^'+item.id+'] · revision '+retained.revision+
              ' · current: '+result.previousText+' · historical: '+result.historicalText+
              ' · '+result.usesPreserved+' existing citation use(s) preserved. No change saved yet.';
            citationRestoreResult.value=result.value;citationRestorePanel.hidden=false;
            enable();citationRestorePanel.scrollIntoView({block:'nearest'});
          }catch(error){
            clearCitationRecovery();enable();
            message(error instanceof Error?error.message:'Historical citation recovery refused.');
          }
        });
        actions.append(recover);

        const label=document.createElement('label');
        label.className='office-citation-batch-choice';
        const check=document.createElement('input');
        check.type='checkbox';check.dataset.officeCitationBatchId=item.id;
        check.setAttribute('aria-label','Restore historical definition for footnote '+item.id);
        check.addEventListener('change',()=>{
          if(snapshot!==citationAuditSnapshot||!active||!store||!allowed()||blocked||busy||
             snapshot.scope!==store.scope||snapshot.documentId!==active.id||
             snapshot.revision!==active.revision||snapshot.body!==body.value){
            check.checked=false;clearCitationBatchPlan();enable();return;
          }
          if(check.checked&&citationBatchSelected.size>=12){
            check.checked=false;message('Select no more than 12 historical definitions.');
            return;
          }
          if(check.checked)citationBatchSelected.add(item.id);
          else citationBatchSelected.delete(item.id);
          clearCitationBatchPlan();updateCitationBatchSelection();enable();
        });
        label.append(check,document.createTextNode('Include [^'+item.id+'] in reconciliation'));
        wrapper.append(label);
      }
      wrapper.append(actions);
      citationAuditChanges.append(wrapper);
    }
    enable();
  });

  citationSelect.addEventListener('change',()=>{
    citationUsageCursor=0;citationNewId.value='';clearCitationEdit();
    const def=analyzeOfficeReferences(body.value).definitions.find(row=>
      row.id===citationSelect.value&&row.count===1);
    if(def&&active&&store&&allowed()&&!blocked){
      citationEditDraft={scope:store.scope,documentId:active.id,revision:active.revision,
        id:def.id,offset:def.offset,content:def.content,source:body.value};
      citationEdit.value=def.content;
      citationEditStatus.textContent='Editing original [^'+def.id+'] definition.';
    }
    renderCitationWorkbench();enable();
  });
  citationEdit.addEventListener('input',enable);
  citationEditCancel.addEventListener('click',()=>{clearCitationEdit();enable();});
  citationEditApply.addEventListener('click',()=>{
    const draft=citationEditDraft,current=active,opened=store;
    if(!draft||!current||!opened||!allowed()||busy||blocked||body.disabled)return;
    if(draft.scope!==opened.scope||draft.documentId!==current.id||
        draft.revision!==current.revision||draft.source!==body.value){
      citationEditStatus.textContent='Source changed. Select the citation again before applying.';
      enable();return;
    }
    try{
      const result=updateOfficeFootnoteDefinition(body.value,draft.id,draft.content,citationEdit.value,draft.offset);
      clearCitationEdit();
      body.value=result.value;body.dispatchEvent(new Event('input',{bubbles:true}));
      focusEditor(result.start,result.end);
      message('Updated original [^'+result.id+'] definition. Autosave pending; saved versions remain recoverable.');
      enable();
    }catch(error){message(error instanceof Error?error.message:'Citation definition edit refused.');}
  });
  citationNewId.addEventListener('input',enable);
  function currentCitation(){
    if(!active||!allowed()||body.disabled||blocked||busy||!citationSelect.value)return null;
    return officeCitationInventory(body.value).entries.find(row=>row.id===citationSelect.value)??null;
  }
  citationDefinition.addEventListener('click',()=>{
    const current=currentCitation();if(!current)return;
    focusEditor(current.definitionOffset,current.definitionOffset);
    message('Opened original citation definition [^'+current.id+'] on line '+current.definitionLine+'.');
  });
  citationUsage.addEventListener('click',()=>{
    const current=currentCitation();if(!current?.uses.length)return;
    const index=citationUsageCursor%current.uses.length,ref=current.uses[index]!;
    citationUsageCursor=(index+1)%current.uses.length;
    focusEditor(ref.offset,ref.offset+('[^'+current.id+']').length);
    message('Citation [^'+current.id+'] · use '+(index+1)+' of '+current.uses.length+'.');
  });
  citationInsert.addEventListener('click',()=>{
    const current=currentCitation();if(!current)return;
    try{
      const result=insertExistingOfficeCitation(body.value,body.selectionStart,body.selectionEnd,current.id);
      body.value=result.value;body.dispatchEvent(new Event('input',{bubbles:true}));
      focusEditor(result.start,result.end);
      message('Reused original citation [^'+result.id+']; autosave pending.');
    }catch(error){message(error instanceof Error?error.message:'Citation reuse refused.');}
  });
  citationRename.addEventListener('click',()=>{
    const current=currentCitation();if(!current)return;
    try{
      const result=renameOfficeCitation(body.value,current.id,citationNewId.value);
      body.value=result.value;body.dispatchEvent(new Event('input',{bubbles:true}));
      citationSelect.value=result.id;citationNewId.value='';citationUsageCursor=0;
      clearCitationEdit();
      renderCitationWorkbench();enable();focusEditor(result.start,result.end);
      message('Renamed original citation to [^'+result.id+'] across '+result.referenceCount+
        ' use(s) and one definition. Autosave pending; earlier revisions retained.');
    }catch(error){message(error instanceof Error?error.message:'Citation rename refused.');}
  });
  footnoteText.addEventListener('input',enable);
  footnoteInsert.addEventListener('click',()=>{
    if(!active||body.disabled||!allowed()||busy||blocked)return;
    try{
      const result=insertOfficeFootnote(body.value,body.selectionStart,body.selectionEnd,footnoteText.value,footnoteId.value);
      body.value=result.value;
      body.dispatchEvent(new Event('input',{bubbles:true}));
      footnoteId.value='';footnoteText.value='';
      focusEditor(result.start,result.end);
      message('Footnote '+result.id+' inserted into original Markdown. Autosave pending.');
      enable();
    }catch(error){message(error instanceof Error?error.message:'Footnote insertion refused.');}
  });
  referenceTarget.addEventListener('change',enable);
  tocCancel.addEventListener('click',()=>{discardContents();enable();});
  tocReviewButton.addEventListener('click',()=>{
    if(!active||!store||!allowed()||busy||blocked||dirty)return;
    try{
      const change=generateOfficeToc(body.value);
      contentsPlan={scope:store.scope,id:active.id,revision:active.revision,
        title:title.value,body:body.value,result:change.value,mode:change.mode,headings:change.headings};
      tocSource.value=change.value;
      tocSummary.textContent=(change.mode==='update'?'Refresh existing':'Insert new')+
        ' navigable contents with '+change.headings+' original headings · '+
        change.value.length+' characters. Nothing saved yet.';
      tocPanel.hidden=false;enable();
    }catch(error){discardContents();message(error instanceof Error?error.message:'Cannot generate contents.');enable();}
  });
  tocConfirm.addEventListener('click',()=>void (async()=>{
    const plan=contentsPlan,opened=store,current=active,ticket=epoch;
    if(!plan||!opened||!current||!allowed()||busy||blocked||dirty||tocConfirm.disabled||
      plan.scope!==opened.scope||plan.id!==current.id||plan.revision!==current.revision||
      plan.body!==body.value||plan.title!==title.value)return;
    if(!confirm((plan.mode==='update'?'Refresh existing':'Insert new')+
      ' table of contents in one new saved Office revision? Original history is retained.'))return;
    if(ticket!==epoch||opened!==store||current!==active||plan!==contentsPlan||
      !allowed()||busy||blocked||dirty)return;
    busy=true;enable();
    try{
      const saved=await opened.save(current,plan.title,plan.result);
      if(ticket!==epoch||opened!==store||!allowed())return;
      active=saved;title.value=saved.title;body.value=saved.body;dirty=false;
      discardContents();discardStructure();clearComparison();
      renderPreview();renderOutline();renderFind();renderHistory();
      await refreshList();
      if(ticket!==epoch||opened!==store||!allowed())return;
      message('Contents '+(plan.mode==='update'?'refreshed':'inserted')+' · saved Office revision '+saved.revision+'.');
    }catch(error){
      if(ticket===epoch&&opened===store){
        blocked=true;discardContents();
        message((error instanceof Error?error.message:'Contents save failed')+
          ' Source was not replaced. Export original text before reloading.');
      }
    }finally{if(ticket===epoch){busy=false;enable();}}
  })());
  referenceInsert.addEventListener('click',()=>{
    if(!active||!allowed()||body.disabled||busy||blocked||!referenceTarget.value)return;
    try{
      const result=insertOfficeHeadingLink(body.value,body.selectionStart,body.selectionEnd,referenceTarget.value);
      body.value=result.value;body.dispatchEvent(new Event('input',{bubbles:true}));
      focusEditor(result.start,result.end);
      message('Internal heading reference inserted in the original editor. Autosave pending.');
    }catch(error){message(error instanceof Error?error.message:'Reference insertion refused.');}
  });
  preview.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const back=target.closest<HTMLButtonElement>('button[data-office-footnote-backref]');
    if(back&&preview.contains(back)){
      if(!active||!allowed()||body.disabled)return;
      const refs=analyzeOfficeReferences(body.value).references.filter(row=>
        row.kind==='footnote'&&row.id===back.dataset.officeFootnoteBackref);
      const first=refs[0];
      if(first){
        citationSelect.value=first.id;
        renderCitationWorkbench();enable();
        focusEditor(first.offset,first.offset+('[^'+first.id+']').length);
        message('Returned to original citation [^'+first.id+'] on line '+first.line+'.');
      }
      return;
    }
    const footnote=target.closest<HTMLAnchorElement>('a[data-office-footnote-id]');
    if(footnote&&preview.contains(footnote)){
      event.preventDefault();
      if(!active||!allowed()||body.disabled)return;
      const report=analyzeOfficeReferences(body.value);
      const definition=report.definitions.find(row=>row.id===footnote.dataset.officeFootnoteId&&row.count===1);
      if(definition){focusEditor(definition.offset,definition.offset);message('Opened footnote '+definition.id+' in original source.');}
      return;
    }
    const link=target.closest<HTMLAnchorElement>('a[data-office-internal-ref]');
    if(!link||!preview.contains(link))return;
    event.preventDefault();
    if(!active||!allowed()||body.disabled)return;
    const heading=officeHeadingReferences(body.value).find(item=>item.id===link.dataset.officeInternalRef);
    if(!heading){message('That original heading is no longer available. Refresh contents.');return;}
    focusEditor(heading.offset,heading.offset);
    message('Opened internal reference: '+heading.title);
  });
  writingBlock.addEventListener('change',()=>enable());
  writingGo.addEventListener('click',()=>{
    if(!active||body.disabled||!allowed())return;
    try{
      const offset=sourcePositionAtLine(body.value,Number(writingLine.value));
      focusEditor(offset,offset);
      message('Focused line '+writingLine.value+' in the original Markdown editor.');
    }catch(error){message(error instanceof Error?error.message:'Line navigation unavailable.');}
  });
  writingInsert.addEventListener('click',()=>{
    if(!active||body.disabled||blocked||busy||!allowed())return;
    try{
      const result=insertAuthoringBlock(body.value,body.selectionStart,body.selectionEnd,
        writingBlock.value as AuthoringBlock,Number(writingRows.value),Number(writingColumns.value),writingLanguage.value);
      body.value=result.value;focusEditor(result.start,result.end);
      body.dispatchEvent(new Event('input',{bubbles:true}));
      message('Markdown block inserted into the original document. Autosave pending.');
    }catch(error){message(error instanceof Error?error.message:'Block not inserted. Original source unchanged.');}
  });
  for(const button of formatButtons)button.addEventListener('click',()=>{
    if(button.disabled||!active||!allowed())return;
    const action=button.dataset.officeFormat as FormatAction;
    const result=formatSelection(body.value,body.selectionStart,body.selectionEnd,action);
    body.value=result.value;body.focus();body.setSelectionRange(result.start,result.end);
    body.dispatchEvent(new Event('input',{bubbles:true}));
  });
  for(const button of layoutButtons)button.addEventListener('click',()=>{
    const mode=button.dataset.officeMode;
    if(mode!=='write'&&mode!=='split'&&mode!=='preview')return;
    root.dataset.officeMode=mode;
    for(const option of layoutButtons)option.setAttribute('aria-pressed',String(option===button));
    if(mode==='preview')renderPreview();
  });
  body.addEventListener('keydown',event=>{
    if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
    const action=event.key.toLowerCase()==='b'?'bold':event.key.toLowerCase()==='i'?'italic':null;
    if(!action||!active||body.disabled)return;
    event.preventDefault();
    const result=formatSelection(body.value,body.selectionStart,body.selectionEnd,action);
    body.value=result.value;body.setSelectionRange(result.start,result.end);
    body.dispatchEvent(new Event('input',{bubbles:true}));
  });
  function downloadBlob(blob:Blob,filename:string){
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=filename;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function buildPrintSheet(){
    printSheet.replaceChildren();
    if(!allowed()||!active)return;
    const heading=document.createElement('h1');heading.textContent=title.value||active.title;
    const article=document.createElement('article');article.className='office-preview';
    renderMarkdown(body.value,article);
    printSheet.append(heading,article);
  }
  htmlButton.addEventListener('click',()=>{
    if(!active||!allowed())return;
    try{
      const markup=standaloneHtml(title.value||active.title,body.value,document);
      if(!allowed())return;
      downloadBlob(new Blob([markup],{type:'text/html;charset=utf-8'}),documentFilename(title.value||active.title).replace(/\.md$/,'.html'));
      message(dirty?'HTML exported with unsaved edits. Local save is still pending.':'Portable HTML exported with scripts and external resources disabled.');
    }catch(e){message(e instanceof Error?e.message:'HTML export unavailable.');}
  });
  printButton.addEventListener('click',()=>{
    if(!active||!allowed())return;
    buildPrintSheet();window.print();
    message(dirty?'Print uses current unsaved edits. Local save is still pending.':'Print prepared. Select Save as PDF in the browser to export PDF.');
  });
  window.addEventListener('beforeprint',buildPrintSheet);
  window.addEventListener('afterprint',()=>printSheet.replaceChildren());
  download.addEventListener('click',()=>{
    if(!active||!allowed())return;
    downloadBlob(new Blob([body.value],{type:'text/markdown;charset=utf-8'}),documentFilename(title.value||active.title));
    message(dirty?'Exported current unsaved Markdown. Local save is still pending.':'Markdown export prepared.');
  });
  timelineSearch.addEventListener('input',()=>{
    if(!active||!allowed())return;
    timelineChosen=null;timelinePreview.hidden=true;timelineSummary.textContent='';timelineExcerptNode.textContent='';
    timelineTruncated.textContent='';clearVersionPair();renderHistoryMatches();
  });
  timelineCase.addEventListener('change',()=>{
    if(!active||!allowed())return;
    timelineChosen=null;timelinePreview.hidden=true;timelineSummary.textContent='';timelineExcerptNode.textContent='';
    timelineTruncated.textContent='';clearVersionPair();renderHistoryMatches();
  });
  timelineBaselineButton.addEventListener('click',()=>{
    if(!active||!store||!timelineChosen||busy||blocked||!allowed()||timelineBaselineButton.disabled)return;
    timelineBaseline={...timelineChosen};
    timelineBaselineNote.textContent='Comparison baseline: saved revision '+timelineChosen.selectedRevision;
    clearVersionPair();enable();
  });
  timelinePairButton.addEventListener('click',()=>{
    const baseline=timelineBaseline,selected=timelineChosen;
    if(!active||!store||!baseline||!selected||busy||blocked||!allowed()||timelinePairButton.disabled)return;
    if(baseline.scope!==store.scope||baseline.id!==active.id||baseline.currentRevision!==active.revision||
       selected.scope!==store.scope||selected.id!==active.id||selected.currentRevision!==active.revision)return;
    try{
      const result=compareOfficeSavedVersions(active,baseline.selectedRevision,selected.selectedRevision);
      timelinePairSummary.textContent='Saved revisions '+result.leftRevision+' → '+result.rightRevision+
        ' · '+result.totalHunks+' changed group'+(result.totalHunks===1?'':'s')+
        (result.titleChanged?' · title changed':'')+
        (result.summaryOnly?' · large-source summary only':'')+
        (result.truncated?' · limited to first 40 displayed':'');
      timelinePairDiffs.replaceChildren();
      if(result.identicalBodies){
        const same=document.createElement('p');same.textContent='Saved Markdown bodies match exactly.';timelinePairDiffs.append(same);
      }else for(const hunk of result.hunks){
        const section=document.createElement('div');section.className='office-revision-diff';
        const left=document.createElement('pre'),right=document.createElement('pre');
        left.textContent='Revision '+result.leftRevision+' lines '+hunk.historicalFrom+'–'+hunk.historicalTo+'\n'+
          (hunk.historicalSample.join('\n')||'(no historical lines)');
        right.textContent='Revision '+result.rightRevision+' lines '+hunk.currentFrom+'–'+hunk.currentTo+'\n'+
          (hunk.currentSample.join('\n')||'(no saved lines)');
        section.append(left,right);timelinePairDiffs.append(section);
      }
      timelinePairPanel.hidden=false;enable();
    }catch(error){
      clearVersionPair();message(error instanceof Error?error.message:'Saved revision comparison unavailable.');
    }
  });
  timelineClose.addEventListener('click',()=>{
    timelineChosen=null;timelinePreview.hidden=true;
    timelineSummary.textContent='';timelineExcerptNode.textContent='';timelineTruncated.textContent='';
    clearVersionPair();
    for(const item of timelineList.querySelectorAll<HTMLButtonElement>('button[data-office-timeline-revision]'))
      item.setAttribute('aria-pressed','false');
    enable();
  });
  timelineCompare.addEventListener('click',()=>{
    if(!timelineRevision()||!active||!timelineChosen||timelineChosen.selectedRevision===active.revision||compareButton.disabled)return;
    history.value=String(timelineChosen.selectedRevision);
    compareButton.click();
  });
  timelineRestore.addEventListener('click',()=>{
    if(!timelineRevision()||!active||!timelineChosen||timelineChosen.selectedRevision===active.revision||
       dirty||restore.disabled)return;
    history.value=String(timelineChosen.selectedRevision);
    restore.click(); // Existing confirmation and CAS writer remain authoritative.
  });
  history.addEventListener('change',()=>{clearComparison();enable();});
  compareButton.addEventListener('click',()=>{
    if(!active||!store||!allowed()||busy||blocked||!history.value)return;
    const old=active.history.find(item=>String(item.revision)===history.value);
    if(!old)return;
    compared={scope:store.scope,id:active.id,revision:active.revision,historical:old.revision};
    recoverStart.value='1';recoverEnd.value='1';comparePanel.hidden=false;
    renderComparison();
  });
  batchPreview.addEventListener('click',()=>{
    const rev=comparedHistory();
    if(!rev||!store||!active||dirty||busy||blocked||hunkLimited||hunkSummaryOnly||
      !selectedHistoricalHunks.size)return;
    try{
      const indexes=[...selectedHistoricalHunks].sort((a,b)=>a-b);
      const result=previewMultiRevisionRecovery(rev.body,body.value,indexes);
      batchPlan={scope:store.scope,id:active.id,revision:active.revision,historical:rev.revision,
        body:body.value,title:title.value,selected:indexes,value:result.value};
      batchDocument.value=result.value;
      batchSummary.textContent='Preview of '+result.selected+' historical changes · '+
        result.removedCurrentLines+' current lines removed · '+result.restoredHistoricalLines+
        ' historical lines restored · '+result.value.length+' characters. Nothing saved yet.';
      batchResult.hidden=false;enable();
    }catch(error){
      discardBatchPreview();enable();
      message(error instanceof Error?error.message:'Historical changes cannot be combined.');
    }
  });
  batchCancel.addEventListener('click',()=>{
    selectedHistoricalHunks.clear();discardBatchPreview();
    renderBatchChoices();enable();
  });
  batchDismiss.addEventListener('click',()=>{discardBatchPreview();enable();});
  batchConfirm.addEventListener('click',()=>void (async()=>{
    const plan=batchPlan,rev=comparedHistory(),opened=store,current=active,stamp=epoch;
    if(!plan||!rev||!opened||!current||dirty||busy||blocked||!allowed()||
       plan.scope!==opened.scope||plan.id!==current.id||plan.revision!==current.revision||
       plan.historical!==rev.revision||plan.body!==body.value||plan.title!==title.value)return;
    if(!confirm('Restore '+plan.selected.length+' selected historical changes in one new Office revision? The current document will change, but original historical snapshots will remain under the existing retention policy.'))return;
    if(plan!==batchPlan||opened!==store||current!==active||stamp!==epoch||!allowed()||
      blocked||dirty||busy||plan.body!==body.value||plan.title!==title.value)return;
    busy=true;enable();
    try{
      // The original Office writer performs a single atomic CAS. Never write to the UI first.
      const saved=await opened.save(current,plan.title,plan.value);
      if(stamp!==epoch||opened!==store||!allowed())return;
      active=saved;body.value=saved.body;title.value=saved.title;dirty=false;
      clearComparison();renderPreview();renderOutline();renderFind();renderHistory();
      await refreshList();
      if(stamp!==epoch||opened!==store||!allowed())return;
      message('Recovered '+plan.selected.length+' historical changes in one saved revision '+saved.revision+'.');
    }catch(error){
      if(stamp===epoch&&opened===store){
        blocked=true;discardBatchPreview();
        message((error instanceof Error?error.message:'Historical recovery failed')+
          ' Current document was not replaced. Export the current text before reloading.');
      }
    }finally{if(stamp===epoch){busy=false;enable();}}
  })());
  hunkPrevious.addEventListener('click',()=>focusHunk(-1));
  hunkNext.addEventListener('click',()=>focusHunk(1));
  hunkHistorical.addEventListener('click',()=>{
    const hunk=changeHunks[hunkIndex];
    if(!hunk||!comparedHistory()||hunk.removed===0||body.disabled)return;
    recoverStart.value=String(hunk.historicalFrom);
    recoverEnd.value=String(Math.min(hunk.historicalTo,hunk.historicalFrom+199));
    previewRecovery();
    message('Selected original historical lines. Review the exact text before confirming recovery.');
  });
  hunkCurrent.addEventListener('click',()=>{
    const hunk=changeHunks[hunkIndex];
    if(!hunk||!comparedHistory()||body.disabled)return;
    const lines=body.value.split('\n');
    if(hunk.currentFrom<1||hunk.currentFrom>lines.length+1)return;
    let start=0;
    for(let i=0;i<hunk.currentFrom-1;i++)start+=(lines[i]?.length??0)+1;
    let end=start;
    for(let i=hunk.currentFrom-1;i<hunk.currentTo;i++)end+=(lines[i]?.length??0)+(i<hunk.currentTo-1?1:0);
    if(hunk.added===0)end=start;
    body.focus();body.setSelectionRange(start,Math.min(end,body.value.length));
    message('Selected current changed text in the source editor. Review before replacing any content.');
  });
  recoverStart.addEventListener('input',previewRecovery);
  recoverEnd.addEventListener('input',previewRecovery);
  compareClose.addEventListener('click',()=>{clearComparison();enable();});
  function recoverSelected(mode:'insert'|'replace'){
    const rev=comparedHistory();
    if(!rev||body.disabled||busy||blocked||!allowed())return;
    const from=Number(recoverStart.value),to=Number(recoverEnd.value);
    try{
      const excerpt=recoverRevisionLines(rev,from,to);
      const start=body.selectionStart,end=body.selectionEnd;
      const updated=applyRevisionExcerpt(body.value,excerpt,start,end,mode);
      const verb=mode==='insert'?'insert at the current cursor':'replace selected current text';
      if(!confirm('Recover '+(to-from+1)+' lines from revision '+rev.revision+' and '+verb+'? The historical snapshot will stay unchanged, and the edit will use normal CAS autosave.'))return;
      if(!comparedHistory()||body.disabled||busy||blocked)return;
      body.value=updated;
      clearComparison();
      body.setSelectionRange(start+excerpt.length,start+excerpt.length);
      body.dispatchEvent(new Event('input',{bubbles:true}));
      message('Recovered historical lines into the current editor. Autosave pending; original history unchanged.');
    }catch(error){message(error instanceof Error?error.message:'Recovery refused; document unchanged.');}
  }
  recoverInsert.addEventListener('click',()=>recoverSelected('insert'));
  recoverReplace.addEventListener('click',()=>recoverSelected('replace'));
  restore.addEventListener('click',()=>void (async()=>{
    if(!active||!store||blocked||busy||!allowed()||!history.value)return;
    if(dirty){message('Save or export current edits before restoring history.');return;}
    const rev=active.history.find(entry=>String(entry.revision)===history.value);
    if(!rev||!confirm('Restore this older revision? Current content will remain in revision history.'))return;
    title.value=rev.title;body.value=rev.body;renderPreview();renderOutline();renderFind();dirty=true;enable();await persist();
  })());
  window.addEventListener('beforeunload',event=>{if(dirty||heldDraft){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pagehide',()=>{clearTimeout(auto);store?.close();store=null;},{once:true});
  let authority='';
  function authorityChange(){
    const value=shell.dataset.calendarPrivate+'|'+hubIdentity.status+'|'+(hubIdentity.status==='signed-in'?hubIdentity.id:'');
    if(value===authority)return;
    authority=value;
    void start();
  }
  window.addEventListener('hub:identity',authorityChange);
  new MutationObserver(authorityChange).observe(shell,{attributes:true,attributeFilter:['data-calendar-private']});
  authorityChange();
}
