/**
 * Phase P49 — Periodic Review Engine (Weekly / Monthly / Quarterly / Annual)
 * 
 * Reviews are ordinary canonical Markdown notes.
 * The review engine queries existing indexes (Tasks, Projects, Goals, Calendar, Inbox)
 * to build an in-memory Planning Inspector snapshot.
 * 
 * Generates factual Markdown snippets for EXPLICIT user insertion (never silent auto-insertion).
 */

import { Note, Folder } from '../../types';
import {
  ReviewPeriod,
  WeeklyReviewSnapshot,
  ProjectRecord,
  GoalRecord,
  ReviewRecord,
} from './planningTypes';
import { PKMTask } from '../tasks/taskTypes';
import { extractTasksFromNote } from '../tasks/taskParser';
import { getTodayDateString } from '../temporal/dateUtils';
import { parseFrontmatterAST } from '../properties/frontmatterEngine';

/**
 * Calculates start and end ISO dates (YYYY-MM-DD) for a given review period
 */
export function getReviewPeriodRange(period: ReviewPeriod, baseDate = new Date()): {
  periodStart: string;
  periodEnd: string;
  label: string;
} {
  const d = new Date(baseDate);

  if (period === 'week') {
    // Current week (Monday to Sunday)
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startStr = monday.toISOString().slice(0, 10);
    const endStr = sunday.toISOString().slice(0, 10);
    return {
      periodStart: startStr,
      periodEnd: endStr,
      label: `Week of ${startStr}`,
    };
  }

  if (period === 'month') {
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      label: `${monthNames[month]} ${year}`,
    };
  }

  if (period === 'quarter') {
    const year = d.getFullYear();
    const month = d.getMonth();
    const qIndex = Math.floor(month / 3);
    const start = new Date(year, qIndex * 3, 1);
    const end = new Date(year, (qIndex + 1) * 3, 0);
    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      label: `Q${qIndex + 1} ${year}`,
    };
  }

  // year
  const year = d.getFullYear();
  return {
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
    label: `Year ${year}`,
  };
}

/**
 * Builds the derived Weekly Review Inspector Snapshot
 */
export function buildWeeklyReviewSnapshot(params: {
  period?: ReviewPeriod;
  baseDate?: Date;
  notes?: Note[];
  projects?: ProjectRecord[];
  goals?: GoalRecord[];
  inboxFolderId?: string;
}): WeeklyReviewSnapshot {
  const { period = 'week', baseDate = new Date(), notes = [], projects = [], goals = [], inboxFolderId } = params;
  const safeNotes = notes || [];
  const safeProjects = projects || [];
  const safeGoals = goals || [];
  const { periodStart, periodEnd, label } = getReviewPeriodRange(period, baseDate);
  const today = getTodayDateString();

  // 1. Completed tasks in period
  const completedTasks: PKMTask[] = [];
  const overdueTasks: PKMTask[] = [];

  for (const note of safeNotes) {
    if (note.trashed) continue;
    const noteTasks = extractTasksFromNote(note);

    for (const t of noteTasks) {
      if (t.completed) {
        // If note was updated in period or noteDate matches
        if (t.noteDate) {
          if (t.noteDate >= periodStart && t.noteDate <= periodEnd) {
            completedTasks.push(t);
          }
        } else if (note.updatedAt && note.updatedAt.slice(0, 10) >= periodStart && note.updatedAt.slice(0, 10) <= periodEnd) {
          completedTasks.push(t);
        }
      } else {
        // Open tasks: check if overdue
        if (t.noteDate && t.noteDate < today) {
          overdueTasks.push(t);
        }
      }
    }
  }

  // 2. Projects & Goals derived queries
  const activeProjects = safeProjects.filter((p) => p && p.status === 'active');
  const projectsWithoutNextAction = activeProjects.filter((p) => p && p.openTasksCount === 0);

  const activeGoals = safeGoals.filter((g) => g && g.status === 'active');
  const goalsWithoutActiveProjects = activeGoals.filter((g) => g && g.activeProjectsCount === 0);

  // 3. Inbox count
  const inboxCount = safeNotes.filter((n) => {
    if (!n || n.trashed) return false;
    if (inboxFolderId && n.folderId === inboxFolderId) return true;
    return n.tags?.includes('inbox') || n.title.toLowerCase().startsWith('inbox');
  }).length;

  // 4. Upcoming deadlines in next 14 days
  const in14Days = new Date();
  in14Days.setDate(in14Days.getDate() + 14);
  const in14DaysStr = in14Days.toISOString().slice(0, 10);

  const upcomingDeadlines: Array<{
    title: string;
    date: string;
    type: 'project' | 'task' | 'goal';
    id: string;
  }> = [];

  for (const p of activeProjects) {
    if (p.due && p.due >= today && p.due <= in14DaysStr) {
      upcomingDeadlines.push({ title: p.title, date: p.due, type: 'project', id: p.id });
    }
  }

  for (const g of activeGoals) {
    if (g.targetDate && g.targetDate >= today && g.targetDate <= in14DaysStr) {
      upcomingDeadlines.push({ title: g.title, date: g.targetDate, type: 'goal', id: g.id });
    }
  }

  upcomingDeadlines.sort((a, b) => a.date.localeCompare(b.date));

  // 5. Focus suggestions (Active projects with next actions)
  const focusSuggestions = activeProjects
    .filter((p) => p.nextActionTask !== null)
    .slice(0, 5);

  return {
    period,
    periodStart,
    periodEnd,
    label,
    completedTasks,
    overdueTasks,
    activeProjects,
    projectsWithoutNextAction,
    activeGoals,
    goalsWithoutActiveProjects,
    inboxCount,
    upcomingDeadlines,
    focusSuggestions,
  };
}

/**
 * Formats a clean Markdown snapshot for a review section for explicit insertion
 */
export function formatSectionMarkdown(
  sectionId:
    | 'completed_tasks'
    | 'overdue_tasks'
    | 'active_projects'
    | 'no_action_projects'
    | 'active_goals'
    | 'upcoming_deadlines',
  snapshot: WeeklyReviewSnapshot
): string {
  const timestamp = `<!-- snapshot generated on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} -->`;

  switch (sectionId) {
    case 'completed_tasks': {
      if (snapshot.completedTasks.length === 0) {
        return `### Completed Tasks (${snapshot.label})\n${timestamp}\n_No completed tasks recorded for this period._\n`;
      }
      const lines = snapshot.completedTasks.map(
        (t) => `- [x] ${t.text} (from [[${t.noteTitle}]])`
      );
      return `### Completed Tasks (${snapshot.completedTasks.length})\n${timestamp}\n${lines.join('\n')}\n`;
    }

    case 'overdue_tasks': {
      if (snapshot.overdueTasks.length === 0) {
        return `### Overdue Tasks\n${timestamp}\n_All tasks are up to date._\n`;
      }
      const lines = snapshot.overdueTasks.map(
        (t) => `- [ ] ${t.text}${t.noteDate ? ` ⏳ due ${t.noteDate}` : ''} (from [[${t.noteTitle}]])`
      );
      return `### Overdue Tasks (${snapshot.overdueTasks.length})\n${timestamp}\n${lines.join('\n')}\n`;
    }

    case 'active_projects': {
      if (snapshot.activeProjects.length === 0) {
        return `### Active Projects\n${timestamp}\n_No active projects currently configured._\n`;
      }
      const lines = snapshot.activeProjects.map((p) => {
        const next = p.nextActionTask ? ` — Next: ${p.nextActionTask.text}` : ' — _No next action_';
        const prog = p.progressText ? ` [${p.progressText}]` : '';
        return `- [[${p.title}]]${prog}${next}`;
      });
      return `### Active Projects (${snapshot.activeProjects.length})\n${timestamp}\n${lines.join('\n')}\n`;
    }

    case 'no_action_projects': {
      if (snapshot.projectsWithoutNextAction.length === 0) {
        return `### Projects Without Next Action\n${timestamp}\n_Every active project has an actionable task._\n`;
      }
      const lines = snapshot.projectsWithoutNextAction.map((p) => `- [[${p.title}]]`);
      return `### Projects Without Next Action (${snapshot.projectsWithoutNextAction.length})\n${timestamp}\n${lines.join('\n')}\n`;
    }

    case 'active_goals': {
      if (snapshot.activeGoals.length === 0) {
        return `### Active Goals\n${timestamp}\n_No active goals configured._\n`;
      }
      const lines = snapshot.activeGoals.map((g) => {
        const target = g.targetDate ? ` (Target: ${g.targetDate})` : '';
        const proj = ` — ${g.activeProjectsCount} active project(s)`;
        return `- [[${g.title}]]${target}${proj}`;
      });
      return `### Active Goals (${snapshot.activeGoals.length})\n${timestamp}\n${lines.join('\n')}\n`;
    }

    case 'upcoming_deadlines': {
      if (snapshot.upcomingDeadlines.length === 0) {
        return `### Upcoming Deadlines\n${timestamp}\n_No deadlines scheduled in the next 14 days._\n`;
      }
      const lines = snapshot.upcomingDeadlines.map((d) => `- **${d.date}**: [[${d.title}]] (${d.type})`);
      return `### Upcoming Deadlines (${snapshot.upcomingDeadlines.length})\n${timestamp}\n${lines.join('\n')}\n`;
    }

    default:
      return '';
  }
}

/**
 * Generates the default initial content for a new canonical Review note
 */
export function generateReviewNoteContent(period: ReviewPeriod, baseDate = new Date()): {
  title: string;
  content: string;
} {
  const { periodStart, periodEnd, label } = getReviewPeriodRange(period, baseDate);
  const title = `${period.charAt(0).toUpperCase() + period.slice(1)} Review — ${label}`;

  const content = `---
type: review
period: ${period}
period-start: ${periodStart}
period-end: ${periodEnd}
tags:
  - review
  - ${period}-review
---

# ${title}

## Wins & Highlights
- 

## Completed Work
_Use the Planning Inspector to insert completed task snapshots._

## Open Loops & Attention
- 

## Active Projects Review
- 

## Long-Term Goals Progress
- 

## Next Period Focus & Priorities
- 

## Notes & Reflections
- 
`;

  return { title, content };
}
