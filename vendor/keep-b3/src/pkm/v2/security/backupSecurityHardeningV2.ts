/**
 * V2.8 Backup, Restore, Import & Export Security Hardening Engine
 * Protects against archive bombs, path traversals, CSV formula injection,
 * and XML XXE entity resolutions.
 */

import { syncSecurityValidatorV2 } from './syncSecurityValidatorV2';

export interface ArchiveEntryInspectionV2 {
  path: string;
  compressedSizeBytes: number;
  uncompressedSizeBytes: number;
}

export interface ArchiveSecurityAuditResultV2 {
  safe: boolean;
  totalUncompressedBytes: number;
  totalEntriesCount: number;
  detectedThreats: string[];
}

export class BackupSecurityHardeningV2 {
  private static instance: BackupSecurityHardeningV2;

  private readonly MAX_TOTAL_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // 500MB
  private readonly MAX_SINGLE_FILE_BYTES = 100 * 1024 * 1024; // 100MB
  private readonly MAX_EXPANSION_RATIO = 100; // 100x max compression ratio
  private readonly MAX_TOTAL_ENTRIES = 50000;

  private constructor() {}

  public static getInstance(): BackupSecurityHardeningV2 {
    if (!BackupSecurityHardeningV2.instance) {
      BackupSecurityHardeningV2.instance = new BackupSecurityHardeningV2();
    }
    return BackupSecurityHardeningV2.instance;
  }

  /**
   * Preflight audit of archive headers before decompression.
   * Catches path traversal, archive bombs, and duplicate path collisions.
   */
  public auditArchiveEntries(entries: ArchiveEntryInspectionV2[]): ArchiveSecurityAuditResultV2 {
    const threats: string[] = [];
    let totalUncompressed = 0;
    const seenPaths = new Set<string>();

    if (entries.length > this.MAX_TOTAL_ENTRIES) {
      threats.push(`Archive entry count (${entries.length}) exceeds maximum limit (${this.MAX_TOTAL_ENTRIES}).`);
    }

    for (const entry of entries) {
      // 1. Path safety
      const pathCheck = syncSecurityValidatorV2.validateSafeRelativePath(entry.path);
      if (!pathCheck.valid) {
        threats.push(`Hostile path in archive: "${entry.path}" - ${pathCheck.error}`);
      }

      // 2. Duplicate path collision
      const normalizedPath = entry.path.toLowerCase().replace(/\\/g, '/');
      if (seenPaths.has(normalizedPath)) {
        threats.push(`Duplicate path collision in archive: "${entry.path}"`);
      }
      seenPaths.add(normalizedPath);

      // 3. Single-file size bound
      if (entry.uncompressedSizeBytes > this.MAX_SINGLE_FILE_BYTES) {
        threats.push(
          `Archive entry "${entry.path}" uncompressed size (${entry.uncompressedSizeBytes} B) exceeds single-file limit.`
        );
      }

      // 4. Archive bomb expansion ratio check
      if (entry.compressedSizeBytes > 0) {
        const ratio = entry.uncompressedSizeBytes / entry.compressedSizeBytes;
        if (ratio > this.MAX_EXPANSION_RATIO && entry.uncompressedSizeBytes > 1024 * 1024) {
          threats.push(
            `Archive bomb detected: entry "${entry.path}" expansion ratio (${ratio.toFixed(1)}x) exceeds safe threshold (${this.MAX_EXPANSION_RATIO}x).`
          );
        }
      }

      totalUncompressed += entry.uncompressedSizeBytes;
      if (totalUncompressed > this.MAX_TOTAL_UNCOMPRESSED_BYTES) {
        threats.push(
          `Archive bomb detected: total uncompressed size (${totalUncompressed} B) exceeds safe limit (${this.MAX_TOTAL_UNCOMPRESSED_BYTES} B).`
        );
        break;
      }
    }

    return {
      safe: threats.length === 0,
      totalUncompressedBytes: totalUncompressed,
      totalEntriesCount: entries.length,
      detectedThreats: threats,
    };
  }

  /**
   * Escapes a single cell value for CSV export to prevent spreadsheet formula injection.
   * If a string starts with `=, +, -, @`, prefixes with single quote `'` unless it is a valid numeric value.
   */
  public sanitizeCsvCellValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);

    // If it's purely a valid negative number (e.g. -12.50 or -42), keep it as a valid number
    if (/^-?\d+(\.\d+)?$/.test(str.trim())) {
      return str;
    }

    const trimmed = str.trimStart();
    if (
      trimmed.startsWith('=') ||
      trimmed.startsWith('+') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('@') ||
      trimmed.startsWith('\t') ||
      trimmed.startsWith('\r')
    ) {
      // Escape by prepending single-quote prefix
      return `'${str}`;
    }

    return str;
  }

  /**
   * Sanitizes XML input against XXE (XML External Entity) attacks and DTD injection.
   */
  public sanitizeXmlAgainstXXE(rawXml: string): string {
    if (!rawXml) return '';
    let sanitized = rawXml;
    // Strip DOCTYPE with entity declarations or external SYSTEM / PUBLIC identifiers
    sanitized = sanitized.replace(/<!DOCTYPE\b[^>]*\[[\s\S]*?\]>/gi, '');
    sanitized = sanitized.replace(/<!DOCTYPE\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<!ENTITY\b[^>]*>/gi, '');
    return sanitized;
  }
}

export const backupSecurityHardeningV2 = BackupSecurityHardeningV2.getInstance();
