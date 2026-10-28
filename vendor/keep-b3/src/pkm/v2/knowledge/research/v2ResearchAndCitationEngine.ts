/**
 * V2.17 Research, Reference & Citation Engine
 * 
 * Manages structured bibliographic references, persistent identifier deduplication,
 * PDF highlight anchoring with exact page coordinates, inline citation resolution (@citekey),
 * deterministic bibliography generation, and Research Workspace coordination.
 */

export interface BibliographicReference {
  id: string;
  citekey: string;
  title: string;
  authors: string[];
  year: number;
  entryType: 'article' | 'book' | 'inproceedings' | 'techreport' | 'misc';
  identifiers: {
    doi?: string;
    isbn?: string;
    pmid?: string;
    arxiv?: string;
    url?: string;
  };
  abstract?: string;
  publication?: string;
  pdfAttachmentId?: string;
  pdfPath?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface V2PDFHighlightAnchor {
  id: string;
  referenceId: string;
  pageNumber: number;
  coordinates: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  selectedText: string;
  userComment?: string;
  color?: 'yellow' | 'green' | 'blue' | 'purple' | 'red';
  createdAt: string;
}

export interface CitationReferenceMatch {
  rawCitation: string;
  citekey: string;
  locator?: string;
  reference?: BibliographicReference;
  isResolved: boolean;
}

export class V2ResearchAndCitationEngine {
  private static instance: V2ResearchAndCitationEngine | null = null;
  private references: Map<string, BibliographicReference> = new Map();
  private highlights: Map<string, V2PDFHighlightAnchor[]> = new Map();

  private constructor() {}

  public static getInstance(): V2ResearchAndCitationEngine {
    if (!V2ResearchAndCitationEngine.instance) {
      V2ResearchAndCitationEngine.instance = new V2ResearchAndCitationEngine();
    }
    return V2ResearchAndCitationEngine.instance;
  }

  /**
   * Generates a stable unique citekey from author and year.
   */
  public generateCitekey(authors: string[], year: number, title?: string): string {
    const firstAuthor = authors[0] ? authors[0].split(' ').pop()?.toLowerCase().replace(/[^\w]/g, '') : 'unknown';
    const cleanYear = year || new Date().getFullYear();
    const disambiguation = title ? title.trim().split(' ')[0].toLowerCase().replace(/[^\w]/g, '').substring(0, 4) : '';
    return `${firstAuthor}${cleanYear}${disambiguation ? `_${disambiguation}` : ''}`;
  }

  /**
   * Adds or registers a bibliographic reference, enforcing deduplication via persistent identifiers.
   */
  public registerReference(ref: BibliographicReference): { reference: BibliographicReference; isDuplicate: boolean; duplicateOf?: string } {
    // Check DOI match
    if (ref.identifiers.doi) {
      for (const [id, existing] of this.references.entries()) {
        if (id !== ref.id && existing.identifiers.doi && existing.identifiers.doi.toLowerCase() === ref.identifiers.doi.toLowerCase()) {
          return { reference: existing, isDuplicate: true, duplicateOf: id };
        }
      }
    }

    // Check ISBN match
    if (ref.identifiers.isbn) {
      for (const [id, existing] of this.references.entries()) {
        if (id !== ref.id && existing.identifiers.isbn && existing.identifiers.isbn.replace(/[-\s]/g, '') === ref.identifiers.isbn.replace(/[-\s]/g, '')) {
          return { reference: existing, isDuplicate: true, duplicateOf: id };
        }
      }
    }

    // Check PMID match
    if (ref.identifiers.pmid) {
      for (const [id, existing] of this.references.entries()) {
        if (id !== ref.id && existing.identifiers.pmid === ref.identifiers.pmid) {
          return { reference: existing, isDuplicate: true, duplicateOf: id };
        }
      }
    }

    // Check arXiv match
    if (ref.identifiers.arxiv) {
      for (const [id, existing] of this.references.entries()) {
        if (id !== ref.id && existing.identifiers.arxiv.toLowerCase() === ref.identifiers.arxiv.toLowerCase()) {
          return { reference: existing, isDuplicate: true, duplicateOf: id };
        }
      }
    }

    // Check citekey collision
    let finalCitekey = ref.citekey;
    let collisionCounter = 1;
    while (Array.from(this.references.values()).some((r) => r.citekey === finalCitekey && r.id !== ref.id)) {
      finalCitekey = `${ref.citekey}_${collisionCounter++}`;
    }

    const cleanRef: BibliographicReference = {
      ...ref,
      citekey: finalCitekey,
    };

    this.references.set(cleanRef.id, cleanRef);
    return { reference: cleanRef, isDuplicate: false };
  }

  public getReference(id: string): BibliographicReference | undefined {
    return this.references.get(id);
  }

  public getReferenceByCitekey(citekey: string): BibliographicReference | undefined {
    const clean = citekey.replace(/^@/, '').trim();
    return Array.from(this.references.values()).find((r) => r.citekey.toLowerCase() === clean.toLowerCase());
  }

  public getAllReferences(): BibliographicReference[] {
    return Array.from(this.references.values());
  }

  /**
   * Adds a high-fidelity PDF highlight anchor linked to a Reference and exact page coordinates.
   */
  public addHighlight(highlight: V2PDFHighlightAnchor): void {
    const list = this.highlights.get(highlight.referenceId) || [];
    list.push(highlight);
    this.highlights.set(highlight.referenceId, list);
  }

  public getHighlightsForReference(referenceId: string): V2PDFHighlightAnchor[] {
    return this.highlights.get(referenceId) || [];
  }

  /**
   * Parses and resolves all citations (`[@citekey]` or `[@citekey, p. 42]`) in Markdown text.
   */
  public parseAndResolveCitations(content: string): CitationReferenceMatch[] {
    const matches: CitationReferenceMatch[] = [];
    const regex = /\[@([a-zA-Z0-9_-]+)(?:,\s*([^\]]+))?\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const rawCitation = match[0];
      const citekey = match[1];
      const locator = match[2]?.trim();
      const ref = this.getReferenceByCitekey(citekey);

      matches.push({
        rawCitation,
        citekey,
        locator,
        reference: ref,
        isResolved: !!ref,
      });
    }

    return matches;
  }

  /**
   * Deterministically generates a formatted Markdown bibliography block from resolved citations in a document.
   */
  public generateBibliographyBlock(content: string): string {
    const citations = this.parseAndResolveCitations(content);
    if (citations.length === 0) return '';

    const uniqueCitekeys = Array.from(new Set(citations.map((c) => c.citekey)));
    const bibliographyEntries: string[] = [];

    for (const key of uniqueCitekeys) {
      const ref = this.getReferenceByCitekey(key);
      if (ref) {
        const authors = ref.authors.join(', ');
        const year = ref.year ? `(${ref.year})` : '';
        const title = `*${ref.title}*`;
        const pub = ref.publication ? `. ${ref.publication}` : '';
        const idInfo = ref.identifiers.doi ? ` DOI: https://doi.org/${ref.identifiers.doi}` : '';
        bibliographyEntries.push(`- **[${ref.citekey}]**: ${authors} ${year}. ${title}${pub}.${idInfo}`);
      } else {
        bibliographyEntries.push(`- **[${key}]**: *[Unresolved Citation Reference]*`);
      }
    }

    return `\n\n### References & Bibliography\n\n${bibliographyEntries.join('\n')}\n`;
  }

  /**
   * Exports all registered references to standard BibTeX format.
   */
  public exportToBibTeX(): string {
    const entries: string[] = [];

    for (const ref of this.references.values()) {
      const entryType = ref.entryType || 'article';
      const fields: string[] = [];
      fields.push(`  title = {${ref.title}}`);
      fields.push(`  author = {${ref.authors.join(' and ')}}`);
      if (ref.year) fields.push(`  year = {${ref.year}}`);
      if (ref.publication) fields.push(`  journal = {${ref.publication}}`);
      if (ref.identifiers.doi) fields.push(`  doi = {${ref.identifiers.doi}}`);
      if (ref.identifiers.isbn) fields.push(`  isbn = {${ref.identifiers.isbn}}`);
      if (ref.identifiers.url) fields.push(`  url = {${ref.identifiers.url}}`);

      entries.push(`@${entryType}{${ref.citekey},\n${fields.join(',\n')}\n}`);
    }

    return entries.join('\n\n');
  }
}

export const v2ResearchAndCitationEngine = V2ResearchAndCitationEngine.getInstance();
