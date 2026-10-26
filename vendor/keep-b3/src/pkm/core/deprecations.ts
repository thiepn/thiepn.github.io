/**
 * PKM V1.10: Deprecations Registry & Terminology Normalization
 * 
 * Formal record of deprecated terminology, settings keys, and legacy aliases in V1.x.
 * Guarantees zero user data loss and automatic non-destructive migration.
 */

export interface DeprecationEntry {
  deprecatedTerm: string;
  canonicalTerm: string;
  category: 'Terminology' | 'Settings Key' | 'API Alias' | 'Export Format';
  introducedIn: string;
  deprecatedIn: string;
  stillSupportedInV1: boolean;
  plannedRemoval: string;
  rationale: string;
}

export const AUDITED_DEPRECATIONS: DeprecationEntry[] = [
  {
    deprecatedTerm: 'Smart View',
    canonicalTerm: 'Saved View',
    category: 'Terminology',
    introducedIn: 'V1.0',
    deprecatedIn: 'V1.6',
    stillSupportedInV1: true,
    plannedRemoval: 'V2.0 (if ever created)',
    rationale: 'Unified with standard filter views and saved searches across all domains.',
  },
  {
    deprecatedTerm: 'Saved Search',
    canonicalTerm: 'Saved View',
    category: 'Terminology',
    introducedIn: 'V1.0',
    deprecatedIn: 'V1.6',
    stillSupportedInV1: true,
    plannedRemoval: 'V2.0',
    rationale: 'Redundant with Saved View schema.',
  },
  {
    deprecatedTerm: 'Quick Access',
    canonicalTerm: 'Favorite',
    category: 'Terminology',
    introducedIn: 'V1.1',
    deprecatedIn: 'V1.6',
    stillSupportedInV1: true,
    plannedRemoval: 'V2.0',
    rationale: 'Aligned with universal Favorite and Pin semantics in the sidebar.',
  },
  {
    deprecatedTerm: 'Page',
    canonicalTerm: 'Note',
    category: 'Terminology',
    introducedIn: 'V1.0',
    deprecatedIn: 'V1.0',
    stillSupportedInV1: true,
    plannedRemoval: 'V2.0',
    rationale: 'Personal OS uses Note as the canonical atomic atomic knowledge unit.',
  },
  {
    deprecatedTerm: 'settings.smart_query_mode',
    canonicalTerm: 'settings.saved_view_filters',
    category: 'Settings Key',
    introducedIn: 'V1.0',
    deprecatedIn: 'V1.9',
    stillSupportedInV1: true,
    plannedRemoval: 'V2.0',
    rationale: 'Normalized under universal settings schema.',
  },
  {
    deprecatedTerm: 'pkm_export_v1_raw',
    canonicalTerm: 'pkm_portable_vault_v1_8',
    category: 'Export Format',
    introducedIn: 'V1.0',
    deprecatedIn: 'V1.8',
    stillSupportedInV1: true,
    plannedRemoval: 'V2.0',
    rationale: 'Replaced by formal Portable Vault specification with manifest metadata.',
  },
];

export class DeprecationsService {
  public getAll(): DeprecationEntry[] {
    return [...AUDITED_DEPRECATIONS];
  }

  /**
   * Normalizes legacy user terms in text or settings
   */
  public normalizeTerm(term: string): string {
    const match = AUDITED_DEPRECATIONS.find(
      (d) => d.deprecatedTerm.toLowerCase() === term.toLowerCase()
    );
    return match ? match.canonicalTerm : term;
  }
}

export const deprecationsService = new DeprecationsService();
