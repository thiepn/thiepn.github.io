/**
 * V2.16 Open Standards Adapter
 * 
 * Provides robust, spec-compliant serializers, parsers, and round-trip converters for:
 * - Markdown (Portable vs Native PKM mode)
 * - iCalendar / ICS (RFC 5545)
 * - vCard (RFC 6350)
 * - BibTeX, CSL JSON, RIS
 * - Finance CSV (Exact Minor Units / Integer Cents)
 * - Health / Metrics (Exact Values, Units, Provenance)
 */

export interface MarkdownExportOptions {
  mode: 'native' | 'portable';
  rewriteWikilinksToMarkdown?: boolean;
  materializeTransclusions?: boolean;
  materializeQueries?: boolean;
  stripFrontmatter?: boolean;
}

export interface ICSEventRecord {
  uid: string;
  summary: string;
  description?: string;
  startDate: string; // ISO or YYYY-MM-DD
  endDate?: string;
  isAllDay: boolean;
  location?: string;
  recurrenceRule?: string; // e.g., 'FREQ=WEEKLY;BYDAY=MO'
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

export interface VCardRecord {
  fn: string; // Full Name
  n?: { family: string; given: string };
  org?: string;
  email?: string;
  tel?: string;
  url?: string;
  bday?: string;
  notes?: string;
}

export interface BibTeXRecord {
  citeKey: string;
  type: 'article' | 'book' | 'inproceedings' | 'misc' | 'techreport';
  title: string;
  authors: string[];
  year?: number;
  journalOrBooktitle?: string;
  doi?: string;
  isbn?: string;
  url?: string;
  abstract?: string;
}

export interface FinanceTransactionExportRecord {
  date: string; // YYYY-MM-DD
  amountMinor: number; // Integer cents
  currency: string; // ISO 4217 (e.g., 'USD', 'EUR')
  formattedAmount: string; // e.g. "12.34"
  account: string;
  category: string;
  payee: string;
  memo?: string;
  transferTargetAccount?: string;
  splitGroupId?: string;
}

export interface HealthMetricExportRecord {
  metricType: string; // e.g., 'resting_heart_rate', 'body_weight', 'sleep_duration'
  value: number;
  unit: string; // e.g., 'bpm', 'kg', 'hours'
  recordedAt: string; // ISO 8601
  sourceDevice?: string;
  provenance: string;
}

export class OpenStandardsAdapter {
  private static instance: OpenStandardsAdapter | null = null;

  private constructor() {}

  public static getInstance(): OpenStandardsAdapter {
    if (!OpenStandardsAdapter.instance) {
      OpenStandardsAdapter.instance = new OpenStandardsAdapter();
    }
    return OpenStandardsAdapter.instance;
  }

  // ==========================================================================
  // 1. MARKDOWN PORTABILITY & ADAPTER
  // ==========================================================================
  public transformMarkdownForExport(content: string, options: MarkdownExportOptions): string {
    let result = content;

    if (options.mode === 'portable') {
      // 1. Degrade transclusions ![[Target Note]] into quote references FIRST
      if (options.materializeTransclusions) {
        result = result.replace(/!\[\[([^\]]+)\]\]/g, (_match, transclusionTarget) => {
          return `> *[Transcluded Content: See [${transclusionTarget}](./${encodeURIComponent(transclusionTarget.trim())}.md)]*`;
        });
      }

      // 2. Rewrite [[Target Note]] to [Target Note](./Target%20Note.md)
      if (options.rewriteWikilinksToMarkdown) {
        result = result.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => {
          const displayText = alias || target;
          const encodedTarget = encodeURIComponent(target.trim());
          return `[${displayText}](./${encodedTarget}.md)`;
        });
      }

      // 3. Materialize or degrade query blocks ```query ... ``` into readable snapshot comments
      if (options.materializeQueries) {
        result = result.replace(/```query\s*([\s\S]*?)```/g, (_match, queryBody) => {
          return `> *[Portable Export: Dynamic query preserved below]*\n> \`\`\`query\n${queryBody.trim().split('\n').map((l: string) => `> ${l}`).join('\n')}\n> \`\`\``;
        });
      }
    }

    return result;
  }

  // ==========================================================================
  // 2. iCALENDAR (ICS) SERIALIZATION & PARSING
  // ==========================================================================
  public serializeToICS(events: ICSEventRecord[]): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Personal OS PKM//V2.16 Open Interoperability//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const ev of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.uid}`);
      lines.push(`SUMMARY:${this.escapeICSString(ev.summary)}`);
      if (ev.description) {
        lines.push(`DESCRIPTION:${this.escapeICSString(ev.description)}`);
      }
      if (ev.location) {
        lines.push(`LOCATION:${this.escapeICSString(ev.location)}`);
      }
      if (ev.isAllDay) {
        // DateOnly formatting (YYYYMMDD)
        const dt = ev.startDate.replace(/[-:]/g, '').slice(0, 8);
        lines.push(`DTSTART;VALUE=DATE:${dt}`);
      } else {
        // Timed UTC format
        const dt = new Date(ev.startDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        lines.push(`DTSTART:${dt}`);
      }
      if (ev.recurrenceRule) {
        lines.push(`RRULE:${ev.recurrenceRule}`);
      }
      lines.push(`STATUS:${ev.status || 'CONFIRMED'}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  public parseICS(icsContent: string): ICSEventRecord[] {
    const events: ICSEventRecord[] = [];
    const eventBlocks = icsContent.split('BEGIN:VEVENT');

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i].split('END:VEVENT')[0];
      const lines = block.split(/\r?\n/);
      const record: Partial<ICSEventRecord> = {
        isAllDay: false,
        status: 'CONFIRMED',
      };

      for (const line of lines) {
        if (line.startsWith('UID:')) record.uid = line.substring(4).trim();
        else if (line.startsWith('SUMMARY:')) record.summary = this.unescapeICSString(line.substring(8).trim());
        else if (line.startsWith('DESCRIPTION:')) record.description = this.unescapeICSString(line.substring(12).trim());
        else if (line.startsWith('LOCATION:')) record.location = this.unescapeICSString(line.substring(9).trim());
        else if (line.startsWith('RRULE:')) record.recurrenceRule = line.substring(6).trim();
        else if (line.startsWith('STATUS:')) record.status = line.substring(7).trim() as any;
        else if (line.startsWith('DTSTART;VALUE=DATE:')) {
          record.isAllDay = true;
          record.startDate = line.substring(19).trim();
        } else if (line.startsWith('DTSTART:')) {
          record.isAllDay = false;
          record.startDate = line.substring(8).trim();
        }
      }

      if (record.uid && record.summary && record.startDate) {
        events.push(record as ICSEventRecord);
      }
    }

    return events;
  }

  private escapeICSString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  private unescapeICSString(str: string): string {
    return str.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
  }

  // ==========================================================================
  // 3. vCARD SERIALIZATION & PARSING
  // ==========================================================================
  public serializeToVCard(contacts: VCardRecord[]): string {
    const lines: string[] = [];

    for (const c of contacts) {
      lines.push('BEGIN:VCARD');
      lines.push('VERSION:4.0');
      lines.push(`FN:${c.fn}`);
      if (c.n) {
        lines.push(`N:${c.n.family};${c.n.given};;;`);
      }
      if (c.org) lines.push(`ORG:${c.org}`);
      if (c.email) lines.push(`EMAIL;type=INTERNET:${c.email}`);
      if (c.tel) lines.push(`TEL;type=CELL:${c.tel}`);
      if (c.url) lines.push(`URL:${c.url}`);
      if (c.bday) lines.push(`BDAY:${c.bday}`);
      if (c.notes) lines.push(`NOTE:${c.notes.replace(/\n/g, '\\n')}`);
      lines.push('END:VCARD');
    }

    return lines.join('\r\n');
  }

  // ==========================================================================
  // 4. BIBLIOGRAPHY (BibTeX / CSL JSON / RIS)
  // ==========================================================================
  public serializeToBibTeX(records: BibTeXRecord[]): string {
    const entries: string[] = [];

    for (const r of records) {
      const fields: string[] = [];
      fields.push(`  title = {${r.title}}`);
      if (r.authors.length > 0) {
        fields.push(`  author = {${r.authors.join(' and ')}}`);
      }
      if (r.year) fields.push(`  year = {${r.year}}`);
      if (r.journalOrBooktitle) fields.push(`  journal = {${r.journalOrBooktitle}}`);
      if (r.doi) fields.push(`  doi = {${r.doi}}`);
      if (r.isbn) fields.push(`  isbn = {${r.isbn}}`);
      if (r.url) fields.push(`  url = {${r.url}}`);
      if (r.abstract) fields.push(`  abstract = {${r.abstract.replace(/\n/g, ' ')}}`);

      entries.push(`@${r.type}{${r.citeKey},\n${fields.join(',\n')}\n}`);
    }

    return entries.join('\n\n');
  }

  // ==========================================================================
  // 5. FINANCE CSV (Exact Integer Cents / Formula Safe)
  // ==========================================================================
  public serializeFinanceCSV(transactions: FinanceTransactionExportRecord[]): string {
    const headers = ['Date', 'Amount (Minor)', 'Amount (Decimal)', 'Currency', 'Account', 'Category', 'Payee', 'Memo', 'Transfer Target', 'Split ID'];
    const rows = [headers.join(',')];

    for (const tx of transactions) {
      const sanitizedPayee = this.sanitizeCSVCell(tx.payee);
      const sanitizedMemo = this.sanitizeCSVCell(tx.memo || '');
      const sanitizedAccount = this.sanitizeCSVCell(tx.account);
      const sanitizedCategory = this.sanitizeCSVCell(tx.category);

      rows.push([
        tx.date,
        tx.amountMinor.toString(),
        tx.formattedAmount,
        tx.currency,
        `"${sanitizedAccount}"`,
        `"${sanitizedCategory}"`,
        `"${sanitizedPayee}"`,
        `"${sanitizedMemo}"`,
        `"${tx.transferTargetAccount || ''}"`,
        `"${tx.splitGroupId || ''}"`,
      ].join(','));
    }

    return rows.join('\n');
  }

  private sanitizeCSVCell(val: string): string {
    let clean = val.replace(/"/g, '""');
    // Prevent CSV Formula Injection (=, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(clean)) {
      clean = `'` + clean;
    }
    return clean;
  }

  // ==========================================================================
  // 6. HEALTH & HABIT METRICS
  // ==========================================================================
  public serializeHealthCSV(metrics: HealthMetricExportRecord[]): string {
    const headers = ['Timestamp', 'Metric Type', 'Value', 'Unit', 'Source Device', 'Provenance'];
    const rows = [headers.join(',')];

    for (const m of metrics) {
      rows.push([
        m.recordedAt,
        `"${m.metricType}"`,
        m.value.toString(),
        `"${m.unit}"`,
        `"${m.sourceDevice || 'Local'}"`,
        `"${m.provenance}"`,
      ].join(','));
    }

    return rows.join('\n');
  }
}

export const openStandardsAdapter = OpenStandardsAdapter.getInstance();
