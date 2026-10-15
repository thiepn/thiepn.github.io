import { dayKey } from './model';
import type { WorkspaceState, Task, CalendarEvent, Note } from './types';

/** Read-only projection of records OWNED by the Hub's local workspace. Never import Folio
 * records here: Folio/Google Calendar require their own authorized providers. */
export interface IntegratedLocalDay {
  readonly date: string;
  readonly tasks: readonly Task[];
  readonly remaining: number;
  readonly overdue: number;
  readonly unscheduled: number;
  readonly agenda: readonly CalendarEvent[];
  readonly recentNotes: readonly Note[];
}
export function integratedLocalDay(state: WorkspaceState, now = new Date()): IntegratedLocalDay {
  const zone = state.preferences.timezone;
  const date = dayKey(zone, now);
  const active = state.tasks.filter(task => !task.completedAt);
  const candidates = state.tasks.filter(task => task.due === date || (task.due !== '' && task.due < date && !task.completedAt));
  candidates.sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt) ||
    Number(a.due >= date) - Number(b.due >= date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
  const agenda = state.events.filter(event => {
    if (event.allDay) return event.date <= date && event.endDate >= date;
    const start = new Date(event.start);
    const end = new Date(Date.parse(event.end) - 1);
    return dayKey(zone, start) <= date && dayKey(zone, end) >= date;
  }).sort((a, b) => Number(!a.allDay) - Number(!b.allDay) || a.start.localeCompare(b.start));
  const recentNotes = [...state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  return {
    date, tasks: candidates, remaining: candidates.filter(task => !task.completedAt).length,
    overdue: active.filter(task => task.due !== '' && task.due < date).length,
    unscheduled: active.filter(task => task.due === '').length,
    agenda, recentNotes,
  };
}
