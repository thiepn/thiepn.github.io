import { CanvasHistoryStep, CanvasNode, CanvasConnector, CanvasStroke } from './canvasTypes';

export class CanvasHistoryManager {
  private undoStack: CanvasHistoryStep[] = [];
  private redoStack: CanvasHistoryStep[] = [];
  private maxHistory = 40;

  constructor(initialState?: CanvasHistoryStep) {
    if (initialState) {
      this.undoStack.push(this.cloneStep(initialState));
    }
  }

  private cloneStep(step: CanvasHistoryStep): CanvasHistoryStep {
    return {
      nodes: JSON.parse(JSON.stringify(step.nodes)),
      connectors: JSON.parse(JSON.stringify(step.connectors)),
      strokes: JSON.parse(JSON.stringify(step.strokes)),
    };
  }

  push(state: { nodes: CanvasNode[]; connectors: CanvasConnector[]; strokes: CanvasStroke[] }): void {
    const step = this.cloneStep(state);
    this.undoStack.push(step);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(currentState: CanvasHistoryStep): CanvasHistoryStep | null {
    if (this.undoStack.length <= 1) return null;

    const current = this.undoStack.pop();
    if (current) {
      this.redoStack.push(this.cloneStep(currentState));
    }

    const prev = this.undoStack[this.undoStack.length - 1];
    return prev ? this.cloneStep(prev) : null;
  }

  redo(currentState: CanvasHistoryStep): CanvasHistoryStep | null {
    if (this.redoStack.length === 0) return null;

    const next = this.redoStack.pop();
    if (next) {
      this.undoStack.push(this.cloneStep(next));
      return this.cloneStep(next);
    }

    return null;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  reset(state: CanvasHistoryStep): void {
    this.undoStack = [this.cloneStep(state)];
    this.redoStack = [];
  }
}
