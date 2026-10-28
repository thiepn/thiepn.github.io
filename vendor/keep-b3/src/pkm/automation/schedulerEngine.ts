/**
 * Phase P36: Automation Scheduler Engine
 * Deterministic schedule calculation, multi-tab Web Lock coordination, catch-up policy, and idempotency receipts.
 */

import {
  AutomationRule,
  OccurrenceRecord,
  ScheduleDailyTrigger,
  ScheduleWeeklyTrigger,
  ScheduleMonthlyTrigger,
  ScheduleIntervalTrigger,
  AppOpenTrigger,
} from './automationTypes';
import { automationStorageService } from './automationStorageService';
import { formatLocalDateOnly, getISOWeekNumber } from '../temporal/dateUtils';

const AUTOMATION_LOCK_NAME = 'keepnotes_automation_scheduler_lock';
const BROADCAST_CHANNEL_NAME = 'keepnotes_automation_channel';

export type ScheduleExecutionCallback = (
  rule: AutomationRule,
  occurrenceKey: string,
  scheduledTime: Date
) => Promise<string | undefined>; // returns createdResourceId if any

class SchedulerEngine {
  private timerId: any = null;
  private isLeader: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private executionCallback: ScheduleExecutionCallback | null = null;
  private lockAbortController: AbortController | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'HEARTBEAT') {
            // Another tab is active
          }
        };
      } catch (e) {}
    }
  }

  public setExecutionCallback(cb: ScheduleExecutionCallback) {
    this.executionCallback = cb;
  }

  /**
   * Starts leader election loop and background timer
   */
  public start() {
    this.stop();

    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      // Use standard Web Locks API for leader election across tabs
      this.lockAbortController = new AbortController();
      (navigator as any).locks.request(
        AUTOMATION_LOCK_NAME,
        { signal: this.lockAbortController.signal },
        async () => {
          this.isLeader = true;
          this.runSchedulerLoop();
          // Keep lock alive until abort
          return new Promise<void>((resolve) => {
            this.lockAbortController?.signal.addEventListener('abort', () => resolve());
          });
        }
      ).catch(() => {
        // Fallback if lock fails or aborted
        this.isLeader = false;
      });
    } else {
      // Fallback: single context or browser without locks
      this.isLeader = true;
      this.runSchedulerLoop();
    }

    // Check periodically every 45 seconds
    this.timerId = setInterval(() => {
      this.checkScheduledOccurrences();
    }, 45000);

    // Also run an immediate check on startup
    setTimeout(() => {
      this.checkScheduledOccurrences();
    }, 1500);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.lockAbortController) {
      this.lockAbortController.abort();
      this.lockAbortController = null;
    }
    this.isLeader = false;
  }

  private runSchedulerLoop() {
    this.checkScheduledOccurrences();
  }

  /**
   * Evaluates scheduled rules for due occurrences and catch-ups
   */
  public async checkScheduledOccurrences(rulesOverride?: AutomationRule[]) {
    if (!this.isLeader && typeof navigator !== 'undefined' && 'locks' in navigator) {
      return;
    }

    const isPaused = await automationStorageService.isPaused();
    if (isPaused) return;

    const rules = rulesOverride || (await automationStorageService.loadRules());
    const activeScheduledRules = rules.filter(
      (r) => r.enabled && r.status === 'active' && r.trigger.type.startsWith('schedule_')
    );

    const now = new Date();

    for (const rule of activeScheduledRules) {
      try {
        await this.evaluateRuleSchedule(rule, now);
      } catch (err) {
        console.error(`[Automation Scheduler] Error evaluating rule "${rule.name}":`, err);
      }
    }
  }

  /**
   * App Open trigger evaluator
   */
  public async checkAppOpenTriggers(rulesOverride?: AutomationRule[]) {
    const isPaused = await automationStorageService.isPaused();
    if (isPaused) return;

    const rules = rulesOverride || (await automationStorageService.loadRules());
    const appOpenRules = rules.filter((r) => r.enabled && r.status === 'active' && r.trigger.type === 'app_open');

    const now = new Date();
    for (const rule of appOpenRules) {
      const trig = rule.trigger as AppOpenTrigger;
      const minHours = trig.minIntervalHours || 24;
      const lastRun = rule.lastExecutedAt || 0;
      const hoursSince = (now.getTime() - lastRun) / (1000 * 60 * 60);

      if (hoursSince >= minHours) {
        const occurrenceKey = `app_open_${formatLocalDateOnly(now)}_${now.getHours()}`;
        const occId = `${rule.id}:${occurrenceKey}`;
        const existing = await automationStorageService.getOccurrence(occId);
        if (!existing) {
          await this.executeOccurrence(rule, occurrenceKey, now);
        }
      }
    }
  }

  /**
   * Evaluates whether a specific scheduled rule has a due occurrence
   */
  private async evaluateRuleSchedule(rule: AutomationRule, now: Date) {
    const trig = rule.trigger;
    const timeStr = (trig as any).time || '08:00';
    const [targetHour, targetMinute] = timeStr.split(':').map((s: string) => parseInt(s, 10));

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isPastScheduledTimeToday =
      currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute);

    const todayStr = formatLocalDateOnly(now);
    const dayOfWeekNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayOfWeekNames[now.getDay()];

    if (trig.type === 'schedule_daily') {
      const dailyTrig = trig as ScheduleDailyTrigger;
      const occurrenceKey = todayStr;
      const occId = `${rule.id}:${occurrenceKey}`;
      const existing = await automationStorageService.getOccurrence(occId);

      if (!existing) {
        if (isPastScheduledTimeToday) {
          // It is past time today and hasn't run yet -> execute today's occurrence
          await this.executeOccurrence(rule, occurrenceKey, now);
        } else if (dailyTrig.catchUpPolicy === 'run_once') {
          // Check if yesterday or previous days were missed
          const yesterday = new Date(now.getTime() - 86400000);
          const yesterdayKey = formatLocalDateOnly(yesterday);
          const yestOcc = await automationStorageService.getOccurrence(`${rule.id}:${yesterdayKey}`);
          if (!yestOcc && rule.lastExecutedAt && now.getTime() - rule.lastExecutedAt > 86400000) {
            await this.executeOccurrence(rule, yesterdayKey, now);
          }
        }
      }
    } else if (trig.type === 'schedule_weekly') {
      const weeklyTrig = trig as ScheduleWeeklyTrigger;
      const isoWeek = getISOWeekNumber(now);
      const isTargetDay = (weeklyTrig.weekdays || []).includes(currentDayName as any);

      const occurrenceKey = `${now.getFullYear()}-W${String(isoWeek).padStart(2, '0')}-${currentDayName}`;
      const occId = `${rule.id}:${occurrenceKey}`;
      const existing = await automationStorageService.getOccurrence(occId);

      if (isTargetDay && isPastScheduledTimeToday && !existing) {
        await this.executeOccurrence(rule, occurrenceKey, now);
      }
    } else if (trig.type === 'schedule_monthly') {
      const monthlyTrig = trig as ScheduleMonthlyTrigger;
      const targetDay = monthlyTrig.dayOfMonth || 1;
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      let effectiveTargetDay = targetDay;
      if (targetDay > lastDayOfMonth) {
        if (monthlyTrig.monthEndPolicy === 'last_day') {
          effectiveTargetDay = lastDayOfMonth;
        } else {
          // skip this month
          return;
        }
      }

      const isTargetDay = now.getDate() === effectiveTargetDay;
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const occId = `${rule.id}:${monthKey}`;
      const existing = await automationStorageService.getOccurrence(occId);

      if (isTargetDay && isPastScheduledTimeToday && !existing) {
        await this.executeOccurrence(rule, monthKey, now);
      }
    } else if (trig.type === 'schedule_interval') {
      const intervalTrig = trig as ScheduleIntervalTrigger;
      const days = intervalTrig.intervalDays || 1;
      const lastRun = rule.lastExecutedAt || 0;
      const daysSince = (now.getTime() - lastRun) / (1000 * 60 * 60 * 24);

      if (daysSince >= days && isPastScheduledTimeToday) {
        const occurrenceKey = todayStr;
        const occId = `${rule.id}:${occurrenceKey}`;
        const existing = await automationStorageService.getOccurrence(occId);
        if (!existing) {
          await this.executeOccurrence(rule, occurrenceKey, now);
        }
      }
    }
  }

  /**
   * Executes a scheduled occurrence with atomic receipt recording for multi-device/multi-tab idempotency
   */
  private async executeOccurrence(rule: AutomationRule, occurrenceKey: string, scheduledTime: Date) {
    const occId = `${rule.id}:${occurrenceKey}`;
    const initialReceipt: OccurrenceRecord = {
      id: occId,
      ruleId: rule.id,
      occurrenceKey,
      status: 'running',
      startedAt: Date.now(),
    };

    await automationStorageService.recordOccurrence(initialReceipt);

    if (this.executionCallback) {
      try {
        const createdResourceId = await this.executionCallback(rule, occurrenceKey, scheduledTime);
        const completedReceipt: OccurrenceRecord = {
          ...initialReceipt,
          status: 'completed',
          completedAt: Date.now(),
          createdResourceId,
        };
        await automationStorageService.recordOccurrence(completedReceipt);
      } catch (err: any) {
        const failedReceipt: OccurrenceRecord = {
          ...initialReceipt,
          status: 'failed',
          completedAt: Date.now(),
          error: err?.message || String(err),
        };
        await automationStorageService.recordOccurrence(failedReceipt);
      }
    }
  }
}

export const schedulerEngine = new SchedulerEngine();
