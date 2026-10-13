import {
    parseICalendar, selectedCalendarEvents, SNAPSHOT_EXPIRE_MS, SNAPSHOT_MAX_BYTES,
    SNAPSHOT_MAX_SOURCES, SNAPSHOT_STALE_MS,
    type CalendarSnapshotSource,
} from '../lib/workspace/calendar-snapshot';
const root = document.querySelector<HTMLElement>('[data-external-calendar]');
const workspace = document.querySelector<HTMLElement>('[data-workspace]');
if (root && workspace) initialize(root, workspace);

function initialize(root: HTMLElement, workspace: HTMLElement) {
    let sources: CalendarSnapshotSource[] = [];
    let loading = false, message = '', error = '', hadExpired = false;
    let generation = 0;
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!);
    const displayZone = () => workspace.dataset.calendarZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isPrivate = () => workspace.dataset.calendarPrivate === 'true' || workspace.dataset.calendarPrivate === 'pending';
    const stamp = (ms: number) => new Date(ms).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day:'numeric', month:'short' });
    const formatDay = (day: string) => new Date(day + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone:'UTC', weekday:'short', day:'numeric', month:'short' });
    const dayInZone = (instant: string, zone: string) => {
        const parts = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
        return ['year','month','day'].map(key=>parts.find(p=>p.type===key)!.value).join('-');
    };
    const eventDate = (event: {start:string;startDay:string;allDay:boolean}, zone: string) =>
        event.allDay ? event.startDay : dayInZone(event.start, zone);
    const eventTime = (start: string, zone: string) =>
        new Date(start).toLocaleTimeString(undefined, { timeZone:zone, hour:'2-digit',minute:'2-digit' });

    const empty = (title: string, detail: string) =>
        `<div class="ws-calendar-empty"><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>`;
    function clear() {
        generation++;
        sources = [];
        loading = false;
        message = '';
        error = '';
        hadExpired = false;
        const file = root.querySelector<HTMLInputElement>('[data-calendar-ics]');
        if (file) file.value = '';
        render();
    }
    function render() {
        const content = root.querySelector<HTMLElement>('[data-calendar-preview]');
        if (!content) return;
        if (isPrivate()) {
            content.innerHTML = empty('Personal calendar hidden', 'Your imported calendar snapshot is cleared when Hub hides personal content.');
            return;
        }
        const now = Date.now();
        const expired = sources.filter(s => now - s.importedAt >= SNAPSHOT_EXPIRE_MS);
        if (expired.length) {
            hadExpired = true;
            sources = sources.filter(s => now - s.importedAt < SNAPSHOT_EXPIRE_MS);
        }
        const included = sources.filter(s => s.included);
        const stale = included.some(s => now - s.importedAt >= SNAPSHOT_STALE_MS);
        const events = selectedCalendarEvents(sources, displayZone(), now);
        const status = loading ? 'loading' : error ? 'error' :
            hadExpired && !sources.length ? 'expired' :
            !sources.length ? 'disconnected' : !included.length ? 'empty' :
            stale ? 'stale' : events.length ? 'ready' : 'empty';
        root.dataset.calendarStatus = status;
        root.querySelector<HTMLElement>('[data-calendar-status]')!.textContent = {
            loading:'Reading selected files…',
            error:'Import needs attention',
            expired:'Imported snapshot expired; select a new export',
            disconnected:'Not connected · no private calendar has been read',
            empty:'No selected events in the next 7 days',
            stale:'Imported snapshot may be outdated',
            ready:'Read-only imported snapshot',
        }[status];
        const controls = sources.length ? `<fieldset class="ws-calendar-sources"><legend>Selected calendars</legend>
            ${sources.map(s => `<label class="ws-calendar-source"><input type="checkbox" data-calendar-include="${esc(s.id)}" ${s.included?'checked':''}/>
                <span><strong>${esc(s.name)}</strong><small>${esc(s.filename)} · Imported ${esc(stamp(s.importedAt))} ${now - s.importedAt >= SNAPSHOT_STALE_MS ? '· stale' : '· snapshot'}</small></span>
                <button type="button" class="ws-text-button" data-calendar-remove="${esc(s.id)}" aria-label="Remove ${esc(s.name)} calendar">Remove</button>
            </label>`).join('')}
            </fieldset>` : '';
        const warnings = sources.flatMap(s => s.warnings.map(w => `${s.name}: ${w}`));
        const rows = events.length ? events.slice(0,30).map(event => {
            const day = eventDate(event,displayZone());
            const when = event.allDay ? 'All day' : eventTime(event.start,displayZone());
            const lastDay = event.allDay ? event.endDay : dayInZone(event.end, displayZone());
            const multiDay = lastDay !== day ? ` · until ${formatDay(lastDay)}` : '';
            return `<li class="ws-calendar-external-event"><span class="ws-calendar-when">${esc(formatDay(day))}<small>${esc(when)}</small></span>
                <span><strong>${esc(event.title)}</strong><small>${esc(event.sourceName)} · ${event.allDay ? 'All day' : esc(displayZone())}${esc(multiDay)}</small></span>
                <span class="ws-calendar-readonly">Read only</span></li>`;
        }).join('') : '';
        content.innerHTML = `
            ${error ? `<p role="alert" class="ws-calendar-error">${esc(error)}</p>` : ''}
            ${message ? `<p class="ws-calendar-message">${esc(message)}</p>` : ''}
            ${controls}
            ${warnings.length ? `<details class="ws-calendar-warnings"><summary>Import notes (${warnings.length})</summary><ul>${warnings.slice(0,6).map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>` : ''}
            ${events.length ? `<p class="ws-calendar-source-note">${events.length} event(s) in the next 7 days · showing ${Math.min(30,events.length)} · timezone ${esc(displayZone())}. Export time is not live Google sync time.</p>` : ''}
            ${rows ? `<ul class="ws-calendar-external-list">${rows}</ul>` : empty('No events to show', sources.length ? 'Choose another calendar or import a newer export. This is not proof that Google Calendar is empty.' : 'Select an .ics export from Google Calendar or another calendar to preview it here.')}
            ${sources.length ? `<button type="button" class="ws-text-button" data-calendar-clear>Clear all imported calendars</button>` : ''}
        `;
    }

    root.querySelector<HTMLInputElement>('[data-calendar-ics]')?.addEventListener('change', event => {
        const files = Array.from((event.target as HTMLInputElement).files ?? []);
        (event.target as HTMLInputElement).value = '';
        if (!files.length || isPrivate()) return;
        const own = ++generation;
        loading = true; error = ''; message = '';
        render();
        void (async () => {
            const results: CalendarSnapshotSource[] = [];
            const failures: string[] = [];
            for (const file of files) {
                if (file.size > SNAPSHOT_MAX_BYTES) { failures.push(`${file.name}: larger than 2 MB`); continue; }
                if (!/\.ics$/i.test(file.name)) { failures.push(`${file.name}: choose an .ics file`); continue; }
                if (sources.filter(s => !files.some(f => f.name === s.filename)).length + results.length >= SNAPSHOT_MAX_SOURCES) { failures.push('Maximum six imported calendars per session.'); break; }
                try {
                    const parsed = parseICalendar(await file.text(),file.name,crypto.randomUUID(),displayZone());
                    if (own !== generation || isPrivate()) return;
                    results.push(parsed);
                } catch (e) {
                    failures.push(`${file.name}: ${e instanceof Error ? e.message : 'Could not parse file'}`);
                }
            }
            if (own !== generation || isPrivate()) return;
            // Reimports with the same filename replace its previous snapshot, not accumulate copies.
            const replaced = new Set(results.map(s => s.filename));
            sources = [...sources.filter(s => !replaced.has(s.filename)), ...results].slice(0,SNAPSHOT_MAX_SOURCES);
            if (results.length) hadExpired = false;
            loading = false;
            error = failures.join(' · ');
            message = results.length ? `Imported ${results.length} calendar export(s) into temporary browser memory. No upload, account sync or Google API call occurred.` : '';
            render();
        })();
    });
    root.addEventListener('change', e => {
        const target = e.target as HTMLInputElement;
        const id = target.dataset.calendarInclude;
        if (!id) return;
        const source = sources.find(s=>s.id===id);
        if (source) source.included=target.checked;
        render();
    });
    root.addEventListener('click', e => {
        const target = (e.target as HTMLElement).closest<HTMLElement>('[data-calendar-clear],[data-calendar-remove]');
        if (!target) return;
        if (target.hasAttribute('data-calendar-clear')) { clear(); return; }
        const id=target.dataset.calendarRemove;
        sources=sources.filter(s=>s.id!==id);
        render();
    });
    const observer = new MutationObserver(() => { if (isPrivate()) clear(); else render(); });
    observer.observe(workspace,{attributes:true,attributeFilter:['data-calendar-private','data-calendar-zone']});
    window.addEventListener('hub:identity',clear);
    window.addEventListener('pagehide',clear);
    document.addEventListener('visibilitychange',() => { if (!document.hidden) render(); });
    render();
}
