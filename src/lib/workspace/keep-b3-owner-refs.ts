/** KEEP B3 ownerResourceRefs.ts original semantics — portable, typed pointers, no authorization. */
export const OWNER_SOURCES = ['keep', 'folio', 'calendar', 'habits', 'vault', 'hub'] as const;
export type OwnerSource = typeof OWNER_SOURCES[number];
export const RESOURCE_KINDS = {
  keep: ['note', 'markdown-task', 'note-block', 'project', 'goal', 'area', 'saved-view'],
  folio: ['task', 'project', 'event', 'habit', 'time-block', 'saved-view'],
  calendar: ['event', 'ics-source'],
  habits: ['habit', 'routine', 'check-in'],
  vault: ['note', 'note-block', 'markdown-task', 'canvas'],
  hub: ['pin', 'saved-view'],
} as const;
export type OwnerKind<S extends OwnerSource> = (typeof RESOURCE_KINDS)[S][number];
export type AnyOwnerKind = (typeof RESOURCE_KINDS)[OwnerSource][number];
export const SOURCE_ADAPTERS: Record<OwnerSource, {
  product:string; module:string; label:string; sourceHome:string|null;
  localRecords:boolean; liveRead:false; remoteWrite:false; synchronization:false;
}> = {
  keep: { product:'keep', module:'knowledge', label:'KEEP', sourceHome:null, localRecords:true, liveRead:false, remoteWrite:false, synchronization:false },
  folio: { product:'folio', module:'home', label:'Folio', sourceHome:'https://thiepn.dev/folio/', localRecords:false, liveRead:false, remoteWrite:false, synchronization:false },
  calendar: { product:'calendar', module:'calendar', label:'Calendar', sourceHome:null, localRecords:false, liveRead:false, remoteWrite:false, synchronization:false },
  habits: { product:'habits', module:'habits', label:'Habits', sourceHome:null, localRecords:false, liveRead:false, remoteWrite:false, synchronization:false },
  vault: { product:'vault', module:'knowledge', label:'Vault', sourceHome:null, localRecords:false, liveRead:false, remoteWrite:false, synchronization:false },
  hub: { product:'hub', module:'home', label:'THIEPN Hub', sourceHome:'https://thiepn.dev/', localRecords:false, liveRead:false, remoteWrite:false, synchronization:false },
};
export interface OwnerResourceRef<S extends OwnerSource = OwnerSource> {
  readonly source:S; readonly kind:AnyOwnerKind; readonly id:string; readonly uri:string;
}
export function makeOwnerRef<S extends OwnerSource>(source:S,kind:OwnerKind<S>,id:string): OwnerResourceRef<S> {
  if(!RESOURCE_KINDS[source]?.includes(kind as never))throw new Error('Unsupported source resource kind');
  if(typeof id!=='string'||!id.trim()||id!==id.trim()||id.length>256||/[\x00-\x1f\x7f]/u.test(id))throw new Error('Invalid owner resource identifier');
  const {product,module}=SOURCE_ADAPTERS[source];
  return {source,kind,id,uri:'thiepn://'+product+'/'+module+'/'+kind+'/'+encodeURIComponent(id)+'?v=1'};
}
export function parseOwnerRef(input:unknown): OwnerResourceRef|null {
  if(typeof input!=='string'||input.length>800)return null;
  const m=/^thiepn:\/\/([a-z-]+)\/([a-z-]+)\/([a-z-]+)\/([^/?#]+)\?v=1$/u.exec(input);
  if(!m)return null;
  const source=OWNER_SOURCES.find(key=>SOURCE_ADAPTERS[key].product===m[1]&&SOURCE_ADAPTERS[key].module===m[2]);
  if(!source||!RESOURCE_KINDS[source].includes(m[3] as never))return null;
  try {const id=decodeURIComponent(m[4]);const ref=makeOwnerRef(source,m[3] as OwnerKind<typeof source>,id);return ref.uri===input?ref:null;}
  catch{return null;}
}
export function sourceLanding(ref:OwnerResourceRef):string|null {return SOURCE_ADAPTERS[ref.source].sourceHome;}
