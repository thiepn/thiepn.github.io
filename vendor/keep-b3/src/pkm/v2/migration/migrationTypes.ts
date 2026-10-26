export type MigrationPhase =
  | 'idle'
  | 'analyze'
  | 'backup'
  | 'stage'
  | 'transform'
  | 'verify'
  | 'commit'
  | 'rebuild_derived'
  | 'finalize'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export interface V1VaultMetrics {
  schemaVersion: number;
  notesCount: number;
  foldersCount: number;
  tasksCount: number;
  savedViewsCount: number;
  relationsCount: number;
  wikilinksCount: number;
  isEncrypted: boolean;
  totalSizeEstimatedBytes: number;
  customPluginsCount: number;
  domainCounts: {
    people: number;
    habits: number;
    financeTransactions: number;
    healthMetrics: number;
    books: number;
    courses: number;
    travelItineraries: number;
    assets: number;
    decisions: number;
  };
}

export interface MigrationPhaseProgress {
  phase: MigrationPhase;
  percentage: number;
  message: string;
  itemsProcessed: number;
  totalItems: number;
}

export interface MigrationFidelityVerification {
  notesPreserved: boolean;
  tasksPreserved: boolean;
  relationsPreserved: boolean;
  savedViewsNormalized: boolean;
  domainRecordsPreserved: boolean;
  sha256ParityMatches: boolean;
  checksumErrors: string[];
}

export interface V1ToV2MigrationReport {
  timestamp: number;
  durationMs: number;
  vaultMetricsBefore: V1VaultMetrics;
  vaultMetricsAfter: V1VaultMetrics;
  migratedCounts: {
    notes: number;
    tasks: number;
    folders: number;
    savedViews: number;
    relations: number;
    domainRecords: number;
  };
  preservedUnchanged: number;
  convertedSchemas: number;
  deprecatedTermsNormalized: number;
  verification: MigrationFidelityVerification;
  backupRetainedPath: string;
  success: boolean;
  error?: string;
}
