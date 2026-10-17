/**
 * Phase P45: Filesystem Reconciliation Review Modal
 * 
 * Safety review modal for mass changes, mass deletions, and external changes.
 */

import React, { useState } from 'react';
import {
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  FilePlus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { ReconciliationPlan } from '../filesystemTypes';
import { filesystemBridgeService } from '../filesystemBridgeService';
import { Note, Folder } from '../../../types';

interface FilesystemReconciliationReviewModalProps {
  isOpen: boolean;
  plan: ReconciliationPlan | null;
  notes: Note[];
  folders: Folder[];
  onClose: () => void;
  onSaveNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export const FilesystemReconciliationReviewModal: React.FC<FilesystemReconciliationReviewModalProps> = ({
  isOpen,
  plan,
  notes,
  folders,
  onClose,
  onSaveNote,
  onDeleteNote,
}) => {
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen || !plan) return null;

  const handleApplyAll = async () => {
    setIsApplying(true);
    try {
      await filesystemBridgeService.applyReconciliationPlan(
        plan,
        notes,
        folders,
        onSaveNote,
        onDeleteNote
      );
      onClose();
    } catch (err) {
      console.error('Failed to apply reconciliation plan:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'app_to_disk':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
            <ArrowUpRight className="w-3 h-3" /> App &rarr; Disk
          </span>
        );
      case 'disk_to_app':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
            <ArrowDownLeft className="w-3 h-3" /> Disk &rarr; App
          </span>
        );
      case 'new_external_note':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
            <FilePlus className="w-3 h-3" /> New External Note
          </span>
        );
      case 'rename_disk':
      case 'rename_app':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium">
            <RotateCcw className="w-3 h-3" /> Rename / Move
          </span>
        );
      case 'deletion_app_to_disk':
      case 'deletion_disk_to_app':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-medium">
            <Trash2 className="w-3 h-3" /> Deletion
          </span>
        );
      default:
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        id="filesystem-reconciliation-review-modal"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Review Filesystem Reconciliation Changes
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {plan.stats.totalChanges} total pending changes detected between active vault and disk mirror.
              </p>
            </div>
          </div>
          <button
            id="close-review-modal-btn"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mass Change Warning Banner */}
        {(plan.isMassChange || plan.isMassDelete) && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2 font-medium">
            <AlertOctagon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Mass Change Safeguard Active: A recovery snapshot point will be automatically recorded before applying these updates.
            </span>
          </div>
        )}

        {/* Change Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-3 bg-stone-100/50 dark:bg-stone-950/30 border-b border-stone-200 dark:border-stone-800 text-center">
          <div className="p-2 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <div className="text-xs text-stone-500 dark:text-stone-400">App &rarr; Disk</div>
            <div className="text-base font-semibold text-blue-600 dark:text-blue-400">
              {plan.stats.appToDiskCount}
            </div>
          </div>
          <div className="p-2 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <div className="text-xs text-stone-500 dark:text-stone-400">Disk &rarr; App</div>
            <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
              {plan.stats.diskToAppCount + plan.stats.newExternalCount}
            </div>
          </div>
          <div className="p-2 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <div className="text-xs text-stone-500 dark:text-stone-400">Renames</div>
            <div className="text-base font-semibold text-amber-600 dark:text-amber-400">
              {plan.stats.renameCount}
            </div>
          </div>
          <div className="p-2 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <div className="text-xs text-stone-500 dark:text-stone-400">Deletions</div>
            <div className="text-base font-semibold text-rose-600 dark:text-rose-400">
              {plan.stats.deletionCount}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 font-semibold border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Title / Target</th>
                  <th className="px-4 py-2.5">Relative Path</th>
                  <th className="px-4 py-2.5">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {plan.items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="px-4 py-2.5">{getActionBadge(item.action)}</td>
                    <td className="px-4 py-2.5 font-medium text-stone-900 dark:text-stone-100">
                      {item.title}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-stone-500 dark:text-stone-400">
                      {item.path}
                    </td>
                    <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">
                      {item.diffSummary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <button
            id="cancel-reconciliation-btn"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            id="apply-all-reconciliation-btn"
            disabled={isApplying}
            onClick={handleApplyAll}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isApplying ? 'Applying Synchronization...' : 'Apply All Safe Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
