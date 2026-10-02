// Public capability metadata only. Selection is not a grant or an authorization check.
export interface ProviderCandidate { id: string; enabled: boolean; operations: readonly string[]; }
export function selectProviders(registry: readonly ProviderCandidate[], requested: readonly string[], operation: string, limit = 6) {
  if (registry.length > 250 || new Set(registry.map(p => p.id)).size !== registry.length || registry.some(p => !/^[a-z0-9][a-z0-9-]{0,63}$/.test(p.id)) || !Number.isInteger(limit) || limit < 1 || limit > 6 || requested.length > 250) throw new Error('Invalid provider selection');
  const byId = new Map(registry.map(p => [p.id, p]));
  const selected: string[] = [], skipped: { id: string; reason: 'unknown' | 'disabled' | 'unsupported' | 'budget' }[] = [];
  for (const id of new Set(requested)) {
    const candidate = byId.get(id);
    const reason = !candidate ? 'unknown' : !candidate.enabled ? 'disabled' : !candidate.operations.includes(operation) ? 'unsupported' : selected.length >= limit ? 'budget' : null;
    if (reason) skipped.push({ id, reason }); else selected.push(id);
  }
  return { selected, skipped, complete: skipped.length === 0 };
}
