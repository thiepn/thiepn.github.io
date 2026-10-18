import {MAX_DOCUMENTS,newDocument,nextDocument,validateDocument,type OfficeDocument} from './documents';
// New private device store only. Does NOT open or upgrade thiepn-adaptive-workspace or KeepNotesDB.
export class OfficeDeviceStore {
  private db: IDBDatabase | null = null;
  constructor(readonly scope: string) {
    if (!/^(guest|user:[0-9a-f-]{36})$/.test(scope)) throw new Error('Invalid Office owner scope');
  }
  async open(): Promise<void> {
    this.db = await new Promise<IDBDatabase>((resolve,reject)=>{
      const request=indexedDB.open('thiepn-hub-office-v1',1);
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains('documents'))request.result.createObjectStore('documents');
      };
      request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
      request.onerror=()=>reject(request.error ?? new Error('Office storage unavailable'));
      request.onblocked=()=>reject(new Error('Close other Office tabs to open device storage.'));
    });
  }
  private get database(): IDBDatabase {
    if(!this.db)throw new Error('Office storage is closed');
    return this.db;
  }
  private key(id:string): string {return this.scope+':'+id;}
  async list(): Promise<OfficeDocument[]> {
    return new Promise((resolve,reject)=>{
      const tx=this.database.transaction('documents','readonly');
      const request=tx.objectStore('documents').getAll(IDBKeyRange.bound(this.scope+':',this.scope+':\uffff'),MAX_DOCUMENTS+1);
      request.onsuccess=()=>{
        try {
          if(request.result.length>MAX_DOCUMENTS)throw new Error('Office document limit exceeded. Existing records remain untouched.');
          resolve(request.result.map(validateDocument).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
        }catch(error){reject(error);}
      };
      request.onerror=()=>reject(request.error);
    });
  }
  async read(id:string): Promise<OfficeDocument|null> {
    return new Promise((resolve,reject)=>{
      const request=this.database.transaction('documents').objectStore('documents').get(this.key(id));
      request.onsuccess=()=>{
        try{resolve(request.result===undefined?null:validateDocument(request.result));}catch(error){reject(error);}
      };
      request.onerror=()=>reject(request.error);
    });
  }
  async create(initial?:{title:string;body:string}):Promise<OfficeDocument>{
    if((await this.list()).length>=MAX_DOCUMENTS)throw new Error('Limit of 100 local Office documents reached.');
    const blank=newDocument(crypto.randomUUID(),new Date().toISOString());
    // Template title and body enter the original schema in one atomic add, not a second write.
    const doc=initial?validateDocument({...blank,title:initial.title,body:initial.body}):blank;
    return new Promise((resolve,reject)=>{
      const tx=this.database.transaction('documents','readwrite');
      tx.objectStore('documents').add(doc,this.key(doc.id));
      tx.oncomplete=()=>resolve(doc);
      tx.onabort=tx.onerror=()=>reject(tx.error??new Error('Document was not saved'));
    });
  }
  async save(previous:OfficeDocument,title:string,body:string):Promise<OfficeDocument>{
    const key=this.key(previous.id);
    return new Promise((resolve,reject)=>{
      const tx=this.database.transaction('documents','readwrite');
      const records=tx.objectStore('documents');
      const request=records.get(key);
      let updated:OfficeDocument|null=null, fault:unknown=null;
      request.onsuccess=()=>{
        try{
          if(request.result===undefined)throw new Error('Original document is missing; nothing was overwritten.');
          const current=validateDocument(request.result);
          if(current.revision!==previous.revision)throw new Error('Document changed in another tab. Export your unsaved edits before reopening.');
          updated=nextDocument(current,previous.revision,title,body,new Date().toISOString());
          if(updated!==current)records.put(updated,key);
        }catch(error){fault=error;tx.abort();}
      };
      tx.oncomplete=()=>resolve(updated!);
      tx.onabort=tx.onerror=()=>reject(fault??tx.error??new Error('Office save failed'));
    });
  }
  close(){this.db?.close();this.db=null;}
}
