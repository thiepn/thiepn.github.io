import {sourceStatus, connectionErrorCode, ConnectionFailure, type ConnectedSource} from '../lib/providers/connection-state';
import {collectSummaries, type SummaryJob} from '../lib/providers/connected-summary';
import { hubConnections, hubRpc } from './hub-account';
import { validAccountId } from '../lib/hub-auth';
import { validateProviderEnvelope } from '../lib/providers/contract';
import registry from '../data/hub-providers.json';
import type { ProviderManifest, RequestContext } from '../lib/providers/types';
export interface ConnectedInsight { appId: string; title: string; detail: string; expiresAt: number; resourceId?:string; resumeUrl?:string }
export async function readConnectedApps(owner: string, signal: AbortSignal): Promise<ConnectedInsight[]> {
  for(const source of ['notes','library','tms60'] as const)sourceStatus(source,'checking');
  const access = await hubConnections(owner, signal).catch(error=>{if(!signal.aborted)for(const source of ['notes','library','tms60'] as const)sourceStatus(source,navigator.onLine?'error':'offline',{errorCode:connectionErrorCode(error,navigator.onLine)});throw error;});
  if(signal.aborted)return [];
  for(const source of ['notes','library','tms60'] as const)sourceStatus(source,'unconnected');
  const expiresAt = Date.now() + 60000;
  const requests:SummaryJob<ConnectedInsight>[]=[];
  const add=(source:ConnectedSource,read:(readSignal:AbortSignal)=>Promise<ConnectedInsight[]>)=>requests.push({source,read});
  if (access.notes.permissions.includes('notes.hub.summary.read') && validAccountId(access.notes.revision)) add('notes',async readSignal => {
    const rows = await hubRpc(owner,'read_thiepn_hub_notes',{p_operation:'summary',p_revision:access.notes.revision,p_query:null},readSignal);
    if (!Array.isArray(rows) || rows.length > 10 || rows.some(row => !row || row.user_id !== owner || !validAccountId(row.note_id) || typeof row.title !== 'string' || row.title.length > 501 || row.deleted_at || row.trashed_at || row.archived_at)) throw new ConnectionFailure('invalid-response','Notes metadata could not be verified.');
    return rows.map(row => ({appId:'notes',title:row.title || 'Untitled note',detail:'Notes · synced note',expiresAt,resourceId:row.note_id,resumeUrl:'https://thiepn.dev/notes/?note='+encodeURIComponent(row.note_id)}));
  });
  if (access.library) add('library',async readSignal => {
    const result = await hubRpc(owner,'read_thiepn_hub_library',{},readSignal) as {owner:string;items:{title:string;percentage:number|null}[]};
    if (!result || result.owner !== owner || !Array.isArray(result.items) || result.items.length > 10 || result.items.some(item => typeof item.title !== 'string' || item.title.length > 200 || (item.percentage !== null && (!Number.isInteger(item.percentage) || item.percentage < 0 || item.percentage > 100)))) throw new ConnectionFailure('invalid-response','Library metadata could not be verified.');
    return result.items.map(item => ({appId:'thiepn-library',title:item.title,detail:item.percentage === null ? 'Library · synced reading' : `Library · ${item.percentage}% read`,expiresAt}));
  });
  for (const consent of access.tms60) {
    if (!consent.permissions.includes('tms60.hub.summary.read') || !validAccountId(consent.revision) || !['esv','niv','nlt','hfa','schlachter1951','klb1985','krv1961'].includes(consent.translation)) continue;
    add('tms60',async readSignal => {
      const request: RequestContext = {providerId:'tms60',operation:'summary',requestId:crypto.randomUUID(),context:{scope:'account',accountId:owner,workspaceId:null,grantRevision:consent.revision,translationId:consent.translation}};
      const value = await hubRpc(owner,'read_thiepn_hub_tms60',{p_operation:'summary',p_revision:consent.revision,p_translation:consent.translation,p_request_id:request.requestId,p_query:null},readSignal);
      const manifest = registry.providers.find(p => p.id === 'tms60') as ProviderManifest;
      const envelope = validateProviderEnvelope(JSON.stringify(value),manifest,request);
      if (!envelope.data || !['ready','empty'].includes(envelope.status)) throw new ConnectionFailure(envelope.status==='unconnected'?'permission-required':'invalid-response','TMS60 summary is unavailable.');
      return [{appId:'tms60',title:`TMS60 · ${consent.translation.toUpperCase()}`,detail:`${envelope.data.dueTaskCount} reviews due · ${envelope.data.newVerseCount} new verses`,expiresAt:Math.min(expiresAt,Date.parse(envelope.expiresAt))}];
    });
  }
  return collectSummaries(requests,signal);
}
