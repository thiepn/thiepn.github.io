/**
 * PKM V2.5 — Transport Adapter Interface
 *
 * Transports are strictly responsibility-segregated: they handle fetching remote bytes/manifests,
 * pushing local bytes/manifests, and reporting network/auth status. Transports DO NOT own or duplicate
 * three-way merge, conflict resolution, or tombstone logic!
 */

import {
  SyncResourceEnvelope,
  SyncManifestV2,
  ProtocolHandshakeV2,
  SyncErrorCodeV2,
  AttachmentEnvelopeV2,
} from '../syncTypes';

export interface TransportFetchResultV2 {
  success: boolean;
  remoteManifest?: SyncManifestV2;
  changedResources?: SyncResourceEnvelope[];
  changedAttachments?: AttachmentEnvelopeV2[];
  remoteRevision?: string;
  isRewrittenHistory?: boolean;
  errorCode?: SyncErrorCodeV2;
  errorMessage?: string;
}

export interface TransportPushResultV2 {
  success: boolean;
  newRemoteRevision?: string;
  bytesUploaded?: number;
  errorCode?: SyncErrorCodeV2;
  errorMessage?: string;
}

export interface ITransportAdapterV2 {
  readonly id: string;
  readonly name: string;
  readonly classification: 'stable' | 'beta' | 'experimental';

  isConfigured(): boolean;
  isAuthenticated(): boolean;
  isAvailable(): Promise<boolean>;

  handshake(localHandshake: ProtocolHandshakeV2): Promise<{
    success: boolean;
    remoteHandshake?: ProtocolHandshakeV2;
    compatible: boolean;
    errorCode?: SyncErrorCodeV2;
    errorMessage?: string;
  }>;

  fetchRemoteChanges(lastKnownRemoteRevision?: string): Promise<TransportFetchResultV2>;

  pushLocalChanges(
    envelopesToPush: SyncResourceEnvelope[],
    attachmentsToPush?: AttachmentEnvelopeV2[],
    updatedManifest?: SyncManifestV2
  ): Promise<TransportPushResultV2>;
}
