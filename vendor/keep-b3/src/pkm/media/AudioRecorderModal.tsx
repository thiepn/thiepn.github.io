import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  Volume2,
  Lock,
  FileAudio,
} from 'lucide-react';
import { audioRecorderService } from './audioRecorderService';
import {
  AudioRecordingState,
  AudioRecordingResult,
  CanonicalAttachment,
} from './mediaTypes';
import { mediaService } from './mediaService';

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNoteId?: string;
  onInsertSnippet?: (markdownSnippet: string) => void;
  onSavedAttachment?: (attachment: CanonicalAttachment) => void;
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({
  isOpen,
  onClose,
  activeNoteId,
  onInsertSnippet,
  onSavedAttachment,
}) => {
  const [state, setState] = useState<AudioRecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Subscribe to recorder events
  useEffect(() => {
    if (!isOpen) return;

    const unsub = audioRecorderService.subscribe({
      onStateChange: (nextState) => {
        setState(nextState);
        if (nextState === 'preview') {
          const blob = audioRecorderService.getPreviewBlob();
          setPreviewBlob(blob);
          setPreviewDuration(audioRecorderService.getPreviewDuration());
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          }
        }
      },
      onTimeUpdate: (ms) => setElapsedMs(ms),
      onVolumeUpdate: (vol) => setVolumeLevel(vol),
      onError: (err) => setErrorMessage(err),
    });

    return () => {
      unsub();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, previewUrl]);

  // Clean up on close
  const handleClose = () => {
    if (state === 'recording' || state === 'paused') {
      audioRecorderService.cancelRecording();
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setState('idle');
    setElapsedMs(0);
    setVolumeLevel(0);
    setErrorMessage(null);
    setCustomTitle('');
    setPreviewBlob(null);
    onClose();
  };

  const handleStart = async () => {
    setErrorMessage(null);
    await audioRecorderService.startRecording();
  };

  const handlePause = () => {
    audioRecorderService.pauseRecording();
  };

  const handleResume = () => {
    audioRecorderService.resumeRecording();
  };

  const handleStop = () => {
    audioRecorderService.stopRecording();
  };

  const handleDiscard = () => {
    audioRecorderService.cancelRecording();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setState('idle');
    setElapsedMs(0);
  };

  const handleSaveAndInsert = async () => {
    setIsSaving(true);
    try {
      const result: AudioRecordingResult = await audioRecorderService.saveRecording(
        customTitle,
        activeNoteId
      );

      const snippet = `![[audio:${result.attachmentId}|${result.filename}]]`;

      if (onInsertSnippet) {
        onInsertSnippet(snippet);
      }

      if (onSavedAttachment) {
        const fullMeta = await mediaService.getAttachment(result.attachmentId);
        if (fullMeta) onSavedAttachment(fullMeta);
      }

      handleClose();
    } catch (err: any) {
      console.error('Failed to save audio recording:', err);
      setErrorMessage(err.message || 'Failed to save audio recording.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewPlayPause = () => {
    if (!previewAudioRef.current) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => setIsPreviewPlaying(true))
        .catch((e) => console.error('Audio preview play error:', e));
    }
  };

  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
  };

  const formatSecs = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-recorder-title"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 id="audio-recorder-title" className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Record Audio Note
              </h2>
              <p className="text-[11px] text-stone-700 dark:text-stone-300">
                Offline browser-native recording with encryption
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close recorder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center justify-center space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Microphone Notice</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Idle / Requesting View */}
          {(state === 'idle' || state === 'requesting') && (
            <div className="flex flex-col items-center text-center space-y-4 py-3">
              <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {state === 'requesting' ? 'Requesting Microphone Access...' : 'Ready to Record'}
                </p>
                <p className="text-xs text-stone-700 dark:text-stone-300 max-w-xs mt-1">
                  Audio is encoded locally in high-fidelity Opus/WebM and stored safely in your encrypted vault.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStart}
                disabled={state === 'requesting'}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Start Recording</span>
              </button>
            </div>
          )}

          {/* Active Recording / Paused View */}
          {(state === 'recording' || state === 'paused') && (
            <div className="w-full flex flex-col items-center space-y-5 py-2">
              {/* Pulsing Status & Timer */}
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    state === 'recording' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  {state === 'recording' ? 'Recording' : 'Paused'}
                </span>
              </div>

              <div className="font-mono text-3xl font-extrabold text-stone-950 dark:text-white tracking-tight">
                {formatTimer(elapsedMs)}
              </div>

              {/* Dynamic Audio Level Visualizer */}
              <div className="w-full h-8 flex items-center justify-center gap-1.5 px-4 bg-stone-100 dark:bg-stone-800/60 rounded-xl">
                {Array.from({ length: 16 }).map((_, i) => {
                  const factor = Math.sin((i / 16) * Math.PI);
                  const barHeight =
                    state === 'recording'
                      ? Math.max(4, Math.round(volumeLevel * factor * 28 + Math.random() * 4))
                      : 4;
                  return (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-75"
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {state === 'recording' ? (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStop}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Finish Recording</span>
                </button>

                <button
                  type="button"
                  onClick={handleDiscard}
                  className="px-3 py-2 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition-colors cursor-pointer"
                  title="Discard recording"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Preview / Finalize View */}
          {state === 'preview' && (
            <div className="w-full flex flex-col space-y-4 py-1">
              {previewUrl && (
                <audio
                  ref={previewAudioRef}
                  src={previewUrl}
                  onTimeUpdate={() => {
                    if (previewAudioRef.current) {
                      setPreviewCurrentTime(previewAudioRef.current.currentTime);
                    }
                  }}
                  onEnded={() => {
                    setIsPreviewPlaying(false);
                    setPreviewCurrentTime(0);
                  }}
                />
              )}

              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-stone-700 dark:text-stone-300">
                  <span className="flex items-center gap-1.5">
                    <FileAudio className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Recorded Memo Preview</span>
                  </span>
                  <span className="font-mono">{formatSecs(previewDuration)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePreviewPlayPause}
                    className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                  >
                    {isPreviewPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={previewDuration || 1}
                    step={0.1}
                    value={previewCurrentTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      setPreviewCurrentTime(t);
                      if (previewAudioRef.current) {
                        previewAudioRef.current.currentTime = t;
                      }
                    }}
                    className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    aria-label="Preview scrubber"
                  />

                  <span className="font-mono text-[11px] text-stone-700 dark:text-stone-300 shrink-0 w-8 text-right">
                    {formatSecs(previewCurrentTime)}
                  </span>
                </div>
              </div>

              {/* Title field */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Memo Title / Filename (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Brainstorming Session Note"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isSaving}
                  className="px-3 py-2 text-xs text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
                >
                  Discard
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAndInsert}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{activeNoteId ? 'Save & Insert into Note' : 'Save to Media'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saving state */}
          {state === 'saving' && (
            <div className="flex flex-col items-center py-6 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Encrypting and saving audio memo to vault...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
