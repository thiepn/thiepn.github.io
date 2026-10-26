/**
 * P40 — Migration Hub Modal Component
 * Universal Import, Migration & Interoperability Center.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  FolderPlus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Database,
  BookOpen,
  Eye,
  FileArchive,
  RefreshCw,
  Download,
  Trash2,
  X,
  FileCode,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  DetectionResult,
  MigrationAnalysis,
  MigrationHistoryEntry,
  MigrationPlan,
  MigrationProgress,
  MigrationReport,
  MigrationSourceType,
  MigrationWarning,
  RawImportFile,
} from '../migrationTypes';
import { detectMigrationSource } from '../migrationDetector';
import { migrationEngine } from '../migrationEngine';
import { migrationStorage } from '../migrationStorage';
import { Note, Folder } from '../../../types';

interface MigrationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNotes: Note[];
  currentFolders: Folder[];
  saveNote: (note: Note) => Promise<void> | void;
  saveFolder: (folder: Folder) => Promise<void> | void;
  onOpenVaultDoctor?: () => void;
}

export const MigrationHubModal: React.FC<MigrationHubModalProps> = ({
  isOpen,
  onClose,
  currentNotes,
  currentFolders,
  saveNote,
  saveFolder,
  onOpenVaultDoctor,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  const [step, setStep] = useState<'select' | 'analyzing' | 'preview' | 'committing' | 'report'>('select');

  const [sourceType, setSourceType] = useState<MigrationSourceType>('obsidian');
  const [rawFiles, setRawFiles] = useState<RawImportFile[]>([]);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);

  // Settings / Plan
  const [plan, setPlan] = useState<MigrationPlan>({
    sourceType: 'obsidian',
    duplicateStrategy: 'skip-exact',
    importRootFolder: '',
    strictMode: false,
    createRecoveryPoint: true,
    mapDailyNotes: true,
    importCanvas: true,
    preserveSourceMetadata: true,
  });

  const [analysis, setAnalysis] = useState<MigrationAnalysis | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [finalReport, setFinalReport] = useState<MigrationReport | null>(null);
  const [history, setHistory] = useState<MigrationHistoryEntry[]>([]);

  // Preview inspectors
  const [selectedPreviewNoteIndex, setSelectedPreviewNoteIndex] = useState<number>(0);
  const [previewFilterCategory, setPreviewFilterCategory] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHistory(migrationStorage.getHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Source options
  const sources: { type: MigrationSourceType; name: string; icon: any; desc: string; badge?: string }[] = [
    {
      type: 'obsidian',
      name: 'Obsidian Vault',
      icon: Layers,
      desc: 'Imports Wikilinks, aliases, embeds, callouts, .canvas whiteboards & daily notes.',
      badge: 'High Fidelity',
    },
    {
      type: 'notion',
      name: 'Notion Export',
      icon: Database,
      desc: 'Clean titles, maps subpage hierarchies, converts database CSVs to notes with properties.',
      badge: 'Structured',
    },
    {
      type: 'evernote-enex',
      name: 'Evernote (.enex)',
      icon: BookOpen,
      desc: 'Parses ENML rich text, decodes base64 attachments, tags, notebooks & checklists.',
      badge: 'Archive',
    },
    {
      type: 'generic-markdown',
      name: 'Generic Markdown',
      icon: FileText,
      desc: 'Standard folders of .md files, YAML frontmatter, images, and local links.',
      badge: 'Universal',
    },
    {
      type: 'joplin',
      name: 'Joplin Export',
      icon: FileCode,
      desc: 'Resolves Joplin resource links (:/id), metadata footers, and notebook trees.',
    },
    {
      type: 'bibtex-reference',
      name: 'BibTeX & Academic',
      icon: BookOpen,
      desc: 'Imports .bib references, DOIs, abstracts, and pairs with selected PDF files.',
    },
  ];

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);

    const rawList: RawImportFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      // Use webkitRelativePath if available, otherwise file name
      const path = (f as any).webkitRelativePath || f.name;

      rawList.push({
        name: f.name,
        path,
        size: f.size,
        lastModified: f.lastModified,
        readAsText: () => f.text(),
        readAsArrayBuffer: () => f.arrayBuffer(),
        readAsBlob: async () => f,
      });
    }

    setRawFiles(rawList);

    // Auto-detect source
    const detected = await detectMigrationSource(rawList);
    setDetectionResult(detected);
    setSourceType(detected.sourceType);
    setPlan((prev) => ({
      ...prev,
      sourceType: detected.sourceType,
      importRootFolder: detected.suggestedRootTitle ? `Imported / ${detected.suggestedRootTitle}` : '',
    }));
  };

  const handleStartAnalysis = async () => {
    if (rawFiles.length === 0) {
      setErrorMsg('Please select files or a folder to analyze.');
      return;
    }

    setStep('analyzing');
    setErrorMsg(null);

    try {
      const result = await migrationEngine.analyze(
        rawFiles,
        sourceType,
        { ...plan, sourceType },
        currentNotes,
        (p) => setProgress(p)
      );
      setAnalysis(result);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to analyze migration files.');
      setStep('select');
    }
  };

  const handleStartCommit = async () => {
    if (!analysis) return;
    setStep('committing');
    setErrorMsg(null);

    try {
      const report = await migrationEngine.commit(
        analysis,
        plan,
        currentNotes,
        currentFolders,
        saveNote,
        saveFolder,
        (p) => setProgress(p)
      );
      setFinalReport(report);
      setHistory(migrationStorage.getHistory());
      setStep('report');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Migration failed during commit.');
      setStep('preview');
    }
  };

  const handleCancel = () => {
    migrationEngine.cancel();
    setStep('select');
    setProgress(null);
  };

  const downloadReportJson = () => {
    if (!finalReport) return;
    const blob = new Blob([JSON.stringify(finalReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Migration_Report_${finalReport.sourceType}_${finalReport.operationId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="migration_hub_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-labelledby="migration_hub_title"
      aria-modal="true"
    >
      <div
        id="migration_hub_container"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 id="migration_hub_title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Universal Import & Migration Hub
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Safely migrate notes, Wikilinks, whiteboards & media from Obsidian, Notion, Evernote, and Markdown.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
              <button
                id="btn_tab_import"
                onClick={() => setActiveTab('import')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'import'
                    ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                Import Wizard
              </button>
              <button
                id="btn_tab_history"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'history'
                    ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                History ({history.length})
              </button>
            </div>

            <button
              id="btn_close_migration_modal"
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'history' ? (
            /* History View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Past Migration Operations
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      migrationStorage.clearHistory();
                      setHistory([]);
                    }}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-12 text-center dark:border-neutral-800">
                  <Clock className="h-8 w-8 text-neutral-400" />
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">No migrations performed yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100 uppercase text-xs">
                            {h.sourceType}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              h.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            }`}
                          >
                            {h.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{h.reportSummary}</p>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        <span>{h.counts.notes} notes</span>
                        <span>{h.counts.attachments} attachments</span>
                        {h.warningsCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {h.warningsCount} warnings
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Wizard Steps */
            <div>
              {step === 'select' && (
                <div className="space-y-6">
                  {/* Step 1: Choose Source */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Step 1: Choose Knowledge Source
                    </label>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {sources.map((src) => {
                        const Icon = src.icon;
                        const isSelected = sourceType === src.type;
                        return (
                          <button
                            key={src.type}
                            id={`btn_source_${src.type}`}
                            onClick={() => {
                              setSourceType(src.type);
                              setPlan((prev) => ({ ...prev, sourceType: src.type }));
                            }}
                            className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/20'
                                : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              {src.badge && (
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                  {src.badge}
                                </span>
                              )}
                            </div>
                            <span className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                              {src.name}
                            </span>
                            <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{src.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Select Files / Folder */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Step 2: Select Files or Directory
                    </label>

                    <div className="mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
                      <UploadCloud className="h-10 w-10 text-neutral-400" />
                      <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Select your export directory, files, or archives
                      </p>
                      <p className="text-xs text-neutral-500">
                        All files are processed entirely in your browser. No files are uploaded to any external server.
                      </p>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFilesSelected(e.target.files)}
                        />
                        <input
                          ref={folderInputRef}
                          type="file"
                          // @ts-ignore
                          webkitdirectory=""
                          // @ts-ignore
                          directory=""
                          multiple
                          className="hidden"
                          onChange={(e) => handleFilesSelected(e.target.files)}
                        />

                        <button
                          id="btn_select_folder"
                          onClick={() => folderInputRef.current?.click()}
                          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                        >
                          <FolderPlus className="h-4 w-4" />
                          Select Directory / Vault
                        </button>

                        <button
                          id="btn_select_files"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                        >
                          <FileText className="h-4 w-4" />
                          Select Files (.md, .enex, .bib)
                        </button>
                      </div>

                      {rawFiles.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            Selected <strong>{rawFiles.length}</strong> file(s) (
                            {(rawFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auto-Detection Banner */}
                  {detectionResult && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-indigo-900 dark:text-indigo-200">
                              Format Auto-Detected:
                            </span>
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                              {detectionResult.reason}
                            </span>
                            <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-[10px] font-semibold text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100">
                              {Math.round(detectionResult.confidence * 100)}% Confidence
                            </span>
                          </div>
                          <ul className="text-xs text-indigo-800/80 dark:text-indigo-300/80 list-disc list-inside">
                            {detectionResult.detectedFeatures.map((feat, i) => (
                              <li key={i}>{feat}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options / Migration Policy */}
                  <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Migration Settings & Conflict Policies
                    </h4>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Duplicate Policy
                        </label>
                        <select
                          id="select_duplicate_strategy"
                          value={plan.duplicateStrategy}
                          onChange={(e) =>
                            setPlan((prev) => ({
                              ...prev,
                              duplicateStrategy: e.target.value as any,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        >
                          <option value="skip-exact">Skip Exact Duplicates (Identical Content Hash)</option>
                          <option value="keep-both">Keep Both (Import with original titles)</option>
                          <option value="review-conflicts">Review Conflicts in Staging</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Optional Isolation Root Folder
                        </label>
                        <input
                          id="input_root_folder"
                          type="text"
                          placeholder="e.g. Imported / Obsidian Vault"
                          value={plan.importRootFolder || ''}
                          onChange={(e) => setPlan((prev) => ({ ...prev, importRootFolder: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={plan.createRecoveryPoint}
                          onChange={(e) => setPlan((prev) => ({ ...prev, createRecoveryPoint: e.target.checked }))}
                          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Shield className="h-3.5 w-3.5 text-emerald-600" />
                        Create Pre-Migration Recovery Point
                      </label>

                      <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={plan.mapDailyNotes}
                          onChange={(e) => setPlan((prev) => ({ ...prev, mapDailyNotes: e.target.checked }))}
                          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Map YYYY-MM-DD notes to Daily Notes
                      </label>

                      <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={plan.importCanvas}
                          onChange={(e) => setPlan((prev) => ({ ...prev, importCanvas: e.target.checked }))}
                          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Convert .canvas whiteboards to Canvas
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                      onClick={onClose}
                      className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn_start_analysis"
                      disabled={rawFiles.length === 0}
                      onClick={handleStartAnalysis}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
                    >
                      <span>Analyze & Preview Staging</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 'analyzing' && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <RefreshCw className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      Analyzing & Staging Knowledge Graph...
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {progress?.currentMessage || 'Building link graph, resolving attachments & validating frontmatter...'}
                    </p>
                  </div>

                  <div className="w-full max-w-md">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-200 dark:bg-indigo-500"
                        style={{ width: `${progress?.progressPercentage || 15}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCancel}
                    className="rounded-lg border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400"
                  >
                    Cancel Analysis
                  </button>
                </div>
              )}

              {step === 'preview' && analysis && (
                <div className="space-y-6">
                  {/* Analysis Metrics Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-500">Notes</span>
                      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {analysis.notes.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-500">Attachments</span>
                      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {analysis.attachments.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-500">Whiteboards</span>
                      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {analysis.canvases.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-500">References</span>
                      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {analysis.references.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-500">Resolved Links</span>
                      <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {analysis.linkStats.resolvedDirect + analysis.linkStats.resolvedFuzzyOrAlias}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-500">Warnings</span>
                      <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                        {analysis.warnings.length}
                      </p>
                    </div>
                  </div>

                  {/* Warnings & Diagnostics Section */}
                  {analysis.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Migration Diagnostics & Warnings ({analysis.warnings.length})</span>
                        </div>
                        <div className="flex gap-1 text-[11px]">
                          {['all', 'broken-link', 'missing-attachment', 'unsupported-plugin'].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setPreviewFilterCategory(cat)}
                              className={`rounded px-2 py-0.5 ${
                                previewFilterCategory === cat
                                  ? 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 font-medium'
                                  : 'text-amber-700 hover:bg-amber-100 dark:text-amber-400'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                        {analysis.warnings
                          .filter((w) => previewFilterCategory === 'all' || w.category === previewFilterCategory)
                          .map((w, idx) => (
                            <div key={idx} className="flex items-start gap-2 rounded bg-amber-100/50 p-1.5 dark:bg-amber-900/30">
                              <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400">
                                [{w.category}]
                              </span>
                              <span className="flex-1">{w.message}</span>
                              {w.sourcePath && <span className="text-[10px] text-neutral-500">{w.sourcePath}</span>}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Note Preview */}
                  {analysis.notes.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/50">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-neutral-500" />
                          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            Candidate Note Preview
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            id="select_preview_note"
                            value={selectedPreviewNoteIndex}
                            onChange={(e) => setSelectedPreviewNoteIndex(Number(e.target.value))}
                            className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                          >
                            {analysis.notes.slice(0, 30).map((n, idx) => (
                              <option key={idx} value={idx}>
                                {idx + 1}. {n.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="p-4 max-h-56 overflow-y-auto font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                        {analysis.notes[selectedPreviewNoteIndex]?.rawMarkdown || 'No preview available.'}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                      onClick={() => setStep('select')}
                      className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      Back to Source
                    </button>

                    <button
                      id="btn_commit_migration"
                      onClick={handleStartCommit}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      <Check className="h-4 w-4" />
                      <span>Commit {analysis.notes.length} Notes to Vault</span>
                    </button>
                  </div>
                </div>
              )}

              {step === 'committing' && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <RefreshCw className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      Committing Migration to Vault...
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {progress?.currentMessage || 'Writing canonical records, attachments & indexing...'}
                    </p>
                  </div>

                  <div className="w-full max-w-md">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-200 dark:bg-indigo-500"
                        style={{ width: `${progress?.progressPercentage || 50}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCancel}
                    className="rounded-lg border border-red-200 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                  >
                    Cancel Commit
                  </button>
                </div>
              )}

              {step === 'report' && finalReport && (
                <div className="space-y-6 py-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      Migration Completed Successfully!
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Imported from <strong>{finalReport.sourceType}</strong> in {(finalReport.durationMs / 1000).toFixed(1)}s.
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-2xl mx-auto">
                    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <span className="text-xs text-neutral-500">Notes Added</span>
                      <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                        {finalReport.summary.notesImported}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <span className="text-xs text-neutral-500">Attachments</span>
                      <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                        {finalReport.summary.attachmentsImported}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <span className="text-xs text-neutral-500">Whiteboards</span>
                      <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                        {finalReport.summary.canvasesImported}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <span className="text-xs text-neutral-500">Warnings</span>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {finalReport.summary.warningsCount}
                      </p>
                    </div>
                  </div>

                  {/* Next Step Recommendations */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                    <button
                      id="btn_download_report_json"
                      onClick={downloadReportJson}
                      className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      <Download className="h-4 w-4" />
                      Download Detailed Report (.json)
                    </button>

                    {onOpenVaultDoctor && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenVaultDoctor();
                        }}
                        className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        <Shield className="h-4 w-4" />
                        Run Vault Doctor Integrity Check
                      </button>
                    )}

                    <button
                      onClick={onClose}
                      className="rounded-lg bg-indigo-600 px-6 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
                    >
                      Finish & Explore Vault
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
