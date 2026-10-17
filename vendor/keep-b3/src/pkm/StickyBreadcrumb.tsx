import React from 'react';
import { ChevronRight, Hash, Compass } from 'lucide-react';
import { BreadcrumbItem } from './outliner';

interface StickyBreadcrumbProps {
  breadcrumbs: BreadcrumbItem[];
  onSelectHeading: (item: BreadcrumbItem) => void;
  className?: string;
}

export const StickyBreadcrumb: React.FC<StickyBreadcrumbProps> = ({
  breadcrumbs,
  onSelectHeading,
  className = '',
}) => {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Heading hierarchy breadcrumbs"
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-stone-100/90 dark:bg-stone-800/90 backdrop-blur-sm border-b border-stone-200/80 dark:border-stone-700/80 text-xs text-stone-600 dark:text-stone-300 overflow-x-auto select-none no-scrollbar ${className}`}
    >
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0 mr-1">
        <Compass className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Section</span>
      </div>

      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        const levelPrefix = '#'.repeat(crumb.level);

        return (
          <React.Fragment key={crumb.id || `${crumb.slug}-${crumb.lineIndex}`}>
            {idx > 0 && (
              <ChevronRight className="w-3 h-3 text-stone-400 dark:text-stone-500 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => onSelectHeading(crumb)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-stone-200/80 dark:hover:bg-stone-700/80 transition-colors whitespace-nowrap text-left ${
                isLast
                  ? 'font-bold text-stone-900 dark:text-stone-100 bg-stone-200/60 dark:bg-stone-700/60'
                  : 'font-medium text-stone-600 dark:text-stone-300'
              }`}
              title={`Jump to ${levelPrefix} ${crumb.text} (Line ${crumb.lineIndex + 1})`}
            >
              <span className="font-mono text-[10px] text-amber-600/80 dark:text-amber-400/80">
                {levelPrefix}
              </span>
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{crumb.text}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
