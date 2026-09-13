import '../styles/account-platform.css';
import {
  THIEPN_PLATFORM_VERSION,
  createAccountClient,
  type ThiepnEcosystemApp,
  type ThiepnPlatformSnapshot,
} from '../../packages/account-sdk/index.js';

const root = document.querySelector<HTMLElement>('[data-account-root]');
const signedIn = document.querySelector<HTMLElement>('[data-account-signed-in]');
const client = createAccountClient();

let currentState: ThiepnEcosystemApp[] = [];
let loading = false;

function qs<T extends Element>(selector: string, scope: ParentNode = document): T | null {
  return scope.querySelector<T>(selector);
}

function setStatus(message: string, tone: 'neutral' | 'success' | 'error' = 'neutral'): void {
  const element = qs<HTMLElement>('[data-a4-platform-status]');
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
  element.hidden = message.length === 0;
}

function mountSurface(): void {
  if (!root || root.dataset.a4PlatformMounted === 'true') return;
  root.dataset.a4PlatformMounted = 'true';

  const appsSection = qs<HTMLElement>('.account-apps-section', root);
  if (!appsSection) return;

  const section = document.createElement('section');
  section.className = 'account-platform-section';
  section.dataset.a4Platform = '';
  section.setAttribute('aria-labelledby', 'account-platform-heading');
  section.innerHTML = `
    <div class="account-platform-section__head">
      <div>
        <p class="section-index">Platform</p>
        <h2 id="account-platform-heading">One identity, explicit app boundaries.</h2>
        <p>The ecosystem registry tells every first-party app how it participates in THIEPN Account without creating a shared pool of application data.</p>
      </div>
      <span class="account-platform-version">Platform v${THIEPN_PLATFORM_VERSION}</span>
    </div>

    <div class="account-platform-metrics" aria-label="Ecosystem summary">
      <div class="account-platform-metric"><span>Registered apps</span><strong data-a4-app-count>—</strong></div>
      <div class="account-platform-metric"><span>Connected</span><strong data-a4-connected-count>—</strong></div>
      <div class="account-platform-metric"><span>Identity</span><strong>Shared</strong></div>
      <div class="account-platform-metric"><span>App data</span><strong>Isolated</strong></div>
    </div>

    <ul class="account-platform-apps" data-a4-platform-apps aria-label="Registered THIEPN apps"></ul>

    <div class="account-platform-export">
      <div>
        <h3>Export platform metadata</h3>
        <p>Downloads your THIEPN Account profile, app registry/connection metadata and current assurance level. Notes, Diet and WORDSTRIKE content is deliberately excluded.</p>
      </div>
      <button class="account-secondary-button" type="button" data-a4-platform-export>Export JSON</button>
    </div>
    <p class="account-platform-status" data-a4-platform-status aria-live="polite" hidden></p>
  `;

  appsSection.insertAdjacentElement('afterend', section);
}

function formatDate(value: string | null): string {
  if (!value) return 'No account activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Activity date unavailable';
  return `Last account activity ${new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)}`;
}

function renderState(apps: ThiepnEcosystemApp[]): void {
  currentState = apps;
  const count = qs<HTMLElement>('[data-a4-app-count]');
  const connected = qs<HTMLElement>('[data-a4-connected-count]');
  if (count) count.textContent = String(apps.length);
  if (connected) connected.textContent = String(apps.filter((app) => app.connected).length);

  const list = qs<HTMLUListElement>('[data-a4-platform-apps]');
  if (!list) return;
  list.replaceChildren();

  apps.forEach((app) => {
    const item = document.createElement('li');
    item.className = 'account-platform-app';
    item.dataset.appSlug = app.app_slug;

    const copy = document.createElement('div');
    copy.className = 'account-platform-app__copy';
    const name = document.createElement('strong');
    name.textContent = app.name;
    const meta = document.createElement('small');
    meta.textContent = `${formatDate(app.last_used_at)} · manifest v${app.manifest_version} · data ${app.data_scope}`;
    copy.append(name, meta);

    const state = document.createElement('span');
    state.className = 'account-platform-app__state';
    state.dataset.connected = app.connected ? 'true' : 'false';
    state.textContent = app.connected ? 'Connected' : 'Available';

    item.append(copy, state);
    list.append(item);
  });
}

function downloadSnapshot(snapshot: ThiepnPlatformSnapshot): void {
  const body = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([body], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `thiepn-account-platform-${date}.json`;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function refreshPlatform(): Promise<void> {
  if (loading || !client.readSession()) return;
  loading = true;
  setStatus('Loading ecosystem platform…');
  try {
    const apps = await client.getEcosystemState();
    renderState(Array.isArray(apps) ? apps : []);
    setStatus('');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not load the ecosystem platform.', 'error');
  } finally {
    loading = false;
  }
}

function bindExport(): void {
  const button = qs<HTMLButtonElement>('[data-a4-platform-export]');
  button?.addEventListener('click', async () => {
    if (!client.readSession()) {
      setStatus('Sign in first.', 'error');
      return;
    }
    button.disabled = true;
    setStatus('Preparing platform export…');
    try {
      const snapshot = await client.exportPlatformSnapshot();
      downloadSnapshot(snapshot);
      setStatus(`Platform metadata exported for ${currentState.length} registered apps. App-owned content was not included.`, 'success');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not export platform metadata.', 'error');
    } finally {
      button.disabled = false;
    }
  });
}

function observeSignedInState(): void {
  if (!signedIn) return;
  const observer = new MutationObserver(() => {
    if (!signedIn.hidden) void refreshPlatform();
  });
  observer.observe(signedIn, { attributes: true, attributeFilter: ['hidden'] });
}

function mount(): void {
  if (!root) return;
  mountSurface();
  bindExport();
  observeSignedInState();
  if (signedIn && !signedIn.hidden) void refreshPlatform();
}

mount();
