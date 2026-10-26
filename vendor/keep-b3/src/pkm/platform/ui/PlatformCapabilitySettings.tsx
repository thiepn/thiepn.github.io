import React, { useState, useEffect } from 'react';
import { usePlatformCapabilities } from '../usePlatformCapabilities';
import {
  crossDeviceContinuityService,
  DEFAULT_DEVICE_SETTINGS,
} from '../crossDeviceContinuityService';
import { permissionManager, PermissionAuditEntry } from '../permissionManager';
import { secureStorageAdapter } from '../secureStorageAdapter';
import { platformNotificationService } from '../platformNotificationService';
import { DeviceLocalSettings, NotificationPrivacyMode } from '../platformTypes';
import {
  Smartphone,
  Laptop,
  Shield,
  Bell,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  RefreshCw,
  FolderSync,
} from 'lucide-react';

export const PlatformCapabilitySettings: React.FC = () => {
  const capabilities = usePlatformCapabilities();
  const [deviceSettings, setDeviceSettings] = useState<DeviceLocalSettings>(() =>
    crossDeviceContinuityService.getDeviceSettings()
  );
  const [permissions, setPermissions] = useState<PermissionAuditEntry[]>([]);
  const [biometricStatus, setBiometricStatus] = useState(() =>
    secureStorageAdapter.getBiometricStatus()
  );

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    const list = await permissionManager.getAuditMatrix();
    setPermissions(list);
  };

  const handleToggle = (key: keyof DeviceLocalSettings, value: any) => {
    const updated = crossDeviceContinuityService.updateDeviceSettings({ [key]: value });
    setDeviceSettings(updated);

    if (key === 'notificationPrivacy') {
      platformNotificationService.setPrivacyMode(value as NotificationPrivacyMode);
    }
  };

  const handleRequestPermission = async (perm: any) => {
    await permissionManager.requestPermission(perm);
    await loadPermissions();
  };

  return (
    <div id="platform-capability-settings" className="space-y-6 text-stone-800 dark:text-stone-200">
      {/* 1. Platform Info Card */}
      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 rounded-lg text-indigo-600 dark:text-indigo-400">
            {capabilities.deviceClass === 'desktop' ? (
              <Laptop className="w-5 h-5" />
            ) : (
              <Smartphone className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Platform & Runtime Environment
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Detected OS: <span className="font-mono font-medium uppercase text-indigo-600 dark:text-indigo-400">{capabilities.platform}</span> ({capabilities.runtime}) • Device Class: <span className="font-medium capitalize">{capabilities.deviceClass}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 bg-white dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 rounded-lg">
            <span className="text-stone-400 block mb-1">Secure Store</span>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              {capabilities.secureStorage.backend.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 rounded-lg">
            <span className="text-stone-400 block mb-1">Filesystem Mirror</span>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              {capabilities.filesystem.persistentDirectoryAccess ? 'Live Mirror' : 'Direct Import/Export'}
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 rounded-lg">
            <span className="text-stone-400 block mb-1">Notifications</span>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              {capabilities.notifications.local ? 'Local Alarms' : 'In-App Only'}
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 rounded-lg">
            <span className="text-stone-400 block mb-1">Offline Status</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Fully Available
            </span>
          </div>
        </div>
      </div>

      {/* 2. Device-Local Preferences */}
      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-xs">
        <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-stone-500" />
          Device-Local Settings (Not Synced)
        </h4>

        <div className="space-y-4 text-sm">
          {/* Notification Privacy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <span className="font-medium text-stone-900 dark:text-stone-100 block">Notification Privacy Mode</span>
              <span className="text-xs text-stone-500 dark:text-stone-400">Controls detail level displayed on OS lock screens</span>
            </div>
            <select
              id="notification-privacy-select"
              value={deviceSettings.notificationPrivacy}
              onChange={(e) => handleToggle('notificationPrivacy', e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs cursor-pointer"
            >
              <option value="sanitized">Sanitized (Generic Reminder)</option>
              <option value="full">Full (Task & Note Titles)</option>
              <option value="hidden_when_locked">Hidden While Locked</option>
            </select>
          </div>

          {/* Biometric Unlock */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <span className="font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-amber-500" />
                Biometric Convenience Unlock
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 block">
                Wraps ephemeral session key locally. Master password remains fallback.
              </span>
            </div>
            <input
              id="biometric-unlock-toggle"
              type="checkbox"
              checked={deviceSettings.biometricUnlockEnabled}
              disabled={!biometricStatus.isAvailable}
              onChange={(e) => handleToggle('biometricUnlockEnabled', e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Cross Device Resume */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <span className="font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <FolderSync className="w-4 h-4 text-emerald-500" />
                "Continue on this device" Resumption
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 block">
                Highlights semantic active context across devices without overriding local panes.
              </span>
            </div>
            <input
              id="cross-device-resume-toggle"
              type="checkbox"
              checked={deviceSettings.enableCrossDeviceResume}
              onChange={(e) => handleToggle('enableCrossDeviceResume', e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* App Switcher Privacy (Mobile) */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-sky-500" />
                App Switcher Privacy Shield
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 block">
                Obscures sensitive task/financial notes when app is sent to background.
              </span>
            </div>
            <input
              id="app-switcher-shield-toggle"
              type="checkbox"
              checked={deviceSettings.protectAppSwitcher}
              onChange={(e) => handleToggle('protectAppSwitcher', e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Platform Permission Audit Matrix */}
      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-xs">
        <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-stone-500" />
          On-Demand OS Permissions Audit
        </h4>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
          Permissions are requested strictly on-demand during active user operations and never queried on initial launch.
        </p>

        <div className="space-y-2">
          {permissions.map((p) => (
            <div
              key={p.permission}
              className="flex items-center justify-between p-3 bg-white dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700/60 rounded-lg text-xs"
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize text-stone-900 dark:text-stone-100">
                    {p.permission.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      p.currentState === 'granted'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        : p.currentState === 'denied'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {p.currentState}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  {p.explanation}
                </p>
              </div>

              {p.currentState !== 'granted' && p.currentState !== 'unsupported' && (
                <button
                  type="button"
                  onClick={() => handleRequestPermission(p.permission)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Enable
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
