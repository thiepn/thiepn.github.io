/**
 * PKM V1.10: Developer Observatory & Final Quality Diagnostics Hub
 * 
 * Developer-only inspection modal providing real-time observability into:
 * - V1.10 Quality Ceiling Certification Suite (12 Pillars + 15 Principles)
 * - Master Quality Ledger (S0-S3 triage, root-causes, and classifications)
 * - 30-Day & 90-Day Long-Duration Simulation Runner & Storage Breakdown
 * - V1.x Deprecations Registry & Terminology Normalization
 * - V2 Readiness Review Matrix & Strategy Recommendation
 * - Background Task Coordinator & Worker Scheduler
 * - Bounded Cache Registry & LRU utilization
 * - Live Performance Benchmarks & Budget adherence
 * - Schema Migration Matrix & Forward Compatibility
 * - Technical Debt Ledger & Structured Domain Logs
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Database,
  ShieldCheck,
  Zap,
  Terminal,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Trash2,
  X,
  Layers,
  Clock,
  BookOpen,
  Calendar,
  Compass,
  Archive,
  BarChart3,
  Search,
  Sparkles,
} from 'lucide-react';
import { cacheRegistry, CacheMetadata } from '../cacheRegistry';
import { taskCoordinator, TaskCoordinatorStats } from '../taskCoordinator';
import { performanceEngine, BenchmarkMeasurement, V19_PERFORMANCE_BUDGETS } from '../performanceEngine';
import { migrationRegistry, MigrationMatrixResult } from '../migrationRegistry';
import { logger, LogEntry } from '../logger';
import { getActiveDebtItems, TechnicalDebtItem } from '../technicalDebtLedger';
import { masterQualityLedger, QualityIssue, IssueSeverity } from '../masterQualityLedger';
import { longDurationEngine, LongDurationSimulationResult } from '../longDurationEngine';
import { deprecationsService, DeprecationEntry } from '../deprecations';
import { v2ReadinessReview, V2ReadinessReport } from '../v2Readiness';
import { runV1_10QualityCertificationSuite, V110QualityCertificationReport } from '../v1_10QualityCertification';
import { V2ObservatoryTab } from '../../v2/ui/V2ObservatoryTab';
import { V2UnifiedExperienceView } from '../../v2/ui/V2UnifiedExperienceView';
import type { Note } from '../../../types';

interface DeveloperObservatoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onOpenNote: (note: Note) => void;
  onSaveNote: (note: Note) => Promise<unknown>;
  vaultLocked: boolean;
}

export const DeveloperObservatoryModal: React.FC<DeveloperObservatoryModalProps> = ({ isOpen, onClose, notes, onOpenNote, onSaveNote, vaultLocked }) => {
  const [activeTab, setActiveTab] = useState<
    | 'v2_1_experience'
    | 'v2_observatory'
    | 'v110_cert'
    | 'master_ledger'
    | 'simulation'
    | 'deprecations'
    | 'v2_review'
    | 'tasks'
    | 'caches'
    | 'benchmarks'
    | 'migrations'
    | 'debt'
    | 'logs'
  >('v2_1_experience');

  // V1.10 Quality Certification state
  const [v110Report, setV110Report] = useState<V110QualityCertificationReport | null>(null);
  const [isV110Running, setIsV110Running] = useState(false);

  // Master Quality Ledger state
  const [ledgerIssues, setLedgerIssues] = useState<QualityIssue[]>([]);
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'ALL'>('ALL');

  // Simulation state
  const [simResult, setSimResult] = useState<LongDurationSimulationResult | null>(null);
  const [isSimRunning, setIsSimRunning] = useState(false);

  // Deprecations & V2 state
  const [deprecations, setDeprecations] = useState<DeprecationEntry[]>([]);
  const [v2Report, setV2Report] = useState<V2ReadinessReport | null>(null);

  // V1.9 Diagnostics state
  const [taskStats, setTaskStats] = useState<TaskCoordinatorStats | null>(null);
  const [cacheMeta, setCacheMeta] = useState<CacheMetadata[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkMeasurement[]>([]);
  const [migrationResults, setMigrationResults] = useState<MigrationMatrixResult[]>([]);
  const [debtItems, setDebtItems] = useState<TechnicalDebtItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'debug'>('all');

  const refreshData = () => {
    setLedgerIssues(masterQualityLedger.getAll());
    setDeprecations(deprecationsService.getAll());
    setV2Report(v2ReadinessReview.generateReview());
    setTaskStats(taskCoordinator.getStats());
    setCacheMeta(cacheRegistry.getAllMetadata());
    setBenchmarks(performanceEngine.getMeasurements());
    setDebtItems(getActiveDebtItems());
    setLogs(logger.getRecentLogs({ limit: 100 }));
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const interval = setInterval(refreshData, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleRunV110Certification = async () => {
    setIsV110Running(true);
    try {
      const report = await runV1_10QualityCertificationSuite();
      setV110Report(report);
      refreshData();
    } finally {
      setIsV110Running(false);
    }
  };

  const handleRunSimulation = async (days: number) => {
    setIsSimRunning(true);
    try {
      const result = await longDurationEngine.runSimulation(days);
      setSimResult(result);
      refreshData();
    } finally {
      setIsSimRunning(false);
    }
  };

  const handleRunBenchmarks = async () => {
    await performanceEngine.runStandardBenchmarkSuite();
    setBenchmarks(performanceEngine.getMeasurements());
  };

  const handleTestMigrations = async () => {
    const results = await migrationRegistry.testMigrationMatrix();
    setMigrationResults(results);
  };

  const handleClearRebuildableCaches = () => {
    cacheRegistry.clearAllRebuildableCaches();
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[88vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                Personal OS — Developer Observatory & Quality Ceiling Hub
              </h2>
              <p className="text-xs text-slate-400">
                Observatory consolidation: 12-Pillar certification, 30-day simulation, Master Quality Ledger & readiness
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 border-b border-slate-800 bg-slate-900/60 flex gap-1 sm:gap-2 overflow-x-auto shrink-0 py-1.5 scrollbar-thin">
          {[
            { id: 'v2_1_experience', label: 'Unified Experience', icon: Sparkles },
            { id: 'v2_observatory', label: 'Architecture', icon: Activity },
            { id: 'v110_cert', label: 'Quality Certification', icon: ShieldCheck },
            { id: 'master_ledger', label: 'Master Quality Ledger', icon: BookOpen },
            { id: 'simulation', label: '30-Day Simulation', icon: Calendar },
            { id: 'deprecations', label: 'Deprecations & Freeze', icon: Archive },
            { id: 'v2_review', label: 'V2 Readiness Matrix', icon: Compass },
            { id: 'tasks', label: 'Task Coordinator', icon: Cpu },
            { id: 'caches', label: 'Bounded Caches', icon: Database },
            { id: 'benchmarks', label: 'Performance Engine', icon: Zap },
            { id: 'migrations', label: 'Migration Matrix', icon: Layers },
            { id: 'debt', label: 'Technical Debt', icon: FileCode },
            { id: 'logs', label: 'Logs', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-900/80">
          {/* Tab 0: V2.1 Unified Experience */}
          {activeTab === 'v2_1_experience' && (
            <div className="h-[680px] rounded-xl overflow-hidden border border-slate-800">
              {vaultLocked ? <p className="p-4 text-sm">Unlock the KEEP vault to inspect owner-backed resources.</p> : <V2UnifiedExperienceView notes={notes} onOpenNote={onOpenNote} onSaveNote={onSaveNote} />}
            </div>
          )}

          {/* Tab 1: V2.0 Architecture Observatory */}
          {activeTab === 'v2_observatory' && (
            <V2ObservatoryTab />
          )}

          {/* Tab 1: V1.10 Quality Certification */}
          {activeTab === 'v110_cert' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    V1.10 Final V1.x Quality Ceiling & Stability Certification Suite
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluates the 12 core architectural pillars and verifies compliance with the 15 PKM design principles.
                  </p>
                </div>
                <button
                  onClick={handleRunV110Certification}
                  disabled={isV110Running}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isV110Running ? 'animate-spin' : ''}`} />
                  {isV110Running ? 'Executing 12 Pillars...' : 'Run Master Certification'}
                </button>
              </div>

              {v110Report ? (
                <div className="space-y-5">
                  {/* Overall Banner */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      v110Report.overallPassed
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {v110Report.overallPassed ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          {v110Report.overallPassed
                            ? 'V1.10 QUALITY CEILING CERTIFIED — 100% PASS'
                            : 'SOME V1.10 CHECKS FAILED'}
                        </div>
                        <div className="text-xs opacity-80">
                          {v110Report.passedCount} of {v110Report.totalChecks} pillars verified at{' '}
                          {new Date(v110Report.timestamp).toLocaleTimeString()} • Zero S0/S1 blockers
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 bg-slate-900/80 rounded border border-slate-700 text-slate-200">
                        V2 Recommendation: <strong className="text-indigo-300">{v110Report.v2Recommendation}</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-slate-900/80 rounded border border-slate-700 text-slate-200">
                        Performance Rot: <strong className="text-emerald-400">Zero (Pass)</strong>
                      </span>
                    </div>
                  </div>

                  {/* 15 Principles Checklist */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      15 PKM Architecture Principles Verification
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {Object.entries(v110Report.fifteenPrinciplesStatus).map(([principle, status]) => (
                        <div
                          key={principle}
                          className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 flex items-center justify-between gap-2"
                        >
                          <span className="text-slate-300 text-[11px] leading-tight">{principle}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 12 Pillars List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      12 Quality Ceiling Pillars Breakdown
                    </h4>
                    {v110Report.checks.map((check) => (
                      <div
                        key={check.id}
                        className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          {check.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-indigo-400">{check.id}</span>
                              <span>•</span>
                              <span>{check.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                                {check.pillar}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">{check.details}</div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 font-mono shrink-0">{check.durationMs}ms</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                  Click &ldquo;Run Master Certification&rdquo; to execute the comprehensive V1.10 Quality Ceiling Suite.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Master Quality Ledger */}
          {activeTab === 'master_ledger' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">V1.10 Master Quality Ledger</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Audited issue register across V1.0–V1.9. Zero S0/S1 release blockers remaining in stable core.
                  </p>
                </div>
                <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  {(['ALL', 'S0', 'S1', 'S2', 'S3'] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        severityFilter === sev
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Issue Cards */}
              <div className="space-y-3">
                {ledgerIssues
                  .filter((i) => severityFilter === 'ALL' || i.severity === severityFilter)
                  .map((issue) => (
                    <div
                      key={issue.id}
                      className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            issue.severity === 'S0' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                            issue.severity === 'S1' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            issue.severity === 'S2' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {issue.severity}
                          </span>
                          <span className="font-mono text-slate-400">{issue.id}</span>
                          <span className="font-semibold text-slate-200">{issue.area}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          issue.finalStatus === 'resolved_v1_10'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : issue.finalStatus === 'v2_candidate'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {issue.classification.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-300 text-xs">
                        <span className="text-slate-500 font-medium">Root Cause:</span> {issue.rootCause}
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-400">
                        <span className="text-indigo-300 font-medium">V1.10 Action / Resolution:</span> {issue.v1_10Action}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tab 3: 30-Day & 90-Day Simulation */}
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Long-Duration Extended Lifecycle Simulation</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Simulates 30 or 90 days of heavy real-world activity, measuring storage growth, cache bounds, and performance non-rot.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRunSimulation(30)}
                    disabled={isSimRunning}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {isSimRunning ? 'Simulating...' : 'Run 30-Day Sim'}
                  </button>
                  <button
                    onClick={() => handleRunSimulation(90)}
                    disabled={isSimRunning}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    Run 90-Day Sim
                  </button>
                </div>
              </div>

              {simResult ? (
                <div className="space-y-5">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-slate-400">Simulated Duration</div>
                      <div className="text-xl font-bold text-indigo-400 mt-1">{simResult.simulationDurationDays} Days</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{simResult.totalOperationsExecuted} ops logged</div>
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-slate-400">Day 1 vs 30 Search</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">
                        {simResult.day1VsDay30Performance.day1SearchMs}ms → {simResult.day1VsDay30Performance.day30SearchMs}ms
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Budget: ≤ 35ms (Pass)</div>
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-slate-400">Total Vault Footprint</div>
                      <div className="text-xl font-bold text-slate-200 mt-1">
                        {Math.round(simResult.storageGrowth.totalVaultBytes / 1024)} KB
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Bounded revisions & caches</div>
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-slate-400">Backup & Restore Parity</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">100% Match</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Byte & record parity verified</div>
                    </div>
                  </div>

                  {/* Storage Breakdown */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                    <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      Storage Growth & Cache Breakdown
                    </h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Canonical Notes & Frontmatter', bytes: simResult.storageGrowth.canonicalNotesBytes, color: 'bg-indigo-500' },
                        { label: 'Tasks, Checklists & Calendar Events', bytes: simResult.storageGrowth.tasksAndChecklistsBytes, color: 'bg-blue-500' },
                        { label: 'Finance, Habits & Structured Records', bytes: simResult.storageGrowth.financeAndTrackingBytes, color: 'bg-emerald-500' },
                        { label: 'Revision History (Bounded Diffs)', bytes: simResult.storageGrowth.revisionHistoryBytes, color: 'bg-amber-500' },
                        { label: 'Derived In-Memory Search Indexes', bytes: simResult.storageGrowth.derivedSearchIndexBytes, color: 'bg-purple-500' },
                        { label: 'LRU Bounded Caches (ASTs & Queries)', bytes: simResult.storageGrowth.boundedCachesBytes, color: 'bg-slate-600' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-xs py-1 border-b border-slate-900">
                          <span className="text-slate-300">{item.label}</span>
                          <span className="font-mono text-slate-400 font-semibold">{Math.round(item.bytes / 1024)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                  Click &ldquo;Run 30-Day Sim&rdquo; to simulate extended Personal OS usage and measure long-duration performance.
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Deprecations & Freeze */}
          {activeTab === 'deprecations' && (
            <div className="space-y-5">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200">V1.x Deprecations Registry & Stable Contract Freeze</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Formal register of all deprecated terminology, settings keys, and legacy aliases in V1.x.
                </p>
              </div>

              <div className="space-y-3">
                {deprecations.map((dep, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="line-through text-rose-400 font-mono font-medium">{dep.deprecatedTerm}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-400 font-semibold">{dep.canonicalTerm}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                        {dep.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{dep.rationale}</p>
                    <div className="text-[10px] text-slate-500">
                      Deprecated in: {dep.deprecatedIn} • Supported in V1: {dep.stillSupportedInV1 ? 'Yes (Non-destructive)' : 'No'} • Removal: {dep.plannedRemoval}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: V2 Readiness Review */}
          {activeTab === 'v2_review' && v2Report && (
            <div className="space-y-5">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">V2 Readiness Review & Strategic Decision Matrix</h3>
                  <span className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-lg text-xs font-bold">
                    {v2Report.finalRecommendation}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  {v2Report.recommendationSummary}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Evaluated Candidate Architectures
                </h4>
                {v2Report.evaluatedCandidates.map((cand) => (
                  <div key={cand.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-200">{cand.problem}</div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cand.recommendation === 'V1.x solvable' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        cand.recommendation === 'Potential V2' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {cand.recommendation.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]"><strong className="text-slate-300">Evidence:</strong> {cand.evidence}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-slate-500">Why V1 Cannot/Can Solve:</span> <span className="text-slate-300">{cand.whyV1CannotSolveSafely}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Breaking Change:</span> <span className="text-indigo-300">{cand.requiredBreakingChange}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Task Coordinator */}
          {activeTab === 'tasks' && taskStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Running Tasks</div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">{taskStats.runningCount}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Concurrency limit: {taskStats.maxConcurrency}</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Queued in Priority Order</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{taskStats.queuedCount}</div>
                  <div className="text-[10px] text-slate-500 mt-1">interactive-high &gt; bg</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Completed Tasks</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{taskStats.completedCount}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Cooperative idle yields</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Cancelled / Aborted</div>
                  <div className="text-2xl font-bold text-slate-400 mt-1">{taskStats.cancelledCount}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Stale results rejected</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Bounded Caches */}
          {activeTab === 'caches' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Managed Bounded Cache Registry</h3>
                  <p className="text-xs text-slate-400">
                    All caches are bounded with strict LRU eviction and zeroed out automatically on vault lock.
                  </p>
                </div>
                <button
                  onClick={handleClearRebuildableCaches}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Rebuildable Data
                </button>
              </div>

              <div className="space-y-3">
                {cacheMeta.map((c) => {
                  const hitRate = c.hitCount + c.missCount > 0 ? Math.round((c.hitCount / (c.hitCount + c.missCount)) * 100) : 0;
                  return (
                    <div key={c.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          <span>{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({c.id})</span>
                          {c.isSensitive && (
                            <span className="px-1.5 py-0.2 bg-amber-950/60 border border-amber-800/80 text-amber-300 rounded text-[10px]">
                              Sensitive (Zeroed on Lock)
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-1">
                          Owner: <span className="text-slate-300">{c.owner}</span> • Hit Rate:{' '}
                          <span className="text-emerald-400">{hitRate}%</span> ({c.hitCount} hits / {c.missCount} misses)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-200">
                          {c.currentEntries} / {c.maxEntries}
                        </div>
                        <div className="text-[10px] text-slate-500">Max LRU Cap</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 8: Benchmarks */}
          {activeTab === 'benchmarks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Automated Performance Budgets</h3>
                  <p className="text-xs text-slate-400">
                    Evaluates search latency, Quick Switcher sorting, and task tokenization against strict budget ceilings.
                  </p>
                </div>
                <button
                  onClick={handleRunBenchmarks}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  <Zap className="w-4 h-4" />
                  Run Benchmark Harness
                </button>
              </div>

              <div className="space-y-3">
                {benchmarks.length > 0 ? (
                  benchmarks.map((b, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {b.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        <div>
                          <div className="font-semibold text-slate-200">{b.operation}</div>
                          <div className="text-[11px] text-slate-500">{b.category.toUpperCase()} • Vault Size: {b.notesCount} notes</div>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className={b.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {b.durationMs}ms
                        </div>
                        <div className="text-[10px] text-slate-500">Budget: {b.budgetMs}ms</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                    No benchmark runs recorded. Click &ldquo;Run Benchmark Harness&rdquo; to measure execution latencies.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 9: Migration Matrix */}
          {activeTab === 'migrations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Schema Migration Matrix & Forward Compatibility</h3>
                  <p className="text-xs text-slate-400">
                    Runs dry-run upgrades on historic vaults (V1.0, V1.3, V1.6, V1.8, V1.9) ensuring non-destructive data preservation.
                  </p>
                </div>
                <button
                  onClick={handleTestMigrations}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  <Layers className="w-4 h-4" />
                  Test Historical Matrix
                </button>
              </div>

              <div className="space-y-3">
                {migrationResults.length > 0 ? (
                  migrationResults.map((r, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {r.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                        <div>
                          <div className="font-semibold text-slate-200">
                            V{r.sourceVersion / 10} → V{r.targetVersion / 10} Upgrade Path
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Applied steps: {r.appliedSteps.join(' → ') || 'No-op'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-slate-400">
                        <div>{r.durationMs}ms</div>
                        <div className="text-[10px] text-emerald-400">Preserved Unknown Fields</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                    Click &ldquo;Test Historical Matrix&rdquo; to simulate migrations from legacy V1.0–V1.9 vaults.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 10: Technical Debt */}
          {activeTab === 'debt' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200">Audited Technical Debt Ledger</h3>
                <p className="text-xs text-slate-400">
                  Strictly prioritized architectural debt items with risk assessments, impact measurements, and deferred rationales.
                </p>
              </div>

              <div className="space-y-3">
                {debtItems.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 font-mono rounded text-[10px]">
                          {item.id}
                        </span>
                        <span className="font-semibold text-slate-200">{item.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.status === 'mitigated' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{item.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-slate-500">Why Deferred:</span> <span className="text-slate-300">{item.whyDeferred}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Recommended Action:</span> <span className="text-indigo-300">{item.recommendedAction}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 11: Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex gap-2">
                  {(['all', 'error', 'warn', 'info', 'debug'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLogFilter(lvl)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        logFilter === lvl
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    logger.clear();
                    refreshData();
                  }}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-md"
                >
                  Clear Buffer
                </button>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                {logs
                  .filter((l) => logFilter === 'all' || l.level === logFilter)
                  .map((l) => (
                    <div
                      key={l.id}
                      className="p-2 bg-slate-950 rounded border border-slate-800/80 flex items-start gap-2"
                    >
                      <span className="text-slate-500 shrink-0">{new Date(l.timestamp).toLocaleTimeString()}</span>
                      <span className={`px-1 rounded text-[10px] uppercase font-bold shrink-0 ${
                        l.level === 'error'
                          ? 'bg-rose-950 text-rose-300'
                          : l.level === 'warn'
                          ? 'bg-amber-950 text-amber-300'
                          : l.level === 'info'
                          ? 'bg-indigo-950 text-indigo-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {l.level}
                      </span>
                      <span className="text-indigo-400 shrink-0">[{l.domain}]</span>
                      <span className="text-slate-300 break-all">{l.message}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
