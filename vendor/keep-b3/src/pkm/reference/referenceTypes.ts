import { Note } from '../../types';
import { PDFAttachment } from '../pdfTypes';

/**
 * Standard Academic Reference Types
 */
export type ReferenceType =
  | 'article' // Journal article
  | 'book' // Book
  | 'chapter' // Book chapter / incollection
  | 'conference' // Conference paper / inproceedings
  | 'thesis' // PhD / Master's thesis
  | 'report' // Technical report
  | 'preprint' // arXiv, bioRxiv, SSRN preprint
  | 'webpage' // Web page / blog post
  | 'dataset' // Research dataset
  | 'other'; // Miscellaneous / other

/**
 * Structured Person Name representation
 */
export interface PersonName {
  given?: string; // First / given names & initials
  family?: string; // Last / family name / surname
  literal?: string; // Literal name for organizations or non-Western naming schemes
  prefix?: string; // e.g. "von", "van der", "de"
  suffix?: string; // e.g. "Jr.", "III"
}

/**
 * Canonical Reference Record
 */
export interface Reference {
  id: string; // Stable internal unique ID (e.g. "ref-1725184000-xyz" or "ref_abc")
  type: ReferenceType;
  title: string;

  authors: PersonName[];
  editors?: PersonName[];

  year?: number;
  date?: string; // ISO date string or formatted date

  journal?: string; // Journal / Periodical name
  bookTitle?: string; // Title of the containing book for chapters/proceedings
  publisher?: string; // Publisher name
  institution?: string; // University, research lab, or organization
  series?: string; // Book or conference series

  volume?: string;
  issue?: string; // Issue / number
  pages?: string; // e.g. "101-115" or "101--115"

  doi?: string; // Normalized DOI e.g. "10.1234/example"
  isbn?: string; // Normalized ISBN e.g. "978-3-16-148410-0"
  arxivId?: string; // Normalized arXiv ID e.g. "2609.01234"
  pmid?: string; // PubMed ID
  url?: string;

  citationKey: string; // Unique human-readable key e.g. "smith2026attention"

  pdfAttachmentIds?: string[]; // Associated local PDF attachments
  abstract?: string;
  tags?: string[];

  extraFields?: Record<string, string>; // Preserved BibTeX or custom fields

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Parsed Citation Match in Note Markdown
 */
export interface CitationMatch {
  raw: string; // e.g. "[@smith2026]" or "[@smith2026, p. 42]"
  citationKey: string; // e.g. "smith2026"
  locator?: string; // e.g. "p. 42", "pp. 12-15", "ch. 3"
  line: number; // 0-indexed line number in note
  charOffset: number; // Character offset in source
}

/**
 * Grouped Citations in single bracket: [@smith2026; @lee2024, p. 10]
 */
export interface CitationGroupMatch {
  raw: string;
  citations: CitationMatch[];
  line: number;
  charOffset: number;
}

/**
 * Supported Citation Styles
 */
export type CitationStyleKey = 'apa' | 'chicago' | 'ieee' | 'harvard' | 'generic';

export interface CitationStyleDefinition {
  key: CitationStyleKey;
  label: string;
  description: string;
}

export const SUPPORTED_CITATION_STYLES: CitationStyleDefinition[] = [
  {
    key: 'apa',
    label: 'APA 7th Edition',
    description: 'Author-date format with full journal & DOI bibliography',
  },
  {
    key: 'chicago',
    label: 'Chicago (Author-Date)',
    description: 'Author-date in-text citations with formatted bibliography',
  },
  {
    key: 'ieee',
    label: 'IEEE (Numeric)',
    description: 'Numeric citations [1], [2] with numbered reference list',
  },
  {
    key: 'harvard',
    label: 'Harvard',
    description: 'Author-year citations with alphabetical bibliography',
  },
  {
    key: 'generic',
    label: 'Generic Author-Year',
    description: 'Clean, versatile author-year citations',
  },
];

/**
 * Field-level difference for side-by-side comparison
 */
export interface FieldDifference {
  fieldName: string;
  fieldLabel: string;
  existingValue: any;
  incomingValue: any;
  status: 'identical' | 'missing_in_existing' | 'missing_in_incoming' | 'different';
}

/**
 * Duplicate Candidate Record for Review
 */
export interface DuplicateCandidate {
  id: string; // Unique comparison ID
  existing: Reference;
  incoming: Reference;
  reason: string;
  confidence: 'exact_doi' | 'exact_arxiv' | 'exact_isbn' | 'exact_key' | 'high_similarity';
  differences: FieldDifference[];
}

/**
 * BibTeX Import Result Summary
 */
export interface BibTeXImportSummary {
  totalFound: number;
  newReferences: Reference[];
  duplicates: DuplicateCandidate[];
  invalidEntries: Array<{ raw: string; error: string; line?: number }>;
}

/**
 * Citing Note Reference Entry
 */
export interface CitingNoteReference {
  noteId: string;
  noteTitle: string;
  citationKey: string;
  locator?: string;
  line: number;
  contextSnippet: string;
}

/**
 * Metadata Resolution Lookup Result
 */
export interface MetadataLookupResult {
  success: boolean;
  reference?: Partial<Reference>;
  source: 'doi' | 'arxiv' | 'isbn' | 'manual';
  error?: string;
  rawResponse?: unknown;
}
