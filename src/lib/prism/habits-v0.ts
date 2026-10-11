/** Habits V0 is deliberately separate from HomeDocument and account/cloud sync. */
export const HABITS_V0 = [
  { id: 'devotion', label: 'Morning devotion', detail: 'Quiet time', target: 7, appSlug: null },
  { id: 'verses', label: 'Bible memorization', detail: 'TMS60 review', target: 6, appSlug: 'tms60' },
  { id: 'french', label: 'French practice', detail: '10–20 minutes', target: 6, appSlug: 'le-carnet-francais' },
  { id: 'reading', label: 'Reading', detail: 'Christian or nonfiction books', target: 5, appSlug: 'thiepn-library' },
  { id: 'fitness', label: 'Fitness', detail: 'Gym, workout or jogging', target: 3, appSlug: null },
  { id: 'music', label: 'Music practice', detail: 'Singing, guitar or drums', target: 3, appSlug: null },
  { id: 'prayer', label: 'Evening prayer', detail: 'Personal prayer', target: 7, appSlug: null },
] as const;

export type HabitV0Id = (typeof HABITS_V0)[number]['id'];
export type HabitV0Links = Partial<Record<HabitV0Id, string>>;
export interface HabitsV0Document {
  version: 1;
  targets: Record<HabitV0Id, number>;
  links: Record<HabitV0Id, string>;
  dates: Record<HabitV0Id, string[]>;
}

export function safeHabitLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const link = value.trim();
  if (!link) return '';
  if (link.length > 500 || /[\u0000-\u001f\u007f\\]/.test(link)) return null;
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  try {
    const parsed = new URL(link);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch { return null; }
}

export function localDayKey(day: Date): string {
  const year = day.getFullYear();
  return String(year).padStart(4, '0') + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
}

export function validDayKey(key: unknown): key is string {
  if (typeof key !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(key)) return false;
  const year = Number(key.slice(0, 4)), month = Number(key.slice(5, 7)), day = Number(key.slice(8, 10));
  const actual = new Date(Date.UTC(year, month - 1, day));
  return actual.getUTCFullYear() === year && actual.getUTCMonth() + 1 === month && actual.getUTCDate() === day;
}

export function weeklyCount(days: readonly string[], now: Date): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const a = localDayKey(start), b = localDayKey(end);
  return days.filter(day => day >= a && day <= b).length;
}

export function habitsStorageKey(owner: string | null): string | null {
  if (owner === null) return 'thiepn:prism-habits:v0:device';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)) return null;
  return 'thiepn:prism-habits:v0:owner:' + owner.toLowerCase();
}

export function createHabitsV0(links: HabitV0Links = {}): HabitsV0Document {
  const doc = { version: 1, targets: {}, links: {}, dates: {} } as HabitsV0Document;
  for (const habit of HABITS_V0) {
    doc.targets[habit.id] = habit.target;
    doc.links[habit.id] = safeHabitLink(links[habit.id] ?? '') ?? '';
    doc.dates[habit.id] = [];
  }
  return doc;
}

/** Return null rather than silently overwrite malformed or future-version data. */
export function parseHabitsV0(raw: string | null, defaults = createHabitsV0()): HabitsV0Document | null {
  if (raw === null) return createHabitsV0(defaults.links);
  if (raw.length > 500_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    if (data.version !== 1 || !data.targets || !data.links || !data.dates) return null;
    const targets = data.targets as Record<string, unknown>;
    const links = data.links as Record<string, unknown>;
    const dates = data.dates as Record<string, unknown>;
    const doc = createHabitsV0();
    for (const habit of HABITS_V0) {
      const id = habit.id, target = targets[id], link = links[id], days = dates[id];
      if (typeof target !== 'number' || !Number.isInteger(target) || target < 1 || target > 7) return null;
      if (typeof link !== 'string' || safeHabitLink(link) !== link) return null;
      if (!Array.isArray(days) || days.length > 4000 || !days.every(validDayKey)) return null;
      if (new Set(days).size !== days.length) return null;
      doc.targets[id] = target;
      doc.links[id] = link;
      doc.dates[id] = [...days].sort();
    }
    return doc;
  } catch { return null; }
}

export function setHabitCompletion(doc: HabitsV0Document, id: HabitV0Id, day: string, completed: boolean): HabitsV0Document {
  if (!validDayKey(day) || !HABITS_V0.some(habit => habit.id === id)) throw new Error('Invalid habit or day');
  const days = new Set(doc.dates[id]);
  if (completed) days.add(day);
  else days.delete(day);
  if (days.size > 4000) throw new Error('Local history limit reached');
  return { ...doc, dates: { ...doc.dates, [id]: [...days].sort() } };
}
