/**
 * PKM V2.20 — Habit Tracking & Streak Engine V2
 * 
 * Provides deterministic habit tracking, streak calculation, freeze/grace handling,
 * milestone detection, and multi-device safe log recording.
 */

import {
  V2HabitDefinition,
  V2HabitLogEntry,
  V2HabitStreakStats,
  V2HabitFrequency,
} from './automationTypesV2';
import { DateOnlyString, Weekday } from '../temporal/temporalTypes';
import { AdvancedRecurrenceEngineV2 } from './advancedRecurrenceEngineV2';

const HABIT_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 180, 365];

export class HabitEngineV2 {
  private habits = new Map<string, V2HabitDefinition>();
  // habitId -> Map<dateStr, V2HabitLogEntry>
  private logs = new Map<string, Map<DateOnlyString, V2HabitLogEntry>>();

  constructor() {
    this.registerBuiltInHabits();
  }

  private registerBuiltInHabits(): void {
    const dailyReading: V2HabitDefinition = {
      id: 'habit-daily-reading',
      name: 'Daily Knowledge Reading',
      description: 'Read notes, literature, or research papers for at least 20 minutes',
      iconName: 'BookOpen',
      color: '#3b82f6',
      category: 'learning',
      frequency: 'daily',
      targetValue: 20,
      unit: 'mins',
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const morningReview: V2HabitDefinition = {
      id: 'habit-morning-review',
      name: 'Morning Inbox Triage',
      description: 'Process incoming captures, plan day tasks, and check focus objectives',
      iconName: 'CheckCircle2',
      color: '#10b981',
      category: 'productivity',
      frequency: 'weekdays',
      targetValue: 1,
      unit: 'session',
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.registerHabit(dailyReading);
    this.registerHabit(morningReview);
  }

  public registerHabit(habit: V2HabitDefinition): void {
    this.habits.set(habit.id, habit);
    if (!this.logs.has(habit.id)) {
      this.logs.set(habit.id, new Map());
    }
  }

  public getHabits(includeArchived = false): V2HabitDefinition[] {
    const list = Array.from(this.habits.values());
    return includeArchived ? list : list.filter(h => !h.archived);
  }

  public getHabit(id: string): V2HabitDefinition | undefined {
    return this.habits.get(id);
  }

  public logHabit(
    habitId: string,
    date: DateOnlyString,
    value = 1,
    options: {
      notes?: string;
      isFreezeOrGrace?: boolean;
      isSkipped?: boolean;
    } = {}
  ): V2HabitLogEntry {
    const habit = this.habits.get(habitId);
    if (!habit) {
      throw new Error(`Habit "${habitId}" not found.`);
    }

    let habitLogMap = this.logs.get(habitId);
    if (!habitLogMap) {
      habitLogMap = new Map();
      this.logs.set(habitId, habitLogMap);
    }

    const logEntry: V2HabitLogEntry = {
      id: `log-${habitId}-${date}`,
      habitId,
      date,
      value,
      notes: options.notes,
      isFreezeOrGrace: options.isFreezeOrGrace,
      isSkipped: options.isSkipped,
      createdAt: Date.now(),
    };

    habitLogMap.set(date, logEntry);
    return logEntry;
  }

  public getLogEntry(habitId: string, date: DateOnlyString): V2HabitLogEntry | undefined {
    return this.logs.get(habitId)?.get(date);
  }

  public getLogsForHabit(habitId: string): V2HabitLogEntry[] {
    const map = this.logs.get(habitId);
    if (!map) return [];
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Calculates streaks and statistics deterministically given a reference date (today)
   */
  public calculateStats(habitId: string, referenceToday?: DateOnlyString): V2HabitStreakStats {
    const habit = this.habits.get(habitId);
    const today = referenceToday || AdvancedRecurrenceEngineV2.formatSafeDate(new Date());

    if (!habit) {
      return {
        habitId,
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate30d: 0,
        completionRate90d: 0,
        freezeDaysUsed: 0,
        milestonesAchieved: [],
      };
    }

    const logMap = this.logs.get(habitId) || new Map<DateOnlyString, V2HabitLogEntry>();
    const allLogs = Array.from(logMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    let totalCompletions = 0;
    let freezeDaysUsed = 0;
    let lastCompletedDate: DateOnlyString | undefined;

    for (const log of allLogs) {
      if (log.isFreezeOrGrace) {
        freezeDaysUsed++;
      } else if (!log.isSkipped && log.value > 0) {
        totalCompletions++;
        lastCompletedDate = log.date;
      }
    }

    // 1. Calculate 30-day and 90-day completion rates
    let completed30d = 0;
    let expected30d = 0;
    let completed90d = 0;
    let expected90d = 0;

    for (let i = 0; i < 90; i++) {
      const d = AdvancedRecurrenceEngineV2.addDays(today, -i);
      const isExpected = this.isDayExpected(habit, d);
      if (isExpected) {
        if (i < 30) expected30d++;
        expected90d++;

        const entry = logMap.get(d);
        if (entry && (entry.value > 0 || entry.isFreezeOrGrace) && !entry.isSkipped) {
          if (i < 30) completed30d++;
          completed90d++;
        }
      }
    }

    const completionRate30d = expected30d > 0 ? Math.round((completed30d / expected30d) * 100) / 100 : 0;
    const completionRate90d = expected90d > 0 ? Math.round((completed90d / expected90d) * 100) / 100 : 0;

    // 2. Calculate Current Streak
    let currentStreak = 0;
    let checkDate = today;

    // If today is not logged yet, streak can continue from yesterday
    const todayEntry = logMap.get(today);
    const todayCompleted = todayEntry && (todayEntry.value > 0 || todayEntry.isFreezeOrGrace) && !todayEntry.isSkipped;
    const todayExpected = this.isDayExpected(habit, today);

    if (!todayCompleted && todayExpected) {
      // Step back to yesterday to measure ongoing streak
      checkDate = AdvancedRecurrenceEngineV2.addDays(today, -1);
    }

    let streakGuard = 0;
    while (streakGuard < 730) {
      const isExpected = this.isDayExpected(habit, checkDate);
      if (isExpected) {
        const entry = logMap.get(checkDate);
        if (entry && (entry.value > 0 || entry.isFreezeOrGrace) && !entry.isSkipped) {
          currentStreak++;
        } else if (entry && entry.isSkipped) {
          // Explicit skip preserves streak without incrementing count
        } else {
          // Broken streak
          break;
        }
      }
      checkDate = AdvancedRecurrenceEngineV2.addDays(checkDate, -1);
      streakGuard++;
    }

    // 3. Calculate Longest Streak historically
    let longestStreak = currentStreak;
    let runningStreak = 0;

    if (allLogs.length > 0) {
      const earliestDate = allLogs[0].date;
      let walkDate = earliestDate;

      while (walkDate <= today) {
        const isExpected = this.isDayExpected(habit, walkDate);
        if (isExpected) {
          const entry = logMap.get(walkDate);
          if (entry && (entry.value > 0 || entry.isFreezeOrGrace) && !entry.isSkipped) {
            runningStreak++;
            if (runningStreak > longestStreak) {
              longestStreak = runningStreak;
            }
          } else if (entry && entry.isSkipped) {
            // skip doesn't break
          } else {
            runningStreak = 0;
          }
        }
        walkDate = AdvancedRecurrenceEngineV2.addDays(walkDate, 1);
      }
    }

    // 4. Determine achieved milestones
    const milestonesAchieved = HABIT_MILESTONES.filter(m => longestStreak >= m);

    return {
      habitId,
      currentStreak,
      longestStreak,
      totalCompletions,
      completionRate30d,
      completionRate90d,
      lastCompletedDate,
      freezeDaysUsed,
      milestonesAchieved,
    };
  }

  private isDayExpected(habit: V2HabitDefinition, date: DateOnlyString): boolean {
    const weekday = AdvancedRecurrenceEngineV2.getWeekdayOfDate(date);
    switch (habit.frequency) {
      case 'daily':
        return true;
      case 'weekdays':
        return weekday !== 'saturday' && weekday !== 'sunday';
      case 'specific_days':
        return habit.targetDays ? habit.targetDays.includes(weekday) : true;
      case 'weekly_target':
      default:
        return true;
    }
  }
}

export const habitEngineV2 = new HabitEngineV2();
