import { buildHomeSummary, type HomeEvent, type HomeTask } from './home-summary';
import type { AppShortcut, WorkspaceState } from './types';

const escapeHTML = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const dayLabel = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
const timeLabel = (at: string, zone: string) => new Date(at).toLocaleTimeString(undefined, { timeZone: zone, hour: '2-digit', minute: '2-digit' });

function priorityRow(entry: HomeTask): string {
    const { task, status } = entry;
    const when = status === 'overdue' ? 'Overdue · ' + task.due : status === 'today' ? 'Due today' : status === 'unscheduled' ? 'No due date' : dayLabel(task.due);
    return `<div class="ws-home-task">
        <input type="checkbox" data-task-toggle="${escapeHTML(task.id)}" aria-label="Complete ${escapeHTML(task.title)}"/>
        <button type="button" data-action="edit-task" data-id="${escapeHTML(task.id)}" class="ws-home-task-open"><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(when)}${task.time ? ' · ' + escapeHTML(task.time) : ''}</small></button>
        ${task.priority !== 'none' ? `<span class="ws-home-priority" data-priority="${task.priority}">${escapeHTML(task.priority)}</span>` : ''}
    </div>`;
}
function agendaRow(entry: HomeEvent, today: string, zone: string): string {
    const { event, startDay, endDay } = entry;
    const day = startDay <= today ? 'Today' : dayLabel(startDay);
    const clock = event.allDay ? 'All day' : timeLabel(event.start, zone);
    const span = startDay !== endDay ? ' · through ' + dayLabel(endDay) : '';
    return `<div class="ws-home-event"><span class="ws-home-event-time">${escapeHTML(day)}<small>${escapeHTML(clock)}</small></span>
      <button type="button" class="ws-home-event-open" data-action="edit-event" data-id="${escapeHTML(event.id)}"><strong>${escapeHTML(event.title)}</strong><small>Local Hub event${escapeHTML(span)}</small></button></div>`;
}

/** All links are supplied by the published Hub launcher list, not synthesized deep links. */
export function renderOwnerHandoffs(apps: readonly AppShortcut[], limit = 4): string {
    const choices: Array<{ id: string; label: string; description: string; useAction: boolean }> = [
        { id: 'thiepn-library', label: 'Continue in Library', description: 'Open reading in Library', useAction: true },
        { id: 'notes', label: 'Write in Notes', description: 'Create in the Notes app', useAction: true },
        { id: 'tms60', label: 'Study verses', description: 'Open TMS60', useAction: true },
        { id: 'le-carnet-francais', label: 'Open French course', description: 'No lesson progress read', useAction: false },
    ];
    const links = choices.slice(0, Math.max(0, Math.min(4, limit))).map(choice => {
        const app = apps.find(item => item.id === choice.id);
        if (!app) return '';
        const url = choice.useAction ? (app.action?.url ?? app.url) : app.url;
        return `<a class="ws-handoff" href="${escapeHTML(url)}" rel="noreferrer"><span><strong>${escapeHTML(choice.label)}</strong><small>${escapeHTML(choice.description)}</small></span><span aria-hidden="true">↗</span></a>`;
    }).filter(Boolean);
    return links.join('');
}

export function renderMobileToday(state: WorkspaceState, today: string): string {
    const summary = buildHomeSummary(state, today);
    const first = summary.upcomingEvents[0];
    const next = first ? (first.startDay <= today ? 'Today' : dayLabel(first.startDay)) + ' · ' + first.event.title : 'No events in the next 7 days';
    return `<section class="ws-mobile-today" aria-label="Today at a glance">
      <div class="ws-mobile-today-title"><strong>Today</strong><span>Hub local · ${escapeHTML(dayLabel(today))}</span></div>
      <div class="ws-mobile-today-stats">
        <span><strong>${summary.dueToday}</strong> due today</span>
        ${summary.overdue ? `<span class="ws-overdue"><strong>${summary.overdue}</strong> overdue</span>` : ''}
        <span><strong>${summary.completedToday}</strong> completed today</span>
      </div>
      <p class="ws-mobile-next">${escapeHTML(next)}</p>
      <div class="ws-mobile-today-actions"><button type="button" data-action="new-task" class="ws-button">+ Task</button><button type="button" data-action="capture-task" class="ws-button">Inbox</button><a href="/home/calendar/" class="ws-button">Calendar</a><button type="button" data-action="capture" class="ws-button">Capture</button></div>
    </section>`;
}

export function renderHomeOverview(state: WorkspaceState, apps: readonly AppShortcut[], today: string): string {
    const summary = buildHomeSummary(state, today);
    const tasks = summary.upcomingTasks.length
        ? summary.upcomingTasks.slice(0, 3).map(priorityRow).join('')
        : `<p class="ws-home-empty">No outstanding tasks scheduled for the next week. Add a task or open Tasks to plan ahead.</p>`;
    const events = summary.upcomingEvents.length
        ? summary.upcomingEvents.slice(0, 2).map(e => agendaRow(e, today, state.preferences.timezone)).join('')
        : `<p class="ws-home-empty">No local events in the next seven days. Connected calendars are not shown here.</p>`;
    const handoffs = renderOwnerHandoffs(apps, 2);
    const inbox = state.tasks.filter(t => !t.completedAt && !t.due).length;
    return `<section class="ws-home-lead" aria-label="Daily overview">
      <header class="ws-home-lead-heading"><div><p class="ws-home-eyebrow">Your day</p><h2>Pick up what matters</h2><p>Priorities and events saved in this browser, with direct links to your THIEPN apps.</p></div>
        <div class="ws-home-lead-actions"><button type="button" class="ws-primary" data-action="capture">+ Local capture</button><button type="button" class="ws-button" data-action="capture-task">+ Inbox task</button><button type="button" class="ws-button" data-action="new-task">+ Dated task</button></div>
      </header>
      <div class="ws-home-lead-grid">
        <section class="ws-home-panel" aria-labelledby="ws-priorities"><header><h3 id="ws-priorities">Next priorities</h3><a href="/home/tasks/">All tasks</a></header>
          <p class="ws-home-context">${summary.overdue ? summary.overdue + ' overdue · ' : ''}${summary.dueToday} due today · ${summary.completedToday} completed today</p>
          <div class="ws-home-list">${tasks}</div>
          <a class="ws-inbox-link" href="/home/tasks/?filter=inbox">Process inbox · ${inbox} unscheduled task${inbox===1?'':'s'} →</a>
          <small class="ws-home-source">Source: Hub tasks on this device</small>
        </section>
        <section class="ws-home-panel" aria-labelledby="ws-upcoming"><header><h3 id="ws-upcoming">Coming up</h3><a href="/home/calendar/">Calendar</a></header>
          <p class="ws-home-context">Upcoming local events · 7-day view</p>
          <div class="ws-home-list">${events}</div>
          <button type="button" class="ws-text-button" data-action="new-event">+ Add local event</button>
          <small class="ws-home-source">Source: Hub local calendar · not Google Calendar</small>
        </section>
        <section class="ws-home-panel ws-home-continue" aria-labelledby="ws-continue-apps"><header><h3 id="ws-continue-apps">Continue in your apps</h3><a href="/apps/">All apps</a></header>
          <p class="ws-home-context">Canonical app actions. Authorized metadata, when available, appears separately in the connected Continue desk.</p>
          <div class="ws-home-handoffs">${handoffs || `<p class="ws-home-empty">Open Apps to choose a THIEPN application.</p>`}</div>
          <small class="ws-home-source">These links do not read cross-app data</small>
        </section>
      </div>
    </section>`;
}
