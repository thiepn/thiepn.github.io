import { HubLibrarySession } from '../lib/hub-library-session';
import { ProviderRunner } from '../lib/providers/runtime';
import { sessionProviderAdapter } from '../lib/providers/session-adapters';
import { buildPrismProviderHomeView, type PrismProviderContribution } from '../lib/prism/provider-home-view';
import type { ProviderResult } from '../lib/providers/types';

const home = document.querySelector<HTMLElement>('[data-prism-home]');
const connection = document.querySelector<HTMLElement>('[data-prism-provider="library"]');
const status = connection?.querySelector<HTMLElement>('[data-prism-library-status]');
const connect = connection?.querySelector<HTMLButtonElement>('[data-prism-library-connect]');
const refresh = connection?.querySelector<HTMLButtonElement>('[data-prism-library-refresh]');
const disconnect = connection?.querySelector<HTMLButtonElement>('[data-prism-library-disconnect]');
const continueBlock = home?.querySelector<HTMLElement>('[data-prism-block="continue"]');
const continueTitle = continueBlock?.querySelector<HTMLElement>('[data-prism-continue-title]');
const continueCopy = continueBlock?.querySelector<HTMLElement>('[data-prism-continue-copy]');
const continueAction = continueBlock?.querySelector<HTMLAnchorElement>('[data-prism-continue-action]');

if (home && connection && status && connect && refresh && disconnect && continueBlock && continueTitle && continueCopy && continueAction) {
  const connectionRoot = connection;
  const statusNode = status;
  const connectButton = connect;
  const refreshButton = refresh;
  const disconnectButton = disconnect;
  const continueRoot = continueBlock;
  const titleNode = continueTitle;
  const copyNode = continueCopy;
  const actionNode = continueAction;

  let generation = 0;
  let runner: ProviderRunner | null = null;
  let connected = false;
  let busy = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let contribution: PrismProviderContribution | null = null;

  const defaultContinue = {
    title: titleNode.textContent ?? 'No resumable activity yet',
    copy: copyNode.textContent ?? 'Open an app and Prism will keep your next meaningful step here.',
    href: actionNode.getAttribute('href') ?? '/#apps',
    label: actionNode.firstChild?.textContent?.trim() || 'Browse apps',
  };

  function setAction(label: string, href: string) {
    actionNode.replaceChildren(document.createTextNode(label + ' '), Object.assign(document.createElement('span'), { textContent: '→' }));
    actionNode.lastElementChild?.setAttribute('aria-hidden', 'true');
    actionNode.href = href;
  }

  function resetContinue() {
    titleNode.textContent = defaultContinue.title;
    copyNode.textContent = defaultContinue.copy;
    setAction(defaultContinue.label, defaultContinue.href);
    delete continueRoot.dataset.prismProviderState;
  }

  function renderResult() {
    const view = buildPrismProviderHomeView(contribution ? [contribution] : []);
    const item = view.continue;
    continueRoot.dataset.prismProviderState = item.state;

    if (item.state === 'ready' && item.title && item.href) {
      titleNode.textContent = item.title;
      const pieces = ['Library'];
      if (item.progress !== null) pieces.push(`${Math.round(item.progress * 100)}%`);
      if (item.updatedAt) pieces.push(`updated ${new Date(item.updatedAt).toLocaleString()}`);
      copyNode.textContent = pieces.join(' · ');
      setAction('Continue reading', item.href);
      return;
    }

    if (item.state === 'empty') {
      titleNode.textContent = 'No saved reading to continue';
      copyNode.textContent = 'Library is connected, but no current saved EPUB/PDF progress is available.';
      setAction('Open Library', '/library/');
      return;
    }

    if (item.state === 'stale') {
      titleNode.textContent = 'Library snapshot expired';
      copyNode.textContent = 'Refresh the Library connection to check current saved reading progress.';
      setAction('Open Library', '/library/');
      return;
    }

    if (item.state === 'offline' || item.state === 'error') {
      titleNode.textContent = 'Library could not be checked';
      copyNode.textContent = 'Your Library data is unchanged. Refresh the connection or open Library directly.';
      setAction('Open Library', '/library/');
      return;
    }

    resetContinue();
  }

  function controls() {
    connectButton.hidden = connected;
    refreshButton.hidden = !connected;
    disconnectButton.hidden = !connected;
    connectButton.disabled = busy || document.hidden;
    refreshButton.disabled = Boolean(busy || document.hidden || continueRoot.hidden);
    disconnectButton.disabled = busy;
    connectionRoot.setAttribute('aria-busy', String(busy));
  }

  function clearExpiry() {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
  }

  function clearConnection(message = 'Not connected in this tab.') {
    ++generation;
    clearExpiry();
    runner?.clear();
    runner = null;
    session.clear();
    connected = false;
    busy = false;
    contribution = null;
    statusNode.textContent = message;
    resetContinue();
    controls();
  }

  const session = new HubLibrarySession(() => clearConnection('Library sharing changed. Connect this browser again.'));

  function accept(result: ProviderResult) {
    contribution = { operation: 'continue', result };
    renderResult();
    if (result.envelope) {
      clearExpiry();
      const delay = Math.max(0, Date.parse(result.envelope.expiresAt) - Date.now());
      expiryTimer = setTimeout(() => {
        if (!runner || !connected) return;
        const snapshot = runner.snapshot().find((item) => item.providerId === 'library');
        if (snapshot) {
          contribution = { operation: 'continue', result: snapshot };
          renderResult();
        }
      }, delay + 5);
    }
  }

  async function loadContinue() {
    if (!runner || !connected || continueRoot.hidden || document.hidden) return;
    const current = generation;
    busy = true;
    statusNode.textContent = 'Checking current Library progress…';
    controls();
    try {
      runner.setAccess([session.providerAccess()]);
      await runner.run([{ providerId: 'library', operation: 'continue' }], (result) => {
        if (current !== generation || !connected || continueRoot.hidden || document.hidden) return;
        accept(result);
      });
      if (current !== generation || !connected) return;
      const state = contribution?.result.status;
      statusNode.textContent = state === 'ready'
        ? 'Connected · current saved progress shown in Continue.'
        : state === 'empty'
          ? 'Connected · no resumable saved progress.'
          : state === 'offline'
            ? 'Library is temporarily unavailable in this tab.'
            : state === 'error'
              ? 'Library could not be checked.'
              : 'Connected in this tab.';
    } finally {
      if (current === generation) {
        busy = false;
        controls();
      }
    }
  }

  connectButton.addEventListener('click', () => void (async () => {
    if (busy || document.hidden) return;
    const current = ++generation;
    busy = true;
    statusNode.textContent = 'Checking Library sharing on this device…';
    controls();
    try {
      const consent = await session.connect(AbortSignal.timeout(2500));
      if (current !== generation || document.hidden) return;
      const access = session.providerAccess();
      const adapter = sessionProviderAdapter('library', session);
      runner = new ProviderRunner([adapter]);
      runner.setAccess([access]);
      connected = true;
      statusNode.textContent = `Connected in this tab · ${consent.permissions.join(', ')}.`;
      busy = false;
      controls();
      await loadContinue();
    } catch {
      if (current === generation) clearConnection('Choose Library sharing, then connect this browser again.');
    }
  })());

  refreshButton.addEventListener('click', () => void loadContinue());
  disconnectButton.addEventListener('click', () => clearConnection('Library disconnected in this tab.'));

  const visibility = new MutationObserver(() => {
    if (continueRoot.hidden) {
      runner?.run([], () => {}).catch(() => {});
      contribution = null;
      resetContinue();
      statusNode.textContent = connected ? 'Connected · Continue is hidden, so Library is not being read.' : 'Not connected in this tab.';
      controls();
    } else if (connected && !document.hidden) {
      void loadContinue();
    }
  });
  visibility.observe(continueRoot, { attributes: true, attributeFilter: ['hidden'] });

  window.addEventListener('hub:identity', () => clearConnection());
  window.addEventListener('pagehide', () => clearConnection());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearConnection('Library cleared when this tab was hidden.');
    controls();
  });

  controls();
}
