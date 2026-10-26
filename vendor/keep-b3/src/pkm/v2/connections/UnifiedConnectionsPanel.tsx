import React, { useState, useEffect } from 'react';
import {
  Link,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Tag,
  FileText,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { ConnectionEdge, NodeConnections } from '../core/connections/connectionTypes';
import { connectionIndexV2 } from '../core/connections/connectionIndex';
import { ResourceType } from '../core/resource/resourceCore';
import { getResourceTypeIcon } from '../shell/ResourceHeaderV2';

export interface UnifiedConnectionsPanelProps {
  resourceId: string;
  resourceType: ResourceType;
  onNavigateToResource?: (targetId: string, targetType: ResourceType) => void;
  onAddRelationClick?: () => void;
  onRemoveRelation?: (edgeId: string) => void;
  className?: string;
}

export const UnifiedConnectionsPanel: React.FC<UnifiedConnectionsPanelProps> = ({
  resourceId,
  resourceType,
  onNavigateToResource,
  onAddRelationClick,
  onRemoveRelation,
  className = '',
}) => {
  const [connections, setConnections] = useState<NodeConnections | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'links' | 'relations' | 'sources' | 'backlinks' | 'suggested'
  >('all');

  useEffect(() => {
    if (resourceId) {
      const data = connectionIndexV2.getConnectionsFor(resourceId, resourceType);
      setConnections(data);
    }
  }, [resourceId, resourceType]);

  const refreshConnections = () => {
    if (resourceId) {
      const data = connectionIndexV2.getConnectionsFor(resourceId, resourceType);
      setConnections(data);
    }
  };

  const handleRemove = (edgeId: string) => {
    connectionIndexV2.removeEdge(edgeId);
    if (onRemoveRelation) {
      onRemoveRelation(edgeId);
    }
    refreshConnections();
  };

  if (!connections) {
    return (
      <div className={`p-4 text-center text-xs text-stone-400 ${className}`}>
        Loading connections graph...
      </div>
    );
  }

  const { wikilinks, relations, citations, backlinks, inferred, totalCount } = connections;

  // Determine available tabs (hide empty groups)
  const tabs = [
    { id: 'all', label: 'All', count: totalCount },
    ...(wikilinks.length > 0 ? [{ id: 'links', label: 'Wikilinks', count: wikilinks.length }] : []),
    ...(relations.length > 0 ? [{ id: 'relations', label: 'Relations', count: relations.length }] : []),
    ...(citations.length > 0 ? [{ id: 'sources', label: 'Sources', count: citations.length }] : []),
    ...(backlinks.length > 0 ? [{ id: 'backlinks', label: 'Backlinks', count: backlinks.length }] : []),
    ...(inferred.length > 0 ? [{ id: 'suggested', label: 'Suggested', count: inferred.length }] : []),
  ];

  const getFilteredEdges = (): ConnectionEdge[] => {
    switch (activeTab) {
      case 'links':
        return wikilinks;
      case 'relations':
        return relations;
      case 'sources':
        return citations;
      case 'backlinks':
        return backlinks;
      case 'suggested':
        return inferred;
      case 'all':
      default:
        return [
          ...relations,
          ...wikilinks,
          ...citations,
          ...backlinks,
          ...inferred,
        ];
    }
  };

  const edgesToDisplay = getFilteredEdges();

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-stone-900 ${className}`}>
      {/* Header & Add Action */}
      <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-800 dark:text-stone-200">
            Connections Graph ({totalCount})
          </h3>
        </div>

        {onAddRelationClick && (
          <button
            type="button"
            onClick={onAddRelationClick}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-stone-600 dark:text-stone-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect</span>
          </button>
        )}
      </div>

      {/* Filter Tabs (Empty groups hidden) */}
      {tabs.length > 2 && (
        <div className="px-4 py-1.5 border-b border-stone-100 dark:border-stone-800/60 flex gap-1 overflow-x-auto text-[11px] scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2 py-1 rounded-md transition-colors font-medium whitespace-nowrap flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-70 px-1 py-0.2 rounded bg-stone-200/60 dark:bg-stone-700/60">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {edgesToDisplay.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Compass className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
            <p className="text-xs text-stone-400 font-medium">No connections discovered yet</p>
            {onAddRelationClick && (
              <button
                type="button"
                onClick={onAddRelationClick}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Link to another resource
              </button>
            )}
          </div>
        ) : (
          edgesToDisplay.map((edge) => {
            const isOutgoing = edge.sourceId === resourceId;
            const targetId = isOutgoing ? edge.targetId : edge.sourceId;
            const targetType = isOutgoing ? edge.targetType : edge.sourceType;

            return (
              <div
                key={edge.id}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors group flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateToResource && onNavigateToResource(targetId, targetType)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <div className="p-1 rounded bg-stone-200/60 dark:bg-stone-800 shrink-0">
                      {getResourceTypeIcon(targetType)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {targetId}
                      </span>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                        {targetType}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Relationship Badge */}
                    {edge.edgeType === 'typed_relation' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {edge.relationLabel || 'related'}
                      </span>
                    )}

                    {edge.edgeType === 'wikilink' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Link className="w-2.5 h-2.5" />
                        Wikilink
                      </span>
                    )}

                    {edge.edgeType === 'citation' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5" />
                        Citation
                      </span>
                    )}

                    {edge.edgeType === 'inferred' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Suggested
                      </span>
                    )}

                    {/* Edge Direction */}
                    {isOutgoing ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-stone-400" title="Outgoing" />
                    ) : (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-stone-400" title="Incoming Backlink" />
                    )}

                    {/* Delete button (for relations) */}
                    {edge.edgeType === 'typed_relation' && (
                      <button
                        type="button"
                        onClick={() => handleRemove(edge.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 rounded transition-opacity"
                        title="Remove connection"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Excerpt / Context Snippet Preview */}
                {edge.contextSnippet && (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900/90 p-1.5 rounded-lg border border-stone-100 dark:border-stone-800 line-clamp-2 italic font-serif">
                    "{edge.contextSnippet}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
