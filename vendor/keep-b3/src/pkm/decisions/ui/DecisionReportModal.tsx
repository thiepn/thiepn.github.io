import React, { useState } from 'react';
import { decisionService } from '../decisionService';
import { X, FileText, Download, Copy, Check } from 'lucide-react';

interface DecisionReportModalProps {
  onClose: () => void;
}

export const DecisionReportModal: React.FC<DecisionReportModalProps> = ({ onClose }) => {
  const [reportType, setReportType] = useState<'markdown' | 'csv'>('markdown');
  const [copied, setCopied] = useState(false);

  const markdownContent = decisionService.exportDecisionLogMarkdown();
  const csvContent = decisionService.exportPredictionsToCSV();

  const currentContent = reportType === 'markdown' ? markdownContent : csvContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      reportType === 'markdown'
        ? `decisions-vault-log-${new Date().toISOString().slice(0, 10)}.md`
        : `predictions-export-${new Date().toISOString().slice(0, 10)}.csv`;

    const blob = new Blob([currentContent], {
      type: reportType === 'markdown' ? 'text/markdown' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 w-full max-w-2xl max-h-[85vh] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/30">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Export Decisions & Predictions Report
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setReportType('markdown')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                reportType === 'markdown'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              Markdown Vault Log (.md)
            </button>
            <button
              onClick={() => setReportType('csv')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                reportType === 'csv'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              Predictions Table (.csv)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-stone-50/50 dark:bg-stone-950/50 font-mono text-xs text-stone-800 dark:text-stone-200">
          <pre className="whitespace-pre-wrap select-all">{currentContent}</pre>
        </div>

        <div className="p-3 border-t border-stone-200 dark:border-stone-800 flex justify-end bg-stone-50/50 dark:bg-stone-800/30">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
