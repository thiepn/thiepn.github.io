/**
 * Phase P50 — Deterministic Tracking Aggregation & Analytics Engine
 * 
 * Computes daily summaries, period metrics, completion rates with strict
 * expected-occurrence denominators, safe CSV exports, and review markdown snapshots.
 */

import {
  parseCanonicalDate,
  getTodayDateString,
  addDays,
  compareDateOnly,
} from '../temporal/dateUtils';
import {
  TrackingDefinition,
  TrackingEntry,
  DailyTrackingSummary,
  PeriodTrackingMetrics,
  HabitTarget,
} from './trackingTypes';
import {
  isItemDueOnDate,
  isDatePaused,
  getExpectedOccurrencesInRange,
} from './trackingScheduleEngine';

/**
 * Checks if a daily value satisfies a configured target threshold
 */
export function isTargetSatisfied(
  value: number | boolean,
  target?: HabitTarget
): boolean {
  if (typeof value === 'boolean') {
    return value === true;
  }

  if (!target) {
    // If no target configured, any recorded positive entry counts as completed
    return value > 0;
  }

  const op = target.operator || 'gte';
  switch (op) {
    case 'gte':
      return value >= target.value;
    case 'lte':
      return value <= target.value;
    case 'eq':
      return value === target.value;
    default:
      return value >= target.value;
  }
}

/**
 * Computes a single day's summary for a tracking definition.
 */
export function aggregateDayForDefinition(
  definition: TrackingDefinition,
  dateStr: string,
  entriesForDef: TrackingEntry[]
): DailyTrackingSummary {
  const dayEntries = entriesForDef.filter((e) => e.date === dateStr);
  const isDue = isItemDueOnDate(definition, dateStr);
  const isPaused = isDatePaused(dateStr, definition.pausedIntervals);

  let totalValue: number | undefined = undefined;
  let isCompleted = false;

  if (dayEntries.length > 0) {
    switch (definition.trackingType) {
      case 'completion': {
        const hasTrue = dayEntries.some((e) => e.value === true || e.value === 'true' || e.value === 1);
        isCompleted = hasTrue;
        totalValue = hasTrue ? 1 : 0;
        break;
      }

      case 'count':
      case 'duration':
      case 'number': {
        const sum = dayEntries.reduce((acc, e) => {
          const num = typeof e.value === 'number' ? e.value : parseFloat(String(e.value)) || 0;
          return acc + num;
        }, 0);
        totalValue = sum;
        isCompleted = isTargetSatisfied(sum, definition.target);
        break;
      }

      case 'rating': {
        const lastEntry = dayEntries[dayEntries.length - 1];
        const num = typeof lastEntry.value === 'number' ? lastEntry.value : parseFloat(String(lastEntry.value)) || 0;
        totalValue = num;
        isCompleted = num > 0;
        break;
      }

      default:
        isCompleted = dayEntries.length > 0;
    }
  }

  const targetMet = definition.target && totalValue !== undefined
    ? isTargetSatisfied(totalValue, definition.target)
    : undefined;

  return {
    definitionId: definition.id,
    definitionName: definition.name,
    type: definition.type,
    trackingType: definition.trackingType,
    date: dateStr,
    isDue,
    isPaused,
    isCompleted,
    totalValue,
    entryCount: dayEntries.length,
    entries: dayEntries,
    target: definition.target,
    targetMet,
    unit: definition.unit,
    daypart: definition.daypart,
  };
}

/**
 * Computes aggregated period metrics for a tracking definition across [startDate, endDate].
 */
export function aggregatePeriodMetrics(
  definition: TrackingDefinition,
  startDateStr: string,
  endDateStr: string,
  entriesForDef: TrackingEntry[]
): PeriodTrackingMetrics {
  const expectedDates = getExpectedOccurrencesInRange(definition, startDateStr, endDateStr);
  const expectedCount = expectedDates.length;

  const dailyData: PeriodTrackingMetrics['dailyData'] = [];
  let recordedDaysCount = 0;
  let completionCount = 0;
  let sum = 0;
  let numericEntriesCount = 0;
  let min: number | undefined = undefined;
  let max: number | undefined = undefined;

  let current = startDateStr;
  while (compareDateOnly(current, endDateStr) <= 0) {
    const summary = aggregateDayForDefinition(definition, current, entriesForDef);
    const hasEntry = summary.entryCount > 0;
    
    if (hasEntry) {
      recordedDaysCount++;
      if (summary.totalValue !== undefined) {
        sum += summary.totalValue;
        numericEntriesCount++;
        if (min === undefined || summary.totalValue < min) min = summary.totalValue;
        if (max === undefined || summary.totalValue > max) max = summary.totalValue;
      }
    }

    if (summary.isCompleted) {
      completionCount++;
    }

    dailyData.push({
      date: current,
      hasEntry,
      value: summary.totalValue ?? (hasEntry ? summary.entries[0]?.value : undefined),
      isDue: summary.isDue,
      isCompleted: summary.isCompleted,
    });

    current = addDays(current, 1);
  }

  const completionRate = expectedCount > 0 ? Math.min(1, completionCount / expectedCount) : 0;
  const averageValue = numericEntriesCount > 0 ? sum / numericEntriesCount : undefined;

  return {
    definitionId: definition.id,
    definitionName: definition.name,
    trackingType: definition.trackingType,
    unit: definition.unit,
    startDate: startDateStr,
    endDate: endDateStr,
    expectedOccurrences: expectedCount,
    recordedOccurrences: recordedDaysCount,
    completionCount,
    completionRate,
    totalSum: numericEntriesCount > 0 ? sum : undefined,
    averageValue,
    minValue: min,
    maxValue: max,
    entryCount: entriesForDef.filter((e) => e.date >= startDateStr && e.date <= endDateStr).length,
    dailyData,
  };
}

/**
 * Safe CSV Exporter preventing formula injection
 */
export function exportTrackingEntriesToCSV(
  definition: TrackingDefinition,
  entries: TrackingEntry[],
  dateRange?: { start: string; end: string }
): string {
  let filtered = entries.filter((e) => e.definitionId === definition.id);
  if (dateRange) {
    filtered = filtered.filter((e) => e.date >= dateRange.start && e.date <= dateRange.end);
  }

  // Sort ascending
  filtered.sort((a, b) => a.date.localeCompare(b.date) || a.timestamp - b.timestamp);

  const escapeCell = (val: string | number | boolean | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    let str = String(val);
    // Neutralize formula injection
    if (/^[=+@-]/i.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = ['Date', 'Timestamp', 'Definition', 'Type', 'Value', 'Unit', 'Note', 'Source'];
  const rows = filtered.map((e) => [
    escapeCell(e.date),
    escapeCell(new Date(e.timestamp).toISOString()),
    escapeCell(definition.name),
    escapeCell(definition.trackingType),
    escapeCell(e.value),
    escapeCell(e.unit || definition.unit || ''),
    escapeCell(e.note || ''),
    escapeCell(e.source || 'manual'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generates a clean Markdown snapshot summary for Daily Notes or Weekly Review notes.
 */
export function generateTrackingMarkdownSummary(
  definitions: TrackingDefinition[],
  entries: TrackingEntry[],
  dateStr: string
): string {
  const summaries = definitions
    .filter((d) => d.status === 'active')
    .map((d) => aggregateDayForDefinition(d, dateStr, entries))
    .filter((s) => s.isDue || s.entryCount > 0);

  if (summaries.length === 0) {
    return `### Routines & Habits (${dateStr})\n_No active routines or habits scheduled for this day._\n`;
  }

  const lines: string[] = [`### Routines & Habits (${dateStr})`];

  for (const s of summaries) {
    const checkmark = s.isCompleted ? '[x]' : '[ ]';
    let valText = '';

    if (s.totalValue !== undefined) {
      if (s.trackingType === 'duration') {
        valText = ` — ${s.totalValue} min`;
        if (s.target?.value) valText += ` / ${s.target.value} min`;
      } else if (s.trackingType === 'count' || s.trackingType === 'number') {
        valText = ` — ${s.totalValue} ${s.unit || ''}`.trim();
        if (s.target?.value) valText += ` / ${s.target.value} ${s.unit || ''}`.trim();
      } else if (s.trackingType === 'rating') {
        valText = ` — Rating: ${s.totalValue} / 5`;
      }
    }

    lines.push(`- ${checkmark} **${s.definitionName}**${valText}`);
  }

  return lines.join('\n') + '\n';
}
