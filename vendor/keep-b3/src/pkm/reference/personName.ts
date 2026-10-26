import { PersonName } from './referenceTypes';

/**
 * Parses a single author string into a structured PersonName object.
 * Handles formats:
 * - "Family, Given Middle" (e.g. "Smith, John A.")
 * - "Given Middle Family" (e.g. "John A. Smith")
 * - "von Family, Given" (e.g. "von Neumann, John")
 * - "{Organization Name}" or literal non-human author
 */
export function parsePersonName(raw: string): PersonName {
  if (!raw || !raw.trim()) {
    return { literal: '' };
  }

  const trimmed = raw.trim();

  // Literal organization or braced name e.g. "{OpenAI}" or "{World Health Organization}"
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const literal = trimmed.slice(1, -1).trim();
    return { literal };
  }

  // Check if comma-separated "Family, Given" or "Family, Suffix, Given"
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 1) {
      return { family: parts[0] };
    }
    if (parts.length === 2) {
      const familyPart = parts[0];
      const givenPart = parts[1];
      const { prefix, family } = extractPrefix(familyPart);
      return {
        prefix,
        family,
        given: givenPart,
      };
    }
    if (parts.length >= 3) {
      // e.g. "King, Jr., Martin Luther" -> family: King, suffix: Jr., given: Martin Luther
      const familyPart = parts[0];
      const suffixPart = parts[1];
      const givenPart = parts.slice(2).join(' ');
      const { prefix, family } = extractPrefix(familyPart);
      return {
        prefix,
        family,
        suffix: suffixPart,
        given: givenPart,
      };
    }
  }

  // Space-separated "Given [Prefix] Family [Suffix]"
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return { family: words[0] };
  }

  // Check for common suffixes like Jr., Sr., III, IV, Ph.D.
  let suffix: string | undefined;
  const lastWord = words[words.length - 1].replace(/\.$/, '');
  if (['Jr', 'Sr', 'II', 'III', 'IV', 'V'].includes(lastWord)) {
    suffix = words.pop();
  }

  // Extract prefix if present (e.g. von, van, de, da, del, du)
  const prefixes = ['von', 'van', 'der', 'de', 'da', 'del', 'du', 'di', 'la', 'le'];
  let prefixIdx = -1;
  for (let i = 0; i < words.length - 1; i++) {
    if (prefixes.includes(words[i].toLowerCase())) {
      prefixIdx = i;
      break;
    }
  }

  if (prefixIdx > 0) {
    const given = words.slice(0, prefixIdx).join(' ');
    const prefix = words.slice(prefixIdx, -1).join(' ');
    const family = words[words.length - 1];
    return { given, prefix, family, suffix };
  }

  const family = words[words.length - 1];
  const given = words.slice(0, -1).join(' ');
  return { given, family, suffix };
}

/**
 * Extract lowercase von/van prefix from family name string
 */
function extractPrefix(familyStr: string): { prefix?: string; family: string } {
  const parts = familyStr.trim().split(/\s+/);
  if (parts.length > 1) {
    const prefixes = ['von', 'van', 'der', 'de', 'da', 'del', 'du', 'di', 'la', 'le'];
    if (prefixes.includes(parts[0].toLowerCase())) {
      return {
        prefix: parts[0],
        family: parts.slice(1).join(' '),
      };
    }
  }
  return { family: familyStr.trim() };
}

/**
 * Splits a BibTeX "author" or "editor" field by ' and ' into an array of PersonName objects
 */
export function parseBibTeXAuthors(raw: string): PersonName[] {
  if (!raw || !raw.trim()) return [];

  // Split by top-level " and " (ignoring "and" inside braces if any)
  const segments: string[] = [];
  let current = '';
  let braceDepth = 0;

  const len = raw.length;
  for (let i = 0; i < len; i++) {
    const char = raw[i];
    if (char === '{') {
      braceDepth++;
      current += char;
    } else if (char === '}') {
      if (braceDepth > 0) braceDepth--;
      current += char;
    } else if (
      braceDepth === 0 &&
      (raw.slice(i, i + 5) === ' and ' || raw.slice(i, i + 5) === '\nand ' || raw.slice(i, i + 5) === ' AND ')
    ) {
      if (current.trim()) segments.push(current.trim());
      current = '';
      i += 4; // skip " and"
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments.map(parsePersonName).filter((p) => Boolean(p.family || p.given || p.literal));
}

/**
 * Formats a single PersonName into a string
 */
export function formatPersonName(
  person: PersonName,
  format: 'family-first' | 'given-first' | 'family-only' | 'initials' = 'family-first'
): string {
  if (person.literal) {
    return person.literal;
  }

  const prefix = person.prefix ? `${person.prefix} ` : '';
  const suffix = person.suffix ? `, ${person.suffix}` : '';
  const family = `${prefix}${person.family || ''}`.trim();
  const given = person.given || '';

  if (format === 'family-only') {
    return family || given || 'Anonymous';
  }

  if (format === 'given-first') {
    return `${given} ${family}${suffix}`.trim() || 'Anonymous';
  }

  if (format === 'initials') {
    const initials = given
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((n) => `${n[0].toUpperCase()}.`)
      .join(' ');
    return `${family}${initials ? `, ${initials}` : ''}${suffix}`.trim() || 'Anonymous';
  }

  // Default: family-first (e.g. "Smith, John A.")
  if (family && given) {
    return `${family}, ${given}${suffix}`;
  }
  return family || given || 'Anonymous';
}

/**
 * Formats a list of PersonNames for in-text citations or bibliography lists
 */
export function formatAuthorsList(
  authors: PersonName[],
  options?: {
    format?: 'family-only' | 'given-first' | 'family-first' | 'initials';
    maxAuthors?: number;
    etAlText?: string;
    ampersand?: boolean;
  }
): string {
  if (!authors || authors.length === 0) {
    return 'Anonymous';
  }

  const format = options?.format || 'family-only';
  const max = options?.maxAuthors ?? 3;
  const etAl = options?.etAlText || 'et al.';
  const andWord = options?.ampersand ? '&' : 'and';

  if (authors.length === 1) {
    return formatPersonName(authors[0], format);
  }

  if (authors.length === 2) {
    const a1 = formatPersonName(authors[0], format);
    const a2 = formatPersonName(authors[1], format);
    return `${a1} ${andWord} ${a2}`;
  }

  if (authors.length > max) {
    const first = formatPersonName(authors[0], format);
    return `${first} ${etAl}`;
  }

  const formatted = authors.map((a) => formatPersonName(a, format));
  const allButLast = formatted.slice(0, -1).join(', ');
  const last = formatted[formatted.length - 1];
  return `${allButLast}, ${andWord} ${last}`;
}

/**
 * Converts PersonName[] to BibTeX formatted author string: "Smith, John and Doe, Jane"
 */
export function formatBibTeXAuthors(authors: PersonName[]): string {
  if (!authors || authors.length === 0) return '';
  return authors
    .map((author) => {
      if (author.literal) {
        return `{${author.literal}}`;
      }
      const prefix = author.prefix ? `${author.prefix} ` : '';
      const family = `${prefix}${author.family || ''}`.trim();
      const given = author.given || '';
      const suffix = author.suffix ? `, ${author.suffix}` : '';

      if (family && given) {
        return `${family}${suffix}, ${given}`;
      }
      return family || given || '';
    })
    .filter(Boolean)
    .join(' and ');
}
