import DOMPurify from 'dompurify';
type DOMPurifyConfig = any;

/**
 * Helper to obtain a functional DOMPurify instance across browser and Node environments.
 */
function getPurifyInstance() {
  if (typeof DOMPurify === 'function') {
    if (typeof window !== 'undefined') {
      return (DOMPurify as any)(window);
    }
  } else if (DOMPurify && typeof (DOMPurify as any).sanitize === 'function') {
    return DOMPurify;
  }
  return DOMPurify;
}

/**
 * Allowed URL protocols for markdown links and external resources.
 * Dangerous protocols like 'javascript:', 'data:' (for executable vectors), 'vbscript:', 'file:' are blocked.
 */
const ALLOWED_URI_SCHEMES = new Set(['http', 'https', 'mailto', 'pdf', 'note', 'canvas', 'graph']);

/**
 * Strict DOMPurify configuration for general HTML rendering in PKM
 */
const HTML_PURIFY_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'span', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'strike',
    'code', 'pre', 'blockquote', 'hr', 'br',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'img', 'a', 'mark', 'kbd', 'sub', 'sup', 'abbr', 'details', 'summary',
    'input', // for task list checkboxes
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'width', 'height',
    'target', 'rel', 'data-line', 'data-note-id', 'data-pdf-id',
    'type', 'checked', 'disabled', // for task list checkboxes
    'open', 'align', 'valign',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|pdf|note|canvas|graph):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ALLOW_DATA_ATTR: true,
  ADD_ATTR: ['target', 'rel'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'link', 'meta', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style'],
};

/**
 * Strict DOMPurify configuration for SVG graphics (Mermaid, icons, math formulas)
 */
const SVG_PURIFY_CONFIG: DOMPurifyConfig = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ['use'],
  FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'form', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Validates whether a given URL uses a safe, permitted protocol.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Relative URLs starting with /, #, or . are safe local links
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }

  // Check protocol scheme
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) {
    // No explicit scheme, relative path
    return true;
  }

  const scheme = schemeMatch[1].toLowerCase();
  if (!ALLOWED_URI_SCHEMES.has(scheme)) {
    // Specifically block dangerous schemes
    return false;
  }

  // Reject embedded javascript: or encoded variations
  if (/javascript\s*:/i.test(trimmed) || /data\s*:\s*text\/html/i.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Sanitizes a URL string, returning a safe URL or '#' if the URL is unsafe.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (isSafeUrl(trimmed)) {
    return trimmed;
  }
  return '#unsafe-link-blocked';
}

/**
 * Sanitizes raw HTML string using DOMPurify with strict allowlist.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  try {
    const purify = getPurifyInstance();
    if (purify && typeof purify.sanitize === 'function') {
      return purify.sanitize(rawHtml, HTML_PURIFY_CONFIG);
    }
  } catch (err) {
    console.error('HTML Sanitization error:', err);
  }
  // Fallback for headless environments without full JSDOM: remove script tags and on* handlers
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');
}

/**
 * Sanitizes SVG string removing any embedded scripts or unsafe event handlers.
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  try {
    const purify = getPurifyInstance();
    if (purify && typeof purify.sanitize === 'function') {
      return purify.sanitize(rawSvg, SVG_PURIFY_CONFIG);
    }
  } catch (err) {
    console.error('SVG Sanitization error:', err);
  }
  // Fallback: strip script elements and event handlers
  return rawSvg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
}

/**
 * Strips all HTML tags from a string, leaving only plain text.
 */
export function stripHtmlToPlainText(rawHtml: string): string {
  if (!rawHtml) return '';
  try {
    const purify = getPurifyInstance();
    if (purify && typeof purify.sanitize === 'function') {
      return purify.sanitize(rawHtml, { ALLOWED_TAGS: [] }).trim();
    }
  } catch {
    // fallback below
  }
  return rawHtml.replace(/<[^>]*>/g, '').trim();
}
