import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Download,
  Trash2,
  Edit2,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Filter,
  BarChart2,
} from 'lucide-react';
import { TrackingDefinition, TrackingEntry } from '../trackingTypes';
import { trackingService } from '../trackingService';
import {
  getTodayDateString,
  addDays,
} from '../../temporal/dateUtils';
import { aggregatePeriodMetrics } from '../trackingAggregationEngine';

interface TrackingHistoryModalProps {
  definition?: TrackingDefinition | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrackingHistoryModal: React.FC<TrackingHistoryModalProps> = ({
  definition,
  isOpen,
  onClose,
}) => {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  const todayStr = getTodayDateString();
  const startDateStr = useMemo(() => {
    if (selectedRange === '7d') return addDays(todayStr, -7);
    if (selectedRange === '30d') return addDays(todayStr, -30);
    if (selectedRange === '90d') return addDays(todayStr, -90);
    return '2020-01-01';
  }, [selectedRange, todayStr]);

  const allDefinitions = trackingService.getDefinitions(true);
  const [selectedDefId, setSelectedDefId] = useState<string>(
    definition?.id || allDefinitions[0]?.id || ''
  );

  const activeDef = allDefinitions.find((d) => d.id === selectedDefId);

  const allEntries = trackingService.getEntries();
  const defEntries = useMemo(() => {
    return allEntries
      .filter((e) => e.definitionId === selectedDefId && e.date >= startDateStr && e.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date) || b.timestamp - a.timestamp);
  }, [allEntries, selectedDefId, startDateStr, todayStr]);

  const metrics = useMemo(() => {
    if (!activeDef) return null;
    return aggregatePeriodMetrics(activeDef, startDateStr, todayStr, allEntries);
  }, [activeDef, startDateStr, todayStr, allEntries]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (!activeDef) return;
    const csvContent = trackingService.exportCSV(activeDef.id, {
      start: startDateStr,
      end: todayStr,
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDef.name.replace(/\s+/g, '_')}_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartEdit = (entry: TrackingEntry) => {
    setEditingEntryId(entry.id);
    setEditValue(String(entry.value));
    setEditNote(entry.note || '');
  };

  const handleSaveEdit = (entryId: string) => {
    const parsedVal =
      activeDef?.trackingType === 'completion'
        ? editValue === 'true'
        : parseFloat(editValue) || editValue;

    trackingService.updateEntry(entryId, {
      value: parsedVal,
      note: editNote.trim() || undefined,
    });
    setEditingEntryId(null);
  };

  const handleDeleteEntry = (entryId: string) => {
    trackingService.deleteEntry(entryId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Tracking History & Log
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Audit, inspect, and export canonical historical records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedDefId}
              onChange={(e) => setSelectedDefId(e.target.value)}
              className="px-2.5 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
            >
              {allDefinitions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.trackingType})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Range:</span>
            <div className="flex items-center rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selectedRange === range
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Aggregate Stats Card */}
        {metrics && (
          <div className="p-4 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Expected
              </span>
              <p className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                {metrics.expectedOccurrences} days
              </p>
            </div>

            <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Completion Rate
              </span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {Math.round(metrics.completionRate * 100)}%
              </p>
            </div>

            <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                {activeDef?.trackingType === 'duration' ? 'Total Time' : 'Total Sum'}
              </span>
              <p className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                {metrics.totalSum !== undefined
                  ? `${metrics.totalSum} ${activeDef?.unit || ''}`
                  : `${metrics.completionCount} times`}
              </p>
            </div>

            <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Average / Day
              </span>
              <p className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                {metrics.averageValue !== undefined
                  ? `${Math.round(metrics.averageValue * 10) / 10} ${activeDef?.unit || ''}`
                  : '—'}
              </p>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="p-5 flex-1 overflow-y-auto">
          {defEntries.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-xs">
              No tracking entries found for this time period.
            </div>
          ) : (
            <div className="space-y-2">
              {defEntries.map((entry) => {
                const isEditing = editingEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Calendar className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {entry.date}
                        </span>
                        <span className="text-[10px] text-zinc-400 ml-2 font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {entry.note && (
                          <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                            "{entry.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-xs bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                        />
                        <button
                          onClick={() => handleSaveEdit(entry.id)}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingEntryId(null)}
                          className="px-2 py-1 text-zinc-500 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded">
                          {entry.value === true
                            ? 'Completed'
                            : `${entry.value} ${entry.unit || activeDef?.unit || ''}`}
                        </div>
                        <button
                          onClick={() => handleStartEdit(entry)}
                          title="Edit record"
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          title="Delete record"
                          className="p-1 text-zinc-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
