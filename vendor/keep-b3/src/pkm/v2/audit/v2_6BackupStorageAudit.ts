/**
 * PKM V2.6 — Backup, Disaster Recovery, Storage Integrity & Extreme-Scale Resilience Audit
 *
 * Authoritative data classification, failure scenario matrix, storage boundaries,
 * backup manifest specification, and disaster drill taxonomy.
 */

export type V2DataPersistenceClass =
  | 'canonical_user_data'
  | 'recovery_historical_data'
  | 'derived_rebuildable_data'
  | 'device_local_config'
  | 'sensitive_secrets_credentials';

export interface V2DataClassificationEntry {
  categoryName: string;
  classification: V2DataPersistenceClass;
  includedInBackup: boolean;
  includedInSync: boolean;
  rebuildableOnDemand: boolean;
  isolationLevel: 'vault_store' | 'device_secure_storage' | 'memory_ephemeral' | 'ephemeral_cache';
  integrityProtection: 'sha256_checksum' | 'envelope_signature' | 'rebuild_verification' | 'none';
  examples: string[];
}

export const V2_6_DATA_CLASSIFICATION_MATRIX: V2DataClassificationEntry[] = [
  {
    categoryName: 'Canonical Unified Resources',
    classification: 'canonical_user_data',
    includedInBackup: true,
    includedInSync: true,
    rebuildableOnDemand: false,
    isolationLevel: 'vault_store',
    integrityProtection: 'sha256_checksum',
    examples: [
      'Notes & Frontmatter (Markdown body, title, properties)',
      'Tasks & Recurrence Schedules',
      'Projects, Goals & Areas of Responsibility',
      'People, Organizations & Contact Metadata',
      'Books, Courses & Learning Highlights',
      'Transactions, Accounts & Financial Ledgers',
      'Health Metrics & Historical Logs',
      'Travel Plans, Itineraries & Booking References',
      'Assets, Maintenance Schedules & Warranties',
      'Decision Logs, Options & Consequence Trees',
      'Canvases (Cards, Nodes, Edges, Freehand strokes)',
      'Saved Views & Dynamic Collections',
      'Automations, Routines & Custom Review Templates',
      'User Custom Properties & Tag Schemas',
    ],
  },
  {
    categoryName: 'Canonical Media & Attachments',
    classification: 'canonical_user_data',
    includedInBackup: true,
    includedInSync: true,
    rebuildableOnDemand: false,
    isolationLevel: 'vault_store',
    integrityProtection: 'sha256_checksum',
    examples: [
      'PDF Documents & Embedded Vector Annotations',
      'Images (PNG, JPEG, WebP, SVG diagrams)',
      'Audio Recordings & Transcripts',
      'Binary File Attachments',
    ],
  },
  {
    categoryName: 'Recovery Points & Historical Revisions',
    classification: 'recovery_historical_data',
    includedInBackup: true,
    includedInSync: false,
    rebuildableOnDemand: false,
    isolationLevel: 'vault_store',
    integrityProtection: 'sha256_checksum',
    examples: [
      'Note Version Revisions (Differential snapshots)',
      'Pre-Restore Recovery Snapshots',
      'Tombstone Records (Sync deletion tombstones with monotonic timestamps)',
      'Crash Recovery Operation Journals',
      'Archival Snapshots & Historic Review Summaries',
    ],
  },
  {
    categoryName: 'Derived & Rebuildable Indexes',
    classification: 'derived_rebuildable_data',
    includedInBackup: false,
    includedInSync: false,
    rebuildableOnDemand: true,
    isolationLevel: 'ephemeral_cache',
    integrityProtection: 'rebuild_verification',
    examples: [
      'BM25 / Full-Text Search Inverted Indexes',
      'Lexical & Neural Embeddings Vector Cache',
      'Graph Forward / Backlinks Adjacency Graph',
      'Temporal / Calendar Agenda Occurrence Index',
      'Semantic Activity Timeline Aggregation Cache',
      'Image & PDF Thumbnail Cache',
      'Resolved Query & Filter Execution Caches',
    ],
  },
  {
    categoryName: 'Device-Local UI & Session Preferences',
    classification: 'device_local_config',
    includedInBackup: false,
    includedInSync: false,
    rebuildableOnDemand: true,
    isolationLevel: 'vault_store',
    integrityProtection: 'none',
    examples: [
      'Window Geometry & Split Pane Layouts',
      'Active Tab Selection & Navigation Stack',
      'Local Theme Selection (System / Dark / Light)',
      'Recently Visited Item MRU List',
      'Biometric Unlock Wrapper & Session Timers',
    ],
  },
  {
    categoryName: 'Secrets, Passwords & Credentials',
    classification: 'sensitive_secrets_credentials',
    includedInBackup: false,
    includedInSync: false,
    rebuildableOnDemand: false,
    isolationLevel: 'device_secure_storage',
    integrityProtection: 'envelope_signature',
    examples: [
      'OAuth Access Tokens & Refresh Tokens',
      'Git Transport SSH / Personal Access Tokens',
      'P2P Ephemeral Pairing Keys',
      'Vault Master Encryption Passphrase / Derived Keys in Memory',
    ],
  },
];

export interface DisasterScenarioEvaluation {
  id: string;
  scenarioName: string;
  threatClass: 'hardware_loss' | 'storage_corruption' | 'sync_mass_delete' | 'upgrade_failure' | 'resource_exhaustion';
  preventionMechanism: string;
  detectionMechanism: string;
  recoveryProcedure: string;
  dataLossGuarantee: 'zero_canonical_loss' | 'bounded_to_uncommitted_buffer' | 'quarantined_for_manual_inspection';
}

export const V2_6_DISASTER_SCENARIOS: DisasterScenarioEvaluation[] = [
  {
    id: 'DS-01',
    scenarioName: 'Device Loss or Hardware Death',
    threatClass: 'hardware_loss',
    preventionMechanism: 'Regular versioned backups to external / secondary media + multi-device synchronization',
    detectionMechanism: 'User initiates New Device Setup on fresh hardware',
    recoveryProcedure: 'Clean-slate Restore from verified backup archive or Re-sync from active peer',
    dataLossGuarantee: 'bounded_to_uncommitted_buffer',
  },
  {
    id: 'DS-02',
    scenarioName: 'IndexedDB / Storage Sector Corruption',
    threatClass: 'storage_corruption',
    preventionMechanism: 'Transactional atomic batch writes with rollback recovery journals',
    detectionMechanism: 'Vault Doctor Quick Check & Database Open Integrity Guard',
    recoveryProcedure: 'Isolate corrupt records to Quarantine Store; restore remaining vault and rebuild derived indexes',
    dataLossGuarantee: 'zero_canonical_loss',
  },
  {
    id: 'DS-03',
    scenarioName: 'Accidental Mass Deletion Propagated by Sync',
    threatClass: 'sync_mass_delete',
    preventionMechanism: 'Explicit tombstone lifecycle with retention buffer and pre-restore snapshots',
    detectionMechanism: 'User or Attention Engine detects sudden negative resource diff',
    recoveryProcedure: 'Restore older verified backup into secondary / isolated recovery vault and selectively recover deleted items',
    dataLossGuarantee: 'zero_canonical_loss',
  },
  {
    id: 'DS-04',
    scenarioName: 'Damaged or Truncated Backup Archive',
    threatClass: 'storage_corruption',
    preventionMechanism: 'Atomic completion markers & individual SHA-256 chunk checksums',
    detectionMechanism: 'Verify Backup structural & checksum check fails preflight',
    recoveryProcedure: 'Retain last known-good generation; run Partial Salvage Engine on damaged file without destroying active vault',
    dataLossGuarantee: 'zero_canonical_loss',
  },
  {
    id: 'DS-05',
    scenarioName: 'Interrupted Restore or Power Failure Mid-Restore',
    threatClass: 'upgrade_failure',
    preventionMechanism: 'Staged atomic commit pipeline (Read -> Validate -> Stage -> Migrate -> Verify -> Commit)',
    detectionMechanism: 'Recovery Journal checks pending operations on startup',
    recoveryProcedure: 'Roll back staging buffer; active vault remains untouched until atomic finalization',
    dataLossGuarantee: 'zero_canonical_loss',
  },
  {
    id: 'DS-06',
    scenarioName: 'Storage Exhaustion Mid-Write / Full Disk',
    threatClass: 'resource_exhaustion',
    preventionMechanism: 'Storage Quota Preflight and early eviction of derived caches (search, graph, thumbnails)',
    detectionMechanism: 'Storage quota monitor signals critical headroom before writing large payloads',
    recoveryProcedure: 'Fail write safely, rollback uncommitted mutations, surface Clear Rebuildable Data prompt',
    dataLossGuarantee: 'zero_canonical_loss',
  },
  {
    id: 'DS-07',
    scenarioName: 'Single Corrupted Resource Record',
    threatClass: 'storage_corruption',
    preventionMechanism: 'Deterministic schema parsing with per-resource isolation',
    detectionMechanism: 'Vault Doctor Full Integrity Scan identifies unparseable envelope',
    recoveryProcedure: 'Quarantine corrupt record (preserving raw byte content) without blocking load of remaining 99,999 notes',
    dataLossGuarantee: 'quarantined_for_manual_inspection',
  },
  {
    id: 'DS-08',
    scenarioName: 'Attachment Bit Rot or Hash Mismatch',
    threatClass: 'storage_corruption',
    preventionMechanism: 'Immutable content-addressable SHA-256 blob hashing and ref-counting',
    detectionMechanism: 'Attachment Integrity Scanner validates on-disk byte hashes against canonical metadata',
    recoveryProcedure: 'Flag as damaged attachment, offer selective restore from verified backup or re-fetch from sync peer',
    dataLossGuarantee: 'zero_canonical_loss',
  },
];
