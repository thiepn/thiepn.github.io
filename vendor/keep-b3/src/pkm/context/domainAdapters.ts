/**
 * Phase P59 - Domain Adapters for Unified Context Engine
 * Bridges canonical domain models (Planning, Temporal, Learning, Travel, Decisions, Assets, People, Library)
 * into unified WorkingSet, Summary, Attention, and WhatChanged projections.
 */

import { Note, Folder } from '../../types';
import {
  ContextDescriptor,
  ContextWorkingSet,
  ContextSummary,
  AttentionItem,
  SemanticChangeEvent,
  ContextResolveOptions,
  WorkingSetItem,
} from './contextTypes';
import { planningService } from '../planning/planningService';
import { focusManager } from '../planning/focusManager';
import { learningService } from '../learning/learningService';
import { travelService } from '../travel/travelService';
import { decisionService } from '../decisions/decisionService';
import { assetService } from '../assets/assetService';
import { peopleService } from '../people/peopleService';
import { libraryService } from '../library/libraryService';
import { getTodayDateString } from '../temporal/dateUtils';
import { extractTasksFromNote } from '../tasks/taskParser';
import { universalInboxService } from '../inbox/universalInboxService';
import { contextStorage } from './contextStorage';

export interface ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean;
  resolveWorkingSet(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    allFolders: Folder[],
    options?: ContextResolveOptions
  ): ContextWorkingSet;
  getSummary(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    allFolders: Folder[]
  ): ContextSummary;
  getAttention(
    descriptor: ContextDescriptor,
    allNotes: Note[]
  ): AttentionItem[];
  getSemanticEvents(
    descriptor: ContextDescriptor,
    sinceTimestamp: number,
    allNotes: Note[]
  ): SemanticChangeEvent[];
}

// -------------------------------------------------------------
// 1. TODAY ADAPTER
// -------------------------------------------------------------
export class TodayContextAdapter implements ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean {
    return descriptor.type === 'today';
  }

  resolveWorkingSet(
    _descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[],
    _options?: ContextResolveOptions
  ): ContextWorkingSet {
    const today = getTodayDateString();
    const tasks: WorkingSetItem[] = [];
    const notes: WorkingSetItem[] = [];
    const events: WorkingSetItem[] = [];
    const people: WorkingSetItem[] = [];
    const files: WorkingSetItem[] = [];
    const inboxItems: WorkingSetItem[] = [];
    const decisions: WorkingSetItem[] = [];
    const references: WorkingSetItem[] = [];
    const other: WorkingSetItem[] = [];

    // Focus items
    const focusItems = planningService.getFocusItems(allNotes);
    const nowItems: WorkingSetItem[] = focusItems.map((f) => ({
      id: `focus-${f.id}`,
      resourceType: f.type === 'project' ? 'project' : f.type === 'goal' ? 'goal' : 'note',
      resourceId: f.id,
      title: f.title,
      subtitle: `Focus · ${f.type.toUpperCase()}`,
      relevanceType: 'direct',
      relevanceExplanation: 'Active user focus commitment for today',
      status: 'active',
    }));

    // Today's tasks from notes
    for (const note of allNotes) {
      if (note.trashed) continue;
      const noteTasks = extractTasksFromNote(note);
      for (const t of noteTasks) {
        if (!t.completed && t.noteDate && t.noteDate <= today) {
          tasks.push({
            id: `task-${t.id}`,
            resourceType: 'task',
            resourceId: note.id,
            title: t.text,
            subtitle: note.title,
            relevanceType: t.noteDate < today ? 'due' : 'direct',
            relevanceExplanation: t.noteDate < today ? 'Overdue task' : 'Scheduled for today',
            status: t.completed ? 'completed' : 'open',
            date: t.noteDate,
          });
        }
      }
    }

    // Unprocessed Inbox items
    try {
      const inboxList = universalInboxService.getItems();
      inboxList.slice(0, 5).forEach((item) => {
        if (item.state === 'new' || item.state === 'seen') {
          inboxItems.push({
            id: `inbox-${item.id}`,
            resourceType: 'inbox',
            resourceId: item.id,
            title: item.title,
            subtitle: `${item.source.toUpperCase()} · ${item.senderOrOwner || 'External'}`,
            relevanceType: 'due',
            relevanceExplanation: 'Incoming external communication requiring triage',
            status: item.state,
            date: item.receivedAt,
          });
        }
      });
    } catch (_) {}

    return {
      now: nowItems,
      tasks: tasks.slice(0, 20),
      notes: notes.slice(0, 10),
      people,
      events,
      files,
      inboxItems,
      decisions,
      references,
      other,
    };
  }

  getSummary(
    _descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[]
  ): ContextSummary {
    const today = getTodayDateString();
    let openTasks = 0;
    let overdueTasks = 0;

    for (const note of allNotes) {
      if (note.trashed) continue;
      const noteTasks = extractTasksFromNote(note);
      for (const t of noteTasks) {
        if (!t.completed && t.noteDate) {
          if (t.noteDate === today) openTasks++;
          else if (t.noteDate < today) overdueTasks++;
        }
      }
    }

    const focusCount = focusManager.getFocusResourceIds().length;
    let inboxCount = 0;
    try {
      inboxCount = universalInboxService.getItems().filter((i) => i.state === 'new' || i.state === 'seen').length;
    } catch (_) {}

    return {
      headline: `Today · ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`,
      statusText: overdueTasks > 0 ? `${overdueTasks} overdue items requiring attention` : 'All scheduled tasks current',
      keyMetrics: [
        { label: 'Today Tasks', value: openTasks, tone: 'blue' },
        { label: 'Overdue', value: overdueTasks, tone: overdueTasks > 0 ? 'rose' : 'default' },
        { label: 'Active Focus', value: focusCount, tone: 'emerald' },
        { label: 'Inbox Pulse', value: inboxCount, tone: inboxCount > 0 ? 'amber' : 'default' },
      ],
    };
  }

  getAttention(
    _descriptor: ContextDescriptor,
    allNotes: Note[]
  ): AttentionItem[] {
    const today = getTodayDateString();
    const items: AttentionItem[] = [];

    // Overdue tasks
    for (const note of allNotes) {
      if (note.trashed) continue;
      const noteTasks = extractTasksFromNote(note);
      for (const t of noteTasks) {
        if (!t.completed && t.noteDate && t.noteDate < today) {
          items.push({
            id: `task-overdue-${t.id}`,
            sourceDomain: 'tasks',
            resourceRef: { type: 'note', id: note.id, title: note.title },
            reason: 'overdue',
            severity: 'attention',
            dueAt: t.noteDate,
            explanation: `Task "${t.text}" was due on ${t.noteDate}`,
            actionLabel: 'Open Note',
            actionTarget: { type: 'note', id: note.id },
            createdAt: Date.now(),
          });
        }
      }
    }

    return items.slice(0, 10);
  }

  getSemanticEvents(
    _descriptor: ContextDescriptor,
    sinceTimestamp: number,
    allNotes: Note[]
  ): SemanticChangeEvent[] {
    const events: SemanticChangeEvent[] = [];
    allNotes.forEach((n) => {
      const upTime = new Date(n.updatedAt).getTime();
      if (upTime > sinceTimestamp && !n.trashed) {
        events.push({
          id: `note-mod-${n.id}`,
          timestamp: upTime,
          domain: 'notes',
          type: 'note_updated',
          description: `Note "${n.title}" was updated`,
          resourceTitle: n.title,
          resourceId: n.id,
        });
      }
    });
    return events.slice(0, 15);
  }
}

// -------------------------------------------------------------
// 2. PROJECT CONTEXT ADAPTER
// -------------------------------------------------------------
export class ProjectContextAdapter implements ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean {
    return descriptor.type === 'project';
  }

  resolveWorkingSet(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[],
    _options?: ContextResolveOptions
  ): ContextWorkingSet {
    const project = planningService.getProjectById(descriptor.resourceId || descriptor.id);
    const tasks: WorkingSetItem[] = [];
    const notes: WorkingSetItem[] = [];
    const people: WorkingSetItem[] = [];
    const events: WorkingSetItem[] = [];
    const files: WorkingSetItem[] = [];
    const inboxItems: WorkingSetItem[] = [];
    const decisions: WorkingSetItem[] = [];
    const references: WorkingSetItem[] = [];
    const other: WorkingSetItem[] = [];

    const projectTitle = project?.title || descriptor.title;
    const projectNormalized = projectTitle.toLowerCase().trim();

    // 1. Primary project note
    const projectNote = allNotes.find((n) => n.id === project?.noteId || n.id === descriptor.resourceId || n.title.toLowerCase() === projectNormalized);
    if (projectNote) {
      notes.push({
        id: `note-${projectNote.id}`,
        resourceType: 'note',
        resourceId: projectNote.id,
        title: projectNote.title,
        subtitle: 'Canonical Project Specification',
        relevanceType: 'direct',
        relevanceExplanation: 'Canonical Project root note',
      });
    }

    // 2. Tasks related to project
    for (const note of allNotes) {
      if (note.trashed) continue;
      const isRelatedNote = note.id === projectNote?.id || note.content.toLowerCase().includes(projectNormalized) || (note.tags && note.tags.some((t) => t.toLowerCase().includes(projectNormalized)));
      if (isRelatedNote) {
        const noteTasks = extractTasksFromNote(note);
        for (const t of noteTasks) {
          tasks.push({
            id: `task-${t.id}`,
            resourceType: 'task',
            resourceId: note.id,
            title: t.text,
            subtitle: note.title,
            relevanceType: note.id === projectNote?.id ? 'direct' : 'related',
            relevanceExplanation: note.id === projectNote?.id ? 'Task defined inside Project Note' : `Found in related note "${note.title}"`,
            status: t.completed ? 'completed' : 'open',
            date: t.noteDate,
          });
        }
      }
    }

    // 3. Related Decisions
    try {
      const allDecisions = decisionService.getDecisions();
      allDecisions.forEach((d) => {
        if (
          (d.relatedProjectIds && d.relatedProjectIds.includes(project?.id || '')) ||
          d.title.toLowerCase().includes(projectNormalized) ||
          (d.context && d.context.toLowerCase().includes(projectNormalized))
        ) {
          decisions.push({
            id: `decision-${d.id}`,
            resourceType: 'decision',
            resourceId: d.id,
            title: d.title,
            subtitle: `Decision · ${d.status.toUpperCase()}`,
            relevanceType: 'direct',
            relevanceExplanation: 'Explicitly linked Project Decision',
            status: d.status,
          });
        }
      });
    } catch (_) {}

    // 4. Linked Inbox communications
    try {
      const allInbox = universalInboxService.getItems();
      allInbox.forEach((item) => {
        if (
          item.title.toLowerCase().includes(projectNormalized) ||
          (item.preview && item.preview.toLowerCase().includes(projectNormalized))
        ) {
          inboxItems.push({
            id: `inbox-${item.id}`,
            resourceType: 'inbox',
            resourceId: item.id,
            title: item.title,
            subtitle: `${item.source.toUpperCase()} · ${item.senderOrOwner || 'External'}`,
            relevanceType: 'related',
            relevanceExplanation: 'External communication linked to Project',
            status: item.state,
          });
        }
      });
    } catch (_) {}

    // 5. Related People
    try {
      const allPeople = peopleService.getPeople();
      allPeople.forEach((p) => {
        const name = p.displayName || p.noteTitle;
        if (
          (p.tags && p.tags.some((tg) => tg.toLowerCase().includes(projectNormalized))) ||
          (projectNote && projectNote.content.toLowerCase().includes(name.toLowerCase()))
        ) {
          people.push({
            id: `person-${p.id}`,
            resourceType: 'person',
            resourceId: p.id,
            title: name,
            subtitle: p.role || (p.organizationTitles && p.organizationTitles[0]) || 'Contact',
            relevanceType: 'related',
            relevanceExplanation: 'Mentioned in project scope',
          });
        }
      });
    } catch (_) {}

    return {
      tasks: tasks.slice(0, 20),
      notes: notes.slice(0, 10),
      people: people.slice(0, 10),
      events,
      files,
      inboxItems: inboxItems.slice(0, 10),
      decisions: decisions.slice(0, 10),
      references,
      other,
    };
  }

  getSummary(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[]
  ): ContextSummary {
    const project = planningService.getProjectById(descriptor.resourceId || descriptor.id);
    const title = project?.title || descriptor.title;
    const workingSet = this.resolveWorkingSet(descriptor, allNotes, _allFolders);
    const openTasks = workingSet.tasks.filter((t) => t.status !== 'completed').length;
    const completedTasks = workingSet.tasks.filter((t) => t.status === 'completed').length;

    return {
      headline: `Project: ${title}`,
      statusText: project ? `Status: ${project.status.toUpperCase()} · Due ${project.due || 'Unscheduled'}` : 'Active Workstream',
      nextMilestone: project?.due ? `Target: ${project.due}` : undefined,
      keyMetrics: [
        { label: 'Open Tasks', value: openTasks, tone: openTasks > 0 ? 'blue' : 'default' },
        { label: 'Completed', value: completedTasks, tone: 'emerald' },
        { label: 'Decisions', value: workingSet.decisions.length, tone: 'purple' },
        { label: 'External Inflow', value: workingSet.inboxItems.length, tone: 'amber' },
      ],
    };
  }

  getAttention(
    descriptor: ContextDescriptor,
    allNotes: Note[]
  ): AttentionItem[] {
    const today = getTodayDateString();
    const items: AttentionItem[] = [];
    const workingSet = this.resolveWorkingSet(descriptor, allNotes, []);

    // Overdue tasks in project
    workingSet.tasks.forEach((t) => {
      if (t.status !== 'completed' && t.date && t.date < today) {
        items.push({
          id: `proj-task-overdue-${t.id}`,
          sourceDomain: 'tasks',
          resourceRef: { type: 'note', id: t.resourceId, title: t.title },
          reason: 'overdue',
          severity: 'attention',
          dueAt: t.date,
          explanation: `Project task "${t.title}" is overdue (${t.date})`,
          actionLabel: 'View Task',
          createdAt: Date.now(),
        });
      }
    });

    return items;
  }

  getSemanticEvents(
    descriptor: ContextDescriptor,
    sinceTimestamp: number,
    allNotes: Note[]
  ): SemanticChangeEvent[] {
    const events: SemanticChangeEvent[] = [];
    const workingSet = this.resolveWorkingSet(descriptor, allNotes, []);
    const noteIds = new Set(workingSet.notes.map((n) => n.resourceId));

    allNotes.forEach((n) => {
      const upTime = new Date(n.updatedAt).getTime();
      if (noteIds.has(n.id) && upTime > sinceTimestamp) {
        events.push({
          id: `proj-note-${n.id}`,
          timestamp: upTime,
          domain: 'projects',
          type: 'note_updated',
          description: `Project specification "${n.title}" was revised`,
          resourceTitle: n.title,
          resourceId: n.id,
        });
      }
    });

    return events;
  }
}

// -------------------------------------------------------------
// 3. COURSE CONTEXT ADAPTER (Learning)
// -------------------------------------------------------------
export class CourseContextAdapter implements ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean {
    return descriptor.type === 'course';
  }

  resolveWorkingSet(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[],
    _options?: ContextResolveOptions
  ): ContextWorkingSet {
    const course = learningService.getCourse(descriptor.resourceId || descriptor.id);
    const tasks: WorkingSetItem[] = [];
    const notes: WorkingSetItem[] = [];
    const people: WorkingSetItem[] = [];
    const events: WorkingSetItem[] = [];
    const files: WorkingSetItem[] = [];
    const inboxItems: WorkingSetItem[] = [];
    const decisions: WorkingSetItem[] = [];
    const references: WorkingSetItem[] = [];
    const other: WorkingSetItem[] = [];

    const courseTitle = course?.title || descriptor.title;
    const courseNormalized = courseTitle.toLowerCase();

    // Notes tagged with course or matching title
    for (const note of allNotes) {
      if (note.trashed) continue;
      if (
        note.id === course?.noteId ||
        note.title.toLowerCase().includes(courseNormalized) ||
        (note.tags && note.tags.some((t) => t.toLowerCase().includes(courseNormalized)))
      ) {
        notes.push({
          id: `note-${note.id}`,
          resourceType: 'note',
          resourceId: note.id,
          title: note.title,
          subtitle: 'Course Material / Lecture Note',
          relevanceType: note.id === course?.noteId ? 'direct' : 'related',
          relevanceExplanation: 'Curriculum & Lecture Notes',
        });

        // Tasks in course notes
        const noteTasks = extractTasksFromNote(note);
        noteTasks.forEach((t) => {
          tasks.push({
            id: `task-${t.id}`,
            resourceType: 'task',
            resourceId: note.id,
            title: t.text,
            subtitle: note.title,
            relevanceType: 'direct',
            relevanceExplanation: 'Study / Assignment Task',
            status: t.completed ? 'completed' : 'open',
            date: t.noteDate,
          });
        });
      }
    }

    return {
      tasks: tasks.slice(0, 20),
      notes: notes.slice(0, 15),
      people,
      events,
      files,
      inboxItems,
      decisions,
      references,
      other,
    };
  }

  getSummary(
    descriptor: ContextDescriptor,
    _allNotes: Note[],
    _allFolders: Folder[]
  ): ContextSummary {
    const course = learningService.getCourse(descriptor.resourceId || descriptor.id);
    const title = course?.title || descriptor.title;
    const progress = course ? learningService.computeCourseProgress(course.id) : null;

    return {
      headline: `Course: ${title}`,
      statusText: course?.level ? `Level: ${course.level.toUpperCase()} · ${course.status.toUpperCase()}` : 'Academic Workstream',
      nextMilestone: course?.examDate ? `Exam: ${course.examDate}` : undefined,
      keyMetrics: [
        { label: 'Progress', value: progress?.percentage !== null && progress?.percentage !== undefined ? `${progress.percentage}%` : 'In Progress', tone: 'blue' },
        { label: 'Status', value: course?.status || 'Active', tone: 'purple' },
        { label: 'Curriculum', value: progress?.completedCurriculum ? `${progress.completedCurriculum}/${progress.totalCurriculum}` : 'Active', tone: 'emerald' },
      ],
    };
  }

  getAttention(
    descriptor: ContextDescriptor,
    _allNotes: Note[]
  ): AttentionItem[] {
    const items: AttentionItem[] = [];
    const course = learningService.getCourse(descriptor.resourceId || descriptor.id);
    const today = getTodayDateString();

    if (course?.examDate && course.examDate <= today) {
      items.push({
        id: `course-exam-due-${descriptor.id}`,
        sourceDomain: 'system',
        resourceRef: { type: 'course', id: descriptor.id, title: descriptor.title },
        reason: 'review-due',
        severity: 'attention',
        explanation: `Exam date scheduled for ${course.title} (${course.examDate})`,
        actionLabel: 'Open Course',
        createdAt: Date.now(),
      });
    }

    return items;
  }

  getSemanticEvents(
    descriptor: ContextDescriptor,
    sinceTimestamp: number,
    allNotes: Note[]
  ): SemanticChangeEvent[] {
    const events: SemanticChangeEvent[] = [];
    const workingSet = this.resolveWorkingSet(descriptor, allNotes, []);
    const noteIds = new Set(workingSet.notes.map((n) => n.resourceId));

    allNotes.forEach((n) => {
      const upTime = new Date(n.updatedAt).getTime();
      if (noteIds.has(n.id) && upTime > sinceTimestamp) {
        events.push({
          id: `course-note-${n.id}`,
          timestamp: upTime,
          domain: 'learning',
          type: 'material_updated',
          description: `Study note "${n.title}" updated`,
          resourceTitle: n.title,
          resourceId: n.id,
        });
      }
    });

    return events;
  }
}

// -------------------------------------------------------------
// 4. TRIP CONTEXT ADAPTER (Travel)
// -------------------------------------------------------------
export class TripContextAdapter implements ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean {
    return descriptor.type === 'trip';
  }

  resolveWorkingSet(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[],
    _options?: ContextResolveOptions
  ): ContextWorkingSet {
    const trip = travelService.getTrip(descriptor.resourceId || descriptor.id);
    const tasks: WorkingSetItem[] = [];
    const notes: WorkingSetItem[] = [];
    const people: WorkingSetItem[] = [];
    const events: WorkingSetItem[] = [];
    const files: WorkingSetItem[] = [];
    const inboxItems: WorkingSetItem[] = [];
    const decisions: WorkingSetItem[] = [];
    const references: WorkingSetItem[] = [];
    const other: WorkingSetItem[] = [];

    const tripTitle = trip?.title || descriptor.title;
    const tripNorm = tripTitle.toLowerCase();

    // Linked notes
    for (const note of allNotes) {
      if (note.trashed) continue;
      if (
        note.id === trip?.noteId ||
        note.title.toLowerCase().includes(tripNorm) ||
        (note.tags && note.tags.some((t) => t.toLowerCase().includes(tripNorm)))
      ) {
        notes.push({
          id: `note-${note.id}`,
          resourceType: 'note',
          resourceId: note.id,
          title: note.title,
          subtitle: 'Itinerary / Travel Note',
          relevanceType: note.id === trip?.noteId ? 'direct' : 'related',
          relevanceExplanation: 'Travel documentation & packing plans',
        });
      }
    }

    // Packing & prep items
    if (trip) {
      const packingItems = travelService.getTripPackingItems(trip.id);
      packingItems.forEach((item) => {
        tasks.push({
          id: `pack-${item.id}`,
          resourceType: 'task',
          resourceId: trip.id,
          title: `Pack: ${item.name}`,
          subtitle: item.category || 'Packing List',
          relevanceType: 'direct',
          relevanceExplanation: 'Trip packing requirement',
          status: item.isPacked ? 'completed' : 'open',
        });
      });
    }

    return {
      tasks: tasks.slice(0, 20),
      notes: notes.slice(0, 10),
      people,
      events,
      files,
      inboxItems,
      decisions,
      references,
      other,
    };
  }

  getSummary(
    descriptor: ContextDescriptor,
    _allNotes: Note[],
    _allFolders: Folder[]
  ): ContextSummary {
    const trip = travelService.getTrip(descriptor.resourceId || descriptor.id);
    const title = trip?.title || descriptor.title;
    const packingItems = trip ? travelService.getTripPackingItems(trip.id) : [];
    const packedCount = packingItems.filter((p) => p.isPacked).length;
    const totalPack = packingItems.length;
    const reservations = trip ? travelService.getReservations(trip.id) : [];

    return {
      headline: `Trip: ${title}`,
      statusText: trip ? `Dates: ${trip.startDate || 'TBD'} to ${trip.endDate || 'TBD'}` : 'Travel Workstream',
      nextMilestone: trip?.startDate ? `Departure: ${trip.startDate}` : undefined,
      keyMetrics: [
        { label: 'Status', value: trip?.status || 'Planned', tone: 'blue' },
        { label: 'Packing', value: totalPack > 0 ? `${packedCount}/${totalPack}` : '0 items', tone: 'emerald' },
        { label: 'Reservations', value: reservations.length, tone: 'purple' },
      ],
    };
  }

  getAttention(
    descriptor: ContextDescriptor,
    _allNotes: Note[]
  ): AttentionItem[] {
    const items: AttentionItem[] = [];
    const trip = travelService.getTrip(descriptor.resourceId || descriptor.id);
    const today = getTodayDateString();

    if (trip?.startDate && trip.startDate <= today && (trip.status === 'planning' || trip.status === 'booked')) {
      items.push({
        id: `trip-departure-${trip.id}`,
        sourceDomain: 'travel',
        resourceRef: { type: 'trip', id: trip.id, title: trip.title },
        reason: 'due',
        severity: 'important',
        explanation: `Trip "${trip.title}" begins today (${trip.startDate})`,
        actionLabel: 'Open Travel Mode',
        createdAt: Date.now(),
      });
    }

    return items;
  }

  getSemanticEvents(
    _descriptor: ContextDescriptor,
    _sinceTimestamp: number,
    _allNotes: Note[]
  ): SemanticChangeEvent[] {
    return [];
  }
}

// -------------------------------------------------------------
// 5. PERSON CONTEXT ADAPTER
// -------------------------------------------------------------
export class PersonContextAdapter implements ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean {
    return descriptor.type === 'person';
  }

  resolveWorkingSet(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[],
    _options?: ContextResolveOptions
  ): ContextWorkingSet {
    const person = peopleService.getPersonById(descriptor.resourceId || descriptor.id);
    const tasks: WorkingSetItem[] = [];
    const notes: WorkingSetItem[] = [];
    const people: WorkingSetItem[] = [];
    const events: WorkingSetItem[] = [];
    const files: WorkingSetItem[] = [];
    const inboxItems: WorkingSetItem[] = [];
    const decisions: WorkingSetItem[] = [];
    const references: WorkingSetItem[] = [];
    const other: WorkingSetItem[] = [];

    const personName = person?.displayName || person?.noteTitle || descriptor.title;
    const personNorm = personName.toLowerCase();

    for (const note of allNotes) {
      if (note.trashed) continue;
      if (
        note.id === person?.id ||
        note.title.toLowerCase().includes(personNorm) ||
        note.content.toLowerCase().includes(personNorm)
      ) {
        notes.push({
          id: `note-${note.id}`,
          resourceType: 'note',
          resourceId: note.id,
          title: note.title,
          subtitle: 'Meeting / Interaction Note',
          relevanceType: note.id === person?.id ? 'direct' : 'related',
          relevanceExplanation: `Mentions ${personName}`,
        });

        const noteTasks = extractTasksFromNote(note);
        noteTasks.forEach((t) => {
          if (t.text.toLowerCase().includes(personNorm) || note.id === person?.id) {
            tasks.push({
              id: `task-${t.id}`,
              resourceType: 'task',
              resourceId: note.id,
              title: t.text,
              subtitle: note.title,
              relevanceType: 'related',
              relevanceExplanation: `Task involving ${personName}`,
              status: t.completed ? 'completed' : 'open',
              date: t.noteDate,
            });
          }
        });
      }
    }

    return {
      tasks: tasks.slice(0, 15),
      notes: notes.slice(0, 15),
      people,
      events,
      files,
      inboxItems,
      decisions,
      references,
      other,
    };
  }

  getSummary(
    descriptor: ContextDescriptor,
    _allNotes: Note[],
    _allFolders: Folder[]
  ): ContextSummary {
    const person = peopleService.getPersonById(descriptor.resourceId || descriptor.id);
    const name = person?.displayName || person?.noteTitle || descriptor.title;

    return {
      headline: `Contact: ${name}`,
      statusText: person ? `${person.role || 'Contact'} ${person.organizationTitles && person.organizationTitles.length > 0 ? `at ${person.organizationTitles[0]}` : ''}` : 'Person Record',
      keyMetrics: [
        { label: 'Interactions', value: person?.interactionCount || 0, tone: 'blue' },
        { label: 'Status', value: person?.status || 'Active', tone: 'purple' },
        { label: 'Last Contact', value: person?.lastContactDate || 'None', tone: 'emerald' },
      ],
    };
  }

  getAttention(
    _descriptor: ContextDescriptor,
    _allNotes: Note[]
  ): AttentionItem[] {
    return [];
  }

  getSemanticEvents(
    _descriptor: ContextDescriptor,
    _sinceTimestamp: number,
    _allNotes: Note[]
  ): SemanticChangeEvent[] {
    return [];
  }
}

// -------------------------------------------------------------
// 6. DECISION CONTEXT ADAPTER
// -------------------------------------------------------------
export class DecisionContextAdapter implements ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean {
    return descriptor.type === 'decision';
  }

  resolveWorkingSet(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[],
    _options?: ContextResolveOptions
  ): ContextWorkingSet {
    const allDecisions = decisionService.getDecisions();
    const decision = allDecisions.find((d) => d.id === (descriptor.resourceId || descriptor.id));
    const tasks: WorkingSetItem[] = [];
    const notes: WorkingSetItem[] = [];
    const people: WorkingSetItem[] = [];
    const events: WorkingSetItem[] = [];
    const files: WorkingSetItem[] = [];
    const inboxItems: WorkingSetItem[] = [];
    const decisions: WorkingSetItem[] = [];
    const references: WorkingSetItem[] = [];
    const other: WorkingSetItem[] = [];

    const title = decision?.title || descriptor.title;
    const titleNorm = title.toLowerCase();

    for (const note of allNotes) {
      if (note.trashed) continue;
      if (note.id === decision?.noteId || note.title.toLowerCase().includes(titleNorm)) {
        notes.push({
          id: `note-${note.id}`,
          resourceType: 'note',
          resourceId: note.id,
          title: note.title,
          subtitle: 'Decision Evidence & Background Note',
          relevanceType: 'direct',
          relevanceExplanation: 'Decision documentation & evidence',
        });
      }
    }

    return {
      tasks,
      notes,
      people,
      events,
      files,
      inboxItems,
      decisions,
      references,
      other,
    };
  }

  getSummary(
    descriptor: ContextDescriptor,
    _allNotes: Note[],
    _allFolders: Folder[]
  ): ContextSummary {
    const allDecisions = decisionService.getDecisions();
    const decision = allDecisions.find((d) => d.id === (descriptor.resourceId || descriptor.id));
    const title = decision?.title || descriptor.title;

    return {
      headline: `Decision: ${title}`,
      statusText: decision ? `Status: ${decision.status.toUpperCase()} · Reversibility: ${decision.reversibility.toUpperCase()}` : 'Decision Framework',
      nextMilestone: decision?.reviewDate ? `Review Date: ${decision.reviewDate}` : undefined,
      keyMetrics: [
        { label: 'Status', value: decision?.status || 'Draft', tone: 'blue' },
        { label: 'Confidence', value: decision?.confidence !== undefined ? `${decision.confidence}%` : 'N/A', tone: 'emerald' },
      ],
    };
  }

  getAttention(
    descriptor: ContextDescriptor,
    _allNotes: Note[]
  ): AttentionItem[] {
    const items: AttentionItem[] = [];
    const allDecisions = decisionService.getDecisions();
    const decision = allDecisions.find((d) => d.id === (descriptor.resourceId || descriptor.id));
    const today = getTodayDateString();

    if (decision?.reviewDate && decision.reviewDate <= today && decision.status === 'decided') {
      items.push({
        id: `decision-review-${decision.id}`,
        sourceDomain: 'decisions',
        resourceRef: { type: 'decision', id: decision.id, title: decision.title },
        reason: 'review-due',
        severity: 'attention',
        dueAt: decision.reviewDate,
        explanation: `Decision "${decision.title}" is due for outcome reflection (${decision.reviewDate})`,
        actionLabel: 'Review Decision',
        createdAt: Date.now(),
      });
    }

    return items;
  }

  getSemanticEvents(
    _descriptor: ContextDescriptor,
    _sinceTimestamp: number,
    _allNotes: Note[]
  ): SemanticChangeEvent[] {
    return [];
  }
}

// -------------------------------------------------------------
// 7. ASSET CONTEXT ADAPTER
// -------------------------------------------------------------
export class AssetContextAdapter implements ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean {
    return descriptor.type === 'asset';
  }

  resolveWorkingSet(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[],
    _options?: ContextResolveOptions
  ): ContextWorkingSet {
    const asset = assetService.getAssetById(descriptor.resourceId || descriptor.id);
    const tasks: WorkingSetItem[] = [];
    const notes: WorkingSetItem[] = [];
    const people: WorkingSetItem[] = [];
    const events: WorkingSetItem[] = [];
    const files: WorkingSetItem[] = [];
    const inboxItems: WorkingSetItem[] = [];
    const decisions: WorkingSetItem[] = [];
    const references: WorkingSetItem[] = [];
    const other: WorkingSetItem[] = [];

    const title = asset?.name || descriptor.title;
    const titleNorm = title.toLowerCase();

    for (const note of allNotes) {
      if (note.trashed) continue;
      if (note.id === asset?.noteId || note.title.toLowerCase().includes(titleNorm)) {
        notes.push({
          id: `note-${note.id}`,
          resourceType: 'note',
          resourceId: note.id,
          title: note.title,
          subtitle: 'Asset Manual / Service History Note',
          relevanceType: 'direct',
          relevanceExplanation: 'Asset documentation & maintenance logs',
        });
      }
    }

    return {
      tasks,
      notes,
      people,
      events,
      files,
      inboxItems,
      decisions,
      references,
      other,
    };
  }

  getSummary(
    descriptor: ContextDescriptor,
    _allNotes: Note[],
    _allFolders: Folder[]
  ): ContextSummary {
    const asset = assetService.getAssetById(descriptor.resourceId || descriptor.id);
    const name = asset?.name || descriptor.title;

    return {
      headline: `Asset: ${name}`,
      statusText: asset ? `Type: ${asset.type.toUpperCase()} · Status: ${asset.status.toUpperCase()}` : 'Asset Record',
      keyMetrics: [
        { label: 'Status', value: asset?.status || 'Active', tone: 'emerald' },
        { label: 'Manufacturer', value: asset?.manufacturer || 'N/A', tone: 'blue' },
        { label: 'Acquired', value: asset?.acquiredAt || 'None', tone: 'purple' },
      ],
    };
  }

  getAttention(
    descriptor: ContextDescriptor,
    _allNotes: Note[]
  ): AttentionItem[] {
    const items: AttentionItem[] = [];
    const asset = assetService.getAssetById(descriptor.resourceId || descriptor.id);

    if (asset) {
      const dueItems = assetService.getDueMaintenanceItems();
      const dueForThisAsset = dueItems.filter((d) => d.asset.id === asset.id);
      if (dueForThisAsset.length > 0) {
        items.push({
          id: `asset-service-${asset.id}`,
          sourceDomain: 'assets',
          resourceRef: { type: 'asset', id: asset.id, title: asset.name },
          reason: 'due',
          severity: 'attention',
          explanation: `Scheduled maintenance due for ${asset.name}`,
          actionLabel: 'Log Maintenance',
          createdAt: Date.now(),
        });
      }
    }

    return items;
  }

  getSemanticEvents(
    _descriptor: ContextDescriptor,
    _sinceTimestamp: number,
    _allNotes: Note[]
  ): SemanticChangeEvent[] {
    return [];
  }
}

// -------------------------------------------------------------
// 8. CUSTOM CONTEXT ADAPTER
// -------------------------------------------------------------
export class CustomContextAdapter implements ContextAdapter {
  canHandle(descriptor: ContextDescriptor): boolean {
    return descriptor.type === 'custom';
  }

  resolveWorkingSet(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    _allFolders: Folder[],
    _options?: ContextResolveOptions
  ): ContextWorkingSet {
    const custom = contextStorage.getCustomContext(descriptor.id);
    const tasks: WorkingSetItem[] = [];
    const notes: WorkingSetItem[] = [];
    const people: WorkingSetItem[] = [];
    const events: WorkingSetItem[] = [];
    const files: WorkingSetItem[] = [];
    const inboxItems: WorkingSetItem[] = [];
    const decisions: WorkingSetItem[] = [];
    const references: WorkingSetItem[] = [];
    const other: WorkingSetItem[] = [];

    if (custom) {
      custom.rootResourceRefs.forEach((ref) => {
        if (ref.type === 'note') {
          const n = allNotes.find((note) => note.id === ref.id);
          if (n && !n.trashed) {
            notes.push({
              id: `note-${n.id}`,
              resourceType: 'note',
              resourceId: n.id,
              title: n.title,
              subtitle: 'Root Resource Note',
              relevanceType: 'direct',
              relevanceExplanation: 'Configured in custom context definition',
            });
            const noteTasks = extractTasksFromNote(n);
            noteTasks.forEach((t) => {
              tasks.push({
                id: `task-${t.id}`,
                resourceType: 'task',
                resourceId: n.id,
                title: t.text,
                subtitle: n.title,
                relevanceType: 'direct',
                relevanceExplanation: 'Task inside custom context root note',
                status: t.completed ? 'completed' : 'open',
                date: t.noteDate,
              });
            });
          }
        }
      });
    }

    return {
      tasks: tasks.slice(0, 20),
      notes: notes.slice(0, 15),
      people,
      events,
      files,
      inboxItems,
      decisions,
      references,
      other,
    };
  }

  getSummary(
    descriptor: ContextDescriptor,
    _allNotes: Note[],
    _allFolders: Folder[]
  ): ContextSummary {
    const custom = contextStorage.getCustomContext(descriptor.id);
    return {
      headline: `Custom Context: ${custom?.name || descriptor.title}`,
      statusText: `User-defined context with ${custom?.rootResourceRefs.length || 0} root resources`,
      keyMetrics: [
        { label: 'Root Resources', value: custom?.rootResourceRefs.length || 0, tone: 'blue' },
      ],
    };
  }

  getAttention(
    _descriptor: ContextDescriptor,
    _allNotes: Note[]
  ): AttentionItem[] {
    return [];
  }

  getSemanticEvents(
    _descriptor: ContextDescriptor,
    _sinceTimestamp: number,
    _allNotes: Note[]
  ): SemanticChangeEvent[] {
    return [];
  }
}
