import { addDays, validDate } from './model';
import { stamp, uid, type Task, type Note } from './types';

export type CaptureKind = 'task' | 'note';
export type DuePreset = 'inbox' | 'today' | 'tomorrow' | 'week' | 'date';
export const CAPTURE_KINDS = ['note', 'task'] as const;
export const DUE_PRESETS = ['inbox', 'today', 'tomorrow', 'week', 'date'] as const;

export function captureDue(preset: string, today: string, custom: string): string {
    if (!validDate(today)) throw new Error('The planner date is unavailable.');
    if (preset === 'inbox') return '';
    if (preset === 'today') return today;
    if (preset === 'tomorrow') return addDays(today, 1);
    if (preset === 'week') return addDays(today, 7);
    if (preset === 'date' && validDate(custom)) return custom;
    throw new Error('Choose a valid task date.');
}

export type CaptureRequest = {
    body: string;
    kind: string;
    duePreset: string;
    customDate: string;
    priority: string;
    today: string;
};
export type PreparedCapture =
    | { kind: 'task'; task: Task }
    | { kind: 'note'; note: Note };

export function prepareCapture(request: CaptureRequest): PreparedCapture {
    const body = request.body.trim();
    if (!body || body.length > 10000) throw new Error('Enter up to 10,000 characters to capture.');
    if (request.kind !== 'task' && request.kind !== 'note') throw new Error('Choose a capture destination.');
    const title = body.split(/\r?\n/, 1)[0]!.trim();
    if (!title || title.length > 240) throw new Error('The first line must be a title of 240 characters or fewer.');
    if (request.kind === 'note') {
        return { kind: 'note', note: { id: uid(), title, body, updatedAt: stamp() } };
    }
    const notes = body.slice(body.indexOf('\n') < 0 ? body.length : body.indexOf('\n') + 1).trim();
    if (notes.length > 2000) throw new Error('Task details can be at most 2,000 characters. Save longer material as a local note.');
    if (!['none', 'low', 'medium', 'high'].includes(request.priority)) throw new Error('Choose a valid task priority.');
    return { kind: 'task', task: {
        id: uid(), title, notes, due: captureDue(request.duePreset, request.today, request.customDate),
        time: '', priority: request.priority as Task['priority'], completedAt: null,
    } };
}

export type TaskFilter = 'today' | 'inbox' | 'upcoming' | 'all' | 'completed';
export const TASK_FILTERS: readonly TaskFilter[] = ['today', 'inbox', 'upcoming', 'all', 'completed'];
export function taskMatchesFilter(task: Task, filter: TaskFilter, today: string): boolean {
    if (filter === 'all') return true;
    if (filter === 'completed') return !!task.completedAt;
    if (task.completedAt) return false;
    if (filter === 'inbox') return !task.due;
    if (filter === 'upcoming') return !!task.due && task.due > today;
    return !!task.due && task.due <= today;
}
export function taskCounts(tasks: readonly Task[], today: string) {
    return {
        inbox: tasks.filter(t => !t.completedAt && !t.due).length,
        today: tasks.filter(t => !t.completedAt && !!t.due && t.due <= today).length,
        overdue: tasks.filter(t => !t.completedAt && !!t.due && t.due < today).length,
        upcoming: tasks.filter(t => !t.completedAt && !!t.due && t.due > today).length,
        completed: tasks.filter(t => !!t.completedAt).length,
    };
}
/** Reuses the original Task and existing writer. No recurring task store or silent calendar event. */
export type TaskPlanAction = 'today' | 'tomorrow' | 'week' | 'inbox' | 'high' | 'normal';
export function applyTaskPlan(task: Task, action: TaskPlanAction, today: string): void {
    if (task.completedAt) throw new Error('Reopen a completed task before changing its plan.');
    if (action === 'high') { task.priority = 'high'; return; }
    if (action === 'normal') { task.priority = 'none'; return; }
    task.due = captureDue(action, today, '');
    task.time = ''; // Moving a day must never silently carry a clock time to a different date.
}
