import { parseHubPreferences } from '../hub-preferences';
import { preset } from './presets';
import { place } from './layout';
import { validWidget } from './registry';
import { clone, stamp, uid, type WorkspaceState } from './types';
export const MAX_EXPORT_BYTES = 5000000;
export function initialState(apps: string[], legacy: string | null): WorkspaceState {
    const { preferences: p } = parseHubPreferences(legacy, apps);
    const pins = legacy ? p.pins : ['notes', 'thiepn-library', 'tms60', 'tiny-tools'].filter(id => apps.includes(id));
    const workspace = preset('Personal workspace', pins);
    if (pins.length > 4) {
        const shortcuts = workspace.widgets[0]!;
        workspace.widgets = place(workspace.widgets, shortcuts.id, { ...shortcuts.desktop, h: 30 });
    }
    return { schemaVersion: 1, revision: 0, active: workspace.id, workspaces: [workspace], preferences: { rail: true, density: p.density, timezone: p.home.timezone === 'device' ? Intl.DateTimeFormat().resolvedOptions().timeZone : p.home.timezone, hidden: p.home.hidden }, tasks: [], events: [], notes: [], trackers: [], logs: [], activity: [], captureDraft: '', legacyBackup: legacy && legacy.length<=8192 ? legacy : null };
}
function object(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }
function text(v: unknown, max = 10000) { return typeof v === 'string' && v.length <= max; }
function unique(items: {
    id: string;
}[]) { return new Set(items.map(x => x.id)).size === items.length; }
export function validDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s; }
export function parseState(raw: string): WorkspaceState {
    if (new TextEncoder().encode(raw).length > MAX_EXPORT_BYTES)
        throw new Error('Workspace exceeds the 5 MB import limit.');
    const s: unknown = JSON.parse(raw);
    if (!object(s) || s.schemaVersion !== 1)
        throw new Error('Unsupported workspace version. The saved document was left untouched.');
    const keys = ['schemaVersion','revision','active','workspaces','preferences','tasks','events','notes','trackers','logs','activity','captureDraft','legacyBackup'];
    if (Object.keys(s).some(key=>!keys.includes(key))) throw new Error('Unexpected workspace fields. Import only a workspace backup.');
    const v = s as unknown as WorkspaceState;
    if (!Number.isSafeInteger(v.revision) || v.revision < 0 || !text(v.active, 128) || !Array.isArray(v.workspaces) || v.workspaces.length < 1 || v.workspaces.length > 10 || !unique(v.workspaces))
        throw new Error('Invalid workspace document.');
    for (const w of v.workspaces)
        if (!object(w) || !text(w.id, 128) || !text(w.title, 80) || !w.title.trim() || w.schemaVersion !== 1 || !Number.isSafeInteger(w.revision) || w.revision < 0 || !text(w.updatedAt) || !Array.isArray(w.widgets) || w.widgets.length > 32 || !unique(w.widgets) || !w.widgets.every(x => object(x) && text(x.id, 128) && text(x.type, 100) && Number.isInteger(x.typeVersion) && x.typeVersion >= 1 && text(x.view, 100) && validWidget(x)))
            throw new Error('Invalid widget or layout.');
    if (!v.workspaces.some(w => w.id === v.active) || !object(v.preferences) || typeof v.preferences.rail !== 'boolean' || typeof v.preferences.hidden !== 'boolean' || !['compact', 'comfortable'].includes(v.preferences.density) || !text(v.preferences.timezone, 100))
        throw new Error('Invalid workspace preferences.');
    if(v.preferences.recordRecentLaunches!==undefined && typeof v.preferences.recordRecentLaunches!=='boolean')throw new Error('Invalid recent app preference.');
    new Intl.DateTimeFormat('en', { timeZone: v.preferences.timezone });
    if (v.preferences.theme !== undefined && !['system','light','dark'].includes(v.preferences.theme)) throw new Error('Invalid theme preference.');
    for (const key of ['tasks', 'events', 'notes', 'trackers', 'logs', 'activity'] as const) {
        const rows = v[key];
        if (!Array.isArray(rows) || rows.length > (key === 'trackers' ? 100 : key === 'activity' ? 500 : 10000) || !unique(rows) || !rows.every(x => object(x) && text(x.id, 128) && x.id.length > 0))
            throw new Error('Invalid content records.');
    }
    if (!v.tasks.every(t => text(t.title, 240) && t.title.trim() && text(t.notes, 2000) && text(t.due, 10) && (!t.due || validDate(t.due)) && text(t.time, 5) && (!t.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)) && ['none', 'low', 'medium', 'high'].includes(t.priority) && (t.completedAt === null || text(t.completedAt, 100))))
        throw new Error('Invalid task.');
    if (!v.events.every(e => text(e.title, 240) && e.title.trim() && validDate(e.date) && validDate(e.endDate) && e.endDate >= e.date && typeof e.allDay === 'boolean' && text(e.start, 100) && text(e.end, 100) && text(e.zone, 100) && (e.allDay || (Number.isFinite(Date.parse(e.start)) && Date.parse(e.end) > Date.parse(e.start)))))
        throw new Error('Invalid calendar event.');
    if (!v.notes.every(n => text(n.title, 240) && text(n.body, 10000) && text(n.updatedAt, 100)) || !v.trackers.every(t => text(t.title, 80) && t.title.trim() && text(t.unit, 40) && ['count', 'duration', 'checklist'].includes(t.kind) && ['daily', 'weekly'].includes(t.cadence) && Number.isFinite(t.goal) && t.goal > 0 && t.goal <= 100000) || !v.logs.every(l => v.trackers.some(t => t.id === l.trackerId) && validDate(l.date) && Number.isFinite(l.value) && l.value >= 0 && l.value <= 100000 && text(l.note, 500)))
        throw new Error('Invalid note or tracker.');
    if (!v.activity.every(a => text(a.title, 300) && text(a.at, 100) && text(a.kind, 80)) || !text(v.captureDraft, 10000) || (v.legacyBackup !== null && !text(v.legacyBackup, 8192)))
        throw new Error('Invalid activity or draft.');
    return clone(v);
}
export function activity(s: WorkspaceState, title: string, kind = 'local') { s.activity.unshift({ id: uid(), title, at: stamp(), kind }); s.activity = s.activity.slice(0, 500); }
export function dayKey(zone: string, date = new Date()) { const p = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); return ['year', 'month', 'day'].map(k => p.find(x => x.type === k)!.value).join('-'); }
export function addDays(key: string, n: number) { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function weekDays(key: string) { const weekday = (new Date(key + 'T12:00:00Z').getUTCDay() + 6) % 7; return Array.from({ length: 7 }, (_, i) => addDays(key, i - weekday)); }
export function trackerTotal(s: WorkspaceState, id: string, date: string) { const t = s.trackers.find(x => x.id === id); const dates = t?.cadence === 'daily' ? [date] : weekDays(date); return s.logs.filter(l => l.trackerId === id && dates.includes(l.date)).reduce((n, l) => n + l.value, 0); }
export function zonedInstant(date: string, time: string, zone: string): string {
    if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        throw new Error('Enter a valid date and time.');
    const desired = Date.parse(date + 'T' + time + ':00Z');
    let guess = desired;
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const local = (at: number) => { const p = formatter.formatToParts(new Date(at)); const get = (k: string) => p.find(x => x.type === k)!.value; return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:00Z`; };
    for (let i = 0; i < 4; i++)
        guess += desired - Date.parse(local(guess));
    if (local(guess) !== date + 'T' + time + ':00Z')
        throw new Error('This time does not exist in your timezone because clocks change. Choose another time.');
    return new Date(guess).toISOString();
}
export function formatTrackerValue(tracker: {kind:string;unit:string}, value:number) {
    if (tracker.kind === 'duration' && ['min','minutes','minute'].includes(tracker.unit.toLocaleLowerCase())) {
        const hours=Math.floor(value/60), minutes=Number((value%60).toFixed(1));
        return `${hours?hours+'h':''}${hours&&minutes?' ':''}${minutes||!hours?minutes+'m':''}`;
    }
    return String(value);
}
