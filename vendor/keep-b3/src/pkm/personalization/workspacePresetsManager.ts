/**
 * Workspace Presets Manager
 * 
 * Manages built-in and user-custom workspace presets:
 * - Dynamic Context Slots: Resolves placeholders (e.g. Current Context root,
 *   Context primary doc, Active Daily Note) dynamically at runtime.
 * - Mobile Sequential Degradation: Adapts multi-pane presets into sequential
 *   tabs on mobile screens rather than attempting unreadable split columns.
 * - Preserves separation between synced semantic layout and device-local pixel geometry.
 */

import { AdvancedWorkspacePreset, DynamicSlotType, WorkspaceSurfaceDefinition } from './personalizationTypes';
import { preferenceService } from './preferenceService';

const WORKSPACE_PRESETS_KEY = 'workspace_presets_v16';

export const BUILTIN_WORKSPACE_PRESETS: AdvancedWorkspacePreset[] = [
  {
    id: 'preset-writing',
    name: 'Focused Writing',
    description: 'Minimal editor canvas for deep distraction-free drafting',
    iconName: 'PenTool',
    splitOrientation: 'horizontal',
    splitRatio: 0.5,
    leftSurface: { type: 'note', title: 'Active Note', dynamicSlot: 'context-primary-doc' },
    isBuiltIn: true,
    order: 1,
    mobileBehavior: 'primary-surface-only',
  },
  {
    id: 'preset-research',
    name: 'Research & Extraction',
    description: 'Side-by-side Note and PDF Reader / References for synthesis',
    iconName: 'BookOpen',
    splitOrientation: 'vertical',
    splitRatio: 0.5,
    leftSurface: { type: 'note', title: 'Research Notes', dynamicSlot: 'active-context-root' },
    rightSurface: { type: 'pdf', title: 'Source Material' },
    isBuiltIn: true,
    order: 2,
    preferredForContextTypes: ['course', 'learning', 'reference'],
    mobileBehavior: 'sequential-tabs',
  },
  {
    id: 'preset-planning',
    name: 'Planning & Agenda',
    description: 'Projects / Task Kanban alongside Calendar & Time-blocking',
    iconName: 'Target',
    splitOrientation: 'vertical',
    splitRatio: 0.5,
    leftSurface: { type: 'goals-projects', title: 'Projects & Tasks', dynamicSlot: 'context-tasks' },
    rightSurface: { type: 'calendar', title: 'Calendar Agenda', dynamicSlot: 'context-agenda' },
    isBuiltIn: true,
    order: 3,
    preferredForContextTypes: ['project', 'sprint'],
    mobileBehavior: 'sequential-tabs',
  },
  {
    id: 'preset-review',
    name: 'Review & Reflection',
    description: 'Weekly / Sprint Review dashboard with source note inspector',
    iconName: 'Scale',
    splitOrientation: 'vertical',
    splitRatio: 0.55,
    leftSurface: { type: 'review', title: 'Review Dashboard' },
    rightSurface: { type: 'note', title: 'Daily Notes & Log', dynamicSlot: 'current-daily-note' },
    isBuiltIn: true,
    order: 4,
    mobileBehavior: 'sequential-tabs',
  },
  {
    id: 'preset-spatial',
    name: 'Spatial Canvas & Notes',
    description: 'Visual whiteboarding canvas alongside structured outliner',
    iconName: 'LayoutDashboard',
    splitOrientation: 'vertical',
    splitRatio: 0.5,
    leftSurface: { type: 'canvas', title: 'Spatial Canvas' },
    rightSurface: { type: 'note', title: 'Outliner Notes' },
    isBuiltIn: true,
    order: 5,
    mobileBehavior: 'sequential-tabs',
  },
];

export class WorkspacePresetsManager {
  public getPresets(): AdvancedWorkspacePreset[] {
    const userCustom = preferenceService.get<AdvancedWorkspacePreset[]>(WORKSPACE_PRESETS_KEY, [], 'global-synced');
    return [...BUILTIN_WORKSPACE_PRESETS, ...userCustom].sort((a, b) => a.order - b.order);
  }

  public getPresetById(id: string): AdvancedWorkspacePreset | undefined {
    return this.getPresets().find((p) => p.id === id);
  }

  public async saveCustomPreset(preset: Omit<AdvancedWorkspacePreset, 'id' | 'isBuiltIn' | 'order'>): Promise<AdvancedWorkspacePreset> {
    const customPresets = preferenceService.get<AdvancedWorkspacePreset[]>(WORKSPACE_PRESETS_KEY, [], 'global-synced');
    const newPreset: AdvancedWorkspacePreset = {
      ...preset,
      id: `custom-preset-${Date.now()}`,
      isBuiltIn: false,
      order: BUILTIN_WORKSPACE_PRESETS.length + customPresets.length + 1,
    };

    const updated = [...customPresets, newPreset];
    await preferenceService.set(WORKSPACE_PRESETS_KEY, updated, 'global-synced');
    return newPreset;
  }

  public async deleteCustomPreset(id: string): Promise<boolean> {
    const customPresets = preferenceService.get<AdvancedWorkspacePreset[]>(WORKSPACE_PRESETS_KEY, [], 'global-synced');
    const filtered = customPresets.filter((p) => p.id !== id);
    if (filtered.length === customPresets.length) return false;

    await preferenceService.set(WORKSPACE_PRESETS_KEY, filtered, 'global-synced');
    return true;
  }

  /**
   * Resolves dynamic context placeholders for a surface definition at runtime
   */
  public resolveDynamicSurface(
    surface: WorkspaceSurfaceDefinition,
    contextInfo?: {
      activeContextRootNoteId?: string;
      currentDailyNoteId?: string;
      contextPrimaryDocId?: string;
    }
  ): WorkspaceSurfaceDefinition {
    if (!surface.dynamicSlot) {
      return surface;
    }

    const resolved = { ...surface };
    switch (surface.dynamicSlot) {
      case 'active-context-root':
        if (contextInfo?.activeContextRootNoteId) {
          resolved.resourceId = contextInfo.activeContextRootNoteId;
        }
        break;
      case 'current-daily-note':
        if (contextInfo?.currentDailyNoteId) {
          resolved.resourceId = contextInfo.currentDailyNoteId;
        }
        break;
      case 'context-primary-doc':
        if (contextInfo?.contextPrimaryDocId) {
          resolved.resourceId = contextInfo.contextPrimaryDocId;
        }
        break;
      case 'context-tasks':
      case 'context-agenda':
        // Handled directly by domain workspace component
        break;
    }

    return resolved;
  }
}

export const workspacePresetsManager = new WorkspacePresetsManager();
