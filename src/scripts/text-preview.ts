import { cleanPreviewText, characterCount, PREVIEW_EXAMPLE } from '../lib/text-preview';

for (const root of document.querySelectorAll<HTMLElement>('[data-text-preview]')) {
  const input = root.querySelector<HTMLTextAreaElement>('[data-preview-input]')!;
  const output = root.querySelector<HTMLTextAreaElement>('[data-preview-output]')!;
  const status = root.querySelector<HTMLElement>('[data-preview-status]')!;
  const count = root.querySelector<HTMLElement>('[data-preview-count]')!;
  const copy = root.querySelector<HTMLButtonElement>('[data-preview-copy]')!;
  const reset = root.querySelector<HTMLButtonElement>('[data-preview-reset]')!;
  let revision = 0;
  const update = () => {
    revision++;
    output.value = cleanPreviewText(input.value);
    const removed = characterCount(input.value) - characterCount(output.value);
    count.textContent = `${Math.max(0, removed)} ${removed === 1 ? 'character' : 'characters'} removed`;
    copy.disabled = output.value.length === 0;
    status.textContent = '';
  };
  input.addEventListener('input', update);
  reset.addEventListener('click', () => {
    input.value = PREVIEW_EXAMPLE;
    update();
    input.focus();
    status.textContent = 'Example restored.';
  });
  copy.addEventListener('click', async () => {
    const value = output.value;
    const copiedRevision = revision;
    if (!value) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (revision === copiedRevision) status.textContent = 'Cleaned text copied.';
    } catch {
      if (revision !== copiedRevision) return;
      output.focus();
      output.select();
      status.textContent = 'Clipboard access is unavailable. The result is selected; copy it manually.';
    }
  });
  input.disabled = false;
  reset.disabled = false;
  update();
  root.dataset.ready = 'true';
}
