import React, { useState, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Volume2,
  File,
  Download,
  ExternalLink,
  Maximize2,
  X,
  Sparkles,
} from 'lucide-react';
import { mediaService, formatByteSize } from './mediaService';
import { CanonicalAttachment } from './mediaTypes';
import { InlineAudioPlayer } from './InlineAudioPlayer';

interface MediaEmbedProps {
  target: string; // "attachment:id", "id", or "filename.ext" or "data:..." / "blob:..." / "http..."
  onOpenPDF?: (pdfId: string, page?: number, highlightId?: string) => void;
  onOpenNote?: (noteId: string) => void;
  className?: string;
}

export const MediaEmbed: React.FC<MediaEmbedProps> = ({
  target,
  onOpenPDF,
  onOpenNote,
  className = '',
}) => {
  const [attachment, setAttachment] = useState<CanonicalAttachment | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Strip attachment prefix if present: attachment:att-123 -> att-123
        const cleanTarget = target.replace(/^attachment:/i, '').trim();

        // Check if direct URL
        if (cleanTarget.startsWith('data:') || cleanTarget.startsWith('blob:') || cleanTarget.startsWith('http')) {
          if (!isCancelled) {
            setObjectUrl(cleanTarget);
            setLoading(false);
          }
          return;
        }

        // Try lookup in MediaService
        const meta = await mediaService.getAttachment(cleanTarget);
        if (!isCancelled) {
          if (meta) {
            setAttachment(meta);
            const url = await mediaService.getAttachmentObjectUrl(meta.id);
            if (!isCancelled) {
              setObjectUrl(url || meta.dataUrl || null);
            }
          } else {
            // Direct object URL attempt
            const url = await mediaService.getAttachmentObjectUrl(cleanTarget);
            if (!isCancelled) {
              setObjectUrl(url);
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load media embed target:', target, err);
        if (!isCancelled) setLoading(false);
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [target]);

  // Determine kind
  const lower = target.toLowerCase();
  const isAudio =
    attachment?.kind === 'audio' ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.m4a');

  const isPDF =
    attachment?.kind === 'pdf' ||
    lower.endsWith('.pdf') ||
    attachment?.mimeType === 'application/pdf';

  const isImage =
    attachment?.kind === 'image' ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    (objectUrl && objectUrl.startsWith('data:image'));

  if (loading) {
    return (
      <div className={`my-2 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex items-center gap-2 text-xs text-stone-400 animate-pulse ${className}`}>
        <div className="w-4 h-4 rounded-full border-2 border-stone-300 border-t-amber-500 animate-spin" />
        <span>Loading media attachment...</span>
      </div>
    );
  }

  // 1. Audio Embed
  if (isAudio) {
    return (
      <div className={`my-2 max-w-lg ${className}`}>
        <InlineAudioPlayer
          src={objectUrl || undefined}
          attachmentId={attachment?.id}
          filename={attachment?.filename || target.split('/').pop() || 'Voice Memo'}
          duration={attachment?.duration}
          size={attachment?.size}
        />
      </div>
    );
  }

  // 2. PDF Embed Card
  if (isPDF) {
    const pdfId = attachment?.id || target.replace(/^attachment:/i, '');
    const title = attachment?.title || attachment?.filename || target.split('/').pop() || 'PDF Document';

    return (
      <div className={`my-3 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 max-w-xl transition-all shadow-xs hover:shadow-md ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                {title}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300">
                PDF
              </span>
            </div>
            {attachment?.author && (
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 truncate">
                {attachment.author} {attachment.year ? `(${attachment.year})` : ''}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-500 dark:text-stone-400">
              {attachment?.pageCount && (
                <span>{attachment.pageCount} pages</span>
              )}
              {attachment?.size && (
                <span>{formatByteSize(attachment.size)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-rose-100 dark:border-rose-900/30 flex items-center justify-between gap-2">
          {onOpenPDF && (
            <button
              type="button"
              onClick={() => onOpenPDF(pdfId)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in PDF Workspace</span>
            </button>
          )}
          {objectUrl && (
            <a
              href={objectUrl}
              download={attachment?.filename || 'document.pdf'}
              className="px-2.5 py-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 text-xs flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // 3. Image Embed
  if (isImage && objectUrl) {
    return (
      <div className={`my-3 max-w-xl group relative ${className}`}>
        <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 relative">
          <img
            src={objectUrl}
            alt={attachment?.filename || 'Image attachment'}
            className="w-full max-h-96 object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
            onClick={() => setIsModalOpen(true)}
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
            title="Expand Full Size"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        {attachment?.filename && (
          <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-1">
            <span className="truncate">{attachment.filename}</span>
            {attachment.size && <span>{formatByteSize(attachment.size)}</span>}
          </div>
        )}

        {/* Fullscreen Image Preview Dialog */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={objectUrl}
              alt={attachment?.filename || 'Full View'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  // 4. Generic Attachment Fallback Card
  return (
    <div className={`my-2 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex items-center justify-between gap-3 max-w-md ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0">
          <File className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
            {attachment?.filename || target}
          </div>
          {attachment?.size && (
            <div className="text-[10px] text-stone-500">
              {formatByteSize(attachment.size)}
            </div>
          )}
        </div>
      </div>
      {objectUrl && (
        <a
          href={objectUrl}
          download={attachment?.filename || 'attachment'}
          className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          title="Download Attachment"
        >
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  );
};
