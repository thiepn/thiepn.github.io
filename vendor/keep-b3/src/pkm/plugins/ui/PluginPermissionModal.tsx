/**
 * Phase P41: Plugin Permission Review & Installation Modal
 * Transparent, accessible capability review dialog.
 */

import React, { useState } from 'react';
import { Shield, ShieldAlert, Check, X, AlertTriangle, Cpu, HardDrive, Lock } from 'lucide-react';
import { PluginManifest, PluginPermission } from '../types';
import { getPermissionDefinition } from '../permissions';

interface PluginPermissionModalProps {
  manifest: PluginManifest;
  requestedPermissions: PluginPermission[];
  onConfirm: (grantedPermissions: PluginPermission[]) => void;
  onCancel: () => void;
}

export const PluginPermissionModal: React.FC<PluginPermissionModalProps> = ({
  manifest,
  requestedPermissions,
  onConfirm,
  onCancel,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<PluginPermission[]>(requestedPermissions);

  const togglePermission = (perm: PluginPermission) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const hasHighRisk = requestedPermissions.some(
    (p) => getPermissionDefinition(p).riskLevel === 'high' || getPermissionDefinition(p).riskLevel === 'critical'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-dialog-title"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${hasHighRisk ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
              {hasHighRisk ? <ShieldAlert className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            </div>
            <div>
              <h2 id="permission-dialog-title" className="text-lg font-semibold text-zinc-100">
                Install Plugin: {manifest.name}
              </h2>
              <p className="text-xs text-zinc-400">
                v{manifest.version} • by {manifest.author.name} • ID: <code className="text-zinc-300 font-mono">{manifest.id}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            aria-label="Close permission dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm text-zinc-300">
          {manifest.description && (
            <p className="text-zinc-300 bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/60 leading-relaxed">
              {manifest.description}
            </p>
          )}

          {/* Security & Sandbox Guarantees */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-zinc-800/70 border border-zinc-700/60 p-2.5 rounded-md flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Lock className="w-3.5 h-3.5" /> No Network
              </span>
              <span className="text-zinc-400">External network requests blocked</span>
            </div>
            <div className="bg-zinc-800/70 border border-zinc-700/60 p-2.5 rounded-md flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <Cpu className="w-3.5 h-3.5" /> Sandboxed
              </span>
              <span className="text-zinc-400">Runs in isolated Web Worker</span>
            </div>
            <div className="bg-zinc-800/70 border border-zinc-700/60 p-2.5 rounded-md flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-purple-400 font-medium">
                <HardDrive className="w-3.5 h-3.5" /> Quota Storage
              </span>
              <span className="text-zinc-400">Max 5MB private data</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Permissions Requested ({requestedPermissions.length})
            </h3>

            {requestedPermissions.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">This plugin does not request any additional permissions.</p>
            ) : (
              <div className="space-y-2">
                {requestedPermissions.map((perm) => {
                  const def = getPermissionDefinition(perm);
                  const isChecked = selectedPermissions.includes(perm);

                  return (
                    <div
                      key={perm}
                      onClick={() => togglePermission(perm)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-zinc-800/90 border-zinc-600'
                          : 'bg-zinc-900/50 border-zinc-800 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(perm)}
                        className="mt-1 rounded border-zinc-700 text-indigo-500 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-zinc-200 text-xs">{def.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                              def.riskLevel === 'high'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : def.riskLevel === 'medium'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {def.riskLevel} risk
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{def.humanReadableGrant}</p>
                        {def.warningNote && (
                          <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{def.warningNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedPermissions)}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Grant & Install Plugin
          </button>
        </div>
      </div>
    </div>
  );
};
