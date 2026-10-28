import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Note, Folder } from '../../../types';
import {
  Collection,
  CollectionPropertyDefinition,
  CollectionView,
  CollectionRecord,
} from '../collectionTypes';
import { collectionService } from '../collectionService';
import { setPropertyInContent } from '../../properties/frontmatterEngine';
import { setRelationInNoteContent, resolveRelationTargets } from '../relationEngine';
import { RelationPickerModal } from './RelationPickerModal';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  Link2,
  Plus,
  Trash2,
  AlertCircle,
  MoreHorizontal,
  MoveRight,
  FolderInput,
} from 'lucide-react';

export interface CollectionTableViewProps {
  collection: Collection;
  view: CollectionView;
  records: CollectionRecord[];
  allNotes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onSaveNote: (updatedNote: Note) => void;
  onUpdateView: (updatedView: CollectionView) => void;
  onBulkTrashNotes?: (noteIds: string[]) => void;
}

export const CollectionTableView: React.FC<CollectionTableViewProps> = ({
  collection,
  view,
  records,
  allNotes,
  folders,
  onOpenNote,
  onSaveNote,
  onUpdateView,
  onBulkTrashNotes,
}) => {
  // Multi-row selection
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Active editing cell: { noteId: string, propertyId: string }
  const [editingCell, setEditingCell] = useState<{ noteId: string; propertyId: string } | null>(null);
  const [editValue, setEditValue] = useState<any>('');

  // Relation Picker Modal State
  const [relationModal, setRelationModal] = useState<{
    isOpen: boolean;
    note: Note | null;
    property: CollectionPropertyDefinition | null;
  }>({
    isOpen: false,
    note: null,
    property: null,
  });

  // Visible Columns
  const visibleProps = useMemo(() => {
    const titleProp: CollectionPropertyDefinition = {
      id: 'title',
      name: 'Title',
      type: 'title',
      isSystem: true,
    };
    const schemaMap = new Map<string, CollectionPropertyDefinition>(
      collection.schema.map((s) => [s.id, s])
    );
    const result: CollectionPropertyDefinition[] = [titleProp];

    for (const propId of view.visiblePropertyIds) {
      if (propId === 'title') continue;
      const found = schemaMap.get(propId);
      if (found) {
        result.push(found);
      }
    }
    return result;
  }, [collection.schema, view.visiblePropertyIds]);

  // Bulk selection helpers
  const allSelected = records.length > 0 && selectedNoteIds.length === records.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(records.map((r) => r.note.id));
    }
  };

  const toggleSelectRow = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedNoteIds.includes(noteId)) {
      setSelectedNoteIds(selectedNoteIds.filter((id) => id !== noteId));
    } else {
      setSelectedNoteIds([...selectedNoteIds, noteId]);
    }
  };

  // Start cell editing
  const startEditing = (note: Note, prop: CollectionPropertyDefinition, initialVal: any) => {
    if (prop.isSystem || prop.type === 'formula' || prop.type === 'rollup') return;

    if (prop.type === 'relation') {
      setRelationModal({
        isOpen: true,
        note,
        property: prop,
      });
      return;
    }

    if (prop.type === 'boolean') {
      // Direct toggle
      const newVal = !initialVal;
      savePropertyValue(note, prop.id, newVal, prop.type);
      return;
    }

    setEditingCell({ noteId: note.id, propertyId: prop.id });
    setEditValue(initialVal ?? '');
  };

  // Save property value to canonical note
  const savePropertyValue = (note: Note, propertyKey: string, val: any, propType: string) => {
    if (propertyKey === 'title') {
      if (val !== note.title && String(val).trim()) {
        onSaveNote({
          ...note,
          title: String(val).trim(),
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      const newContent = setPropertyInContent(
        note.content || '',
        propertyKey,
        val,
        propType as any
      );
      onSaveNote({
        ...note,
        content: newContent,
        updatedAt: new Date().toISOString(),
      });
    }
    setEditingCell(null);
  };

  const handleRelationSelect = (targetNoteIds: string[]) => {
    if (!relationModal.note || !relationModal.property) return;
    const note = relationModal.note;
    const prop = relationModal.property;
    const cardinality = prop.relationConfig?.cardinality || 'many';

    const newContent = setRelationInNoteContent(
      note.content || '',
      prop.id,
      targetNoteIds,
      allNotes,
      cardinality
    );

    onSaveNote({
      ...note,
      content: newContent,
      updatedAt: new Date().toISOString(),
    });
  };

  // Column width helper
  const getColWidth = (propId: string) => {
    if (view.columnWidths && view.columnWidths[propId]) {
      return view.columnWidths[propId];
    }
    if (propId === 'title') return 240;
    return 140;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-stone-900 overflow-hidden relative">
      {/* Bulk Action Bar (when rows are selected) */}
      {selectedNoteIds.length > 0 && (
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-2.5 bg-indigo-600 text-white shadow-md animate-in slide-in-from-top duration-150 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4" />
            <span>
              {selectedNoteIds.length} {selectedNoteIds.length === 1 ? 'note' : 'notes'} selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onBulkTrashNotes) {
                  onBulkTrashNotes(selectedNoteIds);
                  setSelectedNoteIds([]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/80 hover:bg-rose-600 rounded-lg text-white font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Move to Trash
            </button>
            <button
              type="button"
              onClick={() => setSelectedNoteIds([])}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse border-spacing-0 text-xs">
          {/* Table Header */}
          <thead className="sticky top-0 z-20 bg-stone-50 dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 shadow-xs">
            <tr>
              {/* Row Select Checkbox Column */}
              <th className="w-10 px-3 py-2.5 text-center border-r border-stone-200/60 dark:border-stone-800/60 bg-stone-50 dark:bg-stone-850">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>

              {visibleProps.map((prop) => {
                const width = getColWidth(prop.id);
                return (
                  <th
                    key={prop.id}
                    style={{ width: `${width}px`, minWidth: `${width}px` }}
                    className="px-3.5 py-2.5 font-semibold text-stone-600 dark:text-stone-300 border-r border-stone-200/60 dark:border-stone-800/60 select-none group"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate">{prop.name}</span>
                      {prop.type === 'formula' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono">
                          fx
                        </span>
                      )}
                      {prop.type === 'rollup' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
                          rollup
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {records.length === 0 ? (
              <tr>
                <td colSpan={visibleProps.length + 1} className="py-16 text-center text-stone-400">
                  <FileText className="w-8 h-8 stroke-1 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                  <p className="text-xs font-medium">No records match the active collection filters</p>
                </td>
              </tr>
            ) : (
              records.map((record, rowIndex) => {
                const isSelected = selectedNoteIds.includes(record.note.id);

                return (
                  <tr
                    key={record.note.id}
                    className={`transition-colors group hover:bg-stone-50/80 dark:hover:bg-stone-850/50 ${
                      isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Row Selector Checkbox */}
                    <td className="w-10 px-3 py-2 text-center border-r border-stone-100 dark:border-stone-800/80">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectRow(record.note.id, e as any)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Property Cells */}
                    {visibleProps.map((prop) => {
                      const isEditing =
                        editingCell?.noteId === record.note.id && editingCell?.propertyId === prop.id;

                      const rawVal = collectionService.getRecordFieldValue(record, prop.id);

                      return (
                        <td
                          key={prop.id}
                          className="px-3.5 py-2 border-r border-stone-100 dark:border-stone-800/80 align-middle max-w-xs truncate relative"
                          onDoubleClick={() => startEditing(record.note, prop, rawVal)}
                        >
                          {/* Title Column */}
                          {prop.id === 'title' ? (
                            isEditing ? (
                              <input
                                type="text"
                                value={editValue}
                                autoFocus
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => savePropertyValue(record.note, 'title', editValue, 'text')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') savePropertyValue(record.note, 'title', editValue, 'text');
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full px-2 py-1 bg-white dark:bg-stone-800 border border-indigo-500 rounded font-medium text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-2 group/title">
                                <button
                                  type="button"
                                  onClick={() => onOpenNote(record.note.id)}
                                  className="font-medium text-stone-900 dark:text-stone-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left truncate"
                                >
                                  {record.note.title || 'Untitled'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenNote(record.note.id)}
                                  className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-400 hover:text-stone-700"
                                  title="Open note in pane"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          ) : isEditing ? (
                            /* Inline Property Editors */
                            prop.type === 'select' ? (
                              <select
                                value={editValue}
                                autoFocus
                                onChange={(e) => {
                                  savePropertyValue(record.note, prop.id, e.target.value, prop.type);
                                }}
                                onBlur={() => setEditingCell(null)}
                                className="w-full px-2 py-1 bg-white dark:bg-stone-800 border border-indigo-500 rounded text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                              >
                                <option value="">(None)</option>
                                {(prop.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={prop.type === 'number' ? 'number' : 'text'}
                                value={editValue}
                                autoFocus
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => savePropertyValue(record.note, prop.id, editValue, prop.type)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') savePropertyValue(record.note, prop.id, editValue, prop.type);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full px-2 py-1 bg-white dark:bg-stone-800 border border-indigo-500 rounded text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                              />
                            )
                          ) : (
                            /* Cell Renderers */
                            <div
                              onClick={() => startEditing(record.note, prop, rawVal)}
                              className="cursor-pointer min-h-[22px] flex items-center"
                            >
                              {renderCellContent(prop, rawVal, record, allNotes)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Relation Picker Sub-Modal */}
      {relationModal.isOpen && relationModal.note && relationModal.property && (
        <RelationPickerModal
          isOpen={true}
          onClose={() => setRelationModal({ isOpen: false, note: null, property: null })}
          currentValue={collectionService.getRecordFieldValue(
            { note: relationModal.note, canonicalProperties: {}, derivedValues: {}, systemValues: {} as any },
            relationModal.property.id
          )}
          cardinality={relationModal.property.relationConfig?.cardinality || 'many'}
          allNotes={allNotes}
          onSelect={handleRelationSelect}
        />
      )}
    </div>
  );
};

/**
 * Render individual cell contents with nice badges and formatters
 */
function renderCellContent(
  prop: CollectionPropertyDefinition,
  rawVal: any,
  record: CollectionRecord,
  allNotes: Note[]
) {
  if (rawVal === null || rawVal === undefined || rawVal === '') {
    return <span className="text-stone-300 dark:text-stone-600 font-mono text-[11px]">—</span>;
  }

  // Formula & Rollup formatters
  if (prop.type === 'formula' || prop.type === 'rollup') {
    const error = record.derivedValues[prop.id]?.error;
    if (error) {
      return (
        <span className="flex items-center gap-1 text-rose-500 text-[11px] font-mono" title={error}>
          <AlertCircle className="w-3 h-3" />
          <span>Error</span>
        </span>
      );
    }

    if (prop.type === 'formula' && prop.formulaConfig?.format === 'currency') {
      const num = Number(rawVal);
      return (
        <span className="font-mono font-medium text-stone-800 dark:text-stone-200">
          ${isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    }

    if (prop.type === 'formula' && prop.formulaConfig?.format === 'percent') {
      const num = Number(rawVal);
      return <span className="font-mono font-medium text-stone-800 dark:text-stone-200">{isNaN(num) ? '0%' : `${num}%`}</span>;
    }

    return <span className="font-mono text-stone-800 dark:text-stone-200">{String(rawVal)}</span>;
  }

  // Boolean checkbox
  if (prop.type === 'boolean') {
    return (
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={Boolean(rawVal)}
          readOnly
          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
        />
      </div>
    );
  }

  // Select Badge
  if (prop.type === 'select') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60">
        {String(rawVal)}
      </span>
    );
  }

  // Multi-select tags
  if (prop.type === 'multiselect' || prop.type === 'tags') {
    const arr = Array.isArray(rawVal) ? rawVal : [rawVal];
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  // Relation link chip
  if (prop.type === 'relation') {
    const targets = resolveRelationTargets(rawVal, allNotes);
    return (
      <div className="flex flex-wrap items-center gap-1">
        {targets.map((target, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
              target.isDangling
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60'
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{target.targetTitle}</span>
          </span>
        ))}
      </div>
    );
  }

  // URL link
  if (prop.type === 'url') {
    const urlStr = String(rawVal);
    return (
      <a
        href={urlStr.startsWith('http') ? urlStr : `https://${urlStr}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
      >
        <span className="truncate">{urlStr}</span>
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    );
  }

  return <span className="text-stone-800 dark:text-stone-200">{String(rawVal)}</span>;
}
