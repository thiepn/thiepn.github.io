import { hubIdentity } from './portal-auth';
import type { HubIdentity } from '../lib/hub-auth';
import type { PrismBreakpoint } from '../lib/prism/block-registry';
import {
  bootstrapHomeDocument,
  createBrowserHomePersistence,
  HomeStore,
  homeDocumentStorageKey,
  readLegacyPreference,
} from '../lib/prism/home-store';
import { createDefaultHomeDocument, type HomeDocumentV2 } from '../lib/prism/home-document';
import { setActiveHomeStore } from '../lib/prism/home-runtime';

interface PrismAppManifestItem {
  slug: string;
  title: string;
  href: string;
  accentLight: string;
  accentDark: string;
}

const root = document.querySelector<HTMLElement>('[data-prism-home]');
if (root) {
  const homeRoot = root;
  const manifestNode = homeRoot.querySelector<HTMLScriptElement>('[data-prism-app-manifest]');
  const appGrid = homeRoot.querySelector<HTMLElement>('.prism-app-grid');
  const sectionsRoot = homeRoot.querySelector<HTMLElement>('.prism-home__grid');
  const defaultAppOrder = appGrid
    ? Array.from(appGrid.querySelectorAll<HTMLElement>('[data-prism-app]')).map((node) => node.dataset.prismApp!).filter(Boolean)
    : [];

  let manifest: PrismAppManifestItem[] = [];
  try {
    const value: unknown = JSON.parse(manifestNode?.textContent ?? '[]');
    if (Array.isArray(value)) {
      manifest = value.filter((item): item is PrismAppManifestItem => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const candidate = item as Record<string, unknown>;
        return ['slug', 'title', 'href', 'accentLight', 'accentDark'].every((key) => typeof candidate[key] === 'string');
      });
    }
  } catch {
    manifest = [];
  }

  const availableApps = manifest.map((app) => app.slug);
  let generation = 0;
  let store: HomeStore | null = null;
  let unsubscribeStore: (() => void) | null = null;
  let currentDocument = createDefaultHomeDocument();

  function breakpoint(): PrismBreakpoint {
    if (window.matchMedia('(max-width: 639px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1199px)').matches) return 'tablet';
    return 'desktop';
  }

  function fallbackMark(title: string) {
    return title.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('').slice(0, 2) || 'T';
  }

  function renderApps(order: unknown) {
    if (!appGrid) return;
    const requested = Array.isArray(order) && order.every((slug) => typeof slug === 'string') ? order : defaultAppOrder;
    const bySlug = new Map(manifest.map((app) => [app.slug, app]));
    const selected = [...new Set(requested)].flatMap((slug) => {
      const app = bySlug.get(slug);
      return app ? [app] : [];
    });
    for (const app of manifest) {
      if (selected.length >= 8) break;
      if (!selected.some((item) => item.slug === app.slug)) selected.push(app);
    }

    const nodes = selected.slice(0, 8).map((app) => {
      const link = document.createElement('a');
      link.className = 'prism-app';
      link.href = app.href;
      link.dataset.prismApp = app.slug;
      link.style.setProperty('--prism-app-accent', app.accentLight);
      link.style.setProperty('--prism-app-accent-dark', app.accentDark);

      const icon = document.createElement('span');
      icon.className = 'prism-app__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = fallbackMark(app.title);

      const label = document.createElement('span');
      label.className = 'prism-app__label';
      label.textContent = app.title;
      link.append(icon, label);
      return link;
    });
    appGrid.replaceChildren(...nodes);
  }

  function applyResponsiveLayout(document: HomeDocumentV2) {
    const active = breakpoint();
    const layout = document.layouts[active];
    homeRoot.dataset.prismBreakpoint = active;

    if (sectionsRoot) {
      const bySection = new Map(
        Array.from(sectionsRoot.querySelectorAll<HTMLElement>(':scope > [data-prism-section]'))
          .map((section) => [section.dataset.prismSection!, section] as const),
      );
      for (const sectionId of layout.sectionOrder) {
        const section = bySection.get(sectionId);
        if (section) sectionsRoot.append(section);
      }
    }

    for (const placement of layout.placements) {
      const block = homeRoot.querySelector<HTMLElement>(`[data-prism-block-id="${placement.blockId}"]`);
      if (!block) continue;
      block.dataset.prismSize = placement.size;
      block.style.gridColumn = `${placement.x + 1} / span ${placement.w}`;
      block.style.gridRow = `${placement.y + 1} / span ${placement.h}`;
    }
  }

  function applyAppearance(document: HomeDocumentV2) {
    const mode = document.appearance.mode;
    const resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;

    homeRoot.dataset.density = document.appearance.density;
    homeRoot.dataset.prismIntensity = document.appearance.intensity;
    homeRoot.dataset.prismMotion = document.appearance.motion;
    homeRoot.dataset.prismMode = mode;

    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    const themeColor = resolved === 'dark' ? '#0C0F13' : '#F7F8FA';
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor);
  }

  function applyDocument(document: HomeDocumentV2, source: string) {
    currentDocument = structuredClone(document);
    applyAppearance(document);
    homeRoot.dataset.prismHomeSource = source;

    for (const block of homeRoot.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      const id = block.dataset.prismBlockId;
      block.hidden = id ? document.blocks[id]?.hidden === true : false;
    }

    for (const section of homeRoot.querySelectorAll<HTMLElement>('[data-prism-section]')) {
      const blocks = Array.from(section.querySelectorAll<HTMLElement>('[data-prism-block-id]'));
      section.hidden = blocks.length > 0 && blocks.every((block) => block.hidden);
    }

    applyResponsiveLayout(document);
    renderApps(document.blocks['block-apps']?.settings.appOrder);
  }

  function attachStore(nextStore: HomeStore, source: string) {
    unsubscribeStore?.();
    store = nextStore;
    setActiveHomeStore(nextStore);
    applyDocument(nextStore.getSnapshot(), source);
    unsubscribeStore = nextStore.subscribe((document) => applyDocument(document, 'v2'));
  }

  function detachStore() {
    unsubscribeStore?.();
    unsubscribeStore = null;
    store = null;
    setActiveHomeStore(null);
  }

  async function loadIdentity(identity: HubIdentity) {
    const current = ++generation;
    detachStore();

    if (identity.status === 'checking' || identity.status === 'unavailable') {
      applyDocument(createDefaultHomeDocument(), identity.status);
      return;
    }

    const owner = identity.status === 'signed-in' ? identity.id : null;
    try {
      const persistence = createBrowserHomePersistence(localStorage, owner);
      const rawV2 = await persistence.load();
      const rawV1 = readLegacyPreference(localStorage, owner);
      const boot = bootstrapHomeDocument({ rawV2, rawV1, availableApps });
      if (current !== generation) return;

      const nextStore = new HomeStore(boot.document, persistence);
      attachStore(nextStore, boot.source);

      if (boot.source === 'v1') {
        try {
          await nextStore.replace(nextStore.getSnapshot());
          if (current !== generation) return;
          homeRoot.dataset.prismMigration = 'persisted';
        } catch {
          homeRoot.dataset.prismMigration = 'local-save-failed';
        }
      }
    } catch {
      if (current !== generation) return;
      detachStore();
      applyDocument(createDefaultHomeDocument(), 'storage-error');
      homeRoot.dataset.prismStorage = 'error';
    }
  }

  window.addEventListener('hub:identity', (event) => {
    const detail = (event as CustomEvent<HubIdentity>).detail;
    void loadIdentity(detail);
  });

  void loadIdentity(hubIdentity);

  window.addEventListener('storage', (event) => {
    const identity = hubIdentity;
    if (identity.status !== 'signed-in' && identity.status !== 'signed-out') return;
    const owner = identity.status === 'signed-in' ? identity.id : null;
    if (event.key !== homeDocumentStorageKey(owner)) return;
    void loadIdentity(identity);
  });

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  systemTheme.addEventListener('change', () => {
    if (currentDocument.appearance.mode === 'system') applyAppearance(currentDocument);
  });

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => applyResponsiveLayout(currentDocument));
  });

  window.addEventListener('prism:home-request-snapshot', () => {
    if (!store) return;
    window.dispatchEvent(new CustomEvent('prism:home-snapshot', { detail: store.getSnapshot() }));
  });
}
