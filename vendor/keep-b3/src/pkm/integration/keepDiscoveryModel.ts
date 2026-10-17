/** B2: read-only cross-domain discovery over KEEP's *original* source records.
 * No persistent index, new task/project store or external-provider reads.
 */
import type { Note } from '../../types';
import type { PKMTask } from '../tasks/taskTypes';
import { buildVaultTasks } from '../tasks/taskIndex';
import { toggleTaskInNote } from '../tasks/taskMutator';
import type { ProjectRecord, GoalRecord, AreaRecord } from '../planning/planningTypes';
import { classifyPlanningNote } from '../planning/planningNoteClassifier';
import { makeOwnerRef, parseOwnerRef } from './ownerResourceRefs';
import type { KeepResourceLink } from './resourceLinks';
import type { VaultIndex } from '../types';
import type { SavedViewConfig, SavedViewDomain } from '../personalization/personalizationTypes';
import { savedViewsManager } from '../personalization/savedViewsManager';

export type DiscoveryKind = 'note' | 'project' | 'goal' | 'area' | 'task';
export type DiscoveryScope = 'all' | DiscoveryKind;
export interface DiscoveryRow {
  key: string;
  uri: string | null;
  kind: DiscoveryKind;
  title: string;
  summary: string;
  noteId: string;
  line?: number;
  folderId: string | null;
  tags: string[];
  status: string;
  priority?: string;
  dueDate?: string;
  completed?: boolean;
  updatedAt: string;
  source: 'keep';
}
export interface DiscoveryIndex {
  rows: DiscoveryRow[];
  noteById: Map<string, Note>;
  taskById: Map<string, PKMTask>;
}
const visible = (n: Note) => !n.trashed && !n.archived && !n.isLocked;
const lower = (s: string) => s.normalize('NFKC').toLocaleLowerCase().trim();
const summary = (text: string): string => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').replace(/\[\[|\]\]/g, '').replace(/[#*_`>\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);

/** Planning's classified projections remain canonical notes; never materialize duplicate projects. */
export function buildKeepDiscoveryIndex(notes: readonly Note[], projects: readonly ProjectRecord[], goals: readonly GoalRecord[], areas: readonly AreaRecord[]): DiscoveryIndex {
  const active = notes.filter(visible);
  const noteById = new Map(active.map(n => [n.id, n]));
  const taskRecords = buildVaultTasks(active).allTasks;
  const taskById = new Map(taskRecords.map(task => [task.id, task]));
  const kinds = new Map<string, Exclude<DiscoveryKind, 'task'>>();
  for (const p of projects) if (noteById.has(p.noteId) && classifyPlanningNote(noteById.get(p.noteId)!) === 'project') kinds.set(p.noteId, 'project');
  for (const g of goals) if (noteById.has(g.noteId) && classifyPlanningNote(noteById.get(g.noteId)!) === 'goal') kinds.set(g.noteId, 'goal');
  for (const a of areas) if (noteById.has(a.noteId) && classifyPlanningNote(noteById.get(a.noteId)!) === 'area') kinds.set(a.noteId, 'area');
  const projMap = new Map(projects.map(p => [p.noteId, p]));
  const goalMap = new Map(goals.map(g => [g.noteId, g]));
  const rows: DiscoveryRow[] = active.map(note => {
    const kind = kinds.get(note.id) || 'note';
    const project = kind === 'project' ? projMap.get(note.id) : undefined;
    const goal = kind === 'goal' ? goalMap.get(note.id) : undefined;
    return {
      key: `note:${note.id}`, uri: makeOwnerRef('keep', kind, note.id).uri, kind, title: note.title || 'Untitled',
      summary: project ? [project.areaTitle, project.nextActionTask?.text].filter(Boolean).join(' · ') || summary(note.content) : summary(note.content),
      noteId: note.id, folderId: note.folderId, tags: note.tags,
      status: project?.status || goal?.status || note.status || 'active',
      priority: project?.priority || goal?.priority || note.priority,
      dueDate: project?.due || goal?.targetDate || note.reminderDate?.slice(0, 10), updatedAt: note.updatedAt, source: 'keep',
    };
  });
  for (const task of taskRecords) {
    const note = noteById.get(task.noteId);
    if (!note) continue;
    const uri = note.type === 'text' && task.blockId ? makeOwnerRef('keep', 'markdown-task', `${task.noteId}::${task.blockId}`).uri : null;
    rows.push({ key: `task:${task.id}`, uri, kind: 'task', title: task.text, summary: `${note.title || 'Untitled note'} · line ${task.line + 1}`,
      noteId: task.noteId, line: note.type === 'text' ? task.line : undefined, folderId: task.folderId, tags: task.tags,
      status: task.completed ? 'completed' : 'open', completed: task.completed,
      priority: task.priority || task.notePriority, dueDate: task.dueDate || task.noteDate, updatedAt: task.updatedAt, source: 'keep' });
  }
  return { rows, noteById, taskById };
}

/** Conservative inline completion: original note ID + exact line + original
 * task parser + original mutator. Refuse fuzzy task resolution and native
 * checklists, which need a separately verified item-ID mutation path. */
export function prepareKeepTaskCompletion(note: Note, task: PKMTask): Note {
  if (!visible(note) || note.type !== 'text' || task.noteId !== note.id) throw new Error('Open this task in its source editor.');
  const originalLine = (note.content || '').split('\n')[task.line];
  if (!originalLine || originalLine !== task.rawLine || !/^\s*[-*+]\s+\[[ xX]\]/u.test(originalLine)) {
    throw new Error('Task changed since discovery; refresh before completing.');
  }
  if (task.blockId && (note.content.match(new RegExp(`\\^${task.blockId}(?:\\s*$)`, 'gmu')) || []).length !== 1) {
    throw new Error('Task block identity is ambiguous.');
  }
  const result = toggleTaskInNote(note, task);
  if (!result.success || !result.updatedNote) throw new Error(result.error || 'Cannot update source task');
  return result.updatedNote;
}

export interface DiscoveryFilters {
  query: string;
  scope: DiscoveryScope;
  status: string;
  tag: string;
  sort: 'recent' | 'title' | 'due';
}
export function queryKeepDiscovery(rows: readonly DiscoveryRow[], filters: DiscoveryFilters): DiscoveryRow[] {
  const tokens = lower(filters.query).split(/\s+/u).filter(Boolean);
  const tag = lower(filters.tag).replace(/^#/, '');
  return rows.filter(row =>
    (filters.scope === 'all' || filters.scope === row.kind) &&
    (!filters.status || filters.status === 'all' || row.status === filters.status) &&
    (!tag || row.tags.some(t => lower(t).replace(/^#/, '') === tag)) &&
    tokens.every(token => lower(`${row.title} ${row.summary} ${row.tags.join(' ')} ${row.kind}`).includes(token))
  ).sort((a,b) => filters.sort === 'title' ? a.title.localeCompare(b.title) || a.key.localeCompare(b.key) : filters.sort === 'due'
    ? ((a.dueDate || '9999').localeCompare(b.dueDate || '9999') || b.updatedAt.localeCompare(a.updatedAt))
    : b.updatedAt.localeCompare(a.updatedAt) || a.key.localeCompare(b.key));
}

/** Use existing SavedViewsManager filters, and its native domain vocabulary.
 * Unsupported external domains are *not* given synthetic rows. */
export function queryExistingSavedView(rows: readonly DiscoveryRow[], view: SavedViewConfig): DiscoveryRow[] | null {
  if (!['notes', 'tasks', 'projects', 'keep-workspace'].includes(view.domain)) return null;
  const domainRows = rows.filter(r => view.domain === 'tasks' ? r.kind === 'task' : view.domain === 'projects' ? r.kind === 'project' : view.domain === 'keep-workspace' ? true : r.kind !== 'task');
  const matching = domainRows.filter(r => savedViewsManager.matchesFilters({
    title: r.title, searchText: `${r.title} ${r.summary} ${r.tags.join(' ')}`, tags: r.tags.map(t => lower(t).replace(/^#/, '')), status: r.status, priority: r.priority,
    completed: r.completed, dueDate: r.dueDate, targetDate: r.dueDate, updatedAt: r.updatedAt,
    folderId: r.folderId, type: r.kind,
  }, view.filters));
  if (view.sort) {
    const {field, direction} = view.sort;
    matching.sort((a,b) => {
      const av = field === 'targetDate' || field === 'dueDate' ? a.dueDate || '9999' : field === 'title' ? a.title : a.updatedAt;
      const bv = field === 'targetDate' || field === 'dueDate' ? b.dueDate || '9999' : field === 'title' ? b.title : b.updatedAt;
      const diff = av.localeCompare(bv);
      return (direction === 'asc' ? diff : -diff) || a.key.localeCompare(b.key);
    });
  }
  return matching;
}
export function savedViewDomain(scope: DiscoveryScope): SavedViewDomain | null {
  return scope === 'task' ? 'tasks' : scope === 'project' ? 'projects' : scope === 'note' || scope === 'goal' || scope === 'area' ? 'notes' : null;
}

export interface RelatedItem { readonly uri: string; readonly direction: 'outgoing' | 'incoming' | 'both' | 'derived'; readonly reason: string; }
/** Deterministic, bounded contexts based only on explicit note IDs, user links, and existing planning relations. */
export function relatedKeepResources(
  selected: DiscoveryRow, index: DiscoveryIndex, links: readonly KeepResourceLink[],
  projects: readonly ProjectRecord[], goals: readonly GoalRecord[], areas: readonly AreaRecord[], graph?: VaultIndex,
): RelatedItem[] {
  const results = new Map<string, RelatedItem>();
  const add = (uri: string, direction: RelatedItem['direction'], reason: string) => {
    if (!parseOwnerRef(uri) || uri === selected.uri || results.size >= 80) return;
    const old = results.get(uri);
    if (!old) results.set(uri, {uri, direction, reason});
    else results.set(uri, {
      ...old,
      direction: old.direction !== direction && old.direction !== 'both' && direction !== 'derived' ? 'both' : old.direction,
      reason: old.reason.includes(reason) ? old.reason : `${old.reason}; ${reason}`.slice(0, 180),
    });
  };
  // A Project/Goal/Area is a typed view over the SAME note ID. References to
  // either the planning URI or the original note URI must remain discoverable.
  const aliases = new Set([selected.uri, makeOwnerRef('keep', 'note', selected.noteId).uri]);
  for (const link of links) {
    if (aliases.has(link.fromUri)) add(link.toUri, 'outgoing', link.label);
    if (aliases.has(link.toUri)) add(link.fromUri, 'incoming', link.label);
  }
  const project = projects.find(p => p.noteId === selected.noteId);
  if (project) {
    for (const id of [...project.goalIds, ...(project.areaId ? [project.areaId] : []), ...project.blockedByIds]) {
      const note = index.noteById.get(id);
      if (note) add(makeOwnerRef('keep', classifyPlanningNote(note) === 'goal' ? 'goal' : classifyPlanningNote(note) === 'area' ? 'area' : 'note', id).uri, 'derived','Planning relation');
    }
  }
  const goal = goals.find(g => g.noteId === selected.noteId);
  if (goal) for (const id of goal.supportingProjectIds) if (index.noteById.has(id)) add(makeOwnerRef('keep','project',id).uri, 'derived','Supporting project');
  const area = areas.find(a => a.noteId === selected.noteId);
  if (area) for (const id of [...area.projectIds,...area.goalIds]) if (index.noteById.has(id)) add(makeOwnerRef('keep', area.projectIds.includes(id)?'project':'goal', id).uri,'derived','Area membership');
  const source = index.noteById.get(selected.noteId);
  if (source) for (const id of source.linkedNoteIds || []) if (index.noteById.has(id)) add(makeOwnerRef('keep','note',id).uri, 'derived','Explicit note link');
  // References to a note by its canonical ID are safe even when titles collide.
  for (const note of index.noteById.values()) if (note.id !== selected.noteId && (note.linkedNoteIds || []).includes(selected.noteId)) add(makeOwnerRef('keep','note',note.id).uri,'derived','Backlink by note ID');
  // Reuse KEEP's original incremental Wikilink index. Stale parser generations
  // are rejected, so a rename/edit never shows links from an old snapshot.
  if (graph && source && graph.notes[source.id]?.modifiedTimestamp === source.updatedAt) {
    for (const id of graph.forwardLinks[source.id] || []) {
      const target = index.noteById.get(id);
      if (target && graph.notes[id]?.modifiedTimestamp === target.updatedAt) add(makeOwnerRef('keep','note',id).uri,'derived','Resolved Wikilink');
    }
    for (const backlink of graph.backlinks[source.id] || []) {
      const other = index.noteById.get(backlink.sourceNoteId);
      if (other && graph.notes[other.id]?.modifiedTimestamp === other.updatedAt) add(makeOwnerRef('keep','note',other.id).uri,'derived','Wikilink backlink');
    }
  }
  return [...results.values()];
}
