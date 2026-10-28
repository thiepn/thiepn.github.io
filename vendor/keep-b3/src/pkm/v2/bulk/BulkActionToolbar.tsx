import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Tag,
  Archive,
  Trash2,
  SlidersHorizontal,
  Link,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { BulkSelectionScope } from './unifiedBulkActions';

export interface BulkActionToolbarProps {
  selectedCount: number;
  totalMatchingCount: number;
  scope: BulkSelectionScope;
  onSelectAllVisible: () => void;
  onSelectAllMatching: () => void;
  onClearSelection: () => void;
  onApplyTag: (tag: string) => void;
  onSetStatus: (status: string) => void;
  onSetPriority: (priority: string) => void;
  onArchive: () => void;
  onRelate: (targetId: string, label: string) => void;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  totalMatchingCount,
  scope,
  onSelectAllVisible,
  onSelectAllMatching,
  onClearSelection,
  onApplyTag,
  onSetStatus,
  onSetPriority,
  onArchive,
  onRelate,
}) => {
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);

  if (selectedCount === 0) return null;

  const isAllMatching = scope === 'all_matching';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-3xl bg-neutral-900 border border-neutral-700 text-white rounded-xl shadow-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-150">
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500/20 text-amber-400 font-mono text-xs px-2.5 py-1 rounded-md font-semibold border border-amber-500/30">
            {selectedCount} Selected
          </span>
          <span className="text-xs text-neutral-400">
            {isAllMatching ? `(All ${totalMatchingCount} matching)` : `of ${totalMatchingCount} total`}
          </span>
        </div>

        {!isAllMatching && totalMatchingCount > selectedCount && (
          <button
            onClick={onSelectAllMatching}
            className="text-xs text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
          >
            Select all {totalMatchingCount} matching
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center w-full md:w-auto">
        {/* Add Tag */}
        <div className="relative">
          <button
            onClick={() => setShowTagDialog(!showTagDialog)}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Tag size={13} className="text-amber-400" />
            <span>Tag</span>
          </button>

          {showTagDialog && (
            <div className="absolute bottom-full mb-2 left-0 w-56 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl p-2 z-50">
              <label className="text-xs text-neutral-300 font-medium block mb-1">Add Tag</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="tag-name"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      onApplyTag(tagInput.trim());
                      setTagInput('');
                      setShowTagDialog(false);
                    }
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (tagInput.trim()) {
                      onApplyTag(tagInput.trim());
                      setTagInput('');
                      setShowTagDialog(false);
                    }
                  }}
                  className="px-2 py-1 bg-amber-500 text-neutral-950 rounded text-xs font-semibold hover:bg-amber-400"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Set Status */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal size={13} className="text-blue-400" />
            <span>Status</span>
          </button>

          {showStatusMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-44 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl py-1 z-50">
              {['todo', 'in_progress', 'done', 'active', 'completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    onSetStatus(st);
                    setShowStatusMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700 capitalize flex items-center justify-between"
                >
                  <span>{st.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Archive */}
        <button
          onClick={() => setShowConfirmArchive(true)}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <Archive size={13} className="text-neutral-400" />
          <span>Archive</span>
        </button>

        {/* Clear */}
        <button
          onClick={onClearSelection}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors ml-1"
          title="Clear selection (Esc)"
        >
          <X size={15} />
        </button>
      </div>

      {/* Confirmation Modal for Destructive/Bulk Changes */}
      {showConfirmArchive && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-5 shadow-2xl text-left">
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <AlertTriangle size={22} />
              <h3 className="text-base font-semibold text-white">Confirm Bulk Archive</h3>
            </div>
            <p className="text-sm text-neutral-300 mb-4">
              Are you sure you want to archive <strong className="text-white">{selectedCount}</strong> items? You can restore them at any time from the Archive view.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowConfirmArchive(false)}
                className="px-3.5 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onArchive();
                  setShowConfirmArchive(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg"
              >
                Archive {selectedCount} Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
