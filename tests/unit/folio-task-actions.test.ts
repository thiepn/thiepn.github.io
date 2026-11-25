import { expect,it } from 'vitest'
import {validFolioTaskActionResult} from '../../src/lib/workspace/folio-task-actions'
import {parseFolioTaskRead} from '../../src/lib/workspace/folio-task-read'
import {renderFolioTaskPreview} from '../../src/lib/workspace/folio-panel'

it('accepts only narrowly typed owner action results',()=>{
 expect(validFolioTaskActionResult({ok:true,message:'Task added',taskId:'source-id',
   updatedAt:'2026-11-17T10:00:00.000Z',undoId:'source-undo'})).toBe(true)
 expect(validFolioTaskActionResult({ok:false,code:'conflict',message:'Stale task'})).toBe(true)
 expect(validFolioTaskActionResult({ok:true,message:'done',taskId:null,updatedAt:'at'})).toBe(false)
 expect(validFolioTaskActionResult({ok:false,code:'admin',message:'no'})).toBe(false)
 expect(validFolioTaskActionResult(null)).toBe(false)
})
it('validates recent completed task metadata without altering open task counts',()=>{
 const now=Date.now()
 const d=new Date(now)
 const date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
 const source={schema:'thiepn:folio-hub-tasks',version:1,source:'folio-local-device',date,
   generatedAt:new Date(now).toISOString(),counts:{today:0,inbox:0,upcoming:0,later:0},
   totalCount:0,truncated:false,tasks:[],recentCompleted:[{id:'folio-completed',
   title:'Finished source task',updatedAt:new Date(now).toISOString(),completedAt:new Date(now).toISOString(),priority:'normal'}]}
 const snapshot=parseFolioTaskRead(source,now)
 expect(snapshot.totalCount).toBe(0)
 const html=renderFolioTaskPreview('ready',null,now,{status:'ready',snapshot,
   filter:'completed',write:{enabled:true,pending:false,message:'',failed:false,undoId:null}})
 expect(html).toContain('Finished source task')
 expect(html).toContain('data-action="folio-action-reopen"')
 expect(html).not.toContain('data-task-toggle')
 expect(html).not.toContain('type="checkbox"')
 expect(()=>parseFolioTaskRead({...source,recentCompleted:[{...source.recentCompleted[0],title:'<img>'}]},now)).not.toThrow()
 expect(()=>parseFolioTaskRead({...source,recentCompleted:[{...source.recentCompleted[0],id:''}]},now)).toThrow()
})
it('keeps read-only Stage 1B view free of Folio mutation controls without consent',()=>{
 const now=Date.now(),date=new Date(now)
 const day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
 const snapshot=parseFolioTaskRead({schema:'thiepn:folio-hub-tasks',version:1,source:'folio-local-device',
   date:day,generatedAt:new Date(now).toISOString(),totalCount:0,
   counts:{today:0,inbox:0,upcoming:0,later:0},truncated:false,tasks:[]},now)
 const html=renderFolioTaskPreview('ready',null,now,{status:'ready',snapshot,filter:'today',
   write:{enabled:false,pending:false,message:'',failed:false,undoId:null}})
 expect(html).toContain('Enable Folio task actions')
 expect(html).not.toContain('data-folio-create-form')
 expect(html).not.toContain('folio-action-complete')
})
