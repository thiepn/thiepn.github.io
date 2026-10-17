/**
 * Phase P58 / V1.5: Unified Connector & Integration Framework
 * 
 * Provides a standardized contract for external data connectors (Gmail, Calendar, Drive, Readwise, etc.).
 * Guarantees:
 * 1. OAuth & API tokens remain centralized in secure platform storage; connectors never receive raw master keys.
 * 2. Connectors receive source-scoped permissions only, NEVER full vault access.
 * 3. Outbound network requests are bounded to declared provider origins.
 * 4. Connector errors are strictly isolated and never crash the Universal Inbox or core OS.
 * 5. Disconnecting a connector preserves all canonical notes/tasks previously created.
 */

export interface ConnectorCapabilities {
  canRead: boolean;
  canSearch: boolean;
  canMarkRead?: boolean;
  canArchive?: boolean;
  canDraftReply?: boolean;
  canSendReply?: boolean;
  canRsvp?: boolean;
  canDownloadFile?: boolean;
}

export interface ConnectorManifest {
  id: string; // e.g. "connector.google.gmail"
  name: string;
  version: string;
  category: 'email' | 'calendar' | 'files' | 'readwise' | 'rss' | 'custom';
  provider: string; // e.g. "Google Workspace"
  description: string;
  allowedOrigins: string[]; // e.g. ["https://gmail.googleapis.com"]
  requiredScopes: string[];
  capabilities: ConnectorCapabilities;
  privacyNotice: string;
}

export interface ConnectorSyncResult {
  success: boolean;
  itemsFetched: number;
  newItemsCount: number;
  cursor?: string;
  hasMore?: boolean;
  error?: string;
}

export interface ConnectorAuthContext {
  getAccessToken(): Promise<string>;
  isAuthorized(): Promise<boolean>;
  revokeAuth(): Promise<void>;
}

export interface ConnectorAdapter {
  manifest: ConnectorManifest;
  connect(auth: ConnectorAuthContext): Promise<void>;
  disconnect(): Promise<void>;
  getCapabilities(): ConnectorCapabilities;
  sync(cursor?: string): Promise<ConnectorSyncResult>;
}

export class ConnectorRegistry {
  private connectors = new Map<string, ConnectorAdapter>();
  private activeSessions = new Map<string, { connectedAt: number; cursor?: string; lastSync?: number }>();

  public register(adapter: ConnectorAdapter): void {
    if (!adapter.manifest.id) {
      throw new Error('Connector must have a valid manifest.id.');
    }
    this.connectors.set(adapter.manifest.id, adapter);
  }

  public unregister(id: string): void {
    this.connectors.delete(id);
    this.activeSessions.delete(id);
  }

  public get(id: string): ConnectorAdapter | undefined {
    return this.connectors.get(id);
  }

  public getAll(): ConnectorAdapter[] {
    return Array.from(this.connectors.values());
  }

  public async safeSync(connectorId: string): Promise<ConnectorSyncResult> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      return { success: false, itemsFetched: 0, newItemsCount: 0, error: `Connector "${connectorId}" not found.` };
    }

    try {
      const session = this.activeSessions.get(connectorId);
      const res = await connector.sync(session?.cursor);
      if (res.success) {
        this.activeSessions.set(connectorId, {
          connectedAt: session?.connectedAt || Date.now(),
          cursor: res.cursor,
          lastSync: Date.now(),
        });
      }
      return res;
    } catch (err: any) {
      // Strict Error Isolation: Never throw unhandled exceptions to callers
      return {
        success: false,
        itemsFetched: 0,
        newItemsCount: 0,
        error: `Connector execution failed safely: ${err.message}`,
      };
    }
  }

  public isOriginAllowed(connectorId: string, urlStr: string): boolean {
    const connector = this.connectors.get(connectorId);
    if (!connector) return false;
    try {
      const url = new URL(urlStr);
      const origin = url.origin;
      return connector.manifest.allowedOrigins.some((allowed) => {
        return allowed === origin || allowed === '*' || url.hostname.endsWith(allowed.replace('https://', '').replace('http://', ''));
      });
    } catch (e) {
      return false;
    }
  }
}

export const connectorRegistry = new ConnectorRegistry();
