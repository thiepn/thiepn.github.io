import React from 'react';
import { FileText, Lock, ExternalLink, Tag as TagIcon, X } from 'lucide-react';
import { LinkPreviewData } from '../navigationTypes';

export interface LinkPreviewPopoverProps {
  data: LinkPreviewData | null;
  position?: { x: number; y: number };
  onOpenTarget?: (resourceId: string) => void;
  onClose?: () => void;
}

export const LinkPreviewPopover: React.FC<LinkPreviewPopoverProps> = ({
  data,
  position,
  onOpenTarget,
  onClose,
}) => {
  if (!data) return null;

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: Math.min(position.y + 12, window.innerHeight - 260),
        left: Math.min(position.x + 8, window.innerWidth - 320),
        zIndex: 60,
      }
    : {
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 60,
      };

  return (
    <div
      id="link-preview-popover"
      style={style}
      className="w-76 sm:w-84 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-3.5 text-xs animate-in fade-in zoom-in-95 duration-100 select-none pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
            {data.isEncryptedOrLocked ? (
              <Lock className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {data.title}
            </h4>
            {data.subtitle && (
              <p className="text-2xs text-neutral-500 dark:text-neutral-400 truncate">
                {data.subtitle}
              </p>
            )}
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded"
            aria-label="Close preview"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Subpath Title if present */}
      {data.subpathTitle && (
        <div className="mt-2 text-2xs font-mono text-primary-600 dark:text-primary-400 font-medium">
          {data.subpathTitle}
        </div>
      )}

      {/* Excerpt */}
      <div className="my-2.5 text-neutral-600 dark:text-neutral-300 text-xs leading-relaxed line-clamp-4">
        {data.firstExcerpt}
      </div>

      {/* Tags if any */}
      {data.tags && data.tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {data.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-2xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Action */}
      {!data.isEncryptedOrLocked && data.resourceId !== 'missing' && onOpenTarget && (
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
          <button
            onClick={() => onOpenTarget(data.resourceId)}
            className="px-2.5 py-1 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 hover:bg-primary-100 font-medium text-2xs flex items-center gap-1 border border-primary-200 dark:border-primary-800/60"
          >
            <span>Open Note</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
