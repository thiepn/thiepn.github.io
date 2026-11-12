/**
 * Owner-selected default layout for first-time Hub workspaces only.
 * Never rewrite an existing widget's appIds during hydration or sign-in.
 */
export const PROPOSED_QUICK_SHORTCUT_IDS = [
  'studyos', 'mdd', 'pdf-studio', 'thiepn-library',
  'notes', 'tms60', 'tiny-tools', 'clearpage',
] as const;

/** A personal Apps filter, not an archival/public catalogue exclusion. */
export const DEFAULT_HIDDEN_APP_IDS = ['ligoquiz', 'control'] as const;

export interface PersonalAppVisibility {
  hiddenAppIds?: string[];
}

export function personalHiddenAppIds(preferences: PersonalAppVisibility): string[] {
  // Older saved workspace records have no field. Do not change their other
  // preferences or persist a migration until the owner makes a change.
  return preferences.hiddenAppIds === undefined
    ? [...DEFAULT_HIDDEN_APP_IDS]
    : [...preferences.hiddenAppIds];
}

export function changeAppVisibility(
  preferences: PersonalAppVisibility, id: string, hidden: boolean,
  allowedIds: readonly string[],
): string[] {
  if (!allowedIds.includes(id)) throw new Error('Unknown app; visibility left unchanged.');
  const current = new Set(personalHiddenAppIds(preferences));
  if (hidden) current.add(id); else current.delete(id);
  return [...current].filter(value => allowedIds.includes(value));
}
