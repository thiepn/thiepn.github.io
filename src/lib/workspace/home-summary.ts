import { addDays, dayKey } from './model';
import type { CalendarEvent, Task, WorkspaceState } from './types';

/** A read-only view over Hub-owned records. Never claims access to another app. */
export interface HomeTask {
    task: Task;
    status: 'overdue' | 'today' | 'upcoming' | 'unscheduled';
}
export interface HomeEvent {
    event: CalendarEvent;
    startDay: string;
    endDay: string;
}
export interface HomeSummary {
    dueToday: number;
    overdue: number;
    completedToday: number;
    upcomingTasks: HomeTask[];
    upcomingEvents: HomeEvent[];
}
const priority = { high: 0, medium: 1, low: 2, none: 3 } as const;

export function buildHomeSummary(state: WorkspaceState, today: string): HomeSummary {
    const horizon = addDays(today, 7);
    const available = state.tasks.filter(t => !t.completedAt);
    const dueToday = available.filter(t => t.due === today).length;
    const overdue = available.filter(t => !!t.due && t.due < today).length;
    const completedToday = state.tasks.filter(t => t.completedAt && Number.isFinite(Date.parse(t.completedAt)) && dayKey(state.preferences.timezone, new Date(t.completedAt)) === today).length;
    const candidates: HomeTask[] = available
        .filter(t => !t.due || t.due <= horizon)
        .map(task => ({
            task,
            status: !task.due ? 'unscheduled' as const :
                task.due < today ? 'overdue' as const :
                task.due === today ? 'today' as const : 'upcoming' as const,
        }));
    const order = { overdue: 0, today: 1, upcoming: 2, unscheduled: 3 } as const;
    candidates.sort((a, b) =>
        order[a.status] - order[b.status] ||
        priority[a.task.priority] - priority[b.task.priority] ||
        (a.task.due || horizon).localeCompare(b.task.due || horizon) ||
        a.task.time.localeCompare(b.task.time) ||
        a.task.title.localeCompare(b.task.title)
    );
    const upcomingEvents: HomeEvent[] = state.events.map(event => ({
        event,
        startDay: event.allDay ? event.date : dayKey(state.preferences.timezone, new Date(event.start)),
        endDay: event.allDay ? event.endDate : dayKey(state.preferences.timezone, new Date(event.end)),
    })).filter(entry => entry.endDay >= today && entry.startDay <= horizon)
        .sort((a, b) => a.startDay.localeCompare(b.startDay) ||
            (a.event.allDay ? -1 : b.event.allDay ? 1 : a.event.start.localeCompare(b.event.start)) ||
            a.event.title.localeCompare(b.event.title));
    return { dueToday, overdue, completedToday, upcomingTasks: candidates.slice(0, 4), upcomingEvents: upcomingEvents.slice(0, 3) };
}
