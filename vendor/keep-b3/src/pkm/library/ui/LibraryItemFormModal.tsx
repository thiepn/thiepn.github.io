import React, { useState } from 'react';
import {
  X,
  Book,
  FileText,
  Video,
  Headphones,
  Globe,
  Upload,
  Plus,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { LibraryItem, LibraryItemType, LibraryFormat, LibraryStatus, ProgressMode } from '../libraryTypes';
import { libraryService } from '../libraryService';
import { EpubParser } from '../epub/epubParser';
import { mediaService } from '../../media/mediaService';

export interface LibraryItemFormModalProps {
  itemToEdit?: LibraryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedItem: LibraryItem) => void;
}

export const LibraryItemFormModal: React.FC<LibraryItemFormModalProps> = ({
  itemToEdit,
  isOpen,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<LibraryItemType>(itemToEdit?.type || 'book');
  const [title, setTitle] = useState(itemToEdit?.title || '');
  const [subtitle, setSubtitle] = useState(itemToEdit?.subtitle || '');
  const [creatorsStr, setCreatorsStr] = useState(
    itemToEdit?.creators ? itemToEdit.creators.map((c) => c.name).join(', ') : ''
  );
  const [status, setStatus] = useState<LibraryStatus>(itemToEdit?.status || 'inbox');
  const [format, setFormat] = useState<LibraryFormat>(itemToEdit?.format || 'physical');
  const [sourceUrl, setSourceUrl] = useState(itemToEdit?.sourceUrl || '');
  const [isbn, setIsbn] = useState(itemToEdit?.metadata?.isbn || '');
  const [publisher, setPublisher] = useState(itemToEdit?.metadata?.publisher || '');
  const [pubDate, setPubDate] = useState(itemToEdit?.metadata?.publicationDate || '');
  const [progressMode, setProgressMode] = useState<ProgressMode>(
    itemToEdit?.progress?.mode || (type === 'book' ? 'page' : 'none')
  );
  const [totalPages, setTotalPages] = useState<number | undefined>(itemToEdit?.progress?.totalPages);
  const [currentPage, setCurrentPage] = useState<number | undefined>(itemToEdit?.progress?.currentPage);
  const [tagsStr, setTagsStr] = useState(itemToEdit?.metadata?.tags ? itemToEdit.metadata.tags.join(', ') : '');
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    try {
      if (file.name.endsWith('.epub')) {
        const { book } = await EpubParser.parseEpub(file);
        if (book.metadata.title) setTitle(book.metadata.title);
        if (book.metadata.creator) setCreatorsStr(book.metadata.creator);
        if (book.metadata.publisher) setPublisher(book.metadata.publisher);
        if (book.metadata.publicationDate) setPubDate(book.metadata.publicationDate);
        if (book.metadata.identifier) setIsbn(book.metadata.identifier);
        setType('book');
        setFormat('epub');

        // Save file to mediaService
        const attId = `att-epub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const att = await mediaService.saveAttachment(
          {
            id: attId,
            filename: file.name,
            mimeType: 'application/epub+zip',
            size: file.size,
            kind: 'other',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          file
        );

        if (itemToEdit) {
          libraryService.updateItem(itemToEdit.id, {
            attachmentIds: [...(itemToEdit.attachmentIds || []), att.id],
            format: 'epub',
          });
        }
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const cleanName = file.name.replace(/\.pdf$/i, '');
        if (!title) setTitle(cleanName);
        setType('paper');
        setFormat('pdf');
      }
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const creators = creatorsStr
      .split(/[,;]/)
      .map((c) => c.trim())
      .filter(Boolean)
      .map((name) => ({ name, role: 'author' as const }));

    const tags = tagsStr
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const progress = {
      mode: progressMode,
      currentPage: currentPage || 0,
      totalPages: totalPages,
      percent:
        progressMode === 'page' && currentPage && totalPages
          ? Math.round((currentPage / totalPages) * 100)
          : itemToEdit?.progress?.percent || 0,
      updatedAt: Date.now(),
    };

    const metadata = {
      isbn: isbn.trim() || undefined,
      publisher: publisher.trim() || undefined,
      publicationDate: pubDate.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    if (itemToEdit) {
      const updated = libraryService.updateItem(itemToEdit.id, {
        type,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        creators,
        status,
        format,
        sourceUrl: sourceUrl.trim() || undefined,
        metadata,
        progress,
      });
      if (updated) onSave(updated);
    } else {
      const created = libraryService.createItem({
        type,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        creators,
        status,
        format,
        sourceUrl: sourceUrl.trim() || undefined,
        metadata,
        progress,
      });
      onSave(created);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {itemToEdit ? 'Edit Library Item' : 'Add to Library'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Quick File Import Dropzone */}
          {!itemToEdit && (
            <div className="border border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-3 bg-stone-50/50 dark:bg-stone-800/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="font-semibold text-stone-800 dark:text-stone-200">
                    Import Ebook or PDF
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Auto-extracts title, author, ISBN, and chapters from EPUB/PDF
                  </p>
                </div>
              </div>
              <label className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 cursor-pointer">
                {isLoadingFile ? 'Parsing...' : 'Browse File'}
                <input
                  type="file"
                  accept=".epub,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Type & Format & Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LibraryItemType)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-2.5 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="book">Book / Ebook</option>
                <option value="article">Article / Essay</option>
                <option value="paper">Academic Paper</option>
                <option value="video">Video</option>
                <option value="podcast">Podcast / Audio</option>
                <option value="web">Webpage</option>
                <option value="other">Other Media</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as LibraryFormat)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-2.5 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="physical">Physical Book</option>
                <option value="epub">EPUB</option>
                <option value="pdf">PDF</option>
                <option value="audio">Audio / Audiobook</option>
                <option value="video">Video Stream</option>
                <option value="web">Web URL</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LibraryStatus)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-2.5 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="inbox">Inbox</option>
                <option value="queued">Queued</option>
                <option value="in-progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="finished">Finished</option>
                <option value="reference">Reference Only</option>
                <option value="archived">Archived</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Thinking, Fast and Slow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Subtitle (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. A Guide to Human Cognition"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Creators */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Authors / Creators (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Daniel Kahneman, Amos Tversky"
              value={creatorsStr}
              onChange={(e) => setCreatorsStr(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Progress Mode & Target */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Progress Unit
              </label>
              <select
                value={progressMode}
                onChange={(e) => setProgressMode(e.target.value as ProgressMode)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-2.5 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="none">None</option>
                <option value="page">Pages</option>
                <option value="percentage">Percentage (%)</option>
                <option value="time">Time / Audio</option>
                <option value="location">Chapter / Section</option>
              </select>
            </div>

            {progressMode === 'page' && (
              <>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Current Page
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentPage || ''}
                    onChange={(e) => setCurrentPage(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Total Pages
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={totalPages || ''}
                    onChange={(e) => setTotalPages(parseInt(e.target.value, 10) || undefined)}
                    className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Metadata Row: ISBN, Publisher, PubDate */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                ISBN / DOI
              </label>
              <input
                type="text"
                placeholder="978-014..."
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Publisher
              </label>
              <input
                type="text"
                placeholder="Penguin"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Year / Date
              </label>
              <input
                type="text"
                placeholder="2024"
                value={pubDate}
                onChange={(e) => setPubDate(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Source URL & Tags */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Source URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Tags (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="psychology, decision-making, behavioral-economics"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold shadow-sm transition-colors"
            >
              {itemToEdit ? 'Save Changes' : 'Add to Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
