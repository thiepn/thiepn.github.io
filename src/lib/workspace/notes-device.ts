/** Accept only one Notes-authorized per-device summary from the exact opener.
 * The Notes app remains the owner of titles, reminders and privacy controls. */
export const NOTES_DEVICE_MESSAGE = 'thiepn:notes-hub-local:v1';
export interface NotesDeviceSummary {
  schema: 'thiepn:notes-hub-local';
  version: 1;
  source: 'notes-local-device';
  generatedAt: string;
  activeCount: number;
  notes: readonly { id: string; title: string; updatedAt: string; pinned: boolean }[];
  reminders: readonly { id: string; noteId: string; title: string; dueAt: string }[];
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=160)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[<>\u0000-\u001f]/.test(v);
const datetime=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function parseNotesDeviceSummary(input:unknown,now=Date.now()):NotesDeviceSummary{
  if(!record(input)||input.schema!=='thiepn:notes-hub-local'||input.version!==1||
    input.source!=='notes-local-device'||!datetime(input.generatedAt)||
    Math.abs(Date.parse(input.generatedAt as string)-now)>5*60_000||
    typeof input.activeCount!=='number'||!Number.isSafeInteger(input.activeCount)||
    input.activeCount<0||input.activeCount>1_000_000||
    !Array.isArray(input.notes)||input.notes.length>8||
    !Array.isArray(input.reminders)||input.reminders.length>6)
    throw new Error('Invalid Notes owner summary');
  if(!input.notes.every(n=>record(n)&&text(n.id,100)&&text(n.title,160)&&
    datetime(n.updatedAt)&&typeof n.pinned==='boolean'))
    throw new Error('Invalid Notes titles');
  if(!input.reminders.every(r=>record(r)&&text(r.id,100)&&text(r.noteId,100)&&
    text(r.title,160)&&datetime(r.dueAt)))
    throw new Error('Invalid Notes reminders');
  return input as unknown as NotesDeviceSummary;
}
export function acceptNotesReply(input:unknown,nonce:string,now=Date.now()):NotesDeviceSummary{
  if(!record(input)||input.type!==NOTES_DEVICE_MESSAGE||input.nonce!==nonce)
    throw new Error('Unexpected Notes handoff');
  return parseNotesDeviceSummary(input.snapshot,now);
}
