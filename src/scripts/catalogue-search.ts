import { searchCatalogue, type SearchableCollection, type SearchableItem, type SearchableProject } from '../lib/search-core';
import { pickRandomProject } from '../lib/random-access';

interface SearchPayload {
  projects: SearchableProject[];
  collections: SearchableCollection[];
  featured: string[];
}

interface SearchOpenDetail {
  query?: string;
  random?: boolean;
}

interface SearchController {
  open(detail?: SearchOpenDetail): Promise<void>;
}

let payloadPromise: Promise<SearchPayload> | null = null;
let controllerPromise: Promise<SearchController | null> | null = null;

function getPayload(): Promise<SearchPayload> {
  payloadPromise ??= fetch('/search-index.json', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
    return await response.json() as SearchPayload;
  });
  return payloadPromise;
}

function getSearchRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-catalogue-search]');
}

async function createController(root: HTMLElement): Promise<SearchController | null> {
  const dialog = root.querySelector<HTMLDialogElement>('[data-catalogue-search-dialog]');
  const input = root.querySelector<HTMLInputElement>('[data-catalogue-search-input]');
  const results = root.querySelector<HTMLElement>('[data-catalogue-search-results]');
  const preview = root.querySelector<HTMLElement>('[data-catalogue-search-preview]');
  const status = root.querySelector<HTMLElement>('[data-catalogue-search-status]');
  const close = root.querySelector<HTMLButtonElement>('[data-catalogue-search-close]');
  const randomPanel = root.querySelector<HTMLElement>('[data-catalogue-search-random]');
  const randomTrigger = root.querySelector<HTMLButtonElement>('[data-catalogue-search-random-trigger]');
  const randomCard = root.querySelector<HTMLElement>('[data-catalogue-search-random-card]');
  if (!dialog || !input || !results || !preview || !status || !close || !randomPanel || !randomCard || !randomTrigger) return null;

  const dialogEl = dialog;
  const inputEl = input;
  const resultsEl = results;
  const previewEl = preview;
  const statusEl = status;
  const closeEl = close;
  const randomPanelEl = randomPanel;
  const randomCardEl = randomCard;
  const randomTriggerEl = randomTrigger;

  let payload: SearchPayload | null = null;
  let items: SearchableItem[] = [];
  let ranked = [] as ReturnType<typeof searchCatalogue>;
  let selectedIndex = -1;
  let returnFocus: HTMLElement | null = null;
  let previewTimer = 0;

  const itemUrl = (item: SearchableItem) => item.kind === 'project' ? `/project/${item.slug}/` : `/collection/${item.slug}/`;
  const selectedItem = () => ranked[selectedIndex]?.item;

  async function ensurePayload() {
    if (payload) return payload;
    statusEl.textContent = 'Loading project search…';
    payload = await getPayload();
    items = [...payload.projects, ...payload.collections];
    return payload;
  }

  function setPreview(item?: SearchableItem) {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      if (!item) {
        previewEl.style.removeProperty('--preview-accent-light');
        previewEl.style.removeProperty('--preview-accent-dark');
        previewEl.innerHTML = '<span class="meta">Search ready</span><strong>Search projects and collections.</strong><p>Try “French”, “typing”, “PDF”, “G-003”, or a project title.</p>';
        return;
      }
      previewEl.style.setProperty('--preview-accent-light', item.kind === 'project' ? item.accentLight : 'var(--line-strong)');
      previewEl.style.setProperty('--preview-accent-dark', item.kind === 'project' ? item.accentDark : 'var(--line-strong)');
      previewEl.replaceChildren();
      const meta = document.createElement('span'); meta.className = 'meta'; meta.textContent = `${item.code} / ${item.kind === 'project' ? item.category : 'collection'}`;
      const title = document.createElement('strong'); title.textContent = item.title;
      const copy = document.createElement('p'); copy.textContent = item.summary;
      previewEl.append(meta, title, copy);
    }, item ? 160 : 0);
  }

  function syncSelection() {
    const options = Array.from(resultsEl.querySelectorAll<HTMLElement>('[data-search-result]'));
    options.forEach((option, index) => {
      const selected = index === selectedIndex;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-selected', String(selected));
      option.tabIndex = -1;
    });
    const item = selectedItem();
    setPreview(item);
    if (item) inputEl.setAttribute('aria-activedescendant', `catalogue-result-${selectedIndex}`);
    else inputEl.removeAttribute('aria-activedescendant');
  }

  function buildResult(item: SearchableItem, index: number): HTMLDivElement {
    const option = document.createElement('div');
    option.className = 'catalogue-search__result';
    option.dataset.searchResult = String(index);
    option.id = `catalogue-result-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(index === selectedIndex));
    option.tabIndex = -1;
    option.style.setProperty('--result-accent-light', item.kind === 'project' ? item.accentLight : 'var(--line-strong)');
    option.style.setProperty('--result-accent-dark', item.kind === 'project' ? item.accentDark : 'var(--line-strong)');

    const code = document.createElement('span'); code.className = 'catalogue-search__result-code'; code.textContent = item.code;
    const copy = document.createElement('span'); copy.className = 'catalogue-search__result-copy';
    const title = document.createElement('strong'); title.textContent = item.title;
    const descriptor = document.createElement('small'); descriptor.textContent = item.kind === 'project' ? item.subtitle : item.summary;
    copy.append(title, descriptor);
    const type = document.createElement('span'); type.className = 'catalogue-search__result-type'; type.textContent = item.kind === 'project' ? item.category : 'collection';
    option.append(code, copy, type);
    option.addEventListener('pointermove', () => {
      if (selectedIndex !== index) { selectedIndex = index; syncSelection(); }
    });
    option.addEventListener('click', () => { window.location.href = itemUrl(item); });
    return option;
  }

  function render() {
    randomPanelEl.hidden = true;
    const query = inputEl.value.trim();
    ranked = searchCatalogue(items, query, 20);
    selectedIndex = ranked.length ? 0 : -1;
    resultsEl.replaceChildren(...ranked.map(({ item }, index) => buildResult(item, index)));
    const projectCount = ranked.filter(({ item }) => item.kind === 'project').length;
    const collectionCount = ranked.length - projectCount;
    if (!query) statusEl.textContent = 'Type a project, topic, or project code.';
    else if (!ranked.length) statusEl.textContent = '0 matches / try another term or a random project.';
    else statusEl.textContent = `${String(ranked.length).padStart(2, '0')} matches / ${projectCount} projects / ${collectionCount} collections`;
    syncSelection();
  }

  function closeSearch() {
    inputEl.setAttribute('aria-expanded', 'false');
    if (!dialogEl.open) return;
    if (typeof dialogEl.close === 'function') dialogEl.close();
    else { dialogEl.removeAttribute('open'); dialogEl.dispatchEvent(new Event('close')); }
  }

  function activateSelected(external: boolean) {
    const item = selectedItem();
    if (!item) return;
    if (external && item.kind === 'project' && item.liveUrl) {
      window.location.href = item.liveUrl;
      return;
    }
    window.location.href = itemUrl(item);
  }

  async function renderRandom() {
    const currentPayload = await ensurePayload();
    const project = pickRandomProject(currentPayload.projects, Math.random, currentPayload.featured);
    if (!project) return;
    ranked = [];
    selectedIndex = -1;
    resultsEl.replaceChildren();
    randomPanelEl.hidden = false;
    randomCardEl.replaceChildren();
    const code = document.createElement('span'); code.className = 'meta'; code.textContent = project.code;
    const title = document.createElement('strong'); title.textContent = project.title;
    const details = document.createElement('a'); details.href = `/project/${project.slug}/`; details.textContent = 'Open details →';
    const reroll = document.createElement('button'); reroll.type = 'button'; reroll.textContent = 'Another project'; reroll.addEventListener('click', () => void renderRandom());
    randomCardEl.className = 'catalogue-search__random-card';
    randomCardEl.append(code, title, details, reroll);
    statusEl.textContent = `Random project / ${project.code}`;
    setPreview(project);
  }

  async function open(detail: SearchOpenDetail = {}) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((other) => { if (other !== dialogEl) other.close(); });
    if (!dialogEl.open) {
      if (typeof dialogEl.showModal === 'function') dialogEl.showModal();
      else dialogEl.setAttribute('open', '');
    }
    inputEl.setAttribute('aria-expanded', 'true');
    if (detail.query) inputEl.value = detail.query;
    try {
      await ensurePayload();
      if (detail.random) await renderRandom();
      else render();
    } catch {
      statusEl.textContent = 'Project search is unavailable. Project navigation remains available.';
      resultsEl.replaceChildren();
      randomPanelEl.hidden = true;
    }
    requestAnimationFrame(() => inputEl.focus());
  }

  document.addEventListener('keydown', (event) => {
    if (!dialogEl.open) return;
    const comboboxActive = document.activeElement === inputEl;
    if (comboboxActive && event.key === 'ArrowDown' && ranked.length) { event.preventDefault(); selectedIndex = Math.min(ranked.length - 1, selectedIndex + 1); syncSelection(); resultsEl.querySelector<HTMLElement>(`[data-search-result="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' }); }
    else if (comboboxActive && event.key === 'ArrowUp' && ranked.length) { event.preventDefault(); selectedIndex = Math.max(0, selectedIndex - 1); syncSelection(); resultsEl.querySelector<HTMLElement>(`[data-search-result="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' }); }
    else if (comboboxActive && event.key === 'Enter') { event.preventDefault(); activateSelected(event.metaKey || event.ctrlKey); }
    else if (event.key.toLowerCase() === 'r' && !inputEl.value.trim() && !comboboxActive) { event.preventDefault(); void renderRandom(); }
  });

  inputEl.addEventListener('input', render);
  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'R' && !inputEl.value.trim()) { event.preventDefault(); void renderRandom(); }
  });
  randomTriggerEl.addEventListener('click', () => void renderRandom());
  closeEl.addEventListener('click', closeSearch);
  dialogEl.addEventListener('click', (event) => { if (event.target === dialogEl) closeSearch(); });
  dialogEl.addEventListener('close', () => { inputEl.setAttribute('aria-expanded', 'false'); window.clearTimeout(previewTimer); returnFocus?.focus(); });

  return { open };
}

async function getController(): Promise<SearchController | null> {
  controllerPromise ??= (async () => {
    const root = getSearchRoot();
    return root ? await createController(root) : null;
  })();
  return controllerPromise;
}

export async function openCatalogueSearch(detail: SearchOpenDetail = {}): Promise<void> {
  const controller = await getController();
  await controller?.open(detail);
}
