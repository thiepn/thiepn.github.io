import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  PauseCircle,
  Laptop,
  Layers,
  ArrowDown,
  ArrowUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  globalSyncEngineV2,
  SyncStateV2,
  SyncReportV2,
  globalConflictCenterV2,
  SyncConflictV2,
  globalDeviceManagerV2
} from '../sync';

interface SyncStatusBadgeV2Props {
  onOpenConflictCenter?: () => void;
  onOpenDeviceManager?: () => void;
  onOpenDiagnostics?: () => void;
}

export const SyncStatusBadgeV2: React.FC<SyncStatusBadgeV2Props> = ({
  onOpenConflictCenter,
  onOpenDeviceManager,
  onOpenDiagnostics,
}) => {
  const [syncState, setSyncState] = useState<SyncStateV2>(globalSyncEngineV2.getState());
  const [lastReport, setLastReport] = useState<SyncReportV2 | undefined>();
  const [activeConflicts, setActiveConflicts] = useState<SyncConflictV2[]>(globalConflictCenterV2.getActiveConflicts());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showPopover, setShowPopover] = useState<boolean>(false);

  useEffect(() => {
    const unsubSync = globalSyncEngineV2.subscribe((state, report) => {
      setSyncState(state);
      if (report) setLastReport(report);
      setIsSyncing(['checking', 'pulling', 'reconciling', 'applying', 'pushing'].includes(state));
    });

    const unsubConflicts = globalConflictCenterV2.subscribe((conflicts) => {
      setActiveConflicts(conflicts);
    });

    return () => {
      unsubSync();
      unsubConflicts();
    };
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    await globalSyncEngineV2.sync();
  };

  const getBadgeConfig = () => {
    if (activeConflicts.length > 0 || syncState === 'conflict') {
      return {
        label: `${activeConflicts.length} Conflict${activeConflicts.length === 1 ? '' : 's'}`,
        color: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
        icon: AlertTriangle,
        spin: false,
      };
    }

    switch (syncState) {
      case 'offline':
        return {
          label: 'Offline (Saved Locally)',
          color: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
          icon: WifiOff,
          spin: false,
        };
      case 'paused':
        return {
          label: 'Sync Paused',
          color: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
          icon: PauseCircle,
          spin: false,
        };
      case 'checking':
        return {
          label: 'Checking for Updates...',
          color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          icon: RefreshCw,
          spin: true,
        };
      case 'pulling':
        return {
          label: 'Pulling Changes...',
          color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          icon: ArrowDown,
          spin: true,
        };
      case 'reconciling':
        return {
          label: 'Reconciling (3-Way)...',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
          icon: Layers,
          spin: true,
        };
      case 'applying':
        return {
          label: 'Applying Changes...',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
          icon: RefreshCw,
          spin: true,
        };
      case 'pushing':
        return {
          label: 'Pushing Changes...',
          color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          icon: ArrowUp,
          spin: true,
        };
      case 'synced':
        return {
          label: 'Synced',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          icon: CheckCircle2,
          spin: false,
        };
      case 'error':
        return {
          label: 'Sync Issue (Safe Locally)',
          color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
          icon: AlertCircle,
          spin: false,
        };
      case 'idle':
      default:
        const pending = globalSyncEngineV2.getPendingChangesCount();
        return {
          label: pending > 0 ? `${pending} Pending Changes` : 'Sync Ready',
          color: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
          icon: RefreshCw,
          spin: false,
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.icon;
  const currentDevice = globalDeviceManagerV2.getCurrentDevice();

  return (
    <div className="relative inline-block text-xs">
      <button
        id="sync_status_badge_btn"
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors select-none ${config.color}`}
        title="Sync Status — Click for details"
        aria-label="Sync status indicator"
      >
        <IconComponent className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
        <span>{config.label}</span>
      </button>

      {showPopover && (
        <div
          id="sync_status_popover"
          className="absolute right-0 mt-1.5 w-72 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 text-zinc-800 dark:text-zinc-200"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <Laptop className="w-3.5 h-3.5 text-zinc-500" />
              <span>{currentDevice.deviceName}</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {globalSyncEngineV2.getActiveTransport().name}
            </span>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2.5 leading-relaxed">
            {syncState === 'offline' && 'Working offline. All changes are saved locally and will sync when connected.'}
            {syncState === 'synced' && 'Vault is fully up to date across your devices.'}
            {syncState === 'error' && lastReport?.errorMessage}
            {activeConflicts.length > 0 && 'Concurrent edits detected. Choose which versions to keep in Conflict Center.'}
            {syncState === 'idle' && 'Local vault ready. Changes will synchronize automatically.'}
          </p>

          <div className="flex flex-col gap-1.5 pt-1">
            {activeConflicts.length > 0 && (
              <button
                id="popover_open_conflicts_btn"
                onClick={() => {
                  setShowPopover(false);
                  onOpenConflictCenter?.();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Review Conflicts ({activeConflicts.length})
              </button>
            )}

            <button
              id="popover_sync_now_btn"
              disabled={isSyncing}
              onClick={handleManualSync}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing Vault...' : 'Sync Now'}
            </button>

            <div className="flex gap-1.5 mt-1">
              <button
                id="popover_devices_btn"
                onClick={() => {
                  setShowPopover(false);
                  onOpenDeviceManager?.();
                }}
                className="flex-1 py-1 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-[11px] text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
              >
                Devices
              </button>

              <button
                id="popover_diagnostics_btn"
                onClick={() => {
                  setShowPopover(false);
                  onOpenDiagnostics?.();
                }}
                className="flex-1 py-1 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-[11px] text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
              >
                Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
