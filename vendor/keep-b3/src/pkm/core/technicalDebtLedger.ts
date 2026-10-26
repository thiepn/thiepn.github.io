/**
 * PKM V1.9: Structured Technical Debt Ledger
 * 
 * Central registry of audited, high-value technical debt across the application.
 * Excludes cosmetic or trivial TODOs and provides actionable remediation paths.
 */

export type DebtSeverity = 'Critical' | 'High' | 'Medium';
export type DebtCategory = 'Architecture' | 'Performance' | 'Security' | 'Compatibility' | 'Testing' | 'Platform' | 'Dependency';

export interface TechnicalDebtItem {
  id: string;
  subsystem: string;
  category: DebtCategory;
  severity: DebtSeverity;
  title: string;
  description: string;
  risk: string;
  impact: string;
  whyDeferred: string;
  recommendedAction: string;
  status: 'active' | 'resolved' | 'mitigated';
}

export const AUDITED_TECHNICAL_DEBT: TechnicalDebtItem[] = [
  {
    id: 'DEBT-001',
    subsystem: 'Graph & Spatial Canvas',
    category: 'Architecture',
    severity: 'Medium',
    title: 'Large Graph / Canvas Visualization Bundle Weight',
    description: 'D3/Canvas geometry calculations are bundled in shared code rather than completely isolated behind dynamic import splits.',
    risk: 'Marginally increases initial JS payload for users who only use text notes.',
    impact: 'Initial bundle size is ~60KB larger than minimal text-only PKM baseline.',
    whyDeferred: 'Graph is heavily accessed via Quick Switcher and split view; isolating it requires a dynamic chunk loader barrier.',
    recommendedAction: 'Apply code-splitting boundary at the Canvas/Graph workspace route in V1.10.',
    status: 'mitigated',
  },
  {
    id: 'DEBT-002',
    subsystem: 'Full-Vault Search',
    category: 'Performance',
    severity: 'Medium',
    title: 'In-Memory BM25 Index Tokenization on 50k+ Vaults',
    description: 'On vaults with >50,000 notes on low-end mobile devices (<2GB RAM), rebuilding the entire lexical index in a single batch can cause 100ms UI frames.',
    risk: 'Potential frame drops during initial index rebuild on mobile.',
    impact: 'Slight hitch during full-vault index rebuild.',
    whyDeferred: 'TaskCoordinator now yields cooperatively on idle callbacks, mitigating UI freezes.',
    recommendedAction: 'Introduce streaming batch chunks (500 notes/chunk) for background indexing.',
    status: 'mitigated',
  },
  {
    id: 'DEBT-003',
    subsystem: 'Historical Serializers',
    category: 'Compatibility',
    severity: 'Medium',
    title: 'Legacy V1.0-V1.2 Frontmatter Parser Retention',
    description: 'Preserving forward-compatible parsing for historical raw YAML frontmatter requires keeping multiple regex fallback patterns.',
    risk: 'Slightly higher cyclomatic complexity in parser.ts.',
    impact: '15 extra lines of fallback code.',
    whyDeferred: 'Crucial for non-destructive backwards compatibility with user vaults created in 2024-2025.',
    recommendedAction: 'Retain until V2.0 migration epoch.',
    status: 'active',
  },
  {
    id: 'DEBT-004',
    subsystem: 'PDF Engine',
    category: 'Performance',
    severity: 'Medium',
    title: 'PDF.js Worker Initialization Cost',
    description: 'PDF rendering requires Web Worker initialization and ArrayBuffer memory allocation.',
    risk: 'High memory usage if multiple 100MB PDF books are opened concurrently.',
    impact: 'Increased tab memory footprint during active academic reading.',
    whyDeferred: 'Object URL cleanup registry now aggressively revokes cached buffers on reader close.',
    recommendedAction: 'Add LRU page caching for large PDF files.',
    status: 'mitigated',
  },
];

export function getActiveDebtItems(): TechnicalDebtItem[] {
  return AUDITED_TECHNICAL_DEBT.filter((d) => d.status === 'active' || d.status === 'mitigated');
}
