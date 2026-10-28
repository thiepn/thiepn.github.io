import React, { useState } from 'react';
import { RollupConfig, RollupOperation, CollectionPropertyDefinition } from '../collectionTypes';
import { Layers, Check, Link2, Sigma } from 'lucide-react';

export interface RollupEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: RollupConfig) => void;
  initialConfig?: RollupConfig;
  availableProperties: CollectionPropertyDefinition[];
  propertyName: string;
}

const OPERATIONS: { id: RollupOperation; name: string; desc: string; category: string }[] = [
  { id: 'count', name: 'Count all', desc: 'Total number of linked records', category: 'General' },
  { id: 'count_non_empty', name: 'Count values', desc: 'Number of linked records with a value', category: 'General' },
  { id: 'sum', name: 'Sum', desc: 'Calculates the sum of numeric values', category: 'Math' },
  { id: 'average', name: 'Average', desc: 'Calculates the arithmetic mean', category: 'Math' },
  { id: 'min', name: 'Min', desc: 'Minimum numeric value', category: 'Math' },
  { id: 'max', name: 'Max', desc: 'Maximum numeric value', category: 'Math' },
  { id: 'earliest', name: 'Earliest Date', desc: 'Earliest date among linked records', category: 'Date' },
  { id: 'latest', name: 'Latest Date', desc: 'Latest date among linked records', category: 'Date' },
  { id: 'any', name: 'Any checked', desc: 'True if at least one record has truthy value', category: 'Logic' },
  { id: 'all', name: 'All checked', desc: 'True if every linked record has truthy value', category: 'Logic' },
  { id: 'unique_values', name: 'Unique values', desc: 'List of unique values', category: 'List' },
  { id: 'join', name: 'Join / Concatenate', desc: 'Combines values into a comma-separated string', category: 'List' },
];

export const RollupEditorModal: React.FC<RollupEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  availableProperties,
  propertyName,
}) => {
  const relationProperties = availableProperties.filter((p) => p.type === 'relation');

  const [relationPropertyId, setRelationPropertyId] = useState<string>(
    initialConfig?.relationPropertyId || relationProperties[0]?.id || ''
  );
  const [targetPropertyId, setTargetPropertyId] = useState<string>(
    initialConfig?.targetPropertyId || 'title'
  );
  const [operation, setOperation] = useState<RollupOperation>(
    initialConfig?.operation || 'count'
  );

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      relationPropertyId,
      targetPropertyId: targetPropertyId.trim(),
      operation,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rollup-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 id="rollup-editor-title" className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                Rollup Configuration for "{propertyName}"
              </h2>
              <p className="text-[11px] text-stone-400">
                Aggregate values across notes linked via a Relation
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Relation Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-500" />
              1. Source Relation Property
            </label>
            {relationProperties.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                No Relation properties exist in this Collection yet. Add a Relation property first to use rollups.
              </div>
            ) : (
              <select
                value={relationPropertyId}
                onChange={(e) => setRelationPropertyId(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
              >
                {relationProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (key: {p.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Target Property on Linked Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              2. Target Property on Linked Notes
            </label>
            <input
              type="text"
              value={targetPropertyId}
              onChange={(e) => setTargetPropertyId(e.target.value)}
              placeholder="e.g. status, budget, due, or title"
              className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Field name or YAML key on the related notes (e.g. 'title', 'status', 'due', 'spent').
            </p>
          </div>

          {/* 3. Aggregation Operation */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-1.5">
              <Sigma className="w-3.5 h-3.5 text-indigo-500" />
              3. Aggregation Calculation
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {OPERATIONS.map((op) => {
                const isSelected = operation === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setOperation(op.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-stone-800 dark:text-stone-200'}`}>
                        {op.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{op.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!relationPropertyId || !targetPropertyId.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
          >
            Save Rollup
          </button>
        </div>
      </div>
    </div>
  );
};
