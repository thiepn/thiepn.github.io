import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Sparkles, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import { Note } from '../../types';
import { CanvasNode, NoteCanvasNode, StickyCanvasNode, SectionCanvasNode } from '../canvasTypes';

interface CanvasActiveCardEditorProps {
  node: CanvasNode;
  canonicalNote?: Note | null;
  onSaveCanonicalNote?: (note: Note) => void;
  onUpdateStickyText?: (nodeId: string, text: string) => void;
  onCloseEditor: () => void;
  onOpenCanonicalNote?: (noteId: string) => void;
  onConvertToNote?: (stickyNode: StickyCanvasNode) => void;
}

export const CanvasActiveCardEditor: React.FC<CanvasActiveCardEditorProps> = ({
  node,
  canonicalNote,
  onSaveCanonicalNote,
  onUpdateStickyText,
  onCloseEditor,
  onOpenCanonicalNote,
  onConvertToNote,
}) => {
  const [title, setTitle] = useState(canonicalNote?.title || '');
  const [content, setContent] = useState(
    node.type === 'sticky' || node.type === 'text'
      ? node.text
      : canonicalNote?.content || ''
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSaveAndExit = () => {
    if (node.type === 'note' && canonicalNote && onSaveCanonicalNote) {
      onSaveCanonicalNote({
        ...canonicalNote,
        title: title.trim() || 'Untitled Note',
        content,
        updatedAt: new Date().toISOString(),
      });
    } else if ((node.type === 'sticky' || node.type === 'text') && onUpdateStickyText) {
      onUpdateStickyText(node.id, content);
    }
    onCloseEditor();
  };

  return (
    <div
      className="flex-1 w-full h-full flex flex-col bg-white dark:bg-stone-900 overflow-hidden select-text text-stone-900 dark:text-stone-100"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850">
        {node.type === 'note' && canonicalNote ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title..."
            className="flex-1 text-xs font-bold bg-transparent border-none outline-hidden text-stone-900 dark:text-stone-100 mr-2"
          />
        ) : (
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            Editing Text Card
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {node.type === 'sticky' && onConvertToNote && (
            <button
              type="button"
              onClick={() => onConvertToNote(node as StickyCanvasNode)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold hover:bg-blue-100 transition-colors"
              title="Promote this text card to a real canonical note"
            >
              <Sparkles className="w-3 h-3" />
              <span>Convert to Note</span>
            </button>
          )}

          {node.type === 'note' && canonicalNote && onOpenCanonicalNote && (
            <button
              type="button"
              onClick={() => {
                handleSaveAndExit();
                onOpenCanonicalNote(canonicalNote.id);
              }}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors"
              title="Open in full note editor"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAndExit}
            className="p-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-colors"
            title="Done Editing (Esc or Ctrl+Enter)"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleSaveAndExit();
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleSaveAndExit();
          }
        }}
        placeholder="Type Markdown content..."
        className="flex-1 w-full p-2.5 bg-transparent border-none outline-hidden resize-none font-mono text-xs leading-relaxed text-stone-800 dark:text-stone-200 placeholder:text-stone-400"
      />
    </div>
  );
};
