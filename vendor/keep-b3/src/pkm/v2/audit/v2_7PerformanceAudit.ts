/**
 * PKM V2.7 — Extreme-Scale Performance, Runtime Efficiency & Platform Optimization Audit
 *
 * Performance classification matrix, benchmark environment specification,
 * fixture definitions (Fixture S, N, L, X), and SLA latency budgets.
 */

export type PerformanceClass =
  | 'class_a_instant'       // < 16ms (60fps) - Keystroke, Quick Switcher, tab switch, UI toggles
  | 'class_b_interactive'   // < 100ms - Search first result, Resource open, Home load, Context resolve
  | 'class_c_progressive'   // < 500ms streaming - Large Graph, Large PDF, complex dashboards, multi-domain aggregations
  | 'class_d_maintenance';  // Background / Non-blocking - Full backup, index rebuild, extreme import

export interface PerformanceBudgetEntry {
  operationName: string;
  performanceClass: PerformanceClass;
  targetP50Ms: number;
  targetP95Ms: number;
  maxAllowableMs: number;
  memoryLimitMb?: number;
  description: string;
}

export const V2_7_PERFORMANCE_BUDGET_MATRIX: PerformanceBudgetEntry[] = [
  {
    operationName: 'Editor Keystroke Latency',
    performanceClass: 'class_a_instant',
    targetP50Ms: 2,
    targetP95Ms: 8,
    maxAllowableMs: 16,
    description: 'Keystroke event to paint under active editing with incremental AST update',
  },
  {
    operationName: 'Quick Switcher Open & First Match',
    performanceClass: 'class_a_instant',
    targetP50Ms: 3,
    targetP95Ms: 10,
    maxAllowableMs: 20,
    description: 'Instant title/alias candidate matching over 100,000 indexed resources',
  },
  {
    operationName: 'UI State Toggle / Task Completion',
    performanceClass: 'class_a_instant',
    targetP50Ms: 2,
    targetP95Ms: 6,
    maxAllowableMs: 16,
    description: 'Single task status toggle with localized subscriber invalidation',
  },
  {
    operationName: 'Resource Open (Standard Note)',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 12,
    targetP95Ms: 35,
    maxAllowableMs: 80,
    description: 'Open standard Note with body, outline, and lazy inspector sections',
  },
  {
    operationName: 'Resource Open (Large Note 50k lines)',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 28,
    targetP95Ms: 65,
    maxAllowableMs: 120,
    description: 'Open 50,000-line Markdown document using virtualized windowed AST rendering',
  },
  {
    operationName: 'Search Lexical First Result (100k Vault)',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 15,
    targetP95Ms: 45,
    maxAllowableMs: 90,
    description: 'Top-K lexical candidate retrieval across 100,000 Notes via compact postings',
  },
  {
    operationName: 'Home Core Usable Load',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 25,
    targetP95Ms: 60,
    maxAllowableMs: 100,
    description: 'Initial Home render with Continue, Attention, Today, and Inbox streams',
  },
  {
    operationName: 'Context Working Set Resolution',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 18,
    targetP95Ms: 50,
    maxAllowableMs: 95,
    description: 'Context lens assembly via connection index without whole-vault scans',
  },
  {
    operationName: 'Saved View Execution (100k Resources)',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 20,
    targetP95Ms: 55,
    maxAllowableMs: 100,
    description: 'Structured query filtering and compact sorting with first page hydration',
  },
  {
    operationName: 'Today / Agenda Recurrence Windowing',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 8,
    targetP95Ms: 25,
    maxAllowableMs: 50,
    description: 'Bounded 30-day temporal occurrence projection for 10,000 recurrence rules',
  },
  {
    operationName: 'Activity Timeline Page Load (1-Year Scale)',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 10,
    targetP95Ms: 30,
    maxAllowableMs: 60,
    description: 'Paginated index cursor retrieval of coalesced activity events',
  },
  {
    operationName: 'Local Graph Neighbor Traversal',
    performanceClass: 'class_b_interactive',
    targetP50Ms: 4,
    targetP95Ms: 12,
    maxAllowableMs: 25,
    description: 'Degree-proportional 2-hop neighborhood query across 2M edge connection graph',
  },
  {
    operationName: 'Global Graph Clustered Layout (100k Nodes)',
    performanceClass: 'class_c_progressive',
    targetP50Ms: 120,
    targetP95Ms: 320,
    maxAllowableMs: 500,
    description: 'Worker-backed level-of-detail clustered graph rendering with viewport culling',
  },
  {
    operationName: 'Canvas Pan & Zoom Frame Rate',
    performanceClass: 'class_a_instant',
    targetP50Ms: 16.6,
    targetP95Ms: 16.6,
    maxAllowableMs: 20,
    description: '60fps canvas interaction with spatial quadtree culling over 5,000 cards',
  },
  {
    operationName: 'PDF Page Window Render (2,000-page Doc)',
    performanceClass: 'class_c_progressive',
    targetP50Ms: 45,
    targetP95Ms: 120,
    maxAllowableMs: 250,
    description: 'On-demand page rasterization with bounded 5-page memory cache',
  },
  {
    operationName: 'Full Backup Archive Creation (Fixture L)',
    performanceClass: 'class_d_maintenance',
    targetP50Ms: 450,
    targetP95Ms: 1200,
    maxAllowableMs: 3000,
    description: 'Streaming SHA-256 backup creation yielding to foreground user tasks',
  },
  {
    operationName: 'Vault Doctor Full Integrity Audit (100k Vault)',
    performanceClass: 'class_d_maintenance',
    targetP50Ms: 350,
    targetP95Ms: 950,
    maxAllowableMs: 2500,
    description: 'Comprehensive invariant and relation verification running at maintenance priority',
  },
];

export interface FixtureProfile {
  name: 'Fixture S (Small)' | 'Fixture N (Normal)' | 'Fixture L (Large)' | 'Fixture X (Extreme)';
  noteCount: number;
  taskCount: number;
  structuredResourceCount: number;
  historicalEventCount: number;
  connectionCount: number;
  attachmentManifestCount: number;
  description: string;
}

export const V2_7_FIXTURE_PROFILES: Record<string, FixtureProfile> = {
  S: {
    name: 'Fixture S (Small)',
    noteCount: 100,
    taskCount: 500,
    structuredResourceCount: 200,
    historicalEventCount: 1000,
    connectionCount: 500,
    attachmentManifestCount: 20,
    description: 'Small starter vault for quick sanity and UI unit tests',
  },
  N: {
    name: 'Fixture N (Normal)',
    noteCount: 5000,
    taskCount: 10000,
    structuredResourceCount: 5000,
    historicalEventCount: 50000,
    connectionCount: 50000,
    attachmentManifestCount: 250,
    description: 'Typical active personal vault with 2+ years of multi-domain records',
  },
  L: {
    name: 'Fixture L (Large)',
    noteCount: 50000,
    taskCount: 100000,
    structuredResourceCount: 50000,
    historicalEventCount: 500000,
    connectionCount: 500000,
    attachmentManifestCount: 1500,
    description: 'Heavy personal knowledge base with extensive history and connections',
  },
  X: {
    name: 'Fixture X (Extreme)',
    noteCount: 100000,
    taskCount: 500000,
    structuredResourceCount: 200000,
    historicalEventCount: 1000000,
    connectionCount: 2000000,
    attachmentManifestCount: 5000,
    description: 'Extreme scale stress test verifying zero-freeze and bounded memory plateau',
  },
};
