/**
 * PKM V1.8: Domain Interchange Exporters
 * Standardized interchange formats for specialized Personal OS domains.
 */

import { Reference } from '../reference/referenceTypes';
import { PersonRecord } from '../people/peopleTypes';
import { TemporalEntry } from '../temporal/temporalTypes';
import { FinanceTransaction, FinanceAccount } from '../finance/financeTypes';
import { exportReferencesToBibTeXDocument } from '../reference/bibtexExporter';
import { exportPeopleToVCardString } from '../people/vcardExporter';
import { generateICSContent } from '../temporal/icsExporter';
import { financeExportService } from '../finance/financeExport';
import { ExportFileEntry } from './exportTypes';
import { sanitizeFilename } from './filenameSanitizer';

/**
 * Exports bibliography references to BibTeX (.bib) and CSL-JSON (.json)
 */
export function exportAcademicReferences(
  references: Reference[],
  baseName: string = 'bibliography'
): ExportFileEntry[] {
  const files: ExportFileEntry[] = [];
  const cleanBase = sanitizeFilename(baseName);

  // 1. BibTeX (.bib)
  const bibtexEntries = exportReferencesToBibTeXDocument(references);
  files.push({
    path: `${cleanBase}.bib`,
    content: bibtexEntries,
    isBinary: false,
    mimeType: 'text/x-bibtex',
  });

  // 2. CSL-JSON (.json)
  const cslJson = JSON.stringify(
    references.map((r) => ({
      id: r.citationKey || r.id,
      type: r.type || 'article-journal',
      title: r.title,
      author: (r.authors || []).map((a) => ({ family: a.family || a.literal || '', given: a.given || '' })),
      issued: r.year ? { 'date-parts': [[r.year]] } : undefined,
      'container-title': r.journal || r.bookTitle,
      DOI: r.doi,
      URL: r.url,
    })),
    null,
    2
  );
  files.push({
    path: `${cleanBase}.csl.json`,
    content: cslJson + '\n',
    isBinary: false,
    mimeType: 'application/json',
  });

  return files;
}

/**
 * Exports contacts to standard vCard 4.0 (.vcf)
 */
export function exportPeopleContacts(
  contacts: PersonRecord[],
  baseName: string = 'contacts'
): ExportFileEntry[] {
  const cleanBase = sanitizeFilename(baseName);
  const vcfContent = exportPeopleToVCardString(contacts.map((p) => ({ person: p })));
  return [
    {
      path: `${cleanBase}.vcf`,
      content: vcfContent,
      isBinary: false,
      mimeType: 'text/vcard',
    },
  ];
}

/**
 * Exports calendar events and routines to iCalendar (.ics)
 */
export function exportCalendarEvents(
  events: TemporalEntry[],
  baseName: string = 'calendar'
): ExportFileEntry[] {
  const cleanBase = sanitizeFilename(baseName);
  const icsContent = generateICSContent(events, 'Personal OS Calendar');
  return [
    {
      path: `${cleanBase}.ics`,
      content: icsContent,
      isBinary: false,
      mimeType: 'text/calendar',
    },
  ];
}

/**
 * Exports finance ledger transactions to RFC 4180 CSV and Markdown Report
 */
export function exportFinanceData(
  transactions: FinanceTransaction[],
  accounts: FinanceAccount[],
  baseName: string = 'ledger'
): ExportFileEntry[] {
  const cleanBase = sanitizeFilename(baseName);
  const csvContent = financeExportService.exportTransactionsToCSV(transactions, accounts);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const reportMd = financeExportService.generateMonthlyReviewMarkdown(currentMonthKey);

  return [
    {
      path: `${cleanBase}_transactions.csv`,
      content: csvContent,
      isBinary: false,
      mimeType: 'text/csv',
    },
    {
      path: `${cleanBase}_report.md`,
      content: reportMd,
      isBinary: false,
      mimeType: 'text/markdown',
    },
  ];
}

/**
 * Exports Health and Biometric records to standard CSV
 */
export function exportHealthMetricsToCsv(
  records: Array<{ date: string; metricName: string; value: number | string; unit: string; referenceRange?: string; notes?: string }>,
  baseName: string = 'health_metrics'
): ExportFileEntry[] {
  const cleanBase = sanitizeFilename(baseName);
  const headers = ['Date', 'Metric', 'Value', 'Unit', 'Reference Range', 'Notes'];
  const rows = records.map((r) => [
    `"${r.date}"`,
    `"${(r.metricName || '').replace(/"/g, '""')}"`,
    `"${r.value}"`,
    `"${(r.unit || '').replace(/"/g, '""')}"`,
    `"${(r.referenceRange || '').replace(/"/g, '""')}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
  return [
    {
      path: `${cleanBase}.csv`,
      content: csv,
      isBinary: false,
      mimeType: 'text/csv',
    },
  ];
}

/**
 * Exports Flashcards / Learning Decks to Anki-compatible TSV
 */
export function exportFlashcardsToTsv(
  cards: Array<{ front: string; back: string; deck?: string; tags?: string[] }>,
  baseName: string = 'flashcards'
): ExportFileEntry[] {
  const cleanBase = sanitizeFilename(baseName);
  const rows = cards.map((c) => {
    const cleanFront = (c.front || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const cleanBack = (c.back || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const deck = (c.deck || 'Default').replace(/\t/g, ' ');
    const tags = (c.tags || []).join(' ');
    return `${cleanFront}\t${cleanBack}\t${deck}\t${tags}`;
  });

  const tsv = `#separator:tab\n#html:true\n#deck column:3\n#tags column:4\n${rows.join('\n')}\n`;
  return [
    {
      path: `${cleanBase}.tsv`,
      content: tsv,
      isBinary: false,
      mimeType: 'text/tab-separated-values',
    },
  ];
}

/**
 * Exports Habits & Quantitative Daily Tracking points to CSV
 */
export function exportHabitsToCsv(
  habits: Array<{ id: string; name: string; target: number; unit?: string }>,
  completions: Array<{ habitId: string; date: string; value: number; completed: boolean }>,
  baseName: string = 'habits_tracking'
): ExportFileEntry[] {
  const cleanBase = sanitizeFilename(baseName);
  const habitMap = new Map(habits.map((h) => [h.id, h]));
  const headers = ['Date', 'Habit Name', 'Value', 'Target', 'Unit', 'Status'];
  const rows = completions.map((c) => {
    const h = habitMap.get(c.habitId);
    return [
      `"${c.date}"`,
      `"${(h?.name || 'Habit').replace(/"/g, '""')}"`,
      `"${c.value !== undefined ? c.value : ''}"`,
      `"${h?.target || 1}"`,
      `"${(h?.unit || '').replace(/"/g, '""')}"`,
      `"${c.completed ? 'Completed' : 'Incomplete'}"`,
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
  return [
    {
      path: `${cleanBase}.csv`,
      content: csv,
      isBinary: false,
      mimeType: 'text/csv',
    },
  ];
}

/**
 * Exports Workspace Configuration Package (Templates, Shortcuts, Saved Views)
 */
export function exportConfigurationPackage(
  configData: {
    templates?: any[];
    savedViews?: any[];
    keyboardShortcuts?: any[];
    themePresets?: any;
  },
  baseName: string = 'personal_os_config'
): ExportFileEntry[] {
  const cleanBase = sanitizeFilename(baseName);
  const payload = {
    schemaVersion: '1.8.0',
    type: 'personal-os-configuration-package',
    exportedAt: new Date().toISOString(),
    templates: configData.templates || [],
    savedViews: configData.savedViews || [],
    keyboardShortcuts: configData.keyboardShortcuts || [],
    themePresets: configData.themePresets || {},
  };

  return [
    {
      path: `${cleanBase}.json`,
      content: JSON.stringify(payload, null, 2) + '\n',
      isBinary: false,
      mimeType: 'application/json',
    },
  ];
}
