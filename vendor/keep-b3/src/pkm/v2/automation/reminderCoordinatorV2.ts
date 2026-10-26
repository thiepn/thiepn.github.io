/**
 * PKM V2.20 — Reminder & Snooze Coordinator V2
 * 
 * Provides local time-based reminder notifications, snooze presets, quiet hours,
 * and missed trigger catch-up without requiring server-side push brokers.
 */

import {
  V2ReminderItem,
  V2SnoozePreset,
} from './automationTypesV2';
import { ResourceType } from '../core/resource/resourceCore';
import { DateOnlyString, DateTimeString } from '../temporal/temporalTypes';
import { AdvancedRecurrenceEngineV2 } from './advancedRecurrenceEngineV2';

export interface QuietHoursConfig {
  enabled: boolean;
  startHour: number; // e.g. 22 (10 PM)
  endHour: number;   // e.g. 7 (7 AM)
}

export class ReminderCoordinatorV2 {
  private reminders = new Map<string, V2ReminderItem>();
  private quietHours: QuietHoursConfig = {
    enabled: true,
    startHour: 22,
    endHour: 7,
  };

  constructor() {
    this.registerSampleReminders();
  }

  private registerSampleReminders(): void {
    const today = AdvancedRecurrenceEngineV2.formatSafeDate(new Date());
    const sample: V2ReminderItem = {
      id: 'rem-tax-deadline',
      resourceId: 'task-tax-filing',
      resourceType: 'task',
      title: 'Submit quarterly tax documentation',
      dueDateOnly: today,
      dueDateTimeIso: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      snoozeCount: 0,
      soundEnabled: true,
      priority: 'high',
    };
    this.reminders.set(sample.id, sample);
  }

  public registerReminder(item: V2ReminderItem): void {
    this.reminders.set(item.id, item);
  }

  public getReminders(): V2ReminderItem[] {
    return Array.from(this.reminders.values()).sort((a, b) => 
      a.dueDateTimeIso.localeCompare(b.dueDateTimeIso)
    );
  }

  public getReminder(id: string): V2ReminderItem | undefined {
    return this.reminders.get(id);
  }

  public setQuietHours(config: QuietHoursConfig): void {
    this.quietHours = { ...config };
  }

  public isQuietHoursActive(date: Date = new Date()): boolean {
    if (!this.quietHours.enabled) return false;
    const hour = date.getHours();
    if (this.quietHours.startHour > this.quietHours.endHour) {
      // Overnight (e.g. 22:00 to 07:00)
      return hour >= this.quietHours.startHour || hour < this.quietHours.endHour;
    } else {
      return hour >= this.quietHours.startHour && hour < this.quietHours.endHour;
    }
  }

  public snoozeReminder(
    id: string,
    preset: V2SnoozePreset,
    customIso?: DateTimeString
  ): V2ReminderItem {
    const rem = this.reminders.get(id);
    if (!rem) {
      throw new Error(`Reminder "${id}" not found.`);
    }

    const now = new Date();
    let targetTime: Date;

    switch (preset) {
      case '15_minutes':
        targetTime = new Date(now.getTime() + 15 * 60 * 1000);
        break;
      case '1_hour':
        targetTime = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case '3_hours':
        targetTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        break;
      case 'tomorrow_morning': {
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
        targetTime = tomorrow;
        break;
      }
      case 'tomorrow_afternoon': {
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0, 0);
        targetTime = tomorrow;
        break;
      }
      case 'next_week': {
        const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 0, 0);
        targetTime = nextWeek;
        break;
      }
      case 'custom':
        if (!customIso) throw new Error('customIso required for custom snooze');
        targetTime = new Date(customIso);
        break;
    }

    rem.status = 'snoozed';
    rem.snoozedUntilIso = targetTime.toISOString();
    rem.snoozeCount++;
    return { ...rem };
  }

  public dismissReminder(id: string): V2ReminderItem {
    const rem = this.reminders.get(id);
    if (!rem) throw new Error(`Reminder "${id}" not found.`);
    rem.status = 'dismissed';
    return { ...rem };
  }

  public completeReminder(id: string): V2ReminderItem {
    const rem = this.reminders.get(id);
    if (!rem) throw new Error(`Reminder "${id}" not found.`);
    rem.status = 'completed';
    return { ...rem };
  }

  /**
   * Evaluates pending and snoozed reminders against current time, returning due reminders
   */
  public evaluateDueReminders(currentTime: Date = new Date()): V2ReminderItem[] {
    const nowIso = currentTime.toISOString();
    const due: V2ReminderItem[] = [];

    for (const rem of this.reminders.values()) {
      if (rem.status === 'dismissed' || rem.status === 'completed') {
        continue;
      }

      if (rem.status === 'snoozed' && rem.snoozedUntilIso) {
        if (rem.snoozedUntilIso <= nowIso) {
          rem.status = 'triggered';
          rem.lastTriggeredAt = Date.now();
          due.push({ ...rem });
        }
      } else if (rem.status === 'pending') {
        if (rem.dueDateTimeIso <= nowIso) {
          rem.status = 'triggered';
          rem.lastTriggeredAt = Date.now();
          due.push({ ...rem });
        }
      }
    }

    return due;
  }
}

export const reminderCoordinatorV2 = new ReminderCoordinatorV2();
