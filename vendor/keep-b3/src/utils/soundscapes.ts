/**
 * Procedural Zen Ambient Soundscape Synthesizer
 * 100% client-side Web Audio API generation with zero network requests or audio assets.
 */

export type SoundscapeType = 'rain' | 'campfire' | 'waves' | 'brown_noise' | 'forest_stream' | 'white_noise' | 'none';

class SoundscapeService {
  private ctx: AudioContext | null = null;
  private currentType: SoundscapeType = 'none';
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private volume = 0.5;
  private typewriterEnabled = false;

  // Active audio nodes for cancellation
  private activeNodes: (AudioNode | number)[] = [];
  private listeners: Set<() => void> = new Set();

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        // ignore
      }
    }
  }

  public playCompletionChime(): void {
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.18 * this.volume, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.85);
      });
    } catch {
      // ignore
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedType = localStorage.getItem('open_notes_ambient_sound') as SoundscapeType;
        const savedVol = localStorage.getItem('open_notes_ambient_volume');
        const savedTypewriter =
          localStorage.getItem('open_notes_ambient_typewriter') ??
          localStorage.getItem('open_notes_typewriter_sound');

        if (savedType && ['rain', 'campfire', 'waves', 'brown_noise', 'forest_stream', 'white_noise'].includes(savedType)) {
          this.currentType = savedType;
        }
        if (savedVol) {
          const v = parseFloat(savedVol);
          if (!isNaN(v) && v >= 0 && v <= 1) this.volume = v;
        }
        if (savedTypewriter === 'true') {
          this.typewriterEnabled = true;
        }
      } catch {
        // ignore
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    try {
      localStorage.setItem('open_notes_ambient_volume', this.volume.toString());
    } catch {
      // ignore
    }
    this.notify();
  }

  public isTypewriterEnabled(): boolean {
    return this.typewriterEnabled;
  }

  public setTypewriterEnabled(enabled: boolean): void {
    this.typewriterEnabled = enabled;
    try {
      localStorage.setItem('open_notes_ambient_typewriter', enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
    this.notify();
  }

  public playTypewriterClick(): void {
    if (!this.typewriterEnabled) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Mechanical keystroke thud/click frequency
      osc.type = 'triangle';
      const freq = 180 + Math.random() * 80;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 300, ctx.currentTime);
      filter.Q.setValueAtTime(2.5, ctx.currentTime);

      gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public getCurrentType(): SoundscapeType {
    return this.currentType;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public stop(): void {
    this.isPlaying = false;
    this.cleanupActiveNodes();
    try {
      localStorage.setItem('open_notes_ambient_sound', 'none');
    } catch {
      // ignore
    }
    this.notify();
  }

  private cleanupActiveNodes(): void {
    for (const item of this.activeNodes) {
      if (typeof item === 'number') {
        clearInterval(item);
      } else {
        try {
          if ('stop' in item && typeof (item as any).stop === 'function') {
            (item as any).stop();
          }
          item.disconnect();
        } catch {
          // ignore
        }
      }
    }
    this.activeNodes = [];
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
  }

  public start(type: SoundscapeType): void {
    if (type === 'none') {
      this.stop();
      return;
    }

    const ctx = this.initContext();
    if (!ctx) return;

    this.cleanupActiveNodes();
    this.currentType = type;
    this.isPlaying = true;

    try {
      localStorage.setItem('open_notes_ambient_sound', type);
    } catch {
      // ignore
    }

    const master = ctx.createGain();
    master.gain.setValueAtTime(this.volume, ctx.currentTime);
    master.connect(ctx.destination);
    this.masterGain = master;

    switch (type) {
      case 'rain':
        this.synthesizeRain(ctx, master);
        break;
      case 'campfire':
        this.synthesizeCampfire(ctx, master);
        break;
      case 'waves':
        this.synthesizeOceanWaves(ctx, master);
        break;
      case 'brown_noise':
        this.synthesizeBrownNoise(ctx, master);
        break;
      case 'forest_stream':
        this.synthesizeForestStream(ctx, master);
        break;
      case 'white_noise':
        this.synthesizeWhiteNoise(ctx, master);
        break;
    }

    this.notify();
  }

  // --- Procedural Synthesis Implementations ---

  private synthesizeWhiteNoise(ctx: AudioContext, destination: GainNode): void {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.Q.setValueAtTime(0.8, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter, gain);
  }

  private synthesizeForestStream(ctx: AudioContext, destination: GainNode): void {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 1.2;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, ctx.currentTime);

    const streamGain = ctx.createGain();
    streamGain.gain.setValueAtTime(0.22, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(1.1, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.08, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(streamGain.gain);

    noise.connect(filter);
    filter.connect(streamGain);
    streamGain.connect(destination);

    noise.start();
    lfo.start();
    this.activeNodes.push(noise, filter, streamGain, lfo, lfoGain);
  }

  private synthesizeBrownNoise(ctx: AudioContext, destination: GainNode): void {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter, gain);
  }

  private synthesizeRain(ctx: AudioContext, destination: GainNode): void {
    // Generate pinkish noise bed
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }

    const rainBed = ctx.createBufferSource();
    rainBed.buffer = noiseBuffer;
    rainBed.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(500, ctx.currentTime);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(4200, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.45, ctx.currentTime);

    rainBed.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(rainGain);
    rainGain.connect(destination);

    rainBed.start();
    this.activeNodes.push(rainBed, highpass, lowpass, rainGain);

    // Occasional gentle droplet accents
    const dropInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      try {
        const drop = this.ctx.createOscillator();
        const dropGain = this.ctx.createGain();
        drop.type = 'sine';
        const startF = 1200 + Math.random() * 800;
        drop.frequency.setValueAtTime(startF, this.ctx.currentTime);
        drop.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);

        dropGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        dropGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        drop.connect(dropGain);
        dropGain.connect(destination);
        drop.start(this.ctx.currentTime);
        drop.stop(this.ctx.currentTime + 0.08);
      } catch {
        // ignore
      }
    }, 450);

    this.activeNodes.push(dropInterval as any);
  }

  private synthesizeCampfire(ctx: AudioContext, destination: GainNode): void {
    // Warm low rumble bed
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
    }

    const fireBed = ctx.createBufferSource();
    fireBed.buffer = noiseBuffer;
    fireBed.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(260, ctx.currentTime);

    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(0.35, ctx.currentTime);

    fireBed.connect(lowpass);
    lowpass.connect(bedGain);
    bedGain.connect(destination);

    fireBed.start();
    this.activeNodes.push(fireBed, lowpass, bedGain);

    // Stochastic wood crackles
    const crackleInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      if (Math.random() > 0.45) return;
      try {
        const osc = this.ctx.createOscillator();
        const crackleGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200 + Math.random() * 900, this.ctx.currentTime);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

        crackleGain.gain.setValueAtTime(0.06 + Math.random() * 0.05, this.ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.035);

        osc.connect(filter);
        filter.connect(crackleGain);
        crackleGain.connect(destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.035);
      } catch {
        // ignore
      }
    }, 180);

    this.activeNodes.push(crackleInterval as any);
  }

  private synthesizeOceanWaves(ctx: AudioContext, destination: GainNode): void {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, ctx.currentTime);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.2, ctx.currentTime);

    // Low Frequency Oscillator for wave swell rhythm (approx 0.12 Hz = 8s cycle)
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.22, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);

    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(destination);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filter, waveGain, lfo, lfoGain);
  }
}

export const soundscapeService = new SoundscapeService();
