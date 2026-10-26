/**
 * PKM V2.3 — Centralized Reminder Engine V2
 * 
 * Coordinates reminder schedules, notification triggers, and native device bridges.
 * 
 * Non-negotiable principles:
 * - SNOOZE changes the notification trigger time, NOT the canonical Due date.
 * - RESCHEDULE mutates the canonical Due or Scheduled property.
 * - Completing or archiving a task automatically disarms its reminders.
 * - Privacy protection minimizes notification payloads when locked.
 */

import { DateOnlyString, DateTimeString } from '../temporal/temporalTypes';
import { ResourceType } from '../core/resource/resourceCore';

export interface ReminderV2 {
  id: string; // Unique reminder record ID
  resourceId: string;
  resourceType: ResourceType;
  title: string;
  triggerDate: DateOnlyString;
  triggerTime: string; // "09:00"
  triggerIso: DateTimeString;
  snoozedUntil?: DateTimeString;
  status: 'armed' | 'fired' | 'snoozed' | 'dismissed' | 'cancelled';
  privacyLevel: 'masked' | 'full';
  createdAt: number;
  updatedAt: number;
}

export class ReminderEngineV2 {
  private reminders = new Map<string, ReminderV2>();

  public getReminders(): ReminderV2[] {
    return Array.from(this.reminders.values()).sort((a, b) => a.triggerIso.localeCompare(b.triggerIso));
  }

  public getReminder(id: string): ReminderV2 | undefined {
    return this.reminders.get(id);
  }

  public getRemindersForResource(resourceId: string): ReminderV2[] {
    return Array.from(this.reminders.values()).filter((r) => r.resourceId === resourceId);
  }

  /**
   * Sets or updates a reminder for a resource
   */
  public setReminder(
    resourceId: string,
    resourceType: ResourceType,
    title: string,
    date: DateOnlyString,
    time: string = '09:00',
    privacyLevel: 'masked' | 'full' = 'full'
  ): ReminderV2 {
    const id = `rem_${resourceId}`;
    const triggerIso = new Date(`${date}T${time}:00`).toISOString();

    const reminder: ReminderV2 = {
      id,
      resourceId,
      resourceType,
      title,
      triggerDate: date,
      triggerTime: time,
      triggerIso,
      status: 'armed',
      privacyLevel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.reminders.set(id, reminder);
    return reminder;
  }

  /**
   * Snoozes a reminder without touching canonical due or scheduled dates
   */
  public snoozeReminder(reminderId: string, minutes: number = 30): ReminderV2 {
    const rem = this.reminders.get(reminderId);
    if (!rem) throw new Error(`Reminder "${reminderId}" not found.`);

    const snoozeTarget = new Date(Date.now() + minutes * 60 * 1000);
    rem.snoozedUntil = snoozeTarget.toISOString();
    rem.status = 'snoozed';
    rem.updatedAt = Date.now();

    return { ...rem };
  }

  /**
   * Cancels a reminder (e.g. upon task completion)
   */
  public cancelReminder(reminderId: string): void {
    const rem = this.reminders.get(reminderId);
    if (rem) {
      rem.status = 'cancelled';
      rem.updatedAt = Date.now();
    }
  }

  /**
   * Cancels all reminders associated with a resource
   */
  public cancelRemindersForResource(resourceId: string): void {
    for (const rem of this.reminders.values()) {
      if (rem.resourceId === resourceId && rem.status === 'armed') {
        rem.status = 'cancelled';
        rem.updatedAt = Date.now();
      }
    }
  }
}

export const reminderEngineV2 = new ReminderEngineV2();
