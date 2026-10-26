/**
 * V2.8 Universal Content Sanitization & Rendering Security Engine
 * Sanitizes Markdown, raw HTML, SVG, URLs, and Mermaid diagram outputs.
 */

export class ContentSanitizerV2 {
  private static instance: ContentSanitizerV2;

  private readonly SAFE_URL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];
  private readonly SAFE_IMAGE_DATA_PREFIXES = [
    'data:image/png;',
    'data:image/jpeg;',
    'data:image/jpg;',
    'data:image/webp;',
    'data:image/gif;',
    'data:image/svg+xml;',
  ];

  private constructor() {}

  public static getInstance(): ContentSanitizerV2 {
    if (!ContentSanitizerV2.instance) {
      ContentSanitizerV2.instance = new ContentSanitizerV2();
    }
    return ContentSanitizerV2.instance;
  }

  /**
   * Sanitizes Markdown raw HTML.
   * Strips scripts, styles, iframes, forms, event handlers, and dangerous URL schemes.
   */
  public sanitizeHtml(rawHtml: string): string {
    if (!rawHtml) return '';
    let html = rawHtml;

    // 1. Strip script tags
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Strip dangerous tags
    const forbiddenTags = [
      'style',
      'iframe',
      'object',
      'embed',
      'applet',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'meta',
      'link',
      'base',
    ];
    for (const tag of forbiddenTags) {
      const tagRegex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>|<${tag}\\b[^>]*\\/?>`, 'gi');
      html = html.replace(tagRegex, '');
    }

    // 3. Strip all inline event attributes (onclick, onload, onerror, onmouseover, etc.)
    html = html.replace(/\s*on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // 4. Sanitize link and image targets
    html = html.replace(/\s*(href|src)\s*=\s*["']([^"']*)["']/gi, (match, attr, url) => {
      const sanitizedUrl = this.validateAndSanitizeUrl(url);
      if (!sanitizedUrl) {
        return ` ${attr}="#"`;
      }
      return ` ${attr}="${sanitizedUrl}"`;
    });

    // 5. Ensure all external links have rel="noopener noreferrer"
    html = html.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
      if (/href\s*=\s*["']https?:\/\//i.test(attrs) && !/rel\s*=/i.test(attrs)) {
        return `<a ${attrs} rel="noopener noreferrer" target="_blank">`;
      }
      return match;
    });

    return html;
  }

  /**
   * Validates and sanitizes a URL.
   * Rejects javascript:, vbscript:, data:text/html.
   */
  public validateAndSanitizeUrl(rawUrl: string): string | null {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();

    // Check for explicit blocked schemes
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('data:text/html') ||
      lower.startsWith('data:application/')
    ) {
      return null;
    }

    // Allow relative anchor or path links
    if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return trimmed;
    }

    // Safe image data URIs
    if (lower.startsWith('data:image/')) {
      const isSafeImage = this.SAFE_IMAGE_DATA_PREFIXES.some((p) => lower.startsWith(p));
      return isSafeImage ? trimmed : null;
    }

    // Parse absolute URL
    try {
      const parsed = new URL(trimmed);
      if (this.SAFE_URL_SCHEMES.includes(parsed.protocol.toLowerCase())) {
        return trimmed;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Sanitizes SVG code to prevent embedded scripts, event handlers, and active XML constructs.
   */
  public sanitizeSvg(rawSvg: string): string {
    if (!rawSvg) return '';
    let svg = rawSvg;

    // 1. Strip script tags
    svg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Strip foreignObject and dangerous tags
    svg = svg.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
    svg = svg.replace(/<use\b[^>]*xlink:href\s*=\s*["']\s*https?:\/\/[^"'>]*["'][^>]*\/?>/gi, '');

    // 3. Strip all on* event handlers
    svg = svg.replace(/\s*on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // 4. Strip javascript: hrefs
    svg = svg.replace(/\s*(?:href|xlink:href)\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, '');

    return svg;
  }
}

export const contentSanitizerV2 = ContentSanitizerV2.getInstance();
