/**
 * Phase P51 — Curriculum Tree Builder Component
 *
 * Provides an accessible, nested hierarchy editor for Course modules,
 * topics, lessons, and sections, supporting status toggles, linked notes,
 * reordering, and cycle-safe parent assignments.
 */

import React, { useState } from 'react';
import {
  CurriculumItem,
  CurriculumItemType,
  CurriculumStatus,
  LearningObjective,
} from '../learningTypes';
import { learningService } from '../learningService';
import { useWorkspace } from '../../useWorkspace';
import {
  FolderTree,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  RotateCcw,
  FileText,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Layers,
  BookOpen,
  Target,
} from 'lucide-react';

interface CurriculumTreeBuilderProps {
  courseId: string;
  curriculum: CurriculumItem[];
  objectives: LearningObjective[];
  onCurriculumChange?: () => void;
}

export const CurriculumTreeBuilder: React.FC<CurriculumTreeBuilderProps> = ({
  courseId,
  curriculum,
  objectives,
  onCurriculumChange,
}) => {
  const { openNote } = useWorkspace();
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CurriculumItemType>('topic');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group curriculum by parentId
  const rootItems = curriculum.filter((c) => !c.parentId).sort((a, b) => a.order - b.order);

  const getChildren = (parentId: string) => {
    return curriculum.filter((c) => c.parentId === parentId).sort((a, b) => a.order - b.order);
  };

  const toggleCollapse = (id: string) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddItem = (parentId?: string) => {
    if (!newTitle.trim()) return;
    try {
      learningService.addCurriculumItem(courseId, {
        parentId,
        title: newTitle.trim(),
        type: newType,
        status: 'not-started',
      });
      setNewTitle('');
      setAddingChildTo(null);
      setErrorMsg(null);
      if (onCurriculumChange) onCurriculumChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add curriculum item');
    }
  };

  const handleStatusChange = (item: CurriculumItem, status: CurriculumStatus) => {
    try {
      learningService.updateCurriculumItem(courseId, item.id, { status });
      if (onCurriculumChange) onCurriculumChange();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Delete this curriculum item? (Linked notes and resources will NOT be deleted).')) {
      learningService.deleteCurriculumItem(courseId, itemId);
      if (onCurriculumChange) onCurriculumChange();
    }
  };

  const handleMove = (item: CurriculumItem, direction: 'up' | 'down') => {
    const siblings = curriculum.filter((c) => c.parentId === item.parentId).sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((s) => s.id === item.id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === siblings.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const targetItem = siblings[swapIndex];

    const updated = curriculum.map((c) => {
      if (c.id === item.id) return { ...c, order: targetItem.order };
      if (c.id === targetItem.id) return { ...c, order: item.order };
      return c;
    });

    learningService.reorderCurriculum(courseId, updated);
    if (onCurriculumChange) onCurriculumChange();
  };

  const getStatusIcon = (status: CurriculumStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'review':
        return <RotateCcw className="w-4 h-4 text-blue-500" />;
      default:
        return <Circle className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />;
    }
  };

  const renderItem = (item: CurriculumItem, depth = 0) => {
    const children = getChildren(item.id);
    const isCollapsed = collapsedParents.has(item.id);
    const isEditing = editingItemId === item.id;
    const isAddingChild = addingChildTo === item.id;

    return (
      <div key={item.id} className="flex flex-col select-none">
        <div
          className={`group flex items-center justify-between py-2 px-3 my-0.5 rounded-lg border transition-colors ${
            item.status === 'complete'
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {/* Left: Collapse, Status, Type, Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {children.length > 0 ? (
              <button
                onClick={() => toggleCollapse(item.id)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 transition-colors"
                aria-label={isCollapsed ? 'Expand module' : 'Collapse module'}
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-5" />
            )}

            {/* Status toggle dropdown */}
            <div className="relative group/status flex items-center">
              <button
                onClick={() => {
                  const nextStatus: Record<CurriculumStatus, CurriculumStatus> = {
                    'not-started': 'in-progress',
                    'in-progress': 'complete',
                    'complete': 'review',
                    'review': 'not-started',
                  };
                  handleStatusChange(item, nextStatus[item.status]);
                }}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                title={`Status: ${item.status}. Click to cycle.`}
              >
                {getStatusIcon(item.status)}
              </button>
            </div>

            {/* Type badge */}
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {item.type}
            </span>

            {/* Title / Inline edit */}
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => {
                  if (editingTitle.trim()) {
                    learningService.updateCurriculumItem(courseId, item.id, { title: editingTitle.trim() });
                    if (onCurriculumChange) onCurriculumChange();
                  }
                  setEditingItemId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editingTitle.trim()) {
                      learningService.updateCurriculumItem(courseId, item.id, { title: editingTitle.trim() });
                      if (onCurriculumChange) onCurriculumChange();
                    }
                    setEditingItemId(null);
                  } else if (e.key === 'Escape') {
                    setEditingItemId(null);
                  }
                }}
                autoFocus
                className="flex-1 px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-indigo-500 rounded outline-none"
              />
            ) : (
              <span
                onDoubleClick={() => {
                  setEditingItemId(item.id);
                  setEditingTitle(item.title);
                }}
                className={`text-xs font-medium truncate cursor-pointer ${
                  item.status === 'complete' ? 'line-through opacity-75' : ''
                }`}
                title="Double click to rename"
              >
                {item.title}
              </span>
            )}

            {/* Linked note indicator */}
            {item.linkedResourceIds && item.linkedResourceIds.length > 0 && (
              <button
                onClick={() => openNote(item.linkedResourceIds![0])}
                className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                title="Open linked note"
              >
                <FileText className="w-3 h-3" />
                <span>Note</span>
              </button>
            )}

            {item.externalUrl && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-1"
                title="Open external link"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleMove(item, 'up')}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500"
              title="Move Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleMove(item, 'down')}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500"
              title="Move Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            {depth < 3 && (
              <button
                onClick={() => {
                  setAddingChildTo(item.id);
                  setNewTitle('');
                  setNewType('topic');
                }}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300"
                title="Add child topic / lesson"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => handleDeleteItem(item.id)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-950/40 rounded text-red-500"
              title="Delete curriculum item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Child Add Form */}
        {isAddingChild && (
          <div
            className="flex items-center gap-2 p-2 my-1 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-indigo-200 dark:border-indigo-900/50"
            style={{ marginLeft: `${(depth + 1) * 20}px` }}
          >
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CurriculumItemType)}
              className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1"
            >
              <option value="topic">Topic</option>
              <option value="lesson">Lesson</option>
              <option value="section">Section</option>
              <option value="module">Module</option>
            </select>
            <input
              type="text"
              placeholder="Topic or lesson title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem(item.id);
                else if (e.key === 'Escape') setAddingChildTo(null);
              }}
              autoFocus
              className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleAddItem(item.id)}
              className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700"
            >
              Add
            </button>
            <button
              onClick={() => setAddingChildTo(null)}
              className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Render Children */}
        {!isCollapsed && children.map((child) => renderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {errorMsg && (
        <div className="p-3 text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Root Curriculum Items */}
      {curriculum.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <Layers className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No curriculum items yet</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Structure your course syllabus into modules, topics, and lessons without duplicating note content.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">{rootItems.map((item) => renderItem(item, 0))}</div>
      )}

      {/* Add Top-Level Module / Topic Form */}
      <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as CurriculumItemType)}
          className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-zinc-700 dark:text-zinc-200"
        >
          <option value="module">Module</option>
          <option value="topic">Topic</option>
          <option value="lesson">Lesson</option>
          <option value="section">Section</option>
        </select>
        <input
          type="text"
          placeholder="New module or topic title..."
          value={addingChildTo === null ? newTitle : ''}
          onChange={(e) => {
            setAddingChildTo(null);
            setNewTitle(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddItem(undefined);
          }}
          className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => handleAddItem(undefined)}
          className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>
    </div>
  );
};
