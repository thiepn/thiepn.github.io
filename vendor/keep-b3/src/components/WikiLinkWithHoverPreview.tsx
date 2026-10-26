import React, { useState, useRef } from 'react';
import { Link2, Layers, FileText, ArrowUpRight } from 'lucide-react';
import { HighlightText } from './HighlightText';

interface WikiLinkWithHoverPreviewProps {
  targetTitle: string;
  targetNoteId?: string;
  targetSnippet?: string;
  isEmbed?: boolean;
  activeHighlightTerms?: string[];
  onOpenLinkedNote?: (targetId: string) => void;
  className?: string;
}

export const WikiLinkWithHoverPreview: React.FC<WikiLinkWithHoverPreviewProps> = ({
  targetTitle,
  targetNoteId,
  targetSnippet,
  isEmbed,
  activeHighlightTerms = [],
  onOpenLinkedNote,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetNoteId && onOpenLinkedNote) {
      onOpenLinkedNote(targetNoteId);
    }
  };

  const previewText = targetSnippet
    ? targetSnippet.length > 100
      ? `${targetSnippet.slice(0, 100)}...`
      : targetSnippet
    : 'No additional content';

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded text-xs font-semibold border hover:underline cursor-pointer transition-colors ${
          isEmbed
            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-400/60'
            : 'bg-amber-200/90 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border-amber-300/60 dark:border-amber-700/60'
        } ${className}`}
        title={isEmbed ? `Embedded content: ${targetTitle}` : `Linked note: ${targetTitle}`}
      >
        {isEmbed ? (
          <Layers className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 stroke-[2.25]" />
        ) : (
          <Link2 className="w-2.5 h-2.5 opacity-80 stroke-[2.25]" />
        )}
        <HighlightText text={targetTitle} highlightTerms={activeHighlightTerms} />
      </button>

      {/* Hover Preview Tooltip */}
      {isHovered && targetNoteId && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2.5 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-xs truncate">{targetTitle}</span>
            </div>
            <ArrowUpRight className="w-3 h-3 text-stone-400 shrink-0" />
          </div>
          <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed break-words font-normal">
            {previewText}
          </p>
          <div className="mt-1 pt-1 text-[9px] text-amber-700 dark:text-amber-400/90 font-mono font-medium flex items-center justify-between">
            <span>First 100 chars</span>
            <span>Click to view note</span>
          </div>
        </div>
      )}
    </span>
  );
};
