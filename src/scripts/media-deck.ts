/** User-controlled previews: no autoplay, scrolling effects, or eager video requests. */
for (const root of document.querySelectorAll<HTMLElement>('[data-media-deck]')) {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-media-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-media-panel]'));
  const status = root.querySelector<HTMLElement>('[data-media-status]');
  if (!status || tabs.length !== panels.length || !tabs.length) continue;
  const announce = (text: string) => { status.textContent = text; };
  let playRevision = 0;
  const stopVideos = () => {
    playRevision++;
    for (const panel of panels) {
      const video = panel.querySelector<HTMLVideoElement>('video');
      if (!video) continue;
      video.pause();
      video.hidden = true;
      const button = panel.querySelector<HTMLButtonElement>('[data-demo-play]');
      if (button) button.textContent = 'Watch gameplay ▷';
    }
  };
  function select(index: number, focus = false) {
    if (!panels[index] || !tabs[index]) return;
    stopVideos();
    announce('');
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[i]!.hidden = !selected;
    });
    for (const image of panels[index]!.querySelectorAll<HTMLImageElement>('img')) image.loading = 'eager';
    if (focus) tabs[index]!.focus();
  }
  tabs.forEach((tab, index) => {
    tab.disabled = false;
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (target !== null) { event.preventDefault(); select(target, true); }
    });
    tab.addEventListener('pointerenter', () => {
      for (const image of panels[index]!.querySelectorAll<HTMLImageElement>('img')) image.loading = 'eager';
    });
  });
  for (const panel of panels) {
    const button = panel.querySelector<HTMLButtonElement>('[data-demo-play]');
    const video = panel.querySelector<HTMLVideoElement>('video');
    if (!button || !video) continue;
    button.disabled = false;
    button.addEventListener('click', async () => {
      announce('');
      if (!video.hidden) { stopVideos(); return; }
      if (!video.src) video.src = video.dataset.videoUrl!;
      video.hidden = false;
      video.currentTime = 0;
      button.textContent = 'Close preview ×';
      const revision = ++playRevision;
      try { await video.play(); }
      catch { if (revision !== playRevision) return; stopVideos(); announce('The recording could not play. The game is still available through the Play link.'); }
    });
    video.addEventListener('error', () => { stopVideos(); announce('The recording could not load. Open the project to play.'); });
    video.addEventListener('ended', () => { const hadFocus = document.activeElement === video; stopVideos(); if (hadFocus) button.focus(); });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopVideos(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries[0] && !entries[0].isIntersecting) stopVideos();
    }, { threshold: 0 });
    observer.observe(root);
  }
  root.dataset.ready = 'true';
}
