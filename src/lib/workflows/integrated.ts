import {providerManifest} from '../providers/registry';
import {contextKey,validateProviderEnvelope} from '../providers/contract';
import {validAccountId} from '../hub-auth';
import {libraryContinueUrl} from '../hub-library-session';
import type {ProviderEnvelope,ContinueItem} from '../providers/types';
export type WorkflowSource='library'|'tms60';
export type WorkflowPreview={id:string;accountId:string;kind:'reading-note'|'due-review';title:string;destination:string;href:string;note?:{title:string;content:string};expiresAt:number};
/** Validated owner snapshots remain RAM-only. Every confirmation checks the
 * original snapshot/context, source freshness and selected destination account. */
export class IntegratedWorkflows{
 private sources=new Map<WorkflowSource,ProviderEnvelope>();
 private previews=new Map<string,{preview:WorkflowPreview;source:WorkflowSource;stamp:string}>();
 private listeners=new Set<()=>void>();
 constructor(private now=Date.now){}
 subscribe(fn:()=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn);};}
 private notify(){this.listeners.forEach(fn=>fn());}
 publish(raw:ProviderEnvelope){
  if(!['library','tms60'].includes(raw.providerId)||raw.operation==='search')return;
  const source=raw.providerId as WorkflowSource,manifest=structuredClone(providerManifest(source));manifest.privateReadsEnabled=true;
  const value=validateProviderEnvelope(JSON.stringify(raw),manifest,raw,this.now());
  this.clear(source,false);
  if(value.status==='ready'&&Date.parse(value.expiresAt)>this.now()&&(source!=='tms60'||value.operation==='summary'))this.sources.set(source,value);
  this.notify();
 }
 clear(source?:WorkflowSource,notify=true){if(source){this.sources.delete(source);for(const[id,v]of this.previews)if(v.source===source)this.previews.delete(id);}else{this.sources.clear();this.previews.clear();}if(notify)this.notify();}
 choices(source:WorkflowSource,accountId:string|null):ContinueItem[]{const e=this.sources.get(source);if(!accountId||!e||Date.parse(e.expiresAt)<=this.now()||e.context.scope==='account'&&e.context.accountId!==accountId)return[];return structuredClone(e.data?.items.filter(i=>source!=='tms60'||i.dimension==='wording'||i.dimension==='reference')??[]);}
 private stamp(e:ProviderEnvelope){return JSON.stringify([e.requestId,contextKey(e.context),e.observedAt,e.expiresAt]);}
 preview(source:WorkflowSource,resourceId:string,accountId:string):WorkflowPreview{
  if(!validAccountId(accountId))throw Error('Choose an account');
  const item=this.choices(source,accountId).find(i=>i.resourceId===resourceId),e=this.sources.get(source);
  if(!item||!e)throw Error('Refresh the source');
  const href=source==='library'?new URL(libraryContinueUrl(item),'https://thiepn.dev').href:'https://tms60.thiepn.dev/#hub='+encodeURIComponent(item.resourceId);
  const preview:WorkflowPreview={id:crypto.randomUUID(),accountId,kind:source==='library'?'reading-note':'due-review',title:item.title,destination:source==='library'?'Notes · Unfiled · selected Hub account':`TMS60 · ${e.context.scope==='account'?e.context.translationId:''} · ${item.dimension} recall`,href,expiresAt:Date.parse(e.expiresAt),...(source==='library'?{note:{title:'Reading notes — '+item.title,content:`Reading notes for ${item.title}\n\nSource: Library on this browser (not account-synced reading history).\nEdition: ${item.edition} · release: ${item.releaseVersion}\nCurrent progress: ${Math.round((item.current??0)*100)}% · furthest: ${Math.round((item.furthest??0)*100)}%\nSnapshot checked: ${e.observedAt}\nResume this edition: ${href}\n\nMy study notes:\n`}}:{})};
  this.previews.set(preview.id,{preview,source,stamp:this.stamp(e)});return structuredClone(preview);
 }
 cancel(id:string){this.previews.delete(id);}
 confirm(id:string,accountId:string):WorkflowPreview{
  const entry=this.previews.get(id),e=entry&&this.sources.get(entry.source);
  if(!entry||!e||accountId!==entry.preview.accountId||this.now()>=entry.preview.expiresAt||this.stamp(e)!==entry.stamp||e.context.scope==='account'&&e.context.accountId!==accountId)throw Error('Preview expired or account changed');
  return structuredClone(entry.preview);
 }
}
export const integratedWorkflows=new IntegratedWorkflows();
export type NoteDestination={available:()=>boolean;prepare:(accountId:string,note?:{title:string;content:string})=>void};
let noteDestination:NoteDestination|null=null;
export function registerNoteDestination(destination:NoteDestination){noteDestination=destination;return()=>{if(noteDestination===destination)noteDestination=null;};}
export function prepareWorkflowNote(accountId:string,note?:{title:string;content:string}){if(!noteDestination?.available())throw Error('Notes capture is unavailable');noteDestination.prepare(accountId,note);}
