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
  const status=pick<HTMLElement>('[data-office-status]');
  const title=pick<HTMLInputElement>('[data-office-title]');
  const body=pick<HTMLTextAreaElement>('[data-office-body]');
  const history=pick<HTMLSelectElement>('[data-office-history]');
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
  function renderPreview(){renderMarkdown(body.value,preview);}
  let store:OfficeDeviceStore|null=null,active:OfficeDocument|null=null;
  let savedDocuments:OfficeDocument[]=[];
  const selectedBundle=new Set<string>();
  let matches:TextMatch[]=[],findTruncated=false,matchCursor=-1;
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
    history.disabled=restore.disabled=!editing||busy||!active?.history.length;
    compareButton.disabled=!editing||!history.value||!active?.history.some(rev=>String(rev.revision)===history.value);
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
  function clearEditor(){
    clearComparison();active=null;dirty=false;title.value='';body.value='';
    renderPreview();renderOutline();renderFind();printSheet.replaceChildren();
    history.replaceChildren(new Option('History',''));enable();
  }
  function renderOutline(){
    outline.replaceChildren();
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
    history.replaceChildren(new Option('History',''));
    for(const rev of [...(active?.history??[])].reverse())
      history.add(new Option('Revision '+rev.revision+' · '+new Date(rev.updatedAt).toLocaleString(),String(rev.revision)));
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
      clearComparison();active=doc;title.value=doc.title;body.value=doc.body;renderPreview();dirty=false;renderOutline();renderFind();
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
    dirty=true;discardBatchPreview();renderPreview();renderOutline();renderFind();
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
  sectionSelect.addEventListener('change',()=>enable());
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
