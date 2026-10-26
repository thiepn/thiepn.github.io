/**
 * PKM V2.19 Report Generation, Frozen Snapshots & Review Integration Engine
 * 
 * Generates deterministic factual summaries, frozen historical snapshots,
 * and handles multi-format export (Markdown, HTML, formula-safe CSV).
 */

import {
  ReportTemplate,
  FrozenReportSnapshot,
  MetricCalculationResult,
  ChartSeriesData,
} from './reportingTypes';
import { v2MetricsAndAggregationEngine } from './v2MetricsAndAggregationEngine';
import { v2GlobalizationEngine } from '../globalization';

export class V2ReportEngine {
  private static instance: V2ReportEngine | null = null;
  private templates: Map<string, ReportTemplate> = new Map();
  private frozenSnapshots: Map<string, FrozenReportSnapshot> = new Map();

  private constructor() {
    this.registerDefaultTemplates();
  }

  public static getInstance(): V2ReportEngine {
    if (!V2ReportEngine.instance) {
      V2ReportEngine.instance = new V2ReportEngine();
    }
    return V2ReportEngine.instance;
  }

  private registerDefaultTemplates(): void {
    // 1. Weekly Operating Summary
    this.templates.set('template-weekly-summary', {
      id: 'template-weekly-summary',
      title: 'Weekly Operating Summary',
      domain: 'core',
      scopeDescription: 'Review of completed tasks, projects, habit consistency, and study hours.',
      defaultDateRange: { type: 'this_week' },
      sections: [
        {
          title: 'Core Activity & Focus',
          metricIds: ['projects_completed_count', 'projects_open_tasks_count', 'learning_study_time_hours', 'routine_completion_rate'],
        },
      ],
    });

    // 2. Monthly Finance Report
    this.templates.set('template-monthly-finance', {
      id: 'template-monthly-finance',
      title: 'Monthly Finance & Cash Flow Report',
      domain: 'finance',
      scopeDescription: 'Exact ledger summary of income, expenses, and net cash flow.',
      defaultDateRange: { type: 'this_month' },
      sections: [
        {
          title: 'Cash Flow Overview',
          metricIds: ['finance_income', 'finance_expense', 'finance_net_cash_flow'],
        },
      ],
    });
  }

  // ==========================================================================
  // REPORT GENERATION & FROZEN SNAPSHOTS
  // ==========================================================================

  public generateReportSnapshot(
    templateId: string,
    title: string,
    periodStart: string,
    periodEnd: string,
    rawRecords: Array<{ id: string; type: string; title?: string; value?: number; amountCents?: number; status?: string; date?: string }>
  ): FrozenReportSnapshot {
    const template = this.templates.get(templateId);
    const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const metrics: MetricCalculationResult[] = [];
    const targetMetricIds = template
      ? template.sections.flatMap((s) => s.metricIds)
      : ['projects_completed_count', 'learning_study_time_hours'];

    for (const mId of targetMetricIds) {
      const result = v2MetricsAndAggregationEngine.calculateMetric(mId, rawRecords);
      metrics.push(result);
    }

    // Generate deterministic factual narrative without AI
    const deterministicSummary = this.buildDeterministicSummary(title, periodStart, periodEnd, metrics);

    const snapshot: FrozenReportSnapshot = {
      id,
      templateId,
      title,
      generatedAt: now,
      periodStart,
      periodEnd,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      locale: v2GlobalizationEngine.getConfig().locale,
      deterministicSummary,
      metrics,
      charts: [],
      includedResourcesSummary: rawRecords.slice(0, 50).map((r) => ({
        resourceId: r.id,
        title: r.title || 'Untitled Resource',
        type: r.type,
        date: r.date,
      })),
      provenance: {
        systemVersion: '2.19.0',
        schemaVersion: 2,
        totalRecordsEvaluated: rawRecords.length,
        isFrozen: true,
      },
    };

    this.frozenSnapshots.set(id, snapshot);
    return snapshot;
  }

  public getFrozenReport(id: string): FrozenReportSnapshot | undefined {
    return this.frozenSnapshots.get(id);
  }

  private buildDeterministicSummary(
    title: string,
    start: string,
    end: string,
    metrics: MetricCalculationResult[]
  ): string {
    const lines: string[] = [`Report "${title}" covering ${start} to ${end}:`];

    for (const m of metrics) {
      if (m.value !== null) {
        lines.push(`• ${m.metricName}: ${m.formattedValue} (based on ${m.coverage.recordedRecords} recorded entries).`);
      } else {
        lines.push(`• ${m.metricName}: No recorded data in this period.`);
      }
    }

    return lines.join('\n');
  }

  // ==========================================================================
  // EXPORT FORMATTERS (MARKDOWN, HTML, FORMULA-SAFE CSV)
  // ==========================================================================

  public exportReportToMarkdown(snapshot: FrozenReportSnapshot): string {
    let md = `# ${snapshot.title}\n\n`;
    md += `**Period**: ${snapshot.periodStart} to ${snapshot.periodEnd}  \n`;
    md += `**Generated**: ${snapshot.generatedAt} (Locale: ${snapshot.locale}, Timezone: ${snapshot.timezone})  \n\n`;

    md += `## Summary\n\n${snapshot.deterministicSummary}\n\n`;

    md += `## Key Metrics\n\n`;
    md += `| Metric | Value | Recorded Coverage | Trend |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    for (const m of snapshot.metrics) {
      const cov = `${m.coverage.recordedRecords}/${m.coverage.totalExpectedRecords} entries`;
      const trendStr = m.trend ? m.trend.direction : '—';
      md += `| ${m.metricName} | ${m.formattedValue} | ${cov} | ${trendStr} |\n`;
    }

    return md;
  }

  public exportReportToSanitizedHtml(snapshot: FrozenReportSnapshot): string {
    const sanitize = (str: string) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${sanitize(snapshot.title)}</title>\n`;
    html += `<style>body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; }\n`;
    html += `table { width: 100%; border-collapse: collapse; margin: 1rem 0; }\nth, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; }\nth { background: #f1f5f9; }</style>\n</head>\n<body>\n`;

    html += `<h1>${sanitize(snapshot.title)}</h1>\n`;
    html += `<p><strong>Period:</strong> ${sanitize(snapshot.periodStart)} to ${sanitize(snapshot.periodEnd)}<br>`;
    html += `<strong>Generated:</strong> ${sanitize(snapshot.generatedAt)}</p>\n`;

    html += `<section><h2>Summary</h2><pre>${sanitize(snapshot.deterministicSummary)}</pre></section>\n`;

    html += `<section><h2>Key Metrics</h2>\n<table>\n<thead><tr><th>Metric</th><th>Value</th><th>Coverage</th></tr></thead>\n<tbody>\n`;
    for (const m of snapshot.metrics) {
      html += `<tr><td>${sanitize(m.metricName)}</td><td>${sanitize(m.formattedValue)}</td><td>${m.coverage.recordedRecords} entries</td></tr>\n`;
    }
    html += `</tbody>\n</table>\n</section>\n`;
    html += `</body>\n</html>`;

    return html;
  }

  /**
   * Generates a formula-safe CSV, preventing CSV injection attacks (=, +, -, @).
   */
  public exportReportToFormulaSafeCSV(snapshot: FrozenReportSnapshot): string {
    const escapeCSV = (field: string | number) => {
      let str = String(field);
      // Neutralize formula trigger characters
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows: string[] = [
      ['Metric ID', 'Metric Name', 'Value', 'Formatted Value', 'Recorded Records', 'Calculated At'].map(escapeCSV).join(','),
    ];

    for (const m of snapshot.metrics) {
      rows.push(
        [
          m.metricId,
          m.metricName,
          m.value !== null ? m.value : '',
          m.formattedValue,
          m.coverage.recordedRecords,
          m.calculatedAt,
        ]
          .map(escapeCSV)
          .join(',')
      );
    }

    return rows.join('\n');
  }
}

export const v2ReportEngine = V2ReportEngine.getInstance();
