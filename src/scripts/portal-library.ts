import { checkReadingPilot, desktopReadingPilot, READING_PILOT_MOBILE_ENABLED } from '../lib/reading-pilot';
import {integratedWorkflows} from '../lib/workflows/integrated';
import { HubLibrarySession, libraryContinueUrl } from '../lib/hub-library-session';
import { hubIdentity } from './portal-auth';
import type { Operation } from '../lib/providers/types';
const root = document.querySelector<HTMLElement>('[data-private-library]');
if (root) {
  const pilot = root.dataset.libraryPilot === 'v1';
  const pilotRoot = root.closest<HTMLElement>('[data-reading-pilot]');
  const join = pilotRoot?.querySelector<HTMLButtonElement>('[data-reading-pilot-join]');
  const end = pilotRoot?.querySelector<HTMLButtonElement>('[data-reading-pilot-end]');
  const pilotStatus = pilotRoot?.querySelector<HTMLElement>('[data-reading-pilot-status]');
  let pending: symbol | undefined;
  let joined = false, pilotTimer: ReturnType<typeof setInterval> | undefined;
  const eligible = !pilot || READING_PILOT_MOBILE_ENABLED || desktopReadingPilot(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  const available = () => !root!.hidden && !document.hidden && (!pilot || (joined && eligible && !pilotRoot?.hidden));
  function endPilot(message = 'Library connection ended. This tab’s reading snapshot was cleared. To return, choose Connect Library, then connect this browser again.') {
    if (!pilot) return; joined = false; clearInterval(pilotTimer); pilotTimer = undefined; root!.hidden = true;
    join!.hidden = false; end!.hidden = true; pilotStatus!.textContent = message; clear();
  }
  async function verifyPilot() {
    if (!pilot) return true;
    const epoch = generation;
    try {
      if (eligible && joined && !pilotRoot?.hidden && !document.hidden && await checkReadingPilot(AbortSignal.timeout(2000))) {
        if (epoch !== generation) return false;
        if (available()) return true;
      }
    } catch {}
    if (epoch !== generation) return false;
    endPilot('The reading pilot is unavailable or paused. Your Library data is unchanged.'); return false;
  }
  const status = root.querySelector<HTMLElement>('[data-library-status]')!;
  const panel = root.querySelector<HTMLElement>('[data-library-private]')!;
  const list = root.querySelector<HTMLElement>('[data-library-items]')!;
  const freshness = root.querySelector<HTMLElement>('[data-library-freshness]')!;
  const empty = root.querySelector<HTMLElement>('[data-library-empty]');
  const connect = root.querySelector<HTMLButtonElement>('[data-library-connect]')!;
  const refresh = root.querySelector<HTMLButtonElement>('[data-library-refresh]')!;
  const disconnect = root.querySelector<HTMLButtonElement>('[data-library-disconnect]')!;
  const form = root.querySelector<HTMLFormElement>('[data-library-search]')!;
  const radios = [...root.querySelectorAll<HTMLInputElement>('[name="library-operation"]')];
  let permissions = new Set<Operation>(), generation = 0, controller: AbortController | null = null, timer: ReturnType<typeof setTimeout> | undefined;
  const session = new HubLibrarySession(() => clear('Library data or sharing changed. Connect again to check current progress.'));
  function erase(message: string) { if(import.meta.env.PUBLIC_HUB_WORKFLOWS_PRIVATE==='staged-v1')integratedWorkflows.clear('library'); ++generation; controller?.abort(); controller = null; clearTimeout(timer); list.replaceChildren(); freshness.textContent = ''; if(empty)empty.hidden=true; panel.hidden = true; form.reset(); status.textContent = message; }
  function controls() { connect.disabled = !available() || !!pending; refresh.disabled = !!pending; root!.setAttribute('aria-busy', String(!!pending)); radios.forEach(r => { r.disabled = !!pending || !permissions.has(r.value as Operation); }); form.hidden = !permissions.has('search'); refresh.hidden = !permissions.has('summary') && !permissions.has('continue'); disconnect.hidden = !permissions.size; }
  function clear(message = 'Connect this browser to check saved reading progress.', preservePending = false) { if (!preservePending) pending = undefined; session.clear(); permissions.clear(); erase(message); if(pilot && joined)pilotStatus!.textContent='Joined for this tab. Connect this browser to check reading progress.'; controls(); }
  async function run(action: () => Promise<void>) {
    if (pending || !available()) return;
    const token = Symbol(); pending = token; controls();
    try { await action(); } finally { if (pending === token) pending = undefined; controls(); }
  }
  async function load(operation: Operation, query = '') {
    if (!permissions.has(operation) || !available() || !await verifyPilot()) return;
    erase('Checking Library progress…'); const epoch = generation; controller = new AbortController();
    try {
      const envelope = await session.read(operation, controller.signal, query);
      if (epoch !== generation || root!.hidden || document.hidden) return;
      if (!['ready','empty'].includes(envelope.status) || !envelope.data) throw new Error('Unavailable');
      if(import.meta.env.PUBLIC_HUB_WORKFLOWS_PRIVATE==='staged-v1')integratedWorkflows.publish(envelope);
      for (const item of envelope.data.items) {
        const li = document.createElement('li'), a = document.createElement('a');
        a.href = libraryContinueUrl(item); a.rel = 'noreferrer'; a.textContent = `${item.title} · ${item.format?.toUpperCase()} · edition ${item.edition}`;
        const progress = document.createElement('p'); progress.textContent = `Current ${Math.round((item.current ?? 0) * 100)}% · furthest ${Math.round((item.furthest ?? 0) * 100)}%`;
        if (pilot) {
          li.className = 'portal-reading-card';
          const title = document.createElement('h3'); title.textContent = item.title;
          const edition = document.createElement('p'); edition.className = 'portal-muted'; edition.textContent = `${item.format?.toUpperCase()} · edition ${item.edition} · Library`;
          const meter = document.createElement('progress'); meter.max = 100; meter.value = Math.round((item.current ?? 0) * 100); meter.setAttribute('aria-label', `Current reading progress for ${item.title}`);
          a.className = 'portal-button'; a.textContent = 'Continue reading'; a.setAttribute('aria-label', `Continue reading ${item.title}`);
          li.append(title, edition, meter, progress, a);
        } else li.append(a, progress);
        list.append(li);
      }
      if(empty)empty.hidden=envelope.status!=='empty';
      if(pilot)pilotStatus!.textContent='Connected for this tab. Reading metadata clears when you leave Home.';
      panel.hidden = false; status.textContent = envelope.status === 'empty' ? (operation === 'search' ? 'No matching saved reading titles.' : 'No matching saved progress for current EPUB/PDF releases in this browser.') : 'Saved reading progress on this browser';
      freshness.textContent = envelope.coverage === 'account-synced'
        ? `Account-synced through Library · checked ${new Date(envelope.observedAt).toLocaleTimeString()}. Library verified that this device already matches the Account snapshot before sharing bounded reading metadata.`
        : `This browser · checked ${new Date(envelope.observedAt).toLocaleTimeString()}. Account-synced reading was not included in this snapshot.`;
      timer = setTimeout(() => clear('This reading snapshot expired. Connect again to check Library.'), Math.max(0, Date.parse(envelope.expiresAt) - Date.now()));
    } catch { if (epoch === generation) clear('Library could not be checked. Review sharing or open My Library; unavailable storage is not an empty library.'); }
    finally { if (epoch === generation) controller = null; controls(); }
  }
  connect.addEventListener('click', () => void run(async () => {
    if (!available() || !await verifyPilot()) return;
    clear('Checking your Library sharing choices…', true); const epoch = generation; controller = new AbortController(); connect.disabled = true;
    try {
      const consent = await session.connect(
        controller.signal,
        hubIdentity.status === 'signed-in' ? hubIdentity.id : null,
      );
      if (epoch !== generation || root!.hidden || document.hidden) return;
      permissions = new Set(consent.permissions.filter(p => !pilot || p === 'summary' || p === 'continue')); controls();
      const initial = permissions.has('summary') ? 'summary' : permissions.has('continue') ? 'continue' : null;
      if (initial) { radios.forEach(r => { r.checked = r.value === initial; }); await load(initial); }
      else if (pilot) { clear('Enable reading summary or Continue in Library sharing, then connect again.'); }
      else { panel.hidden = false; status.textContent = 'Connected. Search saved reading titles in this browser.'; }
    } catch { if (epoch === generation) clear('Choose sharing in Library, then connect this browser.'); }
    finally { controls(); }
  }));
  refresh.addEventListener('click', () => void run(() => load((radios.find(r => r.checked)?.value ?? 'summary') as Operation)));
  disconnect.addEventListener('click', () => clear('Library disconnected in this tab. Manage Library sharing to revoke it in this browser.'));
  radios.forEach(r => r.addEventListener('change', () => void run(() => load(r.value as Operation))));
  form.addEventListener('submit', event => { event.preventDefault(); const query = (form.elements.namedItem('query') as HTMLInputElement).value.trim(); if (query) void run(() => load('search', query)); });
  window.addEventListener('hub:identity', event => {
    const detail = (event as CustomEvent).detail as { status?: unknown; id?: unknown } | undefined;
    clear();
    if (pilot) endPilot();
  });
  window.addEventListener('pagehide', () => { clear(); if (pilot) endPilot(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { clear(); if (pilot) endPilot(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clear(); if (pilot) endPilot('Reading cleared when you left Home. Choose Connect Library, then connect this browser for fresh progress.'); } controls(); });
  new MutationObserver(() => { if (root!.hidden) clear(); controls(); }).observe(root, { attributes: true, attributeFilter: ['hidden'] });
  if (pilot) {
    join!.disabled = !eligible;
    if (!eligible) pilotStatus!.textContent = 'This pilot currently supports desktop browsers. Mobile reading remains available in Library.';
    join!.addEventListener('click', () => void (async () => {
      if (!eligible || pilotRoot?.hidden || document.hidden) return;
      join!.disabled = true; const joinEpoch = generation;
      try {
        if (!await checkReadingPilot(AbortSignal.timeout(2000))) throw new Error('Paused');
        if (joinEpoch !== generation || pilotRoot?.hidden || document.hidden) return;
        joined = true; root!.hidden = false; join!.hidden = true; end!.hidden = false;
        pilotStatus!.textContent = 'Joined for this tab. Choose sharing in Library, then connect this browser.';
        pilotTimer = setInterval(() => { void verifyPilot(); }, 30000); controls();
      } catch { endPilot('The reading pilot is unavailable or paused. Your Library data is unchanged.'); }
      finally { join!.disabled = !eligible; }
    })());
    end!.addEventListener('click', () => endPilot());
    new MutationObserver(() => { if (pilotRoot!.hidden) endPilot(); }).observe(pilotRoot!, {attributes:true,attributeFilter:['hidden']});
  }
  controls();
}
