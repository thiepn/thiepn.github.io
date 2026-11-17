import {expect,it} from 'vitest';
import {parseFolioTaskRead,freshFolioTaskRead,type FolioTaskReadSnapshot} from '../../src/lib/workspace/folio-task-read';
import {renderFolioTaskPreview} from '../../src/lib/workspace/folio-panel';
const now=Date.parse('2026-11-17T10:00:00Z');
const local=(()=>{const d=new Date(now);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})();
function source():FolioTaskReadSnapshot{return {
 schema:'thiepn:folio-hub-tasks',version:1,source:'folio-local-device',
 generatedAt:new Date(now).toISOString(),date:local,totalCount:3,
 counts:{today:1,inbox:1,upcoming:1,later:0},truncated:false,
 tasks:[
 {id:'owned-1',title:'Study exam',status:'todo',priority:'high',updatedAt:new Date(now).toISOString(),bucket:'today',plannedDate:local},
 {id:'owned-2',title:'Capture idea',status:'inbox',priority:'normal',updatedAt:new Date(now).toISOString(),bucket:'inbox'},
 {id:'owned-3',title:'<img src=x onerror=alert(1)>',status:'todo',priority:'normal',updatedAt:new Date(now).toISOString(),bucket:'upcoming'},
 ],
}}
it('accepts only same-day, recently read, bounded source-owned projections',()=>{
 const s=source();expect(parseFolioTaskRead(s,now).tasks).toHaveLength(3);
 expect(freshFolioTaskRead(s,now+89_999)).toBe(true);
 expect(freshFolioTaskRead(s,now+90_000)).toBe(false);
 expect(()=>parseFolioTaskRead({...s,counts:{today:4,inbox:0,upcoming:0,later:0}},now)).toThrow();
 expect(()=>parseFolioTaskRead({...s,truncated:true},now)).toThrow();
 expect(()=>parseFolioTaskRead({...s,tasks:[s.tasks[0],s.tasks[0],s.tasks[2]]},now)).toThrow();
 expect(()=>parseFolioTaskRead({...s,tasks:Array(161).fill(s.tasks[0])},now)).toThrow();
 expect(()=>parseFolioTaskRead(s,now+90_000)).toThrow();
 expect(()=>parseFolioTaskRead({...s,date:'2026-01-01'},now)).toThrow();
});
it('renders Folio-only filter counts and read-only rows without XSS or Hub writes',()=>{
 const s=source();
 const html=renderFolioTaskPreview('ready',null,now,{status:'ready',snapshot:s,filter:'upcoming'});
 expect(html).toContain('Showing 1 of 1 Folio tasks');
 expect(html).toContain('Next 7 days');
 expect(html).toContain('&lt;img');
 expect(html).not.toContain('<img src=');
 expect(html).not.toContain('type="checkbox"');
 expect(html).not.toContain('data-task-toggle');
 expect(html).not.toContain('data-action="complete');
 expect(html).toContain('data-action="folio-read-disconnect"');
 expect(renderFolioTaskPreview('ready',null,now,{status:'unavailable',snapshot:s,filter:'today'})).not.toContain('Study exam');
 expect(renderFolioTaskPreview('ready',null,now+90_000,{status:'ready',snapshot:s,filter:'today'})).not.toContain('Study exam');
});
