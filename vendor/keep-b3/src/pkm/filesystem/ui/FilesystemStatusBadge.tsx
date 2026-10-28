/**
 * Phase P45: Filesystem Status Badge UI
 */

import React, { useState, useEffect } from 'react';
import {
  FolderCheck,
  FolderSync,
  AlertTriangle,
  FolderLock,
  FolderX,
  HardDrive,
} from 'lucide-react';
import { filesystemBridgeService } from '../filesystemBridgeService';
import { FilesystemBridgeStatus } from '../filesystemTypes';

interface FilesystemStatusBadgeProps {
  onOpenSettings: () => void;
  onOpenConflicts?: () => void;
}

export const FilesystemStatusBadge: React.FC<FilesystemStatusBadgeProps> = ({
  onOpenSettings,
  onOpenConflicts,
}) => {
  const [status, setStatus] = useState<FilesystemBridgeStatus>(
    filesystemBridgeService.getStatus()
  );
  const [conflictCount, setConflictCount] = useState<number>(
    filesystemBridgeService.getConflicts().length
  );

  useEffect(() => {
    const unsubscribe = filesystemBridgeService.subscribe(() => {
      setStatus(filesystemBridgeService.getStatus());
      setConflictCount(filesystemBridgeService.getConflicts().length);
    });
    return unsubscribe;
  }, []);

  if (status === 'Disconnected') {
    return null; // Do not clutter users who haven't connected a folder
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'Up to Date':
        return {
          icon: <FolderCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          label: 'Folder Mirror: Up to Date',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'Syncing':
        return {
          icon: <FolderSync className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />,
          label: 'Mirroring…',
          bgColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'Conflicts':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
          label: `Folder: ${conflictCount} Conflict${conflictCount === 1 ? '' : 's'}`,
          bgColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-medium',
        };
      case 'Permission Required':
        return {
          icon: <FolderLock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          label: 'Folder: Permission Required',
          bgColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'Error':
      case 'Unavailable':
        return {
          icon: <FolderX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
          label: 'Folder Unavailable',
          bgColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      default:
        return {
          icon: <HardDrive className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />,
          label: `Folder: ${status}`,
          bgColor: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700',
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <button
      id="filesystem-status-badge-button"
      onClick={() => {
        if (status === 'Conflicts' && onOpenConflicts) {
          onOpenConflicts();
        } else {
          onOpenSettings();
        }
      }}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-md border transition-colors shadow-xs ${display.bgColor}`}
      title="Filesystem Vault Bridge Status (Click to inspect)"
      aria-label={display.label}
    >
      {display.icon}
      <span>{display.label}</span>
    </button>
  );
};
