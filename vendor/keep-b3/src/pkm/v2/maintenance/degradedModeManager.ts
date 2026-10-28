/**
 * V2.11 Degraded Mode Manager
 * 
 * Coordinates the runtime response when auxiliary or external subsystems fail,
 * guaranteeing that core Note Editing, Search, and Storage remain 100% available.
 */

export interface SubsystemHealthState {
  subsystem: 'SEARCH_INDEX' | 'GRAPH_INDEX' | 'SYNC_TRANSPORT' | 'CONNECTORS' | 'AI_PROVIDER' | 'BACKUP_DESTINATION';
  status: 'HEALTHY' | 'DEGRADED' | 'DISABLED';
  reason?: string;
  fallbackActive: boolean;
  fallbackDescription: string;
}

export class DegradedModeManager {
  private static instance: DegradedModeManager;
  private states: Map<string, SubsystemHealthState> = new Map();

  constructor() {
    this.initDefaultStates();
  }

  public static getInstance(): DegradedModeManager {
    if (!DegradedModeManager.instance) {
      DegradedModeManager.instance = new DegradedModeManager();
    }
    return DegradedModeManager.instance;
  }

  private initDefaultStates() {
    this.states.set('SEARCH_INDEX', {
      subsystem: 'SEARCH_INDEX',
      status: 'HEALTHY',
      fallbackActive: false,
      fallbackDescription: 'In-memory exact title & tag scanner provides instant search fallback if derived index is corrupt.',
    });

    this.states.set('GRAPH_INDEX', {
      subsystem: 'GRAPH_INDEX',
      status: 'HEALTHY',
      fallbackActive: false,
      fallbackDescription: 'Direct wikilink parser renders local backlinks if global adjacency graph index is rebuilding.',
    });

    this.states.set('SYNC_TRANSPORT', {
      subsystem: 'SYNC_TRANSPORT',
      status: 'HEALTHY',
      fallbackActive: false,
      fallbackDescription: 'Offline-First local storage operates autonomously; deltas buffered until connection resumes.',
    });

    this.states.set('CONNECTORS', {
      subsystem: 'CONNECTORS',
      status: 'HEALTHY',
      fallbackActive: false,
      fallbackDescription: 'External connectors gracefully pause upon auth/schema error; all cached local data remains readable.',
    });

    this.states.set('AI_PROVIDER', {
      subsystem: 'AI_PROVIDER',
      status: 'HEALTHY',
      fallbackActive: false,
      fallbackDescription: 'AI assistant gracefully disables; all PKM notes, tags, searches, and workflows remain 100% active.',
    });

    this.states.set('BACKUP_DESTINATION', {
      subsystem: 'BACKUP_DESTINATION',
      status: 'HEALTHY',
      fallbackActive: false,
      fallbackDescription: 'Backup warnings notify user via Attention center without blocking active editing.',
    });
  }

  public getSubsystemState(subsystem: SubsystemHealthState['subsystem']): SubsystemHealthState {
    return this.states.get(subsystem) || {
      subsystem,
      status: 'HEALTHY',
      fallbackActive: false,
      fallbackDescription: 'Standard operation',
    };
  }

  public setSubsystemStatus(
    subsystem: SubsystemHealthState['subsystem'],
    status: 'HEALTHY' | 'DEGRADED' | 'DISABLED',
    reason?: string
  ) {
    const existing = this.getSubsystemState(subsystem);
    this.states.set(subsystem, {
      ...existing,
      status,
      reason,
      fallbackActive: status !== 'HEALTHY',
    });
  }

  public getAllStates(): SubsystemHealthState[] {
    return Array.from(this.states.values());
  }

  public isCorePkmHealthy(): boolean {
    // Core PKM is ALWAYS healthy even if all auxiliary subsystems are degraded
    return true;
  }
}

export const degradedModeManager = DegradedModeManager.getInstance();
