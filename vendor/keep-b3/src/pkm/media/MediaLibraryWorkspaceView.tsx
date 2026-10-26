import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Grid,
  List,
  Upload,
  Mic,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileAudio,
  FileCode,
  File as FileIcon,
  ExternalLink,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  BookOpen,
  Sparkles,
  Info,
  Clock,
  HardDrive,
  ZoomIn,
  X,
  Edit2,
  Columns,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  CanonicalAttachment,
  AttachmentKind,
  AttachmentFilter,
  AttachmentSortField,
  AttachmentSortOrder,
  AttachmentReference,
} from './mediaTypes';
import { mediaService, formatByteSize, detectAttachmentKind } from './mediaService';
import { InlineAudioPlayer } from './InlineAudioPlayer';
import { AudioRecorderModal } from './AudioRecorderModal';
import { computeDeterministicChecksum } from '../portableVaultSerializer';
import { vaultManager } from '../indexer';

interface MediaLibraryWorkspaceViewProps {
  allNotes: Note[];
  folders?: Folder[];
  activeNoteId?: string;
  onOpenNote?: (noteId: string) => void;
  onOpenNoteBeside?: (noteId: string) => void;
  onOpenPDF?: (pdfId: string, page?: number, highlightId?: string) => void;
  onInsertMarkdown?: (markdown: string) => void;
}

export const MediaLibraryWorkspaceView: React.FC<MediaLibraryWorkspaceViewProps> = ({
  allNotes,
  folders = [],
  activeNoteId,
  onOpenNote,
  onOpenNoteBeside,
  onOpenPDF,
  onInsertMarkdown,
}) => {
  const [attachments, setAttachments] = useState<CanonicalAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<AttachmentKind | 'all'>('all');
  const [refFilter, setRefFilter] = useState<'all' | 'referenced' | 'unreferenced'>('all');
  const [sortField, setSortField] = useState<AttachmentSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<AttachmentSortOrder>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);

  // Modals
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CanonicalAttachment | null>(null);
  const [isBulkCleanupOpen, setIsBulkCleanupOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Editing filename or academic metadata
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editFilename, setEditFilename] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editYear, setEditYear] = useState<number | undefined>(undefined);
  const [editDoi, setEditDoi] = useState('');
  const [editArxiv, setEditArxiv] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load all attachments
  const loadAttachments = async () => {
    setIsLoading(true);
    try {
      const list = await mediaService.getAllAttachments(allNotes);
      setAttachments(list);
      if (list.length > 0 && !selectedAttachmentId) {
        setSelectedAttachmentId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load media attachments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
    const unsub = mediaService.subscribe(() => {
      loadAttachments();
    });
    return () => unsub();
  }, [allNotes]);

  // Derive reference maps for all attachments
  const referenceMap = useMemo(() => {
    const map = new Map<string, AttachmentReference[]>();
    const index = vaultManager.getIndex();

    for (const att of attachments) {
      const refs = mediaService.findAttachmentReferences(att.id, att.filename, allNotes, index);
      map.set(att.id, refs);
    }
    return map;
  }, [attachments, allNotes]);

  // Selected attachment object
  const selectedAttachment = useMemo(() => {
    return attachments.find((a) => a.id === selectedAttachmentId) || null;
  }, [attachments, selectedAttachmentId]);

  // Filtered and sorted attachments
  const filteredAttachments = useMemo(() => {
    let list = [...attachments];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) => {
        return (
          a.filename.toLowerCase().includes(q) ||
          a.title?.toLowerCase().includes(q) ||
          a.author?.toLowerCase().includes(q) ||
          a.doi?.toLowerCase().includes(q) ||
          a.arxivId?.toLowerCase().includes(q) ||
          a.kind.toLowerCase().includes(q)
        );
      });
    }

    // Kind filter
    if (selectedKind !== 'all') {
      list = list.filter((a) => a.kind === selectedKind);
    }

    // Reference filter
    if (refFilter === 'referenced') {
      list = list.filter((a) => (referenceMap.get(a.id)?.length || 0) > 0);
    } else if (refFilter === 'unreferenced') {
      list = list.filter((a) => (referenceMap.get(a.id)?.length || 0) === 0);
    }

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'filename') {
        comparison = a.filename.localeCompare(b.filename);
      } else if (sortField === 'createdAt') {
        comparison = (a.createdAt || 0) - (b.createdAt || 0);
      } else if (sortField === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      } else if (sortField === 'refCount') {
        const refA = referenceMap.get(a.id)?.length || 0;
        const refB = referenceMap.get(b.id)?.length || 0;
        comparison = refA - refB;
      } else if (sortField === 'kind') {
        comparison = a.kind.localeCompare(b.kind);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [attachments, searchQuery, selectedKind, refFilter, sortField, sortOrder, referenceMap]);

  // Counts by kind
  const counts = useMemo(() => {
    const c = { all: attachments.length, image: 0, pdf: 0, audio: 0, text: 0, other: 0 };
    for (const a of attachments) {
      if (c[a.kind] !== undefined) c[a.kind]++;
      else c.other++;
    }
    return c;
  }, [attachments]);

  // Total storage used
  const totalStorageBytes = useMemo(() => {
    return attachments.reduce((sum, a) => sum + (a.size || 0), 0);
  }, [attachments]);

  // Unreferenced attachments list for bulk cleanup
  const unreferencedAttachments = useMemo(() => {
    return attachments.filter((a) => (referenceMap.get(a.id)?.length || 0) === 0);
  }, [attachments, referenceMap]);

  // Handle file upload
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const kind = detectAttachmentKind(file.type, file.name);
      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      const hash = computeDeterministicChecksum(bytes);

      const id = `${kind === 'pdf' ? 'pdf' : 'att'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const canon: CanonicalAttachment = {
        id,
        filename: file.name,
        kind,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sourceNoteId: activeNoteId,
        hash,
      };

      const blob = new Blob([bytes], { type: canon.mimeType });
      await mediaService.saveAttachment(canon, blob);
    }

    await loadAttachments();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Start editing metadata
  const handleStartEdit = (att: CanonicalAttachment) => {
    setEditFilename(att.filename);
    setEditTitle(att.title || '');
    setEditAuthor(att.author || '');
    setEditYear(att.year);
    setEditDoi(att.doi || '');
    setEditArxiv(att.arxivId || '');
    setIsEditingMeta(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAttachment) return;
    await mediaService.updateAttachmentMetadata(selectedAttachment.id, {
      filename: editFilename.trim() || selectedAttachment.filename,
      title: editTitle.trim() || undefined,
      author: editAuthor.trim() || undefined,
      year: editYear,
      doi: editDoi.trim() || undefined,
      arxivId: editArxiv.trim() || undefined,
    });
    setIsEditingMeta(false);
    await loadAttachments();
  };

  // Copy Markdown snippet
  const handleCopyEmbed = (att: CanonicalAttachment) => {
    let snippet = `![[${att.filename}]]`;
    if (att.kind === 'pdf') {
      snippet = `[[pdf:${att.id}|${att.title || att.filename}]]`;
    } else if (att.kind === 'audio') {
      snippet = `![[audio:${att.id}|${att.filename}]]`;
    }

    navigator.clipboard.writeText(snippet);
    setCopiedId(att.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Insert into active note
  const handleInsertIntoNote = (att: CanonicalAttachment) => {
    if (!onInsertMarkdown) return;
    let snippet = `![[${att.filename}]]`;
    if (att.kind === 'pdf') {
      snippet = `[[pdf:${att.id}|${att.title || att.filename}]]`;
    } else if (att.kind === 'audio') {
      snippet = `![[audio:${att.id}|${att.filename}]]`;
    }
    onInsertMarkdown(snippet);
  };

  // Safe delete execution
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await mediaService.deleteAttachment(deleteTarget.id);
    setDeleteTarget(null);
    if (selectedAttachmentId === deleteTarget.id) {
      setSelectedAttachmentId(null);
    }
    await loadAttachments();
  };

  // Bulk cleanup execution
  const handleExecuteBulkCleanup = async () => {
    const ids: string[] = Array.from(bulkSelectedIds);
    if (ids.length === 0) return;
    await mediaService.deleteUnreferencedAttachments(ids);
    setBulkSelectedIds(new Set());
    setIsBulkCleanupOpen(false);
    await loadAttachments();
  };

  // Open attachment preview / reader
  const handleOpenItem = async (att: CanonicalAttachment) => {
    setSelectedAttachmentId(att.id);
    if (att.kind === 'pdf' && onOpenPDF) {
      onOpenPDF(att.id);
    } else if (att.kind === 'image') {
      const url = await mediaService.getAttachmentObjectUrl(att.id);
      if (url) {
        setPreviewImageSrc(url);
        setPreviewImageTitle(att.filename);
      }
    }
  };

  // Render attachment icon
  const renderKindIcon = (kind: AttachmentKind, className = 'w-4 h-4') => {
    switch (kind) {
      case 'image':
        return <ImageIcon className={`${className} text-emerald-500`} />;
      case 'pdf':
        return <FileText className={`${className} text-rose-500`} />;
      case 'audio':
        return <FileAudio className={`${className} text-amber-500`} />;
      case 'text':
        return <FileCode className={`${className} text-blue-500`} />;
      default:
        return <FileIcon className={`${className} text-stone-400`} />;
    }
  };

  return (
    <div
      className="relative flex-1 h-full flex flex-col bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUploadFiles(e.target.files)}
      />

      {/* Drag & drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-amber-500/10 dark:bg-amber-500/20 border-2 border-dashed border-amber-500 flex flex-col items-center justify-center backdrop-blur-xs pointer-events-none">
          <Upload className="w-12 h-12 text-amber-600 dark:text-amber-400 animate-bounce mb-2" />
          <p className="text-base font-bold text-amber-800 dark:text-amber-300">
            Drop attachments to import into Vault Media Library
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Images, PDFs, Audio notes, and documents
          </p>
        </div>
      )}

      {/* Top Header & Toolbar */}
      <div className="p-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-stone-950 dark:text-white">
                Media Library & Attachments
              </h1>
              <p className="text-[11px] text-stone-700 dark:text-stone-300">
                {attachments.length} files • {formatByteSize(totalStorageBytes)} total storage
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAudioModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Record voice memo"
            >
              <Mic className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Record Audio</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Import files from device"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Media</span>
            </button>

            {unreferencedAttachments.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBulkSelectedIds(new Set(unreferencedAttachments.map((a) => a.id)));
                  setIsBulkCleanupOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium border border-stone-200 dark:border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Clean up unreferenced attachments"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean Unreferenced ({unreferencedAttachments.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Search box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename, author, DOI, tags..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 border border-stone-300/50 dark:border-stone-700/50">
            {(
              [
                { id: 'all', label: 'All', count: counts.all },
                { id: 'image', label: 'Images', count: counts.image },
                { id: 'pdf', label: 'PDFs', count: counts.pdf },
                { id: 'audio', label: 'Audio', count: counts.audio },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedKind(cat.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  selectedKind === cat.id
                    ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-2xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-70">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* Reference filter dropdown */}
          <select
            value={refFilter}
            onChange={(e) => setRefFilter(e.target.value as any)}
            className="px-2 py-1 text-[11px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
            aria-label="Filter by reference status"
          >
            <option value="all">All Attachments</option>
            <option value="referenced">Referenced in Notes</option>
            <option value="unreferenced">Unreferenced (Orphans)</option>
          </select>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-2 py-1 text-[11px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
              aria-label="Sort attachments by"
            >
              <option value="createdAt">Date Added</option>
              <option value="filename">Filename</option>
              <option value="size">File Size</option>
              <option value="refCount">Reference Count</option>
              <option value="kind">Media Type</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white cursor-pointer"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              aria-label="Toggle sort order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 border border-stone-300/50 dark:border-stone-700/50">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
              title="List view"
              aria-label="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Split into File Grid/List + Detail Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Files Explorer */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-stone-400">
              <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Loading vault media attachments...</p>
            </div>
          ) : filteredAttachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  {searchQuery ? 'No attachments matched your search' : 'No attachments in this view'}
                </p>
                <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 max-w-sm">
                  Drag and drop files here or click Import Media / Record Audio to add files to your vault.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Import First Attachment
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAttachments.map((att) => {
                const refs = referenceMap.get(att.id) || [];
                const isSelected = selectedAttachmentId === att.id;

                return (
                  <div
                    key={att.id}
                    onClick={() => setSelectedAttachmentId(att.id)}
                    onDoubleClick={() => handleOpenItem(att)}
                    className={`group relative rounded-xl border p-2 flex flex-col transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500 shadow-sm'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900 hover:shadow-2xs'
                    }`}
                  >
                    {/* Media Thumbnail Container */}
                    <div className="w-full aspect-4/3 rounded-lg bg-stone-100 dark:bg-stone-800/80 flex items-center justify-center overflow-hidden relative mb-2">
                      {att.kind === 'image' && att.dataUrl ? (
                        <img
                          src={att.dataUrl}
                          alt={att.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-stone-400">
                          {renderKindIcon(att.kind, 'w-8 h-8')}
                          <span className="text-[10px] font-mono uppercase mt-1 text-stone-500 font-semibold">
                            {att.kind}
                          </span>
                        </div>
                      )}

                      {/* Reference count badge */}
                      <span
                        className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          refs.length > 0
                            ? 'bg-amber-100/90 dark:bg-amber-900/90 text-amber-800 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60'
                            : 'bg-stone-200/90 dark:bg-stone-700/90 text-stone-600 dark:text-stone-300'
                        }`}
                        title={`${refs.length} note reference(s)`}
                      >
                        {refs.length} ref{refs.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-semibold truncate text-stone-900 dark:text-stone-100"
                        title={att.filename}
                      >
                        {att.filename}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-stone-700 dark:text-stone-300 mt-1">
                        <span>{formatByteSize(att.size)}</span>
                        {att.duration ? (
                          <span>{Math.floor(att.duration)}s</span>
                        ) : att.pageCount ? (
                          <span>{att.pageCount} pgs</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 text-[11px] font-semibold text-stone-500">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">References</th>
                    <th className="py-2.5 px-3">Date Added</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {filteredAttachments.map((att) => {
                    const refs = referenceMap.get(att.id) || [];
                    const isSelected = selectedAttachmentId === att.id;

                    return (
                      <tr
                        key={att.id}
                        onClick={() => setSelectedAttachmentId(att.id)}
                        onDoubleClick={() => handleOpenItem(att)}
                        className={`hover:bg-amber-50/40 dark:hover:bg-amber-950/20 cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-50/70 dark:bg-amber-950/40 font-medium' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {renderKindIcon(att.kind)}
                            <span className="truncate max-w-[220px]" title={att.filename}>
                              {att.filename}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 uppercase">
                          {att.kind}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">
                          {formatByteSize(att.size)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              refs.length > 0
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                            }`}
                          >
                            {refs.length} note{refs.length === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-400 text-[11px]">
                          {new Date(att.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyEmbed(att);
                              }}
                              className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-md transition-colors"
                              title="Copy Markdown Embed"
                            >
                              {copiedId === att.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(att);
                              }}
                              className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                              title="Delete attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Inspector Details Panel */}
        {selectedAttachment && (
          <div className="w-80 border-l border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-4 flex flex-col overflow-y-auto space-y-4 shrink-0">
            {/* Header & Primary Actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
                  {selectedAttachment.kind} Attachment
                </span>
                <h3
                  className="text-sm font-bold text-stone-950 dark:text-white truncate"
                  title={selectedAttachment.filename}
                >
                  {selectedAttachment.filename}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttachmentId(null)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media Preview Area */}
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 p-2 overflow-hidden flex items-center justify-center">
              {selectedAttachment.kind === 'image' ? (
                <div
                  className="relative group cursor-pointer w-full"
                  onClick={async () => {
                    const url = await mediaService.getAttachmentObjectUrl(selectedAttachment.id);
                    if (url) {
                      setPreviewImageSrc(url);
                      setPreviewImageTitle(selectedAttachment.filename);
                    }
                  }}
                >
                  <img
                    src={selectedAttachment.dataUrl}
                    alt={selectedAttachment.filename}
                    className="w-full max-h-48 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity text-white text-xs font-semibold gap-1.5">
                    <ZoomIn className="w-4 h-4" />
                    <span>Zoom Image</span>
                  </div>
                </div>
              ) : selectedAttachment.kind === 'audio' ? (
                <div className="w-full">
                  <InlineAudioPlayer
                    attachmentId={selectedAttachment.id}
                    filename={selectedAttachment.filename}
                    duration={selectedAttachment.duration}
                    size={selectedAttachment.size}
                  />
                </div>
              ) : selectedAttachment.kind === 'pdf' ? (
                <div className="flex flex-col items-center justify-center py-4 text-center space-y-2">
                  <FileText className="w-10 h-10 text-rose-500" />
                  <div>
                    <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {selectedAttachment.title || selectedAttachment.filename}
                    </p>
                    {selectedAttachment.author && (
                      <p className="text-[11px] text-stone-500">{selectedAttachment.author}</p>
                    )}
                  </div>
                  {onOpenPDF && (
                    <button
                      type="button"
                      onClick={() => onOpenPDF(selectedAttachment.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Open in PDF Reader</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center text-stone-400">
                  {renderKindIcon(selectedAttachment.kind, 'w-10 h-10')}
                  <p className="text-xs font-mono mt-2">{selectedAttachment.mimeType}</p>
                </div>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleCopyEmbed(selectedAttachment)}
                className="px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedId === selectedAttachment.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Copy Embed</span>
              </button>

              {onInsertMarkdown && (
                <button
                  type="button"
                  onClick={() => handleInsertIntoNote(selectedAttachment)}
                  className="px-2 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Insert to Note</span>
                </button>
              )}
            </div>

            {/* Metadata Overview & Edit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-stone-100">
                <span>File Metadata</span>
                {!isEditingMeta ? (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(selectedAttachment)}
                    className="p-1 text-stone-400 hover:text-amber-600 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="p-1 text-emerald-600 hover:text-emerald-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                )}
              </div>

              {isEditingMeta ? (
                <div className="space-y-2 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-stone-500 uppercase">
                      Filename
                    </label>
                    <input
                      type="text"
                      value={editFilename}
                      onChange={(e) => setEditFilename(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                    />
                  </div>
                  {selectedAttachment.kind === 'pdf' && (
                    <>
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 uppercase">
                          Paper Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 uppercase">
                          Authors
                        </label>
                        <input
                          type="text"
                          value={editAuthor}
                          onChange={(e) => setEditAuthor(e.target.value)}
                          className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-stone-500 uppercase">
                            Year
                          </label>
                          <input
                            type="number"
                            value={editYear || ''}
                            onChange={(e) => setEditYear(parseInt(e.target.value, 10) || undefined)}
                            className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-stone-500 uppercase">
                            DOI / arXiv
                          </label>
                          <input
                            type="text"
                            value={editDoi || editArxiv}
                            onChange={(e) => setEditDoi(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-500">
                    <span>Size</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100 font-semibold">
                      {formatByteSize(selectedAttachment.size)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>MIME Type</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">
                      {selectedAttachment.mimeType}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Added Date</span>
                    <span className="text-stone-900 dark:text-stone-100">
                      {new Date(selectedAttachment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedAttachment.doi && (
                    <div className="flex justify-between text-stone-500">
                      <span>DOI</span>
                      <span className="text-stone-900 dark:text-stone-100 truncate max-w-[140px]">
                        {selectedAttachment.doi}
                      </span>
                    </div>
                  )}
                  {selectedAttachment.arxivId && (
                    <div className="flex justify-between text-stone-500">
                      <span>arXiv</span>
                      <span className="text-stone-900 dark:text-stone-100">
                        {selectedAttachment.arxivId}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Referencing Notes Section */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-stone-100">
                <span>Referenced In Notes</span>
                <span className="px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400">
                  {referenceMap.get(selectedAttachment.id)?.length || 0}
                </span>
              </div>

              {(referenceMap.get(selectedAttachment.id)?.length || 0) === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-800 text-center text-xs text-stone-400">
                  No notes currently link to this attachment.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(referenceMap.get(selectedAttachment.id) || []).map((ref, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs flex flex-col space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-semibold text-stone-900 dark:text-stone-100 truncate max-w-[140px]"
                          title={ref.noteTitle}
                        >
                          {ref.noteTitle}
                        </span>
                        <div className="flex items-center gap-1">
                          {onOpenNote && (
                            <button
                              type="button"
                              onClick={() => onOpenNote(ref.noteId)}
                              className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-900 text-[10px] text-stone-600 dark:text-stone-300 font-medium cursor-pointer"
                            >
                              Open
                            </button>
                          )}
                          {onOpenNoteBeside && (
                            <button
                              type="button"
                              onClick={() => onOpenNoteBeside(ref.noteId)}
                              className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-colors cursor-pointer"
                              title="Open beside in split pane"
                            >
                              <Columns className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {ref.snippet && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 italic bg-stone-50 dark:bg-stone-950 p-1 rounded">
                          "{ref.snippet}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedAttachment)}
                className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const url = await mediaService.getAttachmentObjectUrl(selectedAttachment.id);
                  if (url) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = selectedAttachment.filename;
                    a.click();
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audio Recording Modal */}
      <AudioRecorderModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        activeNoteId={activeNoteId}
        onInsertSnippet={onInsertMarkdown}
        onSavedAttachment={(att) => {
          setSelectedAttachmentId(att.id);
          loadAttachments();
        }}
      />

      {/* Image Preview / Zoom Modal */}
      {previewImageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setPreviewImageSrc(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-white text-xs">
              <span className="font-semibold truncate">{previewImageTitle}</span>
              <button
                type="button"
                onClick={() => setPreviewImageSrc(null)}
                className="p-1 text-stone-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewImageSrc}
                alt={previewImageTitle}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-950 dark:text-white">
                  Delete Attachment?
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-stone-900 dark:text-stone-200">
                    "{deleteTarget.filename}"
                  </span>
                  ?
                </p>
              </div>
            </div>

            {(referenceMap.get(deleteTarget.id)?.length || 0) > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Warning: In Use</span>
                </p>
                <p>
                  This file is currently referenced in{' '}
                  <span className="font-bold">
                    {referenceMap.get(deleteTarget.id)!.length} note(s)
                  </span>
                  . Deleting it will create broken embed links.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Cleanup Modal */}
      {isBulkCleanupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-stone-950 dark:text-white">
                  Bulk Clean Unreferenced Attachments
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkCleanupOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400">
              The following {unreferencedAttachments.length} files are not referenced by any notes in your vault.
              Select files to permanently free storage:
            </p>

            <div className="max-h-56 overflow-y-auto space-y-1.5 border border-stone-200 dark:border-stone-800 rounded-xl p-2 bg-stone-50 dark:bg-stone-950/50">
              {unreferencedAttachments.map((att) => {
                const isSelected = bulkSelectedIds.has(att.id);
                return (
                  <label
                    key={att.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-800 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const next = new Set(bulkSelectedIds);
                        if (e.target.checked) next.add(att.id);
                        else next.delete(att.id);
                        setBulkSelectedIds(next);
                      }}
                      className="rounded accent-amber-600"
                    />
                    <span className="truncate flex-1 font-medium">{att.filename}</span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      {formatByteSize(att.size)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800 text-xs">
              <span className="text-stone-500 font-medium">
                {bulkSelectedIds.size} file(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkCleanupOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkCleanup}
                  disabled={bulkSelectedIds.size === 0}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  Permanently Delete ({bulkSelectedIds.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
