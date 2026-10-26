import React from 'react';
import { X, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { Note, Folder } from '../types';
import { CanvasWorkspace } from './CanvasWorkspace';

interface CanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onOpenCanonicalNote: (noteId: string) => void;
  onOpenNoteBeside?: (noteId: string) => void;
  onOpenLinkedNote?: (noteId: string) => void;
  onSaveNote?: (note: Note) => void;
  onDeleteNote?: (noteId: string) => void;
  onCreateNoteWithTitle?: (title: string) => void;
  onRestoreDeletedNote?: (noteId: string) => void;
}

export const CanvasModal: React.FC<CanvasModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onOpenCanonicalNote,
  onOpenNoteBeside,
  onOpenLinkedNote,
  onSaveNote,
  onDeleteNote,
  onCreateNoteWithTitle,
  onRestoreDeletedNote,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="canvas-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-3 select-none"
    >
      <div
        id="canvas-modal-container"
        className="w-full h-full md:rounded-2xl shadow-2xl bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 flex flex-col overflow-hidden relative"
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 z-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Infinite Spatial Canvas
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Spatial Integration
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Close Canvas (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Canvas Area */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          <CanvasWorkspace
            notes={notes}
            folders={folders}
            onOpenCanonicalNote={onOpenCanonicalNote}
            onOpenNoteBeside={onOpenNoteBeside}
            onOpenLinkedNote={onOpenLinkedNote}
            onSaveNote={onSaveNote}
            onDeleteNote={onDeleteNote}
            onCreateNoteWithTitle={onCreateNoteWithTitle}
            onRestoreDeletedNote={onRestoreDeletedNote}
          />
        </div>
      </div>
    </div>
  );
};
