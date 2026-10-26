/**
 * V2.16 Interoperability Inventory & Format Capability Matrix
 * 
 * Defines authoritative metadata, capabilities, lossiness levels, and security boundaries
 * for every external data exchange pathway in the Personal OS.
 */

export type FormatInteroperabilityQuality =
  | 'Excellent'
  | 'Good'
  | 'Lossy but documented'
  | 'Limited'
  | 'Experimental'
  | 'Unsupported';

export interface FormatCapabilityRecord {
  format: string;
  extension: string;
  mimeType: string;
  importSupported: boolean;
  exportSupported: boolean;
  roundTripCapable: boolean;
  canonicalTarget: string;
  provenanceRetained: boolean;
  attachmentsSupported: boolean;
  lossinessLevel: 'none' | 'minor' | 'substantial' | 'n/a';
  lossinessDescription?: string;
  securityBoundary: string;
  status: FormatInteroperabilityQuality;
  mainUse: string;
}

export const V2_16_FORMAT_CAPABILITY_MATRIX: FormatCapabilityRecord[] = [
  {
    format: 'Markdown (Portable)',
    extension: '.md',
    mimeType: 'text/markdown',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Note (text)',
    provenanceRetained: true,
    attachmentsSupported: true,
    lossinessLevel: 'minor',
    lossinessDescription: 'Interactive query blocks and live transclusions materialize as readable snapshots or links.',
    securityBoundary: 'Sanitized YAML frontmatter, path-safe relative link resolution.',
    status: 'Excellent',
    mainUse: 'Universal plain-text knowledge exchange and long-term notes preservation.',
  },
  {
    format: 'Markdown (Native PKM)',
    extension: '.md',
    mimeType: 'text/markdown',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Note (text/checklist)',
    provenanceRetained: true,
    attachmentsSupported: true,
    lossinessLevel: 'none',
    lossinessDescription: 'Full preservation of [[wikilinks]], ![[embeds]], callouts, and frontmatter.',
    securityBoundary: 'Local vault path traversal checks, safe link parsing.',
    status: 'Excellent',
    mainUse: 'Complete vault backup and inter-vault synchronization.',
  },
  {
    format: 'iCalendar (ICS)',
    extension: '.ics',
    mimeType: 'text/calendar',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Calendar Event / Task Schedule / Trip Itinerary',
    provenanceRetained: true,
    attachmentsSupported: false,
    lossinessLevel: 'minor',
    lossinessDescription: 'Complex custom recurrence rules mapped to closest standard RRULE; timezone offsets preserved.',
    securityBoundary: 'External UID preservation without overriding internal stable Resource IDs.',
    status: 'Excellent',
    mainUse: 'Two-way calendar interoperability with Google Calendar, Apple Calendar, Outlook, and Nextcloud.',
  },
  {
    format: 'vCard (vcf)',
    extension: '.vcf',
    mimeType: 'text/vcard',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Person Contact Record',
    provenanceRetained: true,
    attachmentsSupported: false,
    lossinessLevel: 'minor',
    lossinessDescription: 'Core contact fields (name, emails, phones, org, address, birthday) preserved; relationship graphs exported separately in JSON.',
    securityBoundary: 'Exact deduplication via email/phone hashes; ambiguous matches require manual review.',
    status: 'Excellent',
    mainUse: 'Address book import/export and contact synchronization.',
  },
  {
    format: 'BibTeX',
    extension: '.bib',
    mimeType: 'application/x-bibtex',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Library Reference Record',
    provenanceRetained: true,
    attachmentsSupported: true,
    lossinessLevel: 'minor',
    lossinessDescription: 'Standard fields and DOI/ISBN preserved; custom user highlight anchors exported as accompanying markdown annotations.',
    securityBoundary: 'CiteKey validation, deduplication via DOI/ISBN/PMID fingerprints.',
    status: 'Excellent',
    mainUse: 'Academic research citations, Zotero/Mendeley/LaTeX interoperability.',
  },
  {
    format: 'CSL JSON',
    extension: '.json',
    mimeType: 'application/vnd.citationstyles.csl+json',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Library Reference Record',
    provenanceRetained: true,
    attachmentsSupported: false,
    lossinessLevel: 'none',
    lossinessDescription: 'Standard Citation Style Language JSON representation.',
    securityBoundary: 'JSON schema validation and length bounds.',
    status: 'Excellent',
    mainUse: 'Structured bibliography exchange and automated citation formatting.',
  },
  {
    format: 'RIS (Research Information Systems)',
    extension: '.ris',
    mimeType: 'application/x-research-info-systems',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Library Reference Record',
    provenanceRetained: true,
    attachmentsSupported: false,
    lossinessLevel: 'minor',
    lossinessDescription: 'Standard tag-based reference exchange format.',
    securityBoundary: 'Tag parsing and identifier extraction.',
    status: 'Good',
    mainUse: 'Legacy reference manager export and publisher metadata import.',
  },
  {
    format: 'Finance CSV (Exact Minor Units)',
    extension: '.csv',
    mimeType: 'text/csv',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Finance Transaction Ledger',
    provenanceRetained: true,
    attachmentsSupported: false,
    lossinessLevel: 'none',
    lossinessDescription: 'Integer cents / minor units serialized in deterministic ISO format; splits & transfers paired.',
    securityBoundary: 'CSV formula injection sanitization (=, +, -, @, tab escape), UTF-8 validation.',
    status: 'Excellent',
    mainUse: 'Bank statement ingestion, tax preparation, and spreadsheet accounting.',
  },
  {
    format: 'Health / Metrics CSV & JSON',
    extension: '.csv / .json',
    mimeType: 'text/csv',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Health Metric / Habit Tracking Record',
    provenanceRetained: true,
    attachmentsSupported: false,
    lossinessLevel: 'none',
    lossinessDescription: 'Metric values, explicit units (kg, bpm, mg/dL, hrs), timestamps, and source devices preserved.',
    securityBoundary: 'Explicit privacy confirmation prior to health data export.',
    status: 'Excellent',
    mainUse: 'Wearable health export, personal habit analytics, and medical summary exports.',
  },
  {
    format: 'Configuration & Presets JSON',
    extension: '.json',
    mimeType: 'application/json',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Saved Views, Workspaces, Workflow Presets, Templates',
    provenanceRetained: true,
    attachmentsSupported: false,
    lossinessLevel: 'none',
    lossinessDescription: 'Zero secrets or credentials included; missing action/plugin references degrade gracefully.',
    securityBoundary: 'Strict JSON schema verification, non-executable, permission check upon import.',
    status: 'Excellent',
    mainUse: 'Cross-device workspace sharing and setup portability.',
  },
  {
    format: 'HTML (Web Clipper / Article Extraction)',
    extension: '.html',
    mimeType: 'text/html',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: false,
    canonicalTarget: 'Universal Inbox Item / Library Web Capture',
    provenanceRetained: true,
    attachmentsSupported: true,
    lossinessLevel: 'substantial',
    lossinessDescription: 'Dynamic scripts, stylesheets, tracking pixels, and ads stripped; semantic text & images extracted.',
    securityBoundary: 'Strict HTML sanitizer, iframe/script removal, CSP enforcement.',
    status: 'Good',
    mainUse: 'Web clipper intake, article archiving, and static site publication.',
  },
  {
    format: 'Full Portable Vault Archive',
    extension: '.zip',
    mimeType: 'application/zip',
    importSupported: true,
    exportSupported: true,
    roundTripCapable: true,
    canonicalTarget: 'Entire PKM Vault',
    provenanceRetained: true,
    attachmentsSupported: true,
    lossinessLevel: 'none',
    lossinessDescription: 'Complete self-documenting archive with plain Markdown notes, structured JSON/CSV records, attachments, and human-readable README.md.',
    securityBoundary: 'Zip-slip / path traversal prevention, archive bomb ratio limits (<100:1), secret scanner.',
    status: 'Excellent',
    mainUse: 'Unconditional user ownership, zero-lock-in migration out, and offline archival.',
  },
];

export class InteroperabilityInventory {
  private static instance: InteroperabilityInventory | null = null;

  private constructor() {}

  public static getInstance(): InteroperabilityInventory {
    if (!InteroperabilityInventory.instance) {
      InteroperabilityInventory.instance = new InteroperabilityInventory();
    }
    return InteroperabilityInventory.instance;
  }

  public getFormatMatrix(): FormatCapabilityRecord[] {
    return [...V2_16_FORMAT_CAPABILITY_MATRIX];
  }

  public getRecord(formatName: string): FormatCapabilityRecord | undefined {
    return V2_16_FORMAT_CAPABILITY_MATRIX.find(
      f => f.format.toLowerCase() === formatName.toLowerCase() || f.extension.toLowerCase() === formatName.toLowerCase()
    );
  }
}

export const interoperabilityInventory = InteroperabilityInventory.getInstance();
