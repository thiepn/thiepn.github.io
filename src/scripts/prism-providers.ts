import { HubLibrarySession } from '../lib/hub-library-session';
import { sessionProviderAdapter } from '../lib/providers/session-adapters';
import { prismProviderRuntime } from '../lib/prism/provider-runtime';
import type { PrismProviderHomeView } from '../lib/prism/provider-home-view';
import type { ProviderAdapter, ProviderId, ProviderResult } from '../lib/providers/types';

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
const nowList = home?.querySelector<HTMLElement>('[data-prism-now-list]');

if (home && connection && status && connect && refresh && disconnect && continueBlock && continueTitle && continueCopy && continueAction && nowList) {
  const connectionRoot = connection;
  const statusNode = status;
  const connectButton = connect;
  const refreshButton = refresh;
  const disconnectButton = disconnect;
  const continueRoot = continueBlock;
  const titleNode = continueTitle;
  const copyNode = continueCopy;
  const actionNode = continueAction;
  const nowRoot = nowList;
  const defaultNowNodes = Array.from(nowRoot.childNodes).map((node) => node.cloneNode(true));

  let generation = 0;
  let connected = false;
  let busy = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let libraryAdapter: ProviderAdapter | null = null;
  // The Library owner accepts only canonical Home. A preview must not widen
  // its caller allowlist or present a connection that can never succeed.
  const libraryAvailable = location.pathname === '/home/' || location.pathname === '/home';

  const defaultContinue = {
    title: titleNode.textContent ?? 'No resumable activity yet',
    copy: copyNode.textContent ?? 'Open an app and Prism will keep your next meaningful step here.',
    href: actionNode.getAttribute('href') ?? '/#apps',
    label: actionNode.firstChild?.textContent?.trim() || 'Browse apps',
  };

  const providerLabel: Record<ProviderId,string> = {
    notes: 'Notes',
    library: 'Library',
    tms60: 'TMS60',
  };

  function setAction(label: string, href: string) {
    const arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden','true');
    actionNode.replaceChildren(document.createTextNode(label + ' '),arrow);
    actionNode.href = href;
  }

  function resetContinue() {
    titleNode.textContent = defaultContinue.title;
    copyNode.textContent = defaultContinue.copy;
    setAction(defaultContinue.label,defaultContinue.href);
    delete continueRoot.dataset.prismProviderState;
  }

  function renderNow(view: PrismProviderHomeView) {
    if (view.now.length === 0) {
      nowRoot.replaceChildren(...defaultNowNodes.map((node) => node.cloneNode(true)));
      return;
    }
    const nodes = view.now.map((item) => {
      const link = document.createElement('a');
      link.className = 'prism-timeline__item';
      link.href = item.href;
      link.dataset.prismNowId = item.id;

      const node = document.createElement('span');
      node.className = 'prism-timeline__node prism-timeline__node--active';
      node.setAttribute('aria-hidden','true');

      const copy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = item.title;
      copy.append(title);
      if (item.detail) {
        const detail = document.createElement('p');
        detail.textContent = item.detail;
        copy.append(detail);
      }
      link.append(node,copy);
      return link;
    });
    nowRoot.replaceChildren(...nodes);
  }

  function renderView(view: PrismProviderHomeView) {
    renderNow(view);
    const item = view.continue;
    continueRoot.dataset.prismProviderState = item.state;

    if (item.state === 'ready' && item.title && item.href && item.providerId) {
      titleNode.textContent = item.title;
      const pieces = [providerLabel[item.providerId]];
      if (item.progress !== null) pieces.push(`${Math.round(item.progress * 100)}%`);
      if (item.updatedAt) pieces.push(`updated ${new Date(item.updatedAt).toLocaleString()}`);
      copyNode.textContent = pieces.join(' · ');
      setAction(item.providerId === 'library' ? 'Continue reading' : 'Continue',item.href);
      return;
    }

    if (item.state === 'empty' && prismProviderRuntime.connectedProviders().length > 0) {
      titleNode.textContent = 'Nothing connected to resume';
      copyNode.textContent = 'Connected providers have no current resumable activity.';
      setAction('Browse apps','/#apps');
      return;
    }

    if (item.state === 'stale') {
      titleNode.textContent = 'Continue snapshot expired';
      copyNode.textContent = 'Refresh connected Home data to check the current activity.';
      setAction('Browse apps','/#apps');
      return;
    }

    if (item.state === 'offline' || item.state === 'error') {
      titleNode.textContent = 'Continue could not be refreshed';
      copyNode.textContent = 'No private activity is shown until the connected provider can be checked again.';
      setAction('Browse apps','/#apps');
      return;
    }

    resetContinue();
  }

  function controls() {
    connectButton.hidden = connected;
    refreshButton.hidden = !connected;
    disconnectButton.hidden = !connected;
    connectButton.disabled = !libraryAvailable || busy || document.hidden;
    refreshButton.disabled = Boolean(busy || document.hidden || continueRoot.hidden);
    disconnectButton.disabled = busy;
    connectionRoot.setAttribute('aria-busy',String(busy));
  }

  function clearExpiry() {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
  }

  function scheduleExpiry(results: readonly ProviderResult[]) {
    clearExpiry();
    const result = results.find(item => item.providerId === 'library' && item.operation === 'continue' && item.envelope);
    if (!result?.envelope) return;
    const delay = Math.max(0,Date.parse(result.envelope.expiresAt)-Date.now());
    expiryTimer = setTimeout(()=>{
      if (!connected) return;
      renderView(prismProviderRuntime.view());
    },delay+5);
  }

  function clearConnection(message = 'Not connected in this tab.') {
    ++generation;
    clearExpiry();
    prismProviderRuntime.removeConnection('library');
    libraryAdapter = null;
    session.clear();
    connected = false;
    busy = false;
    statusNode.textContent = message;
    renderView(prismProviderRuntime.view());
    controls();
  }

  const session = new HubLibrarySession(()=>clearConnection('Library sharing changed. Connect this browser again.'));

  async function refreshVisible() {
    if (!connected || document.hidden || !libraryAdapter) return;
    const current = generation;
    busy = true;
    statusNode.textContent = continueRoot.hidden
      ? 'Connected · Continue is hidden, so Library is not being read.'
      : 'Checking current Library progress…';
    controls();
    try {
      prismProviderRuntime.setConnection(libraryAdapter,session.providerAccess());
      prismProviderRuntime.setVisible('library','continue',connected && !continueRoot.hidden);
      await prismProviderRuntime.refresh();
      if (current !== generation || document.hidden) return;
      scheduleExpiry(prismProviderRuntime.results());
      if (current !== generation || !connected) return;
      const result = prismProviderRuntime.results().find(item=>item.providerId==='library'&&item.operation==='continue');
      statusNode.textContent = continueRoot.hidden
        ? 'Connected · Continue is hidden, so Library is not being read.'
        : result?.status === 'ready'
          ? 'Connected · current saved progress shown in Continue.'
          : result?.status === 'empty'
            ? 'Connected · no resumable saved progress.'
            : result?.status === 'offline'
              ? 'Library is temporarily unavailable in this tab.'
              : result?.status === 'error'
                ? 'Library could not be checked.'
                : 'Connected in this tab.';
    } finally {
      if (current === generation) {
        busy = false;
        controls();
      }
    }
  }

  connectButton.addEventListener('click',()=>void(async()=>{
    if (!libraryAvailable || busy || document.hidden) return;
    const current=++generation;
    busy=true;
    statusNode.textContent='Checking Library sharing on this device…';
    controls();
    try {
      const consent=await session.connect(AbortSignal.timeout(2500));
      if (current!==generation || document.hidden) return;
      libraryAdapter=sessionProviderAdapter('library',session);
      prismProviderRuntime.setConnection(libraryAdapter,session.providerAccess());
      connected=true;
      statusNode.textContent=`Connected in this tab · ${consent.permissions.join(', ')}.`;
      busy=false;
      controls();
      await refreshVisible();
    } catch {
      if (current===generation) clearConnection('Choose Library sharing, then connect this browser again.');
    }
  })());

  refreshButton.addEventListener('click',()=>void refreshVisible());
  disconnectButton.addEventListener('click',()=>clearConnection('Library disconnected in this tab.'));

  const visibility=new MutationObserver(()=>{
    if (!connected) return;
    if (continueRoot.hidden) {
      clearExpiry();
      prismProviderRuntime.setVisible('library','continue',false);
      void prismProviderRuntime.refresh();
    } else if (!document.hidden) {
      prismProviderRuntime.setVisible('library','continue',true);
      void refreshVisible();
    }
    controls();
  });
  visibility.observe(continueRoot,{attributes:true,attributeFilter:['hidden']});

  window.addEventListener('hub:identity',()=>clearConnection());
  window.addEventListener('pagehide',()=>clearConnection());
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) clearConnection('Library cleared when this tab was hidden.');
    controls();
  });

  prismProviderRuntime.subscribe(renderView);
  prismProviderRuntime.setVisible('library','continue',false);
  if (!libraryAvailable) statusNode.textContent = 'Library connection is available only on the qualified Home route.';
  controls();
}
