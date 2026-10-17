/**
 * Phase P55: Packing Template Modal
 * Create, edit, and apply packing templates to trips.
 */

import React, { useState } from 'react';
import { PackingTemplate, PackingTemplateItem } from '../travelTypes';
import { travelService } from '../travelService';
import { X, Plus, Trash2, CheckSquare, Sparkles, Layers } from 'lucide-react';

interface PackingTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  onApplied?: (count: number) => void;
}

export const PackingTemplateModal: React.FC<PackingTemplateModalProps> = ({
  isOpen,
  onClose,
  tripId,
  onApplied,
}) => {
  const [templates, setTemplates] = useState<PackingTemplate[]>(() => travelService.getPackingTemplates());
  const [selectedTmplId, setSelectedTmplId] = useState<string>(templates[0]?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplDesc, setNewTmplDesc] = useState('');

  // New item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('Clothes');
  const [newItemQty, setNewItemQty] = useState(1);

  if (!isOpen) return null;

  const currentTemplate = templates.find((t) => t.id === selectedTmplId);

  const handleApplyToTrip = () => {
    if (!tripId || !selectedTmplId) return;
    const added = travelService.instantiatePackingTemplate(tripId, selectedTmplId);
    if (onApplied) onApplied(added);
    onClose();
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim()) return;

    const created = travelService.createPackingTemplate({
      name: newTmplName.trim(),
      description: newTmplDesc.trim() || undefined,
      items: [],
    });

    const updated = travelService.getPackingTemplates();
    setTemplates(updated);
    setSelectedTmplId(created.id);
    setIsCreatingNew(false);
    setNewTmplName('');
    setNewTmplDesc('');
  };

  const handleAddItemToCurrentTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !currentTemplate) return;

    const newItem: PackingTemplateItem = {
      id: `ti-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: newItemName.trim(),
      category: newItemCategory,
      defaultQuantity: newItemQty > 0 ? newItemQty : 1,
      defaultIncluded: true,
    };

    const updatedItems = [...currentTemplate.items, newItem];
    travelService.updatePackingTemplate(currentTemplate.id, { items: updatedItems });
    setTemplates(travelService.getPackingTemplates());

    setNewItemName('');
    setNewItemQty(1);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!currentTemplate) return;
    const updatedItems = currentTemplate.items.filter((i) => i.id !== itemId);
    travelService.updatePackingTemplate(currentTemplate.id, { items: updatedItems });
    setTemplates(travelService.getPackingTemplates());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Packing Checklist Templates
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Template Selector */}
          <div className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Templates</span>
              <button
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {isCreatingNew ? (
              <form onSubmit={handleCreateTemplate} className="space-y-2 p-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <input
                  type="text"
                  value={newTmplName}
                  onChange={(e) => setNewTmplName(e.target.value)}
                  placeholder="Template Name"
                  className="w-full px-2 py-1 text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg"
                  required
                />
                <input
                  type="text"
                  value={newTmplDesc}
                  onChange={(e) => setNewTmplDesc(e.target.value)}
                  placeholder="Short description"
                  className="w-full px-2 py-1 text-xs bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg"
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-2 py-0.5 text-[10px] text-stone-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-0.5 text-[10px] font-semibold bg-amber-500 text-white rounded"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : null}

            <div className="flex-1 overflow-y-auto space-y-1">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTmplId(tmpl.id)}
                  className={`w-full text-left p-2 rounded-xl text-xs transition-colors ${
                    selectedTmplId === tmpl.id
                      ? 'bg-amber-500 text-white font-semibold'
                      : 'hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="truncate">{tmpl.name}</div>
                  <div className={`text-[10px] opacity-80 truncate`}>
                    {tmpl.items.length} items
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Selected Template Items */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {currentTemplate ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {currentTemplate.name}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {currentTemplate.description || 'Pre-configured packing list'}
                    </p>
                  </div>

                  {tripId && (
                    <button
                      onClick={handleApplyToTrip}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Instantiate to Trip</span>
                    </button>
                  )}
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {currentTemplate.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {item.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-[10px] text-stone-600 dark:text-stone-400">
                          {item.category}
                        </span>
                        {item.defaultQuantity > 1 && (
                          <span className="text-stone-500 font-mono text-[11px]">
                            x{item.defaultQuantity}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-stone-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {currentTemplate.items.length === 0 && (
                    <div className="text-center py-8 text-xs text-stone-400">
                      No items in this template yet. Add some below!
                    </div>
                  )}
                </div>

                {/* Quick Add Item */}
                <form onSubmit={handleAddItemToCurrentTemplate} className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="New item name..."
                    className="flex-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400"
                    required
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="px-2 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                  >
                    <option value="Clothes">Clothes</option>
                    <option value="Toiletries">Toiletries</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Documents">Documents</option>
                    <option value="Medication">Medication</option>
                    <option value="Gear">Gear</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                    className="w-14 px-2 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-center"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Add
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-stone-400">
                Select or create a template
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
