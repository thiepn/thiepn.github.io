/**
 * PKM V2.18 Central Globalization, Formatting & Translation Engine
 * 
 * Provides bounded Intl caching, locale-aware date/number/currency parsing and formatting,
 * collation with Turkish/German/Korean/French rules, ICU-style pluralization,
 * translation lookup with fallback and pseudo-localization, and strict isolation of canonical data.
 */

import {
  GlobalizationConfig,
  UILanguageCode,
  RegionalLocaleCode,
  ParsedNumberResult,
  LocaleDateParseResult,
  CurrencyValue,
} from './globalizationTypes';
import { TRANSLATION_CATALOG } from './translations';
import { enTranslations } from './translations/en';

export class V2GlobalizationEngine {
  private static instance: V2GlobalizationEngine | null = null;

  private config: GlobalizationConfig = {
    language: 'en',
    locale: 'en-US',
    direction: 'ltr',
    firstDayOfWeek: 0,
    timeFormat: 'system',
    highContrast: false,
    reducedMotion: false,
    largeTextScale: 1.0,
    pseudoLocalizationEnabled: false,
  };

  private listeners: Set<(config: GlobalizationConfig) => void> = new Set();

  // Bounded caches for Intl instances to avoid high-frequency garbage collection
  private numberFormatCache: Map<string, Intl.NumberFormat> = new Map();
  private dateTimeFormatCache: Map<string, Intl.DateTimeFormat> = new Map();
  private collatorCache: Map<string, Intl.Collator> = new Map();
  private pluralRulesCache: Map<string, Intl.PluralRules> = new Map();

  private readonly MAX_CACHE_SIZE = 64;

  private constructor() {
    this.detectSystemPreferences();
  }

  public static getInstance(): V2GlobalizationEngine {
    if (!V2GlobalizationEngine.instance) {
      V2GlobalizationEngine.instance = new V2GlobalizationEngine();
    }
    return V2GlobalizationEngine.instance;
  }

  public static resetInstance(): void {
    V2GlobalizationEngine.instance = null;
  }

  private detectSystemPreferences(): void {
    if (typeof window !== 'undefined') {
      try {
        const sysLocale = navigator.language || 'en-US';
        this.config.locale = (sysLocale.includes('-') ? sysLocale : `${sysLocale}-${sysLocale.toUpperCase()}`) as RegionalLocaleCode;
        if (this.config.locale.startsWith('ar') || this.config.locale.startsWith('he')) {
          this.config.direction = 'rtl';
        }
      } catch {
        // Fallback to en-US
      }
    }
  }

  // ==========================================================================
  // CONFIGURATION & STATE
  // ==========================================================================

  public getConfig(): GlobalizationConfig {
    return { ...this.config };
  }

  public setConfig(partial: Partial<GlobalizationConfig>): void {
    this.config = { ...this.config, ...partial };
    if (this.config.language === 'ar-rtl') {
      this.config.direction = 'rtl';
    } else if (this.config.language !== 'pseudo' && !partial.direction) {
      this.config.direction = 'ltr';
    }
    this.notifyListeners();
  }

  public subscribe(listener: (config: GlobalizationConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.getConfig());
    }
  }

  // ==========================================================================
  // TRANSLATION & PLURALIZATION
  // ==========================================================================

  public t(domain: string, key: string, params?: Record<string, any>, langOverride?: UILanguageCode): string {
    const lang = langOverride || this.config.language;

    if (this.config.pseudoLocalizationEnabled || lang === 'pseudo') {
      const baseEnglish = this.lookupTranslation('en', domain, key);
      const interpolated = this.interpolate(baseEnglish, params, 'en');
      return this.pseudoLocalize(interpolated);
    }

    const rawTemplate = this.lookupTranslation(lang, domain, key);
    return this.interpolate(rawTemplate, params, lang);
  }

  private lookupTranslation(lang: UILanguageCode, domain: string, key: string): string {
    const dict = TRANSLATION_CATALOG[lang];
    if (dict && dict[domain] && dict[domain][key] !== undefined) {
      return dict[domain][key];
    }

    // Fallback to English
    const fallbackDict = enTranslations;
    if (fallbackDict[domain] && fallbackDict[domain][key] !== undefined) {
      return fallbackDict[domain][key];
    }

    // Missing key safe fallback
    return `[${domain}.${key}]`;
  }

  private interpolate(template: string, params?: Record<string, any>, lang?: UILanguageCode): string {
    if (!template) return '';
    if (!params) return template;

    // Handle ICU pluralization: {count, plural, =0 {No items} =1 {1 item} other {# items}}
    const pluralPrefixRegex = /\{(\w+),\s*plural,\s*/;
    let match = template.match(pluralPrefixRegex);
    while (match && match.index !== undefined) {
      const startIndex = match.index;
      const varName = match[1];
      const rulesStartIndex = startIndex + match[0].length;

      // Find matching closing brace for the outer {varName, plural, ...}
      let braceDepth = 1;
      let endIndex = -1;
      for (let i = rulesStartIndex; i < template.length; i++) {
        if (template[i] === '{') {
          braceDepth++;
        } else if (template[i] === '}') {
          braceDepth--;
          if (braceDepth === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex !== -1) {
        const rulesStr = template.slice(rulesStartIndex, endIndex);
        const countVal = Number(params[varName] ?? 0);
        const resolvedPlural = this.resolvePlural(countVal, rulesStr, lang || 'en');
        const replacedVal = resolvedPlural.replace(/#/g, String(countVal));
        template = template.slice(0, startIndex) + replacedVal + template.slice(endIndex + 1);
        match = template.match(pluralPrefixRegex);
      } else {
        break;
      }
    }

    // Replace standard {param} placeholders
    return template.replace(/\{(\w+)\}/g, (_, k) => {
      return params[k] !== undefined ? String(params[k]) : `{${k}}`;
    });
  }

  private resolvePlural(count: number, rulesStr: string, lang: UILanguageCode): string {
    // Check explicit count e.g. =0 {Zero items} or =1 {1 item}
    const exactRegex = new RegExp(`=${count}\\s*\\{([^}]+)\\}`, 'i');
    const exactMatch = rulesStr.match(exactRegex);
    if (exactMatch) {
      return exactMatch[1];
    }

    // Use Intl.PluralRules
    const pluralRule = this.getPluralRules(lang === 'pseudo' ? 'en' : lang).select(count);
    const categoryRegex = new RegExp(`${pluralRule}\\s*\\{([^}]+)\\}`, 'i');
    const categoryMatch = rulesStr.match(categoryRegex);
    if (categoryMatch) {
      return categoryMatch[1];
    }

    // Fallback to 'other' rule
    const otherMatch = rulesStr.match(/other\s*\{([^}]+)\}/i);
    if (otherMatch) {
      return otherMatch[1];
    }

    return String(count);
  }

  private getPluralRules(lang: string): Intl.PluralRules {
    if (this.pluralRulesCache.has(lang)) {
      return this.pluralRulesCache.get(lang)!;
    }
    const pr = new Intl.PluralRules(lang);
    if (this.pluralRulesCache.size >= this.MAX_CACHE_SIZE) {
      this.pluralRulesCache.clear();
    }
    this.pluralRulesCache.set(lang, pr);
    return pr;
  }

  /**
   * Transforms ASCII Latin text into an expanded, accented pseudo-localized string
   * e.g. "Save" -> "[!!! Śȧṽḗ !!!]"
   */
  public pseudoLocalize(text: string): string {
    if (!text) return '';
    const charMap: Record<string, string> = {
      a: 'ȧ', b: 'ḃ', c: 'ċ', d: 'ḓ', e: 'ḗ', f: 'ḟ', g: 'ġ', h: 'ḧ',
      i: 'ī', j: 'ĵ', k: 'ḳ', l: 'ŀ', m: 'ṁ', n: 'ƞ', o: 'ǿ', p: 'ṗ',
      q: 'ʠ', r: 'ṝ', s: 'ś', t: 'ṫ', u: 'ṻ', v: 'ṽ', w: 'ẅ', x: 'ẋ',
      y: 'ẏ', z: 'ẑ',
      A: 'Ȧ', B: 'Ḃ', C: 'Ċ', D: 'Ḓ', E: 'Ḗ', F: 'Ḟ', G: 'Ġ', H: 'Ḧ',
      I: 'Ī', J: 'Ĵ', K: 'Ḳ', L: 'Ŀ', M: 'Ṁ', N: 'Ƞ', O: 'Ǿ', P: 'Ṗ',
      Q: 'Ǫ', R: 'Ṝ', S: 'Ś', T: 'Ṫ', U: 'Ṻ', V: 'Ṽ', W: 'Ẅ', X: 'Ẋ',
      Y: 'Ẏ', Z: 'Ẑ'
    };

    let converted = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      // Preserve HTML/markdown brackets or placeholders {var}
      if (char === '{' || char === '<' || char === '[') {
        const closeChar = char === '{' ? '}' : char === '<' ? '>' : ']';
        const closeIdx = text.indexOf(closeChar, i);
        if (closeIdx !== -1) {
          converted += text.slice(i, closeIdx + 1);
          i = closeIdx;
          continue;
        }
      }
      converted += charMap[char] || char;
    }

    // Expand length by 35% using accented vowels
    const expansion = ' Ḗẍƥȧƞḓḗḓ';
    return `[!!! ${converted}${expansion} !!!]`;
  }

  public validateTranslationCatalog(): { missing: string[]; unused: string[]; totalKeys: number } {
    const baseKeys: Set<string> = new Set();
    for (const [dom, keys] of Object.entries(enTranslations)) {
      for (const k of Object.keys(keys)) {
        baseKeys.add(`${dom}.${k}`);
      }
    }

    const missing: string[] = [];
    const supportedLangs: UILanguageCode[] = ['de', 'fr', 'ko', 'tr', 'ar-rtl'];

    for (const lang of supportedLangs) {
      const dict = TRANSLATION_CATALOG[lang];
      for (const fullKey of baseKeys) {
        const [dom, k] = fullKey.split('.');
        if (!dict || !dict[dom] || dict[dom][k] === undefined) {
          missing.push(`[${lang}] ${fullKey}`);
        }
      }
    }

    return {
      missing,
      unused: [],
      totalKeys: baseKeys.size,
    };
  }

  // ==========================================================================
  // NUMBER & CURRENCY FORMATTING & PARSING
  // ==========================================================================

  public formatNumber(value: number, options?: Intl.NumberFormatOptions, localeOverride?: RegionalLocaleCode): string {
    if (isNaN(value) || !isFinite(value)) return '0';
    const loc = localeOverride || this.config.locale;
    const cacheKey = `${loc}:${JSON.stringify(options || {})}`;
    let fmt = this.numberFormatCache.get(cacheKey);
    if (!fmt) {
      fmt = new Intl.NumberFormat(loc, options);
      if (this.numberFormatCache.size >= this.MAX_CACHE_SIZE) this.numberFormatCache.clear();
      this.numberFormatCache.set(cacheKey, fmt);
    }
    return fmt.format(value);
  }

  /**
   * Intentionally parses user numeric input in a locale-aware manner.
   * Handles decimal commas (e.g. "1,5" in de-DE -> 1.5), standard grouping separators,
   * non-breaking spaces (\u00A0 and \u202F), and rejects malformed tokens without silent NaN.
   */
  public parseNumber(rawInput: string, localeOverride?: RegionalLocaleCode): ParsedNumberResult {
    if (typeof rawInput !== 'string') {
      return { value: null, isValid: false, rawInput: String(rawInput), error: 'Input is not a string' };
    }

    const cleaned = rawInput.trim();
    if (!cleaned) {
      return { value: null, isValid: false, rawInput, error: 'Empty numeric string' };
    }

    // Normalize whitespace (including non-breaking spaces \u00A0 and narrow non-breaking \u202F)
    const normalizedSpaces = cleaned.replace(/[\u00A0\u202F\s]/g, '');

    // Check if input contains comma as decimal or dot as decimal
    const hasComma = normalizedSpaces.includes(',');
    const hasDot = normalizedSpaces.includes('.');

    let detectedDecimal = '.';
    let standardNumberStr = normalizedSpaces;

    if (hasComma && hasDot) {
      // e.g. "1.234,56" (German/French) or "1,234.56" (US)
      const lastComma = normalizedSpaces.lastIndexOf(',');
      const lastDot = normalizedSpaces.lastIndexOf('.');
      if (lastComma > lastDot) {
        // Comma is decimal separator, dots are thousands
        detectedDecimal = ',';
        standardNumberStr = normalizedSpaces.replace(/\./g, '').replace(',', '.');
      } else {
        // Dot is decimal separator, commas are thousands
        detectedDecimal = '.';
        standardNumberStr = normalizedSpaces.replace(/,/g, '');
      }
    } else if (hasComma) {
      // e.g. "1,5" or "1000,50"
      detectedDecimal = ',';
      standardNumberStr = normalizedSpaces.replace(',', '.');
    }

    // Validate that remaining string is a valid floating point number
    if (!/^-?\d+(\.\d+)?$/.test(standardNumberStr)) {
      return {
        value: null,
        isValid: false,
        rawInput,
        error: `Malformed numeric input: "${rawInput}"`,
      };
    }

    const parsed = parseFloat(standardNumberStr);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return { value: null, isValid: false, rawInput, error: 'Parsed value resulted in NaN or Infinity' };
    }

    return {
      value: parsed,
      isValid: true,
      rawInput,
      detectedDecimalSeparator: detectedDecimal,
    };
  }

  public formatCurrency(amount: number, currencyCode: string = 'USD', localeOverride?: RegionalLocaleCode): string {
    const loc = localeOverride || this.config.locale;
    const cacheKey = `curr:${loc}:${currencyCode}`;
    let fmt = this.numberFormatCache.get(cacheKey);
    if (!fmt) {
      fmt = new Intl.NumberFormat(loc, {
        style: 'currency',
        currency: currencyCode,
      });
      if (this.numberFormatCache.size >= this.MAX_CACHE_SIZE) this.numberFormatCache.clear();
      this.numberFormatCache.set(cacheKey, fmt);
    }
    return fmt.format(amount);
  }

  public parseCurrency(rawInput: string, defaultCurrency: string = 'USD', localeOverride?: RegionalLocaleCode): { currency: CurrencyValue | null; isValid: boolean; error?: string } {
    if (!rawInput || typeof rawInput !== 'string') {
      return { currency: null, isValid: false, error: 'Invalid currency string' };
    }

    // Match currency symbol or code if present
    let detectedCurrency = defaultCurrency;
    if (rawInput.includes('€') || /EUR/i.test(rawInput)) detectedCurrency = 'EUR';
    else if (rawInput.includes('$') || /USD/i.test(rawInput)) detectedCurrency = 'USD';
    else if (rawInput.includes('₩') || /KRW/i.test(rawInput)) detectedCurrency = 'KRW';
    else if (rawInput.includes('₺') || /TRY/i.test(rawInput)) detectedCurrency = 'TRY';
    else if (rawInput.includes('£') || /GBP/i.test(rawInput)) detectedCurrency = 'GBP';

    // Strip currency symbols and letters
    const numPart = rawInput.replace(/[€$₩₺£A-Za-z]/g, '').trim();
    const numRes = this.parseNumber(numPart, localeOverride);
    if (!numRes.isValid || numRes.value === null) {
      return { currency: null, isValid: false, error: numRes.error || 'Failed to parse currency amount' };
    }

    return {
      currency: {
        amount: numRes.value,
        currency: detectedCurrency,
      },
      isValid: true,
    };
  }

  // ==========================================================================
  // DATE & TIME FORMATTING & PARSING
  // ==========================================================================

  public formatDateOnly(dateOnlyStr: string, formatStyle: 'short' | 'medium' | 'long' = 'medium', localeOverride?: RegionalLocaleCode): string {
    if (!dateOnlyStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateOnlyStr)) {
      return dateOnlyStr;
    }
    const loc = localeOverride || this.config.locale;
    const [y, m, d] = dateOnlyStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

    const cacheKey = `date:${loc}:${formatStyle}`;
    let fmt = this.dateTimeFormatCache.get(cacheKey);
    if (!fmt) {
      const options: Intl.DateTimeFormatOptions =
        formatStyle === 'short'
          ? { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }
          : formatStyle === 'long'
          ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' }
          : { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
      fmt = new Intl.DateTimeFormat(loc, options);
      if (this.dateTimeFormatCache.size >= this.MAX_CACHE_SIZE) this.dateTimeFormatCache.clear();
      this.dateTimeFormatCache.set(cacheKey, fmt);
    }
    return fmt.format(dateObj);
  }

  public formatDateTime(isoString: string, includeSeconds: boolean = false, localeOverride?: RegionalLocaleCode): string {
    const loc = localeOverride || this.config.locale;
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) return isoString;

    const hour12 = this.config.timeFormat === '12h' ? true : this.config.timeFormat === '24h' ? false : undefined;
    const cacheKey = `dt:${loc}:${includeSeconds}:${hour12}`;
    let fmt = this.dateTimeFormatCache.get(cacheKey);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat(loc, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        hour12,
      });
      if (this.dateTimeFormatCache.size >= this.MAX_CACHE_SIZE) this.dateTimeFormatCache.clear();
      this.dateTimeFormatCache.set(cacheKey, fmt);
    }
    return fmt.format(dateObj);
  }

  public parseDateInput(input: string, localeOverride?: RegionalLocaleCode): LocaleDateParseResult {
    if (!input || typeof input !== 'string') {
      return { isValid: false, isAmbiguous: false, rawInput: input, error: 'Empty date input' };
    }

    const trimmed = input.trim();

    // 1. Strict ISO Check: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return {
          dateOnly: trimmed,
          isValid: true,
          isAmbiguous: false,
          rawInput: input,
        };
      }
    }

    // 2. Ambiguity check on slash/dot formats e.g. 03/04/2026 or 03.04.2026
    const slashMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (slashMatch) {
      const part1 = Number(slashMatch[1]);
      const part2 = Number(slashMatch[2]);
      const year = Number(slashMatch[3]);

      // If both part1 and part2 are <= 12, it is ambiguous without explicit locale interpretation
      const isAmbiguous = part1 <= 12 && part2 <= 12 && part1 !== part2;
      const loc = localeOverride || this.config.locale;

      let month = part1;
      let day = part2;

      // In US format month is part1, in German/French/UK format day is part1
      if (loc === 'en-US') {
        month = part1;
        day = part2;
      } else {
        day = part1;
        month = part2;
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return {
          dateOnly: `${year}-${mm}-${dd}`,
          isValid: true,
          isAmbiguous,
          rawInput: input,
        };
      }
    }

    return {
      isValid: false,
      isAmbiguous: false,
      rawInput: input,
      error: `Could not parse date string: "${input}"`,
    };
  }

  public formatRelativeDate(dateOnlyStr: string, referenceDateOnlyStr?: string, langOverride?: UILanguageCode): string {
    const today = referenceDateOnlyStr || new Date().toISOString().slice(0, 10);
    if (dateOnlyStr === today) {
      return this.t('tasks', 'due_today', undefined, langOverride);
    }

    const d1 = new Date(dateOnlyStr + 'T00:00:00Z');
    const d2 = new Date(today + 'T00:00:00Z');
    const diffDays = Math.round((d1.getTime() - d2.getTime()) / (86400 * 1000));

    if (diffDays === 1) {
      return this.t('tasks', 'due_tomorrow', undefined, langOverride);
    }
    if (diffDays < 0) {
      return this.t('tasks', 'overdue', { days: Math.abs(diffDays) }, langOverride);
    }

    return this.formatDateOnly(dateOnlyStr, 'short');
  }

  // ==========================================================================
  // UNITS & HEALTH
  // ==========================================================================

  public formatUnit(value: number, canonicalUnit: string, localeOverride?: RegionalLocaleCode): string {
    const formattedNum = this.formatNumber(value, undefined, localeOverride);
    return `${formattedNum} ${canonicalUnit}`;
  }

  // ==========================================================================
  // COLLATION & SORTING
  // ==========================================================================

  public compareStrings(a: string, b: string, localeOverride?: RegionalLocaleCode): number {
    const loc = localeOverride || this.config.locale;
    let collator = this.collatorCache.get(loc);
    if (!collator) {
      collator = new Intl.Collator(loc, { sensitivity: 'variant', numeric: true });
      if (this.collatorCache.size >= this.MAX_CACHE_SIZE) this.collatorCache.clear();
      this.collatorCache.set(loc, collator);
    }
    return collator.compare(a, b);
  }

  /**
   * Turkish specific casing rules:
   * 'i'.toUpperCase('tr-TR') -> 'İ'
   * 'I'.toLowerCase('tr-TR') -> 'ı'
   * 'İ'.toLowerCase('tr-TR') -> 'i'
   * 'ı'.toUpperCase('tr-TR') -> 'I'
   */
  public toTurkishUpper(str: string): string {
    return str.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
  }

  public toTurkishLower(str: string): string {
    return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  }
}

export const v2GlobalizationEngine = V2GlobalizationEngine.getInstance();
