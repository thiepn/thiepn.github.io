/**
 * V2.3 Workflow & Temporal Duplication Audit
 * 
 * Comprehensive pre-implementation inventory of existing systems representing
 * intent, time, repetition, action, completion, and review across V1 and V2.
 */

export interface SystemInventoryItem {
  system: string;
  canonicalData: string;
  derivedData: string;
  trigger: string;
  execution: string;
  completionSemantics: string;
  recurrenceSemantics: string;
  reminderSemantics: string;
  multiDeviceBehavior: string;
  offlineBehavior: string;
  backgroundBehavior: string;
  currentOverlap: string;
  v2_3ConsolidationStrategy: string;
}

export const V2_3_WORKFLOW_TEMPORAL_AUDIT: SystemInventoryItem[] = [
  {
    system: 'Tasks (P25)',
    canonicalData: 'Markdown task lines `- [ ]` or ResourceCore `task` envelopes with metadata.',
    derivedData: 'Completed state, priority, tags, project relation, due/scheduled status.',
    trigger: 'User check/uncheck or action dispatch.',
    execution: 'Direct string or metadata modification in markdown note or task envelope.',
    completionSemantics: 'Marks `[x]` with optional `@completed(YYYY-MM-DD)`.',
    recurrenceSemantics: 'Parsed from `@every(...)` token. Prior code duplicated recurrence expansion.',
    reminderSemantics: 'Optional `@reminder(...)` token.',
    multiDeviceBehavior: 'CRDT / merge resolution on line or record level.',
    offlineBehavior: 'Full offline write capability.',
    backgroundBehavior: 'Passive local store; no background modification.',
    currentOverlap: 'Overlaps with Calendar projections, Today view, and Routine steps.',
    v2_3ConsolidationStrategy: 'Retain canonical Tasks. Use unified TemporalIndexV2 for Due and Scheduled projections without duplicating data.',
  },
  {
    system: 'Calendar & Agenda (P37)',
    canonicalData: 'Daily notes, event notes, or projected task metadata.',
    derivedData: 'Month grid, week schedule, day timeline, agenda grouped list.',
    trigger: 'Date selection, view change, drag-and-drop scheduling.',
    execution: 'Renders time grid and calculates temporal collisions.',
    completionSemantics: 'Events are not completed; projected tasks update task state.',
    recurrenceSemantics: 'P37 RecurrenceEngine calculated next dates.',
    reminderSemantics: 'Integrated with native notification dispatcher.',
    multiDeviceBehavior: 'State synced through note sync.',
    offlineBehavior: 'Fully operable offline via cached index.',
    backgroundBehavior: 'Web background cannot update UI; desktop/mobile uses OS hooks.',
    currentOverlap: 'Independent temporal scanner duplicated in Agenda and Calendar components.',
    v2_3ConsolidationStrategy: 'Centralize into TemporalIndexV2 and UnifiedTodayEngine. Distinguish Due vs Scheduled.',
  },
  {
    system: 'Automations (P36)',
    canonicalData: 'AutomationRule records stored in preferences/storage.',
    derivedData: 'Execution logs, pending suggestions, dry run traces.',
    trigger: 'Domain events (note lifecycle, property change, tag change, task completion) or time schedules.',
    execution: 'Action execution pipeline in automationEngine.ts with loop detection.',
    completionSemantics: 'Rule execution succeeds, skips, or fails with logged details.',
    recurrenceSemantics: 'Daily/weekly/monthly/interval cron-like triggers.',
    reminderSemantics: 'Can trigger in-app notifications or suggestions.',
    multiDeviceBehavior: 'Idempotency keys prevent double execution of scheduled occurrences.',
    offlineBehavior: 'Queues events and executes locally.',
    backgroundBehavior: 'Catch-up policy runs missed scheduled rules on app reopen.',
    currentOverlap: 'Separate action executor from V1.6 Workflow Presets and V2 Action System.',
    v2_3ConsolidationStrategy: 'Unify Action execution onto V2 Action Registry. Enforce automation-safe whitelist and depth-3 loop prevention.',
  },
  {
    system: 'Workflow Presets (V1.6)',
    canonicalData: 'Preset definitions stored in preferences (`workflow_presets_v16`).',
    derivedData: 'Execution reports with step-by-step success/error attribution.',
    trigger: 'Explicit user invocation (button or command palette).',
    execution: 'Sequential linear action runner in WorkflowPresetsManager.',
    completionSemantics: 'Finishes all steps or stops on first non-optional error.',
    recurrenceSemantics: 'None (presets are strictly run-now sequences).',
    reminderSemantics: 'None.',
    multiDeviceBehavior: 'Config synced via preferences; execution is strictly local.',
    offlineBehavior: 'Full offline execution.',
    backgroundBehavior: 'None.',
    currentOverlap: 'Duplicated sequential action logic that could share core with Routine steps.',
    v2_3ConsolidationStrategy: 'Use shared ActionSequenceExecutor for Presets and Routine steps while preserving clear UX distinction.',
  },
  {
    system: 'Routines & Habit Tracking (P50)',
    canonicalData: 'TrackingDefinition, RoutineDefinition, RoutineRun, and TrackingEntry records.',
    derivedData: 'DailyTrackingSummary, PeriodTrackingMetrics, expected today lists.',
    trigger: 'User starts routine run, logs habit value, or opens Daily/Today.',
    execution: 'Step checklist check-off or numeric value recording.',
    completionSemantics: 'Explicit routine finish or habit check; missed is NOT failed.',
    recurrenceSemantics: 'Uses recurrence rules for expected occurrences.',
    reminderSemantics: 'Optional daypart reminder notifications.',
    multiDeviceBehavior: 'Tracking entries merged by unique event timestamp and idempotency key.',
    offlineBehavior: 'Full offline recording and local aggregation.',
    backgroundBehavior: 'None.',
    currentOverlap: 'Schedule logic duplicated from Calendar recurrence.',
    v2_3ConsolidationStrategy: 'Maintain clear distinction: Routines = tracked multi-step processes; Habits = repeated behavior logging. Feed expected occurrences into Today.',
  },
  {
    system: 'Periodic & Project Reviews (P49 / P50)',
    canonicalData: 'Review Note records (Weekly Review, Monthly, Project Review).',
    derivedData: 'Query-backed evidence panels (completed tasks, overdue, stalled projects, inbox count).',
    trigger: 'User initiates review or scheduled review due trigger.',
    execution: 'Interactive guided review workspace with reflection prompts.',
    completionSemantics: 'User marks review complete; optionally saves bounded snapshot.',
    recurrenceSemantics: 'Advances to next review cycle (weekly, monthly, quarterly).',
    reminderSemantics: 'Weekly review reminder banner/attention item.',
    multiDeviceBehavior: 'Canonical review note synced normally.',
    offlineBehavior: 'Full offline review capability.',
    backgroundBehavior: 'None.',
    currentOverlap: 'Review aggregator recalculated independently from V2 Unified Query Engine.',
    v2_3ConsolidationStrategy: 'Power all Review evidence queries via V2 Unified Query Engine. Retain canonical review notes with optional structured snapshots.',
  },
  {
    system: 'Planning Horizons & Focus (P49)',
    canonicalData: 'Goal, Project, Area notes with frontmatter properties.',
    derivedData: 'GoalHierarchy, ProjectTaskMetrics, FocusItems, AttentionSignals.',
    trigger: 'User navigation, planning triage, or plan today flow.',
    execution: 'Deterministic calculation of project next actions and stale thresholds.',
    completionSemantics: 'Project marked completed when user explicitly confirms.',
    recurrenceSemantics: 'None.',
    reminderSemantics: 'Deadline and target date alerts.',
    multiDeviceBehavior: 'Note-based sync.',
    offlineBehavior: 'Full offline support.',
    backgroundBehavior: 'None.',
    currentOverlap: 'Attention signals calculated in multiple separate scanners.',
    v2_3ConsolidationStrategy: 'Unify project next-action detection and planning horizons into cohesive PlanLandingPage with Plan Today workflow.',
  },
];
