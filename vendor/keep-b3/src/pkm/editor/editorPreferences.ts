export interface EditorPreferences {
  typewriterMode: boolean;
  focusMode: boolean;
  showOutline: boolean;
  slashCommandsEnabled: boolean;
  autoPairingEnabled: boolean;
  lineNumbersEnabled: boolean;
}

const PREFERENCES_KEY = 'pkm_editor_preferences_v1';

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  typewriterMode: false,
  focusMode: false,
  showOutline: false,
  slashCommandsEnabled: true,
  autoPairingEnabled: true,
  lineNumbersEnabled: false,
};

export class EditorPreferencesManager {
  static loadPreferences(): EditorPreferences {
    try {
      const raw = localStorage.getItem(PREFERENCES_KEY);
      if (!raw) return DEFAULT_EDITOR_PREFERENCES;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_EDITOR_PREFERENCES,
        ...parsed,
      };
    } catch {
      return DEFAULT_EDITOR_PREFERENCES;
    }
  }

  static savePreferences(prefs: Partial<EditorPreferences>): EditorPreferences {
    try {
      const current = this.loadPreferences();
      const updated = { ...current, ...prefs };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return DEFAULT_EDITOR_PREFERENCES;
    }
  }
}
