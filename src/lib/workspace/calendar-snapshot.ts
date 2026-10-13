import { addDays, dayKey, validDate, zonedInstant } from './model';

/** Session-only snapshot of a user-chosen iCalendar export. This is never a live Google connection. */
export interface CalendarSnapshotEvent {
    key: string;
    uid: string;
    title: string;
    start: string;
    end: string;
    startDay: string;
    endDay: string; // inclusive display end, including for all-day events
    allDay: boolean;
    timezone: string;
    sourceId: string;
    sourceName: string;
}
export interface CalendarSnapshotSource {
    id: string;
    filename: string;
    name: string;
    importedAt: number;
    included: boolean;
    events: CalendarSnapshotEvent[];
    warnings: string[];
}
type Property = { value: string; params: Record<string, string> };
type Component = Map<string, Property[]>;
type ParsedDate = { day: string; time: string; instant: string; allDay: boolean; zone: string; floating: boolean };

export const SNAPSHOT_MAX_BYTES = 2_000_000;
export const SNAPSHOT_MAX_SOURCES = 6;
export const SNAPSHOT_MAX_EVENTS = 3000;
export const SNAPSHOT_VISIBLE_EVENTS = 60;
export const SNAPSHOT_STALE_MS = 6 * 60 * 60 * 1000;
export const SNAPSHOT_EXPIRE_MS = 24 * 60 * 60 * 1000;
const MAX_RECURRENCE_DAYS = 7300;
const WEEKDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

function property(block: Component, name: string) { return block.get(name)?.[0]; }
function plain(value: string, max = 200) {
    return value.replace(/\\n/gi, ' ').replace(/\\[,;]/g, char => char.slice(1))
        .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function icsDay(raw: string): string | null {
    if (!/^\d{8}$/.test(raw)) return null;
    const value = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
    return validDate(value) ? value : null;
}
function zoneValid(zone: string): boolean {
    try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; }
}
function parseDate(value: Property | undefined, defaultZone: string): ParsedDate | null {
    if (!value) return null;
    const day = icsDay(value.value.slice(0, 8));
    if (!day) return null;
    const allDay = value.params.VALUE === 'DATE' || /^\d{8}$/.test(value.value);
    const zone = value.value.endsWith('Z') ? 'UTC' : (value.params.TZID ?? defaultZone);
    if (!zoneValid(zone)) return null;
    if (allDay) return { day, time: '', instant: '', allDay: true, zone, floating: false };
    const match = value.value.match(/^\d{8}T(\d{2})(\d{2})(\d{2})?(Z)?$/);
    if (!match) return null;
    const time = `${match[1]}:${match[2]}`;
    if (+match[1]! > 23 || +match[2]! > 59 || +(match[3] ?? '0') > 59) return null;
    try {
        const instant = zonedInstant(day, time, zone);
        return { day, time, instant, allDay: false, zone, floating: !value.params.TZID && !value.value.endsWith('Z') };
    } catch { return null; } // DST gap: do not invent a time
}
function parseRows(content: string): { meta: Component; components: Component[] } {
    const physical = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const rows: string[] = [];
    for (const line of physical) {
        if ((line.startsWith(' ') || line.startsWith('\t')) && rows.length) rows[rows.length - 1] += line.slice(1);
        else rows.push(line);
    }
    const meta: Component = new Map(), components: Component[] = [];
    let active: Component | null = null;
    let count = 0;
    for (const row of rows) {
        const upper = row.toUpperCase();
        if (upper === 'BEGIN:VEVENT') { if (++count > SNAPSHOT_MAX_EVENTS) throw new Error('Too many events in this export (maximum 3,000).'); active = new Map(); continue; }
        if (upper === 'END:VEVENT') { if (active) components.push(active); active = null; continue; }
        if (!row || upper.startsWith('BEGIN:') || upper.startsWith('END:')) continue;
        const colon = row.indexOf(':');
        if (colon < 1) continue;
        const [rawName, ...params] = row.slice(0, colon).split(';');
        const name = rawName!.toUpperCase();
        if (!/^[A-Z0-9-]+$/.test(name) || row.length > 15000) continue;
        const parsed: Record<string, string> = {};
        for (const segment of params) {
            const eq = segment.indexOf('=');
            if (eq > 0) parsed[segment.slice(0, eq).toUpperCase()] = segment.slice(eq + 1).replace(/^"|"$/g, '');
        }
        const target = active ?? meta;
        const list = target.get(name) ?? [];
        list.push({ value: row.slice(colon + 1), params: parsed });
        target.set(name, list);
    }
    return { meta, components };
}
function recurrentDays(block: Component, start: ParsedDate, lastDay: string, warnings: string[]): string[] {
    const rule = property(block, 'RRULE');
    if (!rule) return [start.day];
    const options = Object.fromEntries(rule.value.split(';').map(part => part.split('=', 2))) as Record<string,string>;
    if (!['DAILY', 'WEEKLY'].includes(options.FREQ ?? '') ||
        Object.keys(options).some(key => !['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'WKST'].includes(key)) ||
        (options.BYDAY && !options.BYDAY.split(',').every(day => WEEKDAY.includes(day as typeof WEEKDAY[number]))) ||
        (options.WKST && options.WKST !== 'MO') ||
        (options.COUNT && (!/^\d+$/.test(options.COUNT) || +options.COUNT < 1 || +options.COUNT > 100000)) ||
        (options.INTERVAL && (!/^\d+$/.test(options.INTERVAL) || +options.INTERVAL < 1 || +options.INTERVAL > 365)) ||
        (options.UNTIL && !icsDay(options.UNTIL.slice(0,8)))) {
        warnings.push('One unsupported recurrence rule was omitted rather than represented inaccurately.');
        return [];
    }
    const interval = Number(options.INTERVAL ?? 1), count = Number(options.COUNT ?? 100000);
    const diffDays = (a: string, b: string) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000);
    const untilDay = options.UNTIL ? icsDay(options.UNTIL.slice(0, 8)) : null;
    const byDay = options.BYDAY?.split(',') ?? [WEEKDAY[new Date(start.day + 'T12:00:00Z').getUTCDay()]!];
    const startOffset = (new Date(start.day + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const firstWeek = addDays(start.day, -startOffset);
    let generated = 0;
    const matching: string[] = [];
    const limit = Math.min(MAX_RECURRENCE_DAYS, Math.max(0, diffDays(lastDay, start.day)));
    for (let delta = 0; delta <= limit; delta++) {
        const day = addDays(start.day, delta);
        if (untilDay && day > untilDay) break;
        const weekday = WEEKDAY[new Date(day + 'T12:00:00Z').getUTCDay()];
        const accepted = options.FREQ === 'DAILY'
            ? delta % interval === 0 && (!options.BYDAY || byDay.includes(weekday!))
            : Math.floor(diffDays(day, firstWeek) / 7) % interval === 0 && byDay.includes(weekday!);
        if (!accepted) continue;
        if (++generated > count) break;
        matching.push(day);
    }
    if (limit === MAX_RECURRENCE_DAYS && addDays(start.day, limit) < lastDay) warnings.push('A recurring series older than 20 years was truncated.');
    return matching;
}
function makeEvent(block: Component, start: ParsedDate, end: ParsedDate | null, day: string, sourceId: string, name: string): CalendarSnapshotEvent | null {
    const uid = plain(property(block,'UID')?.value ?? '', 240);
    const title = plain(property(block,'SUMMARY')?.value || 'Untitled event', 240);
    if (!uid) return null;
    try {
        const shiftedEnd = end && end.day >= start.day ? addDays(day, Math.round((Date.parse(end.day + 'T12:00:00Z') - Date.parse(start.day + 'T12:00:00Z')) / 86400000)) : day;
        const first = start.allDay ? '' : zonedInstant(day, start.time, start.zone);
        let last = start.allDay ? '' : (end && !end.allDay ? zonedInstant(shiftedEnd, end.time, end.zone) : new Date(Date.parse(first) + 3600000).toISOString());
        if (!start.allDay && Date.parse(last) <= Date.parse(first)) return null;
        const exclusiveEnd = start.allDay ? (end?.allDay ? shiftedEnd : addDays(day, 1)) : '';
        return {
            uid, title, sourceId, sourceName: name, timezone: start.zone, allDay: start.allDay,
            key: `${sourceId}:${uid}:${day}:${start.time}`,
            start: first, end: last,
            startDay: day,
            endDay: start.allDay ? addDays(exclusiveEnd, -1) : dayKey(start.zone, new Date(last)),
        };
    } catch { return null; }
}
export function parseICalendar(text: string, filename: string, sourceId: string, selectedZone: string, now = Date.now()): CalendarSnapshotSource {
    if (new TextEncoder().encode(text).length > SNAPSHOT_MAX_BYTES) throw new Error('Calendar file must be smaller than 2 MB.');
    if (!zoneValid(selectedZone)) throw new Error('Invalid calendar display timezone.');
    if (!/BEGIN:VCALENDAR/i.test(text) || !/END:VCALENDAR/i.test(text)) throw new Error('Select a valid .ics iCalendar file.');
    const { meta, components } = parseRows(text);
    const sourceName = plain(property(meta, 'X-WR-CALNAME')?.value || filename.replace(/\.ics$/i,''), 90) || 'Imported calendar';
    const fileZone = property(meta, 'X-WR-TIMEZONE')?.value || selectedZone;
    const defaultZone = zoneValid(fileZone) ? fileZone : selectedZone;
    const warnings: string[] = [];
    let floating = 0, invalid = 0, repeated = 0;
    const horizonStart = dayKey(selectedZone, new Date(now));
    const horizonEnd = addDays(horizonStart, 31);
    const overrideDates = new Set<string>();
    const excludedDates = new Set<string>();
    for (const block of components) {
        const uid = plain(property(block, 'UID')?.value ?? '', 240);
        for (const prop of block.get('EXDATE') ?? []) {
            for (const item of prop.value.split(',')) {
                const excluded = parseDate({ value: item, params: prop.params }, defaultZone);
                if (uid && excluded) excludedDates.add(`${uid}:${excluded.day}`);
            }
        }
        const rec = property(block, 'RECURRENCE-ID');
        if (rec) {
            const d = parseDate(rec, defaultZone);
            const uid = plain(property(block, 'UID')?.value ?? '', 240);
            if (uid && d) overrideDates.add(`${uid}:${d.day}`);
        }
    }
    const output = new Map<string, CalendarSnapshotEvent>();
    for (const block of components) {
        const uid = plain(property(block, 'UID')?.value ?? '', 240);
        const start = parseDate(property(block,'DTSTART'), defaultZone);
        if (!uid || !start) { invalid++; continue; }
        if (start.floating) floating++;
        if (property(block,'STATUS')?.value.toUpperCase() === 'CANCELLED') continue;
        const end = parseDate(property(block,'DTEND'), defaultZone);
        const override = !!property(block,'RECURRENCE-ID');
        const days = override ? [start.day] : recurrentDays(block, start, horizonEnd, warnings);
        for (const day of days) {
            if (!override && (overrideDates.has(`${uid}:${day}`) || excludedDates.has(`${uid}:${day}`))) continue;
            const event = makeEvent(block, start, end, day, sourceId, sourceName);
            if (!event || event.endDay < horizonStart || event.startDay > horizonEnd) continue;
            const key = `${uid}:${event.allDay ? day : event.start}`;
            if (output.has(key)) repeated++;
            output.set(key, event);
            if (output.size >= SNAPSHOT_VISIBLE_EVENTS * 4) break;
        }
    }
    if (floating) warnings.push(`${floating} event(s) had floating times; displayed using the export calendar's timezone (or the selected Hub timezone).`);
    if (invalid) warnings.push(`${invalid} event(s) lacked a valid identifier or start and were skipped.`);
    if (repeated) warnings.push(`${repeated} repeated instances with the same event identity were combined.`);
    const events = [...output.values()].sort((a,b) =>
        a.startDay.localeCompare(b.startDay) ||
        (a.allDay === b.allDay ? 0 : a.allDay ? -1 : 1) ||
        a.start.localeCompare(b.start) || a.title.localeCompare(b.title))
        .slice(0, SNAPSHOT_VISIBLE_EVENTS * 2);
    return { id: sourceId, filename, name: sourceName, importedAt: now, included: true, events, warnings: [...new Set(warnings)].slice(0,6) };
}
export function selectedCalendarEvents(sources: readonly CalendarSnapshotSource[], zone: string, now = Date.now()): CalendarSnapshotEvent[] {
    if (!zoneValid(zone)) return [];
    const start = dayKey(zone, new Date(now)), end = addDays(start, 7);
    const result: CalendarSnapshotEvent[] = [];
    const seen = new Set<string>();
    for (const source of sources.filter(s => s.included && now-s.importedAt < SNAPSHOT_EXPIRE_MS)) {
        for (const event of source.events) {
            const first = event.allDay ? event.startDay : dayKey(zone, new Date(event.start));
            const last = event.allDay ? event.endDay : dayKey(zone, new Date(event.end));
            if (first > end || last < start) continue;
            // Exact owner UID + actual instance (never guess that matching titles are duplicates).
            const identity = `${event.uid}:${event.allDay ? event.startDay : event.start}:${event.allDay ? event.endDay : event.end}`;
            if (seen.has(identity)) continue;
            seen.add(identity);
            result.push(event);
        }
    }
    return result.sort((a,b) => (a.allDay ? a.startDay : dayKey(zone,new Date(a.start))).localeCompare(b.allDay ? b.startDay : dayKey(zone,new Date(b.start))) ||
        (a.allDay === b.allDay ? 0 : a.allDay ? -1 : 1) ||
        a.start.localeCompare(b.start) || a.sourceName.localeCompare(b.sourceName)).slice(0,SNAPSHOT_VISIBLE_EVENTS);
}
