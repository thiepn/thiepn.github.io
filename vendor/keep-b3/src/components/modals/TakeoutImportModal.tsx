import React, { useState, useRef } from 'react';
import {
  Upload,
  FileArchive,
  FileText,
  CheckCircle2,
  AlertCircle,
  Folder as FolderIcon,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { importFiles, ImportResult } from '../../services/importer';

interface TakeoutImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onImportNotes: (newNotes: Note[], newFolders?: Folder[]) => void;
}

export const TakeoutImportModal: React.FC<TakeoutImportModalProps> = ({
  isOpen,
  onClose,
  folders,
  onImportNotes,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setImportResult(null);
    try {
      const result = await importFiles(files);
      setImportResult(result);
    } catch (err: any) {
      setImportResult({
        notes: [],
        foldersDetected: [],
        tagsDetected: [],
        totalParsed: 0,
        errors: [err.message || 'Failed to process files'],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyImport = () => {
    if (!importResult || importResult.notes.length === 0) return;

    // Apply target folder if chosen
    const notesToSave = importResult.notes.map((n) => ({
      ...n,
      folderId: targetFolderId !== null ? targetFolderId : n.folderId,
    }));

    onImportNotes(notesToSave);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Import Notes
              </h3>
              <p className="text-xs text-stone-400">
                Google Takeout .zip, Keep .json, or Markdown / Text files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drag & Drop Zone */}
        {!importResult ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              dragOver
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                : 'border-stone-300 dark:border-stone-700 hover:border-amber-400 hover:bg-stone-50 dark:hover:bg-stone-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.json,.md,.markdown,.txt"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFiles(e.target.files);
                }
              }}
              className="hidden"
            />

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500">
              <FileArchive className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                {isProcessing ? 'Analyzing and parsing files...' : 'Drag & drop Google Takeout ZIP or Markdown files'}
              </p>
              <p className="text-xs text-stone-400">
                Supports complete Takeout ZIP archives, Keep JSON files, folders of .md files, and images
              </p>
            </div>

            <button
              type="button"
              className="mt-2 px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold"
            >
              Browse Files
            </button>
          </div>
        ) : (
          /* Import Preview Report */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Found {importResult.notes.length} notes ready to import!</span>
              </div>
              <div className="text-xs space-y-1 opacity-90">
                {importResult.tagsDetected.length > 0 && (
                  <p>🏷️ Labels detected: {importResult.tagsDetected.slice(0, 8).join(', ')}</p>
                )}
                <p>🖼️ Total attachments extracted: {importResult.notes.reduce((acc, n) => acc + (n.images?.length || 0), 0)}</p>
              </div>
            </div>

            {/* Optional Folder Assign */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                Assign imported notes to folder (optional):
              </label>
              <select
                value={targetFolderId || ''}
                onChange={(e) => setTargetFolderId(e.target.value || null)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-xs bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none"
              >
                <option value="">Keep original folders / unorganized</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {importResult.errors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Warnings ({importResult.errors.length}):</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 max-h-20 overflow-y-auto">
                  {importResult.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          {importResult && importResult.notes.length > 0 && (
            <button
              onClick={handleApplyImport}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              Import {importResult.notes.length} Notes <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
