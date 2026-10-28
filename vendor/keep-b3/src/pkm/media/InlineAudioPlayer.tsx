import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  ExternalLink,
  Music,
  Download,
} from 'lucide-react';
import { mediaService, formatByteSize } from './mediaService';
import { vaultEncryptionService } from '../encryption';

interface InlineAudioPlayerProps {
  src?: string; // objectUrl, dataUrl, or attachmentId
  attachmentId?: string;
  filename?: string;
  duration?: number; // known duration in seconds
  size?: number; // size in bytes
  onOpenInMediaLibrary?: (attachmentId: string) => void;
  className?: string;
}

export const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({
  src,
  attachmentId,
  filename = 'Audio Memo',
  duration: initialDuration,
  size,
  onOpenInMediaLibrary,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve source URL from attachmentId or src
  useEffect(() => {
    let isCancelled = false;

    async function loadAudioSource() {
      setIsLoading(true);
      setError(null);

      try {
        if (attachmentId) {
          const objectUrl = await mediaService.getAttachmentObjectUrl(attachmentId);
          if (!isCancelled) {
            if (objectUrl) {
              setResolvedSrc(objectUrl);
            } else {
              // Try fallback direct attachment
              const meta = await mediaService.getAttachment(attachmentId);
              if (meta?.dataUrl) {
                setResolvedSrc(meta.dataUrl);
              } else {
                setError('Audio attachment not found.');
              }
            }
          }
        } else if (src) {
          if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http')) {
            if (!isCancelled) setResolvedSrc(src);
          } else {
            // Might be an attachment ID passed via src
            const objectUrl = await mediaService.getAttachmentObjectUrl(src);
            if (!isCancelled) {
              setResolvedSrc(objectUrl || src);
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to resolve audio source:', err);
          setError('Could not load audio.');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadAudioSource();

    // Pause on lock
    const unsub = vaultEncryptionService.subscribeLockStateChange((status) => {
      if (status === 'locked' && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    return () => {
      isCancelled = true;
      unsub();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [src, attachmentId]);

  const handlePlayPause = () => {
    if (!audioRef.current || !resolvedSrc) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error('Audio play failed:', err);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
    setIsLoading(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(e.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`my-2 p-3 rounded-xl border border-stone-300 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 shadow-2xs text-stone-900 dark:text-stone-100 ${className}`}
    >
      {resolvedSrc && (
        <audio
          ref={audioRef}
          src={resolvedSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => setError('Failed to play audio file.')}
        />
      )}

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/70 border border-amber-300/50 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate text-stone-900 dark:text-stone-100" title={filename}>
              {filename}
            </p>
            <p className="text-[10px] text-stone-700 dark:text-stone-300">
              {formatTime(duration)}
              {size ? ` • ${formatByteSize(size)}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {attachmentId && onOpenInMediaLibrary && (
            <button
              type="button"
              onClick={() => onOpenInMediaLibrary(attachmentId)}
              className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-md transition-colors cursor-pointer"
              title="Open in Media Library"
              aria-label="Open in Media Library"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          {resolvedSrc && (
            <a
              href={resolvedSrc}
              download={filename}
              className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-md transition-colors cursor-pointer"
              title="Download audio file"
              aria-label="Download audio file"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {error ? (
        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={isLoading || !resolvedSrc}
            className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            disabled={isLoading || !resolvedSrc}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md transition-colors cursor-pointer shrink-0"
            title="Restart from beginning"
            aria-label="Restart audio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] text-stone-700 dark:text-stone-300 shrink-0 w-8 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={isLoading || !resolvedSrc}
              className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600 dark:accent-amber-500"
              aria-label="Audio scrubber"
            />
            <span className="font-mono text-[11px] text-stone-700 dark:text-stone-300 shrink-0 w-8">
              {formatTime(duration)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md transition-colors cursor-pointer shrink-0"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};
