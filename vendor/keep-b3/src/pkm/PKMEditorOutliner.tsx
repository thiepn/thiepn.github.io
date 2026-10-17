import React, { useState } from 'react';
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  X,
  FoldVertical,
  UnfoldVertical,
  Layers,
  FileText,
} from 'lucide-react';
import { DocumentSection, NoteFoldState } from './outliner';

interface PKMEditorOutlinerProps {
  sections: DocumentSection[];
  foldState: NoteFoldState;
  onToggleFold: (sectionId: string) => void;
  onFoldAll: () => void;
  onUnfoldAll: () => void;
  onSelectSection: (section: DocumentSection) => void;
  onReorderSection: (sourceIndex: number, targetPosition: number | 'up' | 'down') => void;
  onClose: () => void;
  activeLineIndex?: number;
}

export const PKMEditorOutliner: React.FC<PKMEditorOutlinerProps> = ({
  sections,
  foldState,
  onToggleFold,
  onFoldAll,
  onUnfoldAll,
  onSelectSection,
  onReorderSection,
  onClose,
  activeLineIndex = 0,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after'>('before');

  if (sections.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-700">
        <Layers className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
        <p className="font-semibold text-stone-700 dark:text-stone-300">No headings detected</p>
        <p className="mt-0.5 text-[11px]">Add # H1, ## H2, or ### H3 to structure this note.</p>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    setDragOverIndex(index);
    setDragPosition(pos);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    onReorderSection(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex flex-col bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xs overflow-hidden text-xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-100/90 dark:bg-stone-800/90 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
          <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Document Outliner</span>
          <span className="px-1.5 py-0.2 bg-stone-200 dark:bg-stone-700 text-[10px] font-mono rounded text-stone-600 dark:text-stone-300">
            {sections.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onFoldAll}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
            title="Fold all sections"
            aria-label="Fold all sections"
          >
            <FoldVertical className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onUnfoldAll}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
            title="Unfold all sections"
            aria-label="Unfold all sections"
          >
            <UnfoldVertical className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors ml-1"
            title="Close outline"
            aria-label="Close outline"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sections List */}
      <div
        className="max-h-64 overflow-y-auto p-1.5 space-y-1"
        role="tree"
        aria-label="Document headings tree"
      >
        {sections.map((sec, idx) => {
          const isFolded = foldState.foldedHeadingIds.includes(sec.id);
          const hasChildren = sec.children.length > 0;
          const isCurrentActive =
            activeLineIndex >= sec.startLine && activeLineIndex <= sec.endLine;
          const isDraggingThis = draggedIndex === idx;
          const isTarget = dragOverIndex === idx;

          // Padding based on level (H1 = 0, H2 = 12px, H3 = 24px, etc.)
          const indentPx = Math.min((sec.level - 1) * 14, 56);

          return (
            <div
              key={sec.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg transition-all select-none ${
                isDraggingThis
                  ? 'opacity-40 bg-amber-100/50 dark:bg-amber-950/40 border border-dashed border-amber-500'
                  : isTarget
                  ? dragPosition === 'before'
                    ? 'border-t-2 border-t-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-b-2 border-b-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                  : isCurrentActive
                  ? 'bg-amber-100/70 dark:bg-amber-950/40 text-stone-950 dark:text-white font-semibold'
                  : 'hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
              style={{ paddingLeft: `${indentPx + 8}px` }}
              role="treeitem"
              aria-expanded={!isFolded}
            >
              {/* Drag Handle & Fold Chevron & Title */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {/* Drag Grip Handle */}
                <div
                  className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 p-0.5 rounded touch-manipulation"
                  title="Drag to reorder section"
                  aria-label="Drag handle"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Fold Toggle (if has children or section body) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFold(sec.id);
                  }}
                  className={`p-0.5 rounded hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-transform ${
                    hasChildren || sec.lineCount > 1 ? 'opacity-100' : 'opacity-30 pointer-events-none'
                  }`}
                  title={isFolded ? 'Unfold section' : 'Fold section'}
                  aria-label={isFolded ? 'Unfold section' : 'Fold section'}
                >
                  {isFolded ? (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Level Badge */}
                <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500 font-bold shrink-0">
                  H{sec.level}
                </span>

                {/* Heading Title (Clickable jump) */}
                <button
                  type="button"
                  onClick={() => onSelectSection(sec)}
                  className="truncate text-left flex-1 hover:underline cursor-pointer focus:outline-hidden"
                  title={`Jump to ${sec.title} (Line ${sec.startLine + 1})`}
                >
                  <span className={sec.level === 1 ? 'font-bold' : sec.level === 2 ? 'font-semibold' : ''}>
                    {sec.title}
                  </span>
                </button>
              </div>

              {/* Action Controls & Word count */}
              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                {/* Words/Lines badge */}
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono hidden sm:inline">
                  {sec.wordCount}w
                </span>

                {/* Accessible Move Up / Move Down buttons */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderSection(idx, 'up');
                    }}
                    className="p-1 rounded hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-900 dark:hover:text-white disabled:opacity-20 transition-colors"
                    title="Move section up (Alt+Shift+Up)"
                    aria-label={`Move ${sec.title} up`}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderSection(idx, 'down');
                    }}
                    className="p-1 rounded hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-900 dark:hover:text-white disabled:opacity-20 transition-colors"
                    title="Move section down (Alt+Shift+Down)"
                    aria-label={`Move ${sec.title} down`}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer helper */}
      <div className="px-3 py-1.5 bg-stone-100/60 dark:bg-stone-800/60 border-t border-stone-200 dark:border-stone-700 text-[10px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
        <span>Tip: Drag headings or use ↑/↓ to reorder sections.</span>
        <span className="font-mono">Alt+Shift+↑/↓</span>
      </div>
    </div>
  );
};
