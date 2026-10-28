import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Link,
  Upload,
  X,
  FlipHorizontal,
  Check,
  ImageIcon,
  Sparkles,
  RefreshCw,
  Eye,
  AlertCircle,
  Copy,
} from 'lucide-react';

export interface ImageInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (markdownSnippet: string, imageInfo?: { name: string; dataUrl: string; size?: number }) => void;
  defaultTab?: 'camera' | 'url' | 'upload';
}

export const ImageInsertModal: React.FC<ImageInsertModalProps> = ({
  isOpen,
  onClose,
  onInsertImage,
  defaultTab = 'url',
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'url' | 'upload'>(defaultTab);

  // URL state
  const [imageUrl, setImageUrl] = useState('');
  const [urlCaption, setUrlCaption] = useState('');
  const [urlPreviewValid, setUrlPreviewValid] = useState<boolean | null>(null);

  // Upload state
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadSize, setUploadSize] = useState<number | undefined>();

  // Camera state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [cameraCaption, setCameraCaption] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileCameraInputRef = useRef<HTMLInputElement>(null);

  // Sync default tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setUrlPreviewValid(null);
      setCapturedPhotoUrl(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isOpen, defaultTab]);

  // Stop camera stream helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Start camera when camera tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !capturedPhotoUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, cameraFacing, capturedPhotoUrl]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('[Camera] Failed to open webcam:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. You can still take photos via device file capture below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can attach a photo via the device capture button.');
      } else {
        setCameraError('Unable to access camera directly in this iframe. Use the device camera snapshot below.');
      }
    }
  };

  // Snap photo from camera video stream
  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhotoUrl(dataUrl);
    setCameraCaption(`Camera Photo - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    stopCamera();
  };

  // Retake photo
  const handleRetakePhoto = () => {
    setCapturedPhotoUrl(null);
    startCamera();
  };

  // Mobile/Fallback camera input change
  const handleDeviceCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCapturedPhotoUrl(result);
        setCameraCaption(file.name.replace(/\.[^/.]+$/, '') || 'Device Photo');
      }
    };
    reader.readAsDataURL(file);
  };

  // Flip camera (user <-> environment)
  const handleFlipCamera = () => {
    setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Insert Camera Photo into markdown
  const handleConfirmCameraPhoto = () => {
    if (!capturedPhotoUrl) return;
    const alt = cameraCaption.trim() || 'Camera Photo';
    const snippet = `![${alt}](${capturedPhotoUrl})\n`;
    onInsertImage(snippet, {
      name: `${alt}.jpg`,
      dataUrl: capturedPhotoUrl,
    });
    onClose();
  };

  // Insert URL Image into markdown
  const handleConfirmUrlImage = () => {
    if (!imageUrl.trim()) return;
    const cleanUrl = imageUrl.trim();
    const alt = urlCaption.trim() || 'Image';
    const snippet = `![${alt}](${cleanUrl})\n`;
    onInsertImage(snippet);
    onClose();
  };

  // Handle local file selection on Upload tab
  const handleUploadFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setUploadedDataUrl(result);
        setUploadedName(file.name);
        setUploadSize(file.size);
        setUploadCaption(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  // Insert Uploaded Image into markdown
  const handleConfirmUploadImage = () => {
    if (!uploadedDataUrl) return;
    const alt = uploadCaption.trim() || uploadedName || 'Uploaded Photo';
    const snippet = `![${alt}](${uploadedDataUrl})\n`;
    onInsertImage(snippet, {
      name: uploadedName,
      dataUrl: uploadedDataUrl,
      size: uploadSize,
    });
    onClose();
  };

  // Paste from clipboard button for URL
  const handlePasteUrlFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setImageUrl(text.trim());
      }
    } catch {
      // Ignore clipboard permission rejection
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Insert Image or Camera Photo into Note"
      className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Insert Image in Note
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Markdown Embed
                </span>
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Embed image URLs, snap camera photos, or upload files directly into markdown body
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-100/40 dark:bg-stone-900/40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'camera'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'url'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Tab 1: Camera Photo Studio */}
        {activeTab === 'camera' && (
          <div className="p-5 space-y-4">
            {/* Hidden canvas for snapshotting */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden input for device camera fallback */}
            <input
              ref={fileCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleDeviceCameraCapture}
              className="hidden"
            />

            {!capturedPhotoUrl ? (
              /* Live Camera Viewfinder */
              <div className="space-y-3">
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-stone-200 dark:border-stone-800 shadow-inner">
                  {cameraStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : cameraError ? (
                    <div className="p-5 text-center space-y-2 text-stone-300">
                      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-xs">{cameraError}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-stone-400">
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                      <span className="text-xs">Initializing camera viewfinder...</span>
                    </div>
                  )}

                  {/* Camera Controls Overlay */}
                  {cameraStream && (
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleFlipCamera}
                        className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
                        title="Flip camera (front / rear)"
                      >
                        <FlipHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Shutter / Capture Actions */}
                <div className="flex items-center justify-center gap-3">
                  {cameraStream ? (
                    <button
                      type="button"
                      id="btn-snap-camera-photo"
                      onClick={handleSnapPhoto}
                      className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => fileCameraInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-700"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-500" />
                    <span>Take with Device Camera</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Photo Snapshot Preview */
              <div className="space-y-3">
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-center">
                  <img
                    src={capturedPhotoUrl}
                    alt="Captured photo preview"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-md text-[10px] font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" /> Photo Captured
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Photo Caption / Alt Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={cameraCaption}
                    onChange={(e) => setCameraCaption(e.target.value)}
                    placeholder="e.g. Whiteboard diagram, Book page..."
                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>

                  <button
                    type="button"
                    id="btn-insert-camera-photo"
                    onClick={handleConfirmCameraPhoto}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Insert Photo into Note</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Image URL */}
        {activeTab === 'url' && (
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Image Web URL
                </label>
                <button
                  type="button"
                  onClick={handlePasteUrlFromClipboard}
                  className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Paste from Clipboard
                </button>
              </div>

              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setUrlPreviewValid(null);
                }}
                placeholder="https://images.unsplash.com/... or any web image URL"
                autoFocus
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Alt Description / Caption (Optional)
              </label>
              <input
                type="text"
                value={urlCaption}
                onChange={(e) => setUrlCaption(e.target.value)}
                placeholder="Brief description of the image"
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Visual Image Preview */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Visual Preview
              </span>

              {imageUrl.trim() ? (
                <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-center p-2">
                  <img
                    src={imageUrl.trim()}
                    alt={urlCaption || 'URL preview'}
                    onLoad={() => setUrlPreviewValid(true)}
                    onError={() => setUrlPreviewValid(false)}
                    className="max-h-full max-w-full rounded-xl object-contain shadow-xs"
                  />
                  {urlPreviewValid === false && (
                    <div className="absolute inset-0 bg-stone-100/90 dark:bg-stone-900/90 flex flex-col items-center justify-center p-4 text-center text-xs text-rose-500 space-y-1">
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                      <span>Could not load image from this URL. Check link or CORS permissions.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-28 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 flex flex-col items-center justify-center text-xs text-stone-400 gap-1.5">
                  <ImageIcon className="w-5 h-5 opacity-50" />
                  <span>Enter or paste an image URL above to see live preview</span>
                </div>
              )}
            </div>

            {/* Insert Button */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-insert-url-image"
                onClick={handleConfirmUrlImage}
                disabled={!imageUrl.trim()}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Insert Image into Note</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Upload Local File */}
        {activeTab === 'upload' && (
          <div className="p-5 space-y-4">
            {!uploadedDataUrl ? (
              <label className="h-44 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 cursor-pointer flex flex-col items-center justify-center p-6 text-center space-y-2 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFileChange(file);
                  }}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Click to browse or drop an image file
                  </p>
                  <p className="text-[11px] text-stone-400">
                    PNG, JPG, GIF, WebP, SVG supported
                  </p>
                </div>
              </label>
            ) : (
              <div className="space-y-3">
                <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-center p-2">
                  <img
                    src={uploadedDataUrl}
                    alt={uploadedName}
                    className="max-h-full max-w-full rounded-xl object-contain shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Image Caption / Alt Text
                  </label>
                  <input
                    type="text"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    placeholder="Caption for this image"
                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setUploadedDataUrl(null)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium text-xs transition-colors"
                  >
                    Choose Different File
                  </button>

                  <button
                    type="button"
                    id="btn-insert-upload-image"
                    onClick={handleConfirmUploadImage}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Insert Image into Note</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
