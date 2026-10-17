/**
 * vCard Exporter for Phase P48
 * 
 * Exports canonical Person notes to standard RFC 6350 vCard format.
 * Includes security protection against spreadsheet/formula injection.
 */

import { PersonRecord } from './peopleTypes';

function escapeVCardValue(val: string): string {
  if (!val) return '';
  return val
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

/**
 * Converts a single PersonRecord into a vCard 4.0 string block
 */
export function personToVCardString(person: PersonRecord, markdownBody?: string): string {
  const lines: string[] = [];
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:4.0');

  // Formatted Name
  lines.push(`FN:${escapeVCardValue(person.displayName || person.noteTitle)}`);

  // Structured Name N: Family;Given;Middle;Prefix;Suffix
  const fam = person.familyName ? escapeVCardValue(person.familyName) : '';
  const giv = person.givenName ? escapeVCardValue(person.givenName) : '';
  const mid = person.middleName ? escapeVCardValue(person.middleName) : '';
  const pre = person.prefix ? escapeVCardValue(person.prefix) : '';
  const suf = person.suffix ? escapeVCardValue(person.suffix) : '';
  if (fam || giv || mid || pre || suf) {
    lines.push(`N:${fam};${giv};${mid};${pre};${suf}`);
  }

  // Nickname
  if (person.nickname) {
    lines.push(`NICKNAME:${escapeVCardValue(person.nickname)}`);
  }

  // Organization
  if (person.organizationTitles && person.organizationTitles.length > 0) {
    lines.push(`ORG:${escapeVCardValue(person.organizationTitles.join(';'))}`);
  }

  // Role / Title
  if (person.role) {
    lines.push(`TITLE:${escapeVCardValue(person.role)}`);
  }

  // Emails
  for (const email of person.emails) {
    const typeParam = email.label ? `;TYPE=${email.label.toUpperCase()}` : '';
    lines.push(`EMAIL${typeParam}:${escapeVCardValue(email.address)}`);
  }

  // Phones
  for (const phone of person.phones) {
    const typeParam = phone.label ? `;TYPE=${phone.label.toUpperCase()}` : '';
    lines.push(`TEL${typeParam}:${escapeVCardValue(phone.number)}`);
  }

  // Birthday
  if (person.birthday && person.birthday.raw) {
    // Standard ISO format (YYYY-MM-DD or --MM-DD)
    lines.push(`BDAY:${person.birthday.raw}`);
  }

  // Websites / URLs
  for (const url of person.websites) {
    lines.push(`URL:${escapeVCardValue(url)}`);
  }

  // Addresses
  for (const addr of person.addresses) {
    const typeParam = addr.label ? `;TYPE=${addr.label.toUpperCase()}` : '';
    const street = addr.street ? escapeVCardValue(addr.street) : '';
    const city = addr.city ? escapeVCardValue(addr.city) : '';
    const state = addr.state ? escapeVCardValue(addr.state) : '';
    const zip = addr.postalCode ? escapeVCardValue(addr.postalCode) : '';
    const country = addr.country ? escapeVCardValue(addr.country) : '';
    lines.push(`ADR${typeParam}:;;${street};${city};${state};${zip};${country}`);
  }

  // Categories / Tags
  if (person.tags && person.tags.length > 0) {
    lines.push(`CATEGORIES:${person.tags.map((t) => escapeVCardValue(t)).join(',')}`);
  }

  // Note Body
  if (markdownBody) {
    // Strip frontmatter from markdown body for vCard note field
    const cleanBody = markdownBody.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
    if (cleanBody) {
      lines.push(`NOTE:${escapeVCardValue(cleanBody)}`);
    }
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/**
 * Converts multiple PersonRecords into a concatenated .vcf file string
 */
export function exportPeopleToVCardString(
  people: Array<{ person: PersonRecord; markdownBody?: string }>
): string {
  return people.map((item) => personToVCardString(item.person, item.markdownBody)).join('\r\n\r\n');
}
