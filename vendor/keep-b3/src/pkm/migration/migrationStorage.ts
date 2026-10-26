/**
 * P40 — Migration History & Diagnostic Storage
 */

import { MigrationHistoryEntry, MigrationReport } from './migrationTypes';

const MIGRATION_HISTORY_KEY = 'pkm_migration_history_v1';
const MIGRATION_REPORTS_KEY = 'pkm_migration_reports_v1';

export const migrationStorage = {
  getHistory(): MigrationHistoryEntry[] {
    try {
      const raw = localStorage.getItem(MIGRATION_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addHistoryEntry(entry: MigrationHistoryEntry): void {
    try {
      const history = this.getHistory();
      history.unshift(entry);
      // Keep last 30 migration records
      if (history.length > 30) history.length = 30;
      localStorage.setItem(MIGRATION_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save migration history entry', e);
    }
  },

  saveReport(report: MigrationReport): void {
    try {
      const reports = this.getAllReports();
      reports[report.operationId] = report;
      // Keep last 15 detailed reports
      const keys = Object.keys(reports);
      if (keys.length > 15) {
        delete reports[keys[0]];
      }
      localStorage.setItem(MIGRATION_REPORTS_KEY, JSON.stringify(reports));
    } catch (e) {
      console.warn('Failed to save migration report', e);
    }
  },

  getReport(operationId: string): MigrationReport | null {
    try {
      const reports = this.getAllReports();
      return reports[operationId] || null;
    } catch {
      return null;
    }
  },

  getAllReports(): Record<string, MigrationReport> {
    try {
      const raw = localStorage.getItem(MIGRATION_REPORTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  clearHistory(): void {
    localStorage.removeItem(MIGRATION_HISTORY_KEY);
    localStorage.removeItem(MIGRATION_REPORTS_KEY);
  },
};
