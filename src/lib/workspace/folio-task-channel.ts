import {
  FOLIO_TASK_READ_MESSAGE, freshFolioTaskRead, parseFolioTaskRead,
  type FolioTaskReadSnapshot, type FolioReadStatus,
} from './folio-task-read';

/** The only code permitted to embed the Folio-owned source reader.
 * Consent comes from the existing user-approved Folio popup, not this frame.
 * No Hub/Folio storage or credentials are read or written here. */
export class FolioTaskChannel {
  private iframe:HTMLIFrameElement|null=null;
  private nonce:string|null=null;
  private ready=false;
  private requestId:string|null=null;
  private timeout:ReturnType<typeof setTimeout>|null=null;
  private tick:ReturnType<typeof setInterval>|null=null;
  snapshot:FolioTaskReadSnapshot|null=null;
  status:FolioReadStatus='disconnected';

  constructor(private readonly canRead:()=>boolean,private readonly changed:()=>void){}

  private readonly onMessage=(event:MessageEvent)=>{
    if(!this.iframe||event.origin!==location.origin||
       event.source!==this.iframe.contentWindow||!this.nonce||
       !event.data||event.data.nonce!==this.nonce||!this.canRead())return;
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
  };
  private clearTimeout(){if(this.timeout)clearTimeout(this.timeout);this.timeout=null;}
  private fail(){
    this.snapshot=null;
    this.requestId=null;
    this.status='unavailable';
    this.clearTimeout();
    this.changed();
  }
  start(){
    this.close();
    if(!this.canRead())return;
    this.nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),
      byte=>byte.toString(16).padStart(2,'0')).join('');
    this.status='connecting';
    const frame=document.createElement('iframe');
    frame.hidden=true;
    frame.tabIndex=-1;
    frame.setAttribute('aria-hidden','true');
    frame.setAttribute('title','Folio local task reader');
    frame.src='/folio/?hubTasksRead='+this.nonce;
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
      this.start();return;
    }
    if(this.requestId)return;
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
    this.snapshot=null;
    this.requestId=null;
    this.clearTimeout();
    this.status='paused';
    this.changed();
  }
  resume(){
    if(this.status==='disconnected')return;
    if(!this.canRead()){this.close();this.changed();return;}
    this.refresh();
  }
  close(){
    if(this.tick)clearInterval(this.tick);
    this.tick=null;
    this.clearTimeout();
    window.removeEventListener('message',this.onMessage);
    this.iframe?.remove();
    this.iframe=null;
    this.nonce=null;
    this.requestId=null;
    this.ready=false;
    this.snapshot=null;
    this.status='disconnected';
  }
}
