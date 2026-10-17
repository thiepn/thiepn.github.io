/**
 * V2.25 — Platform & Feature Completion Freeze Center Modal
 * 
 * Interactive inspection surface for:
 * 1. Overview & Formal Feature Freeze Declaration
 * 2. Authoritative Platform Capability Matrix (Web, PWA, Desktop, Mobile, Tablet)
 * 3. Scope & Feasibility Gate (15 Admission Rules, Candidate Gap Ledger)
 * 4. Feature Flag Registry & UI Control Audit (Zero Limbo, Zero Placeholders)
 * 5. Frozen Feature Manifest (Core, Knowledge, Domains, Automations, Sync, Backup)
 * 6. Hardening Handoff Ledger (V2.26-V2.30 Blocker Elimination & Performance)
 * 7. Live Certification Test Suite Runner
 */

import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
  Sparkles,
  Search,
  FileText,
  Layers,
  Zap,
  Play,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  v2_25ScopeGate,
  CandidateGapItem,
} from '../release/v2_25ScopeAndFeasibilityGate';
import {
  v2_25PlatformMatrixService,
  PlatformId,
  PlatformCapabilityRow,
} from '../release/v2_25PlatformCapabilityMatrix';
import {
  v2_25FeatureFlagRegistry,
  FeatureFlagAuditEntry,
} from '../release/v2_25FeatureFlagRegistry';
import {
  v2FeatureFreezeManifestService,
  FrozenFeatureEntry,
} from '../release/v2FeatureFreezeManifest';
import {
  v2_25HardeningHandoffService,
  HardeningHandoffItem,
} from '../release/v2_25HardeningHandoffLedger';
import {
  runV2_25PlatformFeatureFreezeCertificationTests,
  V2_25TestResult,
} from '../../__tests__/v2_25PlatformFeatureFreezeCertification.test';

interface V2PlatformFeatureFreezeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | 'overview'
  | 'matrix'
  | 'gate'
  | 'flags'
  | 'manifest'
  | 'hardening'
  | 'certification';

export const V2PlatformFeatureFreezeModal: React.FC<V2PlatformFeatureFreezeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('web');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [copiedMatrix, setCopiedMatrix] = useState(false);
  const [certResults, setCertResults] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: V2_25TestResult[];
  } | null>(null);
  const [isRunningCert, setIsRunningCert] = useState(false);

  // Cached datasets
  const capabilities = useMemo(() => v2_25PlatformMatrixService.getAllCapabilities(), []);
  const criteria = useMemo(() => v2_25ScopeGate.getAdmissionCriteria(), []);
  const candidateLedger = useMemo(() => v2_25ScopeGate.getCandidateGapLedger(), []);
  const featureFlags = useMemo(() => v2_25FeatureFlagRegistry.getAllFeatureFlags(), []);
  const frozenManifest = useMemo(() => v2FeatureFreezeManifestService.getManifest(), []);
  const hardeningItems = useMemo(() => v2_25HardeningHandoffService.getHandoffItems(), []);
  const freezeDecl = useMemo(() => v2FeatureFreezeManifestService.getFreezeDeclaration(), []);

  // Filtered matrix rows
  const filteredMatrix = useMemo(() => {
    return capabilities.filter(
      (c) =>
        c.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        c.description.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        c.capabilityId.toLowerCase().includes(matrixSearch.toLowerCase())
    );
  }, [capabilities, matrixSearch]);

  const runCertification = () => {
    setIsRunningCert(true);
    setTimeout(() => {
      const res = runV2_25PlatformFeatureFreezeCertificationTests();
      setCertResults({
        total: res.total,
        passed: res.passed,
        failed: res.failed,
        results: res.results,
      });
      setIsRunningCert(false);
    }, 150);
  };

  const handleCopyMarkdownMatrix = () => {
    const md = v2_25PlatformMatrixService.generateMarkdownMatrix();
    navigator.clipboard.writeText(md);
    setCopiedMatrix(true);
    setTimeout(() => setCopiedMatrix(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[88vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/70 border border-indigo-700/50 rounded-lg text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  V2.25 Platform & Feature Completion Freeze
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  FEATURE DEVELOPMENT CLOSED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative platform capability matrix, scope gate, frozen product manifest, and hardening ledger.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950 flex gap-2 overflow-x-auto text-xs font-medium">
          {[
            { id: 'overview', label: 'Overview & Freeze', icon: Lock },
            { id: 'matrix', label: 'Platform Matrix', icon: Monitor },
            { id: 'gate', label: 'Scope Gate', icon: ShieldCheck },
            { id: 'flags', label: 'Feature Flags', icon: Sliders },
            { id: 'manifest', label: 'Freeze Manifest', icon: Layers },
            { id: 'hardening', label: 'Hardening Ledger', icon: Zap },
            { id: 'certification', label: 'Certification Suite', icon: Play },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">

          {/* TAB 1: OVERVIEW & FREEZE */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-4xl">
              <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/40 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Formal Feature Freeze Status: Active & Permanent</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Phase <strong>V2.25</strong> marks the permanent closure of feature development for the Personal OS V2 series.
                  All core and ecosystem features (V2.21 Core, V2.22 Personal OS, V2.23 Automations/Intelligence, V2.24 Interoperability, and V2.25 Platforms)
                  are feature-complete. Subsequent phases (V2.26 through V2.30) are strictly reserved for hardening, performance, accessibility, defect elimination, and release certification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Allowed in V2.26 – V2.30 (Hardening)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {freezeDecl.allowedChangesInNextPhases.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider">
                    <XCircle className="w-4 h-4" />
                    <span>Strictly Disallowed (No Scope Expansion)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {freezeDecl.disallowedChangesInNextPhases.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                  <div className="text-2xl font-bold text-white">17</div>
                  <div className="text-[11px] text-slate-400">Platform Capabilities</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                  <div className="text-2xl font-bold text-emerald-400">8</div>
                  <div className="text-[11px] text-slate-400">Target Form Factors</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                  <div className="text-2xl font-bold text-indigo-400">0</div>
                  <div className="text-[11px] text-slate-400">Stable Placeholders</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                  <div className="text-2xl font-bold text-amber-400">100%</div>
                  <div className="text-[11px] text-slate-400">Local-First Autonomous</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORM CAPABILITY MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 w-full sm:w-72 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-md">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search capabilities..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={handleCopyMarkdownMatrix}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium text-slate-200 transition-colors"
                  >
                    {copiedMatrix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedMatrix ? 'Copied MD Table' : 'Copy Markdown Matrix'}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-300 font-semibold">
                        <th className="py-3 px-4 min-w-[200px]">Capability</th>
                        <th className="py-3 px-2 text-center min-w-[70px]">Web</th>
                        <th className="py-3 px-2 text-center min-w-[70px]">PWA</th>
                        <th className="py-3 px-2 text-center min-w-[70px]">Win</th>
                        <th className="py-3 px-2 text-center min-w-[70px]">macOS</th>
                        <th className="py-3 px-2 text-center min-w-[70px]">Linux</th>
                        <th className="py-3 px-2 text-center min-w-[70px]">Android</th>
                        <th className="py-3 px-2 text-center min-w-[70px]">iOS</th>
                        <th className="py-3 px-2 text-center min-w-[70px]">Tablet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredMatrix.map((row) => {
                        const renderBadge = (lvl: string) => {
                          if (lvl === 'Supported') {
                            return <span className="text-emerald-400 font-medium">✓ Full</span>;
                          }
                          if (lvl === 'Supported with limitation') {
                            return <span className="text-amber-400 font-medium">⚠️ Limit</span>;
                          }
                          if (lvl === 'Experimental') {
                            return <span className="text-indigo-400 font-medium">🧪 Exp.</span>;
                          }
                          if (lvl === 'Unsupported') {
                            return <span className="text-rose-400 font-medium">✕ Unsup</span>;
                          }
                          return <span className="text-slate-500 font-medium">— N/A</span>;
                        };

                        return (
                          <tr key={row.capabilityId} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-100">{row.name}</div>
                              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{row.description}</div>
                            </td>
                            <td className="py-3 px-2 text-center">{renderBadge(row.web)}</td>
                            <td className="py-3 px-2 text-center">{renderBadge(row.pwa)}</td>
                            <td className="py-3 px-2 text-center">{renderBadge(row.windows)}</td>
                            <td className="py-3 px-2 text-center">{renderBadge(row.macos)}</td>
                            <td className="py-3 px-2 text-center">{renderBadge(row.linux)}</td>
                            <td className="py-3 px-2 text-center">{renderBadge(row.android)}</td>
                            <td className="py-3 px-2 text-center">{renderBadge(row.ios)}</td>
                            <td className="py-3 px-2 text-center">{renderBadge(row.tablet)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCOPE & FEASIBILITY GATE */}
          {activeTab === 'gate' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">15 Mandatory Admission Criteria</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {criteria.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-slate-200">{c.ruleTitle}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{c.notes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Candidate Gap Ledger</h3>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-300 font-semibold">
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Candidate Gap</th>
                        <th className="py-2.5 px-3">Platform</th>
                        <th className="py-2.5 px-3">Decision</th>
                        <th className="py-2.5 px-3">Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {candidateLedger.map((item) => {
                        const getDecisionBadge = (d: string) => {
                          if (d.startsWith('ADMIT')) {
                            return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/60">{d}</span>;
                          }
                          if (d === 'DOCUMENT PLATFORM LIMITATION') {
                            return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950 text-amber-300 border border-amber-800/60">{d}</span>;
                          }
                          if (d === 'DEFER TO HARDENING') {
                            return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950 text-blue-300 border border-blue-800/60">{d}</span>;
                          }
                          return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950 text-rose-300 border border-rose-800/60">{d}</span>;
                        };

                        return (
                          <tr key={item.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-mono text-slate-400">{item.id}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-200">{item.gap}</td>
                            <td className="py-2.5 px-3 text-slate-400">{item.platform}</td>
                            <td className="py-2.5 px-3">{getDecisionBadge(item.decision)}</td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">{item.rationale}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FEATURE FLAGS & CONTROL AUDIT */}
          {activeTab === 'flags' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {featureFlags.map((f) => {
                  const getStatusBadge = (s: string) => {
                    if (s.startsWith('Stable')) return <span className="text-emerald-400 font-semibold">{s}</span>;
                    if (s.startsWith('Beta')) return <span className="text-amber-400 font-semibold">{s}</span>;
                    if (s.startsWith('Experimental')) return <span className="text-indigo-400 font-semibold">{s}</span>;
                    if (s === 'Removed') return <span className="text-rose-400 font-semibold">{s}</span>;
                    return <span className="text-slate-400 font-semibold">{s}</span>;
                  };

                  return (
                    <div key={f.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">{f.id}</span>
                        <span className="text-xs">{getStatusBadge(f.status)}</span>
                      </div>
                      <div className="text-sm font-medium text-white">{f.name}</div>
                      <p className="text-xs text-slate-400">{f.description}</p>
                      <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Module: {f.ownerModule}</span>
                        <span>Default: {f.defaultState ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: FROZEN FEATURE MANIFEST */}
          {activeTab === 'manifest' && (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-300 font-semibold">
                      <th className="py-2.5 px-3">Subsystem</th>
                      <th className="py-2.5 px-3">Feature Name</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Platforms</th>
                      <th className="py-2.5 px-3">Known Limitations / Invariants</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {frozenManifest.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold text-indigo-400">{item.subsystem}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-100">{item.featureName}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            item.status === 'Stable'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{item.supportedPlatforms.join(', ')}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{item.knownLimitations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: HARDENING HANDOFF */}
          {activeTab === 'hardening' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">V2.25 → V2.26 Hardening Ledger</div>
                  <p className="text-xs text-slate-400">Strictly 0 new features. Only defects, reliability, security, accessibility, and performance.</p>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  ZERO FEATURES IN HANDOFF
                </span>
              </div>

              <div className="space-y-2">
                {hardeningItems.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-400">{item.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                          {item.category}
                        </span>
                        <span className="text-xs font-medium text-white">{item.title}</span>
                      </div>
                      <p className="text-xs text-slate-400">{item.description}</p>
                      <div className="text-[11px] text-slate-500">Target Phase: <strong>{item.targetPhase}</strong> | Verification: {item.verificationMethod}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CERTIFICATION SUITE */}
          {activeTab === 'certification' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-white">V2.25 Platform & Feature Freeze Test Suite</h3>
                  <p className="text-xs text-slate-400">Validates all 28 platform certification gates, scope limits, and cross-platform fidelity.</p>
                </div>
                <button
                  onClick={runCertification}
                  disabled={isRunningCert}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs shadow-lg transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {isRunningCert ? 'Executing Gates...' : 'Run Certification Suite'}
                </button>
              </div>

              {certResults && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                    <span className="text-slate-300">Total Gates: <strong>{certResults.total}</strong></span>
                    <span className="text-emerald-400 font-semibold">Passed: {certResults.passed}</span>
                    <span className="text-rose-400 font-semibold">Failed: {certResults.failed}</span>
                    <span className="text-indigo-400 font-semibold">
                      Pass Rate: {Math.round((certResults.passed / certResults.total) * 100)}%
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {certResults.results.map((r, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          r.passed
                            ? 'bg-emerald-950/20 border-emerald-900/50 text-slate-200'
                            : 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {r.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span>{r.name}</span>
                        </div>
                        {r.error && <span className="text-rose-400 text-[11px] font-mono">{r.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>V2.25 Feature Freeze Locked • Ready for V2.26 Blocker Elimination</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
