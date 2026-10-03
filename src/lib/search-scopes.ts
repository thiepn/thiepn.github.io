export type SearchScope = 'apps' | 'actions' | 'resources';
export const parseSearchScope = (value: string | null): SearchScope => value === 'actions' || value === 'resources' ? value : 'apps';
export function publicSearchLocation(scope: SearchScope, query: string) {
  const params = new URLSearchParams();
  if (scope !== 'apps') params.set('scope', scope);
  if (scope !== 'resources' && query.trim()) params.set('q', query.trim().slice(0, 200));
  return '/search/' + (params.size ? '?' + params : '');
}
