/** Folio owns the write contract and all side effects.
 * Hub only submits explicitly approved commands through the active local reader. */
export const FOLIO_TASK_ACTION_MESSAGE='thiepn:folio-hub-task-actions:v1' as const;
export const FOLIO_TASK_WRITE_GRANT_KEY='folio:hub:task-write-consent:v1' as const;
export type FolioTaskAction =
  | {kind:'create';title:string;status:'todo'|'inbox';priority:'normal'|'high'|'critical';plannedDate?:string}
  | {kind:'complete'|'reopen';taskId:string;expectedUpdatedAt:string}
  | {kind:'reschedule';taskId:string;expectedUpdatedAt:string;plannedDate:string|null}
  | {kind:'undo';undoId:string};
export type FolioTaskActionResult =
  | {ok:true;message:string;taskId:string;updatedAt:string;undoId?:string}
  | {ok:false;code:'invalid'|'conflict'|'missing'|'forbidden'|'unavailable';message:string};
const isObj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function validFolioTaskActionResult(x:unknown):x is FolioTaskActionResult {
  if(!isObj(x)||typeof x.ok!=='boolean'||typeof x.message!=='string'||x.message.length>200)return false;
  if(x.ok===true)return typeof x.taskId==='string'&&x.taskId.length>0&&x.taskId.length<=128&&
    typeof x.updatedAt==='string'&&
    (x.undoId===undefined||(typeof x.undoId==='string'&&x.undoId.length<=128));
  return ['invalid','conflict','missing','forbidden','unavailable'].includes(String(x.code));
}
