/**
 * Contact Normalization & International Name Parsing Utilities
 * 
 * Preserves user formatting canonically; provides normalized derived values
 * for search indexing and high-precision duplicate candidate bucketing.
 */

import { ContactEmail, ContactPhone, ContactAddress } from './peopleTypes';

/**
 * Normalizes email for indexing and duplicate detection.
 * Conservative: lowercases domain and trims whitespace.
 */
export function normalizeEmail(emailStr: string): string {
  if (!emailStr) return '';
  const trimmed = emailStr.trim().toLowerCase();
  return trimmed;
}

/**
 * Validates email conservatively without overly aggressive regex.
 */
export function isValidEmail(emailStr: string): boolean {
  if (!emailStr || typeof emailStr !== 'string') return false;
  const trimmed = emailStr.trim();
  // Basic sanity check: has something before @ and something after @ with a dot
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed);
}

/**
 * Normalizes phone numbers for comparison by extracting significant digits.
 * Canonical phone strings in YAML remain untouched.
 */
export function normalizePhoneNumber(phoneStr: string): string {
  if (!phoneStr || typeof phoneStr !== 'string') return '';
  // Extract only digits and leading plus
  const digitsOnly = phoneStr.replace(/[^\d+]/g, '');
  // If starts with +, keep it; otherwise if it has 10-11 digits, normalize
  return digitsOnly;
}

/**
 * Parses raw emails field from frontmatter (can be string, array of strings, or array of objects)
 */
export function parseContactEmails(raw: unknown): ContactEmail[] {
  if (!raw) return [];
  const results: ContactEmail[] = [];

  const addEmail = (val: unknown, defaultLabel?: string) => {
    if (typeof val === 'string') {
      const parts = val.split(/[;,]/);
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          results.push({ address: trimmed, label: defaultLabel });
        }
      }
    } else if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, any>;
      const address = obj.address || obj.email || obj.value;
      if (typeof address === 'string' && address.trim()) {
        results.push({
          address: address.trim(),
          label: obj.label || obj.type || defaultLabel,
        });
      }
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach((item) => addEmail(item));
  } else {
    addEmail(raw);
  }

  // Deduplicate by address
  const seen = new Set<string>();
  return results.filter((e) => {
    const norm = normalizeEmail(e.address);
    if (!norm || seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

/**
 * Parses raw phones field from frontmatter
 */
export function parseContactPhones(raw: unknown): ContactPhone[] {
  if (!raw) return [];
  const results: ContactPhone[] = [];

  const addPhone = (val: unknown, defaultLabel?: string) => {
    if (typeof val === 'string' || typeof val === 'number') {
      const str = String(val).trim();
      if (str) {
        results.push({
          number: str,
          normalized: normalizePhoneNumber(str),
          label: defaultLabel,
        });
      }
    } else if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, any>;
      const num = obj.number || obj.phone || obj.value;
      if (num) {
        const str = String(num).trim();
        results.push({
          number: str,
          normalized: normalizePhoneNumber(str),
          label: obj.label || obj.type || defaultLabel,
        });
      }
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach((item) => addPhone(item));
  } else {
    addPhone(raw);
  }

  // Deduplicate by normalized number
  const seen = new Set<string>();
  return results.filter((p) => {
    const norm = p.normalized || p.number;
    if (!norm || seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

/**
 * Parses raw addresses field from frontmatter
 */
export function parseContactAddresses(raw: unknown): ContactAddress[] {
  if (!raw) return [];
  const results: ContactAddress[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const str = item.trim();
        if (str) results.push({ formatted: str });
      } else if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, any>;
        const formatted = obj.formatted || obj.address || [obj.street, obj.city, obj.state, obj.country].filter(Boolean).join(', ');
        if (formatted) {
          results.push({
            formatted,
            street: obj.street,
            city: obj.city,
            state: obj.state,
            postalCode: obj.postalCode || obj.zip,
            country: obj.country,
            label: obj.label || obj.type,
          });
        }
      }
    }
  } else if (typeof raw === 'string') {
    const str = raw.trim();
    if (str) results.push({ formatted: str });
  }

  return results;
}

/**
 * Checks if a string contains East Asian (CJK) characters
 */
export function containsCJK(str: string): boolean {
  return /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(str);
}

/**
 * Resolves a culturally respectful display name from multiple possible fields
 */
export function resolveDisplayName(props: {
  displayName?: string;
  givenName?: string;
  familyName?: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  nickname?: string;
  noteTitle: string;
}): { displayName: string; sortName: string } {
  const { displayName, givenName, familyName, middleName, prefix, suffix, nickname, noteTitle } = props;

  // 1. Explicit display name
  if (displayName && displayName.trim()) {
    const dn = displayName.trim();
    return {
      displayName: dn,
      sortName: familyName ? `${familyName}, ${givenName || dn}` : dn,
    };
  }

  // 2. Given & Family names present
  if (givenName || familyName) {
    const isCJK = containsCJK((givenName || '') + (familyName || '') + (noteTitle || ''));
    let composed = '';

    if (isCJK) {
      // East Asian naming order: FamilyName GivenName
      composed = `${familyName || ''}${givenName || ''}`.trim();
    } else {
      // Western / International naming order
      const parts = [prefix, givenName, middleName, familyName, suffix].filter(Boolean);
      composed = parts.join(' ').trim();
    }

    if (composed) {
      const sortName = familyName
        ? `${familyName}, ${givenName || ''}`.trim()
        : composed;
      return { displayName: composed, sortName };
    }
  }

  // 3. Fallback to Note Title (stripping potential extension or prefix)
  const cleanTitle = noteTitle.replace(/^person\s*[-:]\s*/i, '').trim();
  return {
    displayName: cleanTitle || 'Unnamed Person',
    sortName: cleanTitle || 'Unnamed Person',
  };
}
