import React, { useState, useMemo } from 'react';
import {
  Clock,
  Filter,
  CheckCircle2,
  FileText,
  GitCommit,
  Layers,
  Sparkles,
  Shield,
  Search,
  ChevronRight,
  ArrowRight,
  Calendar,
  AlertCircle,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { ActivityEvent, ActivityDomain, ActivityEventType, globalActivityEngine } from '../activity';

interface ActivityTimelineViewProps {
  initialContextId?: string;
  onOpenResource?: (resourceId: string, resourceType: string) => void;
}

export const ActivityTimelineView: React.FC<ActivityTimelineViewProps> = ({
  initialContextId,
  onOpenResource,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<ActivityDomain | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const domains: Array<{ id: ActivityDomain | 'all'; label: string }> = [
    { id: 'all', label: 'All Activity' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'core', label: 'Notes' },
    { id: 'projects', label: 'Projects' },
    { id: 'decisions', label: 'Decisions' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'routines', label: 'Routines' },
  ];

  const queryResult = useMemo(() => {
    return globalActivityEngine.query({
      domains: selectedDomain !== 'all' ? [selectedDomain] : undefined,
      contextId: initialContextId,
      searchQuery: searchQuery.trim() || undefined,
      limit: page * pageSize,
    });
  }, [selectedDomain, initialContextId, searchQuery, page]);

  // Group events by Relative Time Section
  const groupedEvents = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const groups: { title: string; events: ActivityEvent[] }[] = [
      { title: 'Today', events: [] },
      { title: 'Yesterday', events: [] },
      { title: 'This Week', events: [] },
      { title: 'Earlier', events: [] },
    ];

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    for (const ev of queryResult.events) {
      const evDate = ev.timestamp.slice(0, 10);
      if (evDate === todayStr) {
        groups[0].events.push(ev);
      } else if (evDate === yesterday) {
        groups[1].events.push(ev);
      } else if (evDate >= weekAgo) {
        groups[2].events.push(ev);
      } else {
        groups[3].events.push(ev);
      }
    }

    return groups.filter(g => g.events.length > 0);
  }, [queryResult.events]);

  const renderEventIcon = (type: ActivityEventType) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'resource_created':
        return <FileText className="w-4 h-4 text-sky-500" />;
      case 'resource_edited':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'decision_made':
      case 'decision_resolved':
        return <GitCommit className="w-4 h-4 text-purple-500" />;
      case 'review_completed':
        return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'routine_completed':
        return <Sparkles className="w-4 h-4 text-teal-500" />;
      case 'resource_archived':
        return <Archive className="w-4 h-4 text-zinc-500" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-zinc-100">Activity Timeline</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {queryResult.totalMatching} events
            </span>
          </div>
          
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter activity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {domains.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDomain(d.id)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedDomain === d.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {groupedEvents.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-sm font-medium">No activity recorded for this criteria</p>
            <p className="text-xs text-zinc-600">Meaningful actions will automatically appear here as you work.</p>
          </div>
        ) : (
          groupedEvents.map(group => (
            <div key={group.title} className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{group.title}</span>
              </div>

              <div className="space-y-1.5">
                {group.events.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => ev.resource && onOpenResource?.(ev.resource.id, ev.resource.type)}
                    className="group flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/60 hover:border-zinc-700/80 transition-all cursor-pointer"
                  >
                    <div className="mt-0.5 p-1.5 rounded-md bg-zinc-800/80 border border-zinc-700/40">
                      {renderEventIcon(ev.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                          {ev.summary.primaryTitle}
                        </span>
                        <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {ev.summary.deltaSummary && (
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {ev.summary.deltaSummary}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                        <span className="capitalize">{ev.domain}</span>
                        {ev.actor !== 'user' && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-400 font-medium">via {ev.actor}</span>
                          </>
                        )}
                        {ev.editCount && ev.editCount > 1 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400/90 font-medium">{ev.editCount} edits</span>
                          </>
                        )}
                      </div>
                    </div>

                    {ev.resource && (
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all self-center" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {queryResult.hasMore && (
          <div className="text-center pt-2">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Load More Activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
