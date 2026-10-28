import {
  AudioRecordingState,
  AudioCapability,
  AudioRecordingResult,
  CanonicalAttachment,
} from './mediaTypes';
import { mediaService, detectAttachmentKind } from './mediaService';
import { computeDeterministicChecksum } from '../portableVaultSerializer';

/**
 * Supported audio MIME types in order of preference
 */
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
];

export interface AudioRecorderListener {
  onStateChange?: (state: AudioRecordingState) => void;
  onTimeUpdate?: (durationMs: number) => void;
  onVolumeUpdate?: (volumeLevel: number) => void; // Normalized 0.0 to 1.0
  onError?: (error: string) => void;
}

class AudioRecorderService {
  private state: AudioRecordingState = 'idle';
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private pauseStartTime: number = 0;
  private timerInterval: any = null;

  private previewBlob: Blob | null = null;
  private previewDurationSeconds: number = 0;
  private chosenMimeType: string = 'audio/webm';

  private listeners: Set<AudioRecorderListener> = new Set();

  constructor() {
    // Determine supported MIME type
    this.chosenMimeType = this.getBestSupportedMimeType();
  }

  public subscribe(listener: AudioRecorderListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getState(): AudioRecordingState {
    return this.state;
  }

  public getPreviewBlob(): Blob | null {
    return this.previewBlob;
  }

  public getPreviewDuration(): number {
    return this.previewDurationSeconds;
  }

  public getBestSupportedMimeType(): string {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      return 'audio/webm';
    }
    for (const mime of PREFERRED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';
  }

  public checkCapability(): AudioCapability {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isSupported: false,
        error: 'Navigator environment is unavailable.',
      };
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        isSupported: false,
        error: 'Microphone recording is not supported in this browser.',
      };
    }

    if (typeof MediaRecorder === 'undefined') {
      return {
        isSupported: false,
        error: 'MediaRecorder API is not supported in this browser.',
      };
    }

    const mime = this.getBestSupportedMimeType();
    return {
      isSupported: true,
      supportedMimeType: mime || 'audio/webm',
    };
  }

  private setState(nextState: AudioRecordingState): void {
    this.state = nextState;
    for (const l of this.listeners) {
      l.onStateChange?.(nextState);
    }
  }

  private notifyTime(ms: number): void {
    for (const l of this.listeners) {
      l.onTimeUpdate?.(ms);
    }
  }

  private notifyVolume(vol: number): void {
    for (const l of this.listeners) {
      l.onVolumeUpdate?.(vol);
    }
  }

  private notifyError(err: string): void {
    this.setState('error');
    for (const l of this.listeners) {
      l.onError?.(err);
    }
  }

  /**
   * Start recording session
   */
  public async startRecording(): Promise<void> {
    const cap = this.checkCapability();
    if (!cap.isSupported) {
      this.notifyError(cap.error || 'Audio recording is unsupported.');
      return;
    }

    this.setState('requesting');
    this.recordedChunks = [];
    this.previewBlob = null;
    this.previewDurationSeconds = 0;
    this.pausedDuration = 0;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Setup audio analysis for live meter visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.analyserNode = this.audioContext.createAnalyser();
          this.analyserNode.fftSize = 64;
          source.connect(this.analyserNode);
          this.startVolumeMonitoring();
        }
      } catch (e) {
        console.warn('AudioContext visualization setup skipped:', e);
      }

      this.chosenMimeType = cap.supportedMimeType || 'audio/webm';
      const options: MediaRecorderOptions = this.chosenMimeType
        ? { mimeType: this.chosenMimeType }
        : {};

      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const finalBlob = new Blob(this.recordedChunks, {
          type: this.chosenMimeType || 'audio/webm',
        });
        this.previewBlob = finalBlob;
        const totalDurationMs = Date.now() - this.startTime - this.pausedDuration;
        this.previewDurationSeconds = Math.max(1, Math.round(totalDurationMs / 1000));
        this.stopVolumeMonitoring();
        this.cleanupMediaStream();
        this.setState('preview');
      };

      this.mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        this.notifyError('An error occurred during audio recording.');
      };

      this.mediaRecorder.start(250); // Slice every 250ms
      this.startTime = Date.now();
      this.setState('recording');

      // Start timer
      this.startTimer();
    } catch (err: any) {
      console.error('Failed to get user media for audio:', err);
      let message = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission was denied. Please allow microphone access in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device was found on your system.';
      }
      this.cleanupMediaStream();
      this.notifyError(message);
    }
  }

  /**
   * Pause ongoing recording
   */
  public pauseRecording(): void {
    if (this.state === 'recording' && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.pause();
        this.pauseStartTime = Date.now();
        this.stopTimer();
        this.setState('paused');
      } catch (err) {
        console.warn('Failed to pause media recorder:', err);
      }
    }
  }

  /**
   * Resume paused recording
   */
  public resumeRecording(): void {
    if (this.state === 'paused' && this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      try {
        this.mediaRecorder.resume();
        this.pausedDuration += Date.now() - this.pauseStartTime;
        this.startTimer();
        this.setState('recording');
      } catch (err) {
        console.warn('Failed to resume media recorder:', err);
      }
    }
  }

  /**
   * Stop recording and enter preview mode
   */
  public stopRecording(): void {
    this.stopTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.warn('Failed to stop media recorder:', err);
      }
    } else {
      this.cleanupMediaStream();
      this.setState('idle');
    }
  }

  /**
   * Cancel and discard recording
   */
  public cancelRecording(): void {
    this.stopTimer();
    this.stopVolumeMonitoring();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanupMediaStream();
    this.recordedChunks = [];
    this.previewBlob = null;
    this.setState('idle');
  }

  /**
   * Save the finalized preview recording to canonical storage
   */
  public async saveRecording(
    customTitle?: string,
    sourceNoteId?: string
  ): Promise<AudioRecordingResult> {
    if (!this.previewBlob) {
      throw new Error('No recorded audio data to save.');
    }

    this.setState('saving');

    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}-${String(
      now.getMinutes()
    ).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

    // Determine extension
    let ext = 'webm';
    if (this.chosenMimeType.includes('ogg')) ext = 'ogg';
    else if (this.chosenMimeType.includes('mp4')) ext = 'm4a';
    else if (this.chosenMimeType.includes('wav')) ext = 'wav';

    const filename = customTitle?.trim()
      ? (customTitle.endsWith(`.${ext}`) ? customTitle : `${customTitle}.${ext}`)
      : `Audio ${timestampStr}.${ext}`;

    const attachmentId = `att-aud-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const sizeBytes = this.previewBlob.size;

    // Convert blob to Uint8Array for checksum
    const arrayBuf = await this.previewBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    const hash = computeDeterministicChecksum(bytes);

    const canon: CanonicalAttachment = {
      id: attachmentId,
      filename,
      kind: 'audio',
      mimeType: this.chosenMimeType || 'audio/webm',
      size: sizeBytes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      duration: this.previewDurationSeconds,
      sourceNoteId,
      hash,
    };

    await mediaService.saveAttachment(canon, this.previewBlob);

    const result: AudioRecordingResult = {
      blob: this.previewBlob,
      mimeType: canon.mimeType,
      durationSeconds: this.previewDurationSeconds,
      sizeBytes,
      filename,
      attachmentId,
    };

    this.setState('idle');
    this.previewBlob = null;
    return result;
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.state === 'recording') {
        const elapsed = Date.now() - this.startTime - this.pausedDuration;
        this.notifyTime(Math.max(0, elapsed));
      }
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startVolumeMonitoring(): void {
    if (!this.analyserNode) return;
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const updateVolume = () => {
      if (this.state === 'recording' && this.analyserNode) {
        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128); // normalize roughly to 0..1
        this.notifyVolume(normalized);
      } else {
        this.notifyVolume(0);
      }
      this.animFrameId = requestAnimationFrame(updateVolume);
    };

    this.animFrameId = requestAnimationFrame(updateVolume);
  }

  private stopVolumeMonitoring(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyserNode = null;
  }

  private cleanupMediaStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }
  }
}

export const audioRecorderService = new AudioRecorderService();
