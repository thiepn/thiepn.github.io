for (const gallery of Array.from(document.querySelectorAll<HTMLElement>('[data-artifact-gallery]'))) {
  const dialog = gallery.querySelector('[data-gallery-dialog]');
  if (!(dialog instanceof HTMLDialogElement)) continue;
  const visual = dialog.querySelector('[data-gallery-dialog-visual]');
  const label = dialog.querySelector('[data-gallery-dialog-label]');
  const caption = dialog.querySelector('[data-gallery-dialog-caption]');
  let opener: HTMLElement | null = null;
  gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-open]').forEach((button) => {
    button.addEventListener('click', () => {
      opener = button;
      const source = button.querySelector('.gallery-figure__visual');
      if (visual && source) visual.replaceChildren(source.cloneNode(true));
      if (label) label.textContent = button.getAttribute('data-gallery-label') || 'FIGURE';
      if (caption) caption.textContent = button.getAttribute('data-gallery-caption') || '';
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  });
  const closeDialog = () => {
    if (!dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); dialog.dispatchEvent(new Event('close')); }
  };
  dialog.querySelector('[data-gallery-close]')?.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => { if (opener instanceof HTMLElement) opener.focus(); });
}

export {};
