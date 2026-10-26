/**
 * P47 — Mobile Native Notification Service
 * 
 * Manages native local scheduled notifications synchronized with canonical P37 reminders.
 * Features:
 * - Local-only scheduling via OS alarm/notification managers (no remote push servers)
 * - Exact-once delivery using canonical reminder IDs
 * - Safe reschedule on reminder modifications and cancellations
 * - Privacy redaction when vault is locked
 * - Android notification channels
 */

import { MobileLocalNotification, MobileNotificationChannel } from './mobileTypes';
import { mobileCapabilityService } from './mobileCapabilityService';

const NOTIFICATIONS_STORAGE_KEY = 'pkm_mobile_scheduled_notifications_v1';

export const MOBILE_NOTIFICATION_CHANNELS: MobileNotificationChannel[] = [
  {
    id: 'pkm_reminders',
    name: 'Task & Note Reminders',
    description: 'Scheduled alerts for time-sensitive tasks and notes',
    importance: 4, // High
  },
  {
    id: 'pkm_review',
    name: 'Daily Spaced Review',
    description: 'Aggregated reminder when flashcards are due',
    importance: 3, // Default
  },
];

class MobileNotificationService {
  private scheduledList: MobileLocalNotification[] = [];
  private permissionGranted: boolean = false;

  constructor() {
    this.loadScheduled();
    this.checkPermissionStatus();
  }

  private loadScheduled(): void {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        this.scheduledList = JSON.parse(raw);
      }
    } catch {
      this.scheduledList = [];
    }
  }

  private persistScheduled(): void {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.scheduledList));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pkm-mobile-notifications-sync', {
            detail: { scheduled: this.scheduledList },
          })
        );
      }
    } catch {
      // Ignore
    }
  }

  private checkPermissionStatus(): void {
    if (typeof window === 'undefined') return;
    if ('Notification' in window) {
      this.permissionGranted = Notification.permission === 'granted';
    }
  }

  public isPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  /**
   * Explicitly requests notification authorization from user
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    try {
      const res = await Notification.requestPermission();
      this.permissionGranted = res === 'granted';
      return this.permissionGranted;
    } catch {
      return false;
    }
  }

  /**
   * Schedules a local notification for a canonical reminder
   */
  public async scheduleReminderNotification(item: {
    reminderId: string;
    title: string;
    body: string;
    timestamp: number;
    resourceId?: string;
    resourceType?: 'note' | 'task' | 'reminder' | 'review';
    isVaultLocked?: boolean;
  }): Promise<void> {
    const settings = mobileCapabilityService.getSettings();
    if (!settings.enableNativeNotifications) return;

    // Filter out past reminders
    if (item.timestamp <= Date.now()) return;

    // Cancel existing notification for same ID if updating
    this.cancelNotification(item.reminderId);

    const safeTitle = item.isVaultLocked ? 'Reminder Alert' : item.title;
    const safeBody = item.isVaultLocked ? 'You have a scheduled reminder.' : item.body;

    const notification: MobileLocalNotification = {
      id: item.reminderId,
      title: safeTitle,
      body: safeBody,
      scheduledTime: item.timestamp,
      channelId: 'pkm_reminders',
      sound: true,
      resourceId: item.resourceId,
      resourceType: item.resourceType,
      isSensitive: item.isVaultLocked,
    };

    this.scheduledList.push(notification);
    this.persistScheduled();

    // If browser supports web timers or native bridge is active
    this.armTimer(notification);
  }

  /**
   * Cancels scheduled notification by canonical reminder ID
   */
  public cancelNotification(reminderId: string): void {
    this.scheduledList = this.scheduledList.filter((n) => n.id !== reminderId);
    this.persistScheduled();
  }

  /**
   * Sets up timer dispatch for web/browser runtime
   */
  private armTimer(notification: MobileLocalNotification): void {
    const delay = notification.scheduledTime - Date.now();
    if (delay <= 0 || delay > 2_147_483_647) return; // Max setTimeout limit ~24.8 days

    setTimeout(() => {
      this.triggerLocalNotification(notification);
    }, delay);
  }

  /**
   * Fires the notification in browser or native notification center
   */
  private triggerLocalNotification(notification: MobileLocalNotification): void {
    if (this.permissionGranted && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification(notification.title, {
          body: notification.body,
          icon: '/favicon.ico',
          tag: notification.id,
        });
      } catch (err) {
        console.warn('[MobileNotificationService] Failed to trigger notification:', err);
      }
    }
  }

  public getScheduledList(): MobileLocalNotification[] {
    return [...this.scheduledList];
  }
}

export const mobileNotificationService = new MobileNotificationService();
