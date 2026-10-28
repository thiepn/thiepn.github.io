/**
 * Phase P49 — Planning Service & Indexer
 * 
 * Central coordinator for Goals, Projects, Areas, Periodic Reviews, Focus,
 * and Attention Signals.
 * 
 * Strict non-negotiable principle: Pure derived in-memory projection from canonical
 * notes. ZERO secondary database. Zero surveillance scoring. Immediate memory
 * clearing upon vault lock.
 */

import { Note, Folder } from '../../types';
import {
  GoalRecord,
  ProjectRecord,
  AreaRecord,
  ReviewRecord,
  GoalStatus,
  ProjectStatus,
  AreaStatus,
  ReviewPeriod,
  PlanningSettings,
  DEFAULT_PLANNING_SETTINGS,
  PlanningAttentionSignal,
  FocusItem,
} from './planningTypes';
import { parseFrontmatterAST } from '../properties/frontmatterEngine';
import { classifyPlanningNote } from './planningNoteClassifier';
import { parseRelationReferences } from '../collections/relationEngine';
import { deriveProjectTasks } from './projectTaskEngine';
import { computeAttentionSignals } from './planningAttentionEngine';
import { focusManager } from './focusManager';

class PlanningService {
  private goals: GoalRecord[] = [];
  private goalsById: Map<string, GoalRecord> = new Map();
  private projects: ProjectRecord[] = [];
  private projectsById: Map<string, ProjectRecord> = new Map();
  private areas: AreaRecord[] = [];
  private areasById: Map<string, AreaRecord> = new Map();
  private reviews: ReviewRecord[] = [];
  private reviewsById: Map<string, ReviewRecord> = new Map();

  private attentionSignals: PlanningAttentionSignal[] = [];
  private settings: PlanningSettings = DEFAULT_PLANNING_SETTINGS;
  private listeners: Set<() => void> = new Set();
  private isLocked = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('pkm_planning_settings_v1');
      if (stored) {
        this.settings = { ...DEFAULT_PLANNING_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load planning settings', e);
    }
  }

  public saveSettings(settings: Partial<PlanningSettings>): void {
    this.settings = { ...this.settings, ...settings };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pkm_planning_settings_v1', JSON.stringify(this.settings));
      } catch (e) {
        console.warn('Failed to save planning settings', e);
      }
    }
    this.notify();
  }

  public getSettings(): PlanningSettings {
    return this.settings;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in planning service listener:', err);
      }
    }
  }

  /**
   * Rebuilds the derived in-memory planning index from canonical notes
   */
  public rebuild(notes: Note[], folders: Folder[] = []): void {
    if (this.isLocked) return;

    const activeNotes = notes.filter((n) => !n.trashed);
    const titleToNoteMap = new Map<string, Note>();
    for (const note of activeNotes) {
      if (note.title) {
        titleToNoteMap.set(note.title.trim().toLowerCase(), note);
      }
    }

    const rawGoals: Array<{ note: Note; props: Record<string, any> }> = [];
    const rawProjects: Array<{ note: Note; props: Record<string, any> }> = [];
    const rawAreas: Array<{ note: Note; props: Record<string, any> }> = [];
    const rawReviews: Array<{ note: Note; props: Record<string, any> }> = [];

    // 1. Classify notes by type or tag
    for (const note of activeNotes) {
      const { ast } = parseFrontmatterAST(note.content || '');
      const props = ast.properties || {};
      const noteType = classifyPlanningNote(note);
      if (noteType === 'goal') rawGoals.push({ note, props });
      else if (noteType === 'project') rawProjects.push({ note, props });
      else if (noteType === 'area') rawAreas.push({ note, props });
      else if (noteType === 'review') rawReviews.push({ note, props });
    }

    // 2. Index Areas
    const areaRecords: AreaRecord[] = rawAreas.map(({ note, props }) => {
      const rawPeople = parseRelationReferences(props.people || props.person);
      const peopleIds: string[] = [];
      const peopleTitles: string[] = [];
      for (const ref of rawPeople) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) {
          peopleIds.push(matched.id);
          peopleTitles.push(matched.title);
        } else {
          peopleTitles.push(ref);
        }
      }

      return {
        id: note.id,
        noteId: note.id,
        title: note.title || 'Untitled Area',
        status: (props.status || 'active') as AreaStatus,
        goalIds: [],
        goalTitles: [],
        projectIds: [],
        projectTitles: [],
        activeProjectsCount: 0,
        activeGoalsCount: 0,
        peopleIds,
        peopleTitles,
        tags: note.tags || [],
        folderId: note.folderId,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
    });
    const areaMap = new Map<string, AreaRecord>(areaRecords.map((a) => [a.id, a]));

    // 3. Index Projects
    const staleDateThreshold = new Date();
    staleDateThreshold.setDate(
      staleDateThreshold.getDate() - (this.settings.staleProjectDaysThreshold || 30)
    );
    const staleThresholdIso = staleDateThreshold.toISOString();

    const projectRecords: ProjectRecord[] = rawProjects.map(({ note, props }) => {
      // Status
      const status = (props.status || 'active') as ProjectStatus;

      // Area relation
      const rawArea = parseRelationReferences(props.area);
      let areaId: string | undefined = undefined;
      let areaTitle: string | undefined = undefined;
      if (rawArea.length > 0) {
        const matchedArea = titleToNoteMap.get(rawArea[0].toLowerCase()) || areaMap.get(rawArea[0]);
        if (matchedArea) {
          areaId = matchedArea.id;
          areaTitle = matchedArea.title;
        } else {
          areaTitle = rawArea[0];
        }
      }

      // Goal relations
      const rawGoals = parseRelationReferences(props.goal || props.goals);
      const goalIds: string[] = [];
      const goalTitles: string[] = [];
      for (const ref of rawGoals) {
        const matchedGoal = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matchedGoal) {
          goalIds.push(matchedGoal.id);
          goalTitles.push(matchedGoal.title);
        } else {
          goalTitles.push(ref);
        }
      }

      // People relations
      const rawPeople = parseRelationReferences(props.people || props.person);
      const peopleIds: string[] = [];
      const peopleTitles: string[] = [];
      for (const ref of rawPeople) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) {
          peopleIds.push(matched.id);
          peopleTitles.push(matched.title);
        } else {
          peopleTitles.push(ref);
        }
      }

      // Organization relations
      const rawOrgs = parseRelationReferences(props.organization || props.org || props.company);
      const organizationIds: string[] = [];
      const organizationTitles: string[] = [];
      for (const ref of rawOrgs) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) {
          organizationIds.push(matched.id);
          organizationTitles.push(matched.title);
        } else {
          organizationTitles.push(ref);
        }
      }

      // Blocked By relations
      const rawBlocked = parseRelationReferences(props['blocked-by'] || props.blockedBy);
      const blockedByIds: string[] = [];
      const blockedByTitles: string[] = [];
      for (const ref of rawBlocked) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) {
          blockedByIds.push(matched.id);
          blockedByTitles.push(matched.title);
        } else {
          blockedByTitles.push(ref);
        }
      }

      // Progress & Tasks
      const progressMode = props['progress-mode'] || props.progressMode || this.settings.defaultProjectProgressMode;
      const manualProgress = typeof props.progress === 'number' ? props.progress : undefined;

      const derivation = deriveProjectTasks(note, progressMode, manualProgress, status === 'active');

      const isInactiveStale = status === 'active' && (note.updatedAt || '') < staleThresholdIso;

      return {
        id: note.id,
        noteId: note.id,
        title: note.title || 'Untitled Project',
        status,
        goalIds,
        goalTitles,
        areaId,
        areaTitle,
        due: props.due ? String(props.due).slice(0, 10) : undefined,
        start: props.start ? String(props.start).slice(0, 10) : undefined,
        priority: props.priority ? String(props.priority).toLowerCase() as any : undefined,
        peopleIds,
        peopleTitles,
        organizationIds,
        organizationTitles,
        blockedByIds,
        blockedByTitles,
        progressMode: progressMode === 'none' ? undefined : progressMode,
        manualProgress,
        completedDate: props['completed-date'] || props.completedDate ? String(props['completed-date'] || props.completedDate).slice(0, 10) : undefined,
        totalTasksCount: derivation.totalTasksCount,
        completedTasksCount: derivation.completedTasksCount,
        openTasksCount: derivation.openTasksCount,
        nextActionTask: derivation.nextActionTask,
        progressPercent: derivation.progressPercent,
        progressText: derivation.progressText,
        canSuggestCompletion: derivation.canSuggestCompletion,
        isInactiveStale,
        tags: note.tags || [],
        folderId: note.folderId,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
    });
    const projectMap = new Map<string, ProjectRecord>(projectRecords.map((p) => [p.id, p]));

    // 4. Index Goals
    const goalRecords: GoalRecord[] = rawGoals.map(({ note, props }) => {
      const status = (props.status || 'active') as GoalStatus;

      // Area relation
      const rawArea = parseRelationReferences(props.area);
      let areaId: string | undefined = undefined;
      let areaTitle: string | undefined = undefined;
      if (rawArea.length > 0) {
        const matchedArea = titleToNoteMap.get(rawArea[0].toLowerCase()) || areaMap.get(rawArea[0]);
        if (matchedArea) {
          areaId = matchedArea.id;
          areaTitle = matchedArea.title;
        } else {
          areaTitle = rawArea[0];
        }
      }

      // Parent goal relation
      const rawParent = parseRelationReferences(props['parent-goal'] || props.parentGoal);
      let parentGoalId: string | undefined = undefined;
      let parentGoalTitle: string | undefined = undefined;
      if (rawParent.length > 0) {
        const matchedParent = titleToNoteMap.get(rawParent[0].toLowerCase()) || activeNotes.find((n) => n.id === rawParent[0]);
        if (matchedParent) {
          parentGoalId = matchedParent.id;
          parentGoalTitle = matchedParent.title;
        } else {
          parentGoalTitle = rawParent[0];
        }
      }

      // Progress computation
      const progressMode = props['progress-mode'] || props.progressMode || this.settings.defaultGoalProgressMode;
      const progressTarget = typeof props['progress-target'] === 'number' ? props['progress-target'] : typeof props.progressTarget === 'number' ? props.progressTarget : undefined;
      const progressCurrent = typeof props['progress-current'] === 'number' ? props['progress-current'] : typeof props.progressCurrent === 'number' ? props.progressCurrent : undefined;
      const progressUnit = props['progress-unit'] || props.progressUnit ? String(props['progress-unit'] || props.progressUnit) : undefined;
      const progressDirection = (props['progress-direction'] || props.progressDirection || 'increase') as any;

      let progressPercent: number | undefined = undefined;
      if (progressMode === 'numeric' && progressTarget !== undefined && progressCurrent !== undefined && progressTarget !== 0) {
        if (progressDirection === 'decrease') {
          // e.g. from initial down to target
          progressPercent = Math.min(100, Math.max(0, Math.round((progressTarget / progressCurrent) * 100)));
        } else {
          progressPercent = Math.min(100, Math.max(0, Math.round((progressCurrent / progressTarget) * 100)));
        }
      } else if (progressMode === 'manual' && typeof props.progress === 'number') {
        progressPercent = Math.min(100, Math.max(0, props.progress));
      }

      return {
        id: note.id,
        noteId: note.id,
        title: note.title || 'Untitled Goal',
        status,
        targetDate: props['target-date'] || props.targetDate ? String(props['target-date'] || props.targetDate).slice(0, 10) : undefined,
        areaId,
        areaTitle,
        parentGoalId,
        parentGoalTitle,
        priority: props.priority ? String(props.priority).toLowerCase() as any : undefined,
        progressMode: progressMode === 'none' ? undefined : progressMode,
        progressTarget,
        progressCurrent,
        progressUnit,
        progressDirection,
        progressPercent,
        supportingProjectIds: [],
        supportingProjectTitles: [],
        activeProjectsCount: 0,
        completedProjectsCount: 0,
        tags: note.tags || [],
        folderId: note.folderId,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
    });
    const goalMap = new Map<string, GoalRecord>(goalRecords.map((g) => [g.id, g]));

    // 5. Connect Inverse Relations:
    // Project -> Goal & Project -> Area
    for (const proj of projectRecords) {
      // Connect to Goals
      for (const gId of proj.goalIds) {
        const goal = goalMap.get(gId);
        if (goal) {
          goal.supportingProjectIds.push(proj.id);
          goal.supportingProjectTitles.push(proj.title);
          if (proj.status === 'completed') {
            goal.completedProjectsCount++;
          } else if (proj.status === 'active') {
            goal.activeProjectsCount++;
          }
        }
      }

      // Connect to Area
      if (proj.areaId) {
        const area = areaMap.get(proj.areaId);
        if (area) {
          area.projectIds.push(proj.id);
          area.projectTitles.push(proj.title);
          if (proj.status === 'active') {
            area.activeProjectsCount++;
          }
        }
      }
    }

    // Goal -> Area
    for (const goal of goalRecords) {
      // If Goal has progress-mode = 'projects', calculate progress from supporting projects
      if (goal.progressMode === 'projects') {
        const total = goal.activeProjectsCount + goal.completedProjectsCount;
        if (total > 0) {
          goal.progressPercent = Math.round((goal.completedProjectsCount / total) * 100);
        } else {
          goal.progressPercent = 0;
        }
      }

      if (goal.areaId) {
        const area = areaMap.get(goal.areaId);
        if (area) {
          area.goalIds.push(goal.id);
          area.goalTitles.push(goal.title);
          if (goal.status === 'active') {
            area.activeGoalsCount++;
          }
        }
      }
    }

    // 6. Index Reviews
    const reviewRecords: ReviewRecord[] = rawReviews.map(({ note, props }) => {
      const period = (props.period || 'week') as ReviewPeriod;
      const rawFocus = parseRelationReferences(props.focus || props.priorities);
      const focusItemIds: string[] = [];
      const focusItemTitles: string[] = [];

      for (const ref of rawFocus) {
        const matched = titleToNoteMap.get(ref.toLowerCase()) || activeNotes.find((n) => n.id === ref);
        if (matched) {
          focusItemIds.push(matched.id);
          focusItemTitles.push(matched.title);
        } else {
          focusItemTitles.push(ref);
        }
      }

      return {
        id: note.id,
        noteId: note.id,
        title: note.title || `${period} Review`,
        period,
        periodStart: props['period-start'] || props.periodStart ? String(props['period-start'] || props.periodStart).slice(0, 10) : '',
        periodEnd: props['period-end'] || props.periodEnd ? String(props['period-end'] || props.periodEnd).slice(0, 10) : '',
        focusItemIds,
        focusItemTitles,
        tags: note.tags || [],
        folderId: note.folderId,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
    });
    const reviewMap = new Map<string, ReviewRecord>(reviewRecords.map((r) => [r.id, r]));

    // 7. Compute Attention Signals
    const signals = computeAttentionSignals(projectRecords, goalRecords, this.settings);

    this.goals = goalRecords;
    this.goalsById = goalMap;
    this.projects = projectRecords;
    this.projectsById = projectMap;
    this.areas = areaRecords;
    this.areasById = areaMap;
    this.reviews = reviewRecords;
    this.reviewsById = reviewMap;
    this.attentionSignals = signals;

    this.notify();
  }

  // Getters
  public getGoals(): GoalRecord[] {
    return this.goals;
  }

  public getGoalById(id: string): GoalRecord | undefined {
    return this.goalsById.get(id);
  }

  public getProjects(): ProjectRecord[] {
    return this.projects;
  }

  public getProjectById(id: string): ProjectRecord | undefined {
    return this.projectsById.get(id);
  }

  public getAreas(): AreaRecord[] {
    return this.areas;
  }

  public getAreaById(id: string): AreaRecord | undefined {
    return this.areasById.get(id);
  }

  public getReviews(): ReviewRecord[] {
    return this.reviews;
  }

  public getReviewById(id: string): ReviewRecord | undefined {
    return this.reviewsById.get(id);
  }

  public getAttentionSignals(): PlanningAttentionSignal[] {
    return this.attentionSignals;
  }

  public getFocusItems(notes: Note[]): FocusItem[] {
    return focusManager.resolveFocusItems(notes, this.projects, this.goals);
  }

  /**
   * Helper to generate a new canonical Goal note
   */
  public generateGoalNoteContent(data: {
    title: string;
    areaId?: string;
    areaTitle?: string;
    targetDate?: string;
    priority?: string;
  }): { title: string; content: string } {
    const title = data.title.trim() || 'New Goal';
    const areaLine = data.areaTitle ? `area:\n  - "[[${data.areaTitle}]]"\n` : '';
    const targetLine = data.targetDate ? `target-date: ${data.targetDate}\n` : '';
    const priorityLine = data.priority ? `priority: ${data.priority}\n` : '';

    const content = `---
type: goal
status: active
${targetLine}${areaLine}${priorityLine}tags:
  - goal
---

# ${title}

## Outcome
_What specific outcome is desired?_

## Why
_Why is this goal important?_

## Success Criteria
- [ ] 

## Projects
_Supporting projects will link here._
`;

    return { title, content };
  }

  /**
   * Helper to generate a new canonical Project note
   */
  public generateProjectNoteContent(data: {
    title: string;
    goalId?: string;
    goalTitle?: string;
    areaId?: string;
    areaTitle?: string;
    due?: string;
    priority?: string;
  }): { title: string; content: string } {
    const title = data.title.trim() || 'New Project';
    const goalLine = data.goalTitle ? `goal:\n  - "[[${data.goalTitle}]]"\n` : '';
    const areaLine = data.areaTitle ? `area:\n  - "[[${data.areaTitle}]]"\n` : '';
    const dueLine = data.due ? `due: ${data.due}\n` : '';
    const priorityLine = data.priority ? `priority: ${data.priority}\n` : '';

    const content = `---
type: project
status: active
${dueLine}${goalLine}${areaLine}${priorityLine}tags:
  - project
---

# ${title}

## Outcome
_What does "done" look like?_

## Next Actions
- [ ] Initial action step

## Notes
_Project details, references, and thoughts._
`;

    return { title, content };
  }

  /**
   * Helper to generate a new canonical Area note
   */
  public generateAreaNoteContent(data: { title: string }): { title: string; content: string } {
    const title = data.title.trim() || 'New Area of Responsibility';

    const content = `---
type: area
status: active
tags:
  - area
---

# ${title}

## Responsibilities
_Ongoing domains and commitments._

## Standards & Principles
_What does good look like in this area?_

## Projects
_Active projects in this area will link here._

## Notes & Resources
- 
`;

    return { title, content };
  }

  /**
   * Memory scrub upon vault lock
   */
  public lock(): void {
    this.isLocked = true;
    this.goals = [];
    this.goalsById.clear();
    this.projects = [];
    this.projectsById.clear();
    this.areas = [];
    this.areasById.clear();
    this.reviews = [];
    this.reviewsById.clear();
    this.attentionSignals = [];
    focusManager.lock();
    this.notify();
  }

  public unlock(): void {
    this.isLocked = false;
  }
}

export const planningService = new PlanningService();
