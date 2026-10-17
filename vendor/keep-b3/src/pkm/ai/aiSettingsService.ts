import { AISettings, DEFAULT_AI_SETTINGS, AIExclusionRules, AIMode } from './types';
import { hardenedTokenStorage } from '../security/tokenStorage';

const AI_SETTINGS_STORAGE_KEY = 'keepnotes_pkm_ai_settings_v1';
const AI_EXTERNAL_KEY_SESSION_ID = 'ai_provider_api_key';

export class AISettingsService {
  private settings: AISettings = { ...DEFAULT_AI_SETTINGS };
  private subscribers: Array<(settings: AISettings) => void> = [];
  private sessionApiKey: string | null = null;

  constructor() {
    this.loadSettings();
    this.detectHardwareCapabilities();
  }

  public getSettings(): AISettings {
    return {
      ...this.settings,
      exclusions: { ...this.settings.exclusions },
      localModel: { ...this.settings.localModel },
      externalProvider: {
        ...this.settings.externalProvider,
        hasKeyConfigured: this.hasConfiguredApiKey(),
      },
    };
  }

  public updateSettings(partial: Partial<AISettings>): void {
    this.settings = {
      ...this.settings,
      ...partial,
      exclusions: partial.exclusions
        ? { ...this.settings.exclusions, ...partial.exclusions }
        : this.settings.exclusions,
      localModel: partial.localModel
        ? { ...this.settings.localModel, ...partial.localModel }
        : this.settings.localModel,
      externalProvider: partial.externalProvider
        ? { ...this.settings.externalProvider, ...partial.externalProvider }
        : this.settings.externalProvider,
    };
    this.saveSettings();
    this.notifySubscribers();
  }

  public setAIMode(mode: AIMode): void {
    this.updateSettings({ mode });
  }

  public subscribe(callback: (settings: AISettings) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getSettings());
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  // --- API Key Management via P30 Hardened Security Architecture ---

  /**
   * Sets external provider API key in memory session (never written to plaintext storage).
   */
  public setSessionApiKey(key: string | null): void {
    if (!key || key.trim() === '') {
      this.sessionApiKey = null;
    } else {
      this.sessionApiKey = key.trim();
    }
    this.updateSettings({
      externalProvider: {
        ...this.settings.externalProvider,
        hasKeyConfigured: this.hasConfiguredApiKey(),
      },
    });
  }

  public getApiKey(): string | null {
    if (this.sessionApiKey) return this.sessionApiKey;
    const p30Key = hardenedTokenStorage.getSessionToken();
    if (p30Key) return p30Key;
    return null;
  }

  public hasConfiguredApiKey(): boolean {
    return !!this.getApiKey();
  }

  public clearApiKey(): void {
    this.sessionApiKey = null;
    this.updateSettings({
      externalProvider: {
        ...this.settings.externalProvider,
        hasKeyConfigured: false,
      },
    });
  }

  // --- Exclusion Verification ---

  public isNoteExcluded(note: { id: string; folderId?: string; tags?: string[]; trashed?: boolean; isTemplate?: boolean }): boolean {
    const { exclusions } = this.settings;

    if (exclusions.excludeTrash && note.trashed) {
      return true;
    }

    if (exclusions.excludeTemplates && (note.isTemplate || note.folderId?.toLowerCase().includes('template'))) {
      return true;
    }

    if (exclusions.excludedNoteIds.includes(note.id)) {
      return true;
    }

    if (note.folderId && exclusions.excludedFolderIds.includes(note.folderId)) {
      return true;
    }

    if (note.tags && note.tags.length > 0) {
      const lowerExcludedTags = exclusions.excludedTags.map((t) => t.toLowerCase().replace(/^#/, ''));
      const hasExcludedTag = note.tags.some((t) =>
        lowerExcludedTags.includes(t.toLowerCase().replace(/^#/, ''))
      );
      if (hasExcludedTag) {
        return true;
      }
    }

    return false;
  }

  // --- Hardware Telemetry & Detection ---

  public async detectHardwareCapabilities(): Promise<void> {
    let hasWebGPU = false;
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          hasWebGPU = true;
        }
      }
    } catch {
      hasWebGPU = false;
    }

    if (this.settings.localModel.isWebGPUSupported !== hasWebGPU) {
      this.updateSettings({
        localModel: {
          ...this.settings.localModel,
          isWebGPUSupported: hasWebGPU,
        },
      });
    }
  }

  // --- Local Model Status Operations ---

  public setLocalModelStatus(status: AISettings['localModel']['status'], progress = 0, error?: string): void {
    this.updateSettings({
      localModel: {
        ...this.settings.localModel,
        status,
        downloadProgress: progress,
        downloadError: error,
      },
    });
  }

  public removeLocalModel(): void {
    this.updateSettings({
      localModel: {
        ...this.settings.localModel,
        status: 'not-downloaded',
        downloadProgress: 0,
        downloadError: undefined,
      },
    });
  }

  // --- Persistence ---

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = {
          ...DEFAULT_AI_SETTINGS,
          ...parsed,
          exclusions: {
            ...DEFAULT_AI_SETTINGS.exclusions,
            ...(parsed.exclusions || {}),
          },
          localModel: {
            ...DEFAULT_AI_SETTINGS.localModel,
            ...(parsed.localModel || {}),
          },
          externalProvider: {
            ...DEFAULT_AI_SETTINGS.externalProvider,
            ...(parsed.externalProvider || {}),
          },
        };
      }
    } catch (err) {
      console.error('Failed to load AI settings from localStorage:', err);
    }
  }

  private saveSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // Clean settings before saving (never persist API keys in plaintext localStorage)
      const toSave = {
        ...this.settings,
        externalProvider: {
          ...this.settings.externalProvider,
          // Never persist any key string to localStorage
        },
      };
      localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.error('Failed to persist AI settings:', err);
    }
  }

  private notifySubscribers(): void {
    const current = this.getSettings();
    for (const sub of this.subscribers) {
      try {
        sub(current);
      } catch (err) {
        console.error('Error in AI settings subscriber:', err);
      }
    }
  }
}

export const aiSettingsService = new AISettingsService();
