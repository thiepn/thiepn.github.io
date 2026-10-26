import { Reference, CitationMatch, CitationStyleKey } from './referenceTypes';
import { formatAuthorsList, formatPersonName } from './personName';

/**
 * Formats a single in-text citation string
 */
export function formatInlineCitation(
  reference: Reference | undefined,
  citationKey: string,
  locator?: string,
  style: CitationStyleKey = 'apa',
  ieeeIndex?: number
): string {
  if (!reference) {
    return `[Missing citation: ${citationKey}]`;
  }

  const authors = reference.authors || [];
  const yearStr = reference.year ? String(reference.year) : reference.date || 'n.d.';

  if (style === 'ieee') {
    const num = ieeeIndex ?? 1;
    if (locator) {
      return `[${num}, ${locator}]`;
    }
    return `[${num}]`;
  }

  if (style === 'chicago') {
    const authorStr = formatAuthorsList(authors, { format: 'family-only', maxAuthors: 3, ampersand: false });
    if (locator) {
      // Chicago style uses colon or comma e.g. (Smith 2026, 42)
      const cleanLoc = locator.replace(/^p{1,2}\.?\s*/i, '');
      return `(${authorStr} ${yearStr}, ${cleanLoc})`;
    }
    return `(${authorStr} ${yearStr})`;
  }

  if (style === 'harvard' || style === 'generic') {
    const authorStr = formatAuthorsList(authors, { format: 'family-only', maxAuthors: 2, ampersand: true });
    if (locator) {
      return `(${authorStr}, ${yearStr}, ${locator})`;
    }
    return `(${authorStr}, ${yearStr})`;
  }

  // Default: APA 7th
  const authorStr = formatAuthorsList(authors, { format: 'family-only', maxAuthors: 2, ampersand: true });
  if (locator) {
    return `(${authorStr}, ${yearStr}, ${locator})`;
  }
  return `(${authorStr}, ${yearStr})`;
}

/**
 * Formats a grouped in-text citation e.g. (Smith, 2026; Lee, 2024, p. 10) or [1, 2]
 */
export function formatInlineCitationGroup(
  citations: CitationMatch[],
  referenceMap: Map<string, Reference>,
  style: CitationStyleKey = 'apa',
  ieeeIndexMap?: Map<string, number>
): string {
  if (citations.length === 0) return '';

  if (style === 'ieee') {
    const numbers: string[] = [];
    for (const c of citations) {
      const idx = ieeeIndexMap?.get(c.citationKey.toLowerCase()) ?? 1;
      if (c.locator) {
        numbers.push(`${idx}, ${c.locator}`);
      } else {
        numbers.push(String(idx));
      }
    }
    return `[${numbers.join(', ')}]`;
  }

  const items = citations.map((c) => {
    const ref = referenceMap.get(c.citationKey.toLowerCase());
    const raw = formatInlineCitation(ref, c.citationKey, c.locator, style);
    // Strip outer parens to combine inside single parens
    if (raw.startsWith('(') && raw.endsWith(')')) {
      return raw.slice(1, -1);
    }
    return raw;
  });

  return `(${items.join('; ')})`;
}

/**
 * Formats a complete bibliographic entry for a Reference according to selected citation style
 */
export function formatBibliographyEntry(
  ref: Reference,
  style: CitationStyleKey = 'apa',
  index?: number
): string {
  const authors = ref.authors || [];
  const year = ref.year ? String(ref.year) : ref.date ? ref.date : 'n.d.';
  const title = ref.title || 'Untitled';
  const journalOrBook = ref.journal || ref.bookTitle || '';
  const publisherOrInst = ref.publisher || ref.institution || '';
  const vol = ref.volume ? `vol. ${ref.volume}` : '';
  const iss = ref.issue ? `no. ${ref.issue}` : '';
  const pages = ref.pages ? `pp. ${ref.pages}` : '';
  const doiUrl = ref.doi ? (ref.doi.startsWith('http') ? ref.doi : `https://doi.org/${ref.doi}`) : '';
  const url = ref.url || doiUrl;

  switch (style) {
    case 'ieee': {
      const num = index !== undefined ? `[${index}] ` : '';
      const authorsIeee = formatAuthorsList(authors, {
        format: 'initials',
        maxAuthors: 6,
        ampersand: false,
      });

      const parts: string[] = [];
      if (authorsIeee) parts.push(`${authorsIeee},`);
      parts.push(`"${title},"`);
      if (journalOrBook) parts.push(`*${journalOrBook}*,`);
      if (vol) parts.push(`${vol},`);
      if (iss) parts.push(`${iss},`);
      if (pages) parts.push(`${pages},`);
      if (publisherOrInst) parts.push(`${publisherOrInst},`);
      parts.push(`${year}.`);
      if (doiUrl) parts.push(`doi: ${ref.doi}.`);
      else if (url) parts.push(`[Online]. Available: ${url}`);

      return `${num}${parts.join(' ')}`;
    }

    case 'chicago': {
      const authorStr = formatAuthorsList(authors, {
        format: 'family-first',
        maxAuthors: 7,
        ampersand: false,
      });

      const parts: string[] = [];
      if (authorStr) parts.push(`${authorStr}.`);
      parts.push(`${year}.`);
      parts.push(`"${title}."`);
      if (journalOrBook) parts.push(`*${journalOrBook}*`);
      if (ref.volume && ref.issue) parts.push(`${ref.volume} (${ref.issue}):`);
      else if (ref.volume) parts.push(`${ref.volume}:`);
      if (ref.pages) parts.push(`${ref.pages}.`);
      if (publisherOrInst) parts.push(`${publisherOrInst}.`);
      if (doiUrl) parts.push(doiUrl);
      else if (url) parts.push(url);

      return parts.join(' ').replace(/\s+([.,:])/g, '$1');
    }

    case 'harvard': {
      const authorStr = formatAuthorsList(authors, {
        format: 'family-first',
        maxAuthors: 3,
        ampersand: true,
      });

      const parts: string[] = [];
      if (authorStr) parts.push(`${authorStr}`);
      parts.push(`(${year})`);
      parts.push(`'${title}',`);
      if (journalOrBook) parts.push(`*${journalOrBook}*,`);
      if (ref.volume) parts.push(`${ref.volume}${ref.issue ? `(${ref.issue})` : ''},`);
      if (ref.pages) parts.push(`pp. ${ref.pages}.`);
      if (publisherOrInst) parts.push(`${publisherOrInst}.`);
      if (doiUrl) parts.push(`Available at: ${doiUrl}`);
      else if (url) parts.push(`Available at: ${url}`);

      return parts.join(' ');
    }

    case 'apa':
    case 'generic':
    default: {
      const authorStr = formatAuthorsList(authors, {
        format: 'family-first',
        maxAuthors: 20,
        ampersand: true,
      });

      const parts: string[] = [];
      if (authorStr) parts.push(`${authorStr}`);
      parts.push(`(${year}).`);
      parts.push(`${title}.`);
      if (journalOrBook) parts.push(`*${journalOrBook}*,`);
      if (ref.volume && ref.issue) parts.push(`*${ref.volume}*(${ref.issue}),`);
      else if (ref.volume) parts.push(`*${ref.volume}*,`);
      if (ref.pages) parts.push(`${ref.pages}.`);
      if (publisherOrInst) parts.push(`${publisherOrInst}.`);
      if (doiUrl) parts.push(doiUrl);
      else if (url) parts.push(url);

      return parts.join(' ').replace(/\s+([.,])/g, '$1');
    }
  }
}
