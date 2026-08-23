function keepFocusVisible(element: HTMLElement) {
  const header = document.querySelector<HTMLElement>('.site-header');
  const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
  const rect = element.getBoundingClientRect();
  const safeTop = headerBottom + 12;
  if (rect.top < safeTop) {
    window.scrollBy({ top: rect.top - safeTop, left: 0, behavior: 'auto' });
  }
}

for (const gallery of Array.from(document.querySelectorAll<HTMLElement>('[data-artifact-gallery]'))) {
  const dialog = gallery.querySelector('[data-gallery-dialog]');
  if (!(dialog instanceof HTMLDialogElement)) continue;
  const visual = dialog.querySelector('[data-gallery-dialog-visual]');
  const label = dialog.querySelector('[data-gallery-dialog-label]');
  const caption = dialog.querySelector('[data-gallery-dialog-caption]');
  const position = dialog.querySelector('[data-gallery-dialog-position]');
  const previousButton = dialog.querySelector<HTMLButtonElement>('[data-gallery-previous]');
  const nextButton = dialog.querySelector<HTMLButtonElement>('[data-gallery-next]');
  const openers = Array.from(gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-open]'));
  let opener: HTMLElement | null = null;
  let currentIndex = 0;

  const renderView = (index: number) => {
    const button = openers[index];
    if (!button) return;
    currentIndex = index;
    const source = button.querySelector('.gallery-figure__visual');
    if (visual && source) visual.replaceChildren(source.cloneNode(true));
    if (label) label.textContent = button.getAttribute('data-gallery-label') || 'FIGURE';
    if (caption) caption.textContent = button.getAttribute('data-gallery-caption') || '';
    if (position) position.textContent = `${String(index + 1).padStart(2, '0')} / ${String(openers.length).padStart(2, '0')}`;

    const previousWasFocused = document.activeElement === previousButton;
    const nextWasFocused = document.activeElement === nextButton;
    if (previousButton) previousButton.disabled = index === 0;
    if (nextButton) nextButton.disabled = index === openers.length - 1;

    // Chromium may drop focus when the currently focused navigation button becomes
    // disabled at a boundary. Hand focus to the still-enabled opposite control so
    // subsequent ArrowLeft/ArrowRight input remains inside the modal inspector.
    if (previousWasFocused && previousButton?.disabled && nextButton && !nextButton.disabled) nextButton.focus();
    if (nextWasFocused && nextButton?.disabled && previousButton && !previousButton.disabled) previousButton.focus();
  };

  const openView = (button: HTMLButtonElement, index: number) => {
    opener = button;
    renderView(index);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };

  openers.forEach((button, index) => {
    button.addEventListener('focus', () => {
      keepFocusVisible(button);
      requestAnimationFrame(() => keepFocusVisible(button));
    });
    button.addEventListener('click', () => openView(button, index));
  });

  const closeDialog = () => {
    if (!dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); dialog.dispatchEvent(new Event('close')); }
  };

  previousButton?.addEventListener('click', () => renderView(Math.max(0, currentIndex - 1)));
  nextButton?.addEventListener('click', () => renderView(Math.min(openers.length - 1, currentIndex + 1)));
  dialog.querySelector('[data-gallery-close]')?.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' && currentIndex > 0) {
      event.preventDefault();
      renderView(currentIndex - 1);
    }
    if (event.key === 'ArrowRight' && currentIndex < openers.length - 1) {
      event.preventDefault();
      renderView(currentIndex + 1);
    }
  });
  dialog.addEventListener('close', () => { if (opener instanceof HTMLElement) opener.focus(); });
}

export {};
