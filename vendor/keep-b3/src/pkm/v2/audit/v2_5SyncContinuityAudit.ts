/**
 * PKM V2.5 — Cross-Device Sync, Offline Continuity & Local-First Resilience Audit
 *
 * Comprehensive inventory, authority mapping, data classification, and transport consolidation
 * for the offline-first Personal OS platform.
 */

export interface SyncMechanismInventoryItem {
  mechanism: string;
  authority: 'local_canonical' | 'remote_peer' | 'mirror_replica' | 'backup_snapshot';
  transport: 'git' | 'filesystem' | 'webrtc_p2p' | 'export_archive' | 'local_storage';
  unitOfSynchronization: string;
  conflictModel: 'three_way_domain_merge' | 'manual_conflict_center' | 'keep_both' | 'manifest_union';
  deletionModel: 'explicit_tombstone' | 'snapshot_pruning' | 'manual_trash';
  versionModel: 'resource_revision_hash' | 'git_commit_tree' | 'timestamp_instant';
  encryptionBehavior: 'vault_authenticated_envelope' | 'plaintext_transport' | 'client_side_wrapped';
  offlineBehavior: 'full_local_usability' | 'queued_changes' | 'deferred_materialization';
  backgroundBehavior: 'opportunistic_foreground_catchup' | 'desktop_tray_poller' | 'mobile_restricted';
  resumeBehavior: 'atomic_journal_replay' | 'chunk_checksum_resume' | 'rebaseline_prompt';
  currentLimitations: string[];
}

export const V2_5_SYNC_SYSTEMS_INVENTORY: SyncMechanismInventoryItem[] = [
  {
    mechanism: 'V2 Core Resource Sync Engine',
    authority: 'local_canonical',
    transport: 'git',
    unitOfSynchronization: 'Unified Resource Envelopes (Notes, Tasks, Projects, Finance, Health, etc.)',
    conflictModel: 'three_way_domain_merge',
    deletionModel: 'explicit_tombstone',
    versionModel: 'resource_revision_hash',
    encryptionBehavior: 'vault_authenticated_envelope',
    offlineBehavior: 'full_local_usability',
    backgroundBehavior: 'opportunistic_foreground_catchup',
    resumeBehavior: 'atomic_journal_replay',
    currentLimitations: ['Requires common ancestor baseline or explicit rebaseline on deep divergence'],
  },
  {
    mechanism: 'P14 / P15 Remote Git Sync Adapter',
    authority: 'local_canonical',
    transport: 'git',
    unitOfSynchronization: 'Markdown resources, JSON metadata, and Git commit trees',
    conflictModel: 'three_way_domain_merge',
    deletionModel: 'explicit_tombstone',
    versionModel: 'git_commit_tree',
    encryptionBehavior: 'vault_authenticated_envelope',
    offlineBehavior: 'queued_changes',
    backgroundBehavior: 'opportunistic_foreground_catchup',
    resumeBehavior: 'atomic_journal_replay',
    currentLimitations: ['Large binary attachments require chunking and streaming to prevent Git bloat'],
  },
  {
    mechanism: 'P45 Filesystem Mirror Adapter',
    authority: 'local_canonical',
    transport: 'filesystem',
    unitOfSynchronization: 'Working directory files on local disk / removable drives',
    conflictModel: 'three_way_domain_merge',
    deletionModel: 'explicit_tombstone',
    versionModel: 'resource_revision_hash',
    encryptionBehavior: 'plaintext_transport',
    offlineBehavior: 'full_local_usability',
    backgroundBehavior: 'desktop_tray_poller',
    resumeBehavior: 'rebaseline_prompt',
    currentLimitations: ['Directory disconnection must never trigger mass deletion; permissions guarded'],
  },
  {
    mechanism: 'P32 Optional P2P Device-to-Device Sync',
    authority: 'local_canonical',
    transport: 'webrtc_p2p',
    unitOfSynchronization: 'Chunked sync envelopes and binary streams',
    conflictModel: 'three_way_domain_merge',
    deletionModel: 'explicit_tombstone',
    versionModel: 'resource_revision_hash',
    encryptionBehavior: 'vault_authenticated_envelope',
    offlineBehavior: 'full_local_usability',
    backgroundBehavior: 'mobile_restricted',
    resumeBehavior: 'chunk_checksum_resume',
    currentLimitations: ['Requires both devices to be active and paired simultaneously; experimental status'],
  },
  {
    mechanism: 'V2.5 Attachment Materialization Engine',
    authority: 'local_canonical',
    transport: 'git',
    unitOfSynchronization: 'Content-addressed binary blobs (SHA-256)',
    conflictModel: 'keep_both',
    deletionModel: 'explicit_tombstone',
    versionModel: 'resource_revision_hash',
    encryptionBehavior: 'vault_authenticated_envelope',
    offlineBehavior: 'deferred_materialization',
    backgroundBehavior: 'opportunistic_foreground_catchup',
    resumeBehavior: 'chunk_checksum_resume',
    currentLimitations: ['Storage pressure on mobile requires metadata-first selective materialization'],
  },
  {
    mechanism: 'V2.5 Device Identity & Continuity Engine',
    authority: 'local_canonical',
    transport: 'local_storage',
    unitOfSynchronization: 'Device metadata, last sync watermarks, semantic Continue checkpoints',
    conflictModel: 'manifest_union',
    deletionModel: 'explicit_tombstone',
    versionModel: 'timestamp_instant',
    encryptionBehavior: 'client_side_wrapped',
    offlineBehavior: 'full_local_usability',
    backgroundBehavior: 'opportunistic_foreground_catchup',
    resumeBehavior: 'atomic_journal_replay',
    currentLimitations: ['Retiring a device only affects sync metadata and tombstone GC; no remote wipe'],
  },
];

export interface DataClassificationItem {
  data: string;
  synced: boolean;
  derivedOrRebuilt: boolean;
  deviceLocal: boolean;
  notes: string;
}

export const V2_5_DATA_CLASSIFICATION_MATRIX: DataClassificationItem[] = [
  {
    data: 'Canonical Resources (Notes, Tasks, Projects, etc.)',
    synced: true,
    derivedOrRebuilt: false,
    deviceLocal: false,
    notes: 'Core entity documents with stable IDs and revision histories.',
  },
  {
    data: 'Domain Records (Finance, Travel, Health, Assets, Decisions)',
    synced: true,
    derivedOrRebuilt: false,
    deviceLocal: false,
    notes: 'Structured records with domain-specific invariant validation.',
  },
  {
    data: 'Saved Views & Collections',
    synced: true,
    derivedOrRebuilt: false,
    deviceLocal: false,
    notes: 'User-configured query filters, groupings, and layout presets.',
  },
  {
    data: 'Tombstones',
    synced: true,
    derivedOrRebuilt: false,
    deviceLocal: false,
    notes: 'Explicit deletion envelopes to prevent stale-device resurrection.',
  },
  {
    data: 'Attachment Binaries',
    synced: true,
    derivedOrRebuilt: false,
    deviceLocal: false,
    notes: 'Content-addressed files; syncs metadata, streams content on demand.',
  },
  {
    data: 'Semantic Activity Events',
    synced: true,
    derivedOrRebuilt: false,
    deviceLocal: false,
    notes: 'High-level user events with deterministic dedupe IDs.',
  },
  {
    data: 'Attention State (Acks & Snoozes)',
    synced: true,
    derivedOrRebuilt: false,
    deviceLocal: false,
    notes: 'Presentation overlay state without altering underlying domain entities.',
  },
  {
    data: 'Semantic Continue Checkpoints',
    synced: true,
    derivedOrRebuilt: false,
    deviceLocal: false,
    notes: 'High-level contextual working set handoff across devices.',
  },
  {
    data: 'Search & Lexical Indexes',
    synced: false,
    derivedOrRebuilt: true,
    deviceLocal: true,
    notes: 'Local BM25/trigram indexes generated on-device from canonical resources.',
  },
  {
    data: 'Graph Connection Indexes',
    synced: false,
    derivedOrRebuilt: true,
    deviceLocal: true,
    notes: 'Forward/backlink graph reconstructed dynamically from resource bodies.',
  },
  {
    data: 'Temporal Projection Caches',
    synced: false,
    derivedOrRebuilt: true,
    deviceLocal: true,
    notes: 'Day-by-day recurrence and agenda projections derived from recurrence rules.',
  },
  {
    data: 'AI Embeddings & Vector Caches',
    synced: false,
    derivedOrRebuilt: true,
    deviceLocal: true,
    notes: 'Local client-side embeddings calculated on device.',
  },
  {
    data: 'Window Geometry, Cursors & Scroll Positions',
    synced: false,
    derivedOrRebuilt: false,
    deviceLocal: true,
    notes: 'Ephemeral UI state strictly isolated to the physical screen.',
  },
  {
    data: 'Credentials & Secret Keys',
    synced: false,
    derivedOrRebuilt: false,
    deviceLocal: true,
    notes: 'Git tokens and encryption keys stored securely in device hardware/storage.',
  },
  {
    data: 'Installed Plugins',
    synced: false,
    derivedOrRebuilt: false,
    deviceLocal: true,
    notes: 'Plugin binaries are device-installed; plugin-created resources remain synced.',
  },
];
