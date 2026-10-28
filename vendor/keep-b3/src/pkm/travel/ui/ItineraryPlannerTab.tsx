/**
 * Phase P55: Itinerary & Day Planner Tab
 * Day-by-day chronological activity schedule with time blocks, conflict detection, and reordering.
 */

import React, { useState } from 'react';
import { Trip, Place, ItineraryEntry, Reservation } from '../travelTypes';
import { travelService } from '../travelService';
import {
  sortItineraryEntries,
  groupItineraryByDate,
  generateDateRange,
  detectItineraryConflicts,
} from '../travelCalculations';
import {
  Calendar,
  Clock,
  Plus,
  MapPin,
  Sparkles,
  AlertTriangle,
  FileDown,
  Share2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  DollarSign,
  Utensils,
  Plane,
  Building2,
  Compass,
} from 'lucide-react';

interface ItineraryPlannerTabProps {
  trips: Trip[];
  places: Place[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
  onOpenItineraryModal: (tripId: string, date?: string, entry?: ItineraryEntry) => void;
  onOpenAIPlanner: (trip: Trip) => void;
  onExportMarkdown: (tripId: string) => void;
  onExportICS: (tripId: string) => void;
  onRefresh: () => void;
}

export const ItineraryPlannerTab: React.FC<ItineraryPlannerTabProps> = ({
  trips,
  places,
  selectedTripId,
  onSelectTrip,
  onOpenItineraryModal,
  onOpenAIPlanner,
  onExportMarkdown,
  onExportICS,
  onRefresh,
}) => {
  const currentTripId = selectedTripId || trips[0]?.id || '';
  const currentTrip = trips.find((t) => t.id === currentTripId);

  const [activeDateTab, setActiveDateTab] = useState<string>('all');

  const placeMap = new Map<string, Place>(places.map((p) => [p.id, p]));

  if (!currentTrip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Calendar className="w-12 h-12 text-stone-300 dark:text-stone-700 mb-3" />
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
          No Trip Selected
        </h3>
        <p className="text-xs text-stone-500 max-w-sm mt-1">
          Select or create a trip to start planning your day-by-day itinerary.
        </p>
      </div>
    );
  }

  const allEntries = travelService.getItinerary(currentTrip.id);
  const tripDates = generateDateRange(currentTrip.startDate, currentTrip.endDate);
  const groupedByDate = groupItineraryByDate(allEntries);
  const conflicts = detectItineraryConflicts(allEntries);

  // Filter entries if specific date tab selected
  const displayedDates =
    activeDateTab === 'all'
      ? Array.from(new Set([...tripDates, ...Object.keys(groupedByDate)])).sort()
      : [activeDateTab];

  const handleToggleComplete = (entry: ItineraryEntry) => {
    travelService.updateItineraryEntry(entry.id, { isCompleted: !entry.isCompleted });
    onRefresh();
  };

  const handleMoveOrder = (entry: ItineraryEntry, direction: 'up' | 'down') => {
    const dayEntries = groupedByDate[entry.date] || [];
    const idx = dayEntries.findIndex((e) => e.id === entry.id);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const prev = dayEntries[idx - 1];
      const orderedIds = dayEntries.map((e) => e.id);
      orderedIds[idx - 1] = entry.id;
      orderedIds[idx] = prev.id;
      travelService.reorderItineraryDay(currentTrip.id, entry.date, orderedIds);
      onRefresh();
    } else if (direction === 'down' && idx < dayEntries.length - 1) {
      const next = dayEntries[idx + 1];
      const orderedIds = dayEntries.map((e) => e.id);
      orderedIds[idx + 1] = entry.id;
      orderedIds[idx] = next.id;
      travelService.reorderItineraryDay(currentTrip.id, entry.date, orderedIds);
      onRefresh();
    }
  };

  const getActivityIcon = (type: ItineraryEntry['type']) => {
    switch (type) {
      case 'meal':
        return <Utensils className="w-3.5 h-3.5 text-orange-500" />;
      case 'transport':
        return <Plane className="w-3.5 h-3.5 text-blue-500" />;
      case 'reservation':
        return <Building2 className="w-3.5 h-3.5 text-teal-500" />;
      case 'activity':
        return <Compass className="w-3.5 h-3.5 text-purple-500" />;
      case 'place':
      default:
        return <MapPin className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Selector & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Trip Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 shrink-0">
            Trip:
          </label>
          <select
            value={currentTrip.id}
            onChange={(e) => onSelectTrip(e.target.value)}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.startDate || 'TBD'})
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAIPlanner(currentTrip)}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 hover:text-amber-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Draft Plan</span>
          </button>
          <button
            onClick={() => onExportMarkdown(currentTrip.id)}
            title="Export Markdown"
            className="p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-xl transition-colors"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExportICS(currentTrip.id)}
            title="Export .ics Calendar"
            className="p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-xl transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              onOpenItineraryModal(
                currentTrip.id,
                activeDateTab !== 'all' ? activeDateTab : currentTrip.startDate
              )
            }
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Conflicts Alert Banner */}
      {conflicts.length > 0 && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Overlapping Time Slots Detected: </span>
            {conflicts.map((c, i) => (
              <span key={i} className="inline-block mr-2">
                • {c.date}: "{c.entryA.title}" ({c.entryA.startTime}-{c.entryA.endTime}) overlaps with "{c.entryB.title}" ({c.entryB.startTime}-{c.entryB.endTime})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Date Span Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveDateTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeDateTab === 'all'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
          }`}
        >
          All Days ({allEntries.length})
        </button>

        {tripDates.map((date, idx) => {
          const count = groupedByDate[date]?.length || 0;
          return (
            <button
              key={date}
              onClick={() => setActiveDateTab(date)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeDateTab === date
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
              }`}
            >
              <span>
                Day {idx + 1} ({date.slice(5)})
              </span>
              {count > 0 && (
                <span className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/10 text-[10px] flex items-center justify-center font-mono">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day by Day Chronological Sections */}
      <div className="space-y-6">
        {displayedDates.map((dateStr, dayIdx) => {
          const dayEntries = groupedByDate[dateStr] || [];

          return (
            <div
              key={dateStr}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 md:p-5 space-y-3"
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                    {dayIdx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </h4>
                  </div>
                </div>

                <button
                  onClick={() => onOpenItineraryModal(currentTrip.id, dateStr)}
                  className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Stop</span>
                </button>
              </div>

              {/* Day Entries List */}
              <div className="space-y-2">
                {dayEntries.map((item, idx) => {
                  const place = item.placeId ? placeMap.get(item.placeId) : null;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        item.isCompleted
                          ? 'bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-800/60 opacity-60'
                          : 'bg-stone-50/50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700/80 hover:border-amber-500/50'
                      }`}
                    >
                      {/* Left: Time & Activity */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(item)}
                          className="mt-0.5 text-stone-400 hover:text-amber-500 transition-colors"
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.startTime ? (
                              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                                <Clock className="w-3 h-3" />
                                {item.startTime}
                                {item.endTime ? ` - ${item.endTime}` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-400 font-mono">Anytime</span>
                            )}

                            <span className="flex items-center gap-1">
                              {getActivityIcon(item.type)}
                              <span
                                className={`text-xs font-bold ${
                                  item.isCompleted
                                    ? 'line-through text-stone-500'
                                    : 'text-stone-900 dark:text-stone-100'
                                }`}
                              >
                                {item.title}
                              </span>
                            </span>
                          </div>

                          {place && (
                            <div className="flex items-center gap-1 text-[11px] text-stone-500 mt-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span>{place.name}</span>
                              {place.address && <span className="opacity-75">• {place.address}</span>}
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Cost & Reorder & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200 dark:border-stone-800">
                        {item.cost !== undefined && (
                          <span className="text-xs font-mono font-semibold text-stone-600 dark:text-stone-400">
                            ${item.cost}
                          </span>
                        )}

                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleMoveOrder(item, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-20"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(item, 'down')}
                            disabled={idx === dayEntries.length - 1}
                            className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-20"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenItineraryModal(currentTrip.id, dateStr, item)}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              travelService.deleteItineraryEntry(item.id);
                              onRefresh();
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {dayEntries.length === 0 && (
                  <div className="text-center py-6 text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                    No activities scheduled for this day yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
