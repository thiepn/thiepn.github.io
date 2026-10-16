export const CONNECTED_SOURCES = ['notes', 'library', 'tms60'] as const;
export type ConnectedSource = typeof CONNECTED_SOURCES[number];
export const CONNECTION_STATUSES = ['unconnected', 'checking', 'ready', 'empty', 'offline', 'error', 'hidden', 'stale', 'partial', 'revoked'] as const;
export type ConnectionStatus = typeof CONNECTION_STATUSES[number];
export const CONNECTION_ERROR_CODES = ['session-required', 'session-changed', 'permission-required', 'network-unavailable', 'deadline-exceeded', 'service-unavailable', 'rate-limited', 'invalid-response', 'read-unavailable'] as const;
export type ConnectionErrorCode = typeof CONNECTION_ERROR_CODES[number];
export class ConnectionFailure extends Error {
  constructor(readonly code: ConnectionErrorCode, message: string) { super(message); this.name = 'ConnectionFailure'; }
}
export function connectionErrorCode(error: unknown, online = true): ConnectionErrorCode {
  if (error instanceof ConnectionFailure) return error.code;
  if (!online) return 'network-unavailable';
  if (error instanceof Error && error.name === 'TimeoutError') return 'deadline-exceeded';
  if (error instanceof TypeError) return 'network-unavailable';
  return 'read-unavailable';
}
export interface SourceState {
  source: ConnectedSource;
  status: ConnectionStatus;
  checkedAt: number | null;
  lastSuccessAt: number | null;
  expiresAt: number | null;
  errorCode: ConnectionErrorCode | null;
}
const states = new Map<ConnectedSource, SourceState>();
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };
export function sourceStates(now = Date.now()): SourceState[] {
  return structuredClone([...states.values()].map(row =>
    ['ready','empty','partial'].includes(row.status) && row.expiresAt !== null && row.expiresAt <= now
      ? {...row, status:'stale' as const} : row));
}
export function sourceStatus(source: ConnectedSource, status: ConnectionStatus, details: {expiresAt?: number; errorCode?: ConnectionErrorCode} = {}) {
  if (!(CONNECTED_SOURCES as readonly string[]).includes(source) || !(CONNECTION_STATUSES as readonly string[]).includes(status)
    || (details.errorCode && !(CONNECTION_ERROR_CODES as readonly string[]).includes(details.errorCode))) throw new Error('Invalid connection status');
  const now = Date.now(), previous = states.get(source);
  const success = ['ready','empty','partial'].includes(status);
  const expiry = success ? Math.min(now + 60_000, details.expiresAt ?? now + 60_000) : null;
  if (expiry !== null && !Number.isFinite(expiry)) throw new Error('Invalid connection expiry');
  states.set(source, {source, status, checkedAt:status === 'checking' ? previous?.checkedAt ?? null : now,
    lastSuccessAt:success ? now : previous?.lastSuccessAt ?? null, expiresAt:expiry,
    errorCode:details.errorCode ?? null});
  emit();
}
export function clearSourceStates() { states.clear(); emit(); }
export function listenSourceStates(listener: () => void) { listeners.add(listener); return () => {listeners.delete(listener);}; }
export function safeDiagnostics() {
  return {schemaVersion:2, createdAt:new Date().toISOString(), sources:sourceStates().map(({source,status,checkedAt,lastSuccessAt,expiresAt,errorCode}) =>
    ({source,status,checkedAt,lastSuccessAt,expiresAt,errorCode})), online:typeof navigator === 'undefined' ? null : navigator.onLine};
}
export function sourcePresentation(row: SourceState | undefined, signedIn: boolean, hidden=false) {
  if(hidden)return {label:'Personal content hidden',repair:'none',action:''};
  if (!signedIn) return {label:'Account not connected', repair:'account', action:'Connect Account'};
  if (!row) return {label:'Not checked yet', repair:'retry', action:'Check connection'};
  const labels: Record<ConnectionStatus,string> = {
    unconnected:'Sharing not enabled', checking:'Checking sharing…', ready:'Connected · fresh summary',
    empty:'Connected · no matching records', offline:'Offline', error:'Read unavailable', hidden:'Personal content hidden',
    stale:'Summary expired', partial:'Connected · some reads failed', revoked:'Sharing needs attention',
  };
  if (row.errorCode === 'session-required' || row.errorCode === 'session-changed') return {label:'Account needs reconnecting',repair:'account',action:'Reconnect Account'};
  if (row.status === 'unconnected' || row.status === 'revoked' || row.errorCode === 'permission-required') return {label:labels[row.status],repair:'sharing',action:'Review sharing'};
  return {label:labels[row.status], repair:['checking','hidden'].includes(row.status)?'none':'retry', action:row.status==='offline'?'Retry when online':'Refresh summary'};
}
