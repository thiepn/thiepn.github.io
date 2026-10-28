import React, { useState, useEffect, useRef } from 'react';
import {
  FolderSync,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  GitBranch,
  KeyRound,
  WifiOff,
  ChevronDown,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { remoteSyncManager } from './remoteSyncManager';
import { SyncState, SyncStatusDetails } from './remoteGitTypes';
import { PortableVaultData } from './portableVaultTypes';

interface SyncStatusIndicatorProps {
  localVault: PortableVaultData;
  onOpenSyncModal: () => void;
  onOpenConflictModal?: () => void;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  localVault,
  onOpenSyncModal,
  onOpenConflictModal,
  className = '',
}) => {
  const [details, setDetails] = useState<SyncStatusDetails>(() =>
    remoteSyncManager.getStatusDetails(localVault)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to remote sync status changes
    const unsubscribe = remoteSyncManager.addStatusListener((_state) => {
      setDetails(remoteSyncManager.getStatusDetails(localVault));
    });

    // Update details periodically or when localVault notes change
    setDetails(remoteSyncManager.getStatusDetails(localVault));

    return () => {
      unsubscribe();
    };
  }, [localVault]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleQuickCheck = async () => {
    setIsChecking(true);
    try {
      await remoteSyncManager.checkSyncStatus(localVault);
    } finally {
      setIsChecking(false);
    }
  };

  const handleQuickPull = async () => {
    setIsOpen(false);
    onOpenSyncModal();
  };

  const renderBadgeContent = () => {
    if (!details.isConfigured) {
      return (
        <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
          <FolderSync className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px] font-medium">Sync: Off</span>
        </span>
      );
    }

    if (!details.isAuthenticated) {
      return (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px] font-semibold">Auth Needed</span>
        </span>
      );
    }

    if (details.state === 'offline') {
      return (
        <span className="flex items-center gap-1 text-stone-400">
          <WifiOff className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px]">Offline</span>
        </span>
      );
    }

    if (details.state === 'syncing' || details.state === 'syncing_pull' || details.state === 'syncing_push' || isChecking) {
      return (
        <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden xl:inline text-[11px] font-medium">
            {details.state === 'syncing_push' ? 'Pushing…' : details.state === 'syncing_pull' ? 'Pulling…' : 'Syncing…'}
          </span>
        </span>
      );
    }

    if (details.state === 'conflict' || details.unresolvedConflictsCount > 0) {
      return (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-100/80 dark:bg-red-950/60 px-1.5 py-0.5 rounded-md">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px] font-bold">
            {details.unresolvedConflictsCount} Conflict{details.unresolvedConflictsCount !== 1 ? 's' : ''}
          </span>
        </span>
      );
    }

    if (details.state === 'diverged') {
      return (
        <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
          <GitBranch className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px] font-semibold">Diverged</span>
        </span>
      );
    }

    if (details.state === 'local_ahead' || details.unpushedChangesCount > 0) {
      return (
        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden xl:inline text-[11px] font-medium">
            {details.unpushedChangesCount} Local
          </span>
        </span>
      );
    }

    if (details.state === 'remote_ahead') {
      return (
        <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
          <ArrowDown className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px] font-medium">Update Ready</span>
        </span>
      );
    }

    if (details.state === 'error') {
      return (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px] font-medium">Sync Error</span>
        </span>
      );
    }

    // Clean / Synced
    return (
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden xl:inline text-[11px] font-medium">Synced</span>
      </span>
    );
  };

  const getStatusDescription = () => {
    if (!details.isConfigured) return 'Remote sync is not configured yet.';
    if (!details.isAuthenticated) return 'Authentication token required to sync.';
    if (details.state === 'conflict') return `${details.unresolvedConflictsCount} unresolved merge conflict(s) require attention.`;
    if (details.state === 'diverged') return 'Both local vault and remote repo have new changes. Pull & merge recommended.';
    if (details.state === 'local_ahead') return `${details.unpushedChangesCount} local note change(s) ready to push.`;
    if (details.state === 'remote_ahead') return 'New remote commits available. Pull to synchronize.';
    if (details.state === 'synced') return 'Your local vault is completely synchronized with remote.';
    return details.message || 'Remote sync idle';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        id="btn-global-sync-status"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-colors flex items-center gap-1.5 text-xs shadow-xs focus-visible:ring-2 focus-visible:ring-amber-500"
        title="Sync Status & Quick Actions"
        aria-label="Sync Status"
      >
        {renderBadgeContent()}
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-200">
              <FolderSync className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Git Sync Status</span>
            </div>
            {details.lastSyncedCommitSha && (
              <span className="font-mono text-[10px] text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                {details.lastSyncedCommitSha.slice(0, 7)}
              </span>
            )}
          </div>

          {/* Status Details */}
          <div className="space-y-1.5">
            <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-[11px]">
              {getStatusDescription()}
            </p>

            {details.lastSyncedAt && (
              <div className="text-[10px] text-stone-600 dark:text-stone-400">
                Last synced: {new Date(details.lastSyncedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Conflict Action Banner if conflicts present */}
          {details.unresolvedConflictsCount > 0 && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 space-y-1.5">
              <div className="flex items-center gap-1 text-red-800 dark:text-red-300 font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Merge Conflicts Detected</span>
              </div>
              <p className="text-[10px] text-red-700 dark:text-red-400">
                Non-destructive 3-way merge preserved local data.
              </p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenConflictModal) onOpenConflictModal();
                  else onOpenSyncModal();
                }}
                className="w-full py-1 px-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] transition-colors"
              >
                Resolve Conflicts
              </button>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="space-y-1 pt-1">
            {details.isConfigured && details.isAuthenticated && (
              <button
                onClick={handleQuickCheck}
                disabled={isChecking}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700/70 text-stone-700 dark:text-stone-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  Check Remote Updates
                </span>
                <span className="text-[10px] text-stone-600 dark:text-stone-400">Fetch HEAD</span>
              </button>
            )}

            <button
              onClick={handleQuickPull}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-medium transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FolderSync className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Open Sync Center & History
              </span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
