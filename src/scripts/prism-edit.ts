import {
  PRISM_BLOCK_REGISTRY,
  isPrismBlockType,
  type PrismBreakpoint,
  type PrismBlockSize,
} from '../lib/prism/block-registry';
import { moveBlock, orderedSectionPlacements, resizeBlock, setBlockHidden } from '../lib/prism/home-commands';
import { getActiveHomeStore, subscribeActiveHomeStore } from '../lib/prism/home-runtime';
import type { HomeStore } from '../lib/prism/home-store';

const root = document.querySelector<HTMLElement>('[data-prism-home]');
const toolbar = root?.querySelector<HTMLElement>('[data-prism-edit-toolbar]');
const undo = root?.querySelector<HTMLButtonElement>('[data-prism-undo]');
const done = root?.querySelector<HTMLButtonElement>('[data-prism-edit-done]');
const status = root?.querySelector<HTMLElement>('[data-prism-edit-status]');
const layoutOpen = root?.querySelector<HTMLButtonElement>('[data-prism-layout-open]');
const layoutDialog = root?.querySelector<HTMLDialogElement>('[data-prism-layout-dialog]');
const layoutClose = root?.querySelector<HTMLButtonElement>('[data-prism-layout-close]');
const visibilityInputs = root ? Array.from(root.querySelectorAll<HTMLInputElement>('[data-prism-block-visibility]')) : [];
const customizeTriggers = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-prism-customize-open]'));

if (root && toolbar && undo && done && status && layoutOpen && layoutDialog && layoutClose) {
  let store: HomeStore | null = getActiveHomeStore();
  let editing = false;
  let selectedId: string | null = null;
  let returnFocus: HTMLElement | null = null;

  function breakpoint(): PrismBreakpoint {
    if (window.matchMedia('(max-width: 639px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1199px)').matches) return 'tablet';
    return 'desktop';
  }

  function announce(message: string) {
    status.textContent = '';
    requestAnimationFrame(() => { status.textContent = message; });
  }

  function titleFor(blockId: string): string {
    const type = root.querySelector<HTMLElement>(`[data-prism-block-id="${blockId}"]`)?.dataset.prismBlock;
    return type && isPrismBlockType(type) ? PRISM_BLOCK_REGISTRY[type].title : 'Block';
  }

  function setSelected(blockId: string | null, focus = false) {
    selectedId = blockId;
    for (const block of root.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      const selected = block.dataset.prismBlockId === blockId;
      if (selected) block.dataset.prismSelected = 'true';
      else delete block.dataset.prismSelected;
    }
    if (focus && blockId) root.querySelector<HTMLElement>(`[data-prism-block-id="${blockId}"]`)?.focus();
  }

  function disableNormalInteractions() {
    for (const block of root.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      block.tabIndex = 0;
      for (const node of block.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]')) {
        if (node.closest('.prism-block-edit-controls')) continue;
        if (node.hasAttribute('tabindex')) node.dataset.prismPreviousTabindex = node.getAttribute('tabindex') ?? '';
        else node.dataset.prismPreviousTabindex = '__none__';
        node.tabIndex = -1;
      }
    }
  }

  function restoreNormalInteractions() {
    for (const block of root.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      block.removeAttribute('tabindex');
      for (const node of block.querySelectorAll<HTMLElement>('[data-prism-previous-tabindex]')) {
        const previous = node.dataset.prismPreviousTabindex;
        if (previous === '__none__') node.removeAttribute('tabindex');
        else if (previous !== undefined) node.setAttribute('tabindex', previous);
        delete node.dataset.prismPreviousTabindex;
      }
    }
  }

  function ensureControls() {
    for (const block of root.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      if (block.querySelector('.prism-block-edit-controls')) continue;
      const type = block.dataset.prismBlock;
      const blockId = block.dataset.prismBlockId;
      if (!blockId || !isPrismBlockType(type)) continue;
      const definition = PRISM_BLOCK_REGISTRY[type];

      const controls = document.createElement('div');
      controls.className = 'prism-block-edit-controls';
      controls.setAttribute('aria-label', `${definition.title} layout controls`);

      const earlier = document.createElement('button');
      earlier.type = 'button';
      earlier.dataset.prismMove = '-1';
      earlier.textContent = '←';
      earlier.setAttribute('aria-label', `Move ${definition.title} earlier`);

      const later = document.createElement('button');
      later.type = 'button';
      later.dataset.prismMove = '1';
      later.textContent = '→';
      later.setAttribute('aria-label', `Move ${definition.title} later`);

      const size = document.createElement('select');
      size.dataset.prismSizeControl = '';
      size.setAttribute('aria-label', `${definition.title} size`);
      for (const value of definition.supportedSizes) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value.toUpperCase();
        size.append(option);
      }

      const hide = document.createElement('button');
      hide.type = 'button';
      hide.dataset.prismHide = '';
      hide.textContent = 'Hide';
      hide.setAttribute('aria-label', `Hide ${definition.title}`);

      controls.append(earlier, later, size, hide);
      block.append(controls);

      earlier.addEventListener('click', () => void mutateMove(blockId, -1));
      later.addEventListener('click', () => void mutateMove(blockId, 1));
      size.addEventListener('change', () => void mutateSize(blockId, size.value as PrismBlockSize));
      hide.addEventListener('click', () => void mutateVisibility(blockId, true));
    }
  }

  async function mutateMove(blockId: string, direction: -1 | 1) {
    if (!store) return;
    try {
      let moved = false;
      await store.mutate((draft) => { moved = moveBlock(draft, breakpoint(), blockId, direction); });
      if (moved) announce(`${titleFor(blockId)} moved.`);
      refresh();
    } catch {
      announce('Could not save that move.');
    }
  }

  async function mutateSize(blockId: string, size: PrismBlockSize) {
    if (!store) return;
    try {
      let changed = false;
      await store.mutate((draft) => { changed = resizeBlock(draft, breakpoint(), blockId, size); });
      if (changed) announce(`${titleFor(blockId)} resized to ${size.toUpperCase()}.`);
      refresh();
    } catch {
      announce('Could not save that size.');
    }
  }

  async function mutateVisibility(blockId: string, hidden: boolean) {
    if (!store) return;
    try {
      await store.mutate((draft) => { setBlockHidden(draft, blockId, hidden); });
      if (hidden && selectedId === blockId) setSelected(null);
      announce(`${titleFor(blockId)} ${hidden ? 'hidden' : 'shown'}.`);
      refresh();
    } catch {
      announce('Could not save that visibility change.');
    }
  }

  function refresh() {
    const snapshot = store?.getSnapshot();
    const active = breakpoint();
    undo.disabled = !store?.canUndo();

    for (const trigger of customizeTriggers) trigger.disabled = !store || editing;

    if (!snapshot) return;
    for (const input of visibilityInputs) {
      const block = snapshot.blocks[input.value];
      input.checked = Boolean(block && block.hidden !== true);
    }

    for (const block of root.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      const blockId = block.dataset.prismBlockId!;
      const placement = snapshot.layouts[active].placements.find((item) => item.blockId === blockId);
      const controls = block.querySelector<HTMLElement>('.prism-block-edit-controls');
      if (!placement || !controls) continue;

      const ordered = orderedSectionPlacements(snapshot, active, placement.sectionId);
      const index = ordered.findIndex((item) => item.blockId === blockId);
      const earlier = controls.querySelector<HTMLButtonElement>('[data-prism-move="-1"]');
      const later = controls.querySelector<HTMLButtonElement>('[data-prism-move="1"]');
      const size = controls.querySelector<HTMLSelectElement>('[data-prism-size-control]');
      if (earlier) earlier.disabled = index <= 0;
      if (later) later.disabled = index < 0 || index >= ordered.length - 1;
      if (size) size.value = placement.size;
    }
  }

  function enter(trigger: HTMLElement) {
    if (!store || editing) return;
    editing = true;
    returnFocus = trigger;
    document.documentElement.dataset.prismEditing = 'true';
    root.dataset.prismEditing = 'true';
    toolbar.hidden = false;
    document.querySelector<HTMLDialogElement>('#prism-account-dialog')?.close();
    ensureControls();
    disableNormalInteractions();
    setSelected(null);
    refresh();
    done.focus();
  }

  function exit() {
    if (!editing) return;
    editing = false;
    delete document.documentElement.dataset.prismEditing;
    delete root.dataset.prismEditing;
    toolbar.hidden = true;
    if (layoutDialog.open) layoutDialog.close();
    setSelected(null);
    restoreNormalInteractions();
    refresh();
    returnFocus?.focus();
    returnFocus = null;
  }

  customizeTriggers.forEach((trigger) => trigger.addEventListener('click', () => enter(trigger)));
  done.addEventListener('click', exit);

  undo.addEventListener('click', () => void (async () => {
    if (!store) return;
    try {
      if (await store.undo()) announce('Last Home change undone.');
      refresh();
    } catch {
      announce('Could not undo that change.');
    }
  })());

  layoutOpen.addEventListener('click', () => {
    refresh();
    if (!layoutDialog.open) layoutDialog.showModal();
    layoutClose.focus();
  });
  layoutClose.addEventListener('click', () => layoutDialog.close());
  layoutDialog.addEventListener('click', (event) => {
    if (event.target === layoutDialog) layoutDialog.close();
  });

  visibilityInputs.forEach((input) => input.addEventListener('change', () => {
    void mutateVisibility(input.value, !input.checked);
  }));

  root.addEventListener('click', (event) => {
    if (!editing) return;
    const target = event.target as Element;
    if (target.closest('.prism-block-edit-controls')) return;
    const block = target.closest<HTMLElement>('[data-prism-block-id]');
    if (!block) return;
    event.preventDefault();
    setSelected(block.dataset.prismBlockId ?? null, true);
  }, true);

  root.addEventListener('keydown', (event) => {
    if (!editing) return;
    const target = event.target as HTMLElement;
    const block = target.closest<HTMLElement>('[data-prism-block-id]');
    if (!block || target.closest('.prism-block-edit-controls')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelected(block.dataset.prismBlockId ?? null);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!editing || event.key !== 'Escape' || layoutDialog.open) return;
    if (selectedId) {
      event.preventDefault();
      setSelected(null);
      return;
    }
    event.preventDefault();
    exit();
  });

  subscribeActiveHomeStore((nextStore) => {
    if (store !== nextStore && editing) exit();
    store = nextStore;
    refresh();
  });

  window.addEventListener('resize', () => {
    if (editing) refresh();
  });

  refresh();
}
