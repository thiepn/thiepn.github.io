import { Reference, DuplicateCandidate, FieldDifference } from './referenceTypes';
import { normalizeDOI, normalizeArXiv, normalizeISBN } from './identifiers';
import { formatAuthorsList } from './personName';

/**
 * Computes Jaccard word similarity between two normalized strings
 */
function computeWordJaccard(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = new Set(
    a
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const setB = new Set(
    b
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Builds list of field differences between an existing and incoming reference
 */
export function computeFieldDifferences(existing: Reference, incoming: Reference): FieldDifference[] {
  const fieldsToCheck: Array<{ key: keyof Reference; label: string }> = [
    { key: 'citationKey', label: 'Citation Key' },
    { key: 'title', label: 'Title' },
    { key: 'authors', label: 'Authors' },
    { key: 'year', label: 'Year' },
    { key: 'type', label: 'Type' },
    { key: 'journal', label: 'Journal / Book' },
    { key: 'volume', label: 'Volume' },
    { key: 'issue', label: 'Issue' },
    { key: 'pages', label: 'Pages' },
    { key: 'doi', label: 'DOI' },
    { key: 'arxivId', label: 'arXiv ID' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'url', label: 'URL' },
    { key: 'abstract', label: 'Abstract' },
  ];

  const diffs: FieldDifference[] = [];

  for (const { key, label } of fieldsToCheck) {
    const exVal = existing[key];
    const inVal = incoming[key];

    let exFormatted = exVal;
    let inFormatted = inVal;

    if (key === 'authors') {
      exFormatted = formatAuthorsList(existing.authors || [], { format: 'family-first' });
      inFormatted = formatAuthorsList(incoming.authors || [], { format: 'family-first' });
    }

    const exEmpty = exVal === undefined || exVal === null || exVal === '' || (Array.isArray(exVal) && exVal.length === 0);
    const inEmpty = inVal === undefined || inVal === null || inVal === '' || (Array.isArray(inVal) && inVal.length === 0);

    if (exEmpty && inEmpty) continue;

    if (exEmpty && !inEmpty) {
      diffs.push({
        fieldName: key,
        fieldLabel: label,
        existingValue: exFormatted,
        incomingValue: inFormatted,
        status: 'missing_in_existing',
      });
    } else if (!exEmpty && inEmpty) {
      diffs.push({
        fieldName: key,
        fieldLabel: label,
        existingValue: exFormatted,
        incomingValue: inFormatted,
        status: 'missing_in_incoming',
      });
    } else {
      const isIdentical =
        typeof exFormatted === 'string' && typeof inFormatted === 'string'
          ? exFormatted.trim().toLowerCase() === inFormatted.trim().toLowerCase()
          : JSON.stringify(exVal) === JSON.stringify(inVal);

      diffs.push({
        fieldName: key,
        fieldLabel: label,
        existingValue: exFormatted,
        incomingValue: inFormatted,
        status: isIdentical ? 'identical' : 'different',
      });
    }
  }

  return diffs;
}

/**
 * Checks an incoming reference against existing vault references to detect duplicates
 */
export function findDuplicateCandidate(
  incoming: Reference,
  existingReferences: Reference[]
): DuplicateCandidate | null {
  const normDoi = incoming.doi ? normalizeDOI(incoming.doi) : null;
  const normArxiv = incoming.arxivId ? normalizeArXiv(incoming.arxivId) : null;
  const normIsbn = incoming.isbn ? normalizeISBN(incoming.isbn) : null;
  const incomingKey = (incoming.citationKey || '').trim().toLowerCase();

  for (const ex of existingReferences) {
    // 1. Exact DOI match
    if (normDoi && ex.doi) {
      const exDoi = normalizeDOI(ex.doi);
      if (exDoi && exDoi.toLowerCase() === normDoi.toLowerCase()) {
        return {
          id: `dup-doi-${ex.id}-${incoming.id}`,
          existing: ex,
          incoming,
          reason: `Exact DOI match: ${normDoi}`,
          confidence: 'exact_doi',
          differences: computeFieldDifferences(ex, incoming),
        };
      }
    }

    // 2. Exact arXiv match
    if (normArxiv && ex.arxivId) {
      const exArxiv = normalizeArXiv(ex.arxivId);
      if (exArxiv && exArxiv.toLowerCase() === normArxiv.toLowerCase()) {
        return {
          id: `dup-arxiv-${ex.id}-${incoming.id}`,
          existing: ex,
          incoming,
          reason: `Exact arXiv ID match: ${normArxiv}`,
          confidence: 'exact_arxiv',
          differences: computeFieldDifferences(ex, incoming),
        };
      }
    }

    // 3. Exact ISBN match
    if (normIsbn && ex.isbn) {
      const exIsbn = normalizeISBN(ex.isbn);
      if (exIsbn && exIsbn === normIsbn) {
        return {
          id: `dup-isbn-${ex.id}-${incoming.id}`,
          existing: ex,
          incoming,
          reason: `Exact ISBN match: ${normIsbn}`,
          confidence: 'exact_isbn',
          differences: computeFieldDifferences(ex, incoming),
        };
      }
    }

    // 4. Exact Citation Key match
    if (incomingKey && ex.citationKey && ex.citationKey.trim().toLowerCase() === incomingKey) {
      return {
        id: `dup-key-${ex.id}-${incoming.id}`,
        existing: ex,
        incoming,
        reason: `Identical Citation Key: [@${incomingKey}]`,
        confidence: 'exact_key',
        differences: computeFieldDifferences(ex, incoming),
      };
    }

    // 5. Title + Author + Year high similarity
    if (incoming.title && ex.title) {
      const titleSim = computeWordJaccard(incoming.title, ex.title);
      if (titleSim >= 0.75) {
        // Compare first author family name
        const inAuthor = incoming.authors?.[0]?.family?.toLowerCase() || '';
        const exAuthor = ex.authors?.[0]?.family?.toLowerCase() || '';
        const authorMatch = !inAuthor || !exAuthor || inAuthor === exAuthor;

        const yearMatch = !incoming.year || !ex.year || incoming.year === ex.year;

        if (authorMatch && yearMatch) {
          return {
            id: `dup-sim-${ex.id}-${incoming.id}`,
            existing: ex,
            incoming,
            reason: `High Title & Author similarity (${Math.round(titleSim * 100)}%)`,
            confidence: 'high_similarity',
            differences: computeFieldDifferences(ex, incoming),
          };
        }
      }
    }
  }

  return null;
}

/**
 * Merges fields between an existing and incoming reference based on user selections
 */
export function mergeReferenceRecords(
  existing: Reference,
  incoming: Reference,
  fieldChoices: Record<string, 'existing' | 'incoming'> = {}
): Reference {
  const merged: Reference = {
    ...existing,
    updatedAt: new Date().toISOString(),
  };

  const allKeys: Array<keyof Reference> = [
    'citationKey',
    'title',
    'type',
    'authors',
    'editors',
    'year',
    'date',
    'journal',
    'bookTitle',
    'publisher',
    'institution',
    'series',
    'volume',
    'issue',
    'pages',
    'doi',
    'isbn',
    'arxivId',
    'pmid',
    'url',
    'abstract',
  ];

  for (const key of allKeys) {
    const choice = fieldChoices[key];
    if (choice === 'incoming') {
      (merged as any)[key] = incoming[key];
    } else if (!choice && (existing[key] === undefined || existing[key] === null || existing[key] === '')) {
      // Auto-fill missing field from incoming
      if (incoming[key] !== undefined && incoming[key] !== null && incoming[key] !== '') {
        (merged as any)[key] = incoming[key];
      }
    }
  }

  // Merge tags
  const tagSet = new Set([...(existing.tags || []), ...(incoming.tags || [])]);
  merged.tags = tagSet.size > 0 ? Array.from(tagSet) : undefined;

  // Merge PDF attachments
  const pdfSet = new Set([...(existing.pdfAttachmentIds || []), ...(incoming.pdfAttachmentIds || [])]);
  merged.pdfAttachmentIds = pdfSet.size > 0 ? Array.from(pdfSet) : undefined;

  // Merge extra fields
  merged.extraFields = {
    ...(incoming.extraFields || {}),
    ...(existing.extraFields || {}),
  };
  if (Object.keys(merged.extraFields).length === 0) {
    delete merged.extraFields;
  }

  return merged;
}
