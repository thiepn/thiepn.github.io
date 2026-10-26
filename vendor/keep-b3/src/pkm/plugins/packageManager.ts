/**
 * Phase P41: Plugin Package Manager & Archive Security Enforcer
 * Handles ZIP package extraction with Zip Slip defense, SHA-256 fingerprinting,
 * and JSON/ZIP developer package parsing.
 */

import { PluginManifest } from './types';
import { validatePluginManifest, ValidationResult } from './manifestValidator';

export interface ExtractedPluginPackage {
  manifest: PluginManifest;
  workerCode?: string;
  uiHtml?: string;
  packageHash: string;
  totalSize: number;
}

const MAX_PACKAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const MAX_TOTAL_UNCOMPRESSED_BYTES = 25 * 1024 * 1024; // 25MB uncompressed limit

export async function calculateSha256(data: ArrayBuffer | string): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parses a plugin package from either a single JSON file (developer / single-file package)
 * or from a ZIP archive.
 */
export async function parsePluginPackageFile(file: File): Promise<ExtractedPluginPackage> {
  if (file.size > MAX_PACKAGE_SIZE_BYTES) {
    throw new Error(`Package exceeds the maximum allowed size of 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const packageHash = await calculateSha256(arrayBuffer);

  // If it's a JSON file
  if (file.name.endsWith('.json') || file.type === 'application/json') {
    const text = new TextDecoder().decode(arrayBuffer);
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      throw new Error(`Invalid JSON syntax in plugin package: ${e.message}`);
    }

    // Check if it's a bundle containing manifest + inline code
    const manifestInput = parsed.manifest ? parsed.manifest : parsed;
    const valResult: ValidationResult = validatePluginManifest(manifestInput);
    if (!valResult.valid || !valResult.manifest) {
      throw new Error(`Plugin manifest validation failed: ${valResult.errors.join(', ')}`);
    }

    return {
      manifest: valResult.manifest,
      workerCode: parsed.workerCode || parsed.code || undefined,
      uiHtml: parsed.uiHtml || parsed.html || undefined,
      packageHash,
      totalSize: file.size,
    };
  }

  // If it's a ZIP archive, use JSZip to extract with strict Zip-Slip protection
  const JSZip = (await import('jszip')).default;
  let zip: any;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err: any) {
    throw new Error(`Failed to read ZIP archive: ${err.message}`);
  }

  let manifestText: string | null = null;
  let workerCode: string | undefined;
  let uiHtml: string | undefined;
  let totalUncompressed = 0;

  for (const relativePath of Object.keys(zip.files)) {
    // 1. Zip Slip / Path Traversal Defense
    if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\')) {
      throw new Error(`Security Violation: Archive contains suspicious path traversal item "${relativePath}". Installation aborted.`);
    }

    const zipEntry = zip.files[relativePath];
    if (zipEntry.dir) continue;

    const entrySize = zipEntry._data ? zipEntry._data.uncompressedSize : 0;
    totalUncompressed += entrySize;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error('Security Violation: Uncompressed package exceeds maximum size (Zip Bomb protection).');
    }

    const cleanPath = relativePath.replace(/^\.\//, '');
    if (cleanPath === 'manifest.json') {
      manifestText = await zipEntry.async('string');
    }
  }

  if (!manifestText) {
    throw new Error('Missing "manifest.json" in plugin root directory.');
  }

  let rawManifest: any;
  try {
    rawManifest = JSON.parse(manifestText);
  } catch (e: any) {
    throw new Error(`Invalid manifest.json syntax: ${e.message}`);
  }

  const valResult = validatePluginManifest(rawManifest);
  if (!valResult.valid || !valResult.manifest) {
    throw new Error(`Plugin manifest validation failed: ${valResult.errors.join(', ')}`);
  }

  const manifest = valResult.manifest;

  // Extract worker entry
  if (manifest.entryWorker) {
    const workerEntry = zip.file(manifest.entryWorker);
    if (!workerEntry) {
      throw new Error(`Declared entryWorker "${manifest.entryWorker}" was not found in package.`);
    }
    workerCode = await workerEntry.async('string');
  }

  // Extract UI entry
  if (manifest.entryUi) {
    const uiEntry = zip.file(manifest.entryUi);
    if (!uiEntry) {
      throw new Error(`Declared entryUi "${manifest.entryUi}" was not found in package.`);
    }
    uiHtml = await uiEntry.async('string');
  }

  return {
    manifest,
    workerCode,
    uiHtml,
    packageHash,
    totalSize: file.size,
  };
}

/**
 * Creates an exportable developer ZIP package from manifest and source code.
 */
export async function createPluginZipPackage(
  manifest: PluginManifest,
  workerCode?: string,
  uiHtml?: string
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  if (workerCode && manifest.entryWorker) {
    zip.file(manifest.entryWorker, workerCode);
  }
  if (uiHtml && manifest.entryUi) {
    zip.file(manifest.entryUi, uiHtml);
  }

  return await zip.generateAsync({ type: 'blob' });
}
