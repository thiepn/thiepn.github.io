import {integratedWorkflows} from '../lib/workflows/integrated';
import { HubLibrarySession, libraryContinueUrl } from '../lib/hub-library-session';
import type { Operation } from '../lib/providers/types';
const root = document.querySelector<HTMLElement>('[data-private-library]');
if (root) {
  const status = root.querySelector<HTMLElement>('[data-library-status]')!;
  const panel = root.querySelector<HTMLElement>('[data-library-private]')!;
  const list = root.querySelector<HTMLElement>('[data-library-items]')!;
  const freshness = root.querySelector<HTMLElement>('[data-library-freshness]')!;
  const connect = root.querySelector<HTMLButtonElement>('[data-library-connect]')!;
  const refresh = root.querySelector<HTMLButtonElement>('[data-library-refresh]')!;
  const disconnect = root.querySelector<HTMLButtonElement>('[data-library-disconnect]')!;
  const form = root.querySelector<HTMLFormElement>('[data-library-search]')!;
  const radios = [...root.querySelectorAll<HTMLInputElement>('[name="library-operation"]')];
  let permissions = new Set<Operation>(), generation = 0, controller: AbortController | null = null, timer: ReturnType<typeof setTimeout> | undefined;
  const session = new HubLibrarySession(() => clear('Library data or sharing changed. Connect again to check current progress.'));
  function erase(message: string) { if(import.meta.env.PUBLIC_HUB_WORKFLOWS_PRIVATE==='staged-v1')integratedWorkflows.clear('library'); ++generation; controller?.abort(); controller = null; clearTimeout(timer); list.replaceChildren(); freshness.textContent = ''; panel.hidden = true; form.reset(); status.textContent = message; }
  function controls() { connect.disabled = Boolean(root!.hidden || document.hidden); radios.forEach(r => { r.disabled = !permissions.has(r.value as Operation); }); form.hidden = !permissions.has('search'); refresh.hidden = !permissions.has('summary') && !permissions.has('continue'); disconnect.hidden = !permissions.size; }
  function clear(message = 'Connect this browser to check saved reading progress.') { session.clear(); permissions.clear(); erase(message); controls(); }
  async function load(operation: Operation, query = '') {
    if (!permissions.has(operation) || root!.hidden || document.hidden) return;
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
        li.append(a, progress); list.append(li);
      }
      panel.hidden = false; status.textContent = envelope.status === 'empty' ? (operation === 'search' ? 'No matching saved reading titles.' : 'No matching saved progress for current EPUB/PDF releases in this browser.') : 'Saved reading progress on this browser';
      freshness.textContent = `Device-local · checked ${new Date(envelope.observedAt).toLocaleTimeString()}. Legacy web progress and other browsers are not included.`;
      timer = setTimeout(() => clear('This reading snapshot expired. Connect again to check Library.'), Math.max(0, Date.parse(envelope.expiresAt) - Date.now()));
    } catch { if (epoch === generation) clear('Library could not be checked. Review sharing or open My Library; unavailable storage is not an empty library.'); }
    finally { if (epoch === generation) controller = null; controls(); }
  }
  connect.addEventListener('click', () => void (async () => {
    if (root!.hidden || document.hidden) return;
    clear('Checking your Library sharing choices…'); const epoch = generation; controller = new AbortController(); connect.disabled = true;
    try {
      const consent = await session.connect(controller.signal);
      if (epoch !== generation || root!.hidden || document.hidden) return;
      permissions = new Set(consent.permissions); controls();
      const initial = permissions.has('summary') ? 'summary' : permissions.has('continue') ? 'continue' : null;
      if (initial) { radios.forEach(r => { r.checked = r.value === initial; }); await load(initial); }
      else { panel.hidden = false; status.textContent = 'Connected. Search saved reading titles in this browser.'; }
    } catch { if (epoch === generation) clear('Choose sharing in Library, then connect this browser.'); }
    finally { controls(); }
  })());
  refresh.addEventListener('click', () => void load((radios.find(r => r.checked)?.value ?? 'summary') as Operation));
  disconnect.addEventListener('click', () => clear('Library disconnected in this tab. Manage Library sharing to revoke it in this browser.'));
  radios.forEach(r => r.addEventListener('change', () => void load(r.value as Operation)));
  form.addEventListener('submit', event => { event.preventDefault(); const query = (form.elements.namedItem('query') as HTMLInputElement).value.trim(); if (query) void load('search', query); });
  window.addEventListener('hub:identity', () => clear());
  window.addEventListener('pagehide', () => clear());
  window.addEventListener('pageshow', event => { if (event.persisted) clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); controls(); });
  new MutationObserver(() => { if (root!.hidden) clear(); controls(); }).observe(root, { attributes: true, attributeFilter: ['hidden'] });
  controls();
}
