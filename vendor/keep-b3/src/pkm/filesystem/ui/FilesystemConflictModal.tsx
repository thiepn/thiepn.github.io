/**
 * Phase P45: Filesystem Conflict Resolution Modal
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  Split,
  X,
} from 'lucide-react';
import { FilesystemConflict } from '../filesystemTypes';
import { filesystemBridgeService } from '../filesystemBridgeService';
import { Note } from '../../../types';

interface FilesystemConflictModalProps {
  isOpen: boolean;
  conflicts: FilesystemConflict[];
  onClose: () => void;
  onSaveNote: (note: Note) => void;
}

export const FilesystemConflictModal: React.FC<FilesystemConflictModalProps> = ({
  isOpen,
  conflicts,
  onClose,
  onSaveNote,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'side_by_side' | 'custom'>('side_by_side');
  const [customText, setCustomText] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen || conflicts.length === 0) return null;

  const currentConflict = conflicts[selectedIndex] || conflicts[0];

  const handleResolve = async (
    resolution: 'keep_app' | 'keep_external' | 'custom_merge'
  ) => {
    setIsResolving(true);
    try {
      await filesystemBridgeService.resolveConflict(
        currentConflict.id,
        resolution,
        resolution === 'custom_merge' ? customText : undefined,
        onSaveNote
      );
      if (conflicts.length <= 1) {
        onClose();
      } else {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
    } catch (err) {
      console.error('Error resolving conflict:', err);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        id="filesystem-conflict-modal"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Filesystem Conflict Resolution
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-medium">
                  {selectedIndex + 1} of {conflicts.length}
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Path: <span className="font-mono">{currentConflict.path}</span>
              </p>
            </div>
          </div>
          <button
            id="close-conflict-modal-btn"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Conflict List (if multiple) */}
          {conflicts.length > 1 && (
            <div className="w-full md:w-64 border-r border-stone-200 dark:border-stone-800 overflow-y-auto p-3 bg-stone-50/50 dark:bg-stone-950/20 space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 px-2 py-1">
                Conflicting Files
              </div>
              {conflicts.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                    selectedIndex === idx
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-medium border border-amber-300 dark:border-amber-800'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.title || c.path}</span>
                </button>
              ))}
            </div>
          )}

          {/* Diff & Resolution View */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
            {/* Resolution Selector Tabs */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('side_by_side')}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    activeTab === 'side_by_side'
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  Side-by-Side Comparison
                </button>
                <button
                  onClick={() => {
                    setActiveTab('custom');
                    setCustomText(currentConflict.canonicalContent || '');
                  }}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    activeTab === 'custom'
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  Custom Merged Editor
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="keep-app-version-btn"
                  disabled={isResolving}
                  onClick={() => handleResolve('keep_app')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Keep App Version
                </button>
                <button
                  id="keep-external-version-btn"
                  disabled={isResolving}
                  onClick={() => handleResolve('keep_external')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Keep Disk Version
                </button>
                {activeTab === 'custom' && (
                  <button
                    id="save-custom-merge-btn"
                    disabled={isResolving}
                    onClick={() => handleResolve('custom_merge')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Split className="w-3.5 h-3.5" />
                    Save Custom Merge
                  </button>
                )}
              </div>
            </div>

            {/* Panels */}
            {activeTab === 'side_by_side' ? (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                {/* App Version */}
                <div className="flex flex-col border border-blue-200 dark:border-blue-900/60 rounded-lg overflow-hidden bg-blue-50/20 dark:bg-blue-950/10">
                  <div className="px-3 py-2 bg-blue-100/60 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/40 text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center justify-between">
                    <span>Active App Version (Local Vault)</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">Canonical</span>
                  </div>
                  <pre className="flex-1 p-3 text-xs font-mono text-stone-800 dark:text-stone-200 overflow-auto whitespace-pre-wrap">
                    {currentConflict.canonicalContent || '(Empty or deleted in app)'}
                  </pre>
                </div>

                {/* Disk Version */}
                <div className="flex flex-col border border-emerald-200 dark:border-emerald-900/60 rounded-lg overflow-hidden bg-emerald-50/20 dark:bg-emerald-950/10">
                  <div className="px-3 py-2 bg-emerald-100/60 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span>External Disk Version</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Filesystem</span>
                  </div>
                  <pre className="flex-1 p-3 text-xs font-mono text-stone-800 dark:text-stone-200 overflow-auto whitespace-pre-wrap">
                    {currentConflict.externalContent || '(Empty or deleted on disk)'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Custom Merged Content (Edit below, then click &quot;Save Custom Merge&quot;)
                </div>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="flex-1 p-3 text-xs font-mono bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 resize-none focus:outline-hidden"
                  placeholder="Enter reconciled Markdown content..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
