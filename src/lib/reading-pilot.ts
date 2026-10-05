import configuration from '../data/reading-pilot.json';
export const READING_PILOT_ENABLED = configuration.enabled;
export function validateReadingPilot(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unavailable pilot');
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'cloudAccess,desktopOnly,enabled,operations,pilotId,schemaVersion,scope,writes'
    || v.schemaVersion !== 1 || v.pilotId !== 'H21-library-reading-v1' || typeof v.enabled !== 'boolean'
    || v.scope !== 'device' || v.desktopOnly !== true || v.cloudAccess !== false || v.writes !== false
    || JSON.stringify(v.operations) !== '["summary","continue"]') throw new Error('Unavailable pilot');
  return v.enabled;
}
export function desktopReadingPilot(ua: string, platform: string, touchPoints: number): boolean {
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(ua) && !(platform === 'MacIntel' && touchPoints > 1);
}
export async function checkReadingPilot(signal: AbortSignal): Promise<boolean> {
  const response = await fetch('/reading-pilot.json', {credentials:'omit', cache:'no-store', redirect:'error', signal});
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable pilot');
  const text = await response.text();
  if (text.length > 4096) throw new Error('Unavailable pilot');
  return validateReadingPilot(JSON.parse(text));
}
