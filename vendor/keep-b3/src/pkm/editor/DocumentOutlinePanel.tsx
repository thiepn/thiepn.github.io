import React, { useState } from 'react';
import {
  Layers,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  FoldVertical,
  UnfoldVertical,
  X,
  Hash,
} from 'lucide-react';
import { DocumentSection, NoteFoldState } from '../outliner';

interface DocumentOutlinePanelProps {
  sections: DocumentSection[];
  foldState: NoteFoldState;
  activeLineIndex?: number;
  onToggleFold: (sectionId: string) => void;
  onFoldAll: () => void;
  onUnfoldAll: () => void;
  onSelectSection: (section: DocumentSection) => void;
  onReorderSection: (sourceIndex: number, targetIndex: number | 'up' | 'down') => void;
  onClose?: () => void;
  compact?: boolean;
}

export const DocumentOutlinePanel: React.FC<DocumentOutlinePanelProps> = ({
  sections,
  foldState,
  activeLineIndex = 0,
  onToggleFold,
  onFoldAll,
  onUnfoldAll,
  onSelectSection,
  onReorderSection,
  onClose,
  compact = false,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after'>('before');

  // Determine which section is currently active based on cursor line
  const activeSectionId = React.useMemo(() => {
    if (sections.length === 0) return null;
    let current: DocumentSection | null = null;
    for (const sec of sections) {
      if (activeLineIndex >= sec.startLine && activeLineIndex <= sec.endLine) {
        current = sec;
      }
    }
    return current ? current.id : null;
  }, [sections, activeLineIndex]);

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

  if (sections.length === 0) {
    return (
      <div className="flex flex-col h-full bg-stone-50/70 dark:bg-stone-900/70 p-4 text-xs text-stone-500 text-center select-none border-l border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800 font-bold text-stone-700 dark:text-stone-300">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Outline</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              title="Close outline"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="my-auto py-8">
          <Hash className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-700" />
          <p className="font-semibold text-stone-700 dark:text-stone-300">No headings yet</p>
          <p className="mt-1 text-[11px] text-stone-400">
            Type <code className="font-mono bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded"># Heading</code> to organize sections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-50/90 dark:bg-stone-900/90 border-l border-stone-200 dark:border-stone-800 overflow-hidden select-none text-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-100/80 dark:bg-stone-850/80 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
          <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Outline</span>
          <span className="px-1.5 py-0.2 bg-stone-200 dark:bg-stone-700 text-[10px] font-mono rounded text-stone-600 dark:text-stone-300">
            {sections.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onFoldAll}
            className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
            title="Fold all sections"
            aria-label="Fold all sections"
          >
            <FoldVertical className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onUnfoldAll}
            className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
            title="Unfold all sections"
            aria-label="Unfold all sections"
          >
            <UnfoldVertical className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors ml-1 cursor-pointer"
              title="Close outline"
              aria-label="Close outline panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sections.map((section, idx) => {
          const isFolded = foldState.foldedHeadingIds.includes(section.id);
          const isActive = section.id === activeSectionId;
          const isDragging = draggedIndex === idx;
          const isDragOver = dragOverIndex === idx;

          // Compute indentation based on heading level (1-6)
          const indentPixels = Math.min(24, (section.level - 1) * 8);

          return (
            <div
              key={section.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              style={{ marginLeft: `${indentPixels}px` }}
              className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all ${
                isDragging ? 'opacity-30 border-dashed border-amber-500' : ''
              } ${
                isDragOver
                  ? dragPosition === 'before'
                    ? 'border-t-2 border-t-amber-500 border-transparent'
                    : 'border-b-2 border-b-amber-500 border-transparent'
                  : ''
              } ${
                isActive
                  ? 'bg-amber-100/80 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80 text-stone-950 dark:text-white font-semibold shadow-xs'
                  : 'bg-white/60 dark:bg-stone-800/40 border-stone-200/60 dark:border-stone-750/60 hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              {/* Drag Handle & Fold Toggle */}
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span
                  className="cursor-grab active:cursor-grabbing text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors"
                  title="Drag to reorder section"
                >
                  <GripVertical className="w-3 h-3 shrink-0" />
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFold(section.id);
                  }}
                  className="p-0.5 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-colors cursor-pointer"
                  title={isFolded ? 'Unfold section' : 'Fold section'}
                  aria-label={isFolded ? `Unfold ${section.title}` : `Fold ${section.title}`}
                >
                  {isFolded ? (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectSection(section)}
                  className="truncate text-left flex-1 min-w-0 hover:underline cursor-pointer"
                  title={`Jump to: ${section.title} (Line ${section.startLine + 1})`}
                >
                  <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 mr-1">
                    H{section.level}
                  </span>
                  <span className={isActive ? 'font-bold' : ''}>
                    {section.title || 'Untitled Section'}
                  </span>
                </button>
              </div>

              {/* Section actions (Move Up, Move Down) */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderSection(idx, 'up');
                  }}
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-20 cursor-pointer"
                  title="Move section up"
                  aria-label={`Move ${section.title} up`}
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
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-20 cursor-pointer"
                  title="Move section down"
                  aria-label={`Move ${section.title} down`}
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
