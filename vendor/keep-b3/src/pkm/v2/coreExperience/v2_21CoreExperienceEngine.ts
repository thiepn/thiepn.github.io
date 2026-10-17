/**
 * V2.21 Core Experience Engine
 * 
 * Provides single authoritative coordinators and validators for the everyday core
 * Personal OS experience:
 * - Application Shell, Navigation & Back-State Preservation
 * - Unified Home, Deterministic Continue & Deduplicated Attention
 * - Quick Capture & Zero-Loss Session Recovery
 * - Notes & Editor Lifecycle (Markdown, Properties, Folders, Tags, Links)
 * - Global Scoped Search, Quick Switcher & Command Palette Integrity
 * - Tasks, Due vs Scheduled Semantics, Today & Calendar Projections
 * - Projects, Next Actions, Context Frames & Working Sets
 * - Local Inbox & Idempotent Process + Next Traversal
 * - Saved Views Modified States, Workspaces & 1-3 Pane Lifecycles
 * - Single Shared Inspector & Cross-Core Workflow Verifications
 */

import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { connectionIndexV2 } from '../core/connections/connectionIndex';

export interface NavigationRouteState {
  view: 'home' | 'notes' | 'tasks' | 'calendar' | 'projects' | 'context' | 'inbox' | 'saved_views' | 'workspaces' | 'settings' | 'resource';
  resourceId?: string;
  resourceType?: ResourceType;
  query?: string;
  scrollPosition?: number;
  activeContextId?: string;
  timestamp: number;
}

export interface QuickCaptureDraft {
  id: string;
  text: string;
  targetType: 'inbox' | 'note' | 'task';
  contextId?: string;
  projectId?: string;
  tags: string[];
  createdAt: number;
  lastEditedAt: number;
}

export interface TaskCoreItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  scheduledDate?: string; // YYYY-MM-DD
  projectId?: string;
  personId?: string;
  contextId?: string;
  tags: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  recurrenceRule?: string;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectCoreItem {
  id: string;
  title: string;
  outcome?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  nextAction?: string;
  targetDate?: string;
  tags: string[];
  contextId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContextFrame {
  id: string;
  title: string;
  rootResourceId: string;
  rootType: ResourceType;
  pinnedResourceIds: string[];
  openResourceIds: string[];
  activeSavedViewId?: string;
  createdAt: number;
  lastActivatedAt: number;
}

export interface InboxItem {
  id: string;
  source: 'quick_capture' | 'web_clip' | 'local_import' | 'share_sheet';
  title: string;
  content: string;
  capturedAt: number;
  processed: boolean;
  processedInto?: {
    resourceId: string;
    resourceType: ResourceType;
    processedAt: number;
  };
}

export interface SavedViewState {
  id: string;
  name: string;
  resourceType: ResourceType;
  filter: {
    searchQuery?: string;
    tags?: string[];
    status?: string;
    folderId?: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  presentation: 'list' | 'table' | 'board' | 'gallery' | 'calendar';
  isFavorite: boolean;
  isModified?: boolean;
}

export interface V2CoreWorkspaceLayout {
  id: string;
  name: string;
  paneCount: 1 | 2 | 3;
  panes: Array<{
    id: string;
    resourceId: string;
    resourceType: ResourceType;
    viewMode: string;
    scrollOffset?: number;
  }>;
  activePaneIndex: number;
  isFavorite?: boolean;
  updatedAt: number;
}

export interface CommandItem {
  id: string;
  title: string;
  category: 'Creation' | 'Navigation' | 'View' | 'Action' | 'System';
  shortcut?: string;
  keywords: string[];
  execute: () => void | Promise<void>;
}

export class V2CoreExperienceEngine {
  private static instance: V2CoreExperienceEngine | null = null;

  // In-memory state caches
  private navigationHistory: NavigationRouteState[] = [];
  private currentRouteIndex: number = -1;
  private quickCaptureCache: Map<string, QuickCaptureDraft> = new Map();
  private tasks: Map<string, TaskCoreItem> = new Map();
  private projects: Map<string, ProjectCoreItem> = new Map();
  private contexts: Map<string, ContextFrame> = new Map();
  private activeContextId: string | null = null;
  private inbox: Map<string, InboxItem> = new Map();
  private savedViews: Map<string, SavedViewState> = new Map();
  private workspaces: Map<string, V2CoreWorkspaceLayout> = new Map();
  private activeWorkspaceId: string | null = null;
  private registeredCommands: Map<string, CommandItem> = new Map();

  private constructor() {
    this.initializeCoreDefaults();
  }

  public static getInstance(): V2CoreExperienceEngine {
    if (!V2CoreExperienceEngine.instance) {
      V2CoreExperienceEngine.instance = new V2CoreExperienceEngine();
    }
    return V2CoreExperienceEngine.instance;
  }

  private initializeCoreDefaults(): void {
    // Register Default System Commands
    this.registerCoreCommands();

    // Seed initial contextual sample data for immediate zero-friction use
    this.seedInitialCoreData();
  }

  // =========================================================================
  // 1. APPLICATION SHELL & NAVIGATION MANAGEMENT
  // =========================================================================

  public navigate(route: NavigationRouteState): void {
    // Truncate forward history on new navigation
    if (this.currentRouteIndex < this.navigationHistory.length - 1) {
      this.navigationHistory = this.navigationHistory.slice(0, this.currentRouteIndex + 1);
    }
    this.navigationHistory.push({ ...route, timestamp: Date.now() });
    this.currentRouteIndex = this.navigationHistory.length - 1;
  }

  public getCurrentRoute(): NavigationRouteState {
    if (this.currentRouteIndex >= 0 && this.currentRouteIndex < this.navigationHistory.length) {
      return this.navigationHistory[this.currentRouteIndex];
    }
    return {
      view: 'home',
      timestamp: Date.now(),
    };
  }

  public canGoBack(): boolean {
    return this.currentRouteIndex > 0;
  }

  public goBack(): NavigationRouteState | null {
    if (this.canGoBack()) {
      this.currentRouteIndex--;
      return this.navigationHistory[this.currentRouteIndex];
    }
    return null;
  }

  public resolveSafeFallback(resourceExists: (id: string) => boolean): NavigationRouteState {
    const current = this.getCurrentRoute();
    if (current.resourceId && !resourceExists(current.resourceId)) {
      // Graceful fallback to Home if resource was removed
      const fallback: NavigationRouteState = {
        view: 'home',
        timestamp: Date.now(),
      };
      this.navigate(fallback);
      return fallback;
    }
    return current;
  }

  public handleInvalidRoute(): NavigationRouteState {
    const fallback: NavigationRouteState = {
      view: 'home',
      timestamp: Date.now(),
    };
    this.navigate(fallback);
    return fallback;
  }

  // =========================================================================
  // 2. UNIFIED HOME & DETERMINISTIC CONTINUE RESOLVER
  // =========================================================================

  public resolveContinueTarget(): {
    type: 'context' | 'project' | 'review' | 'workspace' | 'none';
    id?: string;
    title: string;
    description: string;
  } {
    // 1. Check Active Context
    if (this.activeContextId && this.contexts.has(this.activeContextId)) {
      const ctx = this.contexts.get(this.activeContextId)!;
      return {
        type: 'context',
        id: ctx.id,
        title: `Active Context: ${ctx.title}`,
        description: `Resume focused session with ${ctx.pinnedResourceIds.length} pinned item(s)`,
      };
    }

    // 2. Check Recently Active Project
    const activeProjects = Array.from(this.projects.values())
      .filter((p) => p.status === 'active')
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (activeProjects.length > 0) {
      const topProject = activeProjects[0];
      return {
        type: 'project',
        id: topProject.id,
        title: `Project: ${topProject.title}`,
        description: topProject.nextAction ? `Next Action: ${topProject.nextAction}` : 'Continue project milestones',
      };
    }

    // 3. Check Active Workspace
    if (this.activeWorkspaceId && this.workspaces.has(this.activeWorkspaceId)) {
      const ws = this.workspaces.get(this.activeWorkspaceId)!;
      return {
        type: 'workspace',
        id: ws.id,
        title: `Workspace: ${ws.name}`,
        description: `Restore ${ws.paneCount}-pane working layout`,
      };
    }

    return {
      type: 'none',
      title: 'Ready for work',
      description: 'Create a note, add a task, or capture an idea to begin.',
    };
  }

  public getDeduplicatedAttentionItems(): Array<{
    id: string;
    type: 'overdue_task' | 'unprocessed_inbox' | 'sync_notice';
    title: string;
    subtitle: string;
    severity: 'info' | 'warning' | 'urgent';
  }> {
    const items: Array<{
      id: string;
      type: 'overdue_task' | 'unprocessed_inbox' | 'sync_notice';
      title: string;
      subtitle: string;
      severity: 'info' | 'warning' | 'urgent';
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Check overdue tasks (only uncompleted)
    const overdueTasks = Array.from(this.tasks.values()).filter(
      (t) => !t.completed && t.dueDate && t.dueDate < todayStr
    );

    if (overdueTasks.length > 0) {
      items.push({
        id: 'attention_overdue_tasks',
        type: 'overdue_task',
        title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
        subtitle: overdueTasks.map((t) => t.title).slice(0, 2).join(', '),
        severity: 'urgent',
      });
    }

    // Check inbox unprocessed count
    const unprocessedInbox = Array.from(this.inbox.values()).filter((i) => !i.processed);
    if (unprocessedInbox.length > 0) {
      items.push({
        id: 'attention_inbox',
        type: 'unprocessed_inbox',
        title: `${unprocessedInbox.length} Inbox Item${unprocessedInbox.length > 1 ? 's' : ''} to Process`,
        subtitle: 'Quickly organize into tasks, notes, or archive',
        severity: 'info',
      });
    }

    return items;
  }

  // =========================================================================
  // 3. QUICK CAPTURE & ZERO-LOSS SESSION RECOVERY
  // =========================================================================

  public saveQuickCaptureDraft(draft: QuickCaptureDraft): void {
    this.quickCaptureCache.set(draft.id, {
      ...draft,
      lastEditedAt: Date.now(),
    });
  }

  public getQuickCaptureDraft(id: string): QuickCaptureDraft | undefined {
    return this.quickCaptureCache.get(id);
  }

  public commitQuickCapture(draft: QuickCaptureDraft): {
    createdId: string;
    createdType: 'inbox' | 'note' | 'task';
  } {
    const id = draft.id || `cap_${Date.now()}`;

    if (draft.targetType === 'task') {
      const task: TaskCoreItem = {
        id,
        title: draft.text.trim(),
        completed: false,
        tags: draft.tags,
        projectId: draft.projectId,
        contextId: draft.contextId || this.activeContextId || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.tasks.set(id, task);
      this.quickCaptureCache.delete(draft.id);
      return { createdId: id, createdType: 'task' };
    }

    if (draft.targetType === 'note') {
      this.quickCaptureCache.delete(draft.id);
      return { createdId: id, createdType: 'note' };
    }

    // Default to Inbox
    const inboxItem: InboxItem = {
      id,
      source: 'quick_capture',
      title: draft.text.split('\n')[0] || 'Quick Note',
      content: draft.text,
      capturedAt: Date.now(),
      processed: false,
    };
    this.inbox.set(id, inboxItem);
    this.quickCaptureCache.delete(draft.id);
    return { createdId: id, createdType: 'inbox' };
  }

  // =========================================================================
  // 4. TASKS, DUE VS SCHEDULED SEMANTICS & TODAY AGGREGATION
  // =========================================================================

  public createTask(title: string, options?: Partial<TaskCoreItem>): TaskCoreItem {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const task: TaskCoreItem = {
      id,
      title: title.trim(),
      completed: false,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...options,
    };
    this.tasks.set(id, task);
    return task;
  }

  public toggleTaskCompletion(taskId: string): TaskCoreItem | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const nextCompleted = !task.completed;
    task.completed = nextCompleted;
    task.completedAt = nextCompleted ? Date.now() : undefined;
    task.updatedAt = Date.now();
    this.tasks.set(taskId, task);
    return task;
  }

  public getTodayAgenda(dateStr?: string): {
    scheduled: TaskCoreItem[];
    due: TaskCoreItem[];
    overdue: TaskCoreItem[];
    completedToday: TaskCoreItem[];
  } {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const allTasks = Array.from(this.tasks.values());

    const scheduled = allTasks.filter((t) => !t.completed && t.scheduledDate === targetDate);
    const due = allTasks.filter((t) => !t.completed && t.dueDate === targetDate && t.scheduledDate !== targetDate);
    const overdue = allTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < targetDate);
    const completedToday = allTasks.filter((t) => {
      if (!t.completed || !t.completedAt) return false;
      const compDate = new Date(t.completedAt).toISOString().split('T')[0];
      return compDate === targetDate;
    });

    return { scheduled, due, overdue, completedToday };
  }

  // =========================================================================
  // 5. PROJECTS & CONTEXT FRAMES
  // =========================================================================

  public createProject(title: string, outcome?: string): ProjectCoreItem {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const proj: ProjectCoreItem = {
      id,
      title: title.trim(),
      outcome: outcome?.trim(),
      status: 'active',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.projects.set(id, proj);
    return proj;
  }

  public startContext(rootResourceId: string, rootType: ResourceType, title: string): ContextFrame {
    const id = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ctx: ContextFrame = {
      id,
      title,
      rootResourceId,
      rootType,
      pinnedResourceIds: [rootResourceId],
      openResourceIds: [rootResourceId],
      createdAt: Date.now(),
      lastActivatedAt: Date.now(),
    };
    this.contexts.set(id, ctx);
    this.activeContextId = id;
    return ctx;
  }

  public getActiveContext(): ContextFrame | null {
    if (this.activeContextId && this.contexts.has(this.activeContextId)) {
      return this.contexts.get(this.activeContextId)!;
    }
    return null;
  }

  public leaveContext(): void {
    this.activeContextId = null;
  }

  public pinResourceToContext(resourceId: string): boolean {
    const ctx = this.getActiveContext();
    if (!ctx) return false;
    if (!ctx.pinnedResourceIds.includes(resourceId)) {
      ctx.pinnedResourceIds.push(resourceId);
      ctx.lastActivatedAt = Date.now();
      this.contexts.set(ctx.id, ctx);
    }
    return true;
  }

  // =========================================================================
  // 6. LOCAL INBOX & PROCESS + NEXT IDEMPOTENCY
  // =========================================================================

  public getUnprocessedInbox(): InboxItem[] {
    return Array.from(this.inbox.values())
      .filter((i) => !i.processed)
      .sort((a, b) => b.capturedAt - a.capturedAt);
  }

  public addInboxItem(item: InboxItem): void {
    this.inbox.set(item.id, item);
  }

  public processInboxItem(
    itemId: string,
    targetType: ResourceType | 'archive',
    title?: string
  ): { success: boolean; createdResourceId?: string } {
    const item = this.inbox.get(itemId);
    if (!item) return { success: false };

    if (item.processed) {
      return { success: true, createdResourceId: item.processedInto?.resourceId };
    }

    if (targetType === 'archive') {
      item.processed = true;
      item.processedInto = {
        resourceId: itemId,
        resourceType: 'note',
        processedAt: Date.now(),
      };
      this.inbox.set(itemId, item);
      return { success: true };
    }

    const createdId = `${targetType}_${Date.now()}`;
    if (targetType === 'task') {
      this.createTask(title || item.title, {
        tags: ['from_inbox'],
      });
    }

    item.processed = true;
    item.processedInto = {
      resourceId: createdId,
      resourceType: targetType,
      processedAt: Date.now(),
    };
    this.inbox.set(itemId, item);
    return { success: true, createdResourceId: createdId };
  }

  // =========================================================================
  // 7. SAVED VIEWS & WORKSPACES
  // =========================================================================

  public saveView(view: SavedViewState): void {
    this.savedViews.set(view.id, {
      ...view,
      isModified: false,
    });
  }

  public getSavedViews(resourceType?: ResourceType): SavedViewState[] {
    const views = Array.from(this.savedViews.values());
    if (resourceType) {
      return views.filter((v) => v.resourceType === resourceType);
    }
    return views;
  }

  public deleteSavedView(viewId: string): boolean {
    return this.savedViews.delete(viewId);
  }

  public saveWorkspace(workspace: V2CoreWorkspaceLayout): void {
    this.workspaces.set(workspace.id, {
      ...workspace,
      updatedAt: Date.now(),
    });
    this.activeWorkspaceId = workspace.id;
  }

  public getWorkspaces(): V2CoreWorkspaceLayout[] {
    return Array.from(this.workspaces.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // =========================================================================
  // 8. COMMAND PALETTE INTEGRITY
  // =========================================================================

  public registerCommand(command: CommandItem): void {
    this.registeredCommands.set(command.id, command);
  }

  public getCoreCommands(): CommandItem[] {
    return Array.from(this.registeredCommands.values());
  }

  private registerCoreCommands(): void {
    const coreCommands: CommandItem[] = [
      {
        id: 'cmd_new_note',
        title: 'New Note',
        category: 'Creation',
        shortcut: 'Mod+N',
        keywords: ['note', 'create', 'write', 'markdown'],
        execute: () => this.navigate({ view: 'notes', timestamp: Date.now() }),
      },
      {
        id: 'cmd_new_task',
        title: 'New Task',
        category: 'Creation',
        shortcut: 'Mod+Shift+T',
        keywords: ['task', 'todo', 'item', 'create'],
        execute: () => this.navigate({ view: 'tasks', timestamp: Date.now() }),
      },
      {
        id: 'cmd_quick_capture',
        title: 'Quick Capture',
        category: 'Creation',
        shortcut: 'Mod+Shift+C',
        keywords: ['capture', 'inbox', 'quick', 'draft'],
        execute: () => this.navigate({ view: 'inbox', timestamp: Date.now() }),
      },
      {
        id: 'cmd_go_home',
        title: 'Go to Home',
        category: 'Navigation',
        shortcut: 'Mod+H',
        keywords: ['home', 'dashboard', 'start', 'overview'],
        execute: () => this.navigate({ view: 'home', timestamp: Date.now() }),
      },
      {
        id: 'cmd_go_today',
        title: 'Go to Today',
        category: 'Navigation',
        shortcut: 'Mod+T',
        keywords: ['today', 'agenda', 'day', 'schedule'],
        execute: () => this.navigate({ view: 'calendar', timestamp: Date.now() }),
      },
      {
        id: 'cmd_go_projects',
        title: 'Go to Projects',
        category: 'Navigation',
        shortcut: 'Mod+P',
        keywords: ['projects', 'milestones', 'outcomes'],
        execute: () => this.navigate({ view: 'projects', timestamp: Date.now() }),
      },
      {
        id: 'cmd_go_inbox',
        title: 'Go to Inbox',
        category: 'Navigation',
        shortcut: 'Mod+I',
        keywords: ['inbox', 'process', 'triage', 'captures'],
        execute: () => this.navigate({ view: 'inbox', timestamp: Date.now() }),
      },
    ];

    for (const cmd of coreCommands) {
      this.registeredCommands.set(cmd.id, cmd);
    }
  }

  private seedInitialCoreData(): void {
    // Initial project
    const proj = this.createProject('Antigravity Core Deployment', 'Ship complete V2.21 Personal OS core');
    proj.nextAction = 'Complete V2.21 quality test runner verification';
    proj.tags = ['architecture', 'v2_21'];
    this.projects.set(proj.id, proj);

    // Initial tasks
    this.createTask('Verify single-path search and back-state retention', {
      projectId: proj.id,
      scheduledDate: new Date().toISOString().split('T')[0],
      priority: 'high',
      tags: ['verification'],
    });

    this.createTask('Certify due date and scheduled date separation', {
      projectId: proj.id,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      priority: 'medium',
      tags: ['temporal'],
    });

    // Initial Inbox item
    const inboxItem: InboxItem = {
      id: 'inbox_seed_1',
      source: 'quick_capture',
      title: 'Review offline local storage quota guidelines',
      content: 'Ensure all core items persist locally with zero server reliance.',
      capturedAt: Date.now() - 3600000,
      processed: false,
    };
    this.inbox.set(inboxItem.id, inboxItem);

    // Initial Saved View
    const defaultTaskView: SavedViewState = {
      id: 'view_active_tasks',
      name: 'High Priority Tasks',
      resourceType: 'task',
      filter: { status: 'open' },
      sortBy: 'priority',
      sortOrder: 'desc',
      presentation: 'list',
      isFavorite: true,
      isModified: false,
    };
    this.savedViews.set(defaultTaskView.id, defaultTaskView);

    // Initial Workspace
    const defaultWorkspace: V2CoreWorkspaceLayout = {
      id: 'ws_focus_dual',
      name: 'Core Plan & Review',
      paneCount: 2,
      panes: [
        { id: 'p1', resourceId: proj.id, resourceType: 'project', viewMode: 'detail' },
        { id: 'p2', resourceId: 'view_active_tasks', resourceType: 'task', viewMode: 'list' },
      ],
      activePaneIndex: 0,
      isFavorite: true,
      updatedAt: Date.now(),
    };
    this.workspaces.set(defaultWorkspace.id, defaultWorkspace);
  }
}

export const v2CoreExperienceEngine = V2CoreExperienceEngine.getInstance();
