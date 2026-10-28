import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sparkles,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  Copy,
  Plus,
  ArrowRight,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import {
  convertHTMLToMarkdown,
  cleanHTMLStructure,
  extractMetadataFromHTML,
} from '../../pkm/htmlToMarkdown';
import {
  tryFetchExternalImage,
  composeCapturedNoteContent,
} from '../../pkm/webCapture';
import { PKMPreviewRenderer } from '../../pkm/PKMPreviewRenderer';
import { Note, Folder, NoteImage } from '../../types';

interface WebCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertMarkdown?: (markdown: string, images?: NoteImage[], sourceUrl?: string) => void;
  onCreateNewNote?: (note: {
    title: string;
    content: string;
    sourceUrl?: string;
    images?: NoteImage[];
  }) => void;
  allNotes?: Note[];
  folders?: Folder[];
}

export const WebCaptureModal: React.FC<WebCaptureModalProps> = ({
  isOpen,
  onClose,
  onInsertMarkdown,
  onCreateNewNote,
  allNotes = [],
  folders = [],
}) => {
  const [rawHtmlInput, setRawHtmlInput] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [includeAttribution, setIncludeAttribution] = useState(true);
  const [preserveImages, setPreserveImages] = useState(true);
  const [downloadImagesLocal, setDownloadImagesLocal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [corsWarning, setCorsWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadedImages, setDownloadedImages] = useState<NoteImage[]>([]);

  // Preview tab
  const [viewTab, setViewTab] = useState<'preview' | 'markdown' | 'source'>('preview');

  // Convert HTML whenever raw input or options change
  const conversionResult = React.useMemo(() => {
    if (!rawHtmlInput.trim()) {
      return {
        markdown: '',
        title: '',
        sourceUrl: '',
        imageUrls: [],
        hasTables: false,
        wordCount: 0,
      };
    }
    return convertHTMLToMarkdown(rawHtmlInput, {
      preserveImages,
    });
  }, [rawHtmlInput, preserveImages]);

  // Auto-fill title & sourceUrl if detected and not already entered
  useEffect(() => {
    if (conversionResult.sourceUrl && !sourceUrl) {
      setSourceUrl(conversionResult.sourceUrl);
    }
    if (conversionResult.title && !noteTitle) {
      setNoteTitle(conversionResult.title);
    }
  }, [conversionResult.sourceUrl, conversionResult.title, sourceUrl, noteTitle]);

  // Final prepared markdown content
  const finalMarkdown = React.useMemo(() => {
    if (!conversionResult.markdown) return '';
    return composeCapturedNoteContent(conversionResult.markdown, {
      sourceUrl: sourceUrl.trim() || undefined,
      title: noteTitle.trim() || undefined,
      includeAttribution,
    });
  }, [conversionResult.markdown, sourceUrl, noteTitle, includeAttribution]);

  if (!isOpen) return null;

  // Handle local image download test (CORS safe)
  const handleFetchImages = async () => {
    if (conversionResult.imageUrls.length === 0) return;
    setIsProcessing(true);
    setCorsWarning(null);

    const fetched: NoteImage[] = [];
    const failedUrls: string[] = [];

    for (const imgUrl of conversionResult.imageUrls) {
      const res = await tryFetchExternalImage(imgUrl);
      if (res.success && res.image) {
        fetched.push(res.image);
      } else {
        failedUrls.push(imgUrl);
      }
    }

    setDownloadedImages(fetched);
    setIsProcessing(false);

    if (failedUrls.length > 0) {
      setCorsWarning(
        `${failedUrls.length} image(s) could not be downloaded locally due to remote server CORS security policies. Remote image markdown links have been preserved.`
      );
    }
  };

  const handleInsert = () => {
    if (!finalMarkdown.trim()) return;
    if (onInsertMarkdown) {
      onInsertMarkdown(
        finalMarkdown,
        downloadedImages.length > 0 ? downloadedImages : undefined,
        sourceUrl.trim() || undefined
      );
    }
    onClose();
  };

  const handleCreateNote = () => {
    if (!finalMarkdown.trim()) return;
    if (onCreateNewNote) {
      onCreateNewNote({
        title: noteTitle.trim() || conversionResult.title || 'Web Capture Note',
        content: finalMarkdown,
        sourceUrl: sourceUrl.trim() || undefined,
        images: downloadedImages.length > 0 ? downloadedImages : undefined,
      });
    }
    onClose();
  };

  const handleCopyMarkdown = () => {
    if (!finalMarkdown) return;
    navigator.clipboard.writeText(finalMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="pkm-web-capture-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-capture-modal-title"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="web-capture-modal-title"
                className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2"
              >
                Web Capture & HTML Ingestion
                <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  Sanitized
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Convert copied web articles, documentation, or HTML into clean, portable Markdown
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Input & Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HTML / Raw Content Input */}
            <div className="space-y-1.5 flex flex-col">
              <label className="font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                <span>Paste Copied HTML or Rich Web Text:</span>
                {rawHtmlInput && (
                  <button
                    type="button"
                    onClick={() => setRawHtmlInput('')}
                    className="text-[11px] text-stone-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </label>
              <textarea
                value={rawHtmlInput}
                onChange={(e) => setRawHtmlInput(e.target.value)}
                placeholder="Paste rich HTML or copied web content here (e.g. from Wikipedia, docs, blog posts)..."
                rows={7}
                className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/60 text-stone-900 dark:text-stone-100 font-mono text-xs focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Note Metadata & Ingestion Config */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Note Title (auto-detected or custom):
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Enter or refine note title..."
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/60 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-amber-500" />
                    Source URL Attribution:
                  </label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/60 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Ingestion Toggles */}
              <div className="bg-stone-100 dark:bg-stone-950/40 p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={includeAttribution}
                    onChange={(e) => setIncludeAttribution(e.target.checked)}
                    className="rounded text-amber-500 accent-amber-500"
                  />
                  <span>Append clean Source Attribution footer</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={preserveImages}
                    onChange={(e) => setPreserveImages(e.target.checked)}
                    className="rounded text-amber-500 accent-amber-500"
                  />
                  <span>Preserve image references ({conversionResult.imageUrls.length} found)</span>
                </label>
              </div>
            </div>
          </div>

          {/* CORS Warning if images failed to download */}
          {corsWarning && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>{corsWarning}</div>
            </div>
          )}

          {/* Live Ingestion Preview Section */}
          {conversionResult.markdown ? (
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              {/* Preview Tabs */}
              <div className="px-4 py-2 bg-stone-100 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewTab('preview')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      viewTab === 'preview'
                        ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    Formatted Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab('markdown')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      viewTab === 'markdown'
                        ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    Clean Markdown
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                  <span>{conversionResult.wordCount} words</span>
                  {conversionResult.hasTables && <span>• Tables</span>}
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1"
                    title="Copy Markdown"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="p-4 max-h-64 overflow-y-auto bg-stone-50/50 dark:bg-stone-900/30">
                {viewTab === 'preview' && (
                  <PKMPreviewRenderer
                    content={finalMarkdown}
                    allNotes={allNotes}
                    folders={folders}
                  />
                )}
                {viewTab === 'markdown' && (
                  <pre className="text-xs font-mono whitespace-pre-wrap text-stone-800 dark:text-stone-200">
                    {finalMarkdown}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-xl text-stone-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-700" />
              <p className="font-medium text-stone-600 dark:text-stone-300">
                No web content pasted yet
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Paste HTML from your clipboard into the box above to generate clean Markdown.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {onCreateNewNote && (
              <button
                type="button"
                onClick={handleCreateNote}
                disabled={!finalMarkdown.trim()}
                className="px-3.5 py-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create as New Note</span>
              </button>
            )}

            {onInsertMarkdown && (
              <button
                type="button"
                onClick={handleInsert}
                disabled={!finalMarkdown.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Insert into Note</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
