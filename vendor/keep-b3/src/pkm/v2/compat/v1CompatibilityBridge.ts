/**
 * V1 Compatibility Bridge
 * Provides safe shims for legacy V1 terminology and settings without polluting V2 hot paths.
 */

export class V1CompatibilityBridge {
  public normalizeLegacyTerm(term: string): string {
    const map: Record<string, string> = {
      'Smart View': 'Saved View',
      'Saved Search': 'Saved View',
      'Quick Access': 'Favorite',
      Page: 'Note',
    };
    return map[term] || term;
  }

  public normalizeLegacySettings(rawSettings: Record<string, any>): Record<string, any> {
    const normalized = { ...rawSettings };

    if ('smart_query_mode' in normalized && !('saved_view_filters' in normalized)) {
      normalized.saved_view_filters = normalized.smart_query_mode;
      delete normalized.smart_query_mode;
    }

    return normalized;
  }
}

export const v1CompatibilityBridge = new V1CompatibilityBridge();
