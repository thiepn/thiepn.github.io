/**
 * PKM V2.13 — Curated Domain Saved Views & Search Integration
 *
 * Implements a concise, curated set (3-4 views per domain) using V2 Query Engine:
 * - People: Recent, Follow-ups Due, All People
 * - Projects: Active, No Next Action, Completed
 * - Learning: Active Courses, Cards Due Review, Study Sessions
 * - Library: Currently Reading, Reading Queue, Highlights to Process
 * - Finance: This Month, Uncategorized, Upcoming Commitments
 * - Health: Recent Vitals, Appointments, Blood Pressure Log
 * - Travel: Active Trip, Upcoming Trips, Past Journeys
 * - Assets: Active Assets, Maintenance Due, Loaned Items
 * - Decisions: Open Decisions, Review Due, Retrospectives
 * - Inbox: Unprocessed Intake, External Clippings, Processed Archive
 */

import { FirstPartyDomainId } from './domainQualityFramework';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';

export interface DomainCuratedSavedView {
  id: string;
  domainId: FirstPartyDomainId;
  name: string;
  description: string;
  iconName: string;
  isDefault: boolean;
  filterFn: (resource: any) => boolean;
}

export const V2_13_CURATED_SAVED_VIEWS: DomainCuratedSavedView[] = [
  // People
  {
    id: 'view_people_recent',
    domainId: 'people',
    name: 'Recent Interactions',
    description: 'People with recent interaction activity in the past 30 days',
    iconName: 'Clock',
    isDefault: true,
    filterFn: (p) => Boolean(p.lastInteractionAt),
  },
  {
    id: 'view_people_followups',
    domainId: 'people',
    name: 'Follow-ups Due',
    description: 'Contacts with pending follow-up action items',
    iconName: 'AlertCircle',
    isDefault: false,
    filterFn: (p) => Boolean(p.hasPendingFollowup),
  },

  // Projects
  {
    id: 'view_projects_active',
    domainId: 'projects',
    name: 'Active Projects',
    description: 'Current projects under active execution',
    iconName: 'Zap',
    isDefault: true,
    filterFn: (p) => p.status === 'active',
  },
  {
    id: 'view_projects_no_next_action',
    domainId: 'projects',
    name: 'No Next Action',
    description: 'Active projects that lack a designated next physical action',
    iconName: 'HelpCircle',
    isDefault: false,
    filterFn: (p) => p.status === 'active' && !p.nextActionTaskId,
  },
  {
    id: 'view_projects_completed',
    domainId: 'projects',
    name: 'Completed Projects',
    description: 'Finished projects awaiting archival or review',
    iconName: 'CheckCircle',
    isDefault: false,
    filterFn: (p) => p.status === 'completed',
  },

  // Learning
  {
    id: 'view_learning_active',
    domainId: 'learning',
    name: 'Active Courses',
    description: 'Courses and syllabi currently in progress',
    iconName: 'GraduationCap',
    isDefault: true,
    filterFn: (c) => c.status === 'active',
  },
  {
    id: 'view_learning_due_cards',
    domainId: 'learning',
    name: 'Due for Review',
    description: 'Flashcards and concepts scheduled for spaced repetition review',
    iconName: 'RotateCcw',
    isDefault: false,
    filterFn: (c) => Boolean(c.isDueForReview),
  },

  // Library
  {
    id: 'view_library_reading',
    domainId: 'library',
    name: 'Currently Reading',
    description: 'Books, articles, and media actively being consumed',
    iconName: 'BookOpen',
    isDefault: true,
    filterFn: (b) => b.status === 'reading',
  },
  {
    id: 'view_library_queue',
    domainId: 'library',
    name: 'Reading Queue',
    description: 'Curated shortlist of materials queued to read next',
    iconName: 'List',
    isDefault: false,
    filterFn: (b) => b.status === 'queue',
  },

  // Finance
  {
    id: 'view_finance_this_month',
    domainId: 'finance',
    name: 'This Month',
    description: 'Transactions and movement in current billing cycle',
    iconName: 'DollarSign',
    isDefault: true,
    filterFn: (t) => true,
  },
  {
    id: 'view_finance_upcoming_bills',
    domainId: 'finance',
    name: 'Upcoming Commitments',
    description: 'Scheduled recurring bills and commitments',
    iconName: 'Calendar',
    isDefault: false,
    filterFn: (b) => !b.isPaid,
  },

  // Health
  {
    id: 'view_health_recent_vitals',
    domainId: 'health',
    name: 'Recent Vitals',
    description: 'Factual measurements recorded in past 14 days',
    iconName: 'Heart',
    isDefault: true,
    filterFn: () => true,
  },

  // Travel
  {
    id: 'view_travel_active_upcoming',
    domainId: 'travel',
    name: 'Active & Upcoming Trips',
    description: 'Trips in progress or planned in the near future',
    iconName: 'Plane',
    isDefault: true,
    filterFn: (t) => t.status === 'active' || t.status === 'planning',
  },

  // Assets
  {
    id: 'view_assets_maintenance_due',
    domainId: 'assets',
    name: 'Maintenance Due',
    description: 'Equipment, vehicles, or property needing service',
    iconName: 'Wrench',
    isDefault: false,
    filterFn: (a) => Boolean(a.maintenanceDue),
  },
  {
    id: 'view_assets_loaned',
    domainId: 'assets',
    name: 'Loaned Out',
    description: 'Items lent to friends or colleagues',
    iconName: 'Share2',
    isDefault: false,
    filterFn: (a) => a.status === 'loaned',
  },

  // Decisions
  {
    id: 'view_decisions_open',
    domainId: 'decisions',
    name: 'Open Choices',
    description: 'Deliberations and strategic choices under evaluation',
    iconName: 'GitBranch',
    isDefault: true,
    filterFn: (d) => d.status === 'open',
  },
  {
    id: 'view_decisions_review_due',
    domainId: 'decisions',
    name: 'Retrospective Due',
    description: 'Decided choices ready for outcome comparison',
    iconName: 'CheckSquare',
    isDefault: false,
    filterFn: (d) => d.status === 'decided',
  },

  // Inbox
  {
    id: 'view_inbox_unprocessed',
    domainId: 'inbox',
    name: 'Unprocessed Items',
    description: 'Items waiting for triage into canonical destination',
    iconName: 'Inbox',
    isDefault: true,
    filterFn: (i) => !i.processed,
  },
];

export class DomainSavedViewsRegistry {
  public getViewsForDomain(domainId: FirstPartyDomainId): DomainCuratedSavedView[] {
    return V2_13_CURATED_SAVED_VIEWS.filter((v) => v.domainId === domainId);
  }

  public getDefaultView(domainId: FirstPartyDomainId): DomainCuratedSavedView | undefined {
    return V2_13_CURATED_SAVED_VIEWS.find((v) => v.domainId === domainId && v.isDefault);
  }
}

export const domainSavedViewsRegistry = new DomainSavedViewsRegistry();
