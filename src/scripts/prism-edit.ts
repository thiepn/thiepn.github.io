import {
  PRISM_BLOCK_REGISTRY,
  isPrismBlockType,
  type PrismBreakpoint,
  type PrismBlockSize,
} from '../lib/prism/block-registry';
import { moveBlock, moveBlockToIndex, orderedSectionPlacements, resizeBlock, setBlockHidden, setDensity, setIntensity, setMode, setMotion } from '../lib/prism/home-commands';
import { getActiveHomeStore, subscribeActiveHomeStore } from '../lib/prism/home-runtime';
import type { HomeStore } from '../lib/prism/home-store';

const root = document.querySelector<HTMLElement>('[data-prism-home]');
const toolbar = root?.querySelector<HTMLElement>('[data-prism-edit-toolbar]');
const undo = root?.querySelector<HTMLButtonElement>('[data-prism-undo]');
const done = root?.querySelector<HTMLButtonElement>('[data-prism-edit-done]');
const status = root?.querySelector<HTMLElement>('[data-prism-edit-status]');
const addOpen = root?.querySelector<HTMLButtonElement>('[data-prism-add-open]');
const addDialog = root?.querySelector<HTMLDialogElement>('[data-prism-add-dialog]');
const addClose = root?.querySelector<HTMLButtonElement>('[data-prism-add-close]');
const addButtons = root ? Array.from(root.querySelectorAll<HTMLButtonElement>('[data-prism-add-block]')) : [];
const addEmpty = root?.querySelector<HTMLElement>('[data-prism-add-empty]');
const layoutOpen = root?.querySelector<HTMLButtonElement>('[data-prism-layout-open]');
const layoutDialog = root?.querySelector<HTMLDialogElement>('[data-prism-layout-dialog]');
const layoutClose = root?.querySelector<HTMLButtonElement>('[data-prism-layout-close]');
const themeOpen = root?.querySelector<HTMLButtonElement>('[data-prism-theme-open]');
const themeDialog = root?.querySelector<HTMLDialogElement>('[data-prism-theme-dialog]');
const themeClose = root?.querySelector<HTMLButtonElement>('[data-prism-theme-close]');
const appearanceControls = root ? Array.from(root.querySelectorAll<HTMLSelectElement>('[data-prism-appearance]')) : [];
const visibilityInputs = root ? Array.from(root.querySelectorAll<HTMLInputElement>('[data-prism-block-visibility]')) : [];
const customizeTriggers = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-prism-customize-open]'));

if (root && toolbar && undo && done && status && addOpen && addDialog && addClose && addEmpty && layoutOpen && layoutDialog && layoutClose && themeOpen && themeDialog && themeClose) {
  const editRoot = root;
  const editToolbar = toolbar;
  const undoButton = undo;
  const doneButton = done;
  const statusNode = status;
  const addButton = addOpen;
  const addModal = addDialog;
  const addCloseButton = addClose;
  const addEmptyState = addEmpty;
  const layoutButton = layoutOpen;
  const layoutModal = layoutDialog;
  const layoutCloseButton = layoutClose;
  const themeButton = themeOpen;
  const themeModal = themeDialog;
  const themeCloseButton = themeClose;
  let store: HomeStore | null = getActiveHomeStore();
  let editing = false;
  let selectedId: string | null = null;
  let returnFocus: HTMLElement | null = null;
  let dragState: {
    pointerId: number;
    blockId: string;
    sectionId: string;
    startIndex: number;
    targetIndex: number;
    handle: HTMLButtonElement;
    block: HTMLElement;
  } | null = null;

  function breakpoint(): PrismBreakpoint {
    if (window.matchMedia('(max-width: 639px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1199px)').matches) return 'tablet';
    return 'desktop';
  }

  function announce(message: string) {
    statusNode.textContent = '';
    requestAnimationFrame(() => { statusNode.textContent = message; });
  }

  function titleFor(blockId: string): string {
    const type = editRoot.querySelector<HTMLElement>(`[data-prism-block-id="${blockId}"]`)?.dataset.prismBlock;
    return type && isPrismBlockType(type) ? PRISM_BLOCK_REGISTRY[type].title : 'Block';
  }

  function setSelected(blockId: string | null, focus = false) {
    selectedId = blockId;
    for (const block of editRoot.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      const selected = block.dataset.prismBlockId === blockId;
      if (selected) block.dataset.prismSelected = 'true';
      else delete block.dataset.prismSelected;
    }
    if (focus && blockId) editRoot.querySelector<HTMLElement>(`[data-prism-block-id="${blockId}"]`)?.focus();
  }

  function disableNormalInteractions() {
    for (const block of editRoot.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
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
    for (const block of editRoot.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
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
    for (const block of editRoot.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      if (block.querySelector('.prism-block-edit-controls')) continue;
      const type = block.dataset.prismBlock;
      const blockId = block.dataset.prismBlockId;
      if (!blockId || !isPrismBlockType(type)) continue;
      const definition = PRISM_BLOCK_REGISTRY[type];

      const controls = document.createElement('div');
      controls.className = 'prism-block-edit-controls';
      controls.setAttribute('aria-label', `${definition.title} layout controls`);

      const drag = document.createElement('button');
      drag.type = 'button';
      drag.dataset.prismDrag = '';
      drag.textContent = '⋮⋮';
      drag.setAttribute('aria-label', `Drag ${definition.title}`);

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

      controls.append(drag, earlier, later, size, hide);
      block.append(controls);

      drag.addEventListener('pointerdown', (event) => beginDrag(event, blockId, drag));
      drag.addEventListener('pointermove', updateDrag);
      drag.addEventListener('pointerup', (event) => finishDrag(event, true));
      drag.addEventListener('pointercancel', (event) => finishDrag(event, false));
      earlier.addEventListener('click', () => void mutateMove(blockId, -1));
      later.addEventListener('click', () => void mutateMove(blockId, 1));
      size.addEventListener('change', () => void mutateSize(blockId, size.value as PrismBlockSize));
      hide.addEventListener('click', () => void mutateVisibility(blockId, true));
    }
  }

  function clearDropPreview() {
    for (const block of editRoot.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      delete block.dataset.prismDropTarget;
      delete block.dataset.prismDragging;
    }
    delete editRoot.dataset.prismDragging;
  }

  function beginDrag(event: PointerEvent, blockId: string, handle: HTMLButtonElement) {
    if (!editing || !store || dragState) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const snapshot = store.getSnapshot();
    const active = breakpoint();
    const placement = snapshot.layouts[active].placements.find((item) => item.blockId === blockId);
    if (!placement) return;
    const order = orderedSectionPlacements(snapshot, active, placement.sectionId).map((item) => item.blockId);
    const startIndex = order.indexOf(blockId);
    const block = editRoot.querySelector<HTMLElement>(`[data-prism-block-id="${blockId}"]`);
    if (startIndex < 0 || !block) return;

    event.preventDefault();
    event.stopPropagation();
    handle.setPointerCapture(event.pointerId);
    dragState = {
      pointerId: event.pointerId,
      blockId,
      sectionId: placement.sectionId,
      startIndex,
      targetIndex: startIndex,
      handle,
      block,
    };
    block.dataset.prismDragging = 'true';
    editRoot.dataset.prismDragging = 'true';
    setSelected(blockId);
    announce(`Dragging ${titleFor(blockId)}.`);
  }

  function dragTargetIndex(event: PointerEvent): number {
    if (!dragState || !store) return 0;
    const snapshot = store.getSnapshot();
    const active = breakpoint();
    const order = orderedSectionPlacements(snapshot, active, dragState.sectionId)
      .map((item) => item.blockId)
      .filter((id) => id !== dragState!.blockId);

    let insertion = order.length;
    for (let index = 0; index < order.length; index += 1) {
      const id = order[index]!;
      const block = editRoot.querySelector<HTMLElement>(`[data-prism-block-id="${id}"]`);
      const rect = block?.getBoundingClientRect();
      if (!rect || block?.hidden) continue;

      const sameRow = event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (event.clientY < rect.top || (sameRow && event.clientX < rect.left + rect.width / 2)) {
        insertion = index;
        break;
      }
      if (sameRow && event.clientX >= rect.left + rect.width / 2) insertion = index + 1;
    }

    return Math.max(0, Math.min(insertion, order.length));
  }

  function updateDrag(event: PointerEvent) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();
    const targetIndex = dragTargetIndex(event);
    dragState.targetIndex = targetIndex;

    for (const block of editRoot.querySelectorAll<HTMLElement>('[data-prism-drop-target]')) {
      delete block.dataset.prismDropTarget;
    }

    const snapshot = store?.getSnapshot();
    if (!snapshot) return;
    const active = breakpoint();
    const order = orderedSectionPlacements(snapshot, active, dragState.sectionId)
      .map((item) => item.blockId)
      .filter((id) => id !== dragState!.blockId);
    const targetId = order[Math.min(targetIndex, Math.max(0, order.length - 1))];
    if (targetId) {
      editRoot.querySelector<HTMLElement>(`[data-prism-block-id="${targetId}"]`)?.setAttribute('data-prism-drop-target', 'true');
    }
  }

  function finishDrag(event: PointerEvent, commit: boolean) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();
    const completed = dragState;
    dragState = null;

    if (completed.handle.hasPointerCapture(event.pointerId)) completed.handle.releasePointerCapture(event.pointerId);
    clearDropPreview();

    if (!commit || !store || completed.targetIndex === completed.startIndex) {
      announce(commit ? 'Block position unchanged.' : 'Drag cancelled.');
      completed.handle.focus();
      return;
    }

    void (async () => {
      try {
        let moved = false;
        await store!.mutate((draft) => {
          moved = moveBlockToIndex(draft, breakpoint(), completed.blockId, completed.targetIndex);
        });
        if (moved) announce(`${titleFor(completed.blockId)} moved.`);
        refresh();
      } catch {
        announce('Could not save that drag.');
      } finally {
        completed.handle.focus();
      }
    })();
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

  async function mutateAppearance(control: HTMLSelectElement) {
    if (!store) return;
    const key = control.dataset.prismAppearance;
    try {
      await store.mutate((draft) => {
        if (key === 'mode' && ['system', 'light', 'dark'].includes(control.value)) {
          setMode(draft, control.value as 'system' | 'light' | 'dark');
        } else if (key === 'density' && ['compact', 'balanced', 'comfortable'].includes(control.value)) {
          setDensity(draft, control.value as 'compact' | 'balanced' | 'comfortable');
        } else if (key === 'intensity' && ['quiet', 'balanced', 'rich'].includes(control.value)) {
          setIntensity(draft, control.value as 'quiet' | 'balanced' | 'rich');
        } else if (key === 'motion' && ['reduced', 'balanced', 'expressive'].includes(control.value)) {
          setMotion(draft, control.value as 'reduced' | 'balanced' | 'expressive');
        } else {
          throw new Error('Unsupported appearance control');
        }
      });
      announce('Appearance saved.');
      refresh();
    } catch {
      announce('Could not save that appearance change.');
      refresh();
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
    undoButton.disabled = !store?.canUndo();

    for (const trigger of customizeTriggers) trigger.disabled = !store || editing;

    if (!snapshot) return;
    for (const input of visibilityInputs) {
      const block = snapshot.blocks[input.value];
      input.checked = Boolean(block && block.hidden !== true);
    }

    let hiddenAvailable = 0;
    for (const button of addButtons) {
      const blockId = button.dataset.prismAddBlock!;
      const block = snapshot.blocks[blockId];
      const canAdd = Boolean(block && block.hidden === true);
      button.disabled = !canAdd;
      button.textContent = canAdd ? 'Add' : 'On Home';
      button.closest<HTMLElement>('[data-prism-add-item]')?.toggleAttribute('data-prism-add-available', canAdd);
      if (canAdd) hiddenAvailable += 1;
    }
    addEmptyState.hidden = hiddenAvailable > 0;

    for (const control of appearanceControls) {
      const key = control.dataset.prismAppearance;
      if (key === 'mode') control.value = snapshot.appearance.mode;
      if (key === 'density') control.value = snapshot.appearance.density;
      if (key === 'intensity') control.value = snapshot.appearance.intensity;
      if (key === 'motion') control.value = snapshot.appearance.motion;
    }

    for (const block of editRoot.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
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
    editRoot.dataset.prismEditing = 'true';
    editToolbar.hidden = false;
    document.querySelector<HTMLDialogElement>('#prism-account-dialog')?.close();
    ensureControls();
    disableNormalInteractions();
    setSelected(null);
    refresh();
    doneButton.focus();
  }

  function exit() {
    if (!editing) return;
    editing = false;
    delete document.documentElement.dataset.prismEditing;
    delete editRoot.dataset.prismEditing;
    editToolbar.hidden = true;
    if (addModal.open) addModal.close();
    if (layoutModal.open) layoutModal.close();
    if (themeModal.open) themeModal.close();
    setSelected(null);
    restoreNormalInteractions();
    refresh();
    returnFocus?.focus();
    returnFocus = null;
  }

  customizeTriggers.forEach((trigger) => trigger.addEventListener('click', () => enter(trigger)));
  doneButton.addEventListener('click', exit);

  undoButton.addEventListener('click', () => void (async () => {
    if (!store) return;
    try {
      if (await store.undo()) announce('Last Home change undone.');
      refresh();
    } catch {
      announce('Could not undo that change.');
    }
  })());

  addButton.addEventListener('click', () => {
    refresh();
    if (!addModal.open) addModal.showModal();
    addCloseButton.focus();
  });
  addCloseButton.addEventListener('click', () => addModal.close());
  addModal.addEventListener('click', (event) => {
    if (event.target === addModal) addModal.close();
  });
  addButtons.forEach((button) => button.addEventListener('click', () => {
    const blockId = button.dataset.prismAddBlock;
    if (!blockId || button.disabled) return;
    void mutateVisibility(blockId, false);
  }));

  themeButton.addEventListener('click', () => {
    refresh();
    if (!themeModal.open) themeModal.showModal();
    themeCloseButton.focus();
  });
  themeCloseButton.addEventListener('click', () => themeModal.close());
  themeModal.addEventListener('click', (event) => {
    if (event.target === themeModal) themeModal.close();
  });
  appearanceControls.forEach((control) => control.addEventListener('change', () => {
    void mutateAppearance(control);
  }));

  layoutButton.addEventListener('click', () => {
    refresh();
    if (!layoutModal.open) layoutModal.showModal();
    layoutCloseButton.focus();
  });
  layoutCloseButton.addEventListener('click', () => layoutModal.close());
  layoutModal.addEventListener('click', (event) => {
    if (event.target === layoutModal) layoutModal.close();
  });

  visibilityInputs.forEach((input) => input.addEventListener('change', () => {
    void mutateVisibility(input.value, !input.checked);
  }));

  editRoot.addEventListener('click', (event) => {
    if (!editing) return;
    const target = event.target as Element;
    if (target.closest('.prism-block-edit-controls')) return;
    const block = target.closest<HTMLElement>('[data-prism-block-id]');
    if (!block) return;
    event.preventDefault();
    setSelected(block.dataset.prismBlockId ?? null, true);
  }, true);

  editRoot.addEventListener('keydown', (event) => {
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
    if (!editing || event.key !== 'Escape' || addModal.open || layoutModal.open || themeModal.open) return;
    if (dragState) {
      event.preventDefault();
      const synthetic = new PointerEvent('pointercancel', { pointerId: dragState.pointerId });
      finishDrag(synthetic, false);
      return;
    }
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
