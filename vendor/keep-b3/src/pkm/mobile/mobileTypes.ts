/**
 * P47 — Native Mobile App, Share Sheet, Widgets & Mobile OS Integration
 * Core TypeScript definitions and schemas for mobile native capabilities.
 */

export type MobilePlatform = 'android' | 'ios' | 'web';

export type MobileRuntimeEnvironment = 'capacitor' | 'tauri-mobile' | 'browser' | 'pwa';

export type ShareItemType = 'text' | 'url' | 'image' | 'pdf' | 'file';

export type ShareStagingStatus = 'pending' | 'ready' | 'ingesting' | 'committed' | 'failed';

export interface MobileSharePayload {
  id: string; // Stable idempotency ID (UUID or hash)
  type: ShareItemType;
  title?: string;
  text?: string;
  url?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  dataUrl?: string; // Base64 data for files/images
  stagingUri?: string;
  timestamp: number;
  sourceApp?: string;
  status: ShareStagingStatus;
  destination?: 'inbox' | 'daily' | 'new_note';
  targetFolderId?: string | null;
  errorMessage?: string;
  retryCount: number;
  isEncryptedInStaging: boolean;
}

export type MobileQuickActionType = 'new_note' | 'quick_capture' | 'today' | 'review' | 'scan_document';

export interface MobileQuickAction {
  id: string;
  type: MobileQuickActionType;
  title: string;
  subtitle?: string;
  icon: string;
}

export type WidgetType = 'today' | 'quick_capture' | 'review' | 'agenda';

export type WidgetPrivacyLevel = 'counts_only' | 'sanitized' | 'full_when_unlocked';

export interface WidgetSnapshotData {
  widgetId: string;
  type: WidgetType;
  updatedAt: number;
  isVaultLocked: boolean;
  privacyLevel: WidgetPrivacyLevel;
  todaySummary?: {
    dateFormatted: string;
    hasDailyNote: boolean;
    totalTasks: number;
    completedTasks: number;
    pendingTasksCount: number;
    overdueTasksCount: number;
    previewTasks?: Array<{ title: string; completed: boolean }>;
  };
  reviewSummary?: {
    dueCardsCount: number;
    newCardsCount: number;
    streakDays?: number;
  };
  agendaSummary?: {
    upcomingCount: number;
    todayTasksCount: number;
    highPriorityCount: number;
    previewItems?: Array<{ title: string; time?: string; priority?: string }>;
  };
}

export interface MobileNotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: 1 | 2 | 3 | 4 | 5; // Low to High
}

export interface MobileLocalNotification {
  id: string; // Stable canonical reminder ID
  title: string;
  body: string;
  scheduledTime: number; // Unix epoch ms
  channelId?: string;
  sound?: boolean;
  resourceId?: string;
  resourceType?: 'note' | 'task' | 'reminder' | 'review';
  isSensitive?: boolean;
}

export interface MobileSecureStorageCapability {
  isAvailable: boolean;
  backendName: 'iOS Keychain (Secure Enclave)' | 'Android Keystore' | 'Encrypted Web Fallback' | 'Session Storage';
  isHardwareBacked: boolean;
  biometricsSupported: boolean;
  biometricsEnrolled: boolean;
  biometricType?: 'FaceID' | 'TouchID' | 'Fingerprint' | 'Biometric' | 'None';
}

export interface BiometricUnlockConfig {
  isEnabled: boolean;
  deviceKeyWrapped?: string; // AES-GCM wrapped data key protected by OS Keychain/Keystore
  keyIv?: string;
  enrollmentFingerprint?: string; // Detects if new biometrics were enrolled
  fallbackPolicy: 'vault_password';
  lastUnlockedTimestamp?: number;
}

export interface MobileAppSettings {
  defaultShareDestination: 'inbox' | 'daily' | 'new_note';
  autoIngestSharesOnUnlock: boolean;
  widgetPrivacyLevel: WidgetPrivacyLevel;
  protectAppSwitcher: boolean; // Hide screen in multitasking app-switcher
  lockOnAppBackground: 'immediately' | '1min' | '5min' | 'never';
  lockOnDeviceScreenLock: boolean;
  biometricUnlockEnabled: boolean;
  enableNativeNotifications: boolean;
  hapticsEnabled: boolean;
  syncLargeAttachmentsOnWifiOnly: boolean;
}

export interface MobileCapabilities {
  platform: MobilePlatform;
  runtime: MobileRuntimeEnvironment;
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  hasShareSheet: boolean;
  hasWidgets: boolean;
  hasQuickActions: boolean;
  hasNativeNotifications: boolean;
  hasCamera: boolean;
  hasPhotoPicker: boolean;
  hasDocumentPicker: boolean;
  hasSecureStorage: boolean;
  hasBiometrics: boolean;
  hasAppSwitcherProtection: boolean;
  hasDeviceScreenLockDetection: boolean;
  hasBackgroundRefresh: boolean;
}
