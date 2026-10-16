import { parseState } from './model';
import { clone, type WorkspaceState } from './types';

// Device privacy, navigation and legacy recovery copies never follow another device.
export function cloudState(state: WorkspaceState): WorkspaceState {
  const value = clone(state);
  value.revision = 0;
  value.legacyBackup = null;
  value.preferences.rail = true;
  value.preferences.hidden = false;
  return value;
}
export function localState(remote: WorkspaceState, local: WorkspaceState): WorkspaceState {
  const value = clone(remote);
  value.revision = local.revision;
  value.legacyBackup = local.legacyBackup;
  value.preferences.rail = local.preferences.rail;
  value.preferences.hidden = local.preferences.hidden;
  return parseState(JSON.stringify(value));
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function stable(value: unknown): string {
  if (Array.isArray(value)) {
    const rows = value.every(row => record(row) && typeof row.id === 'string') ? [...value].sort((a, b) => String(a.id).localeCompare(String(b.id))) : value;
    return '[' + rows.map(stable).join(',') + ']';
  }
  if (record(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  return JSON.stringify(value) ?? 'undefined';
}
export const sameState = (a: WorkspaceState, b: WorkspaceState) => stable(cloudState(a)) === stable(cloudState(b));
export function meaningfulState(state: WorkspaceState): boolean {
  const customizedPreferences = state.preferences.theme !== undefined || state.preferences.density !== 'compact' || state.preferences.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone;
  return !!(customizedPreferences || state.legacyBackup || state.tasks.length || state.notes.length || state.events.length || state.trackers.length || state.logs.length || state.captureDraft || state.activity.length || state.workspaces.length > 1 || state.workspaces[0]?.title !== 'Personal workspace' || state.workspaces[0]?.revision);
}
export interface MergeResult { state: WorkspaceState | null; conflicts: string[] }
export function mergeStates(base: WorkspaceState, local: WorkspaceState, remote: WorkspaceState): MergeResult {
  const conflicts: string[] = [];
  function merge(before: unknown, left: unknown, right: unknown, path: string): unknown {
    if (stable(left) === stable(right)) return left;
    if (stable(left) === stable(before)) return right;
    if (stable(right) === stable(before)) return left;
    // A concurrent delete and edit is a conflict, never an implicit resurrection.
    if (left === undefined || right === undefined) { conflicts.push(path); return left; }
    if (Array.isArray(left) && Array.isArray(right) && (before === undefined || Array.isArray(before)) && [...left, ...right, ...(Array.isArray(before) ? before : [])].every(row => record(row) && typeof row.id === 'string')) {
      const map = (rows: unknown[]) => new Map(rows.map(row => [(row as Record<string, unknown>).id, row]));
      const a = map(Array.isArray(before) ? before : []), b = map(left), c = map(right);
      return [...new Set([...b.keys(), ...c.keys(), ...a.keys()])].map(id => merge(a.get(id), b.get(id), c.get(id), path + '/' + id)).filter(value => value !== undefined);
    }
    if (record(left) && record(right) && (before === undefined || record(before))) {
      const old = record(before) ? before : {};
      return Object.fromEntries([...new Set([...Object.keys(old), ...Object.keys(left), ...Object.keys(right)])].map(key => {
        // Layout save metadata is descriptive, not a content conflict policy.
        if (key === 'revision') return [key, Math.max(Number(left[key]) || 0, Number(right[key]) || 0)];
        if (key === 'updatedAt' && path.startsWith('workspaces/')) return [key, [left[key], right[key]].map(String).sort().at(-1)];
        return [key, merge(old[key], left[key], right[key], path ? path + '/' + key : key)];
      }).filter(([, value]) => value !== undefined));
    }
    conflicts.push(path);
    return left;
  }
  const merged = merge(cloudState(base), cloudState(local), cloudState(remote), '') as WorkspaceState;
  merged.activity = merged.activity.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 500);
  if (conflicts.length) return { state: null, conflicts };
  try { return { state: parseState(JSON.stringify(merged)), conflicts: [] }; }
  catch { return { state: null, conflicts: ['The combined workspace needs review.'] }; }
}

// Explicit import only. Keep both namespaces and reject ambiguous ID collisions.
export function addGuestState(account: WorkspaceState, guest: WorkspaceState): WorkspaceState {
  const next=clone(account);
  for (const key of ['workspaces','tasks','events','notes','trackers','logs','activity'] as const) {
    const rows=next[key] as {id:string}[], incoming=guest[key] as {id:string}[];
    for(const row of incoming) {const found=rows.find(existing=>existing.id===row.id);if(found && stable(found)!==stable(row))throw new Error('These workspaces share edited records. Export both versions before importing.');if(!found)rows.push(clone(row));}
  }
  next.activity=next.activity.slice(0,500);
  if(guest.captureDraft && next.captureDraft && guest.captureDraft!==next.captureDraft)throw new Error('Finish or export both capture drafts before importing.');
  next.captureDraft ||= guest.captureDraft;
  return parseState(JSON.stringify(next));
}
