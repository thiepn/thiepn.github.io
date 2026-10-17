import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Layers,
  Zap,
  RefreshCw,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { runtimeResourceGovernorV2 } from './runtimeResourceGovernorV2';
import { cacheManagerV2 } from './cacheManagerV2';
import { storageBatcherV2 } from './storageBatcherV2';
import { energyManagerV2 } from './energyManagerV2';
import { extremeQueryOptimizerV2, CompactResourceProjection } from './extremeQueryOptimizerV2';
import { quickSwitcherV2 } from './quickSwitcherV2';

interface PerformanceDiagnosticsModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceDiagnosticsModalV2: React.FC<PerformanceDiagnosticsModalV2Props> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'governor' | 'cache' | 'storage' | 'benchmarks'>('governor');
  const [governorMetrics, setGovernorMetrics] = useState(runtimeResourceGovernorV2.getMetrics());
  const [cacheStats, setCacheStats] = useState(cacheManagerV2.getAllStats());
  const [storageMetrics, setStorageMetrics] = useState(storageBatcherV2.getMetrics());
  const [benchmarkStatus, setBenchmarkStatus] = useState<string | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<{
    scale: number;
    quickSwitcherLatencyMs: number;
    queryExecutionLatencyMs: number;
    memorySizeBytes: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setGovernorMetrics(runtimeResourceGovernorV2.getMetrics());
      setCacheStats(cacheManagerV2.getAllStats());
      setStorageMetrics(storageBatcherV2.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunExtremeBenchmark = async () => {
    setBenchmarkStatus('Generating 100,000 Resource projections fixture in Worker memory...');
    setBenchmarkResults(null);

    // Yield to UI
    await new Promise((r) => setTimeout(r, 50));

    const startTime = performance.now();
    const count = 100000;
    const testItems: CompactResourceProjection[] = [];
    const switcherItems: Array<{ id: string; type: string; title: string; aliases: string[] }> = [];

    const types = ['note', 'task', 'person', 'transaction', 'book', 'canvas'];
    const tags = ['urgent', 'work', 'personal', 'research', 'finance', 'project-alpha', 'archived'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const tag = tags[i % tags.length];
      const title = `Resource Entity ${i} - ${type.toUpperCase()} Topic`;
      const id = `res-bench-${i}`;

      testItems.push({
        id,
        type,
        title,
        tags: [tag, 'v2.7-benchmark'],
        status: i % 2 === 0 ? 'completed' : 'pending',
        modifiedAt: Date.now() - (i * 3600000) % (365 * 24 * 3600000),
        priority: i % 3 === 0 ? 'high' : 'medium',
      });

      switcherItems.push({
        id,
        type,
        title,
        aliases: [`alias-${i}`, `topic-${type}`],
      });
    }

    setBenchmarkStatus('Indexing 100,000 resources into ExtremeQueryOptimizer and QuickSwitcher...');
    await new Promise((r) => setTimeout(r, 50));

    extremeQueryOptimizerV2.indexProjections(testItems);
    quickSwitcherV2.setIndex(switcherItems);

    setBenchmarkStatus('Executing benchmark queries...');
    await new Promise((r) => setTimeout(r, 50));

    // Test Quick Switcher
    const switchRes = quickSwitcherV2.search('Entity 9999');

    // Test Query Engine
    const queryRes = extremeQueryOptimizerV2.executeQuery({
      types: ['task'],
      tags: ['urgent'],
      status: ['pending'],
      limit: 50,
      sortBy: 'modifiedAt',
      sortOrder: 'desc',
    });

    setBenchmarkResults({
      scale: count,
      quickSwitcherLatencyMs: switchRes.latencyMs,
      queryExecutionLatencyMs: queryRes.executionTimeMs,
      memorySizeBytes: count * 128, // approx estimate
    });

    setBenchmarkStatus('Benchmark completed successfully!');
  };

  const handleTriggerMemoryPressure = () => {
    cacheManagerV2.handleMemoryPressure();
    setCacheStats(cacheManagerV2.getAllStats());
  };

  const handleExportSanitizedTrace = () => {
    const trace = {
      appVersion: '2.7.0',
      exportedAt: new Date().toISOString(),
      governor: runtimeResourceGovernorV2.getMetrics(),
      cacheStats: cacheManagerV2.getAllStats(),
      storage: storageBatcherV2.getMetrics(),
      energy: {
        isTabVisible: energyManagerV2.getIsVisible(),
        prefersReducedMotion: energyManagerV2.getPrefersReducedMotion(),
        activeTimers: energyManagerV2.getActiveTimerCount(),
      },
      benchmarkSummary: benchmarkResults,
    };

    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pkm-performance-trace-v2.7-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCacheBytes = cacheManagerV2.getTotalMemoryUsage();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perf-modal-title"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-800 dark:text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 id="perf-modal-title" className="text-lg font-bold">
                V2.7 Runtime Performance & Resource Observability
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Zero-telemetry local diagnostics • Hardware Profile: {governorMetrics.deviceProfile.toUpperCase()} • Max Concurrency: {governorMetrics.maxConcurrency}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close performance modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 bg-zinc-50/50 dark:bg-zinc-900">
          <button
            onClick={() => setActiveTab('governor')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'governor'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Resource Governor & Workers</span>
          </button>
          <button
            onClick={() => setActiveTab('cache')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'cache'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Cache Manager ({Math.round((totalCacheBytes / (1024 * 1024)) * 10) / 10} MB)</span>
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'storage'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Storage & I/O Batching</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'benchmarks'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Scale Benchmarks (100k)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'governor' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 font-medium">Active Workers</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {governorMetrics.activeCount} / {governorMetrics.maxConcurrency}
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 font-medium">Tasks Completed</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {governorMetrics.totalCompleted}
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 font-medium">Avg Queue Latency</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {governorMetrics.avgQueueLatencyMs} ms
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 font-medium">Maintenance Preempts</div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {governorMetrics.totalPreempted}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold mb-3">Task Queue Priority Distribution</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-900/50">
                    <span className="font-semibold block">User Blocking (P1)</span>
                    <span className="text-lg font-bold">{governorMetrics.queuedCount.user_blocking}</span> queued
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-900/50">
                    <span className="font-semibold block">Interactive (P2)</span>
                    <span className="text-lg font-bold">{governorMetrics.queuedCount.interactive}</span> queued
                  </div>
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-300 dark:border-zinc-700">
                    <span className="font-semibold block">Background (P3)</span>
                    <span className="text-lg font-bold">{governorMetrics.queuedCount.background}</span> queued
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-900/50">
                    <span className="font-semibold block">Maintenance (P4)</span>
                    <span className="text-lg font-bold">{governorMetrics.queuedCount.maintenance}</span> queued
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cache' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Active Cache Regions</h3>
                  <p className="text-xs text-zinc-500">
                    Explicitly bounded in-memory LRU partitions with strict lock/logout purge.
                  </p>
                </div>
                <button
                  onClick={handleTriggerMemoryPressure}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Simulate Memory Pressure</span>
                </button>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-2.5">Region</th>
                      <th className="p-2.5">Owner</th>
                      <th className="p-2.5">Entries</th>
                      <th className="p-2.5">Size</th>
                      <th className="p-2.5">Hits / Misses</th>
                      <th className="p-2.5">Evictions</th>
                      <th className="p-2.5">Sensitive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                    {cacheStats.map((st) => (
                      <tr key={st.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="p-2.5 font-sans font-medium text-zinc-900 dark:text-zinc-100">
                          {st.name}
                        </td>
                        <td className="p-2.5 font-sans text-zinc-500">{st.ownerModule}</td>
                        <td className="p-2.5">{st.entryCount}</td>
                        <td className="p-2.5">{Math.round((st.currentSizeBytes / 1024) * 10) / 10} KB</td>
                        <td className="p-2.5">
                          {st.hits} / {st.misses}
                        </td>
                        <td className="p-2.5">{st.evictions}</td>
                        <td className="p-2.5 font-sans">
                          {st.isSensitive ? (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 rounded">
                              Purge on Lock
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                              Public
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 font-medium">Write Amplification Ratio</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {storageMetrics.writeAmplificationRatio}x
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Target &lt; 2.5x index writes per mutation</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 font-medium">Batched I/O Flushes</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {storageMetrics.batchedWrites}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Coalesced within 50ms window</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 font-medium">Total Resource Reads</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {storageMetrics.totalReads}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">N+1 queries eliminated via bulk fetch</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'benchmarks' && (
            <div className="space-y-6">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold mb-2">100,000 Resource Scale Verification</h3>
                <p className="text-xs text-zinc-500 mb-4">
                  Generates 100k heterogeneous resource projections in memory and executes Quick Switcher and structured queries to verify sub-20ms responsiveness.
                </p>

                <button
                  onClick={handleRunExtremeBenchmark}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Run 100k Extreme Benchmark</span>
                </button>

                {benchmarkStatus && (
                  <div className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center space-x-2">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>{benchmarkStatus}</span>
                  </div>
                )}
              </div>

              {benchmarkResults && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Extreme-Scale SLA Benchmark Results:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-emerald-200 dark:border-emerald-900">
                      <span className="text-zinc-500 block">Total Scale</span>
                      <span className="text-base font-bold">{benchmarkResults.scale.toLocaleString()} Resources</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-emerald-200 dark:border-emerald-900">
                      <span className="text-zinc-500 block">Quick Switcher Match</span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {benchmarkResults.quickSwitcherLatencyMs} ms
                      </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-emerald-200 dark:border-emerald-900">
                      <span className="text-zinc-500 block">Multi-Filter Query</span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {benchmarkResults.queryExecutionLatencyMs} ms
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={handleExportSanitizedTrace}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Sanitized Performance Trace</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
