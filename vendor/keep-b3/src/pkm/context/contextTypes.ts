/**
 * Phase P59 - Unified Context Engine, Attention Layer & Personal OS Intelligence
 * Formal Context and Attention Types
 */

import { Note, Folder } from '../../types';

export type ContextType =
  | 'today'
  | 'week'
  | 'project'
  | 'goal'
  | 'area'
  | 'course'
  | 'trip'
  | 'person'
  | 'decision'
  | 'asset'
  | 'library-item'
  | 'custom';

export interface ContextDescriptor {
  id: string;
  type: ContextType;
  resourceId?: string; // Canonical ID of backing resource (Note ID, Project ID, Course ID, etc.)
  title: string;
  subtitle?: string;
  explicit: boolean;
  iconName?: string;
  color?: string;
  createdAt?: number;
}

export type RelevanceType = 'direct' | 'related' | 'recent' | 'suggested' | 'due' | 'pinned';

export interface WorkingSetItem {
  id: string;
  resourceType:
    | 'note'
    | 'task'
    | 'person'
    | 'project'
    | 'goal'
    | 'area'
    | 'course'
    | 'trip'
    | 'decision'
    | 'asset'
    | 'library'
    | 'inbox'
    | 'event'
    | 'file';
  resourceId: string;
  title: string;
  subtitle?: string;
  relevanceType: RelevanceType;
  relevanceExplanation: string;
  isPinned?: boolean;
  isSuggested?: boolean;
  status?: string;
  date?: string;
  linkSubpath?: string;
  metadata?: Record<string, any>;
}

export interface ContextWorkingSet {
  now?: WorkingSetItem[];
  tasks: WorkingSetItem[];
  notes: WorkingSetItem[];
  people: WorkingSetItem[];
  events: WorkingSetItem[];
  files: WorkingSetItem[];
  inboxItems: WorkingSetItem[];
  decisions: WorkingSetItem[];
  references: WorkingSetItem[];
  other: WorkingSetItem[];
}

export type AttentionReason =
  | 'overdue'
  | 'due'
  | 'review-due'
  | 'unprocessed'
  | 'conflict'
  | 'data-integrity'
  | 'disconnected'
  | 'stale'
  | 'missing-action'
  | 'user-rule';

export type AttentionSeverity = 'info' | 'attention' | 'important';

export interface AttentionItem {
  id: string;
  sourceDomain:
    | 'tasks'
    | 'inbox'
    | 'calendar'
    | 'projects'
    | 'decisions'
    | 'predictions'
    | 'travel'
    | 'assets'
    | 'finance'
    | 'health'
    | 'system';
  resourceRef: {
    type: string;
    id: string;
    title: string;
    subpath?: string;
  };
  reason: AttentionReason;
  severity: AttentionSeverity;
  dueAt?: string;
  explanation: string;
  actionLabel?: string;
  actionTarget?: {
    type: string;
    id: string;
    action?: string;
  };
  acknowledgedUntil?: string; // ISO date string
  isSystem?: boolean;
  createdAt: number;
}

export interface ContextResumeState {
  contextId: string;
  contextTitle: string;
  contextType: ContextType;
  activeResourceId?: string;
  activeResourceTitle?: string;
  openResourceIds?: string[];
  lastWorkedOn: number; // timestamp
  previewText?: string;
  resourceStates?: Record<
    string,
    {
      scroll?: number;
      cursor?: { line: number; ch: number };
      pdfPage?: number;
      canvasViewport?: { x: number; y: number; zoom: number };
    }
  >;
}

export interface CustomContextDefinition {
  id: string;
  name: string;
  iconName?: string;
  color?: string;
  rootResourceRefs: Array<{
    type: string;
    id: string;
    title: string;
  }>;
  filters?: Record<string, any>;
  pinnedResourceIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ContextSummaryMetric {
  label: string;
  value: string | number;
  tone?: 'default' | 'amber' | 'emerald' | 'blue' | 'purple' | 'rose';
}

export interface ContextSummary {
  headline: string;
  statusText?: string;
  nextMilestone?: string;
  keyMetrics: ContextSummaryMetric[];
}

export interface SemanticChangeEvent {
  id: string;
  timestamp: number;
  domain: string;
  type: string;
  description: string;
  resourceTitle?: string;
  resourceId?: string;
}

export interface WhatChangedSummary {
  lastReviewedAt: number;
  eventsCount: number;
  events: SemanticChangeEvent[];
}

export interface ContextSnapshot {
  context: ContextDescriptor;
  workingSet: ContextWorkingSet;
  summary: ContextSummary;
  attention: AttentionItem[];
  whatChanged: WhatChangedSummary;
  generatedAt: number;
  indexVersion: number;
}

export interface ContextResolveOptions {
  limitPerSection?: number;
  includeSuggested?: boolean;
  includeSensitiveFinance?: boolean;
  includeSensitiveHealth?: boolean;
}

export interface ContextAction {
  id: string;
  label: string;
  iconName?: string;
  description?: string;
  isPrimary?: boolean;
  execute: () => void;
}

export interface ContextAIScopePreview {
  contextId: string;
  contextTitle: string;
  includedSources: Array<{
    type: string;
    title: string;
    itemCount?: number;
  }>;
  excludedSensitiveSources: Array<{
    type: string;
    title: string;
    reason: string;
  }>;
}
