/**
 * PKM Phase P34: Browser Extension Content Script
 * Injected on-demand into web pages to extract clean page metadata, selections,
 * and readable article content without tracking or collecting passwords.
 */

import { ExtractedArticleMetadata } from '../../pkm/extensionBridge/captureProtocol';

export interface PageExtractionResult {
  title: string;
  sourceUrl: string;
  siteName: string;
  author?: string;
  publishedTime?: string;
  description?: string;
  selectionText?: string;
  selectionHtml?: string;
  article?: ExtractedArticleMetadata;
}

/**
 * Extracts page metadata from OpenGraph, Twitter Cards, Schema.org, and standard meta tags
 */
export function extractPageMetadata(): {
  title: string;
  sourceUrl: string;
  siteName: string;
  author?: string;
  publishedTime?: string;
  description?: string;
} {
  if (typeof document === 'undefined') {
    return { title: 'Untitled', sourceUrl: '', siteName: '' };
  }

  const getMeta = (names: string[]): string | undefined => {
    for (const name of names) {
      const el =
        document.querySelector(`meta[property="${name}"]`) ||
        document.querySelector(`meta[name="${name}"]`);
      if (el) {
        const val = el.getAttribute('content');
        if (val && val.trim().length > 0) return val.trim();
      }
    }
    return undefined;
  };

  const title =
    getMeta(['og:title', 'twitter:title']) ||
    document.title ||
    document.querySelector('h1')?.textContent?.trim() ||
    'Untitled Page';

  const canonicalEl = document.querySelector('link[rel="canonical"]');
  const sourceUrl =
    canonicalEl?.getAttribute('href') ||
    getMeta(['og:url']) ||
    window.location.href;

  const siteName =
    getMeta(['og:site_name', 'twitter:site']) ||
    window.location.hostname.replace(/^www\./, '');

  const author =
    getMeta(['author', 'article:author', 'twitter:creator', 'byl']) ||
    document.querySelector('[rel="author"]')?.textContent?.trim();

  const publishedTime =
    getMeta(['article:published_time', 'datePublished', 'og:published_time', 'publication_date']) ||
    document.querySelector('time[datetime]')?.getAttribute('datetime') ||
    undefined;

  const description = getMeta(['og:description', 'twitter:description', 'description']);

  return {
    title,
    sourceUrl,
    siteName,
    author,
    publishedTime,
    description,
  };
}

/**
 * Extracts user selected text and HTML safely
 */
export function extractSelection(): { text: string; html: string } {
  if (typeof window === 'undefined' || !window.getSelection) {
    return { text: '', html: '' };
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return { text: '', html: '' };
  }

  const text = selection.toString().trim();
  const range = selection.getRangeAt(0);
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());

  // Security: strip script, password inputs, or interactive forms from selection
  sanitizeDOMNode(container);

  return {
    text,
    html: container.innerHTML,
  };
}

/**
 * Cleans a DOM node by removing script tags, style, password fields, ads, etc.
 */
function sanitizeDOMNode(root: HTMLElement): void {
  // 1. Password input protection: never extract password or credential inputs
  const sensitiveInputs = root.querySelectorAll('input[type="password"], input[type="hidden"], input[autocomplete*="password"], [data-sensitive="true"]');
  sensitiveInputs.forEach((el) => el.remove());

  // 2. Remove executable / script elements
  const elementsToRemove = root.querySelectorAll(
    'script, style, iframe, frame, object, embed, noscript, svg, form, button'
  );
  elementsToRemove.forEach((el) => el.remove());

  // 3. Strip inline event handlers and javascript: links
  const allElements = root.querySelectorAll('*');
  allElements.forEach((el) => {
    // Remove inline on* attributes
    for (let i = el.attributes.length - 1; i >= 0; i--) {
      const attr = el.attributes[i];
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
    // Remove javascript: hrefs
    if (el.tagName.toLowerCase() === 'a') {
      const href = el.getAttribute('href');
      if (href && href.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute('href');
      }
    }
  });
}

/**
 * Lightweight Article Reader & Noise-Stripping Engine
 * Identifies the main content body and strips header, footer, navigation, ads, cookie notices
 */
export function extractReadableArticle(): ExtractedArticleMetadata {
  if (typeof document === 'undefined') {
    return {};
  }

  const meta = extractPageMetadata();

  // 1. Candidate containers
  const candidates: HTMLElement[] = [];

  // Look for semantic containers first
  const semanticSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '#content',
    '.content',
  ];

  for (const sel of semanticSelectors) {
    const el = document.querySelector(sel);
    if (el && el instanceof HTMLElement) {
      candidates.push(el);
    }
  }

  // If no semantic container, fallback to body
  if (candidates.length === 0 && document.body) {
    candidates.push(document.body);
  }

  // Pick container with highest paragraph text density
  let bestContainer: HTMLElement = candidates[0] || document.body;
  let maxScore = -1;

  for (const cand of candidates) {
    const pCount = cand.querySelectorAll('p').length;
    const textLen = cand.textContent?.length || 0;
    const score = pCount * 50 + textLen;
    if (score > maxScore) {
      maxScore = score;
      bestContainer = cand;
    }
  }

  if (!bestContainer) {
    return {
      title: meta.title,
      siteName: meta.siteName,
      byline: meta.author,
      publishedTime: meta.publishedTime,
    };
  }

  // Clone container to avoid mutating page DOM
  const clone = bestContainer.cloneNode(true) as HTMLElement;

  // Remove known noise selectors
  const noiseSelectors = [
    'nav',
    'header',
    'footer',
    'aside',
    '.sidebar',
    '#sidebar',
    '.navigation',
    '.nav',
    '.menu',
    '.cookie-banner',
    '.cookie-notice',
    '.ad',
    '.advertisement',
    '.banner',
    '#comments',
    '.comments',
    '.share-buttons',
    '.social-share',
    '.newsletter-signup',
    '.popup',
    '.modal',
  ];

  for (const noise of noiseSelectors) {
    clone.querySelectorAll(noise).forEach((el) => el.remove());
  }

  // Sanitize DOM
  sanitizeDOMNode(clone);

  const textContent = clone.textContent?.trim() || '';
  const contentHtml = clone.innerHTML;
  const excerpt = meta.description || textContent.slice(0, 200).replace(/\s+/g, ' ');
  const words = textContent.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.round(words / 200));

  return {
    title: meta.title,
    byline: meta.author,
    contentHtml,
    textContent,
    excerpt,
    siteName: meta.siteName,
    publishedTime: meta.publishedTime,
    readingTimeMinutes,
  };
}

/**
 * Full page extraction pipeline combining metadata, selection, and readable article
 */
export function extractFullPageContent(): PageExtractionResult {
  const meta = extractPageMetadata();
  const selection = extractSelection();
  const article = extractReadableArticle();

  return {
    title: meta.title,
    sourceUrl: meta.sourceUrl,
    siteName: meta.siteName,
    author: meta.author,
    publishedTime: meta.publishedTime,
    description: meta.description,
    selectionText: selection.text || undefined,
    selectionHtml: selection.html || undefined,
    article,
  };
}

// Global runtime message listener for browser extension injection
if (typeof window !== 'undefined') {
  (window as any).__PKM_CAPTURE_EXTRACT__ = extractFullPageContent;
}
