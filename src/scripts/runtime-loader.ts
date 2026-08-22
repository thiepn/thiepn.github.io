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

// Motion is expressive rather than required. It starts after first paint and is
// skipped completely on pages without the Living Index.
if (document.querySelector('[data-living-index]')) {
  requestAnimationFrame(() => window.setTimeout(() => {
    once('living-index', () => import('./living-index-controller'));
    once('index-motion', () => import('./index-motion'));
  }, 0));
}

// Preview behavior is deliberately lower priority than navigation/search. Static
// project-specific posters are already present in the HTML.
if (document.querySelector('[data-preview-root]')) {
  idle('previews', () => import('./preview-controller'), 1000);
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
