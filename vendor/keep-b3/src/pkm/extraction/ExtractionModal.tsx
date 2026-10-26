import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Scissors,
  Link2,
  ExternalLink,
  Folder as FolderIcon,
  AlertTriangle,
  FileText,
  X,
  Check,
  Columns2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { ExtractionMode, ExtractionOpenTarget } from './extractionTypes';
import { extractionService } from './extractionService';

interface ExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceNote: Note;
  selectionText: string;
  selectionStart: number;
  selectionEnd: number;
  allNotes: Note[];
  folders: Folder[];
  onCreateNote: (noteData: Partial<Note>) => Promise<Note | null> | Note | null;
  onSaveNote: (updatedNote: Note) => void | Promise<void>;
  onOpenTargetNote?: (noteId: string, options?: any) => void;
}

export const ExtractionModal: React.FC<ExtractionModalProps> = ({
  isOpen,
  onClose,
  sourceNote,
  selectionText,
  selectionStart,
  selectionEnd,
  allNotes,
  folders,
  onCreateNote,
  onSaveNote,
  onOpenTargetNote,
}) => {
  const titleInputRef = useRef<HTMLInputElement>(null);

  const initialSuggestedTitle = useMemo(() => {
    return extractionService.suggestTitle(selectionText);
  }, [selectionText]);

  const [title, setTitle] = useState(initialSuggestedTitle);
  const [mode, setMode] = useState<ExtractionMode>('link');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    sourceNote.folderId || null
  );
  const [openTarget, setOpenTarget] = useState<ExtractionOpenTarget>('stay');
  const [customAlias, setCustomAlias] = useState('');
  const [addSourceContext, setAddSourceContext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const suggested = extractionService.suggestTitle(selectionText);
      setTitle(suggested);
      setSelectedFolderId(sourceNote.folderId || null);
      setMode('link');
      setOpenTarget('stay');
      setCustomAlias('');
      setAddSourceContext(false);
      setErrorMessage(null);
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, selectionText, sourceNote.folderId]);

  // Validation
  const validation = useMemo(() => {
    return extractionService.validate(selectionText, title, allNotes);
  }, [selectionText, title, allNotes]);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!validation.valid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await extractionService.executeExtraction(
      {
        sourceNote,
        selectionText,
        selectionStart,
        selectionEnd,
        targetTitle: validation.sanitizedTitle,
        targetFolderId: selectedFolderId,
        mode,
        customAlias: customAlias.trim() || undefined,
        openTarget,
        addSourceContextMetadata: addSourceContext,
      },
      onCreateNote,
      onSaveNote
    );

    setIsSubmitting(false);

    if (result.success && result.targetNote) {
      onClose();
      if (openTarget !== 'stay' && onOpenTargetNote) {
        onOpenTargetNote(result.targetNote.id, {
          split: openTarget === 'beside',
          newTab: openTarget === 'new-tab',
        });
      }
    } else {
      setErrorMessage(result.error || 'Failed to extract selection.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="extraction-modal-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-stone-900 dark:text-stone-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 id="extraction-modal-title" className="text-sm font-bold tracking-tight">
                Extract Selection to Note
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Turn selected Markdown into an independent atomic note
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Target Note Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Target Note Title <span className="text-amber-600">*</span>
            </label>
            <div className="relative">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Quantum Decoherence Theory"
                className="w-full px-3.5 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            {validation.isDuplicate && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">Note with this title already exists:</span> "
                  {validation.existingNote?.title}".
                  <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                    Extracting will append/link into this existing note or you can choose a distinct title.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Source Replacement Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('link')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  mode === 'link'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                    : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <Link2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold">Extract & Link</div>
                  <div className="text-[10px] opacity-80">Replaces with [[{title || 'Note'}]]</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('embed')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  mode === 'embed'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                    : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <ExternalLink className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold">Extract & Embed</div>
                  <div className="text-[10px] opacity-80">Replaces with ![[{title || 'Note'}]]</div>
                </div>
              </button>
            </div>
          </div>

          {/* Folder & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Target Folder
              </label>
              <div className="relative">
                <select
                  value={selectedFolderId || ''}
                  onChange={(e) => setSelectedFolderId(e.target.value || null)}
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none font-medium text-stone-800 dark:text-stone-200"
                >
                  <option value="">(No folder / Vault Root)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                After Extraction
              </label>
              <div className="relative">
                <select
                  value={openTarget}
                  onChange={(e) => setOpenTarget(e.target.value as ExtractionOpenTarget)}
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none font-medium text-stone-800 dark:text-stone-200"
                >
                  <option value="stay">Stay in current note</option>
                  <option value="beside">Open target note beside</option>
                  <option value="current-tab">Open target in current tab</option>
                  <option value="new-tab">Open target in new tab</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Selected Markdown Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                Selected Markdown ({selectionText.length} characters)
              </span>
            </div>
            <div className="p-3 bg-stone-100/80 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 max-h-32 overflow-y-auto text-[11px] font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap select-text">
              {selectionText}
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850/70 flex items-center justify-between">
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            Press <kbd className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono">Enter</kbd> to extract
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={!validation.valid || isSubmitting}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Extracting...' : 'Extract to Note'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
