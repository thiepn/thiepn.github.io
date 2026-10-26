import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  FileText,
  Folder as FolderIcon,
  Link2,
  ExternalLink,
  Search,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Columns2,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { MOCItemNode, MOCResult } from './mocTypes';
import { parseMOCConfig } from './mocParser';
import { mocEngine } from './mocEngine';
import { vaultManager } from '../indexer';

interface MOCBlockViewProps {
  code: string;
  sourceNoteId?: string;
  allNotes?: Note[];
  folders?: Folder[];
  onOpenNote?: (noteId: string, options?: any) => void;
}

export const MOCBlockView: React.FC<MOCBlockViewProps> = ({
  code,
  sourceNoteId,
  allNotes = [],
  folders = [],
  onOpenNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [vaultVersion, setVaultVersion] = useState(0);

  // Subscribe to live index updates so the MOC is truly "Living"
  useEffect(() => {
    const unsubscribe = vaultManager.subscribe(() => {
      setVaultVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Parse config
  const parseResult = useMemo(() => {
    return parseMOCConfig(code);
  }, [code]);

  // Evaluate MOC tree
  const mocResult: MOCResult = useMemo(() => {
    if (parseResult.error) {
      return {
        rootItems: [],
        totalMatches: 0,
        truncatedCount: 0,
        error: parseResult.error,
      };
    }

    return mocEngine.evaluateMOC(
      parseResult.config,
      allNotes,
      folders,
      sourceNoteId
    );
  }, [parseResult, allNotes, folders, sourceNoteId, vaultVersion]);

  const toggleCollapse = (pathKey: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
      }
      return next;
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter tree items if search term is active
  const filterNodes = (items: MOCItemNode[], term: string): MOCItemNode[] => {
    if (!term) return items;
    const lower = term.toLowerCase();

    return items
      .map((item) => {
        const matchesSelf = item.title.toLowerCase().includes(lower);
        const filteredChildren = filterNodes(item.children, term);

        if (matchesSelf || filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter((n): n is MOCItemNode => n !== null);
  };

  const displayedRootItems = useMemo(() => {
    if (!localSearch.trim()) return mocResult.rootItems;
    return filterNodes(mocResult.rootItems, localSearch.trim());
  }, [mocResult.rootItems, localSearch]);

  // Recursive Tree Node Renderer
  const renderItemNode = (item: MOCItemNode) => {
    const isCollapsed = collapsedKeys.has(item.pathKey);
    const hasChildren = item.children && item.children.length > 0;
    const isFolderNode = item.id.startsWith('folder-');

    return (
      <li key={item.pathKey} className="group/item list-none select-none" role="treeitem">
        <div
          className={`flex items-center justify-between py-1 px-2 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-colors text-xs ${
            item.level > 0 ? 'ml-3.5 border-l border-stone-200 dark:border-stone-800 pl-2' : ''
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(item.pathKey)}
                className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded cursor-pointer shrink-0"
                aria-label={isCollapsed ? 'Expand branch' : 'Collapse branch'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 shrink-0" />
            )}

            {isFolderNode ? (
              <FolderIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            )}

            {item.note && onOpenNote ? (
              <button
                type="button"
                onClick={() => onOpenNote(item.note!.id)}
                className="font-medium text-stone-800 dark:text-stone-200 hover:text-amber-600 dark:hover:text-amber-400 truncate text-left cursor-pointer"
              >
                {item.title}
              </button>
            ) : (
              <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                {item.title}
              </span>
            )}

            {item.isCycle && (
              <span
                className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-mono shrink-0"
                title="Circular reference detected"
              >
                🔄 cycle
              </span>
            )}

            {parseResult.config.showCounts && (
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {item.backlinkCount > 0 && (
                  <span
                    className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 text-[10px] font-mono"
                    title={`${item.backlinkCount} backlinks`}
                  >
                    {item.backlinkCount} links
                  </span>
                )}
                {hasChildren && (
                  <span
                    className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-400 text-[10px] font-mono"
                    title={`${item.children.length} sub-items`}
                  >
                    {item.children.length}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons on Hover */}
          {item.note && onOpenNote && (
            <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => onOpenNote(item.note!.id)}
                className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                title="Open note"
                aria-label="Open note"
              >
                <Eye className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onOpenNote(item.note!.id, { split: true })}
                className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                title="Open Beside"
                aria-label="Open note beside"
              >
                <Columns2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Sub-tree Children */}
        {hasChildren && !isCollapsed && (
          <ul className="space-y-0.5 mt-0.5" role="group">
            {item.children.map(renderItemNode)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="my-3 rounded-xl border border-amber-300/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-stone-900/40 overflow-hidden text-xs shadow-2xs font-sans">
      {/* Header Bar */}
      <div className="px-3.5 py-2 bg-amber-100/60 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Map of Content (MOC)
          </span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-mono">
            {mocResult.totalMatches} {mocResult.totalMatches === 1 ? 'note' : 'notes'}
          </span>
          {parseResult.config.folder && (
            <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate max-w-[120px]">
              📁 {parseResult.config.folder}
            </span>
          )}
          {parseResult.config.tag && (
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
              #{parseResult.config.tag}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
            title="Copy MOC query syntax"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Filter / Search Bar (for larger MOCs) */}
      {mocResult.totalMatches > 5 && (
        <div className="px-3 py-1.5 bg-stone-50 dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
          <Search className="w-3 h-3 text-stone-400 shrink-0" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter MOC notes..."
            className="w-full bg-transparent text-xs text-stone-800 dark:text-stone-200 focus:outline-none placeholder:text-stone-400"
          />
        </div>
      )}

      {/* Error View */}
      {mocResult.error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-start gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Invalid MOC Configuration:</div>
            <div className="text-[11px] font-mono mt-0.5">{mocResult.error}</div>
          </div>
        </div>
      )}

      {/* Tree Content */}
      {!mocResult.error && (
        <div className="p-2.5 max-h-96 overflow-y-auto">
          {displayedRootItems.length === 0 ? (
            <div className="p-4 text-center text-xs text-stone-400 italic">
              {localSearch ? 'No notes matching filter.' : 'No matching notes found for this MOC.'}
            </div>
          ) : (
            <ul className="space-y-0.5" role="tree">
              {displayedRootItems.map(renderItemNode)}
            </ul>
          )}

          {/* Truncation Badge */}
          {mocResult.truncatedCount > 0 && (
            <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 flex items-center justify-between">
              <span>+ {mocResult.truncatedCount} more notes (truncated by limit)</span>
              <span className="text-[10px] text-amber-600 font-medium">increase limit: in query</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
