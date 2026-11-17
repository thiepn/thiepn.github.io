import {
  FOLIO_TASK_READ_MESSAGE, FOLIO_LIVE_GRANT_KEY, freshFolioTaskRead, parseFolioTaskRead,
  type FolioTaskReadSnapshot, type FolioReadStatus,
} from './folio-task-read';
import { FOLIO_TASK_ACTION_MESSAGE, FOLIO_TASK_WRITE_GRANT_KEY,
  validFolioTaskActionResult, type FolioTaskAction, type FolioTaskActionResult } from './folio-task-actions';
import {FOLIO_TASK_QUERY_MESSAGE,parseFolioTaskQueryResult,
  type FolioTaskQueryInput,type FolioTaskQueryResult} from './folio-task-query';

/** The only code permitted to embed the Folio-owned source reader.
 * Consent comes from the existing user-approved Folio popup, not this frame.
 * No Hub/Folio storage or credentials are read or written here. */
export class FolioTaskChannel {
  private iframe:HTMLIFrameElement|null=null;
  private nonce:string|null=null;
  private ready=false;
  private requestId:string|null=null;
  private refreshQueued=false;
  private pageRequestId:string|null=null;
  private pageTimer:ReturnType<typeof setTimeout>|null=null;
  page:FolioTaskQueryResult|null=null;
  pageQuery:FolioTaskQueryInput|null=null;
  pageLoading=false;
  pageError=false;
  pageChanged=false;
  private writeGrant:string|null=null;
  private actionRequestId:string|null=null;
  private actionResolve:((outcome:FolioTaskActionResult)=>void)|null=null;
  private actionTimeout:ReturnType<typeof setTimeout>|null=null;
  actionPending=false;
  actionMessage='';
  actionFailed=false;
  lastUndoId:string|null=null;
  private timeout:ReturnType<typeof setTimeout>|null=null;
  private tick:ReturnType<typeof setInterval>|null=null;
  snapshot:FolioTaskReadSnapshot|null=null;
  status:FolioReadStatus='disconnected';

  constructor(private readonly canRead:()=>boolean,private readonly changed:()=>void){}

  get readGrant(){return this.nonce;}
  clearPage(){
    if(this.pageTimer)clearTimeout(this.pageTimer);
    this.pageTimer=null;
    this.pageRequestId=null;
    this.page=null;
    this.pageQuery=null;
    this.pageLoading=false;
    this.pageError=false;
    this.pageChanged=false;
  }
  queryPage(input:FolioTaskQueryInput,force=false){
    if(!this.ready||!this.iframe||!this.nonce||!this.canRead()||document.hidden)return;
    const current=this.pageQuery;
    const same=current&&current.filter===input.filter&&current.search===input.search&&
      current.projectId===input.projectId&&current.page===input.page;
    if(!force&&same&&(this.pageLoading||this.page||this.pageError||this.pageChanged))return;
    if(this.pageTimer)clearTimeout(this.pageTimer);
    this.pageQuery={...input};
    this.page=null;
    this.pageError=false;
    this.pageChanged=false;
    this.pageLoading=true;
    this.pageRequestId=crypto.randomUUID();
    const rid=this.pageRequestId;
    this.pageTimer=setTimeout(()=>{
      if(this.pageRequestId!==rid)return;
      this.pageRequestId=null;this.pageLoading=false;this.pageError=true;
      this.changed();
    },12_000);
    this.iframe.contentWindow?.postMessage({
      type:FOLIO_TASK_QUERY_MESSAGE+':read',nonce:this.nonce,requestId:rid,query:input,
    },location.origin);
    this.changed();
  }
  get actionsEnabled(){
    if(!this.writeGrant||!this.nonce||!this.canRead()||this.status!=='ready')return false;
    try{
      const saved=JSON.parse(sessionStorage.getItem(FOLIO_TASK_WRITE_GRANT_KEY)||'null');
      return saved?.grant===this.writeGrant && saved?.readGrant===this.nonce &&
        Number.isFinite(saved.expiresAt) && saved.expiresAt>Date.now();
    }catch{return false;}
  }
  enableActions(grant:string){
    if(!this.nonce||this.status!=='ready'||!/^[0-9a-f]{32}$/.test(grant))return false;
    this.writeGrant=grant;
    if(!this.actionsEnabled){this.writeGrant=null;return false;}
    this.actionMessage='Task actions enabled for this Hub tab';
    this.actionFailed=false;
    this.changed();
    return true;
  }
  revokeActions(){
    if(this.actionResolve)this.actionResolve({ok:false,code:'unavailable',
      message:'Outcome unconfirmed after disconnect. Check Folio before retrying'});
    this.actionResolve=null;
    this.actionRequestId=null;
    if(this.actionTimeout)clearTimeout(this.actionTimeout);
    this.actionTimeout=null;
    this.actionPending=false;
    try{sessionStorage.removeItem(FOLIO_TASK_WRITE_GRANT_KEY)}catch{}
    this.writeGrant=null;
    this.lastUndoId=null;
    this.actionMessage='';
    this.actionFailed=false;
  }
  async executeAction(action:FolioTaskAction):Promise<FolioTaskActionResult>{
    if(!this.actionsEnabled||!this.ready||!this.iframe||this.actionPending)return {
      ok:false,code:'forbidden',message:'Connect Folio and approve task actions first',
    };
    const requestId=crypto.randomUUID();
    this.actionRequestId=requestId;
    this.actionPending=true;
    this.actionMessage='Applying action in Folio…';
    this.actionFailed=false;
    this.lastUndoId=null;
    this.changed();
    return await new Promise<FolioTaskActionResult>(resolve=>{
      this.actionResolve=resolve;
      this.actionTimeout=setTimeout(()=>{
        if(this.actionRequestId!==requestId)return;
        this.finishAction({ok:false,code:'unavailable',
          message:'Outcome unconfirmed. Open Folio and check the task before retrying'});
      },18_000);
      this.iframe?.contentWindow?.postMessage({
        type:FOLIO_TASK_ACTION_MESSAGE+':request',nonce:this.nonce,writeGrant:this.writeGrant,
        requestId,action,
      },location.origin);
    });
  }
  private finishAction(result:FolioTaskActionResult){
    const resolve=this.actionResolve;
    this.actionResolve=null;
    this.actionRequestId=null;
    if(this.actionTimeout)clearTimeout(this.actionTimeout);
    this.actionTimeout=null;
    this.actionPending=false;
    this.actionMessage=result.message;
    this.actionFailed=!result.ok;
    this.lastUndoId=result.ok?result.undoId??null:null;
    this.changed();
    if(result.ok)this.refresh(); // Read original source after an acknowledged mutation
    resolve?.(result);
  }

  private readonly onMessage=(event:MessageEvent)=>{
    if(!this.iframe||event.origin!==location.origin||
       event.source!==this.iframe.contentWindow||!this.nonce||
       !event.data||event.data.nonce!==this.nonce||!this.canRead())return;
    if(event.data.type===FOLIO_TASK_QUERY_MESSAGE+':result'||
       event.data.type===FOLIO_TASK_QUERY_MESSAGE+':error'||
       event.data.type===FOLIO_TASK_QUERY_MESSAGE+':changed'){
      if(!this.pageRequestId||event.data.requestId!==this.pageRequestId||
         !this.pageQuery)return;
      if(this.pageTimer)clearTimeout(this.pageTimer);
      this.pageTimer=null;
      this.pageRequestId=null;
      this.pageLoading=false;
      if(event.data.type===FOLIO_TASK_QUERY_MESSAGE+':changed'){
        this.page=null;
        this.pageError=false;
        this.pageChanged=true;
        this.changed();
        return;
      }
      try{
        if(event.data.type!==FOLIO_TASK_QUERY_MESSAGE+':result')
          throw Error('Folio query unavailable');
        this.page=parseFolioTaskQueryResult(event.data.result,this.pageQuery);
        this.pageError=false;
        this.pageChanged=false;
      }catch{this.page=null;this.pageError=true;}
      this.changed();
      return;
    }
    if(event.data.type===FOLIO_TASK_ACTION_MESSAGE+':result'){
      if(this.actionRequestId===event.data.requestId&&this.writeGrant===event.data.writeGrant&&
         validFolioTaskActionResult(event.data.result))
        this.finishAction(event.data.result);
      return;
    }
    if(event.data.type===FOLIO_TASK_READ_MESSAGE+':ready'){
      if(this.ready)return;
      this.ready=true;
      this.clearTimeout();
      this.refresh();
      return;
    }
    if(!this.requestId||event.data.requestId!==this.requestId)return;
    if(event.data.type!==FOLIO_TASK_READ_MESSAGE+':result' &&
       event.data.type!==FOLIO_TASK_READ_MESSAGE+':error')return;
    this.requestId=null;
    this.clearTimeout();
    const repeat=this.refreshQueued;
    this.refreshQueued=false;
    try {
      if(event.data.type!==FOLIO_TASK_READ_MESSAGE+':result')throw Error('Folio source unavailable');
      const snapshot=parseFolioTaskRead(event.data.snapshot);
      this.snapshot=snapshot;
      this.status='ready';
    } catch {
      this.snapshot=null;
      this.status='unavailable';
    }
    this.changed();
    if(this.status==='ready'&&this.pageQuery&&!this.pageLoading&&!this.pageChanged)
      this.queryPage(this.pageQuery,true);
    if(repeat)setTimeout(()=>this.refresh(),0);
  };
  private clearTimeout(){if(this.timeout)clearTimeout(this.timeout);this.timeout=null;}
  private fail(){
    const repeat=this.refreshQueued;
    this.refreshQueued=false;
    this.snapshot=null;
    this.requestId=null;
    this.status='unavailable';
    this.clearTimeout();
    this.changed();
    if(repeat)setTimeout(()=>this.refresh(),0);
  }
  start(grant:string,reconnect=false){
    const oldWrite=reconnect?this.writeGrant:null;
    this.close(!reconnect);
    if(!this.canRead()||!/^[0-9a-f]{32}$/.test(grant))return;
    this.writeGrant=oldWrite;
    // The capability was issued by Folio's explicit consent click.
    // Hub never provisions or persists it.
    this.nonce=grant;
    this.status='connecting';
    const frame=document.createElement('iframe');
    frame.hidden=true;
    frame.tabIndex=-1;
    frame.setAttribute('aria-hidden','true');
    frame.setAttribute('title','Folio local task reader');
    frame.src='/folio/?hubTasksRead=1'; // Nonsecret marker; Folio checks tab-scoped grant.
    this.iframe=frame;
    window.addEventListener('message',this.onMessage);
    document.body.appendChild(frame);
    this.timeout=setTimeout(()=>{if(!this.ready)this.fail();},12_000);
    this.tick=setInterval(()=>this.refresh(),30_000);
    this.changed();
  }
  refresh(){
    if(!this.canRead()){this.close();this.changed();return;}
    if(document.hidden){this.pause();return;}
    if(!this.iframe||!this.ready){
      if(this.nonce)this.start(this.nonce,true);
      else this.fail();
      return;
    }
    // A user-requested refresh must not disappear behind a still-in-flight
    // focus/visibility poll. Deliver one guaranteed trailing source read.
    if(this.requestId){this.refreshQueued=true;return;}
    if(this.snapshot&&!freshFolioTaskRead(this.snapshot)){
      this.snapshot=null;
    }
    this.requestId=crypto.randomUUID();
    if(!this.snapshot)this.status='reading';
    this.timeout=setTimeout(()=>this.fail(),12_000);
    this.iframe.contentWindow?.postMessage({
      type:FOLIO_TASK_READ_MESSAGE+':read',nonce:this.nonce,requestId:this.requestId,
    },location.origin);
    this.changed();
  }
  pause(){
    if(this.status==='disconnected')return;
    this.clearPage();
    this.snapshot=null;
    this.requestId=null;
    this.refreshQueued=false;
    this.clearTimeout();
    this.status='paused';
    this.changed();
  }
  resume(){
    if(this.status==='disconnected')return;
    if(!this.canRead()){this.close();this.changed();return;}
    this.refresh();
  }
  close(revoke=true){
    this.clearPage();
    if(revoke)this.revokeActions();
    else if(this.actionResolve){
      this.actionResolve({ok:false,code:'unavailable',
        message:'Outcome unconfirmed. Check Folio before trying again'});
      this.actionResolve=null;
      this.actionPending=false;
      this.actionRequestId=null;
      if(this.actionTimeout)clearTimeout(this.actionTimeout);
      this.actionTimeout=null;
    }
    if(revoke&&this.nonce){
      try {
        const saved=JSON.parse(sessionStorage.getItem(FOLIO_LIVE_GRANT_KEY)||'null');
        if(saved?.grant===this.nonce)sessionStorage.removeItem(FOLIO_LIVE_GRANT_KEY);
      } catch { /* Private browsing or denied session storage: no task data persisted. */ }
    }
    if(this.tick)clearInterval(this.tick);
    this.tick=null;
    this.clearTimeout();
    window.removeEventListener('message',this.onMessage);
    this.iframe?.remove();
    this.iframe=null;
    this.nonce=null;
    this.requestId=null;
    this.refreshQueued=false;
    this.ready=false;
    this.snapshot=null;
    if(revoke)this.writeGrant=null;
    this.status='disconnected';
  }
}
