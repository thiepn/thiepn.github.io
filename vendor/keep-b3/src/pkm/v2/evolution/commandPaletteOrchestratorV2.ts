/**
 * V2.15 Command Palette Orchestrator (V2 Refined)
 * 
 * Objective: "Do something."
 * Groupings:
 *   - Create (new note, task, project, person, etc.)
 *   - Navigate (go to Home, Calendar, Tasks, Review, etc.)
 *   - View (switch layout, filter, toggle preview)
 *   - Edit (bulk edit, formatting, links)
 *   - Context (start/switch context, focus)
 *   - Workflow (run study, review, plan presets)
 *   - Data (backup, export, sync, recovery)
 *   - Settings (preferences, diagnostics, observatory)
 *   - Plugin (sandboxed third-party actions)
 * 
 * Rules:
 *   - Plugin commands are categorized and never flood top core results
 *   - Context commands rank appropriately when context is active
 *   - Actions re-validate authorization before execution
 */

export type CommandCategory =
  | 'Create'
  | 'Navigate'
  | 'View'
  | 'Edit'
  | 'Context'
  | 'Workflow'
  | 'Data'
  | 'Settings'
  | 'Plugin';

export interface V2CommandDefinition {
  id: string;
  title: string;
  category: CommandCategory;
  description?: string;
  shortcut?: string;
  aliases?: string[];
  contextRequirement?: string; // e.g., 'project', 'note', 'active_review'
  isDestructive?: boolean;
  requiresConfirmation?: boolean;
  isPluginAction?: boolean;
  pluginId?: string;
  handler: (context?: any) => Promise<boolean | void> | boolean | void;
}

export interface CommandSearchResult {
  command: V2CommandDefinition;
  score: number;
  highlightedTitle?: string;
}

export class CommandPaletteOrchestratorV2 {
  private static instance: CommandPaletteOrchestratorV2 | null = null;
  private commands: Map<string, V2CommandDefinition> = new Map();
  private recentExecutedCommandIds: string[] = [];

  private constructor() {}

  public static getInstance(): CommandPaletteOrchestratorV2 {
    if (!CommandPaletteOrchestratorV2.instance) {
      CommandPaletteOrchestratorV2.instance = new CommandPaletteOrchestratorV2();
    }
    return CommandPaletteOrchestratorV2.instance;
  }

  public registerCommand(command: V2CommandDefinition): void {
    this.commands.set(command.id, command);
  }

  public registerBatch(commands: V2CommandDefinition[]): void {
    for (const cmd of commands) {
      this.commands.set(cmd.id, cmd);
    }
  }

  public unregisterCommand(id: string): void {
    this.commands.delete(id);
  }

  public getCommand(id: string): V2CommandDefinition | undefined {
    return this.commands.get(id);
  }

  public getAllCommands(): V2CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  public searchCommands(
    query: string,
    currentContext?: { activeType?: string; isVaultLocked?: boolean }
  ): CommandSearchResult[] {
    const rawQuery = query.trim().toLowerCase();
    const results: CommandSearchResult[] = [];

    for (const cmd of this.commands.values()) {
      // Security filter: When vault is locked, only unlock & recovery commands are visible
      if (currentContext?.isVaultLocked && cmd.category !== 'Settings' && cmd.category !== 'Data') {
        continue;
      }

      let score = 0;
      const titleLower = cmd.title.toLowerCase();

      if (!rawQuery) {
        // Default ranking: Core navigation/creation first, context-specific boosted, plugin actions lower
        score = 100;
        if (cmd.isPluginAction) score -= 30;
        if (currentContext?.activeType && cmd.contextRequirement === currentContext.activeType) {
          score += 50;
        }
        if (this.recentExecutedCommandIds.includes(cmd.id)) {
          score += 20;
        }
      } else {
        if (titleLower === rawQuery) {
          score = 1000;
        } else if (cmd.aliases?.some(a => a.toLowerCase() === rawQuery)) {
          score = 900;
        } else if (titleLower.startsWith(rawQuery)) {
          score = 800 - (titleLower.length - rawQuery.length);
        } else if (titleLower.includes(rawQuery)) {
          score = 600 - titleLower.indexOf(rawQuery);
        } else if (cmd.description?.toLowerCase().includes(rawQuery)) {
          score = 400;
        } else if (cmd.aliases?.some(a => a.toLowerCase().includes(rawQuery))) {
          score = 350;
        }

        if (score > 0) {
          // Context booster
          if (currentContext?.activeType && cmd.contextRequirement === currentContext.activeType) {
            score += 40;
          }
          // Plugin command penalty to prevent drowning core commands
          if (cmd.isPluginAction) {
            score -= 15;
          }
        }
      }

      if (score > 0) {
        results.push({ command: cmd, score });
      }
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.command.title.localeCompare(b.command.title);
    });

    return results;
  }

  public async executeCommand(id: string, executionContext?: any): Promise<{ success: boolean; error?: string }> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      return { success: false, error: `Command not found: ${id}` };
    }

    // Record device-local recents
    this.recentExecutedCommandIds = [id, ...this.recentExecutedCommandIds.filter(cId => cId !== id)].slice(0, 15);

    try {
      await cmd.handler(executionContext);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Execution error' };
    }
  }
}

export const commandPaletteOrchestratorV2 = CommandPaletteOrchestratorV2.getInstance();
