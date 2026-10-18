import {describe,it,expect} from 'vitest';
import {initialState} from '../../src/lib/workspace/model';
import {clone,type Widget,type Workspace} from '../../src/lib/workspace/types';
import {assertWorkspaceMetadataRetained,hasWidgetOwnedRecords,workspaceOwnedSummary} from '../../src/lib/workspace/widget-metadata-safety';
const original=()=>initialState([],null).workspaces[0]!;
const categories=[
 ['record-pinboard','pins',[{id:'pin',type:'task',sourceId:'task'}]],
 ['outcome-board','outcomes',[{id:'outcome',title:'Learn analysis'}]],
 ['decision-register','decisions',[{id:'decision',title:'Research'}]],
 ['task-event-links','links',[{id:'link',taskId:'t',eventId:'e',role:'work'}]],
] as const;
describe('layout never erases Hub-owned metadata masquerading as widget content',()=>{
 for(const [type,key,records] of categories){
  it('protects nonempty '+type+' across widget removal, replacement and payload reset',()=>{
   const a=original(),w:Widget={id:'source',type,typeVersion:1,view:'detailed',
     config:{[key]:clone(records)},desktop:{x:0,y:0,w:6,h:34},order:a.widgets.length};
   a.widgets.push(w);
   expect(hasWidgetOwnedRecords(w)).toBe(true);
   const removed=clone(a);removed.widgets=removed.widgets.filter(x=>x.id!==w.id);
   expect(()=>assertWorkspaceMetadataRetained(a,removed)).toThrow('Remove or unlink');
   const emptied=clone(a);emptied.widgets.find(x=>x.id===w.id)!.config[key]=[];
   expect(()=>assertWorkspaceMetadataRetained(a,emptied)).toThrow('Remove or unlink');
   const cosmetic=clone(a);cosmetic.widgets.find(x=>x.id===w.id)!.view='compact';
   expect(()=>assertWorkspaceMetadataRetained(a,cosmetic)).not.toThrow();
   expect(workspaceOwnedSummary(a)).toHaveLength(1);
  });
 }
 it('does not prevent removal of empty widgets or unrelated presentation widgets',()=>{
  const w=original(),empty:Widget={id:'empty',type:'task-event-links',typeVersion:1,
    config:{links:[]},view:'detailed',desktop:{x:0,y:0,w:6,h:24},order:w.widgets.length};
  w.widgets.push(empty);
  expect(workspaceOwnedSummary(w)).toEqual([]);
  const next:Workspace=clone(w);next.widgets=[];
  expect(()=>assertWorkspaceMetadataRetained(w,next)).not.toThrow();
 });
});
