/**
 * Robust RFC 6350 & RFC 2426 vCard (3.0 / 4.0) Streaming Parser
 * 
 * Safely parses multi-contact .vcf files with line-unfolding, character decoding,
 * bounded base64 photo extraction, and security protections against photo-bombs.
 */

import { VCardContact, ContactEmail, ContactPhone, ContactAddress } from './peopleTypes';
import { normalizeEmail, normalizePhoneNumber } from './contactNormalizer';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4MB maximum profile photo size

/**
 * Decodes quoted-printable string if needed
 */
function decodeQuotedPrintable(input: string): string {
  try {
    return input.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  } catch {
    return input;
  }
}

/**
 * Unescapes vCard text values (\, \; \n \\)
 */
function unescapeVCardValue(val: string): string {
  return val
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Parses raw text containing one or many vCard entries
 */
export function parseVCardText(vcardRawContent: string): {
  contacts: VCardContact[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const contacts: VCardContact[] = [];

  if (!vcardRawContent || typeof vcardRawContent !== 'string') {
    return { contacts: [], warnings: ['Empty or invalid vCard content'] };
  }

  // 1. Unfold lines (RFC 6350 3.2: lines starting with space or tab continue the previous line)
  const rawLines = vcardRawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfoldedLines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfoldedLines.length > 0) {
      unfoldedLines[unfoldedLines.length - 1] += line.slice(1);
    } else if (line.trim().length > 0) {
      unfoldedLines.push(line);
    }
  }

  // 2. Segment into individual vCard blocks
  let currentBlock: string[] | null = null;
  const blocks: string[][] = [];

  for (const line of unfoldedLines) {
    const upper = line.trim().toUpperCase();
    if (upper === 'BEGIN:VCARD') {
      currentBlock = [];
    } else if (upper === 'END:VCARD') {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    } else if (currentBlock) {
      currentBlock.push(line);
    }
  }

  // Fallback: If no BEGIN:VCARD tags found, treat whole text as a single card if it looks like one
  if (blocks.length === 0 && unfoldedLines.some((l) => l.includes(':'))) {
    blocks.push(unfoldedLines);
  }

  // 3. Parse each vCard block
  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const contact: VCardContact = {
      emails: [],
      phones: [],
      urls: [],
      addresses: [],
      categories: [],
      rawFields: {},
    };

    for (const line of block) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const fullKey = line.substring(0, colonIdx).trim();
      let rawVal = line.substring(colonIdx + 1).trim();

      // Key might contain parameters e.g. TEL;TYPE=WORK,VOICE
      const paramParts = fullKey.split(';');
      const keyName = paramParts[0].toUpperCase();
      const params = paramParts.slice(1);

      // Check parameter properties
      let isQuotedPrintable = false;
      let labelType: string | undefined;

      for (const p of params) {
        const pUpper = p.toUpperCase();
        if (pUpper === 'ENCODING=QUOTED-PRINTABLE' || pUpper === 'QUOTED-PRINTABLE') {
          isQuotedPrintable = true;
        }
        if (pUpper.startsWith('TYPE=')) {
          labelType = p.substring(5).replace(/"/g, '').toLowerCase();
        }
      }

      if (isQuotedPrintable) {
        rawVal = decodeQuotedPrintable(rawVal);
      }

      const val = unescapeVCardValue(rawVal);

      // Map standard vCard properties
      switch (keyName) {
        case 'FN':
          contact.fn = val;
          break;

        case 'N': {
          // RFC 6350 N: Family;Given;Middle;Prefix;Suffix
          const nParts = rawVal.split(';').map((p) => unescapeVCardValue(p));
          contact.n = {
            family: nParts[0] || undefined,
            given: nParts[1] || undefined,
            middle: nParts[2] || undefined,
            prefix: nParts[3] || undefined,
            suffix: nParts[4] || undefined,
          };
          break;
        }

        case 'NICKNAME':
          contact.nickname = val;
          break;

        case 'EMAIL':
          contact.emails.push({
            address: val,
            label: labelType || 'work',
          });
          break;

        case 'TEL':
          contact.phones.push({
            number: val,
            normalized: normalizePhoneNumber(val),
            label: labelType || 'mobile',
          });
          break;

        case 'ORG': {
          // ORG: Organization Name;Department
          const orgParts = val.split(';').map((p) => p.trim()).filter(Boolean);
          contact.org = orgParts.join(' — ');
          break;
        }

        case 'TITLE':
        case 'ROLE':
          contact.title = val;
          break;

        case 'BDAY':
          contact.bday = val;
          break;

        case 'URL':
          if (val.startsWith('http://') || val.startsWith('https://')) {
            contact.urls.push(val);
          } else if (val) {
            contact.urls.push(`https://${val}`);
          }
          break;

        case 'NOTE':
          contact.note = contact.note ? `${contact.note}\n${val}` : val;
          break;

        case 'CATEGORIES': {
          const cats = val.split(',').map((c) => c.trim()).filter(Boolean);
          contact.categories = [...(contact.categories || []), ...cats];
          break;
        }

        case 'ADR': {
          // ADR: PO Box; Extended Address; Street Address; City; State; Postal Code; Country
          const adrParts = rawVal.split(';').map((p) => unescapeVCardValue(p));
          const street = [adrParts[0], adrParts[1], adrParts[2]].filter(Boolean).join(', ');
          const city = adrParts[3];
          const state = adrParts[4];
          const postalCode = adrParts[5];
          const country = adrParts[6];
          const formatted = [street, city, state, postalCode, country].filter(Boolean).join(', ');
          if (formatted) {
            contact.addresses.push({
              formatted,
              street: street || undefined,
              city: city || undefined,
              state: state || undefined,
              postalCode: postalCode || undefined,
              country: country || undefined,
              label: labelType,
            });
          }
          break;
        }

        case 'PHOTO': {
          // Handle base64 photo
          if (rawVal.length > MAX_PHOTO_BYTES) {
            warnings.push(`Contact ${contact.fn || `Card #${bIdx + 1}`}: Photo skipped due to exceeding size limit.`);
          } else {
            // Determine image mime type
            let mime = 'image/jpeg';
            for (const p of params) {
              const pu = p.toUpperCase();
              if (pu.includes('PNG')) mime = 'image/png';
              else if (pu.includes('WEBP')) mime = 'image/webp';
              else if (pu.includes('GIF')) mime = 'image/gif';
            }

            if (rawVal.startsWith('data:image')) {
              contact.photoBase64 = rawVal;
              contact.photoMimeType = mime;
            } else if (/^[A-Za-z0-9+/=]+$/.test(rawVal.replace(/\s+/g, ''))) {
              const cleanB64 = rawVal.replace(/\s+/g, '');
              contact.photoBase64 = `data:${mime};base64,${cleanB64}`;
              contact.photoMimeType = mime;
            }
          }
          break;
        }

        default: {
          if (!contact.rawFields) contact.rawFields = {};
          if (!contact.rawFields[keyName]) contact.rawFields[keyName] = [];
          contact.rawFields[keyName].push(val);
          break;
        }
      }
    }

    // Only add if card has at least a name, email, phone, or org
    if (contact.fn || (contact.n && (contact.n.given || contact.n.family)) || contact.emails.length > 0 || contact.phones.length > 0 || contact.org) {
      contacts.push(contact);
    }
  }

  return { contacts, warnings };
}
