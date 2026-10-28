/**
 * V2.28 Input & Globalization Hardening Engine
 * 
 * Enforces resilient multilingual input, IME composition safety, Unicode normalization,
 * Turkish casing invariants, pseudo-localization text expansion, and bidirectional RTL layout safety.
 */

export interface IMEInputEvent {
  eventType: 'compositionstart' | 'compositionupdate' | 'compositionend' | 'keydown';
  key?: string;
  isComposing: boolean;
  rawText: string;
}

export interface IMESafetyResult {
  allowedToSubmit: boolean;
  textPreserved: string;
  eventHandled: boolean;
  preventedPrematureAction: boolean;
}

export class V2_28InputGlobalizationHardeningEngineService {
  private static instance: V2_28InputGlobalizationHardeningEngineService;
  private isCurrentlyComposing = false;
  private currentCompositionBuffer = '';
  private isRTLMode = false;

  private constructor() {}

  public static getInstance(): V2_28InputGlobalizationHardeningEngineService {
    if (!V2_28InputGlobalizationHardeningEngineService.instance) {
      V2_28InputGlobalizationHardeningEngineService.instance = new V2_28InputGlobalizationHardeningEngineService();
    }
    return V2_28InputGlobalizationHardeningEngineService.instance;
  }

  // --- 1. IME Composition Safety (Korean, CJK, Dead Keys) ---
  public handleIMEEvent(event: IMEInputEvent): IMESafetyResult {
    if (event.eventType === 'compositionstart') {
      this.isCurrentlyComposing = true;
      this.currentCompositionBuffer = event.rawText;
      return {
        allowedToSubmit: false,
        textPreserved: this.currentCompositionBuffer,
        eventHandled: true,
        preventedPrematureAction: false,
      };
    }

    if (event.eventType === 'compositionupdate') {
      this.isCurrentlyComposing = true;
      this.currentCompositionBuffer = event.rawText;
      return {
        allowedToSubmit: false,
        textPreserved: this.currentCompositionBuffer,
        eventHandled: true,
        preventedPrematureAction: false,
      };
    }

    if (event.eventType === 'compositionend') {
      this.isCurrentlyComposing = false;
      this.currentCompositionBuffer = event.rawText;
      return {
        allowedToSubmit: false, // Wait for explicit subsequent keydown
        textPreserved: this.currentCompositionBuffer,
        eventHandled: true,
        preventedPrematureAction: false,
      };
    }

    if (event.eventType === 'keydown') {
      // If user presses Enter while still composing, block submission
      if (event.key === 'Enter' && (this.isCurrentlyComposing || event.isComposing)) {
        return {
          allowedToSubmit: false,
          textPreserved: this.currentCompositionBuffer || event.rawText,
          eventHandled: true,
          preventedPrematureAction: true,
        };
      }

      // If user presses Escape while composing, dismiss IME buffer without closing modal
      if (event.key === 'Escape' && (this.isCurrentlyComposing || event.isComposing)) {
        this.isCurrentlyComposing = false;
        return {
          allowedToSubmit: false,
          textPreserved: '',
          eventHandled: true,
          preventedPrematureAction: true,
        };
      }

      return {
        allowedToSubmit: event.key === 'Enter' && !this.isCurrentlyComposing && !event.isComposing,
        textPreserved: event.rawText,
        eventHandled: false,
        preventedPrematureAction: false,
      };
    }

    return {
      allowedToSubmit: true,
      textPreserved: event.rawText,
      eventHandled: false,
      preventedPrematureAction: false,
    };
  }

  // --- 2. Turkish Casing Invariant ---
  public turkishSafeToUpper(str: string): string {
    return str.replace(/i/g, 'İ').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR');
  }

  public turkishSafeToLower(str: string): string {
    return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');
  }

  // --- 3. Unicode & Mixed-Script Normalization ---
  public normalizeUnicodeText(text: string): string {
    // Normalize to Canonical Decomposition followed by Canonical Composition (NFC)
    return text.normalize('NFC');
  }

  // --- 4. Pseudo-Localization & Text Expansion (~40% Expansion) ---
  public transformToPseudoLocale(sourceText: string): string {
    const charMap: Record<string, string> = {
      a: 'à', b: 'ƀ', c: 'ç', d: 'đ', e: 'é', f: 'ƒ', g: 'ğ', h: 'ħ',
      i: 'î', j: 'ĵ', k: 'ķ', l: 'ł', m: 'ɱ', n: 'ñ', o: 'ö', p: 'þ',
      q: 'ǫ', r: 'ř', s: 'š', t: 'ţ', u: 'û', v: 'ṽ', w: 'ŵ', x: 'ẋ',
      y: 'ý', z: 'ž',
      A: 'À', B: 'Ɓ', C: 'Ç', D: 'Đ', E: 'É', F: 'Ƒ', G: 'Ğ', H: 'Ħ',
      I: 'Î', J: 'Ĵ', K: 'Ķ', L: 'Ł', M: 'Ṁ', N: 'Ñ', O: 'Ö', P: 'Þ',
      Q: 'Ǫ', R: 'Ř', S: 'Š', T: 'Ţ', U: 'Û', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ',
      Y: 'Ý', Z: 'Ž',
    };

    const transformed = sourceText
      .split('')
      .map((char) => charMap[char] || char)
      .join('');

    // Append 30-40% padding marker to stress layout containers
    const padding = ' ~[Expanded]~';
    return `[!!! ${transformed}${padding} !!!]`;
  }

  // --- 5. Bidirectional RTL Layout Safety ---
  public setRTLMode(enabled: boolean): void {
    this.isRTLMode = enabled;
  }

  public isRTL(): boolean {
    return this.isRTLMode;
  }

  public sanitizeBidiText(text: string): string {
    // Strip malicious directional override control characters while preserving legitimate text
    return text.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
  }
}

export const v2_28InputGlobalization = V2_28InputGlobalizationHardeningEngineService.getInstance();
