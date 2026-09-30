import { findHubApps } from '../lib/hub-search';
import type { SearchableProject } from '../lib/search-core';
const root = document.querySelector<HTMLElement>('[data-portal-search-page]');
if (root) {
  const projects = JSON.parse(root.querySelector('[data-portal-app-index]')!.textContent!) as SearchableProject[];
  const input = root.querySelector<HTMLInputElement>('[data-portal-query]')!;
  const results = root.querySelector<HTMLElement>('[data-portal-search-results]')!;
  const rows = new Map(Array.from(results.querySelectorAll<HTMLElement>('[data-portal-search-slug]')).map(row => [row.dataset.portalSearchSlug!, row]));
  const status = root.querySelector<HTMLElement>('[data-portal-search-status]')!;
  const empty = root.querySelector<HTMLElement>('[data-portal-search-empty]')!;
  function apply(updateUrl = true) {
    const matches = findHubApps(projects, input.value);
    const visible = new Set(matches.map(app => app.slug));
    rows.forEach((row, slug) => { row.hidden = !visible.has(slug); });
    matches.forEach(app => results.append(rows.get(app.slug)!));
    status.textContent = `${matches.length} ${matches.length === 1 ? 'app' : 'apps'}${input.value.trim() ? ' found' : ''}`;
    empty.hidden = matches.length > 0;
    if (updateUrl) {
      const url = new URL(location.href); const q = input.value.trim().slice(0, 200);
      if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }
  const restore = () => { input.value = new URLSearchParams(location.search).get('q')?.slice(0, 200) ?? ''; apply(false); };
  input.addEventListener('input', () => apply());
  root.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); apply(); });
  window.addEventListener('popstate', restore); restore();
}
