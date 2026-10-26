/**
 * Phase P58 — Universal Inbox Sanitizer & Privacy Guard
 * 
 * Strict hostile HTML sanitization, remote image blocking (anti-tracking pixels),
 * safe external link rewrites, and text extraction.
 */

/**
 * Aggressively sanitizes HTML email or external file rich content.
 * Strips active scripts, iframes, embedded styles that could deface host UI,
 * forms, inputs, and inline event handlers.
 */
export function sanitizeExternalHtml(rawHtml: string, allowRemoteImages = false): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let sanitized = rawHtml;

  // 1. Remove script tags and their contents
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove style tags and their contents to avoid styling host UI
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 3. Remove iframe, object, embed, frame, frameset, form, input, button, base
  sanitized = sanitized.replace(/<\/?(iframe|object|embed|frame|frameset|form|input|button|base|meta|link|head)\b[^>]*>/gi, '');

  // 4. Remove all inline event handlers (e.g. onload, onclick, onerror, onmouseover, etc.)
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 5. Remove javascript: and data: URIs in href / src attributes (except safe data:image)
  sanitized = sanitized.replace(/(?:href|src)\s*=\s*["']?\s*javascript:[^"'>\s]+/gi, 'href="#"');
  sanitized = sanitized.replace(/(?:href)\s*=\s*["']?\s*data:[^"'>\s]+/gi, 'href="#"');

  // 6. Rewrite links to be safe with rel="noopener noreferrer" target="_blank"
  sanitized = sanitized.replace(/<a\b([^>]*)>/gi, (_match, attrs) => {
    let cleanAttrs = attrs.replace(/\btarget\s*=\s*["'][^"']*["']/gi, '');
    cleanAttrs = cleanAttrs.replace(/\brel\s*=\s*["'][^"']*["']/gi, '');
    return `<a ${cleanAttrs} target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 underline hover:text-amber-700">`;
  });

  // 7. Remote image blocking & anti-tracking pixel protection
  if (!allowRemoteImages) {
    sanitized = sanitized.replace(/<img\b([^>]*)>/gi, (_match, attrs) => {
      // Check if src is present
      const srcMatch = attrs.match(/src\s*=\s*["']([^"']*)["']/i);
      const originalSrc = srcMatch ? srcMatch[1] : '';

      // Preserve width/height/alt if available
      const altMatch = attrs.match(/alt\s*=\s*["']([^"']*)["']/i);
      const altText = altMatch ? altMatch[1] : 'External Image';

      // 1x1 tracking pixel detector
      const isPixel = originalSrc.includes('pixel') || originalSrc.includes('tracker') || originalSrc.includes('open.gif');

      if (isPixel) {
        return `<span class="hidden" data-tracking-pixel="blocked"></span>`;
      }

      return `<span class="inline-flex items-center gap-1.5 px-2 py-1 my-1 text-xs rounded border border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/60 text-stone-500 select-none" data-blocked-src="${encodeURIComponent(originalSrc)}">
        <svg class="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <span>[Remote Image Blocked: ${altText}]</span>
      </span>`;
    });
  } else {
    // When allowed, ensure images don't overflow container
    sanitized = sanitized.replace(/<img\b([^>]*)>/gi, (_match, attrs) => {
      return `<img ${attrs} class="max-w-full h-auto rounded my-2 border border-stone-200 dark:border-stone-800" loading="lazy" />`;
    });
  }

  return sanitized;
}

/**
 * Extracts clean, readable plain text from raw HTML email or message payload
 */
export function htmlToCleanText(html: string): string {
  if (!html) return '';
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return text;
}

/**
 * Generates a concise preview snippet from content
 */
export function generatePreviewSnippet(textOrHtml: string, maxLength = 160): string {
  if (!textOrHtml) return '';
  const text = htmlToCleanText(textOrHtml);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '…';
}
