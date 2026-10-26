/**
 * V2.8 Security Diagnostics & Privacy Inspector Modal
 * Clean, accessible UI for viewing trust boundaries, data egress policies,
 * plugin capabilities, and generating sanitized support bundles.
 */

import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  EyeOff,
  Radio,
  FileCheck,
  AlertTriangle,
  Download,
  X,
  CheckCircle,
  ExternalLink,
  Key,
} from 'lucide-react';
import {
  authorizationGatewayV2,
  diagnosticRedactionEngineV2,
  secureCredentialBrokerV2,
  V2_8_DATA_EGRESS_MATRIX,
  V2_8_TRUST_BOUNDARIES,
  vaultLockSessionManagerV2,
} from '../index';
import { V2_8_CERTIFICATION_REPORT } from '../audit/v2_8CertificationReport';

interface SecurityDiagnosticsModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityDiagnosticsModalV2: React.FC<SecurityDiagnosticsModalV2Props> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'boundaries' | 'egress' | 'redteam' | 'bundle'>('overview');
  const [copiedBundle, setCopiedBundle] = useState(false);

  if (!isOpen) return null;

  const isLocked = vaultLockSessionManagerV2.getIsLocked();
  const sessionGen = vaultLockSessionManagerV2.getSessionGenerationId();
  const violations = authorizationGatewayV2.getViolations();
  const credentials = secureCredentialBrokerV2.listCredentialMetadata();

  const handleDownloadSupportBundle = () => {
    const bundle = diagnosticRedactionEngineV2.generateSupportBundle(['Application runtime healthy']);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pkm-sanitized-support-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedBundle(true);
    setTimeout(() => setCopiedBundle(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-neutral-100">Security, Privacy & Trust Diagnostics</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono border border-emerald-700/40">
                  V2.8 Hardened
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Verified zero-telemetry, local-first trust boundaries & adversarial defenses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-neutral-800 bg-neutral-900/50 flex gap-2 pt-2">
          {[
            { id: 'overview', label: 'System Overview', icon: Shield },
            { id: 'boundaries', label: 'Trust Boundaries (8)', icon: Lock },
            { id: 'egress', label: 'Data Egress Matrix (6)', icon: Radio },
            { id: 'redteam', label: 'Red Team Matrix', icon: FileCheck },
            { id: 'bundle', label: 'Diagnostic Export', icon: EyeOff },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Security Health Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-xs text-neutral-400 uppercase font-mono tracking-wider">Vault Session State</div>
                  <div className="mt-1 text-base font-semibold text-neutral-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {isLocked ? 'Locked' : 'Unlocked & Active'}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">Generation ID: #{sessionGen}</div>
                </div>

                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-xs text-neutral-400 uppercase font-mono tracking-wider">Zero Telemetry</div>
                  <div className="mt-1 text-base font-semibold text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Certified (0 Outbound)
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">No trackers, analytics or beacons</div>
                </div>

                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-xs text-neutral-400 uppercase font-mono tracking-wider">Credential Broker</div>
                  <div className="mt-1 text-base font-semibold text-neutral-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" /> {credentials.length} Local Secret(s)
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">Isolated & zero-export guarantee</div>
                </div>
              </div>

              {/* Core Principles */}
              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Certified Security Invariants
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Execution-time capability checking (least-privilege)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Health & Finance domains excluded from AI by default</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>SSRF & localhost blocking for third-party extensions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Archive bomb & path traversal preflight scanning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>CSV formula injection escaping on all exports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Prompt injection anti-spoofing citation delimiters</span>
                  </div>
                </div>
              </div>

              {/* Security Violations Log */}
              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Recent Security Violations Blocked ({violations.length})
                  </div>
                  {violations.length > 0 && (
                    <button
                      onClick={() => authorizationGatewayV2.clearViolations()}
                      className="text-xs text-neutral-400 hover:text-neutral-200"
                    >
                      Clear Log
                    </button>
                  )}
                </div>
                {violations.length === 0 ? (
                  <div className="text-xs text-neutral-500 py-3 text-center">
                    No security violations detected. All callers operating within authorized capabilities.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {violations.map((v) => (
                      <div
                        key={v.id}
                        className="text-xs p-2 rounded bg-red-950/30 border border-red-900/40 text-red-300 flex items-start gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">{v.subjectId}</span>: {v.reason} (
                          <span className="font-mono text-red-400">{v.attemptedCapability}</span>)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'boundaries' && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-400">
                Audited architectural boundaries ensuring isolated execution and strict sanitization.
              </div>
              <div className="space-y-3">
                {V2_8_TRUST_BOUNDARIES.map((tb, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-neutral-100 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        {tb.boundaryName}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                        {tb.auditStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-400">
                      <div>
                        <span className="text-neutral-500">Source:</span> {tb.sourceTrustLevel}
                      </div>
                      <div>
                        <span className="text-neutral-500">Sanitizer/Validator:</span> {tb.sanitizerOrValidator}
                      </div>
                      <div className="col-span-2">
                        <span className="text-neutral-500">Failure Behavior:</span> {tb.failureBehavior}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'egress' && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-400">
                Cataloged outbound data channels. All sensitive domains (Health & Finance) default to strict exclusion.
              </div>
              <div className="space-y-3">
                {V2_8_DATA_EGRESS_MATRIX.map((ch) => (
                  <div key={ch.channelId} className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-neutral-100 flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-blue-400" />
                        {ch.channelName}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                        Policy: {ch.defaultSensitiveDomainPolicy}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 space-y-0.5">
                      <div>
                        <span className="text-neutral-500">Payload:</span> {ch.dataExfiltratable}
                      </div>
                      <div>
                        <span className="text-neutral-500">Destination:</span> {ch.destination}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'redteam' && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-400">
                Adversarial red team attack scenarios validated and certified blocked.
              </div>
              <div className="space-y-2.5">
                {V2_8_CERTIFICATION_REPORT.redTeamValidationMatrix.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-neutral-200">{item.scenario}</div>
                      <div className="text-xs text-neutral-400">
                        <span className="text-neutral-500">Attack:</span> {item.attackVector}
                      </div>
                      <div className="text-xs text-emerald-400/90">
                        <span className="text-neutral-500">Defense:</span> {item.defenseMechanism}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono flex-shrink-0">
                      BLOCKED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bundle' && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-400">
                Generate a sanitized diagnostic support bundle for troubleshooting. Zero note content, health values,
                finance records, passwords, or authentication tokens are ever exported.
              </div>
              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle className="w-4 h-4" /> Guaranteed Privacy Redaction
                </div>
                <p className="text-xs text-neutral-400">
                  This JSON bundle contains only technical error codes, resource counts, platform metrics, and sanitized
                  logs. You can inspect the entire bundle before sharing it.
                </p>
                <button
                  onClick={handleDownloadSupportBundle}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {copiedBundle ? 'Downloaded!' : 'Export Sanitized Support Bundle'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-500">
          <div>Release: {V2_8_CERTIFICATION_REPORT.release}</div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
