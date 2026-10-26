import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Cpu,
  HardDrive,
  KeyRound,
  Bell,
  Keyboard,
  Share2,
} from 'lucide-react';
import { desktopDiagnosticsEngine } from '../desktopDiagnostics';
import { DesktopDiagnosticsReport } from '../desktopTypes';

interface DesktopDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopDiagnosticsModal: React.FC<DesktopDiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<DesktopDiagnosticsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await desktopDiagnosticsEngine.runFullDiagnostics();
      setReport(res);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Desktop & Native Subsystem Diagnostics
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Verifies security isolation, path traversal guards, and native OS capabilities.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={loading}
              className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              title="Rerun Diagnostics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
              <div className="text-xs font-medium text-stone-600 dark:text-stone-400">
                Running diagnostic self-tests...
              </div>
            </div>
          ) : report ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-center">
                  <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{report.summary.total}</div>
                  <div className="text-[10px] uppercase font-semibold text-stone-500">Total Checks</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{report.summary.passed}</div>
                  <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Passed</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{report.summary.warnings}</div>
                  <div className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Warnings / Fallbacks</div>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-center">
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{report.summary.failed}</div>
                  <div className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">Failed</div>
                </div>
              </div>

              {/* Diagnostic Item List */}
              <div className="space-y-2">
                {report.items.map((item) => {
                  let statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
                  let bgClass = 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30';

                  if (item.status === 'warning') {
                    statusIcon = <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
                    bgClass = 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30';
                  } else if (item.status === 'failed') {
                    statusIcon = <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
                    bgClass = 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30';
                  } else if (item.status === 'skipped') {
                    statusIcon = <HelpCircle className="w-4 h-4 text-stone-400 shrink-0" />;
                    bgClass = 'bg-stone-50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800';
                  }

                  return (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-xl flex items-start gap-3 transition-colors ${bgClass}`}
                    >
                      <div className="mt-0.5">{statusIcon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                            {item.name}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-stone-400">
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                          {item.details}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
          <div className="text-[11px] text-stone-500">
            Self-tests verify zero-trust isolation and hardware credential safety.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
