/**
 * Workspace widgets currently own these record groupings (not only presentation).
 * Never remove them through a layout operation advertised as content-preserving.
 * This protects both visual edits and preset/workspace replacement until a
 * separate schema/writer migration establishes durable record authority.
 */
import {clone,uid,stamp,type Workspace,type Widget} from './types';
const ownerKeys:Record<string,string>={
 'record-pinboard':'pins','outcome-board':'outcomes',
 'decision-register':'decisions','task-event-links':'links',
};
const labels:Record<string,string>={
 'record-pinboard':'pinned original records','outcome-board':'outcomes',
 'decision-register':'decision records','task-event-links':'task–calendar relationships',
};
export function hasWidgetOwnedRecords(widget:Widget|undefined):boolean{
 if(!widget)return false;
 const key=ownerKeys[widget.type];
 return !!key&&Array.isArray(widget.config[key])&&(widget.config[key] as unknown[]).length>0;
}
export function workspaceOwnedSummary(workspace:Workspace):string[]{
 return workspace.widgets.filter(hasWidgetOwnedRecords).map(widget=>labels[widget.type]??'original references');
}
export function assertWorkspaceMetadataRetained(before:Workspace,after:Workspace):void{
 for(const old of before.widgets){
  if(!hasWidgetOwnedRecords(old))continue;
  const key=ownerKeys[old.type]!,replacement=after.widgets.find(widget=>widget.id===old.id&&widget.type===old.type);
  if(!replacement||JSON.stringify(replacement.config[key])!==JSON.stringify(old.config[key]))
   throw Error('This layout contains '+(labels[old.type]??'original records')+
     '. Remove or unlink those records explicitly before replacing or removing their widget.');
 }
}

/**
 * "Duplicate workspace" and "recover layout as new" are presentation copies.
 * Hub-owned pin/outcome/decision/task-event records belong to the original
 * workspace. A new widget with fresh identity may provide the same affordances
 * but must start with no records, avoiding accidental cross-workspace cloning.
 */
export function duplicatePresentationLayout(original:Workspace,title:string):Workspace {
 if(!title.trim()||title.length>80)throw Error('Invalid duplicate workspace title.');
 const copy=clone(original);
 copy.id=uid();copy.title=title;copy.revision=0;copy.updatedAt=stamp();
 copy.widgets.forEach(widget=>{
  widget.id=uid();
  const key=ownerKeys[widget.type];
  if(key && Object.prototype.hasOwnProperty.call(widget.config,key))
   widget.config[key]=[];
 });
 return copy;
}
