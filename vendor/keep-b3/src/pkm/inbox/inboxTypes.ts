/**
 * Phase P58 — Universal Inbox, Communications & External Information Flow
 * 
 * Core Principle: External systems remain the source of truth for external communications.
 * The PKM retrieves only explicitly authorized information, presents it for controlled
 * triage, and creates canonical local knowledge only when the user chooses to preserve or act on it.
 */

export type InboxItemSource =
  | 'local-capture'
  | 'email'
  | 'calendar'
  | 'file'
  | 'plugin'
  | 'system';

export type InboxState =
  | 'new'
  | 'seen'
  | 'processing'
  | 'processed'
  | 'snoozed'
  | 'dismissed';

export type RSVPStatus = 'needsAction' | 'accepted' | 'tentative' | 'declined';

export interface ExternalResourceRef {
  connectorId: string;
  resourceType: 'email_message' | 'email_thread' | 'calendar_event' | 'file' | 'plugin_item' | 'local_capture';
  resourceId: string; // Stable provider ID
  sourceAccountId?: string;
  version?: string;
  modifiedAt?: string;
  webUrl?: string;
  providerMetadata?: Record<string, any>;
}

export interface ExternalAttachmentMeta {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  downloadUrl?: string;
  isImportedToVault?: boolean;
  vaultAttachmentId?: string;
}

export interface ExternalState {
  isRead?: boolean;
  isArchived?: boolean;
  rsvpStatus?: RSVPStatus;
  isImportant?: boolean;
  isStarred?: boolean;
  hasChangedExternally?: boolean;
  isUnavailableExternally?: boolean;
  externalLabel?: string;
}

export interface SourceProvenance {
  sourceRef: ExternalResourceRef;
  capturedAt: string;
  sourceVersion?: string;
  stale?: boolean;
  providerName?: string;
  sourcePermalink?: string;
}

export interface GeneratedArtifactRef {
  type:
    | 'task'
    | 'note'
    | 'interaction'
    | 'project_link'
    | 'decision_evidence'
    | 'finance_proposal'
    | 'travel_proposal'
    | 'asset_doc'
    | 'library_item'
    | 'media_attachment';
  id: string;
  title: string;
  createdAt: string;
  targetId?: string;
}

export interface ProcessingAuditEntry {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
  artifactId?: string;
  userInitiated: boolean;
}

export interface UniversalInboxItem {
  id: string;
  source: InboxItemSource;
  externalRef?: ExternalResourceRef;
  title: string;
  preview?: string;
  senderOrOwner?: string;
  senderEmail?: string;
  recipientEmails?: string[];
  receivedAt?: string; // ISO String
  state: InboxState; // Local triage state (never auto-mirrored to external)
  externalState?: ExternalState; // Provider-owned state (Read/Archived/RSVP)
  actionable?: boolean;
  snoozedUntil?: string; // ISO date string
  cachedContentAvailable?: boolean;
  contentExcerpt?: string;
  htmlBodySanitized?: string;
  rawTextBody?: string;
  remoteImagesBlocked?: boolean;
  attachmentsMeta?: ExternalAttachmentMeta[];
  threadMeta?: {
    threadId: string;
    messageCount: number;
    participants: string[];
    snippet?: string;
  };
  calendarMeta?: {
    startTime: string;
    endTime: string;
    location?: string;
    status?: string;
    isCancelled?: boolean;
    attendees?: { email: string; name?: string; rsvp?: RSVPStatus }[];
    isOrganizer?: boolean;
    meetingUrl?: string;
    summaryDiff?: string;
  };
  fileMeta?: {
    mimeType: string;
    sizeBytes?: number;
    fileExtension?: string;
    ownerName?: string;
    webViewLink?: string;
    downloadUrl?: string;
    lastModifiedRemote?: string;
    isSharedWithMe?: boolean;
  };
  matchedPersonId?: string;
  matchedPersonName?: string;
  matchedProjectId?: string;
  matchedProjectTitle?: string;
  generatedArtifacts?: GeneratedArtifactRef[];
  processingHistory?: ProcessingAuditEntry[];
  provenance: SourceProvenance;
  createdAt: number;
  updatedAt: number;
}

export interface ExternalCapabilities {
  canRead: boolean;
  canMarkRead: boolean;
  canArchive: boolean;
  canDraftReply: boolean;
  canSendReply: boolean; // Requires explicit final confirmation modal
  canRsvp: boolean;
  canDownloadFile: boolean;
  canSearchRemote: boolean;
}

export interface SourceRoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  field: 'sender' | 'domain' | 'subject' | 'label' | 'file_type';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with';
  value: string;
  action: 'include_inbox' | 'exclude_inbox' | 'tag_local' | 'suggest_project' | 'suggest_domain';
  targetValue?: string;
}

export interface ExternalSource {
  id: string;
  kind: 'email' | 'calendar' | 'files' | 'plugin';
  provider: 'gmail' | 'outlook' | 'google_calendar' | 'ical_dav' | 'google_drive' | 'nextcloud_webdav' | 'local_folder' | 'custom_plugin';
  displayName: string;
  accountIdentifier?: string;
  status: 'connected' | 'disconnected' | 'error' | 'reauthorization-required';
  capabilities: ExternalCapabilities;
  lastSyncAt?: string;
  syncError?: string;
  syncIntervalMinutes?: number;
  itemCount?: number;
  cacheSizeBytes?: number;
  routingRules?: SourceRoutingRule[];
  authConfig?: {
    isAuthorizedLocally: boolean;
    tokenExpiresAt?: string;
    scopesGranted: string[];
  };
}

export interface AITriageProposal {
  inboxItemId: string;
  summary: string;
  suggestedAction:
    | 'no_action'
    | 'create_task'
    | 'save_note'
    | 'log_interaction'
    | 'link_project'
    | 'finance_review'
    | 'travel_reservation'
    | 'asset_document'
    | 'decision_evidence';
  suggestedTitle?: string;
  suggestedDueDate?: string;
  suggestedProjectId?: string;
  suggestedProjectTitle?: string;
  suggestedPersonId?: string;
  suggestedPersonName?: string;
  draftReplyContent?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface UniversalInboxFilter {
  tab: 'all' | 'local' | 'email' | 'calendar' | 'files' | 'snoozed' | 'processed' | 'dismissed';
  searchQuery: string;
  sourceFilter: string; // 'all' or connectorId
  actionableOnly: boolean;
  unseenOnly: boolean;
  projectId?: string;
  personId?: string;
}
