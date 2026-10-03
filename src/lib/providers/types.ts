export type ProviderId = 'notes' | 'library' | 'tms60';
export type Operation = 'summary' | 'continue' | 'search';
export type ProviderStatus = 'ready' | 'empty' | 'unconnected' | 'unsupported' | 'offline' | 'stale' | 'error';
export type ProviderContext = { scope: 'account'; accountId: string; workspaceId: string | null; grantRevision: string; translationId: string | null } | { scope: 'device'; deviceId: string; consentRevision: string };
export interface RequestContext { providerId: ProviderId; operation: Operation; requestId: string; context: ProviderContext; query?: string; }
export interface ProviderManifest {
  id: ProviderId; appSlug: string; scope: 'account' | 'device'; coverage: string;
  privateReadsEnabled: boolean; inlineWritesEnabled: boolean;
  operations: { summary: boolean; continue: boolean; search: boolean; capture: boolean; inbox: boolean };
  requiredPermissions: Record<Operation, string>; actions: Record<string, string>;
}
export interface ContinueItem { resourceId: string; title: string; updatedAt: string; format?: 'epub' | 'pdf' | 'web'; edition?: number; releaseVersion?: string; current?: number; furthest?: number; dimension?: 'wording' | 'reference' | 'learning'; }
export interface ProviderData { items: ContinueItem[]; dueTaskCount?: number; dueVerseCount?: number; newVerseCount?: number; }
export interface ProviderEnvelope extends Omit<RequestContext, 'query'> {
  schemaVersion: 1; status: ProviderStatus; privacy: 'private'; coverage: string;
  observedAt: string; expiresAt: string; sourceUpdatedAt: string | null; data: ProviderData | null;
}
export interface ProviderResult { providerId: ProviderId; status: ProviderStatus; envelope?: ProviderEnvelope; }
// This snapshot is issued by an adapter's trusted authorization boundary. Frontend
// checks are leakage prevention, never substitutes for owner/server enforcement.
export interface ProviderAccess { providerId: ProviderId; context: ProviderContext; permissions: readonly string[]; expiresAt: number; }
export interface ProviderAdapter { manifest: ProviderManifest; read(request: RequestContext, signal: AbortSignal): Promise<string>; }
