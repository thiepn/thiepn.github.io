import React from 'react';
import { Reference, CitationMatch } from '../referenceTypes';
import { formatAuthorsList } from '../personName';
import { exportReferenceToBibTeX } from '../bibtexExporter';
import {
  BookOpen,
  FileText,
  Copy,
  ExternalLink,
  Check,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface CitationPopoverProps {
  reference?: Reference;
  citationKey: string;
  locator?: string;
  onOpenReference?: (referenceId: string) => void;
  onOpenPDF?: (pdfAttachmentId: string) => void;
  onCreateLiteratureNote?: (ref: Reference) => void;
  onClose?: () => void;
}

export const CitationPopover: React.FC<CitationPopoverProps> = ({
  reference,
  citationKey,
  locator,
  onOpenReference,
  onOpenPDF,
  onCreateLiteratureNote,
  onClose,
}) => {
  const [copiedBibtex, setCopiedBibtex] = React.useState(false);
  const [copiedCitation, setCopiedCitation] = React.useState(false);

  if (!reference) {
    return (
      <div className="p-3 max-w-xs text-xs bg-stone-900 text-stone-100 dark:bg-stone-850 rounded-xl shadow-xl border border-stone-700">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Unresolved Reference</span>
        </div>
        <p className="text-[11px] text-stone-300 mb-2 font-mono">[@{citationKey}]</p>
        <p className="text-[11px] text-stone-400">
          This citation key does not match any entry in your Reference Library.
        </p>
      </div>
    );
  }

  const authorsStr = formatAuthorsList(reference.authors || [], {
    format: 'family-first',
    maxAuthors: 3,
  });
  const yearStr = reference.year ? String(reference.year) : reference.date || 'n.d.';
  const journalOrBook = reference.journal || reference.bookTitle || reference.publisher || '';
  const hasPDF = reference.pdfAttachmentIds && reference.pdfAttachmentIds.length > 0;

  const handleCopyBibtex = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const bib = exportReferenceToBibTeX(reference);
    try {
      await navigator.clipboard.writeText(bib);
      setCopiedBibtex(true);
      setTimeout(() => setCopiedBibtex(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyCitation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const citText = locator ? `[@${reference.citationKey}, ${locator}]` : `[@${reference.citationKey}]`;
    try {
      await navigator.clipboard.writeText(citText);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="p-3.5 max-w-sm text-xs bg-stone-900 text-stone-100 dark:bg-stone-850 rounded-xl shadow-2xl border border-stone-700/80 z-50 animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Type & Key */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="px-1.5 py-0.5 rounded bg-stone-800 text-[10px] font-mono text-amber-400 uppercase tracking-wide border border-stone-700">
          {reference.type}
        </span>
        <span className="font-mono text-[11px] text-stone-400 font-semibold">
          [@{reference.citationKey}]
        </span>
      </div>

      {/* Title */}
      <h4 className="font-bold text-stone-100 text-xs leading-snug line-clamp-2 mb-1">
        {reference.title}
      </h4>

      {/* Authors & Year */}
      <p className="text-[11px] text-stone-300 mb-1">
        <span className="font-medium">{authorsStr}</span>
        {yearStr && <span className="text-stone-400 ml-1">({yearStr})</span>}
      </p>

      {/* Journal / Publication */}
      {journalOrBook && (
        <p className="text-[10.5px] italic text-stone-400 mb-2 truncate">
          {journalOrBook}
          {reference.volume && ` ${reference.volume}`}
          {reference.pages && `, pp. ${reference.pages}`}
        </p>
      )}

      {/* Abstract preview if available */}
      {reference.abstract && (
        <p className="text-[10px] text-stone-400 line-clamp-2 mb-2 bg-stone-950/40 p-1.5 rounded border border-stone-800 italic">
          "{reference.abstract}"
        </p>
      )}

      {/* Actions toolbar */}
      <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-stone-800">
        {onOpenReference && (
          <button
            type="button"
            onClick={() => {
              onOpenReference(reference.id);
              onClose?.();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[10px] transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            <span>Open Reference</span>
          </button>
        )}

        {hasPDF && onOpenPDF && (
          <button
            type="button"
            onClick={() => {
              onOpenPDF(reference.pdfAttachmentIds![0]);
              onClose?.();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-medium transition-colors border border-stone-700"
          >
            <FileText className="w-3 h-3 text-red-400" />
            <span>Open PDF</span>
          </button>
        )}

        {reference.doi && (
          <a
            href={reference.doi.startsWith('http') ? reference.doi : `https://doi.org/${reference.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-medium transition-colors border border-stone-700"
          >
            <ExternalLink className="w-3 h-3" />
            <span>DOI</span>
          </a>
        )}

        <button
          type="button"
          onClick={handleCopyCitation}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-medium transition-colors border border-stone-700"
          title="Copy Markdown citation"
        >
          {copiedCitation ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copiedCitation ? 'Copied' : 'Citation'}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyBibtex}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-medium transition-colors border border-stone-700"
          title="Copy BibTeX entry"
        >
          {copiedBibtex ? <Check className="w-3 h-3 text-emerald-400" /> : <FileCode className="w-3 h-3" />}
          <span>{copiedBibtex ? 'Copied' : 'BibTeX'}</span>
        </button>

        {onCreateLiteratureNote && (
          <button
            type="button"
            onClick={() => {
              onCreateLiteratureNote(reference);
              onClose?.();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-medium transition-colors border border-stone-700"
            title="Create Literature Note"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Lit Note</span>
          </button>
        )}
      </div>
    </div>
  );
};
