import { hubIdentity } from './portal-auth';
import type { HubIdentity } from '../lib/hub-auth';
import {
  bootstrapHomeDocument,
  createBrowserHomePersistence,
  HomeStore,
  readLegacyPreference,
} from '../lib/prism/home-store';
import { createDefaultHomeDocument, type HomeDocumentV2 } from '../lib/prism/home-document';

interface PrismAppManifestItem {
  slug: string;
  title: string;
  href: string;
  accentLight: string;
  accentDark: string;
}

const root = document.querySelector<HTMLElement>('[data-prism-home]');
if (root) {
  const manifestNode = root.querySelector<HTMLScriptElement>('[data-prism-app-manifest]');
  const appGrid = root.querySelector<HTMLElement>('.prism-app-grid');
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

  function fallbackMark(title: string) {
    return title.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('').slice(0, 2) || 'T';
  }

  function renderApps(order: unknown) {
    if (!appGrid || !Array.isArray(order) || !order.every((slug) => typeof slug === 'string')) return;
    const bySlug = new Map(manifest.map((app) => [app.slug, app]));
    const selected = [...new Set(order)].flatMap((slug) => {
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

  function applyDocument(document: HomeDocumentV2, source: string) {
    root.dataset.density = document.appearance.density;
    root.dataset.prismHomeSource = source;

    for (const block of root.querySelectorAll<HTMLElement>('[data-prism-block-id]')) {
      const id = block.dataset.prismBlockId;
      block.hidden = id ? document.blocks[id]?.hidden === true : false;
    }

    const appOrder = document.blocks['block-apps']?.settings.appOrder;
    if (appOrder !== undefined) renderApps(appOrder);
  }

  async function loadIdentity(identity: HubIdentity) {
    const current = ++generation;
    store = null;

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
      store = nextStore;
      applyDocument(nextStore.getSnapshot(), boot.source);

      if (boot.source === 'v1') {
        try {
          await nextStore.replace(nextStore.getSnapshot());
          if (current !== generation) return;
          root.dataset.prismMigration = 'persisted';
        } catch {
          root.dataset.prismMigration = 'local-save-failed';
        }
      }
    } catch {
      if (current !== generation) return;
      applyDocument(createDefaultHomeDocument(), 'storage-error');
      root.dataset.prismStorage = 'error';
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
    const persistence = createBrowserHomePersistence(localStorage, owner);
    void persistence.load().then((raw) => {
      if (event.newValue !== raw) return;
      void loadIdentity(identity);
    }).catch(() => {});
  });

  window.addEventListener('prism:home-request-snapshot', () => {
    if (!store) return;
    window.dispatchEvent(new CustomEvent('prism:home-snapshot', { detail: store.getSnapshot() }));
  });
}
