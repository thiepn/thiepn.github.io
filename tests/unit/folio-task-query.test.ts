import {expect,it} from 'vitest';
import {parseFolioTaskQueryResult,validFolioTaskQueryInput,
  type FolioTaskQueryInput} from '../../src/lib/workspace/folio-task-query';
const now=Date.now(), date=new Date(now);
const day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const at=new Date(now).toISOString();
const input:FolioTaskQueryInput={filter:'all',search:'',projectId:'all',page:0};
const row=(id:string)=>({id,title:'Source task '+id,status:'todo',priority:'normal',updatedAt:at,bucket:'today',plannedDate:day});
function source(p=0,total=41){
 const q={...input,page:p};
 const size=Math.max(0,Math.min(40,total-p*40));
 return {...q,schema:'thiepn:folio-hub-task-query',version:1,source:'folio-local-device',
   generatedAt:at,date:day,pageSize:40,revision:'a'.repeat(64),total,hasMore:p*40+size<total,
   rows:Array.from({length:size},(_,i)=>row('item-'+(p*40+i)))};
}
it('validates bounded source page completeness and rejects forged scope or stale timestamps',()=>{
 expect(validFolioTaskQueryInput(input)).toBe(true);
 expect(validFolioTaskQueryInput({...input,page:10000})).toBe(false);
 expect(validFolioTaskQueryInput({...input,search:'a'.repeat(101)})).toBe(false);
 const p0=parseFolioTaskQueryResult(source(),input,now);
 expect(p0.rows).toHaveLength(40);expect(p0.hasMore).toBe(true);
 expect(parseFolioTaskQueryResult({...source(1),expectedRevision:'a'.repeat(64)},
   {...input,page:1,expectedRevision:'a'.repeat(64)},now).rows).toHaveLength(1);
 expect(()=>parseFolioTaskQueryResult({...source(),revision:'invalid'},input,now)).toThrow();
 expect(()=>parseFolioTaskQueryResult({...source(1),expectedRevision:'a'.repeat(64),
   revision:'b'.repeat(64)},{...input,page:1,expectedRevision:'a'.repeat(64)},now)).toThrow();
 expect(()=>parseFolioTaskQueryResult({...source(),filter:'completed'},input,now)).toThrow();
 expect(()=>parseFolioTaskQueryResult({...source(),rows:source().rows.slice(0,2)},input,now)).toThrow();
 expect(()=>parseFolioTaskQueryResult({...source(),generatedAt:new Date(now-91000).toISOString()},input,now)).toThrow();
 expect(()=>parseFolioTaskQueryResult({...source(),rows:[...source().rows.slice(0,39),row('item-1')]},input,now)).toThrow();
});
it('accepts completed pages but blocks cross-status/project data',()=>{
 const complete:FolioTaskQueryInput={filter:'completed',search:'study',projectId:'project-1',page:0};
 const result={...source(0,1),...complete,total:1,hasMore:false,rows:[{...row('done-1'),status:'completed',bucket:'completed',projectId:'project-1'}]};
 expect(parseFolioTaskQueryResult(result,complete,now).rows).toHaveLength(1);
 expect(()=>parseFolioTaskQueryResult({...result,rows:[{...row('done-1'),status:'todo'}]},complete,now)).toThrow();
 expect(()=>parseFolioTaskQueryResult({...result,rows:[{...result.rows[0],projectId:'other'}]},complete,now)).toThrow();
});
