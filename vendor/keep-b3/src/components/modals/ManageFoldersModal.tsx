import React, { useState, useEffect } from 'react';
import {
  Folder as FolderIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Tag,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Folder } from '../../types';

interface ManageFoldersModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onCreateFolder: (name: string, color?: string, autoSortByTag?: boolean, autoSortTag?: string | null) => void;
  onUpdateFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
}

export const ManageFoldersModal: React.FC<ManageFoldersModalProps> = ({
  isOpen,
  onClose,
  folders,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#f59e0b');
  const [newAutoSort, setNewAutoSort] = useState(false);
  const [newAutoSortTag, setNewAutoSortTag] = useState('');

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAutoSort, setEditAutoSort] = useState(false);
  const [editAutoSortTag, setEditAutoSortTag] = useState('');

  useEffect(() => {
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

  const folderColors = [
    '#f59e0b',
    '#3b82f6',
    '#10b981',
    '#ec4899',
    '#8b5cf6',
    '#06b6d4',
    '#ef4444',
    '#78716c',
  ];

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newFolderName.trim()) return;
    const cleanTag = newAutoSortTag.trim().replace(/^#/, '');
    onCreateFolder(
      newFolderName.trim(),
      newFolderColor,
      newAutoSort && Boolean(cleanTag),
      newAutoSort && cleanTag ? cleanTag : null
    );
    setNewFolderName('');
    setNewAutoSort(false);
    setNewAutoSortTag('');
  };

  const handleStartEdit = (f: Folder) => {
    setEditingFolderId(f.id);
    setEditName(f.name);
    setEditAutoSort(Boolean(f.autoSortByTag));
    setEditAutoSortTag(f.autoSortTag || '');
  };

  const handleSaveEdit = (f: Folder) => {
    if (!editName.trim()) return;
    const cleanTag = editAutoSortTag.trim().replace(/^#/, '');
    onUpdateFolder({
      ...f,
      name: editName.trim(),
      autoSortByTag: editAutoSort && Boolean(cleanTag),
      autoSortTag: editAutoSort && cleanTag ? cleanTag : null,
    });
    setEditingFolderId(null);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col p-5 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Manage Folders
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Organize your notes into folders and configure automatic tag sorting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create Folder Input */}
        <div className="space-y-2.5 p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-700/60">
          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider block">
            New Folder
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Folder name (e.g. Work, Ideas, Projects)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={handleCreate}
              disabled={!newFolderName.trim()}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Folder
            </button>
          </div>

          {/* Auto-sort by Tag Option for New Folder */}
          <div className="pt-1.5 space-y-2 border-t border-stone-200/60 dark:border-stone-700/60">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-800 dark:text-stone-200 font-medium">
              <input
                type="checkbox"
                checked={newAutoSort}
                onChange={(e) => setNewAutoSort(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-stone-300 dark:border-stone-600 text-amber-500 focus:ring-amber-400 accent-amber-500"
              />
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-500" />
                Enable Auto-sort by Tag
              </span>
            </label>

            {newAutoSort && (
              <div className="flex items-center gap-2 pl-5 animate-in fade-in duration-150">
                <span className="text-xs text-stone-500 dark:text-stone-400">Designated tag:</span>
                <div className="relative flex-1">
                  <Tag className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="e.g. work, project, finance"
                    value={newAutoSortTag}
                    onChange={(e) => setNewAutoSortTag(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Color swatches */}
          <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
            <span className="text-[10px] text-stone-500 dark:text-stone-400">Folder Color:</span>
            <div className="flex items-center gap-1.5">
              {folderColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewFolderColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    newFolderColor === c ? 'scale-125 ring-2 ring-amber-500 ring-offset-1' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Existing Folders List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {folders.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-6">No folders created yet.</p>
          ) : (
            folders.map((f) => (
              <div
                key={f.id}
                className="p-2.5 rounded-xl bg-white dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-800 space-y-2 transition-colors"
              >
                {editingFolderId === f.id ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <FolderIcon
                        className="w-4 h-4 shrink-0"
                        style={{ color: f.color || '#f59e0b' }}
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(f);
                        }}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Folder name"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(f)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                        title="Save changes"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingFolderId(null)}
                        className="p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Auto-sort Tag Config in Edit Mode */}
                    <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-800 dark:text-stone-200 font-medium">
                        <input
                          type="checkbox"
                          checked={editAutoSort}
                          onChange={(e) => setEditAutoSort(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-stone-300 dark:border-stone-600 text-amber-500 focus:ring-amber-400 accent-amber-500"
                        />
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-amber-500" />
                          Auto-sort by Tag
                        </span>
                      </label>

                      {editAutoSort && (
                        <div className="flex items-center gap-2 pl-5">
                          <span className="text-[11px] text-stone-500 dark:text-stone-400">Designated tag:</span>
                          <div className="relative flex-1">
                            <Tag className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                              type="text"
                              placeholder="e.g. work"
                              value={editAutoSortTag}
                              onChange={(e) => setEditAutoSortTag(e.target.value)}
                              className="w-full pl-7 pr-2.5 py-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <FolderIcon
                        className="w-4 h-4 shrink-0"
                        style={{ color: f.color || '#f59e0b' }}
                      />
                      <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {f.name}
                      </span>
                      {f.autoSortByTag && f.autoSortTag && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-mono font-medium"
                          title={`Auto-sorts notes containing #${f.autoSortTag} into this folder`}
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-500" />
                          #{f.autoSortTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(f)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                        title="Edit Folder & Auto-sort settings"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete folder "${f.name}"? Notes inside will not be deleted.`)) {
                            onDeleteFolder(f.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
