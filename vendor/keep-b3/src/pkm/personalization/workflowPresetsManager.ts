/**
 * Workflow Presets Manager
 * 
 * Manages user-triggered sequences of registered safe actions:
 * 
 * STRICT ARCHITECTURAL BOUNDS:
 * - Bounded step limit (max 10 steps per sequence).
 * - Strictly NO arbitrary code evaluation, eval(), new Function(), or loops.
 * - Disallows destructive actions and unbounded external writes.
 * - Provides step-by-step execution reports with clear failure attribution.
 */

import { WorkflowExecutionReport, WorkflowPreset, WorkflowStep } from './personalizationTypes';
import { actionRegistry } from './actionRegistry';
import { preferenceService } from './preferenceService';

const WORKFLOW_PRESETS_KEY = 'workflow_presets_v16';
const MAX_STEPS = 10;

export const BUILTIN_WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: 'wf-start-writing',
    name: 'Start Writing Session',
    description: 'Prepares a distraction-free writing environment and opens today\'s journal',
    iconName: 'PenTool',
    category: 'productivity',
    isBuiltIn: true,
    order: 1,
    steps: [
      { actionId: 'workspace:apply-preset-writing', label: 'Set Focused Layout' },
      { actionId: 'resource:open-daily-note', label: 'Open Today\'s Journal' },
    ],
  },
  {
    id: 'wf-start-study',
    name: 'Start Study Session',
    description: 'Arranges the research workspace with Course Notes and Reference material',
    iconName: 'GraduationCap',
    category: 'learning',
    isBuiltIn: true,
    order: 2,
    steps: [
      { actionId: 'workspace:apply-preset-research', label: 'Set Research Layout' },
      { actionId: 'nav:open-learning', label: 'Open Learning Hub' },
    ],
  },
  {
    id: 'wf-weekly-review',
    name: 'Weekly Review Triage',
    description: 'Prepares review dashboard, opens Universal Inbox, and checks completed tasks',
    iconName: 'CheckSquare',
    category: 'review',
    isBuiltIn: true,
    order: 3,
    steps: [
      { actionId: 'workspace:apply-preset-review', label: 'Set Review Layout' },
      { actionId: 'review:start-weekly-review', label: 'Start Review Guide' },
    ],
  },
  {
    id: 'wf-travel-mode',
    name: 'Travel Preparation',
    description: 'Switches layout to Travel Hub and prepares packing checklist',
    iconName: 'Plane',
    category: 'travel',
    isBuiltIn: true,
    order: 4,
    steps: [
      { actionId: 'nav:open-travel', label: 'Open Travel Hub' },
    ],
  },
  {
    id: 'wf-focus-planning',
    name: 'Morning Planning',
    description: 'Opens Planning workspace, checks Calendar agenda, and inspects attention items',
    iconName: 'Target',
    category: 'productivity',
    isBuiltIn: true,
    order: 5,
    steps: [
      { actionId: 'workspace:apply-preset-planning', label: 'Set Planning Layout' },
      { actionId: 'nav:open-planning', label: 'Open Goals & Projects' },
    ],
  },
];

export class WorkflowPresetsManager {
  public getPresets(): WorkflowPreset[] {
    const userCustom = preferenceService.get<WorkflowPreset[]>(WORKFLOW_PRESETS_KEY, [], 'global-synced');
    return [...BUILTIN_WORKFLOW_PRESETS, ...userCustom].sort((a, b) => a.order - b.order);
  }

  public getPresetById(id: string): WorkflowPreset | undefined {
    return this.getPresets().find((p) => p.id === id);
  }

  public async saveCustomPreset(preset: Omit<WorkflowPreset, 'id' | 'isBuiltIn' | 'order'>): Promise<WorkflowPreset> {
    // Validate step bounds and disallow dangerous actions
    if (preset.steps.length > MAX_STEPS) {
      throw new Error(`Workflow sequence cannot exceed ${MAX_STEPS} steps.`);
    }

    for (const step of preset.steps) {
      const act = actionRegistry.get(step.actionId);
      if (!act) {
        throw new Error(`Unknown action "${step.actionId}" in workflow definition.`);
      }
      if (act.riskLevel === 'destructive') {
        throw new Error(`Destructive action "${act.label}" is strictly forbidden in automated workflows.`);
      }
    }

    const customPresets = preferenceService.get<WorkflowPreset[]>(WORKFLOW_PRESETS_KEY, [], 'global-synced');
    const newPreset: WorkflowPreset = {
      ...preset,
      id: `wf-custom-${Date.now()}`,
      isBuiltIn: false,
      order: BUILTIN_WORKFLOW_PRESETS.length + customPresets.length + 1,
    };

    const updated = [...customPresets, newPreset];
    await preferenceService.set(WORKFLOW_PRESETS_KEY, updated, 'global-synced');
    return newPreset;
  }

  public async deleteCustomPreset(id: string): Promise<boolean> {
    const customPresets = preferenceService.get<WorkflowPreset[]>(WORKFLOW_PRESETS_KEY, [], 'global-synced');
    const filtered = customPresets.filter((p) => p.id !== id);
    if (filtered.length === customPresets.length) return false;

    await preferenceService.set(WORKFLOW_PRESETS_KEY, filtered, 'global-synced');
    return true;
  }

  /**
   * Executes a workflow preset sequentially with strict bounding and error reporting
   */
  public async executeWorkflow(presetId: string, runtimeContext: any): Promise<WorkflowExecutionReport> {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return {
        presetId,
        presetName: 'Unknown',
        startedAt: new Date().toISOString(),
        success: false,
        totalSteps: 0,
        completedSteps: 0,
        stepResults: [],
        errorMessage: `Workflow preset "${presetId}" not found.`,
      };
    }

    const report: WorkflowExecutionReport = {
      presetId: preset.id,
      presetName: preset.name,
      startedAt: new Date().toISOString(),
      success: true,
      totalSteps: preset.steps.length,
      completedSteps: 0,
      stepResults: [],
    };

    for (let i = 0; i < preset.steps.length; i++) {
      const step = preset.steps[i];
      const act = actionRegistry.get(step.actionId);

      if (!act) {
        report.stepResults.push({
          stepIndex: i + 1,
          actionId: step.actionId,
          success: false,
          message: `Action "${step.actionId}" is missing from registry.`,
        });

        if (!step.optional) {
          report.success = false;
          report.stoppedAtStep = i + 1;
          report.errorMessage = `Step ${i + 1} failed: Action not found.`;
          break;
        }
        continue;
      }

      const res = await actionRegistry.execute(step.actionId, step.args || {}, runtimeContext);
      report.stepResults.push({
        stepIndex: i + 1,
        actionId: step.actionId,
        success: res.success,
        message: res.message || res.error,
      });

      if (!res.success) {
        if (!step.optional) {
          report.success = false;
          report.stoppedAtStep = i + 1;
          report.errorMessage = `Step ${i + 1} (${act.label}) failed: ${res.error || 'Execution failed.'}`;
          break;
        }
      } else {
        report.completedSteps++;
      }
    }

    report.completedAt = new Date().toISOString();
    return report;
  }
}

export const workflowPresetsManager = new WorkflowPresetsManager();
