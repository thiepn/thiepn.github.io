/** Accept an explicit newer legacy session, never a stale same-session mirror.
 * Claims are used only to compare credentials; the Account SDK still verifies
 * identity with the server. No token or claim is published or logged.
 */
function parse(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const token = JSON.parse(raw);
    if (typeof token.accessToken !== 'string' || typeof token.refreshToken !== 'string' ||
        typeof token.expiresAt !== 'number' || !Number.isFinite(token.expiresAt)) return null;
    const part = token.accessToken.split('.')[1];
    if (!part) return null;
    const claims = JSON.parse(atob(part.replaceAll('-', '+').replaceAll('_', '/')));
    return {refreshToken:token.refreshToken as string,expiresAt:token.expiresAt as number,
      owner:typeof claims.sub === 'string' ? claims.sub as string : null};
  } catch { return null; }
}
export function shouldImportLegacyAccountToken(durable: string | null, legacy: string | null | undefined): boolean {
  // A durable sign-out is not an absent credential. Never resurrect it.
  if (durable === null) return false;
  const current = parse(durable), candidate = parse(legacy);
  if (!candidate) return false;
  if (!current) return true;
  if (candidate.owner && current.owner && candidate.owner !== current.owner)
    return candidate.expiresAt >= current.expiresAt;
  // Same refresh token is not evidence of a new login; its expiry may be stale.
  if (candidate.refreshToken === current.refreshToken) return false;
  // An already committed live same-owner session cannot be downgraded by a
  // delayed mirror. Legitimate current Hub logins use the durable write path.
  if (current.expiresAt > Date.now() + 30_000) return false;
  return candidate.expiresAt > current.expiresAt;
}
