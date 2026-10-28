import { Reference, ReferenceType, PersonName, MetadataLookupResult } from './referenceTypes';
import { normalizeDOI, normalizeArXiv, normalizeISBN } from './identifiers';
import { generateCitationKey } from './citationKeys';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';

/**
 * Strips HTML tags and excessive whitespace from string
 */
function sanitizeString(str: any): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches and resolves metadata from CrossRef API for a given DOI
 */
export async function fetchDOIMetadata(rawDoi: string): Promise<MetadataLookupResult> {
  const doi = normalizeDOI(rawDoi);
  if (!doi) {
    return { success: false, source: 'doi', error: 'Invalid DOI format' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      source: 'doi',
      error: 'Metadata lookup requires internet access (you are currently offline).',
    };
  }

  if (vaultEncryptionService.isVaultLocked()) {
    return { success: false, source: 'doi', error: 'Vault is currently locked.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KeepNotes-PKM/1.0 (mailto:academic-pkm@local)',
      },
    });
    clearTimeout(timeoutId);

    if (vaultEncryptionService.isVaultLocked()) {
      return { success: false, source: 'doi', error: 'Vault was locked during lookup.' };
    }

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, source: 'doi', error: `DOI "${doi}" not found on CrossRef.` };
      }
      return {
        success: false,
        source: 'doi',
        error: `CrossRef API returned HTTP status ${response.status}`,
      };
    }

    const json = await response.json();
    const work = json.message;

    if (!work) {
      return { success: false, source: 'doi', error: 'No metadata payload returned.' };
    }

    // Map CrossRef work payload
    const title = sanitizeString(
      Array.isArray(work.title) ? work.title[0] : work.title || 'Untitled'
    );

    const authors: PersonName[] = [];
    if (Array.isArray(work.author)) {
      for (const a of work.author) {
        if (a.name) {
          authors.push({ literal: sanitizeString(a.name) });
        } else if (a.family || a.given) {
          authors.push({
            family: sanitizeString(a.family),
            given: sanitizeString(a.given),
            prefix: a.prefix ? sanitizeString(a.prefix) : undefined,
            suffix: a.suffix ? sanitizeString(a.suffix) : undefined,
          });
        }
      }
    }

    let year: number | undefined;
    if (work['published-print']?.['date-parts']?.[0]?.[0]) {
      year = work['published-print']['date-parts'][0][0];
    } else if (work['published-online']?.['date-parts']?.[0]?.[0]) {
      year = work['published-online']['date-parts'][0][0];
    } else if (work.issued?.['date-parts']?.[0]?.[0]) {
      year = work.issued['date-parts'][0][0];
    } else if (work.created?.['date-parts']?.[0]?.[0]) {
      year = work.created['date-parts'][0][0];
    }

    const journal = sanitizeString(
      Array.isArray(work['container-title'])
        ? work['container-title'][0]
        : work['container-title'] || ''
    );
    const publisher = sanitizeString(work.publisher || '');
    const volume = sanitizeString(work.volume || '');
    const issue = sanitizeString(work.issue || '');
    const pages = sanitizeString(work.page || '');
    const abstract = sanitizeString(work.abstract || '');
    const urlStr = sanitizeString(work.URL || `https://doi.org/${doi}`);

    let refType: ReferenceType = 'article';
    const cType = work.type || '';
    if (cType.includes('book')) refType = 'book';
    else if (cType.includes('chapter')) refType = 'chapter';
    else if (cType.includes('proceedings')) refType = 'conference';
    else if (cType.includes('thesis')) refType = 'thesis';
    else if (cType.includes('report')) refType = 'report';
    else if (cType.includes('posted-content') || cType.includes('preprint')) refType = 'preprint';

    const referenceData: Partial<Reference> = {
      type: refType,
      title,
      authors,
      year: year && !isNaN(year) ? year : undefined,
      journal: journal || undefined,
      publisher: publisher || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      pages: pages || undefined,
      doi,
      url: urlStr || undefined,
      abstract: abstract || undefined,
      citationKey: generateCitationKey({ title, authors, year }),
    };

    return {
      success: true,
      reference: referenceData,
      source: 'doi',
      rawResponse: work,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, source: 'doi', error: 'DOI lookup request timed out (10s).' };
    }
    return {
      success: false,
      source: 'doi',
      error: err?.message || 'Network error fetching DOI metadata.',
    };
  }
}

/**
 * Fetches and resolves metadata from arXiv API for a given arXiv ID
 */
export async function fetchArXivMetadata(rawArxiv: string): Promise<MetadataLookupResult> {
  const arxivId = normalizeArXiv(rawArxiv);
  if (!arxivId) {
    return { success: false, source: 'arxiv', error: 'Invalid arXiv identifier format' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      source: 'arxiv',
      error: 'Metadata lookup requires internet access (you are currently offline).',
    };
  }

  if (vaultEncryptionService.isVaultLocked()) {
    return { success: false, source: 'arxiv', error: 'Vault is currently locked.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (vaultEncryptionService.isVaultLocked()) {
      return { success: false, source: 'arxiv', error: 'Vault was locked during lookup.' };
    }

    if (!response.ok) {
      return {
        success: false,
        source: 'arxiv',
        error: `arXiv API returned HTTP status ${response.status}`,
      };
    }

    const xmlText = await response.text();

    // Check for empty or error response
    if (xmlText.includes('<entry>') === false) {
      return { success: false, source: 'arxiv', error: `arXiv paper "${arxivId}" not found.` };
    }

    // Parse XML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    const entry = doc.querySelector('entry');
    if (!entry) {
      return { success: false, source: 'arxiv', error: 'No entry found in arXiv response.' };
    }

    const rawTitle = entry.querySelector('title')?.textContent || '';
    const title = sanitizeString(rawTitle);

    const authorEls = entry.querySelectorAll('author name');
    const authors: PersonName[] = [];
    authorEls.forEach((el) => {
      const name = sanitizeString(el.textContent || '');
      if (name) {
        const parts = name.split(/\s+/);
        if (parts.length > 1) {
          authors.push({
            family: parts[parts.length - 1],
            given: parts.slice(0, -1).join(' '),
          });
        } else {
          authors.push({ family: name });
        }
      }
    });

    const publishedStr = entry.querySelector('published')?.textContent || '';
    let year: number | undefined;
    if (publishedStr) {
      const y = parseInt(publishedStr.slice(0, 4), 10);
      if (!isNaN(y)) year = y;
    }

    const summary = sanitizeString(entry.querySelector('summary')?.textContent || '');
    const doiEl = entry.querySelector('doi');
    const doi = doiEl ? normalizeDOI(doiEl.textContent || '') || undefined : undefined;

    const referenceData: Partial<Reference> = {
      type: 'preprint',
      title: title || 'Untitled arXiv Paper',
      authors,
      year,
      date: publishedStr ? publishedStr.slice(0, 10) : undefined,
      journal: 'arXiv preprint',
      arxivId,
      doi,
      url: `https://arxiv.org/abs/${arxivId}`,
      abstract: summary || undefined,
      citationKey: generateCitationKey({ title, authors, year }),
    };

    return {
      success: true,
      reference: referenceData,
      source: 'arxiv',
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, source: 'arxiv', error: 'arXiv lookup timed out (10s).' };
    }
    return {
      success: false,
      source: 'arxiv',
      error: err?.message || 'Network error fetching arXiv metadata.',
    };
  }
}

/**
 * Fetches and resolves book metadata from OpenLibrary API for an ISBN
 */
export async function fetchISBNMetadata(rawIsbn: string): Promise<MetadataLookupResult> {
  const cleanIsbn = rawIsbn.replace(/[^0-9Xx]/g, '');
  const isbn = normalizeISBN(cleanIsbn) || cleanIsbn;

  if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
    return { success: false, source: 'isbn', error: 'Invalid ISBN length (must be 10 or 13 digits)' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      source: 'isbn',
      error: 'Metadata lookup requires internet access (you are currently offline).',
    };
  }

  if (vaultEncryptionService.isVaultLocked()) {
    return { success: false, source: 'isbn', error: 'Vault is currently locked.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `https://openlibrary.org/isbn/${encodeURIComponent(cleanIsbn)}.json`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (vaultEncryptionService.isVaultLocked()) {
      return { success: false, source: 'isbn', error: 'Vault was locked during lookup.' };
    }

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, source: 'isbn', error: `ISBN "${isbn}" not found on OpenLibrary.` };
      }
      return {
        success: false,
        source: 'isbn',
        error: `OpenLibrary API returned HTTP status ${response.status}`,
      };
    }

    const book = await response.json();
    const title = sanitizeString(book.title || 'Untitled Book');

    // Fetch author names if available as author keys e.g. /authors/OL12345A
    const authors: PersonName[] = [];
    if (Array.isArray(book.authors)) {
      for (const aRef of book.authors.slice(0, 5)) {
        if (aRef.key) {
          try {
            const authorRes = await fetch(`https://openlibrary.org${aRef.key}.json`);
            if (authorRes.ok) {
              const authorData = await authorRes.json();
              if (authorData.name) {
                const name = sanitizeString(authorData.name);
                const parts = name.split(/\s+/);
                if (parts.length > 1) {
                  authors.push({
                    family: parts[parts.length - 1],
                    given: parts.slice(0, -1).join(' '),
                  });
                } else {
                  authors.push({ family: name });
                }
              }
            }
          } catch {
            // Ignore author fetch failure
          }
        }
      }
    }

    let year: number | undefined;
    const pubDate = sanitizeString(book.publish_date || '');
    if (pubDate) {
      const yMatch = pubDate.match(/\b(19\d{2}|20\d{2})\b/);
      if (yMatch) year = parseInt(yMatch[1], 10);
    }

    const publisher = sanitizeString(
      Array.isArray(book.publishers) ? book.publishers[0] : book.publishers || ''
    );
    const pages = book.number_of_pages ? String(book.number_of_pages) : undefined;

    const referenceData: Partial<Reference> = {
      type: 'book',
      title,
      authors: authors.length > 0 ? authors : undefined,
      year,
      date: pubDate || undefined,
      publisher: publisher || undefined,
      pages,
      isbn,
      url: `https://openlibrary.org/isbn/${cleanIsbn}`,
      citationKey: generateCitationKey({ title, authors, year }),
    };

    return {
      success: true,
      reference: referenceData,
      source: 'isbn',
      rawResponse: book,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, source: 'isbn', error: 'ISBN lookup timed out (10s).' };
    }
    return {
      success: false,
      source: 'isbn',
      error: err?.message || 'Network error fetching ISBN metadata.',
    };
  }
}

/**
 * Dispatches identifier lookup based on input string (auto-detects DOI vs arXiv vs ISBN)
 */
export async function lookupReferenceByIdentifier(identifier: string): Promise<MetadataLookupResult> {
  const trimmed = identifier.trim();

  // Try DOI
  if (normalizeDOI(trimmed) || trimmed.startsWith('10.') || trimmed.includes('doi.org')) {
    return fetchDOIMetadata(trimmed);
  }

  // Try arXiv
  if (normalizeArXiv(trimmed) || trimmed.toLowerCase().includes('arxiv')) {
    return fetchArXivMetadata(trimmed);
  }

  // Try ISBN
  if (normalizeISBN(trimmed) || /^[0-9Xx\s-]{10,20}$/.test(trimmed)) {
    return fetchISBNMetadata(trimmed);
  }

  return {
    success: false,
    source: 'manual',
    error: 'Unrecognized identifier format. Please enter a valid DOI (10.xxxx/...), arXiv ID (YYMM.NNNNN), or ISBN.',
  };
}
