/**
 * PKM Phase P39: Publication Manager Modal
 * Full-featured workspace for configuring, auditing, previewing, and building static site publications.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Copy,
  Download,
  Eye,
  ShieldAlert,
  Settings,
  FileText,
  Folder,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Code,
  Lock,
  X,
} from 'lucide-react';
import { Note, Folder as FolderType } from '../../../types';
import {
  Publication,
  PublicationSourceType,
  PublicationTheme,
  LinkExpansionMode,
  PublicationValidationReport,
  PublicationBuildResult,
} from '../publishingTypes';
import { publicationStorage } from '../publicationStorage';
import { auditPublication } from '../publicationValidator';
import { buildPublicationSite } from '../publicationBuilder';
import { triggerFileDownload } from '../singleNoteExporter';
import { vaultManager } from '../../indexer';

interface PublicationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: FolderType[];
  initialPublicationId?: string;
  initialNoteId?: string;
}

type ActiveTab = 'source' | 'audit' | 'preview' | 'build';

export const PublicationManagerModal: React.FC<PublicationManagerModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  initialPublicationId,
  initialNoteId,
}) => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedPubId, setSelectedPubId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('source');
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [buildResult, setBuildResult] = useState<PublicationBuildResult | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const [copiedChecksum, setCopiedChecksum] = useState<boolean>(false);

  // Load publications on mount or open
  useEffect(() => {
    if (isOpen) {
      let list = publicationStorage.getPublications();
      if (list.length === 0) {
        // Create initial default publication
        const defaultPub = publicationStorage.createDefaultPublication('My Digital Garden', {
          type: initialNoteId ? 'single-note' : 'all-notes',
          noteId: initialNoteId,
        });
        publicationStorage.savePublication(defaultPub);
        list = [defaultPub];
      }
      setPublications(list);

      if (initialPublicationId && list.some((p) => p.id === initialPublicationId)) {
        setSelectedPubId(initialPublicationId);
      } else if (list.length > 0 && !selectedPubId) {
        setSelectedPubId(list[0].id);
      }
    }
  }, [isOpen, initialPublicationId, initialNoteId]);

  const activePub = useMemo(() => {
    return publications.find((p) => p.id === selectedPubId) || publications[0];
  }, [publications, selectedPubId]);

  // Compute live validation audit report
  const auditReport: PublicationValidationReport = useMemo(() => {
    if (!activePub) {
      return {
        isValid: false,
        canBuild: false,
        issues: [],
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        resolvedNoteCount: 0,
        dependentNoteCount: 0,
        isEncryptedVault: false,
      };
    }
    return auditPublication(activePub, notes, folders, vaultManager.getIndex());
  }, [activePub, notes, folders]);

  // Update publication helper
  const handleUpdatePub = (updater: (prev: Publication) => Publication) => {
    if (!activePub) return;
    const updated = updater(activePub);
    publicationStorage.savePublication(updated);
    setPublications(publicationStorage.getPublications());
  };

  const handleCreateNewPub = () => {
    const newPub = publicationStorage.createDefaultPublication(
      `Site ${publications.length + 1}`,
      { type: 'all-notes' }
    );
    publicationStorage.savePublication(newPub);
    const list = publicationStorage.getPublications();
    setPublications(list);
    setSelectedPubId(newPub.id);
    setActiveTab('source');
  };

  const handleDeletePub = (id: string) => {
    if (publications.length <= 1) return;
    publicationStorage.deletePublication(id);
    const list = publicationStorage.getPublications();
    setPublications(list);
    if (selectedPubId === id && list.length > 0) {
      setSelectedPubId(list[0].id);
    }
  };

  const handleDuplicatePub = (id: string) => {
    const dup = publicationStorage.duplicatePublication(id);
    if (dup) {
      const list = publicationStorage.getPublications();
      setPublications(list);
      setSelectedPubId(dup.id);
    }
  };

  const handleRunBuild = async () => {
    if (!activePub || !auditReport.canBuild) return;
    setIsBuilding(true);
    try {
      const result = await buildPublicationSite(
        activePub,
        notes,
        folders,
        vaultManager.getIndex()
      );
      setBuildResult(result);
      if (result.previewHtml) {
        setPreviewSrcDoc(result.previewHtml);
      }
      setPublications(publicationStorage.getPublications());
      setActiveTab('build');
    } catch (err) {
      console.error('Failed to build publication:', err);
    } finally {
      setIsBuilding(false);
    }
  };

  const handlePreview = async () => {
    if (!activePub) return;
    setIsBuilding(true);
    try {
      const result = await buildPublicationSite(
        activePub,
        notes,
        folders,
        vaultManager.getIndex()
      );
      if (result.previewHtml) {
        setPreviewSrcDoc(result.previewHtml);
      }
      setActiveTab('preview');
    } finally {
      setIsBuilding(false);
    }
  };

  if (!isOpen || !activePub) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Static Site Publishing & Export
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Turn your canonical notes into portable, self-contained static websites and packages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunBuild}
              disabled={isBuilding || !auditReport.canBuild}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                auditReport.canBuild
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isBuilding ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Build Site</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar: Saved Publications List */}
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Publications ({publications.length})
                </span>
                <button
                  type="button"
                  onClick={handleCreateNewPub}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                  title="New Publication"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {publications.map((p) => {
                  const isSelected = p.id === activePub.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPubId(p.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {p.source.type} • {p.output.format}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePub(p.id);
                          }}
                          className="p-1 hover:text-indigo-600 text-slate-400"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {publications.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePub(p.id);
                            }}
                            className="p-1 hover:text-rose-600 text-slate-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scope Badge Summary */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Scope Summary
              </div>
              <div className="flex justify-between">
                <span>Published Pages:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {auditReport.resolvedNoteCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dependencies:</span>
                <span className="font-medium">{auditReport.dependentNoteCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Validation Issues:</span>
                <span
                  className={`font-semibold ${
                    auditReport.errorCount > 0
                      ? 'text-rose-500'
                      : auditReport.warningCount > 0
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {auditReport.issues.length}
                </span>
              </div>
            </div>
          </div>

          {/* Right Workspace: Tabs & Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center gap-2 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'source'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Source & Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Privacy & Audit</span>
                {auditReport.issues.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      auditReport.errorCount > 0
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {auditReport.issues.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handlePreview}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'preview'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>In-App Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('build')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'build'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Build & Export</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-6 overflow-y-auto min-h-0">
              {/* 1. SOURCE & SETTINGS TAB */}
              {activeTab === 'source' && (
                <div className="max-w-3xl space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Publication Name
                      </label>
                      <input
                        type="text"
                        value={activePub.name}
                        onChange={(e) =>
                          handleUpdatePub((p) => ({ ...p, name: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        placeholder="e.g. My Digital Garden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Site Title
                      </label>
                      <input
                        type="text"
                        value={activePub.output.siteTitle}
                        onChange={(e) =>
                          handleUpdatePub((p) => ({
                            ...p,
                            output: { ...p.output, siteTitle: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        placeholder="e.g. Alice's Knowledge Hub"
                      />
                    </div>
                  </div>

                  {/* Source Type Selector */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Publication Source & Scope
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'all-notes', label: 'All Vault Notes', icon: Layers },
                          { id: 'folder', label: 'Folder / Category', icon: Folder },
                          { id: 'single-note', label: 'Single Note', icon: FileText },
                          { id: 'selected-notes', label: 'Selected Notes', icon: CheckCircle2 },
                          { id: 'moc', label: 'MOC Tree', icon: Globe },
                        ] as const
                      ).map((src) => {
                        const isSelected = activePub.source.type === src.id;
                        const IconComp = src.icon;
                        return (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() =>
                              handleUpdatePub((p) => ({
                                ...p,
                                source: { ...p.source, type: src.id as PublicationSourceType },
                              }))
                            }
                            className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <IconComp className="w-4 h-4 shrink-0" />
                            <span>{src.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Contextual Source Pickers */}
                    {activePub.source.type === 'folder' && (
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Select Folder
                        </label>
                        <select
                          value={activePub.source.folderId || ''}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              source: { ...p.source, folderId: e.target.value || null },
                            }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        >
                          <option value="">-- Choose a folder --</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              📁 {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {activePub.source.type === 'single-note' && (
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Select Root Note
                        </label>
                        <select
                          value={activePub.source.noteId || ''}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              source: { ...p.source, noteId: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        >
                          <option value="">-- Choose a note --</option>
                          {notes.map((n) => (
                            <option key={n.id} value={n.id}>
                              📄 {n.title || 'Untitled Note'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {activePub.source.type === 'moc' && (
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Select Root MOC Note
                        </label>
                        <select
                          value={activePub.source.mocNoteId || ''}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              source: { ...p.source, mocNoteId: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        >
                          <option value="">-- Choose MOC note --</option>
                          {notes.map((n) => (
                            <option key={n.id} value={n.id}>
                              🗺️ {n.title || 'Untitled Note'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Exclusions & Privacy Rules */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Exclusion & Privacy Boundaries
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.source.excludeDrafts ?? true}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              source: { ...p.source, excludeDrafts: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>Exclude Drafts (publish: false / status: draft)</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.source.excludeDailyNotes ?? true}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              source: { ...p.source, excludeDailyNotes: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>Exclude Daily Log Notes</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.source.excludeTemplates ?? true}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              source: { ...p.source, excludeTemplates: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>Exclude Template Notes</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.options.hidePrivateTags ?? true}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              options: { ...p.options, hidePrivateTags: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>Strip Private Tags from Content</span>
                      </label>
                    </div>

                    {/* Exclude Tags List */}
                    <div className="pt-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Excluded Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={(activePub.source.excludeTags || []).join(', ')}
                        onChange={(e) => {
                          const tags = e.target.value
                            .split(',')
                            .map((t) => t.trim().replace(/^#/, ''))
                            .filter(Boolean);
                          handleUpdatePub((p) => ({
                            ...p,
                            source: { ...p.source, excludeTags: tags },
                          }));
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        placeholder="private, confidential, secret, draft"
                      />
                    </div>
                  </div>

                  {/* Output & Theme Config */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Output Format & Features
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Theme
                        </label>
                        <select
                          value={activePub.output.theme}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              output: { ...p.output, theme: e.target.value as PublicationTheme },
                            }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        >
                          <option value="auto">Auto (System Theme)</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="sepia">Sepia</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Base Path (Hosting URL)
                        </label>
                        <input
                          type="text"
                          value={activePub.output.basePath}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              output: { ...p.output, basePath: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                          placeholder="/ or /my-repo/"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Link Expansion
                        </label>
                        <select
                          value={activePub.source.includeLinkedNotes || 'never'}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              source: {
                                ...p.source,
                                includeLinkedNotes: e.target.value as LinkExpansionMode,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        >
                          <option value="never">Never (Direct Selection Only)</option>
                          <option value="one-level">1-Level Connected Notes</option>
                          <option value="recursive">Recursive Reachable Graph</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.options.includeStaticSearch}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              options: { ...p.options, includeStaticSearch: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>Client-Side Search</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.options.includeTableOfContents}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              options: { ...p.options, includeTableOfContents: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>Table of Contents</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.options.includeBacklinks}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              options: { ...p.options, includeBacklinks: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>Linked Backlinks</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.options.includeBibliography}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              options: { ...p.options, includeBibliography: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>Bibliographies</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.options.enableSitemap}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              options: { ...p.options, enableSitemap: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>XML Sitemap</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePub.options.enableRss}
                          onChange={(e) =>
                            handleUpdatePub((p) => ({
                              ...p,
                              options: { ...p.options, enableRss: e.target.checked },
                            }))
                          }
                          className="rounded text-indigo-600"
                        />
                        <span>RSS Feed</span>
                      </label>
                    </div>

                    {/* Properties Allowlist */}
                    <div className="pt-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Property Allowlist (exposed frontmatter properties)
                      </label>
                      <input
                        type="text"
                        value={(activePub.options.propertyAllowlist || []).join(', ')}
                        onChange={(e) => {
                          const props = e.target.value
                            .split(',')
                            .map((p) => p.trim())
                            .filter(Boolean);
                          handleUpdatePub((p) => ({
                            ...p,
                            options: { ...p.options, propertyAllowlist: props },
                          }));
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        placeholder="author, date, tags, aliases"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PRIVACY & AUDIT TAB */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  {/* Encrypted Vault Warning Banner */}
                  {auditReport.isEncryptedVault && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                      <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm">Encrypted Vault Plaintext Export Notice</div>
                        <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                          Your vault has encryption enabled. Generated static HTML, Markdown packages, and search indices will be exported as unencrypted plaintext so they can be viewed on any static web host without credentials.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Audit Summary Statistics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {auditReport.resolvedNoteCount}
                      </div>
                      <div className="text-[11px] text-slate-500">Published Pages</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <div
                        className={`text-xl font-bold ${
                          auditReport.errorCount > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {auditReport.errorCount}
                      </div>
                      <div className="text-[11px] text-slate-500">Blocking Errors</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <div
                        className={`text-xl font-bold ${
                          auditReport.warningCount > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {auditReport.warningCount}
                      </div>
                      <div className="text-[11px] text-slate-500">Warnings & Notices</div>
                    </div>
                  </div>

                  {/* Issues List */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Audit Findings ({auditReport.issues.length})
                    </div>

                    {auditReport.issues.length === 0 ? (
                      <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center text-emerald-700 dark:text-emerald-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        <div className="font-bold">All Audit Checks Passed!</div>
                        <div className="text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                          No broken links, transclusion cycles, or privacy boundary issues detected.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {auditReport.issues.map((issue) => {
                          const isError = issue.severity === 'error';
                          const isWarn = issue.severity === 'warning';
                          return (
                            <div
                              key={issue.id}
                              className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                                isError
                                  ? 'bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-200'
                                  : isWarn
                                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-200'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {isError ? (
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              ) : isWarn ? (
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              ) : (
                                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              )}

                              <div className="flex-1">
                                <div className="font-bold flex items-center gap-2">
                                  <span>{issue.title}</span>
                                  {issue.noteTitle && (
                                    <span className="font-normal text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5">
                                      {issue.noteTitle}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] opacity-90 mt-0.5">{issue.message}</div>
                                {issue.suggestedAction && (
                                  <div className="text-[10px] opacity-75 mt-1 italic">
                                    Suggestion: {issue.suggestedAction}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. IN-APP PREVIEW TAB */}
              {activeTab === 'preview' && (
                <div className="h-full flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Rendered In-Browser Static Site Preview</span>
                    <button
                      type="button"
                      onClick={handlePreview}
                      className="flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh Preview
                    </button>
                  </div>

                  <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner bg-white">
                    {previewSrcDoc ? (
                      <iframe
                        srcDoc={previewSrcDoc}
                        title="Publication Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                        <Eye className="w-8 h-8 mb-2 opacity-50" />
                        <span>Generating preview...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. BUILD & EXPORT TAB */}
              {activeTab === 'build' && (
                <div className="space-y-6">
                  {buildResult ? (
                    <div className="space-y-6">
                      {/* Success Card */}
                      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-emerald-500 text-white">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                              Static Site Built Successfully!
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {buildResult.summary.pageCount} pages compiled • {(buildResult.summary.totalBytes / 1024).toFixed(1)} KB package size
                            </p>
                          </div>
                        </div>

                        {buildResult.zipBlob && (
                          <button
                            type="button"
                            onClick={() => {
                              const filename = `${activePub.name.toLowerCase().replace(/\s+/g, '_')}_site.zip`;
                              triggerFileDownload(buildResult.zipBlob!, filename);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download ZIP Archive</span>
                          </button>
                        )}
                      </div>

                      {/* Build Metadata & Hash */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            Build Specifications
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Build ID:</span>
                            <span className="font-mono">{buildResult.summary.buildId}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Built At:</span>
                            <span>{new Date(buildResult.summary.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400 items-center">
                            <span>Deterministic Checksum:</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(buildResult.summary.checksum);
                                setCopiedChecksum(true);
                                setTimeout(() => setCopiedChecksum(false), 2000);
                              }}
                              className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center gap-1"
                              title="Copy checksum"
                            >
                              <span>{buildResult.summary.checksum.substring(0, 12)}...</span>
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          {copiedChecksum && (
                            <div className="text-[10px] text-emerald-500 text-right">
                              Checksum copied!
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            Hosting Guide
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                            Extract the downloaded ZIP archive to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, Apache, Nginx) or open <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">index.html</code> directly in your web browser.
                          </div>
                        </div>
                      </div>

                      {/* Compiled File Tree */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Compiled Virtual File Tree ({buildResult.files.length} files)
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-[11px]">
                          {buildResult.files.map((file) => (
                            <div
                              key={file.path}
                              className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Code className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{file.path}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {typeof file.content === 'string'
                                  ? `${file.content.length} B`
                                  : `${file.content.byteLength} B`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-4">
                      <Download className="w-12 h-12 mx-auto text-indigo-500 opacity-60" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Ready to Compile
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          Click "Build Site" to compile your notes into a complete static website package with styles and search.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRunBuild}
                        disabled={isBuilding || !auditReport.canBuild}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        {isBuilding ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>Compile Static Site</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
