export type ConnectionStatus='unconnected'|'checking'|'ready'|'empty'|'offline'|'error'|'hidden';
export type ConnectedSource='notes'|'library'|'tms60';
export interface SourceState {source:ConnectedSource;status:ConnectionStatus;checkedAt:number|null}
const states=new Map<ConnectedSource,SourceState>();
const listeners=new Set<()=>void>();
export function sourceStates():SourceState[]{return structuredClone([...states.values()]);}
export function sourceStatus(source:ConnectedSource,status:ConnectionStatus){states.set(source,{source,status,checkedAt:Date.now()});for(const listener of listeners)listener();}
export function clearSourceStates(){states.clear();for(const listener of listeners)listener();}
export function listenSourceStates(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener);}
export function safeDiagnostics(){return {schemaVersion:1,createdAt:new Date().toISOString(),sources:sourceStates().map(({source,status,checkedAt})=>({source,status,checkedAt})),online:typeof navigator==='undefined'?null:navigator.onLine};}
