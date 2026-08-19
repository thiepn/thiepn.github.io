interface SearchOpenDetail {
  query?: string;
  random?: boolean;
}

let modulePromise: Promise<typeof import('./catalogue-search')> | null = null;

function loadSearch() {
  modulePromise ??= import('./catalogue-search');
  return modulePromise;
}

async function open(detail: SearchOpenDetail = {}) {
  const module = await loadSearch();
  await module.openCatalogueSearch(detail);
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element
    ? event.target.closest<HTMLElement>('[data-catalogue-search-open]')
    : null;
  if (!target) return;
  event.preventDefault();
  void open({
    query: target.dataset.catalogueSearchQuery || '',
    random: target.hasAttribute('data-catalogue-search-random'),
  });
});

document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  const editable = target?.matches('input, textarea, select, [contenteditable="true"]');
  const command = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
  const slash = event.key === '/' && !editable;
  if (!command && !slash) return;
  const dialog = document.querySelector<HTMLDialogElement>('[data-catalogue-search-dialog]');
  if (dialog?.open) return;
  event.preventDefault();
  void open();
});

window.addEventListener('thiepn:search-open', ((event: CustomEvent<SearchOpenDetail>) => {
  void open(event.detail ?? {});
}) as EventListener);
