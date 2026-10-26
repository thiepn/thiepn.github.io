/**
 * PKM V2.3 — Derived Today Engine V2
 * 
 * Provides a unified, deduplicated daily view for today's work, deadlines,
 * calendar events, expected routine occurrences, and due reviews.
 * 
 * Non-negotiable principles:
 * - Today is DERIVED, never owns canonical state.
 * - Dual due + scheduled tasks appear ONCE with both indicators.
 * - Calendar events are not marked "incomplete tasks".
 * - Routines/habits are presented cleanly without guilt or streak punishment.
 */

import {
  TodayItem,
  TodaySectionGroup,
  TemporalProjection,
  DateOnlyString,
} from './temporalTypes';
import { TemporalIndexV2 } from './temporalIndex';
import { getTodayDateOnly } from './recurrenceEngineV2';

export interface TodayDerivedState {
  todayDate: DateOnlyString;
  items: TodayItem[];
  grouped: Record<TodaySectionGroup, TodayItem[]>;
  overdueItems: TodayItem[];
  stats: {
    totalItems: number;
    completedCount: number;
    dueCount: number;
    scheduledCount: number;
    overdueCount: number;
    routinesCount: number;
  };
}

export class TodayEngineV2 {
  /**
   * Evaluates today's projections and produces a deduplicated, grouped view
   */
  public evaluateToday(
    temporalIndex: TemporalIndexV2,
    options: {
      todayDate?: DateOnlyString;
      currentTime?: string; // HH:mm
      contextId?: string;
    } = {}
  ): TodayDerivedState {
    const today = options.todayDate || getTodayDateOnly();
    const currentTime = options.currentTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // 1. Fetch today's projections and overdue items
    const todayProjections = temporalIndex.getForDate(today, true);
    const overdueProjections = temporalIndex.getOverdue(today);

    // Filter by context if specified
    const filteredToday = options.contextId
      ? todayProjections.filter((p) => p.contextIds && p.contextIds.includes(options.contextId!))
      : todayProjections;

    const filteredOverdue = options.contextId
      ? overdueProjections.filter((p) => p.contextIds && p.contextIds.includes(options.contextId!))
      : overdueProjections;

    // 2. Deduplicate today items by canonical resourceId
    const resourceMap = new Map<string, {
      projections: TemporalProjection[];
      isDueToday: boolean;
      isScheduledToday: boolean;
      isOverdue: boolean;
      primaryField: string;
      time?: string;
      isAllDay: boolean;
    }>();

    for (const proj of filteredToday) {
      if (!resourceMap.has(proj.resourceId)) {
        resourceMap.set(proj.resourceId, {
          projections: [],
          isDueToday: false,
          isScheduledToday: false,
          isOverdue: false,
          primaryField: proj.field,
          time: proj.time,
          isAllDay: proj.isAllDay,
        });
      }

      const rec = resourceMap.get(proj.resourceId)!;
      rec.projections.push(proj);

      if (proj.field === 'due') rec.isDueToday = true;
      if (proj.field === 'scheduled') {
        rec.isScheduledToday = true;
        if (proj.time) rec.time = proj.time;
      }
    }

    // 3. Transform deduplicated records into TodayItem
    const todayItems: TodayItem[] = [];

    for (const [resourceId, data] of resourceMap.entries()) {
      const primary = data.projections[0];

      // Determine group
      let group: TodaySectionGroup = 'scheduled';

      if (primary.resourceType === 'routine' || primary.resourceType === 'habit') {
        group = 'routines';
      } else if (data.time) {
        // Compare with currentTime
        if (data.time <= currentTime) {
          // If past current time or within 1 hr, group in 'now' or 'scheduled'
          group = 'now';
        } else if (data.time >= '18:00') {
          group = 'later';
        } else {
          group = 'scheduled';
        }
      } else if (data.isDueToday && !data.isScheduledToday) {
        group = 'due';
      } else {
        group = 'scheduled';
      }

      todayItems.push({
        id: `today-${resourceId}`,
        resourceId,
        resourceType: primary.resourceType,
        title: primary.title,
        group,
        time: data.time,
        isAllDay: data.isAllDay,
        isDueToday: data.isDueToday,
        isScheduledToday: data.isScheduledToday,
        isOverdue: false,
        completed: primary.completed || false,
        priority: primary.priority,
        tags: primary.tags,
        contextTitles: primary.contextIds,
        sourceNoteTitle: primary.sourceDetails?.parentTitle,
      });
    }

    // 4. Overdue Items
    const overdueItems: TodayItem[] = filteredOverdue.map((proj) => ({
      id: `overdue-${proj.resourceId}`,
      resourceId: proj.resourceId,
      resourceType: proj.resourceType,
      title: proj.title,
      group: 'due',
      time: proj.time,
      isAllDay: proj.isAllDay,
      isDueToday: false,
      isScheduledToday: false,
      isOverdue: true,
      completed: false,
      priority: proj.priority,
      tags: proj.tags,
      contextTitles: proj.contextIds,
      sourceNoteTitle: proj.sourceDetails?.parentTitle,
    }));

    // 5. Grouping
    const grouped: Record<TodaySectionGroup, TodayItem[]> = {
      now: [],
      scheduled: [],
      due: [],
      routines: [],
      later: [],
    };

    for (const item of todayItems) {
      grouped[item.group].push(item);
    }

    // Sort each group
    const sortFn = (a: TodayItem, b: TodayItem) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      return a.title.localeCompare(b.title);
    };

    grouped.now.sort(sortFn);
    grouped.scheduled.sort(sortFn);
    grouped.due.sort(sortFn);
    grouped.routines.sort(sortFn);
    grouped.later.sort(sortFn);

    return {
      todayDate: today,
      items: todayItems,
      grouped,
      overdueItems,
      stats: {
        totalItems: todayItems.length,
        completedCount: todayItems.filter((i) => i.completed).length,
        dueCount: todayItems.filter((i) => i.isDueToday).length,
        scheduledCount: todayItems.filter((i) => i.isScheduledToday).length,
        overdueCount: overdueItems.length,
        routinesCount: grouped.routines.length,
      },
    };
  }
}

export const todayEngineV2 = new TodayEngineV2();
