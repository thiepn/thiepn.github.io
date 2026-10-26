import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Trash2,
  Volume2,
  VolumeX,
  AlertCircle,
  Download,
  Edit2,
  Check,
  X,
  Radio,
  FileAudio,
  Sparkles,
} from 'lucide-react';
import { NoteAudio } from '../types';

export interface AudioRecorderProps {
  audios: NoteAudio[];
  onAddAudio: (audio: NoteAudio) => void;
  onRemoveAudio: (id: string) => void;
  onUpdateAudio?: (audio: NoteAudio) => void;
  onAppendSpeechTranscript?: (text: string) => void;
  readOnly?: boolean;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  className?: string;
}

// Deterministically generate a pseudo-waveform profile for an audio memo if not available
function generateWaveformBars(seed: string, count: number = 36): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const pseudo = Math.abs(Math.sin((hash + i * 13) * 0.17));
    // Range between 0.18 and 1.0 for aesthetic waveform
    bars.push(Math.max(0.18, Math.min(1.0, 0.2 + pseudo * 0.8)));
  }
  return bars;
}

// Format seconds into MM:SS
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Format milliseconds into MM:SS.t
function formatTimerMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  audios = [],
  onAddAudio,
  onRemoveAudio,
  onUpdateAudio,
  onAppendSpeechTranscript,
  readOnly = false,
  isOpen: externalIsOpen,
  onToggleOpen: externalOnToggleOpen,
  className = '',
}) => {
  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [isDictating, setIsDictating] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [liveVolume, setLiveVolume] = useState(0); // 0 to 100%

  // Local open state for the recorder tray
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const toggleOpen = () => {
    if (externalOnToggleOpen) {
      externalOnToggleOpen();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  // Web Audio & MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeOffsetRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);

  // Dictation ref
  const recognitionRef = useRef<any>(null);

  // --- Real-time Canvas Waveform Drawing Loop ---
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const analyser = analyserRef.current;
    const barCount = 36;
    const gap = 3;
    const barWidth = Math.max(3, (width - (barCount - 1) * gap) / barCount);

    let dataArray = new Uint8Array(32);
    let avgVolume = 0;

    if (analyser && isRecording && !isPaused) {
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      avgVolume = Math.min(100, Math.round((sum / dataArray.length / 255) * 100 * 1.5));
      setLiveVolume(avgVolume);
    } else {
      setLiveVolume(0);
    }

    for (let i = 0; i < barCount; i++) {
      let normValue = 0.08;

      if (isRecording && !isPaused && analyser) {
        const binIndex = Math.min(
          dataArray.length - 1,
          Math.floor((i / barCount) * (dataArray.length * 0.7))
        );
        normValue = dataArray[binIndex] / 255;
      } else if (isPaused) {
        normValue = 0.2 + 0.12 * Math.sin(i * 0.4);
      }

      const minH = 4;
      const barH = Math.max(minH, normValue * (height - 8));
      const x = i * (barWidth + gap);
      const y = (height - barH) / 2;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      if (isRecording && !isPaused) {
        grad.addColorStop(0, '#f59e0b'); // amber-500
        grad.addColorStop(0.5, '#ef4444'); // red-500
        grad.addColorStop(1, '#f59e0b');
      } else if (isPaused) {
        grad.addColorStop(0, '#d97706'); // amber-600
        grad.addColorStop(1, '#b45309'); // amber-700
      } else {
        grad.addColorStop(0, '#78716c');
        grad.addColorStop(1, '#a8a29e');
      }

      ctx.fillStyle = grad;
      const radius = Math.min(barWidth / 2, barH / 2);
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, radius);
      ctx.fill();
    }

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [isRecording, isPaused]);

  // Trigger animation loop whenever recording state changes
  useEffect(() => {
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setLiveVolume(0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRecording, drawWaveform]);

  // Clean up all audio contexts and media streams on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // --- Voice Dictation (Speech to Text) ---
  const toggleDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsDictating(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setAudioError('Speech recognition is not supported in this browser.');
      setTimeout(() => setAudioError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript.trim() && onAppendSpeechTranscript) {
          onAppendSpeechTranscript(transcript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition notice:', e);
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsDictating(true);
    } catch (err: any) {
      setAudioError('Could not start speech recognition.');
      setTimeout(() => setAudioError(null), 4000);
      setIsDictating(false);
    }
  };

  // --- Start Recording Voice Memo with Web Audio Visualizer ---
  const startRecordingMemo = async () => {
    try {
      setAudioError(null);

      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Setup Web Audio API Analyser for real-time waveform
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyserRef.current = analyser;
        }
      } catch (audioCtxErr) {
        console.warn('Web Audio visualization setup skipped:', audioCtxErr);
      }

      // 3. Setup MediaRecorder
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Blob construction & Base64 encoding
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const finalDurationSecs = Math.max(1, Math.round(recordMs / 1000));
          const dateStr = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          onAddAudio({
            id: `audio-${Date.now()}`,
            name: `Voice Memo (${dateStr})`,
            dataUrl: base64Audio,
            duration: finalDurationSecs,
            createdAt: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(audioBlob);

        // Clean up media tracks & audio context
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        analyserRef.current = null;
      };

      recorder.start(200); // 200ms slice
      setIsRecording(true);
      setIsPaused(false);
      setRecordMs(0);
      pausedTimeOffsetRef.current = 0;
      startTimeRef.current = Date.now();

      // Start precision timer
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedTimeOffsetRef.current;
        setRecordMs(elapsed);
      }, 100);
    } catch (err: any) {
      console.error('Audio recorder error:', err);
      let msg = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone permission was denied. Please allow microphone access.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No microphone device was detected on your system.';
      }
      setAudioError(msg);
      setTimeout(() => setAudioError(null), 5000);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // --- Pause / Resume Recording ---
  const togglePauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (!isPaused && recorder.state === 'recording') {
      recorder.pause();
      pauseStartRef.current = Date.now();
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    } else if (isPaused && recorder.state === 'paused') {
      recorder.resume();
      pausedTimeOffsetRef.current += Date.now() - pauseStartRef.current;
      setIsPaused(false);

      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedTimeOffsetRef.current;
        setRecordMs(elapsed);
      }, 100);
    }
  };

  // --- Stop and Save Voice Memo ---
  const stopRecordingMemo = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // --- Discard Current Recording ---
  const discardRecordingMemo = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setRecordMs(0);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Audio Error Alert */}
      {audioError && (
        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* Primary Toolbar when NOT actively recording */}
      {!readOnly && !isRecording && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Quick Record Button */}
          <button
            type="button"
            onClick={startRecordingMemo}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer active:scale-95"
            title="Start voice memo recording"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record Voice Memo</span>
          </button>

          {/* Speech Dictation Button */}
          <button
            type="button"
            onClick={toggleDictation}
            className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 font-medium cursor-pointer ${
              isDictating
                ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 animate-pulse'
                : 'bg-stone-100 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700'
            }`}
            title="Toggle speech-to-text dictation into note"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isDictating ? 'Dictating...' : 'Speech Dictation'}</span>
          </button>

          {audios.length > 0 && (
            <span className="text-[11px] text-stone-400 dark:text-stone-500 ml-1">
              ({audios.length} {audios.length === 1 ? 'memo' : 'memos'})
            </span>
          )}
        </div>
      )}

      {/* Dictating Live Status Bar */}
      {!readOnly && isDictating && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
            <Mic className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-bounce" />
            <span>Listening... speak clearly into your microphone</span>
          </div>
          <button
            type="button"
            onClick={toggleDictation}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer"
          >
            Done Dictating
          </button>
        </div>
      )}

      {/* Active Voice Memo Recording Tray with Web Audio Waveform Visualizer */}
      {!readOnly && isRecording && (
        <div className="p-3.5 rounded-2xl bg-stone-900 dark:bg-stone-950 text-white border border-stone-700 dark:border-stone-800 shadow-lg space-y-3 animate-in fade-in zoom-in-98 duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isPaused ? 'bg-amber-400' : 'bg-red-500 animate-ping'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                {isPaused ? 'Recording Paused' : 'Recording Voice Memo'}
              </span>
            </div>

            {/* Live Timer & VU Meter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-700 text-[11px] text-stone-300">
                <Volume2 className="w-3 h-3 text-amber-400" />
                <span className="font-mono">{liveVolume}%</span>
              </div>
              <div className="font-mono text-sm font-extrabold text-amber-400">
                {formatTimerMs(recordMs)}
              </div>
            </div>
          </div>

          {/* Real-time Web Audio Waveform Canvas */}
          <div className="w-full h-14 bg-stone-950/80 rounded-xl border border-stone-800 flex items-center justify-center p-2 relative overflow-hidden">
            <canvas
              ref={canvasRef}
              width={420}
              height={50}
              className="w-full h-full object-contain"
            />
            {isPaused && (
              <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-2xs flex items-center justify-center text-xs font-semibold text-amber-400 gap-1.5">
                <Pause className="w-3.5 h-3.5" /> Paused
              </div>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={togglePauseRecording}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title={isPaused ? 'Resume recording' : 'Pause recording'}
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={discardRecordingMemo}
                className="px-2.5 py-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-red-400 text-xs font-medium transition-colors cursor-pointer"
                title="Discard this recording"
              >
                Discard
              </button>
            </div>

            <button
              type="button"
              onClick={stopRecordingMemo}
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop & Attach</span>
            </button>
          </div>
        </div>
      )}

      {/* Audio Memos List with Interactive Waveform Players */}
      {audios && audios.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              Attached Voice Memos ({audios.length})
            </span>
          </div>

          <div className="space-y-2">
            {audios.map((audio) => (
              <AudioClipWaveformPlayer
                key={audio.id}
                audio={audio}
                readOnly={readOnly}
                onRemove={() => onRemoveAudio(audio.id)}
                onUpdate={onUpdateAudio}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Rich Interactive Waveform Player for Attached Audio Clips ---
interface AudioClipWaveformPlayerProps {
  audio: NoteAudio;
  readOnly?: boolean;
  onRemove: () => void;
  onUpdate?: (updated: NoteAudio) => void;
}

const AudioClipWaveformPlayer: React.FC<AudioClipWaveformPlayerProps> = ({
  audio,
  readOnly,
  onRemove,
  onUpdate,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audio.duration || 0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(audio.name);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  // Pre-generate deterministic waveform amplitude bars for this audio memo
  const waveformBars = useMemo(() => {
    return generateWaveformBars(audio.id + (audio.name || ''), 32);
  }, [audio.id, audio.name]);

  // Audio element setup
  useEffect(() => {
    const sound = new Audio(audio.dataUrl);
    audioRef.current = sound;

    const handleLoadedMetadata = () => {
      if (sound.duration && !isNaN(sound.duration) && sound.duration !== Infinity) {
        setDuration(sound.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(sound.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    sound.addEventListener('loadedmetadata', handleLoadedMetadata);
    sound.addEventListener('timeupdate', handleTimeUpdate);
    sound.addEventListener('ended', handleEnded);

    return () => {
      sound.pause();
      sound.removeEventListener('loadedmetadata', handleLoadedMetadata);
      sound.removeEventListener('timeupdate', handleTimeUpdate);
      sound.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audio.dataUrl]);

  const togglePlay = () => {
    const sound = audioRef.current;
    if (!sound) return;

    if (isPlaying) {
      sound.pause();
      setIsPlaying(false);
    } else {
      sound.playbackRate = playbackRate;
      sound
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('Audio play failed:', e);
          setIsPlaying(false);
        });
    }
  };

  const cycleSpeed = () => {
    const rates: (1 | 1.25 | 1.5 | 2)[] = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Seek by clicking or dragging on the waveform
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = waveformContainerRef.current?.getBoundingClientRect();
    if (!rect || !audioRef.current) return;

    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * (duration || 1);

    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSaveTitle = () => {
    if (titleDraft.trim() && titleDraft !== audio.name && onUpdate) {
      onUpdate({
        ...audio,
        name: titleDraft.trim(),
      });
    }
    setIsEditingTitle(false);
  };

  const progressFraction = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700/80 shadow-2xs transition-all flex flex-col gap-2">
      {/* Top Row: Title, Speed & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <FileAudio className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleDraft(audio.name);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="w-full text-xs font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-stone-900 border border-amber-400 dark:border-amber-600 text-stone-900 dark:text-stone-100 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-emerald-600 hover:text-emerald-700"
                title="Save name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(audio.name);
                  setIsEditingTitle(false);
                }}
                className="p-1 text-stone-400 hover:text-stone-600"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group/title min-w-0">
              <span
                onClick={() => !readOnly && setIsEditingTitle(true)}
                className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                title={readOnly ? audio.name : 'Click to rename voice memo'}
              >
                {audio.name}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover/title:opacity-100 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-opacity"
                  title="Rename voice memo"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700/80 hover:bg-stone-300 dark:hover:bg-stone-600 text-[10px] font-mono font-bold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            title="Cycle playback speed"
          >
            {playbackRate}x
          </button>

          {/* Download */}
          <a
            href={audio.dataUrl}
            download={`${audio.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'memo'}.webm`}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md transition-colors"
            title="Download audio memo"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          {/* Delete */}
          {!readOnly && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-stone-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
              title="Delete audio memo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Play/Pause button + Interactive Waveform Visualizer Scrub Bar */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs transition-all active:scale-95 cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play voice memo'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Interactive Scrubbable Waveform */}
        <div
          ref={waveformContainerRef}
          onClick={handleWaveformClick}
          className="flex-1 h-8 flex items-center gap-0.5 cursor-pointer px-1 py-1 rounded-lg bg-stone-200/60 dark:bg-stone-900/60 hover:bg-stone-200 dark:hover:bg-stone-900 transition-colors group/wf relative"
          title="Click to seek"
        >
          {waveformBars.map((barFactor, i) => {
            const barFraction = (i + 0.5) / waveformBars.length;
            const isPlayed = barFraction <= progressFraction;
            const barHeightPx = Math.max(4, Math.round(barFactor * 24));

            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-75 ${
                  isPlayed
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : 'bg-stone-300 dark:bg-stone-700 group-hover/wf:bg-stone-400/80 dark:group-hover/wf:bg-stone-600'
                }`}
                style={{ height: `${barHeightPx}px` }}
              />
            );
          })}
        </div>

        {/* Time Stamp Display */}
        <div className="font-mono text-[11px] text-stone-500 dark:text-stone-400 shrink-0 select-none">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};
