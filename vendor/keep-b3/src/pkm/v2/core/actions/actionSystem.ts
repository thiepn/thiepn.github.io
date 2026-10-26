import { V2ActionDefinition, ActionResult, ActionRisk } from './actionTypes';
import { undoFoundationV2 } from './undoFoundation';

export class ActionSystemV2 {
  private actions: Map<string, V2ActionDefinition> = new Map();

  public register<P, R>(action: V2ActionDefinition<P, R>): void {
    this.actions.set(action.id, action);
  }

  public get(id: string): V2ActionDefinition | undefined {
    return this.actions.get(id);
  }

  public getAll(): V2ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  public async execute<P = any, R = any>(
    actionId: string,
    payload: P,
    confirmBypass?: boolean
  ): Promise<ActionResult<R>> {
    const action = this.actions.get(actionId);
    if (!action) {
      return {
        success: false,
        actionId,
        error: `Action ${actionId} not found in V2 registry`,
        timestamp: Date.now(),
      };
    }

    // Confirmation check
    if (action.requiresConfirmation && !confirmBypass) {
      // In interactive browser UI, window.confirm or custom modal is used
      // Return structured response indicating confirmation needed
    }

    try {
      const result = await action.handler(payload);
      if (result.success && result.undo) {
        undoFoundationV2.push(actionId, result.undo);
      }
      return result;
    } catch (err: any) {
      return {
        success: false,
        actionId,
        error: err?.message || String(err),
        timestamp: Date.now(),
      };
    }
  }
}

export const actionSystemV2 = new ActionSystemV2();
export const v2ActionRegistry = actionSystemV2;
