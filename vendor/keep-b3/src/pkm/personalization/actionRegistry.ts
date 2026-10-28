/**
 * Unified Action Registry
 * 
 * Central catalog of typed application actions consumed by:
 * - Menus & toolbars
 * - Command Palette
 * - Keyboard shortcuts
 * - Workflow Presets (bounded, user-triggered sequences)
 * - Plugin capabilities
 * 
 * Enforces risk levels:
 * - 'navigation': Zero state change, purely switches views
 * - 'safe-write': Standard user-triggered creation or preference updates
 * - 'destructive': Deletes/trashes items (FORBIDDEN in automatic workflows)
 * - 'external-write': Network writes (FORBIDDEN in automatic workflows)
 */

import { AppAction, ActionResult } from './personalizationTypes';

export class ActionRegistry {
  private actions: Map<string, AppAction> = new Map();

  constructor() {
    this.registerCoreActions();
  }

  public register(action: AppAction): void {
    this.actions.set(action.id, action);
  }

  public unregister(id: string): boolean {
    return this.actions.delete(id);
  }

  public get(id: string): AppAction | undefined {
    return this.actions.get(id);
  }

  public getAll(): AppAction[] {
    return Array.from(this.actions.values());
  }

  public getByCategory(category: string): AppAction[] {
    return this.getAll().filter((a) => a.category === category);
  }

  public search(query: string): AppAction[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();

    return this.getAll().filter((a) =>
      a.id.toLowerCase().includes(q) ||
      a.label.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  }

  public async execute(id: string, args: Record<string, any> = {}, runtimeContext: any): Promise<ActionResult> {
    const action = this.get(id);
    if (!action) {
      return {
        success: false,
        error: `Action "${id}" not found in Action Registry.`,
      };
    }

    if (action.isAvailable) {
      const avail = action.isAvailable(runtimeContext);
      if (!avail.available) {
        return {
          success: false,
          error: avail.reason || `Action "${action.label}" is currently unavailable in this context.`,
        };
      }
    }

    try {
      return await action.execute(args, runtimeContext);
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || `Failed to execute action "${action.label}".`,
      };
    }
  }

  private registerCoreActions(): void {
    // ------------------------------------------------------------------------
    // 1. Navigation Actions
    // ------------------------------------------------------------------------
    this.register({
      id: 'nav:open-home',
      label: 'Go to Home',
      description: 'Navigate to Personal OS Home Dashboard',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Layers',
      defaultShortcut: 'Mod+Shift+H',
      execute: async (_, ctx) => {
        ctx?.openHome?.();
        return { success: true, message: 'Opened Home' };
      },
    });

    this.register({
      id: 'nav:open-notes',
      label: 'Open All Notes',
      description: 'Browse the notes directory & filter views',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'StickyNote',
      defaultShortcut: 'Mod+Shift+N',
      execute: async (_, ctx) => {
        ctx?.openResource?.({ type: 'note', title: 'All Notes' });
        return { success: true, message: 'Opened Notes' };
      },
    });

    this.register({
      id: 'nav:open-search',
      label: 'Global Search',
      description: 'Search all notes, metadata, and PDF citations',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Search',
      defaultShortcut: 'Mod+Shift+F',
      execute: async (args, ctx) => {
        ctx?.openSearch?.(args?.query);
        return { success: true, message: 'Opened Search' };
      },
    });

    this.register({
      id: 'nav:open-command-palette',
      label: 'Open Command Palette',
      description: 'Quick action switcher and command launcher',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Command',
      defaultShortcut: 'Mod+K',
      execute: async (_, ctx) => {
        ctx?.openModal?.('shortcuts');
        return { success: true, message: 'Opened Command Palette' };
      },
    });

    this.register({
      id: 'nav:open-inbox',
      label: 'Open Universal Inbox',
      description: 'Triage capture items, fleeting thoughts, and external syncs',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Inbox',
      defaultShortcut: 'Mod+Shift+I',
      execute: async (_, ctx) => {
        ctx?.openUniversalInbox?.();
        return { success: true, message: 'Opened Universal Inbox' };
      },
    });

    this.register({
      id: 'nav:open-planning',
      label: 'Open Goals & Projects (PARA)',
      description: 'Manage active projects, goals, and life areas',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Target',
      execute: async (args, ctx) => {
        ctx?.openGoalsProjects?.(args?.initialTab);
        return { success: true, message: 'Opened Goals & Projects' };
      },
    });

    this.register({
      id: 'nav:open-calendar',
      label: 'Open Calendar & Agenda',
      description: 'View scheduled events, time blocks, and reminders',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Calendar',
      execute: async (_, ctx) => {
        ctx?.openCalendar?.();
        return { success: true, message: 'Opened Calendar' };
      },
    });

    this.register({
      id: 'nav:open-people',
      label: 'Open People & CRM',
      description: 'Personal relationships, contacts, and interaction logs',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Users',
      execute: async (_, ctx) => {
        ctx?.openPeople?.();
        return { success: true, message: 'Opened People' };
      },
    });

    this.register({
      id: 'nav:open-learning',
      label: 'Open Learning & Courses',
      description: 'Active courses, curricula, and flashcard review',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'GraduationCap',
      execute: async (_, ctx) => {
        ctx?.openLearning?.();
        return { success: true, message: 'Opened Learning' };
      },
    });

    this.register({
      id: 'nav:open-library',
      label: 'Open Library & Media',
      description: 'Books, articles, reading lists, and audio notes',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'BookOpen',
      execute: async (_, ctx) => {
        ctx?.openLibrary?.();
        return { success: true, message: 'Opened Library' };
      },
    });

    this.register({
      id: 'nav:open-finance',
      label: 'Open Personal Finance',
      description: 'Accounts, transactions, budgets, and net worth overview',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Landmark',
      execute: async (_, ctx) => {
        ctx?.openFinance?.();
        return { success: true, message: 'Opened Finance' };
      },
    });

    this.register({
      id: 'nav:open-health',
      label: 'Open Health & Fitness',
      description: 'Workouts, daily vitals, and wellness tracking',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Heart',
      execute: async (_, ctx) => {
        ctx?.openHealth?.();
        return { success: true, message: 'Opened Health' };
      },
    });

    this.register({
      id: 'nav:open-travel',
      label: 'Open Travel & Trips',
      description: 'Upcoming trips, itineraries, packing checklists',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Plane',
      execute: async (_, ctx) => {
        ctx?.openTravel?.();
        return { success: true, message: 'Opened Travel' };
      },
    });

    this.register({
      id: 'nav:open-assets',
      label: 'Open Assets & Inventory',
      description: 'Item tracking, warranties, and maintenance records',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Package',
      execute: async (_, ctx) => {
        ctx?.openAssets?.();
        return { success: true, message: 'Opened Assets' };
      },
    });

    this.register({
      id: 'nav:open-decisions',
      label: 'Open Decisions & Reflection',
      description: 'Structured decision logs and retrospective audits',
      category: 'navigation',
      riskLevel: 'navigation',
      iconName: 'Scale',
      execute: async (_, ctx) => {
        ctx?.openDecisions?.();
        return { success: true, message: 'Opened Decisions' };
      },
    });

    // ------------------------------------------------------------------------
    // 2. Resource & Creation Actions
    // ------------------------------------------------------------------------
    this.register({
      id: 'resource:new-note',
      label: 'Create New Note',
      description: 'Create a blank note or checklist',
      category: 'resource',
      riskLevel: 'safe-write',
      iconName: 'Plus',
      defaultShortcut: 'Mod+Alt+N',
      execute: async (args, ctx) => {
        const created = await ctx?.handleCreateNote?.(args?.type || 'text');
        return { success: true, message: 'Created new note', data: created };
      },
    });

    this.register({
      id: 'resource:open-daily-note',
      label: 'Open Today\'s Daily Note',
      description: 'Navigate to or create the journal entry for today',
      category: 'resource',
      riskLevel: 'safe-write',
      iconName: 'Calendar',
      defaultShortcut: 'Mod+Shift+D',
      execute: async (args, ctx) => {
        await ctx?.openDailyNote?.(args?.date || new Date());
        return { success: true, message: 'Opened Daily Note' };
      },
    });

    this.register({
      id: 'resource:quick-capture',
      label: 'Quick Capture Fleeting Idea',
      description: 'Open the rapid capture modal with voice / text intake',
      category: 'capture',
      riskLevel: 'safe-write',
      iconName: 'Zap',
      defaultShortcut: 'Mod+Shift+C',
      execute: async (args, ctx) => {
        ctx?.openQuickCapture?.(args);
        return { success: true, message: 'Opened Quick Capture' };
      },
    });

    // ------------------------------------------------------------------------
    // 3. Workspace Layout Actions
    // ------------------------------------------------------------------------
    this.register({
      id: 'workspace:split-vertical',
      label: 'Split Workspace Side-by-Side',
      description: 'Divide active view into left and right panes',
      category: 'workspace',
      riskLevel: 'navigation',
      iconName: 'Columns',
      defaultShortcut: 'Mod+\\',
      execute: async (_, ctx) => {
        ctx?.splitWorkspace?.('vertical');
        return { success: true, message: 'Split workspace vertically' };
      },
    });

    this.register({
      id: 'workspace:close-tab',
      label: 'Close Active Tab',
      description: 'Close currently focused workspace tab',
      category: 'workspace',
      riskLevel: 'navigation',
      iconName: 'X',
      defaultShortcut: 'Mod+W',
      execute: async (_, ctx) => {
        ctx?.closeActiveTab?.();
        return { success: true, message: 'Closed active tab' };
      },
    });

    this.register({
      id: 'workspace:apply-preset-writing',
      label: 'Apply Focused Writing Preset',
      description: 'Single-pane distraction-free writing layout',
      category: 'workspace',
      riskLevel: 'navigation',
      iconName: 'PenTool',
      execute: async (_, ctx) => {
        ctx?.applyPreset?.('default-clean');
        return { success: true, message: 'Applied Writing Workspace' };
      },
    });

    this.register({
      id: 'workspace:apply-preset-research',
      label: 'Apply Research Preset',
      description: 'Side-by-side Note and PDF source reader',
      category: 'workspace',
      riskLevel: 'navigation',
      iconName: 'BookOpen',
      execute: async (_, ctx) => {
        ctx?.applyPreset?.('research');
        return { success: true, message: 'Applied Research Workspace' };
      },
    });

    this.register({
      id: 'workspace:apply-preset-planning',
      label: 'Apply Planning Preset',
      description: 'Projects / Task Kanban alongside Calendar Agenda',
      category: 'workspace',
      riskLevel: 'navigation',
      iconName: 'Target',
      execute: async (_, ctx) => {
        ctx?.applyPreset?.('planning');
        return { success: true, message: 'Applied Planning Workspace' };
      },
    });

    this.register({
      id: 'workspace:apply-preset-review',
      label: 'Apply Review Preset',
      description: 'Review dashboard with daily note history',
      category: 'workspace',
      riskLevel: 'navigation',
      iconName: 'Scale',
      execute: async (_, ctx) => {
        ctx?.applyPreset?.('comparison');
        return { success: true, message: 'Applied Review Workspace' };
      },
    });

    // ------------------------------------------------------------------------
    // 4. Review & Routine Actions
    // ------------------------------------------------------------------------
    this.register({
      id: 'review:start-weekly-review',
      label: 'Start Weekly Review',
      description: 'Guided walkthrough of completed tasks, projects, and reflections',
      category: 'review',
      riskLevel: 'navigation',
      iconName: 'CheckSquare',
      execute: async (_, ctx) => {
        ctx?.openReview?.();
        return { success: true, message: 'Opened Weekly Review' };
      },
    });

    // ------------------------------------------------------------------------
    // 5. Tools & Security Actions
    // ------------------------------------------------------------------------
    this.register({
      id: 'tools:open-settings',
      label: 'Open Settings & Preferences',
      description: 'Configure theme, layout density, and sync',
      category: 'tools',
      riskLevel: 'navigation',
      iconName: 'SlidersHorizontal',
      defaultShortcut: 'Mod+,',
      execute: async (_, ctx) => {
        ctx?.openModal?.('settings');
        return { success: true, message: 'Opened Settings' };
      },
    });

    this.register({
      id: 'tools:open-vault-doctor',
      label: 'Run Vault Doctor Diagnostics',
      description: 'Inspect vault health, broken links, and metadata integrity',
      category: 'tools',
      riskLevel: 'navigation',
      iconName: 'Activity',
      execute: async (_, ctx) => {
        ctx?.openModal?.('vault_doctor');
        return { success: true, message: 'Opened Vault Doctor' };
      },
    });

    this.register({
      id: 'tools:lock-vault',
      label: 'Lock Vault Immediately',
      description: 'Encrypt memory keys and lock the application interface',
      category: 'tools',
      riskLevel: 'safe-write',
      iconName: 'Lock',
      defaultShortcut: 'Mod+Shift+L',
      execute: async (_, ctx) => {
        ctx?.lockVault?.();
        return { success: true, message: 'Vault Locked' };
      },
    });
  }
}

export const actionRegistry = new ActionRegistry();
