import { Reference, ReferenceType } from './referenceTypes';
import { formatBibTeXAuthors } from './personName';

/**
 * Escapes characters that have special meaning in LaTeX
 */
export function escapeLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Maps internal ReferenceType to standard BibTeX entry type
 */
export function mapReferenceTypeToBibTeXType(type: ReferenceType): string {
  switch (type) {
    case 'article':
      return 'article';
    case 'book':
      return 'book';
    case 'chapter':
      return 'incollection';
    case 'conference':
      return 'inproceedings';
    case 'thesis':
      return 'phdthesis';
    case 'report':
      return 'techreport';
    case 'preprint':
      return 'misc';
    case 'webpage':
      return 'online';
    case 'dataset':
      return 'misc';
    default:
      return 'misc';
  }
}

/**
 * Exports a single Reference to a cleanly formatted BibTeX entry string
 */
export function exportReferenceToBibTeX(ref: Reference): string {
  const bibType = mapReferenceTypeToBibTeXType(ref.type);
  const key = ref.citationKey || 'ref';

  // Build key-value fields in deterministic order
  const fields: Array<[string, string]> = [];

  if (ref.title) {
    fields.push(['title', `{${escapeLatex(ref.title)}}`]);
  }

  if (ref.authors && ref.authors.length > 0) {
    fields.push(['author', `{${formatBibTeXAuthors(ref.authors)}}`]);
  }

  if (ref.editors && ref.editors.length > 0) {
    fields.push(['editor', `{${formatBibTeXAuthors(ref.editors)}}`]);
  }

  if (ref.year) {
    fields.push(['year', `{${ref.year}}`]);
  } else if (ref.date) {
    fields.push(['date', `{${ref.date}}`]);
  }

  if (ref.journal) {
    fields.push(['journal', `{${escapeLatex(ref.journal)}}`]);
  }

  if (ref.bookTitle) {
    fields.push(['booktitle', `{${escapeLatex(ref.bookTitle)}}`]);
  }

  if (ref.publisher) {
    fields.push(['publisher', `{${escapeLatex(ref.publisher)}}`]);
  }

  if (ref.institution) {
    fields.push(['institution', `{${escapeLatex(ref.institution)}}`]);
  }

  if (ref.series) {
    fields.push(['series', `{${escapeLatex(ref.series)}}`]);
  }

  if (ref.volume) {
    fields.push(['volume', `{${ref.volume}}`]);
  }

  if (ref.issue) {
    fields.push(['number', `{${ref.issue}}`]);
  }

  if (ref.pages) {
    // Standard BibTeX pages use double dash: 101--115
    const dashPages = ref.pages.replace(/-/g, '--').replace(/----+/g, '--');
    fields.push(['pages', `{${dashPages}}`]);
  }

  if (ref.doi) {
    fields.push(['doi', `{${ref.doi}}`]);
  }

  if (ref.isbn) {
    fields.push(['isbn', `{${ref.isbn}}`]);
  }

  if (ref.arxivId) {
    fields.push(['eprint', `{${ref.arxivId}}`]);
    fields.push(['archivePrefix', '{arXiv}']);
  }

  if (ref.pmid) {
    fields.push(['pmid', `{${ref.pmid}}`]);
  }

  if (ref.url) {
    fields.push(['url', `{${ref.url}}`]);
  }

  if (ref.abstract) {
    fields.push(['abstract', `{${escapeLatex(ref.abstract)}}`]);
  }

  if (ref.tags && ref.tags.length > 0) {
    fields.push(['keywords', `{${ref.tags.join(', ')}}`]);
  }

  // Include extraFields (sorted alphabetically)
  if (ref.extraFields) {
    const extraKeys = Object.keys(ref.extraFields).sort();
    for (const ek of extraKeys) {
      if (!fields.some(([k]) => k.toLowerCase() === ek.toLowerCase())) {
        fields.push([ek, `{${ref.extraFields[ek]}}`]);
      }
    }
  }

  const lines = fields.map(([k, v]) => `  ${k.padEnd(13, ' ')} = ${v},`);

  return `@${bibType}{${key},\n${lines.join('\n')}\n}`;
}

/**
 * Exports multiple references to a single deterministic BibTeX document string, sorted by citation key
 */
export function exportReferencesToBibTeXDocument(references: Reference[]): string {
  const sorted = [...references].sort((a, b) => {
    const kA = (a.citationKey || '').toLowerCase();
    const kB = (b.citationKey || '').toLowerCase();
    return kA.localeCompare(kB) || a.id.localeCompare(b.id);
  });

  return sorted.map(exportReferenceToBibTeX).join('\n\n') + (sorted.length > 0 ? '\n' : '');
}
