export const HUB_AUTH_KEY = 'thiepn:hub-auth:v1';
export const HUB_LOGIN_KEY = 'thiepn:hub-login:v1';
export const ACCOUNT_ORIGIN = 'https://account.thiepn.dev';
export type HubIdentity = { status: 'checking' | 'signed-out' | 'unavailable' } | { status: 'signed-in'; id: string; label: string };
export const validAccountId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function preferenceKey(id: string | null): string {
  if (id === null) return 'thiepn:hub-preferences';
  if (!validAccountId(id)) throw new Error('Invalid account identity');
  return `thiepn:hub-preferences:user:${id.toLowerCase()}:v1`;
}
export function safeHubReturn(value: unknown): string {
  return value === '/search/' ? '/search/' : '/home/';
}
export function readPendingLogin(raw: string | null, flow: string | null, now = Date.now()): { returnTo: string } | null {
  try {
    if (!raw || raw.length > 1024 || !flow || !/^[a-f0-9]{64}$/.test(flow)) return null;
    const value = JSON.parse(raw);
    if (value.flow !== flow || typeof value.started !== 'number' || now < value.started || now - value.started > 600000) return null;
    return { returnTo: safeHubReturn(value.returnTo) };
  } catch { return null; }
}
