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

// Animated previews stay lazy, but a first interaction can arrive while the
// controller chunk is loading. Track that intent explicitly instead of querying
// :hover after import; WebKit does not make that a reliable replay signal.
if (document.querySelector('[data-preview-root]')) {
  type PreviewIntent = {
    root: HTMLElement;
    target: Element;
    source: 'pointer' | 'focus';
    token: number;
  };

  let previewModulePromise: Promise<typeof import('./preview-controller')> | null = null;
  let previewReady = false;
  let previewIntent: PreviewIntent | null = null;
  let previewIntentToken = 0;

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

  const queuePreviewIntent = (event: PointerEvent | FocusEvent) => {
    if (previewReady) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const root = target.closest<HTMLElement>('[data-preview-root]');
    if (!root) return;
    const source = event.type === 'focusin' ? 'focus' : 'pointer';
    const token = ++previewIntentToken;
    previewIntent = { root, target, source, token };
    void loadPreviews().then((module) => {
      const intent = previewIntent;
      if (!intent || intent.token !== token) return;
      previewIntent = null;
      module.armPreviewFromTarget(intent.target, intent.source);
    });
  };

  const clearPreviewIntent = (event: PointerEvent | FocusEvent) => {
    if (previewReady || !previewIntent) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const root = target.closest<HTMLElement>('[data-preview-root]');
    if (!root || root !== previewIntent.root) return;
    const related = event.relatedTarget;
    if (related instanceof Node && root.contains(related)) return;
    previewIntent = null;
    previewIntentToken += 1;
  };

  document.addEventListener('pointerover', queuePreviewIntent, { passive: true });
  document.addEventListener('pointerout', clearPreviewIntent, { passive: true });
  document.addEventListener('focusin', queuePreviewIntent);
  document.addEventListener('focusout', clearPreviewIntent);
  idle('previews', () => loadPreviews(), 1000);
}

// Record inspection is secondary, but the first hover/focus must still work when
// it beats the idle import. Preserve the active capability until the controller
// is attached, then replay it directly rather than synthesizing browser events.
if (document.querySelector('[data-record-preview]')) {
  type RecordIntent = {
    button: HTMLButtonElement;
    source: 'pointer' | 'focus';
    token: number;
  };

  let recordModulePromise: Promise<typeof import('./record-preview-controller')> | null = null;
  let recordReady = false;
  let recordIntent: RecordIntent | null = null;
  let recordIntentToken = 0;

  const loadRecordPreview = () => {
    recordModulePromise ??= import('./record-preview-controller')
      .then((module) => {
        recordReady = true;
        return module;
      })
      .catch((error) => {
        recordModulePromise = null;
        throw error;
      });
    return recordModulePromise;
  };

  const queueRecordIntent = (event: PointerEvent | FocusEvent) => {
    if (recordReady) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('[data-capability-preview]');
    if (!button) return;
    const source = event.type === 'focusin' ? 'focus' : 'pointer';
    const token = ++recordIntentToken;
    recordIntent = { button, source, token };
    void loadRecordPreview().then((module) => {
      const intent = recordIntent;
      if (!intent || intent.token !== token) return;
      recordIntent = null;
      module.activateRecordPreviewFromTarget(intent.button);
    });
  };

  const clearRecordIntent = (event: PointerEvent | FocusEvent) => {
    if (recordReady || !recordIntent) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('[data-capability-preview]');
    if (!button || button !== recordIntent.button) return;
    const related = event.relatedTarget;
    if (related instanceof Node && button.contains(related)) return;
    recordIntent = null;
    recordIntentToken += 1;
  };

  document.addEventListener('pointerover', queueRecordIntent, { passive: true });
  document.addEventListener('pointerout', clearRecordIntent, { passive: true });
  document.addEventListener('focusin', queueRecordIntent);
  document.addEventListener('focusout', clearRecordIntent);
  idle('record-preview', () => loadRecordPreview(), 750);
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
