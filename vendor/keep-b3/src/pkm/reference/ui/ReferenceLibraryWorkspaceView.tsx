import React, { useState, useEffect, useMemo } from 'react';
import {
  Reference,
  ReferenceType,
  PersonName,
} from '../referenceTypes';
import { referenceStorageService } from '../referenceStorageService';
import { formatAuthorsList, formatPersonName, parseBibTeXAuthors } from '../personName';
import { exportReferenceToBibTeX, exportReferencesToBibTeXDocument } from '../bibtexExporter';
import { generateCitationKey, sanitizeCitationKey, validateCitationKey } from '../citationKeys';
import { generateSyntheticReferences } from '../syntheticReferences';
import { AddByIdentifierModal } from './AddByIdentifierModal';
import { BibTeXImportModal } from './BibTeXImportModal';
import { DuplicateReviewModal } from './DuplicateReviewModal';
import { Note, AppSettings, Folder } from '../../../types';
import { PDFAttachment } from '../../pdfTypes';
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  FileCode,
  Download,
  Upload,
  FileText,
  Sparkles,
  Layers,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Edit3,
  SlidersHorizontal,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  Paperclip,
} from 'lucide-react';

interface ReferenceLibraryWorkspaceViewProps {
  allNotes: Note[];
  folders: Folder[];
  settings?: AppSettings;
  onOpenNote?: (noteId: string) => void;
  onOpenPDF?: (pdfAttachmentId: string, page?: number) => void;
  onCreateLiteratureNote?: (note: Note) => void;
  availablePDFs?: PDFAttachment[];
}

export const ReferenceLibraryWorkspaceView: React.FC<ReferenceLibraryWorkspaceViewProps> = ({
  allNotes,
  folders,
  settings,
  onOpenNote,
  onOpenPDF,
  onCreateLiteratureNote,
  availablePDFs = [],
}) => {
  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [pdfFilter, setPdfFilter] = useState<'all' | 'has_pdf' | 'missing_pdf'>('all');
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'year_desc' | 'year_asc' | 'title' | 'author' | 'key' | 'cited' | 'updated'>('updated');

  // Modals
  const [isAddIdentifierOpen, setIsAddIdentifierOpen] = useState(false);
  const [isImportBibTeXOpen, setIsImportBibTeXOpen] = useState(false);
  const [isDuplicateReviewOpen, setIsDuplicateReviewOpen] = useState(false);
  const [isManualCreateOpen, setIsManualCreateOpen] = useState(false);

  // Inspector edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Reference>>({});
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  // Load and subscribe to references
  useEffect(() => {
    const updateList = () => {
      setReferences(referenceStorageService.getAllReferences());
      referenceStorageService.updateCitingNotesIndex(allNotes);
    };

    referenceStorageService.init().then(updateList);
    const unsub = referenceStorageService.subscribe(updateList);
    return unsub;
  }, [allNotes]);

  // Selected reference object
  const selectedReference = useMemo(() => {
    if (!selectedReferenceId) return null;
    return references.find((r) => r.id === selectedReferenceId) || null;
  }, [selectedReferenceId, references]);

  // Filtered & Sorted References
  const displayReferences = useMemo(() => {
    let list = referenceStorageService.searchReferences(searchQuery, {
      type: typeFilter !== 'all' ? typeFilter : undefined,
      hasPdf: pdfFilter === 'has_pdf' ? true : undefined,
      missingPdf: pdfFilter === 'missing_pdf' ? true : undefined,
      incompleteMetadata: incompleteFilter ? true : undefined,
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'year_desc') {
        const yA = a.year ?? -1;
        const yB = b.year ?? -1;
        return yB - yA || a.title.localeCompare(b.title);
      }
      if (sortBy === 'year_asc') {
        const yA = a.year ?? 9999;
        const yB = b.year ?? 9999;
        return yA - yB || a.title.localeCompare(b.title);
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'author') {
        const a1 = a.authors?.[0]?.family || '';
        const b1 = b.authors?.[0]?.family || '';
        return a1.localeCompare(b1);
      }
      if (sortBy === 'key') {
        return (a.citationKey || '').localeCompare(b.citationKey || '');
      }
      if (sortBy === 'cited') {
        const cA = referenceStorageService.getCitingNotes(a.citationKey).length;
        const cB = referenceStorageService.getCitingNotes(b.citationKey).length;
        return cB - cA;
      }
      // default: updated
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });

    return list;
  }, [references, searchQuery, typeFilter, pdfFilter, incompleteFilter, sortBy]);

  // Citing notes for selected reference
  const citingNotes = useMemo(() => {
    if (!selectedReference) return [];
    return referenceStorageService.getCitingNotes(selectedReference.citationKey);
  }, [selectedReference, references, allNotes]);

  const handleSelectReference = (ref: Reference) => {
    setSelectedReferenceId(ref.id);
    setIsEditing(false);
    setEditFormData(ref);
  };

  const handleStartEdit = () => {
    if (!selectedReference) return;
    setEditFormData({
      ...selectedReference,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedReference || !editFormData.title) return;

    const existingKeys = new Set<string>(
      references.filter((r) => r.id !== selectedReference.id).map((r) => r.citationKey.toLowerCase())
    );

    let finalKey = sanitizeCitationKey(editFormData.citationKey || selectedReference.citationKey);
    if (!finalKey) {
      finalKey = generateCitationKey(editFormData, existingKeys);
    }

    const updated: Reference = {
      ...selectedReference,
      ...editFormData,
      citationKey: finalKey,
      title: editFormData.title.trim(),
      updatedAt: new Date().toISOString(),
    } as Reference;

    await referenceStorageService.saveReference(updated);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selectedReference) return;
    if (confirm(`Are you sure you want to delete reference "${selectedReference.title}"?`)) {
      await referenceStorageService.deleteReference(selectedReference.id);
      setSelectedReferenceId(null);
    }
  };

  const handleCreateLiteratureNote = () => {
    if (!selectedReference || !onCreateLiteratureNote) return;
    const lit = referenceStorageService.generateLiteratureNote(selectedReference);
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: lit.title,
      content: lit.content,
      type: 'text',
      tags: lit.tags,
      checklist: [],
      color: 'default',
      folderId: null,
      trashed: false,
      reminderDate: null,
      images: [],
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onCreateLiteratureNote(newNote);
  };

  const handleExportBibTeXDocument = () => {
    const bibDoc = exportReferencesToBibTeXDocument(displayReferences);
    const blob = new Blob([bibDoc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `references_${new Date().toISOString().slice(0, 10)}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateSynthetic = async (count: number) => {
    const synths = generateSyntheticReferences(count);
    await referenceStorageService.saveReferencesBatch(synths);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-stone-100 dark:bg-stone-900 overflow-hidden text-xs">
      {/* Top Main Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
              <span>Reference Library</span>
              <span className="px-2 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 text-[11px] font-mono text-stone-600 dark:text-stone-300 font-medium">
                {displayReferences.length} of {references.length}
              </span>
            </h2>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddIdentifierOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Add by DOI / arXiv / ISBN</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportBibTeXOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 font-semibold text-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import BibTeX</span>
          </button>

          <button
            type="button"
            onClick={handleExportBibTeXDocument}
            disabled={displayReferences.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-40 text-stone-800 dark:text-stone-100 font-semibold text-xs transition-colors"
            title="Export filtered references as .bib"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .bib</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDuplicateReviewOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 font-medium text-xs transition-colors"
            title="Scan for duplicate references"
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Review Duplicates</span>
          </button>

          {/* Benchmark synthetic generator dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="px-2 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 text-xs font-medium"
              title="Add synthetic benchmark references"
            >
              + Synth
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-stone-900 border border-stone-700 rounded-xl shadow-xl p-1 z-30 min-w-28 text-[11px]">
              <button
                type="button"
                onClick={() => handleGenerateSynthetic(100)}
                className="px-3 py-1.5 text-left text-stone-200 hover:bg-stone-800 rounded-lg"
              >
                + 100 References
              </button>
              <button
                type="button"
                onClick={() => handleGenerateSynthetic(1000)}
                className="px-3 py-1.5 text-left text-stone-200 hover:bg-stone-800 rounded-lg"
              >
                + 1,000 References
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-2 bg-stone-50/80 dark:bg-stone-850/80 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-48 max-w-md">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search references by title, author, year, citation key, DOI, tags..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:border-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium"
          >
            <option value="all">All Types</option>
            <option value="article">Article</option>
            <option value="book">Book</option>
            <option value="chapter">Chapter</option>
            <option value="conference">Conference</option>
            <option value="preprint">Preprint</option>
            <option value="thesis">Thesis</option>
            <option value="report">Report</option>
            <option value="webpage">Webpage</option>
            <option value="dataset">Dataset</option>
            <option value="other">Other</option>
          </select>

          {/* PDF filter */}
          <select
            value={pdfFilter}
            onChange={(e) => setPdfFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium"
          >
            <option value="all">All PDFs</option>
            <option value="has_pdf">Has PDF File</option>
            <option value="missing_pdf">Missing PDF</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1 bg-white dark:bg-stone-900 px-2 py-1 rounded-xl border border-stone-300 dark:border-stone-700">
            <ArrowUpDown className="w-3 h-3 text-stone-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-0 text-stone-700 dark:text-stone-300 font-medium cursor-pointer focus:ring-0 text-xs pr-1"
            >
              <option value="updated">Recently Updated</option>
              <option value="year_desc">Year (Newest)</option>
              <option value="year_asc">Year (Oldest)</option>
              <option value="title">Title (A-Z)</option>
              <option value="author">First Author (A-Z)</option>
              <option value="key">Citation Key</option>
              <option value="cited">Most Cited in Vault</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Table / List + Detail Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: References Table / List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900">
          {displayReferences.length === 0 ? (
            <div className="p-12 text-center text-stone-400 space-y-3 max-w-sm mx-auto">
              <BookOpen className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto" />
              <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm">
                {references.length === 0 ? 'No references in your library yet' : 'No references match your filters'}
              </h3>
              <p className="text-xs text-stone-500">
                {references.length === 0
                  ? 'Add your first academic reference by entering a DOI, arXiv ID, or importing a BibTeX file.'
                  : 'Try clearing the search query or changing filter settings.'}
              </p>
              {references.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddIdentifierOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                >
                  Add Reference by Identifier
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-850">
              {displayReferences.map((ref) => {
                const isSelected = ref.id === selectedReferenceId;
                const authorStr = formatAuthorsList(ref.authors || [], {
                  format: 'family-only',
                  maxAuthors: 2,
                });
                const citedCount = referenceStorageService.getCitingNotes(ref.citationKey).length;
                const hasPDF = ref.pdfAttachmentIds && ref.pdfAttachmentIds.length > 0;

                return (
                  <div
                    key={ref.id}
                    onClick={() => handleSelectReference(ref)}
                    className={`p-3.5 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-l-4 border-amber-500'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-850/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Top metadata badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          [@{ref.citationKey}]
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-[9px] font-mono text-stone-600 dark:text-stone-400 uppercase tracking-wider border border-stone-200 dark:border-stone-700">
                          {ref.type}
                        </span>
                        {ref.year && (
                          <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                            {ref.year}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs leading-snug line-clamp-2">
                        {ref.title}
                      </h4>

                      {/* Authors & Journal */}
                      <div className="text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-stone-700 dark:text-stone-300">{authorStr}</span>
                        {(ref.journal || ref.bookTitle) && (
                          <span className="italic truncate max-w-xs">
                            · {ref.journal || ref.bookTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side indicators & badges */}
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      {hasPDF && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenPDF && ref.pdfAttachmentIds?.[0]) {
                              onOpenPDF(ref.pdfAttachmentIds[0]);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-[10px] font-medium hover:bg-red-100 transition-colors"
                          title="Open attached PDF"
                        >
                          <FileText className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      )}

                      {citedCount > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[10px] font-mono font-medium border border-stone-200 dark:border-stone-700"
                          title={`Cited in ${citedCount} note${citedCount === 1 ? '' : 's'}`}
                        >
                          {citedCount} cited
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Reference Details Inspector Drawer */}
        {selectedReference && (
          <div className="w-96 border-l border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex flex-col overflow-hidden shrink-0 shadow-lg">
            {/* Inspector Header */}
            <div className="flex items-center justify-between p-3.5 bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-750">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                  Reference Details
                </span>
              </div>

              <div className="flex items-center gap-1">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
                    title="Edit reference fields"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors"
                  >
                    Save
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedReferenceId(null)}
                  className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 transition-colors"
                  title="Close inspector"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {isEditing ? (
                /* Editable form */
                <div className="space-y-3">
                  <div>
                    <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                      Citation Key
                    </label>
                    <input
                      type="text"
                      value={editFormData.citationKey || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, citationKey: e.target.value })}
                      className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editFormData.title || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                        Type
                      </label>
                      <select
                        value={editFormData.type || 'article'}
                        onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as ReferenceType })}
                        className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                      >
                        <option value="article">Article</option>
                        <option value="book">Book</option>
                        <option value="chapter">Chapter</option>
                        <option value="conference">Conference</option>
                        <option value="preprint">Preprint</option>
                        <option value="thesis">Thesis</option>
                        <option value="report">Report</option>
                        <option value="webpage">Webpage</option>
                        <option value="dataset">Dataset</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                        Year
                      </label>
                      <input
                        type="number"
                        value={editFormData.year || ''}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            year: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                        className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                      Journal / Book Title
                    </label>
                    <input
                      type="text"
                      value={editFormData.journal || editFormData.bookTitle || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, journal: e.target.value })}
                      className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                        Vol
                      </label>
                      <input
                        type="text"
                        value={editFormData.volume || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, volume: e.target.value })}
                        className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                        Issue
                      </label>
                      <input
                        type="text"
                        value={editFormData.issue || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, issue: e.target.value })}
                        className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                        Pages
                      </label>
                      <input
                        type="text"
                        value={editFormData.pages || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, pages: e.target.value })}
                        className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                      DOI
                    </label>
                    <input
                      type="text"
                      value={editFormData.doi || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, doi: e.target.value })}
                      className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                      Abstract
                    </label>
                    <textarea
                      value={editFormData.abstract || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, abstract: e.target.value })}
                      rows={3}
                      className="w-full mt-1 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs"
                    />
                  </div>
                </div>
              ) : (
                /* Read-only view */
                <div className="space-y-4">
                  {/* Title & Type */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        [@{selectedReference.citationKey}]
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-700 text-[9px] font-mono text-stone-600 dark:text-stone-300 uppercase">
                        {selectedReference.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-stone-950 dark:text-white text-sm leading-snug">
                      {selectedReference.title}
                    </h3>
                  </div>

                  {/* Authors */}
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400">Authors:</span>
                    <p className="text-stone-800 dark:text-stone-200 mt-0.5">
                      {formatAuthorsList(selectedReference.authors || [], { format: 'family-first' })}
                    </p>
                  </div>

                  {/* Year / Date */}
                  {selectedReference.year && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-stone-400">Year:</span>
                      <p className="text-stone-800 dark:text-stone-200 font-mono mt-0.5">
                        {selectedReference.year}
                      </p>
                    </div>
                  )}

                  {/* Publication */}
                  {(selectedReference.journal || selectedReference.bookTitle) && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-stone-400">Publication:</span>
                      <p className="text-stone-800 dark:text-stone-200 italic mt-0.5">
                        {selectedReference.journal || selectedReference.bookTitle}
                        {selectedReference.volume && ` vol. ${selectedReference.volume}`}
                        {selectedReference.issue && ` no. ${selectedReference.issue}`}
                        {selectedReference.pages && `, pp. ${selectedReference.pages}`}
                      </p>
                    </div>
                  )}

                  {/* Identifiers */}
                  <div className="space-y-1 pt-2 border-t border-stone-200 dark:border-stone-800">
                    {selectedReference.doi && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 font-mono text-[11px]">DOI:</span>
                        <a
                          href={
                            selectedReference.doi.startsWith('http')
                              ? selectedReference.doi
                              : `https://doi.org/${selectedReference.doi}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
                        >
                          <span>{selectedReference.doi}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {selectedReference.arxivId && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 font-mono text-[11px]">arXiv:</span>
                        <a
                          href={`https://arxiv.org/abs/${selectedReference.arxivId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
                        >
                          <span>{selectedReference.arxivId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {selectedReference.isbn && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 font-mono text-[11px]">ISBN:</span>
                        <span className="font-mono text-stone-700 dark:text-stone-300">
                          {selectedReference.isbn}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Abstract */}
                  {selectedReference.abstract && (
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                      <span className="text-[10px] font-bold uppercase text-stone-400">Abstract:</span>
                      <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed mt-1 italic bg-stone-100 dark:bg-stone-900 p-2.5 rounded-lg border border-stone-200 dark:border-stone-800">
                        "{selectedReference.abstract}"
                      </p>
                    </div>
                  )}

                  {/* Linked PDFs */}
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] font-bold uppercase text-stone-400">
                      Linked PDF Attachments:
                    </span>
                    {selectedReference.pdfAttachmentIds && selectedReference.pdfAttachmentIds.length > 0 ? (
                      <div className="space-y-1.5 mt-1.5">
                        {selectedReference.pdfAttachmentIds.map((pdfId) => {
                          const matchedPdf = availablePDFs.find((p) => p.id === pdfId);
                          const pdfName = matchedPdf?.name || matchedPdf?.fileName || `PDF (${pdfId.slice(0, 8)})`;

                          return (
                            <div
                              key={pdfId}
                              className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                                  {pdfName}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {onOpenPDF && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenPDF(pdfId)}
                                    className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold"
                                  >
                                    Open
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    referenceStorageService.unlinkPDFFromReference(selectedReference.id, pdfId)
                                  }
                                  className="p-1 rounded text-stone-400 hover:text-red-500"
                                  title="Unlink PDF"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-stone-500 text-[11px] mt-1">No PDFs linked yet.</p>
                    )}
                  </div>

                  {/* Citing Notes in Vault */}
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] font-bold uppercase text-stone-400">
                      Cited in Vault Notes ({citingNotes.length}):
                    </span>
                    {citingNotes.length > 0 ? (
                      <div className="space-y-1 mt-1.5 max-h-36 overflow-y-auto">
                        {citingNotes.map((cn, idx) => (
                          <div
                            key={`cn-${idx}`}
                            onClick={() => onOpenNote?.(cn.noteId)}
                            className="p-2 rounded-lg bg-stone-100 dark:bg-stone-900 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-stone-200 dark:border-stone-800 cursor-pointer transition-colors"
                          >
                            <div className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                              {cn.noteTitle}
                            </div>
                            <div className="text-[10.5px] text-stone-500 dark:text-stone-400 truncate mt-0.5 font-mono">
                              "{cn.contextSnippet}"
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-stone-500 text-[11px] mt-1">
                        Not currently cited in any notes. Add <code className="font-mono text-amber-600 dark:text-amber-400">[@{selectedReference.citationKey}]</code> to a note.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="p-3 bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-750 flex items-center justify-between gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`[@${selectedReference.citationKey}]`);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 text-[10.5px] font-medium flex items-center gap-1 transition-colors"
                  title="Copy [@citationKey]"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? 'Copied' : 'Cite'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const bib = exportReferenceToBibTeX(selectedReference);
                    await navigator.clipboard.writeText(bib);
                    setCopiedBibtex(true);
                    setTimeout(() => setCopiedBibtex(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 text-[10.5px] font-medium flex items-center gap-1 transition-colors"
                  title="Copy BibTeX entry"
                >
                  {copiedBibtex ? <Check className="w-3 h-3 text-emerald-500" /> : <FileCode className="w-3 h-3" />}
                  <span>{copiedBibtex ? 'Copied' : 'BibTeX'}</span>
                </button>

                {onCreateLiteratureNote && (
                  <button
                    type="button"
                    onClick={handleCreateLiteratureNote}
                    className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 text-[10.5px] font-medium flex items-center gap-1 transition-colors"
                    title="Create Markdown Literature Note"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Lit Note</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Delete reference"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddByIdentifierModal
        isOpen={isAddIdentifierOpen}
        onClose={() => setIsAddIdentifierOpen(false)}
        onSaveReference={async (newRef) => {
          await referenceStorageService.saveReference(newRef);
          setSelectedReferenceId(newRef.id);
        }}
      />

      <BibTeXImportModal
        isOpen={isImportBibTeXOpen}
        onClose={() => setIsImportBibTeXOpen(false)}
        existingReferences={references}
        onImportComplete={async (imported) => {
          await referenceStorageService.saveReferencesBatch(imported);
        }}
        isVaultEncrypted={Boolean(settings?.vaultLocked)}
      />

      <DuplicateReviewModal
        isOpen={isDuplicateReviewOpen}
        onClose={() => setIsDuplicateReviewOpen(false)}
        references={references}
        onMergeReferences={async (survivingId, merged, discardedId) => {
          await referenceStorageService.saveReference(merged);
          await referenceStorageService.deleteReference(discardedId);
        }}
      />
    </div>
  );
};
