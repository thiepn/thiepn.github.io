/**
 * PKM V2.13 — Projects, Goals & Areas Excellence Engine
 *
 * Implements clear outcome-driven project execution and strategic goals:
 * - Outcome distinction from title
 * - V2.3 Next Action semantics with canonical Tasks
 * - Project Context aggregation (Tasks, People, Decisions, Notes, Activity)
 * - Goals remain lightweight and strategic (zero fake percentage progress from task count)
 * - Distinct Completed vs Archived lifecycle states
 * - High-value Cross-Domain Relations (Project <-> Goal, Project <-> Person, Project <-> Decision)
 */

import { ResourceType } from '../core/resource/resourceCore';
import { crossDomainRelationEngine } from './crossDomainRelationEngine';

export type ProjectStatus = 'planned' | 'active' | 'paused' | 'completed' | 'archived';
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'archived';

export interface V2ProjectRecord {
  id: string;
  title: string;
  outcome?: string; // Explicit desired end-state outcome distinct from title
  status: ProjectStatus;
  nextActionTaskId?: string;
  areaId?: string;
  goalId?: string;
  targetDate?: string;
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  archivedAt?: string;
  tags?: string[];
}

export interface V2GoalRecord {
  id: string;
  title: string;
  desiredOutcome: string;
  whyItMatters: string;
  status: GoalStatus;
  targetQuarterOrYear?: string;
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface V2AreaRecord {
  id: string;
  title: string;
  description: string;
  responsibilities: string[];
  reviewCadence?: 'weekly' | 'monthly' | 'quarterly';
}

export interface V2ProjectTask {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  isNextAction: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

export class ProjectsGoalsDomainExcellence {
  private projects = new Map<string, V2ProjectRecord>();
  private goals = new Map<string, V2GoalRecord>();
  private areas = new Map<string, V2AreaRecord>();
  private tasks = new Map<string, V2ProjectTask[]>(); // projectId -> tasks

  // ================= Projects =================

  public saveProject(project: V2ProjectRecord): V2ProjectRecord {
    const existing = this.projects.get(project.id);
    const updated: V2ProjectRecord = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(project.id, updated);
    if (!this.tasks.has(project.id)) {
      this.tasks.set(project.id, []);
    }

    // Sync relation to Goal if present
    if (project.goalId) {
      crossDomainRelationEngine.addRelation({
        sourceId: project.id,
        sourceType: 'project',
        targetId: project.goalId,
        targetType: 'goal',
        relationType: 'project_contributes_to_goal',
        label: `Contributes to ${this.goals.get(project.goalId)?.title || 'Goal'}`,
      });
    }

    return updated;
  }

  public getProject(id: string): V2ProjectRecord | undefined {
    return this.projects.get(id);
  }

  public getAllProjects(): V2ProjectRecord[] {
    return Array.from(this.projects.values());
  }

  public getActiveProjects(): V2ProjectRecord[] {
    return Array.from(this.projects.values()).filter((p) => p.status === 'active');
  }

  /**
   * Adds a canonical Task to a Project
   */
  public addTaskToProject(params: {
    projectId: string;
    title: string;
    isNextAction?: boolean;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  }): V2ProjectTask {
    const task: V2ProjectTask = {
      id: `task_proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      projectId: params.projectId,
      title: params.title,
      completed: false,
      isNextAction: Boolean(params.isNextAction),
      dueDate: params.dueDate,
      priority: params.priority || 'medium',
    };

    const list = this.tasks.get(params.projectId) || [];
    
    // If setting as next action, clear existing next action flags
    if (params.isNextAction) {
      list.forEach((t) => (t.isNextAction = false));
      const proj = this.projects.get(params.projectId);
      if (proj) {
        proj.nextActionTaskId = task.id;
      }
    }

    list.push(task);
    this.tasks.set(params.projectId, list);

    // Register canonical cross-domain relation
    crossDomainRelationEngine.addRelation({
      sourceId: task.id,
      sourceType: 'task',
      targetId: params.projectId,
      targetType: 'project',
      relationType: 'task_for_project',
    });

    return task;
  }

  public getProjectTasks(projectId: string): V2ProjectTask[] {
    return this.tasks.get(projectId) || [];
  }

  public setNextAction(projectId: string, taskId: string): boolean {
    const list = this.tasks.get(projectId);
    if (!list) return false;
    const task = list.find((t) => t.id === taskId);
    if (!task) return false;

    list.forEach((t) => (t.isNextAction = false));
    task.isNextAction = true;

    const proj = this.projects.get(projectId);
    if (proj) {
      proj.nextActionTaskId = taskId;
    }
    return true;
  }

  public completeProject(projectId: string): boolean {
    const proj = this.projects.get(projectId);
    if (!proj) return false;
    proj.status = 'completed';
    proj.completedAt = new Date().toISOString();
    return true;
  }

  public archiveProject(projectId: string): boolean {
    const proj = this.projects.get(projectId);
    if (!proj) return false;
    proj.status = 'archived';
    proj.archivedAt = new Date().toISOString();
    return true;
  }

  /**
   * Evaluates Project Context with complete connected resource graph
   */
  public getProjectContext(projectId: string): {
    project: V2ProjectRecord | undefined;
    openTasks: V2ProjectTask[];
    nextActionTask: V2ProjectTask | undefined;
    completedTasksCount: number;
    connectedRelations: ReturnType<typeof crossDomainRelationEngine.getConnectedResources>;
  } {
    const project = this.getProject(projectId);
    const allTasks = this.tasks.get(projectId) || [];
    const openTasks = allTasks.filter((t) => !t.completed);
    const nextActionTask = allTasks.find((t) => t.id === project?.nextActionTaskId || t.isNextAction);
    const completedTasksCount = allTasks.filter((t) => t.completed).length;
    const connectedRelations = crossDomainRelationEngine.getConnectedResources(projectId);

    return {
      project,
      openTasks,
      nextActionTask,
      completedTasksCount,
      connectedRelations,
    };
  }

  /**
   * Project Attention conditions (Overdue task, No Next Action, Review Due)
   */
  public evaluateAttention(todayDateOnly: string): Array<{
    projectId: string;
    projectTitle: string;
    reason: 'no_next_action' | 'overdue_task' | 'review_due';
    details: string;
  }> {
    const items: Array<{
      projectId: string;
      projectTitle: string;
      reason: 'no_next_action' | 'overdue_task' | 'review_due';
      details: string;
    }> = [];

    for (const project of this.projects.values()) {
      if (project.status !== 'active') continue;

      const projectTasks = this.tasks.get(project.id) || [];
      const openTasks = projectTasks.filter((t) => !t.completed);

      // Check overdue tasks
      const overdue = openTasks.find((t) => t.dueDate && t.dueDate < todayDateOnly);
      if (overdue) {
        items.push({
          projectId: project.id,
          projectTitle: project.title,
          reason: 'overdue_task',
          details: `Task "${overdue.title}" is overdue (Due: ${overdue.dueDate})`,
        });
        continue; // deduplicate per project
      }

      // Check missing next action (if has open tasks but no next action designated)
      const hasNextAction = openTasks.some((t) => t.isNextAction || t.id === project.nextActionTaskId);
      if (openTasks.length > 0 && !hasNextAction) {
        items.push({
          projectId: project.id,
          projectTitle: project.title,
          reason: 'no_next_action',
          details: `Project has ${openTasks.length} open tasks but no Next Action selected`,
        });
      }

      // Check review due
      if (project.reviewDate && project.reviewDate <= todayDateOnly) {
        items.push({
          projectId: project.id,
          projectTitle: project.title,
          reason: 'review_due',
          details: `Project review scheduled for ${project.reviewDate}`,
        });
      }
    }

    return items;
  }

  // ================= Goals =================

  public saveGoal(goal: V2GoalRecord): V2GoalRecord {
    const updated = { ...goal, updatedAt: new Date().toISOString() };
    this.goals.set(goal.id, updated);
    return updated;
  }

  public getGoal(id: string): V2GoalRecord | undefined {
    return this.goals.get(id);
  }

  public getAllGoals(): V2GoalRecord[] {
    return Array.from(this.goals.values());
  }

  public getContributingProjects(goalId: string): V2ProjectRecord[] {
    return Array.from(this.projects.values()).filter((p) => p.goalId === goalId);
  }

  // ================= Areas =================

  public saveArea(area: V2AreaRecord): V2AreaRecord {
    this.areas.set(area.id, { ...area });
    return area;
  }

  public getArea(id: string): V2AreaRecord | undefined {
    return this.areas.get(id);
  }

  public getAllAreas(): V2AreaRecord[] {
    return Array.from(this.areas.values());
  }

  public clear(): void {
    this.projects.clear();
    this.goals.clear();
    this.areas.clear();
    this.tasks.clear();
  }
}

export const projectsGoalsDomainExcellence = new ProjectsGoalsDomainExcellence();
