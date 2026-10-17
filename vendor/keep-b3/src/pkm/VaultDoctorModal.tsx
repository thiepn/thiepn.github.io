import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Filter,
  FolderOpen,
  HardDrive,
  Hash,
  Info,
  Layers,
  Link2,
  Link2Off,
  Network,
  PieChart,
  RefreshCw,
  Search,
  ShieldCheck,
  Split,
  Tag,
  Trash2,
  Wrench,
  Brain,
  GitMerge,
  X,
} from 'lucide-react';
import { Note, Folder, AppSettings, SavedSearch } from '../types';
import {
  DiagnosticCategory,
  DiagnosticIssue,
  DiagnosticSeverity,
  DiagnosticAction,
  VaultDiagnosticsReport,
  StorageBreakdown,
  DiagnosticsScanProgress,
  RepairCheckpoint,
} from './doctorTypes';
import {
  runFullVaultDiagnostics,
  repairCreateMissingNote,
  repairRepointLink,
  repairMergeTags,
  repairRemoveStaleCanvasNodes,
  createRecoveryCheckpoint,
} from './vaultDoctor';
import { VaultIndex } from './types';
import { CanvasBoard } from './canvasTypes';
import { PDFAttachment } from './pdfTypes';
import { pdfStorageService } from './pdfStorage';
import { canvasStorageService } from './canvasStorage';
import { storageService } from '../services/storage';
import { reviewDoctor } from './review/reviewDoctor';
import { NoteDiffMergeModal } from './ui/NoteDiffMergeModal';

interface VaultDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  settings: AppSettings;
  vaultIndex?: VaultIndex;
  onUpdateNotes: (updatedNotes: Note[]) => void;
  onUpdateFolders: (updatedFolders: Folder[]) => void;
  onSelectNote?: (noteId: string) => void;
  onOpenCanvas?: (boardId?: string) => void;
}

export const VaultDoctorModal: React.FC<VaultDoctorModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  savedSearches,
  settings,
  vaultIndex,
  onUpdateNotes,
  onUpdateFolders,
  onSelectNote,
  onOpenCanvas,
}) => {
  const [report, setReport] = useState<VaultDiagnosticsReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<DiagnosticsScanProgress | null>(null);
  const [activeTab, setActiveTab] = useState<DiagnosticCategory | 'all' | 'storage'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | DiagnosticSeverity>('all');
  const [selectedIssue, setSelectedIssue] = useState<DiagnosticIssue | null>(null);

  // Target replacement modal / selection state
  const [repointModalData, setRepointModalData] = useState<{
    issue: DiagnosticIssue;
    action: DiagnosticAction;
    selectedTargetNoteId: string;
    customAlias: string;
  } | null>(null);

  // Duplicate Notes Diff & Merge state
  const [diffMergeData, setDiffMergeData] = useState<{
    noteA: Note;
    noteB: Note;
    similarityScore?: number;
    reason?: string;
  } | null>(null);

  // Confirmation dialog for destructive / bulk actions
  const [confirmDialogData, setConfirmDialogData] = useState<{
    title: string;
    description: string;
    diffSnippet?: string;
    onConfirm: () => Promise<void> | void;
    isDestructive?: boolean;
  } | null>(null);

  const [createCheckpointBeforeFix, setCreateCheckpointBeforeFix] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(
    null
  );

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Run full scan
  const handleRunScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress({ phase: 'Starting diagnostics...', currentStep: 0, totalSteps: 7, percent: 5 });

    try {
      // Fetch attachments and canvas boards
      const [allPdfs, allBoards] = await Promise.all([
        pdfStorageService.getAllPDFAttachments(),
        canvasStorageService.getAllBoards(),
      ]);

      const diagReport = await runFullVaultDiagnostics(
        notes,
        folders,
        allBoards,
        allPdfs,
        vaultIndex,
        (progress) => setScanProgress(progress)
      );

      setReport(diagReport);
      setStatusMessage({
        text: `Diagnostics completed in ${Math.round(diagReport.durationMs)}ms. Found ${diagReport.totalIssues} item(s).`,
        type: 'info',
      });
    } catch (err) {
      console.error('Failed to run vault diagnostics:', err);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }, [notes, folders, vaultIndex]);

  // Initial scan on modal open
  useEffect(() => {
    if (isOpen) {
      handleRunScan();
    }
  }, [isOpen]);

  // Keyboard shortcut ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (repointModalData) {
          setRepointModalData(null);
        } else if (confirmDialogData) {
          setConfirmDialogData(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, repointModalData, confirmDialogData]);

  // Auto-dismiss status message after 4s
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Filter issues based on activeTab, searchQuery, severityFilter
  const filteredIssues = useMemo(() => {
    if (!report) return [];

    let list = activeTab === 'all' || activeTab === 'storage' ? report.issues : report.issuesByCategory[activeTab] || [];

    if (severityFilter !== 'all') {
      list = list.filter((i) => i.severity === severityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (i.sourceName && i.sourceName.toLowerCase().includes(q)) ||
          (i.targetName && i.targetName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [report, activeTab, severityFilter, searchQuery]);

  // 1. Action: Create Missing Note
  const handleCreateMissingNote = async (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const title = (action.params?.title as string) || issue.targetName || 'New Note';

    if (createCheckpointBeforeFix) {
      createRecoveryCheckpoint(notes, folders, savedSearches, settings);
    }

    const newNote = repairCreateMissingNote(title);
    const updated = [newNote, ...notes];

    await storageService.saveNote(newNote);
    onUpdateNotes(updated);

    setStatusMessage({
      text: `Created note "${title}". Link resolved!`,
      type: 'success',
    });

    // Re-run diagnostics in background
    setTimeout(handleRunScan, 200);
  };

  // 2. Action: Repoint Link (Open Selection Modal)
  const handleOpenRepointModal = (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const candidates = issue.metadata?.candidates || [];
    const initialTargetId = candidates[0]?.noteId || notes[0]?.id || '';

    setRepointModalData({
      issue,
      action,
      selectedTargetNoteId: initialTargetId,
      customAlias: '',
    });
  };

  // 2b. Submit Repoint Link
  const handleSubmitRepointLink = async () => {
    if (!repointModalData) return;
    const { issue, selectedTargetNoteId, customAlias } = repointModalData;
    const sourceNoteId = issue.sourceId;
    const oldRawSnippet = issue.location?.rawSnippet;

    if (!sourceNoteId || !oldRawSnippet) return;

    const sourceNote = notes.find((n) => n.id === sourceNoteId);
    const targetNote = notes.find((n) => n.id === selectedTargetNoteId);

    if (!sourceNote || !targetNote) return;

    if (createCheckpointBeforeFix) {
      createRecoveryCheckpoint(notes, folders, savedSearches, settings);
    }

    const updatedSource = repairRepointLink(
      sourceNote,
      oldRawSnippet,
      targetNote.title,
      customAlias.trim() || undefined
    );

    const updatedNotesList = notes.map((n) => (n.id === sourceNoteId ? updatedSource : n));
    await storageService.saveNote(updatedSource);
    onUpdateNotes(updatedNotesList);

    setRepointModalData(null);
    setStatusMessage({
      text: `Updated link in "${sourceNote.title}" to target "${targetNote.title}".`,
      type: 'success',
    });

    setTimeout(handleRunScan, 200);
  };

  // 3. Action: Merge Tags
  const handleMergeTags = (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const canonicalTag = issue.metadata?.canonicalTag;
    const variantTags = issue.metadata?.variantTags;

    if (!canonicalTag || !variantTags) return;

    setConfirmDialogData({
      title: `Merge Tags into #${canonicalTag}`,
      description: `This will update all notes containing tag variations (${variantTags
        .map((v) => `#${v}`)
        .join(', ')}) to use the canonical tag #${canonicalTag}.`,
      diffSnippet: `Before: ${variantTags.map((v) => `#${v}`).join(', ')}\nAfter: #${canonicalTag}`,
      onConfirm: async () => {
        if (createCheckpointBeforeFix) {
          createRecoveryCheckpoint(notes, folders, savedSearches, settings);
        }

        const updatedNotesList = repairMergeTags(notes, canonicalTag, variantTags);
        for (const n of updatedNotesList) {
          await storageService.saveNote(n);
        }
        onUpdateNotes(updatedNotesList);

        setStatusMessage({
          text: `Merged tags into #${canonicalTag}.`,
          type: 'success',
        });
        setTimeout(handleRunScan, 200);
      },
    });
  };

  // 4. Action: Delete Empty Folder
  const handleDeleteEmptyFolder = (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const folderId = issue.sourceId;
    const folderName = issue.sourceName || 'Empty Folder';

    if (!folderId) return;

    setConfirmDialogData({
      title: `Delete Empty Folder "${folderName}"`,
      description: `Are you sure you want to delete the empty folder "${folderName}"? No notes will be lost.`,
      isDestructive: true,
      onConfirm: async () => {
        if (createCheckpointBeforeFix) {
          createRecoveryCheckpoint(notes, folders, savedSearches, settings);
        }

        const updatedFolders = folders.filter((f) => f.id !== folderId);
        await storageService.deleteFolder(folderId);
        onUpdateFolders(updatedFolders);

        setStatusMessage({
          text: `Folder "${folderName}" deleted.`,
          type: 'success',
        });
        setTimeout(handleRunScan, 200);
      },
    });
  };

  // 5. Action: Delete Unreferenced Attachment
  const handleDeleteUnreferencedAttachment = (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const attachmentId = issue.sourceId;
    const name = issue.sourceName || 'Attachment';

    if (!attachmentId) return;

    setConfirmDialogData({
      title: `Delete Unreferenced PDF "${name}"`,
      description: `Are you sure you want to delete this unreferenced PDF attachment from storage? This action cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        if (createCheckpointBeforeFix) {
          createRecoveryCheckpoint(notes, folders, savedSearches, settings);
        }

        await pdfStorageService.deletePDFAttachment(attachmentId);

        setStatusMessage({
          text: `Deleted PDF "${name}".`,
          type: 'success',
        });
        setTimeout(handleRunScan, 200);
      },
    });
  };

  // 6. Action: Remove Stale Canvas Nodes
  const handleRemoveStaleCanvasNodes = (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const boardId = issue.metadata?.boardId;
    const staleNodeIds = issue.metadata?.staleNodeIds;

    if (!boardId || !staleNodeIds || staleNodeIds.length === 0) return;

    setConfirmDialogData({
      title: 'Remove Stale Canvas Cards',
      description: `Remove ${staleNodeIds.length} card(s) on canvas "${issue.sourceName}" referencing deleted notes.`,
      isDestructive: true,
      onConfirm: async () => {
        if (createCheckpointBeforeFix) {
          createRecoveryCheckpoint(notes, folders, savedSearches, settings);
        }

        const board = await canvasStorageService.getBoard(boardId);
        if (board) {
          const updated = repairRemoveStaleCanvasNodes(board, staleNodeIds);
          await canvasStorageService.saveBoardImmediate(updated);
        }

        setStatusMessage({
          text: `Removed ${staleNodeIds.length} stale cards from canvas.`,
          type: 'success',
        });
        setTimeout(handleRunScan, 200);
      },
    });
  };

  // 7. Action: Repair Duplicate Card IDs
  const handleRepairDuplicateCardIds = (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const noteId = (action.params?.noteId as string) || issue.sourceId;
    if (!noteId) return;
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote) return;

    setConfirmDialogData({
      title: 'Regenerate Flashcard IDs',
      description: `Regenerate all card block IDs in "${targetNote.title || 'Untitled'}" so each flashcard has a globally unique identifier.`,
      onConfirm: async () => {
        if (createCheckpointBeforeFix) {
          createRecoveryCheckpoint(notes, folders, savedSearches, settings);
        }

        const updatedContent = reviewDoctor.repairDuplicateCardIds(targetNote.content);
        const updatedNote: Note = {
          ...targetNote,
          content: updatedContent,
          updatedAt: new Date().toISOString(),
        };

        const updatedNotesList = notes.map((n) => (n.id === noteId ? updatedNote : n));
        await storageService.saveNote(updatedNote);
        onUpdateNotes(updatedNotesList);

        setStatusMessage({
          text: `Regenerated card IDs in "${targetNote.title}".`,
          type: 'success',
        });
        setTimeout(handleRunScan, 200);
      },
    });
  };

  // 8. Action: Clean Orphan Review States
  const handleCleanOrphanReviewStates = (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const orphanCardIds = (action.params?.orphanCardIds as string[]) || [];

    setConfirmDialogData({
      title: 'Prune Orphan Review Records',
      description: `Remove ${orphanCardIds.length} obsolete card review scheduling records from browser storage for cards that no longer exist in your notes.`,
      isDestructive: true,
      onConfirm: async () => {
        if (createCheckpointBeforeFix) {
          createRecoveryCheckpoint(notes, folders, savedSearches, settings);
        }

        await reviewDoctor.pruneOrphanReviewStates(orphanCardIds);

        setStatusMessage({
          text: `Pruned ${orphanCardIds.length} orphan review states.`,
          type: 'success',
        });
        setTimeout(handleRunScan, 200);
      },
    });
  };

  // Export Checkpoint Backup
  const handleExportBackup = () => {
    const checkpoint = createRecoveryCheckpoint(
      notes,
      folders,
      savedSearches,
      settings,
      'Manual Vault Doctor Backup'
    );

    const blob = new Blob([checkpoint.backupJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setStatusMessage({
      text: 'Backup exported and checkpoint saved to browser storage.',
      type: 'success',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-[#fdfcf9] dark:bg-[#141416] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-[#f7f6f2] dark:bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                  Vault Doctor & Storage Diagnostics
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
                  Safe Repair Hub
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Identify broken links, resolve ambiguities, inspect orphans, standardize tags, and audit storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              title="Create full vault checkpoint backup"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup</span>
            </button>

            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Re-Scan Vault'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar when Scanning */}
        {isScanning && scanProgress && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-6 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
              <span>{scanProgress.phase}</span>
              <span className="font-mono">{scanProgress.percent}%</span>
            </div>
            <div className="w-full h-1.5 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 transition-all duration-300 ease-out"
                style={{ width: `${scanProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2 text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-900'
                : 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 border-b border-sky-200 dark:border-sky-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Health Summary Banner */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-[#161619]">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <div
                className={`p-2 rounded-lg ${
                  report.errorsCount > 0
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    : report.warningsCount > 0
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {report.errorsCount > 0 ? (
                  <AlertCircle className="w-4 h-4" />
                ) : report.warningsCount > 0 ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Vault Health
                </div>
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  {report.errorsCount > 0
                    ? `${report.errorsCount} Error(s)`
                    : report.warningsCount > 0
                    ? `${report.warningsCount} Warning(s)`
                    : 'All Healthy'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <Link2Off className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Broken WikiLinks
                </div>
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 font-mono">
                  {report.issuesByCategory.broken_links.length}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Split className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Orphans & Ambiguities
                </div>
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 font-mono">
                  {report.issuesByCategory.orphan_notes.length +
                    report.issuesByCategory.ambiguous_links.length}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <div className="p-2 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Vault Data Size
                </div>
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 font-mono">
                  {formatBytes(report.storageBreakdown.totalAppBytes)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Category Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-stone-200 dark:border-stone-800 bg-[#f7f6f2] dark:bg-[#18181b] overflow-x-auto text-xs font-semibold py-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <span>All Findings</span>
            {report && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                {report.totalIssues}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('broken_links')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'broken_links'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <Link2Off className="w-3.5 h-3.5" />
            <span>Broken Links</span>
            {report && report.issuesByCategory.broken_links.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold">
                {report.issuesByCategory.broken_links.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ambiguous_links')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'ambiguous_links'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Ambiguous</span>
            {report && report.issuesByCategory.ambiguous_links.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold">
                {report.issuesByCategory.ambiguous_links.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orphan_notes')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'orphan_notes'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Orphan Notes</span>
            {report && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-mono">
                {report.issuesByCategory.orphan_notes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tags')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'tags'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Tags & Labels</span>
            {report && report.issuesByCategory.tags.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 font-mono">
                {report.issuesByCategory.tags.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('folders')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'folders'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Folders</span>
            {report && report.issuesByCategory.folders.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 font-mono">
                {report.issuesByCategory.folders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'attachments'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Attachments</span>
            {report && report.issuesByCategory.attachments.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 font-mono">
                {report.issuesByCategory.attachments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('invalid_structures')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'invalid_structures'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Integrity</span>
            {report && report.issuesByCategory.invalid_structures.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold">
                {report.issuesByCategory.invalid_structures.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('review_system')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'review_system'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Cards & Recall</span>
            {report && report.issuesByCategory.review_system && report.issuesByCategory.review_system.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold">
                {report.issuesByCategory.review_system.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('possible_duplicates')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'possible_duplicates'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Duplicate Notes & Merges</span>
            {report && report.issuesByCategory.possible_duplicates && report.issuesByCategory.possible_duplicates.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold">
                {report.issuesByCategory.possible_duplicates.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'storage'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Storage & Quota</span>
          </button>
        </div>

        {/* Filter bar for non-storage tabs */}
        {activeTab !== 'storage' && (
          <div className="flex items-center justify-between px-6 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-[#161619] gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search issues, titles, links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as 'all' | DiagnosticSeverity)}
                className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">All Severities</option>
                <option value="error">Errors Only</option>
                <option value="warning">Warnings Only</option>
                <option value="info">Info / Notices</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 font-medium cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={createCheckpointBeforeFix}
                  onChange={(e) => setCreateCheckpointBeforeFix(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Auto-Checkpoint</span>
              </label>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'storage' && report ? (
            /* Storage Breakdown & Browser Quota View */
            <div className="space-y-6">
              {/* Storage Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Notes & Text
                  </div>
                  <div className="text-xl font-bold text-stone-900 dark:text-stone-100 font-mono">
                    {formatBytes(report.storageBreakdown.notesBytes)}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {report.storageBreakdown.notesCount} markdown notes
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Images & Attachments
                  </div>
                  <div className="text-xl font-bold text-stone-900 dark:text-stone-100 font-mono">
                    {formatBytes(report.storageBreakdown.imagesBytes + report.storageBreakdown.pdfBytes)}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {report.storageBreakdown.imagesCount} images, {report.storageBreakdown.pdfCount} PDFs
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Spatial Canvases
                  </div>
                  <div className="text-xl font-bold text-stone-900 dark:text-stone-100 font-mono">
                    {formatBytes(report.storageBreakdown.canvasBytes)}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {report.storageBreakdown.canvasCount} canvas boards
                  </div>
                </div>
              </div>

              {/* Storage Quota Progress Bar */}
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Browser Storage & Quota Estimation
                    </h4>
                  </div>
                  {report.storageBreakdown.quotaReport && (
                    <span className="text-xs font-mono font-semibold text-stone-600 dark:text-stone-400">
                      {formatBytes(report.storageBreakdown.quotaReport.usage)} of{' '}
                      {formatBytes(report.storageBreakdown.quotaReport.quota)} (
                      {report.storageBreakdown.quotaReport.usagePercent}%)
                    </span>
                  )}
                </div>

                {report.storageBreakdown.quotaReport ? (
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(1, report.storageBreakdown.quotaReport.usagePercent))}%`,
                        }}
                        className="h-full bg-amber-500 rounded-full"
                      />
                    </div>
                    <p className="text-[11px] text-stone-400">
                      * Storage values are estimated directly via the browser&apos;s native storage quota API (IndexedDB / Cache API).
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    Browser storage estimation API is not supported in this environment. Total estimated app size is{' '}
                    <strong className="font-mono">{formatBytes(report.storageBreakdown.totalAppBytes)}</strong>.
                  </p>
                )}
              </div>
            </div>
          ) : filteredIssues.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                No issues detected in this category
              </h4>
              <p className="text-xs text-stone-500 max-w-sm">
                Your vault relationships, links, tags, and attachment references are completely clean.
              </p>
            </div>
          ) : (
            /* Issues List */
            <div className="space-y-3">
              {filteredIssues.map((issue) => {
                const isError = issue.severity === 'error';
                const isWarning = issue.severity === 'warning';

                return (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isError
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                        : isWarning
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                            isError
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                              : isWarning
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          {isError ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Info className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                              {issue.title}
                            </h4>
                            <span
                              className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded font-bold ${
                                isError
                                  ? 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200'
                                  : isWarning
                                  ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                                  : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                              }`}
                            >
                              {issue.severity}
                            </span>
                          </div>

                          <p className="text-xs text-stone-600 dark:text-stone-400">
                            {issue.description}
                          </p>

                          {issue.sourceName && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[11px] text-stone-500 font-medium">Source:</span>
                              <button
                                onClick={() => {
                                  if (issue.sourceId && onSelectNote) {
                                    onSelectNote(issue.sourceId);
                                    onClose();
                                  }
                                }}
                                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <span>{issue.sourceName}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {issue.suggestedActions.map((act) => {
                          const isDestructive = act.isDestructive;

                          return (
                            <button
                              key={act.id}
                              onClick={() => {
                                if (act.actionType === 'create_missing_note') {
                                  handleCreateMissingNote(issue, act);
                                } else if (act.actionType === 'repoint_link') {
                                  handleOpenRepointModal(issue, act);
                                } else if (act.actionType === 'merge_tags') {
                                  handleMergeTags(issue, act);
                                } else if (act.actionType === 'delete_empty_folder') {
                                  handleDeleteEmptyFolder(issue, act);
                                } else if (act.actionType === 'delete_unreferenced_attachment') {
                                  handleDeleteUnreferencedAttachment(issue, act);
                                } else if (act.actionType === 'remove_stale_canvas_node') {
                                  handleRemoveStaleCanvasNodes(issue, act);
                                } else if (act.actionType === 'repair_duplicate_card_ids') {
                                  handleRepairDuplicateCardIds(issue, act);
                                } else if (act.actionType === 'clean_orphan_review_states') {
                                  handleCleanOrphanReviewStates(issue, act);
                                } else if (act.actionType === 'compare_duplicates') {
                                  const nA = notes.find((n) => n.id === act.params?.noteAId || n.id === issue.sourceId);
                                  const nB = notes.find((n) => n.id === act.params?.noteBId || n.id === (issue.metadata?.target as string));
                                  if (nA && nB) {
                                    setDiffMergeData({
                                      noteA: nA,
                                      noteB: nB,
                                      similarityScore: (act.params?.similarityScore as number) || (typeof issue.metadata?.count === 'number' ? issue.metadata.count / 100 : 0.9),
                                      reason: (act.params?.reason as string) || issue.description,
                                    });
                                  }
                                } else if (act.actionType === 'ignore_duplicate_pair') {
                                  setReport((prev) => {
                                    if (!prev) return prev;
                                    const remaining = prev.allIssues.filter((i) => i.id !== issue.id);
                                    return {
                                      ...prev,
                                      allIssues: remaining,
                                      issuesByCategory: {
                                        ...prev.issuesByCategory,
                                        possible_duplicates: (prev.issuesByCategory.possible_duplicates || []).filter((i) => i.id !== issue.id),
                                      },
                                    };
                                  });
                                  setStatusMessage({ text: 'Duplicate suggestion dismissed.', type: 'info' });
                                } else if (act.actionType === 'open_note' && issue.sourceId) {
                                  onSelectNote?.(issue.sourceId);
                                  onClose();
                                } else if (act.actionType === 'open_canvas' && issue.metadata?.boardId) {
                                  onOpenCanvas?.(issue.metadata.boardId);
                                  onClose();
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                isDestructive
                                  ? 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                              }`}
                            >
                              <span>{act.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-[#f7f6f2] dark:bg-[#18181b] flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>All repair operations create recovery checkpoints and preserve data safety.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Target Selection Modal for Repoint Link */}
      {repointModalData && (
        <div
          onClick={() => setRepointModalData(null)}
          className="fixed inset-0 z-60 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-600" />
                <span>Select Replacement Target</span>
              </h3>
              <button
                onClick={() => setRepointModalData(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Replace link <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">{repointModalData.issue.location?.rawSnippet || '[[Link]]'}</code> in &ldquo;{repointModalData.issue.sourceName}&rdquo;.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Target Note
                </label>
                <select
                  value={repointModalData.selectedTargetNoteId}
                  onChange={(e) =>
                    setRepointModalData({
                      ...repointModalData,
                      selectedTargetNoteId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {notes
                    .filter((n) => !n.trashed)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title || 'Untitled Note'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Optional Display Alias (Pipe syntax)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Custom Display Text"
                  value={repointModalData.customAlias}
                  onChange={(e) =>
                    setRepointModalData({
                      ...repointModalData,
                      customAlias: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={() => setRepointModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRepointLink}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
              >
                Update Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation & Diff Dialog */}
      {confirmDialogData && (
        <div
          onClick={() => setConfirmDialogData(null)}
          className="fixed inset-0 z-60 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  confirmDialogData.isDestructive
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                }`}
              >
                {confirmDialogData.isDestructive ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                  {confirmDialogData.title}
                </h3>
                <p className="text-xs text-stone-500">{confirmDialogData.description}</p>
              </div>
            </div>

            {confirmDialogData.diffSnippet && (
              <pre className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-mono text-stone-800 dark:text-stone-200 overflow-x-auto whitespace-pre-wrap">
                {confirmDialogData.diffSnippet}
              </pre>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={() => setConfirmDialogData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const onConf = confirmDialogData.onConfirm;
                  setConfirmDialogData(null);
                  await onConf();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs ${
                  confirmDialogData.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Side-by-side Note Diff & 1-Click Merge Modal */}
      {diffMergeData && (
        <NoteDiffMergeModal
          isOpen={true}
          onClose={() => setDiffMergeData(null)}
          noteA={diffMergeData.noteA}
          noteB={diffMergeData.noteB}
          allNotes={notes}
          similarityScore={diffMergeData.similarityScore}
          reason={diffMergeData.reason}
          onMergeComplete={(surviving, discarded, updatedNotesList) => {
            onUpdateNotes(updatedNotesList);
            setStatusMessage({
              text: `Merged "${discarded.title}" into "${surviving.title}" with backlinks preserved.`,
              type: 'success',
            });
            setDiffMergeData(null);
            setTimeout(handleRunScan, 250);
          }}
        />
      )}
    </div>
  );
};
