import React, { useState } from 'react';
import {
  Collection,
  CollectionPropertyDefinition,
  CollectionPropertyType,
  FormulaConfig,
  RollupConfig,
  RelationConfig,
} from '../collectionTypes';
import { FormulaEditorModal } from './FormulaEditorModal';
import { RollupEditorModal } from './RollupEditorModal';
import {
  Sliders,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Calculator,
  Layers,
  Link2,
  Check,
  X,
  Settings2,
  Tag,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  ListFilter,
  Globe,
  Database,
} from 'lucide-react';

export interface CollectionSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
  onSaveSchema: (newSchema: CollectionPropertyDefinition[]) => void;
}

const PROPERTY_TYPE_OPTIONS: { type: CollectionPropertyType; label: string; icon: any }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'select', label: 'Select (Single)', icon: ListFilter },
  { type: 'multiselect', label: 'Multi-Select', icon: Tag },
  { type: 'boolean', label: 'Checkbox', icon: ToggleLeft },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'url', label: 'URL Link', icon: Globe },
  { type: 'relation', label: 'Relation (Linked Note)', icon: Link2 },
  { type: 'formula', label: 'Formula (Calculated)', icon: Calculator },
  { type: 'rollup', label: 'Rollup (Aggregation)', icon: Layers },
];

export const CollectionSchemaModal: React.FC<CollectionSchemaModalProps> = ({
  isOpen,
  onClose,
  collection,
  onSaveSchema,
}) => {
  const [schema, setSchema] = useState<CollectionPropertyDefinition[]>(() => [...collection.schema]);

  // Modal sub-states
  const [activeFormulaProp, setActiveFormulaProp] = useState<CollectionPropertyDefinition | null>(null);
  const [activeRollupProp, setActiveRollupProp] = useState<CollectionPropertyDefinition | null>(null);

  // New property draft
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState<CollectionPropertyType>('text');

  if (!isOpen) return null;

  const handleAddProperty = () => {
    if (!newPropName.trim()) return;
    const cleanId = newPropName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');

    // Prevent duplicate ID
    let finalId = cleanId;
    let count = 1;
    while (schema.some((p) => p.id === finalId)) {
      finalId = `${cleanId}_${count++}`;
    }

    const newDef: CollectionPropertyDefinition = {
      id: finalId,
      name: newPropName.trim(),
      type: newPropType,
      options: newPropType === 'select' || newPropType === 'multiselect' ? ['Option 1', 'Option 2'] : undefined,
      relationConfig: newPropType === 'relation' ? { cardinality: 'single' } : undefined,
      formulaConfig: newPropType === 'formula' ? { expression: '1 + 1' } : undefined,
      rollupConfig: newPropType === 'rollup' ? { relationPropertyId: '', targetPropertyId: 'title', operation: 'count' } : undefined,
    };

    setSchema([...schema, newDef]);
    setNewPropName('');
  };

  const handleDeleteProperty = (id: string) => {
    setSchema(schema.filter((p) => p.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= schema.length) return;
    const copy = [...schema];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setSchema(copy);
  };

  const handleUpdateProperty = (id: string, partial: Partial<CollectionPropertyDefinition>) => {
    setSchema(schema.map((p) => (p.id === id ? { ...p, ...partial } : p)));
  };

  const handleSave = () => {
    onSaveSchema(schema);
    onClose();
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-schema-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      >
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-indigo-500" />
              <div>
                <h2 id="collection-schema-title" className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                  Collection Schema & Properties
                </h2>
                <p className="text-[11px] text-stone-400">
                  Custom properties, relations, formulas, and rollups for "{collection.name}"
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Add Property Row */}
            <div className="p-4 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 rounded-2xl flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Property Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Status, Priority, Budget"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddProperty();
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
                />
              </div>

              <div className="w-48">
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Property Type
                </label>
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
                >
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddProperty}
                disabled={!newPropName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Property
              </button>
            </div>

            {/* Properties List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                Configured Properties ({schema.length})
              </label>

              {schema.length === 0 ? (
                <div className="p-8 text-center text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-xs">
                  No properties defined yet. Add your first property above.
                </div>
              ) : (
                schema.map((prop, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === schema.length - 1;
                  const typeMeta = PROPERTY_TYPE_OPTIONS.find((t) => t.type === prop.type);
                  const Icon = typeMeta?.icon || Type;

                  return (
                    <div
                      key={prop.id}
                      className="p-3 bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-between gap-3 group"
                    >
                      {/* Left: Reorder & Icon & Details */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMove(idx, 'up')}
                            className="text-stone-400 hover:text-stone-600 disabled:opacity-20 p-0.5"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMove(idx, 'down')}
                            className="text-stone-400 hover:text-stone-600 disabled:opacity-20 p-0.5"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500">
                          <Icon className="w-4 h-4 text-indigo-500" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={prop.name}
                              onChange={(e) => handleUpdateProperty(prop.id, { name: e.target.value })}
                              className="text-xs font-semibold text-stone-900 dark:text-stone-100 bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-700 focus:border-indigo-500 focus:outline-none"
                            />
                            <span className="text-[10px] font-mono text-stone-400">
                              key: {prop.id}
                            </span>
                            {prop.isSystem && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">
                                System
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-stone-400 mt-0.5">
                            {prop.type === 'formula' && (
                              <span className="font-mono text-amber-500 truncate inline-block max-w-xs">
                                {prop.formulaConfig?.expression || 'No formula expression'}
                              </span>
                            )}
                            {prop.type === 'rollup' && (
                              <span className="font-mono text-indigo-500 truncate inline-block max-w-xs">
                                {prop.rollupConfig?.operation}({prop.rollupConfig?.targetPropertyId}) via {prop.rollupConfig?.relationPropertyId}
                              </span>
                            )}
                            {prop.type === 'relation' && (
                              <span>
                                Links to: {prop.relationConfig?.cardinality || 'single'} note
                              </span>
                            )}
                            {(prop.type === 'select' || prop.type === 'multiselect') && (
                              <span>
                                Options: {(prop.options || []).join(', ') || 'None'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        {prop.type === 'formula' && (
                          <button
                            type="button"
                            onClick={() => setActiveFormulaProp(prop)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-medium"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            Edit Formula
                          </button>
                        )}

                        {prop.type === 'rollup' && (
                          <button
                            type="button"
                            onClick={() => setActiveRollupProp(prop)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-medium"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Edit Rollup
                          </button>
                        )}

                        {!prop.isSystem && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProperty(prop.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Remove property from schema"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              Save Schema Changes
            </button>
          </div>
        </div>
      </div>

      {/* Sub Modals */}
      {activeFormulaProp && (
        <FormulaEditorModal
          isOpen={true}
          onClose={() => setActiveFormulaProp(null)}
          propertyName={activeFormulaProp.name}
          initialConfig={activeFormulaProp.formulaConfig}
          availableProperties={schema}
          onSave={(cfg) => {
            handleUpdateProperty(activeFormulaProp.id, { formulaConfig: cfg });
          }}
        />
      )}

      {activeRollupProp && (
        <RollupEditorModal
          isOpen={true}
          onClose={() => setActiveRollupProp(null)}
          propertyName={activeRollupProp.name}
          initialConfig={activeRollupProp.rollupConfig}
          availableProperties={schema}
          onSave={(cfg) => {
            handleUpdateProperty(activeRollupProp.id, { rollupConfig: cfg });
          }}
        />
      )}
    </>
  );
};
