export type ActionRisk = 'safe' | 'low' | 'moderate' | 'destructive' | 'external';

export interface ActionUndoDescriptor {
  description: string;
  revert: () => Promise<boolean> | boolean;
}

export interface ActionResult<T = any> {
  success: boolean;
  actionId: string;
  data?: T;
  error?: string;
  undo?: ActionUndoDescriptor;
  timestamp: number;
}

export interface V2ActionDefinition<TPayload = any, TResult = any> {
  id: string;
  label: string;
  description?: string;
  category: 'edit' | 'navigation' | 'system' | 'sync' | 'export' | 'ai';
  risk: ActionRisk;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  undoable?: boolean;
  handler: (payload: TPayload) => Promise<ActionResult<TResult>> | ActionResult<TResult>;
}
