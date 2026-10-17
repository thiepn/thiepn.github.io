/**
 * PKM V2.18 Unicode, Grapheme Cluster, Filename Safety & BiDi Security Engine
 */

import {
  GraphemeSegment,
  UnicodeFilenameSanitizeResult,
  BidiSanitizeResult,
} from './globalizationTypes';

export class V2UnicodeAndBidiEngine {
  private static instance: V2UnicodeAndBidiEngine | null = null;

  // Dangerous BiDi control characters that can be used for visual spoofing attacks
  private readonly BIDI_CONTROL_REGEX = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g;

  // Regex matching cross-platform forbidden path/filename characters
  private readonly FORBIDDEN_FILENAME_CHARS = /[\/\\:*?"<>|\x00-\x1F\x7F]/g;

  private constructor() {}

  public static getInstance(): V2UnicodeAndBidiEngine {
    if (!V2UnicodeAndBidiEngine.instance) {
      V2UnicodeAndBidiEngine.instance = new V2UnicodeAndBidiEngine();
    }
    return V2UnicodeAndBidiEngine.instance;
  }

  // ==========================================================================
  // UTF-8 & BOM HANDLING
  // ==========================================================================

  /**
   * Detects and safely strips UTF-8 Byte Order Mark (BOM: \uFEFF) if present.
   */
  public stripBOM(content: string): { content: string; hasBOM: boolean } {
    if (content.charCodeAt(0) === 0xFEFF) {
      return { content: content.slice(1), hasBOM: true };
    }
    return { content, hasBOM: false };
  }

  /**
   * Normalizes newlines (CRLF -> LF) without destroying semantic whitespace.
   */
  public normalizeNewlines(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  // ==========================================================================
  // GRAPHEME CLUSTER & EMOJI / SURROGATE SAFETY
  // ==========================================================================

  /**
   * Counts actual human-perceived grapheme clusters rather than UTF-16 code units.
   * Handles multi-byte emoji, skin tones, ZWJ sequences (family/profession emoji), and combining accents.
   */
  public getGraphemeCount(text: string): number {
    if (!text) return 0;
    if (typeof (Intl as any)?.Segmenter === 'function') {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      let count = 0;
      for (const _ of segmenter.segment(text)) {
        count++;
      }
      return count;
    }

    // Fallback regex for surrogate pairs and combining marks
    const regex = /(?:\uD83D[\uDC00-\uDFFF]|\uD83C[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S])/g;
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Safely slices text by grapheme count without cutting mid-surrogate or mid-cluster.
   */
  public sliceGraphemes(text: string, start: number, end?: number): string {
    if (!text) return '';
    if (typeof (Intl as any)?.Segmenter === 'function') {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      const segments: string[] = [];
      for (const seg of segmenter.segment(text)) {
        segments.push(seg.segment);
      }
      return segments.slice(start, end).join('');
    }

    // Fallback
    const regex = /(?:\uD83D[\uDC00-\uDFFF]|\uD83C[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S])/g;
    const chars = text.match(regex) || [];
    return chars.slice(start, end).join('');
  }

  // ==========================================================================
  // FILENAME & PATH UNICODE SAFETY
  // ==========================================================================

  /**
   * Safely normalizes and sanitizes filenames across Windows, macOS, and Linux
   * while preserving legitimate Unicode titles (e.g. "개요.md", "Über_uns.md").
   */
  public sanitizeFilename(rawTitle: string, defaultExt: string = '.md'): UnicodeFilenameSanitizeResult {
    const originalName = rawTitle.trim();
    const nfc = originalName.normalize('NFC');
    const nfd = originalName.normalize('NFD');

    // Replace forbidden characters with safe underscore
    let safeBase = nfc.replace(this.FORBIDDEN_FILENAME_CHARS, '_').trim();
    if (!safeBase) {
      safeBase = 'untitled';
    }

    // Disallow reserved Windows device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    const reservedWindowsRegex = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
    if (reservedWindowsRegex.test(safeBase)) {
      safeBase = `_${safeBase}`;
    }

    const safeFilename = safeBase.endsWith(defaultExt) ? safeBase : `${safeBase}${defaultExt}`;

    return {
      safeFilename,
      originalName,
      hasCollisionRisk: nfc !== nfd,
      normalizedNFC: nfc,
      normalizedNFD: nfd,
      isWindowsSafe: !reservedWindowsRegex.test(safeBase) && !this.FORBIDDEN_FILENAME_CHARS.test(safeFilename),
      isMacOSSafe: true,
      isLinuxSafe: !safeFilename.includes('/') && !safeFilename.includes('\x00'),
    };
  }

  /**
   * Detects if two filenames would collide under case-insensitive or NFD-normalizing filesystems.
   */
  public detectFilenameCollision(nameA: string, nameB: string): { collidesCaseInsensitive: boolean; collidesUnicodeNormalization: boolean } {
    const nfcA = nameA.normalize('NFC');
    const nfcB = nameB.normalize('NFC');
    const nfdA = nameA.normalize('NFD');
    const nfdB = nameB.normalize('NFD');

    const collidesUnicodeNormalization = (nfcA === nfcB || nfdA === nfdB || nfcA === nfdB || nfdA === nfcB) && nameA !== nameB;
    const collidesCaseInsensitive = nfcA.toLowerCase() === nfcB.toLowerCase() && nameA !== nameB;

    return {
      collidesCaseInsensitive,
      collidesUnicodeNormalization,
    };
  }

  // ==========================================================================
  // BIDI SECURITY & SPOOFING DEFENSE
  // ==========================================================================

  /**
   * Sanitizes security-sensitive identifiers (URLs, filenames, plugin IDs, command IDs)
   * to neutralize Right-to-Left Override (RLO) and spoofing control characters.
   */
  public sanitizeSecurityIdentifier(identifier: string): BidiSanitizeResult {
    if (!identifier) {
      return { sanitized: '', original: '', hasBidiSpoofingControls: false, removedControlsCount: 0 };
    }

    const matchCount = (identifier.match(this.BIDI_CONTROL_REGEX) || []).length;
    const sanitized = identifier.replace(this.BIDI_CONTROL_REGEX, '');

    return {
      sanitized,
      original: identifier,
      hasBidiSpoofingControls: matchCount > 0,
      removedControlsCount: matchCount,
    };
  }
}

export const v2UnicodeAndBidiEngine = V2UnicodeAndBidiEngine.getInstance();
