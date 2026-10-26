import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  FileCode,
  Shield,
  Layers,
  Database
} from 'lucide-react';
import {
  globalSyncDiagnosticsV2,
  globalSyncEngineV2,
  globalDeviceManagerV2,
  globalConflictCenterV2,
  globalAttachmentSyncEngineV2,
  SyncReportV2
} from '../sync';

interface SyncDiagnosticsModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncDiagnosticsModalV2: React.FC<SyncDiagnosticsModalV2Props> = ({
  isOpen,
  onClose,
}) => {
  const [reports, setReports] = useState<SyncReportV2[]>(globalSyncDiagnosticsV2.getRecentReports());
  const [copied, setCopied] = useState(false);
  const [isRebaselining, setIsRebaselining] = useState(false);
  const [rebaselinePreview, setRebaselinePreview] = useState<{
    localUniqueCount: number;
    remoteUniqueCount: number;
    identicalCount: number;
    conflictCount: number;
    tombstoneCount: number;
  } | null>(null);

  useEffect(() => {
    setReports(globalSyncDiagnosticsV2.getRecentReports());
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDevice = globalDeviceManagerV2.getCurrentDevice();
  const transport = globalSyncEngineV2.getActiveTransport();

  const handleCopyBundle = () => {
    const bundle = globalSyncDiagnosticsV2.generateSanitizedDiagnosticBundle({
      deviceId: currentDevice.deviceId,
      deviceName: currentDevice.deviceName,
      protocolVersion: currentDevice.protocolVersion,
      activeTransport: transport.name,
      localResourceCount: globalSyncEngineV2.getAllLocalResources().length,
      tombstoneCount: globalSyncEngineV2.getTombstones().length,
      attachmentCount: globalAttachmentSyncEngineV2.getAllAttachments().length,
      activeConflictsCount: globalConflictCenterV2.getActiveConflicts().length,
    });

    navigator.clipboard.writeText(bundle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreviewRebaseline = () => {
    // Generate dry-run preview against current known remote envelopes
    const preview = globalSyncEngineV2.generateRebaselinePreview([]);
    setRebaselinePreview(preview);
  };

  const handleExecuteRebaseline = async () => {
    setIsRebaselining(true);
    await globalSyncEngineV2.sync({ forceRebaseline: true });
    setIsRebaselining(false);
    setReports(globalSyncDiagnosticsV2.getRecentReports());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        id="sync_diagnostics_modal"
        className="flex flex-col w-full max-w-3xl max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-lg text-purple-700 dark:text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Sync Diagnostics &amp; Continuity
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Telemetry, operation logs, and non-destructive baseline reconciliation
              </p>
            </div>
          </div>
          <button
            id="close_diagnostics_btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Active Transport</div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{transport.name}</div>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Local Resources</div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{globalSyncEngineV2.getAllLocalResources().length}</div>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Tombstones</div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{globalSyncEngineV2.getTombstones().length}</div>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Pending Edits</div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{globalSyncEngineV2.getPendingChangesCount()}</div>
            </div>
          </div>

          {/* Sanitized Support Bundle Export */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Sanitized Diagnostic Support Bundle
              </h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Export telemetry guaranteed free of note bodies, credentials, tokens, and filenames.
              </p>
            </div>
            <button
              id="copy_support_bundle_btn"
              onClick={handleCopyBundle}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Bundle' : 'Copy Sanitized Bundle'}
            </button>
          </div>

          {/* Re-establish Sync Baseline Section */}
          <div className="p-4 border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Re-establish Sync Baseline
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 max-w-lg leading-relaxed">
                  Use when remote Git history has been force-pushed or deep divergence occurs. Reconstructs the 3-way merge baseline without blindly overwriting either side.
                </p>
              </div>
              <button
                id="preview_rebaseline_btn"
                onClick={handlePreviewRebaseline}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors shrink-0"
              >
                Preview Reconciliation
              </button>
            </div>

            {rebaselinePreview && (
              <div className="mt-3 p-3 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded-md text-xs space-y-2">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Baseline Reconciliation Plan:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div>Local Unique Items: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{rebaselinePreview.localUniqueCount}</span></div>
                  <div>Remote Unique Items: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{rebaselinePreview.remoteUniqueCount}</span></div>
                  <div>Identical Matches: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{rebaselinePreview.identicalCount}</span></div>
                  <div>Conflicts Requiring Review: <span className="font-mono font-bold text-amber-600">{rebaselinePreview.conflictCount}</span></div>
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                  <button
                    id="execute_rebaseline_btn"
                    disabled={isRebaselining}
                    onClick={handleExecuteRebaseline}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded text-xs font-semibold"
                  >
                    {isRebaselining ? 'Re-establishing...' : 'Execute Baseline Reconciliation'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Operation Logs */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Recent Sync Runs ({reports.length})
            </h4>
            {reports.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-3 text-center">No recent sync operations recorded.</p>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                {reports.slice(0, 10).map((r) => (
                  <div key={r.operationId} className="p-3 text-xs flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          r.status === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          r.status === 'conflict' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          r.status === 'error' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {r.status}
                        </span>
                        <span className="font-mono text-zinc-500 text-[10px]">{r.operationId}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        {r.resourcesTransferred} transferred • {r.conflictsCount} conflicts • {r.durationMs}ms via {r.transportName}
                      </div>
                      {r.errorMessage && (
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                          {r.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {new Date(r.startedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
