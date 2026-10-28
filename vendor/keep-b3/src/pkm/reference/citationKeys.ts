import { Reference } from './referenceTypes';

/**
 * List of stop words to filter out when generating citation keys from titles
 */
const TITLE_STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'about',
  'against',
  'between',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'from',
  'up',
  'down',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'shall',
  'should',
  'may',
  'might',
  'must',
  'can',
  'could',
  'that',
  'which',
  'who',
  'whom',
  'this',
  'these',
  'those',
  'toward',
  'towards',
]);

/**
 * Strips diacritics / accents from a string to produce clean ASCII: "Schrödinger" -> "schroedinger" / "schrodinger"
 */
export function sanitizeToAscii(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

/**
 * Generates a clean, deterministic citation key for a reference.
 * Formula: `firstAuthorFamily + year + shortTitleWord` (e.g. "vaswani2017attention", "smith2026deep")
 * Handles missing fields and handles collisions by appending letter suffixes (a, b, c...).
 */
export function generateCitationKey(
  ref: Partial<Reference>,
  existingKeys: Set<string> = new Set(),
  currentRefId?: string
): string {
  // 1. Author part
  let authorPart = 'ref';
  if (ref.authors && ref.authors.length > 0) {
    const firstAuthor = ref.authors[0];
    const rawFamily = firstAuthor.family || firstAuthor.literal || firstAuthor.given || '';
    const clean = sanitizeToAscii(rawFamily);
    if (clean) {
      authorPart = clean;
    }
  }

  // 2. Year part
  let yearPart = '';
  if (ref.year && !isNaN(ref.year)) {
    yearPart = String(ref.year);
  } else if (ref.date) {
    const yMatch = ref.date.match(/\b(19\d{2}|20\d{2})\b/);
    if (yMatch) {
      yearPart = yMatch[1];
    }
  }

  // 3. Title word part (first non-stop word)
  let titlePart = '';
  if (ref.title) {
    const words = ref.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    for (const word of words) {
      if (!TITLE_STOP_WORDS.has(word) && word.length >= 3) {
        titlePart = word.slice(0, 12);
        break;
      }
    }
    if (!titlePart && words.length > 0) {
      titlePart = words[0].slice(0, 8);
    }
  }

  const baseKey = `${authorPart}${yearPart}${titlePart}`.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'ref';

  // Check for uniqueness
  if (!existingKeys.has(baseKey)) {
    return baseKey;
  }

  // Generate suffix: a, b, c, ..., z, aa, ab...
  const suffixes = 'abcdefghijklmnopqrstuvwxyz'.split('');
  for (const s of suffixes) {
    const candidate = `${baseKey}${s}`;
    if (!existingKeys.has(candidate)) {
      return candidate;
    }
  }

  // Fallback for extreme collision
  let counter = 1;
  while (existingKeys.has(`${baseKey}${counter}`)) {
    counter++;
  }
  return `${baseKey}${counter}`;
}

/**
 * Sanitizes a user-entered citation key into standard safe format
 */
export function sanitizeCitationKey(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:-]/g, '');
}

/**
 * Validates a citation key format and checks for conflicts
 */
export function validateCitationKey(
  key: string,
  existingKeys: Set<string>,
  isEditingExistingKey = false
): { valid: boolean; error?: string } {
  if (!key || !key.trim()) {
    return { valid: false, error: 'Citation key cannot be empty' };
  }

  const clean = sanitizeCitationKey(key);
  if (clean.length < 2) {
    return { valid: false, error: 'Citation key is too short (min 2 chars)' };
  }

  if (clean !== key.trim().toLowerCase()) {
    return {
      valid: false,
      error: 'Citation key can only contain alphanumeric characters, underscores, and hyphens',
    };
  }

  if (!isEditingExistingKey && existingKeys.has(clean)) {
    return { valid: false, error: `Citation key "${clean}" is already in use by another reference` };
  }

  return { valid: true };
}
