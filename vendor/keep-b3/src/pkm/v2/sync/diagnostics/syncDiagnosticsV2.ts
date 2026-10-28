/**
 * PKM V2.5 — Sync Diagnostics & Sanitized Telemetry Engine
 *
 * Provides structured sync reporting, standardized error codes, bounded operational
 * history, and sanitized support bundle exports (guaranteed free of secrets/bodies).
 */

import { SyncReportV2, SyncErrorCodeV2 } from '../syncTypes';

export const SYNC_ERROR_EXPLANATIONS: Record<SyncErrorCodeV2, { summary: string; userGuidance: string; localDataSafe: boolean }> = {
  SYNC_TRANSPORT_UNAVAILABLE: {
    summary: 'Network or remote sync endpoint is unreachable.',
    userGuidance: 'Your local changes are saved securely on this device. Sync will automatically resume when the connection returns.',
    localDataSafe: true,
  },
  SYNC_AUTH_EXPIRED: {
    summary: 'Remote authentication credentials have expired or are invalid.',
    userGuidance: 'Please update your Git token or credentials in Settings > Sync. Your local data remains completely safe.',
    localDataSafe: true,
  },
  SYNC_PROTOCOL_INCOMPATIBLE: {
    summary: 'Remote device or repository uses an incompatible sync protocol version.',
    userGuidance: 'Please update KeepNotes on all devices to version 2.5 or newer to ensure safe synchronization.',
    localDataSafe: true,
  },
  SYNC_SCHEMA_INCOMPATIBLE: {
    summary: 'Remote vault contains newer resource schemas not supported by this client.',
    userGuidance: 'This client is running an older schema version. Writes are temporarily paused to prevent corruption.',
    localDataSafe: true,
  },
  SYNC_REMOTE_REWRITTEN: {
    summary: 'Remote Git branch history has been force-pushed or rewritten externally.',
    userGuidance: 'Sync has paused safely to prevent data loss. Please use "Re-establish Sync Baseline" to reconcile changes.',
    localDataSafe: true,
  },
  SYNC_MERGE_CONFLICT: {
    summary: 'Concurrent changes detected across devices on one or more resources.',
    userGuidance: 'Local and remote versions have been preserved. Please open Conflict Center to choose your preferred version.',
    localDataSafe: true,
  },
  SYNC_APPLY_FAILED: {
    summary: 'Failed to atomically apply changes to local store.',
    userGuidance: 'The transaction was rolled back via Recovery Journal. Local state is intact; safe to retry.',
    localDataSafe: true,
  },
  SYNC_ATTACHMENT_HASH_MISMATCH: {
    summary: 'Attachment content checksum failed validation during transfer.',
    userGuidance: 'The downloaded chunk was rejected to prevent corrupting local files. The download will retry cleanly.',
    localDataSafe: true,
  },
  SYNC_BASELINE_MISSING: {
    summary: 'Common ancestor sync baseline could not be determined.',
    userGuidance: 'No common ancestor was found with the remote endpoint. Please preview and perform a baseline reconciliation.',
    localDataSafe: true,
  },
  SYNC_STORAGE_FULL: {
    summary: 'Local device storage quota is nearly full.',
    userGuidance: 'Canonical text and metadata remain safe. Attachment downloads have paused until device storage is freed.',
    localDataSafe: true,
  },
  SYNC_DIR_DISCONNECTED: {
    summary: 'Mirrored external directory or removable storage is disconnected.',
    userGuidance: 'Filesystem mirror has paused. No resources were deleted; sync will resume when the folder is reconnected.',
    localDataSafe: true,
  },
  SYNC_PERMISSION_DENIED: {
    summary: 'Local filesystem access permission was revoked or denied.',
    userGuidance: 'Please grant read/write permission to the designated storage directory in your browser or OS settings.',
    localDataSafe: true,
  },
};

export class SyncDiagnosticsV2 {
  private reports: SyncReportV2[] = [];
  private maxReports: number = 50;

  public recordReport(report: SyncReportV2): void {
    this.reports.unshift(report);
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(0, this.maxReports);
    }
  }

  public getRecentReports(): SyncReportV2[] {
    return [...this.reports];
  }

  public getLatestReport(): SyncReportV2 | undefined {
    return this.reports[0];
  }

  /**
   * Generates a fully sanitized diagnostic bundle suitable for troubleshooting.
   * Strips all note bodies, credentials, tokens, and file contents.
   */
  public generateSanitizedDiagnosticBundle(context: {
    deviceId: string;
    deviceName: string;
    protocolVersion: number;
    activeTransport: string;
    localResourceCount: number;
    tombstoneCount: number;
    attachmentCount: number;
    activeConflictsCount: number;
  }): string {
    const bundle = {
      generatedAt: new Date().toISOString(),
      appVersion: '2.5.0',
      device: {
        id: context.deviceId,
        name: context.deviceName,
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
        protocolVersion: context.protocolVersion,
      },
      stats: {
        activeTransport: context.activeTransport,
        localResourceCount: context.localResourceCount,
        tombstoneCount: context.tombstoneCount,
        attachmentCount: context.attachmentCount,
        activeConflictsCount: context.activeConflictsCount,
      },
      recentSyncRuns: this.reports.map(r => ({
        operationId: r.operationId,
        startedAt: r.startedAt,
        durationMs: r.durationMs,
        status: r.status,
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
        resourcesCompared: r.resourcesCompared,
        resourcesTransferred: r.resourcesTransferred,
        bytesTransferred: r.bytesTransferred,
        conflictsCount: r.conflictsCount,
        transportName: r.transportName,
      })),
    };

    return JSON.stringify(bundle, null, 2);
  }
}

export const globalSyncDiagnosticsV2 = new SyncDiagnosticsV2();
