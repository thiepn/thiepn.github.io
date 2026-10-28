import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Link2,
  Search,
  RotateCcw,
  Zap,
  CheckCircle2,
  Play,
  Clock,
  Bookmark,
  Database,
  Filter,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { resourceRegistryV2 } from '../core/resource/resourceRegistry';
import { connectionIndexV2 } from '../core/connections/connectionIndex';
import { unifiedQueryEngineV2 } from '../core/query/unifiedQueryEngine';
import { undoFoundationV2, UndoEntry } from '../core/actions/undoFoundation';
import { moduleRegistryV2 } from '../core/modules/moduleRegistry';
import { savedViewRegistryV2 } from '../views/savedViewRegistry';
import { collectionRegistryV2 } from '../collections/v2CollectionRegistry';
import { v2_2BenchmarkRunner, BenchmarkResult } from '../audit/v2_2PerformanceBenchmarks';
import { V2_2_CERTIFICATION_REPORT } from '../audit/v2_2CertificationReport';
import { ReleaseCandidateDiagnosticsModalV2 } from './ReleaseCandidateDiagnosticsModalV2';
import { V2StableReleaseHubModal } from './V2StableReleaseHubModal';
import { V2MaintenanceDiagnosticsModal } from './V2MaintenanceDiagnosticsModal';
import { V2PlatformEcosystemModal } from './V2PlatformEcosystemModal';
import { Wrench, Laptop } from 'lucide-react';

export const V2ObservatoryTab: React.FC = () => {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[] | null>(null);
  const [isRunningBenchmarks, setIsRunningBenchmarks] = useState(false);
  const [isRcModalOpen, setIsRcModalOpen] = useState(false);
  const [isStableHubOpen, setIsStableHubOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isPlatformHubOpen, setIsPlatformHubOpen] = useState(false);

  useEffect(() => {
    setUndoStack(undoFoundationV2.getHistory());
    const unsub = undoFoundationV2.subscribe(() => {
      setUndoStack(undoFoundationV2.getHistory());
    });
    return unsub;
  }, []);

  const runAllV2_2Benchmarks = () => {
    setIsRunningBenchmarks(true);
    setTimeout(() => {
      const res = v2_2BenchmarkRunner.runAllBenchmarks();
      setBenchmarkResults(res);
      setIsRunningBenchmarks(false);
    }, 50);
  };

  const resourceTypes = resourceRegistryV2.getAll();
  const modules = moduleRegistryV2.getAll();
  const totalEdges = connectionIndexV2.getTotalEdgesCount();
  const savedViews = savedViewRegistryV2.getAll();
  const collections = collectionRegistryV2.getAll();

  return (
    <div className="space-y-6 text-sm text-neutral-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            V2.2 Unified Query & Views Architecture Observatory
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time query metrics, 100k benchmarks, Saved Views registry, Collections schemas, and certification report.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlatformHubOpen(true)}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Laptop size={14} />
            <span>Platform Hub</span>
          </button>
          <button
            onClick={() => setIsMaintenanceModalOpen(true)}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Wrench size={14} />
            <span>Maintenance Hub</span>
          </button>
          <button
            onClick={() => setIsStableHubOpen(true)}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldCheck size={14} />
            <span>Stable Hub</span>
          </button>
          <button
            onClick={() => setIsRcModalOpen(true)}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldCheck size={14} />
            <span>RC Hub</span>
          </button>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span>V2.2 Certified ({V2_2_CERTIFICATION_REPORT.totalPassed}/369)</span>
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Resource Types</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold mt-1 text-white">
            {resourceTypes.length}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Core Polymorphic</div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Saved Views</span>
            <Bookmark className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold mt-1 text-white">
            {savedViews.length}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Presets + Custom</div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Collections</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold mt-1 text-white">
            {collections.length}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Schemas & Views</div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Graph Edges</span>
            <Link2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold mt-1 text-white">
            {totalEdges}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">In-Memory Index</div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Active Modules</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold mt-1 text-white">
            {modules.filter((m) => m.isEnabled).length} / {modules.length}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Enabled Domains</div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Undo History</span>
            <RotateCcw className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold mt-1 text-white">
            {undoStack.length}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Undo Stack Depth</div>
        </div>
      </div>

      {/* 100k Benchmark Runner Section */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={14} className="text-amber-400" />
              <span>V2.2 Unified Query Performance Benchmark Suite (100,000 Records)</span>
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Validates memory efficiency, throughput, index-aware filtering, multi-sort, and grouping across 10k to 100k synthetic resources.
            </p>
          </div>
          <button
            onClick={runAllV2_2Benchmarks}
            disabled={isRunningBenchmarks}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunningBenchmarks ? 'Executing Benchmarks...' : 'Run 100k Benchmarks'}</span>
          </button>
        </div>

        {benchmarkResults && (
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {benchmarkResults.map((bm, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-white">{bm.suiteName}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        bm.passed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {bm.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-neutral-400 font-mono">
                    <div className="flex justify-between">
                      <span>Execution Time:</span>
                      <span className="text-white font-bold">{bm.executionTimeMs} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Ceiling:</span>
                      <span>&lt; {bm.targetMs} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Throughput:</span>
                      <span className="text-amber-400">{bm.throughputOpsPerSec.toLocaleString()} ops/sec</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Matches:</span>
                      <span>{bm.matchesFound.toLocaleString()} records</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Saved Views Manifest */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h4 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
          <Bookmark size={14} className="text-blue-400" />
          <span>Registered Saved Views ({savedViews.length})</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2">Name</th>
                <th className="py-2">Presentation</th>
                <th className="py-2">Source Type</th>
                <th className="py-2">Built-In</th>
                <th className="py-2">Filters Defined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {savedViews.map((v) => (
                <tr key={v.id} className="hover:bg-neutral-800/40">
                  <td className="py-2 font-medium text-white">{v.name}</td>
                  <td className="py-2 uppercase font-mono text-neutral-400">{v.presentation.viewType}</td>
                  <td className="py-2 font-mono text-amber-300">{v.source.type}</td>
                  <td className="py-2">{v.isBuiltIn ? '✓ Built-in' : 'Custom'}</td>
                  <td className="py-2 text-neutral-400">
                    {v.query.filter?.criteria.length || 0} criteria
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certification Breakdown */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h4 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>V2.2 Certification Audit Matrix</span>
        </h4>
        <div className="space-y-2">
          {V2_2_CERTIFICATION_REPORT.sections.map((sec) => (
            <div key={sec.id} className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white">{sec.title}</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {sec.status}
                </span>
              </div>
              <ul className="list-disc list-inside text-xs text-neutral-400 space-y-1">
                {sec.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* V2.9 Release Candidate Diagnostics Modal */}
      <ReleaseCandidateDiagnosticsModalV2
        isOpen={isRcModalOpen}
        onClose={() => setIsRcModalOpen(false)}
      />

      {/* V2.10 Final Release Certification & Stable Launch Modal */}
      <V2StableReleaseHubModal
        isOpen={isStableHubOpen}
        onClose={() => setIsStableHubOpen(false)}
      />

      {/* V2.11 Post-Launch Stability & Maintenance Diagnostics Modal */}
      <V2MaintenanceDiagnosticsModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
      />

      {/* V2.12 Native Platform & Ecosystem Hub Modal */}
      <V2PlatformEcosystemModal
        isOpen={isPlatformHubOpen}
        onClose={() => setIsPlatformHubOpen(false)}
      />
    </div>
  );
};
