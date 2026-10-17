/**
 * V2 Feature Freeze Manifest — Authoritative & Final
 * 
 * Formal declaration of the frozen V2 Personal OS feature set.
 * 
 * AFTER THIS MANIFEST:
 * - ZERO NEW FEATURES.
 * - V2.26-V2.30 are strictly reserved for defects, reliability, security,
 *   data integrity, performance, accessibility, packaging, and shipping.
 */

export interface FrozenFeatureEntry {
  id: string;
  subsystem: string;
  featureName: string;
  status: 'Stable' | 'Beta' | 'Experimental';
  supportedPlatforms: string[];
  knownLimitations: string;
  ownerModule: string;
}

export const V2_FROZEN_FEATURE_MANIFEST: FrozenFeatureEntry[] = [
  // 1. Core
  {
    id: 'FEAT-CORE-01',
    subsystem: 'Core',
    featureName: 'Canonical Resource Data Model & Typed Schemas',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'None. Fully deterministic in-memory & IndexedDB/disk storage.',
    ownerModule: 'src/pkm/core',
  },
  {
    id: 'FEAT-CORE-02',
    subsystem: 'Core',
    featureName: 'Bi-directional Forward & Backlink Indexer',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Indexes up to 100,000 links in under 50ms with incremental delta updates.',
    ownerModule: 'src/pkm/indexer.ts',
  },

  // 2. Knowledge
  {
    id: 'FEAT-KNOW-01',
    subsystem: 'Knowledge',
    featureName: 'Hierarchical Block Outliner & Markdown Editor',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'None.',
    ownerModule: 'src/pkm/editor',
  },
  {
    id: 'FEAT-KNOW-02',
    subsystem: 'Knowledge',
    featureName: 'Transclusion Embeds, Math (KaTeX), & Diagrams (Mermaid)',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Diagram rendering executes entirely in local client without remote server.',
    ownerModule: 'src/pkm/transclusion.ts',
  },
  {
    id: 'FEAT-KNOW-03',
    subsystem: 'Knowledge',
    featureName: 'PDF Citation & Annotation Reader',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'PDFs stored as attachments in local vault; page annotations link back to notes.',
    ownerModule: 'src/pkm/pdfEngine.ts',
  },
  {
    id: 'FEAT-KNOW-04',
    subsystem: 'Knowledge',
    featureName: 'Spatial Infinite Canvas Workspace',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Optimized for pointer / mouse / touch gestures.',
    ownerModule: 'src/pkm/canvas',
  },

  // 3. Planning
  {
    id: 'FEAT-PLAN-01',
    subsystem: 'Planning',
    featureName: 'Tasks, Subtasks, Priorities & Kanban Boards',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'None.',
    ownerModule: 'src/pkm/tasks',
  },
  {
    id: 'FEAT-PLAN-02',
    subsystem: 'Planning',
    featureName: 'Calendar Agenda & Recurring Schedules',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'None.',
    ownerModule: 'src/pkm/v2/planning',
  },

  // 4. Personal OS Domains
  {
    id: 'FEAT-DOM-01',
    subsystem: 'Personal OS domains',
    featureName: '13 Canonical Domains (People, Tracker, Learning, Library, Finance, Health, Travel, Assets, Decisions, etc.)',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Finance calculations operate on exact integer minor units (cents) to eliminate float rounding errors.',
    ownerModule: 'src/pkm/v2/domains',
  },

  // 5. Automations & Intelligence
  {
    id: 'FEAT-AUTO-01',
    subsystem: 'Automations',
    featureName: 'Declarative Trigger-Condition-Action Automation Engine',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Mobile OS limits continuous background execution; automations catch up on app foreground.',
    ownerModule: 'src/pkm/v2/automation',
  },
  {
    id: 'FEAT-AI-01',
    subsystem: 'AI / Local Intelligence',
    featureName: 'Client-Side Semantic Search & Related Notes',
    status: 'Beta',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Tablet'],
    knownLimitations: 'Optional local model download (ONNX runtime); fallback to high-speed lexical BM25 indexing.',
    ownerModule: 'src/pkm/embeddingsEngine.ts',
  },

  // 6. Ecosystem & Interoperability
  {
    id: 'FEAT-ECO-01',
    subsystem: 'Plugins',
    featureName: 'Plugin Runtime Sandbox with Safe Mode & Permission Escalation',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Plugins are isolated in WebWorkers; zero direct native bridge access.',
    ownerModule: 'src/pkm/v2/interoperability',
  },
  {
    id: 'FEAT-ECO-02',
    subsystem: 'Connectors',
    featureName: 'Connector Lifecycle Manager (OAuth, Delta Sync, Clean Disconnect)',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Tokens stored in platform secure storage; external writes require explicit user confirmation.',
    ownerModule: 'src/pkm/v2/interoperability',
  },
  {
    id: 'FEAT-ECO-03',
    subsystem: 'Import / Export',
    featureName: '8-Stage Import Pipeline & Open Standard Export (iCal, vCard, BibTeX, Finance)',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Zero mutation during stages 1-5; full rollback guarantee.',
    ownerModule: 'src/pkm/v2/interoperability',
  },
  {
    id: 'FEAT-ECO-04',
    subsystem: 'Publishing',
    featureName: 'Privacy-Scoped Static Site Publishing',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Tablet'],
    knownLimitations: 'Redacts transclusions pointing to private notes outside the public allowlist.',
    ownerModule: 'src/pkm/publishing',
  },

  // 7. Sync & Backup
  {
    id: 'FEAT-SYNC-01',
    subsystem: 'Sync',
    featureName: 'Deterministic LWW Sync & Conflict Center',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Local-first architecture; remote transports act purely as passive synchronization relays.',
    ownerModule: 'src/pkm/v2/sync',
  },
  {
    id: 'FEAT-BACK-01',
    subsystem: 'Backup / Recovery',
    featureName: 'AES-256-GCM Encrypted Backup & Vault Doctor',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA', 'Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Tablet'],
    knownLimitations: 'Deterministic ZIP format with SHA-256 manifest validation.',
    ownerModule: 'src/pkm/v2/disaster',
  },

  // 8. Platform Integrations
  {
    id: 'FEAT-PLAT-01',
    subsystem: 'Web / PWA',
    featureName: 'Standalone PWA App Shell, Service Worker Caching & Offline Autonomy',
    status: 'Stable',
    supportedPlatforms: ['Web', 'PWA'],
    knownLimitations: 'Origin Private FS used where supported; clean offline startup fallback.',
    ownerModule: 'src/pkm/pwa',
  },
  {
    id: 'FEAT-PLAT-02',
    subsystem: 'Desktop',
    featureName: 'Native Window State, File Associations & System Menus',
    status: 'Stable',
    supportedPlatforms: ['Windows', 'macOS', 'Linux'],
    knownLimitations: 'Window state and geometry remain strictly device-local and non-canonical.',
    ownerModule: 'src/pkm/desktop',
  },
  {
    id: 'FEAT-PLAT-03',
    subsystem: 'Android & iOS',
    featureName: 'Native Share Ingestion, Process Death Recovery & Biometric Unlock',
    status: 'Stable',
    supportedPlatforms: ['Android', 'iOS'],
    knownLimitations: 'Background execution budget enforced by OS; catch-up execution on foreground.',
    ownerModule: 'src/pkm/platform',
  },
  {
    id: 'FEAT-PLAT-04',
    subsystem: 'Tablet',
    featureName: 'Dual-Pane Adaptive Workspaces & Orientation State Invariance',
    status: 'Stable',
    supportedPlatforms: ['Tablet', 'Web', 'Desktop'],
    knownLimitations: 'Automatically switches to single-pane or stacked view on narrow multitasking splits (<800px).',
    ownerModule: 'src/pkm/platform',
  },
];

export class V2FeatureFreezeManifestService {
  private static instance: V2FeatureFreezeManifestService | null = null;

  public static getInstance(): V2FeatureFreezeManifestService {
    if (!V2FeatureFreezeManifestService.instance) {
      V2FeatureFreezeManifestService.instance = new V2FeatureFreezeManifestService();
    }
    return V2FeatureFreezeManifestService.instance;
  }

  public getManifest(): FrozenFeatureEntry[] {
    return V2_FROZEN_FEATURE_MANIFEST;
  }

  public isFeatureFrozen(): boolean {
    return true;
  }

  public getFreezeDeclaration(): {
    isFrozen: boolean;
    phase: string;
    nextPhase: string;
    allowedChangesInNextPhases: string[];
    disallowedChangesInNextPhases: string[];
  } {
    return {
      isFrozen: true,
      phase: 'V2.25 — Platform & Feature Completion Freeze',
      nextPhase: 'V2.26 — Full-System Audit & Blocker Elimination',
      allowedChangesInNextPhases: [
        'Defect fixes and edge-case resolution',
        'Data integrity and reliability hardening',
        'Performance optimization and memory leak eradication',
        'Accessibility (WCAG AA, screen readers, keyboard navigation)',
        'Security hardening and sandbox verification',
        'Release packaging, code signing, and certification',
      ],
      disallowedChangesInNextPhases: [
        'Adding new product domains',
        'Adding new AI models or agents',
        'Adding new UI workflows or major screens',
        'Adding new sync protocols or database engines',
        'Adding cloud collaboration or user accounts',
      ],
    };
  }
}

export const v2FeatureFreezeManifestService = V2FeatureFreezeManifestService.getInstance();
