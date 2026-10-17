/**
 * Phase P55: Trip Modal
 * Create or edit trips with dates, timezones, status, destinations, and metadata.
 */

import React, { useState, useEffect } from 'react';
import { Trip, TripStatus, Place } from '../travelTypes';
import { travelService } from '../travelService';
import { X, Calendar, MapPin, Globe, DollarSign, Tag, FileText } from 'lucide-react';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trip: Trip) => void;
  initialTrip?: Trip | null;
  availablePlaces?: Place[];
}

export const TripModal: React.FC<TripModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTrip,
  availablePlaces = [],
}) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TripStatus>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [homeTimezone, setHomeTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [budgetPlanned, setBudgetPlanned] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTrip) {
      setTitle(initialTrip.title);
      setStatus(initialTrip.status);
      setStartDate(initialTrip.startDate || '');
      setEndDate(initialTrip.endDate || '');
      setTimezone(initialTrip.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setHomeTimezone(initialTrip.homeTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setSelectedPlaceIds(initialTrip.destinationPlaceIds || []);
      setBudgetPlanned(initialTrip.budgetPlanned ? String(initialTrip.budgetPlanned.amount) : '');
      setTagsInput(initialTrip.tags.join(', '));
      setSummaryNotes(initialTrip.summaryNotes || '');
    } else {
      setTitle('');
      setStatus('planning');
      setStartDate('');
      setEndDate('');
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setHomeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setSelectedPlaceIds([]);
      setBudgetPlanned('');
      setTagsInput('');
      setSummaryNotes('');
    }
    setError(null);
  }, [initialTrip, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Trip title is required.');
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const budgetNum = budgetPlanned ? parseFloat(budgetPlanned) : undefined;
    const budgetPayload =
      budgetNum !== undefined && !isNaN(budgetNum) ? { amount: budgetNum, currency: 'USD' } : undefined;

    if (initialTrip) {
      const updated = travelService.updateTrip(initialTrip.id, {
        title: title.trim(),
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        timezone,
        homeTimezone,
        destinationPlaceIds: selectedPlaceIds,
        budgetPlanned: budgetPayload,
        tags,
        summaryNotes: summaryNotes.trim() || undefined,
      });
      if (updated) onSave(updated);
    } else {
      const created = travelService.createTrip({
        title: title.trim(),
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        timezone,
        homeTimezone,
        destinationPlaceIds: selectedPlaceIds,
        budgetPlanned: budgetPayload,
        tags,
        summaryNotes: summaryNotes.trim() || undefined,
      });
      onSave(created);
    }

    onClose();
  };

  const togglePlace = (placeId: string) => {
    if (selectedPlaceIds.includes(placeId)) {
      setSelectedPlaceIds(selectedPlaceIds.filter((id) => id !== placeId));
    } else {
      setSelectedPlaceIds([...selectedPlaceIds, placeId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {initialTrip ? 'Edit Trip' : 'Create New Trip'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Trip Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kyoto Autumn Journey 2026"
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              required
            />
          </div>

          {/* Status & Planned Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TripStatus)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="planning">Planning (Draft)</option>
                <option value="booked">Booked (Confirmed)</option>
                <option value="in_progress">In Progress (Active)</option>
                <option value="completed">Completed (Memories/Review)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Planned Budget
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={budgetPlanned}
                  onChange={(e) => setBudgetPlanned(e.target.value)}
                  placeholder="Total budget target"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                End Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Timezones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Destination Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Tokyo"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Home Timezone
              </label>
              <input
                type="text"
                value={homeTimezone}
                onChange={(e) => setHomeTimezone(e.target.value)}
                placeholder="e.g. America/New_York"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Destinations / Places Linkage */}
          {availablePlaces.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Primary Destinations & Places
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl max-h-32 overflow-y-auto">
                {availablePlaces.map((p) => {
                  const isSelected = selectedPlaceIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlace(p.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-white dark:bg-amber-600'
                          : 'bg-stone-200/80 dark:bg-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Tags (comma separated)
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vacation, solo, japan, nature"
                className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Summary / Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Overview & Key Reference Notes
            </label>
            <textarea
              rows={3}
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="Important trip background, embassy contacts, visa rules, packing notes..."
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl shadow-sm transition-colors"
            >
              {initialTrip ? 'Save Changes' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
