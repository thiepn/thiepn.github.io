import './catalogue-search-bootstrap';

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
};

const win = window as IdleWindow;
const loaded = new Set<string>();

function once(key: string, loader: () => Promise<unknown>) {
  if (loaded.has(key)) return;
  loaded.add(key);
  void loader().catch(() => loaded.delete(key));
}

function idle(key: string, loader: () => Promise<unknown>, timeout = 900) {
  const run = () => once(key, loader);
  if (win.requestIdleCallback) win.requestIdleCallback(run, { timeout });
  else window.setTimeout(run, Math.min(timeout, 250));
}

// Interactive archive controls are above the fold on /projects/ and lower on the
// homepage. Load after first paint so catalogue HTML is never blocked by JS.
if (document.querySelector('[data-project-archive]')) {
  requestAnimationFrame(() => once('archive', () => import('./archive-controller')));
}

// Homepage motion remains independent from the retired Living Index. The scanner
// may disappear or be feature-gated without silently disabling the hero entrance
// and section reveals that belong to the portfolio homepage itself.
if (document.querySelector('[data-index-hero]')) {
  requestAnimationFrame(() => once('index-motion', () => import('./index-motion')));
}
if (document.querySelector('[data-living-index]')) {
  requestAnimationFrame(() => once('living-index', () => import('./living-index-controller')));
}

// Animated previews stay lazy, but first interaction must never be lost while the
// controller chunk is still loading. Capture the initial pointer/focus intent,
// import the controller, then replay that intent only if it is still relevant.
if (document.querySelector('[data-preview-root]')) {
  let previewModulePromise: Promise<typeof import('./preview-controller')> | null = null;
  let previewReady = false;
  const loadPreviews = () => {
    previewModulePromise ??= import('./preview-controller')
      .then((module) => {
        previewReady = true;
        return module;
      })
      .catch((error) => {
        previewModulePromise = null;
        throw error;
      });
    return previewModulePromise;
  };

  const replayPreviewIntent = (event: PointerEvent | FocusEvent) => {
    if (previewReady) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const root = target.closest<HTMLElement>('[data-preview-root]');
    if (!root) return;
    const source = event.type === 'focusin' ? 'focus' : 'pointer';
    void loadPreviews().then((module) => {
      if (source === 'pointer' && !root.matches(':hover')) return;
      if (source === 'focus' && !root.contains(document.activeElement)) return;
      module.armPreviewFromTarget(target, source);
    });
  };

  document.addEventListener('pointerover', replayPreviewIntent, { passive: true });
  document.addEventListener('focusin', replayPreviewIntent);
  idle('previews', () => loadPreviews(), 1000);
}

// Record inspection is a secondary interaction below the record hero.
if (document.querySelector('[data-record-preview]')) {
  idle('record-preview', () => import('./record-preview-controller'), 750);
}

// Collection map JS is normally loaded only as the secondary relationship view
// approaches the viewport. Keyboard focus is a higher-priority signal: import the
// controller immediately on focusin so a fast tab/automation path cannot outrun
// the lazy IntersectionObserver callback.
const collectionMap = document.querySelector<HTMLElement>('[data-collection-map]');
if (collectionMap) {
  const loadCollectionMap = () => once('collection-map', () => import('./collection-map-controller'));
  collectionMap.addEventListener('focusin', loadCollectionMap, { once: true });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadCollectionMap();
    }, { rootMargin: '400px 0px' });
    observer.observe(collectionMap);
  } else {
    idle('collection-map', () => import('./collection-map-controller'), 900);
  }
}

// Gallery controls must already be wired when a keyboard or touch user reaches
// them. Import the tiny controller after first paint rather than waiting for an
// IntersectionObserver callback that can race immediate activation.
if (document.querySelector('[data-artifact-gallery]')) {
  requestAnimationFrame(() => once('gallery', () => import('./gallery-controller')));
}

// Performance diagnostics are opt-in and therefore cost nothing for normal users.
if (new URLSearchParams(location.search).get('debug') === 'perf') {
  idle('perf-debug', () => import('./perf-debug'), 1200);
}
