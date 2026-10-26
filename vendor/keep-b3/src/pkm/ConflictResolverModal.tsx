import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  X,
  FileText,
  ArrowRight,
  Split,
  Edit3,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { FileConflict } from './remoteGitTypes';
import { Note } from '../types';

interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: FileConflict[];
  onResolveConflict: (
    conflict: FileConflict,
    resolution: 'local' | 'remote' | 'both' | 'custom',
    customContent?: string
  ) => void;
  onApplyAllResolved: () => void;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolveConflict,
  onApplyAllResolved,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customText, setCustomText] = useState<string>('');
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  if (!isOpen || conflicts.length === 0) return null;

  const currentConflict = conflicts[selectedIndex] || conflicts[0];
  const localText = typeof currentConflict.localContent === 'string' ? currentConflict.localContent : '';
  const remoteText = typeof currentConflict.remoteContent === 'string' ? currentConflict.remoteContent : '';
  const mergedWithMarkers = currentConflict.mergedContent || `${localText}\n\n=======\n\n${remoteText}`;

  const handleSelectResolution = (resolution: 'local' | 'remote' | 'both' | 'custom') => {
    if (resolution === 'custom') {
      onResolveConflict(currentConflict, 'custom', customText);
    } else {
      onResolveConflict(currentConflict, resolution);
    }

    if (selectedIndex < conflicts.length - 1) {
      setSelectedIndex((prev) => prev + 1);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base flex items-center gap-2">
                Sync Conflict Resolver
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs">
                  {conflicts.filter((c) => c.status === 'unresolved').length} Unresolved
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Both local and remote changes occurred. Review and choose the resolution for each file.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conflict File Selector Tabs */}
        {conflicts.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-stone-100 dark:border-stone-800 text-xs">
            {conflicts.map((c, idx) => (
              <button
                key={c.path + idx}
                onClick={() => {
                  setSelectedIndex(idx);
                  setIsEditingCustom(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                  idx === selectedIndex
                    ? 'bg-amber-500 text-white font-semibold'
                    : c.status === 'resolved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate max-w-[140px]">{c.noteTitle || c.path}</span>
                {c.status === 'resolved' && <Check className="w-3 h-3 text-emerald-500" />}
              </button>
            ))}
          </div>
        )}

        {/* Conflict Details Banner */}
        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              File: <code className="font-mono text-amber-600 dark:text-amber-400">{currentConflict.path}</code>
            </span>
            <div className="text-[11px] text-stone-400">
              Type: {currentConflict.fileType.toUpperCase()} • Status: {currentConflict.status.toUpperCase()}
              {currentConflict.resolution && ` (${currentConflict.resolution.toUpperCase()} selected)`}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsEditingCustom(!isEditingCustom);
                if (!isEditingCustom) {
                  setCustomText(mergedWithMarkers);
                }
              }}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-colors ${
                isEditingCustom
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              {isEditingCustom ? 'Show Side-by-Side' : 'Custom Editor'}
            </button>
          </div>
        </div>

        {/* Conflict Viewer */}
        <div className="flex-1 overflow-y-auto min-h-[260px] max-h-[420px]">
          {isEditingCustom ? (
            <div className="space-y-2 h-full flex flex-col">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Manual Resolution Editor
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full h-64 p-3 font-mono text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                placeholder="Edit content here to resolve conflict..."
              />
              <button
                onClick={() => handleSelectResolution('custom')}
                className="self-end px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Save Custom Resolution
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
              {/* Local Column */}
              <div className="flex flex-col border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
                  <span className="font-semibold text-xs text-blue-900 dark:text-blue-200">
                    Local Version (Active Vault)
                  </span>
                  <button
                    onClick={() => handleSelectResolution('local')}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Accept Local
                  </button>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-stone-900/50 flex-1 overflow-y-auto max-h-60 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                  {localText || '<empty>'}
                </div>
              </div>

              {/* Remote Column */}
              <div className="flex flex-col border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
                  <span className="font-semibold text-xs text-emerald-900 dark:text-emerald-200">
                    Remote Version (Remote Branch)
                  </span>
                  <button
                    onClick={() => handleSelectResolution('remote')}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Accept Remote
                  </button>
                </div>
                <div className="p-3 bg-stone-50 dark:bg-stone-900/50 flex-1 overflow-y-auto max-h-60 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                  {remoteText || '<empty>'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectResolution('both')}
              className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Keep Both (Insert Conflict Markers)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-600 dark:text-stone-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApplyAllResolved();
                onClose();
              }}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Apply & Finalize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
