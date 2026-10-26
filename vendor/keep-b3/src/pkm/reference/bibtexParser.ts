import { Reference, ReferenceType, PersonName } from './referenceTypes';
import { parseBibTeXAuthors } from './personName';
import { normalizeDOI, normalizeArXiv, normalizeISBN } from './identifiers';
import { generateCitationKey, sanitizeCitationKey } from './citationKeys';

/**
 * LaTeX character replacement table
 */
const LATEX_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\"[aA]/g, 'ä'],
  [/\\"[eE]/g, 'ë'],
  [/\\"[iI]/g, 'ï'],
  [/\\"[oO]/g, 'ö'],
  [/\\"[uU]/g, 'ü'],
  [/\\'[aA]/g, 'á'],
  [/\\'[eE]/g, 'é'],
  [/\\'[iI]/g, 'í'],
  [/\\'[oO]/g, 'ó'],
  [/\\'[uU]/g, 'ú'],
  [/\\`[aA]/g, 'à'],
  [/\\`[eE]/g, 'è'],
  [/\\`[iI]/g, 'ì'],
  [/\\`[oO]/g, 'ò'],
  [/\\`[uU]/g, 'ù'],
  [/\\\^[aA]/g, 'â'],
  [/\\\^[eE]/g, 'ê'],
  [/\\\^[iI]/g, 'î'],
  [/\\\^[oO]/g, 'ô'],
  [/\\\^[uU]/g, 'û'],
  [/\\~[nN]/g, 'ñ'],
  [/\\~[aA]/g, 'ã'],
  [/\\~[oO]/g, 'õ'],
  [/\\c\{c\}/gi, 'ç'],
  [/\\c\{C\}/gi, 'Ç'],
  [/\\aa\b/gi, 'å'],
  [/\\AA\b/gi, 'Å'],
  [/\\o\b/gi, 'ø'],
  [/\\O\b/gi, 'Ø'],
  [/\\ae\b/gi, 'æ'],
  [/\\AE\b/gi, 'Æ'],
  [/\\ss\b/gi, 'ß'],
  [/\\&/g, '&'],
  [/\\_/g, '_'],
  [/\\%/g, '%'],
  [/\\\$/g, '$'],
  [/\\#/g, '#'],
  [/---/g, '—'],
  [/--/g, '–'],
  [/~/g, ' '],
];

/**
 * Cleans LaTeX escapes, removes outer and nested protective braces, and cleans whitespace
 */
export function cleanLatexValue(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // Apply LaTeX character replacements
  for (const [pattern, replacement] of LATEX_REPLACEMENTS) {
    str = str.replace(pattern, replacement);
  }

  // Remove protective curly braces (e.g. {BERT} or {Deep Learning})
  str = str.replace(/\{([^{}]*)\}/g, '$1');
  // Second pass for double braces
  str = str.replace(/\{([^{}]*)\}/g, '$1');

  // Strip remaining solitary backslashes before plain letters
  str = str.replace(/\\([a-zA-Z])/g, '$1');

  // Normalize multi-spaces/newlines
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Map standard BibTeX entry type to canonical ReferenceType
 */
export function mapBibTeXTypeToReferenceType(bibType: string): ReferenceType {
  const clean = bibType.toLowerCase().replace(/[^a-z]/g, '');
  switch (clean) {
    case 'article':
      return 'article';
    case 'book':
    case 'booklet':
    case 'manual':
      return 'book';
    case 'incollection':
      return 'chapter';
    case 'inproceedings':
    case 'conference':
    case 'proceedings':
      return 'conference';
    case 'phdthesis':
    case 'mastersthesis':
    case 'thesis':
      return 'thesis';
    case 'techreport':
    case 'report':
      return 'report';
    case 'preprint':
      return 'preprint';
    case 'online':
    case 'webpage':
    case 'electronic':
      return 'webpage';
    case 'dataset':
    case 'data':
      return 'dataset';
    default:
      return 'other';
  }
}

/**
 * Tokenizes and parses a BibTeX string into a list of Reference records
 */
export function parseBibTeX(bibtexString: string): {
  references: Reference[];
  errors: Array<{ raw: string; error: string; line?: number }>;
} {
  const references: Reference[] = [];
  const errors: Array<{ raw: string; error: string; line?: number }> = [];

  if (!bibtexString || !bibtexString.trim()) {
    return { references, errors };
  }

  // Find all @type{key, ...} entries
  let index = 0;
  const len = bibtexString.length;

  while (index < len) {
    const atIdx = bibtexString.indexOf('@', index);
    if (atIdx === -1) break;

    // Check if this is a comment e.g. @comment
    const typeMatch = bibtexString.slice(atIdx).match(/^@([a-zA-Z0-9_-]+)\s*[\{\(]/);
    if (!typeMatch) {
      index = atIdx + 1;
      continue;
    }

    const entryTypeRaw = typeMatch[1];
    const isParen = bibtexString[atIdx + typeMatch[0].length - 1] === '(';
    const closeChar = isParen ? ')' : '}';
    const openChar = isParen ? '(' : '{';

    // Ignore @comment or @string (or process strings if needed)
    if (entryTypeRaw.toLowerCase() === 'comment' || entryTypeRaw.toLowerCase() === 'string') {
      index = atIdx + typeMatch[0].length;
      continue;
    }

    // Find the matching close bracket/parenthesis taking into account nested braces and strings
    let depth = 1;
    let inQuotes = false;
    let pos = atIdx + typeMatch[0].length;
    let foundEnd = false;

    while (pos < len && depth > 0) {
      const char = bibtexString[pos];

      if (char === '"' && bibtexString[pos - 1] !== '\\') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char === openChar) {
          depth++;
        } else if (char === closeChar) {
          depth--;
          if (depth === 0) {
            foundEnd = true;
            break;
          }
        }
      }
      pos++;
    }

    if (!foundEnd) {
      errors.push({
        raw: bibtexString.slice(atIdx, Math.min(atIdx + 100, len)),
        error: 'Unterminated BibTeX entry (missing closing brace)',
      });
      break;
    }

    const fullEntryText = bibtexString.slice(atIdx, pos + 1);
    const entryBody = bibtexString.slice(atIdx + typeMatch[0].length, pos);

    try {
      const parsedRef = parseSingleBibTeXEntry(entryTypeRaw, entryBody, fullEntryText);
      if (parsedRef) {
        references.push(parsedRef);
      }
    } catch (err: any) {
      errors.push({
        raw: fullEntryText.slice(0, 80),
        error: err?.message || 'Failed to parse entry',
      });
    }

    index = pos + 1;
  }

  return { references, errors };
}

/**
 * Parses the interior body of a single BibTeX entry: "citationKey, field = {value}, ..."
 */
function parseSingleBibTeXEntry(entryType: string, body: string, rawText: string): Reference {
  const commaIdx = body.indexOf(',');
  let citationKey = '';
  let fieldsStr = '';

  if (commaIdx === -1) {
    citationKey = sanitizeCitationKey(body.trim());
    fieldsStr = '';
  } else {
    citationKey = sanitizeCitationKey(body.slice(0, commaIdx).trim());
    fieldsStr = body.slice(commaIdx + 1);
  }

  const rawFields = parseBibTeXFields(fieldsStr);
  const extraFields: Record<string, string> = {};

  let title = '';
  let authors: PersonName[] = [];
  let editors: PersonName[] = [];
  let year: number | undefined;
  let date: string | undefined;
  let journal: string | undefined;
  let bookTitle: string | undefined;
  let publisher: string | undefined;
  let institution: string | undefined;
  let series: string | undefined;
  let volume: string | undefined;
  let issue: string | undefined;
  let pages: string | undefined;
  let doi: string | undefined;
  let isbn: string | undefined;
  let arxivId: string | undefined;
  let pmid: string | undefined;
  let url: string | undefined;
  let abstract: string | undefined;
  const tags: string[] = [];

  for (const [key, rawVal] of Object.entries(rawFields)) {
    const cleanVal = cleanLatexValue(rawVal);
    const lowerKey = key.toLowerCase();

    switch (lowerKey) {
      case 'title':
        title = cleanVal;
        break;
      case 'author':
        authors = parseBibTeXAuthors(rawVal);
        break;
      case 'editor':
        editors = parseBibTeXAuthors(rawVal);
        break;
      case 'year': {
        const yNum = parseInt(cleanVal.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(yNum) && yNum > 1000 && yNum < 2200) {
          year = yNum;
        }
        break;
      }
      case 'date':
        date = cleanVal;
        if (!year) {
          const yMatch = cleanVal.match(/\b(19\d{2}|20\d{2})\b/);
          if (yMatch) year = parseInt(yMatch[1], 10);
        }
        break;
      case 'journal':
      case 'journaltitle':
        journal = cleanVal;
        break;
      case 'booktitle':
        bookTitle = cleanVal;
        break;
      case 'publisher':
        publisher = cleanVal;
        break;
      case 'institution':
      case 'school':
      case 'organization':
        institution = cleanVal;
        break;
      case 'series':
        series = cleanVal;
        break;
      case 'volume':
        volume = cleanVal;
        break;
      case 'number':
      case 'issue':
        issue = cleanVal;
        break;
      case 'pages':
        pages = cleanVal.replace(/--/g, '-');
        break;
      case 'doi':
        doi = normalizeDOI(cleanVal) || cleanVal;
        break;
      case 'isbn':
        isbn = normalizeISBN(cleanVal) || cleanVal;
        break;
      case 'eprint':
      case 'arxivid':
      case 'arxiv':
        arxivId = normalizeArXiv(cleanVal) || cleanVal;
        break;
      case 'pmid':
        pmid = cleanVal;
        break;
      case 'url':
        url = cleanVal;
        break;
      case 'abstract':
        abstract = cleanVal;
        break;
      case 'keywords':
      case 'tags': {
        const parsedTags = cleanVal
          .split(/[,;]/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        tags.push(...parsedTags);
        break;
      }
      default:
        extraFields[key] = cleanVal;
        break;
    }
  }

  // Check if arXiv ID is in archivePrefix + eprint
  if (!arxivId && extraFields.eprint) {
    const norm = normalizeArXiv(extraFields.eprint);
    if (norm) arxivId = norm;
  }

  // If entry is arXiv preprint without type, assign preprint
  let refType = mapBibTeXTypeToReferenceType(entryType);
  if (arxivId && refType === 'article' && (!journal || journal.toLowerCase().includes('arxiv'))) {
    refType = 'preprint';
  }

  if (!title) {
    title = 'Untitled Reference';
  }

  if (!citationKey) {
    citationKey = generateCitationKey({ title, authors, year });
  }

  const now = new Date().toISOString();
  const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    type: refType,
    title,
    authors,
    editors: editors.length > 0 ? editors : undefined,
    year,
    date,
    journal,
    bookTitle,
    publisher,
    institution,
    series,
    volume,
    issue,
    pages,
    doi,
    isbn,
    arxivId,
    pmid,
    url,
    citationKey,
    abstract,
    tags: tags.length > 0 ? Array.from(new Set(tags)) : undefined,
    extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Splits "key = {value}, key2 = "value2"" string into key-value pairs
 */
function parseBibTeXFields(fieldsStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  const len = fieldsStr.length;

  while (i < len) {
    // Skip whitespace and commas
    while (i < len && (/\s/.test(fieldsStr[i]) || fieldsStr[i] === ',')) {
      i++;
    }
    if (i >= len) break;

    // Read field name
    const eqIdx = fieldsStr.indexOf('=', i);
    if (eqIdx === -1) break;

    const fieldName = fieldsStr.slice(i, eqIdx).trim().toLowerCase();
    i = eqIdx + 1;

    // Skip whitespace after =
    while (i < len && /\s/.test(fieldsStr[i])) {
      i++;
    }
    if (i >= len) break;

    let value = '';
    const char = fieldsStr[i];

    if (char === '{') {
      // Braced value
      let depth = 1;
      i++;
      const valStart = i;
      while (i < len && depth > 0) {
        if (fieldsStr[i] === '{') depth++;
        else if (fieldsStr[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
        i++;
      }
      value = fieldsStr.slice(valStart, i);
      i++; // skip closing }
    } else if (char === '"') {
      // Quoted value
      i++;
      const valStart = i;
      while (i < len) {
        if (fieldsStr[i] === '"' && fieldsStr[i - 1] !== '\\') {
          break;
        }
        i++;
      }
      value = fieldsStr.slice(valStart, i);
      i++; // skip closing "
    } else {
      // Bare value (e.g. year = 2026, or string macro)
      const valStart = i;
      while (i < len && fieldsStr[i] !== ',' && fieldsStr[i] !== '\n' && fieldsStr[i] !== '}') {
        i++;
      }
      value = fieldsStr.slice(valStart, i).trim();
    }

    if (fieldName) {
      result[fieldName] = value.trim();
    }
  }

  return result;
}
