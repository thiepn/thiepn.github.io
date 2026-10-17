/**
 * P47 — Mobile Diagnostics & Capability Doctor Modal
 */

import React, { useState, useEffect } from 'react';
import { X, Smartphone, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { MobileDiagnosticsRunner, MobileDiagnosticReport } from '../mobileDiagnostics';
import { mobileCapabilityService } from '../mobileCapabilityService';

interface MobileDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDiagnosticsModal: React.FC<MobileDiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<MobileDiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const rep = await MobileDiagnosticsRunner.runAllDiagnostics();
      setReport(rep);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    mobileCapabilityService.triggerHaptic('success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Mobile Capability Doctor & Audit
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Diagnostic verification of Share Sheet, Widgets, Notifications & Biometric security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Running mobile capability diagnostics...</span>
            </div>
          ) : report ? (
            <div className="space-y-4">
              {/* Summary Score */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700/60 text-center">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">Total Checks</div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{report.totalChecks}</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-center">
                  <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Passed</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{report.passedChecks}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 text-center">
                  <div className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Warnings</div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{report.warningsCount}</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-800/50 text-center">
                  <div className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">Failures</div>
                  <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{report.failuresCount}</div>
                </div>
              </div>

              {/* Check Items */}
              <div className="space-y-2">
                {report.checks.map((check) => (
                  <div
                    key={check.checkId}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 rounded-lg flex items-start gap-3 text-xs"
                  >
                    {check.status === 'passed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    {check.status === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    {check.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                        <span>{check.name}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300">
                          {check.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {check.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleCopy}
            disabled={!report}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied JSON' : 'Copy Audit Report'}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={runAudit}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-run Audit
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
