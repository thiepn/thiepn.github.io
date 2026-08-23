const preview = document.querySelector<HTMLElement>('[data-record-preview]');
const label = document.querySelector<HTMLElement>('[data-record-preview-label]');
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-capability-preview]'));
const defaultLabel = label?.dataset.recordPreviewDefault || label?.textContent?.trim() || 'PRIMARY PREVIEW';
let selectedButton: HTMLButtonElement | null = null;

function setSelection(button: HTMLButtonElement | null) {
  selectedButton = button;
  buttons.forEach((candidate) => {
    const selected = candidate === button;
    candidate.classList.toggle('is-selected', selected);
    candidate.setAttribute('aria-pressed', selected ? 'true' : 'false');
    const signal = candidate.querySelector<HTMLElement>('[data-capability-signal]');
    if (signal) signal.textContent = selected ? 'Selected' : 'Inspect →';
  });
}

const reset = () => {
  if (!preview) return;
  delete preview.dataset.recordPreviewVariant;
  if (label) label.textContent = defaultLabel;
};

const activate = (button: HTMLButtonElement) => {
  if (!preview) return;
  const variant = button.dataset.capabilityPreview;
  if (!variant) return;
  preview.dataset.recordPreviewVariant = variant;
  const title = button.dataset.capabilityTitle || button.querySelector('strong')?.textContent?.trim();
  if (label) label.textContent = title ? `STATE / ${title.toUpperCase()}` : `STATE / ${variant.toUpperCase()}`;
};

const restoreSelected = () => {
  if (selectedButton) activate(selectedButton);
  else reset();
};

function buttonFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>('[data-capability-preview]');
  return button && buttons.includes(button) ? button : null;
}

export function activateRecordPreviewFromTarget(target: EventTarget | null) {
  const button = buttonFromTarget(target);
  if (button) activate(button);
}

export function selectRecordPreviewFromTarget(target: EventTarget | null) {
  const button = buttonFromTarget(target);
  if (!button) return;
  if (selectedButton === button) {
    setSelection(null);
    reset();
    return;
  }
  setSelection(button);
  activate(button);
}

if (preview && buttons.length) {
  buttons.forEach((button) => {
    button.addEventListener('pointerenter', () => activate(button));
    button.addEventListener('pointerleave', restoreSelected);
    button.addEventListener('focus', () => activate(button));
    button.addEventListener('blur', restoreSelected);
    button.addEventListener('click', () => selectRecordPreviewFromTarget(button));
  });

  // If focus arrived before this lazy module finished loading, initialize from the
  // actual active element as a second line of defense in addition to runtime replay.
  activateRecordPreviewFromTarget(document.activeElement);
  window.addEventListener('pagehide', reset);
}
