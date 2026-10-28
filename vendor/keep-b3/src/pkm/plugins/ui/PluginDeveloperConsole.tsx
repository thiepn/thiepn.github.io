/**
 * Phase P41: Plugin Developer Console & Security Test Harness
 */

import React, { useState } from 'react';
import {
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Play,
  Download,
  Trash2,
  RefreshCw,
  PlusCircle,
  Package,
  FileCode,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { pluginRegistry } from '../registry/pluginRegistry';
import { ALL_SAMPLE_PLUGINS, SamplePluginPackage } from '../samples/samplePlugins';
import { runSecuritySandboxTests, SecurityTestResult } from '../samples/securityTestPlugin';
import { InstalledPlugin, PluginLogEntry } from '../types';

interface PluginDeveloperConsoleProps {
  plugins: InstalledPlugin[];
  onOpenPermissionModal: (sample: SamplePluginPackage) => void;
}

export const PluginDeveloperConsole: React.FC<PluginDeveloperConsoleProps> = ({
  plugins,
  onOpenPermissionModal,
}) => {
  const [selectedPluginId, setSelectedPluginId] = useState<string>(plugins[0]?.manifest.id || '');
  const [securityTestResults, setSecurityTestResults] = useState<SecurityTestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const logs: PluginLogEntry[] = selectedPluginId ? pluginRegistry.getPluginLogs(selectedPluginId) : [];
  const filteredLogs = logs.filter((l) => (logFilter === 'all' ? true : l.level === logFilter));

  const handleRunSecurityTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await runSecuritySandboxTests();
      setSecurityTestResults(res);
    } catch (e: any) {
      console.error('Security test suite failure', e);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleExportDiagnostics = () => {
    if (!selectedPluginId) return;
    const diag = pluginRegistry.getDiagnostics(selectedPluginId);
    if (!diag) return;

    const json = JSON.stringify(diag, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plugin-diagnostic-${selectedPluginId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-sm text-zinc-300">
      {/* 1. Security Sandbox Verification Harness */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-zinc-100">Automated Sandbox Security Verification</h3>
          </div>
          <button
            onClick={handleRunSecurityTests}
            disabled={isRunningTests}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {isRunningTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunningTests ? 'Running Security Tests...' : 'Run Security Test Suite'}
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-3">
          Tests malicious attack vectors: direct IndexedDB access, unauthorized fetch/WebSocket network calls,
          unauthorized capability access, and concurrency race conditions.
        </p>

        {securityTestResults && (
          <div className="space-y-2 mt-3 pt-3 border-t border-zinc-800">
            {securityTestResults.map((test) => (
              <div
                key={test.testId}
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                  test.passed
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-red-950/20 border-red-800/40 text-red-200'
                }`}
              >
                {test.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-100">{test.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-zinc-400 mt-0.5 text-[11px]">{test.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Sample Plugin Quick Loader */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-zinc-100">Reference Sample Packages</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-3">
          Install reference sample plugins into your local sandbox environment for testing and verification.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALL_SAMPLE_PLUGINS.map((sample) => {
            const isInstalled = plugins.some((p) => p.manifest.id === sample.manifest.id);

            return (
              <div
                key={sample.manifest.id}
                className="bg-zinc-800/60 border border-zinc-700/60 rounded-lg p-3 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-zinc-200 text-xs">{sample.manifest.name}</h4>
                    <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                      {sample.manifest.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{sample.manifest.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sample.manifest.permissions.map((p) => (
                      <span key={p} className="text-[9px] font-mono bg-zinc-900/80 text-zinc-400 px-1 py-0.5 rounded border border-zinc-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-zinc-700/40">
                  {isInstalled ? (
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Installed
                    </span>
                  ) : (
                    <button
                      onClick={() => onOpenPermissionModal(sample)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Review & Install
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Plugin Real-time Logs Console */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-zinc-100">Sandbox Logs & Diagnostics</h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPluginId}
              onChange={(e) => setSelectedPluginId(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
            >
              {plugins.length === 0 ? (
                <option value="">No installed plugins</option>
              ) : (
                plugins.map((p) => (
                  <option key={p.manifest.id} value={p.manifest.id}>
                    {p.manifest.name} ({p.manifest.id})
                  </option>
                ))
              )}
            </select>

            <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden bg-zinc-800 text-[11px]">
              {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`px-2 py-1 uppercase font-medium transition-colors ${
                    logFilter === lvl ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {selectedPluginId && (
              <>
                <button
                  onClick={() => pluginRegistry.clearLogs(selectedPluginId)}
                  title="Clear Logs"
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportDiagnostics}
                  title="Export Diagnostics JSON"
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Log Viewer Window */}
        <div className="bg-black/50 border border-zinc-800 rounded-lg p-3 font-mono text-xs max-h-60 overflow-y-auto space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="text-zinc-600 italic">No logs recorded for this plugin.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`px-1 rounded text-[10px] font-bold uppercase shrink-0 ${
                    log.level === 'error'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : log.level === 'warn'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-zinc-300 break-all">{log.message}</span>
                {log.details && (
                  <pre className="text-[10px] text-zinc-500 ml-2 overflow-x-auto">
                    {JSON.stringify(log.details)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
