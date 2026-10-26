/**
 * V1.3 — Unified Native Notification Orchestrator
 * Maps canonical domain reminders to platform-native notifications.
 * Enforces lock-privacy filtering, automatic cancellation on task completion,
 * and on-demand permission acquisition.
 */

import {
  CanonicalReminder,
  NativeNotificationRecord,
  NotificationPrivacyMode,
} from './platformTypes';
import { platformRegistry } from './platformCapabilityRegistry';
import { deepLinkRouter } from './deepLinkRouter';

const NOTIFICATIONS_STORAGE_KEY = 'pkm_scheduled_notifications_v1';

export class PlatformNotificationService {
  private static instance: PlatformNotificationService | null = null;
  private scheduledRecords: Map<string, NativeNotificationRecord> = new Map();
  private isVaultLocked: boolean = false;
  private privacyMode: NotificationPrivacyMode = 'sanitized';
  private permissionState: 'granted' | 'denied' | 'prompt' | 'unsupported' = 'prompt';

  private constructor() {
    this.loadPersistedRecords();
    this.refreshPermissionState();
  }

  public static getInstance(): PlatformNotificationService {
    if (!PlatformNotificationService.instance) {
      PlatformNotificationService.instance = new PlatformNotificationService();
    }
    return PlatformNotificationService.instance;
  }

  public setVaultLockStatus(isLocked: boolean): void {
    this.isVaultLocked = isLocked;
  }

  public setPrivacyMode(mode: NotificationPrivacyMode): void {
    this.privacyMode = mode;
  }

  public getPrivacyMode(): NotificationPrivacyMode {
    return this.privacyMode;
  }

  public refreshPermissionState(): 'granted' | 'denied' | 'prompt' | 'unsupported' {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      this.permissionState = 'unsupported';
      return 'unsupported';
    }
    this.permissionState = Notification.permission as 'granted' | 'denied' | 'prompt';
    return this.permissionState;
  }

  /**
   * On-demand permission request: Only invoked when a user configures a reminder
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      this.permissionState = res as 'granted' | 'denied' | 'prompt';
      return res === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Schedules or updates a platform notification for a canonical reminder
   */
  public async scheduleReminder(reminder: CanonicalReminder): Promise<NativeNotificationRecord | null> {
    // Check due date
    const targetTimestamp = new Date(reminder.scheduledTimeIso).getTime();
    const now = Date.now();
    if (isNaN(targetTimestamp) || targetTimestamp <= now) {
      // Past reminder: do not schedule future notification
      return null;
    }

    const nativeId = `rem_${reminder.id}`;

    // Cancel existing notification for this reminder if one was already scheduled
    this.cancelReminder(reminder.id);

    // Apply privacy masking if vault is locked or domain is sensitive
    let displayTitle = reminder.title;
    let displayBody = `Personal OS: Scheduled ${reminder.resourceType}`;

    if (this.privacyMode === 'hidden_when_locked' && this.isVaultLocked) {
      // Completely suppress
      return null;
    }

    if (this.privacyMode === 'sanitized' || (this.isVaultLocked && reminder.isSensitive)) {
      displayTitle = 'Scheduled Task Reminder';
      displayBody = 'You have a scheduled item in your Personal OS.';
    }

    const record: NativeNotificationRecord = {
      nativeId,
      canonicalReminderId: reminder.id,
      title: displayTitle,
      body: displayBody,
      fireDateTimestamp: targetTimestamp,
      privacyMode: this.privacyMode,
      delivered: false,
      cancelled: false,
    };

    this.scheduledRecords.set(nativeId, record);
    this.persistRecords();

    // If running in browser and permission granted, set a timer if due soon (<24h)
    const delayMs = targetTimestamp - now;
    if (delayMs > 0 && delayMs < 86400000 && typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        setTimeout(() => {
          this.triggerLocalNotification(record, reminder);
        }, delayMs);
      }
    }

    return record;
  }

  /**
   * Cancels a scheduled native notification when the task is completed or deleted
   */
  public cancelReminder(canonicalReminderId: string): boolean {
    const nativeId = `rem_${canonicalReminderId}`;
    const existing = this.scheduledRecords.get(nativeId);
    if (existing) {
      existing.cancelled = true;
      this.scheduledRecords.delete(nativeId);
      this.persistRecords();
      return true;
    }
    return false;
  }

  /**
   * Cancels all scheduled reminders (e.g. on user reset)
   */
  public clearAllReminders(): void {
    this.scheduledRecords.clear();
    this.persistRecords();
  }

  /**
   * Returns all active scheduled records
   */
  public getScheduledRecords(): NativeNotificationRecord[] {
    return Array.from(this.scheduledRecords.values()).filter((r) => !r.cancelled && !r.delivered);
  }

  private triggerLocalNotification(record: NativeNotificationRecord, reminder: CanonicalReminder): void {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    if (this.isVaultLocked && this.privacyMode === 'hidden_when_locked') {
      return;
    }

    try {
      const n = new Notification(record.title, {
        body: record.body,
        icon: '/favicon.ico',
        tag: record.nativeId,
      });

      n.onclick = () => {
        window.focus();
        deepLinkRouter.handleUrl(`app://${reminder.resourceType}/${reminder.resourceId}`);
      };

      record.delivered = true;
      this.persistRecords();
    } catch {
      // Notification API error fallback
    }
  }

  private loadPersistedRecords(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          for (const item of parsed) {
            // Keep only unexpired records
            if (item.fireDateTimestamp > now && !item.cancelled) {
              this.scheduledRecords.set(item.nativeId, item);
            }
          }
        }
      }
    } catch {
      // Storage failure fallback
    }
  }

  private persistRecords(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const arr = Array.from(this.scheduledRecords.values());
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // Quota or storage write error
    }
  }
}

export const platformNotificationService = PlatformNotificationService.getInstance();
