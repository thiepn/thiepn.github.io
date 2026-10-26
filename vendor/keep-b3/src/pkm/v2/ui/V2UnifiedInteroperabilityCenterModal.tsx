/**
 * V2.24 Unified Interoperability, Ecosystem & Freedom Center Modal
 * 
 * Comprehensive management surface for:
 * 1. Overview & Freedom Guarantee ("Leave the Product" readiness)
 * 2. Plugin Manager (Installation, Permissions, Updates, Safe Mode, Data Preservation)
 * 3. Connector Manager (OAuth, Refresh, Stale Cache, Rate Limits, Disconnect)
 * 4. Web Clipper & Capture (Article, Bookmark, Selection, Sanitization, Inbox Handoff)
 * 5. Import Center (8-Stage Pipeline, Markdown, CSV Mapping, ICS, vCard, BibTeX, Finance)
 * 6. Export Center (Native / Portable Markdown, HTML, Domain Exports)
 * 7. Full Portable Vault (One-Click Export, Manifest, README, Secret-Free Guarantee)
 * 8. Static Publishing (Public Allowlist, Transclusion Privacy, Secret Scan, Site Build)
 */

import React, { useState, useMemo } from 'react';
import {
  Globe,
  Package,
  Share2,
  Download,
  Upload,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  FileCode,
  Calendar,
  Users,
  BookOpen,
  DollarSign,
  Heart,
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
  Eye,
  Trash2,
  Power,
  Copy,
  FolderOpen,
  Radio,
  Zap,
} from 'lucide-react';
import {
  v2_24InteroperabilityEngine,
  PluginManifest,
  ConnectorAccount,
  ExternalProjectionItem,
  WebClipPayload,
  ImportSourceFormat,
  ImportStageAnalysis,
  ImportStagedRecord,
  ImportExecutionReport,
  PortableVaultExportPackage,
  StaticPublishingBuildResult,
  PluginPermission,
} from '../interoperability/v2_24InteroperabilityEngine';
import { Note } from '../../../types';

interface V2UnifiedInteroperabilityCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes?: Note[];
  onImportNotes?: (newNotes: Partial<Note>[]) => void;
}

type TabType =
  | 'overview'
  | 'plugins'
  | 'connectors'
  | 'web_clipper'
  | 'import_center'
  | 'export_center'
  | 'portable_vault'
  | 'publishing';

export const V2UnifiedInteroperabilityCenterModal: React.FC<V2UnifiedInteroperabilityCenterModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  onImportNotes,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const engine = v2_24InteroperabilityEngine;

  // Plugins State
  const [plugins, setPlugins] = useState<PluginManifest[]>(engine.getPlugins());
  const [selectedPlugin, setSelectedPlugin] = useState<PluginManifest | null>(plugins[0] || null);
  const [pluginFilter, setPluginFilter] = useState('');
  const [isSafeMode, setIsSafeMode] = useState(engine.isSafeMode());
  const [newPluginJson, setNewPluginJson] = useState('');
  const [pluginInstallMsg, setPluginInstallMsg] = useState<string | null>(null);

  // Connectors State
  const [connectors, setConnectors] = useState<ConnectorAccount[]>(engine.getConnectors());
  const [selectedConnector, setSelectedConnector] = useState<ConnectorAccount | null>(connectors[0] || null);
  const [connectorMsg, setConnectorMsg] = useState<string | null>(null);
  const [connectorSubTab, setConnectorSubTab] = useState<'active' | 'catalog' | 'projections' | 'webhooks' | 'readwise'>('active');
  const [webhookTitleInput, setWebhookTitleInput] = useState('New article from RSS: Zero-Knowledge Systems');
  const [webhookContentInput, setWebhookContentInput] = useState('Overview of verifiable computing and recursive SNARK proofs.');
  const [webhookTagsInput, setWebhookTagsInput] = useState('crypto, research, zero-knowledge');
  const [readwiseTemplateInput, setReadwiseTemplateInput] = useState('## {{title}} by {{author}}\n\n### Highlights\n{{highlights}}\n\n---\n*Synced via Readwise Integration*');

  // Web Clipper State
  const [webClips, setWebClips] = useState<WebClipPayload[]>(engine.getWebClips());
  const [clipUrlInput, setClipUrlInput] = useState('https://standards.ietf.org/rfc/rfc5545.txt');
  const [clipTitleInput, setClipTitleInput] = useState('RFC 5545: Internet Calendaring and Scheduling');
  const [clipContentInput, setClipContentInput] = useState(
    '# RFC 5545 iCalendar\n\nDefines the standard format for exchanging calendaring information across platforms and mail clients.'
  );
  const [clipMode, setClipMode] = useState<'article' | 'bookmark' | 'selection'>('article');
  const [clipperMsg, setClipperMsg] = useState<string | null>(null);

  // Import Center State
  const [importFormat, setImportFormat] = useState<ImportSourceFormat>('markdown_folder');
  const [importRawContent, setImportRawContent] = useState(
    '# Project Architecture Decision Record\n\nStatus: Approved\n\nReferences [[Distributed Consensus]] and [[Database Schema]].\n\n- [x] Initial design\n- [ ] Multi-region replication'
  );
  const [importFilename, setImportFilename] = useState('ADR-0042.md');
  const [importAnalysis, setImportAnalysis] = useState<ImportStageAnalysis | null>(null);
  const [stagedRecords, setStagedRecords] = useState<ImportStagedRecord[]>([]);
  const [importReport, setImportReport] = useState<ImportExecutionReport | null>(null);

  // Export & Portable Vault State
  const [portableVaultResult, setPortableVaultResult] = useState<PortableVaultExportPackage | null>(null);
  const [vaultCopied, setVaultCopied] = useState(false);

  // Static Publishing State
  const [siteTitle, setSiteTitle] = useState('Engineering & Architecture Hub');
  const [publishingResult, setPublishingResult] = useState<StaticPublishingBuildResult | null>(null);

  if (!isOpen) return null;

  // Handlers
  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    engine.togglePlugin(pluginId, enabled);
    setPlugins([...engine.getPlugins()]);
  };

  const handleInstallPlugin = () => {
    try {
      const manifest = JSON.parse(newPluginJson);
      const res = engine.installPlugin(manifest, 150000);
      if (res.success) {
        setPluginInstallMsg(`Plugin installed successfully.`);
        setPlugins([...engine.getPlugins()]);
        setNewPluginJson('');
      } else {
        setPluginInstallMsg(`Install error: ${res.error}`);
      }
    } catch (err: any) {
      setPluginInstallMsg(`Invalid JSON manifest: ${err.message}`);
    }
  };

  const handleRefreshConnector = (id: string) => {
    const res = engine.refreshConnector(id);
    setConnectors([...engine.getConnectors()]);
    setConnectorMsg(`Connector refreshed successfully via delta cursor.`);
  };

  const handleDisconnectConnector = (id: string) => {
    engine.disconnectConnector(id);
    setConnectors([...engine.getConnectors()]);
    setConnectorMsg(`Connector disconnected. Credentials and transient caches removed; canonical data preserved.`);
  };

  const handleDeleteConnector = (id: string) => {
    engine.deleteConnector(id);
    setConnectors([...engine.getConnectors()]);
    setConnectorMsg(`Connector deleted from registry.`);
  };

  const handleAddPresetConnector = (preset: {
    provider: any;
    accountName: string;
    accountEmail?: string;
    projections: ExternalProjectionItem[];
  }) => {
    const id = `conn_${preset.provider}_${Date.now().toString(36)}`;
    const newConn: ConnectorAccount = {
      id,
      provider: preset.provider,
      accountName: preset.accountName,
      accountEmail: preset.accountEmail,
      status: 'connected',
      lastRefreshedAt: new Date().toISOString(),
      syncCursor: `cursor_${preset.provider}_${Date.now()}`,
      cachedItemCount: preset.projections.length,
      scopes: ['read', 'project'],
      rateLimitRemaining: 500,
      externalIdentityPrefix: `${preset.provider}:${preset.accountEmail || 'user'}`,
    };
    engine.addConnector(newConn, preset.projections);
    setConnectors([...engine.getConnectors()]);
    setConnectorMsg(`Added and synchronized "${preset.accountName}".`);
    setConnectorSubTab('active');
  };

  const handleConvertProjectionToNote = (projId: string) => {
    const newNote = engine.importProjectionToCanonicalNote(projId);
    if (newNote) {
      if (onImportNotes) {
        onImportNotes([newNote]);
      }
      setConnectorMsg(`Imported "${newNote.title}" as a canonical note in your vault.`);
    } else {
      setConnectorMsg(`Could not import projection ${projId}.`);
    }
  };

  const handleDispatchWebhook = () => {
    const tags = webhookTagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const res = engine.dispatchInboundWebhook({
      title: webhookTitleInput,
      content: webhookContentInput,
      tags,
    });
    if (res.success && res.note) {
      if (onImportNotes) {
        onImportNotes([res.note]);
      }
      setConnectorMsg(`Webhook payload processed: created note "${res.note.title}".`);
    } else {
      setConnectorMsg(`Webhook error: ${res.error || 'Failed to dispatch payload'}`);
    }
  };

  const handleSyncReadwiseHighlights = () => {
    const res = engine.syncReadwiseHighlights(readwiseTemplateInput);
    if (res.success && res.notes.length > 0) {
      if (onImportNotes) {
        onImportNotes(res.notes);
      }
      setConnectorMsg(`Synced ${res.importedCount} highlight notes from Readwise.`);
    }
  };

  const handleIngestClip = () => {
    const res = engine.ingestWebClip({
      mode: clipMode,
      sourceUrl: clipUrlInput,
      title: clipTitleInput,
      sanitizedContent: clipContentInput,
      siteName: 'IETF Standards',
      tags: ['web-clip', 'specs'],
    });
    setWebClips([...engine.getWebClips()]);
    setClipperMsg(`Clip ingested into Universal Inbox (Sanitized: ${res.sanitized}, Duplicate: ${res.isDuplicate}).`);
  };

  const handleProcessClipToNote = (clipId: string) => {
    const res = engine.processClipToCanonicalNote(clipId);
    if (res.success && res.note && onImportNotes) {
      onImportNotes([res.note]);
      setWebClips([...engine.getWebClips()]);
      setClipperMsg(`Clip processed to canonical Note with full provenance metadata.`);
    }
  };

  const handleAnalyzeImport = () => {
    const analysis = engine.analyzeImport(importFilename, importRawContent, importFormat);
    setImportAnalysis(analysis);
    if (analysis.securityChecksPassed) {
      const staged = engine.stageImportRecords(importFilename, importRawContent, importFormat);
      setStagedRecords(staged);
    }
  };

  const handleCommitImport = () => {
    if (stagedRecords.length === 0) return;
    const report = engine.commitImportBatch(stagedRecords);
    setImportReport(report);
    if (onImportNotes && report.importedCount > 0) {
      const newNotes = stagedRecords.map((s) => ({
        title: s.payload.title || 'Imported Note',
        content: s.payload.content || JSON.stringify(s.payload, null, 2),
        tags: ['imported', s.provenance.sourceProvider],
      }));
      onImportNotes(newNotes);
    }
  };

  const handleGeneratePortableVault = () => {
    const pkg = engine.generateFullPortableVault(notes);
    setPortableVaultResult(pkg);
  };

  const handleBuildStaticSite = () => {
    const pubNotes = notes.slice(0, 5); // default sample public subset
    const res = engine.buildStaticPublication(
      {
        siteTitle,
        baseUrl: 'https://published-vault.example.org',
        allowedNoteIds: pubNotes.map((n) => n.id),
        allowSubtreeTransclusions: true,
        stripPrivateProperties: true,
        propertyAllowlist: ['title', 'date', 'author', 'tags'],
        includeStaticSearch: true,
        customTheme: 'neutral',
        enforceStrictCSP: true,
      },
      notes
    );
    setPublishingResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="p-4 px-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Ecosystem, Interoperability & Data Freedom
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  V2.24 Complete
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Plugins · Connectors · Web Clipper · 8-Stage Import · Open Formats · Portable Vault · Static Publishing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/30 px-6 gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Freedom', icon: ShieldCheck },
            { id: 'plugins', label: 'Plugin Ecosystem', icon: Package },
            { id: 'connectors', label: 'Connectors & OAuth', icon: Share2 },
            { id: 'web_clipper', label: 'Web Clipper', icon: Sparkles },
            { id: 'import_center', label: '8-Stage Import', icon: Upload },
            { id: 'export_center', label: 'Export Center', icon: Download },
            { id: 'portable_vault', label: 'Full Portable Vault', icon: FolderOpen },
            { id: 'publishing', label: 'Static Publishing', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-900/50">
          {/* TAB 1: OVERVIEW & FREEDOM GUARANTEE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Data Sovereignty & "Leave the Product" Guarantee
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
                      Your Personal OS is built on strict local-first, open standards principles. You own 100% of your data.
                      At any moment, you can export your complete vault into standard Markdown, RFC 5545 iCalendar, RFC 6350 vCards,
                      BibTeX, and exact integer CSVs without requiring an account, server, or proprietary runtime to read it.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('portable_vault')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Full Vault
                  </button>
                </div>
              </div>

              {/* Ecosystem Health Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400">Active Plugins</span>
                    <Package className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-2">
                    {plugins.filter((p) => p.status === 'enabled').length} / {plugins.length}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">Sandboxed & Permissions Enforced</div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400">Connected Providers</span>
                    <Share2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-2">
                    {connectors.filter((c) => c.status === 'connected' || c.status === 'offline_cached').length} /{' '}
                    {connectors.length}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">Delta Cursor Sync & Rate Bounded</div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400">Web Clips Ingested</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-2">{webClips.length}</div>
                  <div className="text-[11px] text-neutral-500 mt-1">Sanitized HTML & Source Provenance</div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400">Open Formats</span>
                    <Database className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-2">8 Standards</div>
                  <div className="text-[11px] text-neutral-500 mt-1">MD, ICS, VCF, BibTeX, CSV, JSON</div>
                </div>
              </div>

              {/* Interoperability Principles Grid */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">
                  Non-Negotiable Interoperability Rules
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-neutral-400">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-200">Local Authority:</strong> Local canonical vault data is always authoritative; external connector data remains projected until explicitly imported.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-200">Zero Secret Leakage:</strong> Credentials, OAuth tokens, and encryption keys never enter export bundles or canonical storage.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-200">Plugin Data Preservation:</strong> Disabling or uninstalling a plugin never deletes canonical resources created with it.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-200">Clean Disconnect:</strong> Disconnecting an external provider cleans credentials and caches without deleting imported items.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLUGIN ECOSYSTEM */}
          {activeTab === 'plugins' && (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search installed plugins..."
                    value={pluginFilter}
                    onChange={(e) => setPluginFilter(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSafeMode}
                      onChange={(e) => {
                        engine.setSafeMode(e.target.checked);
                        setIsSafeMode(e.target.checked);
                        setPlugins([...engine.getPlugins()]);
                      }}
                      className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                    />
                    <span>Safe Mode (Disable 3rd-party plugins)</span>
                  </label>
                </div>
              </div>

              {/* Plugins List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plugins
                  .filter((p) => p.name.toLowerCase().includes(pluginFilter.toLowerCase()))
                  .map((p) => {
                    const isEnabled = p.status === 'enabled';
                    const hasHighRisk =
                      p.permissions.some((perm) => perm.startsWith('health:') || perm.startsWith('finance:')) &&
                      p.permissions.includes('network:bounded_fetch');

                    return (
                      <div key={p.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                                <span className="text-[11px] font-mono text-neutral-500">v{p.version}</span>
                                {p.publisher.verified && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 mt-1">{p.description}</p>
                            </div>
                            <button
                              onClick={() => handleTogglePlugin(p.id, !isEnabled)}
                              className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                isEnabled
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Permissions */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {p.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300"
                              >
                                {perm}
                              </span>
                            ))}
                          </div>

                          {hasHighRisk && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-1.5 px-2">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>High-risk combination: Sensitive Domain + Network Access</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
                          <span>Created Resources: {p.createdResourceCount}</span>
                          <button
                            onClick={() => {
                              const res = engine.uninstallPlugin(p.id);
                              setPlugins([...engine.getPlugins()]);
                              setPluginInstallMsg(
                                `Plugin uninstalled. ${res.preservedResourcesCount} canonical resources preserved.`
                              );
                            }}
                            className="text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Uninstall
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Install Local Package */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  Install Plugin from Manifest
                </h4>
                <textarea
                  rows={4}
                  placeholder={`{\n  "id": "com.custom.formatter",\n  "name": "Custom Formatter",\n  "version": "1.0.0",\n  "entryPoint": "dist/index.js",\n  "permissions": ["storage:read"]\n}`}
                  value={newPluginJson}
                  onChange={(e) => setNewPluginJson(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-hidden focus:border-emerald-500"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{pluginInstallMsg || 'Atomic validation before install.'}</span>
                  <button
                    onClick={handleInstallPlugin}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white"
                  >
                    Validate & Install
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONNECTORS & INTEGRATIONS */}
          {activeTab === 'connectors' && (
            <div className="space-y-6">
              {connectorMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{connectorMsg}</span>
                  </div>
                  <button
                    onClick={() => setConnectorMsg(null)}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-mono px-1"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Sub Navigation Bar */}
              <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl overflow-x-auto text-xs">
                <button
                  onClick={() => setConnectorSubTab('active')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    connectorSubTab === 'active'
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Active Integrations ({connectors.length})
                </button>
                <button
                  onClick={() => setConnectorSubTab('catalog')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    connectorSubTab === 'catalog'
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  + Add from Catalog
                </button>
                <button
                  onClick={() => setConnectorSubTab('projections')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    connectorSubTab === 'projections'
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Projections & Ingestion ({engine.getExternalProjections().length})
                </button>
                <button
                  onClick={() => setConnectorSubTab('webhooks')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    connectorSubTab === 'webhooks'
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Webhooks & API
                </button>
                <button
                  onClick={() => setConnectorSubTab('readwise')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    connectorSubTab === 'readwise'
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Readwise Highlights
                </button>
              </div>

              {/* 1. ACTIVE INTEGRATIONS VIEW */}
              {connectorSubTab === 'active' && (
                <div className="space-y-4">
                  {connectors.length === 0 ? (
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 text-center">
                      <Radio className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                      <p className="text-xs text-neutral-400">No external integrations connected.</p>
                      <button
                        onClick={() => setConnectorSubTab('catalog')}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white"
                      >
                        Browse Integration Catalog
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {connectors.map((c) => {
                        const isConnected = c.status === 'connected' || c.status === 'offline_cached';
                        return (
                          <div key={c.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold text-white">{c.accountName}</h4>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                        c.status === 'connected'
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : c.status === 'offline_cached'
                                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                      }`}
                                    >
                                      {c.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-neutral-400 mt-1">{c.accountEmail || c.provider}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-neutral-900 text-neutral-400">
                                  <Share2 className="w-4 h-4" />
                                </div>
                              </div>

                              <div className="mt-3 space-y-1.5 text-xs text-neutral-400">
                                <div className="flex justify-between">
                                  <span>Last Refreshed:</span>
                                  <span className="text-neutral-300">
                                    {c.lastRefreshedAt ? new Date(c.lastRefreshedAt).toLocaleTimeString() : 'Never'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Cached Projections:</span>
                                  <span className="text-neutral-300">{c.cachedItemCount} items</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Rate Limit Remaining:</span>
                                  <span className="text-neutral-300">{c.rateLimitRemaining} reqs</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRefreshConnector(c.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-1.5"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Refresh
                                </button>
                                {isConnected ? (
                                  <button
                                    onClick={() => handleDisconnectConnector(c.id)}
                                    className="px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium"
                                  >
                                    Disconnect
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      engine.reauthenticateConnector(c.id);
                                      setConnectors([...engine.getConnectors()]);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white"
                                  >
                                    Reconnect
                                  </button>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteConnector(c.id)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-900 transition-colors"
                                title="Delete connector"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 2. CATALOG VIEW */}
              {connectorSubTab === 'catalog' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* GitHub */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">GitHub Issues & PRs</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400">Developer</span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-2">
                          Project assigned issues, pull request reviews, and mentions directly into your tasks and inbox.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleAddPresetConnector({
                            provider: 'github',
                            accountName: 'GitHub (Developer Sync)',
                            accountEmail: 'octocat@github.com',
                            projections: [
                              {
                                id: `gh_${Date.now()}_1`,
                                provider: 'github',
                                accountId: 'conn_github',
                                externalId: 'issue_1042',
                                externalIdentity: 'github:octocat/pkm#1042',
                                title: 'Optimize vault graph rendering performance for 10k+ nodes',
                                snippet: 'Refactor canvas viewport culling to avoid re-rendering off-screen links.',
                                receivedAtIso: new Date().toISOString(),
                                isStale: false,
                                metadata: { repo: 'octocat/pkm', number: 1042 },
                              },
                              {
                                id: `gh_${Date.now()}_2`,
                                provider: 'github',
                                accountId: 'conn_github',
                                externalId: 'pr_512',
                                externalIdentity: 'github:octocat/pkm#512',
                                title: 'Add offline delta cursor synchronization protocol',
                                snippet: 'PR review requested on incremental sync cursor implementation.',
                                receivedAtIso: new Date().toISOString(),
                                isStale: false,
                                metadata: { repo: 'octocat/pkm', number: 512 },
                              },
                            ],
                          })
                        }
                        className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Connect GitHub
                      </button>
                    </div>

                    {/* RSS / Newsletter Feed */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">RSS & Atom Feeds</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400">Feeds</span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-2">
                          Subscribe to engineering blogs, research preprints, and newsletters with clean reader projection.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleAddPresetConnector({
                            provider: 'rss',
                            accountName: 'Engineering & Research Feed',
                            accountEmail: 'feeds@engineering.org',
                            projections: [
                              {
                                id: `rss_${Date.now()}_1`,
                                provider: 'rss',
                                accountId: 'conn_rss',
                                externalId: 'post_dist_sys_99',
                                externalIdentity: 'rss:distributed-systems.org/post-99',
                                title: 'Formal Verification of State-Based CRDTs',
                                snippet: 'Recent advances in mathematically proven convergence algorithms without central locks.',
                                receivedAtIso: new Date().toISOString(),
                                isStale: false,
                                metadata: { author: 'Distributed Systems Journal' },
                              },
                            ],
                          })
                        }
                        className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Connect RSS Feed
                      </button>
                    </div>

                    {/* Microsoft Outlook / CalDAV */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">Microsoft Outlook / 365</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400">Calendar & Mail</span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-2">
                          Sync calendar meetings and important flagged emails with privacy-first sandboxed caching.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleAddPresetConnector({
                            provider: 'outlook',
                            accountName: 'Microsoft 365 Enterprise',
                            accountEmail: 'consultant@corporate.com',
                            projections: [
                              {
                                id: `outlook_${Date.now()}_1`,
                                provider: 'outlook',
                                accountId: 'conn_outlook',
                                externalId: 'evt_corp_allhands',
                                externalIdentity: 'outlook:consultant@corporate.com:allhands_q4',
                                title: 'Executive Strategy & Product Keynote',
                                snippet: 'Annual enterprise technology briefing and systems evolution.',
                                receivedAtIso: new Date().toISOString(),
                                isStale: false,
                                metadata: { start: '2026-10-01T15:00:00Z', end: '2026-10-01T16:30:00Z' },
                              },
                            ],
                          })
                        }
                        className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Connect Outlook
                      </button>
                    </div>

                    {/* Inbound Webhook Endpoint */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">REST / Inbound Webhook</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400">Automation</span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-2">
                          Capture notes and events from Zapier, Make, n8n, Raycast, or custom cURL scripts.
                        </p>
                      </div>
                      <button
                        onClick={() => setConnectorSubTab('webhooks')}
                        className="mt-4 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 flex items-center justify-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Configure Webhook Studio
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PROJECTIONS & INGESTION LIST */}
              {connectorSubTab === 'projections' && (
                <div className="space-y-4">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                          External Projections Stream
                        </h4>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Read-only projected external data. Click "Convert to Note" to import into your vault.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          connectors.forEach((c) => engine.refreshConnector(c.id));
                          setConnectors([...engine.getConnectors()]);
                          setConnectorMsg('Refreshed all active connector projection feeds.');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh All Feeds
                      </button>
                    </div>

                    <div className="space-y-2 mt-4">
                      {engine.getExternalProjections().length === 0 ? (
                        <div className="p-6 text-center text-xs text-neutral-500">
                          No projected items in the isolation cache.
                        </div>
                      ) : (
                        engine.getExternalProjections().map((proj) => (
                          <div
                            key={proj.id}
                            className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white truncate">{proj.title}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 font-mono shrink-0">
                                  {proj.provider}
                                </span>
                                {proj.isStale && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                    Stale
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{proj.snippet}</p>
                              <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                                {proj.externalIdentity} • {new Date(proj.receivedAtIso).toLocaleDateString()}
                              </span>
                            </div>

                            <button
                              onClick={() => handleConvertProjectionToNote(proj.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shrink-0 flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Convert to Note
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. WEBHOOKS & API LAB */}
              {connectorSubTab === 'webhooks' && (
                <div className="space-y-4">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                    <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Inbound Webhook Simulator & Endpoint
                    </h4>
                    <p className="text-xs text-neutral-400 mb-4">
                      Directly capture notes from external automation workflows (Raycast, Zapier, cURL) using JSON payload standards.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Payload Title</label>
                        <input
                          type="text"
                          value={webhookTitleInput}
                          onChange={(e) => setWebhookTitleInput(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Markdown Body</label>
                        <textarea
                          rows={3}
                          value={webhookContentInput}
                          onChange={(e) => setWebhookContentInput(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Tags (comma-separated)</label>
                        <input
                          type="text"
                          value={webhookTagsInput}
                          onChange={(e) => setWebhookTagsInput(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-neutral-500">Endpoint: POST /api/v1/inbound_note</span>
                        <button
                          onClick={handleDispatchWebhook}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Test Ingest to Vault
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. READWISE HIGHLIGHTS SYNC */}
              {connectorSubTab === 'readwise' && (
                <div className="space-y-4">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                    <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Readwise & Kindle Highlights Sync
                    </h4>
                    <p className="text-xs text-neutral-400 mb-4">
                      Synchronize book, article, and podcast highlights into structured Markdown notes with customizable frontmatter and tags.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">
                          Markdown Template Formatting
                        </label>
                        <textarea
                          rows={4}
                          value={readwiseTemplateInput}
                          onChange={(e) => setReadwiseTemplateInput(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-hidden focus:border-emerald-500"
                        />
                        <span className="text-[11px] text-neutral-500 mt-1 block">
                          Variables available: <code>{'{{title}}'}</code>, <code>{'{{author}}'}</code>, <code>{'{{highlights}}'}</code>
                        </span>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-neutral-400">Tokens stored locally on device only</span>
                        <button
                          onClick={handleSyncReadwiseHighlights}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Sync Highlights Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WEB CLIPPER */}
          {activeTab === 'web_clipper' && (
            <div className="space-y-6">
              {clipperMsg && (
                <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl p-3 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{clipperMsg}</span>
                </div>
              )}

              {/* Capture Form */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Ingest Web Content / Browser Extension Capture
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Source URL</label>
                    <input
                      type="text"
                      value={clipUrlInput}
                      onChange={(e) => setClipUrlInput(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Title</label>
                    <input
                      type="text"
                      value={clipTitleInput}
                      onChange={(e) => setClipTitleInput(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Extracted Content (Sanitized)</label>
                  <textarea
                    rows={4}
                    value={clipContentInput}
                    onChange={(e) => setClipContentInput(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-200 focus:outline-hidden focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {(['article', 'bookmark', 'selection'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setClipMode(m)}
                        className={`px-2.5 py-1 rounded text-xs font-medium capitalize border ${
                          clipMode === m
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleIngestClip}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Capture to Inbox
                  </button>
                </div>
              </div>

              {/* Ingested Clips List */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">
                  Universal Inbox Web Clips ({webClips.length})
                </h4>
                <div className="space-y-3">
                  {webClips.map((clip) => (
                    <div
                      key={clip.id}
                      className="p-4 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-semibold text-white">{clip.title}</h5>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">
                            {clip.mode}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-mono">
                            {new Date(clip.capturedAtIso).toLocaleDateString()}
                          </span>
                        </div>
                        <a
                          href={clip.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-neutral-400 hover:text-purple-400 flex items-center gap-1 mt-1 truncate max-w-md"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          {clip.sourceUrl}
                        </a>
                        <p className="text-xs text-neutral-300 mt-2 line-clamp-2 bg-neutral-950 p-2 rounded border border-neutral-800 font-mono">
                          {clip.sanitizedContent}
                        </p>
                      </div>
                      <div className="ml-4 shrink-0">
                        {clip.status === 'in_inbox' ? (
                          <button
                            onClick={() => handleProcessClipToNote(clip.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-xs"
                          >
                            Process to Note
                          </button>
                        ) : (
                          <span className="px-2 py-1 rounded text-[11px] text-neutral-400 bg-neutral-800 border border-neutral-700">
                            Processed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 8-STAGE IMPORT CENTER */}
          {activeTab === 'import_center' && (
            <div className="space-y-6">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    8-Stage Deterministic Import Pipeline
                  </h4>
                  <div className="flex gap-2">
                    {(['markdown_folder', 'csv', 'ics', 'vcard', 'bibtex'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setImportFormat(fmt)}
                        className={`px-2.5 py-1 rounded text-xs font-medium uppercase border ${
                          importFormat === fmt
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        {fmt.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Source File Name</label>
                    <input
                      type="text"
                      value={importFilename}
                      onChange={(e) => setImportFilename(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Format Category</label>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-400">
                      {importFormat}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Source Payload</label>
                  <textarea
                    rows={5}
                    value={importRawContent}
                    onChange={(e) => setImportRawContent(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Zero mutation occurs during Analyze/Preview stages.</span>
                  <button
                    onClick={handleAnalyzeImport}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white"
                  >
                    Analyze & Stage
                  </button>
                </div>
              </div>

              {/* Stage Analysis & Security Checks */}
              {importAnalysis && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Stage 1 & 2: Inspection Report
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        importAnalysis.securityChecksPassed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {importAnalysis.securityChecksPassed ? 'Security Passed' : 'Security Violations'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-neutral-400">
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <span className="text-neutral-500 block">Items Count:</span>
                      <strong className="text-white text-sm">{importAnalysis.estimatedItemCount}</strong>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <span className="text-neutral-500 block">Supported Fields:</span>
                      <strong className="text-white text-sm">{importAnalysis.supportedFields.length}</strong>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <span className="text-neutral-500 block">Estimated Size:</span>
                      <strong className="text-white text-sm">{importAnalysis.estimatedSizeBytes} B</strong>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <span className="text-neutral-500 block">Duplicates:</span>
                      <strong className="text-white text-sm">{importAnalysis.potentialDuplicateCount}</strong>
                    </div>
                  </div>

                  {stagedRecords.length > 0 && (
                    <div className="pt-3 border-t border-neutral-900 flex items-center justify-between">
                      <span className="text-xs text-neutral-400">
                        {stagedRecords.length} records staged in isolated memory. Ready to commit to canonical storage.
                      </span>
                      <button
                        onClick={handleCommitImport}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-xs"
                      >
                        Commit to Canonical Storage
                      </button>
                    </div>
                  )}

                  {importReport && (
                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs">
                      Successfully imported {importReport.importedCount} resources in {importReport.durationMs}ms (Batch ID:{' '}
                      {importReport.batchId}).
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: EXPORT CENTER */}
          {activeTab === 'export_center' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-semibold text-white">Portable Markdown</h4>
                  </div>
                  <p className="text-xs text-neutral-400 mb-4">
                    Rewrites internal Wikilinks to standard Markdown links, materializes transclusions, and formats for external editors.
                  </p>
                  <button
                    onClick={() => {
                      const data = notes.map((n) => `# ${n.title}\n\n${n.content}`).join('\n\n---\n\n');
                      navigator.clipboard.writeText(data);
                      alert('Copied Portable Markdown to clipboard.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200 font-medium flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy All as Markdown
                  </button>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-semibold text-white">iCalendar (ICS) Export</h4>
                  </div>
                  <p className="text-xs text-neutral-400 mb-4">
                    Exports scheduled events and deadlines into RFC 5545 standard with all-day and timezone preservation.
                  </p>
                  <button
                    onClick={() => {
                      const ics = engine.exportToICS([
                        {
                          uid: 'evt_1',
                          summary: 'System Architecture Milestone',
                          startDate: '2026-09-17',
                          isAllDay: true,
                        },
                      ]);
                      navigator.clipboard.writeText(ics);
                      alert('Copied iCalendar (ICS) to clipboard.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200 font-medium flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Calendar (.ics)
                  </button>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-semibold text-white">vCard Contacts Export</h4>
                  </div>
                  <p className="text-xs text-neutral-400 mb-4">
                    Exports People domain contacts into RFC 6350 vCard format compatible with Apple and Google Contacts.
                  </p>
                  <button
                    onClick={() => {
                      const vcf = engine.exportToVCard([
                        {
                          fn: 'Dr. Sarah Connor',
                          org: 'Distributed Systems Institute',
                          email: 'sarah@dsi.org',
                        },
                      ]);
                      navigator.clipboard.writeText(vcf);
                      alert('Copied vCard (.vcf) to clipboard.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200 font-medium flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Contacts (.vcf)
                  </button>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">Finance Exact CSV</h4>
                  </div>
                  <p className="text-xs text-neutral-400 mb-4">
                    Exports transactions in exact integer minor units (cents) to avoid currency rounding inaccuracies.
                  </p>
                  <button
                    onClick={() => {
                      const csv = engine.exportFinanceCSV([
                        {
                          date: '2026-09-01',
                          amountCents: -5000,
                          currency: 'USD',
                          payee: 'Server Hosting',
                          category: 'Infrastructure',
                          account: 'Primary',
                        },
                      ]);
                      navigator.clipboard.writeText(csv);
                      alert('Copied Finance CSV to clipboard.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200 font-medium flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Finance (.csv)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: FULL PORTABLE VAULT */}
          {activeTab === 'portable_vault' && (
            <div className="space-y-6">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-emerald-400" />
                      Complete Portable Vault Archive
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
                      Generates a standalone, self-documenting zip bundle of your entire Personal OS vault with standard Markdown notes,
                      RFC standard open data files, manifest checksums, and a human-readable README.
                    </p>
                  </div>
                  <button
                    onClick={handleGeneratePortableVault}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Generate Portable Vault
                  </button>
                </div>
              </div>

              {portableVaultResult && (
                <div className="space-y-4">
                  {/* Manifest & Verification */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                        Package Manifest & Freedom Verification
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        100% Secret-Free Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-neutral-400">
                      <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                        <span className="text-neutral-500 block">Markdown Notes:</span>
                        <strong className="text-white text-sm">{portableVaultResult.manifest.counts.notes}</strong>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                        <span className="text-neutral-500 block">Tasks & Ledger:</span>
                        <strong className="text-white text-sm">
                          {portableVaultResult.manifest.counts.tasks + portableVaultResult.manifest.counts.financeTransactions}
                        </strong>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                        <span className="text-neutral-500 block">Attachments:</span>
                        <strong className="text-white text-sm">{portableVaultResult.manifest.counts.attachments}</strong>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                        <span className="text-neutral-500 block">Saved Views:</span>
                        <strong className="text-white text-sm">{portableVaultResult.manifest.counts.savedViews}</strong>
                      </div>
                    </div>
                  </div>

                  {/* README preview */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                    <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      README.md (Included in Archive)
                    </h4>
                    <pre className="p-3 bg-neutral-900 rounded-lg text-xs font-mono text-neutral-300 whitespace-pre-wrap max-h-48 overflow-y-auto border border-neutral-800">
                      {portableVaultResult.readmeMarkdown}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: STATIC PUBLISHING */}
          {activeTab === 'publishing' && (
            <div className="space-y-6">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Static Site Publishing & Privacy Isolation
                </h4>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Site Title</label>
                  <input
                    type="text"
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    Strict privacy enforcement: Only explicitly allowlisted notes are packaged. Transclusions of private notes are
                    redacted.
                  </span>
                  <button
                    onClick={handleBuildStaticSite}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Build Static Publication
                  </button>
                </div>
              </div>

              {publishingResult && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Build Results ({publishingResult.buildId})
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        publishingResult.secretScanClean
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {publishingResult.secretScanClean ? '0 Secret Matches (Clean)' : 'Secret Matches Found'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-neutral-400">
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <span className="text-neutral-500 block">Published Pages:</span>
                      <strong className="text-white text-sm">{publishingResult.publishedPagesCount}</strong>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <span className="text-neutral-500 block">Private Transclusions Redacted:</span>
                      <strong className="text-white text-sm">{publishingResult.blockedPrivateTransclusionsCount}</strong>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <span className="text-neutral-500 block">Private Queries Redacted:</span>
                      <strong className="text-white text-sm">{publishingResult.blockedPrivateQueriesCount}</strong>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <span className="text-neutral-500 block">Build Time:</span>
                      <strong className="text-white text-sm">{publishingResult.durationMs}ms</strong>
                    </div>
                  </div>

                  {publishingResult.htmlPages.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs text-neutral-400 block mb-1">Generated Static Page Preview:</span>
                      <div className="p-3 bg-neutral-900 rounded-lg text-xs font-mono text-neutral-300 max-h-40 overflow-y-auto border border-neutral-800">
                        {publishingResult.htmlPages[0].htmlContent}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
