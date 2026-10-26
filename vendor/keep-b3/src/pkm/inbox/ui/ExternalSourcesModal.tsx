import React, { useState } from 'react';
import {
  X,
  Mail,
  Calendar,
  Folder,
  HardDrive,
  Puzzle,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Filter,
  Layers,
  Database,
} from 'lucide-react';
import { ExternalSource, SourceRoutingRule } from '../inboxTypes';
import { universalInboxService } from '../universalInboxService';
import { connectorRegistry, SUPPORTED_PROVIDERS, ProviderDefinition } from '../connectorRegistry';

export interface ExternalSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExternalSourcesModal: React.FC<ExternalSourcesModalProps> = ({ isOpen, onClose }) => {
  const [sources, setSources] = useState<ExternalSource[]>(universalInboxService.getSources());
  const [selectedTab, setSelectedTab] = useState<'sources' | 'routing' | 'privacy'>('sources');

  // Add source state
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDefinition>(SUPPORTED_PROVIDERS[0]);
  const [displayName, setDisplayName] = useState(SUPPORTED_PROVIDERS[0].name);
  const [accountEmail, setAccountEmail] = useState('');

  // Disconnect modal state
  const [disconnectingSource, setDisconnectingSource] = useState<ExternalSource | null>(null);
  const [clearCacheOnDisconnect, setClearCacheOnDisconnect] = useState(false);

  // Routing rules state
  const [rules, setRules] = useState<SourceRoutingRule[]>([]);
  const [newRuleSender, setNewRuleSender] = useState('');
  const [newRuleTag, setNewRuleTag] = useState('');

  if (!isOpen) return null;

  const handleSyncSource = async (sourceId: string) => {
    await universalInboxService.syncSource(sourceId);
    setSources([...universalInboxService.getSources()]);
  };

  const handleAddSource = () => {
    const created = connectorRegistry.createSource(
      selectedProvider.id,
      displayName || selectedProvider.name,
      accountEmail || 'user@example.com'
    );
    universalInboxService.addSource(created);
    setSources([...universalInboxService.getSources()]);
    setIsAddingSource(false);
  };

  const handleConfirmDisconnect = () => {
    if (!disconnectingSource) return;
    universalInboxService.removeSource(disconnectingSource.id, {
      keepHistory: true,
      clearCache: clearCacheOnDisconnect,
    });
    setSources([...universalInboxService.getSources()]);
    setDisconnectingSource(null);
  };

  const handleClearCache = (connectorId?: string) => {
    if (confirm('Clear connector cached message payloads? Local notes and tasks created from this source will remain completely intact.')) {
      universalInboxService.clearConnectorCache(connectorId);
      setSources([...universalInboxService.getSources()]);
    }
  };

  const getProviderIcon = (kind: string) => {
    switch (kind) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'files':
        return <Folder className="w-4 h-4 text-amber-500" />;
      case 'plugin':
        return <Puzzle className="w-4 h-4 text-purple-500" />;
      default:
        return <HardDrive className="w-4 h-4 text-stone-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>External Sources & Connectors</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Connect email, calendar, and file streams for unified offline triage.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-5 bg-stone-50/50 dark:bg-stone-900/40 text-xs font-semibold">
          <button
            onClick={() => setSelectedTab('sources')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              selectedTab === 'sources'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Connected Sources ({sources.length})
          </button>

          <button
            onClick={() => setSelectedTab('routing')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              selectedTab === 'routing'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Routing & Rules
          </button>

          <button
            onClick={() => setSelectedTab('privacy')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              selectedTab === 'privacy'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Privacy & Vault Security
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {selectedTab === 'sources' && (
            <>
              {!isAddingSource ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Active Connectors</span>
                    <button
                      onClick={() => setIsAddingSource(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Connect New Source</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sources.map((source) => (
                      <div
                        key={source.id}
                        className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 shadow-xs flex items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            {getProviderIcon(source.kind)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">{source.displayName}</h4>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Connected
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                              {source.accountIdentifier} • Last synced: {source.lastSyncAt ? new Date(source.lastSyncAt).toLocaleTimeString() : 'Never'}
                            </p>
                            <p className="text-[11px] text-stone-400 mt-1">
                              Cached volume: {source.cacheSizeBytes ? `${(source.cacheSizeBytes / 1024).toFixed(1)} KB` : '0 KB'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            title="Sync Now"
                            onClick={() => handleSyncSource(source.id)}
                            className="p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Disconnect Source"
                            onClick={() => setDisconnectingSource(source)}
                            className="p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 border border-stone-200 dark:border-stone-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {sources.length === 0 && (
                      <div className="text-center py-10 border border-dashed border-stone-300 dark:border-stone-800 rounded-2xl">
                        <Layers className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">No external sources connected</p>
                        <p className="text-xs text-stone-500 mt-1">Add your email, calendar, or folder to start ingesting information.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Add Source Flow */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Select Provider</h3>
                    <button
                      onClick={() => setIsAddingSource(false)}
                      className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                    >
                      Back to list
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SUPPORTED_PROVIDERS.map((provider) => (
                      <div
                        key={provider.id}
                        onClick={() => {
                          setSelectedProvider(provider);
                          setDisplayName(provider.name);
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          selectedProvider.id === provider.id
                            ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30'
                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getProviderIcon(provider.kind)}
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{provider.name}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 leading-relaxed">{provider.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Connector Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Account Identifier / Email
                      </label>
                      <input
                        type="text"
                        placeholder="you@company.com"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div className="p-3 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-400 flex items-start gap-2">
                      <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{selectedProvider.privacyNotice}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsAddingSource(false)}
                        className="px-4 py-2 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddSource}
                        className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                      >
                        Authorize & Add Source
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {selectedTab === 'routing' && (
            <div className="space-y-4 text-xs">
              <p className="text-stone-600 dark:text-stone-400">
                Configure deterministic rules to automatically suggest projects, tags, or domains when items arrive from specific senders or email domains.
              </p>

              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 space-y-3">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-600" />
                  <span>Create Routing Rule</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-stone-600 dark:text-stone-300 block mb-1">If Sender Contains</label>
                    <input
                      type="text"
                      placeholder="e.g. receipts@ or @acme.com"
                      value={newRuleSender}
                      onChange={(e) => setNewRuleSender(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-600 dark:text-stone-300 block mb-1">Suggest Tag / Action</label>
                    <input
                      type="text"
                      placeholder="e.g. finance, client-alpha"
                      value={newRuleTag}
                      onChange={(e) => setNewRuleTag(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (!newRuleSender) return;
                      const rule: SourceRoutingRule = {
                        id: `rule-${Date.now()}`,
                        name: `Rule for ${newRuleSender}`,
                        enabled: true,
                        field: 'sender',
                        operator: 'contains',
                        value: newRuleSender,
                        action: 'tag_local',
                        targetValue: newRuleTag,
                      };
                      setRules([...rules, rule]);
                      setNewRuleSender('');
                      setNewRuleTag('');
                    }}
                    className="px-3 py-1.5 font-semibold rounded-lg bg-stone-800 text-white hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600"
                  >
                    Add Routing Rule
                  </button>
                </div>
              </div>

              {rules.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-stone-500 uppercase tracking-wider text-[11px]">Active Rules</h5>
                  {rules.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">Sender contains "{r.value}"</span>
                        <span className="text-stone-500 ml-2">→ Tag with #{r.targetValue}</span>
                      </div>
                      <button
                        onClick={() => setRules(rules.filter((x) => x.id !== r.id))}
                        className="text-stone-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedTab === 'privacy' && (
            <div className="space-y-4 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Offline-First Privacy Architecture</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-emerald-800 dark:text-emerald-300">
                  <li><strong>Device-Local Credentials:</strong> OAuth tokens and session keys remain strictly in browser storage and are never committed to Git or sync notes.</li>
                  <li><strong>Vault Lock Purge:</strong> When the vault is locked, all decrypted in-memory email caches and sender lists are purged immediately.</li>
                  <li><strong>Anti-Tracking:</strong> External HTML emails have remote images, scripts, and tracking pixels blocked by default.</li>
                  <li><strong>No Autonomous Sending:</strong> The system will never send an email or reply without your explicit final confirmation.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 space-y-3">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>Cache & Memory Controls</span>
                </h4>
                <p>
                  Connector caches contain lazy-loaded message previews. You can safely clear all external caches at any time. Created canonical notes, tasks, and interaction logs will remain intact in your vault.
                </p>
                <button
                  onClick={() => handleClearCache()}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100 font-semibold"
                >
                  Clear All External Connector Caches
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-800 dark:bg-stone-700 text-white hover:bg-stone-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Disconnect confirmation dialog */}
      {disconnectingSource && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-xl p-5 max-w-sm w-full shadow-2xl border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Disconnect {disconnectingSource.displayName}?
            </h3>
            <p className="text-stone-600 dark:text-stone-400">
              Stored references and canonical knowledge created from this source will remain in your vault.
            </p>

            <label className="flex items-center gap-2 text-stone-700 dark:text-stone-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={clearCacheOnDisconnect}
                onChange={(e) => setClearCacheOnDisconnect(e.target.checked)}
                className="rounded text-amber-600"
              />
              <span>Also clear cached message payloads from this connector</span>
            </label>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setDisconnectingSource(null)}
                className="px-3 py-1.5 font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnect}
                className="px-4 py-1.5 font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
