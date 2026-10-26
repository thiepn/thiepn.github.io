/**
 * PKM V1.8: Unified Export Center Modal
 * The central hub for all outward-data pathways: Export, Publish, Share, and Interchange.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Share2,
  FileText,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Folder as FolderIcon,
  Globe,
  Settings,
  BookOpen,
  Calendar,
  Users,
  DollarSign,
  Heart,
  HelpCircle,
  Copy,
  Printer,
  ChevronRight,
  Eye,
  Archive,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { Note, Folder, AppSettings, SavedSearch } from '../../../types';
import {
  ExportScopeType,
  ExportFormat,
  ExportScopeConfig,
  ExportPipelineResult,
  ExportProfile,
  PrivacyFinding,
} from '../exportTypes';
import { BUILTIN_EXPORT_PROFILES } from '../exportProfiles';
import { INTERCHANGE_MATRIX } from '../interchangeMatrix';
import { executeExportPipeline } from '../exportPipeline';
import {
  copyNoteAsMarkdown,
  copyHtmlToClipboard,
  shareViaWebShareApi,
} from '../sharingService';
import { triggerFileDownload } from '../../publishing';
import { scanNoteForPrivacyFindings } from '../privacyScanner';
import { runExportCertificationSuite, CertificationResult } from '../exportCertification';

interface ExportCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  settings?: AppSettings;
  savedSearches?: SavedSearch[];
  initialNoteId?: string;
  onOpenRecoveryCenter?: () => void;
}

export function ExportCenterModal({
  isOpen,
  onClose,
  notes,
  folders,
  settings,
  savedSearches,
  initialNoteId,
  onOpenRecoveryCenter,
}: ExportCenterModalProps) {
  // Mode: 'quick' vs 'wizard' vs 'matrix' vs 'audit'
  const [activeTab, setActiveTab] = useState<'wizard' | 'quick' | 'matrix' | 'certification'>('quick');

  // Wizard Step (1 to 5)
  const [step, setStep] = useState<number>(1);

  // Configuration State
  const [selectedProfileId, setSelectedProfileId] = useState<string>('clean-portable-markdown');
  const [scopeType, setScopeType] = useState<ExportScopeType>(initialNoteId ? 'current-note' : 'selected-notes');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(initialNoteId ? [initialNoteId] : notes.slice(0, 5).map((n) => n.id));
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folders[0]?.id || null);
  const [format, setFormat] = useState<ExportFormat>('portable-markdown');

  // Privacy & Dependency Config
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(true);
  const [hidePrivateTags, setHidePrivateTags] = useState<boolean>(true);
  const [excludeTagsInput, setExcludeTagsInput] = useState<string>('private, secret, confidential');
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(true);
  const [linkRewriteMode, setLinkRewriteMode] = useState<'relative-markdown' | 'preserve-wikilinks' | 'plain-text'>('relative-markdown');
  const [includeTableOfContents, setIncludeTableOfContents] = useState<boolean>(true);
  const [includeBibliography, setIncludeBibliography] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia' | 'system'>('light');

  // Execution & Progress State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [exportResult, setExportResult] = useState<ExportPipelineResult | null>(null);
  const [copiedState, setCopiedState] = useState<boolean>(false);
  const [certResult, setCertResult] = useState<CertificationResult | null>(null);

  // Active target note for quick export
  const activeNote = useMemo(() => {
    if (initialNoteId) {
      return notes.find((n) => n.id === initialNoteId) || notes[0];
    }
    return notes[0];
  }, [initialNoteId, notes]);

  // Apply profile changes
  const applyProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    const profile = BUILTIN_EXPORT_PROFILES.find((p) => p.id === profileId);
    if (profile) {
      setFormat(profile.format);
      if (profile.config.linkRewriteMode) setLinkRewriteMode(profile.config.linkRewriteMode as any);
      if (profile.config.hidePrivateTags !== undefined) setHidePrivateTags(profile.config.hidePrivateTags);
      if (profile.config.maskSensitiveData !== undefined) setMaskSensitiveData(profile.config.maskSensitiveData);
      if (profile.config.includeAttachments !== undefined) setIncludeAttachments(profile.config.includeAttachments);
      if (profile.config.includeTableOfContents !== undefined) setIncludeTableOfContents(profile.config.includeTableOfContents);
      if (profile.config.includeBibliography !== undefined) setIncludeBibliography(profile.config.includeBibliography);
    }
  };

  // Build current export configuration
  const currentConfig: ExportScopeConfig = useMemo(() => {
    const excludeTags = excludeTagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    let primaryIds: string[] = [];
    if (scopeType === 'current-note' && activeNote) {
      primaryIds = [activeNote.id];
    } else if (scopeType === 'selected-notes') {
      primaryIds = selectedNoteIds;
    } else if (scopeType === 'folder' && selectedFolderId) {
      primaryIds = notes.filter((n) => n.folderId === selectedFolderId).map((n) => n.id);
    } else if (scopeType === 'full-vault') {
      primaryIds = notes.map((n) => n.id);
    }

    return {
      scopeType,
      primaryNoteIds: primaryIds,
      folderId: selectedFolderId,
      includeAttachments,
      includeReferences: true,
      excludeTags,
      hidePrivateTags,
      maskSensitiveData,
      linkRewriteMode,
      includeBacklinks: true,
      includeTableOfContents,
      includeBibliography,
      theme,
    };
  }, [
    scopeType,
    activeNote,
    selectedNoteIds,
    selectedFolderId,
    notes,
    includeAttachments,
    excludeTagsInput,
    hidePrivateTags,
    maskSensitiveData,
    linkRewriteMode,
    includeTableOfContents,
    includeBibliography,
    theme,
  ]);

  // Real-time Privacy Audit for current scope
  const realTimePrivacyFindings = useMemo(() => {
    const findings: PrivacyFinding[] = [];
    const targetNotes = notes.filter((n) => currentConfig.primaryNoteIds.includes(n.id));
    for (const note of targetNotes) {
      const f = scanNoteForPrivacyFindings(note, currentConfig);
      findings.push(...f);
    }
    return findings;
  }, [notes, currentConfig]);

  // Run Export Action
  const handleExecuteExport = async () => {
    setIsExporting(true);
    setProgressMsg('Initializing export pipeline...');
    try {
      const result = await executeExportPipeline(notes, folders, currentConfig, format, {
        settings,
        savedSearches,
        onProgress: (p) => setProgressMsg(p.message),
      });
      setExportResult(result);

      if (result.success) {
        if (result.zipBlob) {
          triggerFileDownload(result.zipBlob, `${format}_export.zip`, 'application/zip');
        } else if (result.primaryFileContent && result.primaryFileName) {
          const mime = result.format === 'standalone-html' ? 'text/html' : 'text/markdown';
          triggerFileDownload(result.primaryFileContent, result.primaryFileName, mime);
        }
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(`Export error: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Quick 1-Click Handlers
  const handleQuickCopyMarkdown = async () => {
    if (!activeNote) return;
    const ok = await copyNoteAsMarkdown(activeNote);
    if (ok) {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    }
  };

  const handleQuickShare = async () => {
    if (!activeNote) return;
    await shareViaWebShareApi({
      title: activeNote.title || 'Untitled Note',
      text: activeNote.content,
    });
  };

  const handleRunCertification = async () => {
    const res = await runExportCertificationSuite();
    setCertResult(res);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-center-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-5xl w-full h-[88vh] max-h-[850px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-center-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Export & Sharing Center
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Privacy-safe portable export, publishing, and standard data interchange.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Navigation */}
            <div className="flex items-center bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('quick')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'quick'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Quick Share
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wizard')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'wizard'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Pipeline Wizard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'matrix'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Interchange Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('certification')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'certification'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Certification Suite
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: QUICK SHARE */}
          {activeTab === 'quick' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Active Target Note</span>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                      {activeNote?.title || 'Untitled Note'}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {activeNote?.tags?.map((t) => `#${t}`).join(' ') || 'No tags'} • Updated {activeNote ? new Date(activeNote.updatedAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wizard')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    Custom Scope <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Action Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleQuickCopyMarkdown}
                  className="flex items-start gap-4 p-4 text-left border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {copiedState ? '✓ Copied to Clipboard!' : 'Copy Clean Markdown'}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Copies sanitized markdown with resolved cloze deletions and standard formatting.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormat('standalone-html');
                    setScopeType('current-note');
                    handleExecuteExport();
                  }}
                  className="flex items-start gap-4 p-4 text-left border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Download Standalone HTML
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Single offline HTML document with embedded styles, KaTeX math, and print CSS.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleQuickShare}
                  className="flex items-start gap-4 p-4 text-left border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      System Share Sheet
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Trigger native OS sharing sheet for AirDrop, Messages, Mail, or device sharing.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-start gap-4 p-4 text-left border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Print / Save as PDF
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Print-optimized preview with clean page breaks and high contrast.
                    </p>
                  </div>
                </button>
              </div>

              {/* Distinction Banner: Export vs Backup */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Exporting vs. Disaster Recovery Backup
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Export creates clean files for external use. To create a full restorable system snapshot, use Vault Backup.
                    </p>
                  </div>
                </div>
                {onOpenRecoveryCenter && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRecoveryCenter();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                  >
                    Open Backup Center
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PIPELINE WIZARD */}
          {activeTab === 'wizard' && (
            <div className="space-y-6">
              {/* Stepper Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
                {[
                  { num: 1, label: 'Scope' },
                  { num: 2, label: 'Profile & Format' },
                  { num: 3, label: 'Privacy & Rules' },
                  { num: 4, label: 'Dependencies' },
                  { num: 5, label: 'Review & Run' },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setStep(s.num)}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                      step === s.num
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : step > s.num
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-400 dark:text-neutral-600'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        step === s.num
                          ? 'bg-blue-600 text-white'
                          : step > s.num
                          ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {step > s.num ? '✓' : s.num}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Step 1: Scope */}
              {step === 1 && (
                <div className="space-y-4 max-w-2xl">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Step 1: Select Export Scope
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { type: 'current-note', label: 'Current Active Note', desc: activeNote?.title || 'Selected Note' },
                      { type: 'selected-notes', label: 'Specific Notes Set', desc: `${selectedNoteIds.length} notes selected` },
                      { type: 'folder', label: 'Entire Folder', desc: folders.find((f) => f.id === selectedFolderId)?.name || 'Select folder' },
                      { type: 'full-vault', label: 'Full Vault Content', desc: `${notes.length} total notes` },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setScopeType(item.type as ExportScopeType)}
                        className={`p-4 text-left border rounded-xl transition-all ${
                          scopeType === item.type
                            ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 ring-1 ring-blue-500'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{item.label}</div>
                        <div className="text-xs text-neutral-500 mt-1">{item.desc}</div>
                      </button>
                    ))}
                  </div>

                  {scopeType === 'folder' && (
                    <div className="pt-2">
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Select Target Folder:
                      </label>
                      <select
                        value={selectedFolderId || ''}
                        onChange={(e) => setSelectedFolderId(e.target.value || null)}
                        className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      >
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Profile & Format */}
              {step === 2 && (
                <div className="space-y-4 max-w-3xl">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Step 2: Select Format or Export Profile
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BUILTIN_EXPORT_PROFILES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyProfile(p.id)}
                        className={`p-3.5 text-left border rounded-xl transition-all ${
                          selectedProfileId === p.id
                            ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 ring-1 ring-blue-500'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">{p.name}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-500">
                            {p.format}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                          {p.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Privacy & Rules */}
              {step === 3 && (
                <div className="space-y-4 max-w-2xl">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Step 3: Privacy & Security Rules
                  </h3>

                  <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={maskSensitiveData}
                        onChange={(e) => setMaskSensitiveData(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                          Scan and Redact Sensitive Secrets & Credentials
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          Automatically masks API keys, payment cards, SSNs, and OAuth tokens.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hidePrivateTags}
                        onChange={(e) => setHidePrivateTags(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                          Strip Excluded & Private Tags
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          Omits tags matching the exclusion list from exported documents.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Exclude Tags (comma-separated):
                    </label>
                    <input
                      type="text"
                      value={excludeTagsInput}
                      onChange={(e) => setExcludeTagsInput(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      placeholder="private, secret, draft"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Dependencies */}
              {step === 4 && (
                <div className="space-y-4 max-w-2xl">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Step 4: Dependency & Link Resolution
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Internal Wikilink Rewriting:
                      </label>
                      <select
                        value={linkRewriteMode}
                        onChange={(e) => setLinkRewriteMode(e.target.value as any)}
                        className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="relative-markdown">Rewrite to Portable Relative Markdown [Target](./Target.md)</option>
                        <option value="preserve-wikilinks">Preserve Native [[Wikilinks]] (PKM / Obsidian mode)</option>
                        <option value="plain-text">Convert Out-of-Scope Links to Plain Text</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAttachments}
                        onChange={(e) => setIncludeAttachments(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                          Package Embedded Attachments
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          Includes note images and local media under assets/ directory.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 5: Review & Run */}
              {step === 5 && (
                <div className="space-y-5 max-w-2xl">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Step 5: Pre-Flight Audit & Review
                  </h3>

                  <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <span className="text-neutral-500">Notes Scope</span>
                        <p className="font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                          {currentConfig.primaryNoteIds.length}
                        </p>
                      </div>
                      <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <span className="text-neutral-500">Target Format</span>
                        <p className="font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                          {format}
                        </p>
                      </div>
                      <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <span className="text-neutral-500">Privacy Audit</span>
                        <p className={`font-bold mt-0.5 ${realTimePrivacyFindings.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {realTimePrivacyFindings.length === 0 ? '✓ Clean' : `${realTimePrivacyFindings.length} Items`}
                        </p>
                      </div>
                    </div>

                    {realTimePrivacyFindings.length > 0 && (
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Privacy Protections Applied:
                        </span>
                        <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1 pl-4 list-disc max-h-32 overflow-y-auto">
                          {realTimePrivacyFindings.map((f, i) => (
                            <li key={i}>{f.description} ({f.autoRemediated ? 'Auto-remediated' : 'Warning'})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExecuteExport}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {progressMsg || 'Processing...'}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Execute Export & Download Package
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Stepper Navigation Buttons */}
              <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"
                >
                  Back
                </button>
                {step < 5 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(5, s + 1))}
                    className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200"
                  >
                    Next Step
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INTERCHANGE MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Authoritative Outward-Data Interchange Matrix
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Complete inventory of all standard export pathways and zero-loss portability protocols.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                    <tr>
                      <th className="p-3">Source Domain</th>
                      <th className="p-3">Export Formats</th>
                      <th className="p-3">Standard Spec</th>
                      <th className="p-3">Privacy Default</th>
                      <th className="p-3">Leave App Usability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {INTERCHANGE_MATRIX.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                        <td className="p-3 font-semibold text-neutral-900 dark:text-neutral-100">{row.sourceDomain}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {row.exportFormats.map((fmt) => (
                              <span key={fmt} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-mono text-[10px]">
                                {fmt}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-neutral-500">{row.standardSpecification || 'N/A'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            row.privacyDefault === 'Stripped' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          }`}>
                            {row.privacyDefault}
                          </span>
                        </td>
                        <td className="p-3 text-neutral-700 dark:text-neutral-300 font-medium">{row.leaveTheAppUsability}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CERTIFICATION SUITE */}
          {activeTab === 'certification' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Automated Export & Interchange Certification Suite
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Validates "Leave the App" independence, deterministic checksums, secret scanners, and cross-platform filename rules.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunCertification}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4" /> Run Certification Tests
              </button>

              {certResult && (
                <div className={`p-4 rounded-xl border ${
                  certResult.passed
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-100'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-900 dark:text-red-100'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {certResult.passed ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" /> All {certResult.testsRun} Certification Tests Passed! ({certResult.durationMs}ms)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-red-600" /> Certification Failed ({certResult.failures.length} issues)
                      </>
                    )}
                  </div>
                  {certResult.failures.length > 0 && (
                    <ul className="mt-2 text-xs space-y-1 list-disc pl-5">
                      {certResult.failures.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
