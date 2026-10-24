/**
 * Additive Hub v1 backup imports create new local identities for original
 * records. Every existing workspace-owned reference must be rebased using its
 * declared source type, not a global ID map (different record kinds can reuse
 * the same legacy ID). Never merge imported owner data by an old identifier.
 */
import {clone,uid,type WorkspaceState} from './types';
import {parseState} from './model';
import {specification} from './registry';

type SourceKind='tasks'|'notes'|'events'|'trackers';
const DATA_KINDS=['tasks','notes','events','trackers','logs','activity'] as const;
const PIN_KINDS={task:'tasks',note:'notes',event:'events',tracker:'trackers'} as const;

export function rebaseAddedHubBackup(imported:WorkspaceState):WorkspaceState{
 const copy=clone(imported);
 const maps:{
  tasks:Map<string,string>;notes:Map<string,string>;events:Map<string,string>;
  trackers:Map<string,string>;logs:Map<string,string>;activity:Map<string,string>;
 }={
  tasks:new Map(),notes:new Map(),events:new Map(),trackers:new Map(),
  logs:new Map(),activity:new Map(),
 };
 // Allocate new IDs for all imported records before rewriting their references.
 for(const kind of DATA_KINDS){
  for(const item of copy[kind])maps[kind].set(item.id,uid());
 }
 const referenced=(kind:SourceKind,old:string):string=>{
  if(!old)return old;
  // Preserve a dangling reference as visibly unavailable, never as a link to
  // another person's record with a colliding legacy ID.
  const map=maps[kind];
  if(!map.has(old))map.set(old,uid());
  return map.get(old)!;
 };
 for(const kind of DATA_KINDS)
  for(const item of copy[kind])item.id=maps[kind].get(item.id)!;
 for(const log of copy.logs)log.trackerId=referenced('trackers',log.trackerId);
 const workspaceIds=new Map(copy.workspaces.map(w=>[w.id,uid()]));
 for(const workspace of copy.workspaces){
  workspace.id=workspaceIds.get(workspace.id)!;
  for(const widget of workspace.widgets){
   if(widget.typeVersion!==1||!specification(widget.type))
    throw Error('The backup contains a newer or unknown widget. Use Replace only after reviewing the backup, or update Hub; additive import cannot safely rebind unknown original IDs.');
   widget.id=uid();
   const config=widget.config;
   if(Array.isArray(config.trackerIds))
    config.trackerIds=config.trackerIds.map(old=>referenced('trackers',String(old)));
   if(typeof config.selectedTracker==='string'&&config.selectedTracker)
    config.selectedTracker=referenced('trackers',config.selectedTracker);
   if(widget.type==='record-pinboard'&&Array.isArray(config.pins)){
    config.pins=config.pins.map(source=>{
     const key=String(source),split=key.indexOf(':'),kind=key.slice(0,split) as keyof typeof PIN_KINDS;
     const sourceId=key.slice(split+1);
     const originalKind=PIN_KINDS[kind];
     if(!originalKind)throw Error('Unexpected original pin kind.');
     return kind+':'+referenced(originalKind,sourceId);
    });
   }
   if(widget.type==='outcome-board'&&Array.isArray(config.outcomes)){
    config.outcomes=config.outcomes.map(row=>{
     const original=row as {id:string;taskIds:string[];trackerIds:string[]};
     return {...original,id:uid(),taskIds:original.taskIds.map(old=>referenced('tasks',old)),
       trackerIds:original.trackerIds.map(old=>referenced('trackers',old))};
    });
   }
   if(widget.type==='decision-register'&&Array.isArray(config.decisions)){
    config.decisions=config.decisions.map(row=>{
     const original=row as {id:string;taskId:string;noteId:string};
     return {...original,id:uid(),taskId:referenced('tasks',original.taskId),
       noteId:referenced('notes',original.noteId)};
    });
   }
   if(widget.type==='task-event-links'&&Array.isArray(config.links)){
    config.links=config.links.map(row=>{
     const original=row as {id:string;taskId:string;eventId:string};
     return {...original,id:uid(),taskId:referenced('tasks',original.taskId),
       eventId:referenced('events',original.eventId)};
    });
   }
  }
 }
 copy.active=workspaceIds.get(copy.active)!;
 // Fail atomically on malformed migration output rather than persist a
 // partially translated backup with misdirected original owner links.
 return parseState(JSON.stringify(copy));
}
