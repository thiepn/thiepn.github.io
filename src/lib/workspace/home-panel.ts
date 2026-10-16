import { integratedLocalDay } from './integrated-overview';
import { renderFolioDevice, type FolioDeviceStatus } from './folio-panel';
import { renderNotesDevice, type NotesDeviceStatus } from './notes-panel';
import type { NotesDeviceSummary } from './notes-device';
import type { FolioDeviceSnapshot } from './folio-device';
import { dayKey } from './model';
import { HUB_LANGUAGE_IDS, HUB_LANGUAGE_OWNER_ROUTES, ownerLanguageLink, type HubLanguageCard } from './language-read';
import type { WorkspaceState, AppShortcut } from './types';

export type LanguageLoadStatus = 'signed-out' | 'loading' | 'ready' | 'unavailable';
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,
  char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const labelTime = (value: string, zone: string) => new Date(value).toLocaleTimeString(undefined, {
  timeZone: zone, hour: '2-digit', minute: '2-digit',
});
const viewDate = (date: string) => new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' });

export function renderIntegratedHome(
  state: WorkspaceState, status: LanguageLoadStatus, cards: readonly HubLanguageCard[],
  checkedAt: number | null, apps: readonly AppShortcut[],
  folio: { status: FolioDeviceStatus; snapshot: FolioDeviceSnapshot | null } =
      { status: 'disconnected', snapshot: null },
  notesSource: { status: NotesDeviceStatus; snapshot: NotesDeviceSummary | null } =
      { status: 'disconnected', snapshot: null },
): string {
  const day = integratedLocalDay(state);
  const zone = state.preferences.timezone;
  const localSource = '<span class="ws-source">Hub · this browser</span>';
  const tasks = day.tasks.slice(0, 4).map(task =>
    '<div class="ws-brief-item"><button type="button" data-action="edit-task" data-id="' + esc(task.id) + '">' + esc(task.title) +
    '</button><small>' + (task.due < day.date ? 'Overdue' : task.time ? esc(task.time) : '') + '</small>' +
    (task.completedAt ? '<small>Done</small>' : '<button type="button" class="ws-brief-done" data-action="brief-complete-task" data-id="' + esc(task.id) + '" aria-label="Complete ' + esc(task.title) + '">Done</button>') + '</div>'
  ).join('');
  const agenda = day.agenda.slice(0, 4).map(event =>
    '<div class="ws-brief-item"><span class="ws-brief-time">' +
    (event.allDay ? 'All day' : esc(labelTime(event.start, zone))) +
    '</span><button type="button" data-action="edit-event" data-id="' + esc(event.id) +
    '">' + esc(event.title) + '</button></div>'
  ).join('');
  const upcoming = day.upcoming.slice(0, 3).map(event => {
    const when = event.allDay ? event.date : dayKey(zone, new Date(event.start));
    return '<div class="ws-brief-item"><small class="ws-brief-time">' + esc(when.slice(5)) +
      '</small><button type="button" data-action="edit-event" data-id="' + esc(event.id) + '">' +
      esc(event.title) + '</button></div>';
  }).join('');
  const trackers = day.trackerProgress.slice(0, 4).map(tracker => {
    const progress = Math.min(tracker.total, tracker.goal);
    return '<div class="ws-brief-tracker"><div><strong>' + esc(tracker.title) + '</strong>' +
      '<small>' + esc(tracker.total) + ' / ' + esc(tracker.goal) + ' ' +
      esc(tracker.unit) + ' · ' + esc(tracker.cadence === 'daily' ? 'today' : 'this week') + '</small></div>' +
      '<progress value="' + progress + '" max="' + tracker.goal + '" aria-label="' + esc(tracker.title) +
      ' progress"></progress><button type="button" class="ws-text-button" data-action="brief-log-tracker" data-id="' +
      esc(tracker.id) + '">Log</button></div>';
  }).join('');
  const notes = day.recentNotes.map(note =>
    '<div class="ws-brief-item"><span aria-hidden="true">·</span>' +
    '<button type="button" data-action="edit-note" data-id="' + esc(note.id) + '">' +
    esc(note.title || 'Untitled note') + '</button><small>' +
    esc(new Date(note.updatedAt).toLocaleDateString()) + '</small></div>'
  ).join('');
  const languageMessage = status === 'signed-out' ? 'Sign in to Hub to check published language summaries.'
    : status === 'loading' ? 'Checking your published language progress…'
    : status === 'unavailable' ? (cards.length ? 'Source is unreachable. Last result from this tab is shown below.' : 'Language source unavailable. No progress is assumed.')
    : !cards.length ? 'No visible language snapshots have been published to Core for this account.' : '';
  const languageRows = status === 'signed-out' ? '' : HUB_LANGUAGE_IDS.map(id => {
    const card = cards.find(value => value.appId === id);
    const app = apps.find(value => value.id === id);
    const title = id[0]!.toUpperCase() + id.slice(1);
    const sourceUrl = app?.url ?? HUB_LANGUAGE_OWNER_ROUTES[id];
    const link = sourceUrl ? ownerLanguageLink(sourceUrl, card?.action.route) : null;
    if (!card) return '<div class="ws-language-row"><div><strong>' + title +
      '</strong><small>' + (status === 'unavailable' ? 'Source unavailable' : status === 'loading' ? 'Checking published snapshot' : 'Not shared or no publisher snapshot') + '</small></div>' +
      (sourceUrl ? '<a href="' + esc(sourceUrl) + '" rel="noreferrer">Study in app ↗</a>' : '') + '</div>';
    const snapshot = viewDate(card.generatedAt);
    const freshness = status === 'unavailable' || card.stale ? 'Outdated source snapshot' : 'Source snapshot';
    const metrics = card.metrics.map(metric => esc(metric.label) + ': ' + esc(metric.current) +
      (metric.total === undefined ? '' : ' / ' + esc(metric.total)) +
      (metric.unit ? ' ' + esc(metric.unit) : '')).join(' · ');
    return '<div class="ws-language-row"><div><strong>' + esc(card.name) + '</strong>' +
      '<span class="ws-language-numbers">' + card.due + ' due · ' + card.todayEvents +
      ' study events today · ' + card.streakDays + '-day streak</span>' +
      (metrics ? '<small>' + metrics + '</small>' : '') +
      '<small>' + freshness + ' · generated ' + esc(snapshot) + '</small></div>' +
      (link ? '<a href="' + esc(link) + '" rel="noreferrer">' + esc(card.action.label || 'Continue in app') + ' ↗</a>' : '') + '</div>';
  }).join('');
  return '<section class="ws-daily-brief" aria-label="Daily information without opening other apps">' +
    '<header class="ws-brief-heading"><div><h2>Today at a glance</h2><p>Live local records and authorized source summaries, kept separate.</p></div>' +
    (status === 'signed-out' ? '' :
      '<button type="button" class="ws-text-button" data-action="refresh-languages">Refresh languages</button>') +
    '</header><div class="ws-brief-grid">' +
    '<section class="ws-brief-card"><header><h3>Tasks</h3>' + localSource + '</header>' +
    '<p class="ws-brief-stat">' + day.remaining + ' remaining' +
    (day.overdue ? ' · ' + day.overdue + ' overdue' : '') + '</p>' +
    (tasks || '<p class="ws-muted">No tasks due or overdue in this workspace.</p>') +
    (day.unscheduled ? '<small class="ws-muted">' + day.unscheduled + ' unscheduled local tasks</small>' : '') +
    '<div class="ws-brief-actions"><button type="button" class="ws-text-button" data-action="brief-new-task">Add task</button><a href="/home/tasks/">All local tasks</a></div></section>' +
    '<section class="ws-brief-card"><header><h3>Agenda</h3>' + localSource + '</header>' +
    (agenda || '<p class="ws-muted">No local events today.</p>') +
    (upcoming ? '<details class="ws-brief-upcoming"><summary>Next 7 days · ' + day.upcoming.length +
      ' upcoming</summary>' + upcoming + '</details>' : '') +
    '<div class="ws-brief-actions"><button type="button" class="ws-text-button" data-action="brief-new-event">Add event</button><a href="/home/calendar/">Local calendar</a></div>' +
    '<p class="ws-muted ws-brief-boundary">Google Calendar and university calendars are not connected here.</p></section>' +
    '<section class="ws-brief-card"><header><h3>Latest notes</h3>' + localSource + '</header>' +
    (notes || '<p class="ws-muted">No Hub-local notes yet.</p>') +
    '<div class="ws-brief-actions"><button type="button" class="ws-text-button" data-action="brief-capture">Capture note</button></div>' +
    '<p class="ws-muted ws-brief-boundary">Folio and Notes cloud content are not merged into this list.</p></section>' +
    '<section class="ws-brief-card"><header><h3>Habits &amp; trackers</h3>' + localSource + '</header>' +
    (trackers || '<p class="ws-muted">No locally configured trackers.</p>') +
    '<div class="ws-brief-actions"><a href="/home/trackers/">All local trackers</a></div>' +
    '<p class="ws-muted ws-brief-boundary">Folio habit entries are separate until its owner permits a summary.</p></section>' +
    renderFolioDevice(folio.status, folio.snapshot) +
    renderNotesDevice(notesSource.status, notesSource.snapshot) +
    '<section class="ws-brief-card ws-brief-languages"><header><h3>Language learning</h3>' +
    '<span class="ws-source">Core · published P8 read models</span></header>' +
    (languageMessage ? '<p class="ws-muted" role="status">' + esc(languageMessage) + '</p>' : '') +
    languageRows + (checkedAt && status !== 'signed-out' ?
    '<small class="ws-muted">Last checked this tab: ' + esc(new Date(checkedAt).toLocaleTimeString()) +
    ' · Learning apps own progress and review grading.</small>' : '') +
    '</section></div></section>';
}
