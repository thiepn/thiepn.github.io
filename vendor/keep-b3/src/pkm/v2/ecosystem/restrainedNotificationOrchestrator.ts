/**
 * V2.12 Restrained Notification Orchestrator
 * 
 * Manages privacy-aware local notifications, restrained category taxonomies,
 * idempotent task completion actions, and Due-date-safe snoozing.
 */

export type NotificationCategory = 'tasks_reminders' | 'calendar' | 'reviews' | 'routines' | 'system_failure';
export type NotificationPrivacyMode = 'full' | 'generic' | 'hidden';

export interface ScheduledNotificationItem {
  id: string;
  category: NotificationCategory;
  resourceId?: string;
  rawTitle: string;
  rawBody: string;
  scheduledTime: number; // Unix timestamp ms
  originalDueTimestamp?: number;
  privacyMode: NotificationPrivacyMode;
  actions: Array<'complete' | 'snooze' | 'open'>;
  dispatched: boolean;
}

export interface MaskedNotificationPayload {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  resourceId?: string;
  actions: Array<'complete' | 'snooze' | 'open'>;
}

export class RestrainedNotificationOrchestrator {
  private static instance: RestrainedNotificationOrchestrator | null = null;
  private scheduledItems: Map<string, ScheduledNotificationItem> = new Map();
  private completedActionKeys: Set<string> = new Set();
  private globalPrivacyMode: NotificationPrivacyMode = 'full';

  private constructor() {}

  public static getInstance(): RestrainedNotificationOrchestrator {
    if (!RestrainedNotificationOrchestrator.instance) {
      RestrainedNotificationOrchestrator.instance = new RestrainedNotificationOrchestrator();
    }
    return RestrainedNotificationOrchestrator.instance;
  }

  public setGlobalPrivacyMode(mode: NotificationPrivacyMode): void {
    this.globalPrivacyMode = mode;
  }

  /**
   * Applies privacy masking to a notification payload
   */
  public maskPayload(
    item: ScheduledNotificationItem,
    isVaultLocked: boolean
  ): MaskedNotificationPayload {
    // If vault is locked or privacy is hidden/generic, mask sensitive strings
    const effectiveMode = isVaultLocked ? 'generic' : (item.privacyMode || this.globalPrivacyMode);

    if (effectiveMode === 'hidden') {
      return {
        id: item.id,
        title: 'KeepNotes',
        body: 'You have a notification',
        category: item.category,
        resourceId: item.resourceId,
        actions: ['open'],
      };
    }

    if (effectiveMode === 'generic') {
      let genericCategoryName = 'Reminder';
      if (item.category === 'calendar') genericCategoryName = 'Calendar Event';
      if (item.category === 'reviews') genericCategoryName = 'Weekly Review';
      if (item.category === 'system_failure') genericCategoryName = 'System Alert';

      return {
        id: item.id,
        title: 'KeepNotes',
        body: `1 ${genericCategoryName}`,
        category: item.category,
        resourceId: item.resourceId,
        actions: item.actions,
      };
    }

    return {
      id: item.id,
      title: item.rawTitle,
      body: item.rawBody,
      category: item.category,
      resourceId: item.resourceId,
      actions: item.actions,
    };
  }

  /**
   * Schedules a new notification
   */
  public schedule(params: {
    id: string;
    category: NotificationCategory;
    resourceId?: string;
    rawTitle: string;
    rawBody: string;
    scheduledTime: number;
    originalDueTimestamp?: number;
    privacyMode?: NotificationPrivacyMode;
    actions?: Array<'complete' | 'snooze' | 'open'>;
  }): ScheduledNotificationItem {
    const item: ScheduledNotificationItem = {
      id: params.id,
      category: params.category,
      resourceId: params.resourceId,
      rawTitle: params.rawTitle,
      rawBody: params.rawBody,
      scheduledTime: params.scheduledTime,
      originalDueTimestamp: params.originalDueTimestamp,
      privacyMode: params.privacyMode || this.globalPrivacyMode,
      actions: params.actions || ['open'],
      dispatched: false,
    };

    this.scheduledItems.set(item.id, item);
    return item;
  }

  /**
   * Handles the 'complete' action from a notification idempotently
   */
  public executeTaskCompleteAction(
    notificationId: string,
    onCompleteCanonicalTask: (resourceId: string) => void
  ): boolean {
    // Check if already completed first for true idempotency
    for (const key of this.completedActionKeys) {
      if (key.startsWith(`complete:${notificationId}:`)) {
        return true; // Idempotent: already completed
      }
    }

    const item = this.scheduledItems.get(notificationId);
    if (!item || !item.resourceId) return false;

    const actionKey = `complete:${notificationId}:${item.resourceId}`;
    if (this.completedActionKeys.has(actionKey)) {
      return true; // Idempotent: already handled
    }

    this.completedActionKeys.add(actionKey);
    this.scheduledItems.delete(notificationId);
    onCompleteCanonicalTask(item.resourceId);
    return true;
  }

  /**
   * Handles the 'snooze' action: reschedules the reminder WITHOUT altering the canonical task due date
   */
  public executeSnoozeAction(
    notificationId: string,
    snoozeMinutes: number = 15
  ): ScheduledNotificationItem | null {
    const item = this.scheduledItems.get(notificationId);
    if (!item) return null;

    // Reschedule reminder timestamp
    const newScheduledTime = Date.now() + snoozeMinutes * 60 * 1000;
    
    // Crucial rule: originalDueTimestamp remains unchanged!
    item.scheduledTime = newScheduledTime;
    item.dispatched = false;
    
    this.scheduledItems.set(notificationId, item);
    return item;
  }

  public cancel(id: string): void {
    this.scheduledItems.delete(id);
  }

  public getPendingCount(): number {
    return this.scheduledItems.size;
  }
}

export const restrainedNotificationOrchestrator = RestrainedNotificationOrchestrator.getInstance();
