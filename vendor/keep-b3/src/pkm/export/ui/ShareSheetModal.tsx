/**
 * PKM V1.8: Lightweight Quick Share Sheet Modal
 * Fast action popup for sharing or copying current note.
 */

import React, { useState } from 'react';
import {
  Share2,
  Copy,
  FileText,
  Printer,
  X,
  Check,
  Globe,
  Download,
} from 'lucide-react';
import { Note } from '../../../types';
import {
  copyNoteAsMarkdown,
  shareViaWebShareApi,
} from '../sharingService';
import { triggerFileDownload } from '../../publishing';
import { generateStandaloneHtml } from '../standaloneHtmlTransformer';

interface ShareSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  allNotes?: Note[];
  onOpenFullExportCenter?: () => void;
}

export function ShareSheetModal({
  isOpen,
  onClose,
  note,
  allNotes = [],
  onOpenFullExportCenter,
}: ShareSheetModalProps) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  if (!isOpen || !note) return null;

  const handleCopyMarkdown = async () => {
    const ok = await copyNoteAsMarkdown(note);
    if (ok) {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const handleDownloadHtml = () => {
    const html = generateStandaloneHtml(
      note,
      {
        scopeType: 'current-note',
        primaryNoteIds: [note.id],
        includeAttachments: true,
        includeReferences: true,
        excludeTags: [],
        hidePrivateTags: true,
        maskSensitiveData: true,
        linkRewriteMode: 'relative-markdown',
        includeBacklinks: true,
        includeTableOfContents: true,
        includeBibliography: true,
        theme: 'light',
      },
      allNotes
    );
    triggerFileDownload(html, `${note.title || 'Note'}.html`, 'text/html');
  };

  const handleSystemShare = async () => {
    await shareViaWebShareApi({
      title: note.title || 'Untitled Note',
      text: note.content,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sharesheet-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-md w-full p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 id="sharesheet-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Share & Export Note
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-md"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-3">
          <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {note.title || 'Untitled Note'}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Updated {new Date(note.updatedAt).toLocaleDateString()} • {note.content.length} characters
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors text-xs font-medium text-neutral-800 dark:text-neutral-200 text-left"
          >
            <span className="flex items-center gap-2.5">
              <Copy className="w-4 h-4 text-neutral-500" />
              {copiedMd ? '✓ Copied Clean Markdown' : 'Copy Markdown'}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">.md</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHtml}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors text-xs font-medium text-neutral-800 dark:text-neutral-200 text-left"
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-neutral-500" />
              Download Standalone HTML
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">.html</span>
          </button>

          <button
            type="button"
            onClick={handleSystemShare}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors text-xs font-medium text-neutral-800 dark:text-neutral-200 text-left"
          >
            <span className="flex items-center gap-2.5">
              <Share2 className="w-4 h-4 text-neutral-500" />
              Native OS Share Sheet
            </span>
            <span className="text-[10px] text-neutral-400">System</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors text-xs font-medium text-neutral-800 dark:text-neutral-200 text-left"
          >
            <span className="flex items-center gap-2.5">
              <Printer className="w-4 h-4 text-neutral-500" />
              Print / Save as PDF
            </span>
            <span className="text-[10px] text-neutral-400">Print</span>
          </button>
        </div>

        {onOpenFullExportCenter && (
          <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullExportCenter();
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Open Full Export & Sharing Center →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
