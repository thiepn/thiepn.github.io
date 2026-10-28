import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Link,
  Target,
  FileText,
  History,
  Tag,
  Calendar,
  Clock,
  Hash,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { UnifiedConnectionsPanel } from '../connections/UnifiedConnectionsPanel';

export interface UnifiedResourceInspectorProps {
  resource: ResourceCore;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToResource?: (targetId: string, targetType: ResourceType) => void;
  onAddRelationClick?: () => void;
  contextName?: string;
  contextWorkingSet?: { id: string; title: string; type: ResourceType }[];
  historyEntries?: { id: string; timestamp: number; summary: string }[];
  contentStats?: { wordCount: number; charCount: number; readingTimeMinutes: number };
  onUpdateMetadata?: (key: string, value: any) => void;
  className?: string;
}

export const UnifiedResourceInspector: React.FC<UnifiedResourceInspectorProps> = ({
  resource,
  isOpen,
  onClose,
  onNavigateToResource,
  onAddRelationClick,
  contextName,
  contextWorkingSet = [],
  historyEntries = [],
  contentStats,
  onUpdateMetadata,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<
    'details' | 'connections' | 'context' | 'source' | 'history'
  >('details');

  if (!isOpen) return null;

  return (
    <aside
      className={`w-full sm:w-80 md:w-96 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col h-full z-20 shadow-xl sm:shadow-none ${className}`}
      aria-label="Resource Inspector"
    >
      {/* Header with Close and Tabs */}
      <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-stone-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-800 dark:text-stone-200">
            Inspector
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="px-3 py-1.5 border-b border-stone-100 dark:border-stone-800/60 flex gap-1 overflow-x-auto text-[11px] shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
            activeTab === 'details'
              ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <Hash className="w-3 h-3 text-stone-400" />
          <span>Details</span>
        </button>

        <button
          onClick={() => setActiveTab('connections')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
            activeTab === 'connections'
              ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <Link className="w-3 h-3 text-indigo-500" />
          <span>Connections</span>
        </button>

        <button
          onClick={() => setActiveTab('context')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
            activeTab === 'context'
              ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <Target className="w-3 h-3 text-amber-500" />
          <span>Context</span>
        </button>

        <button
          onClick={() => setActiveTab('source')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
            activeTab === 'source'
              ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <FileText className="w-3 h-3 text-blue-500" />
          <span>Source</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <History className="w-3 h-3 text-emerald-500" />
          <span>History</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab 1: Details & Properties */}
        {activeTab === 'details' && (
          <div className="p-4 space-y-5">
            {/* Core Metadata */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Resource Properties
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" /> Created
                  </span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" /> Modified
                  </span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {new Date(resource.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-stone-400" /> Type
                  </span>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-stone-600 dark:text-stone-400">
                    {resource.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Reading / Word Count Stats (if available) */}
            {contentStats && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Document Metrics
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 text-center">
                    <div className="text-sm font-bold text-stone-800 dark:text-stone-200">
                      {contentStats.wordCount}
                    </div>
                    <div className="text-[10px] text-stone-400">Words</div>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 text-center">
                    <div className="text-sm font-bold text-stone-800 dark:text-stone-200">
                      {contentStats.charCount}
                    </div>
                    <div className="text-[10px] text-stone-400">Chars</div>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 text-center">
                    <div className="text-sm font-bold text-stone-800 dark:text-stone-200">
                      {contentStats.readingTimeMinutes}m
                    </div>
                    <div className="text-[10px] text-stone-400">Read Time</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {resource.tags && resource.tags.length > 0 ? (
                  resource.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-mono"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-stone-400 italic">No tags assigned</span>
                )}
              </div>
            </div>

            {/* Custom Metadata Key-Values */}
            {resource.metadata && Object.keys(resource.metadata).length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Custom Properties
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(resource.metadata).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-1.5 rounded-md bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800"
                    >
                      <span className="text-stone-500 font-mono text-[11px]">{key}</span>
                      <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[140px]">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Connections */}
        {activeTab === 'connections' && (
          <UnifiedConnectionsPanel
            resourceId={resource.id}
            resourceType={resource.type}
            onNavigateToResource={onNavigateToResource}
            onAddRelationClick={onAddRelationClick}
          />
        )}

        {/* Tab 3: Context */}
        {activeTab === 'context' && (
          <div className="p-4 space-y-4">
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Active Context
              </span>
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                {contextName || 'General Workspace (No active focus context)'}
              </p>
            </div>

            {contextWorkingSet.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Context Working Set ({contextWorkingSet.length})
                </span>
                <div className="space-y-1.5">
                  {contextWorkingSet.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onNavigateToResource && onNavigateToResource(item.id, item.type)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-left transition-colors"
                    >
                      <div className="p-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                        <FileText className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate flex-1">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                        {item.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Source & Provenance */}
        {activeTab === 'source' && (
          <div className="p-4 space-y-4">
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Origin & Provenance
              </span>
              <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-2">
                <div className="flex items-center justify-between text-stone-500">
                  <span>Resource ID:</span>
                  <span className="font-mono text-[10px] text-stone-700 dark:text-stone-300 select-all">
                    {resource.id}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-500">
                  <span>Data Format:</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    Markdown + Frontmatter
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-500">
                  <span>Storage Engine:</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    Offline IndexedDB / Local Vault
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: History */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Revision Timeline ({historyEntries.length})
            </span>
            {historyEntries.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400 italic">
                No past revisions recorded yet for this session.
              </div>
            ) : (
              <div className="space-y-2">
                {historyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-stone-700 dark:text-stone-300 font-medium">
                      {entry.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
