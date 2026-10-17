/**
 * Phase P36: Built-in Automation Recipe Templates
 * Curated, deterministic, safe starter workflows ready for 1-click installation.
 */

import { AutomationRule } from './automationTypes';

export interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  category: 'Organization' | 'Recurring Reviews' | 'Tasks & Projects' | 'Capture & Research';
  icon: string;
  rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>;
}

export const BUILTIN_RECIPES: AutomationRecipe[] = [
  {
    id: 'recipe_weekly_review',
    name: 'Weekly Review Generator',
    description: 'Generates a new structured review note every Monday morning with ISO week numbering.',
    category: 'Recurring Reviews',
    icon: 'Calendar',
    rule: {
      name: 'Weekly Review Generator',
      description: 'Generates a new weekly review note every Monday morning at 08:00',
      enabled: true,
      status: 'active',
      priority: 'normal',
      trigger: {
        type: 'schedule_weekly',
        weekdays: ['monday'],
        time: '08:00',
        catchUpPolicy: 'run_once',
      },
      conditionGroup: 'ALL',
      conditions: [],
      actions: [
        {
          type: 'create_note',
          titleTemplate: 'Weekly Review {{year}}-W{{week}}',
          folderId: null,
          contentTemplate: `---
type: review
review_type: weekly
week: "{{week}}"
year: {{year}}
status: in-progress
---

# Weekly Review — Week {{week}}, {{year}}

## 🎯 Top 3 Outcomes for This Week
- [ ] 
- [ ] 
- [ ] 

## 📥 Inbox & Active Tasks
- [ ] Review open project tasks
- [ ] Clear temporary capture inbox
- [ ] Organize unsorted notes

## 💡 Key Wins & Retrospective
- 

## ⏭️ Carrying Forward to Next Week
- 
`,
          tags: ['review', 'weekly'],
          collisionPolicy: 'skip_if_exists',
        },
      ],
      options: {
        requireConfirmation: false,
        stopOnError: true,
      },
    },
  },
  {
    id: 'recipe_monthly_retrospective',
    name: 'Monthly Retrospective',
    description: 'Creates a comprehensive month-end retrospective note on the 1st of every month.',
    category: 'Recurring Reviews',
    icon: 'CalendarDays',
    rule: {
      name: 'Monthly Retrospective Generator',
      description: 'Creates a comprehensive monthly review on the 1st day of every month at 09:00',
      enabled: true,
      status: 'active',
      priority: 'normal',
      trigger: {
        type: 'schedule_monthly',
        dayOfMonth: 1,
        monthEndPolicy: 'last_day',
        time: '09:00',
        catchUpPolicy: 'run_once',
      },
      conditionGroup: 'ALL',
      conditions: [],
      actions: [
        {
          type: 'create_note',
          titleTemplate: 'Monthly Review {{year}}-{{month}}',
          folderId: null,
          contentTemplate: `---
type: review
review_type: monthly
month: "{{month}}"
year: {{year}}
---

# Monthly Review — {{year}}-{{month}}

## 🌟 Major Highlights & Milestones
- 

## 📊 Goal & Habit Progress
- 

## 🔍 Key Learnings & Adjustments
- 

## 🚀 Strategic Focus for Next Month
- 
`,
          tags: ['review', 'monthly'],
          collisionPolicy: 'skip_if_exists',
        },
      ],
      options: {
        requireConfirmation: false,
      },
    },
  },
  {
    id: 'recipe_project_setup',
    name: 'Project Note Setup',
    description: 'Automatically applies status properties and metadata when a note is tagged #project.',
    category: 'Tasks & Projects',
    icon: 'FolderKanban',
    rule: {
      name: 'Project Note Setup',
      description: 'Applies standard properties and initial checklist when tagged #project',
      enabled: true,
      status: 'active',
      priority: 'normal',
      trigger: {
        type: 'tag_added',
        tag: 'project',
      },
      conditionGroup: 'ALL',
      conditions: [
        {
          id: 'c1',
          type: 'property_exists',
          field: 'status',
          negate: true,
        },
      ],
      actions: [
        {
          type: 'set_property',
          key: 'status',
          value: 'active',
        },
        {
          type: 'set_property',
          key: 'start_date',
          value: '{{today}}',
        },
        {
          type: 'add_task',
          taskText: 'Clarify project scope and measurable success criteria',
        },
      ],
      options: {
        requireConfirmation: false,
      },
    },
  },
  {
    id: 'recipe_archive_completed_project',
    name: 'Suggest Archiving When All Tasks Done',
    description: 'Prompts to mark as completed and archive note when all checkboxes in a project are checked.',
    category: 'Tasks & Projects',
    icon: 'CheckCircle2',
    rule: {
      name: 'Suggest Archiving Finished Projects',
      description: 'Offers to set completed date and archive when all tasks in a note are complete',
      enabled: true,
      status: 'active',
      priority: 'normal',
      trigger: {
        type: 'all_tasks_completed',
      },
      conditionGroup: 'ALL',
      conditions: [
        {
          id: 'c1',
          type: 'is_archived',
          value: false,
        },
        {
          id: 'c2',
          type: 'has_tag',
          value: 'project',
        },
      ],
      actions: [
        {
          type: 'suggest_action',
          title: 'All tasks completed for project',
          description: 'Set completed_date to {{today}} and archive this project note?',
          actionToPropose: {
            type: 'set_property',
            key: 'completed_date',
            value: '{{today}}',
          },
        },
      ],
      options: {
        requireConfirmation: true,
      },
    },
  },
  {
    id: 'recipe_research_capture_tagging',
    name: 'Auto-Tag ArXiv & Paper Captures',
    description: 'Adds #paper tag and sets type: paper when web clipping from scientific repositories.',
    category: 'Capture & Research',
    icon: 'BookMarked',
    rule: {
      name: 'Auto-Tag ArXiv & Paper Captures',
      description: 'Routes arXiv and science captures with academic metadata',
      enabled: true,
      status: 'active',
      priority: 'normal',
      trigger: {
        type: 'browser_capture_committed',
        sourceHost: 'arxiv.org',
      },
      conditionGroup: 'ALL',
      conditions: [],
      actions: [
        {
          type: 'add_tag',
          tag: 'paper',
        },
        {
          type: 'set_property',
          key: 'source_type',
          value: 'preprint',
        },
        {
          type: 'set_property',
          key: 'reading_status',
          value: 'to-read',
        },
      ],
      options: {
        requireConfirmation: false,
      },
    },
  },
  {
    id: 'recipe_daily_focus_template',
    name: 'Daily Note Focus Block',
    description: 'Inserts a daily focus checklist automatically when a new Daily Note is created.',
    category: 'Organization',
    icon: 'Sun',
    rule: {
      name: 'Daily Note Focus Block',
      description: 'Inserts morning priorities block upon Daily Note creation',
      enabled: true,
      status: 'active',
      priority: 'normal',
      trigger: {
        type: 'note_created',
      },
      conditionGroup: 'ALL',
      conditions: [
        {
          id: 'c1',
          type: 'is_daily_note',
          value: true,
        },
      ],
      actions: [
        {
          type: 'insert_under_heading',
          heading: 'Today Focus',
          content: `- [ ] Deep work session 1\n- [ ] Core delivery item\n- [ ] Evening retrospective`,
          fallback: 'append_end',
        },
      ],
      options: {
        requireConfirmation: false,
      },
    },
  },
];
