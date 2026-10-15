export interface WorkspaceHealth {storageReady:boolean;dirty:boolean;conflict:boolean;cloudConflict:boolean;locked:boolean}
export interface WorkspaceAttention {id:string;title:string;detail:string;action:'export'|'cloud-review'|'reload';label:string}
export function workspaceAttention(health:WorkspaceHealth):WorkspaceAttention[]{
 const items:WorkspaceAttention[]=[];
 if(health.locked)items.push({id:'document-recovery',title:'Saved workspace needs recovery',detail:'Export the saved document before changing it.',action:'export',label:'Export recovery'});
 else if(!health.storageReady)items.push({id:'storage-unavailable',title:'Browser storage is unavailable',detail:'Changes in this tab need an exported backup before you leave.',action:'export',label:'Export backup'});
 else if(health.dirty)items.push({id:'unsaved-changes',title:'Changes have not saved yet',detail:'Keep this tab open and export a backup before retrying.',action:'export',label:'Export backup'});
 if(health.cloudConflict)items.push({id:'cloud-conflict',title:'Account sync needs a decision',detail:'Both versions are preserved. Review them before choosing which to share.',action:'cloud-review',label:'Review sync changes'});
 else if(health.conflict)items.push({id:'local-conflict',title:'Another tab changed this workspace',detail:'Export your current changes before loading the saved version.',action:'export',label:'Export this version'});
 return items;
}
