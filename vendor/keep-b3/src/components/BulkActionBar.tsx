import React, { useState, useRef, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  X,
  Palette,
  Folder as FolderIcon,
  Tag,
  Pin,
  Star,
  Archive,
  ArchiveRestore,
  Trash2,
  Copy,
  Download,
  Merge,
  GitMerge,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { Note, Folder, NoteColorKey } from '../types';
import { NOTE_COLORS, COLOR_KEYS } from '../utils/colors';

interface BulkActionBarProps {
  selectedNoteIds: string[];
  totalNotesCount: number;
  notes: Note[];
  folders: Folder[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkChangeColor: (color: NoteColorKey) => void;
  onBulkMoveFolder: (folderId: string | null) => void;
  onBulkAddTag: (tag: string) => void;
  onBulkPin: (pinned: boolean) => void;
  onBulkFavorite?: (isFavorite: boolean) => void;
  onBulkArchive: (archived: boolean) => void;
  onBulkDelete: () => void;
  onBulkRestore?: () => void;
  onBulkDeleteForever?: () => void;
  onBulkDuplicate: () => void;
  onBulkMerge: () => void;
  onCompareAndMerge?: () => void;
  onBulkExportZip: () => void;
  isTrashScope?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedNoteIds,
  totalNotesCount,
  notes,
  folders,
  onSelectAll,
  onClearSelection,
  onBulkChangeColor,
  onBulkMoveFolder,
  onBulkAddTag,
  onBulkPin,
  onBulkFavorite,
  onBulkArchive,
  onBulkDelete,
  onBulkRestore,
  onBulkDeleteForever,
  onBulkDuplicate,
  onBulkMerge,
  onCompareAndMerge,
  onBulkExportZip,
  isTrashScope = false,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');

  const colorRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (folderRef.current && !folderRef.current.contains(e.target as Node)) {
        setShowFolderPicker(false);
      }
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setShowTagInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedNoteIds.length === 0) return null;

  const allSelected = selectedNoteIds.length === totalNotesCount && totalNotesCount > 0;

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagInputValue.trim()) {
      onBulkAddTag(tagInputValue.trim().replace(/^#/, ''));
      setTagInputValue('');
      setShowTagInput(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-4xl w-[92%] sm:w-auto bg-stone-900/95 dark:bg-stone-900/95 text-stone-100 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-stone-700/60 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
      {/* Left: Count & Select All */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={allSelected ? onClearSelection : onSelectAll}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 transition-colors"
          title={allSelected ? 'Deselect all' : 'Select all visible notes'}
        >
          {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> : <Square className="w-3.5 h-3.5" />}
          <span>{selectedNoteIds.length} selected</span>
        </button>
      </div>

      {/* Center Action Buttons */}
      <div className="flex items-center flex-wrap gap-1">
        {!isTrashScope ? (
          <>
            {/* Color Picker Dropdown */}
            <div className="relative" ref={colorRef}>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                title="Change Color"
              >
                <Palette className="w-4 h-4" />
              </button>

              {showColorPicker && (
                <div className="absolute bottom-full mb-2 left-0 p-2 bg-stone-800 rounded-xl border border-stone-700 shadow-xl grid grid-cols-5 gap-1.5 w-48 z-50">
                  {COLOR_KEYS.map((key) => {
                    const c = NOTE_COLORS[key];
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          onBulkChangeColor(key);
                          setShowColorPicker(false);
                        }}
                        style={{ backgroundColor: c.hex }}
                        className="w-8 h-8 rounded-lg border border-stone-600/60 hover:scale-110 transition-transform"
                        title={c.name}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Move to Folder Dropdown */}
            <div className="relative" ref={folderRef}>
              <button
                onClick={() => setShowFolderPicker(!showFolderPicker)}
                className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                title="Move to Folder"
              >
                <FolderIcon className="w-4 h-4" />
              </button>

              {showFolderPicker && (
                <div className="absolute bottom-full mb-2 left-0 py-1.5 bg-stone-800 rounded-xl border border-stone-700 shadow-xl w-48 z-50 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => {
                      onBulkMoveFolder(null);
                      setShowFolderPicker(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700 flex items-center gap-2"
                  >
                    <span>None (Unorganized)</span>
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        onBulkMoveFolder(f.id);
                        setShowFolderPicker(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700 flex items-center gap-2 truncate"
                    >
                      <FolderIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Tag Dropdown */}
            <div className="relative" ref={tagRef}>
              <button
                onClick={() => setShowTagInput(!showTagInput)}
                className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                title="Add Tag to Selected"
              >
                <Tag className="w-4 h-4" />
              </button>

              {showTagInput && (
                <form
                  onSubmit={handleAddTagSubmit}
                  className="absolute bottom-full mb-2 left-0 p-2 bg-stone-800 rounded-xl border border-stone-700 shadow-xl w-48 z-50"
                >
                  <input
                    type="text"
                    placeholder="tag name..."
                    value={tagInputValue}
                    onChange={(e) => setTagInputValue(e.target.value)}
                    autoFocus
                    className="w-full px-2.5 py-1 text-xs bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-400 focus:outline-hidden focus:border-amber-400"
                  />
                </form>
              )}
            </div>

            {/* Pin Toggle */}
            <button
              onClick={() => onBulkPin(true)}
              className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
              title="Pin Selected Notes"
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* Favorite / Star Toggle */}
            {onBulkFavorite && (
              <button
                onClick={() => {
                  const anyUnfavorited = notes.some(
                    (n) => selectedNoteIds.includes(n.id) && !n.isFavorite
                  );
                  onBulkFavorite(anyUnfavorited);
                }}
                className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
                title="Star / Favorite Selected Notes"
              >
                <Star className="w-4 h-4" />
              </button>
            )}

            {/* Archive Toggle */}
            <button
              onClick={() => onBulkArchive(true)}
              className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
              title="Archive Selected Notes"
            >
              <Archive className="w-4 h-4" />
            </button>

            {/* Compare & Merge Studio (Visual Diff if exactly 2 notes selected) */}
            {selectedNoteIds.length === 2 && onCompareAndMerge && (
              <button
                onClick={onCompareAndMerge}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Open Visual Diff & Merge Studio for these 2 notes"
              >
                <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
                <span>Compare & Merge</span>
              </button>
            )}

            {/* Merge Notes */}
            {selectedNoteIds.length > 1 && (
              <button
                onClick={onBulkMerge}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Merge selected notes into a single document"
              >
                <Merge className="w-3.5 h-3.5" />
                <span>Merge</span>
              </button>
            )}

            {/* Duplicate */}
            <button
              onClick={onBulkDuplicate}
              className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
              title="Duplicate Selected Notes"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Export as ZIP */}
            <button
              onClick={onBulkExportZip}
              className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
              title="Export Selected Notes as ZIP (.md)"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Move to Trash */}
            <button
              onClick={onBulkDelete}
              className="p-2 rounded-xl hover:bg-red-950 text-red-400 hover:text-red-300 transition-colors"
              title="Move to Trash"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* Trash Scope: Restore & Delete Forever */
          <>
            {onBulkRestore && (
              <button
                onClick={onBulkRestore}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArchiveRestore className="w-3.5 h-3.5" />
                <span>Restore Notes</span>
              </button>
            )}
            {onBulkDeleteForever && (
              <button
                onClick={onBulkDeleteForever}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Right: Dismiss / Clear Selection */}
      <button
        onClick={onClearSelection}
        className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
        title="Clear Selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
