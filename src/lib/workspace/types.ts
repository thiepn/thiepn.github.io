export interface AppShortcut {
    id: string;
    title: string;
    url: string;
    icon: string;
    category: string;
    action?: { label: string; url: string };
}
export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface Widget {
    id: string;
    type: string;
    typeVersion: number;
    view: string;
    config: Record<string, unknown>;
    desktop: Rect;
    order: number;
}
export interface Workspace {
    schemaVersion: 1;
    id: string;
    title: string;
    revision: number;
    widgets: Widget[];
    updatedAt: string;
}
export interface Task {
    id: string;
    title: string;
    notes: string;
    due: string;
    time: string;
    priority: 'none' | 'low' | 'medium' | 'high';
    completedAt: string | null;
}
export interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    endDate: string;
    start: string;
    end: string;
    zone: string;
    allDay: boolean;
}
export interface Note {
    id: string;
    title: string;
    body: string;
    updatedAt: string;
}
export interface Tracker {
    id: string;
    title: string;
    kind: 'count' | 'duration' | 'checklist';
    unit: string;
    goal: number;
    cadence: 'daily' | 'weekly';
}
export interface TrackerLog {
    id: string;
    trackerId: string;
    date: string;
    value: number;
    note: string;
}
export interface Activity {
    id: string;
    title: string;
    at: string;
    kind: string;
}
export interface WorkspaceState {
    schemaVersion: 1;
    revision: number;
    active: string;
    workspaces: Workspace[];
    preferences: {
        rail: boolean;
        density: 'compact' | 'comfortable';
        timezone: string;
        hidden: boolean;
        theme?: 'system' | 'light' | 'dark';
        recordRecentLaunches?: boolean;
    };
    tasks: Task[];
    events: CalendarEvent[];
    notes: Note[];
    trackers: Tracker[];
    logs: TrackerLog[];
    activity: Activity[];
    captureDraft: string;
    legacyBackup: string | null;
}
export interface EditDraft {
    workspaceId: string;
    baseRevision: number;
    workspace: Workspace;
}
export const uid = () => crypto.randomUUID();
export const stamp = () => new Date().toISOString();
export const clone = <T>(value: T): T => structuredClone(value);
