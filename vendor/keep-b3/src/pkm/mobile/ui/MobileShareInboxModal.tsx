/**
 * P47 — Mobile Share Staging Inbox Modal
 * 
 * Inspects, reviews, and drains incoming shares captured while app/vault was locked.
 */

import React, { useState, useEffect } from 'react';
import { X, Share2, RefreshCw, Trash2, CheckCircle2, AlertCircle, FileText, Link, Image, File, Lock } from 'lucide-react';
import { mobileShareService } from '../mobileShareService';
import { MobileSharePayload } from '../mobileTypes';
import { Note, Folder, AppSettings } from '../../../types';

interface MobileShareInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  settings: AppSettings;
  isVaultLocked: boolean;
  createNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  saveNote: (note: Note) => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<void>;
  openNote?: (id: string, title?: string) => void;
}

export const MobileShareInboxModal: React.FC<MobileShareInboxModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  settings,
  isVaultLocked,
  createNote,
  saveNote,
  createFolder,
  openNote,
}) => {
  const [stagedItems, setStagedItems] = useState<MobileSharePayload[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStagedItems(mobileShareService.getStagedShares());
    const unsub = mobileShareService.subscribe(() => {
      setStagedItems(mobileShareService.getStagedShares());
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrainAll = async () => {
    if (isVaultLocked) {
      setResultMessage('Unlock vault before ingesting pending shares.');
      return;
    }
    setIsIngesting(true);
    setResultMessage(null);
    const res = await mobileShareService.drainPendingShares({
      notes,
      folders,
      settings,
      isVaultLocked,
      createNote,
      saveNote,
      createFolder,
      openNote,
    });
    setIsIngesting(false);
    if (res.errors.length > 0) {
      setResultMessage(`Ingested ${res.ingestedCount} item(s) with errors: ${res.errors.join(', ')}`);
    } else {
      setResultMessage(`Successfully committed ${res.ingestedCount} item(s) to canonical vault.`);
    }
  };

  const handleRemove = (id: string) => {
    mobileShareService.removeStagedShare(id);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Link className="w-4 h-4 text-sky-500" />;
      case 'image':
        return <Image className="w-4 h-4 text-emerald-500" />;
      case 'pdf':
      case 'file':
        return <File className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Mobile Share Staging Queue
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Incoming shares from Android Intents, iOS Extensions & Share Target
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isVaultLocked && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Vault is currently locked. Staged shares remain safely held in app-private storage until you unlock.
              </span>
            </div>
          )}

          {resultMessage && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-lg text-indigo-800 dark:text-indigo-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resultMessage}</span>
            </div>
          )}

          {stagedItems.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 space-y-2">
              <Share2 className="w-8 h-8 mx-auto stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
              <p className="text-xs font-medium">Staging queue is empty</p>
              <p className="text-[11px]">Items shared from other apps will appear here if captured offline or while locked.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stagedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg text-xs"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-3">
                    <div className="p-1.5 bg-white dark:bg-zinc-700 rounded border border-zinc-200 dark:border-zinc-600 shrink-0 mt-0.5">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {item.title || item.fileName || item.url || 'Shared Text'}
                      </div>
                      {item.url && (
                        <div className="text-[11px] text-sky-600 dark:text-sky-400 truncate mt-0.5">
                          {item.url}
                        </div>
                      )}
                      {item.text && !item.url && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                          {item.text}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400">
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span className="capitalize">{item.type}</span>
                        {item.sourceApp && (
                          <>
                            <span>•</span>
                            <span>{item.sourceApp}</span>
                          </>
                        )}
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            item.status === 'committed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : item.status === 'failed'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => mobileShareService.clearAllStagedShares()}
            disabled={stagedItems.length === 0}
            className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 disabled:opacity-40"
          >
            Clear All
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDrainAll}
              disabled={stagedItems.length === 0 || isIngesting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
              Ingest All to Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
