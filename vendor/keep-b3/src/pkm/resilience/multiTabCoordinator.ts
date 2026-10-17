/**
 * V1.2 Multi-Tab Coordinator
 * 
 * Uses BroadcastChannel to coordinate multi-tab instances of the application:
 * - Leader Election: Only 1 tab acts as leader for background jobs (scheduled backups, periodic sync, filesystem watchers)
 * - Heartbeat: Leader sends periodic heartbeats; passive tabs elect a new leader if leader closes or crashes
 * - Cross-Tab Mutation Broadcast: Notifies other tabs when notes or resources are mutated so memory caches stay coherent
 * - Migration & Backup Lock: Prevents multiple tabs from running schema migrations or full backup restores concurrently
 */

export interface TabMessage {
  type: 'heartbeat' | 'claim_leader' | 'yield_leader' | 'mutation_event' | 'lock_request' | 'lock_release' | 'lock_denied';
  tabId: string;
  timestamp: number;
  payload?: any;
}

export interface TabCoordinatorState {
  tabId: string;
  isLeader: boolean;
  activeLeaderId: string | null;
  knownTabsCount: number;
  isLocked: boolean;
  lockReason?: string;
}

const CHANNEL_NAME = 'keepnotes_multitab_coordinator_v1_2';
const HEARTBEAT_INTERVAL_MS = 2500;
const LEADER_TIMEOUT_MS = 6000;

export class MultiTabCoordinator {
  private tabId: string;
  private channel: BroadcastChannel | null = null;
  private isLeader = false;
  private activeLeaderId: string | null = null;
  private lastLeaderHeartbeat = 0;
  private knownTabs: Map<string, number> = new Map();
  private heartbeatTimer: any = null;
  private checkTimer: any = null;
  private isLocked = false;
  private lockReason?: string;
  private mutationListeners: Set<(payload: any) => void> = new Set();
  private stateListeners: Set<(state: TabCoordinatorState) => void> = new Set();

  constructor() {
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.initChannel();
  }

  private initChannel() {
    if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => this.handleMessage(event.data);
      } catch (err) {
        console.warn('BroadcastChannel unavailable, running in standalone tab mode:', err);
      }
    }

    // Register this tab
    this.knownTabs.set(this.tabId, Date.now());

    // Claim leadership initially or listen for existing leader
    this.claimLeadership();

    // Start timers
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    this.checkTimer = setInterval(() => this.checkLeaderLiveness(), HEARTBEAT_INTERVAL_MS);

    // Clean up on unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.dispose());
    }
  }

  private handleMessage(msg: TabMessage) {
    if (!msg || msg.tabId === this.tabId) return;

    this.knownTabs.set(msg.tabId, Date.now());

    switch (msg.type) {
      case 'heartbeat':
        if (msg.payload?.isLeader) {
          this.activeLeaderId = msg.tabId;
          this.lastLeaderHeartbeat = Date.now();
          if (this.isLeader && msg.tabId < this.tabId) {
            // Tie-break: tab with lexicographically smaller ID wins leadership
            this.isLeader = false;
          }
        }
        break;

      case 'claim_leader':
        if (!this.isLeader || msg.tabId < this.tabId) {
          this.isLeader = false;
          this.activeLeaderId = msg.tabId;
          this.lastLeaderHeartbeat = Date.now();
        }
        break;

      case 'yield_leader':
        if (this.activeLeaderId === msg.tabId) {
          this.activeLeaderId = null;
          this.claimLeadership();
        }
        break;

      case 'mutation_event':
        for (const listener of this.mutationListeners) {
          try {
            listener(msg.payload);
          } catch (err) {
            console.error('Error in tab mutation listener:', err);
          }
        }
        break;

      case 'lock_request':
        this.isLocked = true;
        this.lockReason = msg.payload?.reason || 'External operation in progress';
        break;

      case 'lock_release':
        this.isLocked = false;
        this.lockReason = undefined;
        break;
    }

    this.notifyState();
  }

  private sendHeartbeat() {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'heartbeat',
      tabId: this.tabId,
      timestamp: Date.now(),
      payload: { isLeader: this.isLeader },
    });
  }

  private checkLeaderLiveness() {
    const now = Date.now();
    // Prune stale passive tabs
    for (const [id, lastSeen] of this.knownTabs.entries()) {
      if (now - lastSeen > LEADER_TIMEOUT_MS * 2) {
        this.knownTabs.delete(id);
      }
    }

    // Check if leader died
    if (!this.isLeader) {
      if (!this.activeLeaderId || now - this.lastLeaderHeartbeat > LEADER_TIMEOUT_MS) {
        this.claimLeadership();
      }
    }
    this.notifyState();
  }

  public claimLeadership() {
    this.isLeader = true;
    this.activeLeaderId = this.tabId;
    this.lastLeaderHeartbeat = Date.now();

    if (this.channel) {
      this.channel.postMessage({
        type: 'claim_leader',
        tabId: this.tabId,
        timestamp: Date.now(),
      });
    }
    this.notifyState();
  }

  /**
   * Broadcasts a local data mutation to keep other open tabs synchronized
   */
  public broadcastMutation(resourceType: string, resourceId: string, action: 'create' | 'update' | 'delete') {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'mutation_event',
      tabId: this.tabId,
      timestamp: Date.now(),
      payload: { resourceType, resourceId, action },
    });
  }

  /**
   * Acquires a cooperative lock across all tabs for critical operations (like schema migration or full vault restore)
   */
  public acquireGlobalLock(reason: string): boolean {
    if (this.isLocked && this.lockReason !== reason) {
      return false;
    }
    this.isLocked = true;
    this.lockReason = reason;

    if (this.channel) {
      this.channel.postMessage({
        type: 'lock_request',
        tabId: this.tabId,
        timestamp: Date.now(),
        payload: { reason },
      });
    }
    this.notifyState();
    return true;
  }

  /**
   * Releases a cooperative global lock
   */
  public releaseGlobalLock() {
    this.isLocked = false;
    this.lockReason = undefined;

    if (this.channel) {
      this.channel.postMessage({
        type: 'lock_release',
        tabId: this.tabId,
        timestamp: Date.now(),
      });
    }
    this.notifyState();
  }

  public onRemoteMutation(listener: (payload: { resourceType: string; resourceId: string; action: string }) => void): () => void {
    this.mutationListeners.add(listener);
    return () => this.mutationListeners.delete(listener);
  }

  public subscribeState(listener: (state: TabCoordinatorState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => this.stateListeners.delete(listener);
  }

  private notifyState() {
    const s = this.getState();
    for (const l of this.stateListeners) {
      try {
        l(s);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    }
  }

  public getState(): TabCoordinatorState {
    return {
      tabId: this.tabId,
      isLeader: this.isLeader,
      activeLeaderId: this.activeLeaderId,
      knownTabsCount: Math.max(1, this.knownTabs.size),
      isLocked: this.isLocked,
      lockReason: this.lockReason,
    };
  }

  public dispose() {
    if (this.isLeader && this.channel) {
      this.channel.postMessage({
        type: 'yield_leader',
        tabId: this.tabId,
        timestamp: Date.now(),
      });
    }
    clearInterval(this.heartbeatTimer);
    clearInterval(this.checkTimer);
    if (this.channel) {
      this.channel.close();
    }
  }
}

export const multiTabCoordinator = new MultiTabCoordinator();
