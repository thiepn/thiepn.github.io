import React, { useState, useEffect } from 'react';
import {
  Monitor,
  HardDrive,
  Bell,
  KeyRound,
  Keyboard,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { desktopCapabilityService } from '../desktopCapabilityService';
import { desktopCredentialStore } from '../desktopCredentialStore';
import { desktopFilesystemWatcher } from '../desktopFilesystemWatcher';
import { DesktopSettingsConfig } from '../desktopTypes';

interface DesktopSettingsCardProps {
  onOpenDiagnostics?: () => void;
}

export const DesktopSettingsCard: React.FC<DesktopSettingsCardProps> = ({ onOpenDiagnostics }) => {
  const [settings, setSettings] = useState<DesktopSettingsConfig>(desktopCapabilityService.getSettings());
  const [isDesktop] = useState<boolean>(desktopCapabilityService.isDesktopApp());
  const [platform] = useState<string>(desktopCapabilityService.getPlatform());
  const [runtime] = useState<string>(desktopCapabilityService.getRuntime());
  const [credentialBackend, setCredentialBackend] = useState<string>(desktopCredentialStore.getBackendName());
  const [watcherStatus, setWatcherStatus] = useState<string>(desktopFilesystemWatcher.getStatus());

  useEffect(() => {
    const unsub = desktopFilesystemWatcher.subscribeStatus((status) => {
      setWatcherStatus(status);
    });
    return unsub;
  }, []);

  const handleToggle = (key: keyof DesktopSettingsConfig) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    desktopCapabilityService.saveSettings(updated);
  };

  const handleShortcutChange = (newShortcut: string) => {
    const updated = { ...settings, globalQuickCaptureShortcut: newShortcut };
    setSettings(updated);
    desktopCapabilityService.saveSettings(updated);
  };

  return (
    <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100">Desktop & OS Integration</h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isDesktop
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                }`}
              >
                {isDesktop ? `Native Shell (${platform.toUpperCase()})` : `Web / PWA (${runtime.toUpperCase()})`}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Configure native background services, global Quick Capture, system tray, and OS credential storage.
            </p>
          </div>
        </div>

        {onOpenDiagnostics && (
          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            Diagnostics
          </button>
        )}
      </div>

      {/* General Native Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Close to Tray */}
        <div className="p-4 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5 pr-3">
            <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Keep Running in Tray</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              When closing window, keep background reminders, sync, and watcher active in system tray.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.closeToTray}
            onChange={() => handleToggle('closeToTray')}
            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
          />
        </div>

        {/* Start at Login */}
        <div className="p-4 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5 pr-3">
            <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Start at System Login</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Launch application minimized to tray on OS startup for continuous reminders.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.startAtLogin}
            onChange={() => handleToggle('startAtLogin')}
            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
          />
        </div>

        {/* Lock on OS Session Lock */}
        <div className="p-4 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5 pr-3">
            <div className="text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Lock Vault on OS Lock
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Automatically lock encrypted vault whenever your computer screen locks.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.lockOnOsSessionLock}
            onChange={() => handleToggle('lockOnOsSessionLock')}
            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
          />
        </div>

        {/* Pause Background Activities */}
        <div className="p-4 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5 pr-3">
            <div className="text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              {settings.pauseBackgroundActivity ? (
                <PauseCircle className="w-4 h-4 text-amber-500" />
              ) : (
                <PlayCircle className="w-4 h-4 text-emerald-500" />
              )}
              Pause Background Tasks
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Temporarily pause background watcher, auto-sync, and scheduled rules to save power.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.pauseBackgroundActivity}
            onChange={() => handleToggle('pauseBackgroundActivity')}
            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Global Quick Capture Shortcut */}
      <div className="p-4 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">Global Quick Capture Shortcut</span>
          </div>
          <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.globalQuickCaptureEnabled}
              onChange={() => handleToggle('globalQuickCaptureEnabled')}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
            />
            Enabled
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={settings.globalQuickCaptureShortcut}
            onChange={(e) => handleShortcutChange(e.target.value)}
            disabled={!settings.globalQuickCaptureEnabled}
            className="flex-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            placeholder="CmdOrCtrl+Shift+Space"
          />
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Press anywhere on OS to open instant markdown capture
          </span>
        </div>
      </div>

      {/* Subsystem Status Indicators */}
      <div className="border-t border-stone-200 dark:border-stone-800 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-stone-100/70 dark:bg-stone-800/40 rounded-xl space-y-1">
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            Filesystem Watcher
          </div>
          <div className="text-xs font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                watcherStatus === 'watching' ? 'bg-emerald-500' : 'bg-stone-400'
              }`}
            />
            {watcherStatus === 'watching' ? 'Active (Real-Time OS)' : 'Periodic / Inactive'}
          </div>
        </div>

        <div className="p-3 bg-stone-100/70 dark:bg-stone-800/40 rounded-xl space-y-1">
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Credential Storage
          </div>
          <div className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
            {credentialBackend}
          </div>
        </div>

        <div className="p-3 bg-stone-100/70 dark:bg-stone-800/40 rounded-xl space-y-1">
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            OS Notifications
          </div>
          <div className="text-xs font-medium text-stone-900 dark:text-stone-100">
            {settings.nativeNotificationsEnabled ? 'Enabled (Lock-Redacted)' : 'Disabled'}
          </div>
        </div>
      </div>
    </div>
  );
};
