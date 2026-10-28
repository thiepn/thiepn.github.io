import React, { useState, useMemo } from 'react';
import {
  Clock,
  FileText,
  CheckCircle2,
  Bookmark,
  Calendar,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  Edit3,
  PlusCircle,
  Folder as FolderIcon,
} from 'lucide-react';
import { Note } from '../../../types';
import { temporalService } from '../temporalService';
import { formatFriendlyDate, getTodayDateString } from '../dateUtils';
import { TimelineActivityItem } from '../temporalTypes';

export interface TimelineViewProps {
  notes: Note[];
  onOpenNote: (noteId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ notes, onOpenNote }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const todayStr = getTodayDateString();

  // Query activities from service
  const activities = useMemo(() => {
    return temporalService.getTimelineActivities({
      resourceType: selectedResourceType,
      action: selectedAction,
      limit: 300,
    });
  }, [notes, selectedResourceType, selectedAction]);

  // Filter by search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase().trim();
    return activities.filter(
      (a) =>
        a.resourceTitle.toLowerCase().includes(q) ||
        (a.folderName || '').toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q)
    );
  }, [activities, searchQuery]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Array<{ date: string; items: TimelineActivityItem[] }> = [];
    const dateMap = new Map<string, TimelineActivityItem[]>();

    for (const item of filteredActivities) {
      const list = dateMap.get(item.date) || [];
      list.push(item);
      dateMap.set(item.date, list);
    }

    dateMap.forEach((items, date) => {
      groups.push({ date, items });
    });

    return groups;
  }, [filteredActivities]);

  const getActionIcon = (action: TimelineActivityItem['action'], resourceType: TimelineActivityItem['resourceType']) => {
    if (action === 'completed') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    }
    if (action === 'created') {
      return <PlusCircle className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (action === 'imported') {
      return <Bookmark className="w-3.5 h-3.5 text-rose-500" />;
    }
    if (resourceType === 'daily-note') {
      return <Calendar className="w-3.5 h-3.5 text-sky-500" />;
    }
    return <Edit3 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fdfdfc] dark:bg-[#131316] overflow-hidden select-none">
      {/* Top Filter Bar */}
      <div className="h-12 border-b border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between gap-3 bg-white/70 dark:bg-stone-900/70 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chronological timeline..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/70 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs">
          {/* Resource Type Filter */}
          <select
            value={selectedResourceType}
            onChange={(e) => setSelectedResourceType(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="all">All Resources</option>
            <option value="note">Notes</option>
            <option value="daily-note">Daily Notes</option>
            <option value="reference">References</option>
          </select>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="all">All Actions</option>
            <option value="created">Created</option>
            <option value="edited">Edited</option>
            <option value="imported">Imported</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {groupedByDate.length === 0 ? (
          <div className="py-16 text-center text-stone-400 dark:text-stone-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto opacity-40 text-amber-500" />
            <p className="text-sm">No activity records found matching filters.</p>
          </div>
        ) : (
          groupedByDate.map((group) => (
            <div key={group.date} className="relative pl-6 sm:pl-8 border-l border-stone-200 dark:border-stone-800">
              {/* Date Marker Node */}
              <div className="absolute -left-2 top-0.5 w-4 h-4 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center" />

              {/* Group Date Header */}
              <div className="mb-3 flex items-center gap-2">
                <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                  {formatFriendlyDate(group.date, todayStr)}
                </span>
                <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500">
                  {group.date}
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-mono">
                  {group.items.length} events
                </span>
              </div>

              {/* Event Cards */}
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.resourceId) onOpenNote(item.resourceId);
                    }}
                    className="p-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 hover:border-amber-400 dark:hover:border-amber-700/60 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0">
                        {getActionIcon(item.action, item.resourceType)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {item.resourceTitle}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 capitalize">
                            {item.action}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                          <span>{item.timeStr}</span>
                          {item.folderName && (
                            <span className="flex items-center gap-0.5">
                              <FolderIcon className="w-2.5 h-2.5" />
                              {item.folderName}
                            </span>
                          )}
                          <span className="capitalize">{item.resourceType}</span>
                        </div>
                      </div>
                    </div>

                    <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
