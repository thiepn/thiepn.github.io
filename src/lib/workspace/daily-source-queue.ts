/**
 * P1: Volatile source-owned attention queue for the Today dashboard.
 *
 * This is not a new task, reminder or learning-progress engine. All rows are
 * derived from independently authorized owner read models already held by Hub.
 * Never persist, complete, reschedule or infer missing provider data here.
 */
import type { FolioDeviceSnapshot } from './folio-device';
import type { NotesDeviceSummary } from './notes-device';
import type { HubLanguageCard } from './language-read';
import { HUB_LANGUAGE_OWNER_ROUTES, ownerLanguageLink } from './language-read';
import { addDays, dayKey } from './model';

export type SourceAttentionKind = 'overdue' | 'today' | 'review' | 'upcoming';
export interface SourceAttention {
  source: 'Folio' | 'Notes' | 'Languages';
  kind: SourceAttentionKind;
  title: string;
  detail: string;
  href: string;
}
export interface SourceQueueInputs {
  day: string;
  timezone: string;
  folio: { status: 'ready' | 'disconnected' | 'awaiting' | 'unavailable'; snapshot: FolioDeviceSnapshot | null };
  notes: { status: 'ready' | 'disconnected' | 'awaiting' | 'unavailable'; snapshot: NotesDeviceSummary | null };
  languages: { status: 'ready' | 'signed-out' | 'loading' | 'unavailable'; cards: readonly HubLanguageCard[] };
}
export interface SourceQueue {
  rows: readonly SourceAttention[];
  available: number;
  incomplete: boolean;
  connectedSources: number;
}
const rank: Record<SourceAttentionKind, number> = { overdue: 0, today: 1, review: 2, upcoming: 3 };
const sourceRank: Record<SourceAttention['source'], number> = { Folio: 0, Notes: 1, Languages: 2 };
/** Never use a different source's ID to create a Hub-local task or URL. */
export function buildSourceQueue(inputs: SourceQueueInputs, limit = 7): SourceQueue {
  const rows: SourceAttention[] = [];
  let connectedSources = 0;
  let incomplete = false;
  const { day, timezone } = inputs;
  const f = inputs.folio;
  // A Folio "today" flag belongs to the date of Folio's own share, not Hub's
  // current date. Refuse to present yesterday's plans as today's actions.
  if (f.status === 'ready' && f.snapshot && f.snapshot.date === day) {
    connectedSources++;
    const items = f.snapshot.tasks.filter(t => t.plannedToday || !!t.deadline && t.deadline <= day);
    for (const task of items) {
      const overdue = !!task.deadline && task.deadline < day;
      rows.push({
        source: 'Folio',
        kind: overdue ? 'overdue' : 'today',
        title: task.title,
        detail: overdue ? 'Overdue in Folio' : task.plannedToday ? 'Planned in Folio' : 'Due in Folio',
        href: '/folio/?view=today',
      });
    }
    // Folio's aggregate may cover records beyond its bounded 12-item share.
    if (f.snapshot.pendingCount > items.length) {
      rows.push({
        source: 'Folio', kind: 'review', title: 'Review Folio plans',
        detail: f.snapshot.pendingCount + ' pending or planned in Folio; only ' + items.length + ' eligible tasks shown in this limited share',
        href: '/folio/?view=today',
      });
      incomplete = true;
    }
  } else incomplete = true;
  const n = inputs.notes;
  if (n.status === 'ready' && n.snapshot) {
    connectedSources++;
    const weekEnd = addDays(day, 7);
    for (const reminder of n.snapshot.reminders) {
      const instant = new Date(reminder.dueAt);
      if (!Number.isFinite(instant.getTime())) continue;
      const due = dayKey(timezone, instant);
      if (due > weekEnd) continue;
      rows.push({
        source: 'Notes',
        kind: due < day ? 'overdue' : due === day ? 'today' : 'upcoming',
        title: reminder.title,
        detail: due < day ? 'Overdue Notes reminder' : due === day ? 'Notes reminder today' : 'Notes reminder ' + due,
        href: '/notes/',
      });
    }
  } else incomplete = true;
  if (inputs.languages.status === 'ready') {
    connectedSources++;
    for (const card of inputs.languages.cards) {
      if (card.stale) { incomplete = true; continue; }
      if (!card.due) continue;
      const origin = HUB_LANGUAGE_OWNER_ROUTES[card.appId];
      const href = origin && ownerLanguageLink(origin, card.action.route);
      if (!href) { incomplete = true; continue; }
      rows.push({
        source: 'Languages', kind: 'review', title: card.name + ' reviews',
        detail: card.due + ' due according to its published study source',
        href,
      });
    }
  } else incomplete = true;
  const sorted = rows.sort((a, b) =>
    rank[a.kind] - rank[b.kind] || sourceRank[a.source] - sourceRank[b.source] ||
    a.title.localeCompare(b.title));
  const bounded = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 20) : 7;
  return { rows: sorted.slice(0, bounded), available: sorted.length, incomplete: incomplete || sorted.length > bounded, connectedSources };
}
