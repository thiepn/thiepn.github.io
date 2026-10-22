// Hub-native Office O1: separate from Hub v1 workspace and original KEEP records.
export interface OfficeRevision { revision: number; title: string; body: string; updatedAt: string }
export interface OfficeDocument {
  schemaVersion: 1; id: string; title: string; body: string; revision: number;
  updatedAt: string; history: OfficeRevision[];
}
export const MAX_BODY = 200_000;
export const MAX_DOCUMENTS = 100;
export const MAX_HISTORY = 12;
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validText(value: unknown, length: number): value is string {
  return typeof value === 'string' && value.length <= length;
}
function validStamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.length <= 40;
}
export function validateDocument(value: unknown): OfficeDocument {
  if (!record(value) || Object.keys(value).sort().join('|') !==
      ['schemaVersion','id','title','body','revision','updatedAt','history'].sort().join('|') ||
      value.schemaVersion !== 1 || !validText(value.id, 80) || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id) ||
      !validText(value.title,120) || !value.title.trim() ||
      !validText(value.body, MAX_BODY) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 ||
      !validStamp(value.updatedAt) || !Array.isArray(value.history) || value.history.length > MAX_HISTORY) {
    throw new Error('Unsupported or damaged Office record. It has not been changed.');
  }
  for (const item of value.history) {
    if (!record(item) || Object.keys(item).sort().join('|') !== ['revision','title','body','updatedAt'].sort().join('|') ||
      !Number.isSafeInteger(item.revision) || Number(item.revision) < 0 || Number(item.revision) >= Number(value.revision) ||
      !validText(item.title,120) || !item.title.trim() || !validText(item.body, MAX_BODY) || !validStamp(item.updatedAt)) {
      throw new Error('Unsupported Office history. It has not been changed.');
    }
  }
  return value as unknown as OfficeDocument;
}
export function newDocument(id: string, now: string): OfficeDocument {
  return validateDocument({schemaVersion:1,id,title:'Untitled document',body:'',revision:0,updatedAt:now,history:[]});
}
export class OfficeConflict extends Error {
  constructor(){super('Document changed in another tab. Your edits remain here; export them before reloading.');}
}
export function nextDocument(current: OfficeDocument, expected: number, title: string, body: string, now: string): OfficeDocument {
  validateDocument(current);
  if (current.revision !== expected) throw new OfficeConflict();
  if (!title.trim() || title.length > 120 || body.length > MAX_BODY || !validStamp(now))
    throw new Error('Add a title (up to 120 characters) and keep content below 200,000 characters.');
  if (title === current.title && body === current.body) return current;
  return validateDocument({...current,title,body,revision:current.revision+1,updatedAt:now,
    history:[...current.history,{revision:current.revision,title:current.title,body:current.body,updatedAt:current.updatedAt}].slice(-MAX_HISTORY)});
}
export function restoreDocument(current: OfficeDocument, revision: number, now: string): OfficeDocument {
  const entry = current.history.find(row=>row.revision===revision);
  if (!entry) throw new Error('Selected revision is unavailable.');
  return nextDocument(current,current.revision,entry.title,entry.body,now);
}
export function documentFilename(title: string): string {
  return (title.normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1F]/g,'-').replace(/[. ]+$/g,'').trim().slice(0,80) || 'document')+'.md';
}
