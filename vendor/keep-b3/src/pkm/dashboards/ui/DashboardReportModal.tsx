import React, { useState, useEffect } from 'react';
import { Dashboard, DashboardReportSnapshot } from '../dashboardTypes';
import { dashboardService } from '../dashboardService';
import { AggregationContext } from '../aggregationService';
import { Printer, Download, X, FileText, Loader2, ShieldAlert } from 'lucide-react';

interface DashboardReportModalProps {
  isOpen: boolean;
  dashboard: Dashboard;
  ctx: AggregationContext;
  onClose: () => void;
}

export const DashboardReportModal: React.FC<DashboardReportModalProps> = ({
  isOpen,
  dashboard,
  ctx,
  onClose,
}) => {
  const [snapshot, setSnapshot] = useState<DashboardReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    dashboardService
      .generateReportSnapshot(dashboard, ctx)
      .then((res) => {
        setSnapshot(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to generate report snapshot:', err);
        setLoading(false);
      });
  }, [isOpen, dashboard, ctx.allNotes, ctx.folders, ctx.globalFilters]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dashboard.name.toLowerCase().replace(/\s+/g, '-')}-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Static Report Preview — {dashboard.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="px-6 py-2 bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-200/40 dark:border-amber-800/20 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>
            Static snapshots export current derived values directly. Ensure no private data is shared unintentionally.
          </span>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-stone-400 gap-2 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span>Compiling report snapshot...</span>
            </div>
          ) : snapshot ? (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Report Header */}
              <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
                <h1 className="text-2xl font-bold">{snapshot.dashboardName}</h1>
                <p className="text-xs text-stone-500 mt-1">Generated: {snapshot.exportedAt}</p>
              </div>

              {/* Report Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {snapshot.widgets.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-2"
                  >
                    <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      {w.title}
                    </h3>

                    {w.type === 'metric' && w.metric && (
                      <div className="text-3xl font-bold text-stone-900 dark:text-stone-100 py-1">
                        {w.metric.value}
                      </div>
                    )}

                    {w.dataPoints && w.dataPoints.length > 0 && (
                      <div className="space-y-1.5 pt-1 text-xs">
                        {w.dataPoints.map((dp, dIdx) => (
                          <div key={dIdx} className="flex justify-between items-center py-0.5">
                            <span className="font-medium text-stone-700 dark:text-stone-300">
                              {dp.label}
                            </span>
                            <span className="text-stone-900 dark:text-stone-100 font-mono">
                              {dp.value} {dp.percentage && `(${dp.percentage})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {w.tableRows && w.tableRows.length > 0 && (
                      <div className="space-y-1 pt-1 text-xs divide-y divide-stone-200/50 dark:divide-stone-800/50">
                        {w.tableRows.slice(0, 5).map((tr, tIdx) => (
                          <div key={tIdx} className="flex justify-between items-center py-1">
                            <span className="font-medium truncate max-w-[160px]">{tr.title}</span>
                            <span className="text-stone-500 text-[11px] font-mono">{tr.value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {w.textContent && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
                        {w.textContent}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
