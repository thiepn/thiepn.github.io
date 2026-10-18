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
const root=document.querySelector<HTMLElement>('[data-office]')!;
const shell=document.querySelector<HTMLElement>('[data-workspace]')!;
if(root && shell){
  const pick=<T extends HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const list=pick<HTMLElement>('[data-office-list]');
  const search=pick<HTMLInputElement>('[data-office-search]');
  const sort=pick<HTMLSelectElement>('[data-office-sort]');
  const count=pick<HTMLElement>('[data-office-count]');
  const backup=pick<HTMLButtonElement>('[data-office-backup]');
  const outline=pick<HTMLElement>('[data-office-outline]');
  const outlineEmpty=pick<HTMLElement>('[data-office-outline-empty]');
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
  const importFile=pick<HTMLInputElement>('[data-office-import-file]');
  const importPanel=pick<HTMLElement>('[data-office-import-panel]');
  const importTitle=pick<HTMLInputElement>('[data-office-import-title]');
  const importInfo=pick<HTMLElement>('[data-office-import-info]');
  const importRender=pick<HTMLElement>('[data-office-import-render]');
  const importConfirm=pick<HTMLButtonElement>('[data-office-import-confirm]');
  const importCancel=pick<HTMLButtonElement>('[data-office-import-cancel]');
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
  let epoch=0,dirty=false,busy=false,blocked=false,auto:ReturnType<typeof setTimeout>|undefined;
  // In-memory recovery across Hub privacy/identity rechecks; never written to another owner scope.
  let heldDraft:{scope:string;id:string;revision:number;title:string;body:string}|null=null;
  let importNonce=0,pendingImport:({scope:string}&MarkdownImport)|null=null;
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
    const editing=!!store && !!active && !blocked && allowed();
    title.disabled=body.disabled=!editing;
    // A concurrent-edit conflict must never prevent exporting the unsaved text.
    download.disabled=htmlButton.disabled=printButton.disabled=!active||!allowed();
    save.disabled=!editing||busy;
    history.disabled=restore.disabled=!editing||busy||!active?.history.length;
    add.disabled=!store||blocked||!allowed()||busy;
    templatePicker.disabled=!store||blocked||!allowed()||busy;
    importFile.disabled=!store||blocked||!allowed()||busy;
    importTitle.disabled=importConfirm.disabled=!pendingImport||!store||blocked||!allowed()||busy;
    importCancel.disabled=!pendingImport||busy;
    restoreFile.disabled=!store||blocked||!allowed()||busy;
    restoreConfirm.disabled=!pendingRestore||!restoreNew||!store||blocked||!allowed()||busy;
    restoreCancel.disabled=!pendingRestore||busy;
    search.disabled=sort.disabled=backup.disabled=!store||!allowed()||busy;
    for(const button of formatButtons)button.disabled=!editing||busy;
  };
  function clearEditor(){
    title.value='';body.value='';renderPreview();renderOutline();printSheet.replaceChildren();
    history.replaceChildren(new Option('History',''));active=null;dirty=false;enable();
  }
  function renderOutline(){
    outline.replaceChildren();
    if(!active||!allowed()){outlineEmpty.hidden=false;return;}
    const headings=outlineFor(body.value);
    outlineEmpty.hidden=headings.length>0;
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
  function renderHistory(){
    history.replaceChildren(new Option('History',''));
    for(const rev of [...(active?.history??[])].reverse())
      history.add(new Option('Revision '+rev.revision+' · '+new Date(rev.updatedAt).toLocaleString(),String(rev.revision)));
  }
  function renderList(){
    list.replaceChildren();
    if(!allowed()){count.textContent='Documents hidden';return;}
    const results=findDocuments(savedDocuments,search.value,sort.value as DocumentSort);
    count.textContent=results.length+' of '+savedDocuments.length+' documents';
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
        button.addEventListener('click',()=>void select(doc.id));list.append(button);
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
      active=doc;title.value=doc.title;body.value=doc.body;renderPreview();dirty=false;renderOutline();
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
      renderPreview();renderOutline();renderHistory();
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
    clearImport();clearRestore();savedDocuments=[];list.replaceChildren();count.textContent='Documents hidden';clearEditor();
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
        title.value=heldDraft.title;body.value=heldDraft.body;renderPreview();renderOutline();
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
      renderPreview();renderOutline();renderHistory();
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
    dirty=true;renderPreview();renderOutline();message('Unsaved edits · autosave pending');queueAutosave();
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
  restore.addEventListener('click',()=>void (async()=>{
    if(!active||!store||blocked||busy||!allowed()||!history.value)return;
    if(dirty){message('Save or export current edits before restoring history.');return;}
    const rev=active.history.find(entry=>String(entry.revision)===history.value);
    if(!rev||!confirm('Restore this older revision? Current content will remain in revision history.'))return;
    title.value=rev.title;body.value=rev.body;renderPreview();renderOutline();dirty=true;await persist();
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
