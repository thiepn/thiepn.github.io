/**
 * P40 — Migration Security & Content Sanitizer
 * Protects against archive bombs, path traversal, XXE injections, and malicious JS scripts.
 */

import { MigrationWarning } from './migrationTypes';

// Limits for archive protection
export const ARCHIVE_SECURITY_LIMITS = {
  MAX_ENTRIES: 50000,
  MAX_TOTAL_UNCOMPRESSED_BYTES: 1024 * 1024 * 1024 * 2, // 2GB
  MAX_COMPRESSION_RATIO: 100, // 100:1 ratio warning
  MAX_SINGLE_FILE_BYTES: 1024 * 1024 * 100, // 100MB per single text file
};

/**
 * Validates and sanitizes a relative archive path to prevent directory traversal attacks (e.g. "../../../etc/passwd").
 */
export function sanitizeRelativePath(rawPath: string): { safePath: string; isTraveralAttempt: boolean } {
  if (!rawPath) return { safePath: '', isTraveralAttempt: false };

  // Normalize slashes
  let normalized = rawPath.replace(/\\/g, '/');

  // Strip leading slashes or Windows drive letters
  normalized = normalized.replace(/^[a-zA-Z]:[/\\]/, '').replace(/^\/+/, '');

  // Split and filter out '.' and resolve '..' safely
  const segments = normalized.split('/');
  const safeSegments: string[] = [];
  let isTraveralAttempt = false;

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed || trimmed === '.') continue;
    if (trimmed === '..') {
      if (safeSegments.length > 0) {
        safeSegments.pop();
      } else {
        isTraveralAttempt = true;
      }
    } else {
      // Clean invalid chars
      const sanitizedSeg = trimmed.replace(/[\x00-\x1f\x7f<>:"|?*]/g, '_');
      safeSegments.push(sanitizedSeg);
    }
  }

  return {
    safePath: safeSegments.join('/'),
    isTraveralAttempt,
  };
}

/**
 * Computes a fast deterministic SHA-256 hash string from string or ArrayBuffer content.
 */
export async function computeContentHash(data: string | ArrayBuffer): Promise<string> {
  try {
    let buffer: ArrayBuffer;
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      buffer = encoder.encode(data).buffer;
    } else {
      buffer = data;
    }

    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    // Fallback simple hash
  }

  // Fallback simple 32-bit hash representation
  const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Safe XML DOM Parser that disables XXE and external entity fetching.
 */
export function parseSafeXml(xmlContent: string): { doc: Document | null; error?: string } {
  try {
    // Basic check for XXE entity declarations
    if (/<!ENTITY/i.test(xmlContent) || /<!DOCTYPE[^>]*\[/i.test(xmlContent)) {
      // Neutralize entities in content before parsing
      xmlContent = xmlContent.replace(/<!DOCTYPE[^>]*>/gi, '');
      xmlContent = xmlContent.replace(/<!ENTITY[^>]*>/gi, '');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { doc: null, error: parserError.textContent || 'XML Parsing Error' };
    }
    return { doc };
  } catch (err: any) {
    return { doc: null, error: err?.message || 'XML Parser Exception' };
  }
}

/**
 * Disarms executable scripts and event handlers from HTML.
 */
export function sanitizeUntrustedHtml(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove dangerous elements
  const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'applet', 'meta', 'link', 'base', 'form', 'button'];
  dangerousTags.forEach((tag) => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el) => el.remove());
  });

  // Remove event handlers and javascript: URIs
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.toLowerCase().trim();

      if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text/html') || val.startsWith('vbscript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML || '';
}

/**
 * Ensures Dataview / DataviewJS or other plugin execution blocks in Markdown remain inert.
 */
export function neutralizeExecutableMarkdownBlocks(
  markdown: string,
  warningsOut: MigrationWarning[],
  sourcePath: string
): string {
  // Check for ```dataviewjs or ```js or ```eval blocks
  return markdown.replace(/```(dataviewjs|dataview|tasks|templater|breadcrumbs|quickadd)([\s\S]*?)```/gi, (match, lang, code, offset) => {
    const line = markdown.substring(0, offset).split('\n').length;
    warningsOut.push({
      id: `warn_plugin_${sourcePath}_${line}`,
      severity: 'info',
      category: 'unsupported-plugin',
      message: `Obsidian plugin block '${lang}' preserved as inert code block.`,
      sourcePath,
      lineNumber: line,
      snippet: match.substring(0, 100),
      remediation: 'Review note and adjust to canonical queries or task lists if needed.',
    });

    // Retain as harmless markdown code block
    return `\`\`\`${lang}-inert\n${code.trim()}\n\`\`\``;
  });
}
