/**
 * V1.3 — Platform Types & Schemas
 * Central definitions for platform capability detection, native bridges,
 * lifecycle events, deep linking, secure storage, and cross-device continuity.
 */

export type PlatformType =
  | 'web'
  | 'pwa'
  | 'windows'
  | 'macos'
  | 'linux'
  | 'android'
  | 'ios';

export type DeviceClass = 'desktop' | 'mobile' | 'tablet' | 'web';

export type RuntimeEnvironment =
  | 'browser'
  | 'pwa-standalone'
  | 'tauri'
  | 'electron'
  | 'capacitor'
  | 'react-native';

export type CapabilityStatus =
  | 'stable'
  | 'beta'
  | 'experimental'
  | 'unavailable'
  | 'not_verified';

export type AppLifecycleState =
  | 'foreground'
  | 'background'
  | 'resumed'
  | 'terminating'
  | 'screen_locked';

export type NotificationPrivacyMode = 'full' | 'sanitized' | 'hidden_when_locked';

export type SecureStorageBackend =
  | 'macos_keychain'
  | 'ios_keychain'
  | 'android_keystore'
  | 'windows_credential_manager'
  | 'linux_secret_service'
  | 'web_encrypted_local'
  | 'session_memory';

export type PlatformErrorCode =
  | 'PERMISSION_DENIED'
  | 'CAPABILITY_UNAVAILABLE'
  | 'FILE_ACCESS_REVOKED'
  | 'NOTIFICATION_PERMISSION_DENIED'
  | 'SECURE_STORAGE_UNAVAILABLE'
  | 'NATIVE_BRIDGE_ERROR'
  | 'MALICIOUS_DEEP_LINK_REJECTED'
  | 'UPDATE_CHECK_FAILED'
  | 'BIOMETRIC_UNAVAILABLE'
  | 'DEVICE_STORAGE_LOW';

export interface PlatformError {
  code: PlatformErrorCode;
  message: string;
  userFacingMessage: string;
  recoverable: boolean;
  actionRequired?: 'open_settings' | 'request_permission' | 'retry' | 'reauthenticate';
}

export interface PlatformCapabilities {
  platform: PlatformType;
  deviceClass: DeviceClass;
  runtime: RuntimeEnvironment;

  filesystem: {
    openFile: boolean;
    openDirectory: boolean;
    persistentDirectoryAccess: boolean;
    watchDirectory: boolean;
    openExternal: boolean;
    supportsOriginPrivateFs: boolean;
  };

  sharing: {
    receiveShare: boolean;
    shareOut: boolean;
    photoPicker: boolean;
    documentPicker: boolean;
    cameraCapture: boolean;
    audioRecord: boolean;
  };

  notifications: {
    local: boolean;
    scheduled: boolean;
    backgroundReliable: boolean;
    permissionState: 'granted' | 'denied' | 'prompt' | 'unsupported';
    maxScheduledLimit: number;
  };

  secureStorage: {
    available: boolean;
    backend: SecureStorageBackend;
    canStoreSecrets: boolean;
    hardwareBacked: boolean;
  };

  biometrics: {
    available: boolean;
    type: 'fingerprint' | 'face' | 'iris' | 'none';
    hardwareProtected: boolean;
    enrolled: boolean;
  };

  lifecycle: {
    backgroundFlushSupported: boolean;
    appSwitcherPrivacySupported: boolean;
    osLockDetectionSupported: boolean;
  };

  deepLinks: {
    customProtocol: boolean;
    universalLinks: boolean;
    safeRouterActive: boolean;
  };

  desktop: {
    systemTray: boolean;
    globalShortcuts: boolean;
    nativeAppMenu: boolean;
    multiWindow: boolean;
  };

  mobile: {
    appShortcuts: boolean;
    widgets: boolean;
    haptics: boolean;
    androidBackButton: boolean;
  };

  updates: {
    autoUpdateAvailable: boolean;
    channel: 'stable' | 'beta';
    supportsSilentBackgroundCheck: boolean;
  };
}

export interface DeviceLocalSettings {
  // Desktop
  closeToTray: boolean;
  startAtLogin: boolean;
  globalQuickCaptureShortcut: string;
  windowGeometry?: { width: number; height: number; x: number; y: number; maximized: boolean };

  // Mobile & Tablet
  protectAppSwitcher: boolean;
  biometricUnlockEnabled: boolean;
  hapticsEnabled: boolean;
  lockOnBackgroundMinutes: number; // 0 = immediate, 5 = 5 min, -1 = never

  // Notifications
  notificationsEnabled: boolean;
  notificationPrivacy: NotificationPrivacyMode;

  // Storage & Offline
  offlineDownloadAllAttachments: boolean;
  maxLocalAttachmentCacheMb: number;

  // Cross-device continuation
  enableCrossDeviceResume: boolean;
  lastActiveResourceId?: string;
  lastActiveResourceType?: 'note' | 'project' | 'task' | 'context';
  lastActiveTimestamp?: number;
}

export interface DeepLinkRoute {
  action: 'open_resource' | 'open_view' | 'quick_capture' | 'open_settings' | 'search';
  resourceType?: 'note' | 'project' | 'task' | 'context' | 'calendar' | 'finance' | 'library';
  resourceId?: string;
  viewName?: string;
  searchQuery?: string;
  captureText?: string;
  captureUrl?: string;
  requiresUnlock: boolean;
  rawUrl: string;
}

export interface CanonicalReminder {
  id: string;
  resourceId: string;
  resourceType: 'task' | 'note' | 'calendar_event';
  title: string;
  scheduledTimeIso: string;
  isSensitive: boolean;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NativeNotificationRecord {
  nativeId: string;
  canonicalReminderId: string;
  title: string;
  body: string;
  fireDateTimestamp: number;
  privacyMode: NotificationPrivacyMode;
  delivered: boolean;
  cancelled: boolean;
}

export interface ContinuationState {
  deviceId: string;
  deviceName: string;
  deviceClass: DeviceClass;
  activeContextId?: string;
  activeContextName?: string;
  recentResourceIds: string[];
  timestamp: string;
}
