/**
 * Phase P55: Packing Checklist Tab
 * Categorized packing list with progress metrics, essential item alerts, and template integration.
 */

import React, { useState } from 'react';
import { Trip, TripPackingItem } from '../travelTypes';
import { travelService } from '../travelService';
import { calculatePackingMetrics } from '../travelCalculations';

export type PackingCategory =
  | 'Clothes'
  | 'Toiletries'
  | 'Electronics'
  | 'Documents'
  | 'Medication'
  | 'Gear'
  | 'Other';
import {
  CheckSquare,
  Square,
  Plus,
  Layers,
  AlertCircle,
  Sparkles,
  Trash2,
  Star,
  Shirt,
  Briefcase,
  Smartphone,
  FileText,
  Pill,
  Compass,
  CheckCircle2,
} from 'lucide-react';

interface PackingChecklistTabProps {
  trips: Trip[];
  selectedTripId?: string;
  onSelectTrip: (tripId: string) => void;
  onOpenTemplateModal: (tripId: string) => void;
  onRefresh: () => void;
}

export const PackingChecklistTab: React.FC<PackingChecklistTabProps> = ({
  trips,
  selectedTripId,
  onSelectTrip,
  onOpenTemplateModal,
  onRefresh,
}) => {
  const currentTripId = selectedTripId || trips[0]?.id || '';
  const currentTrip = trips.find((t) => t.id === currentTripId);

  const [filterMode, setFilterMode] = useState<'all' | 'unpacked' | 'essential'>('all');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<PackingCategory>('Clothes');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemEssential, setNewItemEssential] = useState(false);

  if (!currentTrip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <CheckSquare className="w-12 h-12 text-stone-300 dark:text-stone-700 mb-3" />
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
          No Trip Selected
        </h3>
        <p className="text-xs text-stone-500 max-w-sm mt-1">
          Select a trip to view, customize, and check off your packing list.
        </p>
      </div>
    );
  }

  const items = travelService.getTripPackingItems(currentTrip.id);
  const metrics = calculatePackingMetrics(items);

  const filteredItems = items.filter((item) => {
    if (filterMode === 'unpacked' && item.isPacked) return false;
    if (filterMode === 'essential' && !item.isEssential) return false;
    return true;
  });

  // Group by category
  const categories: PackingCategory[] = [
    'Clothes',
    'Toiletries',
    'Electronics',
    'Documents',
    'Medication',
    'Gear',
    'Other',
  ];

  const grouped = categories.map((cat) => ({
    category: cat,
    items: filteredItems.filter((i) => i.category === cat),
  }));

  const handleTogglePacked = (item: TripPackingItem) => {
    travelService.updateTripPackingItem(item.id, { isPacked: !item.isPacked });
    onRefresh();
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    travelService.addTripPackingItem({
      tripId: currentTrip.id,
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: newItemQty > 0 ? newItemQty : 1,
      isPacked: false,
      isEssential: newItemEssential,
    });

    setNewItemName('');
    setNewItemQty(1);
    setNewItemEssential(false);
    onRefresh();
  };

  const handleResetPacking = () => {
    if (confirm('Uncheck all items on this packing list?')) {
      const current = travelService.getTripPackingItems(currentTrip.id);
      current.forEach((it) => {
        if (it.isPacked) {
          travelService.updateTripPackingItem(it.id, { isPacked: false });
        }
      });
      onRefresh();
    }
  };

  const getCategoryIcon = (category: PackingCategory) => {
    switch (category) {
      case 'Clothes':
        return <Shirt className="w-3.5 h-3.5 text-blue-500" />;
      case 'Toiletries':
        return <Briefcase className="w-3.5 h-3.5 text-teal-500" />;
      case 'Electronics':
        return <Smartphone className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Documents':
        return <FileText className="w-3.5 h-3.5 text-amber-500" />;
      case 'Medication':
        return <Pill className="w-3.5 h-3.5 text-rose-500" />;
      case 'Gear':
        return <Compass className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <CheckSquare className="w-3.5 h-3.5 text-stone-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Trip Switcher */}
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
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Template & Reset Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenTemplateModal(currentTrip.id)}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Templates</span>
          </button>
          <button
            onClick={handleResetPacking}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-400 rounded-xl text-xs font-medium transition-colors"
          >
            Reset Checks
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="p-4 md:p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Packing Readiness
            </h3>
            <p className="text-xs text-stone-500">
              {metrics.packed} of {metrics.total} items packed
            </p>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {metrics.percentage}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${metrics.percentage}%` }}
          />
        </div>

        {/* Essential items alert if unpacked */}
        {metrics.unpackedEssentials.length > 0 && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              <strong>{metrics.unpackedEssentials.length} essential items</strong> still unpacked (e.g. passport, medications, chargers).
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All Items (${metrics.total})` },
          { id: 'unpacked', label: `Unpacked (${metrics.unpacked})` },
          { id: 'essential', label: `Essentials (${items.filter((i) => i.isEssential).length})` },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilterMode(item.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filterMode === item.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Add Item Inline Bar */}
      <form
        onSubmit={handleAddItem}
        className="p-3 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-2xl flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add packing item (e.g. Universal power adapter)..."
          className="flex-1 min-w-[180px] px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400"
          required
        />
        <select
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value as PackingCategory)}
          className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={newItemQty}
          onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
          className="w-14 px-2 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-center"
        />
        <label className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={newItemEssential}
            onChange={(e) => setNewItemEssential(e.target.checked)}
            className="rounded border-stone-300 text-amber-500 focus:ring-amber-500"
          />
          <span>Essential</span>
        </label>
        <button
          type="submit"
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Categorized Checklist Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped
          .filter((g) => g.items.length > 0)
          .map((group) => (
            <div
              key={group.category}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-2.5"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(group.category)}
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {group.category}
                  </h4>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">
                  {group.items.filter((i) => i.isPacked).length}/{group.items.length}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                      item.isPacked
                        ? 'bg-stone-50/50 dark:bg-stone-800/30 opacity-60'
                        : 'bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div
                      onClick={() => handleTogglePacked(item)}
                      className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                    >
                      {item.isPacked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 shrink-0" />
                      )}

                      <span
                        className={`font-medium ${
                          item.isPacked
                            ? 'line-through text-stone-400'
                            : 'text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        {item.name}
                      </span>

                      {item.quantity > 1 && (
                        <span className="text-[10px] font-mono text-stone-400">
                          x{item.quantity}
                        </span>
                      )}

                      {item.isEssential && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                          ESSENTIAL
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        travelService.deleteTripPackingItem(item.id);
                        onRefresh();
                      }}
                      className="p-1 text-stone-300 hover:text-rose-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {metrics.total === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
            <CheckSquare className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              Packing list is empty
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              Apply a template or add packing items for your trip to ensure nothing is forgotten.
            </p>
            <button
              onClick={() => onOpenTemplateModal(currentTrip.id)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Choose Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
