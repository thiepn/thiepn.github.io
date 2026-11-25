import {expect,it} from 'vitest';
import {DEFAULT_FOLIO_TASK_VIEW,selectFolioTaskView} from '../../src/lib/workspace/folio-task-ux';
import {parseFolioTaskRead} from '../../src/lib/workspace/folio-task-read';
import {renderFolioTaskPreview} from '../../src/lib/workspace/folio-panel';
const now=Date.now();
const d=new Date(now);
const today=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const at=new Date(now).toISOString();
function source(){
 return parseFolioTaskRead({
 schema:'thiepn:folio-hub-tasks',version:1,source:'folio-local-device',
 date:today,generatedAt:at,totalCount:4,truncated:false,
 counts:{today:2,inbox:1,upcoming:1,later:0},
 availableProjects:[{id:'p1',name:'Math & Statistics'},{id:'p2',name:'Other studies'}],
 availableLists:[{id:'l1',name:'Focus list'}],contextTruncated:false,
 tasks:[
 {id:'a',title:'Prepare DGL exam',updatedAt:at,status:'todo',priority:'high',bucket:'today',projectId:'p1',projectName:'Math & Statistics',listId:'l1',listName:'Focus list'},
 {id:'b',title:'Unassigned capture',updatedAt:at,status:'todo',priority:'normal',bucket:'today'},
 {id:'c',title:'Reading notes',updatedAt:at,status:'inbox',priority:'normal',bucket:'inbox',projectId:'p2',projectName:'Other studies'},
 {id:'d',title:'Another course',updatedAt:at,status:'todo',priority:'normal',bucket:'upcoming',projectId:'p1',projectName:'Math & Statistics'},
 ],recentCompleted:[],
 },now);
}
it('selects title, source project and list and separates no-project tasks without copying state',()=>{
 const snapshot=source();
 const math=selectFolioTaskView(snapshot,'all',{search:'statistics',projectId:'all',group:'bucket'});
 expect(math.rows.map(t=>t.id)).toEqual(['a','d']);
 const list=selectFolioTaskView(snapshot,'all',{search:'focus list',projectId:'all',group:'none'});
 expect(list.rows.map(t=>t.id)).toEqual(['a']);
 const unassigned=selectFolioTaskView(snapshot,'all',{search:'',projectId:'none',group:'project'});
 expect(unassigned.rows.map(t=>t.id)).toEqual(['b']);
 const grouped=selectFolioTaskView(snapshot,'all',{search:'',projectId:'all',group:'project'});
 expect(grouped.sections.map(s=>s.title)).toEqual(['Math & Statistics','No project','Other studies']);
 expect(DEFAULT_FOLIO_TASK_VIEW).toEqual({search:'',projectId:'all',group:'bucket'});
 expect(snapshot.totalCount).toBe(4);
});
it('escapes source context and narrows filter locally without claiming the full source was searched',()=>{
 const snapshot=source();
 const html=renderFolioTaskPreview('ready',null,now,{
 status:'ready',snapshot,filter:'all',view:{search:'DGL',projectId:'all',group:'project'},
 write:{enabled:true,pending:false,message:'',failed:false,undoId:null},
 });
 expect(html).toContain('Showing 1 matching of 4 loaded Folio tasks');
 expect(html).toContain('Math &amp; Statistics');
 expect(html).toContain('Folio task title');
 expect(html).toContain('Capture to Inbox');
 expect(html).toContain('Folio create project');
 expect(html).toContain('Folio create list');
 expect(html).not.toContain('data-task-toggle');
 const malicious=structuredClone(snapshot) as any;
 malicious.availableProjects=[{id:'p1',name:'<script>alert(1)</script>'}];
 malicious.tasks=[{...malicious.tasks[0],projectName:'<img src=x onerror=alert(1)>'}];
 malicious.totalCount=1;malicious.counts={today:1,inbox:0,upcoming:0,later:0};
 const render=renderFolioTaskPreview('ready',null,now,{
 status:'ready',snapshot:malicious,filter:'all',view:{search:'',projectId:'all',group:'project'},
 write:{enabled:false,pending:false,message:'',failed:false,undoId:null},
 });
 expect(render).toContain('&lt;img');
 expect(render).not.toContain('<img src=');
 expect(render).not.toContain('<script>');
});
it('rejects malformed project/list choices and task labels, while preserving historical Stage 1B schema',()=>{
 const snapshot=source();
 expect(()=>parseFolioTaskRead({...snapshot,availableProjects:[{id:'p1',name:'bad'},{id:'p1',name:'dup'}]},now)).toThrow();
 expect(()=>parseFolioTaskRead({...snapshot,tasks:[{...snapshot.tasks[0],projectName:'without-id',projectId:undefined},...snapshot.tasks.slice(1)]},now)).toThrow();
 expect(()=>parseFolioTaskRead({...snapshot,contextTruncated:'yes'},now)).toThrow();
 const old={...snapshot};delete (old as any).availableProjects;delete (old as any).availableLists;delete (old as any).contextTruncated;
 expect(parseFolioTaskRead(old,now).tasks).toHaveLength(4);
});
