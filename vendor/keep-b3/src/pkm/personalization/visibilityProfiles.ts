/**
 * Visibility Profiles & Domain Visibility Manager
 * 
 * Manages presentation-only domain visibility:
 * - 'core': Notes, Tasks/Plan, Search, Inbox
 * - 'personal-os': Full suite of domains
 * - 'custom': User-selected subset
 * 
 * CRITICAL GUARANTEE:
 * Hiding a domain alters presentation ONLY (navigation, launcher, home widgets).
 * It NEVER deletes canonical data, disables migrations, or prevents exact search.
 */

import { DomainVisibilityConfig, ProductDomainKey, VisibilityProfileId } from './personalizationTypes';
import { preferenceService, DEFAULT_DOMAIN_VISIBILITY, CORE_DOMAIN_VISIBILITY } from './preferenceService';

const DOMAIN_VISIBILITY_KEY = 'domain_visibility';

export const ALL_DOMAINS: Array<{
  key: ProductDomainKey;
  label: string;
  category: 'core' | 'productivity' | 'life' | 'knowledge' | 'system';
  description: string;
  iconName: string;
}> = [
  { key: 'notes', label: 'Notes', category: 'core', description: 'Portable Markdown notes and wiki-links', iconName: 'StickyNote' },
  { key: 'tasks', label: 'Tasks & Habits', category: 'core', description: 'Task outliners and recurring check-ins', iconName: 'ListTodo' },
  { key: 'calendar', label: 'Calendar & Agenda', category: 'core', description: 'Time-blocking and scheduled events', iconName: 'Calendar' },
  { key: 'inbox', label: 'Universal Inbox', category: 'core', description: 'Quick triage and unorganized intake', iconName: 'Inbox' },
  { key: 'planning', label: 'Goals & Projects (PARA)', category: 'productivity', description: 'Strategic focus, projects, and areas', iconName: 'Target' },
  { key: 'people', label: 'People & CRM', category: 'productivity', description: 'Personal network and interactions', iconName: 'Users' },
  { key: 'routines', label: 'Routines & Tracking', category: 'productivity', description: 'Daily habits and metric logging', iconName: 'Flame' },
  { key: 'learning', label: 'Learning & Courses', category: 'knowledge', description: 'Curricula, flashcards, and exam prep', iconName: 'GraduationCap' },
  { key: 'library', label: 'Library & Media', category: 'knowledge', description: 'Books, articles, and media intake', iconName: 'BookOpen' },
  { key: 'references', label: 'Citations & BibTeX', category: 'knowledge', description: 'Academic bibliography and PDF citations', iconName: 'Bookmark' },
  { key: 'finance', label: 'Personal Finance', category: 'life', description: 'Accounts, budgets, and transactions', iconName: 'Landmark' },
  { key: 'health', label: 'Health & Fitness', category: 'life', description: 'Vitals, workouts, and wellness logs', iconName: 'Heart' },
  { key: 'travel', label: 'Travel & Trips', category: 'life', description: 'Itineraries, packing lists, and bookings', iconName: 'Plane' },
  { key: 'assets', label: 'Assets & Inventory', category: 'life', description: 'Valuables, warranties, and maintenance', iconName: 'Package' },
  { key: 'decisions', label: 'Decisions & Reflection', category: 'life', description: 'Decision logs and retrospective reviews', iconName: 'Scale' },
  { key: 'dashboards', label: 'Custom Dashboards', category: 'system', description: 'Bento-grid query widgets', iconName: 'LayoutDashboard' },
  { key: 'collections', label: 'Collections & Databases', category: 'system', description: 'Structured multi-view databases', iconName: 'Layers' },
  { key: 'media', label: 'Audio & Media Hub', category: 'system', description: 'Voice recordings and multimedia attachments', iconName: 'Activity' },
  { key: 'plugins', label: 'Plugins & Extensions', category: 'system', description: 'Sandboxed capability extensions', iconName: 'Zap' },
];

export class VisibilityProfileManager {
  public getConfig(): DomainVisibilityConfig {
    return preferenceService.get<DomainVisibilityConfig>(DOMAIN_VISIBILITY_KEY, DEFAULT_DOMAIN_VISIBILITY, 'global-synced');
  }

  public async setProfile(profile: VisibilityProfileId): Promise<DomainVisibilityConfig> {
    let newConfig: DomainVisibilityConfig;
    if (profile === 'core') {
      newConfig = { ...CORE_DOMAIN_VISIBILITY, profile: 'core' };
    } else if (profile === 'personal-os') {
      newConfig = { ...DEFAULT_DOMAIN_VISIBILITY, profile: 'personal-os' };
    } else {
      const current = this.getConfig();
      newConfig = { ...current, profile: 'custom' };
    }

    await preferenceService.set(DOMAIN_VISIBILITY_KEY, newConfig, 'global-synced');
    return newConfig;
  }

  public async toggleDomain(domain: ProductDomainKey, visible: boolean): Promise<DomainVisibilityConfig> {
    const current = this.getConfig();
    const updated: DomainVisibilityConfig = {
      profile: 'custom',
      enabledDomains: {
        ...current.enabledDomains,
        [domain]: visible,
      },
    };

    await preferenceService.set(DOMAIN_VISIBILITY_KEY, updated, 'global-synced');
    return updated;
  }

  public isDomainVisible(domain: ProductDomainKey): boolean {
    const config = this.getConfig();
    return config.enabledDomains[domain] !== false;
  }

  public getVisibleDomains(): ProductDomainKey[] {
    const config = this.getConfig();
    return (Object.keys(config.enabledDomains) as ProductDomainKey[]).filter(
      (k) => config.enabledDomains[k] !== false
    );
  }

  public subscribe(callback: (config: DomainVisibilityConfig) => void): () => void {
    return preferenceService.subscribe(DOMAIN_VISIBILITY_KEY, callback);
  }
}

export const visibilityProfileManager = new VisibilityProfileManager();
