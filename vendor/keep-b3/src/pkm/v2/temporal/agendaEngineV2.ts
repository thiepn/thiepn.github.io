/**
 * PKM V2.3 — Unified Agenda Engine V2
 * 
 * Provides a chronological, future-facing agenda projection across customizable
 * horizons (e.g. 7, 14, 30 days) using the shared TemporalIndexV2.
 */

import {
  AgendaDaySection,
  DateOnlyString,
  TemporalIndexFilter,
  TemporalProjection,
} from './temporalTypes';
import { TemporalIndexV2 } from './temporalIndex';
import { getTodayDateOnly, addDaysDateOnly, createSafeDate } from './recurrenceEngineV2';

export class AgendaEngineV2 {
  /**
   * Generates chronological day sections for an agenda horizon
   */
  public generateAgenda(
    temporalIndex: TemporalIndexV2,
    options: {
      horizonDays?: number; // default 14
      startDate?: DateOnlyString;
      todayDate?: DateOnlyString;
      filter?: TemporalIndexFilter;
    } = {}
  ): AgendaDaySection[] {
    const today = options.todayDate || getTodayDateOnly();
    const start = options.startDate || today;
    const horizon = options.horizonDays || 14;
    const end = addDaysDateOnly(start, horizon - 1);

    // Fetch projections in window
    const projections = temporalIndex.query({
      ...options.filter,
      startDate: start,
      endDate: end,
    });

    // Group projections by date
    const dateMap = new Map<DateOnlyString, TemporalProjection[]>();
    for (const proj of projections) {
      if (!dateMap.has(proj.dateOnly)) {
        dateMap.set(proj.dateOnly, []);
      }
      dateMap.get(proj.dateOnly)!.push(proj);
    }

    const sections: AgendaDaySection[] = [];

    // Create a continuous sequence of days
    for (let i = 0; i < horizon; i++) {
      const curDate = addDaysDateOnly(start, i);
      const items = dateMap.get(curDate) || [];

      // Format human-friendly label
      const d = createSafeDate(curDate);
      const isToday = curDate === today;
      const isPast = curDate < today;

      let displayLabel = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      if (isToday) {
        displayLabel = `Today · ${displayLabel}`;
      } else if (curDate === addDaysDateOnly(today, 1)) {
        displayLabel = `Tomorrow · ${displayLabel}`;
      }

      sections.push({
        date: curDate,
        displayLabel,
        isToday,
        isPast,
        items,
      });
    }

    return sections;
  }
}

export const agendaEngineV2 = new AgendaEngineV2();
