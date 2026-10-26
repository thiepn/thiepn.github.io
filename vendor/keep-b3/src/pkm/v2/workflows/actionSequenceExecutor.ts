/**
 * PKM V2.3 — Centralized Action Sequence Executor
 * 
 * Executes bounded linear action sequences for Workflow Presets and Routine action steps.
 * Enforces strict architectural constraints:
 * - Max 10 steps
 * - Strictly NO arbitrary code evaluation or loops
 * - Prevents destructive/external actions
 * - Produces complete execution reports
 */

import { WorkflowPresetStep, WorkflowExecutionReport } from './workflowTypes';
import { v2ActionRegistry } from '../core/actions/actionSystem';

const MAX_STEPS = 10;

export class ActionSequenceExecutor {
  /**
   * Executes a sequence of steps sequentially with error boundaries
   */
  public async executeSequence(
    sequenceId: string,
    sequenceName: string,
    steps: WorkflowPresetStep[],
    runtimeContext: any = {}
  ): Promise<WorkflowExecutionReport> {
    const report: WorkflowExecutionReport = {
      presetId: sequenceId,
      presetName: sequenceName,
      startedAt: new Date().toISOString(),
      success: true,
      totalSteps: steps.length,
      completedSteps: 0,
      stepResults: [],
    };

    if (steps.length > MAX_STEPS) {
      report.success = false;
      report.errorMessage = `Sequence exceeds maximum allowed bound of ${MAX_STEPS} steps.`;
      report.completedAt = new Date().toISOString();
      return report;
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepIndex = i + 1;

      // 1. Action lookup
      const action = v2ActionRegistry.get(step.actionId);
      if (!action) {
        report.stepResults.push({
          stepIndex,
          actionId: step.actionId,
          success: false,
          message: `Action "${step.actionId}" is not registered in Action Registry.`,
        });

        if (!step.optional) {
          report.success = false;
          report.stoppedAtStep = stepIndex;
          report.errorMessage = `Step ${stepIndex} (${step.label}) failed: action not found.`;
          break;
        }
        continue;
      }

      // 2. Safety verification: Disallow destructive or unrestricted external writes
      if (action.risk === 'destructive' || action.risk === 'external') {
        report.stepResults.push({
          stepIndex,
          actionId: step.actionId,
          success: false,
          message: `Action "${action.label}" has risk level "${action.risk}" and cannot run in automated sequences.`,
        });

        if (!step.optional) {
          report.success = false;
          report.stoppedAtStep = stepIndex;
          report.errorMessage = `Step ${stepIndex} (${action.label}) prohibited due to safety risk policy.`;
          break;
        }
        continue;
      }

      // 3. Execute action
      try {
        const payload = {
          ...(step.args || {}),
          context: runtimeContext,
        };

        const result = await v2ActionRegistry.execute(step.actionId, payload);

        report.stepResults.push({
          stepIndex,
          actionId: step.actionId,
          success: result.success,
          message: result.error || 'Completed successfully',
        });

        if (result.success) {
          report.completedSteps++;
        } else {
          if (!step.optional) {
            report.success = false;
            report.stoppedAtStep = stepIndex;
            report.errorMessage = `Step ${stepIndex} (${action.label}) failed: ${result.error || 'Execution error'}`;
            break;
          }
        }
      } catch (err: any) {
        report.stepResults.push({
          stepIndex,
          actionId: step.actionId,
          success: false,
          message: err.message || 'Execution exception',
        });

        if (!step.optional) {
          report.success = false;
          report.stoppedAtStep = stepIndex;
          report.errorMessage = `Step ${stepIndex} exception: ${err.message || 'Unknown error'}`;
          break;
        }
      }
    }

    report.completedAt = new Date().toISOString();
    return report;
  }
}

export const actionSequenceExecutor = new ActionSequenceExecutor();
