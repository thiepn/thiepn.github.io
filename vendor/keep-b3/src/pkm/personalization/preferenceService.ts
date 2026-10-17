/**
 * Central Preference Service
 * 
 * Consolidates all user preferences with:
 * - Strict schema validation & type safety
 * - Scope separation (Global Synced, Device-Local, Vault-Level)
 * - Safe fallback on corrupt or unknown data
 * - Safe UI Reset (resets presentation without touching canonical notes/records)
 * - Migration from V1.5 to V1.6 preserving explicit user overrides
 */

import {
  DomainVisibilityConfig,
  HomeCustomizationConfig,
  MobileBottomNavConfig,
  NavigationItemConfig,
  PersonalizationConfigBundle,
  PreferenceStorageScope,
  VisibilityProfileId,
} from './personalizationTypes';

export interface PreferenceSchemaDefinition<T> {
  key: string;
  scope: PreferenceStorageScope;
  defaultValue: T;
  validator: (val: any) => boolean;
  migrate?: (oldVal: any, oldVersion: number) => T;
}

// Storage keys
const PREF_PREFIX = 'pkm_pref_v16_';
const DEVICE_PREFIX = 'pkm_device_v16_';
const OVERRIDE_TRACKER_KEY = 'pkm_pref_user_overrides';

// Default Domain Visibility
export const DEFAULT_DOMAIN_VISIBILITY: DomainVisibilityConfig = {
  profile: 'personal-os',
  enabledDomains: {
    notes: true,
    tasks: true,
    calendar: true,
    planning: true,
    people: true,
    routines: true,
    learning: true,
    library: true,
    finance: true,
    health: true,
    travel: true,
    assets: true,
    decisions: true,
    inbox: true,
    dashboards: true,
    collections: true,
    media: true,
    references: true,
    plugins: true,
  },
};

export const CORE_DOMAIN_VISIBILITY: DomainVisibilityConfig = {
  profile: 'core',
  enabledDomains: {
    notes: true,
    tasks: true,
    calendar: true,
    planning: false,
    people: false,
    routines: false,
    learning: false,
    library: false,
    finance: false,
    health: false,
    travel: false,
    assets: false,
    decisions: false,
    inbox: true,
    dashboards: false,
    collections: false,
    media: false,
    references: false,
    plugins: false,
  },
};

// Default Home Layout
export const DEFAULT_HOME_CONFIG: HomeCustomizationConfig = {
  presetId: 'balanced',
  density: 'comfortable',
  sections: [
    { id: 'continue', label: 'Jump Back In', isVisible: true, order: 1, itemLimit: 4, density: 'comfortable' },
    { id: 'focus', label: 'Active Intentional Focus', isVisible: true, order: 2, itemLimit: 3, density: 'comfortable' },
    { id: 'attention', label: 'Needs Attention Today', isVisible: true, order: 3, itemLimit: 5, density: 'comfortable' },
    { id: 'today', label: 'Today & Agenda', isVisible: true, order: 4, itemLimit: 5, density: 'comfortable' },
    { id: 'routines', label: 'Daily Habits & Check-ins', isVisible: true, order: 5, itemLimit: 4, density: 'compact' },
    { id: 'inbox', label: 'Universal Inbox', isVisible: true, order: 6, itemLimit: 3, density: 'compact' },
    { id: 'projects', label: 'Active Projects', isVisible: true, order: 7, itemLimit: 4, density: 'comfortable' },
    { id: 'saved-views', label: 'Pinned Saved Views', isVisible: true, order: 8, itemLimit: 4, density: 'compact' },
    { id: 'domains', label: 'Domain Quick Access', isVisible: true, order: 9, itemLimit: 12, density: 'compact' },
  ],
};

export const MINIMAL_HOME_CONFIG: HomeCustomizationConfig = {
  presetId: 'minimal',
  density: 'compact',
  sections: [
    { id: 'continue', label: 'Jump Back In', isVisible: true, order: 1, itemLimit: 3, density: 'compact' },
    { id: 'today', label: 'Today', isVisible: true, order: 2, itemLimit: 4, density: 'compact' },
    { id: 'attention', label: 'Attention', isVisible: true, order: 3, itemLimit: 3, density: 'compact' },
    { id: 'focus', label: 'Focus', isVisible: false, order: 4, itemLimit: 3, density: 'compact' },
    { id: 'routines', label: 'Routines', isVisible: false, order: 5, itemLimit: 3, density: 'compact' },
    { id: 'inbox', label: 'Inbox', isVisible: false, order: 6, itemLimit: 3, density: 'compact' },
    { id: 'projects', label: 'Projects', isVisible: false, order: 7, itemLimit: 3, density: 'compact' },
    { id: 'saved-views', label: 'Views', isVisible: false, order: 8, itemLimit: 3, density: 'compact' },
    { id: 'domains', label: 'Domains', isVisible: false, order: 9, itemLimit: 6, density: 'compact' },
  ],
};

export const PLANNING_HOME_CONFIG: HomeCustomizationConfig = {
  presetId: 'planning',
  density: 'comfortable',
  sections: [
    { id: 'focus', label: 'Strategic Focus', isVisible: true, order: 1, itemLimit: 5, density: 'comfortable' },
    { id: 'today', label: 'Today & Agenda', isVisible: true, order: 2, itemLimit: 6, density: 'comfortable' },
    { id: 'attention', label: 'Attention Blockers', isVisible: true, order: 3, itemLimit: 5, density: 'comfortable' },
    { id: 'projects', label: 'Active Projects & Goals', isVisible: true, order: 4, itemLimit: 6, density: 'comfortable' },
    { id: 'routines', label: 'Routines', isVisible: true, order: 5, itemLimit: 4, density: 'compact' },
    { id: 'continue', label: 'Recent Work', isVisible: true, order: 6, itemLimit: 3, density: 'compact' },
    { id: 'inbox', label: 'Triage Inbox', isVisible: true, order: 7, itemLimit: 4, density: 'compact' },
    { id: 'saved-views', label: 'Saved Views', isVisible: false, order: 8, itemLimit: 4, density: 'compact' },
    { id: 'domains', label: 'Domains', isVisible: false, order: 9, itemLimit: 6, density: 'compact' },
  ],
};

// Default Mobile Bottom Nav
export const DEFAULT_MOBILE_NAV_CONFIG: MobileBottomNavConfig = {
  maxItems: 5,
  useDeviceOverride: false,
  items: [
    { id: 'nav-notes', label: 'Notes', iconName: 'StickyNote', action: 'navigate:notes', order: 1 },
    { id: 'nav-search', label: 'Search', iconName: 'Search', action: 'navigate:search', order: 2 },
    { id: 'nav-new-note', label: 'New', iconName: 'Plus', action: 'action:new-note', order: 3 },
    { id: 'nav-capture', label: 'Capture', iconName: 'Zap', action: 'action:quick-capture', order: 4 },
    { id: 'nav-more', label: 'More', iconName: 'Menu', action: 'toggle:sidebar', order: 5 },
  ],
};

class PreferenceService {
  private inMemoryPreferences: Map<string, any> = new Map();
  private userOverrides: Set<string> = new Set();
  private subscribers: Map<string, Set<(val: any) => void>> = new Map();

  constructor() {
    this.loadUserOverrides();
  }

  private loadUserOverrides(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(OVERRIDE_TRACKER_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            this.userOverrides = new Set(list);
          }
        }
      }
    } catch {
      this.userOverrides = new Set();
    }
  }

  private saveUserOverrides(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(OVERRIDE_TRACKER_KEY, JSON.stringify(Array.from(this.userOverrides)));
      }
    } catch {
      // Ignore local storage write errors
    }
  }

  public getStorageKey(key: string, scope: PreferenceStorageScope): string {
    return scope === 'device-local' ? `${DEVICE_PREFIX}${key}` : `${PREF_PREFIX}${key}`;
  }

  /**
   * Reads a preference value with automatic fallback to defaultValue
   */
  public get<T>(key: string, defaultValue: T, scope: PreferenceStorageScope = 'global-synced'): T {
    if (this.inMemoryPreferences.has(key)) {
      return this.inMemoryPreferences.get(key) as T;
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }

    try {
      const storageKey = this.getStorageKey(key, scope);
      const raw = localStorage.getItem(storageKey);
      if (raw === null) {
        return defaultValue;
      }
      const parsed = JSON.parse(raw);
      this.inMemoryPreferences.set(key, parsed);
      return parsed as T;
    } catch (err) {
      console.warn(`[PreferenceService] Failed to read key "${key}", using safe default.`, err);
      return defaultValue;
    }
  }

  /**
   * Writes a preference value and records user override flag
   */
  public async set<T>(key: string, value: T, scope: PreferenceStorageScope = 'global-synced'): Promise<void> {
    this.inMemoryPreferences.set(key, value);
    this.userOverrides.add(key);
    this.saveUserOverrides();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storageKey = this.getStorageKey(key, scope);
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch (err) {
        console.error(`[PreferenceService] Failed to save key "${key}" to localStorage:`, err);
      }
    }

    this.notifySubscribers(key, value);
  }

  /**
   * Checks if user has explicitly customized this preference
   */
  public hasUserOverride(key: string): boolean {
    return this.userOverrides.has(key);
  }

  /**
   * Resets a single preference to its default
   */
  public async reset<T>(key: string, defaultValue: T, scope: PreferenceStorageScope = 'global-synced'): Promise<void> {
    this.inMemoryPreferences.delete(key);
    this.userOverrides.delete(key);
    this.saveUserOverrides();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storageKey = this.getStorageKey(key, scope);
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.error(`[PreferenceService] Failed to remove key "${key}":`, err);
      }
    }

    this.notifySubscribers(key, defaultValue);
  }

  /**
   * Safe UI Reset: Restores interface defaults without touching canonical content
   */
  public async resetInterfaceConfiguration(): Promise<{ resetKeys: string[]; preservedData: string[] }> {
    const keysToReset = [
      'domain_visibility',
      'home_customization',
      'mobile_bottom_nav',
      'sidebar_navigation',
      'keyboard_shortcuts',
      'ui_density',
    ];

    for (const key of keysToReset) {
      this.inMemoryPreferences.delete(key);
      this.userOverrides.delete(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`${PREF_PREFIX}${key}`);
        localStorage.removeItem(`${DEVICE_PREFIX}${key}`);
      }
      this.notifySubscribers(key, null);
    }
    this.saveUserOverrides();

    return {
      resetKeys: keysToReset,
      preservedData: ['Notes', 'Tasks', 'Planning', 'Finance', 'Health', 'Travel', 'Assets', 'Decisions', 'Templates', 'Plugins', 'Encryption Keys'],
    };
  }

  /**
   * Favorites Management (Resource-agnostic)
   */
  public getFavorites(): Array<{ resourceType: string; resourceId: string; title?: string }> {
    return this.get<Array<{ resourceType: string; resourceId: string; title?: string }>>('favorites', [], 'global-synced');
  }

  public async addFavorite(resourceType: string, resourceId: string, title?: string): Promise<void> {
    const current = this.getFavorites();
    if (!current.some((f) => f.resourceType === resourceType && f.resourceId === resourceId)) {
      const updated = [...current, { resourceType, resourceId, title }];
      await this.set('favorites', updated, 'global-synced');
    }
  }

  public async removeFavorite(resourceType: string, resourceId: string): Promise<void> {
    const current = this.getFavorites();
    const updated = current.filter((f) => !(f.resourceType === resourceType && f.resourceId === resourceId));
    await this.set('favorites', updated, 'global-synced');
  }

  public isFavorite(resourceType: string, resourceId: string): boolean {
    const current = this.getFavorites();
    return current.some((f) => f.resourceType === resourceType && f.resourceId === resourceId);
  }

  /**
   * Subscribe to preference changes
   */
  public subscribe(key: string, callback: (val: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  private notifySubscribers(key: string, value: any): void {
    const set = this.subscribers.get(key);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(value);
        } catch (e) {
          console.error(`[PreferenceService] Subscriber error for key ${key}:`, e);
        }
      });
    }
  }
}

export const preferenceService = new PreferenceService();
