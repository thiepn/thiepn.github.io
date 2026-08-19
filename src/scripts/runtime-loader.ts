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

// Collection map JS is loaded only as the relationship field approaches view.
const collectionMap = document.querySelector<HTMLElement>('[data-collection-map]');
if (collectionMap) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      once('collection-map', () => import('./collection-map-controller'));
    }, { rootMargin: '400px 0px' });
    observer.observe(collectionMap);
  } else {
    idle('collection-map', () => import('./collection-map-controller'), 900);
  }
}


// Gallery inspection is below the record hero and loads only when the gallery approaches.
const gallery = document.querySelector<HTMLElement>('[data-artifact-gallery]');
if (gallery) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      once('gallery', () => import('./gallery-controller'));
    }, { rootMargin: '500px 0px' });
    observer.observe(gallery);
  } else {
    idle('gallery', () => import('./gallery-controller'), 1000);
  }
}

// Performance diagnostics are opt-in and therefore cost nothing for normal users.
if (new URLSearchParams(location.search).get('debug') === 'perf') {
  idle('perf-debug', () => import('./perf-debug'), 1200);
}
