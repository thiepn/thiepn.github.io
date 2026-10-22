import {saveTracker,saveTrackerLog,removeTracker,validateTrackerChange,validateTrackerLog} from '../lib/workspace/commands/trackers';
import {workspaceAttention} from '../lib/workspace/attention';
import {selectedShortcuts} from '../lib/workspace/selectors';
import {clearSourceStates} from '../lib/providers/connection-state';
import {customLinks, setShortcuts, toggleShortcut, shortcutIds} from '../lib/workspace/commands';
import {resolveLaunch, safeCustomUrl} from '../lib/launches/resolver';
import { meaningfulState, addGuestState } from '../lib/workspace/sync-merge';
import { readConnectedApps, type ConnectedInsight } from './hub-connected-apps';
import { WorkspaceCloudSync } from '../lib/workspace/cloud-sync';
import { managedAccountEnabled, hubCloudTransport } from './hub-account';
import { setupHubCatalogue } from './hub-catalogue';
import { HUB_CATEGORIES } from '../data/taxonomy';
import { hubIdentity, readHubLanguageToken } from './portal-auth';
import { fetchHubLanguages, type HubLanguageCard } from '../lib/workspace/language-read';
import { renderIntegratedHome, type LanguageLoadStatus } from '../lib/workspace/home-panel';
import { FOLIO_DEVICE_MESSAGE, safeFolioBridgeReply, type FolioDeviceSnapshot } from '../lib/workspace/folio-device';
import { acceptNotesReply, type NotesDeviceSummary } from '../lib/workspace/notes-device';
import { renderSourceToday } from '../lib/workspace/source-today';
import type { NotesDeviceStatus } from '../lib/workspace/notes-panel';
import type { FolioDeviceStatus } from '../lib/workspace/folio-panel';
import { preferenceKey, validAccountId, type HubIdentity } from '../lib/hub-auth';
import { icon } from '../lib/workspace/icons';
import { initialState, parseState, activity, dayKey, addDays, weekDays, validDate, trackerTotal, zonedInstant, MAX_EXPORT_BYTES, formatTrackerValue } from '../lib/workspace/model';
import { WorkspaceStore, namespace, RevisionConflict } from '../lib/workspace/store';
import { WIDGETS, specification } from '../lib/workspace/registry';
import { utilityWidget } from '../lib/workspace/widget-views';
import { findPalette, PALETTE_SCOPES, GROUP_NAMES, type PaletteScope, type PaletteResult } from '../lib/workspace/search-palette';
import { approvedSourceRows } from '../lib/workspace/approved-source-search';
import { prepareCapture, taskMatchesFilter, taskCounts, applyTaskPlan, TASK_FILTERS, type TaskFilter, type TaskPlanAction } from '../lib/workspace/task-flow';
import { providerAction } from '../lib/providers/registry';
import { renderMobileToday } from '../lib/workspace/home-view';
import { renderReturnJourney, renderSavedComparison, renderRecoveryStrip, type ReturnContext } from '../lib/workspace/return-journey';
import { prepareTaskCalendarEvent, identicalLocalEvent, taskNoteSeed, noteTaskSeed, type WorkOrigin } from '../lib/workspace/context-handoffs';
import { reviewedEventMove, overlapsForEvent, type AgendaMode, type MoveEventRequest } from '../lib/workspace/planning-review';
import { renderPlanningReview, renderPlannerReviewSummary } from '../lib/workspace/planning-view';
import { eligibleWeekTasks, prepareWeeklyShift, applyWeeklyShift, taskSnapshot, MAX_WEEK_BATCH, MAX_WEEK_ROWS, WEEK_FILTERS, type WeekTaskFilter, type TaskBeforeMove } from '../lib/workspace/weekly-followthrough';
import { renderFocusPanel, focusTasks, focusClock, type FocusPresentation, type FocusDuration, type FocusLimit, type FocusQueue } from '../lib/workspace/daily-focus';
import { renderUnifiedJourneyNav, renderUnifiedToday, HOME_JOURNEY_MODES, type HomeJourneyMode, type JourneyStatus } from '../lib/workspace/unified-journey';
import { preset, PRESETS } from '../lib/workspace/presets';
import { place, ordered } from '../lib/workspace/layout';
import { uid, stamp, clone, type WorkspaceState, type Workspace, type Widget, type EditDraft, type AppShortcut, type Task, type CalendarEvent, type Note, type Tracker } from '../lib/workspace/types';
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const button = (action: string, label: string, id = '', className = 'ws-button') => `<button type="button" class="${className}" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ''}>${label}</button>`;
const field = (label: string, name: string, value = '', type = 'text', extra = '') => `<label class="ws-field">${label}<input aria-label="${esc(label)}" name="${name}" type="${type}" value="${esc(value)}" ${extra}/></label>`;
const select = (label: string, name: string, options: string[][], value: string, disabled = false) => `<label class="ws-field">${label}<select aria-label="${esc(label)}" name="${name}" ${disabled?'disabled':''}>${options.map(([id, title]) => `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
const area = (label: string, name: string, value: string, max = 10000) => `<label class="ws-field">${label}<textarea aria-label="${esc(label)}" name="${name}" maxlength="${max}">${esc(value)}</textarea></label>`;
const safeNavigationDay = (value:string|null):value is string => {
    if(!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    try {return validDate(value);}catch{return false;}
};
const root = document.querySelector<HTMLElement>('[data-workspace]');
if (root)
    void setup(root);
async function setup(root: HTMLElement) {
    let view = root.dataset.view ?? 'home';
    const staticView=()=>['apps','connections','search','inbox','flows','documents'].includes(view);
    const welcomeKey='thiepn:hub:welcome-dismissed';
    let welcomeDismissed=false;
    try { welcomeDismissed=localStorage.getItem(welcomeKey)==='1'; } catch { /* A UI preference must not block local work. */ }
    try { welcomeDismissed ||= sessionStorage.getItem(welcomeKey)==='1'; } catch { /* Session storage may be restricted. */ }
    const taskFilterFromUrl = view === 'tasks' ? new URLSearchParams(location.search).get('filter') : null;
    const homeModeFromUrl = view === 'home' ? new URLSearchParams(location.search).get('mode') : null;
    let homeModeRestorePending=true;
    const calendarParams = view === 'calendar' ? new URLSearchParams(location.search) : null;
    const agendaModeFromUrl = calendarParams?.get('mode') ?? null;
    let initialCalendarDate = calendarParams && safeNavigationDay(calendarParams.get('date')) ? calendarParams.get('date') : null;
    const initialReturnWeek = calendarParams && safeNavigationDay(calendarParams.get('return')) ? weekDays(calendarParams.get('return')!)[0]! : null;
    let initialCalendarRestorePending=true;
    const openReading = location.hash === '#reading';
    if (view === 'apps') {
        // Catalogue filters are public. Keep them without retaining private search terms.
        const category = new URLSearchParams(location.search).get('category');
        const url = new URL(location.href); url.search = ''; url.hash = '';
        if (category && (category === 'all' || HUB_CATEGORIES.some(value => value === category))) url.searchParams.set('category', category);
        history.replaceState(null, '', url.pathname + url.search);
    } else if(view==='home') {
        const mode=homeModeFromUrl==='focus'||homeModeFromUrl==='today'?homeModeFromUrl:null;
        history.replaceState(null,'',location.pathname+(mode?'?mode='+mode:''));
    } else if (view === 'calendar') {
        // Only public navigation date/mode may survive reload; never source IDs, record text, or provider state.
        const query=new URLSearchParams();
        if(initialCalendarDate)query.set('date',initialCalendarDate);
        if(agendaModeFromUrl==='week')query.set('mode','week');
        if(initialReturnWeek)query.set('return',initialReturnWeek);
        history.replaceState(null,'',location.pathname+(query.size?'?'+query.toString():''));
    } else if (!staticView() && (location.search || location.hash)) history.replaceState(null,'',location.pathname);
    const $ = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    const apps = JSON.parse($('[data-workspace-apps]').textContent ?? '[]') as AppShortcut[];
    let state: WorkspaceState | null = null, store: WorkspaceStore | null = null, channel: BroadcastChannel | null = null;
    let editing: EditDraft | null = null, layoutUndo: Workspace[] = [], layoutRedo: Workspace[] = [];
    let recoveryDraft: EditDraft | null = null, storageReady = false, locked = false, dirty = false, epoch = 0, conflict = false;
    let selected = dayKey(Intl.DateTimeFormat().resolvedOptions().timeZone), month = selected.slice(0, 7) + '-01';
    let agendaMode: AgendaMode = agendaModeFromUrl==='week'?'week':'day'; // View-only: never another calendar/scheduler store.
    let weekFilter:WeekTaskFilter='carry';
    let weekSelection=new Set<string>();
    let activeWeekReview:{snapshots:TaskBeforeMove[];epoch:number}|null=null;
    let weekReturnDate:string|null=initialReturnWeek; // Only current tab and safe calendar date/mode URL, never a private work item.
    let taskFilter: TaskFilter = taskFilterFromUrl && (TASK_FILTERS as readonly string[]).includes(taskFilterFromUrl) ? taskFilterFromUrl as TaskFilter : 'today', captureTimer: ReturnType<typeof setTimeout> | undefined, toastTimer: ReturnType<typeof setTimeout> | undefined;
    let privacyHeld = false;
    // Context handoff is UI-only and never a new relation table or cross-app progress record.
    let handoffOrigin: WorkOrigin | null = null;
    // Focus selection, quiet mode and clock are deliberately session-only UI state.
    let focus: FocusPresentation = {queue:'due',limit:5,duration:25,quiet:false,selectedId:null,remainingMs:25*60000,running:false,elapsed:false};
    let focusEndsAt=0, focusTick:ReturnType<typeof setInterval>|undefined;
    let homeMode:HomeJourneyMode=homeModeFromUrl==='focus'||homeModeFromUrl==='today'?homeModeFromUrl:'workspace'; // Presentation only, no new record store.
    let activeUnifiedReview:{task:TaskBeforeMove;epoch:number}|null=null;
    let contentUndo: { before: WorkspaceState; after: WorkspaceState } | null = null, searchQuery = '', searchScope: PaletteScope = 'all', rawRecovery = '';
    // Private Core snapshots and tokens are never written to IndexedDB, backups or DOM attributes.
    let notesSource: NotesDeviceSummary | null = null;
    let notesSourceStatus: NotesDeviceStatus = 'disconnected';
    let notesSourceOwner: string | null = null;
    let notesSourceNonce: string | null = null;
    let notesSourceWindow: Window | null = null;
    let notesSourceDeadline: ReturnType<typeof setTimeout> | null = null;
    function clearNotesSource() {
        notesSourceNonce = null;
        notesSourceWindow = null;
        if (notesSourceDeadline) clearTimeout(notesSourceDeadline);
        notesSourceDeadline = null;
        notesSource = null;
        notesSourceOwner = null;
        notesSourceStatus = 'disconnected';
    }
    function openNotesSource() {
        if (!state || locked || editing || privacyHeld || state.preferences.hidden) return;
        clearNotesSource();
        notesSourceOwner = hubIdentity.status === 'signed-in' ? 'user:' + hubIdentity.id : 'guest';
        notesSourceNonce = Array.from(crypto.getRandomValues(new Uint8Array(16)),
            byte => byte.toString(16).padStart(2, '0')).join('');
        const target = new URL('/notes/', location.origin);
        target.searchParams.set('hubNotes', notesSourceNonce);
        notesSourceStatus = 'awaiting';
        notesSourceWindow = window.open(target.href, '_blank');
        if (!notesSourceWindow) {
            clearNotesSource();
            notesSourceStatus = 'unavailable';
        } else {
            notesSourceDeadline = setTimeout(() => {
                if (notesSourceStatus !== 'awaiting') return;
                clearNotesSource();
                notesSourceStatus = 'unavailable';
                repaintOverview();
            }, 3 * 60_000);
        }
        repaintOverview();
    }
    window.addEventListener('message', event => {
        const scope = hubIdentity.status === 'signed-in' ? 'user:' + hubIdentity.id :
            hubIdentity.status === 'signed-out' ? 'guest' : null;
        if (!notesSourceNonce || event.origin !== location.origin ||
            event.source !== notesSourceWindow || !notesSourceOwner ||
            (scope && scope !== notesSourceOwner) || privacyHeld || state?.preferences.hidden)
            return;
        try {
            notesSource = acceptNotesReply(event.data, notesSourceNonce);
        } catch {
            return; // Forged, stale, malformed or unrelated message.
        }
        notesSourceStatus = 'ready';
        notesSourceNonce = null;
        notesSourceWindow = null;
        if (notesSourceDeadline) clearTimeout(notesSourceDeadline);
        notesSourceDeadline = null;
        repaintOverview();
    });
    let folioSnapshot: FolioDeviceSnapshot | null = null;
    // This binding never grants permission. It prevents a just-shared projection
    // from crossing an Account identity change during focus re-verification.
    let folioOwner: string | null = null;
    let folioStatus: FolioDeviceStatus = 'disconnected';
    let folioNonce: string | null = null;
    let folioPopup: Window | null = null;
    let folioTimeout: ReturnType<typeof setTimeout> | null = null;
    function resetFolio() {
        folioNonce = null;
        folioPopup = null;
        if (folioTimeout) clearTimeout(folioTimeout);
        folioTimeout = null;
        folioSnapshot = null;
        folioStatus = 'disconnected';
        folioOwner = null;
    }
    function openFolioBridge() {
        if (!state || locked || editing || privacyHeld || state.preferences.hidden) return;
        if (folioTimeout) clearTimeout(folioTimeout);
        folioOwner = hubIdentity.status === 'signed-in' ? 'user:' + hubIdentity.id : 'guest';
        folioNonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('');
        folioSnapshot = null;
        folioStatus = 'awaiting';
        const url = new URL('/folio/', location.origin);
        url.searchParams.set('hubBridge', folioNonce);
        folioPopup = window.open(url.href, '_blank');
        if (!folioPopup) {
            folioNonce = null;
            folioStatus = 'unavailable';
        } else {
            folioTimeout = setTimeout(() => {
                if (folioStatus === 'awaiting') {
                    folioNonce = null;
                    folioPopup = null;
                    folioStatus = 'unavailable';
                    repaintOverview();
                }
            }, 3 * 60_000);
        }
        repaintOverview();
    }
    window.addEventListener('message', event => {
        const currentScope = hubIdentity.status === 'signed-in' ? 'user:' + hubIdentity.id :
            hubIdentity.status === 'signed-out' ? 'guest' : null;
        if (!folioNonce || event.origin !== location.origin || event.source !== folioPopup ||
            !folioOwner || (currentScope && currentScope !== folioOwner) ||
            privacyHeld || state?.preferences.hidden) return;
        try {
            const snapshot = safeFolioBridgeReply(event.data, folioNonce);
            folioSnapshot = snapshot;
            folioStatus = 'ready';
            folioNonce = null;
            folioPopup = null;
            if (folioTimeout) clearTimeout(folioTimeout);
            folioTimeout = null;
        } catch {
            // Ignore unrelated messages: no echo, fallback data or weakened validation.
            return;
        }
        repaintOverview();
    });
    let languageOwner: string | null = null;
    let languageCards: readonly HubLanguageCard[] = [];
    let languageStatus: LanguageLoadStatus = 'signed-out';
    let languageCheckedAt: number | null = null;
    let languageLastAttempt = 0;
    let languageAbort: AbortController | null = null;
    function resetLanguages() {
        languageAbort?.abort();
        languageAbort = null;
        languageCards = [];
        languageStatus = 'signed-out';
        languageCheckedAt = null;
        languageLastAttempt = 0;
        languageOwner = null;
    }
    function repaintOverview() {
        const panel = root.querySelector<HTMLElement>('[data-native-overview]');
        if (panel && state && !privacyHeld && !state.preferences.hidden) {
            panel.innerHTML = renderIntegratedHome(state, languageStatus, languageCards, languageCheckedAt, apps, {
                status: folioStatus, snapshot: folioSnapshot,
            }, {status: notesSourceStatus, snapshot: notesSource});
        }
        const todayPanel = root.querySelector<HTMLElement>('[data-source-today]');
        if (todayPanel && state && !privacyHeld && !state.preferences.hidden) {
            todayPanel.outerHTML = renderSourceToday({
                folio: {status: folioStatus, snapshot: folioSnapshot},
                notes: {status: notesSourceStatus, snapshot: notesSource},
                languages: {status: languageStatus, cards: languageCards}, apps
            });
        }
    }
    async function refreshLanguages(force = false) {
        const owner = hubIdentity.status === 'signed-in' ? hubIdentity.id : null;
        if (view !== 'home' || !owner || owner !== languageOwner || !state ||
            privacyHeld || state.preferences.hidden || document.hidden || !navigator.onLine) {
            if (owner && owner === languageOwner && !navigator.onLine) {
                languageStatus = 'unavailable';
                repaintOverview();
            }
            return;
        }
        const now = Date.now();
        if (!force && now - languageLastAttempt < 60_000) return;
        languageLastAttempt = now;
        languageAbort?.abort();
        const controller = new AbortController();
        languageAbort = controller;
        const capturedEpoch = epoch;
        languageStatus = languageCards.length ? 'ready' : 'loading';
        repaintOverview();
        const timeout = setTimeout(() => controller.abort(), 6500);
        try {
            const token = await readHubLanguageToken(owner);
            if (!token || controller.signal.aborted) throw new Error('Unavailable first-party session');
            const cards = await fetchHubLanguages(token, controller.signal);
            if (controller.signal.aborted) throw new Error('Language source timed out');
            if (capturedEpoch !== epoch || languageOwner !== owner ||
                document.hidden || privacyHeld || state?.preferences.hidden) return;
            languageCards = cards;
            languageCheckedAt = Date.now();
            languageStatus = 'ready';
        } catch {
            // Timeout is a visible unavailable state. Deliberate cancellation on
            // identity/privacy/background/another refresh must never repaint.
            if (capturedEpoch !== epoch || languageOwner !== owner || languageAbort !== controller ||
                document.hidden || privacyHeld || state?.preferences.hidden) return;
            languageStatus = 'unavailable';
        } finally {
            clearTimeout(timeout);
            if (languageAbort === controller) languageAbort = null;
        }
        repaintOverview();
    }

    let changeVersion = 0;
    let queue = Promise.resolve();
    let persistence = Promise.resolve();
    let cloud: WorkspaceCloudSync | null = null, pendingCloudRender = false;
    let cloudConflict=false;
    let insights: ConnectedInsight[] = [], insightController: AbortController | null = null;
    const inputFocused = () => document.activeElement instanceof Element && !!document.activeElement.closest('input,textarea,select,[contenteditable=true]');
    function connectedHTML() {
        return insights.filter(item => item.expiresAt > Date.now()).slice(0,8).map(item => {
            const app=apps.find(app=>app.id===item.appId);
            return app ? `<div class="ws-row" data-connected-insight data-expires="${item.expiresAt}"><span class="ws-app-icon">${icon(app.icon)}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div><a class="ws-button" href="${esc(item.resumeUrl??app.url)}" rel="noreferrer">${item.resumeUrl?'Resume':'Open'} ${esc(app.title)}</a></div>` : '';
        }).join('');
    }
    function pruneInsights(all=false) {
        root.querySelectorAll<HTMLElement>('[data-connected-insight]').forEach(row=>{if(all || Number(row.dataset.expires)<=Date.now())row.remove();});
    }
    setInterval(()=>pruneInsights(),1000);
    async function refreshInsights() {
        insightController?.abort(); insightController=null; insights=[];
        const identity=hubIdentity, own=epoch;
        if (!managedAccountEnabled || identity.status!=='signed-in' || !state || privacyHeld || state.preferences.hidden || document.hidden) {pruneInsights(true);clearSourceStates();return;}
        const controller=new AbortController(); insightController=controller;
        try {
            const next=await readConnectedApps(identity.id,controller.signal);
            if (own!==epoch || controller.signal.aborted || !state || privacyHeld || state.preferences.hidden || document.hidden) return;
            insights=next;
            if (!editing && !inputFocused()) root.querySelectorAll<HTMLElement>('[data-widget-type=continue] .ws-widget-body').forEach(body=> { if (!body.contains(document.activeElement)) { const w=current().widgets.find(w=>w.id===body.closest<HTMLElement>('[data-widget-id]')?.dataset.widgetId);if(w)body.innerHTML=widgetBody(w); } });
        } catch { if(own===epoch)pruneInsights(true); /* Keep locally owned notes and tasks. */ }
    }
    const dialog = $<HTMLDialogElement>('[data-workspace-dialog]');
    const form = $<HTMLFormElement>('[data-workspace-form]');
    const account = $<HTMLDialogElement>('[data-account-dialog]');
    const searchDialog = $<HTMLDialogElement>('[data-search-dialog]');
    let searchReturnFocus: HTMLElement | null = null;
    searchDialog.addEventListener('keydown', event => {
        if (event.isComposing) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            searchDialog.close();
            return;
        }
        const target=event.target as HTMLElement;
        const input=$<HTMLInputElement>('#workspace-search');
        const choices=Array.from(searchDialog.querySelectorAll<HTMLElement>('[data-palette-primary],.ws-palette-quick-action'));
        if (event.key === 'Enter' && target === input) {
            if (!choices.length) return;
            event.preventDefault();
            choices[0]!.click();
            return;
        }
        if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
        if (target !== input && !choices.includes(target)) return;
        if (target === input && (event.key === 'Home' || event.key === 'End')) return;
        event.preventDefault();
        const index=choices.indexOf(target);
        let next=-1;
        if (event.key === 'ArrowDown') next = index<0 ? 0 : Math.min(choices.length-1,index+1);
        else if (event.key === 'ArrowUp') next = index<=0 ? -1 : index-1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = choices.length-1;
        if (next<0 || !choices.length) input.focus();
        else choices[next]!.focus();
    });
    searchDialog.addEventListener('close', () => {
        const target = searchReturnFocus?.isConnected ? searchReturnFocus : $('[data-action=search]');
        searchReturnFocus = null;
        searchQuery = '';
        $<HTMLInputElement>('#workspace-search').value = '';
        $('[data-search-results]').replaceChildren();
        if (!dialog.open && !account.open) target.focus();
    });
    let readingOpened = false;
    function syncReadingPanels() {
        if (account.open) readingOpened = true;
        const hidden = !state || privacyHeld || state.preferences.hidden || (!account.open && readingOpened);
        root.querySelectorAll<HTMLElement>('[data-reading-shell]').forEach(shell => { shell.hidden = hidden; shell.querySelectorAll<HTMLElement>('[data-home-personal]').forEach(panel => panel.hidden = hidden); });
        const control = root.querySelector<HTMLElement>('[data-connection-privacy]');
        if (control) control.textContent = privacyHeld || state?.preferences.hidden ? 'Show personal content' : 'Hide personal content';
    }
    account.addEventListener('close', syncReadingPanels);
    let submitForm: ((data: FormData) => Promise<void> | void) | null = null;
    let observer: ResizeObserver | null = null;
    let formReturn: { element: HTMLElement; action: string; id: string; widget: string; epoch: number } | null = null;
    dialog.addEventListener('close', () => {
        activeWeekReview=null;
        activeUnifiedReview=null;
        void flushCaptureDraft();
        const target = formReturn;
        if (!target || dialog.open || target.epoch !== epoch || !state) return;
        const scope = target.widget ? root.querySelector<HTMLElement>(`[data-widget-id="${CSS.escape(target.widget)}"]`) : root;
        const replacement = target.action ? scope?.querySelector<HTMLElement>(`[data-action="${CSS.escape(target.action)}"]${target.id ? `[data-id="${CSS.escape(target.id)}"]` : ''}`) : null;
        const next = target.element.isConnected ? target.element : replacement ?? $('#ws-title');
        if (next.id === 'ws-title') next.tabIndex = -1;
        next.focus();
        formReturn = null;
    });
    const current = () => state!.workspaces.find(w => w.id === state!.active)!;
    const pins = () => current().widgets.find(w => w.type === 'app-shortcuts')?.config.appIds as string[] ?? apps.slice(0, 6).map(a => a.id);
    const today = () => dayKey(state!.preferences.timezone);
    const dateLabel = (key: string, long = false) => new Date(key + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', ...(long ? { year: 'numeric' } : {}) });
    const timeLabel = (at: string) => new Date(at).toLocaleTimeString(undefined, { timeZone: state!.preferences.timezone, hour: '2-digit', minute: '2-digit' });
    function toast(message: string, undo = false) { clearTimeout(toastTimer); const el = $('[data-workspace-toast]'); el.innerHTML = `<span>${esc(message)}</span>${undo ? button('undo-content', 'Undo', '', '') : ''}`; el.hidden = false; toastTimer = setTimeout(() => { el.hidden = true; }, 8000); }
    function clearContentUndo() {
        contentUndo = null;
        root.querySelector('[data-workspace-toast] [data-action=undo-content]')?.remove();
    }
    function notice(message: string, actions = '') { const el = $('[data-workspace-notice]'); el.innerHTML = `${esc(message)}${actions}`; el.hidden = !message; }
    function renderAttention() {
        const target=root.querySelector<HTMLElement>('[data-workspace-attention]');if(!target)return;
        if(!state||privacyHeld||state.preferences.hidden){target.textContent='Personal attention is hidden.';return;}
        const items=workspaceAttention({storageReady,dirty,conflict,cloudConflict,locked});
        target.innerHTML=items.length?items.map(item=>`<article class="ws-row"><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div>${button(item.action,item.label)}</article>`).join(''):'<p>No workspace recovery issues. External app coverage is listed separately below.</p>';
    }
    function saved(label?: string) {
        renderAttention();
        const status = $('[data-workspace-status]');
        status.textContent = label ?? (dirty ? 'Unsaved · export or retry' : storageReady ? 'Workspace saved locally' : 'Unsaved · storage unavailable');
        status.hidden = !dirty && storageReady && !label;
    }
    function download(value: string, name: string) { const url = URL.createObjectURL(new Blob([value], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function persist(backup = false): Promise<boolean | undefined> {
        const own = epoch;
        // Initial workspace creation and an automatic Account handoff may
        // save concurrently outside the command queue. Snapshot only after
        // the prior write updates the local revision; never bypass CAS.
        const operation = persistence.then(() => own === epoch ? persistSnapshot(backup) : undefined);
        persistence = operation.then(() => {}, () => {});
        return operation;
    }
    async function persistSnapshot(backup = false) {
        if (!state || locked)
            return;
        dirty = true;
        saved('Saving…');
        if (!storageReady || !store) {
            saved();
            return;
        }
        const own = epoch, snapshot = clone(state), savedVersion = changeVersion;
        try {
            await store.save(snapshot, state.revision, backup);
            if (own !== epoch)
                return;
            state.revision = snapshot.revision;
            dirty = changeVersion !== savedVersion;
            conflict = false;
            saved();
            updateReturnPanel();
            updateRecoveryStrip();
            channel?.postMessage({ key: store.key, revision: state.revision });
            cloud?.schedule();
            return true;
        }
        catch (err) {
            if (own !== epoch)
                return;
            dirty = true;
            conflict = err instanceof RevisionConflict;
            saved();
            updateReturnPanel();
            updateRecoveryStrip();
            notice(err instanceof RevisionConflict ? err.message : 'Changes are in memory but could not be saved. Export a backup or retry.', button('export', 'Export') + button('retry', 'Retry') + button('reload', 'Reload saved data'));
        }
    }
    function mutate(change: (s: WorkspaceState) => void, message = '', undo = true, backup = false, retainForm = dialog.open) {
        const own = epoch;
        const operation = queue.then(async () => {
            if (own !== epoch || !state || locked)
                throw new Error('This workspace changed. Reopen the form.');
            const previous = clone(state);
            const candidate = clone(state);
            change(candidate);
            parseState(JSON.stringify(candidate));
            changeVersion++;
            clearContentUndo();
            state = candidate;
            const entry = undo ? { before: previous, after: clone(candidate) } : null;
            contentUndo = entry;
            const requireSave = retainForm && storageReady;
            render();
            const didSave = await persist(backup);
            if (own !== epoch) throw new Error('This workspace changed. Reopen the form.');
            if (requireSave && !didSave) {
                // The form retains the proposed values. Keep the committed model
                // unchanged so retrying cannot insert the same record twice.
                const draft = state!.captureDraft;
                state = previous;
                state.captureDraft = draft;
                clearContentUndo();
                render();
                throw new Error('Changes could not be saved. Your input is still here. Try again.');
            }
            if (entry && contentUndo === entry) entry.after.revision = state!.revision;
            if (message)
                toast(dirty ? message.replace(/\bsaved.*$/i, 'updated') + ' · not saved. Export or retry.' : message, !!contentUndo);
        });
        // Keep fire-and-forget commands handled and the queue usable, while
        // returning the actual result to forms and other awaiting callers.
        queue = operation.catch(e => toast(e instanceof Error ? e.message : 'Unable to apply this change.'));
        return operation;
    }
    function openForm(title: string, html: string, onSubmit: (data: FormData) => Promise<void> | void, label = 'Save') {
        if (!dialog.open && document.activeElement instanceof HTMLElement) {
            const element = document.activeElement;
            formReturn = { element, action: element.dataset.action ?? '', id: element.dataset.id ?? '', widget: element.closest<HTMLElement>('[data-widget-id]')?.dataset.widgetId ?? '', epoch };
        }
        const formEpoch = epoch;
        submitForm = data => { if (epoch !== formEpoch) throw new Error('Your identity changed. Reopen this form.'); return onSubmit(data); };
        $('[data-dialog-fields]').innerHTML = html;
        $('[data-dialog-error]').textContent = '';
        $('[data-dialog-submit]').textContent = label;
        $('[data-dialog-submit]').hidden = false;
        $('[data-dialog-submit]').removeAttribute('disabled');
        $('[data-dialog-fields]').querySelectorAll<HTMLInputElement>('input').forEach(i => i.setCustomValidity(''));
        $('#ws-dialog-title').textContent = title;
        if (!dialog.open)
            dialog.showModal();
        ($('[data-dialog-fields]').querySelector<HTMLElement>('input:not([type=checkbox]),textarea,select,button') ?? $('[data-dialog-submit]')).focus();
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!submitForm)
            return;
        const submit = $<HTMLButtonElement>('[data-dialog-submit]');
        submit.disabled = true;
        void Promise.resolve().then(() => submitForm!(new FormData(form))).then(() => dialog.close()).catch(e => { $('[data-dialog-error]').textContent = e instanceof Error ? e.message : 'Unable to save.'; }).finally(() => { submit.disabled = false; });
    });

    /** Both the capture dialog and existing widget submit through the original mutation writer. */
    function captureFields(id: string, compact=false) {
        if(compact)return `<label class="ws-sr" for="capture-${esc(id)}">Capture a task or note</label><textarea id="capture-${esc(id)}" name="body" data-capture-draft data-compact-capture maxlength="10000" rows="2" placeholder="A thought, task or note…" required>${esc(state!.captureDraft)}</textarea><select name="kind" data-capture-kind aria-label="Capture destination"><option value="note">Hub note</option><option value="task">Hub task · Inbox</option></select>`;
        const notes = providerAction('notes','capture-text') ?? '/apps/';
        return `<div class="ws-capture-routing">
            <label class="ws-field" for="capture-${esc(id)}">What do you want to capture?
              <textarea id="capture-${esc(id)}" name="body" data-capture-draft maxlength="10000" rows="4" placeholder="First line: a clear title&#10;Optional details below…" required>${esc(state!.captureDraft)}</textarea>
            </label>
            <label class="ws-field">Save in this device
              <select name="kind" data-capture-kind aria-label="Capture destination"><option value="note">Local note</option><option value="task">Local task</option></select>
            </label>
            <div data-capture-task-options hidden>
              <div class="ws-form-row">
                <label class="ws-field">Plan task
                  <select name="duePreset" data-capture-due><option value="inbox">Inbox · decide later</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="week">In 7 days</option><option value="date">Pick a date</option></select>
                </label>
                <label class="ws-field">Priority
                  <select name="priority"><option value="none">Normal</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                </label>
              </div>
              <label class="ws-field" data-capture-custom-date hidden>Custom due date<input name="customDate" type="date" value="${esc(today())}"/></label>

            </div>
            <div class="ws-capture-handoff"><span>Prefer the Notes app? Text is never transferred automatically.</span>
              <button type="button" class="ws-text-button" data-action="save-capture-draft">Save draft now</button>
              <button type="button" class="ws-text-button" data-action="copy-capture">Copy draft</button>
              <a href="${esc(notes)}" rel="noreferrer">Open Notes ↗</a></div>

          </div>`;
    }
    async function saveCaptureData(data: FormData) {
        if (!state || locked) throw new Error('Workspace is unavailable.');
        const prepared = prepareCapture({
            body: String(data.get('body') ?? ''),
            kind: String(data.get('kind') ?? 'note'),
            duePreset: String(data.get('duePreset') ?? 'inbox'),
            customDate: String(data.get('customDate') ?? ''),
            priority: String(data.get('priority') ?? 'none'),
            today: today(),
        });
        clearTimeout(captureTimer);
        await mutate(s => {
            if (prepared.kind === 'task') s.tasks.push(prepared.task);
            else s.notes.unshift(prepared.note);
            s.captureDraft = '';
            activity(s, `Captured ${prepared.kind}: ${prepared.kind === 'task' ? prepared.task.title : prepared.note.title}`, prepared.kind);
        }, prepared.kind === 'task' ? 'Task captured in Hub' : 'Note captured in Hub');
    }
    function paintFocusTime(message?:string) {
        const clock=root.querySelector<HTMLElement>('[data-focus-clock]');
        if (clock) clock.textContent=focusClock(focus.remainingMs);
        const status=root.querySelector<HTMLElement>('[data-focus-session-status]');
        if (status && message) status.textContent=message;
    }
    function pauseFocusSession() {
        if(focus.running) focus.remainingMs=Math.max(0,focusEndsAt-Date.now());
        focus.running=false;
        focusEndsAt=0;
        clearInterval(focusTick);
        focusTick=undefined;
        paintFocusTime('Paused');
    }
    function resetFocusSelection() {
        pauseFocusSession();
        focus.selectedId=null;
        focus.remainingMs=focus.duration*60000;
        focus.elapsed=false;
    }
    function clearFocusIdentity() {
        pauseFocusSession();
        focus={queue:'due',limit:5,duration:25,quiet:false,selectedId:null,remainingMs:25*60000,running:false,elapsed:false};
        root.dataset.focusQuiet='false';
    }
    function focusPulse() {
        if(!focus.running)return;
        if(document.hidden || !state || locked || privacyHeld || state.preferences.hidden) {
            pauseFocusSession();
            return;
        }
        focus.remainingMs=Math.max(0,focusEndsAt-Date.now());
        paintFocusTime();
        if(focus.remainingMs===0) {
            pauseFocusSession();
            focus.elapsed=true;
            paintFocusTime('Session elapsed. The task is not marked complete; choose your next step.');
            toast('Focus timer elapsed. Your task remains open until you complete it.');
            render();
        }
    }
    function startFocusSession() {
        if (!state || !focus.selectedId || !state.tasks.some(t=>t.id===focus.selectedId&&!t.completedAt)) {
            toast('Choose an open Hub task before starting your focus timer.');
            return;
        }
        if(focus.running)return;
        if(focus.remainingMs<=0)focus.remainingMs=focus.duration*60000;
        focus.running=true;
        focus.elapsed=false;
        focusEndsAt=Date.now()+focus.remainingMs;
        clearInterval(focusTick);
        focusTick=setInterval(focusPulse,1000);
        render();
    }
    function openCapture(kind: 'note' | 'task' = 'note') {
        if (!state || locked || privacyHeld || state.preferences.hidden) { toast('Personal content is hidden. Show it before capturing.'); return; }
        openForm('Quick capture · this device', captureFields('dialog'), saveCaptureData, 'Save in Hub');
        const select = dialog.querySelector<HTMLSelectElement>('[data-capture-kind]');
        if (select) { select.value = kind; syncCaptureControls(select); }
    }
    function flushCaptureDraft() {
        if (!captureTimer || !state || locked) return queue;
        clearTimeout(captureTimer);
        captureTimer = undefined;
        const own = epoch;
        queue = queue.then(async () => { if (own === epoch) await persist(); })
            .catch(e => toast(e instanceof Error ? e.message : 'Draft could not be saved.'));
        return queue;
    }
    function syncCaptureControls(el: HTMLElement) {
        const form = el.closest('form');
        if (!form) return;
        const task = form.querySelector<HTMLSelectElement>('[data-capture-kind]')?.value === 'task';
        const options = form.querySelector<HTMLElement>('[data-capture-task-options]');
        if (options) options.hidden = !task;
        const custom = form.querySelector<HTMLElement>('[data-capture-custom-date]');
        if (custom) custom.hidden = !task || form.querySelector<HTMLSelectElement>('[data-capture-due]')?.value !== 'date';
    }
    function empty(title: string, detail: string, action = '', label = '') { return `<div class="ws-empty"><h3>${title}</h3>${detail ? `<p>${detail}</p>` : ''}${action ? button(action, label) : ''}</div>`; }
    function taskRows(tasks: Task[]) {
        return tasks.map(t => {
            const actions = view === 'tasks' && !t.completedAt ? `<div class="ws-task-planning" aria-label="Review task ${esc(t.title)}">
                ${button('unified-triage','Review due date & priority',t.id,'ws-button')}
                ${button('context-task', 'Next actions', t.id, 'ws-text-button')}
                ${button('plan-task-event', 'Review calendar block', t.id, 'ws-text-button')}
              </div>` : '';
            return `<div class="ws-task-entry"><div class="ws-task ${t.completedAt ? 'completed' : ''} ${t.priority}">
              <input type="checkbox" data-task-toggle="${esc(t.id)}" aria-label="Complete ${esc(t.title)}" ${t.completedAt ? 'checked' : ''}/>
              <button class="ws-task-title" type="button" data-action="edit-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
              ${t.due && view === 'tasks' ? `<small class="ws-muted">${esc(t.due)}</small>` : view === 'tasks' && !t.completedAt ? '<small class="ws-muted">Inbox</small>' : ''}
              ${t.priority !== 'none' ? `<small class="ws-muted">${esc(t.priority)}</small>` : ''}
              ${t.time ? `<time>${esc(t.time)}</time>` : ''}
              ${button('context-task', 'Next', t.id, 'ws-text-button')}${button('delete-task', icon('dots-three'), t.id, 'ws-icon-button')}
            </div>${actions}</div>`;
        }).join('');
    }
    function calendarHTML() {
        const first = month;
        const offset = (new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7;
        const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
        const dates = Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => addDays(first, i - offset));
        return `<div class="ws-calendar-heading"><strong>${new Date(first + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', month: 'long', year: 'numeric' })}</strong><div>${button('month-prev', icon('caret-left'), '', 'ws-icon-button')}${button('month-next', icon('caret-right'), '', 'ws-icon-button')}</div></div><div class="ws-month">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<span>${d}</span>`).join('')}${dates.map(d => `<button type="button" data-action="select-date" data-id="${d}" aria-label="${esc(dateLabel(d, true))}" aria-pressed="${d === selected}" class="${d === selected ? 'selected' : ''} ${d === today() ? 'today' : ''} ${d.slice(0, 7) !== first.slice(0, 7) ? 'outside' : ''} ${state!.events.some(e => eventRange(e)[0]! <= d && eventRange(e)[1]! >= d) || state!.tasks.some(t => t.due === d) ? 'has-event' : ''}">${Number(d.slice(8))}</button>`).join('')}</div>`;
    }
    function eventRange(e: CalendarEvent) { return e.allDay ? [e.date,e.endDate] : [dayKey(state!.preferences.timezone,new Date(e.start)),dayKey(state!.preferences.timezone,new Date(e.end))]; }
    function agendaHTML() { const events = state!.events.filter(e => eventRange(e)[0]! <= selected && eventRange(e)[1]! >= selected).sort((a, b) => a.start.localeCompare(b.start)); return events.length ? events.map(e => `<div class="ws-agenda"><time>${e.allDay ? 'All day' : esc(timeLabel(e.start))}</time><div><strong>${esc(e.title)}</strong><small>${e.allDay ? '' : `${esc(timeLabel(e.end))} · ${esc(e.zone)}`}</small></div>${button('context-event', 'Next', e.id, 'ws-text-button')}${button('edit-event', icon('dots-three'), e.id, 'ws-icon-button')}</div>`).join('') : empty('No events', '', 'new-event', 'Add an event'); }
    function renderPlanner() {
        const el = $('[data-planner]');
        if (!state || (privacyHeld || state.preferences.hidden)) {
            el.innerHTML = empty('Your planner', state ? 'Personal content is hidden.' : 'Checking your workspace…');
            return;
        }
        const tasks = state.tasks.filter(t => t.due === selected || (!t.due && selected === today())).sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt) || a.time.localeCompare(b.time));
        el.innerHTML = `<div class="ws-planner-heading"><div><h2>${selected === today() ? 'Today' : esc(dateLabel(selected))}</h2><small class="ws-muted">${esc(dateLabel(selected))}</small></div>${button('new-task', '+ Add')}</div>${calendarHTML()}<section class="ws-planner-section"><header><h2>${selected === today() ? "Today's tasks" : 'Tasks for this day'}</h2><small>${tasks.filter(t => !t.completedAt).length} remaining</small></header>${tasks.length ? taskRows(tasks) : empty('No tasks', '')}${button('new-task', icon('plus') + ' Add a task', '', 'ws-text-button')}${selected !== today() ? button('today', 'Back to today', '', 'ws-text-button') : ''}</section><section class="ws-planner-section"><header><h2>Agenda</h2>${button('new-event', icon('plus'), '', 'ws-icon-button')}</header>${renderPlannerReviewSummary(state,selected)}${agendaHTML()}</section>`;
        el.querySelectorAll<HTMLElement>('[data-action=month-prev]').forEach(b => b.setAttribute('aria-label', 'Previous month'));
        el.querySelectorAll<HTMLElement>('[data-action=month-next]').forEach(b => b.setAttribute('aria-label', 'Next month'));
        el.querySelectorAll<HTMLElement>('.ws-icon-button[data-action=new-event]').forEach(b => b.setAttribute('aria-label', 'Add event'));
    }
    function selectedTrackers(w: Widget) { const ids = w.config.trackerIds; return Array.isArray(ids) ? state!.trackers.filter(t => ids.includes(t.id)).slice(0,32) : state!.trackers.slice(0,8); }
    function trackersHTML(w: Widget) {
        const trackers = selectedTrackers(w);
        if (!trackers.length)
            return empty('No trackers', '', 'new-tracker', 'Create a tracker');
        const date = today();
        if (w.view === 'table')
            return `<table class="ws-tracker-table"><thead><tr><th>Tracker</th><th>Progress / goal</th><th><span class="ws-sr">Actions</span></th></tr></thead><tbody>${trackers.map(t => { const total = trackerTotal(state!, t.id, date); return `<tr><td>${esc(t.title)}<small class="ws-muted"> · ${t.cadence === 'daily' ? 'today' : 'this week'}</small></td><td>${formatTrackerValue(t,total)} / ${formatTrackerValue(t,t.goal)} ${t.kind==='duration'&&['min','minutes','minute'].includes(t.unit.toLowerCase())?'':esc(t.unit)}</td><td>${button('log-tracker', '+ Log', t.id, 'ws-text-button')}</td></tr>`; }).join('')}</tbody></table>`;
        return trackers.map(t => { const total = trackerTotal(state!, t.id, date); return `<div class="ws-tracker-row"><div><strong>${esc(t.title)}</strong><small>${formatTrackerValue(t,total)} / ${formatTrackerValue(t,t.goal)} ${t.kind==='duration'&&['min','minutes','minute'].includes(t.unit.toLowerCase())?'':esc(t.unit)} · ${t.cadence === 'daily' ? 'today' : 'this week'}</small>${w.view !== 'compact' ? `<div class="ws-progress" role="meter" aria-label="${esc(t.title)} progress" aria-valuemin="0" aria-valuemax="${t.goal}" aria-valuenow="${Math.min(total, t.goal)}"><span style="width:${Math.min(total / t.goal * 100, 100)}%"></span></div>` : ''}</div>${button('log-tracker', '+ Log', t.id, 'ws-text-button')}</div>`; }).join('');
    }
    function historyHTML(w: Widget) {
        const trackers = selectedTrackers(w);
        if (!trackers.length)
            return empty('No tracker history', '', 'new-tracker', 'Create a tracker');
        const days = weekDays(today());
        if (w.view === 'matrix')
            return `<table class="ws-matrix"><caption class="ws-sr">Tracker logs for the week beginning ${days[0]}</caption><thead><tr><th>Tracker</th>${days.map(d => `<th>${new Date(d + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short' })}<br/>${Number(d.slice(8))}</th>`).join('')}</tr></thead><tbody>${trackers.map(t => `<tr><td>${esc(t.title)}</td>${days.map(d => { const value = state!.logs.filter(l => l.trackerId === t.id && l.date === d).reduce((n, l) => n + l.value, 0); return `<td class="${value ? 'logged' : ''}">${d > today() ? '—' : value || '0'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
        const tracker = trackers.find(t => t.id === w.config.selectedTracker) ?? trackers[0]!;
        const values = days.map(d => state!.logs.filter(l => l.trackerId === tracker.id && l.date === d).reduce((n, l) => n + l.value, 0));
        const max = Math.max(1, ...values);
        return `<div class="ws-history-head"><select aria-label="Tracker for chart" data-history-select="${esc(w.id)}">${trackers.map(t => `<option value="${esc(t.id)}" ${t.id === tracker.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select><small class="ws-muted">${esc(tracker.unit)} · this week</small></div><div class="ws-chart" role="img" aria-label="${esc(tracker.title)}: ${days.map((d, i) => `${dateLabel(d)} ${values[i]} ${tracker.unit}`).join(', ')}">${days.map((d, i) => `<div class="ws-chart-day"><b>${d > today() ? '—' : values[i]}</b><div class="ws-chart-bar"><span style="height:${values[i]! / max * 100}%"></span></div><span>${new Date(d + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short' })}<br/>${Number(d.slice(8))}</span></div>`).join('')}</div>`;
    }
    function widgetBody(w: Widget) {
        if (w.typeVersion > 1)
            return empty('Newer widget version', 'This widget is preserved. Update the app to use it.');
        const utility = utilityWidget(w, state!, apps, today());
        if (utility !== null) return utility;
        switch (w.type) {
            case 'app-shortcuts': {
                const ids = selectedShortcuts(state!,w,insights.filter(i=>i.expiresAt>Date.now()).map(i=>i.appId));
                const options:AppShortcut[]=[...apps,...customLinks(w).map(link=>({...link,icon:'arrow-up-right',category:'external'}))];
                const missing=ids.filter(id=>!options.some(a=>a.id===(resolveLaunch(String(id))?.id??id)));
                const chosen = ids.map(id => options.find(a => a.id === (resolveLaunch(String(id))?.id??id))).filter((a): a is AppShortcut => !!a);
                return `<div class="ws-shortcuts" data-variant="${esc(w.view)}">${chosen.map((a, i) => `<a href="${esc(w.config.useActions === false ? a.url : a.action?.url ?? a.url)}" rel="noreferrer" class="ws-app" data-launch="${esc(a.id)}"><span class="ws-app-icon" data-color="${i % 4}">${icon(a.icon)}</span><div><strong>${esc(a.title)}</strong><small>${esc(a.category==='external'?'External link':w.config.useActions === false ? 'Open app' : a.action?.label ?? 'Open app')}</small></div></a>`).join('')}</div>${missing.map(id=>`<div class="ws-row"><span>Unavailable shortcut: ${esc(id)}</span>${button('configure-widget','Repair',w.id)}</div>`).join('')}${!chosen.length ? empty('No shortcuts', '') + button('configure-widget', 'Choose shortcuts', w.id) : ''}`;
            }
            case 'continue': {
                const recent = [...state!.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, w.view === 'detailed' ? 6 : 4);
                const local = recent.length ? recent.map(n => `<div class="ws-row"><span class="ws-app-icon">${icon('notebook')}</span><div><strong>${esc(n.title)}</strong><small>${esc(new Date(n.updatedAt).toLocaleDateString())}</small>${w.view === 'detailed' ? `<small>${esc(n.body.slice(0, 90))}</small>` : ''}</div>${button('edit-note', 'Open', n.id)}${button('context-note', 'Next', n.id, 'ws-text-button')}</div>`).join('')
                    : empty('No recent notes', '', 'capture', 'New note');
                return connectedHTML() + `${local}<a class="ws-text-button" href="/home/connections/">Connections →</a>`;
            }
            case 'capture': return `<form class="ws-capture-form" data-capture-form>${captureFields(w.id,true)}<div class="ws-capture-bottom"><button class="ws-primary" type="submit">Capture</button></div>${dirty ? '<small class="ws-error">Draft not saved yet</small>' : ''}</form>`;
            case 'tracker-summary': return trackersHTML(w);
            case 'tracker-history': return historyHTML(w);
            case 'recent-activity': return state!.activity.length ? state!.activity.slice(0, w.view === 'detailed' ? 10 : 5).map(a => `<div class="ws-row">${icon('clock-counter-clockwise')}<div><strong>${esc(a.title)}</strong><small>${esc(new Date(a.at).toLocaleString())}</small></div></div>`).join('') : empty('No recent activity', '');
            default: return empty('Unavailable widget', 'Its configuration is preserved, so you can restore it in a supported version.');
        }
    }
    function renderGrid() { const workspace = editing?.workspace ?? current(); return `<div class="ws-grid ${editing ? 'ws-editing' : ''}" data-grid>${ordered(workspace.widgets).map(w => { const spec = specification(w.type); const title = typeof w.config.title === 'string' ? w.config.title : spec?.title ?? w.type; return `<section class="ws-cell" data-widget-id="${esc(w.id)}" data-widget-type="${esc(w.type)}" style="--col:${w.desktop.x + 1};--span:${w.desktop.w};--row:${w.desktop.y + 1};--height:${w.desktop.h}"><div class="ws-widget"><header><div>${editing ? `<button class="ws-icon-button ws-drag-handle" type="button" data-drag="${esc(w.id)}" aria-label="Move ${esc(title)}">${icon('dots-six-vertical')}</button>` : icon(spec?.icon ?? 'squares-four')}<h2>${esc(title)}</h2></div><div class="ws-widget-controls">${w.type === 'app-shortcuts' ? '<a class="ws-text-button" href="/apps/">All apps</a>' : ''}${button('configure-widget', icon('dots-three'), w.id, 'ws-icon-button')}</div></header><div class="ws-widget-body" tabindex="0" role="group" aria-label="${esc(title)} content">${widgetBody(w)}</div></div>${editing ? `<button type="button" class="ws-resize-handle" data-resize="${esc(w.id)}" aria-label="Resize ${esc(title)}">${icon('sliders-horizontal')}</button>` : ''}</section>`; }).join('')}</div>${!workspace.widgets.length ? empty('No widgets', '', 'add-widget', 'Add widget') : ''}`; }
    function settingsHTML() { return `<section class="ws-surface"><header><h2>Appearance and privacy</h2></header><div class="ws-setting"><div><strong>Theme</strong></div><select data-preference="theme" aria-label="Theme">${['system', 'light', 'dark'].map(v => `<option value="${v}" ${document.documentElement.dataset.themePreference === v ? 'selected' : ''}>${v[0]!.toUpperCase() + v.slice(1)}</option>`).join('')}</select></div><div class="ws-setting"><div><strong>Density</strong></div><select data-preference="density" aria-label="Density"><option value="compact" ${state!.preferences.density === 'compact' ? 'selected' : ''}>Compact</option><option value="comfortable" ${state!.preferences.density === 'comfortable' ? 'selected' : ''}>Comfortable</option></select></div><div class="ws-setting"><div><strong>Planner timezone</strong></div>${button('timezone', esc(state!.preferences.timezone))}</div><div class="ws-setting"><div><strong>Hide personal content</strong></div>${button('privacy', (privacyHeld || state!.preferences.hidden) ? 'Show content' : 'Hide content')}</div></section><section class="ws-surface"><header><h2>Saved workspaces</h2>${button('new-workspace', 'New workspace')}</header>${state!.workspaces.map(w => `<div class="ws-workspace-manage"><strong>${(privacyHeld || state!.preferences.hidden) ? 'Workspace' : esc(w.title)}</strong>${button('rename-workspace', 'Rename', w.id)}${button('duplicate-workspace', 'Duplicate', w.id)}${button('delete-workspace', 'Delete', w.id)}</div>`).join('')}</section><section class="ws-surface"><header><h2>Recent apps</h2></header>${button('toggle-recents',state!.preferences.recordRecentLaunches===false?'Enable recent apps':'Pause recent apps')}${button('clear-recents','Clear recent apps')}</section><section class="ws-surface"><header><h2>Backup and recovery</h2></header><div class="ws-content-toolbar">${button('export', 'Export backup')}${button('import', 'Import backup')}${button('restore', 'Restore last replacement backup')}${button('retry', 'Retry saving')}</div><a class="ws-text-button" href="/home/connections/">Existing app connections</a></section>`; }
    function fullContent() {
        if (view === 'settings')
            return settingsHTML();
        if (view === 'tasks') {
            const counts = taskCounts(state!.tasks, today());
            const tasks = state!.tasks.filter(t => taskMatchesFilter(t, taskFilter, today()))
                .sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt)
                  || (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31')
                  || ({high:0,medium:1,low:2,none:3}[a.priority] - {high:0,medium:1,low:2,none:3}[b.priority])
                  || a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
            return `<section class="ws-task-center" aria-label="Task views">
              <nav class="ws-unified-task-links" aria-label="Related Hub workflows"><a href="/">Today</a><a href="/?mode=focus">Focus</a><a href="/home/calendar/?mode=week">Week plan</a></nav>
              <div class="ws-task-filter-list" role="group" aria-label="Task views">
                ${TASK_FILTERS.map(f => `<button type="button" class="ws-task-filter-button ${taskFilter === f ? 'active' : ''}" aria-pressed="${taskFilter===f}" data-action="task-filter-set" data-id="${f}">${f==='today'?'Today + overdue':f==='inbox'?'Inbox':f==='upcoming'?'Upcoming':f==='completed'?'Completed':'All'} <strong>${f==='all'?state!.tasks.length:counts[f]}</strong></button>`).join('')}
              </div>
            </section>
            <section class="ws-surface ws-task-results" aria-label="Tasks in this view">
              <div class="ws-content-toolbar">${button('new-task', '+ Add task')}${taskFilter!=='inbox'?button('task-show-inbox', 'Process inbox ('+counts.inbox+')') : button('capture-task', '+ Capture to inbox')}</div>
              ${tasks.length ? taskRows(tasks) : empty(taskFilter==='inbox'?'Inbox is clear':'No tasks in this view', '', 'capture', 'Quick capture')}
            </section>`;
        }
        if (view === 'calendar')
            return `${renderPlanningReview(state!,selected,agendaMode,today(),weekSelection,weekFilter,weekReturnDate)}<section class="ws-surface ws-plan-month">${calendarHTML()}</section>`;
        if (view === 'trackers')
            return `<div class="ws-content-toolbar">${button('new-tracker', '+ Create tracker')}</div>${state!.trackers.map(t => `<section class="ws-surface"><header><div><h2>${esc(t.title)}</h2><p class="ws-muted">${trackerTotal(state!, t.id, today())} / ${t.goal} ${esc(t.unit)} · ${t.cadence}</p></div><div>${button('edit-tracker', 'Edit', t.id)}${button('log-tracker', '+ Log', t.id)}</div></header>${state!.logs.filter(l => l.trackerId === t.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map(l => `<div class="ws-row"><div>${l.value} ${esc(t.unit)}<small>${l.date}${l.note ? ' · ' + esc(l.note) : ''}</small></div>${button('edit-log', 'Edit', l.id)}${button('delete-log', 'Delete', l.id)}</div>`).join('') || '<p class="ws-muted">No entries yet.</p>'}</section>`).join('') || empty('No trackers', '', 'new-tracker', 'Create a tracker')}`;
        if(view==='home') {
            const mode=editing?'workspace':homeMode;
            const menu=renderUnifiedJourneyNav(mode,state!,today(),journeyStatus());
            if(mode==='today')return menu+renderUnifiedToday(state!,today(),journeyStatus())+
                renderSourceToday({
                    folio: {status: folioStatus, snapshot: folioSnapshot},
                    notes: {status: notesSourceStatus, snapshot: notesSource},
                    languages: {status: languageStatus, cards: languageCards}, apps
                });
            if(mode==='focus')return menu+renderFocusPanel(state!,today(),focus);
            return menu+renderGrid()+(editing?'':'<div data-native-overview>'+renderIntegratedHome(state!,languageStatus,languageCards,languageCheckedAt,apps,{status:folioStatus,snapshot:folioSnapshot},{status:notesSourceStatus,snapshot:notesSource})+'</div>');
        }
        return renderGrid();

    }
    function journeyStatus():JourneyStatus {
        return {offline:!navigator.onLine,dirty,conflict,storageReady,
            hasCapture:!!state?.captureDraft.trim(),hasLayoutDraft:!!recoveryDraft,
            accountLabel:hubIdentity.status==='signed-in'?'Account-scoped browser storage':'This device'};
    }
    function returnContext(): ReturnContext {
        return {today:today(),storageReady,dirty,conflict,offline:!navigator.onLine,
            editing:!!editing,recoveryDraft,account:hubIdentity.status==='signed-in'};
    }
    function updateReturnPanel() {
        if(!state || view!=='home' || locked || privacyHeld || state.preferences.hidden)return;
        const panel=root.querySelector<HTMLElement>('[data-return-panel]');
        if(panel)panel.innerHTML=renderReturnJourney(state,returnContext());
    }
    function updateRecoveryStrip() {
        const el=root.querySelector<HTMLElement>('[data-workspace-recovery]');
        if (!el) return;
        if(!state || locked) { el.hidden=true;el.replaceChildren();return; }
        const html=renderRecoveryStrip(state,returnContext(),privacyHeld||state.preferences.hidden);
        el.hidden=!html;
        if (html)el.innerHTML=html;
        else el.replaceChildren();
    }
    function updateCalendarNavigation() {
        if(view!=='calendar' || !state) return;
        const query=new URLSearchParams();
        if(safeNavigationDay(selected))query.set('date',selected);
        if(agendaMode==='week')query.set('mode','week');
        if(weekReturnDate&&safeNavigationDay(weekReturnDate)&&weekDays(selected)[0]!==weekReturnDate)
            query.set('return',weekReturnDate);
        const next=location.pathname+(query.size?'?'+query.toString():'');
        if(location.pathname+location.search!==next)
            history.replaceState(null,'',next);
    }
    function pruneWeekSelection() {
        if(!state) {weekSelection.clear();return;}
        for(const id of weekSelection)
            if(!state.tasks.some(t=>t.id===id&&!t.completedAt))weekSelection.delete(id);
    }
    function render() {
        observer?.disconnect();
        if (!state)
            return;
        const focusedElement = document.activeElement as HTMLElement | null;
        const action = focusedElement?.dataset.action, id = focusedElement?.dataset.id, toggle = focusedElement?.dataset.taskToggle;
        root.dataset.rail = state.preferences.rail ? 'expanded' : 'collapsed';
        root.dataset.density = state.preferences.density;
        root.dataset.calendarZone = state.preferences.timezone;
        root.dataset.calendarPrivate = privacyHeld || state.preferences.hidden ? 'true' : 'false';
        if (focus.selectedId && !state.tasks.some(t=>t.id===focus.selectedId && !t.completedAt)) resetFocusSelection();
        if (handoffOrigin && !originalHandoffRecord()) handoffOrigin=null;
        pruneWeekSelection();
        if (privacyHeld || state.preferences.hidden) { pauseFocusSession(); focus.quiet=false; weekSelection.clear(); }
        if (view==='calendar') updateCalendarNavigation();
        if (view==='home') {
            const mode=editing?'workspace':homeMode;
            const url=location.pathname+(mode==='workspace'?'':'?mode='+mode);
            if(location.pathname+location.search!==url)history.replaceState(null,'',url);
        }
        root.dataset.focusQuiet = view==='home' && (editing?'workspace':homeMode)==='focus' && focus.quiet && !privacyHeld && !state.preferences.hidden ? 'true':'false';
        root.dataset.homeMode = view==='home' ? (editing?'workspace':homeMode) : '';
        const rail = $('[data-action=rail]');
        rail.setAttribute('aria-expanded', String(state.preferences.rail));
        rail.setAttribute('aria-label', state.preferences.rail ? 'Collapse sidebar' : 'Expand sidebar');
        if (!staticView()) $('[data-workspace-date]').textContent = dateLabel(today(), true);
        $('#ws-title').textContent = staticView() ? ({apps:'Apps',connections:'Connections',search:'Search',inbox:'Inbox',flows:'Workflow guides',documents:'Documents'}[view]??'Hub') : (privacyHeld || state.preferences.hidden) ? 'Personal workspace' : view === 'home' ? (editing?.workspace.title ?? current().title) : view[0]!.toUpperCase() + view.slice(1);
        const welcome=$<HTMLElement>('[data-visitor-welcome]');
        welcome.hidden=view!=='home'||hubIdentity.status!=='signed-out'||welcomeDismissed||meaningfulState(state)||!!editing||homeMode!=='workspace'||privacyHeld||state.preferences.hidden;
        if(!welcome.hidden) {
            $('#ws-title').textContent='THIEPN Hub';
            $('[data-workspace-date]').textContent='';
        }
        $('[data-workspace-list]').innerHTML = state.workspaces.map(w => `<button type="button" data-workspace-id="${esc(w.id)}" class="${w.id === state!.active ? 'active' : ''}" title="${(privacyHeld || state!.preferences.hidden) ? 'Workspace' : esc(w.title)}">${icon('folder-simple')}<span>${(privacyHeld || state!.preferences.hidden) ? 'Workspace' : esc(w.title)}</span></button>`).join('');
        $('[data-toolbar]').innerHTML = view === 'home' ? (editing ? `<span class="ws-edit-label">Editing layout</span>${button('undo-layout', 'Undo')}${button('redo-layout', 'Redo')}${button('add-widget', '+ Add widget')}${button('cancel-layout', 'Cancel')}${button('done-layout', 'Done', '', 'ws-primary')}` : `${button('switch-workspace', icon('folder-simple') + ' Workspaces', '', 'ws-button ws-workspace-switch') + button('presets', 'Layouts')}${button('customize', icon('sliders-horizontal') + ' Customize')}`) : (view === 'apps' ? button('switch-workspace', icon('folder-simple') + ' Workspaces', '', 'ws-button ws-workspace-switch') : '');
        // Static catalogue nodes keep their category state while the shared planner rerenders.
        if (!staticView()) {
            if ((privacyHeld || state.preferences.hidden) && view !== 'settings')
                $('[data-workspace-content]').innerHTML = empty('Personal content is hidden', '', 'privacy', 'Show content');
            else
                $('[data-workspace-content]').innerHTML = fullContent();
        }
        root.querySelectorAll<HTMLButtonElement>('[data-action=pin-app]').forEach(b=>{const pinned=pins().includes(b.dataset.id!);b.setAttribute('aria-pressed',String(pinned));b.textContent=pinned?'Unpin shortcut':'Pin shortcut';});
        renderAttention();
        renderPlanner();
        // C2 read-only handoff from the ORIGINAL Hub calendar owner. Ephemeral and
        // never an invitation to write back; source IDs and edit controls stay here.
        // Clear on privacy transitions, account changes and unavailable storage.
        window.dispatchEvent(new CustomEvent('hub:calendar-local', {detail: {
            selected: view==='calendar' ? selected : today(),
            mode: view==='calendar' ? agendaMode : 'day',
            timezone: state.preferences.timezone,
            private: privacyHeld || state.preferences.hidden || locked,
            events: privacyHeld || state.preferences.hidden || locked ? [] :
                state.events.slice(0,300).map(e=>({
                  id:e.id,title:e.title,date:e.date,endDate:e.endDate,
                  start:e.start,end:e.end,zone:e.zone,allDay:e.allDay,
                })),
            truncated: state.events.length>300,
        }}));
        if (searchDialog.open) renderSearch();
        const mobileToday = $('[data-workspace-today]');
        if (staticView() || view === 'settings' || (view==='home' && (editing?'workspace':homeMode)!=='workspace')) {
            mobileToday.hidden = true;
            mobileToday.innerHTML = '';
        }
        else {
            mobileToday.hidden = false;
            mobileToday.innerHTML = privacyHeld || state.preferences.hidden
                ? '<section class="ws-mobile-today"><strong>Today is hidden</strong></section>'
                : renderMobileToday(state, today());
        }
        syncReadingPanels();
        renderHandoffBar();
        root.querySelectorAll<HTMLElement>('.ws-icon-button[data-action=configure-widget]').forEach(b => b.setAttribute('aria-label', 'Configure widget'));
        root.querySelectorAll<HTMLElement>('[data-action=delete-task]').forEach(b => b.setAttribute('aria-label', 'Task actions'));
        root.querySelectorAll<HTMLElement>('[data-action=edit-event]').forEach(b => b.setAttribute('aria-label', 'Edit event'));
        if (recoveryDraft && !editing) {
            const resume = view === 'home' ? button('resume-draft', 'Resume edit') : '<a class="ws-button" href="/">Open Home</a>';
            notice(view === 'home' ? 'An interrupted layout edit is available.' : 'An interrupted layout edit is available on Home.', resume + button('discard-draft', 'Discard edit'));
        }
        if (!dirty)
            saved();
        updateRecoveryStrip();
        if (toggle)
            root.querySelector<HTMLInputElement>(`[data-task-toggle="${CSS.escape(toggle)}"]`)?.focus();
        else if (action)
            root.querySelector<HTMLElement>(`[data-action="${CSS.escape(action)}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}`)?.focus();
        if (view === 'home') {
            observer ??= new ResizeObserver(() => {
                const grid = $('[data-grid]');
                if (!grid)
                    return;
                root.dataset.gridCompact = grid.clientWidth < 580 ? 'true' : 'false';
            });
            const grid = root.querySelector('[data-grid]');
            if (grid)
                observer.observe(grid);
        }
    }
    async function switchWorkspace(id: string) {
        await mutate(s => s.active = id, '', false);
        if (view === 'apps') await navigateWorkspace(new URL('/', location.href));
    }
    const more = $<HTMLDialogElement>('[data-more-dialog]');
    const moreTrigger = $('[data-more-trigger]');
    moreTrigger.addEventListener('click', () => more.showModal());
    $('[data-more-close]').addEventListener('click', () => more.close());
    let moreNavigation = false;
    more.addEventListener('close', () => { if (!moreNavigation) moreTrigger.focus(); moreNavigation = false; });
    const routes: Record<string, string> = { '/': 'home', '/apps/': 'apps', '/home/tasks/': 'tasks', '/home/calendar/': 'calendar', '/home/trackers/': 'trackers', '/home/settings/': 'settings' };
    const documents = new Map<string, Document>();
    let navigationTicket = 0;
    let committedUrl = location.pathname + location.search;
    function updateNavigation() {
        root.querySelectorAll<HTMLAnchorElement>('.ws-nav a,.ws-nav-bottom a,.ws-mobile-nav a,.ws-more-link').forEach(link => {
            const active = (routes[new URL(link.href).pathname] ?? ({'/search/':'search','/inbox/':'inbox','/home/connections/':'connections','/flows/':'flows'} as Record<string,string>)[new URL(link.href).pathname]) === view;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
        });
        if (['calendar','trackers','settings','connections','inbox'].includes(view)) moreTrigger.setAttribute('aria-current','page');
        else moreTrigger.removeAttribute('aria-current');
    }
    async function navigateWorkspace(url: URL, pop = false) {
        const next = routes[url.pathname];
        if (!next) return;
        const ticket = ++navigationTicket;
        const own = epoch;
        const previous = pop ? committedUrl : location.pathname + location.search;
        try {
            let doc = documents.get(url.pathname);
            if (!doc) {
                const response = await fetch(url.pathname, { headers: { 'X-Hub-Navigation': '1' } });
                if (!response.ok || new URL(response.url).origin !== location.origin) throw new Error('Navigation unavailable');
                doc = new DOMParser().parseFromString(await response.text(), 'text/html');
                if (doc.querySelector<HTMLElement>('[data-workspace]')?.dataset.view !== next) throw new Error('Invalid workspace route');
                documents.set(url.pathname, doc);
            }
            if (ticket !== navigationTicket || own !== epoch) return;
            clearTimeout(captureTimer);
            await queue;
            if (dirty && storageReady && !locked) await persist();
            if (ticket !== navigationTicket || own !== epoch) return;
            if (editing && next !== 'home') {
                recoveryDraft = clone(editing);
                try { await store?.draft(editing); } catch { /* Keep the draft in memory if storage is unavailable. */ }
                if (ticket !== navigationTicket || own !== epoch) return;
                editing = null; layoutUndo = []; layoutRedo = [];
            }
            if (!pop) history.pushState(null, '', url.pathname + url.search);
            view = next; root.dataset.view = next;
            if(next!=='home')resetLanguages();
            if (more.open) { moreNavigation = true; more.close(); }
            dialog.close(); searchDialog.close(); account.close();
            document.title = doc.title;
            for (const selector of ['meta[name="description"]','meta[name="robots"]','link[rel="canonical"]','meta[property="og:title"]','meta[property="og:url"]','meta[property="og:description"]','script[type="application/ld+json"]']) {
                document.head.querySelector(selector)?.remove();
                const incoming = doc.head.querySelector(selector);
                if (incoming) document.head.append(incoming.cloneNode(true));
            }
            $('[data-workspace-content]').innerHTML = next === 'apps' ? doc.querySelector('[data-workspace-content]')!.innerHTML : '';
            $('[data-workspace-date]').textContent = next === 'apps' ? `${apps.length} apps for work, learning and everything in between` : '';
            if (state) {render();if(next==='home'){languageOwner=hubIdentity.status==='signed-in'?hubIdentity.id:null;void refreshLanguages();}}
            else { $('#ws-title').textContent = next === 'apps' ? 'Apps' : 'Personal workspace'; $('[data-toolbar]').replaceChildren(); if (next !== 'apps') $('[data-workspace-content]').textContent = 'Your personal workspace is unavailable. Use recovery or retry opening local storage.'; }
            committedUrl = location.pathname + location.search;
            updateNavigation();
            if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $('[data-workspace-content]').animate([{ transform: 'translateY(5px)' }, { transform: 'translateY(0)' }], { duration: 140, easing: 'ease-out' });
            root.querySelectorAll<HTMLElement>('[data-hub-catalogue]').forEach(setupHubCatalogue);
            $('#ws-title').tabIndex = -1; $('#ws-title').focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: 'instant' });
        } catch {
            if (ticket !== navigationTicket || own !== epoch) return;
            if (pop) history.replaceState(null, '', previous);
            toast('Could not open that section. Your current view and drafts are preserved. Try again when connected.');
        }
    }
    // The trusted reading bridge stays a full-document /home/ host.
    if (!root.querySelector('[data-reading-shell]')) {
        root.addEventListener('click', event => {
            const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
            // Office has its own editor lifecycle: use real navigation so beforeunload protects drafts.
            if (view === 'documents') return;
            if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
            const url = new URL(link.href);
            if (url.origin !== location.origin || !routes[url.pathname] || url.hash) return;
            if (url.search && !(url.pathname === '/apps/' && url.searchParams.size === 1 && (url.searchParams.get('category') === 'all' || HUB_CATEGORIES.some(category => category === url.searchParams.get('category'))))) return;
            event.preventDefault();
            void navigateWorkspace(url);
        });
        window.addEventListener('popstate', () => {
            if (routes[location.pathname]) void navigateWorkspace(new URL(location.href), true);
        });
    }
    updateNavigation();
    window.addEventListener('hub:calendar-local-request',()=>{if(state)render();});
    function originalHandoffRecord() {
        if (!handoffOrigin || handoffOrigin.epoch !== epoch || !state) return undefined;
        const origin=handoffOrigin;
        return origin.kind==='task' ? state.tasks.find(t=>t.id===origin.id) :
            origin.kind==='note' ? state.notes.find(n=>n.id===origin.id) :
            state.events.find(e=>e.id===origin.id);
    }
    function renderHandoffBar() {
        const node=root.querySelector<HTMLElement>('[data-handoff-return]');
        if(!node)return;
        const record=originalHandoffRecord();
        if(!record || privacyHeld || state?.preferences.hidden || locked) {
            node.hidden=true;node.replaceChildren();return;
        }
        node.hidden=false;
        node.innerHTML=`<div class="ws-handoff-origin"><div><strong>Return to source: ${esc(record.title)}</strong>
            </div>
            <div>${button('handoff-return','Open original')}${button('handoff-dismiss','Dismiss')}</div></div>`;
    }
    function startHandoff(kind:WorkOrigin['kind'],id:string):boolean {
        if(!state || locked || privacyHeld || state.preferences.hidden) {
            toast('Personal content is hidden or unavailable. Open the local workspace first.');return false;
        }
        const exists=kind==='task'?state.tasks.some(t=>t.id===id):
            kind==='note'?state.notes.some(n=>n.id===id):state.events.some(e=>e.id===id);
        if(!exists){toast('That source record is no longer available.');return false;}
        handoffOrigin={kind,id,epoch};
        renderHandoffBar();
        return true;
    }
    function showTaskContext(id:string) {
        if(!startHandoff('task',id))return;
        const task=state!.tasks.find(t=>t.id===id)!;
        const details=`<div class="ws-context-summary">
            <strong>${esc(task.title)}</strong><p>Hub task · ${task.due?'due '+esc(task.due):'Inbox · no due date'} · ${esc(task.priority)} priority</p>

            <div class="ws-context-actions">
              ${button('edit-task','Edit original task',id)}
              ${!task.completedAt?button('plan-task-event','Review calendar time',id):''}
              ${button('create-note-from-task','Draft a local note',id)}
              <a class="ws-button" href="/home/tasks/">Open Tasks</a>
              <a class="ws-button" href="/home/connections/">Owner app permissions</a>
            </div>
          </div>`;
        openForm('Next actions · Hub task',details,()=>{});
        $('[data-dialog-submit]').hidden=true;
    }
    function showNoteContext(id:string) {
        if(!startHandoff('note',id))return;
        const note=state!.notes.find(n=>n.id===id)!;
        const ownerUrl=providerAction('notes','capture-text');
        const html=`<div class="ws-context-summary"><strong>${esc(note.title)}</strong>
          <p>Hub local note · last edited ${esc(new Date(note.updatedAt).toLocaleDateString())}</p>
          <div class="ws-context-actions">
            ${button('edit-note','Edit original note',id)}
            ${button('create-task-from-note','Draft a Hub task',id)}
            <a class="ws-button" href="/home/tasks/">Hub Tasks</a>
            ${ownerUrl?`<a class="ws-button" href="${esc(ownerUrl)}" rel="noreferrer">Open owner Notes ↗</a>`:''}
          </div></div>`;
        openForm('Next actions · Hub note',html,()=>{});
        $('[data-dialog-submit]').hidden=true;
    }
    function showEventContext(id:string) {
        if(!startHandoff('event',id))return;
        const item=state!.events.find(e=>e.id===id)!;
        const html=`<div class="ws-context-summary"><strong>${esc(item.title)}</strong>
          <p>Hub local event · ${esc(item.date)} · ${item.allDay?'all day':esc(item.zone)}</p>
          <div class="ws-context-actions">
            ${button('edit-event','Edit original event',id)}
            ${button('create-task-from-event','Draft an unscheduled Hub task',id)}
            <a class="ws-button" href="/home/calendar/">Open Calendar</a>
          </div></div>`;
        openForm('Next actions · Hub event',html,()=>{});
        $('[data-dialog-submit]').hidden=true;
    }
    function planTaskInCalendar(id:string) {
        if(!startHandoff('task',id))return;
        const task=state!.tasks.find(t=>t.id===id)!;
        if(task.completedAt){toast('Reopen the completed task before planning new time.');return;}
        if(dirty || conflict || !storageReady || !store) {
            toast('Resolve unsaved changes or storage conflicts before creating a calendar event. Export if necessary.');
            return;
        }
        const zone=state!.preferences.timezone;
        const html=`<div class="ws-context-summary" data-task-calendar-review>
          <p><strong>Source: Hub task · ${esc(task.title)}</strong></p>
          <p>Task due date: ${task.due?esc(task.due):'Not scheduled'} · original task remains unchanged.</p>
          <div class="ws-form-row">
            ${field('Calendar date','date',task.due||today(),'date','required')}
            ${field('Start time','start',task.time||'09:00','time','required')}
          </div>
          ${select('Time block','duration',[['30','30 minutes'],['45','45 minutes'],['60','60 minutes'],['90','90 minutes'],['120','120 minutes']],'60')}
          <label class="ws-choice"><input type="checkbox" name="allDay"/> Use an all-day event instead</label>
          <p class="ws-muted">${esc(zone)} · event must finish before midnight</p>
          <div data-task-calendar-preview class="ws-plan-preview" aria-live="polite"></div>
          <label class="ws-choice ws-context-confirm"><input type="checkbox" name="confirm" required/>
            I reviewed the date and understand this creates a separate Hub-local calendar event, not a task due date or external appointment.</label>

        </div>`;
        const sourceTitle=task.title;
        openForm('Review task → local calendar',html,async data=>{
            if(!state || locked || dirty || conflict || !storageReady || !store)
                throw new Error('The original workspace must be saved and available before scheduling.');
            const proposal={taskId:id,title:sourceTitle,date:String(data.get('date')),
                time:String(data.get('start')),duration:Number(data.get('duration')),
                allDay:data.has('allDay'),confirmed:data.has('confirm')};
            // Validate before mutation; validate again inside the native queued writer.
            const preview=prepareTaskCalendarEvent(state.tasks.find(t=>t.id===id)??task,proposal,state.preferences.timezone);
            if (identicalLocalEvent(state.events,preview.event))
                throw new Error('An identical local calendar event already exists. No duplicate was created.');
            await mutate(s=>{
                const source=s.tasks.find(t=>t.id===id);
                if(!source)throw new Error('The source task was deleted. No calendar event was created.');
                const {event}=prepareTaskCalendarEvent(source,proposal,s.preferences.timezone);
                if(identicalLocalEvent(s.events,event))throw new Error('An identical local calendar event already exists. No duplicate was added.');
                s.events.push(event);
                activity(s,`Scheduled local event from reviewed task: ${source.title}`,'event');
            },'Reviewed Hub calendar event created');
            if (!state.events.some(event=>event.title===preview.event.title &&
                event.start===preview.event.start && event.end===preview.event.end &&
                event.date===preview.event.date && event.allDay===preview.event.allDay))
                throw new Error('The calendar event was not created. Review the message and try again.');
            if(dirty || conflict)throw new Error('Event is in this tab but was not confirmed saved. Export or retry; do not submit twice.');
        },'Create reviewed Hub event');
        paintTaskCalendarPreview(task,zone);
    }
    function paintTaskCalendarPreview(task:Task,zone:string) {
        const el=dialog.querySelector<HTMLElement>('[data-task-calendar-preview]');
        if(!el || !state)return;
        try {
            const data=new FormData(form);
            const proposal={taskId:task.id,title:task.title,date:String(data.get('date')??''),
                time:String(data.get('start')??''),duration:Number(data.get('duration')),
                allDay:data.has('allDay'),confirmed:true};
            const preview=prepareTaskCalendarEvent(
                state.tasks.find(t=>t.id===task.id)??task,proposal,zone).event;
            const duplicate=identicalLocalEvent(state.events,preview);
            const overlaps=overlapsForEvent(state.events,preview);
            const names=[...new Set(overlaps.map(p=>p.first===preview.id?p.second:p.first))]
                .map(id=>state!.events.find(e=>e.id===id)?.title).filter(Boolean);
            el.innerHTML=`<strong>Proposed local calendar block · ${esc(preview.title)}</strong>
                <p>${esc(preview.date)} · ${preview.allDay?'All day':esc(preview.start)+' → '+esc(preview.end)} (${esc(zone)})</p>
                ${duplicate?'<p class="ws-plan-preview-warning">Identical event already exists. This proposal cannot be added again.</p>':''}
                ${overlaps.length?`<p class="ws-plan-preview-warning">${overlaps.length} possible timed overlap${overlaps.length===1?'':'s'} with local Hub events: ${esc(names.join(', '))}. No external calendars were checked.</p>`:
                    '<p>No timed overlaps detected in local Hub events. All-day commitments and external sources are not checked for time conflicts.</p>'}`;
        } catch(e) {
            el.innerHTML=`<p class="ws-plan-preview-warning">${esc(e instanceof Error?e.message:'Review the proposed date and time.')}</p>`;
        }
    }
    function paintWeekChangePreview(snapshots:readonly TaskBeforeMove[],origin:number) {
        const el=dialog.querySelector<HTMLElement>('[data-week-shift-preview]');
        if(!el || !state || origin!==epoch)return;
        const target=dialog.querySelector<HTMLInputElement>('[name=target]')?.value??'';
        try {
            if(target<today())
                throw new Error('Choose today or a future date for carryover, not an already overdue date.');
            const changes=prepareWeeklyShift(state.tasks,snapshots,target);
            el.innerHTML=`<strong>${changes.length} actual task due-date change${changes.length===1?'':'s'}</strong>
                <ul>${changes.map(c=>`<li><strong>${esc(c.title)}</strong>: ${esc(c.before)} → ${esc(c.after)}
                   ${c.clearedTime?`· task clock ${esc(c.clearedTime)} will be cleared`:''}</li>`).join('')}</ul>
                <p>No calendar events, source notes or external appointments will change.
                  These tasks remain incomplete; the task due dates are not reserved time blocks.</p>`;
        } catch(error) {
            el.innerHTML=`<p class="ws-week-preview-error">${esc(error instanceof Error?error.message:'Review the selected tasks and date.')}</p>`;
        }
    }
    function reviewWeeklyCarryover() {
        if(view!=='calendar' || !state || locked || privacyHeld || state.preferences.hidden)
            return;
        if(conflict || dirty || !storageReady || !store) {
            toast('Storage is unavailable, unsaved or conflicted. Export/retry before changing task dates.');
            return;
        }
        pruneWeekSelection();
        const ids=[...weekSelection];
        if(!ids.length || ids.length>MAX_WEEK_BATCH) {
            toast(`Select between 1 and ${MAX_WEEK_BATCH} unfinished tasks before reviewing carryover.`);
            return;
        }
        const snapshots:TaskBeforeMove[]=ids.map(id=>taskSnapshot(state!.tasks.find(t=>t.id===id)!));
        activeWeekReview={snapshots,epoch};
        const suggested=addDays(weekDays(selected)[0]!,7);
        const defaultTarget=suggested<today()?today():suggested;
        const details=`<div class="ws-week-review-form" data-week-review-form>
          <p><strong>Source: ${snapshots.length} selected Hub-local tasks</strong></p>
          <p>Changing the due date clears task times.</p>
          ${field('New due date','target',defaultTarget,'date',`required min="${today()}"`)}
          <div class="ws-week-preview" data-week-shift-preview aria-live="polite"></div>
          <label class="ws-week-confirm"><input type="checkbox" name="confirm" required/>
            I reviewed the selected unfinished tasks and target date. Change their Hub due dates only; do not add appointments or complete tasks.</label>

          <p class="ws-muted">If the original record changes in another tab, export/review instead of forcing a merge.</p>
        </div>`;
        const own=epoch,source=store;
        openForm('Review weekly task carryover',details,async data=>{
            if(epoch!==own || !state || store!==source || !storageReady || locked ||
               privacyHeld || state.preferences.hidden || conflict || dirty)
                throw new Error('Identity, storage or unsaved workspace state changed. Export or reload and review again.');
            if(!data.has('confirm'))
                throw new Error('Explicitly confirm the task due-date changes.');
            const target=String(data.get('target')??'');
            if(!validDate(target) || target<today())
                throw new Error('Choose a valid present or future Hub due date.');
            const changes=prepareWeeklyShift(state.tasks,snapshots,target);
            const expectedChangedIds=new Set(changes.map(c=>c.id));
            await mutate(next=>{
                // Entire selection validated before applying any changes; no partial batch on stale evidence.
                const applied=applyWeeklyShift(next.tasks,snapshots,target);
                activity(next,`Reviewed weekly due-date move: ${applied.length} Hub task${applied.length===1?'':'s'} → ${target}`,'task');
            },'Reviewed weekly Hub due dates updated');
            if(epoch!==own || !state)
                throw new Error('The active account changed. No result is claimed.');
            if([...expectedChangedIds].some(id=>{
                const t=state!.tasks.find(x=>x.id===id);
                return !t || t.due!==target || !!t.time;
            })) throw new Error('Task changes were not applied. Reopen planning and review.');
            if(dirty || conflict)
                throw new Error('Changes are in this tab but not confirmed saved. Export or retry; do not submit again.');
            weekSelection.clear();
            weekFilter='week';
            weekReturnDate=weekDays(selected)[0]!;
            selected=target;
            month=selected.slice(0,7)+'-01';
            agendaMode='week';
            render();
        },'Apply reviewed due dates');
        paintWeekChangePreview(snapshots,own);
    }
    function reviewUnifiedTask(id:string) {
        if (!state || locked || privacyHeld || state.preferences.hidden) return;
        const record=state.tasks.find(t=>t.id===id&&!t.completedAt);
        if(!record){toast('Task was completed or is no longer available.');return;}
        if(!storageReady || dirty || conflict || !store){
            toast('Task planning is blocked by unavailable, unsaved or conflicting local storage. Export or retry first.');
            return;
        }
        const original=taskSnapshot(record),own=epoch,source=store;
        activeUnifiedReview={task:original,epoch};
        const target=record.due&&record.due>=today()?record.due:today();
        const html=`<div class="ws-unified-review" data-unified-review>
          <strong>Original Hub task · ${esc(record.title)}</strong>
          <p>Current status: ${record.due?'due '+esc(record.due):'Inbox (unscheduled)'} · ${esc(record.priority)} priority${record.time?' · clock '+esc(record.time):''}. Task and local calendar remain independent.</p>
          ${field('Proposed due date','due',target,'date',`required min="${today()}"`)}
          <label class="ws-unified-choice"><input type="checkbox" name="inbox" ${record.due?'':'checked'}/>
            Keep in Inbox without a due date</label>
          ${select('Priority','priority',[['none','None'],['low','Low'],['medium','Medium'],['high','High']],record.priority)}
          <div class="ws-unified-review-preview" data-unified-review-preview aria-live="polite"></div>
          <label class="ws-unified-choice ws-unified-confirm"><input type="checkbox" name="confirm" required/>
            I reviewed this Hub task and approve only its due-date/priority change. No calendar appointment is created and nothing is marked completed.</label>
          <p class="ws-muted">Changing the due date clears the task’s time.</p>
        </div>`;
        openForm('Review task plan · Hub local',html,async data=>{
            if(epoch!==own || store!==source || !state || dirty || conflict || !storageReady || locked ||
                privacyHeld || state.preferences.hidden)throw new Error('Workspace or ownership changed. Export/reload and review again.');
            if(!data.has('confirm'))throw new Error('Confirm your task plan explicitly.');
            const isInbox=data.has('inbox');
            const day=String(data.get('due')??'');
            const nextDue=isInbox?'':day;
            const nextPriority=String(data.get('priority'));
            if(!isInbox && (!safeNavigationDay(day)||day<today()))
                throw new Error('Choose today or a later valid due date, or keep the task in Inbox.');
            if(!['none','low','medium','high'].includes(nextPriority))
                throw new Error('Choose a valid task priority.');
            const current=state.tasks.find(t=>t.id===id);
            if(!current || JSON.stringify(taskSnapshot(current))!==JSON.stringify(original))
                throw new Error('Task changed since review. Reopen from the current record.');
            if(nextDue===original.due && nextPriority===original.priority)
                throw new Error('No changes to save. Adjust the task date or priority, or close.');
            await mutate(next=>{
                const t=next.tasks.find(t=>t.id===id);
                if(!t || JSON.stringify(taskSnapshot(t))!==JSON.stringify(original))
                    throw new Error('Task changed while saving. No plan was applied.');
                if(nextDue!==t.due)applyTaskPlan(t,isInbox?'inbox':'today',isInbox?today():day);
                t.priority=nextPriority as Task['priority'];
                activity(next,`Reviewed task plan: ${t.title} · ${t.due||'Inbox'} · ${t.priority} priority`,'task');
            },'Reviewed Hub task plan updated');
            if(epoch!==own||!state)throw new Error('Identity changed; no save is claimed.');
            const saved=state.tasks.find(t=>t.id===id);
            if(!saved || saved.due!==nextDue || saved.priority!==nextPriority)
                throw new Error('Task plan was not applied. Reopen the task.');
            if(dirty || conflict)throw new Error('Task changes remain unconfirmed in this tab. Export or retry rather than submitting twice.');
        },'Apply reviewed task plan');
        paintUnifiedTaskPreview(original);
    }
    function paintUnifiedTaskPreview(original:TaskBeforeMove) {
        const el=dialog.querySelector<HTMLElement>('[data-unified-review-preview]');
        if(!el)return;
        const data=new FormData(form);
        const inbox=data.has('inbox'),date=String(data.get('due')??''),prio=String(data.get('priority')??'');
        const day=inbox?'Inbox':date;
        const valid=inbox||safeNavigationDay(date)&&date>=today();
        el.innerHTML=valid?`<p><strong>Before:</strong> ${esc(original.due||'Inbox')} · ${esc(original.priority)} priority</p>
            <p><strong>After review:</strong> ${esc(day)} · ${esc(prio)} priority${(inbox?'':date)!==original.due&&original.time?' · original task clock will be cleared':''}</p>
            `:
            '<p class="ws-unified-review-error">Choose a valid present/future due date or select Inbox.</p>';
    }
    function editTask(id = '', seed?: {title:string;notes:string}) {
        const t = state!.tasks.find(x => x.id === id);
        openForm(t ? 'Edit task' : 'Add a task', field('Task', 'title', t?.title ?? seed?.title ?? '', 'text', 'required maxlength="240"') + area('Notes', 'notes', t?.notes ?? seed?.notes ?? '', 2000) + `<div class="ws-form-row">${field('Due date', 'due', t?.due ?? (seed ? '' : selected), 'date')}${field('Time (optional)', 'time', t?.time ?? '', 'time')}</div>` + `<div class="ws-task-date-presets" role="group" aria-label="Task due date shortcuts">${button('task-date-today','Today')}${button('task-date-tomorrow','Tomorrow')}${button('task-date-week','In 7 days')}${button('task-date-inbox','Clear due date')}</div>` + select('Priority', 'priority', [['none', 'None'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], t?.priority ?? 'none'), async (data) => {
            const task: Task = { id: t?.id ?? uid(), title: String(data.get('title')).trim(), notes: String(data.get('notes')), due: String(data.get('due')), time: String(data.get('time')), priority: data.get('priority') as Task['priority'], completedAt: t?.completedAt ?? null };
            if (!task.title)
                throw new Error('Enter a task title.');
            if (task.time && !task.due)
                throw new Error('Choose a due date for a timed task.');
            if (task.time)
                zonedInstant(task.due, task.time, state!.preferences.timezone);
            await mutate(s => {
                const ix = s.tasks.findIndex(x => x.id === task.id);
                if (ix >= 0)
                    s.tasks[ix] = task;
                else
                    s.tasks.push(task);
                activity(s, `${t ? 'Updated' : 'Added'} task: ${task.title}`, 'task');
            }, 'Task saved');
        });
    }

    function movePreviewRequest(data:FormData,confirmed:boolean):MoveEventRequest {
        return {date:String(data.get('date')??''),endDate:String(data.get('endDate')??''),
            startTime:String(data.get('startTime')??''),endTime:String(data.get('endTime')??''),
            allDay:data.has('allDay'),confirmed};
    }
    function paintEventMovePreview(source:CalendarEvent,zone:string) {
        const el=dialog.querySelector<HTMLElement>('[data-event-move-preview]');
        if(!el || !state)return;
        try {
            const candidate=reviewedEventMove(source,movePreviewRequest(new FormData(form),true),zone);
            const same=JSON.stringify(candidate)===JSON.stringify(source);
            const issues=overlapsForEvent(state.events,candidate);
            const uniqueIds=new Set(issues.map(p=>p.first===source.id?p.second:p.first));
            const otherTitles=[...uniqueIds].map(id=>state!.events.find(e=>e.id===id)?.title).filter(Boolean);
            const warning=issues.length
              ? `<p class="ws-plan-preview-warning">${issues.length} possible overlap${issues.length===1?'':'s'} with existing timed Hub events: ${esc(otherTitles.join(', '))}. Review carefully; no event changes have been made.</p>`
              : `<p>${candidate.allDay?'All-day events have no exact time to compare.':'No timed overlaps were detected among local Hub events.'} This does not check external calendars.</p>`;
            el.innerHTML=`<strong>Proposed Hub event · ${esc(candidate.title)}</strong>
              <p>${esc(candidate.date)}${candidate.endDate!==candidate.date?' through '+esc(candidate.endDate):''} · ${candidate.allDay?'All day':esc(candidate.start)+' → '+esc(candidate.end)}</p>
              ${same?'<p>The proposed date and time are unchanged.</p>':''}${warning}`;
        } catch(e) {
            el.innerHTML=`<p class="ws-plan-preview-warning">${esc(e instanceof Error?e.message:'Choose a valid date and time.')}</p>`;
        }
    }
    function reviewEventTime(id:string) {
        if (!state || locked || privacyHeld || state.preferences.hidden) return;
        const original=state.events.find(e=>e.id===id);
        if(!original) { toast('This local event no longer exists.');return; }
        if (dirty || conflict || !storageReady || !store) {
            toast('Resolve unsaved changes or a storage conflict before reviewing this event. Export a backup if needed.');
            return;
        }
        if(!startHandoff('event',id))return;
        const zone=state.preferences.timezone;
        const localClock=(iso:string)=>new Intl.DateTimeFormat('en-GB',
          {timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
        const request={
            date:original.allDay?original.date:dayKey(zone,new Date(original.start)),
            endDate:original.allDay?original.endDate:dayKey(zone,new Date(original.end)),
            startTime:original.allDay?'09:00':localClock(original.start),
            endTime:original.allDay?'10:00':localClock(original.end),
        };
        const html=`<div data-review-event-move class="ws-plan-review-form">
           <p><strong>Hub local calendar · ${esc(original.title)}</strong></p>

           <div class="ws-form-row">${field('Start date','date',request.date,'date','required')}
              ${field('End date','endDate',request.endDate,'date','required')}</div>
           <div class="ws-form-row">${field('Start time','startTime',request.startTime,'time')}
              ${field('End time','endTime',request.endTime,'time')}</div>
           <label class="ws-choice"><input type="checkbox" name="allDay" ${original.allDay?'checked':''}/> All-day event</label>
           <p class="ws-muted">Timezone: ${esc(zone)}. End time must follow start; timed midnight endings are exclusive. All-day end date is inclusive.</p>
           <div data-event-move-preview class="ws-plan-preview" aria-live="polite"></div>
           <label class="ws-choice ws-plan-confirm"><input type="checkbox" name="confirm" required/>
             I reviewed the date, time, other local events and understand that saving changes this one Hub calendar event only.</label>

         </div>`;
        const oldState=JSON.stringify(original),formEpoch=epoch;
        openForm('Review local event time',html,async data=>{
            if(epoch!==formEpoch||!state||locked||!storageReady||dirty||conflict||privacyHeld||state.preferences.hidden)
                throw new Error('The workspace changed or is not writable. Export/recover before retrying.');
            const candidate=reviewedEventMove(original,movePreviewRequest(data,data.has('confirm')),state.preferences.timezone);
            if(JSON.stringify(candidate)===oldState)throw new Error('No event time or date was changed.');
            await mutate(s=>{
                const ix=s.events.findIndex(e=>e.id===id);
                if(ix<0 || JSON.stringify(s.events[ix])!==oldState)
                    throw new Error('The original event changed in another action. Reopen the time review.');
                const next=reviewedEventMove(s.events[ix]!,movePreviewRequest(data,true),s.preferences.timezone);
                s.events[ix]=next;
                activity(s,`Reviewed local event time: ${next.title}`,'event');
            },'Local event time updated');
            if(dirty||conflict)
                throw new Error('The event change is in memory but not confirmed saved. Export or retry without submitting twice.');
        },'Save reviewed event time');
        paintEventMovePreview(original,zone);
    }
    function editEvent(id = '') {
        const ev = state!.events.find(e => e.id === id);
        const zone = state!.preferences.timezone;
        const localTime = (instant: string) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant));
        openForm(ev ? 'Edit event' : 'Add an event', field('Event', 'title', ev?.title ?? '', 'text', 'required maxlength="240"') + `<label class="ws-choice"><input type="checkbox" name="allDay" ${ev?.allDay ? 'checked' : ''}/> All-day event</label><div class="ws-form-row">${field('Start date', 'date', ev && !ev.allDay ? dayKey(zone,new Date(ev.start)) : ev?.date ?? selected, 'date', 'required')}${field('End date', 'endDate', ev && !ev.allDay ? dayKey(zone,new Date(ev.end)) : ev?.endDate ?? selected, 'date', 'required')}</div><div class="ws-form-row">${field('Start time', 'start', ev && !ev.allDay ? localTime(ev.start) : '09:00', 'time')}${field('End time', 'end', ev && !ev.allDay ? localTime(ev.end) : '10:00', 'time')}</div><p class="ws-muted">Times use ${esc(zone)}. All-day end date is inclusive.</p>${ev ? button('delete-event', 'Delete event', ev.id) : ''}`, async (data) => {
            const allDay = data.has('allDay'), date = String(data.get('date')), endDate = String(data.get('endDate'));
            const event: CalendarEvent = { id: ev?.id ?? uid(), title: String(data.get('title')).trim(), date, endDate, allDay, zone, start: allDay ? '' : zonedInstant(date, String(data.get('start')), zone), end: allDay ? '' : zonedInstant(endDate, String(data.get('end')), zone) };
            if (!event.title || endDate < date || (!allDay && Date.parse(event.end) <= Date.parse(event.start)))
                throw new Error('Give the event a title and an end after its start.');
            await mutate(s => {
                const ix = s.events.findIndex(e => e.id === event.id);
                if (ix >= 0)
                    s.events[ix] = event;
                else
                    s.events.push(event);
                activity(s, `${ev ? 'Updated' : 'Added'} event: ${event.title}`, 'event');
            }, 'Event saved');
        });
    }
    function editNote(id = '', seed?: {title:string;body:string}) {
        const note = state!.notes.find(n => n.id === id);
        openForm(note ? 'Edit local note' : 'Capture a note', field('Title', 'title', note?.title ?? seed?.title ?? '', 'text', 'required maxlength="240"') + area('Note', 'body', note?.body ?? seed?.body ?? state!.captureDraft) + (note ? button('delete-note', 'Delete note', note.id) : ''), async (data) => {
            const next: Note = { id: note?.id ?? uid(), title: String(data.get('title')).trim(), body: String(data.get('body')), updatedAt: stamp() };
            if (!next.title)
                throw new Error('Enter a title.');
            await mutate(s => {
                const ix = s.notes.findIndex(n => n.id === next.id);
                if (ix >= 0)
                    s.notes[ix] = next;
                else
                    s.notes.unshift(next);
                if (!note) s.captureDraft = '';
                activity(s, `${note ? 'Updated' : 'Captured'} note: ${next.title}`, 'note');
            }, 'Note saved');
        });
    }
    function editTracker(id = '') {
        const t = state!.trackers.find(t => t.id === id);
        const hasHistory=!!t&&state!.logs.some(log=>log.trackerId===t.id);
        const measurementHelp=hasHistory?'<p class="ws-muted">Type and unit stay fixed to preserve your recorded measurements. Create a new tracker for a different unit. Goal and period changes apply to the current progress view; your entries stay unchanged.</p>':'';
        openForm(t ? 'Edit tracker' : 'Create a tracker', field('Name', 'title', t?.title ?? '', 'text', 'required maxlength="80"') + select('Track', 'kind', [['count', 'Count'], ['duration', 'Duration'], ['checklist', 'Checklist']], t?.kind ?? 'count',hasHistory) + field('Unit', 'unit', t?.unit ?? 'sessions', 'text', `required maxlength="40" ${hasHistory?'readonly':''}`) + measurementHelp + field('Goal', 'goal', String(t?.goal ?? 5), 'number', 'required min="0.01" max="100000" step="any"') + select('Period', 'cadence', [['daily', 'Daily'], ['weekly', 'Weekly']], t?.cadence ?? 'weekly') + (t ? button('delete-tracker', 'Delete tracker and its logs', t.id) : ''), async (data) => {
            const tracker: Tracker = { id: t?.id ?? uid(), title: String(data.get('title')).trim(), kind: (data.get('kind') ?? t?.kind) as Tracker['kind'], unit: String(data.get('unit')).trim(), goal: Number(data.get('goal')), cadence: data.get('cadence') as Tracker['cadence'] };
            validateTrackerChange(state!,tracker,t?'update':'create');
            await mutate(s => {
                saveTracker(s,tracker,t?'update':'create');
                activity(s, `${t ? 'Updated' : 'Created'} tracker: ${tracker.title}`, 'tracker');
            }, 'Tracker saved');
        });
    }
    function logTracker(id: string, logId = '') {
        const log = state!.logs.find(l => l.id === logId);
        const t = state!.trackers.find(t => t.id === id);
        if (!t)
            return;
        openForm(`${log ? 'Edit' : 'Log'} ${t.title}`, field('Date', 'date', log?.date ?? today(), 'date', `required max="${today()}"`) + field(t.kind === 'duration' ? `Duration (${esc(t.unit)})` : `Amount (${esc(t.unit)})`, 'value', String(log?.value ?? 1), 'number', 'required min="0" max="100000" step="any"') + field('Note (optional)', 'note', log?.note ?? '', 'text', 'maxlength="500"'), async (data) => {
            const value = Number(data.get('value')), date = String(data.get('date'));
            const record = { id: log?.id ?? uid(), trackerId: id, date, value, note: String(data.get('note')) };
            validateTrackerLog(state!,record,log?'update':'create',today());
            await mutate(s => {
                saveTrackerLog(s,record,log?'update':'create',today());
                activity(s, `${log?'Corrected':'Logged'} ${value} ${t.unit}: ${t.title}`, 'tracker');
            }, 'Tracker log saved');
        });
    }
    function beginEdit() {
        if (editing)
            return;
        editing = { workspaceId: current().id, baseRevision: current().revision, workspace: clone(current()) };
        layoutUndo = [];
        layoutRedo = [];
        render();
        void saveDraft();
    }
    async function saveDraft() {
        if (!store || !storageReady || !editing)
            return;
        const own = epoch;
        try {
            await store.draft(clone(editing));
        }
        catch {
            if (own === epoch)
                notice('Layout changes are only in memory. Export your workspace before leaving.', button('export', 'Export'));
        }
    }
    function changeLayout(change: (w: Workspace) => void) {
        if (!editing)
            beginEdit();
        if (!editing)
            return;
        layoutUndo.push(clone(editing.workspace));
        layoutUndo = layoutUndo.slice(-50);
        layoutRedo = [];
        change(editing.workspace);
        render();
        void saveDraft();
    }
    async function finishEdit() {
        if (!editing || !state)
            return;
        const draft = clone(editing);
        if (current().id !== draft.workspaceId || current().revision !== draft.baseRevision || conflict) {
            notice('The saved layout changed. Your edit draft is kept. Reload saved data, then resume it or save it as another workspace.', button('save-draft-as', 'Save as new workspace') + button('reload', 'Reload saved data'));
            return;
        }
        await mutate(s => { const index = s.workspaces.findIndex(w => w.id === draft.workspaceId); draft.workspace.revision++; draft.workspace.updatedAt = stamp(); s.workspaces[index] = draft.workspace; }, 'Layout saved', false);
        if (current().revision === draft.baseRevision + 1 && (!dirty || !storageReady)) {
            editing = null;
            recoveryDraft = null;
            await store?.draft(null);
            if (!dirty) notice('');
            render();
        }
    }
    root.addEventListener('click',event=>{
        const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]');
        if(!link||event.defaultPrevented||!state||locked||privacyHeld||state.preferences.hidden||state.preferences.recordRecentLaunches===false)return;
        const app=apps.find(a=>new URL(a.url,location.href).href===link.href)||apps.find(a=>a.id===link.dataset.launch);
        if(!app)return;
        if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.target==='_blank'){void mutate(s=>activity(s,'Opened '+app.title,'launch:'+app.id),'',false);return;}
        event.preventDefault();const destination=link.href;
        void mutate(s=>activity(s,'Opened '+app.title,'launch:'+app.id),'',false).then(()=>location.assign(destination)).catch(()=>{});
    });
    root.addEventListener('click',event=>{
        const control=(event.target as Element).closest<HTMLButtonElement>('[data-shortcut-move]');
        const row=control?.closest<HTMLElement>('[data-app-choice]');if(!control||!row)return;
        const direction=Number(control.dataset.shortcutMove), other=direction<0?row.previousElementSibling:row.nextElementSibling;
        if(other){if(direction<0)other.before(row);else other.after(row);control.focus();}
    });
    function editShortcuts(widget: Widget) {
        const links=customLinks(widget), selected=shortcutIds(widget).map(id=>resolveLaunch(id)?.id??id);
        const choices=[...apps,...links.map(link=>({...link,icon:'arrow-up-right',category:'external'}))];
        const rows=[...selected.map(id=>choices.find(a=>a.id===(resolveLaunch(id)?.id??id))??{id,title:'Unavailable shortcut: '+id,icon:'warning'}),...choices.filter(a=>!selected.some(id=>(resolveLaunch(id)?.id??id)===a.id))];
        openForm('Choose app shortcuts', field('Widget title','title',String(widget.config.title??'App shortcuts'),'text','required maxlength="80"')+select('Show','shortcutSource',[['pinned','Pinned apps'],['recent','Recently opened apps'],['connected','Apps sharing fresh summaries']],String(widget.config.shortcutSource??'pinned'))+'<p>Choose up to 12 shortcuts. Move rows to set their order.</p><label class="ws-field">Find an app<input type="search" data-pin-search /></label><div data-shortcut-choices>'+rows.map(a=>`<div class="ws-shortcut-choice" data-app-choice="${esc(a.title.toLocaleLowerCase())}"><label class="ws-choice"><input type="checkbox" name="appIds" value="${esc(a.id)}" ${selected.includes(a.id)?'checked':''}/>${esc(a.title)}</label><button type="button" class="ws-button" data-shortcut-move="-1" aria-label="Move ${esc(a.title)} earlier">↑</button><button type="button" class="ws-button" data-shortcut-move="1" aria-label="Move ${esc(a.title)} later">↓</button></div>`).join('')+'</div><details><summary>Add an external shortcut</summary>'+field('Name','customTitle','','text','maxlength="80"')+field('HTTPS address','customUrl','','url','placeholder="https://…"')+'</details>',async data=>{
            const widgetTitle=String(data.get('title')??'').trim();if(!widgetTitle)throw new Error('Enter a widget title.');
            const ids=data.getAll('appIds').map(String), title=String(data.get('customTitle')??'').trim(), url=String(data.get('customUrl')??'').trim();
            const nextLinks=[...links];
            if(title||url){if(!title||!url)throw new Error('Enter a name and HTTPS address.');const link={id:'custom:'+uid(),title,url:safeCustomUrl(url)};nextLinks.push(link);ids.push(link.id);}
            if(ids.length>12)throw new Error('Choose at most 12 shortcuts.');
            await mutate(s=>{const ws=s.workspaces.find(w=>w.id===s.active)!;setShortcuts(ws,widget.id,ids,nextLinks.filter(l=>ids.includes(l.id)));ws.widgets.find(w=>w.id===widget.id)!.config.title=widgetTitle;ws.widgets.find(w=>w.id===widget.id)!.config.shortcutSource=String(data.get('shortcutSource'));ws.revision++;ws.updatedAt=stamp();},'Shortcuts saved');
        });
    }
    function configureWidget(id: string) {
        let w = (editing?.workspace ?? current()).widgets.find(w => w.id === id);
        if (!w)
            return;
        if (!specification(w.type) || w.typeVersion > 1) {
            openForm('Unavailable widget', '<p>This widget is preserved. You can remove it explicitly without deleting its underlying data.</p>' + button('remove-widget','Remove widget',id),()=>{}); $('[data-dialog-submit]').hidden=true; return;
        }
        if (!editing && w.type==='app-shortcuts') { editShortcuts(w); return; }
        if (!editing) {
            beginEdit();
            w = editing!.workspace.widgets.find(w => w.id === id)!;
        }
        const spec = specification(w.type)!;
        let config = '';
        if (w.type === 'app-shortcuts') {
            const selectedIds = Array.isArray(w.config.appIds) ? w.config.appIds : pins();
            config = `<label class="ws-choice"><input type="checkbox" name="useActions" ${w.config.useActions !== false ? 'checked' : ''}/> Use direct app actions when available</label><label class="ws-field">Find an app to pin<input type="search" data-pin-search placeholder="App name…"/></label>${apps.map(a => `<label class="ws-choice" data-app-choice="${esc(a.title.toLocaleLowerCase())}"><input type="checkbox" name="appIds" value="${esc(a.id)}" ${selectedIds.includes(a.id) ? 'checked' : ''}/>${icon(a.icon)} ${esc(a.title)}</label>`).join('')}`;
        }
        else if (w.type.startsWith('tracker')) {
            const ids = w.config.trackerIds;
            config = `<p class="ws-muted">Select trackers, or leave all unchecked to show all.</p>${state!.trackers.map(t => `<label class="ws-choice"><input type="checkbox" name="trackerIds" value="${esc(t.id)}" ${Array.isArray(ids) && ids.includes(t.id) ? 'checked' : ''}/>${esc(t.title)}</label>`).join('')}`;
        }
        else if (['task-inbox','task-priorities','upcoming-commitments','recent-captures','quick-plan'].includes(w.type)) {
            const selectedLimit = Number.isInteger(w.config.itemLimit) ? Number(w.config.itemLimit) : 6;
            config = select('Items to show','itemLimit',[['2','2 items'],['3','3 items'],['4','4 items'],['6','6 items'],['8','8 items'],['12','12 items']],String(selectedLimit));
            if (w.type === 'upcoming-commitments')
                config += select('Agenda horizon','dateRange',[['3','Next 3 days'],['7','Next 7 days'],['14','Next 14 days']],String(w.config.dateRange ?? 7));
            if (w.type === 'recent-captures')
                config += select('Captured records','sourceKind',[['both','Hub notes + task capture history'],['notes','Hub notes only'],['tasks','Task capture history only']],String(w.config.sourceKind ?? 'both'));
        }
        else if (w.type === 'owner-handoffs') {
            const ids = Array.isArray(w.config.ownerSources) ? w.config.ownerSources : ['notes','library','tms60'];
            config = '' +
              [['notes','Notes'],['library','Library'],['tms60','TMS60']].map(([id,label]) =>
                `<label class="ws-choice"><input type="checkbox" name="ownerSources" value="${id}" ${ids.includes(id)?'checked':''}/> ${label}</label>`).join('');
        }
        const widgetId = w.id;
        openForm('Configure ' + spec.title, field('Widget title', 'title', typeof w.config.title === 'string' ? w.config.title : spec.title, 'text', 'required maxlength="80"') + select('View', 'view', spec.views.map(v => [v, v[0]!.toUpperCase() + v.slice(1)]), w.view) + `<div class="ws-form-row">${field('Width (columns)', 'width', String(w.desktop.w), 'number', `required min="${spec.minWidth}" max="12"`)}${field('Height (8px steps)', 'height', String(w.desktop.h), 'number', `required min="${spec.minHeight}" max="120"`)}</div><div class="ws-form-row">${field('Column position', 'x', String(w.desktop.x), 'number', 'required min="0" max="8"')}${field('Row position', 'y', String(w.desktop.y), 'number', 'required min="0" max="10000"')}</div>${config}<div class="ws-content-toolbar">${button('move-widget-up', 'Move earlier', widgetId)}${button('move-widget-down', 'Move later', widgetId)}${button('remove-widget', 'Remove widget', widgetId)}</div>`, data => {
            const ids = data.getAll('appIds').map(String);
            if (!String(data.get('title')).trim()) throw new Error('Enter a widget title.');
            if (ids.length > 12)
                throw new Error('Choose at most 12 app shortcuts.');
            changeLayout(ws => {
                const item = ws.widgets.find(x => x.id === widgetId)!;
                item.view = String(data.get('view'));
                item.config.title = String(data.get('title')).trim();
                if (item.type === 'app-shortcuts') item.config.useActions = data.has('useActions');
                if (item.type === 'app-shortcuts')
                    item.config.appIds = [...(Array.isArray(item.config.appIds) ? item.config.appIds.filter(id => ids.includes(String(id))) : []), ...ids.filter(id => !Array.isArray(item.config.appIds) || !item.config.appIds.includes(id))];
                if (item.type.startsWith('tracker')) {
                    const trackers = data.getAll('trackerIds').map(String);
                    if (trackers.length)
                        item.config.trackerIds = trackers;
                    else
                        delete item.config.trackerIds;
                }
                if (['task-inbox','task-priorities','upcoming-commitments','recent-captures','quick-plan'].includes(item.type)) {
                    const itemLimit = Number(data.get('itemLimit'));
                    if (![2,3,4,6,8,12].includes(itemLimit)) throw new Error('Choose a valid widget item limit.');
                    item.config.itemLimit = itemLimit;
                }
                if (item.type === 'upcoming-commitments') {
                    const dateRange = Number(data.get('dateRange'));
                    if (![3,7,14].includes(dateRange)) throw new Error('Choose a valid agenda range.');
                    item.config.dateRange = dateRange;
                }
                if (item.type === 'recent-captures') {
                    const sourceKind = String(data.get('sourceKind'));
                    if (!['both','notes','tasks'].includes(sourceKind)) throw new Error('Choose a valid capture source.');
                    item.config.sourceKind = sourceKind;
                }
                if (item.type === 'owner-handoffs')
                    item.config.ownerSources = data.getAll('ownerSources').map(String);
                ws.widgets = place(ws.widgets, widgetId, { x: Number(data.get('x')), y: Number(data.get('y')), w: Number(data.get('width')), h: Number(data.get('height')) });
            });
        });
    }
    function widgetPicker() {
        if (!editing)
            beginEdit();
        const groups: Array<{title:string;description:string;types:string[]}> = [
            {title:'Plan & do',description:'Local Hub tasks, deadlines and captures',types:['task-inbox','task-priorities','upcoming-commitments','quick-plan','recent-captures']},
            {title:'Open & continue',description:'Apps and owner-authorized handoffs',types:['app-shortcuts','continue','owner-handoffs','capture']},
            {title:'Track & reflect',description:'Your local activity and recurring habits',types:['tracker-summary','tracker-history','recent-activity']},
        ];
        openForm('Add a widget', `<div class="ws-widget-library ws-widget-library-groups">${groups.map(group=>`<section class="ws-widget-library-group"><h3>${group.title}</h3><div>${group.types.map(type=>{const spec=specification(type)!;return button('add-type',`${icon(spec.icon)}<div><strong>${spec.title}</strong></div>`,type,'ws-widget-choice');}).join('')}</div></section>`).join('')}</div>`, () => { });
        $('[data-dialog-submit]').hidden = true;
    }
    function createWorkspace(duplicateId = '') {
        const original = state!.workspaces.find(w => w.id === duplicateId);
        if (state!.workspaces.length >= 10) {
            toast('You can save up to 10 workspaces. Rename or remove an unused layout first.');
            return;
        }
        openForm(original ? 'Duplicate workspace' : 'New workspace', field('Name', 'title', original ? original.title + ' copy' : '', 'text', 'required maxlength="80"') + (original ? '' : select('Start from', 'preset', PRESETS.map((p, i) => [String(i), p]), '0')), async (data) => {
            const title = String(data.get('title')).trim();
            if (!title)
                throw new Error('Choose a name.');
            await mutate(s => {
                const workspace = original ? { ...clone(original), id: uid(), title, revision: 0, updatedAt: stamp() } : preset(title, pins(), Number(data.get('preset')));
                if (original)
                    workspace.widgets.forEach(w => w.id = uid());
                s.workspaces.push(workspace);
                s.active = workspace.id;
            }, 'Workspace created');
        });
    }
    function choosePreset() {
        if (editing) {
            toast('Finish or cancel your layout edit before applying a preset.');
            return;
        }
        openForm('Choose a starter layout', select('Layout', 'preset', PRESETS.map((p, i) => [String(i), p]), '0') + select('Apply as', 'mode', [['new', 'Create a new workspace'], ['replace', 'Replace this layout (content stays)']], 'new') + '<p class="ws-muted">Tasks, events, notes and trackers are shared. Changing layout does not reset them.</p>', async (data) => {
            const kind = Number(data.get('preset'));
            await mutate(s => {
                const next = preset(PRESETS[kind]!, pins(), kind);
                if (data.get('mode') === 'new') {
                    if (s.workspaces.length >= 10)
                        throw new Error('The 10-workspace limit has been reached.');
                    s.workspaces.push(next);
                    s.active = next.id;
                }
                else {
                    const index = s.workspaces.findIndex(w => w.id === s.active);
                    next.id = s.active;
                    next.title = s.workspaces[index]!.title;
                    next.revision = s.workspaces[index]!.revision + 1;
                    s.workspaces[index] = next;
                }
            }, 'Layout applied', true, true);
        });
    }
    function confirmRemoval(title: string, detail: string, remove: (s: WorkspaceState) => void) { openForm(title, `<p>${esc(detail)}</p>`, async () => { await mutate(remove, 'Removed', true); }, 'Delete'); }
    function exportWorkspace() {
        if (!state) {
            if (rawRecovery)
                download(rawRecovery, 'thiepn-workspace-recovery.json');
            return;
        }
        const data = clone(state);
        if (editing) {
            const ix = data.workspaces.findIndex(w => w.id === editing!.workspaceId);
            if (ix >= 0)
                data.workspaces[ix] = clone(editing.workspace);
        }
        data.legacyBackup = null;
        download(JSON.stringify(data, null, 2), 'thiepn-workspace-' + today() + '.json');
        toast('Backup exported. Keep it somewhere safe.');
    }
    function importWorkspace() {
        openForm('Import workspace backup', `<label class="ws-field">Backup file<input type="file" name="file" accept="application/json,.json" required/></label>${select('Import mode', 'mode', [['new', 'Add imported workspaces and content'], ['replace', 'Replace local workspace (backup first)']], 'new')}<p class="ws-muted">The backup is imported into the current local identity. No account tokens or cloud data are imported. Existing records stay when adding workspaces.</p>`, async (data) => {
            const file = data.get('file');
            if (!(file instanceof File) || file.size > MAX_EXPORT_BYTES)
                throw new Error('Choose a JSON backup smaller than 5 MB.');
            const importEpoch = epoch;
            const imported = parseState(await file.text());
            if (epoch !== importEpoch) throw new Error('Your identity changed. Import into the intended workspace again.');
            const replace = data.get('mode') === 'replace';
            if (!replace && state!.workspaces.length + imported.workspaces.length > 10)
                throw new Error('This import would exceed 10 workspaces.');
            openImportPreview(imported, replace);
        });
    }
    function openImportPreview(imported: WorkspaceState, replace: boolean) {
        setTimeout(() => openForm('Review import', `<p>${replace ? 'Replace' : 'Add'} ${imported.workspaces.length} workspaces, ${imported.tasks.length} tasks, ${imported.notes.length} notes, ${imported.events.length} events and ${imported.trackers.length} trackers.</p><p class="ws-muted">${replace ? 'A replacement backup will be kept. You can restore it from Settings.' : 'Imported records receive new IDs so existing content is not overwritten.'}</p>`, async () => {
            await mutate(s => {
                if (replace) {
                    const revision = s.revision;
                    Object.assign(s, clone(imported), { revision });
                    return;
                }
                const copy = clone(imported), ids = new Map<string, string>();
            copy.trackers.forEach(t => ids.set(t.id,uid()));
                for (const list of [copy.workspaces, copy.tasks, copy.notes, copy.events, copy.trackers, copy.logs, copy.activity])
                    for (const record of list) {
                        const id = uid();
                        ids.set(record.id, id);
                        record.id = id;
                    }
                for (const w of copy.workspaces) {
                    w.widgets.forEach(widget => {
                        widget.id = uid();
                        if (Array.isArray(widget.config.trackerIds))
                            widget.config.trackerIds = widget.config.trackerIds.map(id => ids.get(String(id)) ?? id);
                if (typeof widget.config.selectedTracker === 'string') widget.config.selectedTracker = ids.get(widget.config.selectedTracker) ?? widget.config.selectedTracker;
                    });
                }
                copy.logs.forEach(l => l.trackerId = ids.get(l.trackerId)!);
                s.workspaces.push(...copy.workspaces);
                s.tasks.push(...copy.tasks);
                s.notes.push(...copy.notes);
                s.events.push(...copy.events);
                s.trackers.push(...copy.trackers);
                s.logs.push(...copy.logs);
                s.activity.push(...copy.activity);
                s.activity = s.activity.slice(0, 500);
            }, 'Backup imported', true, true);
        }, replace ? 'Replace local data' : 'Add imported data'), 0);
    }
    const paletteIcon = (item: PaletteResult) => icon(item.icon === 'action' ? 'arrow-up-right' : item.icon);
    function paletteEntry(item: PaletteResult): string {
        const content = `${paletteIcon(item)}<span class="ws-palette-label"><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span><span class="ws-palette-enter" aria-hidden="true">↵</span>`;
        const main = item.href
            ? `<a href="${esc(item.href)}" class="ws-search-result ws-palette-primary" data-palette-primary>${content}</a>`
            : `<button type="button" class="ws-search-result ws-palette-primary" data-palette-primary data-action="palette-execute" data-command="${esc(item.command ?? '')}" data-id="${esc(item.resourceId ?? '')}">${content}</button>`;
        const extras = item.extra?.length ? `<div class="ws-palette-quick" aria-label="Quick actions for ${esc(item.title)}">${item.extra.map(extra => `<button type="button" class="ws-palette-quick-action" data-action="palette-execute" data-command="${esc(extra.command)}" data-id="${esc(extra.id ?? '')}" aria-label="${esc(extra.label)}: ${esc(item.title)}">${esc(extra.label)}</button>`).join('')}</div>` : '';
        return `<div class="ws-palette-item">${main}${extras}</div>`;
    }
    function renderSearch() {
        const rows = $('[data-search-results]');
        const canRead = !!state && !locked && !privacyHeld && !state.preferences.hidden;
        const ownerScope = hubIdentity.status === 'signed-in' ? 'user:' + hubIdentity.id :
            hubIdentity.status === 'signed-out' ? 'guest' : null;
        const sourceRows = canRead && ownerScope ? approvedSourceRows({
            folio: folioStatus === 'ready' && folioOwner === ownerScope ? folioSnapshot : null,
            notes: notesSourceStatus === 'ready' && notesSourceOwner === ownerScope ? notesSource : null,
            languages: hubIdentity.status === 'signed-in' && languageOwner === hubIdentity.id &&
                languageStatus === 'ready' ? languageCards : [],
            apps,
        }) : [];
        const result = findPalette({apps, state:canRead ? state : null, sources:sourceRows,
            query:searchQuery, scope:searchScope, route:location.pathname,
            today:state ? today() : dayKey(Intl.DateTimeFormat().resolvedOptions().timeZone)});
        const scopes = $('[data-palette-scopes]');
        scopes.innerHTML = PALETTE_SCOPES.map(scope => `<button type="button" data-action="palette-scope" data-id="${scope}" class="ws-palette-chip" aria-pressed="${scope === result.actualScope}">${scope === 'all' ? 'All' : scope === 'actions' ? 'Commands' : scope === 'calendar' ? 'Calendar' : scope[0]!.toUpperCase()+scope.slice(1)}</button>`).join('');
        const summary = $('[data-palette-summary]');
        summary.textContent = result.restricted
            ? (hubIdentity.status==='checking' || !state ? 'Checking your Hub identity and local workspace · reviewed app links remain searchable.'
              : locked ? 'Local workspace storage is unavailable. Only public app links and navigation are searchable.'
              : 'Personal records are hidden. Reviewed app links and public navigation remain searchable.')
            : !navigator.onLine && !sourceRows.length ? 'Offline · Hub local records and reviewed app links only. No external app data was queried.'
            : sourceRows.length ? 'Hub local plus ' + sourceRows.length + ' already approved app snapshot item(s) · temporary metadata, not full owner searches.'
            : 'Hub local + reviewed app catalogue · explicitly share from Folio or Notes to include their temporary titles. No external records were queried.';
        const groupOrder = ['actions','tasks','calendar','notes','sources','apps'] as const;
        rows.innerHTML = groupOrder.map(group => {
            const items = result.results.filter(item=>item.group===group);
            return items.length ? `<section class="ws-palette-group" aria-label="${GROUP_NAMES[group]}"><header><h3>${GROUP_NAMES[group]}</h3><span>${items.length}</span></header><div>${items.map(paletteEntry).join('')}</div></section>` : '';
        }).join('') || `<div class="ws-palette-empty"><strong>No matching ${esc(result.actualScope==='all'?'results':result.actualScope)}.</strong><p>Search Hub apps, tasks, notes, calendar, or explicitly shared owner snapshots. Try <code>&gt;</code> for commands, <code>@</code> for apps, <code>#</code> for tasks, or <code>~</code> for approved source metadata.</p>${result.restricted?'<p>Private results require an available, unmasked local workspace.</p>':''}</div>`;
        if (result.truncated) rows.insertAdjacentHTML('beforeend','<p class="ws-palette-truncated">Showing the most relevant matches. Narrow your search to see more.</p>');
        const count = result.results.length;
        $('#workspace-search').setAttribute('aria-label', `Search Hub · ${count} result${count===1?'':'s'}`);
    }
    function openSearch(trigger?: HTMLElement) {
        if (dialog.open || account.open) return;
        searchReturnFocus = trigger ?? (root.contains(document.activeElement) ? document.activeElement as HTMLElement : $('[data-action=search]'));
        searchQuery = '';
        searchScope = 'all';
        $<HTMLInputElement>('#workspace-search').value = '';
        renderSearch();
        if (!searchDialog.open) searchDialog.showModal();
        $<HTMLInputElement>('#workspace-search').focus();
    }
    function executePalette(command: string, resourceId: string) {
        if (!state || locked || privacyHeld || state.preferences.hidden) {
            toast('Personal records are currently unavailable. Unlock the workspace before using local actions.');
            return;
        }
        if (!['capture','capture-task','new-task','new-event','edit-task','edit-note','edit-event',
            'task-plan-today','task-plan-tomorrow','task-plan-week','task-plan-high'].includes(command)) return;
        if (command.startsWith('edit-')) {
            const exists = command==='edit-task'?state.tasks.some(t=>t.id===resourceId):
                command==='edit-note'?state.notes.some(n=>n.id===resourceId):
                state.events.some(e=>e.id===resourceId);
            if (!exists) { toast('This local record is no longer available.'); renderSearch(); return; }
        }
        if (command.startsWith('task-plan-') && !state.tasks.some(t=>t.id===resourceId&&!t.completedAt)) {
            toast('This task was completed or is no longer available.');
            renderSearch();
            return;
        }
        searchDialog.close();
        if (command==='capture') openCapture();
        else if (command==='capture-task') openCapture('task');
        else if (command==='new-task') editTask();
        else if (command==='new-event') editEvent();
        else if (command==='edit-task') editTask(resourceId);
        else if (command==='edit-note') editNote(resourceId);
        else if (command==='edit-event') editEvent(resourceId);
        else if (command.startsWith('task-plan-')) {
            const plan = command.slice('task-plan-'.length) as TaskPlanAction;
            void mutate(s => {
                const task = s.tasks.find(t=>t.id===resourceId);
                if (!task) return;
                applyTaskPlan(task,plan,dayKey(s.preferences.timezone));
                activity(s,`Planned task via palette: ${task.title}`,'task');
            },'Task plan updated');
        }
    }

    root.addEventListener('click', event => {
        const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action],[data-workspace-id]');
        if (!target)
            return;
        const action = target.dataset.action ?? '', id = target.dataset.id ?? '';
        if (action === 'close-dialog') {
            dialog.close();
            return;
        }
        if (action === 'close-search') {
            $<HTMLDialogElement>('[data-search-dialog]').close();
            return;
        }
        if (action === 'close-account') {
            $<HTMLDialogElement>('[data-account-dialog]').close();
            return;
        }
        if (action === 'account') {
            account.showModal();
            syncReadingPanels();
            return;
        }
        if (action === 'search') {
            openSearch(target);
            return;
        }
        if (action === 'palette-scope') {
            if ((PALETTE_SCOPES as readonly string[]).includes(id)) {
                searchScope = id as PaletteScope;
                renderSearch();
                $<HTMLInputElement>('#workspace-search').focus();
            }
            return;
        }
        if (action === 'palette-execute') {
            executePalette(target.dataset.command ?? '',id);
            return;
        }
        if (action === 'export') {
            exportWorkspace();
            return;
        }
        if (action === 'retry-locked') {
            if (locked && rawRecovery && hubIdentity.status!=='checking' && hubIdentity.status!=='unavailable')
                void loadIdentity(hubIdentity);
            else toast('Reopen a verified Hub identity before retrying the original saved record.');
            return;
        }
        if (action === 'refresh-languages') {
            void refreshLanguages(true);
            return;
        }
        if (action === 'connect-notes-source') {
            openNotesSource();
            return;
        }
        if (action === 'clear-notes-source') {
            clearNotesSource();
            repaintOverview();
            return;
        }
        if (action === 'connect-folio') {
            openFolioBridge();
            return;
        }
        if (action === 'disconnect-folio') {
            resetFolio();
            repaintOverview();

            return;
        }
        if (!state || locked) {
            toast('Your saved workspace is not available. App links remain usable.');
            return;
        }
        if (target.dataset.workspaceId) {
            if (editing) {
                toast('Finish or cancel the layout edit before switching workspaces.');
                return;
            }
            void switchWorkspace(target.dataset.workspaceId!).catch(()=>{});
            return;
        }
        switch (action) {
            case 'unified-mode':
                if(view==='home' && (HOME_JOURNEY_MODES as readonly string[]).includes(id)) {
                    if(editing && id!=='workspace'){toast('Save or cancel the current layout edit before switching views.');break;}
                    if(homeMode==='focus' && id!=='focus')pauseFocusSession();
                    homeMode=id as HomeJourneyMode;
                    render();
                    root.querySelector<HTMLButtonElement>(`[data-action="unified-mode"][data-id="${id}"]`)?.focus();
                }
                break;
            case 'unified-triage':
                reviewUnifiedTask(id);
                break;
            case 'unified-focus-task':
                if(view==='home' && state.tasks.some(t=>t.id===id && !t.completedAt)) {
                    pauseFocusSession();
                    focus.selectedId=id;
                    focus.queue=state.tasks.find(t=>t.id===id)?.due?'due':'inbox';
                    focus.remainingMs=focus.duration*60000;
                    focus.elapsed=false;
                    homeMode='focus';
                    render();
                    root.querySelector<HTMLElement>('#ws-daily-focus')?.scrollIntoView({block:'start'});
                    root.querySelector<HTMLButtonElement>('[data-action=focus-start]')?.focus();
                }
                break;
            case 'focus-queue':
                if (view==='home' && ['due','priority','inbox','all'].includes(id)) {
                    focus.queue=id as FocusQueue;
                    render();
                }
                break;
            case 'focus-select':
                if (view==='home' && state.tasks.some(t=>t.id===id&&!t.completedAt)) {
                    pauseFocusSession();
                    focus.selectedId=id;
                    focus.remainingMs=focus.duration*60000;
                    focus.elapsed=false;
                    render();
                }
                break;
            case 'focus-next': {
                const items=focusTasks(state,today(),focus.queue).slice(0,focus.limit);
                if (!items.length) {resetFocusSelection();render();break;}
                const index=items.findIndex(t=>t.id===focus.selectedId);
                pauseFocusSession();
                focus.selectedId=items[(index+1)%items.length]!.id;
                focus.remainingMs=focus.duration*60000;
                focus.elapsed=false;
                render();
                break;
            }
            case 'focus-start':
                if (view==='home')startFocusSession();
                break;
            case 'focus-pause':
                pauseFocusSession();
                render();
                break;
            case 'focus-reset':
                pauseFocusSession();
                focus.remainingMs=focus.duration*60000;
                focus.elapsed=false;
                render();
                break;
            case 'focus-quiet':
                if(view==='home') {
                    focus.quiet=!focus.quiet;
                    render();
                    root.querySelector<HTMLButtonElement>('[data-action=focus-quiet]')?.focus();
                }
                break;
            case 'rail':
                void mutate(s => s.preferences.rail = !s.preferences.rail, '', false);
                break;
            case 'context-task':
                showTaskContext(id);
                break;
            case 'context-note':
                showNoteContext(id);
                break;
            case 'context-event':
                showEventContext(id);
                break;
            case 'plan-task-event':
                planTaskInCalendar(id);
                break;
            case 'create-note-from-task': {
                if(!startHandoff('task',id))break;
                const task=state.tasks.find(t=>t.id===id);
                if(task)editNote('',taskNoteSeed(task));
                break;
            }
            case 'create-task-from-note': {
                if(!startHandoff('note',id))break;
                const note=state.notes.find(n=>n.id===id);
                if(note)editTask('',noteTaskSeed(note));
                break;
            }
            case 'create-task-from-event': {
                if(!startHandoff('event',id))break;
                const event=state.events.find(e=>e.id===id);
                if(event)editTask('',{title:event.title,notes:'From reviewed Hub calendar event. Confirm details before saving.'});
                break;
            }
            case 'handoff-return': {
                const origin=handoffOrigin;
                if(!origin || !originalHandoffRecord()){toast('Original record is no longer available.');handoffOrigin=null;renderHandoffBar();break;}
                if(origin.kind==='task')editTask(origin.id);
                else if(origin.kind==='note')editNote(origin.id);
                else editEvent(origin.id);
                break;
            }
            case 'handoff-dismiss':
                handoffOrigin=null;
                renderHandoffBar();
                break;
            case 'new-task':
            case 'brief-new-task':
                editTask();
                break;
            case 'task-date-today':
            case 'task-date-tomorrow':
            case 'task-date-week':
            case 'task-date-inbox': {
                const due = dialog.querySelector<HTMLInputElement>('input[name=due]');
                const time = dialog.querySelector<HTMLInputElement>('input[name=time]');
                if (due) due.value = action === 'task-date-inbox' ? '' : action === 'task-date-today' ? today() : addDays(today(), action === 'task-date-tomorrow' ? 1 : 7);
                if (time && action === 'task-date-inbox') time.value = '';
                break;
            }
            case 'task-show-inbox':
                taskFilter = 'inbox';
                render();
                break;
            case 'task-filter-set':
                if ((TASK_FILTERS as readonly string[]).includes(id)) { taskFilter = id as TaskFilter; render(); }
                break;
            case 'task-plan-today':
            case 'task-plan-tomorrow':
            case 'task-plan-week':
            case 'task-plan-inbox':
            case 'task-plan-high':
            case 'task-plan-normal': {
                if (!state.tasks.some(t => t.id === id && !t.completedAt)) break;
                const plan = action.slice('task-plan-'.length) as TaskPlanAction;
                void mutate(s => {
                    const task = s.tasks.find(t => t.id === id);
                    if (!task) return;
                    applyTaskPlan(task, plan, dayKey(s.preferences.timezone));
                    activity(s, `Planned task: ${task.title}`, 'task');
                }, 'Task plan updated');
                break;
            }
            case 'edit-task':
                editTask(id);
                break;
            case 'brief-complete-task':
                void mutate(s => {
                    const task = s.tasks.find(t => t.id === id);
                    if (task && !task.completedAt) {
                        task.completedAt = stamp();
                        activity(s, 'Completed task: ' + task.title, 'task');
                    }
                }, 'Task completed');
                break;
            case 'delete-task': {
                const t = state.tasks.find(t => t.id === id);
                if (t)
                    confirmRemoval('Delete task?', t.title, s => { s.tasks = s.tasks.filter(t => t.id !== id); });
                break;
            }
            case 'new-event':
            case 'brief-new-event':
                editEvent();
                break;
            case 'edit-event':
                editEvent(id);
                break;
            case 'delete-event': {
                const e = state.events.find(e => e.id === id);
                if (e)
                    confirmRemoval('Delete event?', e.title, s => { s.events = s.events.filter(e => e.id !== id); });
                break;
            }
            case 'capture':
                openCapture();
                break;
            case 'brief-capture':
                editNote();

                break;
            case 'capture-task':
                openCapture('task');
                break;
            case 'save-capture-draft':
                void flushCaptureDraft().then(() => toast(dirty ? 'Draft is still unsaved. Export a backup or retry.' : 'Draft saved.'));
                break;
            case 'copy-capture': {
                const draft = target.closest('form')?.querySelector<HTMLTextAreaElement>('[data-capture-draft]')?.value ?? state.captureDraft;
                if (!draft) { toast('Enter a draft before copying.'); break; }
                if (!navigator.clipboard?.writeText) { toast('Clipboard unavailable. Select and copy your draft manually.'); break; }
                void navigator.clipboard.writeText(draft).then(() => toast('Draft copied. Paste it in the owner app to save there.'))
                  .catch(() => toast('Clipboard unavailable. Select and copy your draft manually.'));
                break;
            }
            case 'edit-note':
                editNote(id);
                break;
            case 'delete-note': {
                const n = state.notes.find(n => n.id === id);
                if (n)
                    confirmRemoval('Delete note?', n.title, s => { s.notes = s.notes.filter(n => n.id !== id); });
                break;
            }
            case 'new-tracker':
                editTracker();
                break;
            case 'edit-tracker':
                editTracker(id);
                break;
            case 'delete-tracker': {
                const t = state.trackers.find(t => t.id === id);
                if (t)
                    confirmRemoval('Delete tracker and logs?', `${t.title} and its recorded history will be removed.`, s => removeTracker(s,id));
                break;
            }
            case 'log-tracker':
            case 'brief-log-tracker':
                logTracker(id);
                break;
            case 'edit-log': {
                const l = state.logs.find(l => l.id === id);
                if (l)
                    logTracker(l.trackerId, id);
                break;
            }
            case 'delete-log':
                void mutate(s => s.logs = s.logs.filter(l => l.id !== id), 'Log removed');
                break;
            case 'week-filter':
                if(view==='calendar' && (WEEK_FILTERS as readonly string[]).includes(id)){
                    weekFilter=id as WeekTaskFilter;
                    agendaMode='week';
                    render();
                }
                break;
            case 'week-select-visible': {
                if(view!=='calendar'||privacyHeld||state.preferences.hidden)break;
                const visible=eligibleWeekTasks(state,selected,weekFilter).slice(0,MAX_WEEK_ROWS);
                let added=0;
                for(const task of visible) {
                    if(weekSelection.size>=MAX_WEEK_BATCH)break;
                    if(!weekSelection.has(task.id)){weekSelection.add(task.id);added++;}
                }
                render();
                toast(added
                    ? `Selected ${weekSelection.size} unfinished Hub tasks for review. No due dates have changed.`
                    : `Selection unchanged. You can review at most ${MAX_WEEK_BATCH} tasks at once.`);
                break;
            }
            case 'week-clear':
                weekSelection.clear();
                render();
                break;
            case 'week-preview':
                reviewWeeklyCarryover();
                break;
            case 'week-scroll-review':
                if(view==='calendar' && agendaMode==='week') {
                    root.querySelector<HTMLElement>('[data-week-followthrough]')?.scrollIntoView({block:'start'});
                    root.querySelector<HTMLButtonElement>('[data-action=week-preview]')?.focus();
                }
                break;
            case 'week-return':
                if(weekReturnDate && safeNavigationDay(weekReturnDate)) {
                    selected=weekReturnDate;
                    weekReturnDate=null;
                    month=selected.slice(0,7)+'-01';
                    agendaMode='week';
                    render();
                    root.querySelector<HTMLElement>('[data-week-followthrough]')?.scrollIntoView({block:'start'});
                }
                break;
            case 'planning-day':
                if(agendaMode==='week' && !weekReturnDate)weekReturnDate=weekDays(selected)[0]!;
                agendaMode='day';
                render();
                break;
            case 'planning-week':
                agendaMode='week';
                render();
                break;
            case 'planning-prev':
            case 'planning-next':
            case 'planning-prev-day':
            case 'planning-next-day': {
                const magnitude=(view==='calendar' && agendaMode==='week' &&
                    (action==='planning-prev'||action==='planning-next'))?7:1;
                selected=addDays(selected,
                    (action==='planning-prev'||action==='planning-prev-day'?-1:1)*magnitude);
                month=selected.slice(0,7)+'-01';
                render();
                break;
            }
            case 'planning-today':
            case 'planning-tomorrow':
                selected=addDays(today(),action==='planning-tomorrow'?1:0);
                month=selected.slice(0,7)+'-01';
                if (view==='calendar') agendaMode='day';
                render();
                break;
            case 'planning-jump-day':
                if (validDate(id)) {
                    if (agendaMode==='week' && !weekReturnDate)weekReturnDate=weekDays(selected)[0]!;
                    selected=id;
                    month=selected.slice(0,7)+'-01';
                    agendaMode='day';
                    render();
                }
                break;
            case 'planning-task-selected': {
                if(!state.tasks.some(t=>t.id===id&&!t.completedAt)) {
                    toast('This task was completed or no longer exists.');
                    break;
                }
                if(conflict||dirty||!storageReady) {
                    toast('Resolve unsaved storage changes before moving a due date. You can export a backup.');
                    break;
                }
                const date=selected;
                void mutate(s=>{
                    const task=s.tasks.find(t=>t.id===id);
                    if(!task || task.completedAt) throw new Error('The task is no longer open.');
                    applyTaskPlan(task,'today',date);
                    activity(s,`Moved task due date by explicit planning action: ${task.title} → ${date}`,'task');
                },'Due date changed');
                break;
            }
            case 'review-event-time':
                reviewEventTime(id);
                break;
            case 'select-date':
                selected = id;
                month = id.slice(0, 7) + '-01';
                render();
                break;
            case 'today':
                selected = today();
                month = selected.slice(0, 7) + '-01';
                render();
                break;
            case 'month-next':
            case 'month-prev': {
                const d = new Date(month + 'T12:00:00Z');
                d.setUTCMonth(d.getUTCMonth() + (action === 'month-next' ? 1 : -1));
                month = d.toISOString().slice(0, 10);
                render();
                break;
            }
            case 'customize':
                beginEdit();
                break;
            case 'done-layout':
                void finishEdit().catch(()=>{});
                break;
            case 'cancel-layout':
                editing = null;
                layoutUndo = [];
                layoutRedo = [];
                recoveryDraft = null;
                void store?.draft(null);
                notice('');
                render();
                break;
            case 'undo-layout':
                if (editing && layoutUndo.length) {
                    layoutRedo.push(clone(editing.workspace));
                    editing.workspace = layoutUndo.pop()!;
                    render();
                    void saveDraft();
                }
                break;
            case 'redo-layout':
                if (editing && layoutRedo.length) {
                    layoutUndo.push(clone(editing.workspace));
                    editing.workspace = layoutRedo.pop()!;
                    render();
                    void saveDraft();
                }
                break;
            case 'add-widget':
                widgetPicker();
                break;
            case 'add-type': {
                const spec = specification(id);
                if (!spec)
                    return;
                if (editing!.workspace.widgets.length >= 32) {
                    toast('This workspace already has 32 widgets.');
                    return;
                }
                changeLayout(w => { w.widgets.push({ id: uid(), type: id, typeVersion: 1, view: spec.views[0], config: id === 'app-shortcuts' ? { appIds: pins() } : {}, desktop: { x: 0, y: Math.max(0, ...w.widgets.map(x => x.desktop.y + x.desktop.h)), w: spec.width, h: spec.height }, order: w.widgets.length }); });
                dialog.close();
                break;
            }
            case 'toggle-recents':
                void mutate(s=>{s.preferences.recordRecentLaunches=s.preferences.recordRecentLaunches===false;},'Recent apps preference saved');break;
            case 'clear-recents':
                void mutate(s=>{s.activity=s.activity.filter(a=>!a.kind.startsWith('launch:'));},'Recent app history cleared');break;
            case 'refresh-connections':
                void refreshInsights();
                break;
            case 'pin-app':
                if(editing){toast('Finish or cancel layout editing first.');break;}
                void mutate(s=>{const ws=s.workspaces.find(w=>w.id===s.active)!;toggleShortcut(ws,id);ws.revision++;ws.updatedAt=stamp();},'Shortcuts updated').catch(error=>toast(error.message));
                break;
            case 'configure-widget':
                configureWidget(id);
                break;
            case 'remove-widget':
                changeLayout(w => w.widgets = w.widgets.filter(x => x.id !== id));
                dialog.close();
                toast('Widget removed; its content is kept.');
                break;
            case 'move-widget-up':
            case 'move-widget-down':
                changeLayout(w => {
                    const list = ordered(w.widgets);
                    const i = list.findIndex(x => x.id === id), j = i + (action === 'move-widget-up' ? -1 : 1);
                    if (j < 0 || j >= list.length)
                        return;
                    [list[i]!.order, list[j]!.order] = [list[j]!.order, list[i]!.order];
                    const a = clone(list[i]!.desktop), b = clone(list[j]!.desktop);
                    list[i]!.desktop.x = b.x;
                    list[i]!.desktop.y = b.y;
                    list[j]!.desktop.x = a.x;
                    list[j]!.desktop.y = a.y;
                    w.widgets = place(w.widgets, id, list[i]!.desktop);
                });
                dialog.close();
                break;
            case 'switch-workspace':
                if (editing) { toast('Finish or cancel editing before switching workspaces.'); break; }
                openForm('Choose workspace', select('Workspace','workspace',state.workspaces.map(w=>[w.id,w.title]),state.active) + button('new-workspace','New workspace'), async data => { await switchWorkspace(String(data.get('workspace'))); });
                break;
            case 'presets':
                choosePreset();
                break;
            case 'new-workspace':
                createWorkspace();
                break;
            case 'duplicate-workspace':
                createWorkspace(id);
                break;
            case 'rename-workspace': {
                const w = state.workspaces.find(w => w.id === id);
                if (w)
                    openForm('Rename workspace', field('Name', 'title', w.title, 'text', 'required maxlength="80"'), async (data) => {
                        const title = String(data.get('title')).trim();
                        if (!title)
                            throw new Error('Choose a name.');
                        await mutate(s => { s.workspaces.find(w => w.id === id)!.title = title; }, 'Workspace renamed');
                    });
                break;
            }
            case 'delete-workspace':
                if (state.workspaces.length === 1) {
                    toast('Keep at least one workspace. You can apply the blank layout instead.');
                    break;
                }
                confirmRemoval('Delete this workspace?', 'Only its layout will be removed. Tasks, notes, events and trackers stay.', s => {
                    s.workspaces = s.workspaces.filter(w => w.id !== id);
                    if (s.active === id)
                        s.active = s.workspaces[0]!.id;
                });
                break;
            case 'undo-content':
                if (contentUndo) {
                    const entry = contentUndo;
                    clearContentUndo();
                    void mutate(s => {
                        if (JSON.stringify(s) !== JSON.stringify(entry.after))
                            throw new Error('This workspace changed. That change can no longer be undone.');
                        const revision = s.revision;
                        Object.assign(s, entry.before, { revision });
                    }, 'Change undone', false, false, true);
                }
                break;
            case 'privacy': {
                insightController?.abort(); insights=[];clearSourceStates();
                const hiding = !(privacyHeld || state.preferences.hidden);
                if (hiding) { resetLanguages(); resetFolio(); clearNotesSource(); }
                void mutate(s => {
                    s.preferences.hidden = hiding;
                    privacyHeld = hiding;
                }, '', false).then(() => {
                    if (!hiding && hubIdentity.status === 'signed-in') {
                        languageOwner = hubIdentity.id;
                        void refreshLanguages(true);
                        void refreshInsights();
                    }
                }).catch(()=>{});

                break;
            }
            case 'timezone':
                openForm('Planner timezone', field('IANA timezone', 'zone', state.preferences.timezone, 'text', 'required') + '<p class="ws-muted">For example Europe/Berlin, America/New_York or Asia/Seoul.</p>', async (data) => {
                    const zone = String(data.get('zone'));
                    try {
                        new Intl.DateTimeFormat('en', { timeZone: zone });
                    }
                    catch {
                        throw new Error('Enter a valid IANA timezone.');
                    }
                    await mutate(s => s.preferences.timezone = zone, 'Timezone updated');
                    selected = today();
                    month = selected.slice(0, 7) + '-01';
                    render();
                });
                break;
            case 'import':
                importWorkspace();
                break;
            case 'restore':
                void store?.backup().then(backup => {
                    if (!backup) {
                        toast('No replacement backup is available.');
                        return;
                    }
                    confirmRemoval('Restore replacement backup?', 'The current local data will be replaced by your last saved replacement backup.', s => { const revision = s.revision; Object.assign(s, backup, { revision }); });
                }).catch(() => toast('Backup storage is unavailable.'));
                break;
            case 'retry':
                queue = queue.then(async () => {
                    if (!store)
                        return;
                    if (!storageReady) {
                        await store.open();
                        storageReady = true;
                        const existing = await store.load();
                        if (existing && existing.revision !== state!.revision) {
                            conflict = true;
                            throw new RevisionConflict();
                        }
                    }
                    await persist();
                    if (!dirty) {
                        notice('');
                        render();
                    }
                }).catch(e => notice(e instanceof Error ? e.message : 'Could not reopen storage.', button('export', 'Export')));
                break;
            case 'reload':
                if (dirty || editing) {
                    openForm('Reload saved data?', '<p>Unsaved content in this tab will be replaced. Export it first. Layout edit drafts remain available.</p>' + button('export', 'Export current changes'), () => reloadSaved(), 'Reload saved data');
                }
                else
                    void reloadSaved();
                break;
            case 'return-focus':
                if (view==='home' && !privacyHeld && !state.preferences.hidden) {
                    root.querySelector<HTMLElement>('#ws-daily-focus')?.scrollIntoView({block:'start'});
                    root.querySelector<HTMLButtonElement>('[data-action=focus-quiet]')?.focus();
                } else location.assign('/');
                break;
            case 'review-return': {
                if (!store || !storageReady || locked || privacyHeld || state.preferences.hidden) {
                    toast('Show personal content and reconnect local storage before comparing saved records.');
                    break;
                }
                const own=epoch, source=store;
                void source.load().then(savedState=>{
                    if(own!==epoch || store!==source || !state || privacyHeld || state.preferences.hidden) return;
                    const detail=renderSavedComparison(state,savedState);
                    const draft=recoveryDraft;
                    const caution=draft?'<p class="ws-muted">An original layout draft exists. It has not been merged with the saved workspace.</p>':'';
                    openForm('Compare this tab with saved Hub',detail+caution+
                      '<p class="ws-muted">To preserve changes, export the current tab first. Reload is a separate, deliberate action.</p>'+
                      button('export','Export this tab'),()=>{});
                    $('[data-dialog-submit]').hidden=true;
                }).catch(e=>toast(e instanceof Error?e.message:'Could not read saved records.'));
                break;
            }
            case 'recover-draft-as-new': {
                if (!recoveryDraft || !storageReady || !store || locked || conflict || dirty ||
                    state.workspaces.length>=10) {
                    toast('Preserve your current workspace first. Save a backup or resolve storage before recovering the layout.');
                    break;
                }
                const draft=clone(recoveryDraft);
                const original=state.workspaces.find(w=>w.id===draft.workspaceId);
                if(!original) {toast('Original layout is unavailable. Export and review the saved draft.');break;}
                const source=store, own=epoch, copy=clone(draft.workspace);
                copy.id=uid();
                copy.title=(original.title.slice(0,68)+' recovered').slice(0,80);
                copy.revision=0;
                copy.updatedAt=stamp();
                copy.widgets.forEach(w=>{w.id=uid();});
                void mutate(s=>{
                    if(s.workspaces.length>=10) throw new Error('At most 10 workspaces are supported.');
                    s.workspaces.push(copy);
                    s.active=copy.id;
                },'Recovered layout saved as separate workspace').then(async()=>{
                    if(own!==epoch || source!==store || dirty || state?.active!==copy.id) return;
                    try {
                        await source.draft(null);
                        if(own===epoch) {recoveryDraft=null;notice('');render();}
                    } catch {
                        notice('The recovered layout is saved. Its original draft could not be cleared.',button('export','Export'));
                    }
                }).catch(()=>{});
                break;
            }
            case 'resume-draft':
                if (recoveryDraft) {
                    const draft = clone(recoveryDraft);
                    const draftEpoch=epoch;
                    const savedLayout=state.workspaces.find(w=>w.id===draft.workspaceId);
                    if (!savedLayout || savedLayout.revision!==draft.baseRevision || conflict || dirty) {
                        toast('The saved layout changed. Review recovery or preserve this draft as a separate layout.');
                        break;
                    }
                    void mutate(s => s.active = draft.workspaceId, '', false).then(() => {
                        if(dirty || !state || epoch!==draftEpoch) return;
                        editing=draft;
                        recoveryDraft=null;
                        notice('');
                        render();
                    }).catch(()=>{});
                }
                break;
            case 'discard-draft':
                recoveryDraft = null;
                void store?.draft(null);
                notice('');
                break;
            case 'save-draft-as':
                if (editing && state.workspaces.length < 10) {
                    const w = clone(editing.workspace);
                    w.id = uid();
                    w.title += ' recovered';
                    w.revision = 0;
                    w.widgets.forEach(x => x.id = uid());
                    editing = null;
                    conflict = false;
                    void reloadSaved().then(() => mutate(s => { s.workspaces.push(w); s.active = w.id; }, 'Recovered edit saved as another workspace')).then(() => store?.draft(null)).catch(e=>toast(e instanceof Error ? e.message : 'Could not recover this layout.'));
                }
                break;
            case 'search-task':
                $<HTMLDialogElement>('[data-search-dialog]').close();
                editTask(id);
                break;
            case 'search-note':
                $<HTMLDialogElement>('[data-search-dialog]').close();
                editNote(id);
                break;
        }
    });
    root.addEventListener('change', event => {
        const el = event.target as HTMLInputElement;
        if (!state || locked)
            return;
        if (el.closest('[data-task-calendar-review]')) {
            const source=handoffOrigin?.kind==='task'&&handoffOrigin.epoch===epoch
                ? state.tasks.find(t=>t.id===handoffOrigin!.id):undefined;
            if(source)paintTaskCalendarPreview(source,state.preferences.timezone);
            return;
        }
        if (el.closest('[data-review-event-move]')) {
            const original=handoffOrigin?.kind==='event' && handoffOrigin.epoch===epoch
                ? state.events.find(e=>e.id===handoffOrigin!.id) : undefined;
            if(original)paintEventMovePreview(original,state.preferences.timezone);
            return;
        }
        if (el.closest('[data-unified-review]')) {
            const original=activeUnifiedReview;
            if(original && original.epoch===epoch)paintUnifiedTaskPreview(original.task);
            return;
        }
        if (el.hasAttribute('data-week-task-id')) {
            if(view!=='calendar'||privacyHeld||state.preferences.hidden)return;
            const id=el.dataset.weekTaskId!;
            if(!state.tasks.some(t=>t.id===id&&!t.completedAt)) {
                el.checked=false;
                toast('That task is no longer unfinished. Reopen the weekly review.');
                return;
            }
            if(el.checked) {
                if(weekSelection.size>=MAX_WEEK_BATCH&&!weekSelection.has(id)){
                    el.checked=false;
                    toast(`Select no more than ${MAX_WEEK_BATCH} tasks per reviewed batch.`);
                    return;
                }
                weekSelection.add(id);
            } else weekSelection.delete(id);
            render();
            root.querySelector<HTMLInputElement>(`[data-week-task-id="${CSS.escape(id)}"]`)?.focus();
            return;
        }
        if (el.closest('[data-week-review-form]')) {
            const review=activeWeekReview;
            if(review && review.epoch===epoch)paintWeekChangePreview(review.snapshots,review.epoch);
            return;
        }
        if (el.hasAttribute('data-focus-duration')) {
            const duration=Number(el.value);
            if ([15,25,45].includes(duration)) {
                pauseFocusSession();
                focus.duration=duration as FocusDuration;
                focus.remainingMs=duration*60000;
                focus.elapsed=false;
                render();
            }
            return;
        }
        if (el.hasAttribute('data-focus-limit')) {
            const limit=Number(el.value);
            if ([3,5,8].includes(limit)) {focus.limit=limit as FocusLimit;render();}
            return;
        }
        if (el.dataset.taskToggle) {
            const id = el.dataset.taskToggle;
            void mutate(s => {
                const t = s.tasks.find(t => t.id === id);
                if (t) {
                    t.completedAt = el.checked ? stamp() : null;
                    activity(s, `${t.completedAt ? 'Completed' : 'Reopened'} task: ${t.title}`, 'task');
                }
            }, el.checked ? 'Task completed' : 'Task reopened');
        }
        if (el.dataset.taskFilter !== undefined) {
            if ((TASK_FILTERS as readonly string[]).includes(el.value)) { taskFilter = el.value as TaskFilter; render(); }
        }
        if (el.dataset.preference === 'density')
            void mutate(s => s.preferences.density = el.value as 'compact' | 'comfortable', '', false);
        if (el.dataset.preference === 'theme') {
            const theme = el.value;
            void mutate(s => s.preferences.theme = theme as 'system' | 'light' | 'dark', '', false);
            document.documentElement.dataset.themePreference = theme;
            document.documentElement.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : theme;
            document.documentElement.style.colorScheme = document.documentElement.dataset.theme!;
            try {
                localStorage.setItem('thiepn:index-theme', theme);
            }
            catch {
                toast('Theme changed for this session; browser preference storage is unavailable.');
            }
        }
        if (el.matches('[data-capture-kind],[data-capture-due]')) syncCaptureControls(el);
        if (el.dataset.historySelect) {
            const id = el.dataset.historySelect, value = el.value;
            if (editing)
                changeLayout(w => w.widgets.find(x => x.id === id)!.config.selectedTracker = value);
            else
                void mutate(s => { s.workspaces.find(w => w.id === s.active)!.widgets.find(w => w.id === id)!.config.selectedTracker = value; }, '', false);
        }
    });
    root.addEventListener('input', event => {
        const el = event.target as HTMLInputElement;
        if (el.hasAttribute('data-pin-search')) { const query = el.value.toLocaleLowerCase(); root.querySelectorAll<HTMLElement>('[data-app-choice]').forEach(row => row.hidden = !row.dataset.appChoice!.includes(query)); }
        if (el.id === 'workspace-search') {
            searchQuery = el.value.slice(0,100);
            renderSearch();
        }
        if (el.hasAttribute('data-capture-draft') && state) {
            state.captureDraft = el.value;
            changeVersion++;
            clearContentUndo();
            dirty = true;
            saved('Draft not saved yet…');
            updateReturnPanel();
            // Failed saves publish recovery; routine autosave must not move controls.
            clearTimeout(captureTimer);
            const own = epoch;
            captureTimer = setTimeout(() => {
                if (own === epoch)
                    queue = queue.then(async () => { await persist(); });
            }, 500);
        }
    });
    root.addEventListener('submit', event => {
        const capture = (event.target as HTMLElement).closest<HTMLFormElement>('[data-capture-form]');
        if (!capture || !state)
            return;
        event.preventDefault();
        const submit = capture.querySelector<HTMLButtonElement>('[type=submit]');
        if (submit) submit.disabled = true;
        void saveCaptureData(new FormData(capture)).catch(e => toast(e instanceof Error ? e.message : 'Unable to capture.'))
            .finally(() => { if (submit && submit.isConnected) submit.disabled = false; });
    });
    root.addEventListener('keydown', event => {
        const target = event.target as HTMLElement;
        if (target.matches('[data-capture-draft]') && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            target.closest<HTMLFormElement>('form')?.requestSubmit();
            return;
        }
        if (target.matches('[data-drag],[data-resize]') && editing && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            const id = target.dataset.drag ?? target.dataset.resize!;
            const item = editing.workspace.widgets.find(w => w.id === id)!;
            const r = clone(item.desktop);
            if (target.dataset.resize) {
                if (event.key === 'ArrowLeft')
                    r.w--;
                if (event.key === 'ArrowRight')
                    r.w++;
                if (event.key === 'ArrowUp')
                    r.h -= 4;
                if (event.key === 'ArrowDown')
                    r.h += 4;
            }
            else {
                if (event.key === 'ArrowLeft')
                    r.x--;
                if (event.key === 'ArrowRight')
                    r.x++;
                if (event.key === 'ArrowUp')
                    r.y -= 4;
                if (event.key === 'ArrowDown')
                    r.y += 4;
            }
            changeLayout(w => w.widgets = place(w.widgets, id, r));
            root.querySelector<HTMLElement>(`[${target.dataset.drag ? 'data-drag' : 'data-resize'}="${CSS.escape(id)}"]`)?.focus();
            toast('Widget position updated. Choose Done to save.');
        }

    });
    window.addEventListener('keydown', event => {
        if (event.altKey && event.shiftKey && !event.repeat &&
            !dialog.open && !searchDialog.open && !account.open && view==='calendar' &&
            state && !locked && !privacyHeld && !state.preferences.hidden &&
            !(event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) {
            const key=event.key.toLowerCase();
            if(key==='p') {
                event.preventDefault();
                agendaMode='week';
                render();
                root.querySelector<HTMLElement>('[data-week-followthrough]')?.scrollIntoView({block:'start'});
                root.querySelector<HTMLButtonElement>('[data-action=week-preview]')?.focus();
                return;
            }
            if(['j','k','d','w'].includes(key)) {
                event.preventDefault();
                if(key==='d'||key==='w')agendaMode=key==='d'?'day':'week';
                else selected=addDays(selected,(key==='j'?-1:1)*(agendaMode==='week'?7:1));
                month=selected.slice(0,7)+'-01';
                render();
                root.querySelector<HTMLElement>('[data-planning-review]')?.scrollIntoView({block:'start'});
                return;
            }
        }
        if (event.altKey && event.shiftKey && event.key.toLowerCase()==='r' && !event.repeat &&
            !dialog.open && !searchDialog.open && !account.open && view==='home' &&
            state && !locked && !privacyHeld && !state.preferences.hidden) {
            event.preventDefault();
            root.querySelector<HTMLElement>('[data-return-panel]')?.scrollIntoView({behavior:'auto',block:'start'});
            root.querySelector<HTMLButtonElement>('[data-return-panel] button')?.focus();
            return;
        }
        if (event.altKey && event.shiftKey && event.key.toLowerCase()==='f' &&
            !event.repeat && !dialog.open && !searchDialog.open && !account.open && view==='home' &&
            state && !locked && !privacyHeld && !state.preferences.hidden) {
            event.preventDefault();
            root.querySelector<HTMLElement>('[data-focus-panel]')?.scrollIntoView({behavior:'auto',block:'start'});
            root.querySelector<HTMLButtonElement>('[data-action=focus-quiet]')?.focus();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'Space' && !event.repeat && !dialog.open && !searchDialog.open && !account.open && state && !locked && !privacyHeld && !state.preferences.hidden) {
            event.preventDefault();
            openCapture();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !(event.target as HTMLElement).matches('textarea,[contenteditable=true]')) {
            event.preventDefault();
            if (searchDialog.open) $<HTMLInputElement>('#workspace-search').focus();
            else openSearch();
        }
    });
    root.addEventListener('pointerdown', event => {
        const handle = (event.target as HTMLElement).closest<HTMLElement>('[data-drag],[data-resize]');
        if (!handle || !editing || event.button !== 0)
            return;
        event.preventDefault();
        const id = handle.dataset.drag ?? handle.dataset.resize!;
        const item = editing.workspace.widgets.find(w => w.id === id)!;
        const initial = clone(item.desktop);
        const grid = $('[data-grid]'), cell = handle.closest<HTMLElement>('[data-widget-id]')!;
        const column = (grid.clientWidth + 16) / 12, startX = event.clientX, startY = event.clientY;
        let rect = clone(initial), moved = false;
        cell.classList.add('ws-dragging');
        function move(e: PointerEvent) {
            moved ||= Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 5;
            const dx = Math.round((e.clientX - startX) / column), dy = Math.round((e.clientY - startY) / 8);
            rect = handle!.dataset.resize ? { ...initial, w: Math.max(specification(item.type)?.minWidth ?? 4, Math.min(12 - initial.x, initial.w + dx)), h: Math.max(specification(item.type)?.minHeight ?? 16, Math.min(120, initial.h + dy)) } : { ...initial, x: Math.max(0, Math.min(12 - initial.w, initial.x + dx)), y: Math.max(0, initial.y + dy) };
            if (root.dataset.gridCompact !== 'true') {
                cell.style.setProperty('--col', String(rect.x + 1));
                cell.style.setProperty('--span', String(rect.w));
                cell.style.setProperty('--row', String(rect.y + 1));
                cell.style.setProperty('--height', String(rect.h));
            }
        }
        function end(e: PointerEvent) {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', end);
            document.removeEventListener('pointercancel', cancel);
            if (moved) {
                if (root.dataset.gridCompact === 'true' && !handle!.dataset.resize) {
                    changeLayout(w => { const list = ordered(w.widgets); const from = list.findIndex(x => x.id === id), to = Math.max(0, Math.min(list.length - 1, from + Math.round((e.clientY - startY) / 180))); const movedItem = list.splice(from, 1)[0]!; list.splice(to, 0, movedItem); list.forEach((x, i) => x.order = i); });
                }
                else
                    changeLayout(w => w.widgets = place(w.widgets, id, rect));
            }
            else
                render();
        }
        function cancel() { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', cancel); render(); }
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', end);
        document.addEventListener('pointercancel', cancel);
    });
    async function readDraft(source: WorkspaceStore): Promise<EditDraft|null> {
        const value = await source.draft();
        if (!value || !state) return null;
        try {
            if (!Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0 || !value.workspace || value.workspace.id !== value.workspaceId) return null;
            const candidate=clone(state), index=candidate.workspaces.findIndex(w=>w.id===value.workspaceId);
            if(index<0)return null;
            candidate.workspaces[index]=value.workspace;
            parseState(JSON.stringify(candidate));
            return value;
        } catch { return null; } // Preserve the original draft; committed records are still usable.
    }
    async function reloadSaved() {
        const own = epoch, source = store;
        await queue;
        if (own !== epoch || !source || source !== store) return;
        const latest = await source.load();
        if (own !== epoch || source !== store) return;
        if (latest) {
            clearContentUndo();
            privacyHeld ||= latest.preferences.hidden;
            state = latest;
            dirty = false;
            conflict = false;
            editing = null;
            recoveryDraft = await readDraft(store!);
            notice('');
            render();
        }
    }
    async function loadIdentity(identity: HubIdentity) {
        clearFocusIdentity();
        if(homeModeRestorePending) {
            homeMode=homeModeFromUrl==='focus'||homeModeFromUrl==='today'?homeModeFromUrl:'workspace';
            homeModeRestorePending=false;
        } else homeMode='workspace';
        activeUnifiedReview=null;
        handoffOrigin=null;
        weekSelection.clear();
        activeWeekReview=null;
        weekFilter='carry';
        const own = ++epoch;
        cloud?.stop(); cloud = null; cloudConflict=false; pendingCloudRender=false; insightController?.abort(); insights=[];clearSourceStates();
        root.querySelectorAll<HTMLElement>('[data-cloud-status]').forEach(el=>el.hidden=true);
        root.querySelectorAll<HTMLElement>('[data-action=cloud-retry]').forEach(el=>el.hidden=true);
        root.querySelectorAll<HTMLElement>('[data-action=cloud-review]').forEach(el=>el.hidden=true);
        root.querySelectorAll<HTMLElement>('[data-action=guest-import]').forEach(el=>el.hidden=!managedAccountEnabled || identity.status!=='signed-in');
        $('[data-storage-label]').textContent = identity.status === 'signed-in' ? 'THIEPN Account' : 'This device';
        root.dataset.calendarPrivate = 'pending';
        resetLanguages();
        const verifyingScope = identity.status === 'signed-in' ? 'user:' + identity.id :
            identity.status === 'signed-out' ? 'guest' : null;
        // Checking temporarily hides Hub content; preserve only the same owner
        // handoff in RAM until verification returns. A different/invalid owner
        // must never see the previous snapshot or pending consent reply.
        if (identity.status === 'unavailable' ||
            (verifyingScope !== null && folioOwner !== null && verifyingScope !== folioOwner))
            resetFolio();
        if (identity.status === 'unavailable' ||
            (verifyingScope !== null && notesSourceOwner !== null && verifyingScope !== notesSourceOwner))
            clearNotesSource();

        clearTimeout(captureTimer);
        editing = null;
        recoveryDraft = null;
        clearContentUndo();
        store?.close();
        channel?.close();
        store = null;
        channel = null;
        state = null;
        dirty = false;
        locked = false;
        conflict = false;
        storageReady = false;
        rawRecovery = '';
        dialog.close();
        $<HTMLDialogElement>('[data-search-dialog]').close();
        $<HTMLDialogElement>('[data-account-dialog]').close();
        $('[data-workspace-list]').innerHTML = '';
        $('[data-workspace-recovery]').hidden = true;
        $('[data-workspace-recovery]').replaceChildren();
        if (!staticView()) $('[data-workspace-content]').innerHTML = empty('Your workspace', 'Checking local identity…');
        $('[data-planner]').innerHTML = '';
        $('[data-workspace-today]').innerHTML = '';
        $('[data-workspace-today]').hidden = true;
        $('[data-toolbar]').innerHTML = '';
        $('#ws-title').textContent = staticView() ? view[0]!.toUpperCase()+view.slice(1) : 'Personal workspace';
        $('[data-workspace-toast]').hidden = true;
        saved('Checking identity…');
        $('[data-profile-label]').textContent = identity.status === 'signed-in' ? identity.label : 'This device';
        if (identity.status === 'checking' || identity.status === 'unavailable') {
            notice('Personal content is hidden until your Hub identity can be confirmed. App links are available in Apps.');
            return;
        }
        const owner = identity.status === 'signed-in' ? identity.id : null;
        if (owner && !validAccountId(owner))
            return;
        let legacy: string | null = null;
        try {
            legacy = localStorage.getItem(preferenceKey(owner));
        }
        catch { /* Local storage denied: IndexedDB may still be usable. */ }
        const nextStore = new WorkspaceStore(namespace(owner));
        store = nextStore;
        let loaded: WorkspaceState | null = null;
        try {
            await nextStore.open();
            if (own !== epoch) {
                nextStore.close();
                return;
            }
            storageReady = true;
            rawRecovery = await nextStore.raw();
            loaded = await nextStore.load();
        }
        catch (e) {
            if (own !== epoch)
                return;
            if (rawRecovery) {
                locked = true;
                notice(e instanceof Error ? e.message : 'Saved workspace cannot be opened.', button('export', 'Export recovery file'));
                if (!staticView()) $('[data-workspace-content]').innerHTML = '<section class="ws-recovery"><h2>Local workspace needs recovery</h2><p>The saved record could not be parsed or opened. It was not overwritten. Export its original recovery JSON before retrying. Do not clear site data or import over it before preserving the original.</p>' + button('export', 'Export original recovery JSON') + button('retry-locked','Recheck saved record') + '<p class="ws-muted">No tasks, notes or progress can be read safely until this record can be opened. Public app links remain usable.</p></section>';
                saved('Saved record left untouched');
                return;
            }
            storageReady = false;
            notice('Browser storage is unavailable. Work in this tab and export your data before leaving.', button('export', 'Export'));
        }
        if (own !== epoch)
            return;
        state = loaded ?? initialState(apps.map(a => a.id), legacy);
        privacyHeld = state.preferences.hidden;
        if (privacyHeld) { resetFolio(); clearNotesSource(); }
        selected = view==='calendar' && initialCalendarRestorePending && initialCalendarDate ? initialCalendarDate : today();
        if(initialCalendarRestorePending)initialCalendarRestorePending=false;
        else weekReturnDate=null;
        initialCalendarDate=null;

        month = selected.slice(0, 7) + '-01';
        if (storageReady) {
            try {
                recoveryDraft = await readDraft(nextStore);
                if (recoveryDraft && !state.workspaces.some(w => w.id === recoveryDraft!.workspaceId))
                    recoveryDraft = null;
            }
            catch {
                recoveryDraft = null;
            }
            if (!loaded)
                await persist();
        }
        if (own !== epoch)
            return;
        if (typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel('thiepn-adaptive-workspace-updates');
            channel.onmessage = event => {
                if (event.data?.key !== nextStore.key || event.data.revision === state?.revision)
                    return;
                clearContentUndo();
                if (editing || dirty) {
                    conflict = true;
                    updateReturnPanel();
                    updateRecoveryStrip();
                    notice('Another tab changed this workspace. Your local edits are kept.', button('export', 'Export') + button('reload', 'Reload saved data'));
                }
                else
                    void reloadSaved().catch(() => notice('Could not refresh changes from another tab.'));
            };
        }
        languageOwner = owner;
        render();
        if (managedAccountEnabled && identity.status === 'signed-in' && storageReady) {
            const ownStore = nextStore;
            cloud = new WorkspaceCloudSync({
                owner: identity.id, store: ownStore, transport: hubCloudTransport(identity.id),
                canApply: () => own === epoch && !dirty && !editing && !dialog.open && !searchDialog.open && !inputFocused(),
                changed: async () => { if (own !== epoch) return; pendingCloudRender=true; await refreshCloudView(); },
                status: (message, recovery = false) => {
                    if (own !== epoch) return;
                    cloudConflict=recovery;renderAttention();
                    root.querySelectorAll<HTMLElement>('[data-cloud-status]').forEach(el=>{el.textContent=message;el.hidden=false;});
                    root.querySelectorAll<HTMLElement>('[data-action=cloud-retry]').forEach(el=>el.hidden=false);root.querySelectorAll<HTMLElement>('[data-action=cloud-review]').forEach(el=>el.hidden=!recovery);
                },
            });
            cloud.schedule(0); void refreshInsights();
        }
        if (owner && view === 'home') void refreshLanguages(true);

        if (!storageReady)
            saved();
        else if (!recoveryDraft)
            notice('');
    }
    function applyTheme(theme: 'system' | 'light' | 'dark') {
        document.documentElement.dataset.themePreference = theme;
        document.documentElement.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : theme;
        document.documentElement.style.colorScheme = document.documentElement.dataset.theme!;
        try { localStorage.setItem('thiepn:index-theme', theme); } catch { /* Session preference remains usable. */ }
    }
    window.addEventListener('hub:before-account-navigation', event => {
        (event as CustomEvent<{ wait(promise: Promise<void>): void }>).detail.wait((async () => {
            await flushCaptureDraft(); await queue;
            if (dirty) await persist();
            if (dirty) throw new Error('Export unsaved data before connecting.');
            if (editing) await store?.draft(editing);
        })());
    });
    async function refreshCloudView() {
        const own=epoch; await queue;
        if (!pendingCloudRender || own!==epoch || dirty || editing || dialog.open || searchDialog.open || inputFocused()) return;
        pendingCloudRender=false; await reloadSaved();if(state?.preferences.theme)applyTheme(state.preferences.theme);
    }
    root.addEventListener('focusout',()=>{setTimeout(()=>{void refreshCloudView();cloud?.schedule();},0);});
    window.addEventListener('online', () => {cloud?.schedule(0);void refreshInsights();});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) cloud?.schedule(0);void refreshInsights(); });
    setInterval(()=>void refreshInsights(),30000);
    setInterval(() => { if (!document.hidden) {void refreshCloudView();cloud?.schedule(0);} }, 15000);
    root.addEventListener('click', event => {
        const action = (event.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
        if(action==='welcome-start') {
            welcomeDismissed=true;
            try {localStorage.setItem(welcomeKey,'1');}catch{try{sessionStorage.setItem(welcomeKey,'1');}catch{/* Keep the preference for this visit. */}}
            render();root.querySelector<HTMLButtonElement>('.ws-topbar [data-action=capture]')?.focus();
            return;
        }
        if (action === 'guest-import' && hubIdentity.status==='signed-in' && state && store) void (async()=>{
            const own=epoch,guestStore=new WorkspaceStore('guest');
            try {await guestStore.open();const guest=await guestStore.load();if(own!==epoch)return;
                if(!guest || !meaningfulState(guest)){toast('No guest workspace data to add.');return;}
                account.close();openForm('Add this device’s guest workspace','<p>This copies your guest layouts, tasks, calendar, notes and trackers into the connected account. The guest original stays on this device.</p>',async()=>{if(own!==epoch || !state)return;const combined=addGuestState(state,guest);state=combined;await persist(true);if(dirty)throw new Error('Could not save. Export a backup before retrying.');dialog.close();render();},'Add to my account');
            }catch(error){toast(error instanceof Error?error.message:'Guest workspace unavailable.');}finally{guestStore.close();}
        })();
        if (action === 'export-cloud-recovery' && cloud) void cloud.recovery().then(recovery=>{if(recovery)download(JSON.stringify(recovery.remote),'thiepn-account-recovery.json');});
        if (action === 'cloud-retry' && cloud) {root.querySelectorAll<HTMLElement>('[data-cloud-status]').forEach(el=>el.textContent='Checking account sync…');cloud.schedule(0);}
        if (action === 'cloud-review' && cloud) void (async () => {
            const own=epoch,engine=cloud!; const recovery = await engine.recovery();
            if (!recovery || own!==epoch || engine!==cloud) return;
            account.close();
            openForm('Review sync changes', '<p>Both versions are preserved. Export a backup before choosing which version should be shared with your devices.</p>' + select('Use workspace', 'choice', [['local','Keep this device’s version'],['remote','Use the account version']], 'local') + button('export','Export this device’s backup') + button('export-cloud-recovery','Export the account backup'), async data => { dialog.close(); await cloud?.resolve(data.get('choice') === 'remote' ? 'remote' : 'local'); });
        })();
    });
    window.addEventListener('hub:identity' , event => void loadIdentity((event as CustomEvent<HubIdentity>).detail));
    window.addEventListener('online',()=>{updateReturnPanel();updateRecoveryStrip();});
    window.addEventListener('offline',()=>{updateReturnPanel();updateRecoveryStrip();});
    document.addEventListener('visibilitychange',()=>{
        if(document.hidden)pauseFocusSession();
        else if(state && !dirty && !editing && !dialog.open && !searchDialog.open && !inputFocused() && !privacyHeld && !state.preferences.hidden && view==='home')render();
    });
    window.addEventListener('pagehide',()=>{pauseFocusSession();});
    window.addEventListener('pageshow', event => {
        if (state && !dirty && !editing) void reloadSaved();
        if (event.persisted) void refreshLanguages(true);
    });
    window.addEventListener('pagehide', () => { void flushCaptureDraft(); });
    window.addEventListener('focus', () => {
        if (state && !dirty && !editing) void reloadSaved();
        void refreshLanguages();
    });
    window.addEventListener('online', () => void refreshLanguages(true));
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            resetLanguages();
            repaintOverview();
        } else {
            if (hubIdentity.status === 'signed-in') languageOwner = hubIdentity.id;
            void refreshLanguages(true);
        }
    });
    window.addEventListener('pagehide', resetLanguages);
    window.addEventListener('pagehide', resetFolio);
    window.addEventListener('pagehide', clearNotesSource);
    document.addEventListener('visibilitychange', () => {
        // A pending consent window may hide the Hub until its user-approved reply.
        // Completed snapshots are one-tab-only and cleared on later backgrounding.
        if (document.hidden && folioStatus === 'ready') {
            resetFolio();
            repaintOverview();
        }
        if (document.hidden && notesSourceStatus === 'ready') {
            clearNotesSource();
            repaintOverview();
        }
    });
    // No background polling; while the visible Hub is open, revalidate periodically.
    setInterval(() => { if (!document.hidden) void refreshLanguages(); }, 15 * 60_000);

    window.addEventListener('beforeunload', event => {
        if (dirty) {
            event.preventDefault();
        }
    });
    matchMedia('(prefers-color-scheme:dark)').addEventListener('change', e => {
        if (document.documentElement.dataset.themePreference === 'system')
            document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    });
    let lastDay = selected;
    setInterval(() => { if (!state)
        return; const now = today(); if (now !== lastDay) {
        if (selected === lastDay) {
            selected = now;
            month = now.slice(0, 7) + '-01';
        }
        lastDay = now;
        render();
    } }, 30000);
    await loadIdentity(hubIdentity);
    if (openReading && view === 'home') { account.showModal(); syncReadingPanels(); }
    if ('serviceWorker' in navigator && !import.meta.env.DEV) { void navigator.serviceWorker.register('/workspace-sw.js',{scope:'/'}).catch(()=>{ /* Local records still work; do not claim offline shell availability. */ }); }

}
