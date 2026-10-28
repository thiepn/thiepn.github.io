import React, { useState, useEffect } from 'react';
import {
  Link2,
  GitFork,
  BookOpen,
  ArrowDownLeft,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { connectionIndexV2 } from '../core/connections/connectionIndex';
import { NodeConnections, ConnectionEdge } from '../core/connections/connectionTypes';
import { ResourceType } from '../core/resource/resourceCore';

interface V2ConnectionsPanelProps {
  resourceId: string;
  resourceType?: ResourceType;
  onNavigateToResource?: (id: string) => void;
}

export const V2ConnectionsPanel: React.FC<V2ConnectionsPanelProps> = ({
  resourceId,
  resourceType = 'note',
  onNavigateToResource,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'wikilinks' | 'relations' | 'citations' | 'backlinks'>('all');
  const [connections, setConnections] = useState<NodeConnections | null>(null);

  useEffect(() => {
    if (resourceId) {
      const conns = connectionIndexV2.getConnectionsFor(resourceId, resourceType as ResourceType);
      setConnections(conns);
    }
  }, [resourceId, resourceType]);

  if (!connections) return null;

  const renderEdgeItem = (edge: ConnectionEdge) => {
    const isOutgoing = edge.sourceId === resourceId;
    const targetLabel = isOutgoing
      ? edge.targetId.replace('title:', '')
      : edge.sourceId.replace('title:', '');

    let icon = <Link2 className="w-3.5 h-3.5 text-blue-500" />;
    if (edge.edgeType === 'typed_relation') icon = <GitFork className="w-3.5 h-3.5 text-purple-500" />;
    if (edge.edgeType === 'citation') icon = <BookOpen className="w-3.5 h-3.5 text-amber-500" />;
    if (edge.edgeType === 'backlink') icon = <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />;
    if (edge.edgeType === 'inferred') icon = <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;

    return (
      <div
        key={edge.id}
        onClick={() => onNavigateToResource && onNavigateToResource(isOutgoing ? edge.targetId : edge.sourceId)}
        className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-xs transition group"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {targetLabel}
          </span>
          {edge.relationLabel && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
              {edge.relationLabel}
            </span>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition" />
      </div>
    );
  };

  const getFilteredEdges = (): ConnectionEdge[] => {
    switch (activeTab) {
      case 'wikilinks':
        return connections.wikilinks;
      case 'relations':
        return connections.relations;
      case 'citations':
        return connections.citations;
      case 'backlinks':
        return connections.backlinks;
      default:
        return [...connections.outgoing, ...connections.incoming];
    }
  };

  const edges = getFilteredEdges();

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 overflow-hidden text-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs uppercase tracking-wider">
            Connections ({connections.totalCount})
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-xs px-2 pt-1 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-2.5 py-1.5 rounded-t-md font-medium transition ${activeTab === 'all' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
        >
          All ({connections.totalCount})
        </button>
        <button
          onClick={() => setActiveTab('wikilinks')}
          className={`px-2.5 py-1.5 rounded-t-md font-medium transition ${activeTab === 'wikilinks' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
        >
          Links ({connections.wikilinks.length})
        </button>
        <button
          onClick={() => setActiveTab('backlinks')}
          className={`px-2.5 py-1.5 rounded-t-md font-medium transition ${activeTab === 'backlinks' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
        >
          Backlinks ({connections.backlinks.length})
        </button>
        <button
          onClick={() => setActiveTab('relations')}
          className={`px-2.5 py-1.5 rounded-t-md font-medium transition ${activeTab === 'relations' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
        >
          Relations ({connections.relations.length})
        </button>
      </div>

      {/* Edge List */}
      <div className="p-2 max-h-60 overflow-y-auto space-y-0.5">
        {edges.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
            No connections found
          </div>
        ) : (
          edges.map(renderEdgeItem)
        )}
      </div>
    </div>
  );
};
