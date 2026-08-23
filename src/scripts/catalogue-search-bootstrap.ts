interface SearchOpenDetail {
  query?: string;
  returnFocus?: HTMLElement | null;
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

function getOpenSearchDialog() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-catalogue-search-dialog]');
  return dialog?.open ? dialog : null;
}

function getFocusableElements(dialog: HTMLDialogElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element
    ? event.target.closest<HTMLElement>('[data-catalogue-search-open]')
    : null;
  if (!target) return;
  event.preventDefault();
  const mobileMenu = target.closest<HTMLElement>('[data-mobile-menu]');
  const mobileTrigger = mobileMenu?.querySelector<HTMLElement>('[data-mobile-menu-open]') ?? null;
  void open({
    query: target.dataset.catalogueSearchQuery || '',
    returnFocus: mobileTrigger ?? target,
  });
});

document.addEventListener('keydown', (event) => {
  const dialog = getOpenSearchDialog();
  if (dialog) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.querySelector<HTMLButtonElement>('[data-catalogue-search-close]')?.click();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = getFocusableElements(dialog);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!first || !last) {
        event.preventDefault();
        dialog.querySelector<HTMLInputElement>('[data-catalogue-search-input]')?.focus();
        return;
      }

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    return;
  }

  const target = event.target as HTMLElement | null;
  const editable = target?.matches('input, textarea, select, [contenteditable="true"]');
  const command = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
  const slash = event.key === '/' && !editable;
  if (!command && !slash) return;
  event.preventDefault();
  void open({ returnFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null });
});

window.addEventListener('thiepn:search-open', ((event: CustomEvent<SearchOpenDetail>) => {
  void open(event.detail ?? {});
}) as EventListener);
