const preview = document.querySelector<HTMLElement>('[data-record-preview]');
const label = document.querySelector<HTMLElement>('[data-record-preview-label]');
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-capability-preview]'));

const reset = () => {
  if (!preview) return;
  delete preview.dataset.recordPreviewVariant;
  if (label) label.textContent = 'PRIMARY PREVIEW';
};

const activate = (button: HTMLButtonElement) => {
  if (!preview) return;
  const variant = button.dataset.capabilityPreview;
  if (!variant) return;
  preview.dataset.recordPreviewVariant = variant;
  const title = button.querySelector('strong')?.textContent?.trim();
  if (label) label.textContent = title ? `STATE / ${title.toUpperCase()}` : `STATE / ${variant.toUpperCase()}`;
};

export function activateRecordPreviewFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>('[data-capability-preview]');
  if (!button || !buttons.includes(button)) return;
  activate(button);
}

if (preview && buttons.length) {
  buttons.forEach((button) => {
    button.addEventListener('pointerenter', () => activate(button));
    button.addEventListener('pointerleave', reset);
    button.addEventListener('focus', () => activate(button));
    button.addEventListener('blur', reset);
  });

  // If focus arrived before this lazy module finished loading, initialize from the
  // actual active element as a second line of defense in addition to runtime replay.
  activateRecordPreviewFromTarget(document.activeElement);
  window.addEventListener('pagehide', reset);
}
