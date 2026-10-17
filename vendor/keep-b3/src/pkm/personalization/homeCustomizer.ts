/**
 * Home Layout & Section Customizer
 * 
 * Manages the layout, section ordering, item limits, and density of the Personal OS Home View:
 * - Built-in layout presets: Balanced, Minimal, Planning
 * - User-level section reordering & visibility controls
 * - Item limits per section (e.g. max 3-6 items)
 * - Safe Reset: Restores default dashboard layout without touching canonical domain data
 */

import { HomeCustomizationConfig, HomeLayoutPresetId, HomeSectionConfig, HomeSectionId } from './personalizationTypes';
import {
  preferenceService,
  DEFAULT_HOME_CONFIG,
  MINIMAL_HOME_CONFIG,
  PLANNING_HOME_CONFIG,
} from './preferenceService';

const HOME_CONFIG_KEY = 'home_customization';

export class HomeCustomizer {
  public getConfig(): HomeCustomizationConfig {
    const stored = preferenceService.get<HomeCustomizationConfig>(HOME_CONFIG_KEY, DEFAULT_HOME_CONFIG, 'global-synced');
    // Ensure all standard sections exist
    const storedMap = new Map(stored.sections.map((s) => [s.id, s]));
    const mergedSections: HomeSectionConfig[] = [];

    for (const def of DEFAULT_HOME_CONFIG.sections) {
      if (storedMap.has(def.id)) {
        mergedSections.push(storedMap.get(def.id)!);
      } else {
        mergedSections.push({ ...def });
      }
    }

    return {
      ...stored,
      sections: mergedSections.sort((a, b) => a.order - b.order),
    };
  }

  public async setPreset(presetId: HomeLayoutPresetId): Promise<HomeCustomizationConfig> {
    let config: HomeCustomizationConfig;
    switch (presetId) {
      case 'minimal':
        config = { ...MINIMAL_HOME_CONFIG };
        break;
      case 'planning':
        config = { ...PLANNING_HOME_CONFIG };
        break;
      case 'balanced':
      default:
        config = { ...DEFAULT_HOME_CONFIG };
        break;
    }

    await preferenceService.set(HOME_CONFIG_KEY, config, 'global-synced');
    return config;
  }

  public async toggleSection(sectionId: HomeSectionId, isVisible: boolean): Promise<HomeCustomizationConfig> {
    const current = this.getConfig();
    const updatedSections = current.sections.map((sec) => {
      if (sec.id === sectionId) {
        return { ...sec, isVisible };
      }
      return sec;
    });

    const updated: HomeCustomizationConfig = {
      ...current,
      presetId: 'custom',
      sections: updatedSections,
    };

    await preferenceService.set(HOME_CONFIG_KEY, updated, 'global-synced');
    return updated;
  }

  public async updateItemLimit(sectionId: HomeSectionId, itemLimit: number): Promise<HomeCustomizationConfig> {
    const current = this.getConfig();
    const clampedLimit = Math.max(1, Math.min(15, itemLimit));
    const updatedSections = current.sections.map((sec) => {
      if (sec.id === sectionId) {
        return { ...sec, itemLimit: clampedLimit };
      }
      return sec;
    });

    const updated: HomeCustomizationConfig = {
      ...current,
      presetId: 'custom',
      sections: updatedSections,
    };

    await preferenceService.set(HOME_CONFIG_KEY, updated, 'global-synced');
    return updated;
  }

  public async reorderSection(sectionId: HomeSectionId, direction: 'up' | 'down'): Promise<HomeCustomizationConfig> {
    const current = this.getConfig();
    const sections = [...current.sections];
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return current;

    if (direction === 'up' && index > 0) {
      const temp = sections[index];
      sections[index] = sections[index - 1];
      sections[index - 1] = temp;
    } else if (direction === 'down' && index < sections.length - 1) {
      const temp = sections[index];
      sections[index] = sections[index + 1];
      sections[index + 1] = temp;
    }

    const renumbered = sections.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updated: HomeCustomizationConfig = {
      ...current,
      presetId: 'custom',
      sections: renumbered,
    };

    await preferenceService.set(HOME_CONFIG_KEY, updated, 'global-synced');
    return updated;
  }

  public async resetToDefault(): Promise<HomeCustomizationConfig> {
    await preferenceService.reset(HOME_CONFIG_KEY, DEFAULT_HOME_CONFIG, 'global-synced');
    return DEFAULT_HOME_CONFIG;
  }

  public subscribe(callback: (config: HomeCustomizationConfig) => void): () => void {
    return preferenceService.subscribe(HOME_CONFIG_KEY, callback);
  }
}

export const homeCustomizer = new HomeCustomizer();
