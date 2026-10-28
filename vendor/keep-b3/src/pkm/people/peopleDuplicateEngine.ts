/**
 * High-Precision Duplicate Candidate Detection Engine for Phase P48
 * 
 * Uses hash-bucket candidate indexing to scale efficiently to 10k+ people.
 * Enforces strict false-positive protections: NEVER auto-merges based only on name.
 */

import { PersonDuplicateCandidate, DuplicateMatchReason, PersonRecord } from './peopleTypes';
import { normalizeEmail, normalizePhoneNumber } from './contactNormalizer';

/**
 * Normalizes strings for index bucketing
 */
function normalizeKey(str?: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/[\s\-_.,/]+/g, ' ');
}

/**
 * Scans a list of PersonRecords and discovers potential duplicate pairs
 */
export function findDuplicateCandidates(people: PersonRecord[]): PersonDuplicateCandidate[] {
  const activePeople = people.filter((p) => !p.isTrashed);
  const candidatesMap = new Map<string, PersonDuplicateCandidate>();

  // Helper to add candidate pair consistently
  const addCandidate = (
    pA: PersonRecord,
    pB: PersonRecord,
    reason: DuplicateMatchReason,
    detail: string,
    isStrong: boolean
  ) => {
    if (pA.id === pB.id) return;
    // Order IDs deterministically to prevent reverse pair duplicates
    const [first, second] = pA.id < pB.id ? [pA, pB] : [pB, pA];
    const pairKey = `${first.id}__${second.id}`;

    const existing = candidatesMap.get(pairKey);
    if (existing) {
      if (!existing.reasons.includes(reason)) {
        existing.reasons.push(reason);
        existing.details.push(detail);
      }
      if (isStrong) {
        existing.confidence = 'strong';
      }
    } else {
      candidatesMap.set(pairKey, {
        id: pairKey,
        personA: first,
        personB: second,
        confidence: isStrong ? 'strong' : 'possible',
        reasons: [reason],
        details: [detail],
      });
    }
  };

  // 1. Email Hash Buckets (Strong match)
  const emailBuckets = new Map<string, PersonRecord[]>();
  for (const person of activePeople) {
    for (const email of person.emails) {
      const norm = normalizeEmail(email.address);
      if (norm) {
        const bucket = emailBuckets.get(norm) || [];
        bucket.push(person);
        emailBuckets.set(norm, bucket);
      }
    }
  }

  for (const [normEmail, bucket] of emailBuckets.entries()) {
    if (bucket.length > 1) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          addCandidate(
            bucket[i],
            bucket[j],
            'exact_email',
            `Matching email: ${normEmail}`,
            true
          );
        }
      }
    }
  }

  // 2. Phone Hash Buckets (Strong match)
  const phoneBuckets = new Map<string, PersonRecord[]>();
  for (const person of activePeople) {
    for (const phone of person.phones) {
      const norm = normalizePhoneNumber(phone.number);
      if (norm && norm.length >= 7) {
        const bucket = phoneBuckets.get(norm) || [];
        bucket.push(person);
        phoneBuckets.set(norm, bucket);
      }
    }
  }

  for (const [normPhone, bucket] of phoneBuckets.entries()) {
    if (bucket.length > 1) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          addCandidate(
            bucket[i],
            bucket[j],
            'exact_phone',
            `Matching phone: ${bucket[i].phones[0]?.number || normPhone}`,
            true
          );
        }
      }
    }
  }

  // 3. Name + Organization Hash Buckets (Strong/Possible match)
  const nameOrgBuckets = new Map<string, PersonRecord[]>();
  for (const person of activePeople) {
    const normName = normalizeKey(person.displayName || person.noteTitle);
    if (!normName) continue;

    for (const org of person.organizationTitles) {
      const normOrg = normalizeKey(org);
      if (normOrg) {
        const key = `${normName}@@${normOrg}`;
        const bucket = nameOrgBuckets.get(key) || [];
        bucket.push(person);
        nameOrgBuckets.set(key, bucket);
      }
    }
  }

  for (const [key, bucket] of nameOrgBuckets.entries()) {
    if (bucket.length > 1) {
      const [name, org] = key.split('@@');
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          addCandidate(
            bucket[i],
            bucket[j],
            'exact_name_and_org',
            `Same name ("${bucket[i].displayName}") and organization ("${org}")`,
            true
          );
        }
      }
    }
  }

  // 4. Name + Role Hash Buckets (Possible match)
  const nameRoleBuckets = new Map<string, PersonRecord[]>();
  for (const person of activePeople) {
    const normName = normalizeKey(person.displayName || person.noteTitle);
    const normRole = normalizeKey(person.role);
    if (normName && normRole) {
      const key = `${normName}##${normRole}`;
      const bucket = nameRoleBuckets.get(key) || [];
      bucket.push(person);
      nameRoleBuckets.set(key, bucket);
    }
  }

  for (const [key, bucket] of nameRoleBuckets.entries()) {
    if (bucket.length > 1) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          addCandidate(
            bucket[i],
            bucket[j],
            'exact_name_and_role',
            `Matching name and role ("${bucket[i].role}")`,
            false
          );
        }
      }
    }
  }

  // 5. Aliases vs Names (Possible match)
  const nameToPersonMap = new Map<string, PersonRecord[]>();
  for (const person of activePeople) {
    const normName = normalizeKey(person.displayName || person.noteTitle);
    if (normName) {
      const list = nameToPersonMap.get(normName) || [];
      list.push(person);
      nameToPersonMap.set(normName, list);
    }
  }

  for (const person of activePeople) {
    for (const alias of person.aliases) {
      const normAlias = normalizeKey(alias);
      if (normAlias) {
        const matches = nameToPersonMap.get(normAlias);
        if (matches) {
          for (const match of matches) {
            if (match.id !== person.id) {
              addCandidate(
                person,
                match,
                'strong_alias_match',
                `Alias "${alias}" matches name of "${match.displayName}"`,
                false
              );
            }
          }
        }
      }
    }
  }

  return Array.from(candidatesMap.values());
}
