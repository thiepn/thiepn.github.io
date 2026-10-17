/**
 * Academic Identifier Normalization and Validation (DOI, arXiv, ISBN)
 */

/**
 * Normalizes any DOI string (URL, urn, doi: prefix) to canonical "10.xxxx/yyyy" form.
 * Returns null if string is not a valid DOI.
 */
export function normalizeDOI(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let clean = raw.trim();

  // Strip URL prefixes: https://doi.org/, http://dx.doi.org/, etc.
  clean = clean.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  // Strip urn:doi: or doi: prefixes
  clean = clean.replace(/^(urn:)?doi:\s*/i, '');
  // Strip enclosing brackets or quotes
  clean = clean.replace(/^[<"']|[>"']$/g, '').trim();

  // Standard DOI pattern: starts with 10. followed by 4+ digits, slash, and characters
  // e.g. 10.1000/182, 10.48550/arXiv.1706.03762
  const doiRegex = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;
  if (doiRegex.test(clean)) {
    // Strip trailing periods or commas if copied accidentally
    clean = clean.replace(/[.,;]+$/, '');
    return clean;
  }

  // Attempt to extract DOI if embedded in a sentence or string
  const embeddedMatch = clean.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/);
  if (embeddedMatch) {
    let extracted = embeddedMatch[1].replace(/[.,;)]+$/, '');
    if (doiRegex.test(extracted)) {
      return extracted;
    }
  }

  return null;
}

export function isValidDOI(raw: string): boolean {
  return normalizeDOI(raw) !== null;
}

/**
 * Normalizes arXiv identifier (URL, arXiv: prefix, etc.) to canonical format (e.g. "1706.03762" or "math/0102034")
 */
export function normalizeArXiv(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let clean = raw.trim();

  // Strip URL prefixes: https://arxiv.org/abs/..., https://arxiv.org/pdf/...
  clean = clean.replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\//i, '');
  clean = clean.replace(/\.pdf$/i, '');
  // Strip "arXiv:" prefix
  clean = clean.replace(/^arxiv:\s*/i, '');
  clean = clean.replace(/^[<"']|[>"']$/g, '').trim();

  // New arXiv scheme (from 2007): YYMM.NNNNN or YYMM.NNNNNvV
  const newSchemeRegex = /^\d{4}\.\d{4,5}(v\d+)?$/i;
  if (newSchemeRegex.test(clean)) {
    return clean;
  }

  // Old arXiv scheme (pre-2007): archive.subj/YYMMNNN or archive/YYMMNNN
  const oldSchemeRegex = /^[a-z\-]+(\.[a-z\-]+)?\/\d{7}(v\d+)?$/i;
  if (oldSchemeRegex.test(clean)) {
    return clean;
  }

  // Embedded extraction
  const embeddedNew = clean.match(/\b(\d{4}\.\d{4,5}(v\d+)?)\b/i);
  if (embeddedNew) {
    return embeddedNew[1];
  }

  return null;
}

export function isValidArXiv(raw: string): boolean {
  return normalizeArXiv(raw) !== null;
}

/**
 * Normalizes ISBN (ISBN-10 or ISBN-13).
 * Validates checksum where practical and returns standard hyphenated or clean 10/13 digit string.
 */
export function normalizeISBN(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let clean = raw.trim();

  // Strip "ISBN:" or "ISBN-10:" / "ISBN-13:" prefixes
  clean = clean.replace(/^isbn(-1[03])?:\s*/i, '');
  // Remove all non-alphanumeric chars (keep X for ISBN-10 checksum)
  const digits = clean.replace(/[^0-9Xx]/g, '').toUpperCase();

  if (digits.length === 10) {
    // Validate ISBN-10 checksum
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i], 10) * (10 - i);
    }
    const lastChar = digits[9];
    const checksum = lastChar === 'X' ? 10 : parseInt(lastChar, 10);
    sum += checksum;

    if (sum % 11 === 0) {
      return formatISBN10(digits);
    }
  } else if (digits.length === 13) {
    // Validate ISBN-13 checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(digits[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    if (checkDigit === parseInt(digits[12], 10)) {
      return formatISBN13(digits);
    }
  }

  return null;
}

function formatISBN10(digits: string): string {
  // Simple standard grouping
  return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4, 9)}-${digits.slice(9)}`;
}

function formatISBN13(digits: string): string {
  // Standard 978-X-XX-XXXXXX-X grouping
  return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 12)}-${digits.slice(12)}`;
}

export function isValidISBN(raw: string): boolean {
  return normalizeISBN(raw) !== null;
}

/**
 * Extracts any potential DOIs, arXiv IDs, and ISBNs found within arbitrary text or clipboard content
 */
export function extractIdentifiersFromText(text: string): {
  dois: string[];
  arxivs: string[];
  isbns: string[];
} {
  const dois: string[] = [];
  const arxivs: string[] = [];
  const isbns: string[] = [];

  if (!text || typeof text !== 'string') {
    return { dois, arxivs, isbns };
  }

  // 1. DOIs
  const doiMatches = text.match(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/g);
  if (doiMatches) {
    for (const match of doiMatches) {
      const norm = normalizeDOI(match);
      if (norm && !dois.includes(norm)) {
        dois.push(norm);
      }
    }
  }

  // 2. arXiv IDs
  const arxivMatches = text.match(/(?:arxiv:\s*|arxiv\.org\/(?:abs|pdf)\/)?(\d{4}\.\d{4,5}(?:v\d+)?)/gi);
  if (arxivMatches) {
    for (const match of arxivMatches) {
      const norm = normalizeArXiv(match);
      if (norm && !arxivs.includes(norm)) {
        arxivs.push(norm);
      }
    }
  }

  // 3. ISBNs
  const isbnMatches = text.match(/(?:ISBN(?:-1[03])?:\s*)?([0-9Xx\s-]{10,20})/gi);
  if (isbnMatches) {
    for (const match of isbnMatches) {
      const norm = normalizeISBN(match);
      if (norm && !isbns.includes(norm)) {
        isbns.push(norm);
      }
    }
  }

  return { dois, arxivs, isbns };
}
