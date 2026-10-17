/**
 * Phase P55: AI Trip Planner Modal
 * Generates proposal-only draft itineraries based on selected places and pacing.
 * Adheres strictly to the user-controlled records principle (no auto-booking, suggestions only).
 */

import React, { useState } from 'react';
import { Trip, Place, ItineraryEntry } from '../travelTypes';
import { travelService } from '../travelService';
import { X, Sparkles, Check, Info, Calendar, ShieldCheck, ArrowRight } from 'lucide-react';

interface AITripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  places: Place[];
  onApplyProposals: (entries: Array<{ date: string; title: string; type: ItineraryEntry['type']; placeId?: string; notes: string }>) => void;
}

export const AITripPlannerModal: React.FC<AITripPlannerModalProps> = ({
  isOpen,
  onClose,
  trip,
  places,
  onApplyProposals,
}) => {
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'intensive'>('moderate');
  const [proposals, setProposals] = useState<
    Array<{ date: string; title: string; type: ItineraryEntry['type']; placeId?: string; notes: string; selected: boolean }>
  >([]);
  const [generated, setGenerated] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!trip.startDate || !trip.endDate) {
      alert('Please ensure trip has both a start and end date configured before generating a plan.');
      return;
    }

    const generatedItems = travelService.generateAIItineraryProposal({
      tripId: trip.id,
      places,
      startDate: trip.startDate,
      endDate: trip.endDate,
      pace,
    });

    setProposals(generatedItems.map((p) => ({ ...p, selected: true })));
    setGenerated(true);
  };

  const toggleSelect = (index: number) => {
    const next = [...proposals];
    next[index].selected = !next[index].selected;
    setProposals(next);
  };

  const handleApply = () => {
    const selected = proposals.filter((p) => p.selected);
    onApplyProposals(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Draft Itinerary Proposal
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Privacy & Scope Disclaimer */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-semibold">Local Proposal Only: </span>
              Generates a spatial and temporal draft schedule from your vault places. It will not book, modify, or purchase tickets. You review and approve every stop.
            </div>
          </div>

          {!generated ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2">
                  Trip Date Span
                </label>
                <div className="px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  <span>
                    {trip.startDate || 'No start date'} → {trip.endDate || 'No end date'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2">
                  Travel Pacing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'relaxed', label: 'Relaxed', desc: '1-2 spots/day, slow meals' },
                    { id: 'moderate', label: 'Moderate', desc: '2-3 spots/day, balanced' },
                    { id: 'intensive', label: 'Intensive', desc: '4+ spots/day, full schedule' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPace(p.id as any)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        pace === p.id
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                          : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {p.label}
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-stone-500">
                  Will cluster <strong>{places.length} available places</strong> geographically to minimize transit backtracking.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 pb-1 border-b border-stone-200 dark:border-stone-800">
                <span>Proposed Activities ({proposals.filter((p) => p.selected).length} selected)</span>
                <button
                  onClick={() => setGenerated(false)}
                  className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                >
                  Adjust Parameters
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {proposals.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      item.selected
                        ? 'border-amber-500/80 bg-amber-50/30 dark:bg-amber-950/20'
                        : 'border-stone-200 dark:border-stone-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => {}}
                          className="rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-xs font-mono font-semibold text-stone-500">
                          {item.date}
                        </span>
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 capitalize">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 pl-6">
                      {item.notes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          {!generated ? (
            <button
              type="button"
              onClick={handleGenerate}
              className="px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Draft</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Adopt Selected Activities</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
