/**
 * P47 — Mobile App & OS Integration Settings Card
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, Bell, Zap, Lock, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle, Fingerprint } from 'lucide-react';
import { mobileCapabilityService } from '../mobileCapabilityService';
import { mobileBiometricService } from '../mobileBiometricService';
import { mobileNotificationService } from '../mobileNotificationService';
import { MobileAppSettings, WidgetPrivacyLevel } from '../mobileTypes';

interface MobileSettingsCardProps {
  onOpenDiagnostics?: () => void;
  onOpenShareInbox?: () => void;
  isVaultLocked?: boolean;
}

export const MobileSettingsCard: React.FC<MobileSettingsCardProps> = ({
  onOpenDiagnostics,
  onOpenShareInbox,
  isVaultLocked,
}) => {
  const [settings, setSettings] = useState<MobileAppSettings>(mobileCapabilityService.getSettings());
  const [caps] = useState(mobileCapabilityService.getCapabilities());
  const [bioSupported, setBioSupported] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(mobileNotificationService.isPermissionGranted());

  useEffect(() => {
    const unsub = mobileCapabilityService.subscribeSettings(setSettings);
    mobileBiometricService.getBiometricCapability().then((c) => {
      setBioSupported(c.biometricsSupported);
    });
    return unsub;
  }, []);

  const handleToggleBiometric = async () => {
    setBioError(null);
    if (settings.biometricUnlockEnabled) {
      mobileBiometricService.disableBiometricUnlock();
    } else {
      if (isVaultLocked) {
        setBioError('Please unlock your vault before enabling biometric convenience unlock.');
        return;
      }
      const res = await mobileBiometricService.enableBiometricUnlock('session-auth');
      if (!res.success) {
        setBioError(res.error || 'Failed to enable biometric authentication.');
      }
    }
  };

  const handleRequestNotifications = async () => {
    const granted = await mobileNotificationService.requestPermission();
    setNotifGranted(granted);
    mobileCapabilityService.updateSettings({ enableNativeNotifications: granted });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Mobile App & OS Integration
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Native Share Sheet, Home-screen Widgets, Biometrics & OS Lifecycle
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenShareInbox && (
            <button
              onClick={onOpenShareInbox}
              className="px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors"
            >
              Share Staging
            </button>
          )}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="px-2.5 py-1 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-md transition-colors"
            >
              Run Diagnostics
            </button>
          )}
        </div>
      </div>

      {/* Share Sheet Ingestion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Default Share Destination
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Where incoming text, URLs, images, and files from other apps are saved
            </div>
          </div>
          <select
            value={settings.defaultShareDestination}
            onChange={(e) =>
              mobileCapabilityService.updateSettings({
                defaultShareDestination: e.target.value as any,
              })
            }
            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="inbox">Inbox Folder</option>
            <option value="daily">Today's Daily Note</option>
            <option value="new_note">New Root Note</option>
          </select>
        </div>

        {/* Widget Privacy */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Home-Screen Widget Privacy
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Level of detail displayed on Android AppWidgets and iOS WidgetKit
            </div>
          </div>
          <select
            value={settings.widgetPrivacyLevel}
            onChange={(e) =>
              mobileCapabilityService.updateSettings({
                widgetPrivacyLevel: e.target.value as WidgetPrivacyLevel,
              })
            }
            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="sanitized">Sanitized Summary (Recommended)</option>
            <option value="counts_only">Counts Only (Strict Privacy)</option>
            <option value="full_when_unlocked">Show Titles While Unlocked</option>
          </select>
        </div>

        {/* App Switcher Protection */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              App-Switcher Privacy Screen
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Obscure note content when switching apps or in multitasking preview
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.protectAppSwitcher}
              onChange={(e) =>
                mobileCapabilityService.updateSettings({
                  protectAppSwitcher: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Biometric Convenience Unlock */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-zinc-500" />
              <div>
                <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  Biometric Convenience Unlock
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Unlock using Face ID / Touch ID / Fingerprint via hardware key wrapping
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.biometricUnlockEnabled}
                onChange={handleToggleBiometric}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          {bioError && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg">
              {bioError}
            </div>
          )}
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
            * Master Vault Password remains authoritative as the cryptographic root. Biometric setup is strictly device-local and does not transfer in backups.
          </div>
        </div>

        {/* Background Auto-Lock */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Auto-Lock When Backgrounded
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Lock vault automatically when app is minimized
            </div>
          </div>
          <select
            value={settings.lockOnAppBackground}
            onChange={(e) =>
              mobileCapabilityService.updateSettings({
                lockOnAppBackground: e.target.value as any,
              })
            }
            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="5min">After 5 Minutes</option>
            <option value="1min">After 1 Minute</option>
            <option value="immediately">Immediately</option>
            <option value="never">Never (Inactivity Timer Only)</option>
          </select>
        </div>

        {/* Native Notifications */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Local Scheduled Notifications
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              OS-scheduled alerts for reminders and daily reviews
            </div>
          </div>
          {!notifGranted ? (
            <button
              onClick={handleRequestNotifications}
              className="px-2.5 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors"
            >
              Enable Notifications
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Enabled
            </span>
          )}
        </div>

        {/* Haptics */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Tactile Haptic Feedback
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Subtle vibrations on capture, button actions, and confirmation
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.hapticsEnabled}
              onChange={(e) =>
                mobileCapabilityService.updateSettings({
                  hapticsEnabled: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
