import React, { useState } from 'react';
import { Reference } from '../referenceTypes';
import { lookupReferenceByIdentifier } from '../referenceMetadataService';
import { formatAuthorsList } from '../personName';
import { mergeReferenceRecords } from '../duplicateDetector';
import {
  Search,
  BookOpen,
  X,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface AddByIdentifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveReference: (reference: Reference) => void;
  existingReference?: Reference; // If refreshing an existing reference
}

export const AddByIdentifierModal: React.FC<AddByIdentifierModalProps> = ({
  isOpen,
  onClose,
  onSaveReference,
  existingReference,
}) => {
  const [identifierInput, setIdentifierInput] = useState(
    existingReference?.doi || existingReference?.arxivId || existingReference?.isbn || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrievedReference, setRetrievedReference] = useState<Partial<Reference> | null>(null);

  if (!isOpen) return null;

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifierInput.trim()) return;

    setLoading(true);
    setError(null);
    setRetrievedReference(null);

    const result = await lookupReferenceByIdentifier(identifierInput);
    setLoading(false);

    if (result.success && result.reference) {
      setRetrievedReference(result.reference);
    } else {
      setError(result.error || 'Failed to retrieve metadata');
    }
  };

  const handleApplyNew = () => {
    if (!retrievedReference) return;

    const now = new Date().toISOString();
    const newRef: Reference = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: retrievedReference.type || 'article',
      title: retrievedReference.title || 'Untitled Reference',
      authors: retrievedReference.authors || [],
      year: retrievedReference.year,
      date: retrievedReference.date,
      journal: retrievedReference.journal,
      bookTitle: retrievedReference.bookTitle,
      publisher: retrievedReference.publisher,
      volume: retrievedReference.volume,
      issue: retrievedReference.issue,
      pages: retrievedReference.pages,
      doi: retrievedReference.doi,
      isbn: retrievedReference.isbn,
      arxivId: retrievedReference.arxivId,
      url: retrievedReference.url,
      abstract: retrievedReference.abstract,
      citationKey: retrievedReference.citationKey || 'ref',
      createdAt: now,
      updatedAt: now,
    };

    onSaveReference(newRef);
    onClose();
  };

  const handleApplyMerge = (mode: 'missing_only' | 'replace_all') => {
    if (!existingReference || !retrievedReference) return;

    if (mode === 'replace_all') {
      const merged: Reference = {
        ...existingReference,
        ...retrievedReference,
        id: existingReference.id,
        createdAt: existingReference.createdAt,
        updatedAt: new Date().toISOString(),
      };
      onSaveReference(merged);
    } else {
      // Missing only
      const merged = mergeReferenceRecords(existingReference, retrievedReference as Reference, {});
      onSaveReference(merged);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-stone-900 text-stone-100 dark:bg-stone-850 rounded-2xl shadow-2xl border border-stone-700/80 overflow-hidden flex flex-col text-xs max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-stone-100 text-sm">
              {existingReference ? 'Fetch & Update Reference Metadata' : 'Add Reference by Identifier'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search / Input Form */}
        <div className="p-5 border-b border-stone-800 space-y-3">
          <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="Enter DOI (e.g. 10.1038/nature12373), arXiv ID (1706.03762), or ISBN..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !identifierInput.trim()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{loading ? 'Fetching...' : 'Lookup'}</span>
            </button>
          </form>

          <p className="text-[11px] text-stone-400">
            Supported identifiers: <span className="font-mono text-stone-300">DOI</span> (via CrossRef),{' '}
            <span className="font-mono text-stone-300">arXiv ID</span> (via arXiv.org), and{' '}
            <span className="font-mono text-stone-300">ISBN</span> (via OpenLibrary).
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results / Side-by-side View */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {retrievedReference && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  Retrieved Record Preview
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-800 text-[10px] font-mono text-stone-300 uppercase">
                  {retrievedReference.type}
                </span>
              </div>

              {/* Retrieved card preview */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                <h4 className="font-bold text-sm text-stone-100 leading-snug">
                  {retrievedReference.title}
                </h4>

                <div className="text-xs text-stone-300">
                  <span className="font-medium">
                    {formatAuthorsList(retrievedReference.authors || [], { format: 'family-first' })}
                  </span>
                  {retrievedReference.year && (
                    <span className="text-stone-400 ml-1.5 font-mono">({retrievedReference.year})</span>
                  )}
                </div>

                {retrievedReference.journal && (
                  <p className="text-xs italic text-stone-400">
                    {retrievedReference.journal}
                    {retrievedReference.volume && ` vol. ${retrievedReference.volume}`}
                    {retrievedReference.pages && `, pp. ${retrievedReference.pages}`}
                  </p>
                )}

                {retrievedReference.publisher && (
                  <p className="text-xs text-stone-400">{retrievedReference.publisher}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-stone-800 font-mono text-[11px] text-amber-400">
                    [@{retrievedReference.citationKey}]
                  </span>
                  {retrievedReference.doi && (
                    <span className="text-[11px] font-mono text-stone-400">DOI: {retrievedReference.doi}</span>
                  )}
                  {retrievedReference.arxivId && (
                    <span className="text-[11px] font-mono text-stone-400">arXiv: {retrievedReference.arxivId}</span>
                  )}
                </div>

                {retrievedReference.abstract && (
                  <div className="pt-2 border-t border-stone-800/80">
                    <p className="text-[11px] text-stone-400 line-clamp-3 italic">
                      "{retrievedReference.abstract}"
                    </p>
                  </div>
                )}
              </div>

              {/* If refreshing existing reference, show comparison note */}
              {existingReference && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-300">
                  <p className="font-semibold mb-1">Updating Existing Reference:</p>
                  <p className="text-[11px] text-amber-200/80">
                    "{existingReference.title}" [@{existingReference.citationKey}]
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          {retrievedReference && !existingReference && (
            <button
              type="button"
              onClick={handleApplyNew}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Add to Reference Library</span>
            </button>
          )}

          {retrievedReference && existingReference && (
            <>
              <button
                type="button"
                onClick={() => handleApplyMerge('missing_only')}
                className="px-3 py-1.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-100 font-semibold text-xs transition-colors"
                title="Only fills empty fields without overwriting user-edited content"
              >
                Fill Missing Fields Only
              </button>
              <button
                type="button"
                onClick={() => handleApplyMerge('replace_all')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Replace All Fields</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
