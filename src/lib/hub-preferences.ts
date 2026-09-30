export const HUB_PREFERENCES_KEY = 'thiepn:hub-preferences';
export const HUB_PREFERENCES_VERSION = 1;
export const MAX_HUB_PINS = 12;
export const DEFAULT_HUB_PINS = ['notes', 'thiepn-library', 'french-3000', 'tms60', 'pdf-studio', 'steadybar', 'mathlab', 'clean30'] as const;
export interface HubPreferences { version: 1; pins: string[]; density: 'compact' | 'comfortable'; }

export function defaultHubPreferences(available: readonly string[]): HubPreferences {
  const allowed = new Set(available);
  return { version: 1, pins: DEFAULT_HUB_PINS.filter(slug => allowed.has(slug)), density: 'compact' };
}

export function parseHubPreferences(raw: string | null, available: readonly string[]): { preferences: HubPreferences; reset: boolean } {
  const fallback = defaultHubPreferences(available);
  if (raw === null) return { preferences: fallback, reset: false };
  try {
    if (raw.length > 8192) throw new Error('Oversized preferences');
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') throw new Error('Invalid preference');
    const candidate = value as Record<string, unknown>;
    if (candidate.version !== HUB_PREFERENCES_VERSION || !Array.isArray(candidate.pins)
      || candidate.pins.length > MAX_HUB_PINS || !candidate.pins.every(pin => typeof pin === 'string')
      || !['compact', 'comfortable'].includes(String(candidate.density))) throw new Error('Invalid preference version or shape');
    const allowed = new Set(available);
    return {
      preferences: { version: 1, pins: [...new Set(candidate.pins as string[])].filter(slug => allowed.has(slug)), density: candidate.density as HubPreferences['density'] },
      reset: false,
    };
  } catch { return { preferences: fallback, reset: true }; }
}

export function moveHubPin(pins: readonly string[], slug: string, direction: -1 | 1): string[] {
  const next = [...pins];
  const index = next.indexOf(slug);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
