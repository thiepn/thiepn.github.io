import { Note, Folder, NotePriority, NoteStatus } from '../types';
import { VaultIndex } from './types';
import {
  QueryAST,
  QueryClause,
  QueryLeafClause,
  QueryModifiers,
  QuerySortField,
  QuerySortOrder,
  QueryItemResult,
  QueryEvaluationResult,
  ParseQueryResult,
} from './queryTypes';
import { parseSmartQuery } from './queryParser';
import { vaultManager } from './indexer';

export interface QueryExecutionContext {
  notes: Note[];
  vaultIndex?: VaultIndex;
  folders?: Folder[];
}

const PRIORITY_ORDER: Record<NotePriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_ORDER: Record<NoteStatus, number> = {
  backlog: 1,
  todo: 2,
  in_progress: 3,
  review: 4,
  done: 5,
};

/**
 * Extracts checklist stats from Note (native checklist type or markdown checkboxes)
 */
export function extractNoteChecklistStats(note: Note): { total: number; completed: number; percent: number } | undefined {
  if (note.type === 'checklist' && note.checklist && note.checklist.length > 0) {
    const total = note.checklist.length;
    const completed = note.checklist.filter((i) => i.completed).length;
    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100),
    };
  }

  // Check markdown lines or in-text tasks: - [x] or - [ ]
  let total = 0;
  let completed = 0;
  const regex = /(?:^|\n|\s)[-*+]\s+\[([ xX])\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(note.content || '')) !== null) {
    total++;
    if (match[1].toLowerCase() === 'x') completed++;
  }

  if (total > 0) {
    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100),
    };
  }

  return undefined;
}

/**
 * Evaluates a single leaf clause against a note
 */
export function evaluateLeafClause(
  clause: QueryLeafClause,
  note: Note,
  folderMap: Map<string, Folder>,
  vaultIndex?: VaultIndex
): boolean {
  if (clause.type === 'text') {
    const term = clause.value.toLowerCase();
    if (!term) return true;
    const titleMatch = (note.title || '').toLowerCase().includes(term);
    const contentMatch = (note.content || '').toLowerCase().includes(term);
    const tagMatch = (note.tags || []).some((t) => t.toLowerCase().includes(term));
    return titleMatch || contentMatch || tagMatch;
  }

  if (clause.type === 'field') {
    const { field, value, dateComparison } = clause;
    const valLower = (value || '').toLowerCase().trim();

    switch (field) {
      case 'folder': {
        if (valLower === 'none' || valLower === 'unorganized' || valLower === 'root' || valLower === 'null') {
          return note.folderId === null;
        }
        if (note.folderId && note.folderId.toLowerCase() === valLower) {
          return true;
        }
        // Match by folder name
        if (note.folderId) {
          const f = folderMap.get(note.folderId);
          if (f && f.name.toLowerCase().includes(valLower)) {
            return true;
          }
        }
        return false;
      }

      case 'tag': {
        const cleanTag = valLower.startsWith('#') ? valLower.slice(1) : valLower;
        return (note.tags || []).some((t) => {
          const tLow = t.toLowerCase();
          return tLow === cleanTag || tLow.startsWith(`${cleanTag}/`);
        });
      }

      case 'title': {
        return (note.title || '').toLowerCase().includes(valLower);
      }

      case 'status': {
        if (valLower === 'none' || valLower === 'unassigned') {
          return !note.status;
        }
        if (valLower === 'any') {
          return !!note.status;
        }
        return note.status === valLower;
      }

      case 'priority': {
        if (valLower === 'none') {
          return !note.priority;
        }
        if (valLower === 'any') {
          return !!note.priority;
        }
        return note.priority === valLower;
      }

      case 'created':
      case 'updated': {
        if (!dateComparison) return true;
        const targetIso = field === 'created' ? note.createdAt : note.updatedAt;
        if (!targetIso) return false;
        const noteDate = new Date(targetIso);
        const compDate = dateComparison.date;

        switch (dateComparison.operator) {
          case '>':
            return noteDate.getTime() > compDate.getTime();
          case '>=':
            return noteDate.getTime() >= compDate.getTime();
          case '<':
            return noteDate.getTime() < compDate.getTime();
          case '<=':
            return noteDate.getTime() <= compDate.getTime();
          case '=': {
            // Compare by same day if exact date string
            return (
              noteDate.getFullYear() === compDate.getFullYear() &&
              noteDate.getMonth() === compDate.getMonth() &&
              noteDate.getDate() === compDate.getDate()
            );
          }
          default:
            return true;
        }
      }

      case 'has': {
        switch (valLower) {
          case 'checklist':
          case 'tasks':
          case 'task': {
            const chkStats = extractNoteChecklistStats(note);
            return (chkStats && chkStats.total > 0) || false;
          }
          case 'todo':
          case 'undone':
          case 'open': {
            const chkStats = extractNoteChecklistStats(note);
            return (chkStats && chkStats.total > chkStats.completed) || false;
          }
          case 'done':
          case 'completed': {
            const chkStats = extractNoteChecklistStats(note);
            return (chkStats && chkStats.total > 0 && chkStats.completed === chkStats.total) || false;
          }
          case 'images':
          case 'image':
            return Boolean(note.images && note.images.length > 0);
          case 'audio':
            return Boolean(note.audios && note.audios.length > 0);
          case 'reminder':
          case 'reminders':
            return Boolean(note.reminderDate);
          case 'tags':
          case 'tag':
            return Boolean(note.tags && note.tags.length > 0);
          case 'folder':
            return Boolean(note.folderId !== null);
          case 'priority':
            return Boolean(note.priority !== undefined);
          case 'status':
            return Boolean(note.status !== undefined);
          case 'links':
          case 'outgoing': {
            if (note.linkedNoteIds && note.linkedNoteIds.length > 0) return true;
            if (vaultIndex?.forwardLinks[note.id] && vaultIndex.forwardLinks[note.id].length > 0) return true;
            return false;
          }
          case 'backlinks':
          case 'incoming': {
            if (vaultIndex?.backlinks[note.id] && vaultIndex.backlinks[note.id].length > 0) return true;
            return false;
          }
          case 'math': {
            return (
              (note.content || '').includes('$$') ||
              /\$[^\$\n]+\$/.test(note.content || '') ||
              (note.content || '').includes('```math') ||
              (note.content || '').includes('```latex')
            );
          }
          case 'mermaid':
          case 'diagram':
            return (note.content || '').includes('```mermaid');
          case 'locked':
            return Boolean(note.isLocked);
          case 'favorite':
          case 'starred':
            return Boolean(note.isFavorite);
          case 'pinned':
            return Boolean(note.pinned);
          case 'archived':
            return Boolean(note.archived);
          case 'trashed':
            return Boolean(note.trashed);
          default:
            return false;
        }
      }

      case 'is': {
        switch (valLower) {
          case 'pinned':
            return Boolean(note.pinned);
          case 'archived':
            return Boolean(note.archived);
          case 'favorite':
          case 'starred':
            return Boolean(note.isFavorite);
          case 'locked':
            return Boolean(note.isLocked);
          case 'trashed':
            return Boolean(note.trashed);
          default:
            return false;
        }
      }

      case 'type': {
        return note.type === valLower;
      }

      case 'color': {
        return (note.color || 'default').toLowerCase() === valLower;
      }

      case 'text': {
        const term = valLower;
        const titleMatch = (note.title || '').toLowerCase().includes(term);
        const contentMatch = (note.content || '').toLowerCase().includes(term);
        const tagMatch = (note.tags || []).some((t) => t.toLowerCase().includes(term));
        return titleMatch || contentMatch || tagMatch;
      }

      default:
        return true;
    }
  }

  return true;
}

/**
 * Evaluates recursive QueryClause against a note
 */
export function evaluateClause(
  clause: QueryClause,
  note: Note,
  folderMap: Map<string, Folder>,
  vaultIndex?: VaultIndex
): boolean {
  if (clause.type === 'field' || clause.type === 'text') {
    return evaluateLeafClause(clause, note, folderMap, vaultIndex);
  }

  if (clause.type === 'not') {
    return !evaluateClause(clause.clause, note, folderMap, vaultIndex);
  }

  if (clause.type === 'and') {
    for (const sub of clause.clauses) {
      if (!evaluateClause(sub, note, folderMap, vaultIndex)) {
        return false;
      }
    }
    return true;
  }

  if (clause.type === 'or') {
    for (const sub of clause.clauses) {
      if (evaluateClause(sub, note, folderMap, vaultIndex)) {
        return true;
      }
    }
    return false;
  }

  return true;
}

/**
 * Extracts snippet around matched query terms for display
 */
export function extractSnippet(note: Note, queryStr: string): string | undefined {
  if (!note.content) return undefined;
  const terms = queryStr
    .split(/\s+/)
    .filter((w) => w && !w.includes(':') && !['AND', 'OR', 'NOT'].includes(w.toUpperCase()))
    .map((w) => w.toLowerCase());

  if (terms.length === 0) {
    // Return first 120 chars
    const plain = note.content.replace(/[#*`_~[\]]/g, '').trim();
    return plain.length > 140 ? `${plain.slice(0, 140)}...` : plain;
  }

  const content = note.content;
  const lowerContent = content.toLowerCase();

  for (const t of terms) {
    const idx = lowerContent.indexOf(t);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(content.length, idx + t.length + 80);
      const snippet = content.slice(start, end).replace(/[#*`_~[\]]/g, ' ').replace(/\s+/g, ' ').trim();
      return `${start > 0 ? '...' : ''}${snippet}${end < content.length ? '...' : ''}`;
    }
  }

  const plain = note.content.replace(/[#*`_~[\]]/g, '').trim();
  return plain.length > 140 ? `${plain.slice(0, 140)}...` : plain;
}

/**
 * Sorts note results according to specified sort field and order
 */
export function sortQueryResults(
  items: QueryItemResult[],
  sortField?: QuerySortField,
  sortOrder?: QuerySortOrder
): QueryItemResult[] {
  const field = sortField || 'updated';
  // Smart default order: title/status/folder -> asc, updated/created/priority/links/checklist -> desc
  const defaultOrder: QuerySortOrder =
    field === 'title' || field === 'folder' || field === 'status' ? 'asc' : 'desc';
  const order = sortOrder || defaultOrder;
  const factor = order === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    switch (field) {
      case 'title': {
        const tA = (a.note.title || '').toLowerCase();
        const tB = (b.note.title || '').toLowerCase();
        return tA.localeCompare(tB) * factor;
      }

      case 'updated': {
        const timeA = new Date(a.note.updatedAt || a.note.createdAt).getTime();
        const timeB = new Date(b.note.updatedAt || b.note.createdAt).getTime();
        return (timeA - timeB) * factor;
      }

      case 'created': {
        const timeA = new Date(a.note.createdAt).getTime();
        const timeB = new Date(b.note.createdAt).getTime();
        return (timeA - timeB) * factor;
      }

      case 'priority': {
        const pA = a.note.priority ? PRIORITY_ORDER[a.note.priority] : 0;
        const pB = b.note.priority ? PRIORITY_ORDER[b.note.priority] : 0;
        return (pA - pB) * factor;
      }

      case 'status': {
        const sA = a.note.status ? STATUS_ORDER[a.note.status] : 0;
        const sB = b.note.status ? STATUS_ORDER[b.note.status] : 0;
        return (sA - sB) * factor;
      }

      case 'links': {
        return (a.forwardLinkCount - b.forwardLinkCount) * factor;
      }

      case 'backlinks': {
        return (a.backlinkCount - b.backlinkCount) * factor;
      }

      case 'folder': {
        const fA = (a.folderName || '').toLowerCase();
        const fB = (b.folderName || '').toLowerCase();
        return fA.localeCompare(fB) * factor;
      }

      case 'checklist': {
        const cA = a.checklistStats ? a.checklistStats.percent : 0;
        const cB = b.checklistStats ? b.checklistStats.percent : 0;
        return (cA - cB) * factor;
      }

      default:
        return 0;
    }
  });
}

/**
 * Main execution function evaluating a parsed AST or raw query text against the notes context
 */
export function executeSmartQuery(
  queryInput: string | QueryAST,
  context: QueryExecutionContext
): QueryEvaluationResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  let ast: QueryAST;
  if (typeof queryInput === 'string') {
    const parseRes = parseSmartQuery(queryInput);
    if (parseRes.error || !parseRes.ast) {
      return {
        items: [],
        totalMatches: 0,
        modifiers: {},
        executionTimeMs: 0,
        error: parseRes.error ? parseRes.error.message : 'Invalid query syntax',
      };
    }
    ast = parseRes.ast;
  } else {
    ast = queryInput;
  }

  const { notes, folders = [] } = context;
  const vaultIndex = context.vaultIndex || vaultManager.getIndex();

  const folderMap = new Map<string, Folder>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  const matchedItems: QueryItemResult[] = [];

  for (const note of notes) {
    // By default exclude trashed notes unless user explicitly filters for has:trashed or is:trashed
    if (note.trashed) {
      const isQueryingTrash =
        ast.rawQuery.includes('has:trashed') || ast.rawQuery.includes('is:trashed');
      if (!isQueryingTrash) continue;
    }

    let isMatch = true;
    if (ast.rootClause) {
      isMatch = evaluateClause(ast.rootClause, note, folderMap, vaultIndex);
    }

    if (isMatch) {
      const folderName = note.folderId && folderMap.has(note.folderId)
        ? folderMap.get(note.folderId)!.name
        : null;

      const backlinkCount = vaultIndex.backlinks[note.id] ? vaultIndex.backlinks[note.id].length : 0;
      const forwardLinkCount = vaultIndex.forwardLinks[note.id] ? vaultIndex.forwardLinks[note.id].length : (note.linkedNoteIds?.length || 0);
      const checklistStats = extractNoteChecklistStats(note);
      const matchedSnippet = extractSnippet(note, ast.rawQuery);

      matchedItems.push({
        note,
        folderName,
        backlinkCount,
        forwardLinkCount,
        matchedSnippet,
        checklistStats,
      });
    }
  }

  const totalMatches = matchedItems.length;

  // Sorting
  const sorted = sortQueryResults(matchedItems, ast.modifiers.sort, ast.modifiers.order);

  // Limiting
  const finalItems = ast.modifiers.limit && ast.modifiers.limit > 0
    ? sorted.slice(0, ast.modifiers.limit)
    : sorted;

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const executionTimeMs = Math.round((endTime - startTime) * 100) / 100;

  return {
    items: finalItems,
    totalMatches,
    modifiers: ast.modifiers,
    executionTimeMs,
  };
}
