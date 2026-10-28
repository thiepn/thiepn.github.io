import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  X,
  Calendar,
  Inbox,
  FileText,
  Clock,
  Link,
  Tag,
  CheckSquare,
  Image as ImageIcon,
  Check,
  Send,
  Plus,
} from 'lucide-react';
import { Note, Folder, AppSettings, NoteImage } from '../../types';
import {
  QuickCapturePayload,
  QuickCaptureTarget,
} from './quickCaptureTypes';
import { quickCaptureService } from './quickCaptureService';
import { formatDailyDate } from '../dailyNotes/dailyNotesTypes';
import { dailyNotesService } from '../dailyNotes/dailyNotesService';
import { extractHashtags } from '../../utils/linking';
import { TagAutocompleteInput } from '../../components/TagAutocompleteInput';

export interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  settings: AppSettings;
  activeNote: Note | null;
  initialPayload?: Partial<QuickCapturePayload>;
  onCreateNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  onSaveNote: (updatedNote: Note) => Promise<void>;
  onCreateFolder?: (name: string, color?: string) => Promise<void>;
  onOpenCapturedNote?: (note: Note) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  settings,
  activeNote,
  initialPayload,
  onCreateNote,
  onSaveNote,
  onCreateFolder,
  onOpenCapturedNote,
}) => {
  const qcSettings = quickCaptureService.getSettings();
  const dailySettings = dailyNotesService.getSettings();

  const [target, setTarget] = useState<QuickCaptureTarget>(
    initialPayload?.target || qcSettings.defaultTarget || 'daily_append'
  );
  const [content, setContent] = useState(initialPayload?.content || '');
  const [title, setTitle] = useState(initialPayload?.title || '');
  const [sourceUrl, setSourceUrl] = useState(initialPayload?.sourceUrl || '');
  const [showUrlInput, setShowUrlInput] = useState(Boolean(initialPayload?.sourceUrl));
  const [type, setType] = useState<'text' | 'checklist'>(initialPayload?.type || 'text');
  const [tags, setTags] = useState<string[]>(initialPayload?.tags || []);
  const [includeTimestamp, setIncludeTimestamp] = useState(
    initialPayload?.includeTimestamp !== undefined
      ? initialPayload.includeTimestamp
      : qcSettings.includeTimestamp
  );
  const [images, setImages] = useState<NoteImage[]>(initialPayload?.images || []);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial payload if updated externally
  useEffect(() => {
    if (initialPayload) {
      if (initialPayload.content !== undefined) setContent(initialPayload.content);
      if (initialPayload.title !== undefined) setTitle(initialPayload.title);
      if (initialPayload.sourceUrl !== undefined) {
        setSourceUrl(initialPayload.sourceUrl);
        setShowUrlInput(Boolean(initialPayload.sourceUrl));
      }
      if (initialPayload.tags !== undefined) setTags(initialPayload.tags);
      if (initialPayload.target !== undefined) setTarget(initialPayload.target);
    }
  }, [initialPayload]);

  // Auto-parse hashtags from content & title into tags
  useEffect(() => {
    const extracted = extractHashtags(`${title}\n${content}`);
    if (extracted.length > 0) {
      setTags((prev) => {
        const combined = Array.from(new Set([...prev, ...extracted]));
        if (combined.length !== prev.length) {
          return combined;
        }
        return prev;
      });
    }
  }, [title, content]);

  // Auto focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const todayFormatted = formatDailyDate(new Date(), dailySettings.dateFormat);

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (url) {
          setImages((prev) => [
            ...prev,
            { id: `img-${Date.now()}-${Math.random()}`, url, caption: file.name },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (keepOpen: boolean = false) => {
    if (!content.trim() && images.length === 0) return;
    setIsSaving(true);

    try {
      const extracted = extractHashtags(`${title}\n${content}`);
      const mergedTags = Array.from(new Set([...tags, ...extracted]));

      const payload: QuickCapturePayload = {
        content: content.trim(),
        title: title.trim() || undefined,
        target,
        type,
        tags: mergedTags,
        includeTimestamp,
        sourceUrl: sourceUrl.trim() || undefined,
        images,
      };

      const result = await quickCaptureService.processCapture({
        payload,
        notes,
        folders,
        appSettings: settings,
        activeNote,
        createNote: onCreateNote,
        saveNote: onSaveNote,
        createFolder: onCreateFolder,
      });

      // Show instant confirmation
      setToastMessage(
        target === 'daily_append'
          ? `Appended to Today's Note (${todayFormatted})`
          : target === 'active_note'
          ? `Appended to ${activeNote?.title || 'Active Note'}`
          : `Saved to Inbox (${result.targetNote.title})`
      );

      if (keepOpen) {
        // Reset form for rapid successive captures
        setContent('');
        setTitle('');
        setSourceUrl('');
        setImages([]);
        setTags([]);
        setIsSaving(false);
        setTimeout(() => {
          setToastMessage(null);
          textareaRef.current?.focus();
        }, 1500);
      } else {
        setTimeout(() => {
          setIsSaving(false);
          onClose();
          if (qcSettings.autoOpenAfterCapture && onOpenCapturedNote) {
            onOpenCapturedNote(result.targetNote);
          }
        }, 200);
      }
    } catch (err) {
      console.error('Quick capture error:', err);
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && e.key === 'Enter') {
      e.preventDefault();
      handleSave(e.shiftKey); // Cmd+Shift+Enter = Save & Add Another, Cmd+Enter = Save & Close
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        className="w-full max-w-xl rounded-2xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-900 shadow-2xl flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
        onKeyDown={handleKeyDown}
      >
        {/* Header with Title & Target Selector */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850/50">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
              <Zap className="h-4 w-4" />
            </div>
            <span>Quick Capture</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Target Destination Tabs */}
        <div className="px-5 pt-3 pb-2 flex flex-wrap items-center gap-1.5 border-b border-stone-100 dark:border-stone-800">
          <span className="text-[11px] font-medium text-stone-400 mr-1">Target:</span>

          {/* Daily Note Target */}
          <button
            type="button"
            onClick={() => setTarget('daily_append')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              target === 'daily_append'
                ? 'bg-amber-500 text-white shadow-xs font-semibold'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-750'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Today's Daily Note</span>
          </button>

          {/* Inbox Note Target */}
          <button
            type="button"
            onClick={() => setTarget('inbox_note')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              target === 'inbox_note'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-750'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>New Inbox Note</span>
          </button>

          {/* Active Note Target (if note is active in workspace) */}
          {activeNote && (
            <button
              type="button"
              onClick={() => setTarget('active_note')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                target === 'active_note'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-750'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]">
                {activeNote.title || 'Active Note'}
              </span>
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="p-5 flex flex-col gap-3">
          {/* Optional Title input for Inbox notes */}
          {target === 'inbox_note' && (
            <input
              type="text"
              placeholder="Note title (optional)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800 px-3.5 py-2 text-sm font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:bg-white dark:focus:bg-stone-850 focus:outline-hidden"
            />
          )}

          {/* Main Content Area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={4}
              placeholder={
                target === 'daily_append'
                  ? 'Type thought, quick log, meeting bullet, or task to append to today...'
                  : 'Capture quick idea, reference, text snippet, or task...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full resize-y rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800 p-3.5 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:bg-white dark:focus:bg-stone-850 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* Source Link Input */}
          {showUrlInput && (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800 px-3 py-1.5">
              <Link className="h-4 w-4 text-stone-400 shrink-0" />
              <input
                type="url"
                placeholder="https://example.com/article"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="flex-1 bg-transparent text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  setSourceUrl('');
                  setShowUrlInput(false);
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Attached Images */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {images.map((img, idx) => (
                <div key={img.id || idx} className="relative group">
                  <img
                    src={img.url}
                    alt="capture attachment"
                    className="h-16 w-16 rounded-lg object-cover border border-stone-200 dark:border-stone-700"
                  />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tags & Settings Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            {/* Tag List & Fuzzy Autocomplete Tag Input */}
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-300"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <TagAutocompleteInput
                tags={tags}
                notes={notes}
                onAddTag={(newTag) => {
                  if (!tags.includes(newTag)) {
                    setTags((prev) => [...prev, newTag]);
                  }
                }}
                onRemoveTag={handleRemoveTag}
                placeholder="Add tag (Enter)..."
                inputClassName="w-28 text-[11px]"
                dropdownPosition="bottom"
              />
            </div>

            {/* Quick Actions (Link, Image, Timestamp) */}
            <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400">
              {!showUrlInput && (
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="flex items-center gap-1 hover:text-amber-500 transition-colors"
                  title="Attach Source URL"
                >
                  <Link className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Link</span>
                </button>
              )}

              <label className="flex items-center gap-1 hover:text-amber-500 transition-colors cursor-pointer" title="Attach Image">
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="text-[11px]">Image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={includeTimestamp}
                  onChange={(e) => setIncludeTimestamp(e.target.checked)}
                  className="rounded border-stone-300 dark:border-stone-700 text-amber-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Timestamp</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850/50">
          <div className="text-[11px] text-stone-400">
            {toastMessage ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> {toastMessage}
              </span>
            ) : (
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-750 font-mono text-[10px]">
                  Cmd+Enter
                </kbd>{' '}
                to save •{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-750 font-mono text-[10px]">
                  Shift+Enter
                </kbd>{' '}
                to add more
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={!content.trim() && images.length === 0}
              className="flex items-center gap-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-40 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Another</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={!content.trim() && images.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Save & Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
