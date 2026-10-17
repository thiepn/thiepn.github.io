/**
 * PKM Phase P39: Single Note Export Modal
 * Lightweight dialog for rapid export of the current active note to Standalone HTML, Markdown Package, or Print.
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Printer,
  FileCode,
  Archive,
  Check,
  X,
  Layers,
  Settings,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import {
  generateSingleNoteHtml,
  generateMarkdownPackageZip,
  triggerFileDownload,
  SingleNoteExportOptions,
} from '../singleNoteExporter';

interface SingleNoteExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  allNotes?: Note[];
  folders?: Folder[];
}

type ExportMode = 'html' | 'markdown' | 'print';

export const SingleNoteExportModal: React.FC<SingleNoteExportModalProps> = ({
  isOpen,
  onClose,
  note,
  allNotes = [],
  folders = [],
}) => {
  const [mode, setMode] = useState<ExportMode>('html');
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark' | 'sepia'>('auto');
  const [includeTOC, setIncludeTOC] = useState<boolean>(true);
  const [includeBib, setIncludeBib] = useState<boolean>(true);
  const [includeBacklinks, setIncludeBacklinks] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen || !note) return null;

  const exportOptions: SingleNoteExportOptions = {
    theme,
    includeTableOfContents: includeTOC,
    includeBibliography: includeBib,
    includeBacklinks,
  };

  const handleDownloadHtml = () => {
    setIsExporting(true);
    try {
      const html = generateSingleNoteHtml(note, allNotes, folders, exportOptions);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const safeTitle = (note.title || 'note').replace(/[/\\?%*:|"<>]/g, '_');
      triggerFileDownload(blob, `${safeTitle}.html`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyHtml = () => {
    const html = generateSingleNoteHtml(note, allNotes, folders, exportOptions);
    navigator.clipboard.writeText(html);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadMarkdownZip = async () => {
    setIsExporting(true);
    try {
      const zipBlob = await generateMarkdownPackageZip(note, allNotes);
      const safeTitle = (note.title || 'note').replace(/[/\\?%*:|"<>]/g, '_');
      triggerFileDownload(zipBlob, `${safeTitle}_package.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    // Open print preview in clean popout or trigger window.print
    const html = generateSingleNoteHtml(note, allNotes, folders, exportOptions);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Export Note
              </h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                {note.title || 'Untitled Note'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Export Mode Tabs */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMode('html')}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 text-xs font-semibold transition-all ${
                mode === 'html'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Standalone HTML</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('markdown')}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 text-xs font-semibold transition-all ${
                mode === 'markdown'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>Markdown ZIP</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('print')}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 text-xs font-semibold transition-all ${
                mode === 'print'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>

          {/* Options for HTML Mode */}
          {mode === 'html' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">Theme</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <option value="auto">Auto (System)</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="sepia">Sepia</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTOC}
                    onChange={(e) => setIncludeTOC(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Include Table of Contents</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBib}
                    onChange={(e) => setIncludeBib(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Include Citations & Bibliography</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBacklinks}
                    onChange={(e) => setIncludeBacklinks(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Include Linked References</span>
                </label>
              </div>
            </div>
          )}

          {/* Options for Markdown Package */}
          {mode === 'markdown' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Package Contents
              </div>
              <div>• Sanitized Markdown with YAML frontmatter</div>
              <div>• Package manifest JSON with timestamps and tags</div>
            </div>
          )}

          {/* Options for Print */}
          {mode === 'print' && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              Opens the system print dialog with optimized print styles, clean margins, and light contrast.
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            {mode === 'html' && (
              <>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied!' : 'Copy HTML'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download HTML</span>
                </button>
              </>
            )}

            {mode === 'markdown' && (
              <button
                type="button"
                onClick={handleDownloadMarkdownZip}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ZIP Package</span>
              </button>
            )}

            {mode === 'print' && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
