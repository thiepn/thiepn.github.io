/** Handshake only. Folio owns the database, read projection, and the Share click.
 * This module merely validates the explicitly shared, bounded in-memory payload. */
export const FOLIO_DEVICE_MESSAGE = 'thiepn:folio-hub-daily:v1' as const;
export const FOLIO_DEVICE_ROOT = 'https://thiepn.dev/folio/';
export interface FolioDeviceSnapshot {
  schema:'thiepn:folio-hub-daily';
  version:1;
  generatedAt:string;
  date:string;
  source:'folio-local-device';
  tasks:readonly {id:string;title:string;plannedDate?:string;deadline?:string;priority:string;plannedToday:boolean}[];
  pendingCount:number;
  overdueCount:number;
  events:readonly {id:string;title:string;start:string;end:string;kind:'task'|'event';allDay:boolean}[];
  notes:readonly {id:string;title:string;updatedAt:string}[];
  habits:readonly {id:string;title:string;target:number;value:number;status:'open'|'completed'|'skipped';updatedAt?:string}[];
}
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const txt=(v:unknown,max=200)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const day=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const iso=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=100000;
const rows=(v:unknown,max:number)=>Array.isArray(v)&&v.length<=max&&v.every(obj);
export function parseFolioDeviceSnapshot(input:unknown,now=Date.now()):FolioDeviceSnapshot {
  if (!obj(input) || input.schema!=='thiepn:folio-hub-daily'||input.version!==1||
      input.source!=='folio-local-device'||!iso(input.generatedAt)||!day(input.date)||
      Math.abs(now-Date.parse(input.generatedAt as string))>5*60_000||
      !count(input.pendingCount)||!count(input.overdueCount)||
      !rows(input.tasks,12)||!rows(input.events,12)||!rows(input.notes,5)||!rows(input.habits,10))
    throw new Error('Invalid Folio owner summary');
  for (const t of input.tasks as Record<string,unknown>[])
    if(!txt(t.id,100)||!txt(t.title)||!txt(t.priority,20)||typeof t.plannedToday!=='boolean'||
      (t.plannedDate!==undefined&&!day(t.plannedDate))||(t.deadline!==undefined&&!day(t.deadline)))
      throw new Error('Invalid Folio task summary');
  for (const e of input.events as Record<string,unknown>[])
    if(!txt(e.id,100)||!txt(e.title)||!iso(e.start)||!iso(e.end)||Date.parse(e.end as string)<=Date.parse(e.start as string)||
      !['task','event'].includes(String(e.kind))||typeof e.allDay!=='boolean')
      throw new Error('Invalid Folio event summary');
  for (const n of input.notes as Record<string,unknown>[])
    if(!txt(n.id,100)||!txt(n.title)||!iso(n.updatedAt))throw new Error('Invalid Folio note summary');
  for (const h of input.habits as Record<string,unknown>[])
    if(!txt(h.id,100)||!txt(h.title)||!count(h.value)||!count(h.target)||
      !['open','completed','skipped'].includes(String(h.status))||
      (h.updatedAt!==undefined&&!iso(h.updatedAt)))throw new Error('Invalid Folio habit summary');
  return input as unknown as FolioDeviceSnapshot;
}
export function safeFolioBridgeReply(value:unknown, expectedNonce:string, now=Date.now()):FolioDeviceSnapshot {
  if(!obj(value)||value.type!==FOLIO_DEVICE_MESSAGE||value.nonce!==expectedNonce)
    throw new Error('Unexpected Folio handoff');
  return parseFolioDeviceSnapshot(value.snapshot,now);
}
