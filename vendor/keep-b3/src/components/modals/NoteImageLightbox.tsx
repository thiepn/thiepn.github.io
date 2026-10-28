import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Trash2,
  Camera,
  ImageIcon,
  Sparkles,
  Info,
} from 'lucide-react';
import { NoteEmbeddedImage, formatBytes, isDataUrl } from '../../pkm/images/noteImages';

export interface NoteImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: NoteEmbeddedImage[];
  initialIndex?: number;
  onRemoveImage?: (image: NoteEmbeddedImage) => void;
  noteTitle?: string;
}

export const NoteImageLightbox: React.FC<NoteImageLightboxProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  onRemoveImage,
  noteTitle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [copiedType, setCopiedType] = useState<'url' | 'markdown' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
      setCurrentIndex(validIndex);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialIndex, images.length]);

  // Reset zoom & pan when navigating to another image
  useEffect(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setImgDimensions(null);
    setShowDeleteConfirm(false);

    // Scroll active thumbnail into view in filmstrip
    if (filmstripRef.current) {
      const activeThumb = filmstripRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  const currentImage: NoteEmbeddedImage | undefined = images[currentIndex];

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(4, +(z + 0.5).toFixed(1)));
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => {
      const next = Math.max(0.5, +(z - 0.5).toFixed(1));
      if (next <= 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleCopy = async (type: 'url' | 'markdown') => {
    if (!currentImage) return;
    const textToCopy =
      type === 'markdown'
        ? currentImage.fullTag || `![${currentImage.alt}](${currentImage.url})`
        : currentImage.url;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const a = document.createElement('a');
    a.href = currentImage.url;
    const extension = isDataUrl(currentImage.url) ? 'jpg' : currentImage.url.split('.').pop()?.split('?')[0] || 'jpg';
    a.download = `${(currentImage.alt || 'note-image').replace(/[^a-z0-9_-]/gi, '_')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleResetZoom();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || images.length === 0 || !currentImage) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Note Image Lightbox Collection"
      className="fixed inset-0 z-70 bg-black/92 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 shrink-0">
        {/* Left: Info & Note Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-800/90 text-stone-200 border border-stone-700/60 shadow-xs">
              {currentIndex + 1} / {images.length}
            </span>
            {currentImage.sourceType === 'camera' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Camera className="w-3 h-3" /> Camera Photo
              </span>
            )}
          </div>
          <div className="truncate">
            <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {currentImage.alt || 'Embedded Note Image'}
            </h3>
            {noteTitle && (
              <p className="text-[11px] text-stone-400 truncate">
                From: {noteTitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-0.5 bg-stone-900/80 rounded-xl p-1 border border-stone-800">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-40 transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-lg text-xs font-mono text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
              title="Reset Zoom (0)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-40 transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Copy Markdown */}
          <button
            type="button"
            onClick={() => handleCopy('markdown')}
            className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors relative"
            title="Copy Markdown Tag (![alt](url))"
            aria-label="Copy Markdown tag"
          >
            {copiedType === 'markdown' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors"
            title="Download Image"
            aria-label="Download image"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Metadata Toggle */}
          <button
            type="button"
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-xl transition-colors ${
              showMetadata
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
            }`}
            title="Image Details"
            aria-label="Image details"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Delete / Remove image from note */}
          {onRemoveImage && (
            <div className="relative">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-xl text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Remove Image from Note"
                  aria-label="Remove image from note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-stone-900 border border-rose-800/80 rounded-xl p-1 shadow-xl animate-in fade-in">
                  <span className="text-[11px] text-rose-300 font-medium px-1.5">Remove?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveImage(currentImage);
                      setShowDeleteConfirm(false);
                      if (images.length <= 1) {
                        onClose();
                      } else {
                        setCurrentIndex((prev) => Math.min(prev, images.length - 2));
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-0.5 rounded-lg text-xs text-stone-400 hover:text-white hover:bg-stone-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/90 transition-colors ml-1"
            title="Close Lightbox (Esc)"
            aria-label="Close Lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-default"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* Navigation Arrow: Left */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-stone-200 hover:text-white border border-stone-800 hover:border-stone-700 shadow-2xl backdrop-blur-md transition-all hover:scale-105"
            title="Previous Image (←)"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* The Displayed Image */}
        <div
          className={`max-w-full max-h-full flex items-center justify-center transition-transform ${
            isDragging ? 'cursor-grabbing duration-0' : zoomLevel > 1 ? 'cursor-grab duration-150' : 'duration-200'
          }`}
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
          }}
        >
          <img
            key={currentImage.url}
            src={currentImage.url}
            alt={currentImage.alt || 'Note Image'}
            className="max-h-[70vh] sm:max-h-[76vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl pointer-events-auto"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }}
          />
        </div>

        {/* Navigation Arrow: Right */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-6 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-stone-200 hover:text-white border border-stone-800 hover:border-stone-700 shadow-2xl backdrop-blur-md transition-all hover:scale-105"
            title="Next Image (→)"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Metadata Inspector Card */}
        {showMetadata && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-stone-900/95 border border-stone-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs text-stone-300 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400" /> Image Details
              </span>
              <button
                type="button"
                onClick={() => setShowMetadata(false)}
                className="text-stone-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Alt / Caption</span>
              <span className="font-medium text-stone-100">{currentImage.alt || '(No alt caption specified)'}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Source Type</span>
              <span className="capitalize font-medium text-stone-200">
                {currentImage.sourceType === 'camera'
                  ? 'Live Camera Capture'
                  : currentImage.sourceType === 'markdown'
                  ? 'Markdown Link Embed'
                  : currentImage.sourceType === 'attachment'
                  ? 'Vault Attachment'
                  : 'HTML Image Tag'}
              </span>
            </div>
            {imgDimensions && (
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Resolution</span>
                <span className="font-mono text-stone-200">
                  {imgDimensions.width} × {imgDimensions.height} px
                </span>
              </div>
            )}
            {currentImage.byteSize && (
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">File Size</span>
                <span className="font-mono text-stone-200">{formatBytes(currentImage.byteSize)}</span>
              </div>
            )}
            <div className="pt-1">
              <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Source URL</span>
              <div className="bg-stone-950 p-2 rounded-xl font-mono text-[11px] text-stone-400 break-all max-h-20 overflow-y-auto border border-stone-800 select-all">
                {currentImage.url}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Filmstrip Ribbon & Caption */}
      <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-3 pb-4 px-4 sm:px-6 z-10 shrink-0 space-y-2.5">
        {/* Caption Display */}
        {currentImage.alt && (
          <div className="text-center text-xs font-medium text-stone-300 max-w-xl mx-auto truncate">
            {currentImage.alt}
          </div>
        )}

        {/* Thumbnail Filmstrip Carousel */}
        {images.length > 1 && (
          <div
            ref={filmstripRef}
            className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-4xl mx-auto scrollbar-thin scrollbar-thumb-stone-700"
          >
            {images.map((img, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={`lightbox-strip-${img.id || idx}-${img.url.slice(-10)}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                    isActive
                      ? 'border-amber-400 scale-110 shadow-lg shadow-amber-500/20 z-10'
                      : 'border-stone-800 hover:border-stone-600 opacity-60 hover:opacity-100'
                  }`}
                  title={img.alt || `Image ${idx + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {img.sourceType === 'camera' && (
                    <div className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-amber-300">
                      <Camera className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
