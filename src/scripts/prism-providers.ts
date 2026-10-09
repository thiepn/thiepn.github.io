import { HubLibrarySession } from '../lib/hub-library-session';
import { sessionProviderAdapter } from '../lib/providers/session-adapters';
import { prismProviderRuntime } from '../lib/prism/provider-runtime';
import type { PrismProviderHomeView } from '../lib/prism/provider-home-view';
import type { DailyHomeState } from '../lib/prism/daily-home-availability';
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
const studyContent = home?.querySelector<HTMLElement>('[data-prism-study-content]');
const recentContent = home?.querySelector<HTMLElement>('[data-prism-recent-content]');

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
  const defaultStudyNodes = Array.from(studyContent?.childNodes ?? []).map(node => node.cloneNode(true));
  const defaultRecentNodes = Array.from(recentContent?.childNodes ?? []).map(node => node.cloneNode(true));

  let generation = 0;
  let connected = false;
  let busy = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let libraryAdapter: ProviderAdapter | null = null;
  let libraryPermissions = new Set<string>();
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

  const unavailableCopy: Partial<Record<DailyHomeState, { heading: string; description: string }>> = {
    stale: { heading: 'Shared activity expired.', description: 'Refresh a connected app to check for current activity.' },
    offline: { heading: 'Shared activity unavailable offline.', description: 'Open the connected app or retry when online.' },
    error: { heading: 'Shared activity could not be checked.', description: 'Open the app directly or reconnect to refresh.' },
    unconnected: { heading: 'Sharing is not authorized.', description: 'Check sharing permissions in the connected app.' },
    unsupported: { heading: 'This activity is not supported yet.', description: 'Open the app directly; no private activity was loaded.' },
  };

  function renderAvailabilityFallback(root: HTMLElement, nodes: readonly Node[], state: DailyHomeState) {
    root.replaceChildren(...nodes.map(node => node.cloneNode(true)));
    root.dataset.prismProviderState = state;
    const copy = unavailableCopy[state];
    if (!copy) return;
    const heading = root.querySelector('strong');
    const description = root.querySelector('p');
    if (heading) heading.textContent = copy.heading;
    if (description) description.textContent = copy.description;
  }

  function renderNow(view: PrismProviderHomeView) {
    if (home!.hidden || nowRoot.closest<HTMLElement>('[data-prism-block]')?.hidden || view.now.length === 0) {
      renderAvailabilityFallback(nowRoot, defaultNowNodes, view.availability.now);
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
    nowRoot.dataset.prismProviderState = 'ready';
  }

  function renderView(view: PrismProviderHomeView) {
    renderNow(view);
    if (studyContent) {
      if (home!.hidden || studyContent.closest<HTMLElement>('[data-prism-block]')?.hidden || !view.study) renderAvailabilityFallback(studyContent, defaultStudyNodes, view.availability.study);
      else {
        const link = document.createElement('a');
        link.href = view.study.href;
        link.textContent = `${view.study.dueTaskCount} Bible review ${view.study.dueTaskCount === 1 ? 'task' : 'tasks'} · ${view.study.dueVerseCount} ${view.study.dueVerseCount === 1 ? 'verse' : 'verses'} · ${view.study.newVerseCount} new ${view.study.newVerseCount === 1 ? 'verse' : 'verses'}`;
        link.dataset.prismStudyProvider = view.study.providerId;
        studyContent.replaceChildren(link);
        studyContent.dataset.prismProviderState = 'ready';
      }
    }
    if (recentContent) {
      if (home!.hidden || recentContent.closest<HTMLElement>('[data-prism-block]')?.hidden || !view.recent.length) renderAvailabilityFallback(recentContent, defaultRecentNodes, view.availability.recent);
      else {
        const list = document.createElement('ul');
        list.className = 'prism-recent-list';
        for (const item of view.recent) {
          const row = document.createElement('li');
          const link = document.createElement('a');
          link.href = item.href;
          link.textContent = item.title;
          const meta = document.createElement('small');
          meta.textContent = `${providerLabel[item.providerId]} · ${new Date(item.updatedAt).toLocaleString()}`;
          row.append(link, meta);
          list.append(row);
        }
        recentContent.replaceChildren(list);
        recentContent.dataset.prismProviderState = 'ready';
      }
    }
    if (home!.hidden || continueRoot.hidden) { resetContinue(); return; }
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

    if (item.state === 'unconnected' || item.state === 'unsupported') {
      titleNode.textContent = item.state === 'unsupported' ? 'Continue is not supported yet' : 'Continue sharing is unavailable';
      copyNode.textContent = item.state === 'unsupported' ? 'Open the app directly to continue.' : 'Check the provider sharing permissions, then reconnect.';
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
    refreshButton.disabled = Boolean(busy || document.hidden || home!.hidden || (continueRoot.hidden && recentContent?.closest<HTMLElement>('[data-prism-block]')?.hidden));
    disconnectButton.disabled = busy;
    connectionRoot.setAttribute('aria-busy',String(busy));
  }

  function clearExpiry() {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
  }

  function scheduleExpiry(results: readonly ProviderResult[]) {
    clearExpiry();
    const deadlines = results.filter(item => item.providerId === 'library' && ['ready', 'empty'].includes(item.status))
      .flatMap(item => item.envelope ? [Date.parse(item.envelope.expiresAt)] : []).filter(deadline => deadline > Date.now());
    if (!deadlines.length) return;
    const delay = Math.max(0,Math.min(...deadlines)-Date.now());
    expiryTimer = setTimeout(()=>{
      if (!connected) return;
      prismProviderRuntime.expireSnapshots();
      scheduleExpiry(prismProviderRuntime.results());
    },delay+5);
  }

  function clearConnection(message = 'Not connected in this tab.') {
    ++generation;
    clearExpiry();
    prismProviderRuntime.removeConnection('library');
    libraryAdapter = null;
    libraryPermissions.clear();
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
    const current = ++generation;
    busy = true;
    statusNode.textContent = continueRoot.hidden
      ? 'Checking visible Library metadata…'
      : 'Checking current Library progress…';
    controls();
    try {
      prismProviderRuntime.setConnection(libraryAdapter,session.providerAccess());
      prismProviderRuntime.setVisible('library','continue',!home!.hidden && !continueRoot.hidden && libraryPermissions.has('continue'));
      prismProviderRuntime.setVisible('library','summary',Boolean(!home!.hidden && recentContent && !recentContent.closest<HTMLElement>('[data-prism-block]')?.hidden && libraryPermissions.has('summary')));
      await prismProviderRuntime.refresh();
      if (current !== generation || document.hidden) return;
      scheduleExpiry(prismProviderRuntime.results());
      if (current !== generation || !connected) return;
      const result = prismProviderRuntime.results().find(item=>item.providerId==='library'&&item.operation==='continue');
      statusNode.textContent = continueRoot.hidden
        ? 'Connected · only visible, shared Library metadata is being read.'
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
      libraryPermissions=new Set(consent.permissions);
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
    if (!document.hidden) void refreshVisible();
    controls();
  });
  visibility.observe(continueRoot,{attributes:true,attributeFilter:['hidden']});
  const recentBlock=recentContent?.closest<HTMLElement>('[data-prism-block]');
  if (recentBlock) visibility.observe(recentBlock,{attributes:true,attributeFilter:['hidden']});

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
