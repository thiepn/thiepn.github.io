import { InboxRuntime, type InboxAdapter } from './providers/inbox-runtime';
import type { ProviderAccess } from './providers/types';
import type { InboxView } from './providers/inbox';
const labels = { notes: 'Notes', library: 'Library', tms60: 'TMS60' };

/** Mount only app-qualified adapters. No global event accepts data or credentials. */
export function mountInbox(root: HTMLElement, adapters: readonly InboxAdapter[]) {
  const runtime = new InboxRuntime(adapters);
  const items = root.querySelector<HTMLElement>('[data-inbox-items]')!;
  const status = root.querySelector<HTMLElement>('[data-inbox-status]')!;
  const total = root.querySelector<HTMLElement>('[data-inbox-total]')!;
  const refresh = root.querySelector<HTMLButtonElement>('[data-inbox-refresh]')!;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const render = (view: InboxView) => {
    clearTimeout(expiry);
    const deadline = runtime.nextExpiry();
    if (deadline !== null) expiry = setTimeout(() => render(runtime.snapshot()), Math.max(1, deadline - Date.now()));
    items.replaceChildren();
    const heading = root.querySelector<HTMLElement>('#inbox-coverage-heading');
    const description = root.querySelector<HTMLElement>('[data-inbox-description]');
    if (heading) heading.textContent = view.items.length ? 'Attention from your apps' : view.allSourcesResponded ? 'No attention items in responding sources' : 'Inbox coverage is incomplete';
    if (description) description.textContent = view.allSourcesResponded ? 'These sources responded. Opening an issue does not resolve it.' : 'Some sources are unavailable. This does not mean that your apps have no unresolved issues.';
    total.textContent = view.unreadCount === null ? 'No unread total is available.' : `${view.unreadCount} unread ${view.unreadCount === 1 ? 'issue' : 'issues'} in responding sources.`;
    for (const item of view.items) {
      const row = document.createElement('article'); row.className = 'portal-inbox-item';
      const title = document.createElement('h3'); title.textContent = item.title;
      const detail = document.createElement('p'); detail.textContent = `${labels[item.providerId]} · ${item.severity} · ${item.attention}`;
      const link = document.createElement('a'); link.textContent = `Open ${labels[item.providerId]}`; link.href = item.href; link.rel = 'noreferrer';
      row.append(title, detail, link);
      if (runtime.canAcknowledge(item.providerId)) {
        for (const action of ['mark-read', 'dismiss'] as const) {
          if (action === 'mark-read' && item.attention === 'read') continue;
          const button = document.createElement('button'); button.type = 'button'; button.className = 'portal-button';
          button.textContent = action === 'mark-read' ? 'Mark read' : 'Dismiss';
          button.setAttribute('aria-label', `${button.textContent}: ${item.title}`);
          button.addEventListener('click', async () => {
            const result = await runtime.acknowledge(item.providerId, item.issueId, action, render);
            if (result === 'unavailable') return;
            status.textContent = result === 'applied' ? 'Attention updated. The issue remains owned by its app.' : 'The app did not confirm this action. Refresh before trying again.';
            refresh.focus();
          });
          row.append(button);
        }
      }
      items.append(row);
    }
    for (const source of view.sources) {
      const node = root.querySelector<HTMLElement>(`[data-source="${source.providerId}"] > span`);
      if (node) node.textContent = ({ ready: 'Connected', empty: 'No attention items', idle: 'Waiting for source', unsupported: 'Not supported', unconnected: 'Not connected', offline: 'Unavailable', stale: 'Refresh required', error: 'Could not verify source' } as const)[source.status];
    }
  };
  const clear = () => { clearTimeout(expiry); runtime.clear(); for (const node of root.querySelectorAll<HTMLElement>('[data-source] > span')) node.textContent = 'Not connected'; items.replaceChildren(); status.textContent = ''; total.textContent = 'No unread total is available.'; refresh.hidden = true; };
  const reload = async () => { refresh.disabled = true; try { await runtime.refresh(render); } finally { refresh.disabled = false; } };
  refresh.addEventListener('click', reload);
  return {
    clear,
    async connect(access: readonly ProviderAccess[]) { if (document.hidden || root.querySelector<HTMLElement>('[data-inbox-content]')?.hidden) return; runtime.setAccess(access); refresh.hidden = false; await reload(); },
  };
}
