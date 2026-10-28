/**
 * Phase P58 — External Connector Registry & Capability Provider
 * 
 * Manages supported external source providers (Email, Calendar, Files, Plugins).
 * Declares fine-grained capabilities and safe adapter execution boundaries.
 */

import { ExternalSource, ExternalCapabilities } from './inboxTypes';

export interface ProviderDefinition {
  id: string;
  kind: 'email' | 'calendar' | 'files' | 'plugin';
  name: string;
  description: string;
  defaultCapabilities: ExternalCapabilities;
  supportedAuth: ('oauth_popup' | 'device_token' | 'filesystem_path' | 'plugin_grant')[];
  iconName: string;
  privacyNotice: string;
}

export const SUPPORTED_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'gmail',
    kind: 'email',
    name: 'Gmail (Google Workspace)',
    description: 'Read recent inbox messages, view threads, create draft replies, and archive messages.',
    defaultCapabilities: {
      canRead: true,
      canMarkRead: true,
      canArchive: true,
      canDraftReply: true,
      canSendReply: true,
      canRsvp: false,
      canDownloadFile: true,
      canSearchRemote: true,
    },
    supportedAuth: ['oauth_popup', 'device_token'],
    iconName: 'Mail',
    privacyNotice: 'Tokens remain device-local. Message bodies are lazy-loaded on demand and never serialized to Git.',
  },
  {
    id: 'outlook',
    kind: 'email',
    name: 'Microsoft Outlook / Office 365',
    description: 'Read mail headers, triage action items, and draft responses.',
    defaultCapabilities: {
      canRead: true,
      canMarkRead: true,
      canArchive: true,
      canDraftReply: true,
      canSendReply: true,
      canRsvp: false,
      canDownloadFile: true,
      canSearchRemote: true,
    },
    supportedAuth: ['oauth_popup'],
    iconName: 'Mail',
    privacyNotice: 'No IMAP passwords requested. Uses OAuth standard scopes.',
  },
  {
    id: 'google_calendar',
    kind: 'calendar',
    name: 'Google Calendar',
    description: 'Project scheduled meetings, surface attendee updates, and respond with RSVP status.',
    defaultCapabilities: {
      canRead: true,
      canMarkRead: false,
      canArchive: false,
      canDraftReply: false,
      canSendReply: false,
      canRsvp: true,
      canDownloadFile: false,
      canSearchRemote: true,
    },
    supportedAuth: ['oauth_popup'],
    iconName: 'Calendar',
    privacyNotice: 'Events remain projected. Does not duplicate meetings into secondary databases unless explicitly imported.',
  },
  {
    id: 'ical_dav',
    kind: 'calendar',
    name: 'CalDAV / iCal Subscription',
    description: 'Read-only calendar feed for shared team calendars or public schedules.',
    defaultCapabilities: {
      canRead: true,
      canMarkRead: false,
      canArchive: false,
      canDraftReply: false,
      canSendReply: false,
      canRsvp: false,
      canDownloadFile: false,
      canSearchRemote: false,
    },
    supportedAuth: ['device_token'],
    iconName: 'Calendar',
    privacyNotice: 'Feed is queried locally on demand.',
  },
  {
    id: 'google_drive',
    kind: 'files',
    name: 'Google Drive (Shared Docs)',
    description: 'Surface documents shared with you and inspect external file metadata.',
    defaultCapabilities: {
      canRead: true,
      canMarkRead: false,
      canArchive: false,
      canDraftReply: false,
      canSendReply: false,
      canRsvp: false,
      canDownloadFile: true,
      canSearchRemote: true,
    },
    supportedAuth: ['oauth_popup'],
    iconName: 'Folder',
    privacyNotice: 'Metadata only. File bytes are only downloaded when explicitly imported into the vault as attachments.',
  },
  {
    id: 'local_folder',
    kind: 'files',
    name: 'Local Drop / Intake Folder',
    description: 'Monitor a dedicated local directory for PDF receipts, research documents, or scanned receipts.',
    defaultCapabilities: {
      canRead: true,
      canMarkRead: false,
      canArchive: true,
      canDraftReply: false,
      canSendReply: false,
      canRsvp: false,
      canDownloadFile: true,
      canSearchRemote: true,
    },
    supportedAuth: ['filesystem_path'],
    iconName: 'HardDrive',
    privacyNotice: 'Filesystem bridge sandboxed access.',
  },
  {
    id: 'custom_plugin',
    kind: 'plugin',
    name: 'Plugin Information Stream',
    description: 'Ingest notification signals from sandboxed PKM plugins.',
    defaultCapabilities: {
      canRead: true,
      canMarkRead: true,
      canArchive: false,
      canDraftReply: false,
      canSendReply: false,
      canRsvp: false,
      canDownloadFile: false,
      canSearchRemote: false,
    },
    supportedAuth: ['plugin_grant'],
    iconName: 'Puzzle',
    privacyNotice: 'Plugin access governed by explicit P41 capability permissions.',
  },
];

export class ConnectorRegistry {
  public getSupportedProviders(): ProviderDefinition[] {
    return SUPPORTED_PROVIDERS;
  }

  public getProvider(id: string): ProviderDefinition | undefined {
    return SUPPORTED_PROVIDERS.find((p) => p.id === id);
  }

  public createSource(
    providerId: string,
    displayName: string,
    accountIdentifier?: string
  ): ExternalSource {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Unsupported provider ID: ${providerId}`);
    }

    return {
      id: `src-${providerId}-${Date.now().toString(36)}`,
      kind: provider.kind,
      provider: providerId as any,
      displayName: displayName || provider.name,
      accountIdentifier: accountIdentifier || 'user@example.com',
      status: 'connected',
      capabilities: { ...provider.defaultCapabilities },
      lastSyncAt: new Date().toISOString(),
      itemCount: 0,
      cacheSizeBytes: 0,
      routingRules: [],
      authConfig: {
        isAuthorizedLocally: true,
        scopesGranted: ['read', 'metadata'],
      },
    };
  }
}

export const connectorRegistry = new ConnectorRegistry();
