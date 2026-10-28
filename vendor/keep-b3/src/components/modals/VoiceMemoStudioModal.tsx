import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Bookmark,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Sparkles,
  Calendar,
  Clock,
  Tag,
  BookOpen,
  FileText,
  Radio,
  Sliders,
  Download,
  Share2,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  VoiceMemo,
  AudioBookmark,
  VOICE_MEMO_STORAGE_KEY,
  formatAudioSeconds,
  generateVoiceNoteMarkdown,
  VoiceMemoCategory,
} from '../../pkm/audio/voiceStudioTypes';
import { fireConfetti } from '../../utils/confetti';
import { soundscapeService } from '../../utils/soundscapes';

export interface VoiceMemoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onCreateVoiceNote: (title: string, content: string, tags?: string[]) => Promise<void> | void;
  onAppendToDailyNote?: (content: string) => Promise<void> | void;
}

export const VoiceMemoStudioModal: React.FC<VoiceMemoStudioModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  onCreateVoiceNote,
  onAppendToDailyNote,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'record' | 'library'>('record');

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [bookmarks, setBookmarks] = useState<AudioBookmark[]>([]);
  const [memoTitle, setMemoTitle] = useState<string>('Voice Reflection');
  const [category, setCategory] = useState<VoiceMemoCategory>('idea');

  // Media & Web Audio references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Playback State (for finished recording)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Library of saved memos
  const [savedMemos, setSavedMemos] = useState<VoiceMemo[]>(() => {
    try {
      const raw = localStorage.getItem(VOICE_MEMO_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'memo-seed-1',
        title: 'Morning Architecture Brainstorm',
        durationSeconds: 42,
        recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        transcript:
          'Consider structuring our local-first offline storage around immutable events. This makes incremental backups completely deterministic and simplifies CRDT syncing.',
        bookmarks: [{ id: 'bm-1', timestampSeconds: 15, label: 'Deterministic event log architecture' }],
        category: 'idea',
        tags: ['architecture', 'offline', 'voice'],
      },
    ];
  });

  const [copiedState, setCopiedState] = useState(false);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(VOICE_MEMO_STORAGE_KEY, JSON.stringify(savedMemos));
    } catch {}
  }, [savedMemos]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Web Audio Waveform Visualizer Loop
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

      // Gradient color from violet to rose
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#ec4899');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1.5;
      if (x > canvas.width) break;
    }

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  // Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Web Audio setup for visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder setup
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(200);

      // Web Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const trans = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                final += trans + ' ';
              } else {
                interim += trans;
              }
            }

            if (final) {
              setLiveTranscript((prev) => `${prev} ${final.trim()}`);
            }
            setInterimTranscript(interim);
          };

          recognition.onerror = () => {
            // Graceful fallback to silence if speech recognition has network issues
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          // Speech recognition not permitted or supported
        }
      }

      setIsRecording(true);
      setRecordingSeconds(0);
      setBookmarks([]);
      drawWaveform();

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    setIsRecording(false);
    setInterimTranscript('');
    soundscapeService.playCompletionChime();
  };

  // Drop Bookmark during recording or listening
  const handleDropBookmark = () => {
    const time = isRecording ? recordingSeconds : Math.floor(playbackTime);
    const newBm: AudioBookmark = {
      id: `bm-${Date.now()}`,
      timestampSeconds: time,
      label: `Moment at ${formatAudioSeconds(time)}`,
    };
    setBookmarks((prev) => [...prev, newBm]);
    soundscapeService.playCompletionChime();
  };

  // Seek Audio to Bookmark
  const handleSeekToBookmark = (sec: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = sec;
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  // Save current memo to library and Vault
  const handleSaveToVault = async () => {
    const finalTranscript = `${liveTranscript} ${interimTranscript}`.trim();

    const memo: VoiceMemo = {
      id: `memo-${Date.now()}`,
      title: memoTitle.trim() || `Voice Memo (${new Date().toLocaleTimeString()})`,
      durationSeconds: recordingSeconds || Math.floor(playbackDuration),
      recordedAt: new Date().toISOString(),
      audioDataUrl: recordedAudioUrl || undefined,
      transcript: finalTranscript,
      bookmarks,
      category,
      tags: ['voice-memo', category],
    };

    // Save to local library
    setSavedMemos((prev) => [memo, ...prev]);

    // Create note in vault
    const markdown = generateVoiceNoteMarkdown(memo);
    await onCreateVoiceNote(memo.title, markdown, memo.tags);

    fireConfetti();
    soundscapeService.playCompletionChime();
    onClose();
  };

  // Append to Daily Note
  const handleAppendDaily = async () => {
    if (!onAppendToDailyNote) return;
    const finalTranscript = `${liveTranscript} ${interimTranscript}`.trim();
    const memo: VoiceMemo = {
      id: `memo-${Date.now()}`,
      title: memoTitle.trim() || `Voice Reflection`,
      durationSeconds: recordingSeconds || Math.floor(playbackDuration),
      recordedAt: new Date().toISOString(),
      audioDataUrl: recordedAudioUrl || undefined,
      transcript: finalTranscript,
      bookmarks,
      category,
      tags: ['voice-memo', category],
    };

    const markdown = generateVoiceNoteMarkdown(memo);
    await onAppendToDailyNote(`\n\n${markdown}\n`);

    fireConfetti();
    soundscapeService.playCompletionChime();
    onClose();
  };

  // Copy transcript
  const handleCopyTranscript = async () => {
    const text = `${liveTranscript} ${interimTranscript}`.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Memo Transcriber & Audio Snippet Studio (P5)"
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Voice Memo & Audio Snippet Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  Tool P5
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Dictate thoughts with real-time speech transcription, bookmark key moments & save to notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('record')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'record'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Recorder</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'library'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Library ({savedMemos.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Live Recorder & Speech Transcription */}
        {activeTab === 'record' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Waveform Canvas & Controls */}
            <div className="p-5 rounded-3xl bg-stone-950 text-white flex flex-col items-center justify-center space-y-4 shadow-lg border border-stone-800 relative overflow-hidden">
              {/* Waveform Canvas */}
              <canvas
                ref={canvasRef}
                width={500}
                height={70}
                className="w-full max-w-md h-16 rounded-xl opacity-90"
              />

              {/* Timer Display */}
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isRecording ? 'bg-rose-500 animate-ping' : 'bg-stone-600'
                  }`}
                />
                <span className="font-mono text-3xl font-bold tracking-wider">
                  {formatAudioSeconds(recordingSeconds)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:scale-105 active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-6 py-2.5 rounded-2xl bg-stone-700 hover:bg-stone-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:scale-105 active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop & Finalize</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDropBookmark}
                      className="px-4 py-2.5 rounded-2xl bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95"
                      title="Mark key moment"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>Bookmark ({bookmarks.length})</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Playback preview for recorded audio */}
            {recordedAudioUrl && !isRecording && (
              <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <audio
                    ref={audioPlayerRef}
                    src={recordedAudioUrl}
                    onTimeUpdate={() => {
                      if (audioPlayerRef.current) {
                        setPlaybackTime(audioPlayerRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (audioPlayerRef.current) {
                        setPlaybackDuration(audioPlayerRef.current.duration);
                      }
                    }}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (!audioPlayerRef.current) return;
                      if (isPlaying) {
                        audioPlayerRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        audioPlayerRef.current.play();
                        setIsPlaying(true);
                      }
                    }}
                    className="p-3 rounded-xl bg-rose-600 text-white hover:bg-rose-500 shadow-xs"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  <div className="text-xs font-mono text-stone-600 dark:text-stone-300">
                    {formatAudioSeconds(playbackTime)} / {formatAudioSeconds(playbackDuration || recordingSeconds)}
                  </div>
                </div>

                {/* Speed Switcher */}
                <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-stone-700 p-0.5 rounded-xl text-xs">
                  {[1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        setPlaybackSpeed(spd);
                        if (audioPlayerRef.current) audioPlayerRef.current.playbackRate = spd;
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        playbackSpeed === spd
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Transcript & Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Real-Time Speech Transcript</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTranscript}
                    className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 font-semibold"
                  >
                    {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedState ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={5}
                  value={`${liveTranscript} ${interimTranscript}`.trim()}
                  onChange={(e) => setLiveTranscript(e.target.value)}
                  placeholder={
                    isRecording
                      ? 'Listening to speech... your words will appear here in real time.'
                      : 'Press Start Recording to dictate or paste text transcript here.'
                  }
                  className="w-full p-4 text-xs rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-rose-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Timestamped Key Moments Bookmarks List */}
            {bookmarks.length > 0 && (
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Timestamped Key Moments ({bookmarks.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {bookmarks.map((bm, idx) => (
                    <div
                      key={bm.id}
                      onClick={() => handleSeekToBookmark(bm.timestampSeconds)}
                      className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
                      title="Click to seek audio"
                    >
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span className="font-mono font-bold">[{formatAudioSeconds(bm.timestampSeconds)}]</span>
                      <span className="text-[11px] font-medium">{bm.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note Metadata & Vault Save Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200 dark:border-stone-800">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Note Title
                </label>
                <input
                  type="text"
                  value={memoTitle}
                  onChange={(e) => setMemoTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                >
                  <option value="idea">💡 Idea / Concept</option>
                  <option value="meeting">🤝 Meeting Note</option>
                  <option value="lecture">🎓 Lecture / Audio Paper</option>
                  <option value="brainstorm">🌪️ Brainstorm</option>
                  <option value="journal">📓 Daily Reflection</option>
                </select>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {onAppendToDailyNote && (
                <button
                  type="button"
                  onClick={handleAppendDaily}
                  disabled={!liveTranscript.trim() && !interimTranscript.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 disabled:opacity-40 transition-colors"
                >
                  Append to Today's Daily Note
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveToVault}
                disabled={!liveTranscript.trim() && !interimTranscript.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Save as Voice Note in Vault</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Saved Voice Memos Library */}
        {activeTab === 'library' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {savedMemos.length === 0 ? (
              <div className="py-16 text-center text-stone-400 text-xs">
                No voice memos recorded yet. Switch to Recorder to capture your first memo!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {savedMemos.map((memo) => (
                  <div
                    key={memo.id}
                    className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                          {memo.category}
                        </span>
                        <span className="font-mono text-stone-400">
                          {formatAudioSeconds(memo.durationSeconds)} •{' '}
                          {new Date(memo.recordedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {memo.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 line-clamp-3 mt-1 leading-relaxed">
                        {memo.transcript}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800/60 text-xs">
                      <span className="text-[10px] text-stone-400 font-mono">
                        {memo.bookmarks.length} moments
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const md = generateVoiceNoteMarkdown(memo);
                          await onCreateVoiceNote(memo.title, md, memo.tags);
                          fireConfetti();
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                      >
                        Create Note
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-mono">Alt + V</kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
