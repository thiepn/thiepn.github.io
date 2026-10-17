/**
 * PKM V2.4 — Continuity & Resume Engine V2
 *
 * Answers: "Where did I leave off? Where should I continue?"
 * - Deterministic signal hierarchy (No AI guesswork or engagement scoring)
 *   1. Explicit pinned / working resource
 *   2. Unfinished active sessions (Incomplete Review, Active Routine Run)
 *   3. Last meaningful Context / Project
 *   4. Recent user-chosen active work
 * - Separates Synced Semantic Resume from Device-Local UI Geometry
 * - Stale item demotion (> 30 days) and automated removal on completion/archival
 * - Bounded continue proposals (1 to 3 top items maximum)
 */

import { ResourceType, ResourceRef } from '../core/resource/resourceCore';

export type ResumeConfidence = 'pinned' | 'active_session' | 'recent_working' | 'context_recent';

export interface SemanticResumeCheckpoint {
  id: string; // resourceId or sessionId
  resourceRef: ResourceRef;
  contextId?: string;
  contextTitle?: string;
  confidence: ResumeConfidence;
  lastActiveTimestamp: string; // ISO UTC Instant
  isPinned?: boolean;
  activeSessionType?: 'review' | 'routine' | 'study' | 'draft';
  progressSummary?: string; // e.g. "Step 3 of 5 completed", "Draft in progress"
}

export interface DeviceLocalUiResumeState {
  resourceId: string;
  cursorLine?: number;
  scrollOffset?: number;
  pdfPage?: number;
  activeTabId?: string;
  workspacePreset?: string;
  updatedAt: string;
}

export class ContinuityEngineV2 {
  private semanticCheckpoints = new Map<string, SemanticResumeCheckpoint>();
  private deviceLocalUiState = new Map<string, DeviceLocalUiResumeState>();
  private maxStoredCheckpoints = 20;

  /**
   * Records or updates a semantic resume checkpoint
   */
  public recordCheckpoint(checkpoint: Omit<SemanticResumeCheckpoint, 'lastActiveTimestamp'> & { timestamp?: string }): SemanticResumeCheckpoint {
    const lastActiveTimestamp = checkpoint.timestamp || new Date().toISOString();
    const fullCheckpoint: SemanticResumeCheckpoint = {
      ...checkpoint,
      lastActiveTimestamp,
    };

    this.semanticCheckpoints.set(fullCheckpoint.id, fullCheckpoint);

    // Bound memory storage
    if (this.semanticCheckpoints.size > this.maxStoredCheckpoints) {
      const oldestKey = Array.from(this.semanticCheckpoints.entries())
        .filter(([_, cp]) => !cp.isPinned)
        .sort((a, b) => new Date(a[1].lastActiveTimestamp).getTime() - new Date(b[1].lastActiveTimestamp).getTime())[0]?.[0];
      
      if (oldestKey) {
        this.semanticCheckpoints.delete(oldestKey);
      }
    }

    return fullCheckpoint;
  }

  /**
   * Records device-local UI layout/cursor state (never synced to avoid hijacking other devices)
   */
  public recordLocalUiState(state: Omit<DeviceLocalUiResumeState, 'updatedAt'>): void {
    this.deviceLocalUiState.set(state.resourceId, {
      ...state,
      updatedAt: new Date().toISOString(),
    });
  }

  public getLocalUiState(resourceId: string): DeviceLocalUiResumeState | undefined {
    return this.deviceLocalUiState.get(resourceId);
  }

  /**
   * Removes resume checkpoint when an item is completed, deleted, or archived
   */
  public removeCheckpoint(id: string): void {
    this.semanticCheckpoints.delete(id);
    this.deviceLocalUiState.delete(id);
  }

  /**
   * Returns top deterministic Continue suggestions
   */
  public getTopContinueItems(options: {
    contextId?: string;
    limit?: number;
    maxStaleDays?: number;
  } = {}): SemanticResumeCheckpoint[] {
    const limit = options.limit || 3;
    const maxStaleDays = options.maxStaleDays || 90;
    const now = Date.now();
    const maxStaleMs = maxStaleDays * 24 * 60 * 60 * 1000;

    let candidates = Array.from(this.semanticCheckpoints.values());

    // Filter by context if requested
    if (options.contextId) {
      candidates = candidates.filter(c => c.contextId === options.contextId);
    }

    // Filter out stale unpinned items
    candidates = candidates.filter(c => {
      if (c.isPinned) return true;
      const ageMs = now - new Date(c.lastActiveTimestamp).getTime();
      return ageMs <= maxStaleMs;
    });

    // Deterministic ranking hierarchy:
    // 1. Pinned items
    // 2. Active in-progress sessions (e.g., unfinished Review or Routine)
    // 3. High recent timestamp
    candidates.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (a.confidence === 'active_session' && b.confidence !== 'active_session') return -1;
      if (a.confidence !== 'active_session' && b.confidence === 'active_session') return 1;

      return new Date(b.lastActiveTimestamp).getTime() - new Date(a.lastActiveTimestamp).getTime();
    });

    return candidates.slice(0, limit);
  }

  public getAllCheckpoints(): SemanticResumeCheckpoint[] {
    return Array.from(this.semanticCheckpoints.values());
  }

  public clear(): void {
    this.semanticCheckpoints.clear();
    this.deviceLocalUiState.clear();
  }
}

export const globalContinuityEngine = new ContinuityEngineV2();
