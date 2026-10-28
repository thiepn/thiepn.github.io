/** KEEP B3 — pure project/study workspace projection over existing note-owned resources.
 * Never creates Projects, Tasks, Events or calendar rows. All links are explicit,
 * source-revision-checked, or P49-derived; false positive title matching is prohibited.
 */
import type { Note } from '../../types';
import type { PKMTask } from '../tasks/taskTypes';
import type { VaultIndex } from '../types';
import type { ProjectRecord, GoalRecord, AreaRecord } from '../planning/planningTypes';
import type { DiscoveryIndex, DiscoveryRow, RelatedItem } from './keepDiscoveryModel';
import { relatedKeepResources } from './keepDiscoveryModel';
import type { KeepResourceLink } from './resourceLinks';
import { parseOwnerRef } from './ownerResourceRefs';

export type TimelineKind = 'task-deadline' | 'project-deadline' | 'note-reminder';
export interface ContextTimelineItem {
  key: string;
  kind: TimelineKind;
  title: string;
  day: string;
  noteId: string;
  line?: number;
  overdue: boolean;
}
export interface KeepProjectContext {
  project: ProjectRecord;
  projectNote: Note;
  area: AreaRecord | null;
  goals: GoalRecord[];
  relations: RelatedItem[];
  linkedNotes: DiscoveryRow[];
  tasks: DiscoveryRow[];
  upcoming: ContextTimelineItem[];
  undatedOpenTasks: number;
  status: 'on-track' | 'overdue' | 'blocked' | 'due-soon' | 'waiting' | 'unplanned';
}

const validDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0,10) === s;
function taskRowKey(row: DiscoveryRow): string { return row.uri ?? row.key; }
/** Note reminderDate is an absolute instant. Render it in the user's actual
 * local calendar day; task @due(YYYY-MM-DD) remains date-only. */
export function reminderLocalDate(value: string): string | null {
  if (validDay(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : keepLocalDate(date);
}
/** Yields a factual local-calendar date; no UTC truncation at timezone boundaries. */
export function keepLocalDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function buildProjectContext(
  projectId: string, index: DiscoveryIndex,
  projects: readonly ProjectRecord[], goals: readonly GoalRecord[], areas: readonly AreaRecord[],
  links: readonly KeepResourceLink[], graph?: VaultIndex, today = keepLocalDate(),
): KeepProjectContext | null {
  const project = projects.find(p => p.noteId === projectId);
  const note = index.noteById.get(projectId);
  const projectRow = index.rows.find(r => r.noteId === projectId && r.kind === 'project');
  if (!project || !note || !projectRow) return null;
  const relations = relatedKeepResources(projectRow, index, links, projects, goals, areas, graph);
  const linkedNoteIds = new Set<string>();
  for (const relation of relations) {
    const ref = parseOwnerRef(relation.uri);
    // A related resource is not necessarily a knowledge document; only allow
    // authoritatively present local notes and block/task references.
    if (!ref || ref.source !== 'keep') continue;
    if (ref.kind !== 'note' && ref.kind !== 'note-block' && ref.kind !== 'markdown-task') continue;
    const noteId = ref.kind === 'note' ? ref.id : ref.id.split('::')[0];
    if (noteId !== projectId && index.noteById.has(noteId)) linkedNoteIds.add(noteId);
  }
  // Note-to-project links are not always indexed when graph is unavailable;
  // explicit linkedNoteIds incoming edges are already included by relatedKeepResources.
  const linkedNotes = index.rows.filter(r => r.kind === 'note' && linkedNoteIds.has(r.noteId));
  const sourceNotes = new Set([projectId, ...linkedNoteIds]);
  const tasks = index.rows.filter(r => r.kind === 'task' && sourceNotes.has(r.noteId));
  const timeline: ContextTimelineItem[] = [];
  const add = (key: string, kind: TimelineKind, title: string, day: unknown, noteId: string, line?: number) => {
    if (!validDay(day)) return;
    timeline.push({key,kind,title,day,noteId,line,overdue:day<today});
  };
  if (project.status !== 'completed' && project.status !== 'cancelled') add(`project:${projectId}`, 'project-deadline', project.title, project.due, projectId);
  for (const row of tasks) if (!row.completed) add(`task:${taskRowKey(row)}`, 'task-deadline', row.title, row.dueDate, row.noteId, row.line);
  for (const sourceId of sourceNotes) {
    const origin = index.noteById.get(sourceId);
    if (origin?.reminderDate) add(`reminder:${sourceId}`, 'note-reminder', origin.title || 'Note reminder', reminderLocalDate(origin.reminderDate), sourceId);
  }
  timeline.sort((a,b)=>a.day.localeCompare(b.day)||a.key.localeCompare(b.key));
  const isBlocked = !!project.hasBlockedCycle || (project.blockedByIds || []).some(id => index.noteById.has(id));
  const days = validDay(project.due) ? Math.round((Date.parse(`${project.due}T00:00:00Z`)-Date.parse(`${today}T00:00:00Z`))/86400000) : null;
  const status: KeepProjectContext['status'] = isBlocked ? 'blocked' : project.status === 'waiting' || project.status === 'paused' ? 'waiting'
    : days !== null && days < 0 && project.status !== 'completed' ? 'overdue'
    : days !== null && days <= 7 && days >= 0 && project.status !== 'completed' ? 'due-soon'
    : !project.nextActionTask && project.status === 'active' ? 'unplanned' : 'on-track';
  return {
    project,projectNote:note,area:areas.find(a=>a.noteId===project.areaId && index.noteById.has(a.noteId))||null,
    goals:goals.filter(g=>project.goalIds.includes(g.noteId)&&index.noteById.has(g.noteId)),
    relations,linkedNotes,tasks,upcoming:timeline,
    undatedOpenTasks:tasks.filter(t=>!t.completed&&!validDay(t.dueDate)).length,status,
  };
}

/** Source-owning Markdown update: edits only a verified exact task line. Unlike the
 * legacy mutator's fuzzy fallback, this refuses to redirect to another checkbox.
 * Changes the task's existing due token, or adds one before a stable ^block-id.
 * Note-level inherited dates are left intact; explicit task due takes precedence.
 */
export function prepareKeepTaskReschedule(note: Note, task: PKMTask, nextDue: string): Note {
  if (!validDay(nextDue)) throw new Error('Choose a valid date in YYYY-MM-DD format.');
  if (note.trashed || note.archived || note.isLocked || note.type !== 'text' || task.noteId !== note.id || task.completed) {
    throw new Error('Open the original active Markdown task before rescheduling.');
  }
  const lines = note.content.split('\n');
  if (!Number.isInteger(task.line) || lines[task.line] !== task.rawLine || !/^\s*[-*+]\s+\[[ xX]\]/u.test(task.rawLine)) {
    throw new Error('Task changed since discovery; refresh before rescheduling.');
  }
  if (task.blockId && lines.filter(line => line.trimEnd().endsWith(`^${task.blockId}`)).length !== 1) {
    throw new Error('Task anchor is not unique.');
  }
  const token = /@due\(\d{4}-\d{2}-\d{2}\)|due:\d{4}-\d{2}-\d{2}|📅\s*\d{4}-\d{2}-\d{2}/giu;
  const matched = [...task.rawLine.matchAll(token)];
  if (matched.length > 1) throw new Error('Task has multiple due dates; edit its source note.');
  let nextLine: string;
  if (matched.length) {
    const old=matched[0];
    nextLine = task.rawLine.slice(0,old.index)+`@due(${nextDue})`+task.rawLine.slice(old.index!+old[0].length);
  } else {
    const anchor = task.blockId ? new RegExp(`(\\s+\\^${task.blockId})\\s*$`,'u') : null;
    if (anchor && !anchor.test(task.rawLine)) throw new Error('Task anchor changed; refresh its source note.');
    nextLine = anchor ? task.rawLine.replace(anchor,` @due(${nextDue})$1`) : `${task.rawLine.trimEnd()} @due(${nextDue})`;
  }
  if (nextLine === task.rawLine) return note;
  lines[task.line] = nextLine;
  return {...note, content:lines.join('\n'),updatedAt:new Date().toISOString()};
}

export interface PlanningDayGroup { day: string; tasks: DiscoveryRow[]; projects: DiscoveryRow[]; reminders: {noteId:string;title:string}[]; }
/** Local preview of dated source items only. Not an appointment/event engine. */
export function buildKeepPlanningDays(index: DiscoveryIndex, startDay: string, count=14): PlanningDayGroup[] {
  if (!validDay(startDay) || count < 1 || count > 31) return [];
  const start = Date.parse(`${startDay}T00:00:00Z`);
  const days = Array.from({length:count},(_,i)=>({day:new Date(start+i*86400000).toISOString().slice(0,10),tasks:[] as DiscoveryRow[],projects:[] as DiscoveryRow[],reminders:[] as {noteId:string;title:string}[]}));
  const map = new Map(days.map(d=>[d.day,d]));
  for (const r of index.rows) {
    if (!validDay(r.dueDate)) continue;
    const entry = map.get(r.dueDate);
    if (!entry) continue;
    if (r.kind === 'task' && !r.completed) entry.tasks.push(r);
    if (r.kind === 'project' && r.status !== 'completed' && r.status !== 'cancelled') entry.projects.push(r);
  }
  for (const n of index.noteById.values()) {
    if (!n.reminderDate) continue;
    const date = reminderLocalDate(n.reminderDate);
    const entry = map.get(date);
    if (entry) entry.reminders.push({noteId:n.id,title:n.title||'Untitled'});
  }
  return days;
}
