import React, { useMemo } from 'react';
import { AlignLeft, X, ChevronRight, Hash } from 'lucide-react';

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  lineIndex: number;
}

export function extractHeadings(markdown: string): HeadingItem[] {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const headings: HeadingItem[] = [];

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      if (text) {
        headings.push({
          id: `heading-${index}`,
          level,
          text,
          lineIndex: index,
        });
      }
    }
  });

  return headings;
}

interface NoteOutlineDrawerProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
  onSelectHeading?: (heading: HeadingItem) => void;
}

export const NoteOutlineDrawer: React.FC<NoteOutlineDrawerProps> = ({
  isOpen,
  content,
  onClose,
  onSelectHeading,
}) => {
  const headings = useMemo(() => extractHeadings(content), [content]);

  if (!isOpen) return null;

  return (
    <div className="w-64 border-l border-stone-800 bg-stone-950/95 backdrop-blur-md flex flex-col h-full z-20 select-none animate-slide-in-right">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-800">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-stone-300 uppercase">
          <AlignLeft className="w-3.5 h-3.5 text-purple-400" />
          <span>Outline ({headings.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-stone-500 hover:text-stone-300 hover:bg-stone-850 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {headings.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-500">
            No headings found.<br />
            Add <code># Heading</code> to build your outline.
          </div>
        ) : (
          headings.map(h => {
            const indent = h.level === 1 ? 'pl-2 font-bold' : h.level === 2 ? 'pl-4' : 'pl-6 text-stone-400';
            return (
              <button
                key={h.id}
                onClick={() => onSelectHeading && onSelectHeading(h)}
                className={`w-full flex items-center gap-1.5 py-1.5 pr-2 rounded text-left text-xs transition-colors hover:bg-stone-900 hover:text-stone-100 ${indent} text-stone-300`}
              >
                <Hash className="w-2.5 h-2.5 text-purple-400/60 shrink-0" />
                <span className="truncate">{h.text}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
