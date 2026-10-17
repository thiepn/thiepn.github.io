import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export interface HTMLConversionOptions {
  headingStyle?: 'atx' | 'setext';
  hr?: string;
  bulletListMarker?: '-' | '*' | '+';
  codeBlockStyle?: 'fenced' | 'indented';
  fence?: '```' | '~~~';
  emDelimiter?: '_' | '*';
  strongDelimiter?: '**' | '__';
  preserveImages?: boolean;
  cleanNoise?: boolean;
  extractSourceUrl?: boolean;
}

export interface ConvertedMarkdownResult {
  markdown: string;
  title?: string;
  sourceUrl?: string;
  imageUrls: string[];
  hasTables: boolean;
  wordCount: number;
}

// Extract potential source URL, title, and author from HTML before strip/convert
export function extractMetadataFromHTML(
  html: string,
  fallbackUrl?: string
): { sourceUrl?: string; title?: string; author?: string } {
  let sourceUrl: string | undefined = fallbackUrl;
  let title: string | undefined;
  let author: string | undefined;

  // 1. Check for clipboard metadata comments: e.g., <!--StartFragment--> or SourceURL:
  const sourceUrlCommentMatch = html.match(/<!--\s*SourceURL:\s*([^\s>]+)\s*-->/i) ||
                               html.match(/SourceURL:\s*(https?:\/\/[^\s\r\n"<>]+)/i);
  if (sourceUrlCommentMatch && sourceUrlCommentMatch[1]) {
    sourceUrl = sourceUrlCommentMatch[1].trim();
  }

  // 2. Check for meta tags (canonical, og:url, twitter:url, source)
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
                        html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (!sourceUrl && canonicalMatch && canonicalMatch[1]) {
    sourceUrl = canonicalMatch[1].trim();
  }

  const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i) ||
                     html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i);
  if (!sourceUrl && ogUrlMatch && ogUrlMatch[1]) {
    sourceUrl = ogUrlMatch[1].trim();
  }

  const citeMatch = html.match(/data-source-url=["']([^"']+)["']/i) ||
                    html.match(/data-url=["']([^"']+)["']/i) ||
                    html.match(/data-origin-url=["']([^"']+)["']/i);
  if (!sourceUrl && citeMatch && citeMatch[1]) {
    sourceUrl = citeMatch[1].trim();
  }

  // 3. Extract author
  const authorMatch = html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']author["']/i) ||
                      html.match(/<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i);
  if (authorMatch && authorMatch[1]) {
    author = authorMatch[1].trim();
  }

  // 4. Extract title
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTagMatch && titleTagMatch[1]) {
    title = titleTagMatch[1].trim();
  } else {
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].trim();
    } else {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        title = h1Match[1].trim();
      }
    }
  }

  // Sanitize title (remove &amp;, &#39;, &quot;)
  if (title) {
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  return { sourceUrl, title, author };
}

// Pre-sanitize HTML: removes junk elements, ads, scripts, tracking pixels
export function cleanHTMLStructure(html: string): string {
  let cleaned = html;

  // Remove conditional comments
  cleaned = cleaned.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');

  // Remove scripts, styles, noscript, iframes, svg tracking, audio/video embeds if unsafe
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove common web noise containers (nav, footer, aside, ads, cookie banners, share buttons)
  cleaned = cleaned.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
  cleaned = cleaned.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
  cleaned = cleaned.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

  // Remove elements with ad/tracker classes or styles (e.g., class="...ad-banner...", class="...social-share...", style="display:none")
  cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*(?:cookie-banner|ad-container|advertisement|social-share|share-buttons|sidebar-widget)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<[^>]+style=["'][^"']*(?:display:\s*none|visibility:\s*hidden)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '');

  // Remove 1x1 tracking pixels
  cleaned = cleaned.replace(/<img[^>]+(?:width=["']1["']|height=["']1["']|style=["'][^"']*width:\s*1px[^"']*["'])[^>]*>/gi, '');

  // Clean Wikipedia edit tags & references: e.g. <span class="mw-editsection">...</span> or <sup class="reference">...</sup>
  cleaned = cleaned.replace(/<span\b[^>]*class=["'][^"']*mw-editsection[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');
  cleaned = cleaned.replace(/<sup\b[^>]*class=["'][^"']*reference[^"']*["'][^>]*>[\s\S]*?<\/sup>/gi, '');

  // Pre-convert HTML task checkboxes so they work reliably across all DOM environments
  cleaned = cleaned.replace(/<input[^>]*type=["']checkbox["'][^>]*checked[^>]*>/gi, '[x] ');
  cleaned = cleaned.replace(/<input[^>]*checked[^>]*type=["']checkbox["'][^>]*>/gi, '[x] ');
  cleaned = cleaned.replace(/<input[^>]*type=["']checkbox["'][^>]*>/gi, '[ ] ');

  // Convert Wikipedia math image tags with alt attribute into LaTeX math markdown
  cleaned = cleaned.replace(/<img[^>]+class=["'][^"']*mwe-math-fallback-image-inline[^"']*["'][^>]+alt=["']([^"']+)["'][^>]*>/gi, (_match, alt) => {
    return `$${alt.trim()}$`;
  });
  cleaned = cleaned.replace(/<img[^>]+alt=["']([^"']+)["'][^>]+class=["'][^"']*mwe-math-fallback-image-inline[^"']*["'][^>]*>/gi, (_match, alt) => {
    return `$${alt.trim()}$`;
  });

  return cleaned;
}

// Create a configured Turndown service instance
export function createTurndownService(options: HTMLConversionOptions = {}): TurndownService {
  const service = new TurndownService({
    headingStyle: options.headingStyle || 'atx',
    hr: options.hr || '---',
    bulletListMarker: options.bulletListMarker || '-',
    codeBlockStyle: options.codeBlockStyle || 'fenced',
    fence: options.fence || '```',
    emDelimiter: options.emDelimiter || '*',
    strongDelimiter: options.strongDelimiter || '**',
  });

  // Apply GitHub Flavored Markdown plugin (handles tables, task lists, strikethrough)
  try {
    service.use(gfm);
  } catch (e) {
    console.warn('GFM plugin init note:', e);
  }

  // Custom rule: Code blocks with syntax highlighting language detection
  service.addRule('fencedCodeBlockWithLanguage', {
    filter: (node, _opts) => {
      return (
        node.nodeName === 'PRE' ||
        (node.nodeName === 'DIV' && node.classList && (node.classList.contains('highlight') || node.classList.contains('code-block')))
      );
    },
    replacement: (_content, node, _opts) => {
      const el = node as HTMLElement;
      let code = el.textContent || '';
      let lang = '';

      // Check class names on <pre> or child <code>
      const codeChild = el.querySelector ? el.querySelector('code') : null;
      const targetEl = codeChild || el;
      const classList = targetEl.className || '';

      const langMatch = classList.match(/(?:language-|lang-|highlight-source-)([a-zA-Z0-9_-]+)/i);
      if (langMatch && langMatch[1]) {
        lang = langMatch[1].toLowerCase();
      }

      // If data-language attribute exists
      if (!lang && targetEl.getAttribute) {
        const dataLang = targetEl.getAttribute('data-lang') || targetEl.getAttribute('data-language');
        if (dataLang) lang = dataLang.toLowerCase();
      }

      // Trim leading/trailing empty lines
      code = code.replace(/^\n+|\n+$/g, '');

      return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    },
  });

  // Custom rule: Task Lists (checkboxes inside lists)
  service.addRule('taskListCheckbox', {
    filter: (node) => {
      return (
        node.nodeName === 'INPUT' &&
        (node as HTMLInputElement).getAttribute('type') === 'checkbox'
      );
    },
    replacement: (_content, node) => {
      const input = node as HTMLInputElement;
      return input.checked ? '[x] ' : '[ ] ';
    },
  });

  // Custom rule: Clean blockquotes
  service.addRule('cleanBlockquote', {
    filter: 'blockquote',
    replacement: (content) => {
      const cleanContent = content.trim().replace(/^[\n\r]+|[\n\r]+$/g, '');
      const lines = cleanContent.split('\n');
      const quoted = lines.map((line) => `> ${line}`).join('\n');
      return `\n\n${quoted}\n\n`;
    },
  });

  // Custom rule: Remove useless span wrappers while keeping text
  service.addRule('cleanSpans', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false;
      const el = node as HTMLElement;
      // If it has strong/em semantic, let default handle or pass through
      return !el.className?.includes('katex') && !el.className?.includes('math');
    },
    replacement: (content) => content,
  });

  // Custom rule: Ignore empty divs / layout wrappers
  service.addRule('cleanLayoutDivs', {
    filter: (node) => {
      return node.nodeName === 'DIV' && !node.classList?.contains('highlight');
    },
    replacement: (content) => `\n${content}\n`,
  });

  return service;
}

// Post-process Markdown to eliminate web-copy noise, repeated newlines, spaces
export function cleanMarkdownOutput(md: string): string {
  let cleaned = md;

  // Replace &nbsp; entity with regular space
  cleaned = cleaned.replace(/&nbsp;/g, ' ');

  // Clean trailing spaces on every line
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // Collapse 3 or more consecutive empty lines to 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Unescape task list markers if escaped by Turndown
  cleaned = cleaned.replace(/\\\[([ xX])\\\]/g, '[$1]');
  cleaned = cleaned.replace(/\\\[([0-9]+)\\\]/g, '[$1]');

  // Fix empty list bullets (- or * on a line alone)
  cleaned = cleaned.replace(/^[\t ]*[-*+](\s*)$/gm, '');

  // Normalize task list markers (ensure single space: - [x] or - [ ])
  cleaned = cleaned.replace(/^([\t ]*)[*+-]\s+\[([ xX])\]\s*/gm, '$1- [$2] ');

  // Remove empty header lines (e.g. ## with nothing following)
  cleaned = cleaned.replace(/^#{1,6}\s*$/gm, '');

  // Clean up escaped brackets in wiki links or URLs if double escaped
  cleaned = cleaned.replace(/\\\[\\\[([^\]]+)\\\]\\\]/g, '[[$1]]');

  return cleaned.trim();
}

// Extract image URLs from HTML string
export function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgTagRegex.exec(html)) !== null) {
    const src = match[1];
    if (src && !src.startsWith('data:image/svg+xml;base64,1x1') && !urls.includes(src)) {
      urls.push(src);
    }
  }
  return urls;
}

// Sanitize HTML securely using DOMPurify
export function sanitizeHTML(rawHtml: string): string {
  // If window is available (browser environment), use DOMPurify
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr', 'blockquote',
        'ul', 'ol', 'li',
        'b', 'strong', 'i', 'em', 's', 'strike', 'del', 'u', 'mark',
        'code', 'pre', 'kbd', 'samp',
        'a', 'img',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'span', 'div', 'input', 'sup', 'sub',
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id',
        'type', 'checked', 'align', 'data-lang', 'data-language',
      ],
      FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'style'],
      ALLOW_DATA_ATTR: true,
      ADD_URI_SAFE_ATTR: ['src', 'href'],
    });
  }

  // In non-browser (Node testing) environment: fallback basic sanitization
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '');
}

/**
 * Main Entry Point: Convert pasted or captured HTML into clean, sanitized Markdown
 */
export function convertHTMLToMarkdown(
  rawHtml: string,
  options: HTMLConversionOptions = {}
): ConvertedMarkdownResult {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {
      markdown: '',
      imageUrls: [],
      hasTables: false,
      wordCount: 0,
    };
  }

  // 1. Extract metadata (source URL, title) before stripping tags
  const { sourceUrl, title } = extractMetadataFromHTML(rawHtml);

  // 2. Pre-clean noisy web elements (ads, nav, trackers, Wikipedia noise)
  const preCleaned = cleanHTMLStructure(rawHtml);

  // 3. Security Sanitization (DOMPurify)
  const sanitized = sanitizeHTML(preCleaned);

  // 4. Extract image URLs
  const imageUrls = extractImageUrls(sanitized);

  // 5. Detect tables
  const hasTables = /<table\b/i.test(sanitized);

  // 6. Turndown HTML -> Markdown conversion
  const turndown = createTurndownService(options);
  let convertedMd = '';
  try {
    convertedMd = turndown.turndown(sanitized);
  } catch (err) {
    console.error('Turndown conversion error:', err);
    // Fallback: strip tags
    convertedMd = sanitized.replace(/<[^>]+>/g, '');
  }

  // 7. Markdown post-processing cleanup
  const cleanMd = cleanMarkdownOutput(convertedMd);

  const wordCount = cleanMd.trim() ? cleanMd.trim().split(/\s+/).length : 0;

  return {
    markdown: cleanMd,
    title,
    sourceUrl,
    imageUrls,
    hasTables,
    wordCount,
  };
}
