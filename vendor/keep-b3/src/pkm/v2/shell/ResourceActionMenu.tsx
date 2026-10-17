import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Star,
  Archive,
  Trash2,
  Share2,
  Download,
  Target,
  Link,
  PlusCircle,
  ExternalLink,
  Info,
  CheckCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { actionSystemV2 } from '../core/actions/actionSystem';

export interface ResourceActionMenuProps {
  resource: ResourceCore;
  onOpenInspector?: () => void;
  onOpenConnections?: () => void;
  onAddRelation?: () => void;
  onAddTask?: () => void;
  onStartContext?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onToggleFavorite?: () => void;
  onArchive?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  customActions?: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
  }[];
}

export const ResourceActionMenu: React.FC<ResourceActionMenuProps> = ({
  resource,
  onOpenInspector,
  onOpenConnections,
  onAddRelation,
  onAddTask,
  onStartContext,
  onExport,
  onShare,
  onToggleFavorite,
  onArchive,
  onTrash,
  onRestore,
  customActions = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = async (actionFn?: () => void, actionId?: string) => {
    setIsOpen(false);
    if (actionFn) {
      actionFn();
    } else if (actionId) {
      await actionSystemV2.execute(actionId, { resource });
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        id={`resource-menu-btn-${resource.id}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="More actions"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`resource-menu-btn-${resource.id}`}
          className="absolute right-0 z-50 mt-1.5 w-56 origin-top-right rounded-xl bg-white dark:bg-stone-900 shadow-lg border border-stone-200 dark:border-stone-800 py-1.5 focus:outline-none text-xs text-stone-700 dark:text-stone-300 animate-in fade-in zoom-in-95 duration-100 divide-y divide-stone-100 dark:divide-stone-800/60"
        >
          {/* Tier 1: Open / Inspect */}
          <div className="py-1">
            {onOpenInspector && (
              <button
                role="menuitem"
                onClick={() => handleAction(onOpenInspector)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-stone-400" />
                <span>Resource Details & Properties</span>
              </button>
            )}
            {onOpenConnections && (
              <button
                role="menuitem"
                onClick={() => handleAction(onOpenConnections)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors"
              >
                <Link className="w-3.5 h-3.5 text-blue-500" />
                <span>View Connections Graph</span>
              </button>
            )}
          </div>

          {/* Tier 2: Create / Relate */}
          <div className="py-1">
            {onAddRelation && (
              <button
                role="menuitem"
                onClick={() => handleAction(onAddRelation)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors"
              >
                <Link className="w-3.5 h-3.5 text-indigo-500" />
                <span>Add Connection...</span>
              </button>
            )}
            {onAddTask && (
              <button
                role="menuitem"
                onClick={() => handleAction(onAddTask)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Add Linked Task</span>
              </button>
            )}
          </div>

          {/* Tier 3: Favorite / Focus */}
          <div className="py-1">
            <button
              role="menuitem"
              onClick={() => handleAction(onToggleFavorite, 'resource.toggle_favorite')}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  resource.pinned
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-stone-400'
                }`}
              />
              <span>{resource.pinned ? 'Remove from Favorites' : 'Add to Favorites'}</span>
            </button>
            {onStartContext && (
              <button
                role="menuitem"
                onClick={() => handleAction(onStartContext, 'context.start')}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors"
              >
                <Target className="w-3.5 h-3.5 text-amber-500" />
                <span>Start Focus Context</span>
              </button>
            )}
          </div>

          {/* Tier 4: Share / Export */}
          <div className="py-1">
            {onExport && (
              <button
                role="menuitem"
                onClick={() => handleAction(onExport, 'resource.export')}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-stone-400" />
                <span>Export Markdown / JSON</span>
              </button>
            )}
            {onShare && (
              <button
                role="menuitem"
                onClick={() => handleAction(onShare)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-400" />
                <span>Share Snapshot</span>
              </button>
            )}
          </div>

          {/* Custom Domain Actions */}
          {customActions.length > 0 && (
            <div className="py-1">
              {customActions.map((action) => (
                <button
                  key={action.id}
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    action.onClick();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors ${
                    action.destructive
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {action.icon || <ExternalLink className="w-3.5 h-3.5 text-stone-400" />}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tier 5 & 6: Archive & Destructive Operations */}
          <div className="py-1">
            {!resource.trashed ? (
              <>
                <button
                  role="menuitem"
                  onClick={() => handleAction(onArchive, 'resource.archive')}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors text-stone-600 dark:text-stone-400"
                >
                  <Archive className="w-3.5 h-3.5 text-stone-400" />
                  <span>{resource.archived ? 'Unarchive' : 'Archive Resource'}</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => handleAction(onTrash, 'resource.trash')}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition-colors text-red-600 dark:text-red-400 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Move to Trash</span>
                </button>
              </>
            ) : (
              <button
                role="menuitem"
                onClick={() => handleAction(onRestore)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-colors text-emerald-600 dark:text-emerald-400 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                <span>Restore from Trash</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
