import { Note } from '../types';

export type ActivityMode = 'all' | 'created' | 'updated';

export interface DayActivity {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  createdNotes: Note[];
  updatedNotes: Note[];
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
}

export interface HeatmapWeek {
  weekIndex: number;
  days: DayActivity[];
  monthLabel?: string;
}

export interface HeatmapStats {
  totalContributions: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  busiestDay: {
    dateKey: string;
    count: number;
  } | null;
}

export interface HeatmapMatrixData {
  weeks: HeatmapWeek[];
  stats: HeatmapStats;
  startDate: Date;
  endDate: Date;
}

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calculateActivityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

/**
 * Generates a clean 52-week activity matrix (Sunday to Saturday) ending on current week.
 */
export function generate52WeekActivity(
  notes: Note[],
  mode: ActivityMode = 'all'
): HeatmapMatrixData {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayKey = toLocalDateKey(today);

  // Map notes into date lookup
  const createdMap = new Map<string, Note[]>();
  const updatedMap = new Map<string, Note[]>();

  for (const note of notes) {
    if (note.trashed) continue;

    // Created
    if (note.createdAt) {
      try {
        const cDate = new Date(note.createdAt);
        if (!isNaN(cDate.getTime())) {
          const key = toLocalDateKey(cDate);
          if (!createdMap.has(key)) createdMap.set(key, []);
          createdMap.get(key)!.push(note);
        }
      } catch {
        // ignore invalid dates
      }
    }

    // Updated (only if different day from created to prevent exact duplication if desired, or recorded as update)
    if (note.updatedAt) {
      try {
        const uDate = new Date(note.updatedAt);
        if (!isNaN(uDate.getTime())) {
          const key = toLocalDateKey(uDate);
          if (!updatedMap.has(key)) updatedMap.set(key, []);
          updatedMap.get(key)!.push(note);
        }
      } catch {
        // ignore invalid dates
      }
    }
  }

  // Calculate 52 weeks boundary
  // Align end to current week's Saturday
  const currentDayOfWeek = today.getDay(); // 0 is Sun, 6 is Sat
  const daysUntilSaturday = 6 - currentDayOfWeek;
  const gridEndDate = new Date(today);
  gridEndDate.setDate(today.getDate() + daysUntilSaturday);

  // Total 52 weeks * 7 = 364 days
  const totalDays = 52 * 7;
  const gridStartDate = new Date(gridEndDate);
  gridStartDate.setDate(gridEndDate.getDate() - (totalDays - 1));
  gridStartDate.setHours(0, 0, 0, 0);

  const weeks: HeatmapWeek[] = [];
  let currentMonthName = '';
  let lastMonthPlacedWeek = -1;

  let totalContributions = 0;
  let totalActiveDays = 0;
  let busiestDay: { dateKey: string; count: number } | null = null;

  // Track counts per day for streak analysis
  const dateCountsMap = new Map<string, number>();

  let iterDate = new Date(gridStartDate);
  for (let w = 0; w < 52; w++) {
    const days: DayActivity[] = [];
    let weekMonthLabel: string | undefined = undefined;

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(iterDate);
      const dateKey = toLocalDateKey(dayDate);
      const isToday = dateKey === todayKey;
      const isFuture = dayDate.getTime() > today.getTime();

      const created = createdMap.get(dateKey) || [];
      const updated = updatedMap.get(dateKey) || [];

      let count = 0;
      if (!isFuture) {
        if (mode === 'created') {
          count = created.length;
        } else if (mode === 'updated') {
          count = updated.length;
        } else {
          // Combined: unique note count or total actions
          const noteIds = new Set<string>();
          created.forEach((n) => noteIds.add(n.id));
          updated.forEach((n) => noteIds.add(n.id));
          count = noteIds.size;
        }

        totalContributions += count;
        if (count > 0) {
          totalActiveDays++;
          if (!busiestDay || count > busiestDay.count) {
            busiestDay = { dateKey, count };
          }
        }
      }

      dateCountsMap.set(dateKey, isFuture ? 0 : count);

      const level = isFuture ? 0 : calculateActivityLevel(count);

      // Check month boundary on first day or when month switches
      const monthStr = dayDate.toLocaleDateString(undefined, { month: 'short' });
      if (monthStr !== currentMonthName && w - lastMonthPlacedWeek >= 3) {
        currentMonthName = monthStr;
        weekMonthLabel = monthStr;
        lastMonthPlacedWeek = w;
      }

      days.push({
        date: dayDate,
        dateKey,
        dayOfWeek: d,
        createdNotes: created,
        updatedNotes: updated,
        count,
        level,
        isToday,
        isFuture,
      });

      iterDate.setDate(iterDate.getDate() + 1);
    }

    weeks.push({
      weekIndex: w,
      days,
      monthLabel: weekMonthLabel,
    });
  }

  // Calculate streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Chronological list of dates up to today
  const checkDate = new Date(gridStartDate);
  const nowKey = toLocalDateKey(new Date());

  while (checkDate.getTime() <= today.getTime()) {
    const key = toLocalDateKey(checkDate);
    const count = dateCountsMap.get(key) || 0;

    if (count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }

    checkDate.setDate(checkDate.getDate() + 1);
  }

  // Current streak (stepping backward from today)
  const streakCursor = new Date(today);
  const todayCount = dateCountsMap.get(nowKey) || 0;

  // If user hasn't written today yet, check yesterday to continue yesterday's active streak
  if (todayCount === 0) {
    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  while (streakCursor.getTime() >= gridStartDate.getTime()) {
    const key = toLocalDateKey(streakCursor);
    const count = dateCountsMap.get(key) || 0;
    if (count > 0) {
      currentStreak++;
      streakCursor.setDate(streakCursor.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    weeks,
    stats: {
      totalContributions,
      totalActiveDays,
      currentStreak,
      longestStreak,
      busiestDay,
    },
    startDate: gridStartDate,
    endDate: gridEndDate,
  };
}
