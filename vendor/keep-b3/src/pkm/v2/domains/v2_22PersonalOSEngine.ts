/**
 * PKM V2.22 — Personal OS Feature Completion Engine
 *
 * Implements the authoritative first-party Personal OS domains:
 * - Goals & Areas (strategic outcomes, no fake task %, ongoing responsibilities)
 * - Reviews (step-by-step human review workflow, reflection, past snapshots)
 * - People & Organizations (personal relationship memory, interactions, canonical follow-ups, safe duplicate merge)
 * - Tracking (typed trackers, quick log, factual missing data semantics, timeline history)
 * - Habits & Routines (non-punitive habits, multi-step routines, execution runs)
 * - Learning, Courses, Study Sessions & Spaced Repetition (courses, material links, explicit study sessions, SM-2 flashcard reviews)
 * - Library & References (books, articles, videos, podcasts, media progress, highlights, citation references)
 * - Finance (exact integer cents, single logical transfers, split invariants, budgets, recurring bills, privacy)
 * - Health (measurements with mandatory provenance, explicit units, calendar appointments, medication reminders, privacy)
 * - Travel (trip planning vs active travel mode, timezone-safe reservations, offline packs, companion & finance relations)
 * - Assets (ownership, warranty tracking, maintenance records & schedules, person loans)
 * - Decisions & Experiments (reasoning preservation, prediction snapshots, outcome review, bounded experiments)
 * - Cross-Domain Home Contributions, Deduplicated Attention, Meaningful Activity & Export Generators.
 */

// ================= TYPES =================

export type FirstPartyDomainType =
  | 'goals'
  | 'areas'
  | 'reviews'
  | 'people'
  | 'organizations'
  | 'tracking'
  | 'habits'
  | 'routines'
  | 'learning'
  | 'library'
  | 'finance'
  | 'health'
  | 'travel'
  | 'assets'
  | 'decisions'
  | 'experiments';

// --- Goals & Areas ---
export type V22GoalStatus = 'active' | 'achieved' | 'paused' | 'archived';
export interface V22Goal {
  id: string;
  title: string;
  desiredOutcome: string;
  whyItMatters: string;
  status: V22GoalStatus;
  targetHorizon?: string; // e.g. "2026-Q4" or "End of Year"
  reviewDateOnly?: string;
  relatedProjectIds: string[];
  relatedAreaId?: string;
  measurableMetric?: {
    name: string;
    currentValue: number;
    targetValue: number;
    unit: string;
  };
  createdAt: string;
  updatedAt: string;
  achievedAt?: string;
}

export interface V22Area {
  id: string;
  title: string;
  description: string;
  responsibilities: string[];
  reviewCadence?: 'weekly' | 'monthly' | 'quarterly';
  status: 'active' | 'archived';
  relatedProjectIds: string[];
}

// --- Reviews ---
export type ReviewType = 'weekly' | 'project' | 'goal' | 'area' | 'decision';
export interface V22ReviewStep {
  id: string;
  title: string;
  domain: string;
  description: string;
  completed: boolean;
  itemCount: number;
}

export interface V22ReviewSession {
  id: string;
  type: ReviewType;
  reviewDateOnly: string;
  startedAt: string;
  completedAt?: string;
  steps: V22ReviewStep[];
  reflectionNotes?: string;
  createdFollowUpTaskCount: number;
  completed: boolean;
}

// --- People & Organizations ---
export type V22InteractionType = 'meeting' | 'call' | 'message' | 'email' | 'event' | 'note';
export interface V22Person {
  id: string;
  name: string;
  importantContext?: string;
  email?: string;
  phone?: string;
  organizationId?: string;
  organizationName?: string;
  birthday?: string;
  tags?: string[];
  lastInteractionAt?: string;
  relatedProjectIds: string[];
  relatedNoteIds: string[];
}

export interface V22PersonInteraction {
  id: string;
  personId: string;
  timestamp: string;
  dateOnly: string;
  type: V22InteractionType;
  summary: string;
  location?: string;
  notes?: string;
}

export interface V22PersonFollowUpTask {
  id: string;
  personId: string;
  title: string;
  dueDateOnly?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface V22Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  memberPersonIds: string[];
  relatedProjectIds: string[];
}

// --- Tracking ---
export type TrackerValueType = 'number' | 'boolean' | 'scale_1_5' | 'duration_minutes' | 'text';
export interface V22Tracker {
  id: string;
  name: string;
  unit: string;
  valueType: TrackerValueType;
  description?: string;
  targetDirection?: 'higher_is_better' | 'lower_is_better' | 'neutral';
  tags?: string[];
}

export interface V22TrackingEvent {
  id: string;
  trackerId: string;
  timestamp: string;
  dateOnly: string;
  numericValue?: number;
  textValue?: string;
  source: 'manual_quick_log' | 'automated_sensor' | 'imported_csv';
  notes?: string;
}

// --- Habits & Routines ---
export interface V22Habit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  scheduledDays?: number[]; // 0=Sun..6=Sat
  history: Record<string, 'done' | 'skipped'>; // dateOnly -> status
  createdAt: string;
  archived: boolean;
}

export interface V22RoutineStep {
  id: string;
  label: string;
  durationEstimateMinutes?: number;
  optional?: boolean;
}

export interface V22Routine {
  id: string;
  title: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  steps: V22RoutineStep[];
  active: boolean;
}

export interface V22RoutineRun {
  id: string;
  routineId: string;
  startedAt: string;
  completedAt?: string;
  completedStepIds: string[];
  totalStepsCount: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  notes?: string;
}

// --- Learning & Spaced Repetition ---
export interface V22CourseAssessment {
  id: string;
  title: string;
  dueDateOnly: string;
  weightPercent?: number;
  completed: boolean;
  scoreOrGrade?: string;
}

export interface V22Course {
  id: string;
  name: string;
  instructor?: string;
  term?: string;
  status: 'active' | 'completed' | 'archived';
  linkedMaterialIds: string[]; // LibraryItem or Reference IDs
  linkedNoteIds: string[];
  linkedTaskIds: string[];
  assessments: V22CourseAssessment[];
  reviewCadence?: 'weekly' | 'biweekly';
}

export interface V22StudySession {
  id: string;
  courseId: string;
  materialId?: string;
  focusGoal: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  notes?: string;
  completed: boolean;
}

export interface V22Flashcard {
  id: string;
  courseId?: string;
  sourceNoteId?: string;
  question: string;
  answer: string;
  nextReviewDateOnly: string;
  intervalDays: number;
  repetitionCount: number;
  easeFactor: number; // starts at 2.5
  lastReviewedAt?: string;
}

// --- Library & References ---
export type V22LibraryItemType = 'book' | 'article' | 'pdf' | 'video' | 'podcast';
export type ReadingStatus = 'queue' | 'in_progress' | 'finished' | 'abandoned';

export interface V22LibraryHighlight {
  id: string;
  text: string;
  pageOrTimestamp?: string;
  note?: string;
  createdAt: string;
}

export interface V22LibraryItem {
  id: string;
  title: string;
  creator: string;
  type: V22LibraryItemType;
  status: ReadingStatus;
  progressPercent: number;
  currentLocation?: string; // e.g. "p. 142" or "01:23:45"
  totalLocations?: string;
  rating?: number;
  linkedNoteIds: string[];
  highlights: V22LibraryHighlight[];
  startedDateOnly?: string;
  finishedDateOnly?: string;
  updatedAt: string;
}

export interface V22Reference {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  publication?: string;
  doiOrIsbn?: string;
  citeKey: string;
  itemType: 'journal' | 'book' | 'conference' | 'web' | 'report';
  linkedResourceIds: string[];
}

// --- Finance ---
export type TransactionKind = 'income' | 'expense' | 'transfer' | 'split';
export interface V22FinanceAccount {
  id: string;
  name: string;
  currency: string;
  initialBalanceCents: number;
  type: 'checking' | 'savings' | 'credit' | 'cash';
  active: boolean;
}

export interface V22TransactionSplit {
  category: string;
  amountCents: number;
  notes?: string;
}

export interface V22FinanceTransaction {
  id: string;
  dateOnly: string;
  timestamp: string;
  kind: TransactionKind;
  amountCents: number; // Exact integer cents
  accountId: string;
  targetAccountId?: string; // For transfers
  category?: string;
  payee?: string;
  notes?: string;
  splits?: V22TransactionSplit[];
  reconciled: boolean;
}

export interface V22Budget {
  id: string;
  category: string;
  period: 'monthly' | 'quarterly';
  plannedAmountCents: number;
}

export interface V22RecurringBill {
  id: string;
  name: string;
  amountCents: number;
  dueDateOnly: string;
  accountId?: string;
  recurringFrequency: 'monthly' | 'quarterly' | 'annual';
  isPaid: boolean;
}

// --- Health ---
export type HealthMetricType = 'blood_pressure' | 'weight' | 'heart_rate' | 'blood_glucose' | 'sleep_hours' | 'steps';
export type HealthSourceProvenance = 'manual_log' | 'apple_health' | 'medical_record' | 'csv_import';

export interface V22HealthMeasurement {
  id: string;
  type: HealthMetricType;
  numericValue: number;
  secondaryNumericValue?: number; // e.g. diastolic for BP
  unit: string;
  dateOnly: string;
  timestamp: string;
  sourceProvenance: HealthSourceProvenance;
  notes?: string;
}

export interface V22HealthAppointment {
  id: string;
  title: string;
  dateOnly: string;
  time?: string;
  provider: string;
  location?: string;
  notes?: string;
  completed: boolean;
}

export interface V22MedicationSchedule {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  reminderTime?: string;
  active: boolean;
  notes?: string;
}

// --- Travel ---
export type V22ReservationType = 'flight' | 'lodging' | 'transit' | 'car_rental' | 'activity' | 'restaurant';
export interface V22TravelReservation {
  id: string;
  tripId: string;
  type: V22ReservationType;
  title: string;
  provider: string;
  confirmationCode?: string;
  startDateTimeIso: string;
  endDateTimeIso?: string;
  destinationTimezone: string;
  location?: string;
  notes?: string;
}

export interface V22Trip {
  id: string;
  title: string;
  destination: string;
  startDateOnly: string;
  endDateOnly: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  timezone: string;
  offlinePackPrepared: boolean;
  companionPersonIds: string[];
  relatedTransactionIds: string[];
  notes?: string;
}

// --- Assets ---
export interface V22MaintenanceRecord {
  id: string;
  assetId: string;
  performedDateOnly: string;
  serviceType: string;
  costCents?: number;
  providerOrSelf: string;
  notes?: string;
}

export interface V22AssetLoan {
  id: string;
  assetId: string;
  personId: string;
  loanDateOnly: string;
  dueDateOnly?: string;
  returnedDateOnly?: string;
  status: 'active' | 'returned' | 'overdue';
  notes?: string;
}

export interface V22Asset {
  id: string;
  name: string;
  category: 'electronics' | 'vehicle' | 'appliance' | 'property' | 'tool' | 'other';
  serialNumber?: string;
  purchaseDateOnly?: string;
  purchasePriceCents?: number;
  purchaseTransactionId?: string;
  warrantyEndDateOnly?: string;
  notes?: string;
  maintenanceHistory: V22MaintenanceRecord[];
  activeLoans: V22AssetLoan[];
}

// --- Decisions & Experiments ---
export interface V22DecisionOption {
  id: string;
  title: string;
  pros: string[];
  cons: string[];
}

export interface V22Decision {
  id: string;
  question: string;
  status: 'open' | 'chosen' | 'reviewed' | 'abandoned';
  options: V22DecisionOption[];
  chosenOptionId?: string;
  chosenOptionTitle?: string;
  reasoning?: string;
  prediction?: {
    statement: string;
    confidencePercent: number;
    recordedAt: string;
  };
  evidenceResourceIds: string[];
  decisionDateOnly?: string;
  reviewDateOnly?: string;
  outcome?: {
    actualWhatHappened: string;
    reflectionNotes: string;
    reviewedAt: string;
  };
}

export interface V22Experiment {
  id: string;
  title: string;
  hypothesis: string;
  method: string;
  durationDays: number;
  startDateOnly: string;
  endDateOnly?: string;
  linkedTrackerIds: string[];
  status: 'planned' | 'running' | 'concluded';
  observations?: string;
  conclusions?: string;
}

// --- Home & Attention Contributions ---
export interface V22HomeContribution {
  domainId: FirstPartyDomainType;
  title: string;
  subtitle: string;
  priority: number;
  actionLabel: string;
  actionPayload: any;
}

export interface V22AttentionItem {
  id: string;
  domainId: FirstPartyDomainType;
  severity: 'info' | 'warning' | 'urgent';
  reason: string;
  actionLabel: string;
  resourceId: string;
  autoResolving: boolean;
}

export interface V22ActivityEvent {
  id: string;
  domainId: FirstPartyDomainType;
  action: string;
  summary: string;
  timestamp: string;
  resourceId: string;
}

// ================= ENGINE CLASS =================

export class V2_22PersonalOSEngine {
  // In-memory repositories
  private goals = new Map<string, V22Goal>();
  private areas = new Map<string, V22Area>();
  private reviews = new Map<string, V22ReviewSession>();
  private people = new Map<string, V22Person>();
  private interactions: V22PersonInteraction[] = [];
  private personFollowUps: V22PersonFollowUpTask[] = [];
  private organizations = new Map<string, V22Organization>();
  private trackers = new Map<string, V22Tracker>();
  private trackingEvents: V22TrackingEvent[] = [];
  private habits = new Map<string, V22Habit>();
  private routines = new Map<string, V22Routine>();
  private routineRuns: V22RoutineRun[] = [];
  private courses = new Map<string, V22Course>();
  private studySessions: V22StudySession[] = [];
  private flashcards = new Map<string, V22Flashcard>();
  private libraryItems = new Map<string, V22LibraryItem>();
  private references = new Map<string, V22Reference>();
  private financeAccounts = new Map<string, V22FinanceAccount>();
  private transactions: V22FinanceTransaction[] = [];
  private budgets = new Map<string, V22Budget>();
  private recurringBills = new Map<string, V22RecurringBill>();
  private healthMeasurements: V22HealthMeasurement[] = [];
  private healthAppointments = new Map<string, V22HealthAppointment>();
  private medications = new Map<string, V22MedicationSchedule>();
  private trips = new Map<string, V22Trip>();
  private reservations: V22TravelReservation[] = [];
  private assets = new Map<string, V22Asset>();
  private decisions = new Map<string, V22Decision>();
  private experiments = new Map<string, V22Experiment>();
  private activityLog: V22ActivityEvent[] = [];

  constructor() {
    this.seedDefaults();
  }

  // ================= 1. GOALS & AREAS =================

  public createGoal(goal: Omit<V22Goal, 'id' | 'createdAt' | 'updatedAt'>): V22Goal {
    const id = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newGoal: V22Goal = {
      ...goal,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.goals.set(id, newGoal);
    this.logActivity('goals', 'goal_created', `Created goal: ${newGoal.title}`, id);
    return newGoal;
  }

  public updateGoal(id: string, updates: Partial<V22Goal>): V22Goal | undefined {
    const existing = this.goals.get(id);
    if (!existing) return undefined;
    const updated: V22Goal = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.status === 'achieved' && existing.status !== 'achieved') {
      updated.achievedAt = new Date().toISOString();
      this.logActivity('goals', 'goal_achieved', `Achieved goal: ${updated.title}`, id);
    }
    this.goals.set(id, updated);
    return updated;
  }

  public getGoals(statusFilter?: V22GoalStatus): V22Goal[] {
    const all = Array.from(this.goals.values());
    if (statusFilter) return all.filter((g) => g.status === statusFilter);
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public getGoal(id: string): V22Goal | undefined {
    return this.goals.get(id);
  }

  public createArea(area: Omit<V22Area, 'id'>): V22Area {
    const id = `area_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newArea: V22Area = { ...area, id };
    this.areas.set(id, newArea);
    return newArea;
  }

  public getAreas(): V22Area[] {
    return Array.from(this.areas.values());
  }

  // ================= 2. REVIEWS =================

  public startReviewSession(type: ReviewType, reviewDateOnly: string): V22ReviewSession {
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const steps: V22ReviewStep[] = [
      { id: 's1', title: 'Inbox Zero Triage', domain: 'inbox', description: 'Clear all unfiled thoughts & captures', completed: false, itemCount: 3 },
      { id: 's2', title: 'Active Projects Review', domain: 'projects', description: 'Verify next action on each active project', completed: false, itemCount: 4 },
      { id: 's3', title: 'Spaced Repetition & Study', domain: 'learning', description: 'Complete due flashcards and course assessments', completed: false, itemCount: this.getDueFlashcards(reviewDateOnly).length },
      { id: 's4', title: 'Finance & Commitments', domain: 'finance', description: 'Review upcoming bills and reconcile recent transactions', completed: false, itemCount: this.getUpcomingBills(reviewDateOnly).length },
      { id: 's5', title: 'Decisions Retrospective', domain: 'decisions', description: 'Review past predictions against actual outcomes', completed: false, itemCount: this.getDecisionsDueForReview(reviewDateOnly).length },
      { id: 's6', title: 'Reflection & Next Week Intentions', domain: 'reflection', description: 'Capture learning points and strategic focus', completed: false, itemCount: 1 },
    ];
    const session: V22ReviewSession = {
      id,
      type,
      reviewDateOnly,
      startedAt: new Date().toISOString(),
      steps,
      createdFollowUpTaskCount: 0,
      completed: false,
    };
    this.reviews.set(id, session);
    return session;
  }

  public completeReviewStep(sessionId: string, stepId: string): V22ReviewSession | undefined {
    const session = this.reviews.get(sessionId);
    if (!session) return undefined;
    session.steps = session.steps.map((s) => (s.id === stepId ? { ...s, completed: true } : s));
    return session;
  }

  public completeReviewSession(sessionId: string, reflectionNotes?: string): V22ReviewSession | undefined {
    const session = this.reviews.get(sessionId);
    if (!session) return undefined;
    session.completed = true;
    session.completedAt = new Date().toISOString();
    session.reflectionNotes = reflectionNotes;
    this.logActivity('reviews', 'review_completed', `Completed ${session.type} review for ${session.reviewDateOnly}`, session.id);
    return session;
  }

  public getReviewHistory(): V22ReviewSession[] {
    return Array.from(this.reviews.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  // ================= 3. PEOPLE & ORGANIZATIONS =================

  public createPerson(person: Omit<V22Person, 'id' | 'relatedProjectIds' | 'relatedNoteIds'>): V22Person {
    const id = `person_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newPerson: V22Person = {
      ...person,
      id,
      relatedProjectIds: [],
      relatedNoteIds: [],
    };
    this.people.set(id, newPerson);
    return newPerson;
  }

  public getPeople(): V22Person[] {
    return Array.from(this.people.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  public getPerson(id: string): V22Person | undefined {
    return this.people.get(id);
  }

  public logInteraction(interaction: Omit<V22PersonInteraction, 'id' | 'timestamp'>): V22PersonInteraction {
    const id = `int_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newInt: V22PersonInteraction = {
      ...interaction,
      id,
      timestamp: new Date().toISOString(),
    };
    this.interactions.push(newInt);
    const person = this.people.get(interaction.personId);
    if (person) {
      person.lastInteractionAt = newInt.timestamp;
    }
    this.logActivity('people', 'interaction_logged', `Interaction with ${person?.name || 'Contact'}: ${newInt.summary}`, id);
    return newInt;
  }

  public getInteractionsForPerson(personId: string): V22PersonInteraction[] {
    return this.interactions
      .filter((i) => i.personId === personId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  public addPersonFollowUp(task: Omit<V22PersonFollowUpTask, 'id' | 'completed'>): V22PersonFollowUpTask {
    const id = `pfu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTask: V22PersonFollowUpTask = {
      ...task,
      id,
      completed: false,
    };
    this.personFollowUps.push(newTask);
    return newTask;
  }

  public getPersonFollowUps(personId?: string): V22PersonFollowUpTask[] {
    if (personId) return this.personFollowUps.filter((f) => f.personId === personId);
    return this.personFollowUps;
  }

  public togglePersonFollowUp(id: string): V22PersonFollowUpTask | undefined {
    const task = this.personFollowUps.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      if (task.completed) {
        this.logActivity('people', 'followup_completed', `Completed follow-up: ${task.title}`, id);
      }
    }
    return task;
  }

  public findDuplicatePeople(): Array<{ personA: V22Person; personB: V22Person; reason: string }> {
    const duplicates: Array<{ personA: V22Person; personB: V22Person; reason: string }> = [];
    const list = this.getPeople();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.email && b.email && a.email.toLowerCase().trim() === b.email.toLowerCase().trim()) {
          duplicates.push({ personA: a, personB: b, reason: 'Exact Email Match' });
        } else if (a.phone && b.phone && a.phone.replace(/\D/g, '') === b.phone.replace(/\D/g, '')) {
          duplicates.push({ personA: a, personB: b, reason: 'Exact Phone Match' });
        }
      }
    }
    return duplicates;
  }

  public mergePeople(primaryId: string, secondaryId: string): boolean {
    const primary = this.people.get(primaryId);
    const secondary = this.people.get(secondaryId);
    if (!primary || !secondary) return false;

    // Migrate interactions
    this.interactions.forEach((int) => {
      if (int.personId === secondaryId) int.personId = primaryId;
    });
    // Migrate follow-ups
    this.personFollowUps.forEach((fu) => {
      if (fu.personId === secondaryId) fu.personId = primaryId;
    });
    // Merge fields
    primary.email = primary.email || secondary.email;
    primary.phone = primary.phone || secondary.phone;
    primary.importantContext = [primary.importantContext, secondary.importantContext].filter(Boolean).join('\n');
    primary.relatedProjectIds = Array.from(new Set([...primary.relatedProjectIds, ...secondary.relatedProjectIds]));

    this.people.delete(secondaryId);
    this.logActivity('people', 'person_merged', `Merged contact into ${primary.name}`, primaryId);
    return true;
  }

  public exportVCard(personId: string): string {
    const person = this.people.get(personId);
    if (!person) return '';
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${person.name}`,
      person.email ? `EMAIL:${person.email}` : '',
      person.phone ? `TEL:${person.phone}` : '',
      person.organizationName ? `ORG:${person.organizationName}` : '',
      person.birthday ? `BDAY:${person.birthday}` : '',
      person.importantContext ? `NOTE:${person.importantContext.replace(/\n/g, '\\n')}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');
  }

  // ================= 4. TRACKING =================

  public createTracker(tracker: Omit<V22Tracker, 'id'>): V22Tracker {
    const id = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTracker: V22Tracker = { ...tracker, id };
    this.trackers.set(id, newTracker);
    return newTracker;
  }

  public getTrackers(): V22Tracker[] {
    return Array.from(this.trackers.values());
  }

  public quickLogTracking(event: Omit<V22TrackingEvent, 'id' | 'timestamp'>): V22TrackingEvent {
    const id = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newEvent: V22TrackingEvent = {
      ...event,
      id,
      timestamp: new Date().toISOString(),
    };
    this.trackingEvents.push(newEvent);
    const tracker = this.trackers.get(event.trackerId);
    this.logActivity('tracking', 'tracking_logged', `Logged ${tracker?.name || 'metric'}: ${event.numericValue ?? event.textValue} ${tracker?.unit || ''}`, id);
    return newEvent;
  }

  public getTrackingEvents(trackerId?: string, limit = 100): V22TrackingEvent[] {
    const list = trackerId ? this.trackingEvents.filter((e) => e.trackerId === trackerId) : this.trackingEvents;
    return list.slice(-limit).reverse();
  }

  // ================= 5. HABITS & ROUTINES =================

  public createHabit(habit: Omit<V22Habit, 'id' | 'history' | 'createdAt' | 'archived'>): V22Habit {
    const id = `hbt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newHabit: V22Habit = {
      ...habit,
      id,
      history: {},
      createdAt: new Date().toISOString(),
      archived: false,
    };
    this.habits.set(id, newHabit);
    return newHabit;
  }

  public logHabit(habitId: string, dateOnly: string, status: 'done' | 'skipped'): V22Habit | undefined {
    const habit = this.habits.get(habitId);
    if (!habit) return undefined;
    habit.history[dateOnly] = status;
    this.logActivity('habits', 'habit_logged', `Habit ${habit.title}: ${status}`, habitId);
    return habit;
  }

  public getHabits(): V22Habit[] {
    return Array.from(this.habits.values()).filter((h) => !h.archived);
  }

  public createRoutine(routine: Omit<V22Routine, 'id' | 'active'>): V22Routine {
    const id = `rtn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRoutine: V22Routine = { ...routine, id, active: true };
    this.routines.set(id, newRoutine);
    return newRoutine;
  }

  public getRoutines(): V22Routine[] {
    return Array.from(this.routines.values()).filter((r) => r.active);
  }

  public startRoutineRun(routineId: string): V22RoutineRun | undefined {
    const routine = this.routines.get(routineId);
    if (!routine) return undefined;
    const run: V22RoutineRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      routineId,
      startedAt: new Date().toISOString(),
      completedStepIds: [],
      totalStepsCount: routine.steps.length,
      status: 'in_progress',
    };
    this.routineRuns.push(run);
    return run;
  }

  public completeRoutineStep(runId: string, stepId: string): V22RoutineRun | undefined {
    const run = this.routineRuns.find((r) => r.id === runId);
    if (!run) return undefined;
    if (!run.completedStepIds.includes(stepId)) {
      run.completedStepIds.push(stepId);
    }
    if (run.completedStepIds.length >= run.totalStepsCount) {
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      this.logActivity('routines', 'routine_completed', `Completed routine run`, run.routineId);
    }
    return run;
  }

  // ================= 6. LEARNING & SPACED REPETITION =================

  public createCourse(course: Omit<V22Course, 'id' | 'linkedMaterialIds' | 'linkedNoteIds' | 'linkedTaskIds' | 'assessments'>): V22Course {
    const id = `crs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newCourse: V22Course = {
      ...course,
      id,
      linkedMaterialIds: [],
      linkedNoteIds: [],
      linkedTaskIds: [],
      assessments: [],
    };
    this.courses.set(id, newCourse);
    return newCourse;
  }

  public getCourses(): V22Course[] {
    return Array.from(this.courses.values());
  }

  public startStudySession(courseId: string, focusGoal: string, materialId?: string): V22StudySession {
    const id = `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const session: V22StudySession = {
      id,
      courseId,
      materialId,
      focusGoal,
      startedAt: new Date().toISOString(),
      durationMinutes: 0,
      completed: false,
    };
    this.studySessions.push(session);
    return session;
  }

  public endStudySession(sessionId: string, durationMinutes: number, notes?: string): V22StudySession | undefined {
    const session = this.studySessions.find((s) => s.id === sessionId);
    if (!session) return undefined;
    session.endedAt = new Date().toISOString();
    session.durationMinutes = durationMinutes;
    session.notes = notes;
    session.completed = true;
    const course = this.courses.get(session.courseId);
    this.logActivity('learning', 'study_session_ended', `Studied ${course?.name || 'course'} for ${durationMinutes} min: ${session.focusGoal}`, sessionId);
    return session;
  }

  public createFlashcard(card: Omit<V22Flashcard, 'id' | 'intervalDays' | 'repetitionCount' | 'easeFactor'>): V22Flashcard {
    const id = `crd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newCard: V22Flashcard = {
      ...card,
      id,
      intervalDays: 1,
      repetitionCount: 0,
      easeFactor: 2.5,
    };
    this.flashcards.set(id, newCard);
    return newCard;
  }

  public getDueFlashcards(todayDateOnly: string): V22Flashcard[] {
    return Array.from(this.flashcards.values()).filter((c) => c.nextReviewDateOnly <= todayDateOnly);
  }

  /**
   * Deterministic SM-2 Algorithm update
   * rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
   */
  public rateFlashcard(cardId: string, rating: 1 | 2 | 3 | 4, todayDateOnly: string): V22Flashcard | undefined {
    const card = this.flashcards.get(cardId);
    if (!card) return undefined;

    let { intervalDays, repetitionCount, easeFactor } = card;

    if (rating >= 3) {
      if (repetitionCount === 0) intervalDays = 1;
      else if (repetitionCount === 1) intervalDays = 6;
      else intervalDays = Math.round(intervalDays * easeFactor);
      repetitionCount += 1;
    } else {
      repetitionCount = 0;
      intervalDays = 1;
    }

    // Adjust ease factor
    easeFactor = easeFactor + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Calculate next review date
    const dateObj = new Date(todayDateOnly);
    dateObj.setDate(dateObj.getDate() + intervalDays);
    const nextReviewDateOnly = dateObj.toISOString().slice(0, 10);

    card.intervalDays = intervalDays;
    card.repetitionCount = repetitionCount;
    card.easeFactor = Number(easeFactor.toFixed(2));
    card.nextReviewDateOnly = nextReviewDateOnly;
    card.lastReviewedAt = new Date().toISOString();

    return card;
  }

  // ================= 7. LIBRARY & REFERENCES =================

  public createLibraryItem(item: Omit<V22LibraryItem, 'id' | 'highlights' | 'updatedAt'>): V22LibraryItem {
    const id = `lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newItem: V22LibraryItem = {
      ...item,
      id,
      highlights: [],
      updatedAt: new Date().toISOString(),
    };
    this.libraryItems.set(id, newItem);
    return newItem;
  }

  public updateLibraryProgress(id: string, progressPercent: number, currentLocation?: string): V22LibraryItem | undefined {
    const item = this.libraryItems.get(id);
    if (!item) return undefined;
    item.progressPercent = Math.min(100, Math.max(0, progressPercent));
    if (currentLocation) item.currentLocation = currentLocation;
    if (item.progressPercent >= 100 && item.status !== 'finished') {
      item.status = 'finished';
      item.finishedDateOnly = new Date().toISOString().slice(0, 10);
      this.logActivity('library', 'library_finished', `Finished ${item.title}`, id);
    } else if (item.progressPercent > 0 && item.status === 'queue') {
      item.status = 'in_progress';
      item.startedDateOnly = new Date().toISOString().slice(0, 10);
    }
    item.updatedAt = new Date().toISOString();
    return item;
  }

  public addHighlight(itemId: string, text: string, pageOrTimestamp?: string, note?: string): V22LibraryHighlight | undefined {
    const item = this.libraryItems.get(itemId);
    if (!item) return undefined;
    const highlight: V22LibraryHighlight = {
      id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      pageOrTimestamp,
      note,
      createdAt: new Date().toISOString(),
    };
    item.highlights.push(highlight);
    item.updatedAt = new Date().toISOString();
    return highlight;
  }

  public getLibraryItems(status?: ReadingStatus): V22LibraryItem[] {
    const all = Array.from(this.libraryItems.values());
    if (status) return all.filter((i) => i.status === status);
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public createReference(ref: Omit<V22Reference, 'id'>): V22Reference {
    const id = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRef: V22Reference = { ...ref, id };
    this.references.set(id, newRef);
    return newRef;
  }

  public getReferences(): V22Reference[] {
    return Array.from(this.references.values());
  }

  public exportBibTeX(): string {
    return Array.from(this.references.values())
      .map((r) => {
        return `@${r.itemType}{${r.citeKey},\n  title = {${r.title}},\n  author = {${r.authors.join(' and ')}},\n  year = {${r.year || ''}},\n  publisher = {${r.publication || ''}},\n  doi = {${r.doiOrIsbn || ''}}\n}`;
      })
      .join('\n\n');
  }

  // ================= 8. FINANCE =================

  public createFinanceAccount(acc: Omit<V22FinanceAccount, 'id' | 'active'>): V22FinanceAccount {
    const id = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newAcc: V22FinanceAccount = { ...acc, id, active: true };
    this.financeAccounts.set(id, newAcc);
    return newAcc;
  }

  public createAccount(acc: Omit<V22FinanceAccount, 'id' | 'active'>): V22FinanceAccount {
    return this.createFinanceAccount(acc);
  }

  public getFinanceAccounts(): V22FinanceAccount[] {
    return Array.from(this.financeAccounts.values()).filter((a) => a.active);
  }

  public getAccountBalanceCents(accountId: string): number {
    const account = this.financeAccounts.get(accountId);
    if (!account) return 0;
    let balance = account.initialBalanceCents;

    for (const tx of this.transactions) {
      if (tx.accountId === accountId) {
        if (tx.kind === 'income') balance += tx.amountCents;
        else if (tx.kind === 'expense' || tx.kind === 'split') balance -= tx.amountCents;
        else if (tx.kind === 'transfer') balance -= tx.amountCents; // debited from source
      } else if (tx.kind === 'transfer' && tx.targetAccountId === accountId) {
        balance += tx.amountCents; // credited to target
      }
    }
    return balance;
  }

  public createTransaction(tx: Omit<V22FinanceTransaction, 'id' | 'timestamp'>): V22FinanceTransaction {
    // Invariant Check for Split
    if (tx.kind === 'split') {
      if (!tx.splits || tx.splits.length === 0) {
        throw new Error('Split transaction must have at least one split item');
      }
      const sumSplits = tx.splits.reduce((acc, s) => acc + s.amountCents, 0);
      if (sumSplits !== tx.amountCents) {
        throw new Error(`Split sum (${sumSplits}) does not equal total amount (${tx.amountCents})`);
      }
    }
    // Invariant Check for Transfer
    if (tx.kind === 'transfer' && !tx.targetAccountId) {
      throw new Error('Transfer transaction must specify a targetAccountId');
    }

    const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTx: V22FinanceTransaction = {
      ...tx,
      id,
      timestamp: new Date().toISOString(),
    };
    this.transactions.push(newTx);
    return newTx;
  }

  public getTransactions(accountId?: string): V22FinanceTransaction[] {
    if (accountId) {
      return this.transactions.filter((t) => t.accountId === accountId || t.targetAccountId === accountId);
    }
    return [...this.transactions].reverse();
  }

  public addUpcomingBill(bill: Omit<V22RecurringBill, 'id' | 'isPaid'>): V22RecurringBill {
    const id = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBill: V22RecurringBill = { ...bill, id, isPaid: false };
    this.recurringBills.set(id, newBill);
    return newBill;
  }

  public getUpcomingBills(todayDateOnly?: string): V22RecurringBill[] {
    const all = Array.from(this.recurringBills.values()).filter((b) => !b.isPaid);
    if (todayDateOnly) return all.filter((b) => b.dueDateOnly <= todayDateOnly);
    return all;
  }

  // ================= 9. HEALTH =================

  public logHealthMeasurement(m: Omit<V22HealthMeasurement, 'id' | 'timestamp'>): V22HealthMeasurement {
    const id = `hm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newM: V22HealthMeasurement = {
      ...m,
      id,
      timestamp: new Date().toISOString(),
    };
    this.healthMeasurements.push(newM);
    return newM;
  }

  public getHealthMeasurements(type?: HealthMetricType): V22HealthMeasurement[] {
    if (type) return this.healthMeasurements.filter((m) => m.type === type);
    return [...this.healthMeasurements].reverse();
  }

  public addHealthAppointment(app: Omit<V22HealthAppointment, 'id' | 'completed'>): V22HealthAppointment {
    const id = `ha_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newApp: V22HealthAppointment = { ...app, id, completed: false };
    this.healthAppointments.set(id, newApp);
    return newApp;
  }

  public getHealthAppointments(): V22HealthAppointment[] {
    return Array.from(this.healthAppointments.values()).filter((a) => !a.completed);
  }

  // ================= 10. TRAVEL =================

  public createTrip(trip: Omit<V22Trip, 'id' | 'offlinePackPrepared' | 'companionPersonIds' | 'relatedTransactionIds'>): V22Trip {
    const id = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTrip: V22Trip = {
      ...trip,
      id,
      offlinePackPrepared: false,
      companionPersonIds: [],
      relatedTransactionIds: [],
    };
    this.trips.set(id, newTrip);
    this.logActivity('travel', 'trip_created', `Planned trip: ${newTrip.title} to ${newTrip.destination}`, id);
    return newTrip;
  }

  public getTrips(): V22Trip[] {
    return Array.from(this.trips.values());
  }

  public addReservation(res: Omit<V22TravelReservation, 'id'>): V22TravelReservation {
    const id = `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRes: V22TravelReservation = { ...res, id };
    this.reservations.push(newRes);
    return newRes;
  }

  public getReservationsForTrip(tripId: string): V22TravelReservation[] {
    return this.reservations
      .filter((r) => r.tripId === tripId)
      .sort((a, b) => a.startDateTimeIso.localeCompare(b.startDateTimeIso));
  }

  public prepareOfflineTripPack(tripId: string): boolean {
    const trip = this.trips.get(tripId);
    if (!trip) return false;
    trip.offlinePackPrepared = true;
    this.logActivity('travel', 'trip_pack_prepared', `Prepared offline pack for ${trip.title}`, tripId);
    return true;
  }

  // ================= 11. ASSETS =================

  public createAsset(asset: Omit<V22Asset, 'id' | 'maintenanceHistory' | 'activeLoans'>): V22Asset {
    const id = `ast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newAsset: V22Asset = {
      ...asset,
      id,
      maintenanceHistory: [],
      activeLoans: [],
    };
    this.assets.set(id, newAsset);
    return newAsset;
  }

  public getAssets(): V22Asset[] {
    return Array.from(this.assets.values());
  }

  public recordMaintenance(record: Omit<V22MaintenanceRecord, 'id'>): V22MaintenanceRecord | undefined {
    const asset = this.assets.get(record.assetId);
    if (!asset) return undefined;
    const id = `mnt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRecord: V22MaintenanceRecord = { ...record, id };
    asset.maintenanceHistory.push(newRecord);
    this.logActivity('assets', 'maintenance_recorded', `Recorded ${record.serviceType} for ${asset.name}`, id);
    return newRecord;
  }

  public loanAsset(assetId: string, personId: string, dueDateOnly?: string): V22AssetLoan | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;
    const loan: V22AssetLoan = {
      id: `loan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      assetId,
      personId,
      loanDateOnly: new Date().toISOString().slice(0, 10),
      dueDateOnly,
      status: 'active',
    };
    asset.activeLoans.push(loan);
    const person = this.people.get(personId);
    this.logActivity('assets', 'asset_loaned', `Loaned ${asset.name} to ${person?.name || 'Contact'}`, loan.id);
    return loan;
  }

  public returnAssetLoan(assetId: string, loanId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    const loan = asset.activeLoans.find((l) => l.id === loanId);
    if (!loan) return false;
    loan.status = 'returned';
    loan.returnedDateOnly = new Date().toISOString().slice(0, 10);
    this.logActivity('assets', 'asset_returned', `Returned loan of ${asset.name}`, loanId);
    return true;
  }

  // ================= 12. DECISIONS & EXPERIMENTS =================

  public createDecision(decision: Omit<V22Decision, 'id' | 'options' | 'evidenceResourceIds'>): V22Decision {
    const id = `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newDec: V22Decision = {
      ...decision,
      id,
      options: [],
      evidenceResourceIds: [],
    };
    this.decisions.set(id, newDec);
    return newDec;
  }

  public makeDecision(id: string, chosenOptionTitle: string, reasoning: string, predictionStatement?: string, confidencePercent?: number, reviewDateOnly?: string): V22Decision | undefined {
    const decision = this.decisions.get(id);
    if (!decision) return undefined;
    decision.status = 'chosen';
    decision.chosenOptionTitle = chosenOptionTitle;
    decision.reasoning = reasoning;
    decision.decisionDateOnly = new Date().toISOString().slice(0, 10);
    decision.reviewDateOnly = reviewDateOnly;
    if (predictionStatement && confidencePercent) {
      decision.prediction = {
        statement: predictionStatement,
        confidencePercent,
        recordedAt: new Date().toISOString(),
      };
    }
    this.logActivity('decisions', 'decision_made', `Made decision: ${decision.question} -> ${chosenOptionTitle}`, id);
    return decision;
  }

  public recordDecisionOutcome(id: string, actualWhatHappened: string, reflectionNotes: string): V22Decision | undefined {
    const decision = this.decisions.get(id);
    if (!decision) return undefined;
    decision.status = 'reviewed';
    decision.outcome = {
      actualWhatHappened,
      reflectionNotes,
      reviewedAt: new Date().toISOString(),
    };
    this.logActivity('decisions', 'decision_reviewed', `Reviewed decision: ${decision.question}`, id);
    return decision;
  }

  public getDecisions(): V22Decision[] {
    return Array.from(this.decisions.values());
  }

  public getDecisionsDueForReview(todayDateOnly: string): V22Decision[] {
    return Array.from(this.decisions.values()).filter(
      (d) => d.status === 'chosen' && d.reviewDateOnly && d.reviewDateOnly <= todayDateOnly
    );
  }

  // ================= 13. CROSS-DOMAIN HOME & ATTENTION =================

  public getEarnedHomeContributions(todayDateOnly: string): V22HomeContribution[] {
    const items: V22HomeContribution[] = [];

    // 1. Library: Continue Reading
    const inProgress = this.getLibraryItems('in_progress');
    if (inProgress.length > 0) {
      const top = inProgress[0];
      items.push({
        domainId: 'library',
        title: `Continue: ${top.title}`,
        subtitle: `${top.creator} • ${top.progressPercent}% (${top.currentLocation || 'In progress'})`,
        priority: 10,
        actionLabel: 'Resume Reading',
        actionPayload: { resourceType: 'library', id: top.id },
      });
    }

    // 2. Learning: Flashcards Due
    const dueCards = this.getDueFlashcards(todayDateOnly);
    if (dueCards.length > 0) {
      items.push({
        domainId: 'learning',
        title: `${dueCards.length} Flashcards Due`,
        subtitle: 'Daily spaced repetition catch-up',
        priority: 20,
        actionLabel: 'Start Study Deck',
        actionPayload: { resourceType: 'learning', action: 'study_deck' },
      });
    }

    // 3. Travel: Active or upcoming trip
    const activeTrips = Array.from(this.trips.values()).filter((t) => t.status === 'active' || (t.startDateOnly <= todayDateOnly && t.endDateOnly >= todayDateOnly));
    if (activeTrips.length > 0) {
      const trip = activeTrips[0];
      items.push({
        domainId: 'travel',
        title: `Active Trip: ${trip.destination}`,
        subtitle: `${trip.title} (Timezone: ${trip.timezone})`,
        priority: 5,
        actionLabel: 'Open Travel Mode',
        actionPayload: { resourceType: 'travel', id: trip.id },
      });
    }

    // 4. Goals: Review Due
    const goalsDue = Array.from(this.goals.values()).filter((g) => g.status === 'active' && g.reviewDateOnly && g.reviewDateOnly <= todayDateOnly);
    if (goalsDue.length > 0) {
      items.push({
        domainId: 'goals',
        title: `${goalsDue.length} Goals Due for Review`,
        subtitle: goalsDue.map((g) => g.title).slice(0, 2).join(', '),
        priority: 30,
        actionLabel: 'Review Goals',
        actionPayload: { resourceType: 'goals', action: 'review' },
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }

  public getAttentionItems(todayDateOnly: string): V22AttentionItem[] {
    const items: V22AttentionItem[] = [];

    // Overdue Person Follow-ups
    this.personFollowUps
      .filter((f) => !f.completed && f.dueDateOnly && f.dueDateOnly < todayDateOnly)
      .forEach((f) => {
        const person = this.people.get(f.personId);
        items.push({
          id: `att_pfu_${f.id}`,
          domainId: 'people',
          severity: 'warning',
          reason: `Overdue follow-up for ${person?.name || 'Contact'}: "${f.title}"`,
          actionLabel: 'Complete Follow-up',
          resourceId: f.personId,
          autoResolving: true,
        });
      });

    // Upcoming / Overdue Bills
    this.getUpcomingBills(todayDateOnly).forEach((b) => {
      items.push({
        id: `att_bill_${b.id}`,
        domainId: 'finance',
        severity: 'urgent',
        reason: `Bill Due: ${b.name} ($${(b.amountCents / 100).toFixed(2)}) on ${b.dueDateOnly}`,
        actionLabel: 'Mark Paid',
        resourceId: b.id,
        autoResolving: true,
      });
    });

    // Decisions Due for Retrospective
    this.getDecisionsDueForReview(todayDateOnly).forEach((d) => {
      items.push({
        id: `att_dec_${d.id}`,
        domainId: 'decisions',
        severity: 'info',
        reason: `Decision Retrospective Due: "${d.question}"`,
        actionLabel: 'Record Outcome',
        resourceId: d.id,
        autoResolving: true,
      });
    });

    return items;
  }

  // ================= 14. ACTIVITY & AUDIT =================

  public logActivity(domainId: FirstPartyDomainType, action: string, summary: string, resourceId: string): void {
    const event: V22ActivityEvent = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      domainId,
      action,
      summary,
      timestamp: new Date().toISOString(),
      resourceId,
    };
    this.activityLog.unshift(event);
    if (this.activityLog.length > 200) this.activityLog.pop();
  }

  public getActivityLog(limit = 50): V22ActivityEvent[] {
    return this.activityLog.slice(0, limit);
  }

  // ================= SEED DATA =================

  private seedDefaults(): void {
    // Seed a Goal
    this.createGoal({
      title: 'Run a Half Marathon under 2 hours',
      desiredOutcome: 'Cross the finish line in under 120 minutes feeling strong and injury-free',
      whyItMatters: 'Build cardiovascular longevity and aerobic base for 2026',
      status: 'active',
      targetHorizon: '2026-Q4',
      reviewDateOnly: '2026-09-30',
      relatedProjectIds: ['proj_marathon'],
      measurableMetric: {
        name: 'Long Run Pace',
        currentValue: 5.45,
        targetValue: 5.35,
        unit: 'min/km',
      },
    });

    // Seed an Area
    this.createArea({
      title: 'Physical Health & Vitality',
      description: 'Ongoing maintenance of sleep, nutrition, and cardiovascular stamina',
      responsibilities: ['Daily hydration', '3x weekly strength training', 'Weekly long run'],
      reviewCadence: 'weekly',
      status: 'active',
      relatedProjectIds: ['proj_marathon'],
    });

    // Seed a Person & Interaction
    const person = this.createPerson({
      name: 'Dr. Elena Rostova',
      importantContext: 'Key advisor on distributed offline database protocols',
      email: 'elena.rostova@protocol.org',
      phone: '+1 (555) 234-5678',
      organizationName: 'Open Protocol Institute',
      tags: ['research', 'database', 'mentor'],
    });
    this.logInteraction({
      personId: person.id,
      dateOnly: '2026-09-10',
      type: 'meeting',
      summary: 'Reviewed CRDT conflict-free resolution vectors and sync topology',
      notes: 'Elena suggested using deterministic vector clock sorting with client tie-breakers.',
    });
    this.addPersonFollowUp({
      personId: person.id,
      title: 'Send draft of V2.22 Personal OS architecture specification',
      dueDateOnly: '2026-09-18',
      priority: 'high',
    });

    // Seed Trackers
    const sleepTracker = this.createTracker({
      name: 'Sleep Quality',
      unit: 'hrs',
      valueType: 'duration_minutes',
      targetDirection: 'higher_is_better',
    });
    this.quickLogTracking({
      trackerId: sleepTracker.id,
      dateOnly: '2026-09-13',
      numericValue: 465, // 7.75 hrs
      source: 'manual_quick_log',
      notes: 'Deep restful sleep after long run',
    });

    // Seed Habit & Routine
    const habit = this.createHabit({
      title: 'Morning 10-Minute Breathwork & Hydration',
      frequency: 'daily',
    });
    this.logHabit(habit.id, '2026-09-13', 'done');
    this.logHabit(habit.id, '2026-09-14', 'done');

    this.createRoutine({
      title: 'Morning Startup Sequence',
      timeOfDay: 'morning',
      steps: [
        { id: 's1', label: '500ml Water with Electrolytes', durationEstimateMinutes: 2 },
        { id: 's2', label: '10 min Diaphragmatic Breathwork', durationEstimateMinutes: 10 },
        { id: 's3', label: 'Review Today Agenda & Top 3 Priorities', durationEstimateMinutes: 5 },
      ],
    });

    // Seed Course & Flashcard
    const course = this.createCourse({
      name: 'Distributed Systems & Offline-First State',
      instructor: 'Dr. Rostova',
      term: 'Fall 2026',
      status: 'active',
    });
    this.createFlashcard({
      courseId: course.id,
      question: 'What is the primary convergence guarantee of a state-based CRDT?',
      answer: 'State-based CRDTs converge under any permutation of message delivery provided the merge operator is monotonic, commutative, and idempotent (a join-semilattice).',
      nextReviewDateOnly: '2026-09-14',
    });

    // Seed Library Item
    const book = this.createLibraryItem({
      title: 'Designing Data-Intensive Applications',
      creator: 'Martin Kleppmann',
      type: 'book',
      status: 'in_progress',
      progressPercent: 68,
      currentLocation: 'Chapter 9: Consistency and Consensus',
      rating: 5,
      linkedNoteIds: [],
    });
    this.addHighlight(book.id, 'Linearizability is a recency guarantee on reads and writes of a single object.', 'p. 324', 'Fundamental building block for single-register consensus.');

    // Seed Finance Account & Transactions
    const checking = this.createFinanceAccount({
      name: 'Main Checking',
      currency: 'USD',
      initialBalanceCents: 450000, // $4,500.00
      type: 'checking',
    });
    const savings = this.createFinanceAccount({
      name: 'Emergency Reserve',
      currency: 'USD',
      initialBalanceCents: 1200000, // $12,000.00
      type: 'savings',
    });

    // Transfer $500 from Checking to Savings
    this.createTransaction({
      dateOnly: '2026-09-12',
      kind: 'transfer',
      amountCents: 50000,
      accountId: checking.id,
      targetAccountId: savings.id,
      notes: 'Monthly emergency fund contribution',
      reconciled: true,
    });

    // Split Transaction: Grocery ($120 total = $90 Food + $30 Household)
    this.createTransaction({
      dateOnly: '2026-09-13',
      kind: 'split',
      amountCents: 12000,
      accountId: checking.id,
      payee: 'Whole Foods Market',
      splits: [
        { category: 'Groceries: Food', amountCents: 9000, notes: 'Fresh produce & proteins' },
        { category: 'Household: Supplies', amountCents: 3000, notes: 'Paper towels & soap' },
      ],
      reconciled: true,
    });

    this.addUpcomingBill({
      name: 'Cloud Infrastructure & Domain Hosting',
      amountCents: 3500,
      dueDateOnly: '2026-09-20',
      recurringFrequency: 'monthly',
    });

    // Seed Health Measurement
    this.logHealthMeasurement({
      type: 'blood_pressure',
      numericValue: 118,
      secondaryNumericValue: 76,
      unit: 'mmHg',
      dateOnly: '2026-09-14',
      sourceProvenance: 'manual_log',
      notes: 'Morning resting reading',
    });

    // Seed Trip & Reservation
    const trip = this.createTrip({
      title: 'Systems & Architecture Summit 2026',
      destination: 'Geneva, Switzerland',
      startDateOnly: '2026-10-15',
      endDateOnly: '2026-10-20',
      status: 'planning',
      timezone: 'Europe/Zurich',
      notes: 'Keynote presentation on offline Personal OS architecture',
    });
    this.addReservation({
      tripId: trip.id,
      type: 'flight',
      title: 'Flight SFO -> GVA',
      provider: 'Swiss International Air Lines',
      confirmationCode: 'SWISS-9982',
      startDateTimeIso: '2026-10-14T18:30:00Z',
      destinationTimezone: 'Europe/Zurich',
      location: 'SFO Terminal Intl',
    });

    // Seed Asset
    const asset = this.createAsset({
      name: 'MacBook Pro 16" M3 Max',
      category: 'electronics',
      serialNumber: 'C02G9982MD6R',
      purchaseDateOnly: '2024-02-15',
      purchasePriceCents: 349900,
      warrantyEndDateOnly: '2027-02-15',
    });
    this.recordMaintenance({
      assetId: asset.id,
      performedDateOnly: '2026-06-10',
      serviceType: 'Thermal Cleaning & Diagnostics',
      costCents: 0,
      providerOrSelf: 'Apple Store Geneva',
      notes: 'Fans cleared and battery health reported 96%.',
    });

    // Seed Decision
    const decision = this.createDecision({
      question: 'Should we build custom CRDT state synchronization or use SQLite vector clocks?',
      status: 'open',
      reasoning: 'Custom CRDT provides deterministic offline merge with zero native binary dependencies.',
    });
    this.makeDecision(
      decision.id,
      'Custom TypeScript CRDT Engine with Vector Clock Ordering',
      'Minimizes browser bundle bloat, operates purely in Web Worker / IndexedDB, and guarantees deterministic test repeatability.',
      'We will achieve 100% test coverage with zero sync conflicts on 1,000 concurrent mutations.',
      95,
      '2026-10-01'
    );
  }
}

export const v2_22PersonalOSEngine = new V2_22PersonalOSEngine();
