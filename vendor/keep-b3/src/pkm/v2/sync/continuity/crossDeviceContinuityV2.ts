/**
 * PKM V2.5 — Cross-Device Semantic Continuity & Handoff Engine
 *
 * Facilitates seamless workflow handoff ("Continue from Laptop") across devices.
 * Synchronizes high-level contextual working sets, active review checkpoints, and
 * routine runs without ever mirroring device-local pane geometry or unsaved buffers.
 */

import { SemanticContinueCheckpointV2 } from '../syncTypes';
import { globalDeviceManagerV2 } from '../devices/deviceManagerV2';

const CONTINUITY_STORAGE_KEY = 'keepnotes_v2_semantic_checkpoints';

export class CrossDeviceContinuityEngineV2 {
  private checkpoints: Map<string, SemanticContinueCheckpointV2> = new Map(); // deviceId -> checkpoint

  constructor() {
    this.loadCheckpoints();
  }

  private loadCheckpoints(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(CONTINUITY_STORAGE_KEY);
        if (raw) {
          const list: SemanticContinueCheckpointV2[] = JSON.parse(raw);
          for (const cp of list) {
            this.checkpoints.set(cp.deviceId, cp);
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  private persistCheckpoints(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const list = Array.from(this.checkpoints.values());
        localStorage.setItem(CONTINUITY_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Save a semantic working set checkpoint for the current device
   */
  public recordCurrentDeviceCheckpoint(options: {
    contextId?: string;
    contextTitle?: string;
    activeResourceId?: string;
    activeResourceTitle?: string;
    activeResourceType?: any;
    reviewId?: string;
    routineRunId?: string;
  }): SemanticContinueCheckpointV2 {
    const currentDevice = globalDeviceManagerV2.getCurrentDevice();
    const checkpoint: SemanticContinueCheckpointV2 = {
      checkpointId: `cp_${currentDevice.deviceId}_${Date.now().toString(36)}`,
      deviceId: currentDevice.deviceId,
      deviceName: currentDevice.deviceName,
      contextId: options.contextId,
      contextTitle: options.contextTitle,
      activeResourceId: options.activeResourceId,
      activeResourceTitle: options.activeResourceTitle,
      activeResourceType: options.activeResourceType,
      reviewId: options.reviewId,
      routineRunId: options.routineRunId,
      timestamp: new Date().toISOString(),
    };

    this.checkpoints.set(currentDevice.deviceId, checkpoint);
    this.persistCheckpoints();
    return checkpoint;
  }

  /**
   * Ingest a remote checkpoint synced from another device
   */
  public ingestRemoteCheckpoint(checkpoint: SemanticContinueCheckpointV2): void {
    const currentDevice = globalDeviceManagerV2.getCurrentDevice();
    // Don't overwrite local device checkpoint with stale remote if local is newer
    if (checkpoint.deviceId === currentDevice.deviceId) return;

    this.checkpoints.set(checkpoint.deviceId, checkpoint);
    this.persistCheckpoints();
  }

  /**
   * Get the most recent continue suggestion from other devices (if within 48 hours)
   */
  public getLatestRemoteHandoffSuggestion(): {
    checkpoint: SemanticContinueCheckpointV2;
    timeAgoDescription: string;
  } | null {
    const currentDevice = globalDeviceManagerV2.getCurrentDevice();
    const now = Date.now();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;

    const candidates = Array.from(this.checkpoints.values())
      .filter(cp => cp.deviceId !== currentDevice.deviceId)
      .filter(cp => now - new Date(cp.timestamp).getTime() < fortyEightHoursMs)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (candidates.length === 0) return null;

    const latest = candidates[0];
    const diffMinutes = Math.floor((now - new Date(latest.timestamp).getTime()) / (60 * 1000));
    let timeAgo = `${diffMinutes}m ago`;
    if (diffMinutes >= 60) {
      const diffHours = Math.floor(diffMinutes / 60);
      timeAgo = `${diffHours}h ago`;
    }

    return {
      checkpoint: latest,
      timeAgoDescription: timeAgo,
    };
  }

  public getAllCheckpoints(): SemanticContinueCheckpointV2[] {
    return Array.from(this.checkpoints.values());
  }

  public clear(): void {
    this.checkpoints.clear();
    this.persistCheckpoints();
  }
}

export const globalCrossDeviceContinuityEngineV2 = new CrossDeviceContinuityEngineV2();
