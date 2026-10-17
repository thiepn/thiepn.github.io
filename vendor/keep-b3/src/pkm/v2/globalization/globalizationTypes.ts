/**
 * PKM V2.18 Globalization, Localization & Accessibility Types
 */

export type UILanguageCode = 'en' | 'de' | 'fr' | 'ko' | 'tr' | 'ar-rtl' | 'pseudo';
export type RegionalLocaleCode = 'en-US' | 'en-GB' | 'de-DE' | 'fr-FR' | 'ko-KR' | 'tr-TR' | 'ar-SA' | 'ja-JP';

export type TextDirection = 'ltr' | 'rtl';
export type FirstDayOfWeek = 0 | 1 | 6; // 0 = Sunday, 1 = Monday, 6 = Saturday
export type TimeFormatPreference = '12h' | '24h' | 'system';

export interface GlobalizationConfig {
  language: UILanguageCode;
  locale: RegionalLocaleCode;
  direction: TextDirection;
  firstDayOfWeek: FirstDayOfWeek;
  timeFormat: TimeFormatPreference;
  highContrast: boolean;
  reducedMotion: boolean;
  largeTextScale: number; // 1.0 = normal, 1.25, 1.5, 2.0
  pseudoLocalizationEnabled: boolean;
}

export interface TranslationDictionary {
  [domain: string]: {
    [key: string]: string;
  };
}

export interface TranslationParams {
  [key: string]: string | number | boolean;
}

export interface CurrencyValue {
  amount: number; // Integer cents or canonical float
  currency: string; // ISO 4217 (e.g. 'USD', 'EUR', 'KRW')
}

export interface ParsedNumberResult {
  value: number | null;
  isValid: boolean;
  rawInput: string;
  detectedDecimalSeparator?: string;
  error?: string;
}

export interface LocaleDateParseResult {
  dateOnly?: string; // YYYY-MM-DD
  dateTime?: string; // ISO 8601
  isValid: boolean;
  isAmbiguous: boolean;
  rawInput: string;
  error?: string;
}

export interface GraphemeSegment {
  segment: string;
  index: number;
  isEmoji: boolean;
}

export interface UnicodeFilenameSanitizeResult {
  safeFilename: string;
  originalName: string;
  hasCollisionRisk: boolean;
  normalizedNFC: string;
  normalizedNFD: string;
  isWindowsSafe: boolean;
  isMacOSSafe: boolean;
  isLinuxSafe: boolean;
}

export interface BidiSanitizeResult {
  sanitized: string;
  original: string;
  hasBidiSpoofingControls: boolean;
  removedControlsCount: number;
}

export interface MultilingualSearchResult {
  resourceId: string;
  title: string;
  highlightedTitle: string;
  snippet: string;
  score: number;
  matchedTerms: string[];
}

export interface AccessibleChartData {
  chartTitle: string;
  seriesName: string;
  summaryText: string;
  min: number;
  max: number;
  average: number;
  unit?: string;
  dataPoints: Array<{
    label: string;
    value: number;
    formattedValue: string;
  }>;
}

export interface CanvasStructuredAlternative {
  canvasId: string;
  canvasTitle: string;
  totalNodes: number;
  nodes: Array<{
    id: string;
    type: 'note' | 'card' | 'resource' | 'group';
    title: string;
    contentSummary?: string;
    connectedToNodeIds: string[];
  }>;
  connections: Array<{
    id: string;
    fromId: string;
    toId: string;
    label?: string;
  }>;
}

export interface GraphStructuredAlternative {
  targetResourceId: string;
  targetTitle: string;
  incomingLinks: Array<{
    sourceId: string;
    sourceTitle: string;
    relationType: string;
  }>;
  outgoingLinks: Array<{
    targetId: string;
    targetTitle: string;
    relationType: string;
  }>;
  unlinkedMentions: Array<{
    sourceId: string;
    sourceTitle: string;
    context: string;
  }>;
}

export interface V2_18CertificationGate {
  gateId: string;
  name: string;
  severity: 'S0_CRITICAL' | 'S1_HIGH' | 'S2_MEDIUM';
  description: string;
  passed: boolean;
  evidence: string;
}

export interface V2_18CertificationReport {
  overallPassed: boolean;
  totalGates: number;
  passedGates: number;
  failedGates: number;
  classification: 'V2.18 — GLOBAL USABILITY & ACCESSIBILITY READY' | 'V2.18 — READY WITH LOCALIZATION / ACCESSIBILITY LIMITATIONS' | 'V2.18 — NOT READY';
  timestamp: string;
  executionDurationMs: number;
  gates: V2_18CertificationGate[];
  benchmarkSummary: {
    startupMs: number;
    searchLatencyP95Ms: number;
    tableRender10kCellsMs: number;
    collationThroughputOpsSec: number;
  };
}
