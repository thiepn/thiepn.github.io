/**
 * Phase P55: Itinerary Modal
 * Create or edit daily itinerary items with time blocks, place links, and notes.
 */

import React, { useState, useEffect } from 'react';
import { ItineraryEntry, Place } from '../travelTypes';
import { travelService } from '../travelService';
import { X, Calendar, Clock, MapPin, DollarSign, AlignLeft } from 'lucide-react';

interface ItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: ItineraryEntry) => void;
  tripId: string;
  defaultDate?: string;
  initialEntry?: ItineraryEntry | null;
  places?: Place[];
}

export const ItineraryModal: React.FC<ItineraryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tripId,
  defaultDate,
  initialEntry,
  places = [],
}) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<ItineraryEntry['type']>('place');
  const [placeId, setPlaceId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEntry) {
      setDate(initialEntry.date);
      setStartTime(initialEntry.startTime || '');
      setEndTime(initialEntry.endTime || '');
      setType(initialEntry.type);
      setPlaceId(initialEntry.placeId || '');
      setTitle(initialEntry.title);
      setNotes(initialEntry.notes || '');
      setCost(initialEntry.cost ? String(initialEntry.cost.amount) : '');
    } else {
      setDate(defaultDate || new Date().toISOString().slice(0, 10));
      setStartTime('');
      setEndTime('');
      setType('place');
      setPlaceId('');
      setTitle('');
      setNotes('');
      setCost('');
    }
    setError(null);
  }, [initialEntry, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }

    const costNum = cost ? parseFloat(cost) : undefined;
    const costPayload =
      costNum !== undefined && !isNaN(costNum) ? { amount: costNum, currency: 'USD' } : undefined;

    if (initialEntry) {
      const updated = travelService.updateItineraryEntry(initialEntry.id, {
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        type,
        placeId: placeId || undefined,
        title: title.trim(),
        notes: notes.trim() || undefined,
        cost: costPayload,
      });
      if (updated) onSave(updated);
    } else {
      const created = travelService.createItineraryEntry({
        tripId,
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        type,
        placeId: placeId || undefined,
        title: title.trim(),
        notes: notes.trim() || undefined,
        cost: costPayload,
      });
      onSave(created);
    }

    onClose();
  };

  // When place is selected, auto-fill title if empty
  const handlePlaceSelect = (selectedId: string) => {
    setPlaceId(selectedId);
    if (!title.trim() && selectedId) {
      const found = places.find((p) => p.id === selectedId);
      if (found) {
        setTitle(`Visit ${found.name}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {initialEntry ? 'Edit Itinerary Activity' : 'Add Activity / Stop'}
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

          {/* Date & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Activity Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ItineraryEntry['type'])}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="place">Sight / Attraction / Visit</option>
                <option value="meal">Meal / Dining</option>
                <option value="transit">Transit / Transfer</option>
                <option value="lodging">Lodging / Check-in</option>
                <option value="activity">Tour / Experience</option>
                <option value="note">Free Time / Note</option>
              </select>
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Start Time (Optional)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                End Time (Optional)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Linked Place */}
          {places.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Linked Place
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <select
                  value={placeId}
                  onChange={(e) => handlePlaceSelect(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">None (Custom Activity)</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Activity Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning walk through bamboo grove"
              className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              required
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Estimated Cost / Admission (Optional)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="number"
                step="any"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 15.00"
                className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Notes / Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tickets already booked, entrance via north gate, photography allowed."
              className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Footer */}
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
              {initialEntry ? 'Save Changes' : 'Add to Day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
