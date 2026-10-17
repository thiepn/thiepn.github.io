/**
 * V2.15 Workflow Preset Orchestrator (V2 Refined)
 * 
 * Objective:
 *   "Perform a small repeatable sequence of safe application Actions."
 * 
 * Strict Non-Negotiable Rules:
 *   - Zero arbitrary code execution / JavaScript evaluation
 *   - Zero loops, recursion, or hidden background automations
 *   - Context-aware parameters bounded to {{Today}}, {{CurrentContext}}, {{CurrentResource}}
 *   - Non-atomic sequences with clear step-level partial failure reporting
 *   - Clear distinction:
 *       Workflow Preset = user-triggered Action sequence
 *       Routine = repeatable tracked process
 *       Automation = trigger-driven rule
 */

export interface WorkflowStepDefinition {
  stepId: string;
  actionId: string;
  title: string;
  parameters?: Record<string, any>;
  riskLevel: 'safe' | 'low' | 'moderate';
  isRequired: boolean;
}

export interface WorkflowPresetDefinitionV2 {
  id: string;
  name: string;
  description: string;
  icon?: string;
  steps: WorkflowStepDefinition[];
  isBuiltin?: boolean;
  shortcut?: string;
}

export interface WorkflowExecutionResult {
  presetId: string;
  totalSteps: number;
  completedSteps: number;
  status: 'completed' | 'partial_failure' | 'failed';
  stepResults: {
    stepId: string;
    actionId: string;
    success: boolean;
    error?: string;
    details?: string;
  }[];
}

export const BUILTIN_V2_15_WORKFLOW_PRESETS: WorkflowPresetDefinitionV2[] = [
  {
    id: 'wp-start-study',
    name: 'Start Study Session',
    description: 'Activates research workspace, opens today’s study notes, and sets focus filter.',
    steps: [
      {
        stepId: 'step-1',
        actionId: 'workspace:open',
        title: 'Open Research Workspace',
        parameters: { workspaceId: 'ws-research' },
        riskLevel: 'safe',
        isRequired: true,
      },
      {
        stepId: 'step-2',
        actionId: 'daily:open-today',
        title: 'Open Today Study Log',
        parameters: { tag: 'study' },
        riskLevel: 'safe',
        isRequired: true,
      },
      {
        stepId: 'step-3',
        actionId: 'view:apply-filter',
        title: 'Filter Open Study Cards',
        parameters: { filter: 'type:card status:active' },
        riskLevel: 'safe',
        isRequired: false,
      },
    ],
    isBuiltin: true,
  },
  {
    id: 'wp-start-weekly-review',
    name: 'Weekly Review Workflow',
    description: 'Opens Weekly Review surface, attaches Universal Inbox view, and aggregates completed tasks.',
    steps: [
      {
        stepId: 'step-1',
        actionId: 'workspace:open',
        title: 'Open Weekly Review Setup',
        parameters: { workspaceId: 'ws-weekly-review' },
        riskLevel: 'safe',
        isRequired: true,
      },
      {
        stepId: 'step-2',
        actionId: 'review:initiate',
        title: 'Initiate Weekly Review State',
        parameters: { reviewType: 'weekly' },
        riskLevel: 'safe',
        isRequired: true,
      },
    ],
    isBuiltin: true,
  },
  {
    id: 'wp-plan-today',
    name: 'Plan Today',
    description: 'Opens Daily Note for today, shows overdue and today’s tasks in split panel.',
    steps: [
      {
        stepId: 'step-1',
        actionId: 'daily:open-today',
        title: 'Open Today Daily Note',
        parameters: {},
        riskLevel: 'safe',
        isRequired: true,
      },
      {
        stepId: 'step-2',
        actionId: 'view:open-saved-view',
        title: 'Open Tasks Today View',
        parameters: { savedViewId: 'sv-tasks-today' },
        riskLevel: 'safe',
        isRequired: false,
      },
    ],
    isBuiltin: true,
  },
];

export class WorkflowPresetOrchestratorV2 {
  private static instance: WorkflowPresetOrchestratorV2 | null = null;
  private presets: Map<string, WorkflowPresetDefinitionV2> = new Map();

  private constructor() {
    for (const p of BUILTIN_V2_15_WORKFLOW_PRESETS) {
      this.presets.set(p.id, p);
    }
  }

  public static getInstance(): WorkflowPresetOrchestratorV2 {
    if (!WorkflowPresetOrchestratorV2.instance) {
      WorkflowPresetOrchestratorV2.instance = new WorkflowPresetOrchestratorV2();
    }
    return WorkflowPresetOrchestratorV2.instance;
  }

  public getAllPresets(): WorkflowPresetDefinitionV2[] {
    return Array.from(this.presets.values());
  }

  public getPreset(id: string): WorkflowPresetDefinitionV2 | undefined {
    return this.presets.get(id);
  }

  public savePreset(preset: WorkflowPresetDefinitionV2): void {
    this.presets.set(preset.id, preset);
  }

  public deletePreset(id: string): boolean {
    const p = this.presets.get(id);
    if (p && !p.isBuiltin) {
      return this.presets.delete(id);
    }
    return false;
  }

  /**
   * Executes a workflow step-by-step with safety guards.
   * Does NOT pretend to be an atomic rollback transaction;
   * reports partial step completion transparently.
   */
  public async executePreset(
    presetId: string,
    actionHandlers: Record<string, (params: any) => Promise<boolean | void> | boolean | void>
  ): Promise<WorkflowExecutionResult> {
    const preset = this.presets.get(presetId);
    if (!preset) {
      return {
        presetId,
        totalSteps: 0,
        completedSteps: 0,
        status: 'failed',
        stepResults: [
          {
            stepId: 'init',
            actionId: 'none',
            success: false,
            error: `Workflow preset ${presetId} not found`,
          },
        ],
      };
    }

    const stepResults: WorkflowExecutionResult['stepResults'] = [];
    let completedSteps = 0;
    let hadFailure = false;

    for (const step of preset.steps) {
      const handler = actionHandlers[step.actionId];
      if (!handler) {
        hadFailure = true;
        stepResults.push({
          stepId: step.stepId,
          actionId: step.actionId,
          success: false,
          error: `Action handler '${step.actionId}' is unavailable or uninstalled.`,
        });
        if (step.isRequired) break;
        continue;
      }

      try {
        await handler(step.parameters || {});
        stepResults.push({
          stepId: step.stepId,
          actionId: step.actionId,
          success: true,
          details: `Completed ${step.title}`,
        });
        completedSteps++;
      } catch (err: any) {
        hadFailure = true;
        stepResults.push({
          stepId: step.stepId,
          actionId: step.actionId,
          success: false,
          error: err?.message || 'Step execution error',
        });
        if (step.isRequired) break;
      }
    }

    const status =
      completedSteps === preset.steps.length
        ? 'completed'
        : completedSteps > 0
        ? 'partial_failure'
        : 'failed';

    return {
      presetId,
      totalSteps: preset.steps.length,
      completedSteps,
      status,
      stepResults,
    };
  }
}

export const workflowPresetOrchestratorV2 = WorkflowPresetOrchestratorV2.getInstance();
