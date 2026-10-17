import React, { useState, useMemo } from 'react';
import {
  Images,
  Camera,
  Link,
  Upload,
  Search,
  Maximize2,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Plus,
  Play,
  Grid3X3,
  LayoutList,
  Sparkles,
  Info,
} from 'lucide-react';
import { NoteEmbeddedImage, formatBytes, isDataUrl } from '../../pkm/images/noteImages';

export interface NoteImageGalleryViewProps {
  images: NoteEmbeddedImage[];
  noteTitle?: string;
  onOpenLightbox: (index: number) => void;
  onOpenInsertModal: (defaultTab?: 'camera' | 'url' | 'upload') => void;
  onRemoveImage?: (image: NoteEmbeddedImage) => void;
}

export const NoteImageGalleryView: React.FC<NoteImageGalleryViewProps> = ({
  images,
  noteTitle,
  onOpenLightbox,
  onOpenInsertModal,
  onRemoveImage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered images based on search
  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) return images;
    const q = searchQuery.toLowerCase().trim();
    return images.filter(
      (img) =>
        img.alt.toLowerCase().includes(q) ||
        img.url.toLowerCase().includes(q) ||
        img.sourceType.toLowerCase().includes(q)
    );
  }, [images, searchQuery]);

  const handleCopyMarkdown = async (img: NoteEmbeddedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    const tag = img.fullTag || `![${img.alt}](${img.url})`;
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedId(img.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = tag;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(img.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleRemove = (img: NoteEmbeddedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveImage) {
      onRemoveImage(img);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Gallery Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Images className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              Note Image Gallery
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Aggregated lightbox collection of all photos and embedded media in this note
            </p>
          </div>
        </div>

        {/* Gallery Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {images.length > 0 && (
            <>
              {/* Slideshow Button */}
              <button
                type="button"
                onClick={() => onOpenLightbox(0)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white shadow-xs transition-colors flex items-center gap-1.5"
                title="Open fullscreen lightbox slideshow"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>View Lightbox</span>
              </button>

              {/* View Layout Switcher */}
              <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5 border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                  }`}
                  title="Grid View"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                  }`}
                  title="List View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Insert Image Button */}
          <button
            type="button"
            onClick={() => onOpenInsertModal('url')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Image</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar (if 2+ images) */}
      {images.length > 2 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter note images by caption, filename, or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      )}

      {/* Main Gallery Display */}
      {images.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <Images className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              No embedded images in this note yet
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Add photos with your camera, paste image web links, or upload media files. All embedded images will automatically appear in this lightbox collection.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenInsertModal('camera')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-colors flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Snap Photo with Camera</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenInsertModal('url')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center gap-2"
            >
              <Link className="w-4 h-4" />
              <span>Paste Image URL</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenInsertModal('upload')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
            </button>
          </div>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
          No images matched "{searchQuery}"
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid / Masonry View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {filteredImages.map((img) => (
            <div
              key={`gallery-card-${img.id}-${img.url.slice(-10)}`}
              className="group relative rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs hover:shadow-md transition-all flex flex-col"
            >
              {/* Image Thumbnail Container */}
              <div
                className="relative aspect-4/3 w-full bg-stone-100 dark:bg-stone-950 overflow-hidden cursor-pointer flex items-center justify-center"
                onClick={() => onOpenLightbox(img.index)}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Hover overlay with Enlarge button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                  <span className="p-2.5 rounded-full bg-white/90 text-stone-900 hover:scale-110 transition-transform shadow-lg">
                    <Maximize2 className="w-4 h-4" />
                  </span>
                </div>

                {/* Source Badge */}
                <div className="absolute top-2 left-2 z-10">
                  {img.sourceType === 'camera' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950 shadow-xs">
                      <Camera className="w-3 h-3" /> Camera
                    </span>
                  ) : img.sourceType === 'attachment' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-900/80 text-stone-200 backdrop-blur-xs">
                      Attachment
                    </span>
                  ) : null}
                </div>

                {/* Index Pill */}
                <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-white backdrop-blur-xs">
                  #{img.index + 1}
                </div>
              </div>

              {/* Card Footer with Alt & Quick Actions */}
              <div className="p-3 bg-stone-50/70 dark:bg-stone-900/90 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate cursor-pointer hover:text-amber-600 dark:hover:text-amber-400"
                    onClick={() => onOpenLightbox(img.index)}
                    title={img.alt}
                  >
                    {img.alt || 'Untitled Image'}
                  </p>
                  <p className="text-[10px] text-stone-400 truncate font-mono">
                    {img.sourceType === 'camera' ? 'Embedded DataURL photo' : img.url}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Copy Markdown */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyMarkdown(img, e)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors"
                    title="Copy Markdown embed tag"
                  >
                    {copiedId === img.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Remove Image */}
                  {onRemoveImage && (
                    deleteConfirmId === img.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleRemove(img, e)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white"
                        >
                          Del
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] text-stone-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(img.id);
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Remove image from note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2 pb-4">
          {filteredImages.map((img) => (
            <div
              key={`gallery-list-${img.id}-${img.url.slice(-10)}`}
              onClick={() => onOpenLightbox(img.index)}
              className="group flex items-center gap-3 p-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/60 shadow-xs cursor-pointer transition-all"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-950 shrink-0 border border-stone-200 dark:border-stone-700">
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                    {img.alt || 'Untitled Image'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                    #{img.index + 1}
                  </span>
                  {img.sourceType === 'camera' && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Camera
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 font-mono truncate mt-0.5">
                  {img.url}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => handleCopyMarkdown(img, e)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Copy Markdown embed tag"
                >
                  {copiedId === img.id ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLightbox(img.index)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Open in Lightbox"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                {onRemoveImage && (
                  <button
                    type="button"
                    onClick={(e) => handleRemove(img, e)}
                    className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Remove from Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
