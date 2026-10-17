import React, { useState } from 'react';
import { Note, Folder } from '../../../types';
import { AIScope, AIScopeType } from '../types';
import {
  FileText,
  Folder as FolderIcon,
  Layers,
  Search,
  Database,
  BookOpen,
  CheckSquare,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';

interface AIScopePickerProps {
  currentScope: AIScope;
  onSelectScope: (scope: AIScope) => void;
  activeNote?: Note | null;
  selectedText?: string;
  allNotes: Note[];
  folders: Folder[];
  onClose?: () => void;
}

export const AIScopePicker: React.FC<AIScopePickerProps> = ({
  currentScope,
  onSelectScope,
  activeNote,
  selectedText,
  allNotes,
  folders,
  onClose,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folders[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  const handleSelectType = (type: AIScopeType) => {
    switch (type) {
      case 'current_note':
        if (activeNote) {
          onSelectScope({
            type: 'current_note',
            label: `Current Note: ${activeNote.title}`,
            currentNoteId: activeNote.id,
          });
        }
        break;

      case 'selected_text':
        if (selectedText) {
          onSelectScope({
            type: 'selected_text',
            label: 'Selected Text',
            currentNoteId: activeNote?.id,
            selectedText,
          });
        }
        break;

      case 'entire_vault':
        onSelectScope({
          type: 'entire_vault',
          label: 'Entire Vault',
        });
        break;

      case 'folder': {
        const folder = folders.find((f) => f.id === selectedFolderId) || folders[0];
        if (folder) {
          onSelectScope({
            type: 'folder',
            label: `Folder: ${folder.name}`,
            folderId: folder.id,
            folderName: folder.name,
          });
        }
        break;
      }

      case 'selected_notes': {
        if (selectedNoteIds.length > 0) {
          onSelectScope({
            type: 'selected_notes',
            label: `${selectedNoteIds.length} Selected Notes`,
            selectedNoteIds,
          });
        }
        break;
      }

      case 'search_results': {
        if (searchQuery.trim()) {
          onSelectScope({
            type: 'search_results',
            label: `Search: "${searchQuery}"`,
            searchQuery,
          });
        }
        break;
      }

      case 'references':
        onSelectScope({
          type: 'references',
          label: 'Academic References',
        });
        break;
    }

    onClose?.();
  };

  const toggleNoteSelect = (id: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl p-4 w-full max-w-md text-sm text-neutral-800 dark:text-neutral-200">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-3">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span>Select Retrieval Scope</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {/* Current Note */}
        {activeNote && (
          <button
            onClick={() => handleSelectType('current_note')}
            className={`w-full flex items-center justify-between p-2.5 rounded-md border text-left transition-colors ${
              currentScope.type === 'current_note'
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 font-medium text-sky-900 dark:text-sky-200'
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <div>
                <div>Current Note</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[240px]">
                  {activeNote.title}
                </div>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              Default
            </span>
          </button>
        )}

        {/* Selected Text */}
        {selectedText && (
          <button
            onClick={() => handleSelectType('selected_text')}
            className={`w-full flex items-center justify-between p-2.5 rounded-md border text-left transition-colors ${
              currentScope.type === 'selected_text'
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 font-medium text-sky-900 dark:text-sky-200'
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div>Selected Text Excerpt</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[240px]">
                  "{selectedText.slice(0, 40)}..."
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Specific Folder */}
        <div className="p-2.5 rounded-md border border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="flex items-center gap-2 font-medium text-xs text-neutral-600 dark:text-neutral-400">
            <FolderIcon className="w-3.5 h-3.5" />
            <span>Folder Scope</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-800 dark:text-neutral-200"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleSelectType('folder')}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded text-xs font-medium shrink-0"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Selected Notes Picker */}
        <div className="p-2.5 rounded-md border border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-xs text-neutral-600 dark:text-neutral-400">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Multi-Note Selection ({selectedNoteIds.length})</span>
            </div>
            {selectedNoteIds.length > 0 && (
              <button
                onClick={() => handleSelectType('selected_notes')}
                className="px-2 py-0.5 bg-sky-600 text-white rounded text-xs font-medium"
              >
                Set Scope
              </button>
            )}
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1 border border-neutral-100 dark:border-neutral-800/80 rounded p-1">
            {allNotes.slice(0, 15).map((n) => (
              <label
                key={n.id}
                className="flex items-center gap-2 text-xs p-1 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedNoteIds.includes(n.id)}
                  onChange={() => toggleNoteSelect(n.id)}
                  className="rounded text-sky-600"
                />
                <span className="truncate">{n.title}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Entire Vault (Explicit Option) */}
        <button
          onClick={() => handleSelectType('entire_vault')}
          className={`w-full flex items-center justify-between p-2.5 rounded-md border text-left transition-colors ${
            currentScope.type === 'entire_vault'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 font-medium text-amber-900 dark:text-amber-200'
              : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div>Entire Vault</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Search across all {allNotes.length} notes (respects exclusions)
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
