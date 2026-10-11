import { createHabitsV0, habitsStorageKey, parseHabitsV0, type HabitsV0Document } from './habits-v0';

export const HABITS_BACKUP_FORMAT = 'thiepn-habits-local-backup';
export type HabitsBackupScope = { kind: 'device' } | { kind: 'account'; owner: string };

export interface HabitsBackup {
  format: typeof HABITS_BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  scope: HabitsBackupScope;
  habits: HabitsV0Document;
}

type ReadResult = { ok: true; backup: HabitsBackup } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function keysAre(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && Object.keys(value).every(k => keys.includes(k));
}

export function backupScopeKey(scope: unknown): string | null {
  if (!isRecord(scope)) return null;
  if (scope.kind === 'device' && keysAre(scope, ['kind'])) return 'device';
  if (scope.kind === 'account' && keysAre(scope, ['kind', 'owner']) &&
    typeof scope.owner === 'string' && scope.owner === scope.owner.toLowerCase() &&
    habitsStorageKey(scope.owner)) return 'account:' + scope.owner;
  return null;
}

export function createHabitsBackup(
  doc: HabitsV0Document, scope: HabitsBackupScope, date: Date = new Date(),
): string {
  if (!backupScopeKey(scope) || !Number.isFinite(date.getTime())) throw Error('Invalid scope or date');
  const validated = parseHabitsV0(JSON.stringify(doc), createHabitsV0());
  if (!validated) throw Error('Invalid habits state');
  const output: HabitsBackup = {
    format: HABITS_BACKUP_FORMAT, version: 1,
    exportedAt: date.toISOString(), scope, habits: validated,
  };
  const json = JSON.stringify(output, null, 2);
  if (json.length > 500_000) throw Error('Backup too large');
  return json;
}

export function readHabitsBackup(raw: string, expectedScope: HabitsBackupScope): ReadResult {
  const expected = backupScopeKey(expectedScope);
  if (!expected) return { ok: false, reason: 'Verified account scope unavailable.' };
  if (raw.length > 500_000) return { ok: false, reason: 'Backup exceeds file limit.' };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !keysAre(parsed, ['format', 'version', 'exportedAt', 'scope', 'habits']))
      return { ok: false, reason: 'Unsupported backup structure.' };
    if (parsed.format !== HABITS_BACKUP_FORMAT || parsed.version !== 1)
      return { ok: false, reason: 'Unsupported backup version.' };
    const stamp = parsed.exportedAt;
    if (typeof stamp !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(stamp))
      return { ok: false, reason: 'Invalid timestamp.' };
    const parsedDate = new Date(stamp);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString() !== stamp)
      return { ok: false, reason: 'Invalid timestamp.' };
    if (backupScopeKey(parsed.scope) !== expected)
      return { ok: false, reason: 'Backup belongs to a different account or device scope.' };
    const payload = JSON.stringify(parsed.habits);
    if (payload.length > 500_000) return { ok: false, reason: 'Habits data is too large.' };
    const habits = parseHabitsV0(payload);
    if (!habits) return { ok: false, reason: 'Invalid habits data.' };
    return {
      ok: true,
      backup: { format: HABITS_BACKUP_FORMAT, version: 1, exportedAt: stamp,
        scope: parsed.scope as HabitsBackupScope, habits },
    };
  } catch {
    return { ok: false, reason: 'Could not parse the selected JSON file.' };
  }
}
