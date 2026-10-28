import React, { useState, useEffect } from 'react';
import { AISettings, AIMode, ExternalProviderType } from '../types';
import { aiSettingsService } from '../aiSettingsService';
import { localAIProvider } from '../providers/localProvider';
import { conversationStorageService } from '../conversationStorage';
import {
  Sparkles,
  Cpu,
  Globe,
  Shield,
  Trash2,
  HardDrive,
  Download,
  CheckCircle2,
  AlertCircle,
  Key,
  Lock,
  Layers,
  RefreshCw,
  FolderMinus,
  Tag,
  EyeOff,
  Eye,
} from 'lucide-react';

export const AISettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>(aiSettingsService.getSettings());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    const unsub = aiSettingsService.subscribe((s) => {
      setSettings(s);
    });
    return unsub;
  }, []);

  const handleModeChange = (mode: AIMode) => {
    aiSettingsService.setAIMode(mode);
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      aiSettingsService.setSessionApiKey(apiKeyInput.trim());
      setApiKeyInput('');
    }
  };

  const handleClearApiKey = () => {
    aiSettingsService.clearApiKey();
    setApiKeyInput('');
  };

  const handleDownloadLocalModel = async () => {
    setIsDownloadingModel(true);
    setModelProgress(0);
    try {
      await localAIProvider.downloadModel((prog) => {
        setModelProgress(prog);
      });
    } finally {
      setIsDownloadingModel(false);
    }
  };

  const handleRemoveLocalModel = () => {
    aiSettingsService.removeLocalModel();
  };

  const handleClearCaches = async () => {
    await conversationStorageService.clearAllConversations();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  return (
    <div className="space-y-6 text-sm text-neutral-800 dark:text-neutral-200">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-sky-500" />
          <h2 className="text-base font-semibold">AI Assistance & Knowledge Copilot</h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Configure on-device or external generative AI for question answering, RAG summarization, and writing assistance. AI is strictly optional; canonical Markdown notes remain authoritative.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Operational Mode
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Mode C: Disabled */}
          <button
            type="button"
            onClick={() => handleModeChange('disabled')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              settings.mode === 'disabled'
                ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-500 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
            }`}
          >
            <div className="flex items-center gap-2 font-medium mb-1">
              <Shield className="w-4 h-4 text-neutral-500" />
              <span>AI Disabled</span>
            </div>
            <p className="text-xs text-neutral-500 leading-snug">
              Standard local PKM. No generative AI features or models are active.
            </p>
          </button>

          {/* Mode A: Local Model */}
          <button
            type="button"
            onClick={() => handleModeChange('local')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              settings.mode === 'local'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
            }`}
          >
            <div className="flex items-center gap-2 font-medium mb-1 text-emerald-800 dark:text-emerald-300">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Local On-Device AI</span>
            </div>
            <p className="text-xs text-neutral-500 leading-snug">
              Runs in browser. 100% private with 0 bytes leaving your machine.
            </p>
          </button>

          {/* Mode B: External Provider */}
          <button
            type="button"
            onClick={() => handleModeChange('external')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              settings.mode === 'external'
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 dark:border-sky-600 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
            }`}
          >
            <div className="flex items-center gap-2 font-medium mb-1 text-sky-800 dark:text-sky-300">
              <Globe className="w-4 h-4 text-sky-600" />
              <span>External Provider</span>
            </div>
            <p className="text-xs text-neutral-500 leading-snug">
              Connect to your API key (OpenRouter, OpenAI, Gemini). Explicit disclosures.
            </p>
          </button>
        </div>
      </div>

      {/* Local Model Manager (If Local mode selected) */}
      {settings.mode === 'local' && (
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-xs">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Local Inference Engine ({settings.localModel.name})</span>
            </div>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                settings.localModel.status === 'ready'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : settings.localModel.status === 'downloading'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {settings.localModel.status === 'ready'
                ? 'Ready for Offline Inference'
                : settings.localModel.status === 'downloading'
                ? `Downloading (${modelProgress}%)`
                : 'Not Installed'}
            </span>
          </div>

          <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
            <div>Download size: ~{settings.localModel.downloadSizeMB} MB | Storage at rest: ~{settings.localModel.installedSizeMB} MB</div>
            <div>WebGPU Status: {settings.localModel.isWebGPUSupported ? '✓ WebGPU Accelerated' : 'ℹ WASM / CPU Mode'}</div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {settings.localModel.status !== 'ready' ? (
              <button
                type="button"
                onClick={handleDownloadLocalModel}
                disabled={isDownloadingModel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloadingModel ? 'Downloading Model...' : 'Download Local Model (~18 MB)'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRemoveLocalModel}
                className="px-3 py-1.5 border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Local Model</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* External Provider Configuration (If External mode selected) */}
      {settings.mode === 'external' && (
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 font-medium text-xs">
            <Key className="w-4 h-4 text-sky-600" />
            <span>External API Provider Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-neutral-500 mb-1">Provider Type</label>
              <select
                value={settings.externalProvider.providerType}
                onChange={(e) =>
                  aiSettingsService.updateSettings({
                    externalProvider: {
                      ...settings.externalProvider,
                      providerType: e.target.value as ExternalProviderType,
                      modelId: settings.externalProvider.modelId,
                    },
                  })
                }
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2.5 py-1.5"
              >
                <option value="custom">Local Offline Vault Engine</option>
                <option value="openrouter">OpenRouter (Unified API)</option>
                <option value="openai-compatible">OpenAI Compatible Endpoint</option>
                <option value="anthropic">Anthropic Claude API</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">Engine Identifier</label>
              <input
                type="text"
                value={settings.externalProvider.modelId}
                onChange={(e) =>
                  aiSettingsService.updateSettings({
                    externalProvider: {
                      ...settings.externalProvider,
                      modelId: e.target.value,
                    },
                  })
                }
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2.5 py-1.5 font-mono text-xs"
                placeholder="local-vault-indexer"
              />
            </div>
          </div>

          {settings.externalProvider.providerType === 'custom' ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Local Offline Assistant Active</strong>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300/80">
                  Operates 100% offline using client-side heuristic indexing and lexical search. No external AI APIs or cloud connections are used.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* API Key Input (Stored in memory / P30 security) */}
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-500">API Key (Session Memory / Encrypted)</label>
                  {settings.externalProvider.hasKeyConfigured && (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Key configured in session
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={settings.externalProvider.hasKeyConfigured ? '••••••••••••••••' : 'Enter API Key (sk-...)'}
                      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md pl-2.5 pr-8 py-1.5 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {apiKeyInput.trim() && (
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md font-medium"
                    >
                      Set Key
                    </button>
                  )}

                  {settings.externalProvider.hasKeyConfigured && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="px-3 py-1.5 border border-red-300 dark:border-red-800 text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Clear Key
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Credentials follow P30 security rules: kept in memory for the active session, never logged or stored in plain localStorage.
                </p>
              </div>
            </>
          )}

          {/* Privacy Disclosure Checkbox */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.externalProvider.dataDisclosureAccepted}
                onChange={(e) =>
                  aiSettingsService.updateSettings({
                    externalProvider: {
                      ...settings.externalProvider,
                      dataDisclosureAccepted: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 rounded text-sky-600"
              />
              <span className="text-amber-900 dark:text-amber-200">
                <strong>Data Transfer Disclosure</strong>: I understand that when using External AI, retrieved note excerpts and prompts within my selected scope will be sent to the configured external provider over HTTPS.
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Scope Exclusions */}
      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center gap-2 font-medium text-xs">
          <FolderMinus className="w-4 h-4 text-neutral-500" />
          <span>AI Scope Exclusions</span>
        </div>
        <p className="text-xs text-neutral-500">
          Notes matching these rules are excluded from retrieval, even under Entire Vault scope.
        </p>

        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.exclusions.excludeTrash}
              onChange={(e) =>
                aiSettingsService.updateSettings({
                  exclusions: {
                    ...settings.exclusions,
                    excludeTrash: e.target.checked,
                  },
                })
              }
              className="rounded text-sky-600"
            />
            <span>Exclude Trash (Never index deleted notes)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.exclusions.excludeTemplates}
              onChange={(e) =>
                aiSettingsService.updateSettings({
                  exclusions: {
                    ...settings.exclusions,
                    excludeTemplates: e.target.checked,
                  },
                })
              }
              className="rounded text-sky-600"
            />
            <span>Exclude Template notes</span>
          </label>
        </div>
      </div>

      {/* Cache & Maintenance */}
      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <div className="font-medium text-xs">Clear AI Derived Caches</div>
          <div className="text-xs text-neutral-500">
            Removes temporary conversation histories and cached embeddings. Canonical notes are untouched.
          </div>
        </div>
        <button
          type="button"
          onClick={handleClearCaches}
          className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-xs font-medium"
        >
          {cacheCleared ? 'Cleared ✓' : 'Clear AI Data'}
        </button>
      </div>
    </div>
  );
};
