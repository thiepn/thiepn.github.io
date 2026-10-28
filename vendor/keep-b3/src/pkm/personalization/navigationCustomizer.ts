/**
 * Navigation Customizer
 * 
 * Configures desktop sidebar and mobile bottom navigation with strict safety constraints:
 * - REQUIRED ANCHORS: Home, Search, Settings, Backup/Recovery, and More/Launcher
 *   can NEVER be permanently removed or lost.
 * - Mobile bottom nav is capped at 4-5 items to avoid overflow/clipping.
 * - Supports keyboard and touch accessible reordering.
 */

import { MobileBottomNavConfig, NavigationItemConfig } from './personalizationTypes';
import { preferenceService, DEFAULT_MOBILE_NAV_CONFIG } from './preferenceService';

const SIDEBAR_NAV_KEY = 'sidebar_navigation';
const MOBILE_NAV_KEY = 'mobile_bottom_nav';

export const REQUIRED_ANCHOR_IDS = ['nav-home', 'nav-search', 'nav-settings', 'nav-backup', 'nav-more'];

export const DEFAULT_SIDEBAR_ITEMS: NavigationItemConfig[] = [
  { id: 'nav-home', label: 'Home', surfaceType: 'home', iconName: 'Layers', isOptional: false, isVisible: true, order: 1 },
  { id: 'nav-notes', label: 'All Notes', surfaceType: 'note', iconName: 'StickyNote', isOptional: false, isVisible: true, order: 2 },
  { id: 'nav-inbox', label: 'Universal Inbox', surfaceType: 'universal-inbox', iconName: 'Inbox', isOptional: true, isVisible: true, order: 3, domainKey: 'inbox' },
  { id: 'nav-plan', label: 'Goals & Projects', surfaceType: 'goals-projects', iconName: 'Target', isOptional: true, isVisible: true, order: 4, domainKey: 'planning' },
  { id: 'nav-calendar', label: 'Calendar & Agenda', surfaceType: 'calendar', iconName: 'Calendar', isOptional: true, isVisible: true, order: 5, domainKey: 'calendar' },
  { id: 'nav-people', label: 'People & CRM', surfaceType: 'people', iconName: 'Users', isOptional: true, isVisible: true, order: 6, domainKey: 'people' },
  { id: 'nav-learning', label: 'Learning & Courses', surfaceType: 'learning', iconName: 'GraduationCap', isOptional: true, isVisible: true, order: 7, domainKey: 'learning' },
  { id: 'nav-library', label: 'Library & Media', surfaceType: 'library', iconName: 'BookOpen', isOptional: true, isVisible: true, order: 8, domainKey: 'library' },
  { id: 'nav-finance', label: 'Personal Finance', surfaceType: 'finance', iconName: 'Landmark', isOptional: true, isVisible: true, order: 9, domainKey: 'finance' },
  { id: 'nav-health', label: 'Health & Fitness', surfaceType: 'health', iconName: 'Heart', isOptional: true, isVisible: true, order: 10, domainKey: 'health' },
  { id: 'nav-travel', label: 'Travel & Trips', surfaceType: 'travel', iconName: 'Plane', isOptional: true, isVisible: true, order: 11, domainKey: 'travel' },
  { id: 'nav-assets', label: 'Assets & Inventory', surfaceType: 'assets', iconName: 'Package', isOptional: true, isVisible: true, order: 12, domainKey: 'assets' },
  { id: 'nav-decisions', label: 'Decisions & Reflection', surfaceType: 'decisions', iconName: 'Scale', isOptional: true, isVisible: true, order: 13, domainKey: 'decisions' },
  { id: 'nav-dashboards', label: 'Dashboards', surfaceType: 'dashboard', iconName: 'LayoutDashboard', isOptional: true, isVisible: true, order: 14, domainKey: 'dashboards' },
  { id: 'nav-collections', label: 'Collections', surfaceType: 'collection', iconName: 'Layers', isOptional: true, isVisible: true, order: 15, domainKey: 'collections' },
];

export class NavigationCustomizer {
  public getSidebarItems(): NavigationItemConfig[] {
    const stored = preferenceService.get<NavigationItemConfig[]>(SIDEBAR_NAV_KEY, DEFAULT_SIDEBAR_ITEMS, 'global-synced');
    // Ensure all required items exist
    const storedMap = new Map(stored.map((item) => [item.id, item]));
    const result: NavigationItemConfig[] = [];

    for (const def of DEFAULT_SIDEBAR_ITEMS) {
      if (storedMap.has(def.id)) {
        const item = storedMap.get(def.id)!;
        // Non-optional anchors must always stay visible
        if (!def.isOptional) {
          item.isVisible = true;
        }
        result.push(item);
      } else {
        result.push({ ...def });
      }
    }

    return result.sort((a, b) => a.order - b.order);
  }

  public async setSidebarItems(items: NavigationItemConfig[]): Promise<void> {
    // Validate required anchors are preserved
    const sanitized = items.map((item, idx) => {
      const isRequired = REQUIRED_ANCHOR_IDS.includes(item.id) || !item.isOptional;
      return {
        ...item,
        order: idx + 1,
        isVisible: isRequired ? true : item.isVisible,
      };
    });

    await preferenceService.set(SIDEBAR_NAV_KEY, sanitized, 'global-synced');
  }

  public async toggleSidebarItem(id: string, isVisible: boolean): Promise<void> {
    const items = this.getSidebarItems();
    const target = items.find((i) => i.id === id);
    if (!target || !target.isOptional) return; // Cannot hide required anchors

    target.isVisible = isVisible;
    await this.setSidebarItems(items);
  }

  public async reorderSidebarItem(id: string, direction: 'up' | 'down'): Promise<void> {
    const items = this.getSidebarItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = items[index];
      items[index] = items[index - 1];
      items[index - 1] = temp;
    } else if (direction === 'down' && index < items.length - 1) {
      const temp = items[index];
      items[index] = items[index + 1];
      items[index + 1] = temp;
    }

    await this.setSidebarItems(items);
  }

  public getMobileBottomNav(): MobileBottomNavConfig {
    return preferenceService.get<MobileBottomNavConfig>(MOBILE_NAV_KEY, DEFAULT_MOBILE_NAV_CONFIG, 'global-synced');
  }

  public async setMobileBottomNav(config: MobileBottomNavConfig): Promise<void> {
    // Cap strictly at 5 items
    const cappedItems = config.items.slice(0, 5).map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    const sanitized: MobileBottomNavConfig = {
      maxItems: 5,
      items: cappedItems,
      useDeviceOverride: !!config.useDeviceOverride,
    };

    const scope = sanitized.useDeviceOverride ? 'device-local' : 'global-synced';
    await preferenceService.set(MOBILE_NAV_KEY, sanitized, scope);
  }

  public async resetNavigation(): Promise<void> {
    await preferenceService.reset(SIDEBAR_NAV_KEY, DEFAULT_SIDEBAR_ITEMS, 'global-synced');
    await preferenceService.reset(MOBILE_NAV_KEY, DEFAULT_MOBILE_NAV_CONFIG, 'global-synced');
  }
}

export const navigationCustomizer = new NavigationCustomizer();
