/**
 * Reviewed, bounded distribution of existing Hub task DUE DATES.
 * The only mutable authority is WorkspaceState.tasks, through the native writer.
 * Calendar events and Folio records are read-only load hints, never allocations.
 */
import { addDays, dayKey, validDate } from './model';
import { applyTaskPlan } from './task-flow';
import { MAX_WEEK_BATCH, taskSnapshot, type TaskBeforeMove } from './weekly-followthrough';
import type { WorkspaceState } from './types';
import type { FolioDeviceSnapshot } from './folio-device';
import { folioDayLoad } from './folio-continuity';

export type PlanningHorizon = 3 | 5 | 7;
export interface DistributedTaskChange {
  id: string;
  title: string;
  before: string;
  after: string;
  clearedTime: string;
}
export interface DistributedWeekPreview {
  start: string;
  days: PlanningHorizon;
  changes: DistributedTaskChange[];
  load: readonly { date: string; hubDeadlines: number; hubTimed: number; hubAllDay: number; assigned: number; folioTasks: number; folioTimed: number; folioAllDay: number }[];
  folioConsidered:boolean;
}
export function planningHorizon(value: string): PlanningHorizon {
  if (value === '3' || value === '5' || value === '7') return Number(value) as PlanningHorizon;
  throw new Error('Choose three, five or seven planning days.');
}
/** Show known Hub workload, not a free-time or appointment availability claim. */
export function prepareDistributedWeek(
  state: WorkspaceState, originals: readonly TaskBeforeMove[], start: string, days: PlanningHorizon,
  folio: FolioDeviceSnapshot|null=null,
): DistributedWeekPreview {
  if (!validDate(start) || ![3, 5, 7].includes(days))
    throw new Error('Choose a valid date and planning horizon.');
  if (originals.length < 1 || originals.length > MAX_WEEK_BATCH)
    throw new Error('Select between 1 and 25 unfinished Hub tasks.');
  const selected = new Set<string>();
  for (const original of originals) {
    if (selected.has(original.id)) throw new Error('A task was selected twice.');
    selected.add(original.id);
    const task = state.tasks.find(item => item.id === original.id);
    if (!task || task.completedAt ||
      JSON.stringify(taskSnapshot(task)) !== JSON.stringify(original))
      throw new Error('A selected task changed or was completed. Review the current task list.');
  }
  const dates = Array.from({ length: days }, (_, index) => addDays(start, index));
  const load = dates.map(date => ({
    date,
    hubDeadlines: state.tasks.filter(task => !selected.has(task.id) && !task.completedAt && task.due === date).length,
    hubTimed: 0,
    hubAllDay: 0,
    assigned: 0,
    folioTasks: 0,
    folioTimed: 0,
    folioAllDay: 0,
  }));
  for (const event of state.events) {
    if (event.allDay) {
      for (const row of load)
        if (event.date <= row.date && row.date <= event.endDate) row.hubAllDay++;
      continue;
    }
    const from = Date.parse(event.start), to = Date.parse(event.end);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    const begin = dayKey(state.preferences.timezone, new Date(from));
    const finish = dayKey(state.preferences.timezone, new Date(to - 1));
    for (const row of load)
      if (begin <= row.date && row.date <= finish) row.hubTimed++;
  }
  // Only explicitly selected Folio share counts inform the proposal, never availability.
  if(folio)for(const row of load){
    const source=folioDayLoad(folio,row.date,state.preferences.timezone,state);
    row.folioTasks=source.tasks.length;
    row.folioTimed=source.timed;
    row.folioAllDay=source.allDay;
  }
  const rank = {high: 0, medium: 1, low: 2, none: 3} as const;
  const chosen = originals.map(original => state.tasks.find(task => task.id === original.id)!)
    .sort((a, b) => rank[a.priority] - rank[b.priority] ||
      (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31') ||
      a.id.localeCompare(b.id));
  const changes: DistributedTaskChange[] = [];
  for (const task of chosen) {
    const candidate = [...load].sort((a, b) =>
      (a.hubDeadlines + a.assigned + a.hubTimed + a.hubAllDay + a.folioTasks + a.folioTimed + a.folioAllDay) -
      (b.hubDeadlines + b.assigned + b.hubTimed + b.hubAllDay + b.folioTasks + b.folioTimed + b.folioAllDay) ||
      a.date.localeCompare(b.date))[0]!;
    candidate.assigned++;
    if (task.due !== candidate.date || task.time)
      changes.push({
        id: task.id, title: task.title, before: task.due || 'Inbox',
        after: candidate.date, clearedTime: task.time,
      });
  }
  if (!changes.length) throw new Error('All selected tasks already match the proposed distribution.');
  return {start, days, changes, load,folioConsidered:!!folio};
}
/** Must run INSIDE Hub's existing detached-candidate CAS mutation. */
export function applyDistributedWeek(
  state: WorkspaceState, originals: readonly TaskBeforeMove[], start: string, days: PlanningHorizon,
  folio: FolioDeviceSnapshot|null=null,
): DistributedWeekPreview {
  const prepared = prepareDistributedWeek(state, originals, start, days,folio);
  for (const change of prepared.changes) {
    const task = state.tasks.find(item => item.id === change.id)!;
    applyTaskPlan(task, 'today', change.after);
  }
  return prepared;
}
