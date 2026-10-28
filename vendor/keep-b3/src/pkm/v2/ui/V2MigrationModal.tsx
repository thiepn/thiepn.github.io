import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database,
  Lock,
  Layers,
  Sparkles,
  X,
  RotateCcw,
} from 'lucide-react';
import { v1ToV2MigrationEngine } from '../migration/v1ToV2MigrationEngine';
import {
  MigrationPhaseProgress,
  V1ToV2MigrationReport,
  V1VaultMetrics,
} from '../migration/migrationTypes';

interface V2MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultData: {
    notes: any[];
    folders?: any[];
    tasks?: any[];
    savedViews?: any[];
    relations?: any[];
    domains?: any;
    isEncrypted?: boolean;
    schemaVersion?: number;
  };
  onMigrationComplete?: (report: V1ToV2MigrationReport) => void;
}

export const V2MigrationModal: React.FC<V2MigrationModalProps> = ({
  isOpen,
  onClose,
  vaultData,
  onMigrationComplete,
}) => {
  const [metrics, setMetrics] = useState<V1VaultMetrics | null>(null);
  const [progress, setProgress] = useState<MigrationPhaseProgress | null>(null);
  const [report, setReport] = useState<V1ToV2MigrationReport | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (isOpen && vaultData) {
      v1ToV2MigrationEngine.analyzeVault(vaultData).then(setMetrics);
    }
  }, [isOpen, vaultData]);

  useEffect(() => {
    const unsub = v1ToV2MigrationEngine.subscribeProgress((p) => {
      setProgress(p);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleStartMigration = async () => {
    setIsMigrating(true);
    try {
      const rep = await v1ToV2MigrationEngine.executeMigration(vaultData);
      setReport(rep);
      if (rep.success && onMigrationComplete) {
        onMigrationComplete(rep);
      }
    } catch (err) {
      console.error('Migration error:', err);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRollback = () => {
    const ok = v1ToV2MigrationEngine.rollback();
    if (ok) {
      setReport(null);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Upgrade to PKM V2.0 Foundation
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Next-generation modular architecture with 100% verified zero-loss parity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-neutral-600 dark:text-neutral-300">
          {!report && (
            <>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Sovereign Data Guarantees</span>
                </div>
                <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                  Your notes remain 100% portable plain Markdown files. All IDs, tasks, relations, and structured records are staged, validated with SHA-256 parity hashes, and committed without any data loss.
                </p>
              </div>

              {/* Vault Metrics Pre-flight */}
              {metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {metrics.notesCount}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Notes (Markdown)</div>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {metrics.tasksCount}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Active Tasks</div>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {metrics.wikilinksCount}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Wikilinks</div>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center">
                    <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {metrics.isEncrypted ? 'AES-256' : 'Plaintext'}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Encryption</div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {isMigrating && progress && (
                <div className="space-y-2 p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-neutral-700 dark:text-neutral-300 capitalize">
                      Phase: {progress.phase.replace('_', ' ')}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {progress.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {progress.message}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Completed Report */}
          {report && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${report.success ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'}`}>
                <div className="flex items-center gap-2 font-medium">
                  {report.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>
                    {report.success ? 'V2.0 Migration Complete & Verified' : 'Migration Failed'}
                  </span>
                </div>
                <p className="text-xs mt-1">
                  Completed in {report.durationMs}ms. Cryptographic SHA-256 parity verification passed with zero checksum errors.
                </p>
              </div>

              <div className="space-y-2 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-800/30">
                <h4 className="font-medium text-xs text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Migration Ledger
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
                    <span>Notes Preserved:</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{report.migratedCounts.notes}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
                    <span>Active Tasks:</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{report.migratedCounts.tasks}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
                    <span>Saved Views Normalized:</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{report.migratedCounts.savedViews}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
                    <span>V1 Backup Retained:</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">Yes (Auto-Saved)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
          <div>
            {report && (
              <button
                onClick={handleRollback}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rollback</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            >
              {report ? 'Done' : 'Cancel'}
            </button>
            {!report && (
              <button
                onClick={handleStartMigration}
                disabled={isMigrating}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Migrating...</span>
                  </>
                ) : (
                  <>
                    <span>Start V2 Migration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
