/**
 * Quick Capture Presets Manager
 * 
 * Configures capture destinations and presets for fleeting intake:
 * - Presets: Thought (Inbox), Task (Tasks list), Link (Library/URL), Fleeting Note (Daily Note)
 * - Auto-tagging & Template association
 * - Native Share sheet target mappings
 */

import { QuickCapturePreset } from './personalizationTypes';
import { preferenceService } from './preferenceService';

const CAPTURE_PRESETS_KEY = 'quick_capture_presets_v16';

export const BUILTIN_CAPTURE_PRESETS: QuickCapturePreset[] = [
  {
    id: 'cap-thought',
    name: 'Quick Thought',
    description: 'Direct intake into Universal Inbox for later triage',
    iconName: 'Inbox',
    destination: 'inbox',
    defaultTags: ['inbox', 'thought'],
    isDefault: true,
    order: 1,
  },
  {
    id: 'cap-task',
    name: 'Actionable Task',
    description: 'Capture a to-do item with immediate checklist format',
    iconName: 'CheckSquare',
    destination: 'tasks',
    defaultTags: ['task', 'todo'],
    order: 2,
  },
  {
    id: 'cap-daily-log',
    name: 'Daily Note Log',
    description: 'Appends bullet with timestamp to today\'s journal',
    iconName: 'Calendar',
    destination: 'daily-note',
    defaultTags: ['log'],
    order: 3,
  },
  {
    id: 'cap-reading',
    name: 'Reading / Link',
    description: 'Save URL or book reference into Library inbox',
    iconName: 'BookOpen',
    destination: 'library',
    defaultTags: ['reading', 'bookmarks'],
    order: 4,
  },
];

export class QuickCapturePresetsManager {
  public getPresets(): QuickCapturePreset[] {
    const userCustom = preferenceService.get<QuickCapturePreset[]>(CAPTURE_PRESETS_KEY, [], 'global-synced');
    return [...BUILTIN_CAPTURE_PRESETS, ...userCustom].sort((a, b) => a.order - b.order);
  }

  public getPresetById(id: string): QuickCapturePreset | undefined {
    return this.getPresets().find((p) => p.id === id);
  }

  public getDefaultPreset(): QuickCapturePreset {
    const presets = this.getPresets();
    return presets.find((p) => p.isDefault) || presets[0] || BUILTIN_CAPTURE_PRESETS[0];
  }

  public async savePreset(preset: Omit<QuickCapturePreset, 'id' | 'order'>): Promise<QuickCapturePreset> {
    const custom = preferenceService.get<QuickCapturePreset[]>(CAPTURE_PRESETS_KEY, [], 'global-synced');
    const newPreset: QuickCapturePreset = {
      ...preset,
      id: `cap-custom-${Date.now()}`,
      order: BUILTIN_CAPTURE_PRESETS.length + custom.length + 1,
    };

    const updated = [...custom, newPreset];
    await preferenceService.set(CAPTURE_PRESETS_KEY, updated, 'global-synced');
    return newPreset;
  }

  public async deletePreset(id: string): Promise<boolean> {
    const custom = preferenceService.get<QuickCapturePreset[]>(CAPTURE_PRESETS_KEY, [], 'global-synced');
    const filtered = custom.filter((p) => p.id !== id);
    if (filtered.length === custom.length) return false;

    await preferenceService.set(CAPTURE_PRESETS_KEY, filtered, 'global-synced');
    return true;
  }
}

export const quickCapturePresetsManager = new QuickCapturePresetsManager();
