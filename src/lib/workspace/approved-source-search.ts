import type { NotesDeviceSummary } from './notes-device';
import type { FolioDeviceSnapshot } from './folio-device';
import {
  HUB_LANGUAGE_OWNER_ROUTES, ownerLanguageLink,
  type HubLanguageCard,
} from './language-read';
import type { AppShortcut } from './types';

/** Searchable temporary metadata solely from already approved, in-memory owners. */
export interface ApprovedSourceRow {
  id: string;
  title: string;
  detail: string;
  searchHint: string;
  href: string;
  icon: 'book-open' | 'calendar-days' | 'notebook-pen' | 'check-check' | 'languages';
}
export interface ApprovedSourceInput {
  folio: FolioDeviceSnapshot | null;
  notes: NotesDeviceSummary | null;
  languages: readonly HubLanguageCard[];
  apps: readonly AppShortcut[];
  now?: number;
}
const MAX_AGE = 5 * 60_000;
function fresh(iso: string, now: number): boolean {
  const timestamp = Date.parse(iso);
  return Number.isFinite(timestamp) && timestamp <= now + 30_000 && now - timestamp <= MAX_AGE;
}
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
function add(
  out: ApprovedSourceRow[], source: string, kind: string, id: string, title: string,
  detail: string, href: string, icon: ApprovedSourceRow['icon'],
) {
  out.push({id: source + ':' + kind + ':' + id, title, detail,
    searchHint: source + ' ' + kind, href, icon});
}

/** No remote reads, duplicated owner engines, persisted index or search history. */
export function approvedSourceRows(input: ApprovedSourceInput): ApprovedSourceRow[] {
  const now = input.now ?? Date.now();
  const results: ApprovedSourceRow[] = [];
  const folio = input.folio;
  if (folio && folio.schema === 'thiepn:folio-hub-daily' &&
      folio.source === 'folio-local-device' && fresh(folio.generatedAt, now)) {
    for (const task of folio.tasks.slice(0, 12))
      add(results, 'folio', 'task', task.id, task.title,
        'Folio approved task · ' +
        (task.deadline ? 'Due ' + task.deadline : task.plannedToday ? 'Planned today' : 'Owner plan'),
        '/folio/?view=today', 'check-check');
    for (const event of folio.events.slice(0, 12))
      add(results, 'folio', 'event', event.id, event.title,
        'Folio approved calendar · ' + date(event.start),
        '/folio/?view=planner', 'calendar-days');
    for (const note of folio.notes.slice(0, 5))
      add(results, 'folio', 'note', note.id, note.title,
        'Folio approved note title · ' + date(note.updatedAt),
        '/folio/?view=notes', 'notebook-pen');
    for (const habit of folio.habits.slice(0, 10))
      add(results, 'folio', 'habit', habit.id, habit.title,
        'Folio approved habit · ' +
        (habit.status === 'completed' ? 'Logged' : habit.status === 'skipped' ? 'Skipped' : 'Not completed'),
        '/folio/?view=habits', 'check-check');
  }
  const notes = input.notes;
  if (notes && notes.schema === 'thiepn:notes-hub-local' &&
      notes.source === 'notes-local-device' && fresh(notes.generatedAt, now)) {
    for (const note of notes.notes.slice(0, 8))
      add(results, 'notes', 'note', note.id, note.title,
        'Notes approved title · edited ' + date(note.updatedAt) + ' · open in Notes (no direct note link)',
        '/notes/', 'notebook-pen');
    for (const reminder of notes.reminders.slice(0, 6))
      add(results, 'notes', 'reminder', reminder.id, reminder.title,
        'Notes approved reminder · due ' + date(reminder.dueAt) + ' · open in Notes',
        '/notes/', 'calendar-days');
  }
  for (const language of input.languages.slice(0, 3)) {
    if (!['japanese', 'french', 'chinese'].includes(language.appId) ||
        !Number.isFinite(Date.parse(language.generatedAt))) continue;
    const app = input.apps.find(candidate => candidate.id === language.appId);
    const original = app?.url ?? HUB_LANGUAGE_OWNER_ROUTES[language.appId];
    const link = original ? ownerLanguageLink(original, language.action.route) : null;
    if (!link) continue;
    add(results, 'language', language.appId, language.appId, language.name,
      (language.stale ? 'Outdated published language summary' :
        'Published language summary · ' + language.due + ' source-reported items due') +
        ' · ' + language.action.label,
      link, 'languages');
  }
  return results;
}
