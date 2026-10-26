import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Trash2,
  FileText,
  DollarSign,
  CheckSquare,
  Activity,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  globalConflictCenterV2,
  SyncConflictV2,
  ResolutionChoiceV2,
  globalSyncEngineV2
} from '../sync';

interface ConflictCenterModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictCenterModalV2: React.FC<ConflictCenterModalV2Props> = ({
  isOpen,
  onClose,
}) => {
  const [conflicts, setConflicts] = useState<SyncConflictV2[]>([]);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<string | null>(null);

  useEffect(() => {
    const unsub = globalConflictCenterV2.subscribe((active) => {
      setConflicts(active);
      if (active.length > 0 && (!selectedConflictId || !active.some(c => c.conflictId === selectedConflictId))) {
        setSelectedConflictId(active[0].conflictId);
      }
    });
    return unsub;
  }, [selectedConflictId]);

  if (!isOpen) return null;

  const currentConflict = conflicts.find(c => c.conflictId === selectedConflictId) || conflicts[0];

  const handleResolve = (choice: ResolutionChoiceV2) => {
    if (!currentConflict) return;

    const result = globalConflictCenterV2.resolveConflict(currentConflict.resourceId, choice);
    if (result.success && result.resolvedEnvelope) {
      if (result.resolvedEnvelope.deleted) {
        globalSyncEngineV2.deleteLocalResource(currentConflict.resourceId, 'Resolved conflict by confirming deletion');
      } else {
        globalSyncEngineV2.saveLocalResource(result.resolvedEnvelope);
      }
      setResolutionStatus(`Resolved "${currentConflict.title}"`);
      setTimeout(() => setResolutionStatus(null), 3000);
      globalSyncEngineV2.sync();
    }
  };

  const getDomainIcon = (type: string) => {
    switch (type) {
      case 'note': return FileText;
      case 'finance': return DollarSign;
      case 'task': return CheckSquare;
      case 'health': return Activity;
      default: return Layers;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        id="conflict_center_modal"
        className="flex flex-col w-full max-w-4xl max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-lg text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Conflict Center
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {conflicts.length === 0
                  ? 'All synchronization conflicts have been resolved.'
                  : `${conflicts.length} item${conflicts.length === 1 ? '' : 's'} require manual resolution`}
              </p>
            </div>
          </div>
          <button
            id="close_conflict_center_btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {conflicts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Zero Conflicts
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              Your vault is clean. All concurrent edits have been safely merged or resolved across your devices.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 divide-x divide-zinc-200 dark:divide-zinc-800">
            {/* Sidebar list of conflicts */}
            <div className="w-64 overflow-y-auto p-2 space-y-1 bg-zinc-50/50 dark:bg-zinc-950/30">
              {conflicts.map((c) => {
                const Icon = getDomainIcon(c.resourceType);
                const isSelected = c.conflictId === (currentConflict?.conflictId);
                return (
                  <button
                    key={c.conflictId}
                    id={`conflict_item_${c.resourceId}`}
                    onClick={() => setSelectedConflictId(c.conflictId)}
                    className={`w-full flex items-start gap-2.5 p-2.5 text-left rounded-lg transition-colors text-xs ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 font-medium'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{c.title}</div>
                      <div className="text-[10px] text-zinc-500 capitalize">{c.conflictType.replace(/_/g, ' ')}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Main Diff & Inspection Pane */}
            {currentConflict && (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                      {currentConflict.conflictType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-zinc-500 uppercase font-mono">
                      ID: {currentConflict.resourceId}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {currentConflict.title}
                  </h3>
                </div>

                {/* Diff View */}
                {currentConflict.conflictType === 'delete_vs_edit' ? (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-lg mb-6">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mb-3">
                      {currentConflict.localEnvelope.deleted
                        ? 'This resource was deleted locally on this device, but edited remotely on another synced device.'
                        : 'This resource was edited locally on this device, but deleted remotely on another synced device.'}
                    </p>
                    <div className="text-xs bg-white dark:bg-zinc-900 p-3 rounded border border-zinc-200 dark:border-zinc-800 font-mono text-zinc-600 dark:text-zinc-400">
                      {currentConflict.localEnvelope.body || currentConflict.remoteEnvelope.body || 'No text content.'}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Local Version */}
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 bg-zinc-50/40 dark:bg-zinc-900/40">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          This Device (Local)
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Rev {currentConflict.localEnvelope.revision}
                        </span>
                      </div>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-zinc-500 text-[10px] uppercase font-bold">Title: </span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{currentConflict.localEnvelope.title}</span>
                        </div>
                        {currentConflict.localEnvelope.body && (
                          <div className="mt-2">
                            <span className="text-zinc-500 text-[10px] uppercase font-bold">Body:</span>
                            <pre className="mt-1 p-2 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 max-h-48 overflow-y-auto">
                              {currentConflict.localEnvelope.body}
                            </pre>
                          </div>
                        )}
                        {currentConflict.localEnvelope.metadata && (
                          <div className="mt-2">
                            <span className="text-zinc-500 text-[10px] uppercase font-bold">Metadata Properties:</span>
                            <pre className="mt-1 p-2 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                              {JSON.stringify(currentConflict.localEnvelope.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remote Version */}
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 bg-zinc-50/40 dark:bg-zinc-900/40">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          Synced Device (Remote)
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Rev {currentConflict.remoteEnvelope.revision}
                        </span>
                      </div>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-zinc-500 text-[10px] uppercase font-bold">Title: </span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{currentConflict.remoteEnvelope.title}</span>
                        </div>
                        {currentConflict.remoteEnvelope.body && (
                          <div className="mt-2">
                            <span className="text-zinc-500 text-[10px] uppercase font-bold">Body:</span>
                            <pre className="mt-1 p-2 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 max-h-48 overflow-y-auto">
                              {currentConflict.remoteEnvelope.body}
                            </pre>
                          </div>
                        )}
                        {currentConflict.remoteEnvelope.metadata && (
                          <div className="mt-2">
                            <span className="text-zinc-500 text-[10px] uppercase font-bold">Metadata Properties:</span>
                            <pre className="mt-1 p-2 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                              {JSON.stringify(currentConflict.remoteEnvelope.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500">
                    Resolutions are journaled and non-destructive.
                  </span>
                  <div className="flex items-center gap-2">
                    {currentConflict.conflictType === 'delete_vs_edit' ? (
                      <>
                        <button
                          id="confirm_delete_btn"
                          onClick={() => handleResolve('keep_deleted')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Confirm Deletion
                        </button>
                        <button
                          id="restore_edit_btn"
                          onClick={() => handleResolve('restore_edit')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium transition-colors"
                        >
                          Restore Edited Version
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          id="keep_local_btn"
                          onClick={() => handleResolve('keep_local')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
                        >
                          Keep Local Version
                        </button>
                        <button
                          id="keep_remote_btn"
                          onClick={() => handleResolve('keep_remote')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
                        >
                          Keep Remote Version
                        </button>
                        <button
                          id="keep_both_btn"
                          onClick={() => handleResolve('keep_both')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Keep Both (Create Copy)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
