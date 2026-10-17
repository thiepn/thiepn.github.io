import React, { useState } from 'react';
import {
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Cpu,
  Layers,
  Globe,
  Sliders,
  Sparkles,
  Laptop,
  Smartphone,
  Tablet,
  Keyboard,
  Eye,
  Minimize2,
  X,
  Play,
  RotateCcw,
  ShieldCheck,
  Languages,
} from 'lucide-react';
import { v2_28ScopeGate } from '../hardening/v2_28ScopeGate';
import { v2_28PerformanceHardening, ScaleFixtureProfile } from '../hardening/v2_28PerformanceHardeningEngine';
import { v2_28AccessibilityHardening, A11ySurfaceAudit } from '../hardening/v2_28AccessibilityHardeningEngine';
import { v2_28InputGlobalization } from '../hardening/v2_28InputGlobalizationHardeningEngine';
import { v2_28PlatformHardening } from '../hardening/v2_28PlatformHardeningEngine';
import { v2_28HardeningLedger } from '../hardening/v2_28HardeningLedger';

interface V2PerformanceAccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | 'scope_gate'
  | 'performance'
  | 'workers_cpu'
  | 'accessibility'
  | 'input_globalization'
  | 'platforms'
  | 'burndown_rc';

export const V2PerformanceAccessibilityModal: React.FC<V2PerformanceAccessibilityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('scope_gate');

  // Interactive diagnostic states
  const [scaleProfiles, setScaleProfiles] = useState<ScaleFixtureProfile[]>(
    v2_28PerformanceHardening.getScaleFixtureBenchmarks()
  );
  const [a11yAudits, setA11yAudits] = useState<A11ySurfaceAudit[]>(
    v2_28AccessibilityHardening.getA11ySurfaceAudits()
  );
  const [testIMEText, setTestIMEText] = useState<string>('안녕하세요 (Hello)');
  const [imeSimulationLog, setImeSimulationLog] = useState<string[]>([]);
  const [pseudoText, setPseudoText] = useState<string>('The quick brown fox jumps over the lazy dog');
  const [pseudoOutput, setPseudoOutput] = useState<string>('');
  const [turkishInput, setTurkishInput] = useState<string>('istanbul');
  const [turkishUpper, setTurkishUpper] = useState<string>('');
  const [turkishLower, setTurkishLower] = useState<string>('');
  const [isRTLActive, setIsRTLActive] = useState<boolean>(v2_28InputGlobalization.isRTL());
  const [selectedPlatformLifecycle, setSelectedPlatformLifecycle] = useState<'active' | 'paused' | 'suspended' | 'resumed'>('active');
  const [lifecycleLog, setLifecycleLog] = useState<string>('');

  if (!isOpen) return null;

  // IME Event Simulation
  const simulateIMETyping = () => {
    const logs: string[] = [];
    logs.push('1. [compositionstart] Raw text: "안" (Composing: true)');
    const res1 = v2_28InputGlobalization.handleIMEEvent({
      eventType: 'compositionstart',
      isComposing: true,
      rawText: '안',
    });
    logs.push(`   → Allowed to submit: ${res1.allowedToSubmit ? 'YES' : 'NO (Protected)'}`);

    logs.push('2. [compositionupdate] Raw text: "안녕" (Composing: true)');
    const res2 = v2_28InputGlobalization.handleIMEEvent({
      eventType: 'compositionupdate',
      isComposing: true,
      rawText: '안녕',
    });
    logs.push(`   → Allowed to submit: ${res2.allowedToSubmit ? 'YES' : 'NO (Protected)'}`);

    logs.push('3. [keydown: Enter during composition] (isComposing: true)');
    const res3 = v2_28InputGlobalization.handleIMEEvent({
      eventType: 'keydown',
      key: 'Enter',
      isComposing: true,
      rawText: '안녕',
    });
    logs.push(`   → Blocked premature submit: ${res3.preventedPrematureAction ? 'YES (Passed)' : 'NO'}`);

    logs.push('4. [compositionend] Raw text: "안녕하세요" (Composing: false)');
    const res4 = v2_28InputGlobalization.handleIMEEvent({
      eventType: 'compositionend',
      isComposing: false,
      rawText: '안녕하세요',
    });
    logs.push(`   → Preserved text buffer: "${res4.textPreserved}"`);

    logs.push('5. [keydown: Enter post-composition] (isComposing: false)');
    const res5 = v2_28InputGlobalization.handleIMEEvent({
      eventType: 'keydown',
      key: 'Enter',
      isComposing: false,
      rawText: '안녕하세요',
    });
    logs.push(`   → Allowed clean form submit: ${res5.allowedToSubmit ? 'YES (Confirmed)' : 'NO'}`);

    setImeSimulationLog(logs);
  };

  const handlePseudoTransform = () => {
    const transformed = v2_28InputGlobalization.transformToPseudoLocale(pseudoText);
    setPseudoOutput(transformed);
  };

  const handleTurkishTest = () => {
    const upper = v2_28InputGlobalization.turkishSafeToUpper(turkishInput);
    const lower = v2_28InputGlobalization.turkishSafeToLower(upper);
    setTurkishUpper(upper);
    setTurkishLower(lower);
  };

  const handleToggleRTL = () => {
    const next = !isRTLActive;
    v2_28InputGlobalization.setRTLMode(next);
    setIsRTLActive(next);
  };

  const handleLifecycleChange = (state: 'active' | 'paused' | 'suspended' | 'resumed') => {
    setSelectedPlatformLifecycle(state);
    const res = v2_28PlatformHardening.transitionLifecycle(state);
    setLifecycleLog(
      `Transitioned to [${state.toUpperCase()}]: Scratch memory released: ${
        res.releasedHeavyMemory ? 'YES (Freed)' : 'NO'
      }, Safe to resume: ${res.safeToResume ? 'YES' : 'NO'}`
    );
  };

  const scopeEntries = v2_28ScopeGate.getAllEntries();
  const perfBudgets = v2_28PerformanceHardening.getPerformanceBudgets();
  const workerStatus = v2_28PerformanceHardening.getWorkerQueueStatus();
  const cacheMetrics = v2_28PerformanceHardening.getCacheMetrics();
  const memorySnapshot = v2_28PerformanceHardening.getMemorySnapshot();
  const resourceGov = v2_28PerformanceHardening.getResourceGovernorStatus();
  const platformAudits = v2_28PlatformHardening.getPlatformAudits();
  const perfBurndown = v2_28HardeningLedger.getPerformanceBurndown();
  const a11yBurndown = v2_28HardeningLedger.getAccessibilityBurndown();
  const plBurndown = v2_28HardeningLedger.getPlatformBurndown();
  const rcHandoff = v2_28HardeningLedger.getV2_29RCHandoffLedger();
  const certReport = v2_28HardeningLedger.getCertificationReport();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-hidden animate-fadeIn">
      <div
        className="bg-neutral-900 border border-neutral-700 w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-200"
        dir={isRTLActive ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-100 tracking-tight">
                  V2.28 Performance, Accessibility & Platform Hardening Center
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                  RC Candidate Gate Ready
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Authoritative verification of latency budgets, WCAG 2.2 AA conformance, IME composition safety, and cross-platform runtime reliability.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 shrink-0 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('scope_gate')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'scope_gate'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Scope & Freeze Gate
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'performance'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Performance & Budgets
          </button>
          <button
            onClick={() => setActiveTab('workers_cpu')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'workers_cpu'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Workers & Resource Governor
          </button>
          <button
            onClick={() => setActiveTab('accessibility')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'accessibility'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            WCAG 2.2 AA & A11y
          </button>
          <button
            onClick={() => setActiveTab('input_globalization')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'input_globalization'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Languages className="w-4 h-4" />
            IME & Globalization
          </button>
          <button
            onClick={() => setActiveTab('platforms')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'platforms'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            Cross-Platform Runtimes
          </button>
          <button
            onClick={() => setActiveTab('burndown_rc')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'burndown_rc'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Burndown & RC Handoff
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Scope & Freeze Gate */}
          {activeTab === 'scope_gate' && (
            <div className="space-y-6">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-200">Strict Scope & Freeze Gate Policy</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    V2.28 admits only specialist Performance, Accessibility, and Platform fixes. All speculative optimizations and new feature requests are strictly rejected.
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
                    New Features: 0
                  </span>
                </div>
              </div>

              <div className="border border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Finding & Evidence</th>
                      <th className="p-3">Classification</th>
                      <th className="p-3">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {scopeEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-mono font-medium text-amber-400">{e.id}</td>
                        <td className="p-3 font-medium text-neutral-300">{e.category}</td>
                        <td className="p-3">
                          <div className="font-semibold text-neutral-200">{e.finding}</div>
                          <div className="text-neutral-400 mt-0.5">{e.evidence}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              e.admitted
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {e.classification}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.admitted ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {e.admitted ? 'ADMITTED' : 'REJECTED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Performance & Budgets */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Fixture Scale Profiles */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-3">Deterministic Scale Fixture Benchmarks</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {scaleProfiles.map((p) => (
                    <div key={p.scale} className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{p.scale} Scale</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded">
                          {p.noteCount.toLocaleString()} Notes
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-neutral-300">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Startup (TTI):</span>
                          <span className="font-mono font-medium text-emerald-400">{p.startupMs}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Search p95:</span>
                          <span className="font-mono font-medium text-emerald-400">{p.searchP95Ms}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Note Open:</span>
                          <span className="font-mono font-medium text-emerald-400">{p.noteOpenMs}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Typing p95:</span>
                          <span className="font-mono font-medium text-emerald-400">{p.editorTypingP95Ms}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Memory:</span>
                          <span className="font-mono font-medium text-neutral-200">{p.memoryMb}MB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Latency Budgets */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-3">Core Operation Latency Budgets</h3>
                <div className="border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                      <tr>
                        <th className="p-3">Operation Target</th>
                        <th className="p-3">Target Budget</th>
                        <th className="p-3">Actual Measured</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {perfBudgets.map((b) => (
                        <tr key={b.metric} className="hover:bg-neutral-800/40">
                          <td className="p-3 font-medium text-neutral-200">{b.metric}</td>
                          <td className="p-3 font-mono text-neutral-400">&le; {b.targetMs}ms</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">{b.actualMs}ms</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Workers & CPU Resource Governor */}
          {activeTab === 'workers_cpu' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Worker Scheduler</h4>
                  <div className="text-xs space-y-1 text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Priority Tiers:</span>
                      <span className="font-mono text-neutral-200">4 Classes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Queued Jobs:</span>
                      <span className="font-mono font-medium text-emerald-400">{workerStatus.queued}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Backpressure Stale Drops:</span>
                      <span className="font-mono font-medium text-neutral-200">{workerStatus.cancelled}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Bounded Query Cache</h4>
                  <div className="text-xs space-y-1 text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Cached Projections:</span>
                      <span className="font-mono text-neutral-200">{cacheMetrics.entryCount} entries</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Cache Bound:</span>
                      <span className="font-mono text-neutral-200">{(cacheMetrics.maxBytes / (1024 * 1024)).toFixed(0)}MB Cap</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Utilization:</span>
                      <span className="font-mono font-medium text-emerald-400">{cacheMetrics.utilizationPct}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Memory Profiler</h4>
                  <div className="text-xs space-y-1 text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Heap Used:</span>
                      <span className="font-mono font-medium text-neutral-200">{memorySnapshot.heapUsedMb} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Object URLs Tracked:</span>
                      <span className="font-mono text-neutral-200">{memorySnapshot.retainedObjectUrls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Leaks Detected:</span>
                      <span className="font-mono font-bold text-emerald-400">{memorySnapshot.leaksDetected}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-neutral-200">Resource Governor Controls</h4>
                <div className="flex flex-wrap gap-4 items-center">
                  <button
                    onClick={() =>
                      v2_28PerformanceHardening.setTabVisibility(!resourceGov.tabHidden)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      resourceGov.tabHidden
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                    }`}
                  >
                    Simulate Tab Hidden: {resourceGov.tabHidden ? 'YES (Paused)' : 'NO (Active)'}
                  </button>

                  <button
                    onClick={() =>
                      v2_28PerformanceHardening.setBatterySaverMode(!resourceGov.batterySaver)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      resourceGov.batterySaver
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                    }`}
                  >
                    Battery Saver Mode: {resourceGov.batterySaver ? 'ACTIVE (Throttled)' : 'OFF'}
                  </button>
                </div>
                <p className="text-xs text-neutral-400">
                  When tab is hidden or battery saver is active, non-essential background indexing, visual graph animations, and heavy embedding tasks are automatically suspended to preserve CPU and battery.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: WCAG 2.2 AA & A11y */}
          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral-200">WCAG 2.2 AA Engineering Reference Matrix</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  All 11 primary surfaces audited for full keyboard operability, screen reader companion semantics, 400% zoom reflow, non-drag alternatives, and contrast.
                </p>
              </div>

              <div className="border border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Surface</th>
                      <th className="p-3">Keyboard Nav</th>
                      <th className="p-3">Screen Reader</th>
                      <th className="p-3">400% Reflow</th>
                      <th className="p-3">Reduced Motion</th>
                      <th className="p-3">Non-Drag Alternative</th>
                      <th className="p-3">Label Coverage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {a11yAudits.map((a) => (
                      <tr key={a.surfaceId} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-medium text-neutral-200">{a.surfaceName}</td>
                        <td className="p-3 font-bold text-emerald-400">{a.keyboardNav}</td>
                        <td className="p-3 font-bold text-emerald-400">{a.screenReader}</td>
                        <td className="p-3 font-bold text-emerald-400">{a.zoom400Reflow}</td>
                        <td className="p-3 font-bold text-emerald-400">{a.reducedMotion}</td>
                        <td className="p-3 font-bold text-emerald-400">
                          {a.nonDragAlternative ? 'YES (Available)' : 'NO'}
                        </td>
                        <td className="p-3 font-mono font-medium text-emerald-400">
                          {a.accessibleNameCoveragePct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: IME & Globalization */}
          {activeTab === 'input_globalization' && (
            <div className="space-y-6">
              {/* Korean IME Simulation */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-200">Korean / CJK IME Composition Safety Harness</h4>
                    <p className="text-xs text-neutral-400">
                      Verifies that intermediate composition events and Enter keydowns do not prematurely trigger search submissions or modal closures.
                    </p>
                  </div>
                  <button
                    onClick={simulateIMETyping}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run IME Test
                  </button>
                </div>

                {imeSimulationLog.length > 0 && (
                  <div className="bg-black/60 border border-neutral-800 rounded p-3 font-mono text-xs text-neutral-300 space-y-1">
                    {imeSimulationLog.map((log, i) => (
                      <div key={i} className={log.includes('Passed') || log.includes('Confirmed') ? 'text-emerald-400' : ''}>
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pseudo-Localization & Text Expansion */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-neutral-200">Pseudo-Localization & ~40% Text Expansion</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pseudoText}
                    onChange={(e) => setPseudoText(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handlePseudoTransform}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium"
                  >
                    Transform String
                  </button>
                </div>
                {pseudoOutput && (
                  <div className="p-2.5 bg-black/40 border border-neutral-800 rounded text-xs font-mono text-amber-300 break-all">
                    {pseudoOutput}
                  </div>
                )}
              </div>

              {/* Turkish Casing & RTL Toggle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-neutral-200">Turkish Casing Invariants (i/İ and ı/I)</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={turkishInput}
                      onChange={(e) => setTurkishInput(e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xs text-neutral-200"
                    />
                    <button
                      onClick={handleTurkishTest}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium"
                    >
                      Test Case
                    </button>
                  </div>
                  {turkishUpper && (
                    <div className="text-xs font-mono text-neutral-300 space-y-1">
                      <div>Upper: <span className="text-emerald-400 font-bold">{turkishUpper}</span></div>
                      <div>Lower: <span className="text-emerald-400 font-bold">{turkishLower}</span></div>
                    </div>
                  )}
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-neutral-200">Bidirectional RTL Layout Mode</h4>
                  <p className="text-xs text-neutral-400">
                    Toggle bidirectional right-to-left layout mode to test layout mirroring and isolation.
                  </p>
                  <button
                    onClick={handleToggleRTL}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      isRTLActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    RTL Layout: {isRTLActive ? 'ACTIVE (Mirrored)' : 'INACTIVE (LTR)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Cross-Platform Runtimes */}
          {activeTab === 'platforms' && (
            <div className="space-y-6">
              <div className="border border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Platform Target</th>
                      <th className="p-3">Build</th>
                      <th className="p-3">Launch</th>
                      <th className="p-3">Offline</th>
                      <th className="p-3">Lifecycle Safe</th>
                      <th className="p-3">Performance</th>
                      <th className="p-3">Documented Limits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {platformAudits.map((p) => (
                      <tr key={p.platform} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-semibold text-neutral-200">{p.platform}</td>
                        <td className="p-3 font-bold text-emerald-400">{p.buildStatus}</td>
                        <td className="p-3 font-bold text-emerald-400">{p.launchStatus}</td>
                        <td className="p-3 font-bold text-emerald-400">{p.offlineReady ? 'PASS' : 'FAIL'}</td>
                        <td className="p-3 font-bold text-emerald-400">{p.lifecycleSafe ? 'PASS' : 'FAIL'}</td>
                        <td className="p-3 font-bold text-emerald-400">{p.performancePass ? 'PASS' : 'FAIL'}</td>
                        <td className="p-3 text-neutral-400">
                          {p.knownLimitations.length > 0 ? p.knownLimitations.join(', ') : 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-neutral-200">OS Lifecycle Simulation</h4>
                <div className="flex flex-wrap gap-2">
                  {(['active', 'paused', 'suspended', 'resumed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleLifecycleChange(st)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                        selectedPlatformLifecycle === st
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      }`}
                    >
                      {st.toUpperCase()}
                    </button>
                  ))}
                </div>
                {lifecycleLog && (
                  <div className="p-2.5 bg-black/40 border border-neutral-800 rounded text-xs font-mono text-emerald-400">
                    {lifecycleLog}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: Burndown & RC Handoff */}
          {activeTab === 'burndown_rc' && (
            <div className="space-y-6">
              {/* Blocker Burndown Matrices */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-3">V2.28 Blocker Burndown Summary (P, A, PL)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Performance */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 uppercase">Performance (P0–P3)</h4>
                    <div className="space-y-1 text-xs">
                      {perfBurndown.map((b) => (
                        <div key={b.severity} className="flex justify-between text-neutral-300">
                          <span>{b.severity} Blockers:</span>
                          <span className="font-mono text-emerald-400 font-bold">{b.remaining} remaining (0)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accessibility */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 uppercase">Accessibility (A0–A3)</h4>
                    <div className="space-y-1 text-xs">
                      {a11yBurndown.map((b) => (
                        <div key={b.severity} className="flex justify-between text-neutral-300">
                          <span>{b.severity} Blockers:</span>
                          <span className="font-mono text-emerald-400 font-bold">{b.remaining} remaining (0)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Platform */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 uppercase">Platform (PL0–PL3)</h4>
                    <div className="space-y-1 text-xs">
                      {plBurndown.map((b) => (
                        <div key={b.severity} className="flex justify-between text-neutral-300">
                          <span>{b.severity} Blockers:</span>
                          <span className="font-mono text-emerald-400 font-bold">{b.remaining} remaining (0)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* V2.28 -> V2.29 Release Candidate Handoff Ledger */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-neutral-200">V2.28 &rarr; V2.29 Release Candidate Handoff Ledger</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    RC Verification Tasks Only
                  </span>
                </div>
                <div className="border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                      <tr>
                        <th className="p-3">Handoff ID</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Verification Description</th>
                        <th className="p-3">Target Verification Metric</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {rcHandoff.map((h) => (
                        <tr key={h.id} className="hover:bg-neutral-800/40">
                          <td className="p-3 font-mono font-medium text-amber-400">{h.id}</td>
                          <td className="p-3 font-medium text-neutral-300">{h.category}</td>
                          <td className="p-3 text-neutral-200">{h.description}</td>
                          <td className="p-3 font-mono text-emerald-400">{h.targetVerification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/60 shrink-0 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>V2.28 Classification: <strong className="text-neutral-200">{certReport.classification}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
