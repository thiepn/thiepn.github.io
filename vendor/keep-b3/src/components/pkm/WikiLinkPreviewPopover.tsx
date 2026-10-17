import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Calendar,
  Folder as FolderIcon,
  Tag as TagIcon,
  ExternalLink,
  Plus,
  Copy,
  Check,
  Columns,
  Sparkles,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { NOTE_COLORS } from '../../utils/colors';

export interface WikiLinkPreviewPopoverProps {
  targetTitle: string;
  targetNote?: Note;
  targetHeading?: string;
  alias?: string;
  folders?: Folder[];
  onOpenNote?: (noteId: string) => void;
  onOpenInSplit?: (noteId: string) => void;
  onCreateNote?: (title: string) => void;
  children: React.ReactNode;
}

export const WikiLinkPreviewPopover: React.FC<WikiLinkPreviewPopoverProps> = ({
  targetTitle,
  targetNote,
  targetHeading,
  alias,
  folders = [],
  onOpenNote,
  onOpenInSplit,
  onCreateNote,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const folder = targetNote?.folderId
    ? folders.find((f) => f.id === targetNote.folderId)
    : undefined;

  const colorConfig = targetNote ? NOTE_COLORS[targetNote.color || 'default'] : null;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const top = rect.bottom + 6;
        const left = Math.max(12, Math.min(window.innerWidth - 340, rect.left));
        setPopoverPos({ top, left });
        setIsOpen(true);
      }
    }, 280); // 280ms hover delay like Obsidian
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const linkStr = targetHeading ? `[[${targetTitle}#${targetHeading}]]` : `[[${targetTitle}]]`;
    navigator.clipboard.writeText(linkStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block"
    >
      {children}

      {isOpen && popoverPos && (
        <div
          ref={popoverRef}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'fixed',
            top: Math.min(popoverPos.top, window.innerHeight - 300),
            left: popoverPos.left,
          }}
          className="z-50 w-80 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 text-xs select-none"
        >
          {/* Header Bar */}
          <div className="p-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100 truncate text-sm">
                <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{targetNote ? targetNote.title : targetTitle}</span>
              </div>
              {targetHeading && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate mt-0.5">
                  # {targetHeading}
                </div>
              )}
              {alias && alias !== targetTitle && (
                <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                  Alias: &ldquo;{alias}&rdquo;
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
                title="Copy [[WikiLink]]"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Note Metadata and Content Preview */}
          {targetNote ? (
            <div className="p-3 space-y-2.5 max-h-56 overflow-y-auto">
              {/* Meta Tags & Folder row */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-500 dark:text-stone-400">
                {folder && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                    <FolderIcon className="w-3 h-3 text-amber-500" />
                    <span>{folder.name}</span>
                  </span>
                )}
                {targetNote.updatedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(targetNote.updatedAt).toLocaleDateString()}</span>
                  </span>
                )}
                {targetNote.tags && targetNote.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {targetNote.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono text-[10px]"
                      >
                        #{t}
                      </span>
                    ))}
                    {targetNote.tags.length > 3 && (
                      <span className="text-[10px]">+{targetNote.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Text Snippet */}
              <div className="text-stone-700 dark:text-stone-300 text-xs leading-relaxed whitespace-pre-wrap font-sans line-clamp-5 bg-stone-50/70 dark:bg-stone-950/50 p-2 rounded-lg border border-stone-200/60 dark:border-stone-800/60">
                {targetNote.content
                  ? targetNote.content.slice(0, 320)
                  : '(Note content is empty)'}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2 text-center bg-stone-50/50 dark:bg-stone-950/50">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="font-semibold text-stone-800 dark:text-stone-200">
                Unresolved Link
              </div>
              <p className="text-[11px] text-stone-500 leading-normal">
                This note does not exist in your vault yet. You can create it with one click.
              </p>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="p-2 bg-stone-100 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-1.5">
            {targetNote ? (
              <>
                {onOpenInSplit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      onOpenInSplit(targetNote.id);
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center gap-1"
                  >
                    <Columns className="w-3 h-3" />
                    <span>Split View</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    if (onOpenNote) onOpenNote(targetNote.id);
                  }}
                  className="px-3 py-1 rounded-md text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Note</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  if (onCreateNote) onCreateNote(targetTitle);
                }}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create &ldquo;{targetTitle}&rdquo;</span>
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
};
