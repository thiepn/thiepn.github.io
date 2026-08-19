import { DEFAULT_ARCHIVE_STATE, filterAndSortProjects, parseArchiveState, serializeArchiveState, type ArchiveCategory, type ArchiveSort, type ArchiveState, type ArchiveView } from '../lib/archive-state';
import type { SearchableProject } from '../lib/search-core';
import { captureArchivePositions, shouldAnimateArchiveReflow } from '../lib/archive-performance';
import { FEATURES } from '../data/features';

interface ArchivePayload { projects: SearchableProject[]; curatedOrder: string[]; }
const VIEW_KEY = 'thiepn:index-archive-view';
const SCROLL_KEY = 'thiepn:index-archive-scroll';

function makeListItem(project: SearchableProject): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.dataset.archiveItem = '';
  wrapper.dataset.slug = project.slug;

  const article = document.createElement('article');
  article.className = 'archive-runtime-row';

  const code = document.createElement('span'); code.className = 'archive-runtime-row__code'; code.textContent = project.code;
  const title = document.createElement('h3'); title.className = 'archive-runtime-row__title';
  const details = document.createElement('a'); details.href = `/project/${project.slug}/`; details.textContent = project.title; title.append(details);
  const type = document.createElement('span'); type.className = 'archive-runtime-row__type'; type.textContent = project.category;
  const status = document.createElement('span'); status.className = 'archive-runtime-row__status'; status.dataset.status = project.status; status.textContent = project.status;
  article.append(code, title, type, status);
  if (project.liveUrl) {
    const open = document.createElement('a'); open.className = 'archive-runtime-row__open'; open.href = project.liveUrl; open.textContent = '↗'; open.setAttribute('aria-label', `Open ${project.title}`); article.append(open);
  } else {
    const spacer = document.createElement('span'); spacer.setAttribute('aria-hidden', 'true'); article.append(spacer);
  }
  wrapper.append(article);
  return wrapper;
}

function initArchive(root: HTMLElement) {
  const dataNode = root.querySelector<HTMLScriptElement>('[data-archive-data]');
  const queryInput = root.querySelector<HTMLInputElement>('[data-archive-query]');
  const sortSelect = root.querySelector<HTMLSelectElement>('[data-archive-sort]');
  const count = root.querySelector<HTMLElement>('[data-archive-result-count]');
  const grid = root.querySelector<HTMLElement>('[data-archive-grid]');
  const list = root.querySelector<HTMLElement>('[data-archive-list]');
  const empty = root.querySelector<HTMLElement>('[data-archive-empty]');
  const reset = root.querySelector<HTMLButtonElement>('[data-archive-reset]');
  const random = root.querySelector<HTMLButtonElement>('[data-archive-random]');
  if (!dataNode || !queryInput || !sortSelect || !count || !grid || !list || !empty || !reset || !random) return;
  const queryEl=queryInput; const sortEl=sortSelect; const countEl=count; const gridEl=grid; const listEl=list; const emptyEl=empty; const resetEl=reset; const randomEl=random;
  let payload: ArchivePayload;
  try { payload = JSON.parse(dataNode.textContent || '{}') as ArchivePayload; } catch { return; }
  const storedView = (() => { try { return localStorage.getItem(VIEW_KEY); } catch { return null; } })();
  let state: ArchiveState = parseArchiveState(new URL(window.location.href), storedView);
  let lastView: ArchiveView = state.view;
  let hasApplied = false;
  let applyFrame = 0;
  let listBuilt = false;

  const gridMap = new Map(Array.from(gridEl.querySelectorAll<HTMLElement>('[data-archive-item]')).map((item) => [item.dataset.slug || '', item]));
  const listMap = new Map<string, HTMLElement>();

  function ensureList() {
    if (listBuilt) return;
    const fragment = document.createDocumentFragment();
    payload.projects.forEach((project) => {
      const item = makeListItem(project);
      listMap.set(project.slug, item);
      fragment.append(item);
    });
    listEl.append(fragment);
    listBuilt = true;
  }

  function syncControls() {
    queryEl.value = state.query;
    sortEl.value = state.sort;
    root.querySelectorAll<HTMLButtonElement>('[data-archive-category]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.archiveCategory === state.category)));
    root.querySelectorAll<HTMLButtonElement>('[data-archive-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.archiveView === state.view)));
    gridEl.hidden = state.view !== 'grid';
    listEl.hidden = state.view !== 'list';
  }

  function updateUrl(mode: 'replace'|'push' = 'replace') {
    const next = serializeArchiveState(state, new URL(window.location.href));
    const method = mode === 'push' ? 'pushState' : 'replaceState';
    history[method]({ archive: state }, '', `${next.pathname}${next.search}${next.hash}`);
  }

  function reorder(container: HTMLElement, map: Map<string, HTMLElement>, ordered: SearchableProject[], visible: Set<string>) {
    const fragment = document.createDocumentFragment();
    ordered.forEach((project) => {
      const item = map.get(project.slug);
      if (!item) return;
      item.hidden = false;
      fragment.append(item);
    });
    map.forEach((item, slug) => { if (!visible.has(slug)) item.hidden = true; });
    container.append(fragment);
  }

  function apply(options: { url?: boolean; historyMode?: 'replace'|'push' } = { url: true, historyMode: 'replace' }) {
    if (state.view === 'list') ensureList();
    const ordered = filterAndSortProjects(payload.projects, state, payload.curatedOrder);
    const motionAllowed = hasApplied && FEATURES.archiveLayoutMotion && shouldAnimateArchiveReflow(ordered.length);
    const previousContainer = lastView === 'grid' ? gridEl : listEl;
    const before = motionAllowed ? captureArchivePositions(previousContainer) : new Map();
    const visible = new Set(ordered.map((project) => project.slug));
    reorder(gridEl, gridMap, ordered, visible);
    if (listBuilt) reorder(listEl, listMap, ordered, visible);
    countEl.textContent = String(ordered.length).padStart(3, '0');
    emptyEl.hidden = ordered.length > 0;
    syncControls();
    if (motionAllowed) {
      const nextContainer = state.view === 'grid' ? gridEl : listEl;
      const positions = lastView === state.view ? before : new Map();
      requestAnimationFrame(() => {
        void import('../motion/archiveReflow').then(({ animateArchiveReflow }) => animateArchiveReflow(nextContainer, positions));
      });
    }
    hasApplied = true;
    lastView = state.view;
    if (options.url !== false) updateUrl(options.historyMode ?? 'replace');
    try { localStorage.setItem(VIEW_KEY, state.view); } catch {}
  }

  function scheduleApply(options: { url?: boolean; historyMode?: 'replace'|'push' } = { url: true, historyMode: 'replace' }) {
    if (applyFrame) cancelAnimationFrame(applyFrame);
    applyFrame = requestAnimationFrame(() => { applyFrame = 0; apply(options); });
  }

  root.querySelectorAll<HTMLButtonElement>('[data-archive-category]').forEach((button) => button.addEventListener('click', () => {
    state = { ...state, category: (button.dataset.archiveCategory || 'all') as ArchiveCategory };
    apply({ url: true, historyMode: 'push' });
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-archive-view]').forEach((button) => button.addEventListener('click', () => {
    state = { ...state, view: (button.dataset.archiveView || 'grid') as ArchiveView };
    apply({ url: true, historyMode: 'replace' });
  }));
  queryEl.addEventListener('input', () => { state = { ...state, query: queryEl.value }; scheduleApply({ url: true, historyMode: 'replace' }); });
  sortEl.addEventListener('change', () => { state = { ...state, sort: sortEl.value as ArchiveSort }; apply({ url: true, historyMode: 'push' }); });
  resetEl.addEventListener('click', () => { state = { ...DEFAULT_ARCHIVE_STATE, view: state.view }; apply({ url: true, historyMode: 'push' }); queryEl.focus(); });
  randomEl.addEventListener('click', () => window.dispatchEvent(new CustomEvent('thiepn:search-open', { detail: { random: true } })));

  document.querySelectorAll<HTMLAnchorElement>('[data-archive-filter-link]').forEach((link) => link.addEventListener('click', (event) => {
    const category = link.dataset.archiveFilterLink as ArchiveCategory | undefined;
    if (!category) return;
    event.preventDefault();
    state = { ...state, category };
    apply({ url: true, historyMode: 'push' });
    root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));

  window.addEventListener('popstate', () => { state = parseArchiveState(new URL(window.location.href), storedView); apply({ url: false }); });
  window.addEventListener('pagehide', () => {
    if (applyFrame) cancelAnimationFrame(applyFrame);
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ path: location.pathname + location.search, y: scrollY })); } catch {}
  });

  apply({ url: false });
  requestAnimationFrame(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || 'null') as { path?: string; y?: number } | null;
      if (saved?.path === location.pathname + location.search && typeof saved.y === 'number') { scrollTo({ top: saved.y, behavior: 'auto' }); sessionStorage.removeItem(SCROLL_KEY); }
    } catch {}
  });
}

document.querySelectorAll<HTMLElement>('[data-project-archive]').forEach(initArchive);
