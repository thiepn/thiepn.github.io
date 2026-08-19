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

function getOpenSearchDialog(): HTMLDialogElement | null {
  const dialog = document.querySelector<HTMLDialogElement>('[data-catalogue-search-dialog]');
  return dialog?.open ? dialog : null;
}

function getDialogFocusables(dialog: HTMLDialogElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
    return element.getClientRects().length > 0;
  });
}

function containDialogFocus(event: KeyboardEvent, dialog: HTMLDialogElement) {
  const focusables = getDialogFocusables(dialog);
  if (!focusables.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;

  if (!dialog.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
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
  const openDialog = getOpenSearchDialog();
  if (openDialog) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      openDialog.close();
      return;
    }
    if (event.key === 'Tab') {
      containDialogFocus(event, openDialog);
      return;
    }
  }

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
