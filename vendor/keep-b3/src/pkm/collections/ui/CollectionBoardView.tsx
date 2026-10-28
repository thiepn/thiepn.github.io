import React, { useState, useMemo } from 'react';
import { Note, Folder } from '../../../types';
import {
  Collection,
  CollectionView,
  CollectionRecord,
} from '../collectionTypes';
import { collectionService } from '../collectionService';
import { setPropertyInContent } from '../../properties/frontmatterEngine';
import {
  Plus,
  Calendar,
  Tag,
  CheckCircle2,
  Circle,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  MoveRight,
  Sparkles,
} from 'lucide-react';

export interface CollectionBoardViewProps {
  collection: Collection;
  view: CollectionView;
  records: CollectionRecord[];
  allNotes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onSaveNote: (updatedNote: Note) => void;
  onCreateNewNote?: (initialTitle?: string, initialProperties?: Record<string, any>) => void;
}

export const CollectionBoardView: React.FC<CollectionBoardViewProps> = ({
  collection,
  view,
  records,
  allNotes,
  folders,
  onOpenNote,
  onSaveNote,
  onCreateNewNote,
}) => {
  // Grouping property
  const groupProp = useMemo(() => {
    const propId = view.groupByPropertyId || 'status';
    return collection.schema.find((p) => p.id === propId) || {
      id: propId,
      name: propId.charAt(0).toUpperCase() + propId.slice(1),
      type: 'select' as const,
      options: ['todo', 'in_progress', 'done'],
    };
  }, [collection.schema, view.groupByPropertyId]);

  // Columns
  const columns = useMemo(() => {
    const baseOptions = groupProp.options && groupProp.options.length > 0
      ? [...groupProp.options]
      : ['No Status'];

    const cols: { key: string; label: string }[] = baseOptions.map((opt) => ({
      key: opt,
      label: opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }));

    // Check if there are notes with values not in options or empty
    const knownKeys = new Set(baseOptions);
    let hasUnassigned = false;

    for (const r of records) {
      const val = collectionService.getRecordFieldValue(r, groupProp.id);
      if (val === null || val === undefined || val === '') {
        hasUnassigned = true;
      } else if (!knownKeys.has(String(val))) {
        knownKeys.add(String(val));
        cols.push({
          key: String(val),
          label: String(val).replace(/_/g, ' '),
        });
      }
    }

    if (hasUnassigned && !cols.some((c) => c.key === '__unassigned__')) {
      cols.unshift({ key: '__unassigned__', label: 'No ' + groupProp.name });
    }

    return cols;
  }, [groupProp, records]);

  // Group records into columns
  const groupedRecords = useMemo(() => {
    const map = new Map<string, CollectionRecord[]>();
    columns.forEach((col) => map.set(col.key, []));

    for (const r of records) {
      const val = collectionService.getRecordFieldValue(r, groupProp.id);
      if (val === null || val === undefined || val === '') {
        const unassignedList = map.get('__unassigned__');
        if (unassignedList) unassignedList.push(r);
        else map.get(columns[0]?.key)?.push(r);
      } else {
        const strVal = String(val);
        const list = map.get(strVal);
        if (list) {
          list.push(r);
        } else {
          // fallback
          map.get(columns[0]?.key)?.push(r);
        }
      }
    }
    return map;
  }, [records, columns, groupProp]);

  // Drag state
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    setDraggedNoteId(noteId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColKey: string) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData('text/plain') || draggedNoteId;
    if (!noteId) return;

    const record = records.find((r) => r.note.id === noteId);
    if (!record) return;

    const newVal = targetColKey === '__unassigned__' ? '' : targetColKey;
    const newContent = setPropertyInContent(
      record.note.content || '',
      groupProp.id,
      newVal,
      groupProp.type as any
    );

    onSaveNote({
      ...record.note,
      content: newContent,
      updatedAt: new Date().toISOString(),
    });

    setDraggedNoteId(null);
  };

  const handleAddCard = (colKey: string) => {
    if (!onCreateNewNote) return;
    const initialProps: Record<string, any> = {};
    if (colKey !== '__unassigned__') {
      initialProps[groupProp.id] = colKey;
    }
    onCreateNewNote('Untitled', initialProps);
  };

  return (
    <div className="flex-1 h-full overflow-x-auto p-5 bg-stone-100/60 dark:bg-stone-950 flex items-start gap-4 select-none">
      {columns.map((col) => {
        const colRecords = groupedRecords.get(col.key) || [];

        return (
          <div
            key={col.key}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
            className="w-72 shrink-0 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex flex-col max-h-full shadow-xs"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                  {col.label}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  {colRecords.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleAddCard(col.key)}
                className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                title={`Add note to ${col.label}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Column Cards */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {colRecords.map((record) => {
                const dueVal = collectionService.getRecordFieldValue(record, 'due');
                const priorityVal = collectionService.getRecordFieldValue(record, 'priority');

                return (
                  <div
                    key={record.note.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, record.note.id)}
                    onClick={() => onOpenNote(record.note.id)}
                    className="p-3 bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-xl shadow-xs cursor-pointer transition-all hover:shadow-md group"
                  >
                    {/* Card Title */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {record.note.title || 'Untitled'}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenNote(record.note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-100 dark:hover:bg-stone-750 rounded text-stone-400 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Excerpt snippet */}
                    {record.note.content && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                        {record.note.content.replace(/---[\s\S]*?---/, '').trim().slice(0, 100)}
                      </p>
                    )}

                    {/* Badges & Meta */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                      {priorityVal && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          String(priorityVal).toLowerCase() === 'urgent'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : String(priorityVal).toLowerCase() === 'high'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}>
                          {String(priorityVal)}
                        </span>
                      )}

                      {dueVal && (
                        <span className="flex items-center gap-1 text-[10px] text-stone-500 dark:text-stone-400">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>{String(dueVal)}</span>
                        </span>
                      )}

                      {record.note.tags && record.note.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {record.note.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] text-stone-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add at Column Bottom */}
            <button
              type="button"
              onClick={() => handleAddCard(col.key)}
              className="m-2 py-2 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-stone-500 hover:text-indigo-600 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
