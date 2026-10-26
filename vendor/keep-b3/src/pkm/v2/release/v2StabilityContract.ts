/**
 * V2 Stability Contract
 * 
 * Defines the immutable contracts and guarantees of the V2 Personal OS:
 * 1. Canonical Data Contract (stable Resource identity, typed schemas, relations)
 * 2. Notes Contract (pure Markdown, typed YAML properties, open formatting)
 * 3. Backup Contract (format v2.0, verifiable SHA-256 manifests, safe rollback)
 * 4. Sync Contract (local-first, explicit non-destructive merge, tombstone bounded retention)
 * 5. Security Contract (AES-256-GCM encryption, zero-memory-leak locked state, plugin sandboxes)
 * 6. Plugin API Contract (Stable vs Beta vs Experimental vs Deprecated classifications)
 * 7. Portability & Export Contract (zero lock-in, full portable vault, human-readable escape)
 * 8. UX Concept Contract (frozen semantic definitions for Home, Context, Search, etc.)
 * 9. Platform Contract (Web/PWA, Desktop, Mobile)
 * 10. Authoritative Source Version Freeze
 */

export interface VersionManifest {
  applicationVersion: string;
  schemaVersion: string;
  syncProtocolVersion: string;
  backupFormatVersion: string;
  pluginApiVersion: string;
  portableExportVersion: string;
  releaseDate: string;
  gitCommit: string;
}

export const V2_AUTHORITATIVE_VERSIONS: VersionManifest = {
  applicationVersion: '2.10.0',
  schemaVersion: '2.0.0',
  syncProtocolVersion: '2.0.0',
  backupFormatVersion: '2.0.0',
  pluginApiVersion: '2.0.0',
  portableExportVersion: '2.0.0',
  releaseDate: '2026-09-13',
  gitCommit: 'a8f7c9e2b1d4e6f8',
};

export interface ContractSection {
  title: string;
  category: string;
  stabilityLevel: 'STABLE_FROZEN' | 'BETA' | 'EXPERIMENTAL';
  summary: string;
  rules: string[];
}

export const V2_STABILITY_CONTRACTS: ContractSection[] = [
  {
    title: 'Canonical Data Contract',
    category: 'Data Model',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Guarantees persistent Resource identities, strict schema versioning, and non-destructive bidirectional relations.',
    rules: [
      'Resource IDs are immutable UUID v4 strings that never change across edits or sync cycles.',
      'All Resources conform to typed schemas with semantic timestamps (createdAt, updatedAt, deletedAt).',
      'Relations maintain referential integrity with explicit cascade policies (restrict, cascade, set-null).',
      'Canonical writes commit to local indexed storage before notifying UI or remote synchronization transports.',
      'Schema evolution guarantees forward-safe field additions and backwards-compatible migrations.',
    ],
  },
  {
    title: 'Notes & Content Contract',
    category: 'Storage & Syntax',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Guarantees that user notes remain standard human-readable Markdown with typed YAML frontmatter.',
    rules: [
      'Notes are stored and exported as standard UTF-8 Markdown text.',
      'Metadata is serialized in standard YAML frontmatter blocks delimited by --- markers.',
      'Wikilinks ([[target#heading|alias]]) follow standard open PKM conventions.',
      'No proprietary opaque binary formats are used for user note content.',
      'External editors can read, index, and modify notes without data corruption.',
    ],
  },
  {
    title: 'Backup & Disaster Recovery Contract',
    category: 'Resilience',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Guarantees deterministic backup verification, encrypted vault snapshots, and reliable clean restores.',
    rules: [
      'Backup archives use format v2.0 with a root manifest.json and payload SHA-256 digests.',
      'Backups can be verified before restore without writing to the active database.',
      'Restoring a backup cleanly replaces the local working set with automatic pre-restore safety snapshotting.',
      'Encrypted backups require the user passphrase for derivation via PBKDF2-SHA256 and AES-256-GCM.',
      'Restoring an older backup safely re-baselines sync vector clocks to avoid accidental data overwrite.',
    ],
  },
  {
    title: 'Local-First Sync Contract',
    category: 'Synchronization',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Guarantees offline-first execution, explicit conflict detection, and tombstone-bounded convergence.',
    rules: [
      'All operations succeed locally with zero network connectivity.',
      'Sync operates via deterministic state reconciliation and vector clock causality tracking.',
      'Concurrent field-level edits merge automatically; same-field collisions trigger explicit Conflict Center entries.',
      'Deleted resources persist as tombstones for 90 days to prevent stale-device resurrection.',
      'Incompatible protocol or schema versions are safely rejected before applying writes.',
    ],
  },
  {
    title: 'Security & Privacy Contract',
    category: 'Security',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Guarantees end-to-end cryptographic privacy, zero-leak locked state, and plugin capability confinement.',
    rules: [
      'Vault encryption uses WebCrypto AES-256-GCM with 100,000-iteration PBKDF2 key derivation.',
      'Locking the vault completely purges in-memory keys, decrypted caches, and search index buffers.',
      'Plugins execute in sandboxed contexts with strictly checked capability permissions (no arbitrary DOM or network access).',
      'AI interactions require explicit user opt-in, use strict contextual scope filtering, and exclude sensitive domains by default.',
      'Public site publishing excludes private tags, unlinked attachments, and canonical canary secrets.',
    ],
  },
  {
    title: 'Plugin API Contract',
    category: 'Extensibility',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Defines the frozen public API surface for extensions and plugins.',
    rules: [
      'Stable APIs (v2.0): Command registration, view extensions, custom ribbons, status bar items, read-only resource queries.',
      'Beta APIs: Custom modal overlays, settings tabs, custom file format parsers.',
      'Experimental APIs: Direct raw canvas manipulation, low-level sync transport injection.',
      'Deprecated APIs: V1 legacy synchronous document query helpers (removed in V2.0).',
    ],
  },
  {
    title: 'Export & Zero-Lockin Portability Contract',
    category: 'Portability',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Guarantees the user can leave the application at any time with 100% of their data intact.',
    rules: [
      'Full Portable Vault export produces standard .zip archives containing raw Markdown and open JSON/CSV datasets.',
      'Bibliographies export to standard BibTeX (.bib) and CSL-JSON.',
      'Calendar events and time-blocks export to standard iCalendar (.ics).',
      'People contacts export to standard vCard (.vcf).',
      'Finance transactions export to standard double-entry CSV and ledger formats.',
    ],
  },
  {
    title: 'UX Concept & Semantics Contract',
    category: 'User Experience',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Freezes the semantic definitions of core system concepts across all platforms.',
    rules: [
      'Home: The primary dashboard showing daily priorities, focus queue, and pinned resources.',
      'Context: Multi-pane dynamic workspaces grouping queries, active notes, and domain widgets.',
      'Search: Instant hybrid text and semantic index with sub-5ms query response.',
      'Quick Switcher: Keyboard-driven modal for instant resource and command navigation.',
      'Attention: The centralized inbox for urgent reviews, conflicts, and scheduled notifications.',
      'Activity: The chronological audit ledger tracking all local and remote operations.',
      'Review: Periodic reflection workflows (Daily, Weekly, Monthly) with structured checklists.',
      'Automation: Deterministic trigger-action workflows executing locally on system events.',
    ],
  },
  {
    title: 'Platform Support Contract',
    category: 'Platforms',
    stabilityLevel: 'STABLE_FROZEN',
    summary: 'Specifies the supported tier and performance SLA for each target runtime platform.',
    rules: [
      'Tier 1 (Stable): Web (Chrome 110+, Safari 16+, Firefox 115+, Edge), Desktop PWA, macOS, Windows, Linux.',
      'Tier 2 (Beta): iOS Safari / PWA, Android Chrome / PWA, iPadOS.',
      'Tier 3 (Experimental): Direct P2P NAT signaling, Local WebGPU in-browser LLM.',
      'Offline Core: 100% functional on all Tier 1 and Tier 2 platforms without internet connection.',
    ],
  },
];

export class StabilityContractService {
  public getVersionManifest(): VersionManifest {
    return { ...V2_AUTHORITATIVE_VERSIONS };
  }

  public getAllContracts(): ContractSection[] {
    return [...V2_STABILITY_CONTRACTS];
  }

  public getContractByCategory(category: string): ContractSection | undefined {
    return V2_STABILITY_CONTRACTS.find((c) => c.category === category);
  }
}

export const stabilityContractService = new StabilityContractService();
