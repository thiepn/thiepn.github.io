const preview = document.querySelector<HTMLElement>('[data-record-preview]');
const label = document.querySelector<HTMLElement>('[data-record-preview-label]');
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-capability-preview]'));

if (preview && buttons.length) {
  const reset = () => {
    delete preview.dataset.recordPreviewVariant;
    if (label) label.textContent = 'PRIMARY PREVIEW';
  };
  const activate = (button: HTMLButtonElement) => {
    const variant = button.dataset.capabilityPreview;
    if (!variant) return;
    preview.dataset.recordPreviewVariant = variant;
    const title = button.querySelector('strong')?.textContent?.trim();
    if (label) label.textContent = title ? `STATE / ${title.toUpperCase()}` : `STATE / ${variant.toUpperCase()}`;
  };
  buttons.forEach((button) => {
    button.addEventListener('pointerenter', () => activate(button));
    button.addEventListener('pointerleave', reset);
    button.addEventListener('focus', () => activate(button));
    button.addEventListener('blur', reset);
  });
  window.addEventListener('pagehide', reset);
}

export {};
