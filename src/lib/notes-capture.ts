export type CaptureCommand = {accountId:string;requestId:string;destination:'notes:unfiled';title:string;content:string};
export type CaptureReceipt = {schemaVersion:1;accountId:string;grantRevision:string;requestId:string;destination:'notes:unfiled';noteId:string;createdAt:number;status:'confirmed'};
export type CaptureDraft = CaptureCommand & {state:'draft'|'uncertain'|'confirmed';receipt?:CaptureReceipt};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const encoder=new TextEncoder();
function validText(title:unknown,content:unknown):boolean{return typeof title==='string'&&typeof content==='string'&&title.length<=500&&content.length<=16000&&encoder.encode(title).length<=2000&&encoder.encode(content).length<=64000;}
export function captureDraftKey(owner:string){if(!uuid(owner))throw new Error('Account unavailable');return 'thiepn:hub-capture:draft:v1:'+owner;}
/** One immutable command per attempt. Persist uncertainty BEFORE sending; replay
 * the same ID and bytes after a timeout. Account switches never rebind drafts. */
export class NotesCapture {
  private draft:CaptureDraft; private busy=false; private generation=0;
  constructor(private accountId:string,private storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,private owner:()=>string|null,private send:(command:CaptureCommand,signal:AbortSignal)=>Promise<CaptureReceipt>){
    const raw=storage.getItem(captureDraftKey(accountId));
    if(raw){
      if(raw.length>100000)throw new Error('Saved draft unavailable');
      const d=JSON.parse(raw) as CaptureDraft;
      if(d.accountId!==accountId||!uuid(d.requestId)||d.destination!=='notes:unfiled'||!validText(d.title,d.content)||!['draft','uncertain','confirmed'].includes(d.state))throw new Error('Saved draft unavailable');
      this.draft=d;
    }else this.draft=this.empty();
  }
  private empty():CaptureDraft{return {accountId:this.accountId,requestId:crypto.randomUUID(),destination:'notes:unfiled',title:'',content:'',state:'draft'};}
  snapshot(){return structuredClone(this.draft);}
  private persist(d:CaptureDraft){this.storage.setItem(captureDraftKey(this.accountId),JSON.stringify(d));this.draft=d;}
  edit(title:string,content:string){if(this.busy||this.draft.state!=='draft'||this.owner()!==this.accountId||!validText(title,content))throw new Error('Draft cannot change');this.persist({...this.draft,requestId:crypto.randomUUID(),title,content});}
  newDraft(){if(this.busy||this.draft.state!=='confirmed'||this.owner()!==this.accountId)throw new Error('Confirm the previous save first');this.persist(this.empty());}
  erase(){if(this.busy||this.draft.state==='uncertain')throw new Error('Reconcile this save first');this.storage.removeItem(captureDraftKey(this.accountId));this.draft=this.empty();}
  clear(){++this.generation;}
  async save(signal:AbortSignal):Promise<CaptureReceipt>{
    if(this.busy||this.owner()!==this.accountId||signal.aborted||this.draft.state==='confirmed'||!(this.draft.title.trim()||this.draft.content.trim()))throw new Error('Capture unavailable');
    const d=this.draft,epoch=this.generation;
    this.persist({...d,state:'uncertain'});this.busy=true;
    try{
      const {accountId,requestId,destination,title,content}=d;
      const receipt=await this.send({accountId,requestId,destination,title,content},signal);
      if(epoch!==this.generation||signal.aborted||this.owner()!==this.accountId||receipt.accountId!==accountId||receipt.requestId!==requestId||receipt.destination!==destination||receipt.status!=='confirmed'||!uuid(receipt.noteId))throw new Error('Save requires reconciliation');
      this.persist({...d,state:'confirmed',receipt});return receipt;
    }finally{this.busy=false;}
  }
}
