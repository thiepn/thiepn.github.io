/**
 * V2.14 Architecture Health & Subsystem Boundary Assessment Engine
 * 
 * Provides qualitative evaluation of all major V2 architectural components,
 * dependency directionality, ownership boundaries, and maintenance costs.
 */

export type SubsystemHealthRating =
  | 'Healthy'
  | 'Healthy with debt'
  | 'High maintenance'
  | 'Potential future redesign';

export interface ArchitectureSubsystemRecord {
  name: string;
  category: 'Core Shell' | 'Data & Storage' | 'Workflows & Domains' | 'Ecosystem & Platform' | 'Reliability & Resilience';
  ownerModule: string;
  singleSourceOfTruth: boolean;
  directionalDependencies: boolean;
  errorIsolation: boolean;
  independentlyTestable: boolean;
  healthRating: SubsystemHealthRating;
  maintenanceCost: 'Low' | 'Moderate' | 'High' | 'Unsustainable';
  rationale: string;
  contractStatus: 'Stable Freeze' | 'Active Evolution' | 'Legacy Contained';
}

export const V2_14_ARCHITECTURE_SUBSYSTEMS: ArchitectureSubsystemRecord[] = [
  {
    name: 'App Shell & Main Layout',
    category: 'Core Shell',
    ownerModule: 'src/pkm/v2/shell/',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'App Shell remains strictly domain-agnostic; delegates rendering to registered workspace surfaces.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Unified Resource Registry',
    category: 'Data & Storage',
    ownerModule: 'src/pkm/v2/core/resourceRegistry.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Clean polymorphic resource lifecycle and schema validation across core and domain entities.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Action Registry & Command Dispatcher',
    category: 'Core Shell',
    ownerModule: 'src/pkm/v2/actions/actionRegistry.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Single canonical Action ID registry with expected-version guards and undo/redo capabilities.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Query Engine & Saved Views',
    category: 'Data & Storage',
    ownerModule: 'src/pkm/v2/views/queryEngine.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Declarative query AST with typed operators, date comparisons, and parameter injection.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Cross-Domain Connection System',
    category: 'Workflows & Domains',
    ownerModule: 'src/pkm/v2/domains/crossDomainRelationEngine.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Bidirectional relations without duplicate data copies or circular reference leaks.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Storage, Caching & IndexedDB Isolation',
    category: 'Data & Storage',
    ownerModule: 'src/pkm/resilience/atomicTransactions.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy with debt',
    maintenanceCost: 'Moderate',
    rationale: 'Robust in browser; graceful fallback harness required in headless Node unit testing environments.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Disaster Recovery & Backup Engine',
    category: 'Reliability & Resilience',
    ownerModule: 'src/pkm/v2/disaster/restoreEngineV2.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Standard zip/tar + JSON manifest snapshot format with verifiable CRC and corruption containment.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Cross-Device Sync Protocol',
    category: 'Reliability & Resilience',
    ownerModule: 'src/pkm/v2/sync/syncEngineV2.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Moderate',
    rationale: 'Deterministic LWW + explicit conflict tombstone resolution; non-authoritative client relay.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Plugin Ecosystem & Sandbox',
    category: 'Ecosystem & Platform',
    ownerModule: 'src/pkm/v2/ecosystem/pluginEcosystemManager.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Safe Mode quarantine after 3 crashes, permission escalation interceptor, bounded API surface.',
    contractStatus: 'Active Evolution',
  },
  {
    name: 'External Connectors & Outage Containment',
    category: 'Ecosystem & Platform',
    ownerModule: 'src/pkm/v2/ecosystem/connectorMaturityManager.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Graceful needs_attention error states isolate third-party failures without core data loss.',
    contractStatus: 'Active Evolution',
  },
  {
    name: 'Native Platform Integrations',
    category: 'Ecosystem & Platform',
    ownerModule: 'src/pkm/v2/ecosystem/nativeFileIntegrationRouter.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Path-traversal sanitization, OS open-with dialogs, and platform modifier normalizers.',
    contractStatus: 'Stable Freeze',
  },
  {
    name: 'Optional Local / Cloud AI Assist',
    category: 'Ecosystem & Platform',
    ownerModule: 'src/pkm/v2/rc/aiGuardrails.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Strictly optional assistant; zero automated background mutations; full lock privacy scrubbing.',
    contractStatus: 'Active Evolution',
  },
  {
    name: 'Legacy V1 Compatibility Boundary',
    category: 'Reliability & Resilience',
    ownerModule: 'src/pkm/v2/compat/v1SchemaAdapter.ts',
    singleSourceOfTruth: true,
    directionalDependencies: true,
    errorIsolation: true,
    independentlyTestable: true,
    healthRating: 'Healthy',
    maintenanceCost: 'Low',
    rationale: 'Isolated to migration entry points; 0 legacy branching on hot rendering or editing paths.',
    contractStatus: 'Legacy Contained',
  },
];

export class ArchitectureHealthAssessmentEngine {
  private static instance: ArchitectureHealthAssessmentEngine | null = null;

  private constructor() {}

  public static getInstance(): ArchitectureHealthAssessmentEngine {
    if (!ArchitectureHealthAssessmentEngine.instance) {
      ArchitectureHealthAssessmentEngine.instance = new ArchitectureHealthAssessmentEngine();
    }
    return ArchitectureHealthAssessmentEngine.instance;
  }

  public getSubsystems(): ArchitectureSubsystemRecord[] {
    return V2_14_ARCHITECTURE_SUBSYSTEMS;
  }

  public getHealthSummary() {
    const list = V2_14_ARCHITECTURE_SUBSYSTEMS;
    const total = list.length;
    const healthy = list.filter(s => s.healthRating === 'Healthy').length;
    const healthyWithDebt = list.filter(s => s.healthRating === 'Healthy with debt').length;
    const highMaintenance = list.filter(s => s.healthRating === 'High maintenance').length;
    const redesignNeeded = list.filter(s => s.healthRating === 'Potential future redesign').length;

    const allHaveSingleSource = list.every(s => s.singleSourceOfTruth);
    const allHaveErrorIsolation = list.every(s => s.errorIsolation);

    return {
      total,
      healthy,
      healthyWithDebt,
      highMaintenance,
      redesignNeeded,
      allHaveSingleSource,
      allHaveErrorIsolation,
      architectureSustainable: redesignNeeded === 0 && highMaintenance === 0,
    };
  }
}

export const architectureHealthAssessmentEngine = ArchitectureHealthAssessmentEngine.getInstance();
