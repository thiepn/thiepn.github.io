import { findHubApps } from '../lib/hub-search';
import type { SearchableProject } from '../lib/search-core';
import { findHubActions, type HUB_ACTIONS } from '../lib/hub-actions';
import { parseSearchScope, publicSearchLocation, type SearchScope } from '../lib/search-scopes';
const root = document.querySelector<HTMLElement>('[data-portal-search-page]');
if (root) {
  const projects = JSON.parse(root.querySelector('[data-portal-app-index]')!.textContent!) as SearchableProject[];
  const input = root.querySelector<HTMLInputElement>('[data-portal-query]')!;
  const results = root.querySelector<HTMLElement>('[data-portal-search-results]')!;
  const rows = new Map(Array.from(results.querySelectorAll<HTMLElement>('[data-portal-search-slug]')).map(row => [row.dataset.portalSearchSlug!, row]));
  const status = root.querySelector<HTMLElement>('[data-portal-search-status]')!;
  const empty = root.querySelector<HTMLElement>('[data-portal-search-empty]')!;
  const actions = JSON.parse(root.querySelector('[data-portal-action-index]')!.textContent!) as typeof HUB_ACTIONS;
  const actionRows = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-search-action]')).map(row => [row.dataset.searchAction!, row]));
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-search-scope-choice]'));
  let scope: SearchScope = 'apps';
  function apply(updateUrl = true) {
    if (scope === 'resources') {
      status.textContent = 'Private sources are not connected. No private search was performed.';
      if (updateUrl) history.replaceState(null, '', publicSearchLocation(scope, ''));
      return;
    }
    const matches = findHubApps(projects, input.value);
    const visible = new Set(matches.map(app => app.slug));
    rows.forEach((row, slug) => { row.hidden = !visible.has(slug); });
    matches.forEach(app => results.append(rows.get(app.slug)!));
    const actionMatches = findHubActions(actions, input.value);
    const actionIds = new Set(actionMatches.map(action => action.id));
    actionRows.forEach((row, id) => { row.hidden = !actionIds.has(id); });
    root!.querySelector<HTMLElement>('[data-action-empty]')!.hidden = actionMatches.length > 0;
    status.textContent = scope === 'apps' ? `${matches.length} ${matches.length === 1 ? 'app' : 'apps'}${input.value.trim() ? ' found' : ''}` : `${actionMatches.length} ${actionMatches.length === 1 ? 'action' : 'actions'}${input.value.trim() ? ' found' : ''}`;
    empty.hidden = matches.length > 0;
    if (updateUrl) {
      history.replaceState(null, '', publicSearchLocation(scope, input.value));
    }
  }
  function select(next: SearchScope, updateUrl = true) {
    scope = next;
    tabs.forEach(tab => { const active = tab.dataset.searchScopeChoice === scope; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
    root!.querySelectorAll<HTMLElement>('[data-search-panel]').forEach(panel => { panel.hidden = panel.dataset.searchPanel !== scope; panel.setAttribute('role', 'tabpanel'); });
    root!.querySelector<HTMLElement>('[data-public-search-form]')!.hidden = scope === 'resources';
    const description = root!.querySelector<HTMLElement>('[data-public-search-description]')!;
    description.hidden = scope === 'resources';
    description.textContent = scope === 'actions' ? 'Find an explicit action in its app. Private app contents are not searched.' : 'Search the public app directory. Your private notes, reading history and other app data are not searched.';
    root!.querySelector<HTMLElement>('[data-public-query-label]')!.textContent = scope === 'actions' ? 'Action or task' : 'App name or task';
    apply(updateUrl);
  }
  const restore = () => { const params = new URLSearchParams(location.search); const next = parseSearchScope(params.get('scope')); input.value = next === 'resources' ? '' : params.get('q')?.slice(0, 200) ?? ''; select(next, next === 'resources'); };
  input.addEventListener('input', () => apply());
  root.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); apply(); });
  window.addEventListener('popstate', restore); restore();
  root.querySelector<HTMLElement>('[data-search-scopes]')!.hidden = false;
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.dataset.searchScopeChoice as SearchScope));
    tab.addEventListener('keydown', event => {
      const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (target !== null) { event.preventDefault(); tabs[target]!.focus(); select(tabs[target]!.dataset.searchScopeChoice as SearchScope); }
    });
  });
  root.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); input.value = ''; select('apps'); tabs[0]!.focus(); } });
}
