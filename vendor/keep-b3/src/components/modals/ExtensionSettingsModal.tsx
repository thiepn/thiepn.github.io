/**
 * PKM Phase P34: Browser Extension Settings & Bridge Management Modal
 * Allows pairing browser extensions, rotating secrets, managing trusted origins,
 * viewing paired clients, and draining staged locked captures.
 */

import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Key,
  Shield,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Download,
  ExternalLink,
  Laptop,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Inbox,
  Calendar,
} from 'lucide-react';
import {
  captureBridgeService,
} from '../../pkm/extensionBridge/captureBridgeService';
import {
  ExtensionBridgeConfig,
  CaptureDestination,
} from '../../pkm/extensionBridge/captureProtocol';
import { downloadExtensionSetupGuide } from '../../pkm/extensionBridge/packageExporter';
import { vaultEncryptionService } from '../../pkm/encryption/vaultEncryptionService';

export function ExtensionSettingsModal({
  isOpen,
  onClose,
  onDrainStagedCaptures,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDrainStagedCaptures?: () => Promise<number>;
}) {
  const [config, setConfig] = useState<ExtensionBridgeConfig>(() =>
    captureBridgeService.getConfig()
  );
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [newOriginInput, setNewOriginInput] = useState('');
  const [originError, setOriginError] = useState<string | null>(null);
  const [stagedCount, setStagedCount] = useState<number>(() =>
    captureBridgeService.getStagedCapturesCount()
  );
  const [isDraining, setIsDraining] = useState(false);
  const [drainSuccessMsg, setDrainSuccessMsg] = useState<string | null>(null);

  // Sync state with bridge updates
  useEffect(() => {
    if (!isOpen) return;
    const unsub = captureBridgeService.subscribe((event) => {
      if (event.type === 'status_changed') {
        setConfig(captureBridgeService.getConfig());
      } else if (event.type === 'staged_updated') {
        setStagedCount(captureBridgeService.getStagedCapturesCount());
      }
    });
    setConfig(captureBridgeService.getConfig());
    setStagedCount(captureBridgeService.getStagedCapturesCount());
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const isVaultLocked = vaultEncryptionService.isVaultLocked();

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(config.pairingSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (_e) {
      // Fallback
    }
  };

  const handleRegenerateSecret = () => {
    if (
      window.confirm(
        'Regenerate Pairing Secret? All currently connected browser extensions will need to be re-paired with the new secret.'
      )
    ) {
      const newSecret = captureBridgeService.regeneratePairingSecret();
      setConfig({ ...config, pairingSecret: newSecret, pairedClients: [] });
    }
  };

  const handleAddOrigin = () => {
    setOriginError(null);
    if (!newOriginInput.trim()) return;

    try {
      const success = captureBridgeService.addTrustedOrigin(newOriginInput.trim());
      if (success) {
        setConfig(captureBridgeService.getConfig());
        setNewOriginInput('');
      } else {
        setOriginError('Invalid URL origin format. Use format: https://example.com');
      }
    } catch (_e) {
      setOriginError('Invalid origin. Please check format.');
    }
  };

  const handleRemoveOrigin = (origin: string) => {
    captureBridgeService.removeTrustedOrigin(origin);
    setConfig(captureBridgeService.getConfig());
  };

  const handleRevokeClient = (clientId: string) => {
    captureBridgeService.revokeClient(clientId);
    setConfig(captureBridgeService.getConfig());
  };

  const handleUpdateDefaultDestination = (dest: CaptureDestination) => {
    const updated = { ...config, defaultDestination: dest };
    captureBridgeService.saveConfig(updated);
    setConfig(updated);
  };

  const handleDrain = async () => {
    if (isDraining) return;
    setIsDraining(true);
    setDrainSuccessMsg(null);
    try {
      let count = 0;
      if (onDrainStagedCaptures) {
        count = await onDrainStagedCaptures();
      }
      setStagedCount(captureBridgeService.getStagedCapturesCount());
      setDrainSuccessMsg(`Successfully committed ${count} staged capture(s) into vault!`);
    } catch (err: any) {
      setDrainSuccessMsg(`Drain error: ${err?.message || 'Failed'}`);
    } finally {
      setIsDraining(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="extension-bridge-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 id="extension-bridge-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                Browser Extension & Universal Capture Bridge
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Fast web clipping, selection capture, and article archiving.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close extension settings"
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-stone-700 dark:text-stone-300">
          {/* Staged Locked Captures Notice */}
          {stagedCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-950 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">
                    {stagedCount} capture{stagedCount === 1 ? '' : 's'} staged in volatile memory.
                  </span>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    {isVaultLocked
                      ? 'Unlock your vault to commit them into encrypted notes.'
                      : 'Vault is unlocked. Commit staged captures to your notes now.'}
                  </p>
                </div>
              </div>

              {!isVaultLocked && (
                <button
                  type="button"
                  disabled={isDraining}
                  onClick={handleDrain}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDraining ? 'animate-spin' : ''}`} />
                  {isDraining ? 'Committing...' : 'Commit to Vault'}
                </button>
              )}
            </div>
          )}

          {drainSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{drainSuccessMsg}</span>
            </div>
          )}

          {/* Section 1: Pairing Secret Token */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                  Pairing Secret Token (AES-256 Auth)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRegenerateSecret}
                className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1 text-[11px] font-medium transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>

            <p className="text-stone-500 dark:text-stone-400 text-[11px] leading-relaxed">
              This high-entropy token authenticates your browser extension and prevents unauthorized postMessage injections from untrusted websites.
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-[11px] px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 overflow-x-auto select-all">
                {showSecret ? config.pairingSecret : '•'.repeat(32) + config.pairingSecret.slice(-8)}
              </div>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="px-2.5 py-2 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium text-[11px]"
              >
                {showSecret ? 'Hide' : 'Reveal'}
              </button>
              <button
                type="button"
                onClick={handleCopySecret}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-colors"
              >
                {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSecret ? 'Copied' : 'Copy Secret'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Default Destination */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-xs">
              Default Capture Destination
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateDefaultDestination('inbox')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-colors ${
                  config.defaultDestination === 'inbox'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Inbox className="w-3.5 h-3.5 text-amber-500" /> Inbox Folder
                </div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">
                  Creates discrete notes in Inbox
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateDefaultDestination('daily')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-colors ${
                  config.defaultDestination === 'daily'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Daily Note
                </div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">
                  Appends to today's log under ## Web Captures
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateDefaultDestination('new_note')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-colors ${
                  config.defaultDestination === 'new_note'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Layers className="w-3.5 h-3.5 text-amber-500" /> Root Vault
                </div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">
                  Creates standalone root notes
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Trusted App Origins */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-xs flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-500" /> Whitelisted App Origins
              </h3>
              <span className="text-[10px] text-stone-500">
                {config.trustedOrigins.length} origin{config.trustedOrigins.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-1.5">
              {config.trustedOrigins.map((orig) => (
                <div
                  key={orig}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 font-mono text-[11px]"
                >
                  <span className="text-stone-800 dark:text-stone-200">{orig}</span>
                  {orig !== window.location.origin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOrigin(orig)}
                      className="text-stone-400 hover:text-rose-500 transition-colors"
                      title="Remove trusted origin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newOriginInput}
                onChange={(e) => setNewOriginInput(e.target.value)}
                placeholder="https://vault.mycustomdomain.com"
                className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddOrigin}
                className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Origin
              </button>
            </div>
            {originError && <p className="text-rose-500 text-[11px]">{originError}</p>}
          </div>

          {/* Section 4: Connected Extension Clients */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-xs flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-amber-500" /> Paired Browser Clients
            </h3>

            {config.pairedClients.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed border-stone-300 dark:border-stone-800 text-center text-stone-400 text-[11px]">
                No browser extension clients paired yet. Copy your secret above and paste it into the extension popup.
              </div>
            ) : (
              <div className="space-y-1.5">
                {config.pairedClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">{client.name}</div>
                      <div className="text-[10px] text-stone-500">
                        Paired: {new Date(client.pairedAt).toLocaleDateString()} • Last seen:{' '}
                        {new Date(client.lastSeenAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeClient(client.id)}
                      className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-medium text-[10px]"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Download & Setup Guide */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                Extension Setup Package & Guide
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Download instructions and connection profile to load the extension in Chrome or Firefox.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadExtensionSetupGuide(config)}
              className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Setup Guide</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-950/40">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Zero cloud telemetry • Local-first bridge
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
